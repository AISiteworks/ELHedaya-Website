import { clean, parseBody, serverSupabase, squareConfig, SQUARE_API_VERSION } from "./_registration.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  try {
    const payload = parseBody(req.body);
    const registrationId = clean(payload.registrationId, 80);
    const publicToken = clean(payload.publicToken, 80);
    const sourceId = clean(payload.sourceId, 500);
    const attemptId = clean(payload.attemptId, 45);
    if (!registrationId || !publicToken || !sourceId || !attemptId) {
      return res.status(400).json({ ok: false, message: "Payment request is incomplete." });
    }

    const admin = serverSupabase();
    const { data: registration, error: registrationError } = await admin
      .from("registrations")
      .select("id,registration_number,guardian_email,total_cents,currency,payment_status,public_token")
      .eq("id", registrationId)
      .eq("public_token", publicToken)
      .maybeSingle();
    if (registrationError) throw registrationError;
    if (!registration) return res.status(404).json({ ok: false, message: "Registration could not be found." });

    if (registration.payment_status === "paid") {
      const { data: priorPayment } = await admin
        .from("registration_payments")
        .select("provider_payment_id,receipt_url,card_brand,last_4")
        .eq("registration_id", registration.id)
        .eq("status", "COMPLETED")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return res.status(200).json({ ok: true, alreadyPaid: true, paymentStatus: "paid", registrationNumber: registration.registration_number, ...priorPayment });
    }
    if (Number(registration.total_cents || 0) <= 0) {
      return res.status(200).json({ ok: true, paymentStatus: "waived", registrationNumber: registration.registration_number });
    }

    const square = squareConfig();
    if (!square.accessToken || !square.locationId) {
      return res.status(503).json({ ok: false, message: "Online payment is not configured yet. Your registration has been saved." });
    }

    const paymentBody = {
      source_id: sourceId,
      idempotency_key: attemptId,
      amount_money: { amount: Number(registration.total_cents), currency: registration.currency || "USD" },
      autocomplete: true,
      location_id: square.locationId,
      reference_id: registration.registration_number,
      note: `EL Hedaya registration ${registration.registration_number}`,
    };

    const response = await fetch(`${square.apiBase}/v2/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${square.accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": SQUARE_API_VERSION,
      },
      body: JSON.stringify(paymentBody),
    });
    const squareData = await response.json().catch(() => ({}));
    const payment = squareData?.payment;

    if (!response.ok || !payment) {
      const message = squareData?.errors?.[0]?.detail || "Square could not complete the payment.";
      await admin.from("registration_payments").upsert({
        registration_id: registration.id,
        provider: "square",
        idempotency_key: attemptId,
        amount_cents: Number(registration.total_cents),
        currency: registration.currency || "USD",
        status: "FAILED",
        failure_message: message.slice(0, 800),
      }, { onConflict: "idempotency_key" });
      await admin.from("registrations").update({ payment_status: "failed", payment_error: message.slice(0, 800), updated_at: new Date().toISOString() }).eq("id", registration.id);
      return res.status(402).json({ ok: false, message });
    }

    const completed = payment.status === "COMPLETED";
    const card = payment.card_details?.card || {};
    await admin.from("registration_payments").upsert({
      registration_id: registration.id,
      provider: "square",
      idempotency_key: attemptId,
      provider_payment_id: payment.id,
      amount_cents: Number(payment.amount_money?.amount || registration.total_cents),
      currency: payment.amount_money?.currency || registration.currency || "USD",
      status: payment.status || "UNKNOWN",
      receipt_url: payment.receipt_url || null,
      card_brand: card.card_brand || null,
      last_4: card.last_4 || null,
      failure_message: null,
    }, { onConflict: "idempotency_key" });

    await admin.from("registrations").update({
      payment_status: completed ? "paid" : "pending",
      square_payment_id: payment.id || null,
      square_receipt_url: payment.receipt_url || null,
      payment_error: null,
      paid_at: completed ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("id", registration.id);

    if (!completed) {
      return res.status(409).json({ ok: false, message: `Square returned payment status ${payment.status || "UNKNOWN"}. Please contact the school before retrying.` });
    }

    return res.status(200).json({
      ok: true,
      paymentStatus: "paid",
      registrationNumber: registration.registration_number,
      providerPaymentId: payment.id,
      receiptUrl: payment.receipt_url || null,
      cardBrand: card.card_brand || null,
      last4: card.last_4 || null,
    });
  } catch (error) {
    console.error("Registration payment error:", error);
    return res.status(500).json({ ok: false, message: "Payment could not be completed. Your registration remains saved." });
  }
}
