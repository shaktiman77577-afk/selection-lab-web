"use client";

/**
 * ExamUpdatesAdmin.tsx — "Exam Updates" (job notifications) ka admin.
 *
 * page.tsx me:  <ExamUpdatesAdmin api={api} />     (tab "examupdates")
 *               <ExamDatesBox api={api} onOpen={...} />   (admin home par)
 * Backend: routers/exam_updates.py. Website: /exam-updates.
 *
 * Teen hisse: List · TSV upload (pehle check, phir drafts) · Edit (dates,
 * links, hamare products, "platform pe kya kar sakte ho").
 */

import { useEffect, useState, type CSSProperties } from "react";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const RED = "#ff6b6b";
const GREEN = "#5dd97c";

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

const STATUS_COLOR: Record<string, string> = {
  open: "#2e8b4a", closing: "#d9480f", upcoming: "#1c6dd0", closed: "#6b6f78",
  admit_card_out: "#7048e8", answer_key_out: "#7048e8", result_out: "#7048e8", info: "#6b6f78",
};
const KIND: Record<string, string> = { course: "Course", mock: "Mock", tier2: "Typing", descriptive: "Descriptive" };

const TEXT_FIELDS: [string, string, boolean?][] = [
  ["title", "Title"], ["organization", "Organisation"], ["advt_no", "Advt. No."], ["state", "State"],
  ["category", "Category"], ["post_names", "Post names ( | se alag)"], ["salary", "Salary", true],
  ["vacancy_breakup", "Vacancy breakup (Name=number | ...)", true], ["qualification", "Qualification ( | se alag)", true],
  ["age_as_on", "Age as on (YYYY-MM-DD)"], ["age_relaxation", "Age relaxation (Name=value | ...)", true],
  ["fee", "Fee (Name=amount | ...)", true], ["fee_mode", "Fee mode"],
  ["selection_process", "Selection process (stages | se alag)", true], ["typing_speed", "Typing speed"],
  ["short_info", "Short info (website par upar)", true], ["source_url", "Source URL"],
];
const INT_FIELDS: [string, string][] = [["total_vacancies", "Total vacancies"], ["age_min", "Min age"], ["age_max", "Max age"]];
const BOOL_FIELDS: [string, string][] = [
  ["has_written_exam", "Written exam"], ["has_typing_test", "Typing test"], ["has_skill_test", "Skill / Excel test"],
  ["has_descriptive", "Descriptive"], ["has_interview", "Interview"],
];
const QUICK_DATES = ["Admit card", "Exam date", "Answer key", "Result", "Skill test"];
const QUICK_LINKS = ["Admit Card", "Answer Key", "Result", "Exam City Slip", "Notice"];

function Msg({ text, ok }: { text: string; ok?: boolean }) {
  if (!text) return null;
  const c = ok ? GREEN : RED;
  return <div style={{ background: `${c}1a`, border: `1px solid ${c}55`, color: c, borderRadius: 10, padding: "9px 12px", fontSize: 13, marginBottom: 10 }}>{text}</div>;
}

function Badge({ st }: { st: any }) {
  if (!st) return null;
  return <span style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", background: STATUS_COLOR[st.code] || "#6b6f78", borderRadius: 6, padding: "2px 7px" }}>{st.text}</span>;
}

// ── Admin home ka box: aaj aur agle 3 din ────────────────────────────────────
export function ExamDatesBox({ api, onOpen }: { api: ApiFn; onOpen?: () => void }) {
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => {
    api("/exam-updates/admin/upcoming?days=3").then((d) => setItems(d.items || [])).catch(() => setItems([]));
  }, [api]);
  if (!items || items.length === 0) return null;
  return (
    <div style={{ ...box, borderColor: "rgba(255,171,0,0.55)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 14 }}>📅 Aaj aur agle 3 din — exam dates</div>
        {onOpen && <button style={btn} onClick={onOpen}>Kholo</button>}
      </div>
      {items.slice(0, 8).map((x, i) => (
        <div key={i} style={{ fontSize: 12.5, padding: "5px 0", borderTop: "1px solid rgba(255,255,255,0.06)", lineHeight: 1.5 }}>
          <b style={{ color: x.days_left <= 0 ? RED : GOLD }}>
            {x.days_left < 0 ? "Chal raha" : x.days_left === 0 ? "Aaj" : x.days_left === 1 ? "Kal" : `${x.days_left} din`}
          </b>{" · "}{x.label} — {x.title}{x.is_published === false ? " (draft)" : ""}
        </div>
      ))}
    </div>
  );
}

export default function ExamUpdatesAdmin({ api }: { api: ApiFn }) {
  const [view, setView] = useState<"list" | "upload" | "edit">("list");
  const [editId, setEditId] = useState<number | null>(null);
  return view === "upload"
    ? <Upload api={api} onDone={() => setView("list")} />
    : view === "edit" && editId
      ? <Edit api={api} id={editId} onBack={() => { setEditId(null); setView("list"); }} />
      : <List api={api} onUpload={() => setView("upload")} onEdit={(id) => { setEditId(id); setView("edit"); }} />;
}

// ── List ─────────────────────────────────────────────────────────────────────
function List({ api, onUpload, onEdit }: { api: ApiFn; onUpload: () => void; onEdit: (id: number) => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState("");
  const load = () => api("/exam-updates/admin/list").then(setD).catch((e) => setErr(e.message));
  useEffect(() => { load(); }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function pub(e: any) {
    try { await api(`/exam-updates/admin/${e.id}/publish`, "POST", { is_published: !e.is_published }); load(); }
    catch (x: any) { setErr(x.message); }
  }
  async function del(e: any) {
    if (!confirm(`"${e.title}" hamesha ke liye delete ho jayega. Pakka?`)) return;
    try { await api(`/exam-updates/admin/${e.id}`, "DELETE"); load(); } catch (x: any) { setErr(x.message); }
  }

  return (
    <div>
      <button style={{ ...goldBtn, width: "100%", padding: 12, fontSize: 14, marginBottom: 12 }} onClick={onUpload}>
        ⬆️ TSV upload karo (vacancies)
      </button>
      <ExamDatesBox api={api} />
      <Msg text={err} />
      {d && !d.tables_ready && <Msg text="Pehle Supabase me sql/2026-10-08_exam_updates.sql chalaiye" />}
      {d && d.exams?.length === 0 && d.tables_ready && <div style={{ color: MUTED, fontSize: 13 }}>Abhi koi exam update nahi. TSV upload kijiye.</div>}
      {(d?.exams || []).map((e: any) => {
        const missing = (e.gaps || []).filter((g: any) => !g.have);
        return (
          <div key={e.id} style={box}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 5 }}>
              <Badge st={e.status} />
              <span style={{ fontSize: 10.5, fontWeight: 800, color: e.is_published ? GREEN : GOLD }}>
                {e.is_published ? "● LIVE" : "DRAFT"}
              </span>
              {e.state && <span style={{ fontSize: 11, color: MUTED }}>{e.state}</span>}
            </div>
            <div style={{ fontWeight: 800, fontSize: 14, lineHeight: 1.4 }}>{e.title}</div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 3 }}>
              {e.total_vacancies ? `${e.total_vacancies} posts · ` : ""}Last date: {e.last_date || "—"} · Hamare products: {e.products_count}
            </div>
            {e.latest_update && <div style={{ fontSize: 12, color: GOLD, marginTop: 4 }}>🔔 {e.latest_update}</div>}
            {missing.length > 0 && (
              <div style={{ fontSize: 11.5, color: RED, marginTop: 4, lineHeight: 1.5 }}>
                ✗ Platform pe nahi: {missing.map((g: any) => g.need).join(" · ")}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 9, flexWrap: "wrap" }}>
              <button style={btn} onClick={() => onEdit(e.id)}>Edit / update</button>
              <button style={btn} onClick={() => pub(e)}>{e.is_published ? "Unpublish" : "Publish"}</button>
              {e.is_published && <a href={`/exam-updates/${e.slug}`} target="_blank" style={{ ...btn, textDecoration: "none" }}>View</a>}
              <button style={{ ...btn, color: RED, borderColor: `${RED}66` }} onClick={() => del(e)}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Upload ───────────────────────────────────────────────────────────────────
function Upload({ api, onDone }: { api: ApiFn; onDone: () => void }) {
  const [tsv, setTsv] = useState("");
  const [prev, setPrev] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function file(f: File | undefined) {
    if (!f) return;
    setTsv(await f.text()); setPrev(null);
  }
  async function run(dry: boolean) {
    setBusy(true); setErr("");
    try {
      const d = await api("/exam-updates/admin/upload", "POST", { tsv, dry_run: dry });
      if (dry) setPrev(d);
      else { alert(`${d.created} drafts ban gaye. List me check karke Publish kijiye.`); onDone(); }
    } catch (e: any) { setErr(e.message); }
    setBusy(false);
  }
  const fresh = (prev?.rows || []).filter((r: any) => !r.duplicate).length;

  return (
    <div>
      <button style={{ ...btn, marginBottom: 12 }} onClick={onDone}>← List</button>
      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>TSV upload</div>
        <p style={{ fontSize: 12, color: MUTED, margin: "0 0 10px", lineHeight: 1.6 }}>
          job_notifications_template.tsv wale 39 column. File chuno ya poora text paste karo, phir &quot;Check karo&quot;.
          Sab draft bante hain — website par tab dikhega jab aap Publish karoge.
        </p>
        <input type="file" accept=".tsv,.txt,.csv" onChange={(e) => file(e.target.files?.[0])} style={{ marginBottom: 8, color: "#fff" }} />
        <textarea style={{ ...input, minHeight: 110, fontFamily: "monospace", fontSize: 11.5 }} value={tsv}
          onChange={(e) => { setTsv(e.target.value); setPrev(null); }} placeholder="title	organization	advt_no	..." />
        <button style={{ ...goldBtn, width: "100%", marginTop: 8 }} disabled={busy || !tsv.trim()} onClick={() => run(true)}>
          {busy && !prev ? "Check ho raha hai..." : "Check karo"}
        </button>
      </div>
      <Msg text={err} />
      {prev && (
        <div style={box}>
          {(prev.errors || []).map((x: string, i: number) => <div key={i} style={{ fontSize: 12, color: GOLD }}>{x}</div>)}
          <div style={{ fontWeight: 800, margin: "4px 0 8px" }}>{prev.rows.length} rows · {fresh} naye</div>
          {prev.rows.map((r: any) => (
            <div key={r.line} style={{ padding: "8px 0", borderTop: "1px solid rgba(255,255,255,0.07)", opacity: r.duplicate ? 0.5 : 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{r.title}</div>
              <div style={{ fontSize: 11.5, color: MUTED }}>Line {r.line} · {r.state || "—"} · {r.total_vacancies || "?"} posts · last date {r.last_date || "?"}</div>
              {r.warnings.map((w: string, i: number) => <div key={i} style={{ fontSize: 11.5, color: GOLD }}>⚠ {w}</div>)}
            </div>
          ))}
          <button style={{ ...goldBtn, width: "100%", marginTop: 10 }} disabled={busy || fresh === 0} onClick={() => run(false)}>
            {busy ? "Upload ho raha hai..." : `${fresh} drafts banao`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Edit ─────────────────────────────────────────────────────────────────────
function Edit({ api, id, onBack }: { api: ApiFn; id: number; onBack: () => void }) {
  const [e, setE] = useState<any>(null);
  const [f, setF] = useState<any>({});
  const [dates, setDates] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [pub, setPub] = useState(false);
  const [allP, setAllP] = useState<any[]>([]);
  const [pick, setPick] = useState("");
  const [msg, setMsg] = useState({ t: "", ok: false });
  const [busy, setBusy] = useState(false);

  function load() {
    api(`/exam-updates/admin/${id}`).then((d) => {
      const x = d.exam; setE(x); setF(x); setPub(!!x.is_published);
      setDates((x.dates || []).map((v: any) => ({ label: v.label, date_text: v.date_text || "" })));
      setLinks((x.links || []).map((v: any) => ({ label: v.label, url: v.url || "" })));
    }).catch((er) => setMsg({ t: er.message, ok: false }));
  }
  useEffect(() => {
    load();
    api("/exam-updates/admin/products").then((d) => setAllP(d.products || [])).catch(() => {});
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setBusy(true); setMsg({ t: "", ok: false });
    try {
      const fields: any = {};
      [...TEXT_FIELDS.map((x) => x[0]), "latest_update", ...INT_FIELDS.map((x) => x[0]), ...BOOL_FIELDS.map((x) => x[0])]
        .forEach((k) => { fields[k] = f[k] ?? null; });
      const r = await api(`/exam-updates/admin/${id}`, "PUT", { fields, dates, links, is_published: pub });
      setMsg({ t: `Save ho gaya.${r.latest_update ? ` Latest update: "${r.latest_update}"` : ""}`, ok: true });
      load();
    } catch (er: any) { setMsg({ t: er.message, ok: false }); }
    setBusy(false);
  }
  async function addProd() {
    if (!pick) return;
    const [kind, pid] = pick.split(":");
    try { await api(`/exam-updates/admin/${id}/products`, "POST", { kind, product_id: Number(pid) }); setPick(""); load(); }
    catch (er: any) { setMsg({ t: er.message, ok: false }); }
  }
  async function hideProd(p: any) {
    try { await api(`/exam-updates/admin/${id}/products/${p.kind}/${p.id}`, "DELETE"); load(); }
    catch (er: any) { setMsg({ t: er.message, ok: false }); }
  }
  async function rematch() {
    try { const r = await api(`/exam-updates/admin/${id}/rematch`, "POST"); setMsg({ t: `${r.added} naye products jude.`, ok: true }); load(); }
    catch (er: any) { setMsg({ t: er.message, ok: false }); }
  }

  if (!e) return <div><button style={btn} onClick={onBack}>← List</button><Msg text={msg.t} /></div>;
  const shown = (e.products || []).filter((p: any) => !p.hidden);
  const lbl: CSSProperties = { fontSize: 12, color: MUTED, margin: "0 0 4px" };

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button style={btn} onClick={onBack}>← List</button>
        <button style={{ ...goldBtn, flex: 1 }} disabled={busy} onClick={save}>{busy ? "Saving..." : "Save"}</button>
      </div>
      <Msg text={msg.t} ok={msg.ok} />

      <div style={box}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}><Badge st={e.status} /></div>
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, fontWeight: 700, marginBottom: 10 }}>
          <input type="checkbox" checked={pub} onChange={(x) => setPub(x.target.checked)} /> Website par LIVE (publish)
        </label>
        <div style={lbl}>Latest update (khaali chhodo to link/date jodne par apne aap banta hai)</div>
        <input style={{ ...input, marginBottom: 6 }} value={f.latest_update || ""} onChange={(x) => setF({ ...f, latest_update: x.target.value })} placeholder="Admit Card out" />
        {e.source_url && <a href={e.source_url} target="_blank" style={{ fontSize: 12, color: GOLD }}>Source kholo ↗ (aankde yahan se milao)</a>}
      </div>

      {/* Platform gaps */}
      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>🎯 Is exam ke liye platform pe</div>
        {(e.gaps || []).map((g: any, i: number) => (
          <div key={i} style={{ fontSize: 13, color: g.have ? GREEN : RED, padding: "2px 0" }}>{g.have ? "✓" : "✗"} {g.need}</div>
        ))}
        {e.platform_ideas && <div style={{ fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 1.6 }}><b>AI ideas:</b> {e.platform_ideas}</div>}
        <div style={{ fontWeight: 700, fontSize: 13, margin: "12px 0 6px" }}>Jude products (website par &quot;Prepare on Selection Lab&quot;)</div>
        {shown.length === 0 && <div style={{ fontSize: 12, color: MUTED }}>Koi nahi.</div>}
        {shown.map((p: any) => (
          <div key={`${p.kind}-${p.id}`} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12.5, padding: "5px 0", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <span style={{ color: GOLD, fontWeight: 800, minWidth: 74, fontSize: 11 }}>{KIND[p.kind]}</span>
            <span style={{ flex: 1 }}>{p.title}{p.auto ? <span style={{ color: MUTED }}> · apne aap</span> : ""}{p.inactive ? <span style={{ color: RED }}> · band hai</span> : ""}</span>
            <button style={{ ...btn, padding: "4px 8px" }} onClick={() => hideProd(p)}>Hatao</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <select style={{ ...input, flex: 1 }} value={pick} onChange={(x) => setPick(x.target.value)}>
            <option value="">Product jodo...</option>
            {allP.map((p) => <option key={`${p.kind}:${p.id}`} value={`${p.kind}:${p.id}`}>{KIND[p.kind]} · {p.title}</option>)}
          </select>
          <button style={btn} onClick={addProd}>Jodo</button>
        </div>
        <button style={{ ...btn, marginTop: 8 }} onClick={rematch}>Naam se dobara dhundho</button>
      </div>

      {/* Dates */}
      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>📅 Important dates</div>
        <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 8 }}>YYYY-MM-DD, ya &quot;2026-11-03 to 2026-11-05&quot;, ya &quot;2026-12 (tentative)&quot;, ya TBA</div>
        {dates.map((d, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input style={{ ...input, flex: 1.2 }} value={d.label} onChange={(x) => setDates(dates.map((v, j) => j === i ? { ...v, label: x.target.value } : v))} />
            <input style={{ ...input, flex: 1 }} value={d.date_text} onChange={(x) => setDates(dates.map((v, j) => j === i ? { ...v, date_text: x.target.value } : v))} />
            <button style={{ ...btn, padding: "4px 9px" }} onClick={() => setDates(dates.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {QUICK_DATES.filter((q) => !dates.some((d) => d.label.toLowerCase() === q.toLowerCase())).map((q) => (
            <button key={q} style={{ ...btn, padding: "5px 9px" }} onClick={() => setDates([...dates, { label: q, date_text: "TBA" }])}>+ {q}</button>
          ))}
          <button style={{ ...btn, padding: "5px 9px" }} onClick={() => setDates([...dates, { label: "", date_text: "" }])}>+ Aur</button>
        </div>
      </div>

      {/* Links */}
      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>🔗 Links</div>
        <div style={{ fontSize: 11.5, color: MUTED, marginBottom: 8 }}>URL khaali = website par &quot;Coming soon&quot;. Admit card ka link daalte hi &quot;Admit Card out&quot; latest update ban jayega.</div>
        {links.map((l, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
            <input style={{ ...input, flex: 1 }} value={l.label} onChange={(x) => setLinks(links.map((v, j) => j === i ? { ...v, label: x.target.value } : v))} />
            <input style={{ ...input, flex: 1.6 }} value={l.url} placeholder="https://..." onChange={(x) => setLinks(links.map((v, j) => j === i ? { ...v, url: x.target.value } : v))} />
            <button style={{ ...btn, padding: "4px 9px" }} onClick={() => setLinks(links.filter((_, j) => j !== i))}>×</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {QUICK_LINKS.filter((q) => !links.some((l) => l.label.toLowerCase() === q.toLowerCase())).map((q) => (
            <button key={q} style={{ ...btn, padding: "5px 9px" }} onClick={() => setLinks([...links, { label: q, url: "" }])}>+ {q}</button>
          ))}
          <button style={{ ...btn, padding: "5px 9px" }} onClick={() => setLinks([...links, { label: "", url: "" }])}>+ Aur</button>
        </div>
      </div>

      {/* Fields */}
      <div style={box}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>📋 Details</div>
        {TEXT_FIELDS.map(([k, label, big]) => (
          <div key={k} style={{ marginBottom: 8 }}>
            <div style={lbl}>{label}</div>
            {big
              ? <textarea style={{ ...input, minHeight: 60 }} value={f[k] || ""} onChange={(x) => setF({ ...f, [k]: x.target.value })} />
              : <input style={input} value={f[k] || ""} onChange={(x) => setF({ ...f, [k]: x.target.value })} />}
          </div>
        ))}
        <div style={{ display: "flex", gap: 8 }}>
          {INT_FIELDS.map(([k, label]) => (
            <div key={k} style={{ flex: 1, marginBottom: 8 }}>
              <div style={lbl}>{label}</div>
              <input type="number" style={input} value={f[k] ?? ""} onChange={(x) => setF({ ...f, [k]: x.target.value })} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {BOOL_FIELDS.map(([k, label]) => (
            <label key={k} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}>
              <input type="checkbox" checked={!!f[k]} onChange={(x) => setF({ ...f, [k]: x.target.checked })} /> {label}
            </label>
          ))}
        </div>
      </div>

      <button style={{ ...goldBtn, width: "100%", padding: 12 }} disabled={busy} onClick={save}>{busy ? "Saving..." : "Save"}</button>
    </div>
  );
}
