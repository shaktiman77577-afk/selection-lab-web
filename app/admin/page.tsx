"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";

const GOLD = "#FFAB00";
const BG = "#0d0b08";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const TOKEN_KEY = "sl_admin_token";

type Tab = "dashboard" | "courses" | "reviews" | "users" | "coupons";

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
    { id: "reviews", label: "Reviews" },
    { id: "users", label: "Users" },
    { id: "coupons", label: "Coupons" },
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
        {tab === "reviews" && <ReviewsTab />}
        {tab === "users" && <UsersTab />}
        {tab === "coupons" && <CouponsTab />}
      </main>
    </div>
  );
}

// ── Dashboard tab ────────────────────────────────────────────────────────────
function DashboardTab() {
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/admin/dashboard")
      .then(setStats)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorBox msg={error} />;
  if (!stats) return <Muted>Loading stats...</Muted>;

  const items = [
    { label: "Total Users", value: stats.total_users },
    { label: "Revenue", value: `₹${stats.total_revenue}` },
    { label: "Questions", value: stats.total_questions },
    { label: "Quiz Attempts", value: stats.total_attempts },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
      {items.map((s) => (
        <div key={s.label} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: GOLD }}>{s.value}</div>
          <div style={{ fontSize: 13, color: "#9a917f", marginTop: 4 }}>{s.label}</div>
        </div>
      ))}
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
  is_featured: false,
  is_active: true,
};

function CoursesTab() {
  const [courses, setCourses] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
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
  const [error, setError] = useState("");

  function load() {
    api("/admin/users")
      .then((d) => setUsers(d.users || []))
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);

  async function setBan(id: number, ban: boolean) {
    try {
      await api(`/admin/users/${id}/${ban ? "ban" : "unban"}`, "POST");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (error) return <ErrorBox msg={error} />;
  if (users.length === 0) return <Muted>Loading users...</Muted>;

  return (
    <div>
      {users.map((u) => (
        <div key={u.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>
                {u.name || "Unnamed"} {u.is_banned && <span style={{ color: "#ff6b6b", fontSize: 12 }}>BANNED</span>}
              </div>
              <div style={{ fontSize: 12, color: "#9a917f" }}>{u.email || u.phone || `#${u.id}`} · {u.points ?? 0} pts</div>
            </div>
            <button
              onClick={() => setBan(u.id, !u.is_banned)}
              style={{ ...smallBtn, color: u.is_banned ? "#5dd97c" : "#ff6b6b", borderColor: u.is_banned ? "rgba(93,217,124,0.4)" : "rgba(255,107,107,0.4)" }}
            >
              {u.is_banned ? "Unban" : "Ban"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Coupons tab ──────────────────────────────────────────────────────────────
function CouponsTab() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [pub, setPub] = useState({ code: "", discount_type: "percent", discount_value: "" });
  const [gen, setGen] = useState({ count: "10", prefix: "SL", discount_type: "percent", discount_value: "" });
  const [generated, setGenerated] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  function load() {
    api("/admin/coupons")
      .then((d) => setCoupons(d.coupons || []))
      .catch((e) => setError(e.message));
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
      });
      setPub({ code: "", discount_type: "percent", discount_value: "" });
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
