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
 *   GET /catalog  ·  GET/POST/PUT/DELETE /blueprints  ·  GET /pool-health
 *   POST /compose  ·  GET /drafts  ·  GET /preview/:id  ·  GET /preview/:id/pdf
 *   POST /swap/:id  ·  POST /publish/:id
 *
 * BLUEPRINT KA DHAANCHA (Sep 2026 se):
 * Section = syllabus ka ek hissa ("Reasoning & Mathematics", 20 Q). Section ke
 * andar "parts" — har part bank ka ek subject, apne fixed count ke saath
 * (Reasoning 10 + Maths 10). Subject aur topics bank se aate hain (/catalog),
 * admin type nahi karta — isliye spelling ki galti se "topic bank me nahi hai"
 * wali dikkat khatam. Purane blueprint (section me seedha topics) kholne par
 * apne aap ek part me badal jaate hain.
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

type Topic = { topic: string; count: number; grouped?: boolean; topic_id?: number };
type PoolTopic = { topic: string; always?: boolean; topic_id?: number };

// Section ka ek hissa — bank ka ek subject
type Part = {
  subject_id: number | null;
  subject: string;
  mode: "pool" | "fixed";
  total: number;            // pool: is subject se kitne Q
  per_topic: number;        // pool: har topic se kitne
  pool: PoolTopic[];        // pool: chune hue topics
  topics: Topic[];          // fixed: har topic ka count
};

type Section = {
  name: string; minutes?: number;
  target?: number;          // syllabus me is section ke kitne Q — sirf milaan ke liye
  parts?: Part[];
  // Purana dhaancha (parts se pehle) — kholte hi part me badal jaata hai
  topics?: Topic[];
  mode?: "fixed" | "pool" | "parts";
  total?: number; per_topic?: number; pool?: PoolTopic[];
};

type CatTopic = { id: number; name: string; questions: number; questions_all: number; grouped?: boolean };
type CatSubject = { id: number | null; name: string; questions: number; questions_all: number; topics: CatTopic[] };

const BLANK_BP = {
  id: 0, name: "", exam_tag: "SSC", exam_id: null as number | null,
  duration_minutes: 60, total_marks: 100, negative_marking: 0.25,
  pass_percentage: 35, section_lock: false, sections: [] as Section[],
};

const BLANK_PART: Part = {
  subject_id: null, subject: "", mode: "pool", total: 0, per_topic: 1, pool: [], topics: [],
};

// ── Ginti ─────────────────────────────────────────────────────────────────────────
function partQ(p: Part): number {
  return p.mode === "pool"
    ? Number(p.total) || 0
    : (p.topics || []).reduce((s, t) => s + (Number(t.count) || 0), 0);
}

function secQ(sec: Section): number {
  if (sec.parts && sec.parts.length) return sec.parts.reduce((s, p) => s + partQ(p), 0);
  return sec.mode === "pool"
    ? Number(sec.total) || 0
    : (sec.topics || []).reduce((t, x) => t + (Number(x.count) || 0), 0);
}

// Purana section (seedha topics) -> ek part wala naya section
function toEditable(sec: Section): Section {
  if (sec.parts && sec.parts.length) {
    return { ...sec, parts: sec.parts.map((p) => ({ ...BLANK_PART, ...p, pool: p.pool || [], topics: p.topics || [] })) };
  }
  const hasOld = (sec.pool || []).some((t) => (t.topic || "").trim())
    || (sec.topics || []).some((t) => (t.topic || "").trim());
  return {
    name: sec.name, minutes: sec.minutes, target: secQ(sec) || undefined,
    parts: hasOld ? [{
      ...BLANK_PART,
      mode: sec.mode === "pool" ? "pool" : "fixed",
      total: Number(sec.total) || 0,
      per_topic: Math.max(1, Number(sec.per_topic) || 1),
      pool: (sec.pool || []).filter((t) => (t.topic || "").trim()),
      topics: (sec.topics || []).filter((t) => (t.topic || "").trim()),
    }] : [],
  };
}

// Purane part me subject nahi hota, sirf topic ke naam. Catalog aate hi wo
// subject dhoondh lo jisme sabse zyada naam milte hain, aur har naam ko uski
// topic id de do — admin ko purana blueprint dobara nahi bharna padta.
function adoptLegacy(p: Part, cat: CatSubject[]): Part {
  if (p.subject_id != null) return p;
  const names = [...(p.pool || []), ...(p.topics || [])].map((t) => (t.topic || "").trim().toLowerCase()).filter(Boolean);
  if (!names.length) return p;
  let best: CatSubject | null = null;
  let bestHits = 0;
  for (const s of cat) {
    const hits = s.topics.filter((t) => names.includes(t.name.toLowerCase())).length;
    if (hits > bestHits) { best = s; bestHits = hits; }
  }
  if (!best) return p;
  const idOf = (n: string) => best!.topics.find((t) => t.name.toLowerCase() === (n || "").trim().toLowerCase())?.id;
  return {
    ...p, subject_id: best.id, subject: best.name,
    pool: (p.pool || []).map((t) => ({ ...t, topic_id: t.topic_id ?? idOf(t.topic) })),
    topics: (p.topics || []).map((t) => ({ ...t, topic_id: t.topic_id ?? idOf(t.topic) })),
  };
}

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

// ── BLUEPRINTS ────────────────────────────────────────────────────────────────────────────────────────
function Blueprints({ api, onErr, onOk }: { api: ApiFn; onErr: (s: string) => void; onOk: (s: string) => void }) {
  const [list, setList] = useState<any[]>([]);
  const [draft, setDraft] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [catalog, setCatalog] = useState<CatSubject[] | null>(null);
  const [catErr, setCatErr] = useState("");

  function load() {
    api("/qbank/blueprints").then((d) => setList(d.blueprints || [])).catch((e) => onErr(e.message));
  }
  useEffect(load, []);

  // Bank ka catalog — exam tag badle to ginti bhi badalti hai, isliye tag par
  // chalta hai. Thoda ruk kar, taaki har akshar par request na jaye.
  const tag = draft ? String(draft.exam_tag || "").trim() : null;
  useEffect(() => {
    if (tag === null) return;
    setCatErr("");
    const h = setTimeout(() => {
      api(`/qbank/catalog${tag ? `?exam_tag=${encodeURIComponent(tag)}` : ""}`)
        .then((d) => setCatalog(d.subjects || []))
        .catch((e) => { setCatErr(e.message); setCatalog([]); });
    }, 450);
    return () => clearTimeout(h);
  }, [tag]);

  // Purane blueprint ke parts ko subject + topic id do (sirf ek baar, catalog aate hi)
  useEffect(() => {
    if (!catalog || !catalog.length || !draft) return;
    const needs = (draft.sections as Section[]).some((s) => (s.parts || []).some((p) => p.subject_id == null && ((p.pool || []).length || (p.topics || []).length)));
    if (!needs) return;
    setDraft((d: any) => d && ({
      ...d,
      sections: (d.sections as Section[]).map((s) => ({ ...s, parts: (s.parts || []).map((p) => adoptLegacy(p, catalog)) })),
    }));
  }, [catalog, draft?.id]);

  function openDraft(bp: any) {
    setDraft({ ...bp, sections: (bp.sections || []).map(toEditable) });
  }

  async function save() {
    if (!draft.name.trim()) return onErr("Blueprint ka naam daaliye");
    if (!draft.sections.length) return onErr("Kam se kam ek section chahiye");
    for (const sec of draft.sections as Section[]) {
      const sn = sec.name || "section";
      if (!(sec.name || "").trim()) return onErr("Har section ka naam daaliye");
      if (!(sec.parts || []).length) return onErr(`“${sn}” me kam se kam ek subject jodiye`);
      for (const p of sec.parts || []) {
        if (p.subject_id == null) return onErr(`“${sn}” me ek hissa bina subject ka hai — subject chuniye`);
        if (p.mode === "pool") {
          if (!Number(p.total)) return onErr(`“${sn} › ${p.subject}” me kitne question, ye daaliye`);
          if (!(p.pool || []).length) return onErr(`“${sn} › ${p.subject}” me ek bhi topic tick nahi hai`);
        } else if (!partQ(p)) {
          return onErr(`“${sn} › ${p.subject}” me kisi topic ka count nahi daala`);
        }
      }
      const got = secQ(sec);
      if (sec.target && got !== Number(sec.target)
          && !confirm(`“${sn}” me syllabus ${sec.target} Q kehta hai, par bhare ${got} hain. Phir bhi save karein?`)) {
        return;
      }
    }
    setSaving(true); onErr("");
    try {
      const body = { ...draft };
      delete body.id; delete body.created_at; delete body.is_active;
      // Har part me sirf uske mode ka data — pool part me fixed ke topics
      // bhejna backend ko confuse karta hai, aur ulta bhi
      body.sections = (draft.sections as Section[]).map((sec) => ({
        name: sec.name.trim(),
        minutes: sec.minutes,
        target: Number(sec.target) || undefined,
        mode: "parts",
        parts: (sec.parts || []).map((p) =>
          p.mode === "pool"
            ? { subject_id: p.subject_id, subject: p.subject, mode: "pool",
                total: Number(p.total) || 0, per_topic: Math.max(1, Number(p.per_topic) || 1),
                pool: (p.pool || []).map((t) => ({ topic_id: t.topic_id, topic: t.topic, always: !!t.always })) }
            : { subject_id: p.subject_id, subject: p.subject, mode: "fixed",
                topics: (p.topics || []).filter((t) => Number(t.count) > 0)
                  .map((t) => ({ topic_id: t.topic_id, topic: t.topic, count: Number(t.count), grouped: !!t.grouped })) }),
      }));
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
            har section me kaunse subject se kitne question, kitna time, kitni negative marking.
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
                    {(b.sections || []).map((s: Section, i: number) => (
                      <div key={i}>
                        {s.name} ({secQ(s)})
                        {s.parts && s.parts.length
                          ? ` — ${s.parts.map((p) => `${p.subject} ${partQ(p)}`).join(" + ")}`
                          : s.mode === "pool" ? ` — pool ${(s.pool || []).length}` : ""}
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => openDraft(b)} style={ghostBtn}>Edit</button>
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
        onChange={(e) => set("name", e.target.value)} placeholder="SKAU Clerk — Phase 2" /></Field>

      <Field label="Exam tag" hint="Sirf isi tag wale questions uthenge. Question par {SSC,Banking} dono ho to wo dono me chalega. Neeche har topic ki ginti isi tag ke hisaab se dikhti hai.">
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

        {catErr && <Msg text={`Bank ki list nahi aayi: ${catErr}`} />}
        {catalog === null && !catErr && (
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 10 }}>Bank se subject aur topic la rahe hain…</div>
        )}
        {catalog && !catalog.length && !catErr && (
          <Msg kind="warn" text="Bank me abhi ek bhi topic wala question nahi mila. Pehle topic-tagged TSV upload kijiye." />
        )}

        {draft.sections.map((sec: Section, i: number) => (
          <SectionEditor key={i} sec={sec} catalog={catalog || []} onChange={(s) => setSec(i, s)}
            onRemove={() => set("sections", draft.sections.filter((_: any, j: number) => j !== i))} />
        ))}

        <button onClick={() => set("sections", [...draft.sections, { name: "", target: undefined, parts: [] }])}
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

function SectionEditor({ sec, catalog, onChange, onRemove }: {
  sec: Section; catalog: CatSubject[]; onChange: (s: Section) => void; onRemove: () => void;
}) {
  const parts = sec.parts || [];
  const got = secQ(sec);
  const target = Number(sec.target) || 0;
  const setPart = (i: number, p: Part) => {
    const next = [...parts]; next[i] = p; onChange({ ...sec, parts: next });
  };
  const used = parts.map((p) => p.subject_id).filter((x) => x != null) as number[];

  function addPart() {
    // Naye hisse ko wahi count do jo syllabus ke hisaab se abhi bacha hai
    const left = Math.max(0, target - got);
    onChange({ ...sec, parts: [...parts, { ...BLANK_PART, total: left }] });
  }

  return (
    <div style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-end" }}>
        <label style={{ flex: 3, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Section (syllabus jaisa naam)</div>
          <input style={inputStyle} placeholder="Reasoning & Mathematics"
            value={sec.name} onChange={(e) => onChange({ ...sec, name: e.target.value })} />
        </label>
        <label style={{ flex: 1, minWidth: 64 }}>
          <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Syllabus Q</div>
          <input style={inputStyle} type="number" placeholder="20"
            value={sec.target ?? ""} onChange={(e) => onChange({ ...sec, target: e.target.value === "" ? undefined : Number(e.target.value) })} />
        </label>
        <button onClick={onRemove} style={{ ...dangerBtn, marginBottom: 2 }}>✕</button>
      </div>

      <label style={{ display: "block", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>
          Section ka time (min) — sirf section lock ke liye, warna khaali chhodo
        </div>
        <input style={{ ...inputStyle, padding: "9px", maxWidth: 140 }} type="number"
          value={sec.minutes ?? ""} onChange={(e) => onChange({ ...sec, minutes: e.target.value === "" ? undefined : Number(e.target.value) })} />
      </label>

      {parts.map((p, i) => (
        <PartEditor key={i} part={p} catalog={catalog} takenSubjects={used.filter((x) => x !== p.subject_id)}
          onChange={(np) => setPart(i, np)}
          onRemove={() => onChange({ ...sec, parts: parts.filter((_, j) => j !== i) })} />
      ))}

      <button onClick={addPart} style={{ ...ghostBtn, width: "100%", padding: "8px 11px", fontSize: 12.5 }}>
        + Subject jodo
      </button>

      <div style={{
        fontSize: 12, fontWeight: 700, marginTop: 9, textAlign: "right",
        color: !target ? MUTED : got === target ? GREEN : got > target ? RED : GOLD,
      }}>
        {target
          ? got === target ? `✓ ${got} / ${target} Q — syllabus poora`
            : got > target ? `⚠ ${got} / ${target} Q — ${got - target} zyada`
            : `${got} / ${target} Q — ${target - got} aur chahiye`
          : `${got} Q`}
      </div>
    </div>
  );
}

function PartEditor({ part, catalog, takenSubjects, onChange, onRemove }: {
  part: Part; catalog: CatSubject[]; takenSubjects: number[];
  onChange: (p: Part) => void; onRemove: () => void;
}) {
  const [q, setQ] = useState("");
  const subject = catalog.find((s) => s.id === part.subject_id) || null;
  const isPool = part.mode === "pool";
  const per = Math.max(1, Number(part.per_topic) || 1);

  function pickSubject(idStr: string) {
    const s = catalog.find((x) => String(x.id) === idStr);
    if (!s) return;
    // Naya subject: rotation me sab topic tick (jin me question hain), fixed me sab 0
    onChange({
      ...part, subject_id: s.id, subject: s.name,
      pool: s.topics.filter((t) => t.questions > 0).map((t) => ({ topic_id: t.id, topic: t.name })),
      topics: [],
    });
    setQ("");
  }

  const inPool = (id: number) => (part.pool || []).find((t) => t.topic_id === id);
  const fixedOf = (id: number) => (part.topics || []).find((t) => t.topic_id === id);

  function togglePool(t: CatTopic, on: boolean) {
    const rest = (part.pool || []).filter((x) => x.topic_id !== t.id);
    onChange({ ...part, pool: on ? [...rest, { topic_id: t.id, topic: t.name }] : rest });
  }
  function setAlways(t: CatTopic, on: boolean) {
    onChange({ ...part, pool: (part.pool || []).map((x) => (x.topic_id === t.id ? { ...x, always: on } : x)) });
  }
  function setFixed(t: CatTopic, patch: Partial<Topic>) {
    const cur = fixedOf(t.id) || { topic_id: t.id, topic: t.name, count: 0, grouped: !!t.grouped };
    const rest = (part.topics || []).filter((x) => x.topic_id !== t.id);
    onChange({ ...part, topics: [...rest, { ...cur, ...patch }] });
  }

  // Purane blueprint ke wo topic jo is subject me mile hi nahi (naam badal gaya
  // ya hat gaya) — dikhate hain taaki admin hata sake, chupke se gayab nahi
  const knownIds = new Set((subject?.topics || []).map((t) => t.id));
  const orphans = (isPool ? part.pool : part.topics).filter((t) => !t.topic_id || !knownIds.has(t.topic_id));

  const shown = (subject?.topics || []).filter((t) => !q.trim() || t.name.toLowerCase().includes(q.trim().toLowerCase()));

  // Stock — ek mock me is hisse se zyada se zyada kitne aa sakte hain
  const ticked = (subject?.topics || []).filter((t) => inPool(t.id));
  const perMockMax = ticked.reduce((s, t) => s + Math.min(t.questions, per), 0);
  const alwaysN = (part.pool || []).filter((t) => t.always).length;
  const count = partQ(part);

  const badge = (t: CatTopic) => {
    const zero = t.questions === 0;
    const tagIssue = zero && t.questions_all > 0;
    return (
      <span style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", color: zero ? (tagIssue ? GOLD : RED) : MUTED }}
        title={tagIssue ? `Question ${t.questions_all} hain, par is exam tag ke nahi` : undefined}>
        {tagIssue ? `0 (tag nahi · ${t.questions_all})` : `${t.questions} Q`}
      </span>
    );
  };

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: 10, marginBottom: 9 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
        <select style={{ ...inputStyle, padding: "9px", flex: 1, minWidth: 0 }}
          value={part.subject_id == null ? "" : String(part.subject_id)}
          onChange={(e) => pickSubject(e.target.value)}>
          <option value="">— subject chuno —</option>
          {catalog.map((s) => (
            <option key={String(s.id)} value={String(s.id)} disabled={s.id != null && takenSubjects.includes(s.id)}>
              {s.name} — {s.questions} Q{s.questions !== s.questions_all ? ` (kul ${s.questions_all})` : ""}
            </option>
          ))}
        </select>
        <button onClick={onRemove} style={dangerBtn}>✕</button>
      </div>

      {part.subject_id == null && ((part.pool || []).length > 0 || (part.topics || []).length > 0) && (
        <div style={{ fontSize: 11.5, color: GOLD, marginBottom: 8, lineHeight: 1.5 }}>
          Purane blueprint ka hissa — bank me iske topic kisi subject me nahi mile. Subject chuno.
        </div>
      )}

      {subject && (
        <>
          <div style={{ display: "flex", gap: 6, marginBottom: 9 }}>
            {(["pool", "fixed"] as const).map((m) => (
              <button key={m} onClick={() => onChange({ ...part, mode: m })}
                style={{
                  ...ghostBtn, flex: 1, padding: "6px 8px", fontSize: 11.5,
                  ...(part.mode === m ? { background: GOLD, color: "#1a1a1a", border: "none" } : {}),
                }}>
                {m === "pool" ? "Rotation (topic baari-baari)" : "Fixed (har topic ka count)"}
              </button>
            ))}
          </div>

          {isPool && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
              <label>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{subject.name} se kitne Q</div>
                <input style={{ ...inputStyle, padding: "9px" }} type="number" min={0}
                  value={part.total || ""} onChange={(e) => onChange({ ...part, total: Math.max(0, Number(e.target.value)) })} />
              </label>
              <label>
                <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>Har topic se (max)</div>
                <input style={{ ...inputStyle, padding: "9px" }} type="number" min={1}
                  value={part.per_topic || 1} onChange={(e) => onChange({ ...part, per_topic: Math.max(1, Number(e.target.value)) })} />
              </label>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6 }}>
            {subject.topics.length > 10 && (
              <input style={{ ...inputStyle, padding: "7px 9px", fontSize: 12.5, flex: 1 }}
                placeholder={`${subject.topics.length} topic me dhoondho`} value={q} onChange={(e) => setQ(e.target.value)} />
            )}
            {isPool && (
              <>
                <button onClick={() => onChange({ ...part, pool: subject.topics.filter((t) => t.questions > 0).map((t) => ({ topic_id: t.id, topic: t.name, always: !!inPool(t.id)?.always })) })}
                  style={{ ...ghostBtn, padding: "6px 9px", fontSize: 11 }}>Sab</button>
                <button onClick={() => onChange({ ...part, pool: [] })}
                  style={{ ...ghostBtn, padding: "6px 9px", fontSize: 11 }}>Koi nahi</button>
              </>
            )}
          </div>

          <div style={{ maxHeight: 320, overflowY: "auto", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            {shown.map((t) => {
              if (isPool) {
                const on = inPool(t.id);
                return (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 2px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0, cursor: "pointer", fontSize: 12.5, color: on ? "#fff" : MUTED }}>
                      <input type="checkbox" checked={!!on} onChange={(e) => togglePool(t, e.target.checked)} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                    </label>
                    {badge(t)}
                    {on && (
                      <label title="Ye topic har mock me aayega"
                        style={{ fontSize: 10.5, color: on.always ? GOLD : MUTED, display: "flex", alignItems: "center", gap: 3, cursor: "pointer", whiteSpace: "nowrap" }}>
                        <input type="checkbox" checked={!!on.always} onChange={(e) => setAlways(t, e.target.checked)} />
                        hamesha
                      </label>
                    )}
                  </div>
                );
              }
              const f = fixedOf(t.id);
              const n = Number(f?.count) || 0;
              return (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 2px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: n ? "#fff" : MUTED, overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                  {badge(t)}
                  <input style={{ ...inputStyle, width: 54, padding: "6px", fontSize: 12.5, borderColor: n > t.questions ? RED : undefined }}
                    type="number" min={0} value={n || ""} placeholder="0"
                    onChange={(e) => setFixed(t, { count: Math.max(0, Number(e.target.value)) })} />
                  <label title="Passage wala set — poora uthta hai ya bilkul nahi"
                    style={{ fontSize: 10.5, color: f?.grouped ? GOLD : MUTED, display: "flex", alignItems: "center", gap: 3, cursor: "pointer" }}>
                    <input type="checkbox" checked={!!f?.grouped} onChange={(e) => setFixed(t, { grouped: e.target.checked })} />
                    set
                  </label>
                </div>
              );
            })}
            {!shown.length && <div style={{ fontSize: 12, color: MUTED, padding: 8 }}>Koi topic nahi mila</div>}
          </div>

          {orphans.length > 0 && (
            <div style={{ fontSize: 11.5, color: GOLD, marginTop: 8, lineHeight: 1.6 }}>
              Purane blueprint ke ye topic is subject me nahi mile:{" "}
              {orphans.map((o, i) => (
                <span key={i} style={{ whiteSpace: "nowrap" }}>
                  {o.topic || "(khaali)"}{" "}
                  <button onClick={() => onChange(isPool
                    ? { ...part, pool: part.pool.filter((x) => x !== o) }
                    : { ...part, topics: part.topics.filter((x) => x !== o) })}
                    style={{ background: "none", border: "none", color: RED, cursor: "pointer", padding: 0, fontSize: 11.5 }}>✕</button>
                  {i < orphans.length - 1 ? " · " : ""}
                </span>
              ))}
            </div>
          )}

          <div style={{ fontSize: 11, color: MUTED, marginTop: 8, lineHeight: 1.55 }}>
            {isPool ? (
              <>
                {ticked.length} topic chune · {alwaysN} hamesha · is hisse se <b style={{ color: "#fff" }}>{count} Q</b>
                {count > 0 && perMockMax < count && (
                  <div style={{ color: RED, marginTop: 4 }}>
                    ⚠ Chune hue topics se ek mock me zyada se zyada {perMockMax} Q aa sakte hain
                    (har topic se {per}). Topic badhao ya “har topic se” badhao.
                  </div>
                )}
                {alwaysN * per > count && count > 0 && (
                  <div style={{ color: RED, marginTop: 4 }}>
                    ⚠ {alwaysN} “hamesha” × {per} = {alwaysN * per} Q, par is hisse ke {count} hi hain.
                  </div>
                )}
              </>
            ) : (
              <>Is hisse se <b style={{ color: "#fff" }}>{count} Q</b> — har mock me yahi pattern.</>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── GENERATE ───────────────────────────────────────────────────────────────────────────────────────
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
  const [made, setMade] = useState(0);        // kitne mock ban chuke — "3 / 10"

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

  // Ek request me ek mock. Pehle 10 mock ek hi request me bante the — kai
  // minute lagte aur phone ka browser beech me hi “Failed to fetch” de deta.
  // Ab har mock alag request hai; har naya mock pichhle bane mocks ko series
  // se dekh leta hai, isliye repeat-block waisa hi chalta hai. Beech me koi
  // fail ho to bane hue drafts safe rehte hain aur wahi dikh jaate hain.
  async function generate() {
    if (!bpId) return onErr("Blueprint choose kijiye");
    if (!title.trim()) return onErr("Title daaliye");
    if (count > 1 && !seriesId) {
      return onErr("Ek se zyada mock banane hain to series choose kijiye — warna repeat rokna mumkin nahi.");
    }
    setBusy("gen"); onErr(""); setMade(0);
    const created: any[] = [];
    setResult({ created });
    for (let n = 1; n <= count; n++) {
      try {
        const d = await api("/qbank/compose", "POST", {
          blueprint_id: bpId, series_id: seriesId || null,
          title: count > 1 ? `${title.trim()} ${n}` : title.trim(),
          count: 1, is_free: n <= freeCount, free_count: 0, price: 0,
        });
        created.push(...(d.created || []));
        setMade(n);
        setResult({ created: [...created] });
      } catch (e: any) {
        onErr(`Mock ${n} nahi bana: ${e.message}. ` +
              (created.length ? `Pehle ke ${created.length} draft ban chuke hain (neeche dekho).` : ""));
        setBusy("");
        return;
      }
    }
    onOk(`${created.length} draft ban gaya${created.length > 1 ? "e" : ""}`);
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
            {busy === "gen" ? (count > 1 ? `Ban rahe hain… ${made} / ${count}` : "Ban raha hai…") : "2. Generate"}
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

// ── DRAFTS + PREVIEW ─────────────────────────────────────────────────────────
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
