import { useEffect, useMemo, useState } from "react";
import { HeartHandshake, Loader2, Mail, Phone, RefreshCw, Search, Trash2 } from "lucide-react";
import { supabase } from "../services/galleryService";

const statusLabels = { new: "New", contacted: "Contacted", approved: "Confirmed", closed: "Closed" };

export default function VolunteerAdmin() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    if (!supabase) return;
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase.from("volunteer_submissions").select("*").order("created_at", { ascending: false });
    if (loadError) setError(loadError.message);
    else setItems(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && item.status !== filter) return false;
      if (!needle) return true;
      return [item.full_name, item.email, item.phone, ...(item.interests || [])].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });
  }, [items, query, filter]);

  const updateStatus = async (id, status) => {
    setBusyId(id);
    const { error: updateError } = await supabase.from("volunteer_submissions").update({ status }).eq("id", id);
    if (updateError) setError(updateError.message);
    else setItems((current) => current.map((item) => item.id === id ? { ...item, status } : item));
    setBusyId("");
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete volunteer submission from ${item.full_name}?`)) return;
    setBusyId(item.id);
    const { error: deleteError } = await supabase.from("volunteer_submissions").delete().eq("id", item.id);
    if (deleteError) setError(deleteError.message);
    else setItems((current) => current.filter((entry) => entry.id !== item.id));
    setBusyId("");
  };

  return (
    <div className="volunteer-admin-shell">
      <div className="volunteer-admin-header">
        <div><span className="admin-kicker"><HeartHandshake size={15} /> Volunteer Interest</span><h2>Community volunteers</h2><p>Review new offers to help and keep follow-up organized.</p></div>
        <button className="admin-soft-button" type="button" onClick={load} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""} /> Refresh</button>
      </div>

      <div className="volunteer-admin-toolbar">
        <label><Search size={16} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email, interest…" /></label>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
      </div>

      {error && <div className="gallery-alert gallery-alert-error">{error}</div>}
      {loading ? <div className="volunteer-admin-empty"><Loader2 className="spin" size={23} /> Loading volunteer submissions…</div> : filtered.length === 0 ? <div className="volunteer-admin-empty"><HeartHandshake size={26} /><strong>No volunteer submissions found.</strong></div> : (
        <div className="volunteer-admin-list">
          {filtered.map((item) => (
            <article className="volunteer-admin-card" key={item.id}>
              <div className="volunteer-admin-person"><div className="volunteer-admin-avatar">{item.full_name?.slice(0, 1).toUpperCase()}</div><div><strong>{item.full_name}</strong><span>{item.relationship || "Volunteer"}</span></div></div>
              <div className="volunteer-admin-contact"><a href={`mailto:${item.email}`}><Mail size={14} /> {item.email}</a>{item.phone && <a href={`tel:${item.phone.replace(/\D/g, "")}`}><Phone size={14} /> {item.phone}</a>}</div>
              <div className="volunteer-admin-tags">{(item.interests || []).map((interest) => <span key={interest}>{interest}</span>)}</div>
              {(item.availability || []).length > 0 && <p className="volunteer-admin-availability"><b>Availability:</b> {item.availability.join(" · ")}</p>}
              {item.message && <p className="volunteer-admin-message">“{item.message}”</p>}
              <div className="volunteer-admin-card-footer"><small>{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</small><div><select value={item.status || "new"} onChange={(e) => updateStatus(item.id, e.target.value)} disabled={busyId === item.id}>{Object.entries(statusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="volunteer-delete-button" type="button" onClick={() => remove(item)} disabled={busyId === item.id} aria-label={`Delete ${item.full_name}`}><Trash2 size={16} /></button></div></div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
