"use client";

/**
 * CAPricingAdmin.tsx — Current Affairs admin ka "💰 Pricing" tab.
 *
 *   Free period  — chalu/band, kab tak, login zaroori
 *   Free ke baad — lock par kitne cards, aakhri kitne din free
 *   Plans        — Monthly / 3 Months / Yearly... (naam, din, price, MRP, badge, on/off)
 *   Haath se do  — kisi student ko plan ya kuch din (giveaway, refund ke badle)
 *   Sales        — kisne kaunsa plan liya, kab tak, kitne ka; band bhi kar sakte ho
 *
 * Backend: routers/ca_plans.py (/api/ca/admin/pricing, /admin/plans, /admin/subs/...)
 * aur routers/current_affairs.py (/api/ca/admin/settings).
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const RED = "#ff6b6b";
const GREEN = "#5dd97c";
const YELLOW = "#f2c94c";

const input: CSSProperties = {
  width: "100%", padding: "9px", borderRadius: 9, border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 13, boxSizing: "border-box",
};
const btn: CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`, borderRadius: 9,
  padding: "8px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};
const goldBtn: CSSProperties = { ...btn, background: GOLD, color: "#1a1a1a", border: "none" };
const box: CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 12 };
const label: CSSProperties = { fontSize: 11.5, color: MUTED, fontWeight: 700, margin: "8px 0 4px" };
const hint: CSSProperties = { fontSize: 11.5, color: MUTED, marginTop: 4, lineHeight: 1.5 };

type Plan = { id?: number; name: string; days: number; price: number; mrp?: number | null; badge?: string | null; is_active: boolean };

const rs = (n: any) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
function fmt(s?: string) {
  if (!s) return "—";
  try { return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); } catch { return s; }
}
function dur(days: number) {
  if (days % 365 === 0) return days === 365 ? "1 saal" : `${days / 365} saal`;
  if (days % 30 === 0) return days === 30 ? "1 mahina" : `${days / 30} mahine`;
  return `${days} din`;
}

function Msg({ text, ok }: { text: string; ok?: boolean }) {
  if (!text) return null;
  const c = ok ? GREEN : RED;
  return <div style={{ background: `${c}1a`, border: `1px solid ${c}55`, color: c, borderRadius: 10, padding: "9px 12px", fontSize: 13, marginBottom: 10 }}>{text}</div>;
}
function Tile({ l, v, sub, color }: { l: string; v: ReactNode; sub?: ReactNode; color?: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 11, color: MUTED, fontWeight: 700 }}>{l}</div>
      <div style={{ fontSize: 21, fontWeight: 800, color: color || "#fff", marginTop: 2 }}>{v}</div>
      {sub && <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

const TEMPLATE: Plan[] = [
  { name: "Monthly", days: 30, price: 49, mrp: 99, badge: "", is_active: true },
  { name: "3 Months", days: 90, price: 129, mrp: 297, badge: "Popular", is_active: true },
  { name: "Yearly", days: 365, price: 399, mrp: 1188, badge: "Best value", is_active: true },
];

export default function CAPricingAdmin({ api }: { api: ApiFn }) {
  const [d, setD] = useState<any>(null);
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });
  const [f, setF] = useState<any>({});
  const [plans, setPlans] = useState<Plan[]>([]);
  const [dirtyPlans, setDirtyPlans] = useState(false);
  const [busy, setBusy] = useState("");

  function load() {
    api("/ca/admin/pricing").then((x) => {
      setD(x);
      // Date nikal chuki ho to "free" band dikhao (checkbox = abhi free hai ya nahi)
      setF({ ...(x.settings || {}), free_on: !!x.free_now, free_until: x.free_now ? x.settings?.free_until : "" });
      setPlans((x.plans || []).map((p: any) => ({ ...p, price: Number(p.price), mrp: p.mrp != null ? Number(p.mrp) : null })));
      setDirtyPlans(false);
    }).catch((e) => setMsg({ t: e.message }));
  }
  useEffect(load, [api]);

  async function saveSettings() {
    setBusy("settings"); setMsg({ t: "" });
    const body: any = {
      free_until: f.free_on ? (String(f.free_until || "").slice(0, 10) || "") : "",
      require_login: !!f.require_login, preview_cards: Number(f.preview_cards ?? 3), free_days: Number(f.free_days || 0),
    };
    if (f.free_on && !body.free_until) { setMsg({ t: "Free kab tak — date chuniye" }); setBusy(""); return; }
    if (f.pass_course_id) body.pass_course_id = Number(f.pass_course_id); else body.clear_pass = true;
    try {
      await api("/ca/admin/settings", "PUT", body);
      setMsg({ t: "Free / access settings save ho gayi", ok: true }); load();
    } catch (e: any) { setMsg({ t: e.message }); }
    setBusy("");
  }

  async function savePlans() {
    setBusy("plans"); setMsg({ t: "" });
    try {
      await api("/ca/admin/plans", "PUT", {
        plans: plans.map((p) => ({ ...p, price: Number(p.price), days: Number(p.days), mrp: p.mrp ? Number(p.mrp) : null })),
      });
      setMsg({ t: "Plans save ho gaye — students ko turant dikhenge (free period ke baad)", ok: true }); load();
    } catch (e: any) { setMsg({ t: e.message }); }
    setBusy("");
  }

  function upd(i: number, patch: Partial<Plan>) { setPlans(plans.map((p, j) => (j === i ? { ...p, ...patch } : p))); setDirtyPlans(true); }
  function move(i: number, dir: number) {
    const j = i + dir;
    if (j < 0 || j >= plans.length) return;
    const n = [...plans]; [n[i], n[j]] = [n[j], n[i]]; setPlans(n); setDirtyPlans(true);
  }

  if (!d) return msg.t ? <Msg text={msg.t} /> : <div style={{ color: MUTED }}>Loading…</div>;
  if (d.setup_needed) {
    return <div style={box}><Msg text="Pricing ke tables abhi nahi bane. Supabase SQL Editor me sql/2026-10-13_ca_pricing_video.sql chalaiye, phir ye page kholiye." /></div>;
  }
  const st = d.stats || {};
  const freeNow = d.free_now;
  const activePlans = plans.filter((p) => p.is_active);

  return (
    <div>
      <Msg text={msg.t} ok={msg.ok} />

      {/* ── Haal ── */}
      <div style={{ ...box, fontSize: 13 }}>
        {freeNow
          ? <>🎁 Abhi <b style={{ color: GREEN }}>sab ke liye free</b> hai — <b>{fmt(d.settings?.free_until)}</b> tak. Uske baad {activePlans.length
            ? <>students ko <b>{activePlans.length} plan</b> dikhenge.</>
            : <b style={{ color: YELLOW }}>koi plan nahi hai — neeche plan bana lijiye, warna free ke baad bhi sab khula rahega.</b>}</>
          : activePlans.length
            ? <>💰 Free period khatam — students ko plan lena hota hai ({activePlans.map((p) => `${p.name} ${rs(p.price)}`).join(" · ")}).</>
            : <b style={{ color: YELLOW }}>Free period khatam par koi plan chalu nahi — abhi sab ke liye khula hai.</b>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: 12 }}>
        <Tile l="Abhi plan wale" v={st.active ?? 0} color={GREEN} sub={`kul ${st.buyers ?? 0} ne kabhi liya`} />
        <Tile l="Kamai (30 din)" v={rs(st.revenue_30d)} sub={`${st.sales_30d ?? 0} plans`} />
        <Tile l="Kul kamai" v={rs(st.revenue_all)} sub={`${st.sales_all ?? 0} plans`} />
        <Tile l="7 din me khatam" v={st.expiring_7d ?? 0} color={st.expiring_7d ? YELLOW : undefined} sub="renew yaad dilaiye" />
        <Tile l="Adhoore payment" v={st.pending_orders ?? 0} sub="2 din me — apne aap jaanch" />
      </div>

      {/* ── Free period ── */}
      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>🎁 Free period</div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, fontWeight: 700 }}>
          <input type="checkbox" checked={!!f.free_on} onChange={(e) => setF({ ...f, free_on: e.target.checked, free_until: e.target.checked ? (f.free_until || "2026-12-31") : f.free_until })} />
          Sab ke liye free (plan ki zaroorat nahi)
        </label>
        {f.free_on && (
          <>
            <div style={label}>Free kab tak (is din raat 12 baje tak)</div>
            <input type="date" style={{ ...input, maxWidth: 220 }} value={f.free_until ? String(f.free_until).slice(0, 10) : ""}
              onChange={(e) => setF({ ...f, free_until: e.target.value })} />
          </>
        )}
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, margin: "12px 0 0" }}>
          <input type="checkbox" checked={!!f.require_login} onChange={(e) => setF({ ...f, require_login: e.target.checked })} />
          Free me bhi login zaroori (analytics me naam/phone dikhte hain)
        </label>

        <div style={{ fontWeight: 800, margin: "16px 0 2px" }}>🔒 Free khatam hone ke baad, bina plan wale ko</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={label}>Lock par kitne cards dikhen</div>
            <input type="number" min={0} max={20} style={input} value={f.preview_cards ?? 3} onChange={(e) => setF({ ...f, preview_cards: e.target.value })} />
          </div>
          <div>
            <div style={label}>Aakhri kitne din ka CA free (0 = koi nahi)</div>
            <input type="number" min={0} max={60} style={input} value={f.free_days ?? 0} onChange={(e) => setF({ ...f, free_days: e.target.value })} />
          </div>
        </div>
        <div style={hint}>Jaise "3" = aaj, kal, parson ke cards + un dino ka quiz/PDF sab ke liye free (login ke saath). Baaki purana CA plan se.</div>

        <details style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontSize: 12, color: MUTED }}>Advanced — purana tareeka (CA Pass course)</summary>
          <div style={label}>Ye course jisne liya, uske liye bhi CA khula (lifetime)</div>
          <select style={input} value={f.pass_course_id || ""} onChange={(e) => setF({ ...f, pass_course_id: e.target.value ? Number(e.target.value) : null })}>
            <option value="">— koi nahi (sirf plans) —</option>
            {(d.courses || []).map((c: any) => <option key={c.id} value={c.id}>#{c.id} {c.title}{c.price != null ? ` · ₹${c.price}` : ""}</option>)}
          </select>
        </details>
        <div style={{ marginTop: 14 }}><button style={goldBtn} disabled={busy === "settings"} onClick={saveSettings}>{busy === "settings" ? "Saving…" : "Save"}</button></div>
      </div>

      {/* ── Plans ── */}
      <div style={box}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <div style={{ flex: 1, fontWeight: 800 }}>💰 Plans</div>
          <button style={btn} onClick={() => { setPlans([...plans, { name: "", days: 30, price: 49, mrp: null, badge: "", is_active: true }]); setDirtyPlans(true); }}>+ Naya plan</button>
        </div>
        <div style={{ ...hint, marginBottom: 10 }}>
          Student ko isi kram me dikhte hain. "Badge" wala plan pehle se chuna hota hai. Price 0 = free trial (har student ek hi baar).
          Pehle se plan chal raha ho to naya plan uske khatam hone ke baad judta hai. Coupons (Coupons tab) yahan bhi chalte hain.
        </div>
        {plans.length === 0 && (
          <div style={{ padding: "10px 0" }}>
            <div style={{ color: MUTED, fontSize: 12.5, marginBottom: 8 }}>Abhi koi plan nahi.</div>
            <button style={btn} onClick={() => { setPlans(TEMPLATE.map((p) => ({ ...p }))); setDirtyPlans(true); }}>Shuruaat ke liye: Monthly ₹49 · 3 Months ₹129 · Yearly ₹399</button>
          </div>
        )}
        {plans.map((p, i) => (
          <div key={p.id || `n${i}`} style={{ border: `1px solid ${p.is_active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`, borderRadius: 12, padding: 10, marginBottom: 8, opacity: p.is_active ? 1 : 0.6 }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8 }}>
              <div><div style={label}>Naam (student ko)</div><input style={input} value={p.name} placeholder="Monthly" onChange={(e) => upd(i, { name: e.target.value })} /></div>
              <div><div style={label}>Kitne din</div><input style={input} type="number" min={1} value={p.days} onChange={(e) => upd(i, { days: Number(e.target.value) })} /></div>
              <div><div style={label}>Price ₹</div><input style={input} type="number" min={0} value={p.price} onChange={(e) => upd(i, { price: Number(e.target.value) })} /></div>
              <div><div style={label}>MRP ₹ (kati)</div><input style={input} type="number" min={0} value={p.mrp ?? ""} placeholder="—" onChange={(e) => upd(i, { mrp: e.target.value ? Number(e.target.value) : null })} /></div>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {[30, 90, 180, 365].map((n) => (
                <button key={n} style={{ ...btn, padding: "4px 9px", fontSize: 11, ...(p.days === n ? { borderColor: GOLD, color: GOLD } : {}) }} onClick={() => upd(i, { days: n })}>{dur(n)}</button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "flex-end", marginTop: 6, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 150 }}><div style={label}>Badge (optional)</div><input style={input} value={p.badge || ""} placeholder="Best value" onChange={(e) => upd(i, { badge: e.target.value })} /></div>
              <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 12.5, paddingBottom: 9 }}>
                <input type="checkbox" checked={p.is_active} onChange={(e) => upd(i, { is_active: e.target.checked })} /> Chalu
              </label>
              <button style={btn} onClick={() => move(i, -1)} disabled={i === 0}>↑</button>
              <button style={btn} onClick={() => move(i, 1)} disabled={i === plans.length - 1}>↓</button>
              <button style={{ ...btn, color: RED, borderColor: `${RED}66` }} onClick={() => { if (confirm("Ye plan hata dein? (Jinhone liya hai unka chalta rahega)")) { setPlans(plans.filter((_, j) => j !== i)); setDirtyPlans(true); } }}>🗑</button>
            </div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 6 }}>
              Student dekhega: <b style={{ color: "#fff" }}>{p.name || "—"}</b> · {p.price > 0 ? rs(p.price) : "Free"}{p.mrp && p.mrp > p.price ? <s style={{ marginLeft: 6 }}>{rs(p.mrp)}</s> : null} · {dur(p.days)}
              {p.days >= 60 && p.price > 0 ? ` · ${rs(Math.round((p.price * 30) / p.days))}/month` : ""}
            </div>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
          <button style={goldBtn} disabled={busy === "plans"} onClick={savePlans}>{busy === "plans" ? "Saving…" : dirtyPlans ? "💾 Plans save karo" : "Save"}</button>
          {dirtyPlans && <span style={{ fontSize: 11.5, color: YELLOW }}>Badlav abhi save nahi hue</span>}
        </div>
      </div>

      <Grant api={api} plans={plans.filter((p) => p.id)} onDone={load} />

      {/* ── Plan-wise ── */}
      {(d.by_plan || []).length > 0 && (
        <div style={box}>
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Kaunsa plan kitna bika</div>
          {d.by_plan.map((b: any) => (
            <div key={b.plan} style={{ display: "flex", fontSize: 12.5, padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ flex: 1 }}>{b.plan}</span><span style={{ color: MUTED }}>{b.sales} baar · {rs(b.revenue)}</span>
            </div>
          ))}
        </div>
      )}

      {(d.expiring || []).length > 0 && <SubList title="⏳ 7 din me khatam ho rahe" subs={d.expiring} api={api} onDone={load} />}
      <SubList title="🧾 Kisne plan liya (naye pehle)" subs={d.subs || []} api={api} onDone={load} />
    </div>
  );
}

function SubList({ title, subs, api, onDone }: { title: string; subs: any[]; api: ApiFn; onDone: () => void }) {
  const [q, setQ] = useState("");
  const s = q.trim().toLowerCase();
  const list = subs.filter((x) => !s || `${x.name || ""} ${x.phone || ""} ${x.email || ""} ${x.plan_name || ""} ${x.user_id}`.toLowerCase().includes(s));
  async function revoke(x: any) {
    if (!confirm(`${x.name || `User #${x.user_id}`} ka ${x.plan_name} abhi band kar dein?`)) return;
    try { await api(`/ca/admin/subs/${x.id}/revoke`, "POST", {}); onDone(); } catch (e: any) { alert(e.message); }
  }
  return (
    <div style={box}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontWeight: 800, flex: 1 }}>{title}</div>
        {subs.length > 8 && <input style={{ ...input, maxWidth: 180, padding: 6 }} placeholder="Dhoondho" value={q} onChange={(e) => setQ(e.target.value)} />}
      </div>
      {list.length === 0 && <div style={{ color: MUTED, fontSize: 12.5 }}>Abhi koi nahi</div>}
      {list.slice(0, 100).map((x) => {
        const pay = String(x.payment_id || "");
        const how = pay.startsWith("ADMIN") ? "admin ne diya" : pay.startsWith("COUPON") ? "100% coupon" : pay.startsWith("FREE") ? "free trial" : rs(x.amount_paid);
        return (
          <div key={x.id} style={{ padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 12.5 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ flex: 1, fontWeight: 700 }}>{x.name || `User #${x.user_id}`}</span>
              <span style={{ color: x.active ? GREEN : MUTED, fontWeight: 700, fontSize: 11.5 }}>{x.active ? "● Chalu" : "Khatam"}</span>
              {x.active && <button style={{ ...btn, padding: "3px 8px", fontSize: 11, color: RED, borderColor: `${RED}55` }} onClick={() => revoke(x)}>Band</button>}
            </div>
            <div style={{ color: MUTED, fontSize: 11.5, marginTop: 2 }}>
              {x.plan_name} · {how} · {fmt(x.starts_at)} → {fmt(x.expires_at)}{x.phone || x.email ? ` · ${x.phone || x.email}` : ""}
              {x.coupon_code ? ` · coupon ${x.coupon_code}` : ""}{x.note ? ` · ${x.note}` : ""}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Grant({ api, plans, onDone }: { api: ApiFn; plans: Plan[]; onDone: () => void }) {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<any[] | null>(null);
  const [who, setWho] = useState<any>(null);
  const [pick, setPick] = useState<string>("");
  const [days, setDays] = useState(7);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ t: string; ok?: boolean }>({ t: "" });

  async function find() {
    setMsg({ t: "" }); setWho(null);
    try { const r = await api(`/ca/admin/pricing/user?q=${encodeURIComponent(q.trim())}`); setUsers(r.users || []); }
    catch (e: any) { setMsg({ t: e.message }); }
  }
  async function give() {
    if (!who) return;
    const body: any = { user_id: who.id, note };
    if (pick) body.plan_id = Number(pick); else body.days = Number(days);
    try {
      const r = await api("/ca/admin/subs/grant", "POST", body);
      setMsg({ t: `${who.name || `User #${who.id}`} ko ${r.sub?.plan_name} mil gaya — ${fmt(r.sub?.expires_at)} tak`, ok: true });
      setWho(null); setUsers(null); setQ(""); setNote(""); onDone();
    } catch (e: any) { setMsg({ t: e.message }); }
  }
  return (
    <div style={box}>
      <div style={{ fontWeight: 800, marginBottom: 4 }}>🎁 Haath se plan dena</div>
      <div style={{ ...hint, marginBottom: 8 }}>Giveaway, YouTube winner, payment ki shikayat — student ka phone / email / user ID likhiye.</div>
      <Msg text={msg.t} ok={msg.ok} />
      <div style={{ display: "flex", gap: 8 }}>
        <input style={input} value={q} placeholder="9876543210 / name@gmail.com / 123" onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && q.trim()) find(); }} />
        <button style={btn} disabled={!q.trim()} onClick={find}>Dhoondho</button>
      </div>
      {users && users.length === 0 && <div style={{ color: MUTED, fontSize: 12.5, marginTop: 8 }}>Koi student nahi mila</div>}
      {users && users.map((u) => (
        <button key={u.id} onClick={() => setWho(u)} style={{ ...btn, width: "100%", textAlign: "left", marginTop: 6, fontWeight: 400, ...(who?.id === u.id ? { borderColor: GOLD } : {}) }}>
          <b>{u.name || `User #${u.id}`}</b> <span style={{ color: MUTED }}>#{u.id} · {u.phone || u.email || "—"}</span>
          <div style={{ fontSize: 11.5, color: u.plan ? GREEN : MUTED }}>{u.plan ? `Abhi plan: ${u.plan.name} — ${fmt(u.plan.expires_at)} tak` : "Abhi koi plan nahi"}</div>
        </button>
      ))}
      {who && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <div style={label}>Kya dena hai</div>
              <select style={input} value={pick} onChange={(e) => setPick(e.target.value)}>
                <option value="">Kuch din (neeche likhiye)</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{p.name} ({dur(p.days)})</option>)}
              </select>
            </div>
            {!pick && <div><div style={label}>Kitne din</div><input type="number" min={1} style={input} value={days} onChange={(e) => setDays(Number(e.target.value))} /></div>}
          </div>
          <div style={label}>Wajah (sirf admin ke liye)</div>
          <input style={input} value={note} placeholder="YouTube giveaway" onChange={(e) => setNote(e.target.value)} />
          <div style={{ ...hint }}>Pehle se plan ho to ye uske baad judega.</div>
          <button style={{ ...goldBtn, marginTop: 10 }} onClick={give}>{who.name || `User #${who.id}`} ko do</button>
        </div>
      )}
    </div>
  );
}
