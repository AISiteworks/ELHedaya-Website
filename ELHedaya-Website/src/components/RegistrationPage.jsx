import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  GraduationCap,
  Loader2,
  LockKeyhole,
  Mail,
  Plus,
  ReceiptText,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import Header from "./Header";
import Footer from "./Footer";
import { school } from "../data/content";
import {
  calculateClientFeeEstimate,
  createRegistration,
  formatRegistrationMoney,
  getPublicRegistrationConfig,
  payRegistration,
} from "../services/registrationService";

const emptyGuardian = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "NC",
  postalCode: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
};

const emptyStudent = () => ({
  id: crypto.randomUUID(),
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  grade: "",
  returningStudent: false,
  medicalNotes: "",
});

const gradeOptions = [
  "Pre-K", "Kindergarten", "1st Grade", "2nd Grade", "3rd Grade", "4th Grade", "5th Grade",
  "6th Grade", "7th Grade", "8th Grade", "9th Grade", "10th Grade", "11th Grade", "12th Grade",
];

export default function RegistrationPage() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [step, setStep] = useState(1);
  const [guardian, setGuardian] = useState(emptyGuardian);
  const [students, setStudents] = useState([emptyStudent()]);
  const [selectedOptionalFeeIds, setSelectedOptionalFeeIds] = useState([]);
  const [notes, setNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [registration, setRegistration] = useState(null);
  const [paymentResult, setPaymentResult] = useState(null);
  const requestIdRef = useRef(crypto.randomUUID());

  useEffect(() => {
    getPublicRegistrationConfig()
      .then(setConfig)
      .catch((error) => setLoadError(error.message || "Registration is unavailable."))
      .finally(() => setLoading(false));
  }, []);

  const estimate = useMemo(
    () => calculateClientFeeEstimate(config?.fees || [], students.length, selectedOptionalFeeIds),
    [config?.fees, students.length, selectedOptionalFeeIds]
  );

  const changeGuardian = (key, value) => setGuardian((current) => ({ ...current, [key]: value }));
  const changeStudent = (id, key, value) => setStudents((current) => current.map((student) => student.id === id ? { ...student, [key]: value } : student));

  const validateGuardian = () => {
    if (!guardian.firstName.trim() || !guardian.lastName.trim()) return "Enter the parent or guardian name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardian.email.trim())) return "Enter a valid parent or guardian email.";
    if (guardian.phone.replace(/\D/g, "").length < 7) return "Enter a valid phone number.";
    return "";
  };

  const validateStudents = () => {
    if (!students.length) return "Add at least one student.";
    for (let index = 0; index < students.length; index += 1) {
      const student = students[index];
      if (!student.firstName.trim() || !student.lastName.trim()) return `Enter the full name for student ${index + 1}.`;
      if (!student.dateOfBirth) return `Enter the date of birth for ${student.firstName || `student ${index + 1}`}.`;
      if (!student.grade) return `Choose a grade for ${student.firstName || `student ${index + 1}`}.`;
    }
    return "";
  };

  const goNextFromGuardian = (event) => {
    event.preventDefault();
    const error = validateGuardian();
    setFormError(error);
    if (!error) { setStep(2); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const goNextFromStudents = (event) => {
    event.preventDefault();
    const error = validateStudents();
    setFormError(error);
    if (!error) { setStep(3); window.scrollTo({ top: 0, behavior: "smooth" }); }
  };

  const submitRegistration = async () => {
    setSaving(true);
    setFormError("");
    try {
      const result = await createRegistration({
        clientRequestId: requestIdRef.current,
        guardian,
        students,
        selectedOptionalFeeIds,
        notes,
        website,
      });
      setRegistration(result);
      if (result.requiresPayment) setStep(4);
      else setStep(5);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setFormError(error.message || "Registration could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <><Header /><main className="registration-page"><div className="registration-loading"><Loader2 className="spin" size={28} /><span>Loading registration…</span></div></main><Footer /></>;
  }

  if (loadError || !config?.settings) {
    return <><Header /><main className="registration-page"><RegistrationNotice icon={<AlertCircle />} title="Registration is temporarily unavailable" text={loadError || "Please contact the school for assistance."} /></main><Footer /></>;
  }

  if (!config.settings.registrationOpen && step < 5) {
    return <><Header /><main className="registration-page"><RegistrationNotice icon={<CalendarDays />} title="Online registration is currently closed" text={`Registration for ${config.settings.termName || "this term"} is not accepting new submissions right now.`} /></main><Footer /></>;
  }

  return (
    <>
      <Header />
      <main className="registration-page">
        <section className="registration-hero">
          <div className="container registration-hero-inner">
            <div>
              <a className="registration-back-link" href="/"><ArrowLeft size={15} /> School website</a>
              <span className="registration-kicker"><GraduationCap size={16} /> {config.settings.schoolYear} · {config.settings.termName}</span>
              <h1>Student Registration</h1>
              <p>{config.settings.welcomeMessage || `Register your children for ${school.name}.`}</p>
            </div>
            <div className="registration-hero-seal"><ShieldCheck size={23} /><div><strong>Secure registration</strong><span>Payments processed by Square</span></div></div>
          </div>
        </section>

        <section className="registration-content-section">
          <div className="container registration-shell">
            <RegistrationStepper step={step} />

            <div className="registration-layout">
              <div className="registration-main-card">
                {step === 1 && <GuardianStep guardian={guardian} changeGuardian={changeGuardian} onSubmit={goNextFromGuardian} error={formError} website={website} setWebsite={setWebsite} />}
                {step === 2 && <StudentsStep students={students} setStudents={setStudents} changeStudent={changeStudent} onBack={() => setStep(1)} onSubmit={goNextFromStudents} error={formError} />}
                {step === 3 && <ReviewStep guardian={guardian} students={students} config={config} selectedOptionalFeeIds={selectedOptionalFeeIds} setSelectedOptionalFeeIds={setSelectedOptionalFeeIds} estimate={estimate} notes={notes} setNotes={setNotes} onBack={() => setStep(2)} onSubmit={submitRegistration} saving={saving} error={formError} />}
                {step === 4 && <PaymentStep config={config} guardian={guardian} registration={registration} onPaid={(result) => { setPaymentResult(result); setStep(5); window.scrollTo({ top: 0, behavior: "smooth" }); }} />}
                {step === 5 && <CompleteStep config={config} registration={registration} paymentResult={paymentResult} />}
              </div>

              {step < 4 && <RegistrationSidebar config={config} students={students} estimate={estimate} />}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function RegistrationStepper({ step }) {
  const items = [
    [1, "Guardian"], [2, "Students"], [3, "Review"], [4, "Payment"], [5, "Complete"],
  ];
  return <div className="registration-stepper" aria-label="Registration progress">
    {items.map(([number, label]) => <div key={number} className={`registration-step ${step === number ? "active" : ""} ${step > number ? "done" : ""}`}>
      <span>{step > number ? <Check size={15} /> : number}</span><small>{label}</small>
    </div>)}
  </div>;
}

function GuardianStep({ guardian, changeGuardian, onSubmit, error, website, setWebsite }) {
  return <form onSubmit={onSubmit}>
    <FormHeading icon={<UserRound />} eyebrow="Step 1 of 4" title="Parent or guardian" text="Tell us who we should contact about this registration." />
    <div className="registration-fields two-col">
      <Field label="First name" value={guardian.firstName} onChange={(v) => changeGuardian("firstName", v)} required />
      <Field label="Last name" value={guardian.lastName} onChange={(v) => changeGuardian("lastName", v)} required />
      <Field label="Email" type="email" value={guardian.email} onChange={(v) => changeGuardian("email", v)} required />
      <Field label="Phone" type="tel" value={guardian.phone} onChange={(v) => changeGuardian("phone", v)} required />
      <Field className="span-2" label="Street address" value={guardian.addressLine1} onChange={(v) => changeGuardian("addressLine1", v)} />
      <Field className="span-2" label="Apartment / suite" value={guardian.addressLine2} onChange={(v) => changeGuardian("addressLine2", v)} />
      <Field label="City" value={guardian.city} onChange={(v) => changeGuardian("city", v)} />
      <Field label="State" value={guardian.state} onChange={(v) => changeGuardian("state", v)} />
      <Field label="ZIP code" value={guardian.postalCode} onChange={(v) => changeGuardian("postalCode", v)} />
      <div />
      <Field label="Emergency contact" value={guardian.emergencyContactName} onChange={(v) => changeGuardian("emergencyContactName", v)} />
      <Field label="Emergency phone" type="tel" value={guardian.emergencyContactPhone} onChange={(v) => changeGuardian("emergencyContactPhone", v)} />
      <label className="registration-honeypot" aria-hidden="true">Website<input value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" /></label>
    </div>
    <FormError error={error} />
    <div className="registration-form-actions end"><button className="button button-green" type="submit">Continue to students <ArrowRight size={17} /></button></div>
  </form>;
}

function StudentsStep({ students, setStudents, changeStudent, onBack, onSubmit, error }) {
  const addStudent = () => students.length < 10 && setStudents((current) => [...current, emptyStudent()]);
  const removeStudent = (id) => students.length > 1 && setStudents((current) => current.filter((student) => student.id !== id));
  return <form onSubmit={onSubmit}>
    <FormHeading icon={<UsersRound />} eyebrow="Step 2 of 4" title="Student information" text="Add every child you want included in this registration." />
    <div className="student-card-stack">
      {students.map((student, index) => <div className="student-form-card" key={student.id}>
        <div className="student-form-head"><div><span>Student {index + 1}</span><strong>{student.firstName || student.lastName ? `${student.firstName} ${student.lastName}`.trim() : "New student"}</strong></div>{students.length > 1 && <button type="button" onClick={() => removeStudent(student.id)} aria-label={`Remove student ${index + 1}`}><Trash2 size={16} /></button>}</div>
        <div className="registration-fields two-col compact">
          <Field label="First name" value={student.firstName} onChange={(v) => changeStudent(student.id, "firstName", v)} required />
          <Field label="Last name" value={student.lastName} onChange={(v) => changeStudent(student.id, "lastName", v)} required />
          <Field label="Date of birth" type="date" value={student.dateOfBirth} onChange={(v) => changeStudent(student.id, "dateOfBirth", v)} required />
          <SelectField label="Gender" value={student.gender} onChange={(v) => changeStudent(student.id, "gender", v)} options={["Male", "Female"]} placeholder="Select" />
          <SelectField label="Current grade" value={student.grade} onChange={(v) => changeStudent(student.id, "grade", v)} options={gradeOptions} placeholder="Choose grade" required />
          <label className="registration-check-field"><input type="checkbox" checked={student.returningStudent} onChange={(e) => changeStudent(student.id, "returningStudent", e.target.checked)} /><span><strong>Returning student</strong><small>Previously attended EL Hedaya</small></span></label>
          <label className="registration-field span-2"><span>Allergies, medical notes, or information teachers should know</span><textarea rows="3" value={student.medicalNotes} onChange={(e) => changeStudent(student.id, "medicalNotes", e.target.value)} /></label>
        </div>
      </div>)}
    </div>
    <button className="registration-add-student" type="button" onClick={addStudent} disabled={students.length >= 10}><Plus size={17} /> Add another child</button>
    <FormError error={error} />
    <div className="registration-form-actions"><button className="button button-quiet-dark" type="button" onClick={onBack}><ArrowLeft size={16} /> Back</button><button className="button button-green" type="submit">Review registration <ArrowRight size={17} /></button></div>
  </form>;
}

function ReviewStep({ guardian, students, config, selectedOptionalFeeIds, setSelectedOptionalFeeIds, estimate, notes, setNotes, onBack, onSubmit, saving, error }) {
  const optionalFees = config.fees.filter((fee) => fee.isOptional);
  const toggleOptional = (id) => setSelectedOptionalFeeIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  return <div>
    <FormHeading icon={<BookOpenCheck />} eyebrow="Step 3 of 4" title="Review & fees" text="Confirm your family details and see the exact fee estimate before payment." />
    <div className="registration-review-grid">
      <div className="review-block"><span>Guardian</span><strong>{guardian.firstName} {guardian.lastName}</strong><small>{guardian.email} · {guardian.phone}</small></div>
      <div className="review-block"><span>Students</span>{students.map((student) => <strong key={student.id}>{student.firstName} {student.lastName} <small>· {student.grade}</small></strong>)}</div>
    </div>

    {optionalFees.length > 0 && <div className="optional-fees"><div className="optional-fees-heading"><span>Optional items</span><small>Select any extras you want included.</small></div>{optionalFees.map((fee) => <label key={fee.id} className="optional-fee-row"><input type="checkbox" checked={selectedOptionalFeeIds.includes(fee.id)} onChange={() => toggleOptional(fee.id)} /><div><strong>{fee.name}</strong><small>{fee.description || (fee.scope === "student" ? "Per student" : "Per family")}</small></div><b>{fee.kind === "discount" ? "−" : "+"}{formatRegistrationMoney(fee.amountCents)}</b></label>)}</div>}

    <FeeTable estimate={estimate} currency={config.settings.currency} />
    <label className="registration-field registration-notes"><span>Anything else you would like the school to know? <small>Optional</small></span><textarea rows="4" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Questions, placement notes, family information…" /></label>
    <div className="registration-consent"><ShieldCheck size={18} /><p>By continuing, you confirm the information above is accurate. Your final payment total is recalculated securely on the server using the school's current fee settings.</p></div>
    <FormError error={error} />
    <div className="registration-form-actions"><button className="button button-quiet-dark" type="button" onClick={onBack} disabled={saving}><ArrowLeft size={16} /> Back</button><button className="button button-green" type="button" onClick={onSubmit} disabled={saving}>{saving ? <Loader2 className="spin" size={17} /> : <CreditCard size={17} />}{saving ? "Saving registration…" : estimate.totalCents > 0 ? `Continue to payment · ${formatRegistrationMoney(estimate.totalCents)}` : "Complete registration"}</button></div>
  </div>;
}

function PaymentStep({ config, guardian, registration, onPaid }) {
  const [card, setCard] = useState(null);
  const [loadingCard, setLoadingCard] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let localCard = null;
    async function initialize() {
      if (!config.square?.enabled) { setLoadingCard(false); return; }
      try {
        await loadSquareScript(config.square.environment);
        if (cancelled) return;
        const payments = window.Square.payments(config.square.applicationId, config.square.locationId);
        localCard = await payments.card();
        await localCard.attach("#square-card-container");
        if (!cancelled) setCard(localCard);
      } catch (err) {
        if (!cancelled) setError("The secure card form could not load. Please refresh or contact the school.");
      } finally {
        if (!cancelled) setLoadingCard(false);
      }
    }
    initialize();
    return () => { cancelled = true; try { localCard?.destroy?.(); } catch { /* no-op */ } };
  }, [config.square?.applicationId, config.square?.environment, config.square?.locationId, config.square?.enabled]);

  const makePayment = async () => {
    if (!card || paying) return;
    setPaying(true);
    setError("");
    try {
      const amount = (Number(registration.totalCents || 0) / 100).toFixed(2);
      const billingContact = {
        givenName: guardian.firstName?.trim() || undefined,
        familyName: guardian.lastName?.trim() || undefined,
        email: guardian.email?.trim() || undefined,
        phone: guardian.phone?.trim() || undefined,
        addressLines: [guardian.addressLine1?.trim(), guardian.addressLine2?.trim()].filter(Boolean),
        city: guardian.city?.trim() || undefined,
        state: guardian.state?.trim() || undefined,
        postalCode: guardian.postalCode?.trim() || undefined,
        countryCode: "US",
      };

      let tokenResult;
      try {
        tokenResult = await card.tokenize({
          amount,
          billingContact,
          currencyCode: registration.currency || "USD",
          intent: "CHARGE",
          customerInitiated: true,
          sellerKeyedIn: false,
        });
      } catch (squareError) {
        const details = extractSquareError(squareError);
        console.error("Square tokenization exception:", {
          name: squareError?.name,
          message: squareError?.message,
          errorList: squareError?.errorList,
          errors: squareError?.errors,
        });
        throw new Error(details);
      }

      if (tokenResult.status !== "OK" || !tokenResult.token) {
        console.error("Square tokenization result:", tokenResult);
        throw new Error(extractSquareTokenResultError(tokenResult));
      }
      const result = await payRegistration({
        registrationId: registration.registrationId,
        publicToken: registration.publicToken,
        sourceId: tokenResult.token,
        attemptId: crypto.randomUUID(),
      });
      onPaid(result);
    } catch (err) {
      setError(err.message || "Payment could not be completed.");
    } finally {
      setPaying(false);
    }
  };

  return <div>
    <FormHeading icon={<CreditCard />} eyebrow="Step 4 of 4" title="Secure payment" text={`Your registration ${registration.registrationNumber} is saved. Complete the payment below to finish.`} />
    <div className="payment-total-card"><div><span>Amount due</span><strong>{formatRegistrationMoney(registration.totalCents, registration.currency)}</strong></div><div className="payment-secure-badge"><LockKeyhole size={16} /> Secure Square checkout</div></div>
    {!config.square?.enabled ? <div className="registration-alert warning"><AlertCircle size={18} /><div><strong>Online payment is not configured yet.</strong><span>Your registration has been saved as {registration.registrationNumber}. Please contact the school to arrange payment.</span></div></div> : <>
      <div className="square-payment-shell"><div className="square-payment-label"><span>Card information</span><small>Card details are securely collected by Square and never stored by this website.</small></div>{loadingCard && <div className="square-loading"><Loader2 className="spin" size={18} /> Loading secure payment form…</div>}<div id="square-card-container" className={loadingCard ? "is-loading" : ""} /></div>
      <FormError error={error} />
      <button className="button button-green registration-pay-button" type="button" onClick={makePayment} disabled={!card || paying}>{paying ? <Loader2 className="spin" size={18} /> : <LockKeyhole size={18} />}{paying ? "Processing securely…" : `Pay ${formatRegistrationMoney(registration.totalCents, registration.currency)}`}</button>
      <p className="square-privacy-note"><ShieldCheck size={15} /> Payment information is tokenized by Square. EL Hedaya does not receive or store your full card number.</p>
    </>}
  </div>;
}

function extractSquareError(error) {
  const list = Array.isArray(error?.errorList)
    ? error.errorList
    : Array.isArray(error?.errors)
      ? error.errors
      : [];

  const messages = list
    .map((item) => item?.message || item?.detail || item?.code)
    .filter(Boolean);

  if (messages.length) return `Square: ${messages.join(" · ")}`;
  if (error?.message && !/unexpected error occurred while using card/i.test(error.message)) {
    return error.message;
  }

  return "Square could not tokenize the card. Please try once in Chrome or Edge with any VPN, ad blocker, or strict tracking protection temporarily disabled. If it still fails, open Developer Tools → Console and Network and look for a blocked Square request.";
}

function extractSquareTokenResultError(result) {
  const messages = (result?.errors || [])
    .map((item) => item?.message || item?.detail || item?.code)
    .filter(Boolean);
  if (messages.length) return `Square: ${messages.join(" · ")}`;
  return `Square tokenization failed${result?.status ? ` (${result.status})` : ""}. Please check the card details and try again.`;
}

function CompleteStep({ config, registration, paymentResult }) {
  const paid = paymentResult?.paymentStatus === "paid" || registration?.paymentStatus === "paid";
  return <div className="registration-complete">
    <div className={`registration-complete-icon ${paid ? "paid" : "saved"}`}>{paid ? <CheckCircle2 size={38} /> : <BadgeCheck size={38} />}</div>
    <span>{paid ? "Registration complete" : "Registration received"}</span>
    <h2>{paid ? "You’re all set." : "Your registration has been saved."}</h2>
    <p>{config.settings.confirmationMessage || "Jazakum Allahu Khairan. Your registration has been received."}</p>
    <div className="registration-confirmation-number"><small>Registration number</small><strong>{registration?.registrationNumber}</strong></div>
    {paid && <div className="registration-paid-summary"><ReceiptText size={20} /><div><span>Payment received</span><strong>{formatRegistrationMoney(registration?.totalCents, registration?.currency)}</strong>{paymentResult?.last4 && <small>{paymentResult.cardBrand || "Card"} ending in {paymentResult.last4}</small>}</div></div>}
    {paid && config.square?.environment === "sandbox" && <small className="registration-sandbox-note">Sandbox test payment · Square does not generate hosted receipts in Sandbox. A live Square receipt link will appear for Production payments.</small>}
    <div className="registration-complete-actions">{config.square?.environment !== "sandbox" && paymentResult?.receiptUrl && <a className="button button-gold" href={paymentResult.receiptUrl} target="_blank" rel="noreferrer"><ReceiptText size={17} /> View Square receipt</a>}<a className="button button-green" href="/">Return to EL Hedaya</a></div>
    <small className="registration-contact-help">Questions? {config.settings.contactEmail && <a href={`mailto:${config.settings.contactEmail}`}>{config.settings.contactEmail}</a>}{config.settings.contactPhone && <> · <a href={`tel:${config.settings.contactPhone}`}>{config.settings.contactPhone}</a></>}</small>
  </div>;
}

function RegistrationSidebar({ config, students, estimate }) {
  return <aside className="registration-sidebar"><div className="registration-summary-card"><span className="summary-eyebrow"><CircleDollarSign size={15} /> Current fees</span><h3>{config.settings.termName}</h3><div className="sidebar-fee-lines">{estimate.lines.length ? estimate.lines.map((line) => <div key={`${line.id}-${line.quantity}`}><span>{line.name}{line.quantity > 1 ? ` × ${line.quantity}` : ""}</span><strong className={line.totalCents < 0 ? "discount" : ""}>{formatRegistrationMoney(line.totalCents)}</strong></div>) : <small>No required fees are configured.</small>}</div><div className="sidebar-total"><span>Estimated total</span><strong>{formatRegistrationMoney(estimate.totalCents, config.settings.currency)}</strong></div><small>For {students.length} {students.length === 1 ? "student" : "students"}. The secure server calculates the final total before payment.</small></div><div className="registration-help-card"><Mail size={18} /><div><strong>Need help?</strong><span>{config.settings.contactEmail || school.email}</span><small>{config.settings.contactPhone || school.phone}</small></div></div></aside>;
}

function FeeTable({ estimate, currency }) {
  return <div className="registration-fee-table"><div className="fee-table-head"><span>Fee</span><span>Qty</span><span>Total</span></div>{estimate.lines.map((line) => <div className="fee-table-row" key={`${line.id}-${line.quantity}`}><div><strong>{line.name}</strong><small>{line.description || (line.scope === "student" ? "Per student" : "Per family")}</small></div><span>{line.quantity}</span><b className={line.totalCents < 0 ? "discount" : ""}>{formatRegistrationMoney(line.totalCents, currency)}</b></div>)}<div className="fee-table-total"><span>Total due</span><strong>{formatRegistrationMoney(estimate.totalCents, currency)}</strong></div></div>;
}

function FormHeading({ icon, eyebrow, title, text }) {
  return <div className="registration-form-heading"><div className="registration-form-icon">{icon}</div><div><span>{eyebrow}</span><h2>{title}</h2><p>{text}</p></div></div>;
}

function Field({ label, value, onChange, type = "text", required = false, className = "" }) {
  return <label className={`registration-field ${className}`}><span>{label}{required && <b>*</b>}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} /></label>;
}

function SelectField({ label, value, onChange, options, placeholder, required = false }) {
  return <label className="registration-field"><span>{label}{required && <b>*</b>}</span><select value={value} onChange={(e) => onChange(e.target.value)} required={required}><option value="">{placeholder}</option>{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>;
}

function FormError({ error }) {
  if (!error) return null;
  return <div className="registration-alert error"><AlertCircle size={18} /><span>{error}</span></div>;
}

function RegistrationNotice({ icon, title, text }) {
  return <section className="registration-notice-wrap"><div className="registration-notice"><div>{icon}</div><h1>{title}</h1><p>{text}</p><a className="button button-green" href="/">Return to EL Hedaya</a></div></section>;
}

function loadSquareScript(environment) {
  if (window.Square) return Promise.resolve();
  const src = environment === "production" ? "https://web.squarecdn.com/v1/square.js" : "https://sandbox.web.squarecdn.com/v1/square.js";
  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) return new Promise((resolve, reject) => { existing.addEventListener("load", resolve, { once: true }); existing.addEventListener("error", reject, { once: true }); });
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Square.js failed to load."));
    document.head.appendChild(script);
  });
}
