import { ArrowRight, HeartHandshake, Sparkles, UsersRound } from "lucide-react";

export default function VolunteerCTA() {
  return (
    <section className="volunteer-cta-section">
      <div className="container">
        <div className="volunteer-cta-card">
          <div className="volunteer-cta-orbit" aria-hidden="true" />
          <div className="volunteer-cta-copy">
            <span className="volunteer-cta-kicker"><Sparkles size={15} /> Serve. Connect. Strengthen.</span>
            <h2>There’s a place for you in the EL Hedaya community.</h2>
            <p>
              A welcoming school is built by many hands. Parents and community members can help with classrooms,
              arrival and dismissal, events, snacks, communication, and other school needs.
            </p>
            <a className="button button-gold" href="/volunteer">
              <HeartHandshake size={18} /> Become a Volunteer <ArrowRight size={17} />
            </a>
          </div>
          <div className="volunteer-cta-badge" aria-hidden="true">
            <UsersRound size={42} />
            <strong>Community-powered</strong>
            <span>Small acts. Lasting impact.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
