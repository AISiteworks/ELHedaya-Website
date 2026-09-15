import { clean, isEmail, normalizePhone, parseBody, serverSupabase } from "./_registration.js";

const allowedRelationships = new Set(["Parent / Guardian", "Community Member", "Former Student / Family", "Other"]);

function cleanList(value, maxItems = 12) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => clean(item, 100)).filter(Boolean);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  try {
    const body = parseBody(req.body);
    if (clean(body.website, 120)) return res.status(200).json({ ok: true });

    const fullName = clean(body.fullName, 120);
    const email = clean(body.email, 180).toLowerCase();
    const phone = normalizePhone(body.phone);
    const relationshipRaw = clean(body.relationship, 80);
    const relationship = allowedRelationships.has(relationshipRaw) ? relationshipRaw : "Other";
    const interests = cleanList(body.interests);
    const availability = cleanList(body.availability);
    const message = clean(body.message, 1800) || null;

    if (fullName.length < 2) return res.status(400).json({ ok: false, message: "Please enter your full name." });
    if (!isEmail(email)) return res.status(400).json({ ok: false, message: "Please enter a valid email address." });

    const admin = serverSupabase();
    const { error } = await admin.from("volunteer_submissions").insert({
      full_name: fullName,
      email,
      phone: phone || null,
      relationship,
      interests,
      availability,
      message,
      status: "new",
    });
    if (error) throw error;

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Volunteer submission error:", error);
    return res.status(500).json({ ok: false, message: "We couldn’t save your volunteer interest right now. Please try again." });
  }
}
