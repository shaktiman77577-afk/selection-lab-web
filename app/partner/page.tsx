"use client";

/**
 * app/partner/page.tsx — Collaborator ka apna portal.
 *
 * Teen halat, ek hi route par:
 *   1. login nahi hai         -> Login ya Apply
 *   2. login hai, pending     -> "Application under review"
 *   3. login hai, active      -> poora dashboard
 *
 * Poora English. Ye students ka page nahi hai — YouTubers aur channel walon
 * ke liye hai, aur unke liye ek saaf professional dashboard chahiye.
 *
 * Token alag key me rakha hai (sl_partner_token). Student ka login aur
 * partner ka login ek doosre me nahi ghusna chahiye.
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";
const GREEN = "#2e8b4a";
const RED = "#c0392b";
const KEY = "sl_partner_token";

type View = "login" | "apply" | "dash";

export default function PartnerPage() {
  const [token, setToken] = useState<string | null>(null);
  const [view, setView] = useState<View>("login");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const t = localStorage.getItem(KEY);
      if (t) { setToken(t); setView("dash"); }
    } catch {}
    setReady(true);
  }, []);

  function onAuth(t: string) {
    try { localStorage.setItem(KEY, t); } catch {}
    setToken(t);
    setView("dash");
  }

  function logout() {
    try { localStorage.removeItem(KEY); } catch {}
    setToken(null);
    setView("login");
  }

  if (!ready) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header
        style={{
          position: "sticky", top: 0, zIndex: 40, display: "flex", alignItems: "center",
          gap: 10, padding: "12px 16px", background: "var(--header)",
          backdropFilter: "blur(8px)", borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>
          Selection Lab <span style={{ color: GOLD }}>Partners</span>
        </div>
        {token && (
          <button onClick={logout} style={{ ...ghost, padding: "7px 13px", fontSize: 12.5 }}>
            Log out
          </button>
        )}
      </header>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "18px 16px 48px" }}>
        {token && view === "dash" ? (
          <Dashboard token={token} onExpired={logout} />
        ) : view === "apply" ? (
          <Apply onAuth={onAuth} onBack={() => setView("login")} />
        ) : (
          <Login onAuth={onAuth} onApply={() => setView("apply")} />
        )}
      </main>
    </div>
  );
}

// ===========================================================================
// LOGIN
// ===========================================================================
function Login({ onAuth, onApply }: { onAuth: (t: string) => void; onApply: () => void }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`${API_URL}/partner/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Could not log in");
      onAuth(d.token);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <>
      <Hero />
      <div style={card}>
        <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800 }}>Partner login</h2>
        <Field label="Email">
          <input style={input} value={form.email} autoComplete="email"
                 onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </Field>
        <Field label="Password">
          <input style={input} type="password" value={form.password} autoComplete="current-password"
                 onKeyDown={(e) => e.key === "Enter" && submit()}
                 onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </Field>
        {err && <Err>{err}</Err>}
        <button onClick={submit} disabled={busy} style={{ ...gold, width: "100%" }}>
          {busy ? "Signing in…" : "Log in"}
        </button>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 13.5, color: "var(--muted)" }}>
          New here?{" "}
          <button onClick={onApply} style={linkBtn}>Become a partner</button>
        </div>
      </div>
    </>
  );
}

function Hero() {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${NAVY}, #2c4a85)`, borderRadius: 18,
        padding: "24px 22px", color: "#fff", marginBottom: 16, position: "relative", overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", right: -30, top: -30, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,171,0,0.15)" }} />
      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>
        Earn from what you already teach
      </h1>
      <p style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.65, color: "rgba(255,255,255,0.85)", maxWidth: 470 }}>
        Share a coupon code with your audience. They get a discount, you get a share of every
        sale it brings. No limit on how many students you refer.
      </p>
    </div>
  );
}

// ===========================================================================
// APPLY
// ===========================================================================
function Apply({ onAuth, onBack }: { onAuth: (t: string) => void; onBack: () => void }) {
  const [f, setF] = useState({
    name: "", email: "", phone: "", platform: "youtube",
    channel_url: "", subscribers: "", about: "", password: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    setBusy(true); setErr("");
    try {
      const r = await fetch(`${API_URL}/partner/apply`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, subscribers: Number(f.subscribers) || 0 }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Could not submit");
      onAuth(d.token);
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <>
      <Hero />
      <div style={card}>
        <button onClick={onBack} style={{ ...linkBtn, marginBottom: 12 }}>← Back to login</button>
        <h2 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800 }}>Become a partner</h2>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
          Fill this in and we will review it. Once approved you get your own coupon code and
          your dashboard starts showing sales.
        </p>

        <Field label="Your name">
          <input style={input} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        </Field>

        <Row>
          <Field label="Email">
            <input style={input} value={f.email} autoComplete="email"
                   onChange={(e) => setF({ ...f, email: e.target.value })} />
          </Field>
          <Field label="Mobile number">
            <input style={input} value={f.phone} inputMode="numeric"
                   onChange={(e) => setF({ ...f, phone: e.target.value })} />
          </Field>
        </Row>

        <Row>
          <Field label="Platform">
            <select style={input} value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}>
              <option value="youtube">YouTube</option>
              <option value="telegram">Telegram</option>
              <option value="instagram">Instagram</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Subscribers / members">
            <input style={input} value={f.subscribers} inputMode="numeric" placeholder="e.g. 12000"
                   onChange={(e) => setF({ ...f, subscribers: e.target.value })} />
          </Field>
        </Row>

        <Field label="Channel link" hint="Paste the full link, starting with https://">
          <input style={input} value={f.channel_url} placeholder="https://youtube.com/@yourchannel"
                 onChange={(e) => setF({ ...f, channel_url: e.target.value })} />
        </Field>

        <Field label="About your audience" hint="Which exams do they prepare for? This helps us set the right commission.">
          <textarea rows={4} style={{ ...input, lineHeight: 1.6 }} value={f.about}
                    onChange={(e) => setF({ ...f, about: e.target.value })} />
        </Field>

        <Field label="Password" hint="At least 6 characters. You will use this to log in.">
          <input style={input} type="password" value={f.password} autoComplete="new-password"
                 onChange={(e) => setF({ ...f, password: e.target.value })} />
        </Field>

        {err && <Err>{err}</Err>}
        <button onClick={submit} disabled={busy} style={{ ...gold, width: "100%" }}>
          {busy ? "Submitting…" : "Submit application"}
        </button>
      </div>
    </>
  );
}

// ===========================================================================
// DASHBOARD
// ===========================================================================
function Dashboard({ token, onExpired }: { token: string; onExpired: () => void }) {
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<"sales" | "payouts" | "requests">("sales");
  const [err, setErr] = useState("");

  const api = useCallback(async (path: string, method = "GET", body?: any) => {
    const r = await fetch(`${API_URL}/partner${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const d = await r.json().catch(() => ({}));
    if (r.status === 401 || r.status === 403) { onExpired(); throw new Error(d.detail || "Session ended"); }
    if (!r.ok) throw new Error(d.detail || "Something went wrong");
    return d;
  }, [token, onExpired]);

  const load = useCallback(() => {
    api("/me").then(setData).catch((e) => setErr(e.message));
  }, [api]);

  useEffect(load, [load]);

  if (err) return <Err>{err}</Err>;
  if (!data) return <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>;

  const p = data.profile || {};
  if (p.status === "pending") return <Pending name={p.name} />;

  const s = data.stats || {};
  const coupon = (data.coupons || [])[0];

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>Welcome back</div>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{p.name}</div>
      </div>

      {coupon && <CouponCard coupon={coupon} profile={p} api={api} onSaved={load} />}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
        <Stat label="Sales" value={String(s.sales ?? 0)} />
        <Stat label="Total earned" value={`₹${(s.earned ?? 0).toLocaleString("en-IN")}`} />
        <Stat label="Paid out" value={`₹${(s.paid ?? 0).toLocaleString("en-IN")}`} />
        <Stat label="Available" value={`₹${(s.available ?? 0).toLocaleString("en-IN")}`} gold />
      </div>

      <MonthCard s={s} />
      <Withdraw s={s} min={data.min_payout} upi={p.upi_id} api={api} onDone={load} />

      <div style={{ display: "flex", gap: 6, margin: "22px 0 14px", flexWrap: "wrap" }}>
        {([["sales", "Sales"], ["payouts", "Payouts"], ["requests", "Content requests"]] as const).map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: "8px 14px", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer",
              border: `1px solid ${tab === k ? GOLD : "var(--line)"}`,
              background: tab === k ? GOLD : "transparent",
              color: tab === k ? "#1a1a1a" : "var(--text)",
            }}
          >
            {l}
          </button>
        ))}
      </div>

      {tab === "sales" && <Sales rows={data.sales || []} />}
      {tab === "payouts" && <Payouts api={api} />}
      {tab === "requests" && <Requests api={api} />}
    </>
  );
}

function Pending({ name }: { name?: string }) {
  return (
    <div style={{ ...card, textAlign: "center" }}>
      <div style={{ fontSize: 38 }}>⏳</div>
      <h2 style={{ margin: "10px 0 6px", fontSize: 18, fontWeight: 800 }}>Application under review</h2>
      <p style={{ margin: 0, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.7 }}>
        Thanks{name ? `, ${name}` : ""}. We are looking at your application. You will get an
        email with your coupon code and commission as soon as it is approved, and this page
        will start showing your sales.
      </p>
    </div>
  );
}

// ── Coupon + discount slider ────────────────────────────────────────────────
function CouponCard({ coupon, profile, api, onSaved }: any) {
  const cap = Number(profile.max_discount_percent || 0);
  const pct = Number(profile.commission_percent || 0);
  const [val, setVal] = useState(Number(coupon.discount_value || 0));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const percent = (coupon.discount_type || "percent") === "percent";

  // ₹499 par misaal — student ko kitna lagega aur aapko kitna milega
  const price = 499;
  const paid = Math.round(price * (1 - val / 100));
  const earn = Math.round(paid * pct / 100);

  async function save() {
    setBusy(true); setMsg("");
    try {
      await api("/discount", "POST", { code: coupon.code, discount_value: val });
      setMsg("Saved");
      onSaved();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <div style={{ ...card, marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--muted)", letterSpacing: 0.6, textTransform: "uppercase" }}>
        Your coupon code
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
        <div style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1.5, fontFamily: "monospace", color: GOLD }}>
          {coupon.code}
        </div>
        <button
          onClick={() => { navigator.clipboard?.writeText(coupon.code); }}
          style={{ ...ghost, padding: "7px 13px", fontSize: 12.5 }}
        >
          Copy
        </button>
      </div>

      <div style={{ fontSize: 13.5, marginTop: 10, lineHeight: 1.7 }}>
        Your audience gets <b style={{ color: GREEN }}>{val}% off</b> · You earn{" "}
        <b style={{ color: GOLD }}>{pct}%</b> of what they pay
      </div>

      {percent && cap > 0 && (
        <div style={{ marginTop: 16, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>
            Choose your discount — up to {cap}%
          </div>
          <input
            type="range" min={0} max={cap} step={1} value={val}
            onChange={(e) => setVal(Number(e.target.value))}
            style={{ width: "100%", accentColor: GOLD }}
          />
          <div
            style={{
              background: "var(--chip)", borderRadius: 10, padding: 12, marginTop: 10,
              fontSize: 12.5, lineHeight: 1.8,
            }}
          >
            On a ₹{price} course at <b>{val}%</b> off, the student pays{" "}
            <b>₹{paid}</b> and you earn <b style={{ color: GOLD }}>₹{earn}</b>.
            <div style={{ color: "var(--muted)", marginTop: 4 }}>
              A bigger discount means a smaller sale, so your own share drops too. Most partners
              settle around 15 to 20%.
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
            <button onClick={save} disabled={busy || val === Number(coupon.discount_value)} style={gold}>
              {busy ? "Saving…" : "Save discount"}
            </button>
            {msg && <span style={{ fontSize: 12.5, color: msg === "Saved" ? GREEN : RED }}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function MonthCard({ s }: any) {
  const now = Number(s.this_month || 0);
  const prev = Number(s.last_month || 0);
  const up = now >= prev;
  return (
    <div style={{ ...card, marginBottom: 14, display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>This month</div>
        <div style={{ fontSize: 19, fontWeight: 800 }}>₹{now.toLocaleString("en-IN")}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: "var(--muted)" }}>Last month</div>
        <div style={{ fontSize: 19, fontWeight: 800, color: "var(--muted)" }}>
          ₹{prev.toLocaleString("en-IN")}
        </div>
      </div>
      {prev > 0 && (
        <div style={{ fontSize: 13, fontWeight: 800, color: up ? GREEN : RED }}>
          {up ? "▲" : "▼"} {Math.abs(Math.round(((now - prev) / prev) * 100))}%
        </div>
      )}
    </div>
  );
}

function Withdraw({ s, min, upi, api, onDone }: any) {
  const [id, setId] = useState(upi || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const avail = Number(s.available || 0);
  const ok = avail >= Number(min || 500);

  async function go() {
    setBusy(true); setMsg("");
    try {
      const d = await api("/withdraw", "POST", { upi_id: id });
      setMsg(`Requested ₹${d.amount}. We usually send it within 2 working days.`);
      onDone();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <div style={card}>
      <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Withdraw earnings</div>
      <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginBottom: 12 }}>
        {Number(s.in_request || 0) > 0
          ? `₹${s.in_request} is already in a pending request.`
          : `Minimum ₹${min}. Paid by UPI, usually within 2 working days.`}
      </div>
      <Row>
        <Field label="Your UPI ID">
          <input style={input} value={id} placeholder="name@bank"
                 onChange={(e) => setId(e.target.value)} />
        </Field>
        <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 10 }}>
          <button onClick={go} disabled={busy || !ok || !id.trim()} style={{ ...gold, opacity: ok && id.trim() ? 1 : 0.5 }}>
            {busy ? "Requesting…" : `Withdraw ₹${avail.toLocaleString("en-IN")}`}
          </button>
        </div>
      </Row>
      {msg && <div style={{ fontSize: 12.5, marginTop: 6, color: msg.startsWith("Requested") ? GREEN : RED }}>{msg}</div>}
    </div>
  );
}

function Sales({ rows }: { rows: any[] }) {
  if (rows.length === 0) {
    return (
      <p style={{ color: "var(--muted)", fontSize: 13.5, lineHeight: 1.7 }}>
        No sales yet. Share your coupon code and they will appear here as they come in.
      </p>
    );
  }
  return (
    <>
      {rows.map((r) => (
        <div key={r.ref} style={{ ...card, padding: 13, marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {r.product}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
                {r.student} · {r.date ? new Date(r.date).toLocaleDateString("en-IN") : ""} · {r.ref}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: GOLD }}>₹{r.commission}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>
                {r.percent}% of ₹{r.amount_paid}
              </div>
            </div>
          </div>
          {r.status === "paid" && (
            <div style={{ fontSize: 10.5, fontWeight: 800, color: GREEN, marginTop: 6 }}>PAID</div>
          )}
          {r.status === "reversed" && (
            <div style={{ fontSize: 10.5, fontWeight: 800, color: RED, marginTop: 6 }}>REFUNDED</div>
          )}
        </div>
      ))}
    </>
  );
}

function Payouts({ api }: any) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { api("/payouts").then((d: any) => setRows(d.payouts || [])).catch(() => setRows([])); }, [api]);

  if (!rows) return <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>;
  if (rows.length === 0) return <p style={{ color: "var(--muted)", fontSize: 13.5 }}>No payouts yet.</p>;

  return (
    <>
      {rows.map((r) => (
        <div key={r.id} style={{ ...card, padding: 13, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 800 }}>₹{Number(r.amount).toLocaleString("en-IN")}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
              Requested {r.requested_at ? new Date(r.requested_at).toLocaleDateString("en-IN") : ""}
              {r.paid_at ? ` · Paid ${new Date(r.paid_at).toLocaleDateString("en-IN")}` : ""}
              {r.reference ? ` · Ref ${r.reference}` : ""}
            </div>
            {r.admin_note && (
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>{r.admin_note}</div>
            )}
          </div>
          <Badge status={r.status} />
        </div>
      ))}
    </>
  );
}

// ── Content requests ────────────────────────────────────────────────────────
function Requests({ api }: any) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kind: "mock", exam_name: "", title: "", details: "", file_url: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(() => {
    api("/requests").then((d: any) => setRows(d.requests || [])).catch(() => setRows([]));
  }, [api]);
  useEffect(load, [load]);

  async function submit() {
    if (!f.title.trim()) { setMsg("Please write what you need"); return; }
    setBusy(true); setMsg("");
    try {
      await api("/requests", "POST", f);
      setF({ kind: "mock", exam_name: "", title: "", details: "", file_url: "" });
      setOpen(false);
      load();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <>
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>Ask us for content</div>
        <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.65 }}>
          You know your exam and your audience better than we do. Tell us what is missing and we
          will build it. You can track the status here.
        </p>
        <button onClick={() => setOpen(!open)} style={open ? ghost : gold}>
          {open ? "Cancel" : "New request"}
        </button>

        {open && (
          <div style={{ marginTop: 14 }}>
            <Row>
              <Field label="What kind">
                <select style={input} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>
                  <option value="mock">Mock test</option>
                  <option value="descriptive">Descriptive</option>
                  <option value="tier2">Tier 2 — typing or Excel</option>
                  <option value="course">Course or e-book</option>
                  <option value="other">Something else</option>
                </select>
              </Field>
              <Field label="Which exam">
                <input style={input} value={f.exam_name} placeholder="e.g. NCERT LDC"
                       onChange={(e) => setF({ ...f, exam_name: e.target.value })} />
              </Field>
            </Row>
            <Field label="What do you need">
              <input style={input} value={f.title} placeholder="One line — e.g. Hindi typing tests for NCERT"
                     onChange={(e) => setF({ ...f, title: e.target.value })} />
            </Field>
            <Field label="Details" hint="Pattern, marks, timing, anything specific your audience keeps asking for.">
              <textarea rows={4} style={{ ...input, lineHeight: 1.6 }} value={f.details}
                        onChange={(e) => setF({ ...f, details: e.target.value })} />
            </Field>
            <Field label="Source link (optional)" hint="Notification, previous paper or syllabus — paste a Drive or website link.">
              <input style={input} value={f.file_url} placeholder="https://…"
                     onChange={(e) => setF({ ...f, file_url: e.target.value })} />
            </Field>
            {msg && <Err>{msg}</Err>}
            <button onClick={submit} disabled={busy} style={{ ...gold, width: "100%" }}>
              {busy ? "Sending…" : "Send request"}
            </button>
          </div>
        )}
      </div>

      {!rows ? (
        <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>
      ) : rows.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>No requests yet.</p>
      ) : (
        rows.map((r) => (
          <div key={r.id} style={{ ...card, padding: 13, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700 }}>{r.title}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
                  {r.kind}{r.exam_name ? ` · ${r.exam_name}` : ""}
                  {r.created_at ? ` · ${new Date(r.created_at).toLocaleDateString("en-IN")}` : ""}
                </div>
              </div>
              <Badge status={r.status} />
            </div>
            {r.admin_note && (
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>
                {r.admin_note}
              </div>
            )}
            {r.result_url && (
              <a href={r.result_url} target="_blank" rel="noreferrer"
                 style={{ fontSize: 12.5, fontWeight: 700, color: GOLD, display: "inline-block", marginTop: 8 }}>
                See what we built →
              </a>
            )}
          </div>
        ))
      )}
    </>
  );
}

// ── chhote hisse ────────────────────────────────────────────────────────────
function Badge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    requested: ["Requested", "#9a917f"],
    received: ["Received", "#9a917f"],
    in_progress: ["In progress", GOLD],
    done: ["Done", GREEN],
    paid: ["Paid", GREEN],
    declined: ["Not planned", RED],
    rejected: ["Rejected", RED],
  };
  const [label, color] = map[status] || [status, "#9a917f"];
  return (
    <span style={{
      fontSize: 10.5, fontWeight: 800, color, border: `1px solid ${color}`,
      borderRadius: 6, padding: "3px 8px", flexShrink: 0, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function Stat({ label, value, gold: g }: { label: string; value: string; gold?: boolean }) {
  return (
    <div style={{ ...card, padding: 13 }}>
      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 800, marginTop: 3, color: g ? GOLD : "var(--text)" }}>
        {value}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: any) {
  return (
    <label style={{ display: "block", marginBottom: 12, flex: 1, minWidth: 150 }}>
      <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 5 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{hint}</div> : null}
    </label>
  );
}

function Row({ children }: any) {
  return <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{children}</div>;
}

function Err({ children }: any) {
  return (
    <div style={{
      background: "rgba(192,57,43,0.08)", border: `1px solid ${RED}`, color: RED,
      borderRadius: 10, padding: "10px 12px", fontSize: 13, lineHeight: 1.6, marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

const card: React.CSSProperties = {
  background: "var(--card)", border: "1px solid var(--line)",
  borderRadius: 14, padding: 16, boxShadow: "var(--shadow)",
};
const input: React.CSSProperties = {
  width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid var(--line)",
  background: "var(--bg)", color: "var(--text)", fontSize: 14, boxSizing: "border-box",
};
const gold: React.CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10,
  padding: "11px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const ghost: React.CSSProperties = {
  background: "transparent", color: "var(--text)", border: "1px solid var(--line)",
  borderRadius: 10, padding: "11px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
};
const linkBtn: React.CSSProperties = {
  background: "none", border: "none", color: GOLD, fontWeight: 800,
  fontSize: 13.5, cursor: "pointer", padding: 0,
};
