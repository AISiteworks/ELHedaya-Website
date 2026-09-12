import {
  calculateFees,
  clean,
  getRegistrationConfig,
  parseBody,
  serverSupabase,
  validateRegistrationPayload,
} from "./_registration.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  try {
    const payload = parseBody(req.body);
    // Quiet bot trap. Real users never see/fill this field.
    if (clean(payload.website, 100)) return res.status(200).json({ ok: true });

    const clientRequestId = clean(payload.clientRequestId, 80);
    if (!clientRequestId) return res.status(400).json({ ok: false, message: "Registration request ID is missing. Refresh and try again." });

    const validated = validateRegistrationPayload(payload);
    if (validated.errors.length) return res.status(400).json({ ok: false, message: validated.errors[0], errors: validated.errors });

    const admin = serverSupabase();
    const { settings, fees } = await getRegistrationConfig(admin);
    if (!settings?.registration_open) return res.status(403).json({ ok: false, message: "Online registration is currently closed." });
    if (settings.registration_deadline && new Date(settings.registration_deadline + "T23:59:59") < new Date()) {
      return res.status(403).json({ ok: false, message: "The online registration deadline has passed." });
    }

    const selectedOptionalFeeIds = Array.isArray(payload.selectedOptionalFeeIds)
      ? payload.selectedOptionalFeeIds.map(String).slice(0, 30)
      : [];
    const calculated = calculateFees(fees, validated.students.length, selectedOptionalFeeIds);

    const { data: existing } = await admin
      .from("registrations")
      .select("id,public_token,registration_number,total_cents,payment_status,currency")
      .eq("client_request_id", clientRequestId)
      .maybeSingle();
    if (existing) {
      return res.status(200).json({
        ok: true,
        registrationId: existing.id,
        publicToken: existing.public_token,
        registrationNumber: existing.registration_number,
        totalCents: existing.total_cents,
        currency: existing.currency,
        paymentStatus: existing.payment_status,
        requiresPayment: existing.total_cents > 0 && existing.payment_status !== "paid",
      });
    }

    const registrationRow = {
      client_request_id: clientRequestId,
      ...validated.guardian,
      school_year: settings.school_year,
      term_name: settings.term_name,
      currency: settings.currency || "USD",
      subtotal_cents: calculated.totalCents,
      total_cents: calculated.totalCents,
      payment_status: calculated.totalCents > 0 ? "pending" : "waived",
    };

    const { data: registration, error: registrationError } = await admin
      .from("registrations")
      .insert(registrationRow)
      .select("id,public_token,registration_number,total_cents,payment_status,currency")
      .single();
    if (registrationError) throw registrationError;

    const studentRows = validated.students.map((student, index) => ({
      registration_id: registration.id,
      sort_order: index,
      ...student,
    }));
    const { error: studentError } = await admin.from("students").insert(studentRows);
    if (studentError) throw studentError;

    if (calculated.lines.length) {
      const feeRows = calculated.lines.map((line) => ({ registration_id: registration.id, ...line }));
      const { error: feeError } = await admin.from("registration_fee_lines").insert(feeRows);
      if (feeError) throw feeError;
    }

    return res.status(200).json({
      ok: true,
      registrationId: registration.id,
      publicToken: registration.public_token,
      registrationNumber: registration.registration_number,
      totalCents: registration.total_cents,
      currency: registration.currency,
      paymentStatus: registration.payment_status,
      requiresPayment: registration.total_cents > 0,
      feeLines: calculated.lines,
    });
  } catch (error) {
    console.error("Create registration error:", error);
    return res.status(500).json({ ok: false, message: "We could not save the registration. Please try again." });
  }
}
