import { programs } from "../data/content";

export default function Programs() {
  return (
    <section className="section programs-section" id="programs">
      <div className="container">
        <div className="section-heading split-heading">
          <div>
            <span className="kicker kicker-light">What students learn</span>
            <h2>A balanced Sunday learning experience.</h2>
          </div>
          <p>
            The program is designed to connect knowledge, worship, character, and Muslim identity
            in an age-appropriate community setting.
          </p>
        </div>

        <div className="program-grid">
          {programs.map((program) => (
            <article className="program-card" key={program.title}>
              <span className="program-number">{program.number}</span>
              <div className="program-line" aria-hidden="true" />
              <h3>{program.title}</h3>
              <p>{program.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
