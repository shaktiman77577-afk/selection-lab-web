"use client";

/**
 * ComposerAdmin.tsx  --  Selection Lab admin: Mock Test Composer
 *
 * Kaam: blueprint banao -> pool health dekho -> draft mock generate karo ->
 * preview me check karo / PDF teacher ko bhejo -> publish.
 *
 * page.tsx me aise juda hai:  <ComposerAdmin api={api} />
 *
 * Endpoints (base = /qbank):
 *   GET/POST/PUT/DELETE /blueprints   ·   GET /pool-health   ·   POST /compose
 *   GET /drafts  ·  GET /preview/:id  ·  GET /preview/:id/pdf
 *   POST /swap/:id  ·  POST /publish/:id
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { API_URL } from "@/lib/config";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const RED = "#ff6b6b";
const GREEN = "#5dd97c";
const TOKEN_KEY = "sl_admin_token";

const inputStyle: CSSProperties = {
  width: "100%", padding: "11px", borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)", background: "rgba(0,0,0,0.4)",
  color: "#fff", fontSize: 14, boxSizing: "border-box",
};
const goldBtn: CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10,
  padding: "11px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const ghostBtn: CSSProperties = {
  background: "transparent", color: "#fff", border: `1px solid ${BORDER}`,
  borderRadius: 10, padding: "9px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const dangerBtn: CSSProperties = {
  background: "transparent", color: RED, border: "1px solid rgba(255,107,107,0.4)",
  borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};
const cardBox: CSSProperties = {
  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 12,
};

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: MUTED, marginTop: 4, lineHeight: 1.5 }}>{hint}</div> : null}
    </label>
  );
}

function Msg({ text, kind = "error" }: { text: string; kind?: "error" | "ok" | "warn" }) {
  if (!text) return null;
  const c = kind === "ok" ? GREEN : kind === "warn" ? GOLD : RED;
  return (
    <div style={{
      background: `${c}1a`, border: `1px solid ${c}55`, color: c,
      borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 10, lineHeight: 1.55,
    }}>{text}</div>
  );
}

type Topic = { topic: string; count: number; grouped?: boolean };
type PoolTopic = { topic: string; always?: boolean };
type Section = {
  name: string; minutes?: number; topics: Topic[];
  // Pool mode — GA/Reasoning jaise sections ke liye, jahan topic section ke
  // slots se kaheen zyada hote hain
  mode?: "fixed" | "pool";
  total?: number; per_topic?: number; pool?: PoolTopic[];
};

const BLANK_BP = {
  id: 0, name: "", exam_tag: "SSC", exam_id: null as number | null,
  duration_minutes: 60, total_marks: 100, negative_marking: 0.25,
  pass_percentage: 35, section_lock: false, sections: [] as Section[],
};

// ===========================================================================
export default function ComposerAdmin({ api }: { api: ApiFn }) {
  const [view, setView] = useState<"blueprints" | "generate" | "drafts" | "images">("blueprints");
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  function flash(msg: string) { setOk(msg); setTimeout(() => setOk(""), 4000); }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {([["blueprints", "📐 Blueprints"], ["generate", "⚙️ Generate"],
           ["drafts", "📄 Drafts"], ["images", "🖼️ Images"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => { setView(k); setErr(""); }}
            style={view === k ? { ...goldBtn, padding: "9px 14px" } : ghostBtn}>{label}</button>
        ))}
      </div>

      <Msg text={err} />
      <Msg text={ok} kind="ok" />

      {view === "blueprints" && <Blueprints api={api} onErr={setErr} onOk={flash} />}
      {view === "generate" && <Generate api={api} onErr={setErr} onOk={flash} />}
      {view === "drafts" && <Drafts api={api} onErr={setErr} onOk={flash} />}
      {view === "images" && <Images api={api} onErr={setErr} onOk={flash} />}
    </div>
  );
}

// ── BLUEPRINTS ─────────────────────────────────────────────────────────────
function Blueprints({ api, onErr, onOk }: { api: ApiFn; onErr: (s: string) => void; onOk: (s: string) => void }) {
  const [list, setList] = useState<any[]>([]);
  const [draft, setDraft] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    api("/qbank/blueprints").then((d) => setList(d.blueprints || [])).catch((e) => onErr(e.message));
  }
  useEffect(load, []);

  async function save() {
    if (!draft.name.trim()) return onErr("Blueprint ka naam daaliye");
    if (!draft.sections.length) return onErr("Kam se kam ek section chahiye");
    for (const sec of draft.sections as Section[]) {
      if (sec.mode === "pool") {
        const n = (sec.pool || []).filter((t) => (t.topic || "").trim()).length;
        if (!Number(sec.total)) return onErr(`“${sec.name || "section"}” me total questions daaliye`);
        if (!n) return onErr(`“${sec.name || "section"}” ke pool me ek bhi topic nahi hai`);
      }
    }
    setSaving(true); onErr("");
    try {
      const body = { ...draft };
      delete body.id; delete body.created_at; delete body.is_active;
      // Pool section me topics[] bhejna backend ko confuse karta hai aur ulta
      // fixed section me pool[] — isliye jo mode nahi hai uska data hata do
      body.sections = (draft.sections as Section[]).map((sec) =>
        sec.mode === "pool"
          ? { name: sec.name, minutes: sec.minutes, mode: "pool",
              total: Number(sec.total) || 0, per_topic: Math.max(1, Number(sec.per_topic) || 1),
              pool: (sec.pool || []).filter((t) => (t.topic || "").trim()) }
          : { name: sec.name, minutes: sec.minutes, mode: "fixed",
              topics: (sec.topics || []).filter((t) => (t.topic || "").trim() && Number(t.count) > 0) }
      );
      if (draft.id) await api(`/qbank/blueprints/${draft.id}`, "PUT", body);
      else await api("/qbank/blueprints", "POST", body);
      setDraft(null); load(); onOk("Blueprint save ho gaya");
    } catch (e: any) { onErr(e.message); }
    setSaving(false);
  }

  async function remove(id: number) {
    if (!confirm("Ye blueprint hat jayega. Pehle se bane mock tests par koi asar nahi padega. Pakka?")) return;
    try { await api(`/qbank/blueprints/${id}`, "DELETE"); load(); } catch (e: any) { onErr(e.message); }
  }

  // ── total questions ki ginti — admin ko turant dikhe ki paper kitna bada hai
  const secQ = (sec: Section) =>
    sec.mode === "pool"
      ? Number(sec.total) || 0
      : (sec.topics || []).reduce((t: number, x: Topic) => t + (Number(x.count) || 0), 0);
  const total = draft ? draft.sections.reduce((s: number, sec: Section) => s + secQ(sec), 0) : 0;

  if (!draft) {
    return (
      <div>
        <button onClick={() => setDraft({ ...BLANK_BP, sections: [] })} style={{ ...goldBtn, marginBottom: 14 }}>
          + Naya blueprint
        </button>
        {!list.length && (
          <div style={{ ...cardBox, fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
            Abhi koi blueprint nahi hai. Blueprint yaani exam ka pattern — kitne section,
            har section me kaunse topic se kitne question, kitna time, kitni negative marking.
            Ek baar bana lo, phir usi se jitne chaho mock generate kar sakte ho.
          </div>
        )}
        {list.map((b) => {
          const qs = (b.sections || []).reduce((s: number, sec: Section) => s + secQ(sec), 0);
          return (
            <div key={b.id} style={cardBox}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{b.name}</div>
                  <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4, lineHeight: 1.6 }}>
                    {b.exam_tag || "no tag"} · {qs} Q · {b.duration_minutes} min · {b.total_marks} marks
                    {Number(b.negative_marking) ? ` · −${b.negative_marking}` : " · no negative"}
                    {b.section_lock ? " · section lock" : ""}
                    <br />{(b.sections || []).map((s: Section) =>
                      s.mode === "pool" ? `${s.name} (pool ${(s.pool || []).length})` : s.name).join(" · ")}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setDraft({ ...b, sections: b.sections || [] })} style={ghostBtn}>Edit</button>
                  <button onClick={() => remove(b.id)} style={dangerBtn}>Delete</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const set = (k: string, v: any) => setDraft({ ...draft, [k]: v });
  const setSec = (i: number, s: Section) => {
    const next = [...draft.sections]; next[i] = s; set("sections", next);
  };

  return (
    <div style={cardBox}>
      <Field label="Blueprint ka naam"><input style={inputStyle} value={draft.name}
        onChange={(e) => set("name", e.target.value)} placeholder="SSC CGL Tier 1 — 2026 pattern" /></Field>

      <Field label="Exam tag" hint="Sirf isi tag wale questions uthenge. Question par {SSC,Banking} dono ho to wo dono me chalega.">
        <input style={inputStyle} value={draft.exam_tag || ""}
          onChange={(e) => set("exam_tag", e.target.value)} placeholder="SSC" /></Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Duration (min)"><input style={inputStyle} type="number" value={draft.duration_minutes}
          onChange={(e) => set("duration_minutes", Number(e.target.value))} /></Field>
        <Field label="Total marks"><input style={inputStyle} type="number" value={draft.total_marks}
          onChange={(e) => set("total_marks", Number(e.target.value))} /></Field>
        <Field label="Negative marking" hint="Per galat jawab"><input style={inputStyle} type="number" step="0.01"
          value={draft.negative_marking} onChange={(e) => set("negative_marking", Number(e.target.value))} /></Field>
        <Field label="Pass %"><input style={inputStyle} type="number" value={draft.pass_percentage}
          onChange={(e) => set("pass_percentage", Number(e.target.value))} /></Field>
      </div>

      <label style={{ display: "flex", gap: 9, alignItems: "center", margin: "4px 0 14px", fontSize: 13 }}>
        <input type="checkbox" checked={!!draft.section_lock}
          onChange={(e) => set("section_lock", e.target.checked)} />
        Section lock (SSC jaisa — ek section ka time khatam to wapas nahi jaa sakte)
      </label>

      <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <b style={{ fontSize: 13.5 }}>Sections</b>
          <span style={{ fontSize: 12, color: total ? GOLD : MUTED, fontWeight: 700 }}>{total} questions</span>
        </div>

        {draft.sections.map((sec: Section, i: number) => (
          <SectionEditor key={i} sec={sec} onChange={(s) => setSec(i, s)}
            onRemove={() => set("sections", draft.sections.filter((_: any, j: number) => j !== i))} />
        ))}

        <button onClick={() => set("sections", [...draft.sections, { name: "", minutes: 15, mode: "fixed", topics: [], pool: [], total: 20, per_topic: 1 }])}
          style={{ ...ghostBtn, width: "100%" }}>+ Section jodo</button>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={save} disabled={saving} style={{ ...goldBtn, flex: 1, opacity: saving ? 0.6 : 1 }}>
          {saving ? "Saving…" : "Save blueprint"}
        </button>
        <button onClick={() => { setDraft(null); onErr(""); }} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
      </div>
    </div>
  );
}

function SectionEditor({ sec, onChange, onRemove }: { sec: Section; onChange: (s: Section) => void; onRemove: () => void }) {
  const isPool = sec.mode === "pool";
  const setTopic = (i: number, t: Topic) => {
    const topics = [...sec.topics]; topics[i] = t; onChange({ ...sec, topics });
  };
  const setPool = (i: number, t: PoolTopic) => {
    const pool = [...(sec.pool || [])]; pool[i] = t; onChange({ ...sec, pool });
  };
  const fixedCount = sec.topics.reduce((s, t) => s + (Number(t.count) || 0), 0);
  const alwaysN = (sec.pool || []).filter((p) => p.always).length;
  const per = Math.max(1, Number(sec.per_topic) || 1);

  return (
    <div style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input style={{ ...inputStyle, flex: 2 }} placeholder="Section (English)"
          value={sec.name} onChange={(e) => onChange({ ...sec, name: e.target.value })} />
        <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="min"
          value={sec.minutes ?? ""} onChange={(e) => onChange({ ...sec, minutes: Number(e.target.value) })} />
        <button onClick={onRemove} style={dangerBtn}>✕</button>
      </div>

      <div style={{ display: "flex", gap: 6, marginBottom: 11 }}>
        {(["fixed", "pool"] as const).map((m) => (
          <button key={m} onClick={() => onChange({ ...sec, mode: m })}
            style={{
              ...ghostBtn, flex: 1, padding: "7px 10px", fontSize: 12,
              ...((sec.mode || "fixed") === m ? { background: GOLD, color: "#1a1a1a", border: "none" } : {}),
            }}>
            {m === "fixed" ? "Fixed topics" : "Topic pool"}
          </button>
        ))}
      </div>

      {!isPool && (
        <>
          {sec.topics.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 7, alignItems: "center" }}>
              <input style={{ ...inputStyle, flex: 3, padding: "9px" }} placeholder="Topic ka naam (bank jaisa)"
                value={t.topic} onChange={(e) => setTopic(i, { ...t, topic: e.target.value })} />
              <input style={{ ...inputStyle, width: 60, padding: "9px" }} type="number" placeholder="Q"
                value={t.count} onChange={(e) => setTopic(i, { ...t, count: Number(e.target.value) })} />
              <label title="Passage wala set — poora uthta hai ya bilkul nahi"
                style={{ fontSize: 11, color: t.grouped ? GOLD : MUTED, display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}>
                <input type="checkbox" checked={!!t.grouped} onChange={(e) => setTopic(i, { ...t, grouped: e.target.checked })} />
                set
              </label>
              <button onClick={() => onChange({ ...sec, topics: sec.topics.filter((_, j) => j !== i) })} style={dangerBtn}>✕</button>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <button onClick={() => onChange({ ...sec, topics: [...sec.topics, { topic: "", count: 1 }] })}
              style={{ ...ghostBtn, padding: "7px 11px", fontSize: 12 }}>+ Topic</button>
            <span style={{ fontSize: 11.5, color: MUTED }}>{fixedCount} Q</span>
          </div>
          <div style={{ fontSize: 10.5, color: MUTED, marginTop: 8, lineHeight: 1.5 }}>
            Har topic ka count aap khud likh rahe ho — har mock me yahi pattern rahega.
            English jaise sections ke liye sahi, jahan pattern har paper me ek jaisa hota hai.
          </div>
        </>
      )}

      {isPool && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <label>
              <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 4 }}>Section me total Q</div>
              <input style={{ ...inputStyle, padding: "9px" }} type="number"
                value={sec.total ?? ""} onChange={(e) => onChange({ ...sec, total: Number(e.target.value) })} />
            </label>
            <label>
              <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 4 }}>Har topic se</div>
              <input style={{ ...inputStyle, padding: "9px" }} type="number" min={1}
                value={sec.per_topic ?? 1} onChange={(e) => onChange({ ...sec, per_topic: Math.max(1, Number(e.target.value)) })} />
            </label>
          </div>

          {(sec.pool || []).map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 6, marginBottom: 7, alignItems: "center" }}>
              <input style={{ ...inputStyle, flex: 3, padding: "9px" }} placeholder="Topic ka naam"
                value={t.topic} onChange={(e) => setPool(i, { ...t, topic: e.target.value })} />
              <label title="Ye topic har mock me aayega"
                style={{ fontSize: 11, color: t.always ? GOLD : MUTED, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", whiteSpace: "nowrap" }}>
                <input type="checkbox" checked={!!t.always} onChange={(e) => setPool(i, { ...t, always: e.target.checked })} />
                hamesha
              </label>
              <button onClick={() => onChange({ ...sec, pool: (sec.pool || []).filter((_, j) => j !== i) })} style={dangerBtn}>✕</button>
            </div>
          ))}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <button onClick={() => onChange({ ...sec, pool: [...(sec.pool || []), { topic: "" }] })}
              style={{ ...ghostBtn, padding: "7px 11px", fontSize: 12 }}>+ Topic</button>
            <span style={{ fontSize: 11.5, color: MUTED }}>
              {(sec.pool || []).length} topic · {alwaysN} hamesha
            </span>
          </div>

          <div style={{ fontSize: 10.5, color: MUTED, marginTop: 8, lineHeight: 1.55 }}>
            Pool me topic section ke slots se zyada rakho. Composer har mock me alag
            topic chunega — jo pichhle mocks me sabse kam aaya wo pehle. Isse 40 topic
            wale GA section me bhi saare topic baari-baari se aate hain.
            <br /><br />
            <b style={{ color: GOLD }}>hamesha</b> un topics par lagao jo har paper me poochhe
            jaate hain — wo rotation se bahar rehte hain aur har mock me aate hain.
            {sec.total && alwaysN * per > Number(sec.total) ? (
              <div style={{ color: RED, marginTop: 6 }}>
                ⚠ {alwaysN} “hamesha” topic × {per} = {alwaysN * per} Q, par total {sec.total} hai.
                Rotation ke liye jagah hi nahi bachegi.
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

// ── GENERATE ───────────────────────────────────────────────────────────────
function Generate({ api, onErr, onOk }: { api: ApiFn; onErr: (s: string) => void; onOk: (s: string) => void }) {
  const [bps, setBps] = useState<any[]>([]);
  const [series, setSeries] = useState<any[]>([]);
  const [bpId, setBpId] = useState(0);
  const [seriesId, setSeriesId] = useState(0);
  const [count, setCount] = useState(1);
  const [title, setTitle] = useState("Mock Test");
  const [freeCount, setFreeCount] = useState(1);
  const [health, setHealth] = useState<any | null>(null);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    api("/qbank/blueprints").then((d) => setBps(d.blueprints || [])).catch((e) => onErr(e.message));
    api("/admin-extra/series").then((d) => setSeries(d.series || [])).catch(() => {});
  }, []);

  // Blueprint ya series badla to purani health bekaar — warna admin galat
  // stock dekh kar generate daba deta hai.
  useEffect(() => { setHealth(null); setResult(null); }, [bpId, seriesId, count]);
  useEffect(() => { setFreeCount((f) => Math.min(f, count)); }, [count]);

  async function check() {
    if (!bpId) return onErr("Blueprint choose kijiye");
    setBusy("check"); onErr("");
    try {
      const qs = new URLSearchParams({ blueprint_id: String(bpId), planned_mocks: String(count) });
      if (seriesId) qs.set("series_id", String(seriesId));
      setHealth(await api(`/qbank/pool-health?${qs}`));
    } catch (e: any) { onErr(e.message); }
    setBusy("");
  }

  async function generate() {
    if (!bpId) return onErr("Blueprint choose kijiye");
    if (!title.trim()) return onErr("Title daaliye");
    if (count > 1 && !seriesId) {
      return onErr("Ek se zyada mock banane hain to series choose kijiye — warna repeat rokna mumkin nahi.");
    }
    setBusy("gen"); onErr("");
    try {
      const d = await api("/qbank/compose", "POST", {
        blueprint_id: bpId, series_id: seriesId || null,
        title: title.trim(), title_prefix: title.trim(),
        count, is_free: false, free_count: freeCount, price: 0,
      });
      setResult(d);
      onOk(`${d.created.length} draft ban gaya${d.created.length > 1 ? "e" : ""}`);
    } catch (e: any) { onErr(e.message); }
    setBusy("");
  }

  return (
    <div>
      <div style={cardBox}>
        <Field label="Blueprint">
          <select style={inputStyle} value={bpId} onChange={(e) => setBpId(Number(e.target.value))}>
            <option value={0}>— choose —</option>
            {bps.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Field>

        <Field label="Series" hint="Series choose karne par is series ke kisi bhi mock me laga hua question dobara nahi aayega.">
          <select style={inputStyle} value={seriesId} onChange={(e) => setSeriesId(Number(e.target.value))}>
            <option value={0}>— koi series nahi —</option>
            {series.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
          </select>
        </Field>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
          <Field label="Title" hint={count > 1 ? "Number apne aap lagega: “… 1”, “… 2”" : undefined}>
            <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
          <Field label="Kitne mock"><input style={inputStyle} type="number" min={1} max={30}
            value={count} onChange={(e) => setCount(Math.max(1, Math.min(30, Number(e.target.value))))} /></Field>
        </div>

        <Field label="Kitne mock FREE"
          hint="Shuru ke itne mock free honge, baaki paid. Series me aam tareeka yahi hai — pehla mock free taaki student chakh kar dekh le.">
          <input style={inputStyle} type="number" min={0} max={count} value={freeCount}
            onChange={(e) => setFreeCount(Math.max(0, Math.min(count, Number(e.target.value))))} />
        </Field>

        <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 14, lineHeight: 1.6 }}>
          {freeCount === 0
            ? "Saare mock paid honge."
            : freeCount >= count
            ? `Saare ${count} mock free honge.`
            : `Mock 1${freeCount > 1 ? `–${freeCount}` : ""} free, baaki ${count - freeCount} paid.`}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={check} disabled={!!busy} style={{ ...ghostBtn, flex: 1 }}>
            {busy === "check" ? "Checking…" : "1. Stock check"}
          </button>
          <button onClick={generate} disabled={!!busy} style={{ ...goldBtn, flex: 1, opacity: busy ? 0.6 : 1 }}>
            {busy === "gen" ? "Ban raha hai…" : "2. Generate"}
          </button>
        </div>
      </div>

      {health && <PoolHealth health={health} />}

      {result && (
        <div style={cardBox}>
          <b style={{ fontSize: 13.5 }}>Bane hue drafts</b>
          {result.created.map((m: any) => (
            <div key={m.mock_test_id} style={{ fontSize: 12.5, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
              <span style={{ color: "#fff" }}>{m.title}</span> — {m.questions} Q · id #{m.mock_test_id}
              {m.is_free ? <span style={{ color: GREEN }}> · FREE</span> : <span> · paid</span>}
              {m.warnings.map((w: string, i: number) => (
                <div key={i} style={{ color: GOLD, fontSize: 11.5 }}>⚠ {w}</div>
              ))}
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 10 }}>
            Ab “📄 Drafts” me jaakar preview karo, PDF bhejo, phir publish.
          </div>
        </div>
      )}
    </div>
  );
}

function PoolHealth({ health }: { health: any }) {
  return (
    <div style={cardBox}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <b style={{ fontSize: 13.5 }}>Stock — {health.planned_mocks} mock ke liye</b>
        <span style={{ fontSize: 12, fontWeight: 800, color: health.ok ? GREEN : GOLD }}>
          {health.ok ? "✓ poora hai" : `⚠ ${health.shortages.length} topic kam`}
        </span>
      </div>

      {!health.ok && (
        <div style={{ fontSize: 11.5, color: GOLD, marginBottom: 10, lineHeight: 1.6 }}>
          Kam stock wale topics par paper phir bhi ban jayega, bas utne question kam honge.
          Pehle upload kar lo to poora paper milega.
        </div>
      )}

      {health.topics.map((t: any, i: number) => (
        <div key={i} style={{
          display: "flex", justifyContent: "space-between", gap: 10,
          fontSize: 12, padding: "7px 0", borderTop: i ? `1px solid rgba(255,255,255,0.06)` : "none",
        }}>
          <span style={{ color: MUTED, minWidth: 0 }}>
            <span style={{ color: "#fff" }}>{t.topic}</span>
            <span style={{ fontSize: 10.5 }}> · {t.section}</span>
            {t.missing_topic && <span style={{ color: RED, fontSize: 10.5 }}> · bank me nahi hai</span>}
          </span>
          <span style={{ color: t.enough ? GREEN : GOLD, fontWeight: 700, whiteSpace: "nowrap" }}>
            {t.available} / {t.per_mock * health.planned_mocks}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── IMAGES — ek mock ki saari images ek saath ────────────────────────────
function Images({ api, onErr, onOk }: { api: ApiFn; onErr: (s: string) => void; onOk: (s: string) => void }) {
  const [pending, setPending] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [ready, setReady] = useState<boolean | null>(null);

  function loadPending() {
    api("/uploads/pending-images").then(setPending).catch((e) => onErr(e.message));
  }
  useEffect(() => {
    api("/uploads/status").then((d) => setReady(!!d.imgbb_ready)).catch(() => setReady(false));
    loadPending();
  }, []);

  async function upload(files: FileList | null) {
    if (!files || !files.length) return;
    if (files.length > 60) return onErr("Ek baar me 60 image tak");
    setBusy(true); onErr(""); setResult(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("files", f));
      // api() JSON bhejta hai, yahan FormData chahiye — isliye seedha fetch
      const res = await fetch(`${API_URL}/uploads/bulk-images`, {
        method: "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` },
        body: fd,
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || `Upload fail (${res.status})`);
      setResult(d);
      onOk(`${d.uploaded} image upload, ${d.matched_questions} question par lagi`);
      loadPending();
    } catch (e: any) { onErr(e.message); }
    setBusy(false);
  }

  return (
    <div>
      {ready === false && (
        <div style={{ ...cardBox, borderColor: RED, fontSize: 12.5, color: RED, lineHeight: 1.6 }}>
          IMGBB_API_KEY set nahi hai. Railway → Variables me daaliye, warna upload nahi chalega.
        </div>
      )}

      <div style={cardBox}>
        <div style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.65, marginBottom: 12 }}>
          TSV me image ka pura URL likhne ki zarurat nahi — sirf file ka naam likho
          (<span style={{ color: "#fff" }}>M7-Q30-Clock.png</span>). Yahan images upload
          karo, naam se match karke sahi question par apne aap lag jayengi.
          <br /><br />
          Ek hi naam jitni jagah likha hai — question me, explanation me, DI ke paanchon
          question me — sab par ek hi upload se lag jayega. Chhota-bada akshar
          (.PNG / .png) matter nahi karta.
        </div>

        <label style={{ ...goldBtn, display: "block", textAlign: "center", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Upload ho rahi hain…" : "🖼️ Images choose karo"}
          <input type="file" accept="image/*" multiple disabled={busy}
            onChange={(e) => { upload(e.target.files); e.target.value = ""; }}
            style={{ display: "none" }} />
        </label>
      </div>

      {result && (
        <div style={cardBox}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
            {result.uploaded} upload · {result.matched_questions} question par lagi
            {result.failed ? ` · ${result.failed} fail` : ""}
          </div>
          {result.results.map((r: any, i: number) => (
            <div key={i} style={{ fontSize: 11.5, padding: "5px 0", lineHeight: 1.5,
              borderTop: i ? "1px solid rgba(255,255,255,0.06)" : "none",
              color: !r.ok ? RED : r.matched ? GREEN : GOLD }}>
              {!r.ok ? "✕" : r.matched ? "✓" : "⚠"} {r.file}
              {r.ok && <span style={{ color: MUTED }}> — {r.matched
                ? `${r.matched} question par lagi`
                : "is naam ka koi question nahi mila"}</span>}
              {!r.ok && <span style={{ color: MUTED }}> — {r.error}</span>}
            </div>
          ))}
          {result.unmatched_files?.length ? (
            <div style={{ fontSize: 11.5, color: GOLD, marginTop: 10, lineHeight: 1.6 }}>
              Jo match nahi hue: TSV me naam check karo — spelling ya extension alag
              ho sakti hai. Image ImgBB par chali gayi hai, sirf question se judi nahi.
            </div>
          ) : null}
        </div>
      )}

      <div style={cardBox}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <b style={{ fontSize: 13.5 }}>Baaki images</b>
          <button onClick={loadPending} style={{ ...ghostBtn, padding: "6px 11px", fontSize: 12 }}>↻</button>
        </div>
        {!pending ? (
          <div style={{ fontSize: 12.5, color: MUTED }}>Load…</div>
        ) : !pending.count ? (
          <div style={{ fontSize: 12.5, color: GREEN }}>✓ Sab images lag chuki hain</div>
        ) : (
          <>
            <div style={{ fontSize: 12.5, color: GOLD, marginBottom: 8 }}>
              {pending.count} jagah abhi sirf filename pada hai
            </div>
            {pending.filenames.slice(0, 40).map((f: string, i: number) => (
              <div key={i} style={{ fontSize: 11.5, color: MUTED, padding: "3px 0" }}>· {f}</div>
            ))}
            {pending.filenames.length > 40 && (
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 4 }}>
                …aur {pending.filenames.length - 40}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── RETOPIC — ek section ke topic badal kar sirf wahi section dobara ─────
function Retopic({ api, testId, section, onDone, onCancel, onErr }: {
  api: ApiFn; testId: number; section: string;
  onDone: () => void; onCancel: () => void; onErr: (s: string) => void;
}) {
  const [rows, setRows] = useState<Topic[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Abhi is section me kaunse topic hain — wahi list edit karne ko milti hai
    api(`/qbank/sections/${testId}`)
      .then((d) => {
        const me = (d.sections || []).find((x: any) => x.section === section);
        setRows(me ? me.topics.map((t: any) => ({ topic: t.topic, count: t.count })) : []);
      })
      .catch((e) => { onErr(e.message); setRows([]); });
  }, [testId, section]);

  async function apply() {
    const clean = (rows || []).filter((t) => (t.topic || "").trim() && Number(t.count) > 0);
    if (!clean.length) return onErr("Kam se kam ek topic chahiye");
    setBusy(true); onErr("");
    try {
      const d = await api(`/qbank/retopic/${testId}`, "POST", {
        section, mode: "fixed", topics: clean,
      });
      if (d.warnings?.length) onErr(d.warnings.join(" · "));
      onDone();
    } catch (e: any) { onErr(e.message); }
    setBusy(false);
  }

  if (!rows) return <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>Load…</div>;

  const total = rows.reduce((s, t) => s + (Number(t.count) || 0), 0);

  return (
    <div style={{ ...cardBox, borderColor: GOLD }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10, lineHeight: 1.6 }}>
        Sirf <b style={{ color: "#fff" }}>{section}</b> section dobara banega — baaki
        sections jaise hain waise rahenge. Purane questions pool me wapas chale
        jayenge, isliye kuch kharab nahi hota.
      </div>

      {rows.map((t, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 7 }}>
          <input style={{ ...inputStyle, flex: 3, padding: "9px" }} placeholder="Topic"
            value={t.topic}
            onChange={(e) => { const r = [...rows]; r[i] = { ...t, topic: e.target.value }; setRows(r); }} />
          <input style={{ ...inputStyle, width: 60, padding: "9px" }} type="number"
            value={t.count}
            onChange={(e) => { const r = [...rows]; r[i] = { ...t, count: Number(e.target.value) }; setRows(r); }} />
          <button onClick={() => setRows(rows.filter((_, j) => j !== i))} style={dangerBtn}>✕</button>
        </div>
      ))}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", margin: "8px 0 12px" }}>
        <button onClick={() => setRows([...rows, { topic: "", count: 1 }])}
          style={{ ...ghostBtn, padding: "7px 11px", fontSize: 12 }}>+ Topic</button>
        <span style={{ fontSize: 11.5, color: MUTED }}>{total} Q</span>
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={apply} disabled={busy} style={{ ...goldBtn, flex: 1, opacity: busy ? 0.6 : 1 }}>
          {busy ? "Ban raha hai…" : "Section dobara banao"}
        </button>
        <button onClick={onCancel} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
      </div>
    </div>
  );
}

// ── IMAGE — render hua ya nahi, aur na hua to theek karne ka rasta ────────
function QImage({ api, qid, url, field, label, onFixed }: {
  api: ApiFn; qid: number; url: string;
  field: "image_url" | "explanation_image_url"; label: string; onFixed: () => void;
}) {
  // "loading" -> browser koshish kar raha hai
  // "ok"      -> image sach me screen par aa gayi
  // "fail"    -> link to hai par image nahi aayi (dead link ya sirf filename)
  const [state, setState] = useState<"loading" | "ok" | "fail">("loading");
  const [fix, setFix] = useState("");
  const [saving, setSaving] = useState(false);

  const isFilename = !/^https?:\/\//i.test(url.trim());

  async function save() {
    if (!fix.trim()) return;
    setSaving(true);
    try {
      await api(`/qbank/question-image/${qid}`, "POST", { [field]: fix.trim() });
      onFixed();
    } catch { /* upar Msg me dikh jayega */ }
    setSaving(false);
  }

  return (
    <div style={{ marginTop: 8 }}>
      {!isFilename && (
        <img src={url} alt="" onLoad={() => setState("ok")} onError={() => setState("fail")}
          style={{
            maxWidth: "100%", borderRadius: 8, border: `1px solid ${BORDER}`,
            display: state === "fail" ? "none" : "block",
          }} />
      )}

      <div style={{ fontSize: 10.5, marginTop: 4, color: state === "ok" ? GREEN : GOLD, lineHeight: 1.5 }}>
        {isFilename
          ? `⚠ ${label}: abhi sirf filename hai (${url}) — Images tab se upload karo`
          : state === "ok" ? `✓ ${label} load ho gayi`
          : state === "loading" ? `… ${label} load ho rahi hai`
          : `⚠ ${label} load nahi hui — link kharab hai`}
      </div>

      {(state === "fail" || isFilename) && (
        <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
          <input style={{ ...inputStyle, padding: "8px", fontSize: 12 }}
            placeholder="Sahi image URL paste karo" value={fix}
            onChange={(e) => setFix(e.target.value)} />
          <button onClick={save} disabled={saving || !fix.trim()}
            style={{ ...ghostBtn, padding: "8px 12px", fontSize: 12 }}>
            {saving ? "…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── DRAFTS + PREVIEW ───────────────────────────────────────────────────────
function Drafts({ api, onErr, onOk }: { api: ApiFn; onErr: (s: string) => void; onOk: (s: string) => void }) {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [openId, setOpenId] = useState(0);

  function load() {
    api("/qbank/drafts").then((d) => setDrafts(d.drafts || [])).catch((e) => onErr(e.message));
  }
  useEffect(load, []);

  if (openId) return <Preview api={api} testId={openId} onBack={() => { setOpenId(0); load(); }} onErr={onErr} onOk={onOk} />;

  return (
    <div>
      {!drafts.length && (
        <div style={{ ...cardBox, fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
          Koi draft pending nahi. “⚙️ Generate” se naya mock banao.
        </div>
      )}
      {drafts.map((d) => (
        <div key={d.id} style={{ ...cardBox, display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{d.title}</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>
              #{d.id} · {d.total_questions} Q · {d.duration_minutes} min · {d.is_free ? "Free" : "Paid"}
            </div>
          </div>
          <button onClick={() => setOpenId(d.id)} style={{ ...goldBtn, padding: "9px 14px", flexShrink: 0 }}>Open</button>
        </div>
      ))}
    </div>
  );
}

function Preview({ api, testId, onBack, onErr, onOk }: {
  api: ApiFn; testId: number; onBack: () => void; onErr: (s: string) => void; onOk: (s: string) => void;
}) {
  const [data, setData] = useState<any | null>(null);
  const [busy, setBusy] = useState("");
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [retopic, setRetopic] = useState("");

  function load() {
    api(`/qbank/preview/${testId}`).then(setData).catch((e) => onErr(e.message));
  }
  useEffect(load, [testId]);

  async function downloadPdf() {
    setBusy("pdf"); onErr("");
    try {
      // api() JSON parse karta hai, yahan PDF blob aati hai — isliye seedha fetch.
      const res = await fetch(`${API_URL}/qbank/preview/${testId}/pdf`, {
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) || ""}` },
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || `PDF nahi bani (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(data?.test?.title || "mock").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_")}_review.pdf`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch (e: any) { onErr(e.message); }
    setBusy("");
  }

  async function swap(qid: number) {
    setBusy(`swap${qid}`); onErr("");
    try {
      await api(`/qbank/swap/${testId}`, "POST", { question_id: qid });
      load();
    } catch (e: any) { onErr(e.message); }
    setBusy("");
  }

  async function publish() {
    if (!confirm("Publish ke baad ye paper jam jayega — har student ko yahi questions milenge. Pakka?")) return;
    setBusy("pub"); onErr("");
    try {
      await api(`/qbank/publish/${testId}`, "POST", {});
      onOk("Publish ho gaya");
      onBack();
    } catch (e: any) { onErr(e.message); }
    setBusy("");
  }

  if (!data) return <div style={{ fontSize: 13, color: MUTED }}>Load ho raha hai…</div>;

  const t = data.test;
  const qs: any[] = data.questions || [];
  let lastSection = "";
  let lastGroup = "";

  return (
    <div>
      <div style={{ ...cardBox, position: "sticky", top: 0, zIndex: 5 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{t.title}</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>
              {qs.length} Q · {t.duration_minutes} min · {t.total_marks} marks
              {Number(t.negative_marking) ? ` · −${t.negative_marking}` : ""}
            </div>
          </div>
          <button onClick={onBack} style={ghostBtn}>← Back</button>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => setLang(lang === "en" ? "hi" : "en")} style={ghostBtn}>
            {lang === "en" ? "🔤 English" : "🔠 हिन्दी"}
          </button>
          <button onClick={downloadPdf} disabled={!!busy} style={{ ...ghostBtn, flex: 1 }}>
            {busy === "pdf" ? "Ban rahi hai…" : "📄 PDF (teacher ko bhejo)"}
          </button>
          <button onClick={publish} disabled={!!busy} style={{ ...goldBtn, flex: 1 }}>
            {busy === "pub" ? "…" : "✅ Publish"}
          </button>
        </div>
      </div>

      {qs.map((q, i) => {
        const showSection = q.section !== lastSection;
        if (showSection) { lastSection = q.section; lastGroup = ""; }
        const showPassage = q.group_id && q.group_id !== lastGroup;
        if (q.group_id) lastGroup = q.group_id; else lastGroup = "";

        const txt = (base: string) => (lang === "hi" ? q[`${base}_hi`] || q[`${base}_en`] : q[`${base}_en`]);

        return (
          <div key={q.id}>
            {showSection && (
              <div style={{
                background: GOLD, color: "#1a1a1a", fontWeight: 800, fontSize: 12.5,
                padding: "7px 12px", borderRadius: 9, margin: "14px 0 10px",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8,
              }}>
                <span>{q.section || "—"}</span>
                <button onClick={() => setRetopic(q.section || "—")}
                  style={{
                    background: "rgba(0,0,0,0.25)", color: "#1a1a1a", border: "none",
                    borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 800, cursor: "pointer",
                  }}>Topics badlo</button>
              </div>
            )}

            {showSection && retopic === (q.section || "—") && (
              <Retopic api={api} testId={testId} section={q.section || "—"}
                onDone={() => { setRetopic(""); load(); }}
                onCancel={() => setRetopic("")} onErr={onErr} />
            )}

            {showPassage && (q.passage_en || q.passage_hi) && (
              <div style={{
                background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`,
                borderRadius: 10, padding: "10px 12px", marginBottom: 8,
                fontSize: 12.5, lineHeight: 1.7, fontStyle: "italic",
              }}>{txt("passage")}</div>
            )}

            <div style={cardBox}>
              <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.6 }}>
                Q{i + 1}. {txt("question")}
              </div>

              {q.image_url && (
                <QImage api={api} qid={q.id} url={q.image_url} field="image_url"
                  label="Question image" onFixed={load} />
              )}

              <div style={{ marginTop: 8 }}>
                {["a", "b", "c", "d"].map((L) => {
                  const right = (q.correct_answer || "").toLowerCase() === L;
                  return (
                    <div key={L} style={{
                      fontSize: 12.5, padding: "5px 9px", borderRadius: 7, marginBottom: 4,
                      lineHeight: 1.55,
                      background: right ? "rgba(93,217,124,0.13)" : "transparent",
                      color: right ? GREEN : "#d8d2c4", fontWeight: right ? 700 : 400,
                    }}>
                      ({L.toUpperCase()}) {lang === "hi" ? q[`option_${L}_hi`] || q[`option_${L}_en`] : q[`option_${L}_en`]}
                    </div>
                  );
                })}
              </div>

              {txt("explanation") && (
                <div style={{ fontSize: 11.5, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
                  💡 {txt("explanation")}
                </div>
              )}

              {q.explanation_image_url && (
                <QImage api={api} qid={q.id} url={q.explanation_image_url}
                  field="explanation_image_url" label="Solution image" onFixed={load} />
              )}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8 }}>
                <span style={{ fontSize: 10.5, color: MUTED }}>
                  id #{q.id}{q.difficulty ? ` · ${q.difficulty}` : ""}{q.group_id ? ` · set ${q.group_id}` : ""}
                </span>
                {!q.group_id && (
                  <button onClick={() => swap(q.id)} disabled={!!busy} style={{ ...ghostBtn, padding: "6px 11px", fontSize: 12 }}>
                    {busy === `swap${q.id}` ? "…" : "🔄 Badlo"}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
