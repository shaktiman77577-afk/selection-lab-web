"use client";

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";
import DescriptiveAdmin from "./DescriptiveAdmin";
import BrowserTest from "./BrowserTest";
import ImageField from "./ImageField";
import AppContentAdmin from "./AppContentAdmin";
import Tier2Admin from "./Tier2Admin";
import ExcelAdmin from "./ExcelAdmin";
import SearchAdmin from "./SearchAdmin";
import EmailAdmin from "./EmailAdmin";

const GOLD = "#FFAB00";
const BG = "#0d0b08";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const TOKEN_KEY = "sl_admin_token";

type Tab = "home" | "health" | "seo" | "live" | "tickets" | "dashboard" | "courses" | "questions" | "qbank" | "mocktests" | "blog" | "banners" | "notifications" | "reviews" | "users" | "coupons" | "descriptive" | "appcontent" | "approvals" | "tier2" | "excel" | "search" | "email";

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
  const [tab, setTabState] = useState<Tab>("home");

  // ── Back button: section se home par wapas, app band nahi ──
  // Har section kholte waqt browser history me ek entry daal dete hain.
  // Phone ka back dabane par wo entry hatti hai aur hum home par aa jate hain.
  // Home par hone par back normal kaam karega (site se bahar).
  function setTab(next: Tab) {
    if (next !== "home" && tab === "home") {
      try { window.history.pushState({ adminTab: next }, ""); } catch {}
    }
    setTabState(next);
  }

  useEffect(() => {
    function onPop() {
      // Kisi section me the to home par le aao — page chhodne mat do
      setTabState((cur) => {
        if (cur !== "home") return "home";
        return cur;
      });
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    onLogout();
  }

  // Naye tickets ka count — home par badge me dikhta hai, har 60 sec refresh
  const [openTickets, setOpenTickets] = useState(0);
  useEffect(() => {
    let alive = true;
    function poll() {
      api("/admin-extra/tickets?status=open")
        .then((d) => { if (alive) setOpenTickets((d.tickets || []).length); })
        .catch(() => {});
    }
    poll();
    const id = setInterval(poll, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Har kaam ka apna rang — rang se pata chalta hai kaunsa section hai,
  // sirf sajावट ke liye nahi.
  const ACTIONS: { id: Tab; icon: string; title: string; sub: string; color: string; group: string }[] = [
    { id: "courses",       icon: "📚", title: "Courses",       sub: "Course banao, price aur content",   color: "#FFAB00", group: "Padhai ka saamaan" },
    { id: "mocktests",     icon: "📝", title: "Mock Tests",    sub: "Series aur test CSV se",            color: "#4A90D9", group: "Padhai ka saamaan" },
    { id: "descriptive",   icon: "✍️", title: "Descriptive",   sub: "Essay, letter, precis practice",     color: "#7C6CE0", group: "Padhai ka saamaan" },
    { id: "tier2",         icon: "⌨️", title: "Tier 2",        sub: "Typing test — passages and series",  color: "#E07C4A", group: "Padhai ka saamaan" },
    { id: "excel",         icon: "📊", title: "Excel / CPT",   sub: "Formula chart, mocks, bonus MCQ",    color: "#2E9E6B", group: "Padhai ka saamaan" },
    { id: "questions",     icon: "⬆️", title: "Upload Qs",     sub: "CSV se bulk questions",              color: "#2FA98C", group: "Padhai ka saamaan" },
    { id: "qbank",         icon: "🗂️", title: "Question Bank", sub: "Purane questions dhoondo",           color: "#6B8CAE", group: "Padhai ka saamaan" },

    { id: "appcontent",    icon: "🎨", title: "App Content",   sub: "Home slides, faculty, countdown",    color: "#D6568F", group: "App aur Website" },
    { id: "banners",       icon: "🖼️", title: "Banners",       sub: "Promo images carousel me",           color: "#F08A3C", group: "App aur Website" },
    { id: "search",        icon: "🔎", title: "Search",        sub: "What people searched, trending chips", color: "#4A9DE0", group: "App aur Website" },
    { id: "email",         icon: "📧", title: "Email",         sub: "Send mails, read replies",            color: "#7C6CE0", group: "App aur Website" },
    { id: "blog",          icon: "📰", title: "Blog",          sub: "SEO articles website pe",            color: "#E8734A", group: "App aur Website" },

    { id: "users",         icon: "👥", title: "Users",         sub: "Access do, ban karo, history",       color: "#3AA8C1", group: "Log aur Paisa" },
    { id: "coupons",       icon: "🎟️", title: "Coupons",       sub: "Discount code banao",                color: "#3EA96B", group: "Log aur Paisa" },
    { id: "notifications", icon: "🔔", title: "Notify",        sub: "App users ko push bhejo",            color: "#E05555", group: "Log aur Paisa" },
    { id: "reviews",       icon: "⭐", title: "Reviews",       sub: "Course reviews dekho",               color: "#C8B32E", group: "Log aur Paisa" },
  ];

  const GROUPS = ["Padhai ka saamaan", "App aur Website", "Log aur Paisa"];
  const activeAction = ACTIONS.find((a) => a.id === tab);

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

      {tab === "home" ? (
        /* ── HOME: "Aaj kya karna hai?" ── */
        <div style={{ padding: "20px 16px 140px" }}>
          <div style={{ fontSize: 13, color: "#9a917f" }}>Namaste 👋</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: "4px 0 18px", lineHeight: 1.25 }}>
            Aaj <span style={{ color: GOLD }}>kya karna</span> hai?
          </h1>

          {/* Troubleshooter — sab kuch khud check karke report deta hai */}
          <button
            onClick={() => setTab("health")}
            style={{
              width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 12,
              background: CARD, border: "1px solid rgba(93,217,124,0.35)",
              borderLeft: "4px solid #5dd97c", borderRadius: 16, padding: "14px 16px", color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>🩺</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#5dd97c" }}>Troubleshooter</div>
                <div style={{ fontSize: 12, color: "#9a917f" }}>Sab kuch khud check karke report degi</div>
              </div>
              <span style={{ color: "#5dd97c", fontSize: 18 }}>→</span>
            </div>
          </button>

          {/* Support tickets — students ke sawaal */}
          <button
            onClick={() => setTab("tickets")}
            style={{
              width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 12,
              background: CARD, border: "1px solid rgba(255,171,0,0.3)",
              borderLeft: "4px solid #FFAB00", borderRadius: 16, padding: "14px 16px", color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>🎫</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: GOLD }}>
                  Support tickets
                  {openTickets > 0 && (
                    <span style={{
                      marginLeft: 8, fontSize: 11, fontWeight: 900, padding: "2px 8px",
                      borderRadius: 20, background: "#ff4d4d", color: "#fff",
                    }}>
                      {openTickets} NAYA
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "#9a917f" }}>
                  {openTickets > 0
                    ? `${openTickets} ticket ka jawab baaki hai`
                    : "Students ke sawaal aur unke jawab"}
                </div>
              </div>
              <span style={{ color: GOLD, fontSize: 18 }}>→</span>
            </div>
          </button>

          {/* Teacher approvals — live karne se pehle check */}
          <button
            onClick={() => setTab("approvals")}
            style={{
              width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 12,
              background: CARD, border: "1px solid rgba(124,108,224,0.35)",
              borderLeft: "4px solid #7C6CE0", borderRadius: 16, padding: "14px 16px", color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>✅</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#7C6CE0" }}>Teacher approvals</div>
                <div style={{ fontSize: 12, color: "#9a917f" }}>Live karne se pehle teacher se check karwaiye</div>
              </div>
              <span style={{ color: "#7C6CE0", fontSize: 18 }}>→</span>
            </div>
          </button>

          {/* Live activity — deploy se pehle dekh lo kaun online hai */}
          <button
            onClick={() => setTab("live")}
            style={{
              width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 12,
              background: CARD, border: "1px solid rgba(93,217,124,0.3)",
              borderLeft: "4px solid #5dd97c", borderRadius: 16, padding: "14px 16px", color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>🟢</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#5dd97c" }}>Abhi kaun online hai</div>
                <div style={{ fontSize: 12, color: "#9a917f" }}>Deploy se pehle ek nazar daal lijiye</div>
              </div>
              <span style={{ color: "#5dd97c", fontSize: 18 }}>→</span>
            </div>
          </button>

          {/* SEO coach — asli data dekh kar next steps */}
          <button
            onClick={() => setTab("seo")}
            style={{
              width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 20,
              background: CARD, border: "1px solid rgba(74,144,217,0.35)",
              borderLeft: "4px solid #4A90D9", borderRadius: 16, padding: "14px 16px", color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 24 }}>📈</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15, color: "#4A90D9" }}>SEO — ab kya karein?</div>
                <div style={{ fontSize: 12, color: "#9a917f" }}>Aapke data ke hisaab se agla kadam</div>
              </div>
              <span style={{ color: "#4A90D9", fontSize: 18 }}>→</span>
            </div>
          </button>

          {/* Dashboard — numbers dekhne ka shortcut */}
          <button
            onClick={() => setTab("dashboard")}
            style={{
              width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 20,
              background: "linear-gradient(135deg, #1a2f55, #2c4a85)",
              border: "1px solid rgba(255,171,0,0.35)", borderRadius: 16, padding: "16px 18px", color: "#fff",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 26 }}>📊</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>Aaj ki report</div>
                <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.7)" }}>Sales, revenue aur naye users</div>
              </div>
              <span style={{ color: GOLD, fontSize: 20 }}>→</span>
            </div>
          </button>

          {GROUPS.map((g) => (
            <div key={g} style={{ marginBottom: 22 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.4, color: "#7a7263", fontWeight: 800, marginBottom: 10 }}>
                {g.toUpperCase()}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                {ACTIONS.filter((a) => a.group === g).map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setTab(a.id)}
                    style={{
                      textAlign: "left", cursor: "pointer", padding: "14px 14px 13px",
                      borderRadius: 15, background: CARD,
                      border: `1px solid ${a.color}44`,
                      borderLeft: `4px solid ${a.color}`,
                      color: "#fff",
                    }}
                  >
                    <div
                      style={{
                        width: 38, height: 38, borderRadius: 11, background: `${a.color}22`,
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 9,
                      }}
                    >
                      {a.icon}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: 14.5, color: a.color }}>{a.title}</div>
                    <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 3, lineHeight: 1.45 }}>{a.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ── Section ke andar: wapas jaane ka rasta ── */
        <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => setTab("home")} style={{ ...ghostBtn, padding: "8px 14px" }}>
            ← Home
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <span style={{ fontSize: 18 }}>{activeAction?.icon || (tab === "health" ? "🩺" : tab === "seo" ? "📈" : tab === "live" ? "🟢" : tab === "tickets" ? "🎫" : tab === "approvals" ? "✅" : "📊")}</span>
            <span
              style={{
                fontWeight: 800, fontSize: 16,
                color: activeAction?.color || GOLD,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}
            >
              {activeAction?.title || (tab === "health" ? "Troubleshooter" : tab === "seo" ? "SEO Coach" : tab === "live" ? "Live activity" : tab === "tickets" ? "Support tickets" : tab === "approvals" ? "Teacher approvals" : "Aaj ki report")}
            </span>
          </div>
        </div>
      )}

      <main style={{ padding: tab === "home" ? 0 : 16, paddingBottom: 120 }}>
        {tab === "health" && <HealthTab />}
        {tab === "seo" && <SeoTab onGo={(t) => setTab(t)} />}
        {tab === "live" && <LiveTab />}
        {tab === "tickets" && <TicketsTab />}
        {tab === "approvals" && <ApprovalsTab />}
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
        {tab === "tier2" && <Tier2Admin api={api} />}
        {tab === "excel" && <ExcelAdmin api={api} />}
        {tab === "search" && <SearchAdmin api={api} />}
        {tab === "email" && <EmailAdmin api={api} />}
        {tab === "appcontent" && <AppContentAdmin api={api} />}
      </main>
    </div>
  );
}

// ── Teacher approvals ───────────────────────────────────────────────────────
// Har mock / course / descriptive ka status. Yahin se verification key banti
// hai jo teacher ko WhatsApp par bhej dete hain.
function ApprovalsTab() {
  const [items, setItems] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "changes_needed">("pending");
  const [kind, setKind] = useState<"all" | "mock" | "course" | "descriptive">("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [newKey, setNewKey] = useState<any>(null);
  const [history, setHistory] = useState<any>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);

  function load() {
    api("/verify/admin/status")
      .then((d) => { setItems(d.items || []); setCounts(d.counts || {}); setSetupNeeded(false); })
      .catch((e) => {
        setError(e.message);
        if (/relation|does not exist|review_keys|content_approvals/i.test(e.message)) setSetupNeeded(true);
      });
  }
  useEffect(load, []);

  async function makeKey(it: any) {
    setBusy(true);
    setError("");
    try {
      const d = await api("/verify/admin/keys", "POST", { item_type: it.item_type, item_id: it.item_id });
      setNewKey({ ...d, title: it.title });
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function openHistory(it: any) {
    try {
      const d = await api(`/verify/admin/history/${it.item_type}/${it.item_id}`);
      setHistory({ ...d, title: it.title });
    } catch (e: any) {
      setError(e.message);
    }
  }

  const shown = items.filter((i) => {
    if (filter !== "all" && i.status !== filter) return false;
    if (kind !== "all" && i.item_type !== kind) return false;
    return true;
  });

  const ICON: Record<string, string> = { mock: "📝", course: "📚", descriptive: "✍️" };
  const link = (k: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/verify?key=${k}`;

  if (setupNeeded) {
    return (
      <div style={{ background: CARD, border: "1px solid rgba(255,107,107,0.4)", borderRadius: 13, padding: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 14, color: "#ff6b6b", marginBottom: 8 }}>
          Pehle SQL chalani padegi
        </div>
        <div style={{ fontSize: 12.5, color: "#c8c0ae", lineHeight: 1.7 }}>
          Supabase → SQL Editor me VERIFY_SETUP.sql chala dijiye. Do tables banti hain —
          review_keys aur content_approvals. Uske baad ye page apne aap chalne lagega.
        </div>
        <button onClick={load} style={{ ...smallBtn, marginTop: 11 }}>Dobara check karein</button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 13 }}>
        <div style={{ fontSize: 12.5, color: "#9a917f", lineHeight: 1.7 }}>
          Kisi bhi item par <b style={{ color: GOLD }}>Key banao</b> dabaiye — ek link milega.
          Wo link teacher ko WhatsApp par bhej dijiye. Unhe login nahi karna padega.
          Key ek hi baar chalti hai aur 14 din me apne aap khatam ho jaati hai.
        </div>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
        {([
          ["pending", `⏳ Pending (${counts.pending || 0})`],
          ["approved", `✅ Approved (${counts.approved || 0})`],
          ["changes_needed", `⚠️ Changes (${counts.changes_needed || 0})`],
          ["all", "Sab"],
        ] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} style={{
            ...smallBtn, padding: "8px 13px",
            borderColor: filter === k ? GOLD : BORDER,
            color: filter === k ? GOLD : "#c8c0ae",
            background: filter === k ? "rgba(255,171,0,0.12)" : "transparent",
          }}>
            {l}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {([["all", "Sab type"], ["mock", "📝 Mock"], ["course", "📚 Course"], ["descriptive", "✍️ Descriptive"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setKind(k)} style={{
            ...smallBtn, padding: "7px 12px", fontSize: 12,
            borderColor: kind === k ? "#7C6CE0" : BORDER,
            color: kind === k ? "#7C6CE0" : "#9a917f",
          }}>
            {l}
          </button>
        ))}
      </div>

      {error && <ErrorBox msg={error} />}
      {shown.length === 0 && <Muted>Is filter me kuch nahi hai.</Muted>}

      {shown.map((it) => (
        <div key={`${it.item_type}-${it.item_id}`} style={{
          background: CARD, borderRadius: 13, padding: 13, marginBottom: 10,
          border: `1px solid ${it.status === "approved" ? "rgba(93,217,124,0.4)" : it.status === "changes_needed" ? "rgba(255,107,107,0.45)" : BORDER}`,
        }}>
          <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
            <span style={{ fontSize: 17 }}>{ICON[it.item_type]}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{it.title || `#${it.item_id}`}</div>
              <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 2 }}>
                ID {it.item_id} · {it.detail}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 9, fontSize: 12.5, lineHeight: 1.6 }}>
            {it.status === "approved" && (
              <span style={{ color: "#5dd97c", fontWeight: 700 }}>
                ✅ Approved by {it.teacher_name}
                {it.reviewed_at ? ` · ${new Date(it.reviewed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}
              </span>
            )}
            {it.status === "changes_needed" && (
              <span style={{ color: "#ff6b6b", fontWeight: 700 }}>
                ⚠️ {it.teacher_name} ne changes maange
                {it.flagged_count > 0 ? ` · ${it.flagged_count} questions flagged` : ""}
              </span>
            )}
            {it.status === "pending" && (
              <span style={{ color: GOLD, fontWeight: 700 }}>⏳ Abhi kisi ne check nahi kiya</span>
            )}
          </div>

          {it.notes && (
            <div style={{ fontSize: 12, color: "#c8c0ae", background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: 9, marginTop: 8, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {it.notes}
            </div>
          )}

          {it.open_key && (
            <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 8 }}>
              🔑 Ek key abhi chalu hai: <b style={{ color: GOLD, fontFamily: "monospace" }}>{it.open_key}</b>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
            <button onClick={() => makeKey(it)} disabled={busy} style={{ ...smallBtn, padding: "7px 13px", color: GOLD, borderColor: "rgba(255,171,0,0.5)" }}>
              🔑 Key banao
            </button>
            <button onClick={() => openHistory(it)} style={{ ...smallBtn, padding: "7px 13px" }}>
              History
            </button>
          </div>
        </div>
      ))}

      {/* Nayi key — link copy karke bhej dijiye */}
      {newKey && (
        <div onClick={() => setNewKey(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#12100d", border: `1px solid ${BORDER}`, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 520, padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <b style={{ fontSize: 15.5, flex: 1 }}>🔑 Key ban gayi</b>
              <button onClick={() => setNewKey(null)} style={{ ...smallBtn, padding: "5px 11px" }}>✕</button>
            </div>

            <div style={{ fontSize: 12.5, color: "#9a917f", marginBottom: 10 }}>{newKey.title}</div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14, textAlign: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: "monospace", fontSize: 21, fontWeight: 800, color: GOLD, letterSpacing: 2 }}>
                {newKey.key}
              </div>
              <div style={{ fontSize: 11, color: "#9a917f", marginTop: 6 }}>
                {newKey.valid_days} din tak chalegi · ek hi baar
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: "#9a917f", marginBottom: 6 }}>Ye link bhejiye:</div>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 9, padding: 11, fontSize: 12, wordBreak: "break-all", color: "#c8c0ae", marginBottom: 12 }}>
              {link(newKey.key)}
            </div>

            <button
              onClick={() => { try { navigator.clipboard.writeText(link(newKey.key)); } catch {} }}
              style={{ ...goldBtn, width: "100%" }}
            >
              📋 Link copy karein
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Namaste! Ye content verify kar dijiye:\n\n${newKey.title}\n${link(newKey.key)}\n\nLogin nahi karna hai, bas link kholiye.`)}`}
              target="_blank"
              rel="noreferrer"
              style={{ ...smallBtn, display: "block", textAlign: "center", padding: "12px", marginTop: 9, textDecoration: "none", color: "#5dd97c", borderColor: "rgba(93,217,124,0.45)" }}
            >
              WhatsApp par bhejein
            </a>
          </div>
        </div>
      )}

      {/* Purane reviews */}
      {history && (
        <div onClick={() => setHistory(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "#12100d", border: `1px solid ${BORDER}`, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 520, padding: 18, maxHeight: "80vh", overflowY: "auto" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <b style={{ fontSize: 15.5, flex: 1 }}>Review history</b>
              <button onClick={() => setHistory(null)} style={{ ...smallBtn, padding: "5px 11px" }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: "#9a917f", marginBottom: 13 }}>{history.title}</div>

            {(history.reviews || []).length === 0 && <Muted>Abhi tak koi review nahi hua.</Muted>}
            {(history.reviews || []).map((r: any) => (
              <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 11, padding: 12, marginBottom: 9 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <b style={{ fontSize: 13, flex: 1 }}>{r.teacher_name}</b>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: r.status === "approved" ? "#5dd97c" : "#ff6b6b" }}>
                    {r.status === "approved" ? "APPROVED" : "CHANGES"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#9a917f", marginTop: 3 }}>
                  {r.reviewed_at ? new Date(r.reviewed_at).toLocaleString("en-IN") : ""}
                </div>
                {r.notes && (
                  <div style={{ fontSize: 12.5, color: "#c8c0ae", marginTop: 7, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{r.notes}</div>
                )}
                {(r.flagged_questions || []).length > 0 && (
                  <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ fontSize: 10.5, fontWeight: 800, color: "#ff6b6b", marginBottom: 4 }}>
                      {(r.flagged_questions || []).length} QUESTIONS FLAGGED
                    </div>
                    {(r.flagged_questions || []).map((f: any, i: number) => (
                      <div key={i} style={{ fontSize: 12, color: "#c8c0ae", lineHeight: 1.6 }}>
                        Q id {f.q_id}{f.note ? ` — ${f.note}` : ""}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Support tickets ─────────────────────────────────────────────────────────
function TicketsTab() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [filter, setFilter] = useState("open");
  const [error, setError] = useState("");
  const [replyFor, setReplyFor] = useState<any>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [testMail, setTestMail] = useState("");
  const [mailMsg, setMailMsg] = useState("");
  // Ticket raise karne wale ka profile — usi jagah khul jata hai
  const [profileFor, setProfileFor] = useState<any>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  function load() {
    api(`/admin-extra/tickets?status=${filter}`)
      .then((d) => { setTickets(d.tickets || []); setCounts(d.counts || {}); })
      .catch((e) => setError(e.message));
  }
  useEffect(load, [filter]);

  async function send() {
    if (!reply.trim()) return;
    setBusy(true);
    try {
      await api(`/admin-extra/tickets/${replyFor.id}/reply`, "POST", { reply: reply.trim(), close: true });
      setReplyFor(null);
      setReply("");
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function openProfile(userId: number) {
    setProfileBusy(true);
    setProfileFor({ loading: true, user: { id: userId } });
    try {
      const d = await api(`/admin-extra/users/${userId}/details`);
      setProfileFor(d);
    } catch (e: any) {
      setProfileFor(null);
      setError(`Profile nahi khul paya: ${e.message}`);
    }
    setProfileBusy(false);
  }

  const ICONS: Record<string, string> = {
    payment: "💳", access: "🔒", technical: "⚙️", content: "📚", other: "💬",
  };

  return (
    <div>
      {/* Email setup check */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 14 }}>
        <div style={{ fontSize: 12, color: "#9a917f", marginBottom: 8, lineHeight: 1.55 }}>
          📧 Jawab dete hi student ko email chala jaata hai. Ek baar test kar lijiye:
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            placeholder="apna email daaliye"
            value={testMail}
            onChange={(e) => setTestMail(e.target.value)}
          />
          <button
            onClick={async () => {
              if (!testMail.trim()) return;
              setMailMsg("Bhej rahe hain...");
              try {
                const d = await api(`/admin-extra/test-email?to=${encodeURIComponent(testMail.trim())}`, "POST");
                setMailMsg(d.message);
              } catch (e: any) {
                setMailMsg(`Error: ${e.message}`);
              }
            }}
            style={{ ...smallBtn, padding: "10px 14px", whiteSpace: "nowrap" }}
          >
            Test bhejein
          </button>
        </div>
        {mailMsg && (
          <div style={{ fontSize: 11.5, color: mailMsg.startsWith("Error") ? "#ff6b6b" : "#5dd97c", marginTop: 8 }}>
            {mailMsg}
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap" }}>
        {[["open", `Naye (${counts.open || 0})`], ["closed", `Jawab diye (${counts.closed || 0})`], ["all", "Sab"]].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            style={{
              ...smallBtn, padding: "8px 14px",
              borderColor: filter === k ? GOLD : BORDER,
              color: filter === k ? GOLD : "#c8c0ae",
              background: filter === k ? "rgba(255,171,0,0.12)" : "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && <ErrorBox msg={error} />}
      {tickets.length === 0 && <Muted>Koi ticket nahi hai.</Muted>}

      {tickets.map((t) => (
        <div
          key={t.id}
          style={{
            background: CARD,
            border: `1px solid ${t.status === "open" ? "rgba(255,171,0,0.4)" : BORDER}`,
            borderRadius: 13, padding: 14, marginBottom: 10,
          }}
        >
          <div style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 17 }}>{ICONS[t.category] || "💬"}</span>
            <b style={{ fontSize: 13.5, flex: 1, minWidth: 0 }}>#{t.id} · {t.subject}</b>
            <span
              style={{
                fontSize: 9.5, fontWeight: 800, padding: "3px 8px", borderRadius: 6,
                color: t.status === "open" ? GOLD : "#5dd97c",
                background: t.status === "open" ? "rgba(255,171,0,0.14)" : "rgba(93,217,124,0.14)",
              }}
            >
              {t.status === "open" ? "NAYA" : "JAWAB DIYA"}
            </span>
          </div>

          <div style={{ fontSize: 11.5, color: "#9a917f", marginBottom: 8 }}>
            {t.name || "—"} · {t.phone || t.email || "no contact"} ·{" "}
            {t.created_at ? new Date(t.created_at).toLocaleString("en-IN") : ""}
            {t.user_id ? ` · user #${t.user_id}` : ""}
          </div>

          <div style={{ fontSize: 13, color: "#c8c0ae", lineHeight: 1.65, whiteSpace: "pre-wrap", background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: 11 }}>
            {t.message}
          </div>

          {t.screenshot && (
            <a href={t.screenshot} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: GOLD, display: "inline-block", marginTop: 8 }}>
              📎 Screenshot dekhein
            </a>
          )}

          {t.admin_reply && (
            <div style={{ fontSize: 12.5, color: "#5dd97c", marginTop: 9, lineHeight: 1.6, borderLeft: "2px solid #5dd97c", paddingLeft: 10, whiteSpace: "pre-wrap" }}>
              <b style={{ fontSize: 10.5 }}>AAPKA JAWAB</b>
              <div style={{ color: "#c8c0ae", marginTop: 3 }}>{t.admin_reply}</div>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 11, flexWrap: "wrap" }}>
            <button onClick={() => { setReplyFor(t); setReply(t.admin_reply || ""); }} style={{ ...smallBtn, padding: "7px 14px" }}>
              {t.admin_reply ? "Jawab badlein" : "✍️ Jawab dein"}
            </button>
            {t.user_id && (
              <button
                onClick={() => openProfile(t.user_id)}
                disabled={profileBusy}
                style={{ ...smallBtn, padding: "7px 14px", color: "#4A90D9", borderColor: "rgba(74,144,217,0.5)" }}
              >
                👤 Profile dekhein
              </button>
            )}
            {t.phone && (
              <a href={`tel:${t.phone}`} style={{ ...smallBtn, padding: "7px 14px", textDecoration: "none", display: "inline-block" }}>
                📞 Call
              </a>
            )}
          </div>
        </div>
      ))}

      {/* Ticket wale student ka profile — turant yahin dikh jata hai */}
      {profileFor && (
        <div
          onClick={() => setProfileFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#12100d", border: `1px solid ${BORDER}`, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 520, padding: 18, maxHeight: "82vh", overflowY: "auto" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <b style={{ fontSize: 15.5, flex: 1 }}>👤 Student profile</b>
              <button onClick={() => setProfileFor(null)} style={{ ...smallBtn, padding: "5px 11px" }}>✕</button>
            </div>

            {profileFor.loading ? (
              <Muted>Profile load ho raha hai...</Muted>
            ) : (
              <>
                <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>
                    {profileFor.user?.name || "Unnamed"}
                    {profileFor.user?.is_banned && <span style={{ color: "#ff6b6b", fontSize: 11, marginLeft: 8 }}>BANNED</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#9a917f", marginTop: 5, lineHeight: 1.8 }}>
                    📧 {profileFor.user?.email || "—"}<br />
                    📱 {profileFor.user?.phone || "—"}<br />
                    🆔 #{profileFor.user?.id} · {profileFor.user?.points ?? 0} pts<br />
                    📅 Joined {profileFor.user?.created_at ? new Date(profileFor.user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </div>
                </div>

                {profileFor.summary && (() => {
                  const s2 = profileFor.summary;
                  const V: Record<string, { label: string; color: string }> = {
                    paying:       { label: "PAYING CUSTOMER", color: "#5dd97c" },
                    granted_only: { label: "ADMIN NE DIYA",   color: "#FFAB00" },
                    free_only:    { label: "SIRF FREE",       color: "#4A90D9" },
                    no_activity:  { label: "KOI ACTIVITY NAHI", color: "#9a917f" },
                  };
                  const v = V[s2.verdict] || V.no_activity;
                  return (
                    <div style={{ background: CARD, border: `1px solid ${v.color}55`, borderLeft: `4px solid ${v.color}`, borderRadius: 12, padding: 12, marginBottom: 12 }}>
                      <div style={{ fontWeight: 800, fontSize: 11.5, letterSpacing: 1, color: v.color }}>{v.label}</div>
                      <div style={{ fontSize: 12, color: "#c8c0ae", marginTop: 7, lineHeight: 1.7 }}>
                        ₹{s2.total_spent} kharch · {s2.paid_items} kharide · {s2.granted_items} admin ne diye<br />
                        {s2.free_mock_attempts} free mock · {s2.paid_mock_attempts} paid mock · {s2.descriptive_submissions} descriptive
                      </div>
                    </div>
                  );
                })()}

                <div style={{ fontSize: 12.5, fontWeight: 800, color: "#9a917f", marginBottom: 7 }}>
                  KYA-KYA HAI ISKE PAAS
                </div>

                {(profileFor.courses || []).length === 0 &&
                 (profileFor.series || []).length === 0 &&
                 (profileFor.descriptive || []).length === 0 && (
                  <Muted>Kuch nahi khareeda — isliye shayad access nahi dikh raha.</Muted>
                )}

                {(profileFor.courses || []).map((c: any) => (
                  <ProfileItem key={`c${c.id}`} icon="📚" title={c.title}
                    sub={`₹${c.amount_paid ?? 0}${c.payment_id === "ADMIN_GRANT" ? " · admin grant" : ""}${c.is_active === false ? " · REVOKED" : ""}`} />
                ))}
                {(profileFor.series || []).map((x: any, i: number) => (
                  <ProfileItem key={`s${i}`} icon="📝" title={x.title} sub={`₹${x.amount_paid ?? 0}`} />
                ))}
                {(profileFor.descriptive || []).map((x: any, i: number) => (
                  <ProfileItem key={`d${i}`} icon="✍️" title={x.title}
                    sub={Number(x.amount_paid) > 0 ? `₹${x.amount_paid}` : x.payment_id === "ADMIN_GRANT" ? "Admin ne diya" : "Free"} />
                ))}

                {(profileFor.mock_attempts || []).length > 0 && (
                  <>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: "#9a917f", margin: "14px 0 7px" }}>
                      AAKHRI MOCK TESTS
                    </div>
                    {(profileFor.mock_attempts || []).slice(0, 5).map((a: any) => (
                      <ProfileItem key={a.id} icon="📊" title={a.title || `Test #${a.mock_test_id}`}
                        sub={`${a.score ?? "—"} marks${a.ended_at ? ` · ${new Date(a.ended_at).toLocaleDateString("en-IN")}` : ""}`} />
                    ))}
                  </>
                )}

                <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 12, lineHeight: 1.55 }}>
                  Access dena ya hatana ho to Users tab kholiye — wahan #{profileFor.user?.id} search kar lijiye.
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Reply sheet */}
      {replyFor && (
        <div
          onClick={() => setReplyFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#12100d", border: `1px solid ${BORDER}`, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 520, padding: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <b style={{ fontSize: 15.5, flex: 1 }}>Jawab — #{replyFor.id}</b>
              <button onClick={() => setReplyFor(null)} style={{ ...smallBtn, padding: "5px 11px" }}>✕</button>
            </div>
            <div style={{ fontSize: 12, color: "#9a917f", marginBottom: 12 }}>{replyFor.subject}</div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {/* Label Hinglish (aapke liye), bhara hua text English (student ke liye) */}
              {[
                ["Access de diya", "Your access has been unlocked. Please open the app or website again and it will all be there. Sorry for the trouble."],
                ["Check kar rahe", "Thanks for writing in — we are looking into this and will update you shortly."],
                ["Payment mila", "We have received your payment and unlocked your access. Please log in again and it should show up. Sorry for the delay."],
                ["Duplicate account", "It looks like you paid from one account and are signed in with another. Please log in with the same phone number you paid from. If you are still stuck, reply with that number and we will merge it for you."],
              ].map(([label, text]) => (
                <button key={label} onClick={() => setReply(text)} style={{ ...smallBtn, padding: "5px 10px", fontSize: 11 }}>
                  {label}
                </button>
              ))}
            </div>

            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              rows={5}
              placeholder="Jawab likhiye — student ise apne Help page par dekhega."
              style={{ ...inputStyle, minHeight: 110, resize: "vertical" }}
            />
            <button onClick={send} disabled={busy || !reply.trim()} style={{ ...goldBtn, width: "100%", opacity: busy || !reply.trim() ? 0.6 : 1 }}>
              {busy ? "Bhej rahe hain..." : "Jawab bhejein aur band karein"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


// ── Live activity — kaun online hai, kya kar raha hai ───────────────────────
function LiveTab() {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");

  function load() {
    api("/admin-extra/live-activity").then(setData).catch((e) => setError(e.message));
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);   // har 15 second refresh
    return () => clearInterval(t);
  }, []);

  if (error) return <ErrorBox msg={error} />;
  if (!data) return <Muted>Dekh rahe hain kaun online hai…</Muted>;

  const V: Record<string, { color: string; icon: string; title: string }> = {
    wait: { color: "#ff6b6b", icon: "🛑", title: "Abhi deploy mat kijiye" },
    careful: { color: GOLD, icon: "⚠️", title: "Deploy ho sakta hai, par dhyan se" },
    safe: { color: "#5dd97c", icon: "✅", title: "Deploy karna safe hai" },
  };
  const v = V[data.verdict] || V.safe;

  const ACT: Record<string, { label: string; color: string; icon: string }> = {
    taking_test: { label: "Test de raha hai", color: "#ff6b6b", icon: "📝" },
    reading: { label: "Padh raha hai", color: "#4A90D9", icon: "📖" },
    checkout: { label: "Payment kar raha hai", color: GOLD, icon: "💳" },
    browsing: { label: "Dekh raha hai", color: "#9a917f", icon: "👀" },
  };

  const list = (data.online || []).filter((o: any) => o.active_now);
  const recent = (data.online || []).filter((o: any) => !o.active_now);

  return (
    <div>
      {/* Deploy karna chahiye ya nahi */}
      <div
        style={{
          background: CARD, border: `1px solid ${v.color}55`, borderLeft: `5px solid ${v.color}`,
          borderRadius: 14, padding: 16, marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 16.5, fontWeight: 800, color: v.color }}>
          {v.icon} {v.title}
        </div>
        <div style={{ fontSize: 13, color: "#c8c0ae", marginTop: 6, lineHeight: 1.6 }}>{data.note}</div>
        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 12.5, flexWrap: "wrap" }}>
          <span style={{ color: "#9a917f" }}>Abhi active: <b style={{ color: "#5dd97c" }}>{data.active_now}</b></span>
          <span style={{ color: "#9a917f" }}>Test me: <b style={{ color: data.in_test ? "#ff6b6b" : "#e0dacb" }}>{data.in_test}</b></span>
          <span style={{ color: "#9a917f" }}>15 min me: <b style={{ color: "#e0dacb" }}>{data.seen_15min}</b></span>
        </div>
      </div>

      {list.length === 0 && recent.length === 0 && (
        <div style={{ background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 12, padding: 16, fontSize: 13, color: "#9a917f", textAlign: "center", lineHeight: 1.6 }}>
          Abhi koi online nahi hai.<br />
          <span style={{ fontSize: 11.5 }}>
            Agar hamesha khaali dikhe to ActivityBeacon website me lagana reh gaya hoga.
          </span>
        </div>
      )}

      {list.length > 0 && (
        <div style={{ fontSize: 11, letterSpacing: 1, fontWeight: 800, color: "#5dd97c", marginBottom: 8 }}>
          ABHI ONLINE ({list.length})
        </div>
      )}
      {list.map((o: any) => {
        const a = ACT[o.activity] || ACT.browsing;
        return (
          <div
            key={o.user_id}
            style={{
              display: "flex", alignItems: "center", gap: 11, background: CARD,
              border: `1px solid ${o.activity === "taking_test" ? "#ff6b6b55" : BORDER}`,
              borderRadius: 12, padding: 12, marginBottom: 8,
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>{a.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {o.name}
                <span style={{ fontSize: 11, color: "#7a7263", fontWeight: 600 }}> · {o.phone || `#${o.user_id}`}</span>
              </div>
              <div style={{ fontSize: 11.5, color: a.color, fontWeight: 700, marginTop: 2 }}>
                {a.label}
                {o.page && <span style={{ color: "#9a917f", fontWeight: 600 }}> — {o.page}</span>}
              </div>
            </div>
            <span style={{ fontSize: 10.5, color: "#7a7263", flexShrink: 0 }}>
              {o.minutes_ago < 1 ? "abhi" : `${Math.round(o.minutes_ago)}m`}
            </span>
          </div>
        );
      })}

      {recent.length > 0 && (
        <>
          <div style={{ fontSize: 11, letterSpacing: 1, fontWeight: 800, color: "#7a7263", margin: "16px 0 8px" }}>
            THODI DER PEHLE ({recent.length})
          </div>
          {recent.map((o: any) => (
            <div key={o.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", fontSize: 12, color: "#9a917f", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {o.name} — {o.page || "—"}
              </span>
              <span style={{ fontSize: 10.5, flexShrink: 0 }}>{Math.round(o.minutes_ago)}m pehle</span>
            </div>
          ))}
        </>
      )}

      <div style={{ fontSize: 11, color: "#7a7263", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
        Har 15 second apne aap refresh hota hai.<br />
        "Abhi online" = pichhle 5 minute me active.
      </div>
    </div>
  );
}


// ── SEO Coach — asli data dekh kar batata hai ab kya karna hai ───────────────
function SeoTab({ onGo }: { onGo: (tab: any) => void }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [done, setDone] = useState<Record<number, boolean>>({});

  useEffect(() => {
    api("/admin-extra/seo/next-steps")
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const COLORS: Record<string, string> = { high: "#ff6b6b", medium: "#FFAB00", low: "#5dd97c" };
  const LABELS: Record<string, string> = { high: "PEHLE YE KARO", medium: "ISKE BAAD", low: "SAB THEEK HAI" };

  if (loading) return <Muted>Aapka data dekh rahe hain…</Muted>;
  if (error) return <ErrorBox msg={error} />;
  if (!data) return null;

  const s = data.stats || {};
  const high = (data.tasks || []).filter((t: any) => t.priority === "high").length;

  return (
    <div>
      {/* Ek nazar me */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, color: "#c8c0ae", lineHeight: 1.6 }}>
          Ye aapke asli data — blog, courses, images — ko dekh kar batata hai ki Google se
          free traffic laane ke liye ab kya karna chahiye. Upar wale kaam sabse zyada asar dalte hain.
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 12.5, flexWrap: "wrap" }}>
          <span style={{ color: "#9a917f" }}>Blog posts: <b style={{ color: "#e0dacb" }}>{s.posts ?? 0}</b></span>
          <span style={{ color: "#9a917f" }}>Pichhle 30 din: <b style={{ color: (s.posts_30d ?? 0) >= 2 ? "#5dd97c" : "#ff6b6b" }}>{s.posts_30d ?? 0}</b></span>
          <span style={{ color: "#9a917f" }}>Courses: <b style={{ color: "#e0dacb" }}>{s.courses ?? 0}</b></span>
        </div>
        {high > 0 && (
          <div style={{ fontSize: 12.5, color: "#ff6b6b", marginTop: 10, fontWeight: 700 }}>
            {high} kaam abhi karne layak hain
          </div>
        )}
      </div>

      {(data.tasks || []).map((t: any, i: number) => {
        const col = COLORS[t.priority] || "#9a917f";
        const isDone = done[i];
        return (
          <div
            key={i}
            style={{
              background: CARD, border: `1px solid ${col}44`, borderLeft: `4px solid ${col}`,
              borderRadius: 13, padding: 14, marginBottom: 10, opacity: isDone ? 0.5 : 1,
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: 1, fontWeight: 800, color: col, marginBottom: 5 }}>
              {LABELS[t.priority]}
            </div>
            <div style={{ fontWeight: 800, fontSize: 14.5, lineHeight: 1.4, textDecoration: isDone ? "line-through" : "none" }}>
              {t.title}
            </div>

            <div style={{ fontSize: 12.5, color: "#9a917f", marginTop: 6, lineHeight: 1.6 }}>
              <b style={{ color: "#c8c0ae" }}>Kyun: </b>{t.why}
            </div>
            <div style={{ fontSize: 12.5, color: "#c8c0ae", marginTop: 6, lineHeight: 1.6 }}>
              <b style={{ color: col }}>Karna kya hai: </b>{t.action}
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 9, fontSize: 11, color: "#7a7263", flexWrap: "wrap" }}>
              <span>⏱ {t.effort}</span>
              <span style={{ flex: 1, minWidth: 140 }}>💡 {t.impact}</span>
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
              {t.link && (
                <button
                  onClick={() => onGo(t.link)}
                  style={{ ...smallBtn, borderColor: col, color: col, padding: "7px 14px" }}
                >
                  Wahan le chalo →
                </button>
              )}
              <button
                onClick={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                style={{ ...smallBtn, padding: "7px 14px", marginLeft: "auto" }}
              >
                {isDone ? "Wapas laao" : "✓ Ho gaya"}
              </button>
            </div>
          </div>
        );
      })}

      <div style={{ fontSize: 11.5, color: "#7a7263", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
        Ye list aapke data se banti hai — blog post likhne ya description sudharne ke baad
        wapas aaiye, list apne aap badal jayegi.
      </div>
    </div>
  );
}


// ── Troubleshooter ───────────────────────────────────────────────────────────
function HealthTab() {
  const [running, setRunning] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [step, setStep] = useState("");
  // Deep diagnostic — background job, progress poll hota hai
  const [deep, setDeep] = useState(false);
  const [progress, setProgress] = useState(0);
  // Sirf counts — poora array rakhne se mobile browser ki memory bhar jaati thi
  const [liveCounts, setLiveCounts] = useState({ ok: 0, warn: 0, fail: 0, total: 0 });
  const [showAll, setShowAll] = useState(false);
  const [runs, setRuns] = useState<any[]>([]);
  // Deep diagnostic ka nateeja — sirf summary, poori report nahi
  const [finishedRun, setFinishedRun] = useState<any>(null);
  const [downloading, setDownloading] = useState(false);
  const [backfill, setBackfill] = useState({ running: false, msg: "" });
  const [debugUid, setDebugUid] = useState("");
  const [recon, setRecon] = useState({ running: false, msg: "" });

  function loadRuns() {
    api("/admin-extra/diagnostics/runs").then((d) => setRuns(d.runs || [])).catch(() => {});
  }
  useEffect(loadRuns, []);

  // Report ko .txt file bana ke download kar deta hai — wahi file share ki ja sakti hai
  async function downloadReport(runId: number) {
    setDownloading(true);
    try {
      const d = await api(`/admin-extra/diagnostics/report/${runId}?fmt=text`);
      const blob = new Blob([d.text || ""], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = d.filename || `diagnostic-${runId}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    } catch (e: any) {
      setError(e.message);
    }
    setDownloading(false);
  }

  async function runDeep() {
    setRunning(true);
    setDeep(true);
    setError("");
    setData(null);
    setLiveCounts({ ok: 0, warn: 0, fail: 0, total: 0 });
    setFinishedRun(null);
    setShowAll(false);
    setProgress(0);
    setStep("Starting full diagnostic...");
    try {
      const start = await api("/admin-extra/diagnostics/run", "POST");
      const jobId = start.job_id;

      // Har 5 second me sirf progress. Poori report kabhi browser me nahi
      // aati — wo Supabase me save hoti hai aur .txt me download hoti hai.
      // Isse phone ki memory par koi bojh nahi padta.
      for (let i = 0; i < 400; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        let s: any;
        try {
          s = await api(`/admin-extra/diagnostics/status/${jobId}?light=1`);
        } catch {
          continue; // ek poll fail ho gaya to agli baar dekh lenge
        }
        setProgress(s.progress || 0);
        setStep(s.step || "");
        if (s.summary) setLiveCounts(s.summary);
        if (s.state === "done" || s.state === "error") {
          if (s.state === "error") setError(s.error || "Diagnostic failed");
          setFinishedRun({ id: s.run_id ?? null, summary: s.summary || {}, verdict: s.verdict });
          loadRuns();
          break;
        }
      }
    } catch (e: any) {
      setError(e.message);
    }
    setRunning(false);
  }

  async function run() {
    setRunning(true);
    setDeep(false);
    setError("");
    setData(null);
    // Chhote steps dikhate hain taaki lage kuch ho raha hai
    const steps = [
      "Database se connection check kar rahe hain...",
      "Tables aur columns dekh rahe hain...",
      "Naye features ke columns verify ho rahe hain...",
      "Environment variables check ho rahe hain...",
      "Courses aur tests ka data dekh rahe hain...",
      "Report taiyar ho rahi hai...",
    ];
    let i = 0;
    setStep(steps[0]);
    const tick = setInterval(() => {
      i = Math.min(i + 1, steps.length - 1);
      setStep(steps[i]);
    }, 700);

    try {
      const d = await api("/admin-extra/health-check");
      // Kam se kam 3 second dikhaate hain — report turant flash na kare
      await new Promise((r) => setTimeout(r, 1200));
      setData(d);
    } catch (e: any) {
      setError(e.message);
    }
    clearInterval(tick);
    setRunning(false);
  }

  const COLORS: Record<string, string> = { ok: "#5dd97c", warn: "#FFAB00", fail: "#ff6b6b" };
  const ICONS: Record<string, string> = { ok: "✓", warn: "!", fail: "✕" };

  // Browser test ke liye pages — jo bhi student dekhta hai
  const [pages, setPages] = useState<{ path: string; label: string }[]>([
    { path: "/", label: "Home" },
    { path: "/courses", label: "Courses list" },
    { path: "/mock-tests", label: "Mock tests list" },
    { path: "/descriptive", label: "Descriptive list" },
    { path: "/my-learning", label: "My Learning" },
    { path: "/blog", label: "Blog" },
    { path: "/about", label: "About" },
    { path: "/contact", label: "Contact" },
    { path: "/login", label: "Login" },
  ]);

  // Asli course/series ke detail pages bhi list me jod do
  useEffect(() => {
    (async () => {
      try {
        const [c, s, d] = await Promise.all([
          api("/admin-extra/courses").catch(() => ({ courses: [] })),
          api("/admin-extra/series").catch(() => ({ series: [] })),
          api("/admin-extra/desc/series").catch(() => ({ series: [] })),
        ]);
        const extra: { path: string; label: string }[] = [];
        (c.courses || []).filter((x: any) => x.is_active !== false).slice(0, 4)
          .forEach((x: any) => extra.push({ path: `/course/${x.id}`, label: `Course: ${String(x.title).slice(0, 26)}` }));
        (s.series || []).filter((x: any) => x.is_active !== false).slice(0, 3)
          .forEach((x: any) => extra.push({ path: `/mock-tests/${x.id}`, label: `Mock series: ${String(x.title).slice(0, 22)}` }));
        (d.series || []).filter((x: any) => x.is_active !== false).slice(0, 3)
          .forEach((x: any) => extra.push({ path: `/descriptive/${x.id}`, label: `Descriptive: ${String(x.title).slice(0, 22)}` }));
        if (extra.length) setPages((p) => [...p, ...extra]);
      } catch {}
    })();
  }, []);

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, marginBottom: 14 }}>
        <div style={{ fontSize: 13.5, color: "#c8c0ae", lineHeight: 1.6 }}>
          Ye tool poore system ki jaanch karta hai — tables, columns, environment variables,
          aur aapke courses/tests ka data. Kuch toota hua ho to students tak pahunchne se pehle
          yahin pata chal jayega.
        </div>
        <button onClick={run} disabled={running} style={{ ...smallBtn, width: "100%", marginTop: 12, padding: "11px 0", opacity: running ? 0.6 : 1 }}>
          {running && !deep ? "Checking..." : "⚡ Quick check (10 seconds)"}
        </button>
        <button onClick={runDeep} disabled={running} style={{ ...goldBtn, width: "100%", marginTop: 8, opacity: running ? 0.6 : 1 }}>
          {running && deep ? "Deep diagnostic running..." : "🔬 Full diagnostic (2-15 minutes)"}
        </button>
        <p style={{ fontSize: 11, color: "#9a917f", margin: "8px 0 0", lineHeight: 1.55 }}>
          Full diagnostic ek temporary user banata hai, use saare courses aur series grant karta hai,
          asli mock test deta hai, PDF kholta hai, har image download karke check karta hai — aur
          aakhir me wo user delete kar deta hai. Aapke numbers par koi asar nahi padta.
        </p>
      </div>

      {running && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, color: "#c8c0ae", textAlign: "center" }}>{step}</div>
          {deep && (
            <>
              <div style={{ height: 8, borderRadius: 5, background: "rgba(255,255,255,0.08)", marginTop: 12, overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: GOLD, borderRadius: 5, transition: "width .4s" }} />
              </div>
              <div style={{ fontSize: 11.5, color: "#9a917f", textAlign: "center", marginTop: 6 }}>
                {progress}% · {liveCounts.total} checks done
              </div>
              <div style={{ fontSize: 11, color: "#7a7263", textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
                Ye server par chal raha hai — page band karke baad me bhi aa sakte ho,
                report Saved reports me mil jayegi.
              </div>
              {liveCounts.fail > 0 && (
                <div style={{ fontSize: 12, color: "#ff6b6b", marginTop: 10, fontWeight: 700, textAlign: "center" }}>
                  ✕ {liveCounts.fail} problems found so far
                </div>
              )}
            </>
          )}
        </div>
      )}

      {error && <ErrorBox msg={error} />}

      {finishedRun && !running && (
        <div
          style={{
            background: CARD,
            border: `1px solid ${(finishedRun.verdict === "fail" ? "#ff6b6b" : finishedRun.verdict === "warn" ? GOLD : "#5dd97c")}55`,
            borderLeft: `5px solid ${finishedRun.verdict === "fail" ? "#ff6b6b" : finishedRun.verdict === "warn" ? GOLD : "#5dd97c"}`,
            borderRadius: 14, padding: 16, marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: finishedRun.verdict === "fail" ? "#ff6b6b" : finishedRun.verdict === "warn" ? GOLD : "#5dd97c" }}>
            Diagnostic complete
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 8, fontSize: 13, fontWeight: 700 }}>
            <span style={{ color: "#5dd97c" }}>✓ {finishedRun.summary.ok || 0}</span>
            <span style={{ color: GOLD }}>! {finishedRun.summary.warn || 0}</span>
            <span style={{ color: "#ff6b6b" }}>✕ {finishedRun.summary.fail || 0}</span>
          </div>
          <div style={{ fontSize: 12, color: "#9a917f", marginTop: 8, lineHeight: 1.55 }}>
            Poori report Supabase me save ho gayi hai. Neeche se .txt download kar lijiye —
            report browser me nahi kholi jaati taaki phone ki memory par bojh na pade.
          </div>
          {finishedRun.id && (
            <button onClick={() => downloadReport(finishedRun.id)} disabled={downloading}
              style={{ ...goldBtn, width: "100%", marginTop: 12, opacity: downloading ? 0.6 : 1 }}>
              {downloading ? "Preparing..." : "⬇ Download full report (.txt)"}
            </button>
          )}
        </div>
      )}

      {data && !running && (
        <>
          {/* Download — ye file share kar sakte ho */}
          {data.run_id && (
            <button
              onClick={() => downloadReport(data.run_id)}
              disabled={downloading}
              style={{ ...goldBtn, width: "100%", marginBottom: 12, opacity: downloading ? 0.6 : 1 }}
            >
              {downloading ? "Preparing..." : "⬇ Download full report (.txt)"}
            </button>
          )}

          {/* Summary */}
          <div
            style={{
              background: CARD,
              border: `1px solid ${COLORS[data.verdict]}55`,
              borderLeft: `5px solid ${COLORS[data.verdict]}`,
              borderRadius: 14, padding: 16, marginBottom: 14,
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: COLORS[data.verdict] }}>
              {data.verdict === "ok" ? "✓ Sab theek hai" : data.verdict === "warn" ? "! Kuch dhyan dene layak baatein" : "✕ Kuch cheezein tooti hain"}
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: 13, fontWeight: 700 }}>
              <span style={{ color: "#5dd97c" }}>✓ {data.summary.ok} theek</span>
              <span style={{ color: "#FFAB00" }}>! {data.summary.warn} dhyan do</span>
              <span style={{ color: "#ff6b6b" }}>✕ {data.summary.fail} tooti</span>
            </div>
            {data.summary.fail > 0 && (
              <div style={{ fontSize: 12, color: "#9a917f", marginTop: 8, lineHeight: 1.55 }}>
                Laal wali cheezein pehle theek kijiye — inse students ko sach me problem aayegi.
              </div>
            )}
          </div>

          {/* Laal pehle, phir peela, phir hara */}
          {["fail", "warn", "ok"].map((level) => {
            const items = data.checks.filter((c: any) => c.status === level);
            if (items.length === 0) return null;
            return (
              <div key={level} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, letterSpacing: 1.2, fontWeight: 800, color: COLORS[level], marginBottom: 8 }}>
                  {level === "fail" ? "TOOTA HUA" : level === "warn" ? "DHYAN DEIN" : "THEEK HAI"} ({items.length})
                </div>
                {(level === "ok" && !showAll ? items.slice(0, 25) : items).map((c: any, i: number) => (
                  <div
                    key={i}
                    style={{
                      display: "flex", gap: 10, background: CARD,
                      border: `1px solid ${level === "ok" ? BORDER : COLORS[level] + "44"}`,
                      borderRadius: 11, padding: "10px 12px", marginBottom: 6,
                    }}
                  >
                    <span style={{ color: COLORS[level], fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{ICONS[level]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>
                        {c.name}
                        {c.group && (
                          <span style={{ fontSize: 10, color: "#7a7263", fontWeight: 600, marginLeft: 6 }}>{c.group}</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 2, lineHeight: 1.5 }}>{c.message}</div>
                      {c.fix && (
                        <div style={{ fontSize: 11.5, color: COLORS[level], marginTop: 4, lineHeight: 1.5 }}>
                          → {c.fix}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {level === "ok" && !showAll && items.length > 25 && (
                  <button
                    onClick={() => setShowAll(true)}
                    style={{ ...smallBtn, width: "100%", padding: "9px 0", fontSize: 12 }}
                  >
                    Show all {items.length} passing checks
                  </button>
                )}
              </div>
            );
          })}

          <div style={{ fontSize: 11, color: "#7a7263", textAlign: "center", marginTop: 8 }}>
            Check chala: {new Date(data.checked_at || data.finished_at).toLocaleString("en-IN")}
          </div>
        </>
      )}

      {/* ── Pending payments — paisa aaya par access nahi mila ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 24, paddingTop: 18 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>
          💳 Pending <span style={{ color: GOLD }}>payments</span>
        </h3>
        <p style={{ fontSize: 12, color: "#9a917f", margin: "0 0 12px", lineHeight: 1.55 }}>
          Kabhi student payment ke turant baad app band kar deta hai ya net chala jata hai —
          tab paisa Razorpay ke paas pahunch jata hai par access nahi milta.
          Ye button Razorpay se poochh kar aise sabhi logon ko access de deta hai.
          <b style={{ color: "#e0dacb" }}> Razorpay se confirm hue bina kisi ko kuch nahi milta.</b>
        </p>
        <button
          onClick={async () => {
            setRecon({ running: true, msg: "" });
            try {
              const d = await api("/payments/reconcile?hours=168", "POST");
              const lines = (d.details || []).map(
                (x: any) => `• user ${x.user_id} — ${x.title || x.product}`);
              setRecon({
                running: false,
                msg: `${d.message}\n\n${lines.join("\n")}${
                  d.still_unpaid ? `\n\n${d.still_unpaid} orders par payment sach me nahi aaya.` : ""
                }`,
              });
            } catch (e: any) {
              setRecon({ running: false, msg: `Error: ${e.message}` });
            }
          }}
          disabled={recon.running}
          style={{ ...goldBtn, width: "100%", opacity: recon.running ? 0.6 : 1 }}
        >
          {recon.running ? "Razorpay se check kar rahe hain..." : "💳 Atke hue payments theek karo"}
        </button>
        {recon.msg && (
          <div
            style={{
              fontSize: 12, color: recon.msg.startsWith("Error") ? "#ff6b6b" : "#c8c0ae",
              marginTop: 9, lineHeight: 1.65, whiteSpace: "pre-wrap",
              background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12,
              maxHeight: 300, overflowY: "auto",
            }}
          >
            {recon.msg}
          </div>
        )}
      </div>

      {/* ── Bundle backfill — purane buyers ko unka saaman de do ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 24, paddingTop: 18 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>
          🎁 Bundle <span style={{ color: GOLD }}>access fix</span>
        </h3>
        <p style={{ fontSize: 12, color: "#9a917f", margin: "0 0 12px", lineHeight: 1.55 }}>
          Jinhone bundle kharida par mock/descriptive nahi mila — sabko ek saath de deta hai.
          Safe hai: jo pehle se hai wo dobara nahi banega, aur revenue par koi asar nahi.
        </p>
        {/* Ek user par debug — kahan toot raha hai */}
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            placeholder="User ID daaliye (Users tab me milta hai)"
            value={debugUid}
            onChange={(e) => setDebugUid(e.target.value)}
          />
          <button
            onClick={async () => {
              if (!debugUid.trim()) return;
              setBackfill({ running: true, msg: "" });
              try {
                const d = await api(`/admin-extra/bundles/debug?user_id=${debugUid.trim()}`);
                const lines = (d.steps || []).map((s: any) => `${s.ok ? "✓" : "✗"} ${s.step}: ${s.detail}`);
                setBackfill({ running: false, msg: `${d.verdict}\n\n${lines.join("\n")}` });
              } catch (e: any) {
                setBackfill({ running: false, msg: `Error: ${e.message}` });
              }
            }}
            disabled={backfill.running}
            style={{ ...smallBtn, padding: "10px 14px", whiteSpace: "nowrap" }}
          >
            🔍 Check
          </button>
        </div>

        <button
          onClick={async () => {
            setBackfill({ running: true, msg: "" });
            try {
              const d = await api("/admin-extra/bundles/backfill", "POST");
              setBackfill({ running: false, msg: d.message || "Ho gaya" });
            } catch (e: any) {
              setBackfill({ running: false, msg: `Error: ${e.message}` });
            }
          }}
          disabled={backfill.running}
          style={{ ...goldBtn, width: "100%", opacity: backfill.running ? 0.6 : 1 }}
        >
          {backfill.running ? "Check kar rahe hain..." : "🎁 Sabko bundle access de do"}
        </button>
        {backfill.msg && (
          <div
            style={{
              fontSize: 12, color: backfill.msg.startsWith("Error") ? "#ff6b6b" : "#c8c0ae",
              marginTop: 9, lineHeight: 1.65, whiteSpace: "pre-wrap",
              background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12,
              maxHeight: 380, overflowY: "auto", fontFamily: "monospace",
            }}
          >
            {backfill.msg}
          </div>
        )}
      </div>

      {/* ── Saved reports — browser crash ho jaye to bhi yahin milengi ── */}
      {runs.length > 0 && (
        <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 24, paddingTop: 18 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>
            📄 Saved <span style={{ color: GOLD }}>reports</span>
          </h3>
          <p style={{ fontSize: 12, color: "#9a917f", margin: "0 0 12px", lineHeight: 1.55 }}>
            Har diagnostic Supabase me save hoti hai — browser band ho jaye tab bhi.
            Download karke file share kar sakte ho.
          </p>
          {runs.map((r) => {
            const col = r.verdict === "fail" ? "#ff6b6b" : r.verdict === "warn" ? GOLD : "#5dd97c";
            const s = r.summary || {};
            return (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 11, padding: "10px 12px", marginBottom: 6 }}>
                <span style={{ fontSize: 17 }}>{r.kind === "browser" ? "🌐" : "🔬"}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 12.5 }}>
                    <span style={{ color: col }}>{String(r.verdict || r.state).toUpperCase()}</span>
                    <span style={{ color: "#9a917f", fontWeight: 600 }}>
                      {" · "}{s.fail || 0} failed · {s.warn || 0} warn · {s.ok || 0} passed
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#7a7263" }}>
                    {new Date(r.started_at).toLocaleString("en-IN")}
                    {r.state === "running" ? " · still running" : ""}
                  </div>
                </div>
                <button onClick={() => downloadReport(r.id)} disabled={downloading} style={{ ...smallBtn, padding: "6px 11px", fontSize: 11.5 }}>
                  ⬇ .txt
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Browser test — asli pages iframe me khol ke check ── */}
      <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 24, paddingTop: 18 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, margin: "0 0 4px" }}>
          🌐 Browser <span style={{ color: GOLD }}>test</span>
        </h3>
        <p style={{ fontSize: 12, color: "#9a917f", margin: "0 0 12px" }}>
          {pages.length} pages · phone aur desktop dono par
        </p>
        <BrowserTest pages={pages} api={api} />
      </div>
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
  // Bundle picker ke liye — doosre products ki list
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [allDesc, setAllDesc] = useState<any[]>([]);

  function load() {
    api("/admin-extra/courses")
      .then((d) => setCourses(d.courses || []))
      .catch((e) => setError(e.message));
    api("/admin-extra/series").then((d) => setAllSeries(d.series || [])).catch(() => {});
    api("/admin-extra/desc/series").then((d) => setAllDesc(d.series || [])).catch(() => {});
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
    if (!confirm("Course hide ho jayega (app + website se). Jinhone kharida hai unka access CHALTA RAHEGA. Pakka?")) return;
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
        <ImageField
          label="🖥️ Course thumbnail — desktop"
          value={editing.thumbnail_url || ""}
          onChange={(v) => setEditing({ ...editing, thumbnail_url: v })}
          reqW={1280}
          reqH={720}
          where="Course card jab website computer/laptop par khule"
          hint="Image pehle i.ibb.co par upload kijiye, phir uska https link yahan paste kijiye."
        />

        <ImageField
          label="📱 Course thumbnail — mobile (optional)"
          value={editing.thumbnail_url_mobile || ""}
          onChange={(v) => setEditing({ ...editing, thumbnail_url_mobile: v })}
          reqW={1080}
          reqH={1080}
          where="Course card phone par (app + mobile website). Khaali chhodenge to desktop wali hi chalegi."
          hint="Square image — phone par poster bada aur saaf dikhta hai. Zyadatar students yahi dekhenge."
        />
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
        <Field label="Show on (kahan dikhe)">
          <select
            style={inputStyle}
            value={editing.visible_on || "both"}
            onChange={(e) => setEditing({ ...editing, visible_on: e.target.value })}
          >
            <option value="both">Both — App + Website</option>
            <option value="app">App only</option>
            <option value="web">Website only</option>
            <option value="hidden">🚫 Hidden — kahin nahi dikhega (draft)</option>
          </select>
        </Field>
        <div style={{ marginBottom: 12 }}>
          <BundlePicker
            value={editing.bundle_items || []}
            onChange={(v) => setEditing({ ...editing, bundle_items: v })}
            courses={courses}
            series={allSeries}
            desc={allDesc}
            selfType="course"
            selfId={editing.id}
          />
        </div>
        <Field label="Features (comma separated)">
          <input style={inputStyle} value={editing.features || ""} onChange={(e) => setEditing({ ...editing, features: e.target.value })} />
        </Field>
        <Field label="Telegram group link (is exam ka dedicated group)">
          <input
            style={inputStyle}
            placeholder="https://t.me/your_group_link"
            value={editing.telegram_group || ""}
            onChange={(e) => setEditing({ ...editing, telegram_group: e.target.value })}
          />
          <div style={{ fontSize: 11, color: "#9a917f", marginTop: -6, marginBottom: 8 }}>
            Course page par sabko dikhega — jisne khareeda ho ya na ho. Khaali chhodenge to button nahi aayega.
          </div>
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
              {c.title} {c.is_featured && <span style={{ color: GOLD }}>★</span>}<HiddenTag on={c.visible_on} />
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
    if (!confirm("Ye video/PDF course se hat jayega. Pakka?")) return;
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
// 15 = Section, 16 = Question image (DI chart), 17 = Explanation image (reasoning diagram)
// Text me **bold** aur __underline__ likh sakte hain — dono jagah waise hi dikhenge.
// ── Rich text: **bold**, __underline__, *italic* ─────────────────────────────
// Question me "underlined word" ya "bold word" likha ho to wo dikhna chahiye.
// CSV me markers laga dijiye:
//   **pejorative**   → bold
//   __pejorative__   → underlined
//   *pejorative*     → italic
// Baaki text jaisa hai waisa hi rehta hai. Newlines pre-wrap se sambhalte hain.
function RichText({ text, style }: { text?: string | null; style?: React.CSSProperties }) {
  if (!text) return null;

  // Sabse lambe marker pehle — warna ** ko * do baar padh lega
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(<b key={k++}>{tok.slice(2, -2)}</b>);
    } else if (tok.startsWith("__")) {
      parts.push(<u key={k++}>{tok.slice(2, -2)}</u>);
    } else {
      parts.push(<i key={k++}>{tok.slice(1, -1)}</i>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <span style={{ whiteSpace: "pre-wrap", ...style }}>{parts}</span>;
}

function parseCSV(text: string): string[][] {
  // Separator apne aap pakadta hai: Excel/Sheets se paste karo to TAB milta hai,
  // asli .csv file me comma. Pehli line dekh ke decide karte hain — jisme zyada
  // fields banein wahi sahi separator hai.
  const firstLine = (text.split(/\r?\n/).find((l) => l.trim() !== "") || "");
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const SEP = tabCount >= commaCount && tabCount > 0 ? "\t" : ",";

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
    } else if (ch === SEP) {
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

// ── Quality audit: upload se pehle har row check ─────────────────────────────
// Missing Hindi, missing explanation, galat script, gibberish, duplicate —
// sab yahan pakda jata hai. Sirf batata hai, rokta nahi (Errors ke alawa).

const DEVANAGARI = /[\u0900-\u097F]/;
const LATIN = /[A-Za-z]/;

type Issue = { row: number; level: "error" | "warn"; what: string };

// Hindi field me Devanagari hai ya nahi
function looksHindi(s: string): boolean {
  if (!s) return false;
  const dev = (s.match(/[\u0900-\u097F]/g) || []).length;
  const lat = (s.match(/[A-Za-z]/g) || []).length;
  return dev > 0 && dev >= lat;   // thoda English (SSC, RRB, 2024) chalega
}

// Bakwaas / toota hua text pakadta hai
function looksGibberish(s: string): boolean {
  if (!s) return false;
  const t = s.trim();
  if (t.length < 2) return false;
  if (/[\uFFFD]/.test(t)) return true;                    // � = encoding toot gayi
  if (/(.)\1{5,}/.test(t)) return true;                   // aaaaaaa / -------
  if (/^[^\w\u0900-\u097F]+$/.test(t)) return true;       // sirf symbols
  // Lambi Latin string bina kisi vowel ke — asli shabd nahi ho sakta
  const words = t.split(/\s+/);
  for (const w of words) {
    if (w.length >= 7 && LATIN.test(w) && !/[aeiouAEIOU]/.test(w) && !/\d/.test(w)) return true;
  }
  return false;
}

function auditRows(rows: any[]): { issues: Issue[]; stats: Record<string, number> } {
  const issues: Issue[] = [];
  const stats = { noHindi: 0, partialHindi: 0, noExpEn: 0, noExpHi: 0, gibberish: 0, dupOptions: 0, dupQuestion: 0, noTopic: 0, badMarkup: 0, needsMarkup: 0 };
  const seen = new Map<string, number>();

  rows.forEach((q, idx) => {
    const n = idx + 1;
    const hiFields = [q.question_hi, q.option_a_hi, q.option_b_hi, q.option_c_hi, q.option_d_hi];
    const hiFilled = hiFields.filter((v) => v && String(v).trim());

    // ── Hindi translation ──
    if (hiFilled.length === 0) {
      stats.noHindi++;
      issues.push({ row: n, level: "warn", what: "Hindi translation nahi hai" });
    } else if (hiFilled.length < 5) {
      stats.partialHindi++;
      issues.push({ row: n, level: "warn", what: `Hindi adhoora — ${5 - hiFilled.length} field khaali` });
    } else {
      // Hindi column me Hindi hai bhi ya English chipka diya?
      const wrongScript = hiFields.filter((v) => v && !looksHindi(String(v)));
      if (wrongScript.length > 0) {
        issues.push({ row: n, level: "error", what: `Hindi column me Hindi nahi hai (${wrongScript.length} field English/roman me)` });
      }
    }

    // English column me Devanagari — columns aage-peeche ho gaye
    const enFields = [q.question_en, q.option_a_en, q.option_b_en, q.option_c_en, q.option_d_en];
    if (enFields.some((v) => v && DEVANAGARI.test(String(v)))) {
      issues.push({ row: n, level: "error", what: "English column me Hindi text hai — columns shayad shift ho gaye" });
    }

    // ── Explanation ──
    if (!q.explanation_en || !String(q.explanation_en).trim()) {
      stats.noExpEn++;
      issues.push({ row: n, level: "warn", what: "Explanation (English) khaali hai" });
    }
    if (hiFilled.length > 0 && (!q.explanation_hi || !String(q.explanation_hi).trim())) {
      stats.noExpHi++;
      issues.push({ row: n, level: "warn", what: "Explanation (Hindi) khaali hai" });
    }

    // ── Gibberish ──
    const all = [...enFields, ...hiFields, q.explanation_en, q.explanation_hi];
    const bad = all.filter((v) => v && looksGibberish(String(v)));
    if (bad.length > 0) {
      stats.gibberish++;
      issues.push({ row: n, level: "error", what: `Text tooti hui lag rahi hai: "${String(bad[0]).slice(0, 40)}"` });
    }

    // ── Bold / underline markers ──
    // **bold** aur __underline__ jodon me aane chahiye. Aadha marker chhoot
    // jaye to student ko ** dikhega — isliye pakad lete hain.
    const marked = [...enFields, ...hiFields, q.explanation_en, q.explanation_hi];
    for (const v of marked) {
      if (!v) continue;
      const t = String(v);
      const stars = (t.match(/\*\*/g) || []).length;
      const unders = (t.match(/__/g) || []).length;
      if (stars % 2 !== 0 || unders % 2 !== 0) {
        stats.badMarkup++;
        issues.push({ row: n, level: "error", what: "Bold/underline marker adhoora hai (** ya __ jodi me nahi) — student ko ye symbol dikh jayenge" });
        break;
      }
    }

    // Question "underlined/bold word" maang raha hai par koi marker hi nahi
    const qAll = `${q.question_en || ""} ${q.question_hi || ""}`.toLowerCase();
    const asksMarkup = /underlin|रेखांकित|bold|मोटे/.test(qAll);
    const hasMarkup = /\*\*[^*]+\*\*|__[^_]+__/.test(`${q.question_en || ""}${q.question_hi || ""}`);
    if (asksMarkup && !hasMarkup) {
      stats.needsMarkup++;
      issues.push({ row: n, level: "error", what: "Question 'underlined/bold word' maang raha hai par koi word marked nahi — **word** ya __word__ laga dijiye" });
    }

    // ── Options ──
    const opts = [q.option_a_en, q.option_b_en, q.option_c_en, q.option_d_en].map((v) => String(v || "").trim());
    if (opts.some((o) => !o)) {
      issues.push({ row: n, level: "error", what: "Koi option khaali hai" });
    } else if (new Set(opts.map((o) => o.toLowerCase())).size < 4) {
      stats.dupOptions++;
      issues.push({ row: n, level: "error", what: "Do options bilkul same hain" });
    }

    // ── Question chhota / duplicate ──
    const qt = String(q.question_en || "").trim();
    if (qt.length < 8) {
      issues.push({ row: n, level: "error", what: "Question bahut chhota hai — adhoora lag raha hai" });
    }
    const key = qt.toLowerCase().replace(/\s+/g, " ");
    if (key && seen.has(key)) {
      stats.dupQuestion++;
      issues.push({ row: n, level: "warn", what: `Row ${seen.get(key)} se bilkul same question` });
    } else if (key) {
      seen.set(key, n);
    }

    if (!q.topic || !String(q.topic).trim()) stats.noTopic++;
  });

  return { issues, stats };
}

function QualityReport({ rows }: { rows: any[] }) {
  const [showAll, setShowAll] = useState(false);
  if (!rows || rows.length === 0) return null;

  const { issues, stats } = auditRows(rows);
  const errors = issues.filter((i) => i.level === "error");
  const warns = issues.filter((i) => i.level === "warn");

  if (issues.length === 0) {
    return (
      <div style={{ marginTop: 10, background: "rgba(93,217,124,0.09)", border: "1px solid rgba(93,217,124,0.35)", borderRadius: 12, padding: 12 }}>
        <div style={{ fontSize: 13, color: "#5dd97c", fontWeight: 700 }}>
          ✓ Quality check paas — sab {rows.length} questions me Hindi, explanation aur options theek hain
        </div>
      </div>
    );
  }

  const shown = showAll ? issues : issues.slice(0, 12);

  return (
    <div style={{ marginTop: 10, background: CARD, border: `1px solid ${errors.length ? "rgba(255,107,107,0.45)" : "rgba(255,171,0,0.4)"}`, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8, color: errors.length ? "#ff6b6b" : GOLD }}>
        {errors.length > 0 ? `⚠️ ${errors.length} serious problem` : "⚠️ Dhyaan dijiye"}
        {warns.length > 0 && <span style={{ color: "#9a917f", fontWeight: 600 }}> · {warns.length} warning</span>}
      </div>

      {/* Ek nazar me summary */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
        {stats.noHindi > 0 && <Chip label={`${stats.noHindi} bina Hindi`} />}
        {stats.partialHindi > 0 && <Chip label={`${stats.partialHindi} adhoori Hindi`} />}
        {stats.noExpEn > 0 && <Chip label={`${stats.noExpEn} bina explanation`} />}
        {stats.noExpHi > 0 && <Chip label={`${stats.noExpHi} bina Hindi explanation`} />}
        {stats.gibberish > 0 && <Chip label={`${stats.gibberish} tooti text`} danger />}
        {stats.dupOptions > 0 && <Chip label={`${stats.dupOptions} same options`} danger />}
        {stats.dupQuestion > 0 && <Chip label={`${stats.dupQuestion} duplicate question`} />}
        {stats.needsMarkup > 0 && <Chip label={`${stats.needsMarkup} bina underline/bold`} danger />}
        {stats.badMarkup > 0 && <Chip label={`${stats.badMarkup} adhoora marker`} danger />}
        {stats.noTopic > 0 && <Chip label={`${stats.noTopic} bina topic`} />}
      </div>

      <div style={{ maxHeight: showAll ? 340 : "none", overflowY: showAll ? "auto" : "visible" }}>
        {shown.map((it, i) => (
          <div key={i} style={{ fontSize: 12, color: "#c8c0ae", padding: "4px 0", borderBottom: i < shown.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", lineHeight: 1.5 }}>
            <span style={{ color: it.level === "error" ? "#ff6b6b" : GOLD, fontWeight: 800 }}>
              {it.level === "error" ? "✕" : "!"} Row {it.row}
            </span>{" "}
            {it.what}
          </div>
        ))}
      </div>

      {issues.length > 12 && (
        <button onClick={() => setShowAll(!showAll)} style={{ ...ghostBtn, marginTop: 8, padding: "7px 12px", fontSize: 12 }}>
          {showAll ? "Kam dikhaiye" : `Baaki ${issues.length - 12} bhi dekhiye`}
        </button>
      )}

      <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 9, lineHeight: 1.55 }}>
        Upload rok nahi raha — chaho to abhi bhi upload kar sakte ho. Par ✕ wale rows students ko galat dikhenge.
      </div>
    </div>
  );
}

function Chip({ label, danger }: { label: string; danger?: boolean }) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
      color: danger ? "#ff6b6b" : GOLD,
      background: danger ? "rgba(255,107,107,0.12)" : "rgba(255,171,0,0.12)",
      border: `1px solid ${danger ? "rgba(255,107,107,0.3)" : "rgba(255,171,0,0.3)"}`,
    }}>
      {label}
    </span>
  );
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
        setParseErr(
          `Row ${i + 1}: kam se kam 8 columns chahiye (Question, A, B, C, D, Answer, Explanation, Topic) — mile ${r.length}. ` +
            `Hindi ke liye 14 columns, Section ke saath 15, images ke saath 17. Excel/Sheets se paste karo to TAB apne aap chalta hai.`
        );
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
        image_url: r[15] || null,   // DI chart / diagram ka link
        explanation_image_url: r[16] || null,   // Reasoning ka solution diagram
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
          8 columns: Question, A, B, C, D, Answer (A/B/C/D), Explanation, Topic. Optional: +6 Hindi columns (Question, A, B, C, D, Explanation in Hindi), then column 15 = Section name (e.g. General Awareness), column 16 = Image URL for DI charts, tables or diagrams, and column 17 = Explanation image (reasoning ka diagram — seating arrangement, family tree, puzzle grid). For a DI set where 5 questions share one chart, put the same link in all 5 rows.
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

        <input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" onChange={handleFile} style={{ marginBottom: 12, fontSize: 13 }} />

        <textarea
          placeholder={'Or paste CSV here...\nEnglish only:  What is 2+2?,2,3,4,5,C,Simple addition,Arithmetic\nBilingual:     What is 2+2?,2,3,4,5,C,Simple addition,Arithmetic,2+2 kitna hai?,2,3,4,5,Saral jod'}
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
        {parsed.length > 0 && !parseErr && (() => {
          const withImg = parsed.filter((p: any) => p.image_url);
          return (
            <div style={{ marginTop: 12 }}>
              <p style={{ color: "#5dd97c", fontSize: 13, margin: 0 }}>
                ✓ {parsed.length} questions parsed. Preview of first: "{parsed[0].question_en.slice(0, 60)}..."
              </p>

              {/* DI charts — upload se pehle dekh lijiye ki link sach me khulte hain */}
              {withImg.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, color: "#c8c0ae", marginBottom: 7 }}>
                    🖼️ {withImg.length} questions me chart/image hai — check kar lijiye sahi khul rahe hain:
                  </div>
                  <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
                    {Array.from(new Set(withImg.map((p: any) => p.image_url))).slice(0, 8).map((u: any) => (
                      <img
                        key={u}
                        src={u}
                        alt=""
                        style={{ height: 90, borderRadius: 8, border: `1px solid ${BORDER}`, background: "#fff", flexShrink: 0 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <QualityReport rows={parsed} />
            </div>
          );
        })()}
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
  const [sForm, setSForm] = useState<any>({ title: "", description: "", price: "0", original_price: "0", visible_on: "both", thumbnail_url: "", thumbnail_url_mobile: "", bundle_items: [], telegram_group: "" });
  const [bCourses, setBCourses] = useState<any[]>([]);
  const [bDesc, setBDesc] = useState<any[]>([]);
  // Live test config — kaunsa test khula hai aur uska form
  const [liveFor, setLiveFor] = useState<any | null>(null);
  const [liveForm, setLiveForm] = useState<any>({});
  const [liveBusy, setLiveBusy] = useState(false);
  const [board, setBoard] = useState<any[] | null>(null);
  const [sEditId, setSEditId] = useState<number | null>(null); // null = naya banao, id = edit karo
  const [sSaving, setSSaving] = useState(false);

  // Chart picker — attach/edit a question's image_url without leaving this tab
  const [chartsFor, setChartsFor] = useState<any | null>(null);
  const [chartQs, setChartQs] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartErr, setChartErr] = useState("");
  const [editingChartQId, setEditingChartQId] = useState<number | null>(null);
  const [chartImgDraft, setChartImgDraft] = useState("");
  const [expImgDraft, setExpImgDraft] = useState("");   // Reasoning ka solution diagram
  const [savingChartImg, setSavingChartImg] = useState(false);

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
    api("/admin-extra/courses").then((d) => setBCourses(d.courses || [])).catch(() => {});
    api("/admin-extra/desc/series").then((d) => setBDesc(d.series || [])).catch(() => {});
  }
  useEffect(load, []);

  function editSeries(s: any) {
    setSEditId(s.id);
    setSForm({
      title: s.title || "",
      description: s.description || "",
      price: String(s.price ?? 0),
      original_price: String(s.original_price ?? 0),
      visible_on: s.visible_on || "both",
      thumbnail_url: s.thumbnail_url || "",
      thumbnail_url_mobile: s.thumbnail_url_mobile || "",
      bundle_items: s.bundle_items || [],
      telegram_group: s.telegram_group || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cancelEditSeries() {
    setSEditId(null);
    setSForm({ title: "", description: "", price: "0", original_price: "0", visible_on: "both", thumbnail_url: "", thumbnail_url_mobile: "", bundle_items: [], telegram_group: "" });
  }

  async function createSeries() {
    if (!sForm.title.trim()) {
      setError("Series title is required");
      return;
    }
    setSSaving(true);
    setError("");
    try {
      const body = {
        title: sForm.title.trim(),
        description: sForm.description.trim() || null,
        price: Number(sForm.price) || 0,
        original_price: Number(sForm.original_price) || 0,
        visible_on: sForm.visible_on || "both",
        thumbnail_url: sForm.thumbnail_url.trim() || null,
        thumbnail_url_mobile: (sForm.thumbnail_url_mobile || "").trim() || null,
        bundle_items: sForm.bundle_items || [],
        telegram_group: (sForm.telegram_group || "").trim() || null,
      };
      if (sEditId) {
        await api(`/admin-extra/series/${sEditId}`, "PUT", body);
      } else {
        await api("/admin-extra/series", "POST", body);
      }
      cancelEditSeries();
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setSSaving(false);
  }

  async function removeSeries(id: number) {
    if (!confirm("Series hide ho jayegi (andar ke tests safe rahenge). Jinhone kharidi hai unka access chalta rahega. Pakka?")) return;
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
        setParseErr(
          `Row ${i + 1}: kam se kam 8 columns chahiye (Question, A, B, C, D, Answer, Explanation, Topic) — mile sirf ${r.length}. ` +
            `Hindi ke liye 14 columns, Section ke saath 15, images ke saath 17. Excel/Sheets se paste karo to TAB apne aap chal jayega.`
        );
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
        image_url: r[15] || null,   // DI chart / diagram ka link
        explanation_image_url: r[16] || null,   // Reasoning ka solution diagram
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

  // datetime-local ("2026-08-15T10:00") -> ISO with timezone
  function toIso(v: string) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d.getTime()) ? null : d.toISOString();
  }
  // ISO -> datetime-local ke liye value
  function toLocalInput(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function openLive(t: any) {
    setBoard(null);
    setLiveFor(t);
    setLiveForm({
      is_live: !!t.is_live,
      live_start_at: toLocalInput(t.live_start_at),
      live_end_at: toLocalInput(t.live_end_at),
      display_boost: String(t.display_boost ?? 0),
      registration_boost: String(t.registration_boost ?? 0),
      telegram_group: t.telegram_group || "",
    });
  }

  async function saveLive() {
    if (!liveFor) return;
    if (liveForm.is_live && (!liveForm.live_start_at || !liveForm.live_end_at)) {
      setError("Live test ke liye start aur end dono time zaroori hain");
      return;
    }
    if (liveForm.is_live && toIso(liveForm.live_end_at)! <= toIso(liveForm.live_start_at)!) {
      setError("End time start se baad ka hona chahiye");
      return;
    }
    setLiveBusy(true);
    setError("");
    try {
      await api(`/admin-extra/mock-tests/${liveFor.id}/live`, "PUT", {
        is_live: !!liveForm.is_live,
        live_start_at: toIso(liveForm.live_start_at),
        live_end_at: toIso(liveForm.live_end_at),
        display_boost: Number(liveForm.display_boost) || 0,
        registration_boost: Number(liveForm.registration_boost) || 0,
        telegram_group: (liveForm.telegram_group || "").trim() || null,
      });
      setLiveFor(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setLiveBusy(false);
  }

  async function publishResults(t: any) {
    if (!confirm(`"${t.title}" ka result sab students ko dikhne lagega. Iske baad har koi apna score aur rank dekh payega. Pakka?`)) return;
    setLiveBusy(true);
    try {
      const d = await api(`/admin-extra/mock-tests/${t.id}/publish-results`, "POST");
      alert(`Result publish ho gaya — ${d.attempts} students ne test diya tha.`);
      setLiveFor(null);
      load();
    } catch (e: any) {
      setError(e.message);
    }
    setLiveBusy(false);
  }

  async function loadBoard(t: any) {
    setLiveBusy(true);
    try {
      const d = await api(`/admin-extra/mock-tests/${t.id}/leaderboard`);
      setBoard(d.leaderboard || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLiveBusy(false);
  }

  async function removeTest(id: number) {
    if (!confirm("Ye test hide ho jayega. Questions Question Bank me safe rahenge. Pakka?")) return;
    try {
      await api(`/admin-extra/mock-tests/${id}`, "DELETE");
      load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function openCharts(t: any) {
    setChartsFor(t);
    setChartQs([]);
    setChartErr("");
    setEditingChartQId(null);
    setChartLoading(true);
    try {
      const d = await api(`/admin-extra/mock-tests/${t.id}/questions`);
      setChartQs(d.questions || []);
    } catch (e: any) {
      setChartErr(e.message);
    }
    setChartLoading(false);
  }

  function startChartImgEdit(q: any) {
    setEditingChartQId(q.id);
    setChartImgDraft(q.image_url || "");
    setExpImgDraft(q.explanation_image_url || "");
  }

  async function saveChartImg(qId: number) {
    setSavingChartImg(true);
    setChartErr("");
    try {
      await api(`/admin-extra/questions/${qId}`, "PATCH", {
        image_url: chartImgDraft.trim() || null,
        explanation_image_url: expImgDraft.trim() || null,
      });
      setChartQs((prev) => prev.map((q) => (q.id === qId
        ? { ...q, image_url: chartImgDraft.trim() || null, explanation_image_url: expImgDraft.trim() || null }
        : q)));
      setEditingChartQId(null);
    } catch (e: any) {
      setChartErr(e.message);
    }
    setSavingChartImg(false);
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
        <ImageField
          label="🖥️ Series thumbnail — desktop"
          value={sForm.thumbnail_url || ""}
          onChange={(v) => setSForm({ ...sForm, thumbnail_url: v })}
          reqW={1280}
          reqH={720}
          where="Mock Tests list aur series page, computer par"
        />

        <ImageField
          label="📱 Series thumbnail — mobile (optional)"
          value={sForm.thumbnail_url_mobile || ""}
          onChange={(v) => setSForm({ ...sForm, thumbnail_url_mobile: v })}
          reqW={1080}
          reqH={1080}
          where="Wahi cards phone par. Khaali chhodenge to desktop wali hi chalegi."
        />
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Price ₹" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={sForm.price} onChange={(e) => setSForm({ ...sForm, price: e.target.value })} />
          </Field>
          <Field label="Original ₹ (cut price)" style={{ flex: 1 }}>
            <input type="number" style={inputStyle} value={sForm.original_price} onChange={(e) => setSForm({ ...sForm, original_price: e.target.value })} />
          </Field>
        </div>
        <Field label="Telegram group link (is exam ka dedicated group)">
          <input
            style={inputStyle}
            placeholder="https://t.me/your_group_link"
            value={sForm.telegram_group || ""}
            onChange={(e) => setSForm({ ...sForm, telegram_group: e.target.value })}
          />
        </Field>
        <Field label="Show on (kahan dikhe)">
          <select
            style={inputStyle}
            value={sForm.visible_on || "both"}
            onChange={(e) => setSForm({ ...sForm, visible_on: e.target.value })}
          >
            <option value="both">Both — App + Website</option>
            <option value="app">App only</option>
            <option value="web">Website only</option>
            <option value="hidden">🚫 Hidden — kahin nahi dikhega (draft)</option>
          </select>
        </Field>
        <div style={{ margin: "10px 0 12px" }}>
          <BundlePicker
            value={sForm.bundle_items || []}
            onChange={(v) => setSForm({ ...sForm, bundle_items: v })}
            courses={bCourses}
            series={seriesList}
            desc={bDesc}
            selfType="mock"
            selfId={sEditId}
          />
        </div>
        {sEditId && (
          <div style={{ fontSize: 12, color: "#FFAB00", marginBottom: 8, fontWeight: 700 }}>
            ✏️ Editing series ID {sEditId}
          </div>
        )}
        <button onClick={createSeries} disabled={sSaving} style={{ ...goldBtn, width: "100%" }}>
          {sSaving ? "Saving..." : sEditId ? "💾 Save changes" : "+ Create series"}
        </button>
        {sEditId && (
          <button onClick={cancelEditSeries} style={{ ...smallBtn, width: "100%", marginTop: 8 }}>
            Cancel edit
          </button>
        )}

        {seriesList.filter((s) => s.is_active !== false).map((s) => (
          <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 10, marginTop: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{s.title}<HiddenTag on={s.visible_on} /></div>
              <div style={{ fontSize: 11.5, color: "#9a917f" }}>
                ID {s.id} · ₹{s.price} · {tests.filter((t) => t.series_id === s.id && t.is_active !== false).length} tests
              </div>
            </div>
            <button onClick={() => editSeries(s)} style={smallBtn}>
              Edit
            </button>
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
          Same CSV: 8 columns = Question, A, B, C, D, Answer (A/B/C/D), Explanation, Topic.
          Bilingual chahiye to 6 aur columns jodo: Question(HI), A(HI), B(HI), C(HI), D(HI), Explanation(HI).
          Column 15 = Section name (jaise General Awareness) — multi-section test ke liye.
          Column 16 = question ki image (DI chart), Column 17 = explanation ki image (reasoning ka diagram).
          Questions + test are created in one shot. Marks are split equally (total marks ÷ questions).
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

        <input type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values,text/plain" onChange={handleFile} style={{ marginBottom: 12, fontSize: 13 }} />
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
          <>
            <p style={{ color: "#5dd97c", fontSize: 13, marginTop: 12 }}>✓ {parsed.length} questions parsed</p>
            <QualityReport rows={parsed} />
          </>
        )}
      </div>

      {/* ── Tests list ── */}
      {/* ── LIVE TESTS alag — normal tests se bilkul alag section ── */}
      <h3 style={{ fontSize: 15, margin: "0 0 10px", color: "#ff6b6b" }}>🔴 Live tests</h3>
      {tests.filter((t) => t.is_active !== false && t.is_live).length === 0 && (
        <div style={{ background: CARD, border: `1px dashed ${BORDER}`, borderRadius: 12, padding: 13, fontSize: 12.5, color: "#9a917f", lineHeight: 1.6, marginBottom: 10 }}>
          Abhi koi live test nahi hai.<br />
          Neeche <b style={{ color: "#e0dacb" }}>Normal tests</b> me se kisi par <b style={{ color: "#e0dacb" }}>⏰ Live</b> dabaiye,
          time set kijiye aur Save — wo live test ban jayega aur homepage par countdown ke saath dikhega.
        </div>
      )}
      {tests.filter((t) => t.is_active !== false && t.is_live).map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: "1px solid rgba(255,107,107,0.4)", borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>{t.title}</div>
            <div style={{ fontSize: 11.5, color: "#ff6b6b", fontWeight: 700, marginTop: 2 }}>
              {t.live_start_at
                ? `${new Date(t.live_start_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} → ${t.live_end_at ? new Date(t.live_end_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "?"}`
                : "⚠️ Time set nahi hai"}
              {t.results_published ? " · result published ✓" : ""}
            </div>
            <div style={{ fontSize: 11, color: "#9a917f" }}>
              {t.total_questions} Qs · {t.duration_minutes} min · boost {t.registration_boost || 0}/{t.display_boost || 0}
            </div>
          </div>
          <button onClick={() => openCharts(t)} style={{ ...smallBtn, color: GOLD, borderColor: "rgba(212,175,55,0.5)" }}>
            🖼 Charts
          </button>
          <button onClick={() => openLive(t)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.5)" }}>
            ⏰ Manage
          </button>
        </div>
      ))}

      <h3 style={{ fontSize: 15, margin: "20px 0 10px" }}>Normal tests</h3>
      {tests.filter((t) => t.is_active !== false && !t.is_live).length === 0 && <Muted>No tests yet.</Muted>}
      {tests.filter((t) => t.is_active !== false && !t.is_live).map((t) => (
        <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5 }}>
              {t.title} {t.is_free && <span style={{ color: "#5dd97c", fontSize: 11, fontWeight: 800 }}>FREE</span>}
            </div>
            <div style={{ fontSize: 11.5, color: "#9a917f" }}>
              {seriesList.find((s) => s.id === t.series_id)?.title || "Standalone"} · {t.total_questions} Qs · {t.duration_minutes} min · {t.total_marks} marks
            </div>
            {t.is_live && (
              <div style={{ fontSize: 11, color: "#ff6b6b", fontWeight: 800, marginTop: 3 }}>
                🔴 LIVE TEST
                {t.live_start_at ? ` · ${new Date(t.live_start_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}` : ""}
                {t.results_published ? " · result published ✓" : ""}
              </div>
            )}
          </div>
          <button onClick={() => openCharts(t)} style={{ ...smallBtn, color: GOLD, borderColor: "rgba(212,175,55,0.5)" }}>
            🖼 Charts
          </button>
          <button onClick={() => openLive(t)} style={{ ...smallBtn, color: t.is_live ? "#ff6b6b" : "#e0dacb", borderColor: t.is_live ? "rgba(255,107,107,0.5)" : BORDER }}>
            ⏰ Live
          </button>
          <button onClick={() => removeTest(t.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
            Remove
          </button>
        </div>
      ))}

      {/* ── Chart / image picker panel — attach a DI chart to any question in this test ── */}
      {chartsFor && (
        <div
          onClick={() => setChartsFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#12100d", border: `1px solid ${BORDER}`, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", padding: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <b style={{ fontSize: 16, flex: 1 }}>🖼 Charts for this test</b>
              <button onClick={() => setChartsFor(null)} style={{ ...smallBtn, padding: "5px 11px" }}>✕</button>
            </div>
            <div style={{ fontSize: 12.5, color: "#9a917f", marginBottom: 14 }}>
              {chartsFor.title} · question select karke image URL paste kijiye
            </div>

            {chartLoading && <Muted>Loading questions...</Muted>}
            {chartErr && <ErrorBox msg={chartErr} />}

            {!chartLoading && chartQs.map((q) => (
              <div key={q.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, lineHeight: 1.5 }}>
                      Q{(q.display_order ?? 0) + 1}. {q.question_en}
                    </div>
                    <div style={{ fontSize: 11, color: "#9a917f", marginTop: 4 }}>
                      #{q.id}{q.section ? ` · ${q.section}` : ""}{q.image_url ? " · 🖼 has chart" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => startChartImgEdit(q)}
                    style={{ ...smallBtn, flexShrink: 0, color: q.image_url ? GOLD : undefined }}
                  >
                    {q.image_url ? "🖼 Edit" : "🖼 Add"}
                  </button>
                </div>

                {editingChartQId === q.id && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
                    <input
                      style={inputStyle}
                      placeholder="Chart/table image URL (DI question)"
                      value={chartImgDraft}
                      onChange={(e) => setChartImgDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveChartImg(q.id)}
                    />
                    {chartImgDraft.trim() && (
                      <img src={chartImgDraft.trim()} alt="Chart preview" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 10, border: `1px solid ${BORDER}` }} />
                    )}

                    {/* Reasoning ka solution diagram — seating arrangement, family tree, puzzle grid */}
                    <div style={{ fontSize: 11.5, color: "#9a917f", margin: "8px 0 5px", fontWeight: 700 }}>
                      Explanation diagram (reasoning ke liye)
                    </div>
                    <input
                      style={inputStyle}
                      placeholder="Seating arrangement / family tree image URL"
                      value={expImgDraft}
                      onChange={(e) => setExpImgDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveChartImg(q.id)}
                    />
                    {expImgDraft.trim() && (
                      <img src={expImgDraft.trim()} alt="Diagram preview" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 10, border: `1px solid ${BORDER}` }} />
                    )}

                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => saveChartImg(q.id)} disabled={savingChartImg} style={{ ...goldBtn, flex: 1, opacity: savingChartImg ? 0.6 : 1 }}>
                        {savingChartImg ? "Saving..." : "Save"}
                      </button>
                      <button onClick={() => setEditingChartQId(null)} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {!chartLoading && !chartErr && chartQs.length === 0 && <Muted>No questions found for this test.</Muted>}
          </div>
        </div>
      )}

      {/* ── Live test config panel ── */}
      {liveFor && (
        <div
          onClick={() => setLiveFor(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 70, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "#12100d", border: `1px solid ${BORDER}`, borderRadius: "18px 18px 0 0", width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto", padding: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <b style={{ fontSize: 16, flex: 1 }}>⏰ Live test settings</b>
              <button onClick={() => setLiveFor(null)} style={{ ...smallBtn, padding: "5px 11px" }}>✕</button>
            </div>
            <div style={{ fontSize: 12.5, color: "#9a917f", marginBottom: 14 }}>{liveFor.title}</div>

            <label style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={!!liveForm.is_live}
                onChange={(e) => setLiveForm({ ...liveForm, is_live: e.target.checked })}
                style={{ width: 18, height: 18 }}
              />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Ye live test hai (fixed time par hoga)</span>
            </label>

            {liveForm.is_live && (
              <>
                <Field label="Shuru hone ka time">
                  <input type="datetime-local" style={inputStyle} value={liveForm.live_start_at || ""} onChange={(e) => setLiveForm({ ...liveForm, live_start_at: e.target.value })} />
                </Field>
                <Field label="Khatam hone ka time">
                  <input type="datetime-local" style={inputStyle} value={liveForm.live_end_at || ""} onChange={(e) => setLiveForm({ ...liveForm, live_end_at: e.target.value })} />
                </Field>

                <div style={{ display: "flex", gap: 10 }}>
                  <Field label="Registered boost" style={{ flex: 1 }}>
                    <input type="number" style={inputStyle} value={liveForm.registration_boost} onChange={(e) => setLiveForm({ ...liveForm, registration_boost: e.target.value })} />
                  </Field>
                  <Field label="Live boost" style={{ flex: 1 }}>
                    <input type="number" style={inputStyle} value={liveForm.display_boost} onChange={(e) => setLiveForm({ ...liveForm, display_boost: e.target.value })} />
                  </Field>
                </div>
                <p style={{ fontSize: 11, color: "#9a917f", margin: "-4px 0 12px", lineHeight: 1.55 }}>
                  Ye dono sirf homepage banner ke counter me judte hain aur dhire-dhire badhte hain.
                  <b style={{ color: "#e0dacb" }}> Rank hamesha asli attempts par banta hai</b> — students ko sach hi dikhega.
                </p>

                <Field label="Telegram group link (reminder ke liye)">
                  <input style={inputStyle} placeholder="https://t.me/your_group" value={liveForm.telegram_group || ""} onChange={(e) => setLiveForm({ ...liveForm, telegram_group: e.target.value })} />
                </Field>
              </>
            )}

            <button onClick={saveLive} disabled={liveBusy} style={{ ...goldBtn, width: "100%", opacity: liveBusy ? 0.6 : 1 }}>
              {liveBusy ? "Saving..." : "Save live settings"}
            </button>

            {liveFor.is_live && (
              <>
                <div style={{ display: "flex", gap: 9, marginTop: 10 }}>
                  <button onClick={() => loadBoard(liveFor)} disabled={liveBusy} style={{ ...smallBtn, flex: 1, padding: "10px 0" }}>
                    📊 Leaderboard
                  </button>
                  <button
                    onClick={() => publishResults(liveFor)}
                    disabled={liveBusy || liveFor.results_published}
                    style={{ ...goldBtn, flex: 1, padding: "10px 0", fontSize: 13, opacity: liveFor.results_published ? 0.5 : 1 }}
                  >
                    {liveFor.results_published ? "✓ Published" : "🏆 Publish results"}
                  </button>
                </div>
                <p style={{ fontSize: 11, color: "#9a917f", marginTop: 8 }}>
                  Publish tabhi karo jab test ka time khatam ho jaye — uske baad sabko ek saath score aur rank dikhega.
                </p>
              </>
            )}

            {board && (
              <div style={{ marginTop: 14 }}>
                <b style={{ fontSize: 13.5 }}>Leaderboard ({board.length} attempts)</b>
                {board.length === 0 && <Muted>Abhi kisi ne test nahi diya.</Muted>}
                {board.slice(0, 50).map((r: any) => (
                  <div key={r.user_id} style={{ display: "flex", gap: 10, alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.07)", padding: "7px 0", fontSize: 12.5 }}>
                    <span style={{ width: 26, fontWeight: 800, color: r.rank <= 3 ? "#FFAB00" : "#9a917f" }}>#{r.rank}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "#9a917f" }}>{r.phone || ""}</div>
                    </div>
                    <span style={{ fontWeight: 800, color: "#5dd97c" }}>{r.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
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
    if (!confirm("Ye blog post HAMESHA ke liye delete ho jayegi — website se turant hategi. Pakka?")) return;
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
  const [form, setForm] = useState<any>({ image_url: "", image_url_mobile: "", title: "", link_url: "", display_order: "0", placement: "hero" });
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
        image_url_mobile: (form.image_url_mobile || "").trim() || null,
        title: form.title.trim() || null,
        link_url: form.link_url.trim() || null,
        display_order: Number(form.display_order) || 0,
        placement: form.placement || "hero",
        is_active: true,
      });
      setForm({ image_url: "", image_url_mobile: "", title: "", link_url: "", display_order: String(banners.length + 1), placement: "hero" });
      load();
    } catch (e: any) { setError(e.message); }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Ye banner delete ho jayega (app + website dono se hat jayega). Pakka?")) return;
    try { await api(`/admin-extra/banners/${id}`, "DELETE"); load(); } catch (e: any) { setError(e.message); }
  }

  return (
    <div>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Add banner (hero carousel)</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#9a917f", lineHeight: 1.55 }}>
          Ye homepage ke sabse upar wale <b style={{ color: "#e0dacb" }}>hero carousel</b> me dikhte hain —
          app aur website dono par. Iske baad Featured courses ke poster aate hain.
        </p>

        {/* Sab jagah ki sizes ek nazar me */}
        <details style={{ marginBottom: 12 }}>
          <summary style={{ cursor: "pointer", fontSize: 12.5, color: GOLD, fontWeight: 700, padding: "8px 0" }}>
            📐 Saari image sizes ek jagah (tap karke kholiye)
          </summary>
          <div style={{ background: "rgba(255,255,255,0.035)", borderRadius: 10, padding: 12, marginTop: 6 }}>
            {[
              ["🖥️ Banner — desktop", "1200 × 525", "Hero carousel jab computer par khule"],
              ["📱 Banner — mobile", "1080 × 1080", "Hero carousel phone par (zyadatar log yahi dekhte hain)"],
              ["🖥️ Course thumbnail", "1280 × 720", "Course card computer par"],
              ["📱 Course thumbnail", "1080 × 1080", "Course card phone par"],
              ["🖥️ Mock series", "1280 × 720", "Mock list computer par"],
              ["📱 Mock series", "1080 × 1080", "Mock list phone par"],
              ["🖥️ Descriptive", "1280 × 720", "Descriptive list computer par"],
              ["📱 Descriptive", "1080 × 1080", "Descriptive list phone par"],
            ].map(([what, size, place]) => (
              <div key={what as string} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700 }}>{what}</div>
                  <div style={{ fontSize: 11, color: "#8a8274", marginTop: 1 }}>{place}</div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 800, color: GOLD, whiteSpace: "nowrap" }}>{size}</span>
              </div>
            ))}
            <div style={{ fontSize: 11, color: "#8a8274", marginTop: 9, lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 9 }}>
              Sab <b style={{ color: "#c8c0ae" }}>JPEG</b> me, <b style={{ color: "#c8c0ae" }}>300 KB se kam</b>.
              PNG bahut bhaari hota hai — squoosh.app par daal kar JPEG quality 80 kar lijiye.
              Link paste karte hi upar wala box khud bata dega size sahi hai ya nahi.
            </div>
          </div>
        </details>
        <ImageField
          label="🖥️ Desktop / laptop banner"
          value={form.image_url || ""}
          onChange={(v) => setForm({ ...form, image_url: v })}
          reqW={1200}
          reqH={525}
          where="Homepage ka hero carousel jab website computer par khulti hai (wide screen)"
          hint="Wide patti. Text beech me rakhiye, kinaron se 100px door."
        />

        <ImageField
          label="📱 Mobile banner (optional)"
          value={form.image_url_mobile || ""}
          onChange={(v) => setForm({ ...form, image_url_mobile: v })}
          reqW={1080}
          reqH={1080}
          where="Homepage ka hero carousel phone par (app + mobile website). Khaali chhod denge to desktop wali image hi use hogi."
          hint="Square image — phone par wide patti bahut patli dikhti hai. Yahi image sabse zyada logon ko dikhegi."
        />
        <Field label="Title (optional)"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></Field>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Link URL (optional)" style={{ flex: 2 }}><input style={inputStyle} placeholder="/course/1 or https://..." value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></Field>
          <Field label="Order" style={{ flex: 1 }}><input type="number" style={inputStyle} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} /></Field>
        </div>
        <Field label="Placement — where this shows">
          <select style={inputStyle} value={form.placement || "hero"} onChange={(e) => setForm({ ...form, placement: e.target.value })}>
            <option value="hero">Hero carousel — top of the homepage, in the slider</option>
            <option value="poster">Big poster — below Featured Courses, full width</option>
          </select>
        </Field>
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
    if (!confirm("Notification record delete karein? (Jo push ja chuki hai wo wapas nahi aayegi)")) return;
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
  const [editingImgId, setEditingImgId] = useState<number | null>(null);
  const [imgDraft, setImgDraft] = useState("");
  const [savingImg, setSavingImg] = useState(false);
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
    if (!confirm("Question delete ho jayega AUR jis mock test me hai wahan se bhi hat jayega. Pakka?")) return;
    try { await api(`/admin-extra/questions/${id}`, "DELETE"); load(offset); } catch (e: any) { setError(e.message); }
  }

  function startImgEdit(it: any) {
    setEditingImgId(it.id);
    setImgDraft(it.image_url || "");
  }

  async function saveImg(id: number) {
    setSavingImg(true);
    setError("");
    try {
      await api(`/admin-extra/questions/${id}`, "PATCH", { image_url: imgDraft.trim() || null });
      setItems((prev) => prev.map((it) => (it.id === id ? { ...it, image_url: imgDraft.trim() || null } : it)));
      setEditingImgId(null);
    } catch (e: any) {
      setError(e.message);
    }
    setSavingImg(false);
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
              <div style={{ fontSize: 11, color: "#9a917f", marginTop: 4 }}>
                #{it.id} · Ans: {it.correct_answer} · {it.is_free ? "Free" : "Paid"}{it.is_active === false ? " · DELETED" : ""}{it.image_url ? " · 🖼 has chart" : ""}
              </div>
            </div>
            {it.is_active !== false && (
              <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                <button onClick={() => startImgEdit(it)} style={{ ...smallBtn, color: it.image_url ? GOLD : undefined }}>
                  {it.image_url ? "🖼 Edit" : "🖼 Add"}
                </button>
                <button onClick={() => remove(it.id)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>Delete</button>
              </div>
            )}
          </div>

          {editingImgId === it.id && (
            <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
              <input
                style={inputStyle}
                placeholder="Chart/table image URL (DI question)"
                value={imgDraft}
                onChange={(e) => setImgDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveImg(it.id)}
              />
              {imgDraft.trim() && (
                <img src={imgDraft.trim()} alt="Chart preview" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 10, border: `1px solid ${BORDER}` }} />
              )}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => saveImg(it.id)} disabled={savingImg} style={{ ...goldBtn, flex: 1, opacity: savingImg ? 0.6 : 1 }}>
                  {savingImg ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditingImgId(null)} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
              </div>
            </div>
          )}
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
    if (!confirm("Ye review delete ho jayega. Pakka?")) return;
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
  const [allSeries, setAllSeries] = useState<any[]>([]);
  const [allDesc, setAllDesc] = useState<any[]>([]);
  const [allTier2, setAllTier2] = useState<any[]>([]);
  const [grant, setGrant] = useState({ course_id: "", days: "365" });
  // Kya grant karna hai: course / mock series / descriptive / tier 2
  const [grantType, setGrantType] = useState<"course" | "mock" | "descriptive" | "tier2">("course");
  const [grantItem, setGrantItem] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [totalUsers, setTotalUsers] = useState<number | null>(null);

  function load() {
    // limit=1000 — pehle default 50 tha, isliye sirf 50 users dikhte the
    api("/admin/users?limit=1000")
      .then((d) => {
        setUsers(d.users || []);
        if (typeof d.total === "number") setTotalUsers(d.total);
      })
      .catch((e) => setError(e.message));
  }
  useEffect(() => {
    load();
    api("/admin-extra/courses").then((d) => setAllCourses(d.courses || [])).catch(() => {});
    api("/admin-extra/series").then((d) => setAllSeries(d.series || [])).catch(() => {});
    api("/admin-extra/desc/series").then((d) => setAllDesc(d.series || [])).catch(() => {});
    api("/tier2/admin/series").then((d) => setAllTier2(d.series || [])).catch(() => {});
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

  // Ek hi function — course, mock series aur descriptive teeno ke liye
  async function grantAccess() {
    if (!detail) return;
    const uid = detail.user.id;
    setBusy(true);
    setError("");
    try {
      if (grantType === "course") {
        if (!grant.course_id) { setBusy(false); return; }
        await api(`/admin-extra/users/${uid}/grant-course`, "POST", {
          course_id: Number(grant.course_id),
          days: Number(grant.days) || 365,
        });
      } else if (grantType === "mock") {
        if (!grantItem) { setBusy(false); return; }
        await api(`/admin-extra/users/${uid}/grant-series`, "POST", { series_id: Number(grantItem) });
      } else if (grantType === "tier2") {
        if (!grantItem) { setBusy(false); return; }
        await api(`/admin-extra/users/${uid}/grant-tier2`, "POST", { series_id: Number(grantItem) });
      } else {
        if (!grantItem) { setBusy(false); return; }
        await api(`/admin-extra/users/${uid}/grant-descriptive`, "POST", { series_id: Number(grantItem) });
      }
      setGrantItem("");
      setGrant({ ...grant, course_id: "" });
      openDetail(uid);
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  async function revokeCourse(courseId: number) {
    if (!detail || !confirm("Is user ka course access hata dein? Wo turant course nahi khol payega.")) return;
    try {
      await api(`/admin-extra/users/${detail.user.id}/revoke-course/${courseId}`, "DELETE");
      openDetail(detail.user.id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function revokeSeries(seriesId: number, title: string) {
    if (!detail || !confirm(`"${title}" ka access hata dein?\n\nStudent turant ye mock series nahi khol payega. Purchase record bhi delete ho jayega.`)) return;
    try {
      await api(`/admin-extra/users/${detail.user.id}/revoke-series/${seriesId}`, "DELETE");
      openDetail(detail.user.id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function revokeDescriptive(seriesId: number, title: string) {
    if (!detail || !confirm(`"${title}" ka access hata dein?\n\nStudent turant ye descriptive series nahi khol payega. Purchase record bhi delete ho jayega.`)) return;
    try {
      await api(`/admin-extra/users/${detail.user.id}/revoke-descriptive/${seriesId}`, "DELETE");
      openDetail(detail.user.id);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function revokeTier2(seriesId: number, title: string) {
    if (!detail || !confirm(`"${title}" ka access hata dein?\n\nStudent turant typing test aur Excel dono nahi khol payega. Purchase record bhi delete ho jayega.`)) return;
    try {
      await api(`/admin-extra/users/${detail.user.id}/revoke-tier2/${seriesId}`, "DELETE");
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

        {/* ── Ye banda kaisa hai: paying / sirf free / gayab ── */}
        {detail.summary && (() => {
          const s = detail.summary;
          const V: Record<string, { label: string; color: string; note: string }> = {
            paying:        { label: "PAYING CUSTOMER",  color: "#5dd97c", note: "Isne apne paise se kharida hai." },
            granted_only:  { label: "ADMIN NE DIYA",    color: "#FFAB00", note: "Access admin ne diya, khud pay nahi kiya." },
            free_only:     { label: "SIRF FREE",        color: "#4A90D9", note: "Sirf free mock/descriptive try kiya — kabhi kharida nahi." },
            no_activity:   { label: "KOI ACTIVITY NAHI", color: "#9a917f", note: "Sign up kiya par kuch try nahi kiya." },
          };
          const v = V[s.verdict] || V.no_activity;
          return (
            <div style={{ background: CARD, border: `1px solid ${v.color}55`, borderLeft: `4px solid ${v.color}`, borderRadius: 12, padding: 13, marginBottom: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 1, color: v.color }}>{v.label}</div>
              <div style={{ fontSize: 12, color: "#9a917f", marginTop: 3 }}>{v.note}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(84px, 1fr))", gap: 8, marginTop: 11 }}>
                <MiniStat label="Kharch kiya" value={`₹${s.total_spent}`} color="#5dd97c" />
                <MiniStat label="Kharide" value={s.paid_items} color="#fff" />
                <MiniStat label="Admin ne diye" value={s.granted_items} color="#FFAB00" />
                <MiniStat label="Free mock" value={s.free_mock_attempts} color="#4A90D9" />
                <MiniStat label="Paid mock" value={s.paid_mock_attempts} color="#D6568F" />
                <MiniStat label="Descriptive" value={s.descriptive_submissions} color="#7C6CE0" />
              </div>
              {s.last_active && (
                <div style={{ fontSize: 11.5, color: "#9a917f", marginTop: 9 }}>
                  Aakhri activity: {new Date(s.last_active).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </div>
              )}
            </div>
          );
        })()}

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
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{s.title}</div>
                <div style={{ fontSize: 11, color: "#9a917f" }}>
                  ₹{s.amount_paid ?? 0}{s.payment_id === "ADMIN_GRANT" ? " · granted by admin" : ""} · {s.purchased_at ? new Date(s.purchased_at).toLocaleDateString("en-IN") : ""}
                </div>
              </div>
              <button onClick={() => revokeSeries(s.series_id, s.title)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
                Revoke
              </button>
            </div>
          </div>
        ))}

        {/* Grant access — course / mock series / descriptive */}
        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>🎁 Grant access</h3>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12 }}>
          {/* Kis cheez ka access dena hai */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
            {([
              ["course", "📚 Course"],
              ["mock", "📝 Mock Series"],
              ["descriptive", "✍️ Descriptive"],
              ["tier2", "⌨️ Tier 2"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setGrantType(k); setGrantItem(""); setGrant({ ...grant, course_id: "" }); }}
                style={{
                  flex: "1 1 45%", minWidth: 120, padding: "8px 4px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer",
                  border: `1px solid ${grantType === k ? GOLD : BORDER}`,
                  background: grantType === k ? "rgba(255,171,0,0.14)" : "transparent",
                  color: grantType === k ? GOLD : "#e0dacb",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {grantType === "course" ? (
            <div style={{ display: "flex", gap: 8 }}>
              <select style={{ ...inputStyle, marginBottom: 0, flex: 2 }} value={grant.course_id} onChange={(e) => setGrant({ ...grant, course_id: e.target.value })}>
                <option value="">Select course...</option>
                {allCourses.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <input type="number" placeholder="Days" style={{ ...inputStyle, marginBottom: 0, flex: 1 }} value={grant.days} onChange={(e) => setGrant({ ...grant, days: e.target.value })} />
            </div>
          ) : (
            <select style={{ ...inputStyle, marginBottom: 0 }} value={grantItem} onChange={(e) => setGrantItem(e.target.value)}>
              <option value="">
                {grantType === "mock" ? "Select mock series..."
                  : grantType === "tier2" ? "Select Tier 2 series..."
                  : "Select descriptive series..."}
              </option>
              {(grantType === "mock" ? allSeries : grantType === "tier2" ? allTier2 : allDesc)
                .filter((s: any) => s.is_active !== false)
                .map((s: any) => (
                  <option key={s.id} value={s.id}>{s.title} {Number(s.price) > 0 ? `(₹${s.price})` : "(Free)"}</option>
                ))}
            </select>
          )}

          <button
            onClick={grantAccess}
            disabled={busy || (grantType === "course" ? !grant.course_id : !grantItem)}
            style={{ ...goldBtn, width: "100%", marginTop: 10, opacity: busy || (grantType === "course" ? !grant.course_id : !grantItem) ? 0.5 : 1 }}
          >
            {busy ? "Granting..." : "Grant access"}
          </button>
          <p style={{ fontSize: 11, color: "#9a917f", margin: "8px 0 0" }}>
            UPI/screenshot payment, dispute ya gift ke liye. ₹0 "granted by admin" ke roop me record hota hai.
            Mock, descriptive aur Tier 2 series lifetime unlock hoti hain (days sirf courses pe lagte hain).
            Tier 2 grant karne par uska bundle bhi khul jata hai.
          </p>
        </div>

        {/* Descriptive purchases */}
        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>✍️ Descriptive ({(detail.descriptive || []).length})</h3>
        {(!detail.descriptive || detail.descriptive.length === 0) && <Muted>Koi descriptive series nahi li.</Muted>}
        {(detail.descriptive || []).map((d: any, i: number) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{d.title}</div>
                <div style={{ fontSize: 11.5, color: "#9a917f" }}>
                  {Number(d.amount_paid) > 0 ? `₹${d.amount_paid} paid` : d.payment_id === "ADMIN_GRANT" ? "Admin ne diya" : "Free"}
                  {d.purchased_at && ` · ${new Date(d.purchased_at).toLocaleDateString("en-IN")}`}
                </div>
              </div>
              <button onClick={() => revokeDescriptive(d.series_id, d.title)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
                Revoke
              </button>
            </div>
          </div>
        ))}

        {/* Tier 2 purchases — ek series se typing aur Excel dono khulte hain */}
        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>⌨️ Tier 2 ({(detail.tier2 || []).length})</h3>
        {(!detail.tier2 || detail.tier2.length === 0) && <Muted>Koi Tier 2 series nahi li.</Muted>}
        {(detail.tier2 || []).map((d: any, i: number) => (
          <div key={i} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{d.title}</div>
                <div style={{ fontSize: 11.5, color: "#9a917f" }}>
                  {Number(d.amount_paid) > 0 ? `₹${d.amount_paid} paid` : d.payment_id === "ADMIN_GRANT" ? "Admin ne diya" : d.payment_id === "BUNDLE" ? "Bundle se mila" : "Free"}
                  {d.purchased_at && ` · ${new Date(d.purchased_at).toLocaleDateString("en-IN")}`}
                  {d.is_active === false && " · OFF"}
                </div>
              </div>
              <button onClick={() => revokeTier2(d.series_id, d.title)} style={{ ...smallBtn, color: "#ff6b6b", borderColor: "rgba(255,107,107,0.4)" }}>
                Revoke
              </button>
            </div>
          </div>
        ))}

        {/* Mock test attempts — free aur paid alag dikhte hain */}
        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>📝 Mock tests diye ({(detail.mock_attempts || []).length})</h3>
        {(!detail.mock_attempts || detail.mock_attempts.length === 0) && <Muted>Abhi tak koi mock test nahi diya.</Muted>}
        {(detail.mock_attempts || []).slice(0, 15).map((a: any) => (
          <div key={a.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px", marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.title}</div>
                <div style={{ fontSize: 11.5, color: "#9a917f" }}>
                  Score {a.score}{a.total_marks ? `/${a.total_marks}` : ""} · ✓{a.correct} ✗{a.wrong}
                  {a.ended_at && ` · ${new Date(a.ended_at).toLocaleDateString("en-IN")}`}
                </div>
              </div>
              <span
                style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6,
                  color: a.is_free ? "#5dd97c" : "#D6568F",
                  border: `1px solid ${a.is_free ? "rgba(93,217,124,0.4)" : "rgba(214,86,143,0.4)"}`,
                }}
              >
                {a.is_free ? "FREE" : "PAID"}
              </span>
            </div>
          </div>
        ))}

        {/* Descriptive submissions */}
        <h3 style={{ fontSize: 14.5, margin: "16px 0 8px" }}>📄 Descriptive likha ({(detail.descriptive_activity || []).length})</h3>
        {(!detail.descriptive_activity || detail.descriptive_activity.length === 0) && <Muted>Koi descriptive answer submit nahi kiya.</Muted>}
        {(detail.descriptive_activity || []).slice(0, 10).map((d: any) => (
          <div key={d.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "9px 12px", marginBottom: 6, fontSize: 12.5 }}>
            <b>{d.title}</b>
            <span style={{ color: "#9a917f" }}>
              {d.status ? ` · ${d.status}` : ""}{d.score != null ? ` · ${d.score} marks` : ""}
              {d.submitted_at ? ` · ${new Date(d.submitted_at).toLocaleDateString("en-IN")}` : ""}
            </span>
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
      <p style={{ fontSize: 12, color: "#9a917f", margin: "0 0 10px" }}>{shown.length} of {users.length} users{totalUsers && totalUsers > users.length ? ` (database me ${totalUsers})` : ""}</p>
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
// Coupon kis cheez par lagega — type chuniye, phir wahi ki list me se ek.
// "Whole category" chunne par scope_id khaali jata hai, matlab us category ki
// har cheez par chalega (jaise saari Tier 2 series).
function ScopePicker({ prod, scopeType, scopeId, onChange }: {
  prod: Record<string, any[]>;
  scopeType: string;
  scopeId: string;
  onChange: (t: string, id: string) => void;
}) {
  const list = prod[scopeType] || [];
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      <select
        style={{ ...inputStyle, flex: 1, minWidth: 150 }}
        value={scopeType}
        onChange={(e) => onChange(e.target.value, "")}
      >
        <option value="all">All products</option>
        <option value="course">Courses</option>
        <option value="mock">Mock Series</option>
        <option value="descriptive">Descriptive</option>
        <option value="tier2">Tier 2</option>
      </select>
      {scopeType !== "all" && (
        <select
          style={{ ...inputStyle, flex: 2, minWidth: 180 }}
          value={scopeId}
          onChange={(e) => onChange(scopeType, e.target.value)}
        >
          <option value="">Whole category (every one of these)</option>
          {list.map((p: any) => (
            <option key={p.id} value={String(p.id)}>
              #{p.id} — {p.title}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function CouponsTab() {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [pub, setPub] = useState({ code: "", discount_type: "percent", discount_value: "", scope_type: "all", scope_id: "" });
  const [gen, setGen] = useState({ count: "10", prefix: "SL", discount_type: "percent", discount_value: "", scope_type: "all", scope_id: "" });
  const [generated, setGenerated] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<any>(null);
  // Coupon kis cheez par lagega — ID yaad rakhne ke bajaye seedha chun lijiye
  const [prod, setProd] = useState<Record<string, any[]>>({ course: [], mock: [], descriptive: [], tier2: [] });

  function load() {
    api("/admin/coupons")
      .then((d) => setCoupons(d.coupons || []))
      .catch((e) => setError(e.message));
    api("/admin-extra/coupons/report").then(setReport).catch(() => {});
  }
  useEffect(load, []);

  useEffect(() => {
    Promise.all([
      api("/admin-extra/courses").then((d) => d.courses || []).catch(() => []),
      api("/admin-extra/series").then((d) => d.series || []).catch(() => []),
      api("/admin-extra/desc/series").then((d) => d.series || []).catch(() => []),
      api("/tier2/admin/series").then((d) => d.series || []).catch(() => []),
    ]).then(([course, mock, descriptive, tier2]) =>
      setProd({ course, mock, descriptive, tier2 })
    );
  }, []);

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
    if (!confirm("Coupon band ho jayega — koi naya user use nahi kar payega. Pakka?")) return;
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
        <ScopePicker
          prod={prod}
          scopeType={pub.scope_type}
          scopeId={pub.scope_id}
          onChange={(t, i) => setPub({ ...pub, scope_type: t, scope_id: i })}
        />
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
        <ScopePicker
          prod={prod}
          scopeType={gen.scope_type}
          scopeId={gen.scope_id}
          onChange={(t, i) => setGen({ ...gen, scope_type: t, scope_id: i })}
        />
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

function BundlePicker({
  value,
  onChange,
  courses,
  series,
  desc,
  selfType,
  selfId,
}: {
  value: any[];
  onChange: (v: any[]) => void;
  courses: any[];
  series: any[];
  desc: any[];
  selfType: "course" | "mock" | "descriptive";
  selfId?: number | null;
}) {
  const items = Array.isArray(value) ? value : [];
  const has = (t: string, id: number) => items.some((i) => i.type === t && Number(i.id) === Number(id));
  const toggle = (t: string, id: number) => {
    onChange(has(t, id) ? items.filter((i) => !(i.type === t && Number(i.id) === Number(id))) : [...items, { type: t, id }]);
  };

  const groups: { t: "course" | "mock" | "descriptive"; label: string; list: any[] }[] = [
    { t: "course", label: "📚 Courses", list: courses },
    { t: "mock", label: "📝 Mock Series", list: series },
    { t: "descriptive", label: "✍️ Descriptive", list: desc },
  ];

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12 }}>
      <div style={{ fontSize: 12.5, color: "#c8c0ae", marginBottom: 4, fontWeight: 700 }}>
        🎁 Iske saath aur kya milega? (bundle)
      </div>
      <div style={{ fontSize: 11, color: "#9a917f", marginBottom: 10, lineHeight: 1.5 }}>
        Jo yahan tick karenge, ye product khareedte hi wo sab apne aap unlock ho jaayenge.
        Khaali chhodenge to normal product rahega.
      </div>

      {groups.map((g) => {
        // Inactive items bhi dikhate hain (tag ke saath) — pehle ye chhupe hue the,
        // isliye pata hi nahi chalta tha ki bundle purani/inactive cheez pe laga hai.
        const list = g.list.filter((x: any) => !(g.t === selfType && Number(x.id) === Number(selfId)));
        if (list.length === 0) return null;
        return (
          <div key={g.t} style={{ marginBottom: 9 }}>
            <div style={{ fontSize: 10.5, letterSpacing: 1, color: "#7a7263", fontWeight: 800, marginBottom: 5 }}>{g.label}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {list.map((x: any) => {
                const on = has(g.t, x.id);
                return (
                  <button
                    key={x.id}
                    onClick={() => toggle(g.t, x.id)}
                    style={{
                      fontSize: 11.5, padding: "6px 10px", borderRadius: 8, cursor: "pointer", maxWidth: 220,
                      textAlign: "left", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      border: `1px solid ${on ? GOLD : BORDER}`,
                      background: on ? "rgba(255,171,0,0.15)" : "transparent",
                      color: on ? GOLD : "#c8c0ae",
                    }}
                  >
                    {on ? "✓ " : ""}{x.title}
                    <span style={{ fontSize: 9.5, color: "#7a7263", marginLeft: 5 }}>#{x.id}</span>
                    {x.is_active === false && (
                      <span style={{ fontSize: 9, color: "#ff6b6b", fontWeight: 800, marginLeft: 5 }}>INACTIVE</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {items.length > 0 && (() => {
        const all = [...courses.map((c: any) => ({ ...c, t: "course" })),
                     ...series.map((s: any) => ({ ...s, t: "mock" })),
                     ...desc.map((d: any) => ({ ...d, t: "descriptive" }))];
        const bad = items.filter((i) =>
          all.some((x) => x.t === i.type && Number(x.id) === Number(i.id) && x.is_active === false));
        return (
          <>
            <div style={{ fontSize: 11.5, color: "#5dd97c", marginTop: 6, fontWeight: 700 }}>
              {items.length} cheezein bundle me hain
            </div>
            {bad.length > 0 && (
              <div style={{ fontSize: 11.5, color: "#ff6b6b", marginTop: 5, fontWeight: 700, lineHeight: 1.5 }}>
                ⚠ {bad.length} inactive item bundle me hai — students ko access to milega par wo
                kahin dikhega nahi. Sahi wala chuniye.
              </div>
            )}
          </>
        );
      })()}
    </div>
  );
}

function HiddenTag({ on }: { on?: string }) {
  if (on !== "hidden") return null;
  return (
    <span style={{
      fontSize: 9.5, fontWeight: 900, padding: "2px 7px", borderRadius: 5, marginLeft: 6,
      color: "#ff6b6b", background: "rgba(255,107,107,0.14)", border: "1px solid rgba(255,107,107,0.35)",
    }}>
      HIDDEN
    </span>
  );
}

function ProfileItem({ icon, title, sub }: { icon: string; title: any; sub: any; key?: any }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "9px 11px", marginBottom: 6 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#9a917f" }}>{sub}</div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: "7px 9px" }}>
      <div style={{ fontSize: 15, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: "#9a917f", marginTop: 1 }}>{label}</div>
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
