import { BellRing, Clock3, HeartHandshake, MapPin, Newspaper, Sandwich } from "lucide-react";

const notes = [
  {
    icon: Newspaper,
    kicker: "Stay informed",
    title: "Weekly newsletter",
    text: "A school newsletter will be sent each week with announcements, reminders, and important Sunday updates.",
  },
  {
    icon: HeartHandshake,
    kicker: "Build community",
    title: "Parents make EL Hedaya stronger",
    text: "We encourage parent involvement and would love more volunteers to share their time, skills, and care.",
    link: "/volunteer",
    linkLabel: "Volunteer with us",
  },
  {
    icon: Sandwich,
    kicker: "Snack time",
    title: "Healthy snacks",
    text: "Healthy snacks will be available for purchase, or students may bring their own snack from home.",
  },
  {
    icon: Clock3,
    kicker: "Keep it simple",
    title: "Quick & easy to enjoy",
    text: "Please send snacks that are quick, tidy, and easy for students to consume during the school day.",
  },
];

export default function FamilyNotes() {
  return (
    <section className="section family-notes-section" aria-labelledby="family-notes-title">
      <div className="container">
        <div className="family-notes-heading">
          <div>
            <span className="kicker">Sunday family notes</span>
            <h2 id="family-notes-title">A smoother Sunday starts with a few simple details.</h2>
          </div>
          <p>Keep these reminders handy so arrival, dismissal, communication, and snack time stay easy for everyone.</p>
        </div>

        <div className="arrival-reminder-card">
          <div className="arrival-reminder-icon"><BellRing size={24} /></div>
          <div className="arrival-reminder-copy">
            <span>Arrival & dismissal</span>
            <strong>Please pick up your child on time.</strong>
          </div>
          <div className="arrival-location-pill"><MapPin size={17} /> Pickup & drop-off: Main Parking Lot</div>
        </div>

        <div className="family-note-grid">
          {notes.map(({ icon: Icon, kicker, title, text, link, linkLabel }) => (
            <article className="family-note-card" key={title}>
              <div className="family-note-icon"><Icon size={22} /></div>
              <span>{kicker}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              {link && <a href={link}>{linkLabel} <span aria-hidden="true">→</span></a>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
