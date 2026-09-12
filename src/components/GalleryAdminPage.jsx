import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Eye,
  EyeOff,
  ImagePlus,
  Images,
  Link2,
  Loader2,
  LockKeyhole,
  LogOut,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
  X,
  Mail,
  ClipboardList,
} from "lucide-react";
import Logo from "./Logo";
import NewsletterAdmin from "./NewsletterAdmin";
import RegistrationAdmin from "./RegistrationAdmin";
import {
  addGalleryUrl,
  deleteGalleryImage,
  galleryBackendConfigured,
  getGallerySession,
  listGalleryImages,
  onGalleryAuthChange,
  signInGalleryAdmin,
  signOutGalleryAdmin,
  updateGalleryPublication,
  uploadGalleryFile,
} from "../services/galleryService";

const localPreviewAllowed = import.meta.env.DEV;
const MAX_BATCH_FILES = 30;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export default function GalleryAdminPage() {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState({ user: null, isAdmin: false, mode: "supabase" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const canUseLocalPreview = !galleryBackendConfigured && localPreviewAllowed;
  const authorized = session.isAdmin || canUseLocalPreview;

  const loadImages = async () => {
    setLoading(true);
    try {
      setImages(await listGalleryImages({ includeUnpublished: authorized }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe = () => {};

    if (!galleryBackendConfigured) {
      setSession({ user: null, isAdmin: canUseLocalPreview, mode: canUseLocalPreview ? "local" : "disabled" });
      setLoading(false);
      if (canUseLocalPreview) listGalleryImages({ includeUnpublished: true }).then(setImages).catch(() => {});
      return unsubscribe;
    }

    getGallerySession()
      .then((nextSession) => {
        setSession(nextSession);
        return listGalleryImages({ includeUnpublished: nextSession.isAdmin });
      })
      .then(setImages)
      .catch(() => {})
      .finally(() => setLoading(false));

    unsubscribe = onGalleryAuthChange((nextSession) => {
      setSession(nextSession);
      listGalleryImages({ includeUnpublished: nextSession.isAdmin }).then(setImages).catch(() => {});
    });

    return () => unsubscribe();
  }, [canUseLocalPreview]);

  const login = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    try {
      const nextSession = await signInGalleryAdmin(email.trim(), password);
      setSession(nextSession);
      setImages(await listGalleryImages({ includeUnpublished: true }));
    } catch (err) {
      setAuthError(err?.message || "Unable to sign in.");
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    await signOutGalleryAdmin();
    setSession({ user: null, isAdmin: false, mode: "supabase" });
    setImages(await listGalleryImages({ includeUnpublished: false }));
  };

  return (
    <main className="hidden-admin-page">
      <header className="hidden-admin-header">
        <div className="container hidden-admin-header-inner">
          <Logo />
          <button className="hidden-admin-back" onClick={() => window.location.assign("/")}>
            <ArrowLeft size={17} /> Return to school website
          </button>
        </div>
      </header>

      <section className="hidden-admin-content">
        <div className="container hidden-admin-shell">
          <div className="hidden-admin-title">
            <span className="admin-kicker"><ShieldCheck size={15} /> Private Administration</span>
            <h1>School Administration</h1>
            <p>This private workspace is intentionally not linked anywhere on the public website.</p>
          </div>

          {!galleryBackendConfigured && !canUseLocalPreview ? (
            <div className="admin-panel admin-panel-standalone">
              <div className="gallery-alert gallery-alert-error">
                <strong>School administration is disabled.</strong>
                <span>Connect Supabase before using the admin area on a deployed website.</span>
              </div>
            </div>
          ) : galleryBackendConfigured && !session.isAdmin ? (
            <div className="admin-panel admin-panel-standalone admin-login-shell">
              <form className="admin-login" onSubmit={login}>
                <div className="admin-lock"><LockKeyhole size={26} /></div>
                <h4>Administrator sign in</h4>
                <p>Only authorized EL Hedaya administrators can access school management tools.</p>
                <label className="gallery-field"><span>Email</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required /></label>
                <label className="gallery-field"><span>Password</span><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required /></label>
                {authError && <div className="gallery-alert gallery-alert-error">{authError}</div>}
                <button className="button button-green" type="submit" disabled={authLoading}>
                  {authLoading ? <Loader2 className="spin" size={18} /> : <LockKeyhole size={17} />}
                  {authLoading ? "Signing in…" : "Sign In"}
                </button>
              </form>
            </div>
          ) : (
            <AdminWorkspace images={images} loading={loading} session={session} localPreview={canUseLocalPreview} onRefresh={loadImages} onLogout={logout} />
          )}
        </div>
      </section>
    </main>
  );
}


function AdminWorkspace(props) {
  const [section, setSection] = useState("gallery");

  return (
    <>
      <div className="admin-section-tabs" role="tablist" aria-label="School administration sections">
        <button type="button" className={section === "gallery" ? "active" : ""} onClick={() => setSection("gallery")}><Images size={17} /> Picture Gallery</button>
        <button type="button" className={section === "newsletter" ? "active" : ""} onClick={() => setSection("newsletter")}><Mail size={17} /> Newsletter</button>
        <button type="button" className={section === "registration" ? "active" : ""} onClick={() => setSection("registration")}><ClipboardList size={17} /> Registration</button>
      </div>
      {section === "gallery" && <GalleryWorkspace {...props} />}
      {section === "newsletter" && <NewsletterAdmin session={props.session} localPreview={props.localPreview} onLogout={props.onLogout} />}
      {section === "registration" && <RegistrationAdmin session={props.session} localPreview={props.localPreview} />}
    </>
  );
}

function GalleryWorkspace({ images, loading, session, localPreview, onRefresh, onLogout }) {
  const [mode, setMode] = useState("upload");
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [url, setUrl] = useState("");
  const [uploadQueue, setUploadQueue] = useState([]);
  const [publishNow, setPublishNow] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [deleteId, setDeleteId] = useState("");
  const [visibilityId, setVisibilityId] = useState("");
  const fileInputRef = useRef(null);
  const queueRef = useRef([]);

  useEffect(() => {
    queueRef.current = uploadQueue;
  }, [uploadQueue]);

  useEffect(() => () => {
    queueRef.current.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  const urlPreview = useMemo(() => (mode === "url" ? url.trim() : ""), [mode, url]);
  const pendingCount = uploadQueue.filter((item) => item.status !== "success").length;
  const uploadedCount = uploadQueue.filter((item) => item.status === "success").length;
  const queueBytes = uploadQueue.reduce((total, item) => total + item.file.size, 0);

  const addFilesToQueue = (fileList) => {
    const incoming = Array.from(fileList || []);
    if (!incoming.length || saving) return;

    const existingSignatures = new Set(uploadQueue.map((item) => fileSignature(item.file)));
    const availableSlots = Math.max(0, MAX_BATCH_FILES - uploadQueue.length);
    const accepted = [];
    const skipped = [];

    incoming.slice(0, availableSlots).forEach((file) => {
      const reason = validateSelectedFile(file);
      if (reason) {
        skipped.push(`${file.name}: ${reason}`);
        return;
      }
      if (existingSignatures.has(fileSignature(file))) {
        skipped.push(`${file.name}: already selected`);
        return;
      }
      existingSignatures.add(fileSignature(file));
      accepted.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        status: "queued",
        error: "",
      });
    });

    if (incoming.length > availableSlots) {
      skipped.push(`${incoming.length - availableSlots} file(s) skipped because the batch limit is ${MAX_BATCH_FILES}.`);
    }

    if (accepted.length) {
      setUploadQueue((current) => [...current, ...accepted]);
      setMessage({
        type: "success",
        text: accepted.length === 1 ? "1 picture added to the upload queue." : `${accepted.length} pictures added to the upload queue.`,
      });
    }

    if (skipped.length) {
      setMessage({ type: accepted.length ? "warning" : "error", text: skipped.slice(0, 3).join(" · ") + (skipped.length > 3 ? ` · +${skipped.length - 3} more` : "") });
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeQueuedFile = (id) => {
    if (saving) return;
    setUploadQueue((current) => {
      const item = current.find((entry) => entry.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  };

  const clearQueue = () => {
    if (saving) return;
    uploadQueue.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setUploadQueue([]);
    setMessage({ type: "", text: "" });
  };

  const setQueueItemState = (id, patch) => {
    setUploadQueue((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addPhoto = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });

    try {
      if (mode === "url") {
        await addGalleryUrl({ title, caption, isPublished: publishNow, url });
        setTitle("");
        setCaption("");
        setUrl("");
        setPublishNow(true);
        setMessage({ type: "success", text: publishNow ? "Photo added and published." : "Photo added as hidden." });
        await onRefresh();
        return;
      }

      const candidates = uploadQueue.filter((item) => item.status !== "success");
      if (!candidates.length) throw new Error("Choose one or more pictures to upload.");

      let successes = 0;
      let failures = 0;
      const successfulIds = [];

      for (const item of candidates) {
        setQueueItemState(item.id, { status: "uploading", error: "" });
        try {
          await uploadGalleryFile({
            file: item.file,
            title,
            caption,
            isPublished: publishNow,
          });
          successes += 1;
          successfulIds.push(item.id);
          setQueueItemState(item.id, { status: "success", error: "" });
        } catch (err) {
          failures += 1;
          setQueueItemState(item.id, {
            status: "error",
            error: err?.message || "Upload failed.",
          });
        }
      }

      await onRefresh();

      if (successfulIds.length) {
        setUploadQueue((current) => {
          const completed = current.filter((item) => successfulIds.includes(item.id));
          completed.forEach((item) => URL.revokeObjectURL(item.previewUrl));
          return current.filter((item) => !successfulIds.includes(item.id));
        });
      }

      if (failures === 0) {
        setTitle("");
        setCaption("");
        setPublishNow(true);
        setMessage({
          type: "success",
          text: `${successes} ${successes === 1 ? "photo" : "photos"} uploaded ${publishNow ? "and published" : "as hidden"} successfully.`,
        });
      } else if (successes > 0) {
        setMessage({
          type: "warning",
          text: `${successes} uploaded successfully. ${failures} ${failures === 1 ? "photo remains" : "photos remain"} in the queue and can be retried.`,
        });
      } else {
        setMessage({ type: "error", text: "The batch could not be uploaded. Review the errors below and retry." });
      }
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "The photo could not be added." });
    } finally {
      setSaving(false);
    }
  };

  const toggleVisibility = async (item) => {
    setVisibilityId(item.id);
    setMessage({ type: "", text: "" });
    try {
      const nextPublished = !item.is_published;
      await updateGalleryPublication(item, nextPublished);
      setMessage({ type: "success", text: nextPublished ? "Photo published." : "Photo hidden from visitors." });
      await onRefresh();
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "Visibility could not be changed." });
    } finally {
      setVisibilityId("");
    }
  };

  const remove = async (item) => {
    if (!window.confirm("Delete this photo from the gallery?")) return;
    setDeleteId(item.id);
    setMessage({ type: "", text: "" });
    try {
      await deleteGalleryImage(item);
      setMessage({ type: "success", text: "Photo deleted." });
      await onRefresh();
    } catch (err) {
      setMessage({ type: "error", text: err?.message || "The photo could not be deleted." });
    } finally {
      setDeleteId("");
    }
  };

  const publishedCount = images.filter((item) => item.is_published !== false).length;
  const hiddenCount = images.length - publishedCount;
  const submitDisabled = saving || (mode === "upload" ? pendingCount === 0 : !url.trim());

  return (
    <div className="admin-panel admin-panel-standalone">
      {localPreview && (
        <div className="gallery-alert gallery-alert-demo">
          <strong>Local development preview</strong>
          <span>These test photos are stored only in this browser. Production administration requires Supabase.</span>
        </div>
      )}

      <div className="admin-workspace">
        <div className="admin-toolbar">
          <div>
            <strong>{localPreview ? "Local preview administrator" : session.user?.email}</strong>
            <span>{publishedCount} published · {hiddenCount} hidden</span>
          </div>
          {!localPreview && <button className="admin-logout" onClick={onLogout}><LogOut size={16} /> Sign out</button>}
        </div>

        <div className="admin-columns">
          <form className="add-photo-card" onSubmit={addPhoto}>
            <div className="add-photo-title">
              <div className="add-photo-icon"><ImagePlus size={22} /></div>
              <div><span>Add to gallery</span><strong>{mode === "upload" ? "Batch picture upload" : "New school picture"}</strong></div>
            </div>

            <div className="source-tabs" role="tablist" aria-label="Photo source">
              <button type="button" className={mode === "upload" ? "active" : ""} onClick={() => setMode("upload")}><Images size={16} /> Upload Photos</button>
              <button type="button" className={mode === "url" ? "active" : ""} onClick={() => setMode("url")}><Link2 size={16} /> Image URL</button>
            </div>

            {mode === "upload" ? (
              <>
                <label
                  className="upload-dropzone batch-dropzone"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    addFilesToQueue(event.dataTransfer.files);
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={(event) => addFilesToQueue(event.target.files)}
                  />
                  <Upload size={24} />
                  <strong>{uploadQueue.length ? "Add more pictures" : "Choose multiple pictures"}</strong>
                  <span>Click or drag & drop · JPG, PNG, WEBP or GIF · up to 10 MB each</span>
                  <small>Up to {MAX_BATCH_FILES} pictures per batch</small>
                </label>

                {uploadQueue.length > 0 && (
                  <div className="batch-queue">
                    <div className="batch-queue-header">
                      <div>
                        <strong>{uploadQueue.length} selected</strong>
                        <span>{formatBytes(queueBytes)} total{uploadedCount ? ` · ${uploadedCount} completed` : ""}</span>
                      </div>
                      <button type="button" className="batch-clear-button" onClick={clearQueue} disabled={saving}>Clear all</button>
                    </div>

                    <div className="batch-preview-grid">
                      {uploadQueue.map((item) => (
                        <div className={`batch-preview-card status-${item.status}`} key={item.id}>
                          <div className="batch-preview-image">
                            <img src={item.previewUrl} alt={item.file.name} />
                            {item.status === "uploading" && <span className="batch-status-overlay"><Loader2 className="spin" size={20} /></span>}
                            {item.status === "success" && <span className="batch-status-overlay success"><CheckCircle2 size={20} /></span>}
                            {item.status === "error" && <span className="batch-status-overlay error"><AlertCircle size={20} /></span>}
                          </div>
                          <div className="batch-preview-copy">
                            <strong title={item.file.name}>{item.file.name}</strong>
                            <span>{formatBytes(item.file.size)}</span>
                            {item.status === "error" && <small>{item.error}</small>}
                            {item.status === "uploading" && <small>Uploading…</small>}
                          </div>
                          <button
                            type="button"
                            className="batch-remove-button"
                            onClick={() => removeQueuedFile(item.id)}
                            disabled={saving}
                            aria-label={`Remove ${item.file.name}`}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <>
                <label className="gallery-field"><span>Direct image URL</span><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/school-photo.jpg" required /></label>
                {urlPreview && <div className="admin-image-preview"><img src={urlPreview} alt="New gallery preview" /></div>}
              </>
            )}

            <label className="gallery-field">
              <span>Title <small>optional{mode === "upload" && uploadQueue.length > 1 ? " · applies to the whole batch" : ""}</small></span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={mode === "upload" && uploadQueue.length > 1 ? "Example: Sunday School Spring 2026" : "Quran Class"} maxLength="80" />
            </label>
            <label className="gallery-field">
              <span>Caption <small>optional{mode === "upload" && uploadQueue.length > 1 ? " · applies to the whole batch" : ""}</small></span>
              <textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="A short description of this moment…" rows="3" maxLength="240" />
            </label>

            <label className="publish-switch-row">
              <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
              <span className="publish-switch" aria-hidden="true"><span /></span>
              <span><strong>Publish immediately</strong><small>Turn this off to save the {mode === "upload" && uploadQueue.length > 1 ? "batch" : "photo"} hidden until you are ready.</small></span>
            </label>

            {message.text && <div className={`gallery-alert gallery-alert-${message.type}`}>{message.text}</div>}
            <button className="button button-gold add-photo-submit" type="submit" disabled={submitDisabled}>
              {saving ? <Loader2 className="spin" size={18} /> : mode === "upload" && pendingCount > 1 ? <Images size={18} /> : <Plus size={18} />}
              {saving
                ? mode === "upload" ? `Uploading ${pendingCount}…` : "Adding Photo…"
                : mode === "upload"
                  ? pendingCount > 1
                    ? `${publishNow ? "Upload & Publish" : "Upload Hidden"} ${pendingCount} Photos`
                    : publishNow ? "Upload & Publish Photo" : "Upload Hidden Photo"
                  : publishNow ? "Add & Publish" : "Save Hidden Photo"}
            </button>
          </form>

          <div className="manage-photo-card">
            <div className="manage-photo-heading"><div><span>Current gallery</span><strong>Manage visibility & pictures</strong></div><span className="photo-count">{images.length}</span></div>
            {loading ? (
              <div className="admin-empty-list"><Loader2 className="spin" size={24} /><span>Loading pictures…</span></div>
            ) : images.length === 0 ? (
              <div className="admin-empty-list"><Camera size={24} /><span>No pictures yet.</span></div>
            ) : (
              <div className="admin-photo-list">
                {images.map((item) => (
                  <div className={`admin-photo-row ${item.is_published === false ? "is-hidden" : ""}`} key={item.id}>
                    <img src={item.image_url} alt={item.title || "Gallery thumbnail"} />
                    <div>
                      <strong>{item.title || "Untitled photo"}</strong>
                      <span className={`photo-status ${item.is_published === false ? "hidden" : "published"}`}>
                        {item.is_published === false ? <><EyeOff size={12} /> Hidden</> : <><Eye size={12} /> Published</>}
                        <i>·</i> {item.source_type === "url" ? "Image URL" : "Uploaded file"}
                      </span>
                    </div>
                    <div className="admin-photo-actions">
                      <button className="visibility-photo" onClick={() => toggleVisibility(item)} disabled={visibilityId === item.id} aria-label={item.is_published === false ? "Publish photo" : "Hide photo"}>
                        {visibilityId === item.id ? <Loader2 className="spin" size={17} /> : item.is_published === false ? <Eye size={17} /> : <EyeOff size={17} />}
                      </button>
                      <button className="delete-photo" onClick={() => remove(item)} disabled={deleteId === item.id} aria-label={`Delete ${item.title || "photo"}`}>
                        {deleteId === item.id ? <Loader2 className="spin" size={17} /> : <Trash2 size={17} />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function fileSignature(file) {
  return `${file.name}::${file.size}::${file.lastModified}`;
}

function validateSelectedFile(file) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "unsupported image type";
  if (file.size > MAX_FILE_BYTES) return "larger than 10 MB";
  return "";
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, index);
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}
