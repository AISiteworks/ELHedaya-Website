import { ArrowRight, CalendarDays, GraduationCap, HeartHandshake } from "lucide-react";
import { school } from "../data/content";

export default function Hero() {
  return (
    <section className="hero" id="home">
      <div className="hero-geometry" aria-hidden="true">
        <span className="geometry-one" />
        <span className="geometry-two" />
        <span className="geometry-three" />
      </div>

      <div className="container hero-layout">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="eyebrow-mark">✦</span>
            Clemmons Islamic Center · Sunday School
          </div>

          <h1>
            Discovering the Deen,
            <span>Living the Sunnah.</span>
          </h1>

          <p className="hero-intro">{school.mission}</p>

          <div className="hero-actions">
            <a className="button button-gold" href="/register">
              Register Online <ArrowRight size={18} />
            </a>
            <button
              className="button button-quiet"
              onClick={() => document.getElementById("about")?.scrollIntoView({ behavior: "smooth" })}
            >
              Explore EL Hedaya
            </button>
          </div>

          <div className="hero-badges">
            <span><CalendarDays size={17} /> Every Sunday</span>
            <span><GraduationCap size={17} /> Quran & Islamic Studies</span>
            <span><HeartHandshake size={17} /> Parent involvement welcome</span>
          </div>
        </div>

        <div className="hero-visual" aria-label="EL Hedaya Sunday School overview">
          <div className="arch arch-back" aria-hidden="true" />
          <div className="school-window">
            <div className="window-ornament" aria-hidden="true">الهداية</div>
            <div className="window-topline">
              <span>Sunday at CiC</span>
              <span className="live-dot">School Hub</span>
            </div>

            <div className="window-title">
              <small>A welcoming place to</small>
              <strong>Learn. Grow. Belong.</strong>
            </div>

            <div className="mini-schedule">
              <div>
                <span>10:30</span>
                <div>
                  <strong>School Begins</strong>
                  <small>Sunday learning starts</small>
                </div>
              </div>
              <div>
                <span>2:30</span>
                <div>
                  <strong>Dismissal</strong>
                  <small>Please pick up on time</small>
                </div>
              </div>
            </div>

            <div className="portal-mini-card">
              <div>
                <small>Help our school thrive</small>
                <strong>Volunteer with EL Hedaya</strong>
              </div>
              <a href="/volunteer" aria-label="Volunteer with EL Hedaya">↗</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
