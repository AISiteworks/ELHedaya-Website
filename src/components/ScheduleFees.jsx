import { useEffect, useMemo, useState } from "react";
import { Clock3, BookOpen, WalletCards, MapPinned, ArrowRight } from "lucide-react";
import { formatRegistrationMoney, getPublicRegistrationConfig } from "../services/registrationService";

export default function ScheduleFees() {
  const [registrationConfig, setRegistrationConfig] = useState(null);

  useEffect(() => {
    getPublicRegistrationConfig().then(setRegistrationConfig).catch(() => {});
  }, []);

  const feeSummary = useMemo(() => {
    const fees = registrationConfig?.fees || [];
    const required = fees.filter((fee) => !fee.isOptional && fee.kind === "charge" && fee.scope === "student" && !fee.appliesAfterStudents);
    if (!required.length) return null;
    const total = required.reduce((sum, fee) => sum + Number(fee.amountCents || 0), 0);
    return { total, count: required.length };
  }, [registrationConfig]);

  return (
    <section className="section schedule-section" id="schedule">
      <div className="container">
        <div className="section-heading centered-heading">
          <span className="kicker">Plan your Sunday</span>
          <h2>Simple schedule. Clear tuition. No guessing.</h2>
          <p>Everything families need to know before the school day begins.</p>
        </div>

        <div className="schedule-board">
          <div className="schedule-column">
            <div className="schedule-icon"><Clock3 size={23} /></div>
            <span className="card-label">Sunday Schedule</span>
            <div className="time-row">
              <strong>9:00–9:30 AM</strong>
              <span>Quran Tajweed & Recitation</span>
            </div>
            <div className="time-row">
              <strong>10:25 AM</strong>
              <span>Regular School begins</span>
            </div>
          </div>

          <div className="schedule-column featured">
            <div className="schedule-icon"><WalletCards size={23} /></div>
            <span className="card-label">Registration & Fees</span>
            <div className="price">
              <strong>{feeSummary ? formatRegistrationMoney(feeSummary.total) : "Online"}</strong>
              <span>{feeSummary ? "required per student" : "current fees shown at registration"}</span>
            </div>
            <div className="fee-breakdown">
              <span><b>{registrationConfig?.settings?.registrationOpen ? "Open" : "Current"}</b> registration</span>
              <span>{registrationConfig?.settings?.termName || "EL Hedaya"}</span>
            </div>
            <a className="schedule-register-link" href="/register">View current fees & register <ArrowRight size={15} /></a>
          </div>

          <div className="schedule-column">
            <div className="schedule-icon"><MapPinned size={23} /></div>
            <span className="card-label">Arrival</span>
            <strong className="arrival-title">First driveway behind the Masjid</strong>
            <p>Use the designated Sunday School drop-off and pickup route.</p>
            <div className="schedule-note"><BookOpen size={17} /> Please arrive on time and ready to learn.</div>
          </div>
        </div>
      </div>
    </section>
  );
}
