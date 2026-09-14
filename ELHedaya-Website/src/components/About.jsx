import { BookOpenText, HeartHandshake, Sparkles } from "lucide-react";

export default function About() {
  return (
    <section className="section about-section" id="about">
      <div className="container about-grid">
        <div className="section-copy">
          <span className="kicker">Welcome to EL Hedaya</span>
          <h2>Faith isn't just for Sundays. It's a foundation for their future</h2>
          <p>
            EL Hedaya Islamic School is the Sunday School of Clemmons Islamic Center. Our goal is
            to help students understand Islam, practice its values, and grow into exemplary members
            of society and the Muslim community.
          </p>
        </div>

        <div className="values-stack">
          <article className="value-card">
            <span><BookOpenText size={21} /></span>
            <div>
              <strong>Learn with purpose</strong>
              <p>Build a clear foundation in Quran, Islamic concepts, values, and ethics.</p>
            </div>
          </article>
          <article className="value-card value-card-offset">
            <span><Sparkles size={21} /></span>
            <div>
              <strong>Practice with character</strong>
              <p>Turn classroom learning into adab, responsibility, respect, and daily habits.</p>
            </div>
          </article>
          <article className="value-card">
            <span><HeartHandshake size={21} /></span>
            <div>
              <strong>Grow with community</strong>
              <p>Help children feel connected to their Masjid, teachers, classmates, and faith.</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
