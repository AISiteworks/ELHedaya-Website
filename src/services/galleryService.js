import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const TABLE = import.meta.env.VITE_GALLERY_TABLE?.trim() || "school_gallery";
const BUCKET = import.meta.env.VITE_GALLERY_BUCKET?.trim() || "school-gallery";
const LOCAL_KEY = "el-hedaya-gallery-preview-v1";

export const galleryBackendConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const supabase = galleryBackendConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

function readLocalGallery() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}

function writeLocalGallery(items) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(items));
}

function newestFirst(items) {
  return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("The selected image could not be read."));
    reader.readAsDataURL(file);
  });
}

function safeFileName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isGalleryAdmin(user) {
  if (!user) return false;
  return user.app_metadata?.role === "admin" || user.app_metadata?.gallery_admin === true;
}

export async function getGallerySession() {
  if (!supabase) return { user: null, isAdmin: true, mode: "local" };
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const user = data.session?.user || null;
  return { user, isAdmin: isGalleryAdmin(user), mode: "supabase" };
}

export function onGalleryAuthChange(callback) {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user || null;
    callback({ user, isAdmin: isGalleryAdmin(user), mode: "supabase" });
  });
  return () => data.subscription.unsubscribe();
}

export async function signInGalleryAdmin(email, password) {
  if (!supabase) return { user: null, isAdmin: true, mode: "local" };
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!isGalleryAdmin(data.user)) {
    await supabase.auth.signOut();
    throw new Error("This account does not have school administrator access.");
  }
  return { user: data.user, isAdmin: true, mode: "supabase" };
}

export async function signOutGalleryAdmin() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function listGalleryImages({ includeUnpublished = false } = {}) {
  if (!supabase) {
    const items = newestFirst(readLocalGallery());
    return includeUnpublished ? items : items.filter((item) => item.is_published !== false);
  }

  let query = supabase
    .from(TABLE)
    .select("id,title,caption,image_url,storage_path,source_type,is_published,created_at,sort_order")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (!includeUnpublished) query = query.eq("is_published", true);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function addGalleryUrl({ url, title, caption, isPublished = true }) {
  const normalizedUrl = url.trim();
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    throw new Error("Enter a complete image URL beginning with http:// or https://.");
  }

  if (!supabase) {
    const item = {
      id: crypto.randomUUID(),
      title: title?.trim() || "",
      caption: caption?.trim() || "",
      image_url: normalizedUrl,
      storage_path: null,
      source_type: "url",
      is_published: Boolean(isPublished),
      sort_order: 0,
      created_at: new Date().toISOString(),
    };
    writeLocalGallery([item, ...readLocalGallery()]);
    return item;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      title: title?.trim() || null,
      caption: caption?.trim() || null,
      image_url: normalizedUrl,
      source_type: "url",
      is_published: Boolean(isPublished),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadGalleryFile({ file, title, caption, isPublished = true }) {
  if (!file) throw new Error("Choose an image to upload.");
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Please use an image smaller than 10 MB.");

  if (!supabase) {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error("For local preview mode, use an image smaller than 2 MB. Supabase mode supports files up to 10 MB.");
    }
    const imageUrl = await fileToDataUrl(file);
    const item = {
      id: crypto.randomUUID(),
      title: title?.trim() || "",
      caption: caption?.trim() || "",
      image_url: imageUrl,
      storage_path: null,
      source_type: "upload",
      is_published: Boolean(isPublished),
      sort_order: 0,
      created_at: new Date().toISOString(),
    };
    writeLocalGallery([item, ...readLocalGallery()]);
    return item;
  }

  const fileName = safeFileName(file.name || "photo.jpg") || "photo.jpg";
  const storagePath = `gallery/${Date.now()}-${crypto.randomUUID()}-${fileName}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const imageUrl = publicUrlData.publicUrl;
  const { data, error: insertError } = await supabase
    .from(TABLE)
    .insert({
      title: title?.trim() || null,
      caption: caption?.trim() || null,
      image_url: imageUrl,
      storage_path: storagePath,
      source_type: "upload",
      is_published: Boolean(isPublished),
    })
    .select()
    .single();

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw insertError;
  }
  return data;
}

export async function updateGalleryPublication(item, isPublished) {
  if (!item?.id) throw new Error("Invalid gallery item.");

  if (!supabase) {
    const items = readLocalGallery().map((entry) =>
      entry.id === item.id ? { ...entry, is_published: Boolean(isPublished) } : entry
    );
    writeLocalGallery(items);
    return;
  }

  const { error } = await supabase
    .from(TABLE)
    .update({ is_published: Boolean(isPublished) })
    .eq("id", item.id);
  if (error) throw error;
}

export async function deleteGalleryImage(item) {
  if (!item?.id) throw new Error("Invalid gallery item.");

  if (!supabase) {
    writeLocalGallery(readLocalGallery().filter((entry) => entry.id !== item.id));
    return;
  }

  if (item.storage_path) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storage_path]);
    if (storageError) throw storageError;
  }

  const { error } = await supabase.from(TABLE).delete().eq("id", item.id);
  if (error) throw error;
}
