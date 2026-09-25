"use client";

/**
 * NbemsMockAdmin.tsx — admin: NBEMS 75-minute full mocks.
 * app/admin/page.tsx me "nbemsmock" tab: <NbemsMockAdmin api={api} />
 *
 * Endpoints (base = /nbems-mock/admin):
 *   GET/POST/PUT/DELETE  /mocks
 *   GET /mcq?mock_id · POST /mcq/bulk · DELETE /mcq/{id}
 *   GET /attempts?mock_id
 *
 * Word/PPT tasks code me hain (lib/nbemsMockTasks.ts) — yahan sirf chunte hain.
 * Excel = usi series ki worksheet (Excel / CPT tab me bani hui).
 * MCQ CSV: Mock, Q No, Question, Option A, Option B, Option C, Option D, Answer, Explanation
 * (Mock column ho to sirf is mock ke number wali rows lete hain — ek hi file sab mocks ke liye.)
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { MOCK_WORD_TASKS, MOCK_PPT_TASKS } from "@/lib/nbemsMockTasks";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";
const GREEN = "#4caf6e";
const RED = "#ff6b6b";

const inputStyle: CSSProperties = {
  width: "100%", padding: "10px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.4)", color: "#fff", fontSize: 14, boxSizing: "border-box",
};
const goldBtn: CSSProperties = { background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer" };
const ghostBtn: CSSProperties = { background: "transparent", color: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer" };
const dangerBtn: CSSProperties = { background: "transparent", color: RED, border: "1px solid rgba(255,107,107,0.4)", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer" };
const cardBox: CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 10 };

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{hint}</div> : null}
    </label>
  );
}

/** TAB (Excel se paste) ya comma (.csv) — pehli line se khud pakadta hai. Tier2Admin wala hi. */
function parseCSV(text: string): string[][] {
  const firstLine = (text.split(/\r?\n/).find((l) => l.trim() !== "") || "");
  const SEP = (firstLine.match(/\t/g) || []).length >= (firstLine.match(/,/g) || []).length && firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === SEP) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((c) => c.replace(/^﻿/, "")));
}

const EMPTY = {
  mock_number: 1, title: "", is_free: false, display_order: 0, duration_min: 75,
  typing_title: "", typing_passage: "", typing_minutes: 10, typing_target_wpm: 35, typing_marks_max: 30, typing_check_line_breaks: true,
  excel_test_id: null as number | null, excel_minutes: 20, excel_marks_max: 25,
  word_task_id: "", word_minutes: 20, word_marks_max: 20,
  ppt_task_id: "", ppt_minutes: 10, ppt_marks_max: 10,
  mcq_minutes: 15, mcq_marks_max: 15,
};

export default function NbemsMockAdmin({ api }: { api: ApiFn }) {
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [sid, setSid] = useState<number>(0);
  const [mocks, setMocks] = useState<any[]>([]);
  const [worksheets, setWorksheets] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);          // edit/add
  const [mcqFor, setMcqFor] = useState<any>(null);      // MCQ panel
  const [attFor, setAttFor] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api("/tier2/admin/series", "GET").then((r) => {
      const list = r?.series || [];
      setSeriesList(list);
      const nb = list.find((s: any) => /nbems/i.test(s.title || "")) || list[0];
      if (nb) setSid(nb.id);
    }).catch((e) => setError(e.message));
  }, [api]);

  async function load(s = sid) {
    if (!s) return;
    setError("");
    try {
      const [m, t] = await Promise.all([
        api(`/nbems-mock/admin/mocks?series_id=${s}`, "GET"),
        api(`/tier2/excel/admin/tests?series_id=${s}`, "GET"),
      ]);
      setMocks(m?.mocks || []);
      setWorksheets((t?.tests || []).filter((x: any) => x.kind === "worksheet" && x.is_active !== false));
    } catch (e: any) { setError(e.message); }
  }
  useEffect(() => { load(sid); /* eslint-disable-next-line */ }, [sid]);

  async function saveMock() {
    if (!form) return;
    if (!form.title.trim()) { setError("Title likhiye"); return; }
    setBusy(true); setError("");
    const body = { ...EMPTY, ...form, series_id: sid,
      excel_test_id: form.excel_test_id ? Number(form.excel_test_id) : null };
    delete (body as any).id; delete (body as any).mcq_count; delete (body as any).attempt_count; delete (body as any).passage_words;
    delete (body as any).is_active; delete (body as any).created_at;
    try {
      if (form.id) await api(`/nbems-mock/admin/mocks/${form.id}`, "PUT", body);
      else await api("/nbems-mock/admin/mocks", "POST", body);
      setForm(null); await load();
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }

  async function delMock(m: any) {
    if (!confirm(`"${m.title}" hatana hai? Students ke purane scorecard bane rahenge.`)) return;
    try { await api(`/nbems-mock/admin/mocks/${m.id}`, "DELETE"); await load(); } catch (e: any) { setError(e.message); }
  }

  const num = (k: string, label: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <input type="number" style={inputStyle} value={form[k] ?? ""} onChange={(e) => setForm({ ...form, [k]: Number(e.target.value) })} />
    </Field>
  );

  // ── Add / edit ──
  if (form) {
    const words = (form.typing_passage || "").trim() ? form.typing_passage.trim().split(/\s+/).length : 0;
    const marks = ["typing", "excel", "word", "ppt", "mcq"].reduce((a, k) => a + Number(form[`${k}_marks_max`] || 0), 0);
    return (
      <div>
        <button onClick={() => setForm(null)} style={ghostBtn}>← Back</button>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "12px 0" }}>{form.id ? "Edit mock" : "New mock"}</h2>
        {error && <p style={{ color: RED }}>{error}</p>}
        <div style={cardBox}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {num("mock_number", "Mock number")}
            {num("display_order", "Display order")}
            {num("duration_min", "Total minutes")}
          </div>
          <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="NBEMS Skill Test — Full Mock 1" /></Field>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5, marginBottom: 6 }}>
            <input type="checkbox" checked={!!form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
            Free (sirf ek mock free rakhiye — Mock 1)
          </label>
          <div style={{ fontSize: 12, color: marks === 100 ? GREEN : GOLD }}>Total marks: {marks}{marks !== 100 ? " — 100 hona chahiye?" : ""}</div>
        </div>

        <div style={cardBox}>
          <b>⌨️ Typing</b>
          <Field label="Passage title"><input style={inputStyle} value={form.typing_title} onChange={(e) => setForm({ ...form, typing_title: e.target.value })} /></Field>
          <Field label={`Passage (letter format — har line apni jagah) · ${words} words`} hint="Line breaks jaanche jaate hain agar neeche wala box on hai. ~350-400 words rakhiye (35 WPM × 10 min se zyada).">
            <textarea style={{ ...inputStyle, minHeight: 220, fontFamily: "monospace" }} value={form.typing_passage} onChange={(e) => setForm({ ...form, typing_passage: e.target.value })} />
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {num("typing_minutes", "Typing minutes")}
            {num("typing_target_wpm", "Target WPM", "Is speed par poore marks")}
            {num("typing_marks_max", "Marks")}
          </div>
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13.5 }}>
            <input type="checkbox" checked={!!form.typing_check_line_breaks} onChange={(e) => setForm({ ...form, typing_check_line_breaks: e.target.checked })} />
            Line breaks (Enter) bhi jaancho — letter format
          </label>
        </div>

        <div style={cardBox}>
          <b>📊 Excel</b>
          <Field label="Worksheet (is series ki, Excel / CPT tab me bani)" hint={worksheets.length ? "" : "Is series me koi worksheet nahi mili — pehle Excel / CPT tab me banaiye."}>
            <select style={inputStyle} value={form.excel_test_id ?? ""} onChange={(e) => setForm({ ...form, excel_test_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">— none —</option>
              {worksheets.map((w) => <option key={w.id} value={w.id}>#{w.mock_number ?? "-"} · {w.title} (id {w.id})</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{num("excel_minutes", "Suggested minutes")}{num("excel_marks_max", "Marks", "Worksheet ka score isi par scale hota hai")}</div>
        </div>

        <div style={cardBox}>
          <b>📝 Word · 📽️ PowerPoint</b>
          <Field label="Word task" hint="Tasks code me hain: lib/nbemsMockTasks.ts">
            <select style={inputStyle} value={form.word_task_id} onChange={(e) => setForm({ ...form, word_task_id: e.target.value })}>
              <option value="">— none —</option>
              {MOCK_WORD_TASKS.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.title}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{num("word_minutes", "Word minutes")}{num("word_marks_max", "Word marks")}</div>
          <Field label="PowerPoint task">
            <select style={inputStyle} value={form.ppt_task_id} onChange={(e) => setForm({ ...form, ppt_task_id: e.target.value })}>
              <option value="">— none —</option>
              {MOCK_PPT_TASKS.map((t) => <option key={t.id} value={t.id}>{t.id} · {t.title}</option>)}
            </select>
          </Field>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{num("ppt_minutes", "PPT minutes")}{num("ppt_marks_max", "PPT marks")}</div>
        </div>

        <div style={cardBox}>
          <b>❓ MCQ</b>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>{num("mcq_minutes", "Suggested minutes")}{num("mcq_marks_max", "Marks (barabar baante jaate hain)")}</div>
          <div style={{ fontSize: 12, color: MUTED }}>Sawaal save karne ke baad list me "MCQ" button se chadhaiye.</div>
        </div>

        <button onClick={saveMock} disabled={busy} style={{ ...goldBtn, width: "100%" }}>{busy ? "Saving…" : "Save mock"}</button>
      </div>
    );
  }

  if (mcqFor) return <McqPanel api={api} mock={mcqFor} onBack={() => { setMcqFor(null); load(); }} />;
  if (attFor) return <AttemptsPanel api={api} mock={attFor} onBack={() => setAttFor(null)} />;

  // ── List ──
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 4px" }}>NBEMS full mocks (75 min)</h2>
      <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 12px" }}>Typing + Excel + Word + PPT + 15 MCQ, ek ghadi. Access usi Tier 2 series se.</p>
      {error && <p style={{ color: RED }}>{error}</p>}
      <Field label="Series">
        <select style={inputStyle} value={sid || ""} onChange={(e) => setSid(Number(e.target.value))}>
          {seriesList.map((s) => <option key={s.id} value={s.id}>{s.title} (id {s.id})</option>)}
        </select>
      </Field>
      <button onClick={() => setForm({ ...EMPTY, mock_number: (mocks.reduce((a, m) => Math.max(a, m.mock_number || 0), 0) || 0) + 1 })} style={{ ...goldBtn, marginBottom: 12 }}>+ New mock</button>
      {mocks.length === 0 && <p style={{ color: MUTED, fontSize: 13 }}>Is series me abhi koi mock nahi. SQL seed chalaiye ya "+ New mock".</p>}
      {mocks.map((m) => {
        const problems = [
          !m.typing_passage && "no passage", !m.excel_test_id && "no worksheet", !m.word_task_id && "no Word task",
          !m.ppt_task_id && "no PPT task", (m.mcq_count || 0) !== 15 && `${m.mcq_count || 0} MCQ`,
        ].filter(Boolean);
        return (
          <div key={m.id} style={cardBox}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <b style={{ color: GOLD, fontSize: 18 }}>#{m.mock_number}</b>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800 }}>{m.title} {m.is_free && <span style={{ color: GREEN, fontSize: 12 }}>· FREE</span>}</div>
                <div style={{ fontSize: 12, color: MUTED }}>
                  {m.passage_words} words · worksheet {m.excel_test_id ?? "—"} · {m.word_task_id || "—"} · {m.ppt_task_id || "—"} · {m.mcq_count} MCQ · {m.attempt_count} attempts
                </div>
                {problems.length > 0 && <div style={{ fontSize: 12, color: GOLD }}>⚠ {problems.join(", ")}</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
              <button onClick={() => setForm({ ...m })} style={ghostBtn}>Edit</button>
              <button onClick={() => setMcqFor(m)} style={ghostBtn}>MCQ ({m.mcq_count})</button>
              <button onClick={() => setAttFor(m)} style={ghostBtn}>Attempts</button>
              <button onClick={() => delMock(m)} style={dangerBtn}>Delete</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── MCQ: dekho, CSV se chadhao ──────────────────────────────────────────────
function McqPanel({ api, mock, onBack }: { api: ApiFn; mock: any; onBack: () => void }) {
  const [qs, setQs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const load = () => api(`/nbems-mock/admin/mcq?mock_id=${mock.id}`, "GET").then((r) => setQs(r?.questions || [])).catch((e) => setMsg(e.message));
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function parsed(): { rows: any[]; problems: string[] } {
    const all = parseCSV(text);
    if (!all.length) return { rows: [], problems: [] };
    const head = all[0].map((h) => h.trim().toLowerCase());
    const hasHead = head.includes("question");
    const col = (name: string, fallback: number) => { const i = head.indexOf(name); return hasHead ? i : fallback; };
    const iMock = col("mock", -1), iNo = col("q no", 0), iQ = col("question", 1), iA = col("option a", 2), iB = col("option b", 3),
          iC = col("option c", 4), iD = col("option d", 5), iAns = col("answer", 6), iExp = col("explanation", 7);
    const body = hasHead ? all.slice(1) : all;
    const rows: any[] = [], problems: string[] = [];
    body.forEach((r, n) => {
      if (iMock >= 0 && String(r[iMock] || "").trim() && Number(r[iMock]) !== Number(mock.mock_number)) return;   // doosre mock ki row
      const q = {
        q_no: Number(r[iNo]) || rows.length + 1, question: (r[iQ] || "").trim(),
        option_a: (r[iA] || "").trim(), option_b: (r[iB] || "").trim(), option_c: (r[iC] || "").trim(), option_d: (r[iD] || "").trim(),
        answer: (r[iAns] || "").trim().toUpperCase().slice(0, 1), explanation: iExp >= 0 ? (r[iExp] || "").trim() : "",
      };
      if (!q.question || !q.option_a || !q.option_b || !q.option_c || !q.option_d) problems.push(`Row ${n + 2}: question ya option khaali`);
      else if (!"ABCD".includes(q.answer) || !q.answer) problems.push(`Row ${n + 2}: answer A/B/C/D hona chahiye`);
      else rows.push(q);
    });
    return { rows, problems };
  }
  const p = parsed();

  async function upload() {
    if (!p.rows.length || p.problems.length) return;
    if (qs.length && !confirm(`Is mock ke ${qs.length} purane sawaal hat kar ${p.rows.length} naye aayenge. Theek?`)) return;
    setBusy(true); setMsg("");
    try {
      const r = await api("/nbems-mock/admin/mcq/bulk", "POST", { mock_id: mock.id, replace: true, questions: p.rows });
      setMsg(`✅ ${r.added} sawaal chadh gaye`); setText(""); await load();
    } catch (e: any) { setMsg(e.message); }
    setBusy(false);
  }

  return (
    <div>
      <button onClick={onBack} style={ghostBtn}>← Back</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "12px 0 4px" }}>MCQ · {mock.title}</h2>
      <p style={{ fontSize: 12.5, color: MUTED, margin: "0 0 10px" }}>
        CSV/TSV: Mock, Q No, Question, Option A, Option B, Option C, Option D, Answer, Explanation.
        Mock column ho to sirf #{mock.mock_number} wali rows li jaati hain — sab mocks ki ek hi file chalegi.
      </p>
      <div style={cardBox}>
        <input type="file" accept=".csv,.tsv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) f.text().then(setText); e.target.value = ""; }} style={{ marginBottom: 8, color: "#fff" }} />
        <textarea style={{ ...inputStyle, minHeight: 140, fontFamily: "monospace", fontSize: 12 }} value={text} onChange={(e) => setText(e.target.value)} placeholder="…ya yahan paste kijiye" />
        {text && (
          <div style={{ fontSize: 12.5, marginTop: 6 }}>
            <span style={{ color: p.rows.length === 15 ? GREEN : GOLD }}>{p.rows.length} sahi rows{p.rows.length !== 15 ? " (15 honi chahiye)" : ""}</span>
            {p.problems.slice(0, 8).map((x, i) => <div key={i} style={{ color: RED }}>{x}</div>)}
          </div>
        )}
        <button onClick={upload} disabled={busy || !p.rows.length || p.problems.length > 0} style={{ ...goldBtn, marginTop: 8, opacity: !p.rows.length || p.problems.length ? 0.5 : 1 }}>
          {busy ? "Uploading…" : "Replace MCQ with these"}
        </button>
        {msg && <div style={{ fontSize: 13, marginTop: 8 }}>{msg}</div>}
      </div>
      {qs.map((q) => (
        <div key={q.id} style={{ ...cardBox, fontSize: 13 }}>
          <b>{q.q_no}. {q.question}</b>
          {["a", "b", "c", "d"].map((L) => (
            <div key={L} style={{ color: q.answer === L.toUpperCase() ? GREEN : "#ddd", marginTop: 3 }}>
              {L.toUpperCase()}. {q[`option_${L}`]}{q.answer === L.toUpperCase() ? " ✓" : ""}
            </div>
          ))}
          {q.explanation && <div style={{ color: MUTED, fontSize: 12, marginTop: 4 }}>{q.explanation}</div>}
          <button onClick={async () => { if (confirm("Ye sawaal hatana hai?")) { await api(`/nbems-mock/admin/mcq/${q.id}`, "DELETE"); load(); } }} style={{ ...dangerBtn, marginTop: 6 }}>Delete</button>
        </div>
      ))}
    </div>
  );
}

// ── Attempts ────────────────────────────────────────────────────────────────
function AttemptsPanel({ api, mock, onBack }: { api: ApiFn; mock: any; onBack: () => void }) {
  const [rows, setRows] = useState<any[] | null>(null);
  useEffect(() => { api(`/nbems-mock/admin/attempts?mock_id=${mock.id}&limit=200`, "GET").then((r) => setRows(r?.attempts || [])).catch(() => setRows([])); }, [api, mock.id]);
  const done = (rows || []).filter((r) => r.status === "submitted");
  const avg = (k: string) => done.length ? (done.reduce((a, r) => a + Number(r[k] || 0), 0) / done.length).toFixed(1) : "—";
  return (
    <div>
      <button onClick={onBack} style={ghostBtn}>← Back</button>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "12px 0 4px" }}>Attempts · {mock.title}</h2>
      {rows === null ? <p style={{ color: MUTED }}>Loading…</p> : (
        <>
          <p style={{ fontSize: 12.5, color: MUTED }}>
            {done.length} submitted · avg total {avg("total_marks")} · typing {avg("typing_marks")} · excel {avg("excel_marks")} · word {avg("word_marks")} · ppt {avg("ppt_marks")} · mcq {avg("mcq_marks")}
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: 12.5, borderCollapse: "collapse" }}>
              <thead><tr style={{ color: MUTED, textAlign: "left" }}>
                {["User", "Status", "Started", "Typing", "Excel", "Word", "PPT", "MCQ", "Total"].map((h) => <th key={h} style={{ padding: 6 }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ padding: 6 }}>{r.user_id}</td>
                    <td style={{ padding: 6 }}>{r.status}</td>
                    <td style={{ padding: 6 }}>{(r.started_at || "").slice(0, 16).replace("T", " ")}</td>
                    {["typing_marks", "excel_marks", "word_marks", "ppt_marks", "mcq_marks"].map((k) => <td key={k} style={{ padding: 6 }}>{r[k] ?? "—"}</td>)}
                    <td style={{ padding: 6, fontWeight: 800, color: r.qualified ? GREEN : "#fff" }}>{r.total_marks ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
