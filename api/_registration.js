import { createClient } from "@supabase/supabase-js";

export const SQUARE_API_VERSION = process.env.SQUARE_API_VERSION || "2026-08-19";

export function serverSupabase() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase server environment variables are incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function squareConfig() {
  const environment = String(process.env.SQUARE_ENVIRONMENT || "sandbox").toLowerCase() === "production" ? "production" : "sandbox";
  return {
    environment,
    applicationId: String(process.env.SQUARE_APPLICATION_ID || "").trim(),
    locationId: String(process.env.SQUARE_LOCATION_ID || "").trim(),
    accessToken: String(process.env.SQUARE_ACCESS_TOKEN || "").trim(),
    apiBase: environment === "production" ? "https://connect.squareup.com" : "https://connect.squareupsandbox.com",
  };
}

export function parseBody(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return value;
}

export function clean(value, max = 250) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ""));
}

export function normalizePhone(value) {
  return clean(value, 40).replace(/[^0-9+().\-\s]/g, "");
}

export function money(cents, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(Number(cents || 0) / 100);
}

export function calculateFees(fees, studentCount, selectedOptionalFeeIds = []) {
  const selected = new Set((selectedOptionalFeeIds || []).map(String));
  const lines = [];
  let totalCents = 0;

  for (const fee of fees || []) {
    if (!fee?.is_active) continue;
    if (fee.is_optional && !selected.has(String(fee.id))) continue;

    const scope = fee.scope === "family" ? "family" : "student";
    const kind = fee.kind === "discount" ? "discount" : "charge";
    const threshold = Math.max(0, Number(fee.applies_after_students || 0));
    const quantity = scope === "family" ? 1 : Math.max(0, Number(studentCount || 0) - threshold);
    if (!quantity) continue;

    const unitCents = Math.max(0, Number(fee.amount_cents || 0));
    const signedUnit = kind === "discount" ? -unitCents : unitCents;
    const lineTotal = signedUnit * quantity;
    totalCents += lineTotal;
    lines.push({
      fee_id: fee.id,
      fee_name: fee.name,
      description: fee.description || null,
      kind,
      scope,
      unit_amount_cents: signedUnit,
      quantity,
      total_cents: lineTotal,
      is_optional: Boolean(fee.is_optional),
    });
  }

  return { lines, totalCents: Math.max(0, totalCents) };
}

export async function getRegistrationConfig(admin) {
  const [{ data: settings, error: settingsError }, { data: fees, error: feesError }] = await Promise.all([
    admin.from("registration_settings").select("*").eq("id", 1).maybeSingle(),
    admin.from("registration_fees").select("*").eq("is_active", true).order("sort_order", { ascending: true }).order("created_at", { ascending: true }),
  ]);
  if (settingsError) throw settingsError;
  if (feesError) throw feesError;
  return { settings: settings || null, fees: fees || [] };
}

export function validateRegistrationPayload(payload) {
  const guardian = payload?.guardian || {};
  const students = Array.isArray(payload?.students) ? payload.students : [];
  const errors = [];

  const guardianFirstName = clean(guardian.firstName, 80);
  const guardianLastName = clean(guardian.lastName, 80);
  const email = clean(guardian.email, 160).toLowerCase();
  const phone = normalizePhone(guardian.phone);

  if (!guardianFirstName) errors.push("Guardian first name is required.");
  if (!guardianLastName) errors.push("Guardian last name is required.");
  if (!isEmail(email)) errors.push("A valid guardian email is required.");
  if (phone.length < 7) errors.push("A valid guardian phone number is required.");
  if (!students.length) errors.push("Add at least one student.");
  if (students.length > 10) errors.push("A maximum of 10 students can be registered at one time.");

  const normalizedStudents = students.slice(0, 10).map((student, index) => {
    const firstName = clean(student?.firstName, 80);
    const lastName = clean(student?.lastName, 80);
    const dob = clean(student?.dateOfBirth, 10);
    const grade = clean(student?.grade, 50);
    const gender = clean(student?.gender, 30);
    if (!firstName || !lastName) errors.push(`Student ${index + 1} name is required.`);
    if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) errors.push(`Student ${index + 1} date of birth is required.`);
    if (!grade) errors.push(`Student ${index + 1} grade is required.`);
    return {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dob || null,
      gender: gender || null,
      grade,
      returning_student: Boolean(student?.returningStudent),
      medical_notes: clean(student?.medicalNotes, 1200) || null,
    };
  });

  return {
    errors,
    guardian: {
      guardian_first_name: guardianFirstName,
      guardian_last_name: guardianLastName,
      guardian_email: email,
      guardian_phone: phone,
      address_line_1: clean(guardian.addressLine1, 160) || null,
      address_line_2: clean(guardian.addressLine2, 160) || null,
      city: clean(guardian.city, 100) || null,
      state: clean(guardian.state, 30) || null,
      postal_code: clean(guardian.postalCode, 20) || null,
      emergency_contact_name: clean(guardian.emergencyContactName, 120) || null,
      emergency_contact_phone: normalizePhone(guardian.emergencyContactPhone) || null,
      notes: clean(payload?.notes, 2000) || null,
    },
    students: normalizedStudents,
  };
}
