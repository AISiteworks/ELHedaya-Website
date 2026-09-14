import { galleryBackendConfigured, supabase } from "./galleryService";

export const newsletterBackendConfigured = galleryBackendConfigured;

export const NEWSLETTER_ATTACHMENT_BUCKET =
  import.meta.env.VITE_NEWSLETTER_ATTACHMENT_BUCKET?.trim() || "newsletter-attachments";

const MAX_FLYER_BYTES = 10 * 1024 * 1024;
const ALLOWED_FLYER_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function requireBackend() {
  if (!supabase) throw new Error("Newsletter service is not configured yet.");
}

export async function subscribeToNewsletter(email) {
  requireBackend();
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error("Enter a valid email address.");
  }

  const { data, error } = await supabase.rpc("subscribe_newsletter", { p_email: normalizedEmail });
  if (error) throw error;
  return data;
}

export async function unsubscribeFromNewsletter(token) {
  requireBackend();
  const { data, error } = await supabase.rpc("unsubscribe_newsletter", { p_token: token });
  if (error) throw error;
  return data;
}

export async function listNewsletterSubscribers() {
  requireBackend();
  const { data, error } = await supabase
    .from("newsletter_subscribers")
    .select("id,email,is_active,created_at,updated_at,unsubscribed_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function setNewsletterSubscriberActive(id, isActive) {
  requireBackend();
  const { error } = await supabase
    .from("newsletter_subscribers")
    .update({
      is_active: Boolean(isActive),
      unsubscribed_at: isActive ? null : new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function listNewsletterCampaigns() {
  requireBackend();
  const { data, error } = await supabase
    .from("newsletter_campaigns")
    .select("id,subject,headline,status,sent_count,failed_count,attachment_name,sent_at,created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}

export async function uploadNewsletterAttachment(file, userId) {
  requireBackend();
  if (!file || !(file instanceof File)) throw new Error("Choose a flyer to attach.");
  if (!userId) throw new Error("Administrator session is missing.");
  if (!ALLOWED_FLYER_TYPES.has(file.type)) {
    throw new Error("Flyers must be PDF, JPG, PNG, WEBP, or GIF files.");
  }
  if (file.size > MAX_FLYER_BYTES) {
    throw new Error("Flyer attachments must be 10 MB or smaller.");
  }

  const safeName = file.name
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "school-flyer";
  const objectPath = `${userId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;

  const { error } = await supabase.storage
    .from(NEWSLETTER_ATTACHMENT_BUCKET)
    .upload(objectPath, file, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: false,
    });
  if (error) throw error;

  return {
    path: objectPath,
    name: file.name.slice(0, 180),
    contentType: file.type,
    size: file.size,
  };
}

export async function deleteNewsletterAttachment(objectPath) {
  requireBackend();
  if (!objectPath) return;
  const { error } = await supabase.storage
    .from(NEWSLETTER_ATTACHMENT_BUCKET)
    .remove([objectPath]);
  if (error && !/not found/i.test(error.message || "")) throw error;
}

export async function sendNewsletter(payload) {
  requireBackend();

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  const accessToken = sessionData?.session?.access_token;
  if (!accessToken) throw new Error("Your administrator session has expired. Please sign in again.");

  const response = await fetch("/api/send-newsletter", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Keep a friendly fallback when an upstream platform returns non-JSON output.
  }

  if (!response.ok || !data?.ok) {
    throw new Error(data?.message || "Newsletter could not be sent.");
  }
  return data;
}
