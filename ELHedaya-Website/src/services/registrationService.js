import { galleryBackendConfigured, supabase } from "./galleryService";

export const registrationBackendConfigured = galleryBackendConfigured;

function requireBackend() {
  if (!supabase) throw new Error("Registration service is not configured yet.");
}

async function jsonRequest(url, options = {}) {
  const response = await fetch(url, options);
  let data = null;
  try { data = await response.json(); } catch { /* friendly fallback below */ }
  if (!response.ok || !data?.ok) throw new Error(data?.message || "Request failed. Please try again.");
  return data;
}

export async function getPublicRegistrationConfig() {
  return jsonRequest("/api/registration-config");
}

export async function createRegistration(payload) {
  return jsonRequest("/api/registration-create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function payRegistration(payload) {
  return jsonRequest("/api/registration-pay", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function listRegistrationAdminRecords() {
  requireBackend();
  const { data, error } = await supabase
    .from("registrations")
    .select(`
      id,registration_number,guardian_first_name,guardian_last_name,guardian_email,guardian_phone,
      address_line_1,address_line_2,city,state,postal_code,emergency_contact_name,emergency_contact_phone,
      school_year,term_name,notes,currency,subtotal_cents,total_cents,payment_status,square_payment_id,
      square_receipt_url,payment_error,paid_at,created_at,updated_at,
      students:registration_students(id,first_name,last_name,date_of_birth,gender,grade,returning_student,medical_notes,sort_order),
      registration_fee_lines(id,fee_name,description,kind,scope,unit_amount_cents,quantity,total_cents,is_optional),
      registration_payments(id,provider,provider_payment_id,amount_cents,currency,status,receipt_url,card_brand,last_4,failure_message,created_at)
    `)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function listRegistrationFeesAdmin() {
  requireBackend();
  const { data, error } = await supabase
    .from("registration_fees")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function saveRegistrationFee(fee) {
  requireBackend();
  const row = {
    name: String(fee.name || "").trim(),
    description: String(fee.description || "").trim() || null,
    amount_cents: Math.max(0, Math.round(Number(fee.amount || 0) * 100)),
    kind: fee.kind === "discount" ? "discount" : "charge",
    scope: fee.scope === "family" ? "family" : "student",
    is_optional: Boolean(fee.isOptional),
    applies_after_students: fee.scope === "student" ? Math.max(0, Number(fee.appliesAfterStudents || 0)) : 0,
    is_active: Boolean(fee.isActive),
    sort_order: Number(fee.sortOrder || 0),
  };
  if (!row.name) throw new Error("Fee name is required.");

  let query;
  if (fee.id) query = supabase.from("registration_fees").update(row).eq("id", fee.id).select().single();
  else query = supabase.from("registration_fees").insert(row).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function deleteRegistrationFee(id) {
  requireBackend();
  const { error } = await supabase.from("registration_fees").delete().eq("id", id);
  if (error) throw error;
}

export async function getRegistrationSettingsAdmin() {
  requireBackend();
  const { data, error } = await supabase.from("registration_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

export async function saveRegistrationSettings(settings) {
  requireBackend();
  const row = {
    registration_open: Boolean(settings.registrationOpen),
    school_year: String(settings.schoolYear || "").trim(),
    term_name: String(settings.termName || "").trim(),
    registration_deadline: settings.registrationDeadline || null,
    welcome_message: String(settings.welcomeMessage || "").trim() || null,
    confirmation_message: String(settings.confirmationMessage || "").trim() || null,
    contact_email: String(settings.contactEmail || "").trim() || null,
    contact_phone: String(settings.contactPhone || "").trim() || null,
    currency: "USD",
  };
  if (!row.school_year || !row.term_name) throw new Error("School year and term name are required.");
  const { data, error } = await supabase.from("registration_settings").update(row).eq("id", 1).select().single();
  if (error) throw error;
  return data;
}

export async function setRegistrationPaymentStatus(registration, nextStatus) {
  requireBackend();
  const allowed = new Set(["pending", "paid", "failed", "offline", "waived", "refunded"]);
  if (!allowed.has(nextStatus)) throw new Error("Invalid payment status.");
  const update = {
    payment_status: nextStatus,
    payment_error: nextStatus === "failed" ? registration.payment_error : null,
    paid_at: ["paid", "offline"].includes(nextStatus) ? (registration.paid_at || new Date().toISOString()) : registration.paid_at,
  };
  const { error } = await supabase.from("registrations").update(update).eq("id", registration.id);
  if (error) throw error;

  if (nextStatus === "offline") {
    const { error: paymentError } = await supabase.from("registration_payments").upsert({
      registration_id: registration.id,
      provider: "offline",
      idempotency_key: `offline-${registration.id}`,
      amount_cents: Number(registration.total_cents || 0),
      currency: registration.currency || "USD",
      status: "COMPLETED",
    }, { onConflict: "idempotency_key" });
    if (paymentError) throw paymentError;
  }
}

export function calculateClientFeeEstimate(fees, studentCount, selectedOptionalFeeIds = []) {
  const selected = new Set(selectedOptionalFeeIds.map(String));
  const lines = [];
  let totalCents = 0;
  for (const fee of fees || []) {
    if (fee.isOptional && !selected.has(String(fee.id))) continue;
    const qty = fee.scope === "family" ? 1 : Math.max(0, studentCount - Number(fee.appliesAfterStudents || 0));
    if (!qty) continue;
    const signed = (fee.kind === "discount" ? -1 : 1) * Number(fee.amountCents || 0);
    const lineTotal = signed * qty;
    lines.push({ ...fee, quantity: qty, totalCents: lineTotal });
    totalCents += lineTotal;
  }
  return { lines, totalCents: Math.max(0, totalCents) };
}

export function formatRegistrationMoney(cents, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(cents || 0) / 100);
}
