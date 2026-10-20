"use client";

// ── Course content manager (Oct 2026) ────────────────────────────────────────
// Courses tab → "Content" kholne par yahi dikhta hai. page.tsx wale purane
// ContentManager ki jagah. Naya kya hai:
//   • Add karte waqt "Email + app notification" — sirf kharidne walon ko
//   • Har item par: ⬇️ Download (PDF) / ▶ Open (video), ✏️ Edit (naam, order, PDF badlo),
//     🙈 Hide / Show, 📧 Notify (dobara bhejo), 🗑 Delete (hamesha ke liye)
// Backend: selection-lab-api → routers/course_content_admin.py

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const TOKEN_KEY = "sl_admin_token";

function token(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

function errText(detail: any): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.slice(0, 3).map((d: any) => d?.msg || JSON.stringify(d)).join(" · ");
  try { return JSON.stringify(detail); } catch { return String(detail); }
}

async function api(path: string, method = "GET", body?: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errText(data.detail) || `Request failed (${res.status})`);
  return data;
}

// PDF Supabase Storage par — wahi purana upload raasta
async function uploadPdfFile(file: File): Promise<string> {
  if (!file.name.toLowerCase().endsWith(".pdf")) throw new Error("Please choose a PDF file");
  if (file.size > 50 * 1024 * 1024) throw new Error("PDF must be under 50 MB");
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API_URL}/admin-extra/upload-pdf`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token()}` },
    body: fd,
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok || !d.url) throw new Error(errText(d.detail) || "Upload failed");
  return d.url;
}

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 14, marginBottom: 12, boxSizing: "border-box",
};
const goldBtn: React.CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "12px 18px",
  fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const ghostBtn: React.CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10,
  padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const chipBtn: React.CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`, borderRadius: 8,
  padding: "7px 10px", fontWeight: 700, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap",
};

function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 2, ...style }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function Msg({ text, ok }: { text: string; ok?: boolean }) {
  if (!text) return null;
  const c = ok ? "#5dd97c" : "#ff6b6b";
  return (
    <p style={{ color: c, fontSize: 13, background: ok ? "rgba(93,217,124,0.08)" : "rgba(255,107,107,0.08)",
      border: `1px solid ${ok ? "rgba(93,217,124,0.3)" : "rgba(255,107,107,0.3)"}`, borderRadius: 10,
      padding: "10px 12px", margin: "12px 0 0" }}>
      {text}
    </p>
  );
}

export default function CourseContentAdmin({ course, onBack }: { course: any; onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ title: "", content_type: "pdf", url: "", display_order: "0" });
  const [notify, setNotify] = useState(true);
  const [buyers, setBuyers] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<any | null>(null);

  function load() {
    api(`/admin-extra/content/${course.id}`)
      .then((d) => {
        const list = d.content || [];
        setItems(list);
        setForm((f) => (f.title || f.url ? f : { ...f, display_order: String(list.length) }));
      })
      .catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
    api(`/admin-extra/content/notify-count/${course.id}`)
      .then((d) => setBuyers(typeof d.count === "number" ? d.count : null))
      .catch(() => setBuyers(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function flash(msg: string) {
    setError("");
    setNotice(msg);
    setTimeout(() => setNotice(""), 5000);
  }

  async function onPickPdf(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadPdfFile(file);
      setForm((f) => ({ ...f, url, title: f.title || file.name.replace(/\.pdf$/i, "") }));
    } catch (e: any) {
      setError(e.message);
    }
    setUploading(false);
    input.value = "";
  }

  async function add() {
    if (!form.title.trim() || !form.url.trim()) {
      setError("Title and URL are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api("/admin-extra/content/create", "POST", {
        course_id: course.id,
        title: form.title.trim(),
        content_type: form.content_type,
        url: form.url.trim(),
        display_order: Number(form.display_order) || 0,
        notify,
      });
      setForm({ title: "", content_type: form.content_type, url: "", display_order: String(items.length + 1) });
      flash(notify ? `✓ Added — email + app notification ja rahe hain${buyers !== null ? ` (${buyers} students)` : ""}` : "✓ Added (koi email nahi bheja)");
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function patch(id: number, body: any, okMsg: string) {
    setBusyId(id);
    setError("");
    try {
      await api(`/admin-extra/content/${id}/edit`, "PATCH", body);
      flash(okMsg);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setBusyId(null);
  }

  async function toggleHide(it: any) {
    const hide = it.is_active !== false;
    if (hide && !confirm(`"${it.title}" students se chhup jayega. Baad me "Show" se wapas la sakte ho. Pakka?`)) return;
    await patch(it.id, { is_active: !hide }, hide ? "🙈 Hidden — students ko nahi dikhega" : "👁 Visible — students ko dikh raha hai");
  }

  async function renotify(it: any) {
    if (!confirm(`"${it.title}" ka email + app notification ${buyers !== null ? `${buyers} students` : "sab kharidne walon"} ko dobara jayega. Bhejein?`)) return;
    setBusyId(it.id);
    setError("");
    try {
      await api(`/admin-extra/content/${it.id}/notify`, "POST");
      flash("📧 Email + notification ja rahe hain");
    } catch (e: any) {
      setError(e.message);
    }
    setBusyId(null);
  }

  async function remove(it: any) {
    if (!confirm(`"${it.title}" HAMESHA ke liye delete ho jayega — wapas nahi aayega.\n\nSirf chhupana ho to "Hide" dabaiye. Delete karein?`)) return;
    setBusyId(it.id);
    setError("");
    try {
      await api(`/admin-extra/content/${it.id}/permanent`, "DELETE");
      flash("🗑 Deleted");
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setBusyId(null);
  }

  // PDF: seedha download (Supabase ka ?download= file ko "save" karwata hai).
  // Video: YouTube link khulta hai.
  function openOrDownload(it: any) {
    if (!it.url) {
      setError("Is item ka link khaali hai");
      return;
    }
    if (it.content_type === "pdf") {
      const name = `${String(it.title || "notes").replace(/[^\w\s-]/g, "").trim() || "notes"}.pdf`;
      const sep = it.url.includes("?") ? "&" : "?";
      const a = document.createElement("a");
      a.href = `${it.url}${sep}download=${encodeURIComponent(name)}`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      window.open(it.url, "_blank", "noopener,noreferrer");
    }
  }

  return (
    <div>
      <button onClick={onBack} style={{ ...ghostBtn, marginBottom: 14 }}>← Back to courses</button>
      <h3 style={{ margin: "0 0 4px", fontSize: 17 }}>{course.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: MUTED }}>
        Course content — videos and PDFs shown to enrolled students.
        {buyers !== null && <> · <b style={{ color: GOLD }}>{buyers}</b> students (email wale) is course ke maalik hain.</>}
      </p>

      {/* Add form */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <Field label="Title">
          <input style={inputStyle} placeholder="e.g. Lecture 1 — Introduction" value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Type" style={{ flex: 1 }}>
            <select style={inputStyle} value={form.content_type}
              onChange={(e) => setForm({ ...form, content_type: e.target.value, url: "" })}>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
            </select>
          </Field>
          <Field label="Order" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={form.display_order}
              onChange={(e) => setForm({ ...form, display_order: e.target.value })} />
          </Field>
        </div>

        {form.content_type === "video" ? (
          <Field label="YouTube link (unlisted)">
            <input style={inputStyle} placeholder="https://youtube.com/watch?v=..." value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })} />
          </Field>
        ) : (
          <Field label="PDF file (max 50 MB)">
            <input type="file" accept="application/pdf,.pdf" onChange={(e) => onPickPdf(e.target)}
              disabled={uploading} style={{ ...inputStyle, padding: 10 }} />
            {uploading && <div style={{ fontSize: 12, color: GOLD, margin: "-6px 0 10px" }}>Uploading PDF…</div>}
            {form.url && !uploading && (
              <div style={{ fontSize: 11.5, color: "#5dd97c", margin: "-6px 0 10px" }}>✓ Uploaded — ready to add</div>
            )}
          </Field>
        )}

        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "rgba(255,171,0,0.07)",
          border: `1px solid ${BORDER}`, borderRadius: 10, padding: "10px 12px", marginBottom: 12, cursor: "pointer" }}>
          <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)}
            style={{ width: 18, height: 18, marginTop: 2, accentColor: GOLD }} />
          <span style={{ fontSize: 13, lineHeight: 1.5 }}>
            <b>Kharidne walon ko email + app notification bhejo</b>
            <span style={{ display: "block", color: MUTED, fontSize: 12 }}>
              Sirf galti theek karni ho (PDF dobara daalna) to tick hata dijiye — kisi ko kuch nahi jayega.
            </span>
          </span>
        </label>

        <button onClick={add} disabled={saving || uploading || !form.url}
          style={{ ...goldBtn, width: "100%", opacity: saving || uploading || !form.url ? 0.5 : 1 }}>
          {saving ? "Adding..." : notify ? "+ Add content & notify" : "+ Add content"}
        </button>
        <Msg text={error} />
        <Msg text={notice} ok />
      </div>

      {/* Content list */}
      {items.length === 0 && <p style={{ color: "#8d8371", fontSize: 14 }}>No content added yet.</p>}
      {items.map((it) => {
        const hidden = it.is_active === false;
        const busy = busyId === it.id;
        return (
          <div key={it.id} style={{ background: CARD, border: `1px solid ${hidden ? "rgba(255,255,255,0.08)" : BORDER}`,
            borderRadius: 12, padding: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: hidden ? 0.5 : 1 }}>
              <span style={{ fontSize: 20 }}>{it.content_type === "pdf" ? "📄" : "🎬"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {it.title}
                  {hidden && <span style={{ marginLeft: 8, fontSize: 11, color: "#ff9b6b", fontWeight: 800 }}>HIDDEN</span>}
                </div>
                <div style={{ fontSize: 11.5, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  #{it.display_order} · {it.url}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, opacity: busy ? 0.5 : 1, pointerEvents: busy ? "none" : "auto" }}>
              <button onClick={() => openOrDownload(it)} style={chipBtn}>{it.content_type === "pdf" ? "⬇️ Download" : "▶ Open"}</button>
              <button onClick={() => setEditing({ ...it })} style={chipBtn}>✏️ Edit</button>
              <button onClick={() => toggleHide(it)} style={{ ...chipBtn, color: hidden ? "#5dd97c" : "#ffcf6b" }}>
                {hidden ? "👁 Show" : "🙈 Hide"}
              </button>
              {!hidden && <button onClick={() => renotify(it)} style={chipBtn}>📧 Notify</button>}
              <button onClick={() => remove(it)} style={{ ...chipBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>🗑 Delete</button>
            </div>
          </div>
        );
      })}

      {editing && (
        <EditModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={(msg) => { setEditing(null); flash(msg); load(); }}
        />
      )}
    </div>
  );
}

function EditModal({ item, onClose, onSaved }: { item: any; onClose: () => void; onSaved: (msg: string) => void }) {
  const [title, setTitle] = useState(item.title || "");
  const [order, setOrder] = useState(String(item.display_order ?? 0));
  const [url, setUrl] = useState(item.url || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isPdf = item.content_type === "pdf";

  async function onPick(input: HTMLInputElement) {
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      setUrl(await uploadPdfFile(file));
    } catch (e: any) {
      setError(e.message);
    }
    setUploading(false);
    input.value = "";
  }

  async function save() {
    const body: any = {};
    if (title.trim() !== (item.title || "")) body.title = title.trim();
    if ((Number(order) || 0) !== (item.display_order ?? 0)) body.display_order = Number(order) || 0;
    if (url.trim() !== (item.url || "")) body.url = url.trim();
    if (!Object.keys(body).length) {
      onClose();
      return;
    }
    if (!title.trim() || !url.trim()) {
      setError("Title and link can't be empty");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api(`/admin-extra/content/${item.id}/edit`, "PATCH", body);
      onSaved(body.url ? "✓ Saved — nayi file lag gayi" : "✓ Saved");
    } catch (e: any) {
      setError(e.message);
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1000,
      display: "flex", alignItems: "flex-end", justifyContent: "center", padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 520, background: "#0d0b08",
        border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <b style={{ fontSize: 15 }}>✏️ Edit {isPdf ? "PDF" : "video"}</b>
          <button onClick={onClose} style={{ ...chipBtn, padding: "5px 10px" }}>✕</button>
        </div>

        <Field label="Title (students ko yahi naam dikhega)">
          <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Order (chhota number = upar)">
          <input type="number" style={inputStyle} value={order} onChange={(e) => setOrder(e.target.value)} />
        </Field>

        {isPdf ? (
          <Field label="PDF badalni hai? Nayi file chuniye (warna khaali chhodiye)">
            <input type="file" accept="application/pdf,.pdf" onChange={(e) => onPick(e.target)}
              disabled={uploading} style={{ ...inputStyle, padding: 10 }} />
            {uploading && <div style={{ fontSize: 12, color: GOLD, margin: "-6px 0 10px" }}>Uploading PDF…</div>}
            {url !== (item.url || "") && !uploading && (
              <div style={{ fontSize: 11.5, color: "#5dd97c", margin: "-6px 0 10px" }}>✓ Nayi PDF upload ho gayi — Save dabaiye</div>
            )}
          </Field>
        ) : (
          <Field label="YouTube link">
            <input style={inputStyle} value={url} onChange={(e) => setUrl(e.target.value)} />
          </Field>
        )}

        <p style={{ fontSize: 11.5, color: MUTED, margin: "0 0 12px", lineHeight: 1.5 }}>
          Edit karne par kisi ko email nahi jaata. Batana ho to baad me &quot;📧 Notify&quot; dabaiye.
        </p>

        <button onClick={save} disabled={saving || uploading}
          style={{ ...goldBtn, width: "100%", opacity: saving || uploading ? 0.5 : 1 }}>
          {saving ? "Saving..." : "Save changes"}
        </button>
        <Msg text={error} />
      </div>
    </div>
  );
}
