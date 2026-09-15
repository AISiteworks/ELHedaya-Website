import { useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  HeartHandshake,
  Loader2,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { school } from "../data/content";

const interestOptions = [
  "Classroom support",
  "Arrival & dismissal",
  "Snacks & hospitality",
  "School events",
  "Newsletter / communications",
  "Special skills / projects",
];

const availabilityOptions = [
  "Sunday before school",
  "Sunday during school",
  "Sunday dismissal",
  "Special events",
  "Flexible / as needed",
];

const initialForm = {
  fullName: "",
  email: "",
  phone: "",
  relationship: "Parent / Guardian",
  interests: [],
  availability: [],
  message: "",
  website: "",
};

export default function VolunteerPage() {
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState({ type: "", message: "" });

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const toggleArrayValue = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setStatus({ type: "", message: "" });
    try {
      const response = await fetch("/api/volunteer-submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) throw new Error(payload.message || "We couldn’t submit the volunteer form right now.");
      setForm(initialForm);
      setStatus({ type: "success", message: "Jazakum Allahu Khairan. Your volunteer interest has been received." });
    } catch (error) {
      setStatus({ type: "error", message: error?.message || "We couldn’t submit the volunteer form right now." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="volunteer-page">
      <div className="volunteer-page-hero">
        <div className="container volunteer-page-hero-grid">
          <div>
            <a className="volunteer-back" href="/"><ArrowLeft size={16} /> Back to EL Hedaya</a>
            <span className="kicker volunteer-page-kicker"><HeartHandshake size={15} /> Volunteer with EL Hedaya</span>
            <h1>Give a little time.<br /><span>Help shape a beautiful Sunday.</span></h1>
            <p>
              Parent involvement brings warmth, consistency, and community into our school day. Tell us how you’d like
              to help, and our team will reach out when there is a good fit.
            </p>
            <div className="volunteer-hero-points">
              <span><UsersRound size={17} /> Parent & community involvement</span>
              <span><Clock3 size={17} /> Flexible ways to serve</span>
              <span><ShieldCheck size={17} /> School-coordinated opportunities</span>
            </div>
          </div>
          <div className="volunteer-hero-mark" aria-hidden="true">
            <div className="volunteer-hero-ring"><HeartHandshake size={58} /></div>
            <small>EL HEDAYA</small>
            <strong>Community in action</strong>
          </div>
        </div>
      </div>

      <div className="container volunteer-page-layout">
        <aside className="volunteer-page-aside">
          <span className="kicker"><Sparkles size={14} /> Ways to help</span>
          <h2>Your time can make the school day easier.</h2>
          <p>Choose one or several areas. You are not committing to every Sunday by submitting this form.</p>
          <div className="volunteer-mini-list">
            {interestOptions.map((item, index) => <div key={item}><b>{String(index + 1).padStart(2, "0")}</b><span>{item}</span></div>)}
          </div>
          <div className="volunteer-contact-card">
            <Mail size={18} />
            <div><small>Questions?</small><a href={`mailto:${school.email}`}>{school.email}</a></div>
          </div>
          <div className="volunteer-contact-card">
            <Phone size={18} />
            <div><small>Call EL Hedaya</small><a href={`tel:${school.phone.replace(/\D/g, "")}`}>{school.phone}</a></div>
          </div>
        </aside>

        <form className="volunteer-form-card" onSubmit={submit}>
          <div className="volunteer-form-heading">
            <div className="volunteer-form-icon"><HeartHandshake size={25} /></div>
            <div><span>Volunteer interest form</span><h2>Tell us how you’d like to help.</h2></div>
          </div>

          <div className="volunteer-form-grid two-col">
            <label><span>Full name *</span><input value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} required autoComplete="name" /></label>
            <label><span>Relationship to EL Hedaya</span><select value={form.relationship} onChange={(e) => setField("relationship", e.target.value)}><option>Parent / Guardian</option><option>Community Member</option><option>Former Student / Family</option><option>Other</option></select></label>
            <label><span>Email *</span><input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} required autoComplete="email" /></label>
            <label><span>Phone</span><input type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} autoComplete="tel" /></label>
          </div>

          <fieldset className="volunteer-choice-group">
            <legend>Where would you like to help?</legend>
            <p>Select all that interest you.</p>
            <div className="volunteer-choice-grid">
              {interestOptions.map((option) => (
                <label className={`volunteer-choice ${form.interests.includes(option) ? "selected" : ""}`} key={option}>
                  <input type="checkbox" checked={form.interests.includes(option)} onChange={() => toggleArrayValue("interests", option)} />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="volunteer-choice-group">
            <legend>When are you generally available?</legend>
            <div className="volunteer-choice-grid compact">
              {availabilityOptions.map((option) => (
                <label className={`volunteer-choice ${form.availability.includes(option) ? "selected" : ""}`} key={option}>
                  <input type="checkbox" checked={form.availability.includes(option)} onChange={() => toggleArrayValue("availability", option)} />
                  <span>{option}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="volunteer-message"><span>Anything else you’d like us to know?</span><textarea rows="5" value={form.message} onChange={(e) => setField("message", e.target.value)} placeholder="Share relevant experience, ideas, skills, or scheduling notes…" /></label>
          <label className="volunteer-honeypot" aria-hidden="true">Website<input tabIndex="-1" autoComplete="off" value={form.website} onChange={(e) => setField("website", e.target.value)} /></label>

          {status.message && <div className={`volunteer-form-status ${status.type}`} role={status.type === "error" ? "alert" : "status"}>{status.type === "success" && <CheckCircle2 size={18} />}<span>{status.message}</span></div>}

          <button className="button button-green volunteer-submit" type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="spin" size={18} /> : <Send size={17} />}
            {submitting ? "Sending…" : "Send Volunteer Interest"}
          </button>
          <small className="volunteer-form-footnote">Submitting this form expresses interest only. EL Hedaya will contact volunteers based on current school needs.</small>
        </form>
      </div>
    </section>
  );
}
