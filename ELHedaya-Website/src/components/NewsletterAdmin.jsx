import { useEffect, useMemo, useRef, useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  History,
  Loader2,
  Mail,
  Paperclip,
  FileText,
  RefreshCw,
  Search,
  Send,
  Trash2,
  UploadCloud,
  Users,
} from "lucide-react";
import {
  deleteNewsletterAttachment,
  listNewsletterCampaigns,
  listNewsletterSubscribers,
  sendNewsletter,
  setNewsletterSubscriberActive,
  uploadNewsletterAttachment,
} from "../services/newsletterService";

const EMPTY_DRAFT = {
  subject: "",
  preheader: "",
  headline: "",
  body: "",
  ctaLabel: "",
  ctaUrl: "",
};

export default function NewsletterAdmin({ session, localPreview, onLogout }) {
  const [subscribers, setSubscribers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState("");
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [attachment, setAttachment] = useState(null);
  const [attachmentUploading, setAttachmentUploading] = useState(false);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState("");
  const flyerInputRef = useRef(null);

  const load = async () => {
    if (localPreview) {
      setSubscribers([]);
      setCampaigns([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [nextSubscribers, nextCampaigns] = await Promise.all([
        listNewsletterSubscribers(),
        listNewsletterCampaigns(),
      ]);
      setSubscribers(nextSubscribers);
      setCampaigns(nextCampaigns);
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Newsletter data could not be loaded." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => () => {
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
  }, [attachmentPreviewUrl]);

  const activeSubscribers = subscribers.filter((item) => item.is_active);
  const filteredSubscribers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return subscribers;
    return subscribers.filter((item) => item.email.toLowerCase().includes(needle));
  }, [query, subscribers]);

  const updateDraft = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const chooseFlyer = async (file) => {
    if (!file) return;
    setMessage({ type: "", text: "" });
    if (localPreview) {
      setMessage({ type: "error", text: "Flyer uploads require the production Supabase setup." });
      return;
    }

    setAttachmentUploading(true);
    try {
      const uploaded = await uploadNewsletterAttachment(file, session.user?.id);
      if (attachment?.path) {
        try { await deleteNewsletterAttachment(attachment.path); } catch { /* keep the newly uploaded flyer */ }
      }
      if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
      setAttachment(uploaded);
      setAttachmentPreviewUrl(file.type.startsWith("image/") ? URL.createObjectURL(file) : "");
      setMessage({ type: "success", text: `${file.name} is attached and ready to send.` });
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Flyer could not be attached." });
    } finally {
      setAttachmentUploading(false);
      if (flyerInputRef.current) flyerInputRef.current.value = "";
    }
  };

  const removeFlyer = async () => {
    if (!attachment) return;
    setMessage({ type: "", text: "" });
    try {
      if (!localPreview) await deleteNewsletterAttachment(attachment.path);
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Flyer could not be removed." });
      return;
    }
    if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
    setAttachment(null);
    setAttachmentPreviewUrl("");
  };

  const validateDraft = () => {
    if (!draft.subject.trim()) throw new Error("Add an email subject.");
    if (!draft.headline.trim()) throw new Error("Add a newsletter headline.");
    if (!draft.body.trim()) throw new Error("Add the newsletter message.");
    if (draft.ctaUrl.trim() && !/^https?:\/\//i.test(draft.ctaUrl.trim())) throw new Error("CTA link must begin with http:// or https://.");
  };

  const send = async (testOnly) => {
    setMessage({ type: "", text: "" });
    try {
      validateDraft();
      if (localPreview) throw new Error("Newsletter sending is disabled in local preview mode.");
      if (!testOnly && activeSubscribers.length === 0) throw new Error("There are no active subscribers yet.");
      if (!testOnly && !window.confirm(`Send this newsletter to ${activeSubscribers.length} active subscriber${activeSubscribers.length === 1 ? "" : "s"}?`)) return;

      setSending(testOnly ? "test" : "all");
      const result = await sendNewsletter({
        ...draft,
        attachment: attachment || undefined,
        testEmail: testOnly ? session.user?.email : undefined,
      });
      setMessage({
        type: "success",
        text: testOnly
          ? `Test email sent to ${session.user?.email}.`
          : `Newsletter sent to ${result.sentCount} subscriber${result.sentCount === 1 ? "" : "s"}${result.failedCount ? ` · ${result.failedCount} failed` : ""}.`,
      });
      if (!testOnly) {
        if (attachmentPreviewUrl) URL.revokeObjectURL(attachmentPreviewUrl);
        setAttachment(null);
        setAttachmentPreviewUrl("");
        setDraft(EMPTY_DRAFT);
        await load();
      }
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Newsletter could not be sent." });
    } finally {
      setSending("");
    }
  };

  const toggleSubscriber = async (subscriber) => {
    setUpdatingId(subscriber.id);
    setMessage({ type: "", text: "" });
    try {
      await setNewsletterSubscriberActive(subscriber.id, !subscriber.is_active);
      await load();
      setMessage({ type: "success", text: subscriber.is_active ? "Subscriber deactivated." : "Subscriber reactivated." });
    } catch (error) {
      setMessage({ type: "error", text: error?.message || "Subscriber could not be updated." });
    } finally {
      setUpdatingId("");
    }
  };

  return (
    <div className="admin-panel admin-panel-standalone newsletter-admin-panel">
      {localPreview && (
        <div className="gallery-alert gallery-alert-demo">
          <strong>Local development preview</strong>
          <span>Subscriber storage and email sending require the production Supabase setup.</span>
        </div>
      )}

      <div className="admin-toolbar">
        <div>
          <strong>{localPreview ? "Local preview administrator" : session.user?.email}</strong>
          <span>{activeSubscribers.length} active subscribers · {subscribers.length} total</span>
        </div>
        <div className="newsletter-toolbar-actions">
          <button className="admin-logout" onClick={load} disabled={loading}><RefreshCw size={15} /> Refresh</button>
          {!localPreview && <button className="admin-logout" onClick={onLogout}>Sign out</button>}
        </div>
      </div>

      {message.text && <div className={`gallery-alert ${message.type === "success" ? "gallery-alert-success" : "gallery-alert-error"}`}>{message.text}</div>}

      <div className="newsletter-stats">
        <Stat icon={Users} label="Active subscribers" value={activeSubscribers.length} />
        <Stat icon={Mail} label="Total signups" value={subscribers.length} />
        <Stat icon={History} label="Newsletters sent" value={campaigns.filter((item) => item.status === "sent").length} />
      </div>

      <div className="newsletter-admin-grid">
        <section className="newsletter-compose-card">
          <div className="newsletter-admin-heading">
            <span>Compose</span>
            <h3>Send a school newsletter</h3>
            <p>Write once, send an individual branded email to every active subscriber.</p>
          </div>

          <div className="newsletter-compose-fields">
            <label className="gallery-field"><span>Subject</span><input value={draft.subject} onChange={(e) => updateDraft("subject", e.target.value)} placeholder="EL Hedaya Sunday School Update" maxLength="120" /></label>
            <label className="gallery-field"><span>Preview text <small>optional</small></span><input value={draft.preheader} onChange={(e) => updateDraft("preheader", e.target.value)} placeholder="A quick look at what’s happening this week…" maxLength="180" /></label>
            <label className="gallery-field"><span>Headline</span><input value={draft.headline} onChange={(e) => updateDraft("headline", e.target.value)} placeholder="This week at EL Hedaya" maxLength="120" /></label>
            <label className="gallery-field"><span>Message</span><textarea value={draft.body} onChange={(e) => updateDraft("body", e.target.value)} rows="9" placeholder="Write your announcement, reminder, or school update here…" /></label>
            <div className="newsletter-field-pair">
              <label className="gallery-field"><span>Button label <small>optional</small></span><input value={draft.ctaLabel} onChange={(e) => updateDraft("ctaLabel", e.target.value)} placeholder="View School Website" maxLength="50" /></label>
              <label className="gallery-field"><span>Button URL <small>optional</small></span><input type="url" value={draft.ctaUrl} onChange={(e) => updateDraft("ctaUrl", e.target.value)} placeholder="https://elhedaya-cic.com" /></label>
            </div>
            <div className="newsletter-flyer-field">
              <div className="newsletter-flyer-heading">
                <div>
                  <span>Flyer attachment <small>optional</small></span>
                  <p>Attach one PDF or image flyer. PDF, JPG, PNG, WEBP, or GIF · up to 10 MB.</p>
                </div>
                {!attachment && (
                  <button className="newsletter-flyer-button" type="button" onClick={() => flyerInputRef.current?.click()} disabled={attachmentUploading || Boolean(sending)}>
                    {attachmentUploading ? <Loader2 className="spin" size={17} /> : <UploadCloud size={17} />}
                    {attachmentUploading ? "Uploading…" : "Choose Flyer"}
                  </button>
                )}
              </div>
              <input
                ref={flyerInputRef}
                className="newsletter-flyer-input"
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/gif"
                onChange={(event) => chooseFlyer(event.target.files?.[0])}
              />
              {attachment && (
                <div className="newsletter-flyer-card">
                  <div className={`newsletter-flyer-preview ${attachmentPreviewUrl ? "has-image" : ""}`}>
                    {attachmentPreviewUrl ? <img src={attachmentPreviewUrl} alt="Selected newsletter flyer preview" /> : <FileText size={26} />}
                  </div>
                  <div className="newsletter-flyer-meta">
                    <strong>{attachment.name}</strong>
                    <span>{formatBytes(attachment.size)} · {attachment.contentType === "application/pdf" ? "PDF flyer" : "Image flyer"}</span>
                    <small>This file will be attached to every newsletter email.</small>
                  </div>
                  <div className="newsletter-flyer-actions">
                    <button type="button" onClick={() => flyerInputRef.current?.click()} disabled={attachmentUploading || Boolean(sending)} title="Replace flyer"><UploadCloud size={16} /></button>
                    <button type="button" onClick={removeFlyer} disabled={attachmentUploading || Boolean(sending)} title="Remove flyer"><Trash2 size={16} /></button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="newsletter-send-actions">
            <button className="button button-secondary" type="button" onClick={() => send(true)} disabled={Boolean(sending) || attachmentUploading}>
              {sending === "test" ? <Loader2 className="spin" size={17} /> : <Mail size={17} />}
              Send Test to Me
            </button>
            <button className="button button-gold" type="button" onClick={() => send(false)} disabled={Boolean(sending) || attachmentUploading || activeSubscribers.length === 0}>
              {sending === "all" ? <Loader2 className="spin" size={17} /> : <Send size={17} />}
              Send to {activeSubscribers.length || 0} Subscribers
            </button>
          </div>
          <p className="newsletter-send-note">Every message includes an unsubscribe link automatically.</p>
        </section>

        <aside className="newsletter-preview-card">
          <span className="newsletter-preview-label">Email preview</span>
          <div className="newsletter-email-preview">
            <div className="newsletter-email-brand">EL HEDAYA <small>ISLAMIC SCHOOL</small></div>
            <div className="newsletter-email-preview-body">
              <span>Assalamu Alaikum,</span>
              <h4>{draft.headline || "Your newsletter headline"}</h4>
              <p>{draft.body || "Your school announcement will appear here. Keep it warm, clear, and easy for families to scan."}</p>
              {draft.ctaLabel && draft.ctaUrl && <span className="newsletter-preview-cta">{draft.ctaLabel}</span>}
              {attachment && <div className="newsletter-preview-attachment"><Paperclip size={13} /><span>{attachment.name}</span></div>}
            </div>
            <div className="newsletter-email-preview-footer">EL Hedaya Islamic School · Clemmons Islamic Center</div>
          </div>
        </aside>
      </div>

      <div className="newsletter-data-grid">
        <section className="newsletter-list-card">
          <div className="newsletter-list-heading">
            <div><span>Subscribers</span><strong>{subscribers.length} email addresses</strong></div>
            <label className="newsletter-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search email…" /></label>
          </div>
          <div className="newsletter-subscriber-list">
            {loading ? <div className="newsletter-list-empty"><Loader2 className="spin" size={20} /> Loading subscribers…</div> : filteredSubscribers.length ? filteredSubscribers.map((subscriber) => (
              <div className={`newsletter-subscriber-row ${subscriber.is_active ? "" : "inactive"}`} key={subscriber.id}>
                <div><strong>{subscriber.email}</strong><span>{subscriber.is_active ? "Active" : "Unsubscribed"} · Joined {formatDate(subscriber.created_at)}</span></div>
                <button className="visibility-photo" type="button" onClick={() => toggleSubscriber(subscriber)} disabled={updatingId === subscriber.id} title={subscriber.is_active ? "Deactivate subscriber" : "Reactivate subscriber"}>
                  {updatingId === subscriber.id ? <Loader2 className="spin" size={16} /> : subscriber.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            )) : <div className="newsletter-list-empty">No subscribers found.</div>}
          </div>
        </section>

        <section className="newsletter-list-card">
          <div className="newsletter-list-heading"><div><span>Send history</span><strong>Recent newsletters</strong></div></div>
          <div className="newsletter-campaign-list">
            {campaigns.length ? campaigns.map((campaign) => (
              <div className="newsletter-campaign-row" key={campaign.id}>
                <span className={`newsletter-campaign-status ${campaign.status}`}>{campaign.status === "sent" ? <CheckCircle2 size={13} /> : <Mail size={13} />}{campaign.status}</span>
                <div><strong>{campaign.subject}</strong><span>{campaign.sent_at ? formatDateTime(campaign.sent_at) : formatDateTime(campaign.created_at)} · {campaign.sent_count || 0} sent{campaign.failed_count ? ` · ${campaign.failed_count} failed` : ""}{campaign.attachment_name ? ` · Flyer: ${campaign.attachment_name}` : ""}</span></div>
              </div>
            )) : <div className="newsletter-list-empty">No newsletters sent yet.</div>}
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return <div className="newsletter-stat"><span><Icon size={18} /></span><div><strong>{value}</strong><small>{label}</small></div></div>;
}

function formatDate(value) {
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(value) {
  return new Date(value).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
