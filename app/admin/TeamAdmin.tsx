"use client";

/**
 * app/admin/TeamAdmin.tsx — team ke log, unke rights, aur kisne kya badla.
 * Sirf Main Admin ko dikhta hai (backend bhi /team aur /activity ko sirf Main
 * Admin ke liye kholta hai).
 */

import { useEffect, useState } from "react";

type Api = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";

export const PERM_INFO: { id: string; icon: string; title: string; sub: string }[] = [
  { id: "finance", icon: "💰", title: "Finance", sub: "Aaj ki report / sales, Coupons, Partners, Live activity" },
  { id: "courses", icon: "📚", title: "Courses", sub: "Courses, Banners, App Content" },
  { id: "mocks", icon: "📝", title: "Mock Tests", sub: "Mock Tests, Upload Qs, Question Bank, Composer, PDF Extractor, Need Review, Descriptive, Typing, Excel, NBEMS, Score Checker" },
  { id: "seo", icon: "📈", title: "SEO", sub: "Blog, SEO Coach, Search" },
  { id: "users", icon: "👥", title: "Users / Support", sub: "Users (access dena bhi), Tickets, Reviews, Email, Notify, Teacher approvals" },
];

const input: React.CSSProperties = {
  width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 14, boxSizing: "border-box", marginBottom: 10,
};
const gold: React.CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "12px 18px",
  fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const ghost: React.CSSProperties = {
  background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.18)", borderRadius: 8,
  padding: "7px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};

const when = (t?: string) => t ? new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

// "/api/admin-extra/coupons" + POST -> "Coupons · banaya"
function describe(method: string, path: string): string {
  const p = path.replace(/^\/api\//, "").replace(/\/\d+(?=\/|$)/g, "/#");
  const verb = method === "POST" ? "banaya / chalaya" : method === "PUT" || method === "PATCH" ? "badla" : method === "DELETE" ? "hataya" : method;
  return `${p} · ${verb}`;
}

export default function TeamAdmin({ api }: { api: Api }) {
  const [team, setTeam] = useState<any[] | null>(null);
  const [err, setErr] = useState("");
  const [edit, setEdit] = useState<any | null>(null);
  const [view, setView] = useState<"team" | "log">("team");

  function load() {
    setErr("");
    api("/admin-extra/team").then((d) => setTeam(d.team || [])).catch((e) => { setErr(e.message); setTeam([]); });
  }
  useEffect(load, [api]);

  if (edit) return <MemberForm api={api} m={edit} onDone={() => { setEdit(null); load(); }} />;

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {([["team", "👥 Team"], ["log", "🕒 Kisne kya badla"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setView(k)} style={{ ...ghost, flex: 1, padding: 10,
            borderColor: view === k ? GOLD : "rgba(255,255,255,0.18)", color: view === k ? GOLD : "#fff" }}>{l}</button>
        ))}
      </div>

      {view === "log" ? <ActivityLog api={api} team={team || []} /> : (
        <>
          <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.6, marginBottom: 12 }}>
            Aap <b style={{ color: GOLD }}>Main Admin</b> ho — sab kuch dikhta hai. Team member ko sirf wahi dikhega jiska
            right aap denge. Right badalne ya account band karne ka asar 1 minute me ho jata hai.
          </div>
          <button onClick={() => setEdit({ name: "", email: "", password: "", permissions: [], is_active: true })}
            style={{ ...gold, width: "100%", marginBottom: 14 }}>+ Team member jodo</button>
          {err && <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 10 }}>{err}</div>}
          {team === null ? <div style={{ color: MUTED }}>Load ho raha hai…</div>
            : team.length === 0 && !err ? <div style={{ color: MUTED, fontSize: 13 }}>Abhi koi team member nahi.</div>
            : team.map((m) => (
              <div key={m.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 8,
                opacity: m.is_active ? 1 : 0.55 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>
                      {m.name} {!m.is_active && <span style={{ color: "#ff6b6b", fontSize: 11 }}>· BAND</span>}
                    </div>
                    <div style={{ fontSize: 12, color: MUTED }}>{m.email}</div>
                  </div>
                  <button onClick={() => setEdit({ ...m, password: "" })} style={ghost}>Edit</button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 8 }}>
                  {(m.permissions || []).length === 0
                    ? <span style={{ fontSize: 11.5, color: "#ff6b6b" }}>Koi right nahi</span>
                    : PERM_INFO.filter((p) => (m.permissions || []).includes(p.id)).map((p) => (
                      <span key={p.id} style={{ fontSize: 11.5, border: `1px solid ${BORDER}`, borderRadius: 999, padding: "2px 9px" }}>
                        {p.icon} {p.title}
                      </span>
                    ))}
                </div>
                <div style={{ fontSize: 11, color: "#7a7263", marginTop: 6 }}>Aakhri login: {when(m.last_login)}</div>
              </div>
            ))}
        </>
      )}
    </div>
  );
}

function MemberForm({ api, m, onDone }: { api: Api; m: any; onDone: () => void }) {
  const [f, setF] = useState<any>(m);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const isNew = !m.id;
  const toggle = (id: string) => setF({
    ...f, permissions: f.permissions.includes(id) ? f.permissions.filter((x: string) => x !== id) : [...f.permissions, id],
  });

  async function save() {
    setErr(""); setBusy(true);
    try {
      const body = { name: f.name, email: f.email, password: f.password || null, permissions: f.permissions, is_active: f.is_active };
      if (isNew) await api("/admin-extra/team", "POST", body);
      else await api(`/admin-extra/team/${m.id}`, "PUT", body);
      onDone();
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  async function remove() {
    if (!confirm(`${m.name} ko team se hamesha ke liye hata dein? (Sirf band karna ho to "Account chalu" hata dijiye)`)) return;
    setBusy(true);
    try { await api(`/admin-extra/team/${m.id}`, "DELETE"); onDone(); } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div>
      <button onClick={onDone} style={{ ...ghost, marginBottom: 12 }}>← Back</button>
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>{isNew ? "Naya team member" : `Edit — ${m.name}`}</div>
        <input style={input} placeholder="Naam (jaise: Nikki Ma'am)" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <input style={input} placeholder="Email (isi se login karenge)" type="email" value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input style={input} type="text" autoComplete="new-password"
          placeholder={isNew ? "Password (kam se kam 8 akshar)" : "Naya password (khaali = purana hi rahega)"}
          value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />

        <div style={{ fontSize: 13, fontWeight: 800, margin: "6px 0 8px" }}>Kya-kya kar sakte hain</div>
        {PERM_INFO.map((p) => {
          const on = f.permissions.includes(p.id);
          return (
            <label key={p.id} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 10px", marginBottom: 6, cursor: "pointer",
              border: `1px solid ${on ? GOLD : "rgba(255,255,255,0.12)"}`, borderRadius: 10, background: on ? "rgba(255,171,0,0.08)" : "transparent" }}>
              <input type="checkbox" checked={on} onChange={() => toggle(p.id)} style={{ marginTop: 3 }} />
              <span>
                <b style={{ fontSize: 13.5 }}>{p.icon} {p.title}</b>
                <span style={{ display: "block", fontSize: 11.5, color: MUTED, marginTop: 2, lineHeight: 1.5 }}>{p.sub}</span>
              </span>
            </label>
          );
        })}
        <div style={{ fontSize: 11.5, color: MUTED, margin: "4px 0 10px", lineHeight: 1.5 }}>
          🔒 Team, Troubleshooter aur settings sirf aapke (Main Admin) paas rahenge.
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "8px 0 14px", fontSize: 14 }}>
          <input type="checkbox" checked={!!f.is_active} onChange={(e) => setF({ ...f, is_active: e.target.checked })} />
          Account chalu (hata do to login band — kuch delete nahi hota)
        </label>
        <button onClick={save} disabled={busy} style={{ ...gold, width: "100%", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Save ho raha hai…" : isNew ? "Team member banao" : "Save"}
        </button>
        {!isNew && <button onClick={remove} disabled={busy} style={{ ...ghost, width: "100%", marginTop: 10, color: "#ff6b6b" }}>Team se hatao</button>}
        {err && <div style={{ color: "#ff6b6b", fontSize: 13, marginTop: 10 }}>{err}</div>}
        {isNew && (
          <div style={{ fontSize: 12, color: MUTED, marginTop: 12, lineHeight: 1.6 }}>
            Banne ke baad unhe admin panel ka link, yahi email aur password de dijiye. Wo wahi login page se aayenge.
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityLog({ api, team }: { api: Api; team: any[] }) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [who, setWho] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    setRows(null); setErr("");
    api(`/admin-extra/activity?limit=300${who ? `&email=${encodeURIComponent(who)}` : ""}`)
      .then((d) => setRows(d.activity || [])).catch((e) => { setErr(e.message); setRows([]); });
  }, [api, who]);
  return (
    <div>
      <select value={who} onChange={(e) => setWho(e.target.value)} style={input}>
        <option value="">Sab log</option>
        {team.map((m) => <option key={m.id} value={m.email}>{m.name}</option>)}
      </select>
      {err && <div style={{ color: "#ff6b6b", fontSize: 13 }}>{err}</div>}
      {rows === null ? <div style={{ color: MUTED }}>Load ho raha hai…</div>
        : rows.length === 0 ? <div style={{ color: MUTED, fontSize: 13 }}>Abhi kuch nahi.</div>
        : rows.map((r) => (
          <div key={r.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "8px 0", fontSize: 12.5 }}>
            <div>
              <b style={{ color: r.role === "staff" ? "#cfc6b3" : GOLD }}>{r.admin_name || r.admin_email || "?"}</b>
              <span style={{ color: MUTED }}> · {when(r.created_at)}</span>
            </div>
            <div style={{ color: "#bdb4a2", wordBreak: "break-all" }}>{describe(r.method, r.path || "")}</div>
          </div>
        ))}
      <div style={{ fontSize: 11, color: MUTED, marginTop: 10 }}>
        Sirf badlav wale kaam (banana, badalna, hatana) likhe jaate hain — dekhna nahi.
      </div>
    </div>
  );
}
