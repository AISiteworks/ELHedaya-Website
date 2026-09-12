import { getRegistrationConfig, serverSupabase, squareConfig } from "./_registration.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  try {
    const admin = serverSupabase();
    const { settings, fees } = await getRegistrationConfig(admin);
    const square = squareConfig();
    return res.status(200).json({
      ok: true,
      settings: settings ? {
        registrationOpen: Boolean(settings.registration_open),
        schoolYear: settings.school_year,
        termName: settings.term_name,
        registrationDeadline: settings.registration_deadline,
        welcomeMessage: settings.welcome_message,
        confirmationMessage: settings.confirmation_message,
        contactEmail: settings.contact_email,
        contactPhone: settings.contact_phone,
        currency: settings.currency || "USD",
      } : null,
      fees: fees.map((fee) => ({
        id: fee.id,
        name: fee.name,
        description: fee.description,
        amountCents: fee.amount_cents,
        kind: fee.kind,
        scope: fee.scope,
        isOptional: Boolean(fee.is_optional),
        appliesAfterStudents: Number(fee.applies_after_students || 0),
      })),
      square: {
        enabled: Boolean(square.applicationId && square.locationId && square.accessToken),
        environment: square.environment,
        applicationId: square.applicationId,
        locationId: square.locationId,
      },
    });
  } catch (error) {
    console.error("Registration config error:", error);
    return res.status(500).json({ ok: false, message: "Registration configuration is not available yet." });
  }
}
