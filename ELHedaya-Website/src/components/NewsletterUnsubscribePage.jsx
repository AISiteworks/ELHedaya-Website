import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, MailX } from "lucide-react";
import Logo from "./Logo";
import { newsletterBackendConfigured, unsubscribeFromNewsletter } from "../services/newsletterService";

export default function NewsletterUnsubscribePage() {
  const [state, setState] = useState({ status: "loading", message: "Updating your subscription…" });

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (!token) {
      setState({ status: "error", message: "This unsubscribe link is incomplete." });
      return;
    }
    if (!newsletterBackendConfigured) {
      setState({ status: "error", message: "Newsletter service is temporarily unavailable." });
      return;
    }

    unsubscribeFromNewsletter(token)
      .then((result) => {
        if (result?.ok) setState({ status: "success", message: "You have been unsubscribed from EL Hedaya newsletter emails." });
        else setState({ status: "error", message: result?.message || "This unsubscribe link is no longer valid." });
      })
      .catch(() => setState({ status: "error", message: "We could not update your subscription. Please contact the school." }));
  }, []);

  return (
    <main className="newsletter-unsubscribe-page">
      <div className="newsletter-unsubscribe-card">
        <Logo />
        <div className={`newsletter-unsubscribe-icon ${state.status}`}>
          {state.status === "loading" ? <Loader2 className="spin" size={28} /> : state.status === "success" ? <CheckCircle2 size={30} /> : <MailX size={30} />}
        </div>
        <span className="kicker">Newsletter preferences</span>
        <h1>{state.status === "success" ? "You’re unsubscribed." : state.status === "error" ? "We couldn’t complete that." : "One moment…"}</h1>
        <p>{state.message}</p>
        <a className="button button-green" href="/">Return to EL Hedaya</a>
      </div>
    </main>
  );
}
