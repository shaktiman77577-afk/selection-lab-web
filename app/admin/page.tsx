"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";
import DescriptiveAdmin from "./DescriptiveAdmin";
import AppContentAdmin from "./AppContentAdmin";

const GOLD = "#FFAB00";
const BG = "#0d0b08";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const TOKEN_KEY = "sl_admin_token";

type Tab = "dashboard" | "courses" | "questions" | "qbank" | "mocktests" | "blog" | "banners" | "notifications" | "reviews" | "users" | "coupons" | "descriptive" | "appcontent";

// ── API helpers ──────────────────────────────────────────────────────────────
function token(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(TOKEN_KEY) || "";
}

async function api(path: string, method = "GET", body?: any) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token()}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed (${res.status})`);
  return data;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setLoggedIn(!!token());
    setChecked(true);
  }, []);

  if (!checked) return null;
  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff" }}>
      {loggedIn ? (
        <AdminDashboard onLogout={() => setLoggedIn(false)} />
      ) : (
        <AdminLogin onLogin={() => setLoggedIn(true)} />
      )}
    </div>
  );
}

// ── Login ────────────────────────────────────────────────────────────────────
function AdminLogin({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    if (!email || !password) {
      setError("Enter email and password");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin-extra/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      localStorage.setItem(TOKEN_KEY, data.token);
      onLogin();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <img
        src="/logo.png"
        alt=""
        style={{ width: 90, height: 90, objectFit: "contain", marginBottom: 12 }}
        onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
      />
      <h1 style={{ fontSize: 24, fontWeight: 800, margin: "0 0 4px" }}>
        Admin <span style={{ color: GOLD }}>Panel</span>
      </h1>
      <p style={{ color: "#9a917f", fontSize: 13, margin: "0 0 24px" }}>Selection Lab management</p>

      <div
        style={{
          width: "100%",
          maxWidth: 380,
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 16,
          padding: 22,
        }}
      >
        <input
          type="email"
          placeholder="Admin email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button onClick={handleLogin} disabled={loading} style={{ ...goldBtn, width: "100%" }}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
        {error && <p style={{ color: "#ff6b6b", fontSize: 13, marginTop: 12, textAlign: "center" }}>{error}</p>}
      </div>
    </div>
  );
}

// ── Dashboard shell ──────────────────────────────────────────────────────────
function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("dashboard");

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    onLogout();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "courses", label: "Courses" },
    { id: "questions", label: "Upload Qs" },
    { id: "qbank", label: "Question Bank" },
    { id: "mocktests", label: "Mock Tests" },
    { id: "blog", label: "Blog" },
    { id: "banners", label: "Banners" },
    { id: "notifications", label: "Notify" },
    { id: "reviews", label: "Reviews" },
    { id: "users", label: "Users" },
    { id: "coupons", label: "Coupons" },
    { id: "descriptive", label: "Descriptive" },
    { id: "appcontent", label: "App Content" },
  ];

  return (
    <div>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: "rgba(13,11,8,0.97)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ flex: 1, fontWeight: 800, fontSize: 16 }}>
          Selection <span style={{ color: GOLD }}>Lab</span>{" "}
          <span style={{ color: "#9a917f", fontWeight: 600, fontSize: 13 }}>Admin</span>
        </div>
        <button onClick={logout} style={ghostBtn}>
          Logout
        </button>
      </header>

      <nav
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          padding: "12px 16px 0",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...ghostBtn,
              flexShrink: 0,
              background: tab === t.id ? GOLD : "transparent",
              color: tab === t.id ? "#1a1a1a" : "#fff",
              borderColor: tab === t.id ? GOLD : BORDER,
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main style={{ padding: 16 }}>
        {tab === "dashboard" && <DashboardTab />}
        {tab === "courses" && <CoursesTab />}
        {tab === "questions" && <QuestionsTab />}
        {tab === "mocktests" && <MockTestsTab />}
        {tab === "qbank" && <QuestionBankTab />}
        {tab === "blog" && <BlogTab />}
        {tab === "banners" && <BannersTab />}
        {tab === "notifications" && <NotificationsTab />}
        {tab === "reviews" && <ReviewsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "coupons" && <CouponsTab />}
        {tab === "descriptive" && <DescriptiveAdmin api={api} />}
        {tab === "appcontent" && <AppContentAdmin api={api} />}
      </main>
    </div>
  );
}

// ── Dashboard tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [sales, setSales] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/admin/dashboard").then(setStats).catch((e) => setError(e.message));
    api("/admin-extra/sales").then(setSales).catch(() => {});
  }, []);

  if (error) return <ErrorBox msg={error} />;
  if (!stats) return <Muted>Loading stats...</Muted>;

  const t = sales?.totals;
  const items = [
    { label: "Total Users", value: stats.total_users },
    { label: "Total Revenue", value: `₹${t ? t.total_revenue : stats.total_revenue}` },
    { label: "Course Sales", value: t ? `${t.course_sales} (₹${t.course_revenue})` : "—" },
    { label: "Series Sales", value: t ? `${t.series_sales} (₹${t.series_revenue})` : "—" },
    { label: "Questions", value: stats.total_questions },
    { label: "Quiz Attempts", value: stats.total_attempts },
  ];

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {items.map((s) => (
          <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: GOLD }}>{s.value}</div>
            <div style={{ fontSize: 13, color: "#9a917f", marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 15, margin: "20px 0 10px" }}>🛒 Recent Purchases</h3>
      {!sales ? (
        <Muted>Loading purchases...</Muted>
      ) : sales.recent.length === 0 ? (
        <Muted>No purchases yet.</Muted>
      ) : (
        sales.recent.map((r: any, i: number) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>{r.type === "series" ? "📝" : "📚"}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.user_name || r.user_email || "Unknown"} → {r.item}
              </div>
              <div style={{ fontSize: 11, color: "#9a917f" }}>
                {r.at ? new Date(r.at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
              </div>
            </div>
            <b style={{ color: Number(r.amount) > 0 ? "#5dd97c" : "#9a917f", fontSize: 13.5 }}>
              {Number(r.amount) > 0 ? `₹${r.amount}` : "FREE"}
            </b>
          </div>
        ))
      )}
    </div>
  );
}

// ── Courses tab ──────────────────────────────────────────────────────────────
const emptyCourse = {
  title: "",
  description: "",
  thumbnail_url: "",
  price: 0,
  original_price: 0,
  course_type: "Paid Batch",
  features: "",
  validity_days: 365,
  whatsapp_support: "",
  recent_buyers: 0,
  is_featured: false,
  is_active: true,
};

function CoursesTab() {
  const [courses, setCourses] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [contentFor, setContentFor] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api("/admin-extra/courses")
      .then((d) => setCourses(d.courses || []))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const body = {
        ...editing,
        price: Number(editing.price) || 0,
        original_price: Number(editing.original_price) || null,
        validity_days: Number(editing.validity_days) || null,
        recent_buyers: Number(editing.recent_buyers) || 0,
      };
      const id = body.id;
      delete body.id;
      delete body.created_at;
      if (id) await api(`/admin-extra/courses/${id}`, "PUT", body);
      else await api("/admin-extra/courses", "POST", body);
      setEditing(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Deactivate this course?")) return;
    try {
      await api(`/admin-extra/courses/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (contentFor) {
    return <ContentManager course={contentFor} onBack={() => setContentFor(null)} />;
  }

  if (editing) {
    return (
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
        <h3 style={{ margin: "0 0 14px", fontSize: 17 }}>{editing.id ? "Edit course" : "Add course"}</h3>
        <Field label="Title">
          <input style={inputStyle} value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
        </Field>
        <Field label="Description">
          <textarea
            style={{ ...inputStyle, minHeight: 70 }}
            value={editing.description || ""}
            onChange={(e) => setEditing({ ...editing, description: e.target.value })}
          />
        </Field>
        <Field label="Thumbnail URL">
          <input
            style={inputStyle}
            placeholder="https://i.ibb.co/..."
            value={editing.thumbnail_url || ""}
            onChange={(e) => setEditing({ ...editing, thumbnail_url: e.target.value })}
          />
        </Field>
        {editing.thumbnail_url && (
          <img
            src={editing.thumbnail_url}
            alt="Preview"
            style={{ width: "100%", maxHeight: 140, objectFit: "cover", borderRadius: 10, marginBottom: 12 }}
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Price (₹)" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={editing.price} onChange={(e) => setEditing({ ...editing, price: e.target.value })} />
          </Field>
          <Field label="Original price (₹)" style={{ flex: 1 }}>
            <input
              type="number"
              style={inputStyle}
              value={editing.original_price || ""}
              onChange={(e) => setEditing({ ...editing, original_price: e.target.value })}
            />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Course type" style={{ flex: 1 }}>
            <input
              style={inputStyle}
              value={editing.course_type || ""}
              onChange={(e) => setEditing({ ...editing, course_type: e.target.value })}
            />
          </Field>
          <Field label="Validity (days)" style={{ flex: 1 }}>
            <input
              type="number"
              style={inputStyle}
              value={editing.validity_days || ""}
              onChange={(e) => setEditing({ ...editing, validity_days: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Features (comma separated)">
          <input style={inputStyle} value={editing.features || ""} onChange={(e) => setEditing({ ...editing, features: e.target.value })} />
        </Field>
        <Field label="WhatsApp support link">
          <input
            style={inputStyle}
            value={editing.whatsapp_support || ""}
            onChange={(e) => setEditing({ ...editing, whatsapp_support: e.target.value })}
          />
        </Field>
        <Field label='Recently purchased count (social proof — shows "🔥 X people recently purchased"; 0 = hidden)'>
          <input
            type="number"
            style={inputStyle}
            value={editing.recent_buyers ?? 0}
            onChange={(e) => setEditing({ ...editing, recent_buyers: e.target.value })}
          />
        </Field>
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "6px 0 14px", fontSize: 14 }}>
          <input
            type="checkbox"
            checked={!!editing.is_featured}
            onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })}
          />
          Featured (shows in homepage banner)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 16px", fontSize: 14 }}>
          <input
            type="checkbox"
            checked={editing.is_active !== false}
            onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })}
          />
          Active (visible in app and website)
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={save} disabled={saving} style={{ ...goldBtn, flex: 1 }}>
            {saving ? "Saving..." : "Save course"}
          </button>
          <button onClick={() => setEditing(null)} style={{ ...ghostBtn, flex: 1 }}>
            Cancel
          </button>
        </div>
        {error && <ErrorBox msg={error} />}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setEditing({ ...emptyCourse })} style={{ ...goldBtn, width: "100%", marginBottom: 14 }}>
        + Add course
      </button>
      {error && <ErrorBox msg={error} />}
      {courses.length === 0 && !error && <Muted>No courses yet.</Muted>}
      {courses.map((c) => (
        <div
          key={c.id}
          style={{
            display: "flex",
            gap: 12,
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: 12,
            marginBottom: 10,
            opacity: c.is_active === false ? 0.45 : 1,
          }}
        >
          {c.thumbnail_url ? (
            <img src={c.thumbnail_url} alt="" style={{ width: 74, height: 54, objectFit: "cover", borderRadius: 8 }} />
          ) : (
            <div style={{ width: 74, height: 54, borderRadius: 8, background: "#221d13", display: "flex", alignItems: "center", justifyContent: "center" }}>
              📘
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.title} {c.is_featured && <span style={{ color: GOLD }}>★</span>}
            </div>
            <div style={{ fontSize: 12.5, color: "#9a917f", marginTop: 2 }}>
              ₹{c.price} {c.is_active === false && "· inactive"}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button onClick={() => setEditing({ ...c })} style={smallBtn}>
                Edit
              </button>
              <button onClick={() => setContentFor(c)} style={{ ...smallBtn, color: GOLD, borderColor: BORDER }}>
                Content
              </button>
              <button onClick={() => remove(c.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Course content manager (videos / PDFs) ───────────────────────────────────
function ContentManager({ course, onBack }: { course: any; onBack: () => void }) {
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ title: "", content_type: "video", url: "", display_order: "0" });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  function load() {
    api(`/admin-extra/content/${course.id}`)
      .then((d) => setItems(d.content || []))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function uploadPdf(fileInput: HTMLInputElement) {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("PDF must be under 50 MB");
      return;
    }
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/admin-extra/upload-pdf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token()}` },
        body: fd,
      });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.detail || "Upload failed");
      // auto-fill url + title (if empty)
      setForm((f) => ({
        ...f,
        url: d.url,
        title: f.title || file.name.replace(/\.pdf$/i, ""),
      }));
    } catch (e: any) {
      setError(e.message);
    }
    setUploading(false);
    fileInput.value = "";
  }

  async function add() {
    if (!form.title.trim() || !form.url.trim()) {
      setError("Title and URL are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await api("/admin-extra/content", "POST", {
        course_id: course.id,
        title: form.title.trim(),
        content_type: form.content_type,
        url: form.url.trim(),
        display_order: Number(form.display_order) || 0,
        is_active: true,
      });
      setForm({ title: "", content_type: form.content_type, url: "", display_order: String(items.length + 1) });
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Remove this content item?")) return;
    try {
      await api(`/admin-extra/content/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      <button onClick={onBack} style={{ ...ghostBtn, marginBottom: 14 }}>
        ← Back to courses
      </button>
      <h3 style={{ margin: "0 0 4px", fontSize: 17 }}>{course.title}</h3>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#9a917f" }}>
        Course content — videos and PDFs shown to enrolled students.
      </p>

      {/* Add form */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <Field label="Title">
          <input
            style={inputStyle}
            placeholder="e.g. Lecture 1 — Introduction"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Type" style={{ flex: 1 }}>
            <select style={inputStyle} value={form.content_type} onChange={(e) => setForm({ ...form, content_type: e.target.value, url: "" })}>
              <option value="video">Video</option>
              <option value="pdf">PDF</option>
            </select>
          </Field>
          <Field label="Order" style={{ flex: 1 }}>
            <input
              type="number"
              style={inputStyle}
              value={form.display_order}
              onChange={(e) => setForm({ ...form, display_order: e.target.value })}
            />
          </Field>
        </div>

        {form.content_type === "video" ? (
          <Field label="YouTube link (unlisted)">
            <input
              style={inputStyle}
              placeholder="https://youtube.com/watch?v=..."
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
            />
          </Field>
        ) : (
          <Field label="PDF file (max 50 MB)">
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => uploadPdf(e.target)}
              disabled={uploading}
              style={{ ...inputStyle, padding: 10 }}
            />
            {uploading && <div style={{ fontSize: 12, color: GOLD, marginTop: 6 }}>Uploading PDF…</div>}
            {form.url && !uploading && (
              <div style={{ fontSize: 11.5, color: "#5dd97c", marginTop: 6, wordBreak: "break-all" }}>
                ✓ Uploaded — ready to add
              </div>
            )}
          </Field>
        )}

        <button onClick={add} disabled={saving || uploading || !form.url} style={{ ...goldBtn, width: "100%", opacity: saving || uploading || !form.url ? 0.5 : 1 }}>
          {saving ? "Adding..." : "+ Add content"}
        </button>
        {error && <ErrorBox msg={error} />}
      </div>

      {/* Content list */}
      {items.length === 0 && <Muted>No content added yet.</Muted>}
      {items.map((it) => (
        <div
          key={it.id}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            padding: 12,
            marginBottom: 8,
            opacity: it.is_active === false ? 0.45 : 1,
          }}
        >
          <span style={{ fontSize: 20 }}>{it.content_type === "pdf" ? "📄" : "🎬"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {it.title}
            </div>
            <div style={{ fontSize: 11.5, color: "#9a917f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              #{it.display_order} · {it.url}
            </div>
          </div>
          {it.is_active !== false && (
            <button onClick={() => remove(it.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
              Remove
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Questions tab (CSV bulk upload) ──────────────────────────────────────────
// CSV format (8 columns, header optional):
// Question, A, B, C, D, Answer (A/B/C/D), Explanation, Topic [, Question(Hi), A(Hi), B(Hi), C(Hi), D(Hi), Explanation(Hi)]
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

function QuestionsTab() {
  const [exams, setExams] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [examId, setExamId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<any[]>([]);
  const [parseErr, setParseErr] = useState("");
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/admin-extra/meta")
      .then((d) => {
        setExams(d.exams || []);
        setSubjects(d.subjects || []);
      })
      .catch((e) => setError(e.message));
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ""));
      parse(String(reader.result || ""));
    };
    reader.readAsText(f);
  }

  function parse(text?: string) {
    setParseErr("");
    setResult("");
    const rows = parseCSV(text ?? csvText);
    if (rows.length === 0) {
      setParsed([]);
      setParseErr("No rows found");
      return;
    }
    // Skip header row if first cell looks like a header
    const start = rows[0][0]?.trim().toLowerCase().startsWith("question") ? 1 : 0;
    const out: any[] = [];
    for (let i = start; i < rows.length; i++) {
      const r = rows[i].map((c) => c.trim());
      if (r.length < 6) {
        setParseErr(`Row ${i + 1}: expected 8 columns (Question, A, B, C, D, Answer, Explanation, Topic), got ${r.length}`);
        setParsed([]);
        return;
      }
      const ans = (r[5] || "").toUpperCase();
      if (!["A", "B", "C", "D"].includes(ans)) {
        setParseErr(`Row ${i + 1}: answer must be A, B, C or D (got "${r[5]}")`);
        setParsed([]);
        return;
      }
      out.push({
        question_en: r[0],
        option_a_en: r[1],
        option_b_en: r[2],
        option_c_en: r[3],
        option_d_en: r[4],
        correct_answer: ans,
        explanation_en: r[6] || null,
        topic: r[7] || null,
        question_hi: r[8] || null,
        option_a_hi: r[9] || null,
        option_b_hi: r[10] || null,
        option_c_hi: r[11] || null,
        option_d_hi: r[12] || null,
        explanation_hi: r[13] || null,
        section: r[14] || null,
      });
    }
    setParsed(out);
  }

  async function upload() {
    if (parsed.length === 0) return;
    setUploading(true);
    setError("");
    setResult("");
    try {
      const d = await api("/admin-extra/questions/bulk", "POST", {
        exam_id: examId ? Number(examId) : null,
        subject_id: subjectId ? Number(subjectId) : null,
        is_free: isFree,
        questions: parsed,
      });
      setResult(`✓ ${d.inserted} questions uploaded successfully`);
      setParsed([]);
      setCsvText("");
    } catch (e: any) {
      setError(e.message);
    }
    setUploading(false);
  }

  const filteredSubjects = examId ? subjects.filter((s) => String(s.exam_id) === examId) : subjects;

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Bulk upload questions (CSV)</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#9a917f", lineHeight: 1.6 }}>
          8 columns: Question, A, B, C, D, Answer (A/B/C/D), Explanation, Topic. Optional: +6 Hindi columns (Question, A, B, C, D, Explanation in Hindi), then column 15 = Section name (e.g. General Awareness) for multi-section mock tests.
          Header row optional. Exam/Subject below applies to all rows. Topics are auto-created under the
          selected subject. Same question pool is used for quiz and mock tests.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Exam" style={{ flex: 1 }}>
            <select style={inputStyle} value={examId} onChange={(e) => { setExamId(e.target.value); setSubjectId(""); }}>
              <option value="">— None —</option>
              {exams.map((x) => (
                <option key={x.id} value={x.id}>{x.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Subject" style={{ flex: 1 }}>
            <select style={inputStyle} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
              <option value="">— None —</option>
              {filteredSubjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", fontSize: 14 }}>
          <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
          Free questions (uncheck for paid-only)
        </label>

        <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ marginBottom: 12, fontSize: 13 }} />

        <textarea
          placeholder={'Or paste CSV here...\nWhat is 2+2?,2,3,4,5,C,Simple addition,Arithmetic'}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          style={{ ...inputStyle, minHeight: 120, fontFamily: "monospace", fontSize: 12.5 }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => parse()} style={{ ...ghostBtn, flex: 1 }}>
            Check CSV
          </button>
          <button
            onClick={upload}
            disabled={uploading || parsed.length === 0}
            style={{ ...goldBtn, flex: 1, opacity: uploading || parsed.length === 0 ? 0.5 : 1 }}
          >
            {uploading ? "Uploading..." : `Upload ${parsed.length || ""} questions`}
          </button>
        </div>

        {parseErr && <ErrorBox msg={parseErr} />}
        {parsed.length > 0 && !parseErr && (
          <p style={{ color: "#5dd97c", fontSize: 13, marginTop: 12 }}>
            ✓ {parsed.length} questions parsed. Preview of first: "{parsed[0].question_en.slice(0, 60)}..."
          </p>
        )}
        {result && <p style={{ color: "#5dd97c", fontSize: 14, marginTop: 12, fontWeight: 700 }}>{result}</p>}
        {error && <ErrorBox msg={error} />}
      </div>
    </div>
  );
}

// ── Mock Tests tab (series bundles + create test with CSV) ───────────────────
function MockTestsTab() {
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  // Series form
  const [sForm, setSForm] = useState({ title: "", description: "", price: "0", original_price: "0" });
  const [sSaving, setSSaving] = useState(false);

  // Test form
  const [tForm, setTForm] = useState({
    title: "",
    series_id: "",
    duration_minutes: "60",
    total_marks: "100",
    negative_marking: "0.5",
    pass_percentage: "35",
    is_free: false,
  });
  const [csvText, setCsvText] = useState("");
  const [parsed, setParsed] = useState<any[]>([]);
  const [parseErr, setParseErr] = useState("");
  const [tSaving, setTSaving] = useState(false);

  function load() {
    api("/admin-extra/series")
      .then((d) => setSeriesList(d.series || []))
      .catch((e) => setError(e.message));
    api("/admin-extra/mock-tests")
      .then((d) => setTests(d.mock_tests || []))
      .catch(() => {});
  }
  useEffect(load, []);

  async function createSeries() {
    if (!sForm.title.trim()) {
      setError("Series title is required");
      return;
    }
    setSSaving(true);
    setError("");
    setMsg("");
    try {
      await api("/admin-extra/series", "POST", {
        title: sForm.title.trim(),
        description: sForm.description.trim() || null,
        price: Number(sForm.price) || 0,
        original_price: Number(sForm.original_price) || 0,
      });
      setSForm({ title: "", description: "", price: "0", original_price: "0" });
      setMsg("✓ Series created");
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setSSaving(false);
  }

  async function removeSeries(id: number) {
    if (!confirm("Deactivate this series? Tests inside will stay but the bundle disappears from the site.")) return;
    try {
      await api(`/admin-extra/series/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function parse(text?: string) {
    setParseErr("");
    const rows = parseCSV(text ?? csvText);
    if (rows.length === 0) {
      setParsed([]);
      setParseErr("No rows found");
      return;
    }
    const start = rows[0][0]?.trim().toLowerCase().startsWith("question") ? 1 : 0;
    const out: any[] = [];
    for (let i = start; i < rows.length; i++) {
      const r = rows[i].map((c) => c.trim());
      if (r.length < 6) {
        setParseErr(`Row ${i + 1}: expected 8 columns, got ${r.length}`);
        setParsed([]);
        return;
      }
      const ans = (r[5] || "").toUpperCase();
      if (!["A", "B", "C", "D"].includes(ans)) {
        setParseErr(`Row ${i + 1}: answer must be A, B, C or D (got "${r[5]}")`);
        setParsed([]);
        return;
      }
      out.push({
        question_en: r[0],
        option_a_en: r[1],
        option_b_en: r[2],
        option_c_en: r[3],
        option_d_en: r[4],
        correct_answer: ans,
        explanation_en: r[6] || null,
        topic: r[7] || null,
        question_hi: r[8] || null,
        option_a_hi: r[9] || null,
        option_b_hi: r[10] || null,
        option_c_hi: r[11] || null,
        option_d_hi: r[12] || null,
        explanation_hi: r[13] || null,
        section: r[14] || null,
      });
    }
    setParsed(out);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ""));
      parse(String(reader.result || ""));
    };
    reader.readAsText(f);
  }

  async function createTest() {
    if (!tForm.title.trim()) {
      setError("Test title is required");
      return;
    }
    if (parsed.length === 0) {
      setError("Add questions CSV first (press Check CSV)");
      return;
    }
    setTSaving(true);
    setError("");
    setMsg("");
    try {
      const d = await api("/admin-extra/mock-tests/create-with-csv", "POST", {
        title: tForm.title.trim(),
        series_id: tForm.series_id ? Number(tForm.series_id) : null,
        duration_minutes: Number(tForm.duration_minutes) || 60,
        total_marks: Number(tForm.total_marks) || 100,
        negative_marking: Number(tForm.negative_marking) || 0,
        pass_percentage: Number(tForm.pass_percentage) || 0,
        is_free: tForm.is_free,
        questions: parsed,
      });
      setMsg(`✓ Test created with ${d.questions_added} questions`);
      setTForm({ ...tForm, title: "", is_free: false });
      setCsvText("");
      setParsed([]);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setTSaving(false);
  }

  async function removeTest(id: number) {
    if (!confirm("Deactivate this test?")) return;
    try {
      await api(`/admin-extra/mock-tests/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div>
      {msg && <p style={{ color: "#5dd97c", fontWeight: 700, fontSize: 14 }}>{msg}</p>}
      {error && <ErrorBox msg={error} />}

      {/* ── Series manager ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>1. Test Series (bundles)</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#9a917f", lineHeight: 1.6 }}>
          e.g. "SSC CGL Mock Tests" — students buy the series once and unlock all tests inside. Mark 2-3 tests
          FREE so everyone can try.
        </p>
        <Field label="Series title">
          <input style={inputStyle} placeholder="SSC CGL Mock Test Series 2026" value={sForm.title} onChange={(e) => setSForm({ ...sForm, title: e.target.value })} />
        </Field>
        <Field label="Description (optional)">
          <input style={inputStyle} placeholder="Latest pattern full-length tests" value={sForm.description} onChange={(e) => setSForm({ ...sForm, description: e.target.value })} />
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Price ₹" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={sForm.price} onChange={(e) => setSForm({ ...sForm, price: e.target.value })} />
          </Field>
          <Field label="Original ₹ (cut price)" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={sForm.original_price} onChange={(e) => setSForm({ ...sForm, original_price: e.target.value })} />
          </Field>
        </div>
        <button onClick={createSeries} disabled={sSaving} style={{ ...goldBtn, width: "100%" }}>
          {sSaving ? "Creating..." : "+ Create series"}
        </button>

        {seriesList.filter((s) => s.is_active !== false).map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 10, marginTop: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.title}</div>
              <div style={{ fontSize: 11.5, color: "#9a917f" }}>
                ID {s.id} · ₹{s.price} · {tests.filter((t) => t.series_id === s.id && t.is_active !== false).length} tests
              </div>
            </div>
            <button onClick={() => removeSeries(s.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
              Remove
            </button>
          </div>
        ))}
      </div>

      {/* ── Create test ── */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>2. Add a mock test (with CSV)</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#9a917f", lineHeight: 1.6 }}>
          Same 8-column CSV: Question, A, B, C, D, Answer, Explanation, Topic. Questions + test are created in
          one shot. Marks are split equally (total marks ÷ questions).
        </p>
        <Field label="Test title">
          <input style={inputStyle} placeholder="Full Mock Test 1" value={tForm.title} onChange={(e) => setTForm({ ...tForm, title: e.target.value })} />
        </Field>
        <Field label="Series (bundle)">
          <select style={inputStyle} value={tForm.series_id} onChange={(e) => setTForm({ ...tForm, series_id: e.target.value })}>
            <option value="">— No series (standalone) —</option>
            {seriesList.filter((s) => s.is_active !== false).map((s) => (
              <option key={s.id} value={s.id}>{s.title}</option>
            ))}
          </select>
        </Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Duration (min)" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={tForm.duration_minutes} onChange={(e) => setTForm({ ...tForm, duration_minutes: e.target.value })} />
          </Field>
          <Field label="Total marks" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={tForm.total_marks} onChange={(e) => setTForm({ ...tForm, total_marks: e.target.value })} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Negative marking" style={{ flex: 1 }}>
            <input type="number" step="0.25" style={inputStyle} value={tForm.negative_marking} onChange={(e) => setTForm({ ...tForm, negative_marking: e.target.value })} />
          </Field>
          <Field label="Pass %" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={tForm.pass_percentage} onChange={(e) => setTForm({ ...tForm, pass_percentage: e.target.value })} />
          </Field>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", fontSize: 14 }}>
          <input type="checkbox" checked={tForm.is_free} onChange={(e) => setTForm({ ...tForm, is_free: e.target.checked })} />
          FREE test (everyone can attempt — use for first 2-3 tests of a series)
        </label>

        <input type="file" accept=".csv,text/csv" onChange={handleFile} style={{ marginBottom: 12, fontSize: 13 }} />
        <textarea
          placeholder={"Or paste CSV here...\nWhat is 2+2?,2,3,4,5,C,Simple addition,Arithmetic"}
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          style={{ ...inputStyle, minHeight: 110, fontFamily: "monospace", fontSize: 12.5 }}
        />
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => parse()} style={{ ...ghostBtn, flex: 1 }}>
            Check CSV
          </button>
          <button onClick={createTest} disabled={tSaving || parsed.length === 0} style={{ ...goldBtn, flex: 1, opacity: tSaving || parsed.length === 0 ? 0.5 : 1 }}>
            {tSaving ? "Creating..." : `Create test (${parsed.length} Qs)`}
          </button>
        </div>
        {parseErr && <ErrorBox msg={parseErr} />}
        {parsed.length > 0 && !parseErr && (
          <p style={{ color: "#5dd97c", fontSize: 13, marginTop: 12 }}>✓ {parsed.length} questions parsed</p>
        )}
      </div>

      {/* ── Tests list ── */}
      <h3 style={{ fontSize: 15, margin: "0 0 10px" }}>All tests</h3>
      {tests.filter((t) => t.is_active !== false).length === 0 && <Muted>No tests yet.</Muted>}
      {tests.filter((t) => t.is_active !== false).map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>
              {t.title} {t.is_free && <span style={{ color: "#5dd97c", fontSize: 11, fontWeight: 800 }}>FREE</span>}
            </div>
            <div style={{ fontSize: 11.5, color: "#9a917f" }}>
              {seriesList.find((s) => s.id === t.series_id)?.title || "Standalone"} · {t.total_questions} Qs · {t.duration_minutes} min · {t.total_marks} marks
            </div>
          </div>
          <button onClick={() => removeTest(t.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}


// ── Blog tab ─────────────────────────────────────────────────────────────────
function BlogTab() {
  const [posts, setPosts] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api("/admin-extra/blog")
      .then((d) => setPosts(d.posts || []))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function save() {
    if (!editing.title?.trim() || !editing.content?.trim()) {
      setError("Title and content are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const body = {
        title: editing.title,
        slug: editing.slug || null,
        excerpt: editing.excerpt || null,
        content: editing.content,
        cover_url: editing.cover_url || null,
        is_published: editing.is_published !== false,
      };
      if (editing.id) await api(`/admin-extra/blog/${editing.id}`, "PUT", body);
      else await api("/admin-extra/blog", "POST", body);
      setEditing(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setSaving(false);
  }

  async function openEdit(id: number) {
    try {
      const d = await api(`/admin-extra/blog/${id}`);
      setEditing(d.post);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function remove(id: number) {
    if (!confirm("Delete this post permanently?")) return;
    try {
      await api(`/admin-extra/blog/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (editing) {
    return (
      <div>
        <button onClick={() => setEditing(null)} style={{ ...ghostBtn, marginBottom: 14 }}>
          ← Back
        </button>
        <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>{editing.id ? "Edit post" : "New post"}</h3>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 }}>
          <Field label="Title">
            <input style={inputStyle} value={editing.title || ""} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="SSC CGL 2026 Notification Out — Full Details" />
          </Field>
          <Field label="Slug (URL — blank = auto from title)">
            <input style={inputStyle} value={editing.slug || ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} placeholder="ssc-cgl-2026-notification" />
          </Field>
          <Field label="Excerpt (short summary shown in list + Google)">
            <input style={inputStyle} value={editing.excerpt || ""} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
          </Field>
          <Field label="Cover image URL (optional)">
            <input style={inputStyle} value={editing.cover_url || ""} onChange={(e) => setEditing({ ...editing, cover_url: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Content — blank line = paragraph · ## Heading · - bullet · [text](url) = link · link alone on a line = button">
            <textarea
              style={{ ...inputStyle, minHeight: 260, fontFamily: "inherit", lineHeight: 1.6 }}
              value={editing.content || ""}
              onChange={(e) => setEditing({ ...editing, content: e.target.value })}
              placeholder={"Intro paragraph...\n\n## Important Dates\n\nDetails here..."}
            />
          </Field>
          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 12px", fontSize: 14 }}>
            <input type="checkbox" checked={editing.is_published !== false} onChange={(e) => setEditing({ ...editing, is_published: e.target.checked })} />
            Published (uncheck = draft, hidden from site)
          </label>
          <button onClick={save} disabled={saving} style={{ ...goldBtn, width: "100%" }}>
            {saving ? "Saving..." : editing.id ? "Update post" : "Publish post"}
          </button>
          {error && <ErrorBox msg={error} />}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setEditing({ is_published: true })} style={{ ...goldBtn, width: "100%", marginBottom: 14 }}>
        + New blog post
      </button>
      {error && <ErrorBox msg={error} />}
      {posts.length === 0 && <Muted>No posts yet. SEO traffic starts with the first post!</Muted>}
      {posts.map((p) => (
        <div key={p.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5 }}>
            {p.title} {p.is_published === false && <span style={{ color: "#e0a030", fontSize: 11 }}>· DRAFT</span>}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--muted, #9a917f)", margin: "3px 0 8px" }}>/blog/{p.slug}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => openEdit(p.id)} style={smallBtn}>Edit</button>
            <a href={`/blog/${p.slug}`} target="_blank" style={{ ...smallBtn, textDecoration: "none", display: "inline-block" }}>View</a>
            <button onClick={() => remove(p.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}


// ── Banners tab ──────────────────────────────────────────────────────────────
function BannersTab() {
  const [banners, setBanners] = useState<any[]>([]);
  const [form, setForm] = useState({ image_url: "", title: "", link_url: "", display_order: "0" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api("/admin-extra/banners").then((d) => setBanners(d.banners || [])).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function add() {
    if (!form.image_url.trim()) { setError("Image URL required"); return; }
    setSaving(true); setError("");
    try {
      await api("/admin-extra/banners", "POST", {
        image_url: form.image_url.trim(),
        title: form.title.trim() || null,
        link_url: form.link_url.trim() || null,
        display_order: Number(form.display_order) || 0,
        is_active: true,
      });
      setForm({ image_url: "", title: "", link_url: "", display_order: String(banners.length + 1) });
      load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Delete this banner?")) return;
    try { await api(`/admin-extra/banners/${id}`, "DELETE"); load(); } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Add banner</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9a917f" }}>Shown on the app home screen and website hero area.</p>
        <Field label="Image URL"><input style={inputStyle} placeholder="https://..." value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} /></Field>
        <Field label="Title (optional)"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Link URL (optional)" style={{ flex: 2 }}><input style={inputStyle} placeholder="/course/1 or https://..." value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></Field>
          <Field label="Order" style={{ flex: 1 }}><input type="number" style={inputStyle} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></Field>
        </div>
        <button onClick={add} disabled={saving} style={{ ...goldBtn, width: "100%" }}>{saving ? "Adding..." : "+ Add banner"}</button>
        {error && <ErrorBox msg={error} />}
      </div>

      {banners.length === 0 && <Muted>No banners yet.</Muted>}
      {banners.map((b) => (
        <div key={b.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 10, marginBottom: 8, display: "flex", gap: 10, alignItems: "center" }}>
          <img src={b.image_url} alt="" style={{ width: 70, height: 44, objectFit: "cover", borderRadius: 6, flexShrink: 0, background: "#0000001a" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{b.title || "(no title)"}</div>
            <div style={{ fontSize: 11, color: "#9a917f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>#{b.display_order} · {b.link_url || "no link"}</div>
          </div>
          <button onClick={() => remove(b.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>Delete</button>
        </div>
      ))}
    </div>
  );
}

// ── Notifications tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const [list, setList] = useState<any[]>([]);
  const [form, setForm] = useState({ title: "", body: "", link_url: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api("/admin-extra/notifications").then((d) => setList(d.notifications || [])).catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function send() {
    if (!form.title.trim() || !form.body.trim()) { setError("Title and message required"); return; }
    setSaving(true); setError(""); setOk("");
    try {
      await api("/admin-extra/notifications", "POST", {
        title: form.title.trim(), body: form.body.trim(), link_url: form.link_url.trim() || null,
      });
      setOk("✓ Notification sent to all users");
      setForm({ title: "", body: "", link_url: "" });
      load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Delete this notification?")) return;
    try { await api(`/admin-extra/notifications/${id}`, "DELETE"); load(); } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Send notification to all users</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9a917f" }}>Appears in the app for every user (e.g. "New SSC CGL test series live!").</p>
        <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="New Mock Test Live!" /></Field>
        <Field label="Message"><textarea style={{ ...inputStyle, minHeight: 80 }} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></Field>
        <Field label="Link (optional)"><input style={inputStyle} value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="/mock-tests" /></Field>
        <button onClick={send} disabled={saving} style={{ ...goldBtn, width: "100%" }}>{saving ? "Sending..." : "📢 Send to all"}</button>
        {ok && <p style={{ color: "#5dd97c", fontSize: 13.5, marginTop: 10, fontWeight: 700 }}>{ok}</p>}
        {error && <ErrorBox msg={error} />}
      </div>

      <h3 style={{ fontSize: 14, margin: "0 0 8px" }}>Sent</h3>
      {list.length === 0 && <Muted>No notifications sent yet.</Muted>}
      {list.map((n) => (
        <div key={n.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{n.title}</div>
              <div style={{ fontSize: 12, color: "#9a917f", marginTop: 2 }}>{n.body}</div>
            </div>
            <button onClick={() => remove(n.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>Del</button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Question Bank tab (list / search / delete) ───────────────────────────────
function QuestionBankTab() {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState("");
  const LIMIT = 50;

  function load(off = 0, query = q) {
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String(off) });
    if (query) params.set("q", query);
    api(`/admin-extra/questions?${params.toString()}`)
      .then((d) => { setItems(d.questions || []); setTotal(d.total || 0); setOffset(off); })
      .catch((e) => setError(e.message));
  }
  useEffect(() => { load(0); }, []);

  async function remove(id: number) {
    if (!confirm("Delete this question? (also removed from any mock test)")) return;
    try { await api(`/admin-extra/questions/${id}`, "DELETE"); load(offset); } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input style={{ ...inputStyle, marginBottom: 0, flex: 1 }} placeholder="🔍 Search question text..." value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load(0)} />
        <button onClick={() => load(0)} style={{ ...goldBtn, padding: "12px 18px" }}>Search</button>
      </div>
      <p style={{ fontSize: 12, color: "#9a917f", margin: "0 0 10px" }}>{total} questions total</p>
      {error && <ErrorBox msg={error} />}
      {items.map((it) => (
        <div key={it.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8, opacity: it.is_active === false ? 0.5 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.5 }}>{it.question_en}</div>
              <div style={{ fontSize: 11, color: "#9a917f", marginTop: 4 }}>#{it.id} · Ans: {it.correct_answer} · {it.is_free ? "Free" : "Paid"}{it.is_active === false ? " · DELETED" : ""}</div>
            </div>
            {it.is_active !== false && (
              <button onClick={() => remove(it.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>Delete</button>
            )}
          </div>
        </div>
      ))}
      {total > LIMIT && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => load(Math.max(0, offset - LIMIT))} disabled={offset === 0} style={{ ...ghostBtn, flex: 1, opacity: offset === 0 ? 0.4 : 1 }}>← Prev</button>
          <button onClick={() => load(offset + LIMIT)} disabled={offset + LIMIT >= total} style={{ ...ghostBtn, flex: 1, opacity: offset + LIMIT >= total ? 0.4 : 1 }}>Next →</button>
        </div>
      )}
    </div>
  );
}

// ── Reviews tab ──────────────────────────────────────────────────────────────
function ReviewsTab() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [error, setError] = useState("");

  function load() {
    api("/admin-extra/reviews")
      .then((d) => setReviews(d.reviews || []))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function remove(id: number) {
    if (!confirm("Remove this review?")) return;
    try {
      await api(`/admin-extra/reviews/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (error) return <ErrorBox msg={error} />;
  if (reviews.length === 0) return <Muted>No reviews yet.</Muted>;

  return (
    <div>
      {reviews.map((r) => (
        <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12, marginBottom: 10, opacity: r.is_active === false ? 0.45 : 1 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.user_name || `User #${r.user_id}`}</div>
            <div style={{ color: GOLD, fontWeight: 800 }}>{"★".repeat(r.rating)}<span style={{ color: "#4a4436" }}>{"★".repeat(5 - r.rating)}</span></div>
          </div>
          <div style={{ fontSize: 12, color: "#9a917f", marginTop: 2 }}>Course #{r.course_id}</div>
          {r.review && <p style={{ fontSize: 13.5, margin: "8px 0 0", color: "#e0dacb" }}>{r.review}</p>}
          {r.is_active !== false && (
            <button onClick={() => remove(r.id)} style={{ ...smallBtn, marginTop: 10, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
              Remove
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Users tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState<any | null>(null);
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [grant, setGrant] = useState({ course_id: "", days: "365" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    api("/admin/users")
      .then((d) => setUsers(d.users || []))
      .catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
    api("/admin-extra/courses").then((d) => setAllCourses(d.courses || [])).catch(() => {});
  }, []);

  async function openDetail(id: number) {
    setError("");
    try {
      const d = await api(`/admin-extra/users/${id}/details`);
      setDetail(d);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function setBan(id: number, ban: boolean) {
    try {
      await api(`/admin/users/${id}/${ban ? "ban" : "unban"}`, "POST");
      load();
      if (detail) openDetail(id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function grantCourse() {
    if (!grant.course_id || !detail) return;
    setBusy(true);
    try {
      await api(`/admin-extra/users/${detail.user.id}/grant-course`, "POST", {
        course_id: Number(grant.course_id),
        days: Number(grant.days) || 365,
      });
      openDetail(detail.user.id);
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function revokeCourse(courseId: number) {
    if (!detail || !confirm("Remove this course access?")) return;
    try {
      await api(`/admin-extra/users/${detail.user.id}/revoke-course/${courseId}`, "DELETE");
      openDetail(detail.user.id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  // ── Detail view ──
  if (detail) {
    const u = detail.user;
    return (
      <div>
        <button onClick={() => setDetail(null)} style={{ ...ghostBtn, marginBottom: 14 }}>
          ← All users
        </button>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>
                {u.name || "Unnamed"} {u.is_banned && <span style={{ color: "#ff6b6b", fontSize: 12 }}>BANNED</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "#9a917f", marginTop: 4, lineHeight: 1.8 }}>
                📧 {u.email || "—"}<br />
                📱 {u.phone || "—"}<br />
                🆔 #{u.id} · {u.points ?? 0} pts<br />
                📅 Joined {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
              </div>
            </div>
            <button
              onClick={() => setBan(u.id, !u.is_banned)}
              style={{ ...smallBtn, color: u.is_banned ? "#5dd97c" : "#ff6b6b", borderColor: u.is_banned ? "rgba(93,217,124,0.4)" : "rgba(255,107,107,0.4)" }}
            >
              {u.is_banned ? "Unban" : "Ban"}
            </button>
          </div>
        </div>

        {/* Purchases */}
        <h3 style={{ fontSize: 14.5, margin: "0 0 8px" }}>📚 Courses ({detail.courses.length})</h3>
        {detail.courses.length === 0 && <Muted>No courses.</Muted>}
        {detail.courses.map((c: any) => (
          <div key={c.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8, opacity: c.is_active === false ? 0.5 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{c.title} {c.is_active === false && <span style={{ fontSize: 10.5, color: "#ff6b6b" }}>REVOKED</span>}</div>
                <div style={{ fontSize: 11, color: "#9a917f" }}>
                  ₹{c.amount_paid ?? 0}{c.payment_id === "ADMIN_GRANT" ? " · granted by admin" : ""} · {c.purchased_at ? new Date(c.purchased_at).toLocaleDateString("en-IN") : ""}
                  {c.expires_at ? ` · expires ${new Date(c.expires_at).toLocaleDateString("en-IN")}` : ""}
                </div>
              </div>
              {c.is_active !== false && (
                <button onClick={() => revokeCourse(c.course_id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))}

        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>📝 Mock Series ({detail.series.length})</h3>
        {detail.series.length === 0 && <Muted>No series purchases.</Muted>}
        {detail.series.map((s: any, i: number) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</div>
            <div style={{ fontSize: 11, color: "#9a917f" }}>
              ₹{s.amount_paid ?? 0} · {s.purchased_at ? new Date(s.purchased_at).toLocaleDateString("en-IN") : ""}
            </div>
          </div>
        ))}

        {/* Grant course */}
        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>🎁 Grant course access</h3>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <select style={{ ...inputStyle, marginBottom: 0, flex: 2 }} value={grant.course_id} onChange={(e) => setGrant({ ...grant, course_id: e.target.value })}>
              <option value="">Select course...</option>
              {allCourses.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <input type="number" placeholder="Days" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} />
          </div>
          <button onClick={grantCourse} disabled={busy || !grant.course_id} style={{ ...goldBtn, width: "100%", marginTop: 10, opacity: busy || !grant.course_id ? 0.5 : 1 }}>
            {busy ? "Granting..." : "Grant access"}
          </button>
          <p style={{ fontSize: 11, color: "#9a917f", margin: "8px 0 0" }}>Use for payment disputes, offline payments or gifts. Shows as ₹0 "granted by admin".</p>
        </div>

        {/* Recent attempts */}
        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>📊 Recent attempts</h3>
        {(!detail.recent_attempts || detail.recent_attempts.length === 0) && <Muted>No attempts yet.</Muted>}
        {(detail.recent_attempts || []).map((a: any) => (
          <div key={a.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "9px 12px", marginBottom: 6, fontSize: 12.5 }}>
            <b style={{ textTransform: "capitalize" }}>{a.mode}</b> · Score {a.score}{a.total_marks ? `/${a.total_marks}` : ""} · ✓{a.correct} ✗{a.wrong}
            <span style={{ color: "#9a917f" }}> · {a.ended_at ? new Date(a.ended_at).toLocaleDateString("en-IN") : ""}</span>
          </div>
        ))}
        {error && <ErrorBox msg={error} />}
      </div>
    );
  }

  // ── List view ──
  const shown = users.filter((u) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return (u.name || "").toLowerCase().includes(s) || (u.email || "").toLowerCase().includes(s) || String(u.phone || "").includes(s) || String(u.id) === s;
  });

  if (error && users.length === 0) return <ErrorBox msg={error} />;
  if (users.length === 0) return <Muted>Loading users...</Muted>;

  return (
    <div>
      <input
        placeholder="🔍 Search name, email, phone or ID..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        style={{ ...inputStyle, marginBottom: 12 }}
      />
      <p style={{ fontSize: 12, color: "#9a917f", margin: "0 0 10px" }}>{shown.length} of {users.length} users</p>
      {shown.map((u) => (
        <div key={u.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {u.name || "Unnamed"} {u.is_banned && <span style={{ color: "#ff6b6b", fontSize: 12 }}>BANNED</span>}
              </div>
              <div style={{ fontSize: 12, color: "#9a917f", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email || u.phone || `#${u.id}`} · {u.points ?? 0} pts</div>
            </div>
            <button onClick={() => openDetail(u.id)} style={{ ...smallBtn, color: GOLD }}>
              Details
            </button>
            <button
              onClick={() => setBan(u.id, !u.is_banned)}
              style={{ ...smallBtn, color: u.is_banned ? "#5dd97c" : "#ff6b6b", borderColor: u.is_banned ? "rgba(93,217,124,0.4)" : "rgba(255,107,107,0.4)" }}
            >
              {u.is_banned ? "Unban" : "Ban"}
            </button>
          </div>
        </div>
      ))}
      {error && <ErrorBox msg={error} />}
    </div>
  );
}

// ── Coupons tab ──────────────────────────────────────────────────────────────
function CouponsTab() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [pub, setPub] = useState({ code: "", discount_type: "percent", discount_value: "", scope_type: "all", scope_id: "" });
  const [gen, setGen] = useState({ count: "10", prefix: "SL", discount_type: "percent", discount_value: "", scope_type: "all", scope_id: "" });
  const [generated, setGenerated] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);

  function load() {
    api("/admin/coupons")
      .then((d) => setCoupons(d.coupons || []))
      .catch((e) => setError(e.message));
    api("/admin-extra/coupons/report").then(setReport).catch(() => {});
  }
  useEffect(load, []);

  async function createPublic() {
    if (!pub.code || !pub.discount_value) return;
    setBusy(true);
    setError("");
    try {
      await api("/admin-extra/coupons/public", "POST", {
        code: pub.code,
        discount_type: pub.discount_type,
        discount_value: Number(pub.discount_value),
        is_public: true,
        scope_type: pub.scope_type,
        scope_id: pub.scope_type === "all" ? null : pub.scope_id,
      });
      setPub({ code: "", discount_type: "percent", discount_value: "", scope_type: "all", scope_id: "" });
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function generate() {
    if (!gen.discount_value) return;
    setBusy(true);
    setError("");
    setGenerated([]);
    try {
      const d = await api("/admin-extra/coupons/generate", "POST", {
        count: Number(gen.count) || 10,
        prefix: gen.prefix || "SL",
        discount_type: gen.discount_type,
        discount_value: Number(gen.discount_value),
        scope_type: gen.scope_type,
        scope_id: gen.scope_type === "all" ? null : gen.scope_id,
      });
      setGenerated(d.codes || []);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function remove(id: number) {
    if (!confirm("Deactivate this coupon?")) return;
    try {
      await api(`/admin/coupons/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  function copyAll() {
    navigator.clipboard?.writeText(generated.join("\n"));
  }

  return (
    <div>
      {report && report.report.length > 0 && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>📈 Coupon usage ({report.total_redemptions} total redemptions)</h3>
          <div style={{ marginTop: 8 }}>
            {report.report.slice(0, 20).map((r: any) => (
              <div key={r.code} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(128,128,128,0.15)", fontSize: 12.5 }}>
                <span><b style={{ color: GOLD }}>{r.code}</b> <span style={{ color: "#9a917f" }}>({r.discount_type === "percent" ? `${r.discount_value}%` : `₹${r.discount_value}`}{r.is_active === false ? " · inactive" : ""})</span></span>
                <b>{r.times_used} used</b>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Universal (public) coupon */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Universal coupon</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#9a917f" }}>
          Shows automatically on course pages for everyone.
        </p>
        <input style={inputStyle} placeholder="Code (e.g. NIKKI50)" value={pub.code} onChange={(e) => setPub({ ...pub, code: e.target.value })} />
        <div style={{ display: "flex", gap: 10 }}>
          <select style={{ ...inputStyle, flex: 1 }} value={pub.discount_type} onChange={(e) => setPub({ ...pub, discount_type: e.target.value })}>
            <option value="percent">Percent (%)</option>
            <option value="flat">Flat (₹)</option>
          </select>
          <input
            type="number"
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Value"
            value={pub.discount_value}
            onChange={(e) => setPub({ ...pub, discount_value: e.target.value })}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select style={{ ...inputStyle, flex: 1 }} value={pub.scope_type} onChange={(e) => setPub({ ...pub, scope_type: e.target.value, scope_id: "" })}>
            <option value="all">All products</option>
            <option value="course">Specific Course</option>
            <option value="mock">Specific Mock Series</option>
            <option value="descriptive">Specific Descriptive Series</option>
          </select>
          {pub.scope_type !== "all" && (
            <input
              type="number"
              style={{ ...inputStyle, flex: 1 }}
              placeholder={`${pub.scope_type} ID`}
              value={pub.scope_id}
              onChange={(e) => setPub({ ...pub, scope_id: e.target.value })}
            />
          )}
        </div>
        <button onClick={createPublic} disabled={busy} style={{ ...goldBtn, width: "100%" }}>
          + Create universal coupon
        </button>
      </div>

      {/* Unique single-use generator */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Generate unique coupons</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#9a917f" }}>
          Random one-time codes — each works only once.
        </p>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="How many" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={gen.count} onChange={(e) => setGen({ ...gen, count: e.target.value })} />
          </Field>
          <Field label="Prefix" style={{ flex: 1 }}>
            <input style={inputStyle} value={gen.prefix} onChange={(e) => setGen({ ...gen, prefix: e.target.value })} />
          </Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select style={{ ...inputStyle, flex: 1 }} value={gen.discount_type} onChange={(e) => setGen({ ...gen, discount_type: e.target.value })}>
            <option value="percent">Percent (%)</option>
            <option value="flat">Flat (₹)</option>
          </select>
          <input
            type="number"
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Value"
            value={gen.discount_value}
            onChange={(e) => setGen({ ...gen, discount_value: e.target.value })}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <select style={{ ...inputStyle, flex: 1 }} value={gen.scope_type} onChange={(e) => setGen({ ...gen, scope_type: e.target.value, scope_id: "" })}>
            <option value="all">All products</option>
            <option value="course">Specific Course</option>
            <option value="mock">Specific Mock Series</option>
            <option value="descriptive">Specific Descriptive Series</option>
          </select>
          {gen.scope_type !== "all" && (
            <input
              type="number"
              style={{ ...inputStyle, flex: 1 }}
              placeholder={`${gen.scope_type} ID`}
              value={gen.scope_id}
              onChange={(e) => setGen({ ...gen, scope_id: e.target.value })}
            />
          )}
        </div>
        <button onClick={generate} disabled={busy} style={{ ...goldBtn, width: "100%" }}>
          {busy ? "Generating..." : "Generate codes"}
        </button>
        {generated.length > 0 && (
          <div style={{ marginTop: 12, background: "rgba(0,0,0,0.4)", borderRadius: 10, padding: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12.5, color: "#9a917f" }}>{generated.length} codes created</span>
              <button onClick={copyAll} style={smallBtn}>Copy all</button>
            </div>
            <div style={{ fontFamily: "monospace", fontSize: 13, lineHeight: 1.7, maxHeight: 180, overflowY: "auto" }}>
              {generated.map((c) => (
                <div key={c}>{c}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <ErrorBox msg={error} />}

      {/* Coupon list */}
      {coupons.map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12, marginBottom: 10, opacity: c.is_active === false ? 0.45 : 1 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: 1 }}>
              {c.code}{" "}
              {c.is_public && <span style={{ fontSize: 10, color: "#5dd97c", border: "1px solid rgba(93,217,124,0.4)", borderRadius: 6, padding: "1px 6px", marginLeft: 4 }}>PUBLIC</span>}
              {c.is_single_use && <span style={{ fontSize: 10, color: GOLD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "1px 6px", marginLeft: 4 }}>{(c.used_count || 0) > 0 ? "USED" : "1-TIME"}</span>}
            </div>
            <div style={{ fontSize: 12, color: "#9a917f" }}>
              {c.discount_type === "percent" ? `${c.discount_value}% off` : `₹${c.discount_value} off`}
            </div>
          </div>
          {c.is_active !== false && (
            <button onClick={() => remove(c.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
              Delete
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
// ── Shared UI ────────────────────────────────────────────────────────────────
function Field({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ marginBottom: 2, ...style }}>
      <div style={{ fontSize: 12.5, color: "#9a917f", marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "#8d8371", fontSize: 14 }}>{children}</p>;
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <p style={{ color: "#ff6b6b", fontSize: 13, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.3)", borderRadius: 10, padding: "10px 12px", marginTop: 12 }}>
      {msg}
    </p>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
  fontSize: 14,
  marginBottom: 12,
  boxSizing: "border-box",
};

const goldBtn: React.CSSProperties = {
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const smallBtn: React.CSSProperties = {
  background: "transparent",
  color: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 8,
  padding: "6px 12px",
  fontWeight: 700,
  fontSize: 12,
  cursor: "pointer",
};
