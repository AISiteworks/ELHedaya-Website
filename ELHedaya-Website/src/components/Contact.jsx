import { Mail, MapPin, Phone, Navigation } from "lucide-react";
import { school } from "../data/content";

export default function Contact() {
  const mapHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.address)}`;

  return (
    <section className="section contact-section" id="contact">
      <div className="container contact-grid">
        <div className="section-copy">
          <span className="kicker">Visit & contact</span>
          <h2>We’d be glad to welcome your family.</h2>
          <p>
            EL Hedaya Islamic School meets at Clemmons Islamic Center in Clemmons, North Carolina.
          </p>
          <a className="button button-green" href={mapHref} target="_blank" rel="noreferrer">
            Get Directions <Navigation size={17} />
          </a>
        </div>

        <div className="contact-card">
          <ContactRow icon={MapPin} label="Address">
            <a href={mapHref} target="_blank" rel="noreferrer">{school.address}</a>
          </ContactRow>
          <ContactRow icon={Phone} label="Phone">
            <a href={`tel:${school.phone.replace(/\D/g, "")}`}>{school.phone}</a>
          </ContactRow>
          <ContactRow icon={Mail} label="Email">
            <a href={`mailto:${school.email}`}>{school.email}</a>
          </ContactRow>
          <div className="dropoff-strip">
            <span>Sunday drop-off</span>
            <strong>First driveway behind the Masjid</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactRow({ icon: Icon, label, children }) {
  return (
    <div className="contact-row">
      <span className="contact-icon"><Icon size={20} /></span>
      <div>
        <small>{label}</small>
        {children}
      </div>
    </div>
  );
}
