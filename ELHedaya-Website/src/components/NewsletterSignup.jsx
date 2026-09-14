import { useState } from "react";
import { CheckCircle2, Loader2, Mail, Send } from "lucide-react";
import { newsletterBackendConfigured, subscribeToNewsletter } from "../services/newsletterService";

export default function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState({ type: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const subscribe = async (event) => {
    event.preventDefault();
    if (!newsletterBackendConfigured) {
      setStatus({ type: "error", message: "Newsletter signup is being configured. Please check back soon." });
      return;
    }

    setSubmitting(true);
    setStatus({ type: "", message: "" });
    try {
      await subscribeToNewsletter(email);
      setEmail("");
      setStatus({ type: "success", message: "You’re subscribed. School news will arrive in your inbox." });
    } catch (error) {
      setStatus({ type: "error", message: error?.message || "We couldn’t add your email right now." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="newsletter-section" id="newsletter">
      <div className="container newsletter-shell">
        <div className="newsletter-copy">
          <span className="kicker newsletter-kicker"><Mail size={15} /> Stay connected</span>
          <h2>School news, without the hallway hunt.</h2>
          <p>
            Subscribe for EL Hedaya announcements, calendar reminders, registration updates,
            family events, and important Sunday School news.
          </p>
        </div>

        <div className="newsletter-card">
          <div className="newsletter-card-icon"><Mail size={24} /></div>
          <div>
            <span className="newsletter-card-label">EL Hedaya Newsletter</span>
            <strong>Updates for school families</strong>
          </div>
          <form className="newsletter-form" onSubmit={subscribe}>
            <label className="sr-only" htmlFor="newsletter-email">Email address</label>
            <input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Your email address"
              autoComplete="email"
              required
            />
            <button className="button button-gold" type="submit" disabled={submitting}>
              {submitting ? <Loader2 className="spin" size={17} /> : <Send size={16} />}
              {submitting ? "Subscribing…" : "Subscribe"}
            </button>
          </form>
          <small className="newsletter-consent">Occasional school updates only. Unsubscribe anytime.</small>
          {status.message && (
            <div className={`newsletter-status ${status.type}`} role={status.type === "error" ? "alert" : "status"}>
              {status.type === "success" && <CheckCircle2 size={16} />}
              <span>{status.message}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
