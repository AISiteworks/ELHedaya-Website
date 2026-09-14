import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BadgeDollarSign,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Eye,
  GraduationCap,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Trash2,
  UserRound,
  UsersRound,
  WalletCards,
  X,
} from "lucide-react";
import {
  deleteRegistrationFee,
  formatRegistrationMoney,
  getRegistrationSettingsAdmin,
  listRegistrationAdminRecords,
  listRegistrationFeesAdmin,
  registrationBackendConfigured,
  saveRegistrationFee,
  saveRegistrationSettings,
  setRegistrationPaymentStatus,
} from "../services/registrationService";

const sections = [
  ["overview", "Overview", ClipboardList],
  ["registrations", "Registrations", UsersRound],
  ["fees", "Fees", BadgeDollarSign],
  ["settings", "Settings", Settings2],
];

export default function RegistrationAdmin({ localPreview = false }) {
  const [section, setSection] = useState("overview");
  const [records, setRecords] = useState([]);
  const [fees, setFees] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [nextRecords, nextFees, nextSettings] = await Promise.all([
        listRegistrationAdminRecords(),
        listRegistrationFeesAdmin(),
        getRegistrationSettingsAdmin(),
      ]);
      setRecords(nextRecords);
      setFees(nextFees);
      setSettings(nextSettings);
    } catch (err) {
      setError(err.message || "Registration administration could not load.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (registrationBackendConfigured && !localPreview) load();
    else setLoading(false);
  }, [localPreview]);

  if (localPreview || !registrationBackendConfigured) {
    return <div className="admin-panel registration-admin-panel"><div className="gallery-alert gallery-alert-error"><strong>Registration module needs Supabase.</strong><span>Run <code>supabase/registration.sql</code> and use the deployed admin account to manage registrations.</span></div></div>;
  }

  return <div className="registration-admin-panel">
    <div className="registration-admin-toolbar">
      <div><span>Registration Management</span><h3>{settings?.term_name || "EL Hedaya Registration"}</h3></div>
      <button className="button button-small button-light" type="button" onClick={load} disabled={loading}><RefreshCw className={loading ? "spin" : ""} size={15} /> Refresh</button>
    </div>

    <div className="registration-admin-nav">{sections.map(([key, label, Icon]) => <button key={key} type="button" className={section === key ? "active" : ""} onClick={() => setSection(key)}><Icon size={16} /> {label}</button>)}</div>

    {error && <div className="gallery-alert gallery-alert-error"><AlertCircle size={17} /><span>{error}</span></div>}
    {loading ? <div className="registration-admin-loading"><Loader2 className="spin" size={24} /> Loading registration data…</div> : <>
      {section === "overview" && <Overview records={records} settings={settings} onGoRegistrations={() => setSection("registrations")} />}
      {section === "registrations" && <Registrations records={records} onChanged={load} />}
      {section === "fees" && <Fees fees={fees} onChanged={load} />}
      {section === "settings" && <Settings settings={settings} onChanged={load} />}
    </>}
  </div>;
}

function Overview({ records, settings, onGoRegistrations }) {
  const stats = useMemo(() => {
    const students = records.reduce((sum, record) => sum + (record.students?.length || 0), 0);
    const paid = records.filter((record) => ["paid", "offline"].includes(record.payment_status));
    const outstanding = records.filter((record) => ["pending", "failed"].includes(record.payment_status));
    return {
      registrations: records.length,
      students,
      collected: paid.reduce((sum, record) => sum + Number(record.total_cents || 0), 0),
      outstanding: outstanding.reduce((sum, record) => sum + Number(record.total_cents || 0), 0),
    };
  }, [records]);

  const statusCounts = records.reduce((map, record) => ({ ...map, [record.payment_status]: (map[record.payment_status] || 0) + 1 }), {});

  return <div className="registration-admin-section">
    <div className="registration-admin-status-banner"><div className={settings?.registration_open ? "open" : "closed"}><span /> Registration {settings?.registration_open ? "Open" : "Closed"}</div><p>{settings?.school_year} · {settings?.term_name}{settings?.registration_deadline ? ` · Deadline ${new Date(`${settings.registration_deadline}T12:00:00`).toLocaleDateString()}` : ""}</p></div>
    <div className="registration-stat-grid">
      <StatCard icon={<ClipboardList />} label="Registrations" value={stats.registrations} />
      <StatCard icon={<GraduationCap />} label="Students" value={stats.students} />
      <StatCard icon={<CircleDollarSign />} label="Collected" value={formatRegistrationMoney(stats.collected)} />
      <StatCard icon={<WalletCards />} label="Outstanding" value={formatRegistrationMoney(stats.outstanding)} />
    </div>
    <div className="registration-dashboard-grid">
      <div className="registration-dashboard-card"><div className="dashboard-card-head"><div><span>Payment health</span><strong>Status breakdown</strong></div></div><div className="payment-status-breakdown">{["paid","offline","pending","failed","waived","refunded"].map((status) => <div key={status}><span className={`status-dot ${status}`} /> <strong>{prettyStatus(status)}</strong><b>{statusCounts[status] || 0}</b></div>)}</div></div>
      <div className="registration-dashboard-card"><div className="dashboard-card-head"><div><span>Latest activity</span><strong>Recent registrations</strong></div><button type="button" onClick={onGoRegistrations}>View all</button></div><div className="latest-registration-list">{records.slice(0, 5).map((record) => <div key={record.id}><div><strong>{record.guardian_first_name} {record.guardian_last_name}</strong><span>{record.students?.length || 0} {(record.students?.length || 0) === 1 ? "student" : "students"} · {record.registration_number}</span></div><StatusBadge status={record.payment_status} /></div>)}{!records.length && <small className="registration-admin-empty">No registrations yet.</small>}</div></div>
    </div>
  </div>;
}

function Registrations({ records, onChanged }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);
  const visible = records.filter((record) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || `${record.registration_number} ${record.guardian_first_name} ${record.guardian_last_name} ${record.guardian_email} ${(record.students || []).map((student) => `${student.first_name} ${student.last_name}`).join(" ")}`.toLowerCase().includes(q);
    const matchesFilter = filter === "all" || record.payment_status === filter;
    return matchesSearch && matchesFilter;
  });

  const updateStatus = async (record, status) => {
    if (status === record.payment_status) return;
    setUpdating(true);
    try { await setRegistrationPaymentStatus(record, status); await onChanged(); setSelected((current) => current ? { ...current, payment_status: status } : current); }
    catch (err) { window.alert(err.message || "Status could not be updated."); }
    finally { setUpdating(false); }
  };

  return <div className="registration-admin-section">
    <div className="registration-list-tools"><label><Search size={15} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search guardian, student, email, ID…" /></label><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All payment statuses</option>{["paid","offline","pending","failed","waived","refunded"].map((status) => <option key={status} value={status}>{prettyStatus(status)}</option>)}</select></div>
    <div className="registration-table-wrap"><table className="registration-table"><thead><tr><th>Registration</th><th>Family</th><th>Students</th><th>Total</th><th>Payment</th><th>Date</th><th /></tr></thead><tbody>{visible.map((record) => <tr key={record.id}><td><strong>{record.registration_number}</strong></td><td><strong>{record.guardian_first_name} {record.guardian_last_name}</strong><small>{record.guardian_email}</small></td><td>{record.students?.length || 0}</td><td>{formatRegistrationMoney(record.total_cents, record.currency)}</td><td><StatusBadge status={record.payment_status} /></td><td>{new Date(record.created_at).toLocaleDateString()}</td><td><button className="registration-row-view" type="button" onClick={() => setSelected(record)}><Eye size={16} /></button></td></tr>)}</tbody></table>{!visible.length && <div className="registration-admin-empty">No registrations match your search.</div>}</div>
    {selected && <RegistrationDrawer record={selected} onClose={() => setSelected(null)} onStatusChange={updateStatus} updating={updating} />}
  </div>;
}

function RegistrationDrawer({ record, onClose, onStatusChange, updating }) {
  return <div className="registration-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><aside className="registration-drawer"><div className="registration-drawer-head"><div><span>Registration record</span><h3>{record.registration_number}</h3></div><button type="button" onClick={onClose}><X size={19} /></button></div><div className="registration-drawer-body">
    <div className="drawer-summary"><div><UserRound size={18} /><span>Guardian</span><strong>{record.guardian_first_name} {record.guardian_last_name}</strong><small>{record.guardian_email}<br />{record.guardian_phone}</small></div><div><CircleDollarSign size={18} /><span>Total</span><strong>{formatRegistrationMoney(record.total_cents, record.currency)}</strong><StatusBadge status={record.payment_status} /></div></div>
    <div className="drawer-section"><div className="drawer-section-title"><GraduationCap size={17} /> Students</div>{record.students?.sort((a,b) => a.sort_order-b.sort_order).map((student) => <div className="drawer-student" key={student.id}><div><strong>{student.first_name} {student.last_name}</strong><span>{student.grade}{student.returning_student ? " · Returning" : ""}</span></div><small>{student.date_of_birth ? new Date(`${student.date_of_birth}T12:00:00`).toLocaleDateString() : ""}{student.medical_notes ? ` · ${student.medical_notes}` : ""}</small></div>)}</div>
    <div className="drawer-section"><div className="drawer-section-title"><BadgeDollarSign size={17} /> Fee snapshot</div>{record.registration_fee_lines?.map((line) => <div className="drawer-fee-line" key={line.id}><span>{line.fee_name}{line.quantity > 1 ? ` × ${line.quantity}` : ""}</span><strong className={line.total_cents < 0 ? "discount" : ""}>{formatRegistrationMoney(line.total_cents, record.currency)}</strong></div>)}</div>
    <div className="drawer-section"><div className="drawer-section-title"><WalletCards size={17} /> Payment status</div><label className="drawer-status-select"><span>Admin status</span><select disabled={updating} value={record.payment_status} onChange={(e) => onStatusChange(record, e.target.value)}>{["pending","paid","offline","failed","waived","refunded"].map((status) => <option key={status} value={status}>{prettyStatus(status)}</option>)}</select></label>{record.square_receipt_url && <a className="drawer-receipt-link" href={record.square_receipt_url} target="_blank" rel="noreferrer">Open Square receipt ↗</a>}{record.registration_payments?.map((payment) => <div className="drawer-payment" key={payment.id}><strong>{payment.provider === "square" ? "Square" : "Offline"} · {payment.status}</strong><span>{formatRegistrationMoney(payment.amount_cents, payment.currency)}{payment.last_4 ? ` · ${payment.card_brand || "Card"} •••• ${payment.last_4}` : ""}</span><small>{new Date(payment.created_at).toLocaleString()}</small></div>)}</div>
    {record.notes && <div className="drawer-section"><div className="drawer-section-title">Family notes</div><p className="drawer-notes">{record.notes}</p></div>}
  </div></aside></div>;
}

function Fees({ fees, onChanged }) {
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const newFee = () => setEditing({ name: "", description: "", amount: "", kind: "charge", scope: "student", isOptional: false, appliesAfterStudents: 0, isActive: true, sortOrder: (fees.length + 1) * 10 });
  const editFee = (fee) => setEditing({ id: fee.id, name: fee.name, description: fee.description || "", amount: (fee.amount_cents / 100).toFixed(2), kind: fee.kind, scope: fee.scope, isOptional: fee.is_optional, appliesAfterStudents: fee.applies_after_students, isActive: fee.is_active, sortOrder: fee.sort_order });
  const save = async () => { setSaving(true); try { await saveRegistrationFee(editing); setEditing(null); await onChanged(); } catch (err) { window.alert(err.message || "Fee could not be saved."); } finally { setSaving(false); } };
  const remove = async (fee) => { if (!window.confirm(`Delete “${fee.name}”? Existing registrations keep their saved fee snapshot.`)) return; try { await deleteRegistrationFee(fee.id); await onChanged(); } catch (err) { window.alert(err.message || "Fee could not be deleted."); } };

  return <div className="registration-admin-section"><div className="fee-admin-intro"><div><span>Dynamic fee builder</span><h4>Control what families are charged</h4><p>Add per-student or per-family charges, optional items, and discounts without changing website code.</p></div><button className="button button-green button-small" type="button" onClick={newFee}><Plus size={15} /> Add fee</button></div>
    <div className="fee-admin-list">{fees.map((fee) => <div className={`fee-admin-card ${!fee.is_active ? "inactive" : ""}`} key={fee.id}><div className={`fee-admin-icon ${fee.kind}`}><BadgeDollarSign size={20} /></div><div className="fee-admin-copy"><div><strong>{fee.name}</strong>{fee.is_optional && <span className="fee-pill">Optional</span>}{!fee.is_active && <span className="fee-pill muted">Inactive</span>}</div><p>{fee.description || "No description"}</p><small>{fee.scope === "student" ? `Per student${fee.applies_after_students ? ` after first ${fee.applies_after_students}` : ""}` : "Per family"} · {fee.kind === "discount" ? "Discount" : "Charge"}</small></div><strong className={fee.kind === "discount" ? "discount" : ""}>{fee.kind === "discount" ? "−" : ""}{formatRegistrationMoney(fee.amount_cents)}</strong><div className="fee-admin-actions"><button type="button" onClick={() => editFee(fee)}>Edit</button><button type="button" onClick={() => remove(fee)}><Trash2 size={15} /></button></div></div>)}{!fees.length && <div className="registration-admin-empty">No fees configured. Add your first fee.</div>}</div>
    {editing && <FeeEditor fee={editing} setFee={setEditing} onCancel={() => setEditing(null)} onSave={save} saving={saving} />}
  </div>;
}

function FeeEditor({ fee, setFee, onCancel, onSave, saving }) {
  const set = (key, value) => setFee((current) => ({ ...current, [key]: value }));
  return <div className="registration-modal-backdrop"><div className="registration-modal"><div className="registration-modal-head"><div><span>Fee field</span><h3>{fee.id ? "Edit fee" : "Add fee"}</h3></div><button type="button" onClick={onCancel}><X size={18} /></button></div><div className="registration-fields two-col compact"><FieldAdmin label="Fee name" value={fee.name} onChange={(v) => set("name", v)} /><FieldAdmin label="Amount ($)" type="number" step="0.01" min="0" value={fee.amount} onChange={(v) => set("amount", v)} /><label className="registration-field span-2"><span>Description</span><input value={fee.description} onChange={(e) => set("description", e.target.value)} /></label><label className="registration-field"><span>Type</span><select value={fee.kind} onChange={(e) => set("kind", e.target.value)}><option value="charge">Charge</option><option value="discount">Discount</option></select></label><label className="registration-field"><span>Applies to</span><select value={fee.scope} onChange={(e) => set("scope", e.target.value)}><option value="student">Each student</option><option value="family">Whole family</option></select></label>{fee.scope === "student" && <FieldAdmin label="Apply after X students" type="number" min="0" value={fee.appliesAfterStudents} onChange={(v) => set("appliesAfterStudents", v)} />}<FieldAdmin label="Sort order" type="number" value={fee.sortOrder} onChange={(v) => set("sortOrder", v)} /><label className="registration-check-field"><input type="checkbox" checked={fee.isOptional} onChange={(e) => set("isOptional", e.target.checked)} /><span><strong>Optional fee</strong><small>Parent chooses whether to include it</small></span></label><label className="registration-check-field"><input type="checkbox" checked={fee.isActive} onChange={(e) => set("isActive", e.target.checked)} /><span><strong>Active</strong><small>Include in new registrations</small></span></label></div><div className="registration-modal-actions"><button className="button button-quiet-dark" type="button" onClick={onCancel}>Cancel</button><button className="button button-green" type="button" onClick={onSave} disabled={saving || !fee.name.trim()}>{saving ? <Loader2 className="spin" size={16} /> : <Save size={16} />} Save fee</button></div></div></div>;
}

function Settings({ settings, onChanged }) {
  const [form, setForm] = useState({
    registrationOpen: Boolean(settings?.registration_open),
    schoolYear: settings?.school_year || "",
    termName: settings?.term_name || "",
    registrationDeadline: settings?.registration_deadline || "",
    welcomeMessage: settings?.welcome_message || "",
    confirmationMessage: settings?.confirmation_message || "",
    contactEmail: settings?.contact_email || "",
    contactPhone: settings?.contact_phone || "",
  });
  const [saving, setSaving] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => { setSaving(true); try { await saveRegistrationSettings(form); await onChanged(); } catch (err) { window.alert(err.message || "Settings could not be saved."); } finally { setSaving(false); } };
  return <div className="registration-admin-section"><div className="settings-admin-grid"><div className="settings-admin-card prominent"><div className="settings-admin-card-head"><div><span>Registration switch</span><h4>Accept new registrations</h4></div><label className="registration-switch"><input type="checkbox" checked={form.registrationOpen} onChange={(e) => set("registrationOpen", e.target.checked)} /><span /></label></div><p>Turn this off to immediately close the public registration form without redeploying the website.</p><div className={`registration-live-state ${form.registrationOpen ? "open" : "closed"}`}><span /> Registration {form.registrationOpen ? "OPEN" : "CLOSED"}</div></div><div className="settings-admin-card"><span>Term details</span><div className="registration-fields two-col compact"><FieldAdmin label="School year" value={form.schoolYear} onChange={(v) => set("schoolYear", v)} /><FieldAdmin label="Term name" value={form.termName} onChange={(v) => set("termName", v)} /><FieldAdmin label="Registration deadline" type="date" value={form.registrationDeadline} onChange={(v) => set("registrationDeadline", v)} /></div></div><div className="settings-admin-card span-2"><span>Registration messaging</span><div className="registration-fields two-col compact"><label className="registration-field"><span>Welcome message</span><textarea rows="4" value={form.welcomeMessage} onChange={(e) => set("welcomeMessage", e.target.value)} /></label><label className="registration-field"><span>Confirmation message</span><textarea rows="4" value={form.confirmationMessage} onChange={(e) => set("confirmationMessage", e.target.value)} /></label></div></div><div className="settings-admin-card span-2"><span>Family support contact</span><div className="registration-fields two-col compact"><FieldAdmin label="Contact email" type="email" value={form.contactEmail} onChange={(v) => set("contactEmail", v)} /><FieldAdmin label="Contact phone" value={form.contactPhone} onChange={(v) => set("contactPhone", v)} /></div></div></div><div className="registration-settings-save"><button className="button button-green" type="button" onClick={save} disabled={saving}>{saving ? <Loader2 className="spin" size={17} /> : <Save size={17} />} {saving ? "Saving…" : "Save registration settings"}</button></div></div>;
}

function StatCard({ icon, label, value }) { return <div className="registration-stat-card"><span>{icon}</span><div><strong>{value}</strong><small>{label}</small></div></div>; }
function StatusBadge({ status }) { return <span className={`registration-status ${status}`}><span />{prettyStatus(status)}</span>; }
function prettyStatus(status) { return ({ paid: "Paid", offline: "Offline Paid", pending: "Pending", failed: "Failed", waived: "Waived", refunded: "Refunded" }[status] || status); }
function FieldAdmin({ label, value, onChange, type = "text", ...props }) { return <label className="registration-field"><span>{label}</span><input type={type} value={value} onChange={(e) => onChange(e.target.value)} {...props} /></label>; }
