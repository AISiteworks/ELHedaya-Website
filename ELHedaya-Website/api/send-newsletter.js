import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const MAX_SUBJECT = 120;
const MAX_PREHEADER = 180;
const MAX_HEADLINE = 120;
const MAX_BODY = 12000;
const MAX_CTA_LABEL = 50;
const MAX_CTA_URL = 1000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const ALLOWED_ATTACHMENT_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const SEND_CONCURRENCY = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, message: "Method not allowed." });
  }

  try {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const smtpHost = process.env.SMTP_HOST || "smtp.hostinger.com";
    const smtpPort = Number(process.env.SMTP_PORT || 465);
    const smtpUser = process.env.SMTP_USER;
    const smtpPassword = process.env.SMTP_PASSWORD;
    const newsletterFrom = process.env.NEWSLETTER_FROM || `EL Hedaya Islamic School <${smtpUser || "newsletter@elhedaya-cic.com"}>`;
    const replyTo = process.env.NEWSLETTER_REPLY_TO || smtpUser;
    const publicSiteUrl = (process.env.PUBLIC_SITE_URL || "https://elhedaya-cic.com").replace(/\/$/, "");
    const attachmentBucket = process.env.NEWSLETTER_ATTACHMENT_BUCKET || "newsletter-attachments";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      throw new Error("Supabase server environment variables are incomplete.");
    }
    if (!smtpUser || !smtpPassword) {
      throw new Error("Hostinger SMTP credentials are not configured.");
    }

    const authHeader = String(req.headers.authorization || "");
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, message: "Not authenticated." });
    }

    const accessToken = authHeader.slice("Bearer ".length).trim();
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(accessToken);
    const user = userData?.user;

    if (userError || !user) {
      return res.status(401).json({ ok: false, message: "Your administrator session has expired. Please sign in again." });
    }
    if (user.app_metadata?.role !== "admin") {
      return res.status(403).json({ ok: false, message: "Administrator access required." });
    }

    const payload = parseBody(req.body);
    const subject = clean(payload.subject, MAX_SUBJECT);
    const preheader = clean(payload.preheader, MAX_PREHEADER);
    const headline = clean(payload.headline, MAX_HEADLINE);
    const body = clean(payload.body, MAX_BODY);
    const ctaLabel = clean(payload.ctaLabel, MAX_CTA_LABEL);
    const ctaUrl = clean(payload.ctaUrl, MAX_CTA_URL);
    const isTest = Boolean(payload.testEmail);
    const testEmail = isTest ? String(user.email || "").trim().toLowerCase() : "";
    const attachmentMeta = validateAttachment(payload.attachment, user.id);

    if (!subject || !headline || !body) {
      return res.status(400).json({ ok: false, message: "Subject, headline, and message are required." });
    }
    if (ctaUrl && !/^https?:\/\//i.test(ctaUrl)) {
      return res.status(400).json({ ok: false, message: "CTA URL must begin with http:// or https://." });
    }
    if (isTest && !isEmail(testEmail)) {
      return res.status(400).json({ ok: false, message: "Your administrator account does not have a valid email address." });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    let mailAttachments = [];
    if (attachmentMeta) {
      const { data: flyerBlob, error: flyerError } = await admin.storage
        .from(attachmentBucket)
        .download(attachmentMeta.path);
      if (flyerError) throw new Error(`Flyer attachment could not be loaded: ${flyerError.message}`);
      const flyerBuffer = Buffer.from(await flyerBlob.arrayBuffer());
      if (flyerBuffer.length > MAX_ATTACHMENT_BYTES) {
        throw new Error("Flyer attachment is larger than the 10 MB limit.");
      }
      mailAttachments = [{
        filename: attachmentMeta.name,
        content: flyerBuffer,
        contentType: attachmentMeta.contentType,
      }];
    }

    let recipients = [];
    if (isTest) {
      recipients = [{ email: testEmail, unsubscribe_token: null }];
    } else {
      const { data, error } = await admin
        .from("newsletter_subscribers")
        .select("email,unsubscribe_token")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      recipients = data || [];
    }

    if (!recipients.length) {
      return res.status(400).json({ ok: false, message: "There are no active newsletter subscribers." });
    }

    let campaignId = null;
    if (!isTest) {
      const { data, error } = await admin
        .from("newsletter_campaigns")
        .insert({
          subject,
          preheader: preheader || null,
          headline,
          body,
          cta_label: ctaLabel || null,
          cta_url: ctaUrl || null,
          attachment_name: attachmentMeta?.name || null,
          status: "sending",
          created_by: user.id,
        })
        .select("id")
        .single();
      if (error) throw error;
      campaignId = data.id;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
      pool: true,
      maxConnections: SEND_CONCURRENCY,
      maxMessages: 50,
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 30000,
    });

    // Fail before sending anything if the mailbox credentials/server are incorrect.
    await transporter.verify();

    let sentCount = 0;
    let failedCount = 0;

    for (const group of chunk(recipients, SEND_CONCURRENCY)) {
      const results = await Promise.allSettled(
        group.map(async (recipient) => {
          const unsubscribeUrl = recipient.unsubscribe_token
            ? `${publicSiteUrl}/newsletter/unsubscribe?token=${encodeURIComponent(recipient.unsubscribe_token)}`
            : "";

          const info = await transporter.sendMail({
            from: newsletterFrom,
            to: recipient.email,
            replyTo,
            subject,
            html: emailHtml({
              preheader,
              headline,
              body,
              ctaLabel,
              ctaUrl,
              publicSiteUrl,
              unsubscribeUrl,
              isTest,
            }),
            text: emailText({
              headline,
              body,
              ctaLabel,
              ctaUrl,
              publicSiteUrl,
              unsubscribeUrl,
              isTest,
            }),
            headers: unsubscribeUrl
              ? { "List-Unsubscribe": `<${unsubscribeUrl}>` }
              : undefined,
            attachments: mailAttachments,
          });

          if (!info.accepted?.length) {
            throw new Error("SMTP server did not accept the recipient.");
          }
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") sentCount += 1;
        else {
          failedCount += 1;
          console.error("Newsletter recipient send failed:", result.reason);
        }
      }
    }

    transporter.close();

    if (!isTest && attachmentMeta && sentCount > 0) {
      const { error: cleanupError } = await admin.storage
        .from(attachmentBucket)
        .remove([attachmentMeta.path]);
      if (cleanupError) console.error("Newsletter flyer cleanup failed:", cleanupError);
    }

    if (campaignId) {
      const status = sentCount && !failedCount ? "sent" : sentCount ? "partial" : "failed";
      const { error } = await admin
        .from("newsletter_campaigns")
        .update({
          status,
          sent_count: sentCount,
          failed_count: failedCount,
          sent_at: new Date().toISOString(),
        })
        .eq("id", campaignId);
      if (error) console.error("Campaign status update failed:", error);
    }

    if (!sentCount) {
      return res.status(502).json({
        ok: false,
        message: "Hostinger SMTP did not accept any newsletter messages.",
        sentCount,
        failedCount,
      });
    }

    return res.status(200).json({ ok: true, sentCount, failedCount, test: isTest });
  } catch (error) {
    console.error("Newsletter API error:", error);
    return res.status(500).json({
      ok: false,
      message: error instanceof Error ? error.message : "Newsletter send failed.",
    });
  }
}

function validateAttachment(value, userId) {
  if (!value) return null;
  if (!value || typeof value !== "object") throw new Error("Flyer attachment details are invalid.");

  const path = clean(value.path, 700);
  const name = clean(value.name, 180);
  const contentType = clean(value.contentType, 100).toLowerCase();
  const size = Number(value.size || 0);

  if (!path || !name || !contentType) throw new Error("Flyer attachment details are incomplete.");
  if (!path.startsWith(`${userId}/`) || path.includes("..")) throw new Error("Flyer attachment path is not allowed.");
  if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) throw new Error("Flyers must be PDF, JPG, PNG, WEBP, or GIF files.");
  if (!Number.isFinite(size) || size <= 0 || size > MAX_ATTACHMENT_BYTES) throw new Error("Flyer attachment must be 10 MB or smaller.");

  return { path, name, contentType, size };
}

function parseBody(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try { return JSON.parse(value); } catch { return {}; }
  }
  return value;
}

function clean(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function chunk(items, size) {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function paragraphs(value) {
  return String(value)
    .split(/\n{2,}/)
    .map((part) => `<p style="margin:0 0 16px;line-height:1.7;color:#43524b;font-size:16px">${escapeHtml(part).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function emailHtml({ preheader, headline, body, ctaLabel, ctaUrl, publicSiteUrl, unsubscribeUrl, isTest }) {
  return `<!doctype html><html><body style="margin:0;background:#f5f0e6;font-family:Arial,sans-serif;color:#16372e"><div style="display:none;max-height:0;overflow:hidden">${escapeHtml(preheader || "EL Hedaya Islamic School update")}</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f0e6;padding:32px 12px"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #e5ded0"><tr><td style="padding:24px 30px;background:#0a493b;color:#fff"><div style="font-size:20px;font-weight:700">EL HEDAYA</div><div style="font-size:11px;letter-spacing:2px;color:#e8ca83;margin-top:3px">ISLAMIC SCHOOL · CLEMMONS ISLAMIC CENTER</div></td></tr><tr><td style="padding:34px 30px 28px"><div style="font-size:13px;color:#b4882f;font-weight:700;letter-spacing:1.5px;text-transform:uppercase">School Newsletter</div><h1 style="margin:10px 0 22px;font-family:Georgia,serif;font-size:34px;line-height:1.12;color:#0b493b">${escapeHtml(headline)}</h1>${paragraphs(body)}${ctaLabel && ctaUrl ? `<p style="margin:26px 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:#c79a3b;color:#102f27;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:10px">${escapeHtml(ctaLabel)}</a></p>` : ""}${isTest ? `<div style="margin-top:24px;padding:12px;border-radius:10px;background:#fff7df;color:#765714;font-size:13px"><strong>Test email:</strong> this message was sent only to the administrator.</div>` : ""}</td></tr><tr><td style="padding:22px 30px;background:#f8f6f0;color:#7b857f;font-size:12px;line-height:1.6"><div>EL Hedaya Islamic School · Clemmons, North Carolina</div><div><a href="${escapeHtml(publicSiteUrl)}" style="color:#39695b">${escapeHtml(publicSiteUrl)}</a></div>${unsubscribeUrl ? `<div style="margin-top:12px">You received this because you subscribed to EL Hedaya school updates. <a href="${escapeHtml(unsubscribeUrl)}" style="color:#80611f">Unsubscribe</a>.</div>` : ""}</td></tr></table></td></tr></table></body></html>`;
}

function emailText({ headline, body, ctaLabel, ctaUrl, publicSiteUrl, unsubscribeUrl, isTest }) {
  return `${headline}\n\n${body}${ctaLabel && ctaUrl ? `\n\n${ctaLabel}: ${ctaUrl}` : ""}\n\nEL Hedaya Islamic School\n${publicSiteUrl}${unsubscribeUrl ? `\n\nUnsubscribe: ${unsubscribeUrl}` : ""}${isTest ? "\n\nTEST EMAIL - sent only to the administrator." : ""}`;
}
