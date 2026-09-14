import { useState } from "react";
import { ChevronDown, Shirt, AlarmClock, ShieldCheck } from "lucide-react";
import { policies } from "../data/content";

const icons = {
  dress: Shirt,
  attendance: AlarmClock,
  safety: ShieldCheck,
};

export default function Policies() {
  const [open, setOpen] = useState("dress");

  return (
    <section className="section policies-section" id="policies">
      <div className="container policies-grid">
        <div className="section-copy">
          <span className="kicker">School policies</span>
          <h2>Clear expectations make room for better learning.</h2>
          <p>
            We ask every family to review the school expectations before registration. The online
            school hub will handle formal acknowledgments during the registration process.
          </p>

          <div className="important-note">
            <span>Attendance reminder</span>
            <strong>3 late arrivals = 1 absence</strong>
            <p>Three unexcused absences may lead to removal from the school roster.</p>
          </div>
        </div>

        <div className="policy-list">
          {policies.map((policy) => {
            const Icon = icons[policy.id];
            const active = open === policy.id;

            return (
              <article className={`policy-item ${active ? "active" : ""}`} key={policy.id}>
                <button onClick={() => setOpen(active ? "" : policy.id)} aria-expanded={active}>
                  <span className="policy-icon"><Icon size={20} /></span>
                  <span className="policy-title">
                    <strong>{policy.title}</strong>
                    <small>{policy.short}</small>
                  </span>
                  <ChevronDown className="policy-chevron" size={20} />
                </button>

                {active && (
                  <div className="policy-details">
                    <ul>
                      {policy.details.map((detail) => <li key={detail}>{detail}</li>)}
                    </ul>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
