"use client";

/**
 * PromoAdmin.tsx — "Popups": student ke kaam ke hisaab se popup.
 *
 * page.tsx me:  <PromoAdmin api={api} />
 * Backend: routers/promos.py (wahan saare niyam likhe hain).
 *
 * Ek campaign = "jisne in series me test diya YA ye cheezein khareedi (ya sab
 * login wale) + Y nahi kharida -> popup". Y (product) optional — vacancy jaisi
 * khabar me kuch bechna nahi hota.
 * Upar niyam (din me kitne, gap), neeche campaign list stats ke saath.
 */

import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import ImageField from "./ImageField";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const RED = "#ff6b6b";
const GREEN = "#5dd97c";

const inputStyle: CSSProperties = {
  width: "100%", padding: "10px", borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.4)",
  color: "#fff", fontSize: 13, boxSizing: "border-box",
};
const goldBtn: CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10,
  padding: "11px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const ghostBtn: CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`,
  borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};
const cardBox: CSSProperties = {
  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 12,
};

function Msg({ text, kind = "error" }: { text: string; kind?: "error" | "ok" }) {
  if (!text) return null;
  const c = kind === "ok" ? GREEN : RED;
  return (
    <div style={{ background: `${c}1a`, border: `1px solid ${c}55`, color: c,
      borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 10, lineHeight: 1.55 }}>
      {text}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: 11, color: "#7d7565", marginTop: 4, lineHeight: 1.5 }}>{hint}</div>}
    </label>
  );
}

const KIND_LABEL: Record<string, string> = {
  course: "Course", mock: "Mock series", tier2: "Typing / Skill Test series", descriptive: "Descriptive series",
};
const TEST_KINDS = ["mock", "tier2", "descriptive"];
const BUY_KINDS = ["course", "mock", "tier2", "descriptive"];

type Item = { type: string; id: number | null };
const keyOf = (t: string, id: any) => `${t}:${id ?? ""}`;
function parseKey(k: string): Item {
  const [t, i] = k.split(":");
  return { type: t, id: i ? Number(i) : null };
}
function itemsToKeys(raw: any): string[] {
  let a = raw;
  if (typeof a === "string") { try { a = JSON.parse(a); } catch { a = []; } }
  return (Array.isArray(a) ? a : []).filter((x: any) => x && x.type).map((x: any) => keyOf(x.type, x.id));
}

// Checkbox list — kind ke hisaab se group, upar search
function MultiPick({ kinds, products, selected, onChange, anyLabel }: {
  kinds: string[];
  products: Record<string, { id: number; title: string }[]>;
  selected: string[];
  onChange: (v: string[]) => void;
  anyLabel?: string;
}) {
  const [q, setQ] = useState("");
  const sel = new Set(selected);
  const toggle = (k: string) => {
    const n = new Set(sel);
    if (n.has(k)) n.delete(k); else n.add(k);
    onChange(Array.from(n));
  };
  const needle = q.trim().toLowerCase();
  const row = (k: string, text: string, bold = false) => (
    <label key={k} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 2px", fontSize: 13, cursor: "pointer", fontWeight: bold ? 700 : 400 }}>
      <input type="checkbox" checked={sel.has(k)} onChange={() => toggle(k)} style={{ marginTop: 3 }} />
      <span>{text}</span>
    </label>
  );
  return (
    <div>
      <input style={{ ...inputStyle, marginBottom: 8 }} placeholder="Search (jaise Punjab, SKAU)..." value={q}
        onChange={(e) => setQ(e.target.value)} />
      <div style={{ maxHeight: 260, overflowY: "auto", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 9, padding: "4px 10px" }}>
        {anyLabel && !needle && row(keyOf("any", null), anyLabel, true)}
        {kinds.map((kind) => {
          const list = (products[kind] || []).filter((p) => !needle || p.title.toLowerCase().includes(needle));
          if (!list.length) return null;
          return (
            <div key={kind} style={{ marginTop: 6 }}>
              <div style={{ fontSize: 11, color: GOLD, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, padding: "4px 0" }}>
                {KIND_LABEL[kind]}
              </div>
              {list.map((p) => row(keyOf(kind, p.id), p.title))}
            </div>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: MUTED, marginTop: 5 }}>
        {selected.length ? `${selected.length} chune — inme se koi ek bhi ho to popup dikhega` : "Kuch nahi chuna"}
        {selected.length > 0 && (
          <button type="button" onClick={() => onChange([])}
            style={{ marginLeft: 10, background: "none", border: "none", color: GOLD, cursor: "pointer", fontSize: 11.5 }}>
            Sab hatao
          </button>
        )}
      </div>
    </div>
  );
}

function defaultLink(kind: string, id: string): string {
  if (!id) return "";
  if (kind === "course") return `/course/${id}`;
  if (kind === "mock") return `/mock-tests/${id}`;
  if (kind === "descriptive") return `/descriptive/${id}`;
  if (kind === "tier2") return `/tier2?s=${id}`;
  return "";
}

// datetime-local <-> ISO (IST me dikhate hain, browser ka apna timezone)
function toLocal(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function fromLocal(v: string): string | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const EMPTY = {
  id: 0, title: "", message: "", image_url: "", button_text: "View", button_link: "",
  audience: "logged_in", target_mode: "rules", attempted: [] as string[], bought: [] as string[],
  product_kind: "", product_id: "",
  priority: "0", is_active: true, starts_at: "", ends_at: "",
};

export default function PromoAdmin({ api }: { api: ApiFn }) {
  const [camps, setCamps] = useState<any[]>([]);
  const [rules, setRules] = useState<any>({ max_per_day: 2, min_gap_hours: 4, default_days: 30, delay_seconds: 3 });
  const [products, setProducts] = useState<Record<string, { id: number; title: string }[]>>({});
  const [form, setForm] = useState<any>({ ...EMPTY });
  const [linkTouched, setLinkTouched] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    api("/promos/admin/campaigns")
      .then((d) => { setCamps(d.campaigns || []); if (d.rules) setRules(d.rules); })
      .catch((e) => setErr(e.message));
  }

  useEffect(() => {
    load();
    const pick = (rows: any[]) => (rows || []).map((r) => ({ id: r.id, title: r.title || `#${r.id}` }));
    Promise.allSettled([
      api("/admin-extra/courses"), api("/admin-extra/series"),
      api("/tier2/admin/series"), api("/admin-extra/desc/series"),
    ]).then(([c, m, t, d]) => {
      setProducts({
        course: c.status === "fulfilled" ? pick(c.value.courses) : [],
        mock: m.status === "fulfilled" ? pick(m.value.series) : [],
        tier2: t.status === "fulfilled" ? pick(t.value.series) : [],
        descriptive: d.status === "fulfilled" ? pick(d.value.series) : [],
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const nameOf = useMemo(() => (kind: string, id: any) => {
    const p = (products[kind] || []).find((x) => String(x.id) === String(id));
    return p ? p.title : id ? `#${id}` : "";
  }, [products]);

  function set(k: string, v: any) {
    const next = { ...form, [k]: v };
    // Product badla aur link haath se nahi likha — link apne aap
    if ((k === "product_kind" || k === "product_id") && !linkTouched) {
      next.button_link = defaultLink(next.product_kind, String(next.product_id || ""));
    }
    setForm(next);
  }

  async function saveRules() {
    setErr(""); setOk("");
    try {
      await api("/promos/admin/rules", "PUT", {
        max_per_day: Number(rules.max_per_day), min_gap_hours: Number(rules.min_gap_hours),
        default_days: Number(rules.default_days), delay_seconds: Number(rules.delay_seconds),
      });
      setOk("Niyam save ho gaye.");
    } catch (e: any) { setErr(e.message); }
  }

  async function save() {
    setErr(""); setOk(""); setSaving(true);
    const guest = form.audience === "guest";
    const body = {
      title: form.title, message: form.message || null, image_url: form.image_url || null,
      button_text: form.button_text || "View", button_link: form.button_link || null,
      audience: form.audience,
      target_mode: guest ? "all" : form.target_mode,
      attempted_items: guest || form.target_mode === "all" ? [] : (form.attempted as string[]).map(parseKey),
      bought_items: guest || form.target_mode === "all" ? [] : (form.bought as string[]).map(parseKey),
      product_kind: form.product_kind || null,
      product_id: form.product_id ? Number(form.product_id) : null,
      priority: Number(form.priority) || 0, is_active: !!form.is_active,
      starts_at: fromLocal(form.starts_at), ends_at: fromLocal(form.ends_at),
    };
    try {
      if (form.id) await api(`/promos/admin/campaigns/${form.id}`, "PUT", body);
      else await api("/promos/admin/campaigns", "POST", body);
      setOk(form.id ? "Popup update ho gaya." : "Popup ban gaya.");
      setForm({ ...EMPTY }); setLinkTouched(false);
      load();
    } catch (e: any) { setErr(e.message); }
    setSaving(false);
  }

  function edit(c: any) {
    setForm({
      id: c.id, title: c.title || "", message: c.message || "", image_url: c.image_url || "",
      button_text: c.button_text || "View", button_link: c.button_link || "",
      audience: c.audience || "logged_in", target_mode: c.target_mode || "rules",
      attempted: itemsToKeys(c.attempted_items).length || itemsToKeys(c.bought_items).length || !c.trigger_kind
        ? itemsToKeys(c.attempted_items) : [keyOf(c.trigger_kind, c.trigger_id)],
      bought: itemsToKeys(c.bought_items), product_kind: c.product_kind || "",
      product_id: c.product_id ? String(c.product_id) : "", priority: String(c.priority ?? 0),
      is_active: c.is_active !== false, starts_at: toLocal(c.starts_at), ends_at: toLocal(c.ends_at),
    });
    setLinkTouched(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function toggle(c: any) {
    try {
      await api(`/promos/admin/campaigns/${c.id}`, "PUT", { ...c, is_active: !c.is_active });
      load();
    } catch (e: any) { setErr(e.message); }
  }

  async function remove(c: any) {
    if (!confirm(`"${c.title}" popup aur uske saare stats delete ho jayenge. Pakka?`)) return;
    try { await api(`/promos/admin/campaigns/${c.id}`, "DELETE"); load(); } catch (e: any) { setErr(e.message); }
  }

  const guest = form.audience === "guest";
  const summary = (c: any): string => {
    if (c.audience === "guest") return "Bina login wale · har visit";
    if ((c.target_mode || "rules") === "all") return "Sab login wale students";
    const name = (k: string) => {
      const it = parseKey(k);
      if (it.type === "any") return "koi bhi test";
      return nameOf(it.type, it.id) || KIND_LABEL[it.type];
    };
    const a = itemsToKeys(c.attempted_items).length ? itemsToKeys(c.attempted_items)
      : (c.trigger_kind && !itemsToKeys(c.bought_items).length ? [keyOf(c.trigger_kind, c.trigger_id)] : []);
    const b = itemsToKeys(c.bought_items);
    const parts: string[] = [];
    const short = (ks: string[]) => ks.slice(0, 3).map(name).join(", ") + (ks.length > 3 ? ` +${ks.length - 3}` : "");
    if (a.length) parts.push(`Test diya: ${short(a)}`);
    if (b.length) parts.push(`Khareeda: ${short(b)}`);
    return parts.join(" · ya · ");
  };

  return (
    <div>
      <Msg text={err} />
      <Msg text={ok} kind="ok" />

      {/* ── Niyam ── */}
      <div style={cardBox}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Niyam (sab popups par)</h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: MUTED, lineHeight: 1.55 }}>
          Login wale student ko din me itne popup, beech me itna gap. Ek popup ek din me ek hi baar —
          band kiya to agle din phir aa sakta hai. Product khareed liya to us popup ka aana band.
          Test ke beech kabhi nahi khulta. Bina login wale ko har visit par ek popup.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
          <Field label="Din me max popup">
            <input type="number" min={0} style={inputStyle} value={rules.max_per_day}
              onChange={(e) => setRules({ ...rules, max_per_day: e.target.value })} />
          </Field>
          <Field label="Gap (ghante)">
            <input type="number" min={0} step="0.5" style={inputStyle} value={rules.min_gap_hours}
              onChange={(e) => setRules({ ...rules, min_gap_hours: e.target.value })} />
          </Field>
          <Field label="Default chalne ke din">
            <input type="number" min={1} style={inputStyle} value={rules.default_days}
              onChange={(e) => setRules({ ...rules, default_days: e.target.value })} />
          </Field>
          <Field label="Page khulne ke kitne second baad">
            <input type="number" min={0} style={inputStyle} value={rules.delay_seconds}
              onChange={(e) => setRules({ ...rules, delay_seconds: e.target.value })} />
          </Field>
        </div>
        <button style={ghostBtn} onClick={saveRules}>Niyam save karo</button>
      </div>

      {/* ── Naya / edit ── */}
      <div style={cardBox}>
        <h3 style={{ margin: "0 0 10px", fontSize: 15 }}>{form.id ? `Popup #${form.id} badlo` : "Naya popup"}</h3>

        <Field label="Kisko dikhe">
          <select style={inputStyle} value={form.audience} onChange={(e) => set("audience", e.target.value)}>
            <option value="logged_in">Login wale students — unke kaam ke hisaab se</option>
            <option value="guest">Bina login wale — sabko, har visit</option>
          </select>
        </Field>

        {!guest && (
          <div style={{ background: "rgba(255,255,255,0.035)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: GOLD, marginBottom: 8 }}>Kaun se login wale</div>
            <Field label="">
              <select style={inputStyle} value={form.target_mode} onChange={(e) => set("target_mode", e.target.value)}>
                <option value="rules">Jinhone neeche chuni cheezon me test diya ya khareeda</option>
                <option value="all">Sab login wale students (naye bhi) — vacancy jaisi khabar</option>
              </select>
            </Field>
            {form.target_mode === "rules" && (
              <>
                <div style={{ fontSize: 12.5, fontWeight: 700, margin: "6px 0" }}>Jisne in me se kisi me test diya ho</div>
                <MultiPick kinds={TEST_KINDS} products={products} selected={form.attempted}
                  anyLabel="Koi bhi test diya ho (kisi bhi series me)"
                  onChange={(v) => set("attempted", v)} />
                <div style={{ fontSize: 12.5, fontWeight: 700, margin: "14px 0 6px" }}>Ya jisne in me se kuch khareeda ho</div>
                <MultiPick kinds={BUY_KINDS} products={products} selected={form.bought}
                  onChange={(v) => set("bought", v)} />
              </>
            )}
          </div>
        )}

        <div style={{ background: "rgba(255,255,255,0.035)", borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: GOLD, marginBottom: 8 }}>
            Kya bechna hai <span style={{ color: MUTED, fontWeight: 500 }}>(optional — vacancy jaisi khabar me khaali chhodo)</span>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 160px" }}>
              <Field label="Type">
                <select style={inputStyle} value={form.product_kind}
                  onChange={(e) => { const v = e.target.value; const n = { ...form, product_kind: v, product_id: "" };
                    if (!linkTouched) n.button_link = ""; setForm(n); }}>
                  <option value="">Kuch nahi</option>
                  {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
            </div>
            <div style={{ flex: "2 1 220px" }}>
              <Field label="Product" hint={form.product_kind ? "Student ne ye khareed liya to ye popup use nahi dikhega" : "Khaali = popup end date tak chalta rahega"}>
                <select style={inputStyle} value={form.product_id} disabled={!form.product_kind}
                  onChange={(e) => set("product_id", e.target.value)}>
                  <option value="">Chuniye</option>
                  {(products[form.product_kind] || []).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </Field>
            </div>
          </div>
        </div>

        <Field label="Title (student ko English me dikhega)">
          <input style={inputStyle} value={form.title} placeholder="Ready for the SKAU exam?"
            onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label="Message">
          <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={form.message}
            placeholder="Practise with 10 full SKAU mock tests in the real exam pattern."
            onChange={(e) => set("message", e.target.value)} />
        </Field>
        <ImageField
          label="Image (optional)"
          value={form.image_url || ""}
          onChange={(v) => set("image_url", v)}
          reqW={1080}
          reqH={1080}
          where="Popup ke upar — website par (phone aur computer dono)"
          hint="Square image sabse achhi dikhti hai. Upload karo ya link paste karo."
        />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 140px" }}>
            <Field label="Button text">
              <input style={inputStyle} value={form.button_text} onChange={(e) => set("button_text", e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: "2 1 220px" }}>
            <Field label="Button link" hint="Product chunne par apne aap bharta hai. Badal bhi sakte hain.">
              <input style={inputStyle} value={form.button_link} placeholder="/mock-tests/12"
                onChange={(e) => { setLinkTouched(true); set("button_link", e.target.value); }} />
            </Field>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 120px" }}>
            <Field label="Priority" hint="Bada number pehle (barabari par)">
              <input type="number" style={inputStyle} value={form.priority} onChange={(e) => set("priority", e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: "1 1 170px" }}>
            <Field label="Shuru" hint="Khaali = abhi se">
              <input type="datetime-local" style={inputStyle} value={form.starts_at} onChange={(e) => set("starts_at", e.target.value)} />
            </Field>
          </div>
          <div style={{ flex: "1 1 170px" }}>
            <Field label="Khatam" hint={`Khaali = ${rules.default_days} din baad`}>
              <input type="datetime-local" style={inputStyle} value={form.ends_at} onChange={(e) => set("ends_at", e.target.value)} />
            </Field>
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, marginBottom: 12 }}>
          <input type="checkbox" checked={form.is_active} onChange={(e) => set("is_active", e.target.checked)} />
          Chalu
        </label>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={save} disabled={saving} style={{ ...goldBtn, flex: 1 }}>
            {saving ? "Saving..." : form.id ? "Update popup" : "+ Popup banao"}
          </button>
          {form.id ? (
            <button style={ghostBtn} onClick={() => { setForm({ ...EMPTY }); setLinkTouched(false); }}>Cancel</button>
          ) : null}
        </div>
      </div>

      {/* ── List ── */}
      {camps.length === 0 && <div style={{ color: MUTED, fontSize: 13, padding: 8 }}>Abhi koi popup nahi.</div>}
      {camps.map((c) => {
        const s = c.stats || {};
        const ended = c.ends_at && new Date(c.ends_at).getTime() < Date.now();
        const live = c.is_active && !ended;
        return (
          <div key={c.id} style={{ ...cardBox, opacity: live ? 1 : 0.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14.5 }}>{c.title}</div>
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3, lineHeight: 1.6 }}>
                  {summary(c)}
                  {c.product_kind && c.product_id ? ` → bechna: ${nameOf(c.product_kind, c.product_id)}` : ""}
                  <br />
                  {ended ? "Khatam ho gaya" : c.ends_at ? `${new Date(c.ends_at).toLocaleDateString("en-IN")} tak` : ""}
                  {` · priority ${c.priority ?? 0}`}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 800, color: live ? GREEN : MUTED, whiteSpace: "nowrap" }}>
                {live ? "● Chalu" : ended ? "Khatam" : "Band"}
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, margin: "10px 0" }}>
              {[["Dikha", s.shown], ["Students", s.students], ["Click", s.clicked], ["Khareeda", c.product_id ? s.bought : "—"]].map(([k, v]) => (
                <div key={k as string} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 9, padding: "7px 4px", textAlign: "center" }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{v === "—" ? "—" : Number(v || 0).toLocaleString("en-IN")}</div>
                  <div style={{ fontSize: 10.5, color: MUTED }}>{k}</div>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button style={ghostBtn} onClick={() => edit(c)}>Edit</button>
              <button style={ghostBtn} onClick={() => toggle(c)}>{c.is_active ? "Band karo" : "Chalu karo"}</button>
              <button style={{ ...ghostBtn, color: RED, borderColor: `${RED}66` }} onClick={() => remove(c)}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
