"use client";

/**
 * ExcelAdmin.tsx — admin: Tier 2 ka Excel/CPT hissa.
 *
 * Char tab: Chart (38 formula cards), Tests (10 mock), Questions, Bonus MCQ.
 * app/admin/page.tsx me "excel" tab ke roop me judta hai: <ExcelAdmin api={api} />
 *
 * Base: /tier2/excel/admin
 *
 * Sabse zaroori baat: question upload karte waqt backend har answer key ko
 * CHALA kar dekhta hai. Answer key aur expected value match na karein to
 * upload reject ho jata hai, wajah ke saath. Isliye "added: 0" dikhe to
 * ghabraiye mat — neeche wajah likhi hogi.
 */

import { useState, useEffect, type ReactNode, type CSSProperties } from "react";
import { SheetEditor, toGridData, type SheetValue } from "@/app/components/SheetEditor";
import { API_URL } from "@/lib/config";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

const GOLD = "#FFAB00";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const MUTED = "#9a917f";

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
  borderRadius: 10, padding: "8px 13px", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
const dangerBtn: CSSProperties = {
  background: "transparent", color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.4)",
  borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12.5, cursor: "pointer",
};
const cardBox: CSSProperties = { background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14 };
const rowCard: CSSProperties = { ...cardBox, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 };

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 10 }}>
      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 5 }}>{label}</div>
      {children}
      {hint ? <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{hint}</div> : null}
    </label>
  );
}

/** Excel/Sheets se paste = TAB, .csv file = comma. Pehli line dekh kar khud pakadta hai. */
function parseCSV(text: string): string[][] {
  const firstLine = (text.split(/\r?\n/).find((l) => l.trim() !== "") || "");
  const tabs = (firstLine.match(/\t/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const SEP = tabs >= commas && tabs > 0 ? "\t" : ",";

  const rows: string[][] = [];
  let row: string[] = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += ch;
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
  return rows;
}

const stripHeader = (rows: string[][], firstCol: string) =>
  (rows[0]?.[0] || "").trim().toLowerCase() === firstCol ? rows.slice(1) : rows;

// ===========================================================================
export default function ExcelAdmin({ api }: { api: ApiFn }) {
  const [seriesList, setSeriesList] = useState<any[]>([]);
  const [seriesId, setSeriesId] = useState<number | null>(null);
  const [tab, setTab] = useState<"chart" | "tests" | "questions" | "worksheet" | "bonus">("chart");
  const [error, setError] = useState("");

  useEffect(() => {
    api("/tier2/admin/series", "GET")
      .then((r) => {
        const list = r?.series || [];
        setSeriesList(list);
        if (list.length && seriesId === null) setSeriesId(list[0].id);
      })
      .catch((e) => setError(e?.message || "Could not load the series."));
    // eslint-disable-next-line
  }, []);

  if (error) {
    return <p style={{ color: "#ff6b6b", fontSize: 13 }}>{error}</p>;
  }
  if (seriesList.length === 0) {
    return (
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 10px" }}>Excel / CPT</h2>
        <p style={{ color: MUTED, fontSize: 14, lineHeight: 1.6 }}>
          Create a series in the Tier 2 tab first. All Excel content attaches to that series.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 12px" }}>Excel / CPT</h2>

      <Field label="Series">
        <select style={inputStyle} value={seriesId ?? ""} onChange={(e) => setSeriesId(Number(e.target.value))}>
          {seriesList.map((s) => <option key={s.id} value={s.id}>{s.title}</option>)}
        </select>
      </Field>

      <div style={{ display: "flex", gap: 6, margin: "6px 0 16px", flexWrap: "wrap" }}>
        {(["chart", "tests", "questions", "worksheet", "bonus"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "8px 13px", borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: "pointer",
              border: `1px solid ${tab === t ? GOLD : BORDER}`,
              background: tab === t ? GOLD : "transparent",
              color: tab === t ? "#1a1a1a" : "#fff",
            }}
          >
            {t === "chart" ? "Formula chart" : t === "tests" ? "Tests" : t === "questions" ? "Questions" : "Bonus MCQ"}
          </button>
        ))}
      </div>

      {seriesId && tab === "chart" && <ChartTab api={api} seriesId={seriesId} />}
      {seriesId && tab === "tests" && <TestsTab api={api} seriesId={seriesId} />}
      {seriesId && tab === "questions" && <QuestionsTab api={api} seriesId={seriesId} />}
      {seriesId && tab === "worksheet" && <WorksheetTab api={api} seriesId={seriesId} />}
      {seriesId && tab === "bonus" && <BonusTab api={api} seriesId={seriesId} />}
    </div>
  );
}

// ===========================================================================
// CHART
// ===========================================================================
function ChartTab({ api, seriesId }: { api: ApiFn; seriesId: number }) {
  const [cards, setCards] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState("");
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");

  function load() {
    api(`/tier2/excel/admin/chart?series_id=${seriesId}`, "GET")
      .then((r) => setCards(r?.cards || []))
      .catch((e) => setMsg(e?.message || "Could not load"));
  }
  useEffect(load, [seriesId]); // eslint-disable-line

  function check(text?: string) {
    const rows = stripHeader(parseCSV(text ?? csv), "name");
    const out = rows.map((r) => {
      const [name, category, difficulty, what_en, what_hi, syntax, example,
             example_result, warning_en, warning_hi, is_free] = r;
      return {
        series_id: seriesId,
        name: (name || "").trim().toUpperCase(),
        category: (category || "basic").trim().toLowerCase(),
        difficulty: (difficulty || "easy").trim().toLowerCase(),
        what_en: (what_en || "").trim(),
        what_hi: (what_hi || "").trim(),
        syntax: (syntax || "").trim(),
        example: (example || "").trim(),
        example_result: (example_result || "").trim(),
        warning_en: (warning_en || "").trim(),
        warning_hi: (warning_hi || "").trim(),
        is_free: ["1", "true", "yes", "free"].includes((is_free || "").trim().toLowerCase()),
        display_order: 0,
      };
    }).filter((c) => c.name);
    out.forEach((c, i) => { c.display_order = i + 1; });
    setParsed(out);
    const free = out.filter((c) => c.is_free).map((c) => c.name);
    setMsg(`${out.length} cards found.` + (free.length ? ` Free: ${free.join(", ")}` : " No free cards — keeping 4 open works better."));
  }

  async function upload() {
    if (!parsed?.length) return alert("Press Check first.");
    setBusy(true);
    try {
      const r = await api("/tier2/excel/admin/chart/bulk", "POST", { series_id: seriesId, cards: parsed });
      const f = r?.failed || [];
      setMsg(`${r.added} cards added.` + (f.length ? `\nFailed:\n• ` + f.map((x: any) => `${x.name} — ${x.error}`).join("\n• ") : ""));
      setParsed(null); setCsv(""); load();
    } catch (e: any) { alert(e?.message || "Upload failed"); }
    finally { setBusy(false); }
  }

  async function toggleFree(c: any) {
    setBusy(true);
    try {
      await api(`/tier2/excel/admin/chart/${c.id}`, "PUT", { ...c, is_free: !c.is_free });
      load();
    } catch (e: any) { alert(e?.message || "Could not do that"); }
    finally { setBusy(false); }
  }

  async function remove(c: any) {
    if (!confirm(`Hide the "${c.name}" card?`)) return;
    await api(`/tier2/excel/admin/chart/${c.id}`, "DELETE");
    load();
  }

  async function hardDelete(c: any) {
    if (!confirm(`Delete "${c.name}" permanently? This cannot be undone.`)) return;
    await api(`/tier2/excel/admin/chart/${c.id}?hard=1`, "DELETE");
    load();
  }

  const freeCount = cards.filter((c) => c.is_free && c.is_active).length;

  return (
    <div>
      <div style={{ ...cardBox, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Bulk upload — formula cards</h3>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          11 columns: <b style={{ color: "#e0dacb" }}>Name, Category, Difficulty, What (EN), What (HI),
          Syntax, Example, Example result, Warning (EN), Warning (HI), Free?</b><br />
          Category: basic / conditional / text / lookup / date / advanced. Put 1 or yes in Free?.
        </p>
        <input type="file" accept=".csv,.tsv,.txt" onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return;
          const rd = new FileReader();
          rd.onload = () => { const t = String(rd.result || ""); setCsv(t); check(t); };
          rd.readAsText(f);
        }} style={{ marginBottom: 12, fontSize: 13 }} />
        <textarea rows={5} value={csv} onChange={(e) => setCsv(e.target.value)}
          placeholder="Or paste here…"
          style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12.5 }} />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => check()} style={ghostBtn}>Check</button>
          <button onClick={upload} disabled={busy || !parsed} style={goldBtn}>
            {busy ? "Uploading…" : `Upload ${parsed ? parsed.length : ""}`}
          </button>
        </div>
        {msg && <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>{msg}</pre>}
      </div>

      <div style={{ fontSize: 12.5, color: MUTED, marginBottom: 10 }}>
        {cards.length} cards · {freeCount} free (the API never sends syntax for locked cards)
      </div>

      {cards.map((c) => {
        const hidden = c.is_active === false;
        return (
          <div key={c.id} style={{ ...rowCard, opacity: hidden ? 0.45 : 1 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 13.5 }}>
                {c.name}
                <span style={{ fontSize: 10, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "1px 6px", marginLeft: 6 }}>{c.category}</span>
                {c.is_free ? <span style={{ fontSize: 10, color: "#4ade80", border: "1px solid rgba(74,222,128,0.4)", borderRadius: 6, padding: "1px 6px", marginLeft: 4 }}>FREE</span> : null}
                {hidden ? <span style={{ fontSize: 10, fontWeight: 900, color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.35)", background: "rgba(255,107,107,0.14)", borderRadius: 6, padding: "1px 6px", marginLeft: 4 }}>HIDDEN</span> : null}
              </div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {c.what_hi || c.what_en}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button onClick={() => toggleFree(c)} style={ghostBtn}>{c.is_free ? "Lock" : "Free"}</button>
              <button onClick={() => (hidden ? hardDelete(c) : remove(c))} style={dangerBtn}>
                {hidden ? "Delete" : "Hide"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===========================================================================
// TESTS
// ===========================================================================
function TestsTab({ api, seriesId }: { api: ApiFn; seriesId: number }) {
  const [tests, setTests] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  // SSSC notice: 5 question, 2-2 marks, 10 minute, pass 4.
  const [form, setForm] = useState<any>({ title: "", mock_number: 1, duration_min: 10, total_questions: 5, pass_marks: 4, grid_data: "", is_free: false });

  function load() {
    api(`/tier2/excel/admin/tests?series_id=${seriesId}`, "GET").then((r) => setTests(r?.tests || [])).catch(() => {});
  }
  useEffect(load, [seriesId]); // eslint-disable-line

  // Sheet ka live preview — galat separator turant pakda jaye
  const gridRows = (form.grid_data || "").split(";").filter((l: string) => l.trim() !== "").map((l: string) => l.split("|"));

  async function add() {
    if (!form.title.trim()) return alert("Title is required");
    setBusy(true);
    try {
      await api("/tier2/excel/admin/tests", "POST", {
        series_id: seriesId, kind: "test",
        title: form.title,
        mock_number: Number(form.mock_number) || null,
        duration_min: Number(form.duration_min) || 10,
        total_questions: Number(form.total_questions) || 5,
        pass_marks: Number(form.pass_marks) || 4,
        grid_data: form.grid_data.trim(),
        bonus_count: 0,
        is_free: !!form.is_free,
        display_order: Number(form.mock_number) || 0,
      });
      setForm({ ...form, title: "", grid_data: "", mock_number: Number(form.mock_number) + 1, is_free: false });
      load();
    } catch (e: any) { alert(e?.message || "Could not create it"); }
    finally { setBusy(false); }
  }

  async function remove(t: any) {
    if (!confirm(`"${t.title}" hata dein? (questions bhi chhup jayenge)`)) return;
    await api(`/tier2/excel/admin/tests/${t.id}`, "DELETE");
    load();
  }

  return (
    <div>
      <div style={{ ...cardBox, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>New mock</h3>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Title"><input style={inputStyle} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Excel Mock 1" /></Field>
          <Field label="Mock number"><input type="number" style={inputStyle} value={form.mock_number} onChange={(e) => setForm({ ...form, mock_number: e.target.value })} /></Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Minutes"><input type="number" style={inputStyle} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></Field>
          <Field label="Questions"><input type="number" style={inputStyle} value={form.total_questions} onChange={(e) => setForm({ ...form, total_questions: e.target.value })} /></Field>
          <Field label="Pass marks"><input type="number" style={inputStyle} value={form.pass_marks} onChange={(e) => setForm({ ...form, pass_marks: e.target.value })} /></Field>
        </div>
        <div style={{ fontSize: 11.5, color: MUTED, margin: "-4px 0 10px", lineHeight: 1.6 }}>
          Notice ke hisaab se: {form.total_questions || 5} question × 2 marks ={" "}
          <b style={{ color: "#e0dacb" }}>{(Number(form.total_questions) || 5) * 2} marks</b>, pass {form.pass_marks} (40%).
        </div>

        {/* Ek test = ek sheet. Asli exam me candidate ke saamne ek hi data
            sheet hoti hai aur usi par saare kaam hote hain.

            Yahan khaali chhod dijiye to bhi chalega — Questions tab me CSV
            ke Grid column se sheet apne aap yahan aa jayegi. Wo lambi line
            haath se paste karne me toot bhi sakti hai, isliye CSV wala
            raasta hi behtar hai. */}
        <Field label="Sheet (saare questions isi par) — khaali chhod sakte hain"
               hint="CSV ke Grid column me sheet ho to upload karte hi wo yahan set ho jayegi. Yahan bharna ho to: rows ; se, cells | se.">
          <textarea rows={4} style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12.5 }}
                    value={form.grid_data}
                    onChange={(e) => setForm({ ...form, grid_data: e.target.value })}
                    placeholder="Khaali chhod dijiye — CSV se aa jayegi" />
        </Field>

        {gridRows.length > 0 && (
          <div style={{ overflowX: "auto", border: `1px solid ${BORDER}`, borderRadius: 8, marginBottom: 12 }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                <tr>
                  <td style={gridHead}> </td>
                  {Array.from({ length: Math.max(...gridRows.map((r: string[]) => r.length)) }).map((_, c) => (
                    <td key={c} style={gridHead}>{String.fromCharCode(65 + c)}</td>
                  ))}
                </tr>
                {gridRows.map((r: string[], i: number) => (
                  <tr key={i}>
                    <td style={gridHead}>{i + 1}</td>
                    {r.map((cell, c) => (
                      <td key={c} style={{ border: `1px solid ${BORDER}`, padding: "3px 7px", color: "#e0dacb", whiteSpace: "nowrap" }}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, margin: "4px 0 12px", cursor: "pointer" }}>
          <input type="checkbox" checked={!!form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
          Free — open without buying (use this on Mock 1)
        </label>
        <button onClick={add} disabled={busy} style={{ ...goldBtn, width: "100%" }}>{busy ? "Saving…" : "Create mock"}</button>
      </div>

      {tests.map((t) => (
        <div key={t.id} style={rowCard}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>
              {t.title}
              {t.is_free ? <span style={{ fontSize: 10, color: "#4ade80", border: "1px solid rgba(74,222,128,0.4)", borderRadius: 6, padding: "1px 6px", marginLeft: 6 }}>FREE</span> : null}
              {!t.is_active ? <span style={{ fontSize: 10, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "1px 6px", marginLeft: 4 }}>HIDDEN</span> : null}
              {!t.grid_data ? <span style={{ fontSize: 10, color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.35)", borderRadius: 6, padding: "1px 6px", marginLeft: 6 }}>NO SHEET</span> : null}
            </div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>
              ID {t.id} · {t.q_count}/{t.total_questions} questions · {t.duration_min}min · pass {t.pass_marks}
            </div>
          </div>
          <button onClick={() => remove(t)} style={dangerBtn}>Hide</button>
        </div>
      ))}
      {tests.length === 0 && <p style={{ color: MUTED, fontSize: 13 }}>No mocks yet.</p>}
    </div>
  );
}

const gridHead: CSSProperties = {
  border: `1px solid ${BORDER}`, background: "rgba(255,171,0,0.08)",
  color: MUTED, fontSize: 11, textAlign: "center", padding: "3px 7px",
};

// ===========================================================================
// QUESTIONS
// ===========================================================================
function QuestionsTab({ api, seriesId }: { api: ApiFn; seriesId: number }) {
  const [tests, setTests] = useState<any[]>([]);
  const [testId, setTestId] = useState<string>("practice");
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<any>({});
  const [over, setOver] = useState<any>({});
  const [csv, setCsv] = useState("");
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function loadTests() {
    api(`/tier2/excel/admin/tests?series_id=${seriesId}`, "GET").then((r) => setTests(r?.tests || [])).catch(() => {});
  }
  useEffect(loadTests, [seriesId]); // eslint-disable-line

  function load() {
    const q = testId === "practice"
      ? `?series_id=${seriesId}&kind=practice`
      : `?series_id=${seriesId}&test_id=${testId}`;
    api(`/tier2/excel/admin/questions${q}`, "GET")
      .then((r) => { setRows(r?.questions || []); setCounts(r?.concept_counts || {}); setOver(r?.over_limit || {}); })
      .catch(() => {});
  }
  useEffect(load, [seriesId, testId]); // eslint-disable-line

  // ── CSV → questions ──
  //
  // EK ROW = EK PART. Kai rows ek hi "Q no" par ho to wo ek question ke
  // hisse ban jaate hain. Isse column phailte nahi — 2 part ho ya 3, CSV
  // ka dhaancha wahi rehta hai.
  //
  // Question-level cheezein (concept, instruction, grid) group ki PEHLI row
  // se aati hain; baaki rows me unhe khaali chhod dijiye.
  function check(text?: string) {
    const all = parseCSV(text ?? csv);
    // Header pehchanne ke liye pehla cell kaafi nahi — log "Q no", "Q", "S.No"
    // kuch bhi likhte hain. Doosra column hamesha Concept hota hai, isliye
    // usi se pakadte hain.
    const looksHeader = (all[0] || []).some((c) =>
      ["concept", "q no", "qno", "part label en", "target cell"].includes((c || "").trim().toLowerCase()));
    const raw = looksHeader ? all.slice(1) : all;
    // Sheet do jagah se aa sakti hai — mock par pehle se lagi hui, ya isi
    // CSV ke Grid column se (jo upload ke waqt mock par lag jayegi).
    // Yahan dono me se jo mile wahi maan kar jaanchte hain, warna pehle
    // question ke alawa baaki sab "koi sheet nahi" kehkar ruk jate.
    const onTest = (tests.find((t) => String(t.id) === testId)?.grid_data || "").trim();
    const inCsv = (raw.find((r: string[]) => (r[11] || "").trim())?.[11] || "").trim();
    const sheet = onTest || inCsv;

    // string[][] — any[] likhne se rows[0] bhi any ho jata hai, aur uske
    // destructure kiye hue variables par .split().map() ka parameter bina
    // type ke reh jata hai. strict mode me wahi build torta hai.
    const groups: Record<string, string[][]> = {};
    const order: string[] = [];
    raw.forEach((r: string[]) => {
      const [qno] = r;
      const key = (qno || "").trim() || String(order.length + 1);
      if (!groups[key]) { groups[key] = []; order.push(key); }
      groups[key].push(r);
    });

    const problems: string[] = [];
    const out = order.map((key: string, qi: number) => {
      const rows = groups[key];
      const [, concept, difficulty, instruction_en, instruction_hi, , , , , , , grid_data] = rows[0];

      const parts = rows.map((r: string[]) => {
        const [, , , , , label_en, label_hi, target_cell, fill_range, accepted, expected_value, , is_dynamic] = r;
        return {
          label_en: (label_en || "").trim(),
          label_hi: (label_hi || "").trim(),
          target_cell: (target_cell || "").trim().toUpperCase(),
          fill_range: (fill_range || "").trim().toUpperCase() || null,
          // Ek se zyada sahi formula '~' se alag — comma aur pipe dono
          // formula/grid me pehle se use ho rahe hain.
          accepted_formulas: (accepted || "").split("~").map((x: string) => x.trim()).filter(Boolean),
          expected_value: (expected_value || "").trim(),
          is_dynamic: ["1", "true", "yes"].includes((is_dynamic || "").trim().toLowerCase()),
          hints_en: [] as string[], hints_hi: [] as string[],
        };
      }).filter((p) => p.target_cell || p.accepted_formulas.length);

      const kind = testId === "practice" ? "practice" : "test";
      const q: any = {
        series_id: seriesId,
        test_id: testId === "practice" ? null : Number(testId),
        kind,
        concept: (concept || "").trim().toUpperCase(),
        difficulty: (difficulty || "easy").trim().toLowerCase(),
        instruction_en: (instruction_en || "").trim(),
        instruction_hi: (instruction_hi || "").trim(),
        grid_data: (grid_data || "").trim(),
        marks: 2,
        parts,
        display_order: qi + 1,
        // Backend purane single-part raaste ke liye pehla part yahan bhi
        // rakhta hai — koi purana tool toota na rahe.
        target_cell: parts[0]?.target_cell || "",
        fill_range: parts[0]?.fill_range || null,
        accepted_formulas: parts[0]?.accepted_formulas || [],
        expected_value: parts[0]?.expected_value || "",
        is_dynamic: !!parts[0]?.is_dynamic,
        hints_en: [], hints_hi: [],
      };

      const tag = `Q${key}`;
      if (!q.concept) problems.push(`${tag}: concept khaali hai`);
      if (!q.instruction_en && !q.instruction_hi) problems.push(`${tag}: instruction khaali hai`);
      if (!q.grid_data && !sheet) problems.push(`${tag}: na question ki grid hai, na mock ki sheet`);
      if (!parts.length) problems.push(`${tag}: koi part nahi mila`);
      parts.forEach((p, pi) => {
        const pt = parts.length > 1 ? `${tag} part ${String.fromCharCode(97 + pi)}` : tag;
        if (!p.target_cell) problems.push(`${pt}: target cell khaali hai`);
        if (!p.accepted_formulas.length) problems.push(`${pt}: koi formula nahi diya`);
        if (!p.fill_range && !p.expected_value && !p.is_dynamic)
          problems.push(`${pt}: expected value khaali hai`);
        if (parts.length > 1 && !p.label_en && !p.label_hi)
          problems.push(`${pt}: part ka label khaali hai`);
      });
      if (kind === "test" && parts.length !== 2)
        problems.push(`${tag}: ${parts.length} part hai — 2 marks ke liye 2 part chahiye (1-1 mark)`);

      return q;
    }).filter((q) => q.concept && q.parts.length);

    const c: Record<string, number> = { ...counts };
    out.forEach((q) => { c[q.concept] = (c[q.concept] || 0) + 1; });
    const overNow = Object.entries(c).filter(([, n]) => (n as number) > 3);
    if (overNow.length) problems.push(`3 baar se zyada: ${overNow.map(([k, n]) => `${k} (${n})`).join(", ")}`);

    const totalParts = out.reduce((n, q) => n + q.parts.length, 0);
    setParsed(out);
    setMsg(
      `${out.length} questions (${totalParts} parts) mile — ${out.length * 2} marks.` +
      (problems.length ? `\nCheck these:\n• ${problems.join("\n• ")}` : " Sab theek lag raha hai.")
    );
  }

  async function upload() {
    if (!parsed?.length) return alert("Press Check first.");
    setBusy(true);
    try {
      // ── Sheet pehle, questions baad me ──
      //
      // Backend har answer key ko chala kar jaanchta hai, aur uske liye use
      // sheet chahiye. Isliye agar CSV me grid hai aur mock ki sheet abhi
      // khaali hai, to pehle sheet set karte hain — warna saari keys
      // "koi sheet nahi mili" kehkar reject ho jayengi.
      //
      // Isse wo lambi line haath se paste karne ki zaroorat khatam ho jaati
      // hai. Paste karte waqt uska tootna sabse aam galti thi.
      const t = tests.find((x) => String(x.id) === testId);
      const fromCsv = (parsed.find((q: any) => (q.grid_data || "").trim())?.grid_data || "").trim();
      let sheetNote = "";
      if (testId !== "practice" && t && !(t.grid_data || "").trim() && fromCsv) {
        await api(`/tier2/excel/admin/tests/${t.id}`, "PUT", { ...t, grid_data: fromCsv });
        t.grid_data = fromCsv;                       // ab neeche verify isi par hoga
        sheetNote = "\nSheet CSV se le kar mock par laga di.";
      }

      const r = await api("/tier2/excel/admin/questions/bulk", "POST", { series_id: seriesId, questions: parsed });
      const f = r?.failed || [];
      setMsg(
        `${r.added} questions added.` + sheetNote +
        (f.length ? `\n\nRejected (${f.length}) — the backend ran each answer key:\n• ` +
          f.map((x: any) => `Row ${x.row} (${x.concept}) — ${x.error}`).join("\n• ") : "")
      );
      setParsed(null); setCsv(""); loadTests(); load();
    } catch (e: any) { alert(e?.message || "Upload failed"); }
    finally { setBusy(false); }
  }

  async function remove(q: any) {
    if (!confirm("Hide this question? Students will stop seeing it, the data stays.")) return;
    await api(`/tier2/excel/admin/questions/${q.id}`, "DELETE");
    load();
  }

  // Pehle se hidden question ko poori tarah mitana
  async function hardDelete(q: any) {
    if (!confirm("Delete permanently? This cannot be undone.")) return;
    await api(`/tier2/excel/admin/questions/${q.id}?hard=1`, "DELETE");
    load();
  }

  return (
    <div>
      <Field label="Where these go">
        <select style={inputStyle} value={testId} onChange={(e) => setTestId(e.target.value)}>
          <option value="practice">Practice questions (not in any mock)</option>
          {tests.map((t) => <option key={t.id} value={String(t.id)}>{t.title}</option>)}
        </select>
      </Field>

      <div style={{ ...cardBox, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Bulk upload — questions</h3>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          <b style={{ color: "#e0dacb" }}>Ek row = ek part.</b> Ek hi Q no par do rows likhiye,
          wo ek question ke do hisse ban jaate hain (1-1 mark). Question wali cheezein —
          Concept, Instruction, Grid — sirf pehli row me bhariye, doosri me khaali chhod dijiye.
        </p>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          13 columns: <b style={{ color: "#e0dacb" }}>Q no, Concept, Difficulty, Instruction EN,
          Instruction HI, Part label EN, Part label HI, Target cell, Fill range,
          Accepted formulas, Expected value, Grid, Dynamic?</b>
        </p>
        <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.7, background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, marginBottom: 10 }}>
          <div style={{ marginBottom: 6, color: "#e0dacb", fontWeight: 800 }}>Yaad rakhne laayak</div>
          • <b style={{ color: "#e0dacb" }}>Grid sirf SABSE PEHLE question ki pehli row me</b> bhariye.
          Upload karte waqt wahi sheet mock par lag jayegi aur baaki saare question usi par chalenge —
          Tests tab me Sheet box ko haath lagane ki zaroorat nahi.<br />
          • Mock par sheet pehle se lagi ho to Grid poora khaali chhod dijiye. Kisi ek question ko
          alag table chahiye to sirf usi ki row me bhariye.<br />
          • <b style={{ color: "#e0dacb" }}>Fill range</b> (jaise <span style={{ fontFamily: "monospace" }}>E2:E6</span>) bharne par
          student ka ek formula poori range me kheencha jayega — yahi <span style={{ fontFamily: "monospace" }}>$</span> ka test hai.
          Fill wale part me Expected value ki zaroorat nahi.<br />
          • Ek se zyada sahi formula <b style={{ color: "#e0dacb" }}>~</b> se alag kijiye.<br />
          • TODAY/DATEDIF wale part me Dynamic? me 1 likhiye.
        </div>
        <div style={{ fontSize: 11, color: MUTED, fontFamily: "monospace", lineHeight: 1.7, background: "rgba(0,0,0,0.25)", border: `1px solid ${BORDER}`, borderRadius: 8, padding: 10, marginBottom: 12, overflowX: "auto", whiteSpace: "pre" }}>
{`1,SUMIF,easy,Fill Amount then North total,Amount भरिए फिर North कुल,Amount column,Amount कॉलम,E2,E2:E6,=C2*D2,,,
1,,,,,North ki kul Qty,North की कुल Qty,C8,,"=SUMIF(B2:B6,""North"",C2:C6)",17,,`}
        </div>
        <input type="file" accept=".csv,.tsv,.txt" onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return;
          const rd = new FileReader();
          rd.onload = () => { const t = String(rd.result || ""); setCsv(t); check(t); };
          rd.readAsText(f);
        }} style={{ marginBottom: 12, fontSize: 13 }} />
        <textarea rows={5} value={csv} onChange={(e) => setCsv(e.target.value)}
          placeholder="Or paste here…" style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12.5 }} />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => check()} style={ghostBtn}>Check</button>
          <button onClick={upload} disabled={busy || !parsed} style={goldBtn}>
            {busy ? "Uploading…" : `Upload ${parsed ? parsed.length : ""}`}
          </button>
        </div>
        {msg && <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>{msg}</pre>}
      </div>

      {Object.keys(counts).length > 0 && (
        <div style={{ ...cardBox, marginBottom: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 8 }}>Formula usage count</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {Object.entries(counts).sort().map(([c, n]) => (
              <span key={c} style={{
                fontSize: 11.5, fontFamily: "monospace", borderRadius: 6, padding: "3px 8px",
                border: `1px solid ${over[c] ? "#ff6b6b" : BORDER}`,
                color: over[c] ? "#ff6b6b" : "#fff",
              }}>
                {c} {n as number}/3
              </span>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>
        {rows.filter((q) => q.is_active !== false).length} live ·
        {" "}{rows.filter((q) => q.is_active === false).length} hidden
      </div>

      {rows.map((q, i) => {
        const hidden = q.is_active === false;
        const parts: any[] = (q.parts && q.parts.length ? q.parts : [{
          target_cell: q.target_cell, fill_range: q.fill_range,
          accepted_formulas: q.accepted_formulas, expected_value: q.expected_value,
        }]);
        return (
          <div key={q.id} style={{ ...rowCard, alignItems: "flex-start", opacity: hidden ? 0.45 : 1 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                <span style={{ fontFamily: "monospace", color: GOLD }}>{q.concept}</span>
                <span style={{ color: MUTED, marginLeft: 8, fontWeight: 400 }}>
                  #{i + 1} · {q.marks ?? 2} marks · {parts.length} part{parts.length > 1 ? "s" : ""}
                </span>
                {hidden ? <span style={{ fontSize: 10, fontWeight: 900, color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.35)", background: "rgba(255,107,107,0.14)", borderRadius: 6, padding: "1px 6px", marginLeft: 6 }}>HIDDEN</span> : null}
                {q.kind === "test" && parts.length !== 2 ? <span style={{ fontSize: 10, color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.35)", borderRadius: 6, padding: "1px 6px", marginLeft: 6 }}>NOT 2 PARTS</span> : null}
              </div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {q.instruction_hi || q.instruction_en}
              </div>
              {parts.map((p, pi) => (
                <div key={pi} style={{ fontSize: 11, color: MUTED, marginTop: 3, fontFamily: "monospace", wordBreak: "break-all" }}>
                  {parts.length > 1 ? `(${String.fromCharCode(97 + pi)}) ` : ""}
                  <span style={{ color: "#e0dacb" }}>{p.target_cell}</span>
                  {p.fill_range ? <span style={{ color: "#4ade80" }}> fill {p.fill_range}</span> : null}
                  {" "}{(p.accepted_formulas || [])[0]}
                  {p.expected_value ? ` → ${p.expected_value}` : ""}
                </div>
              ))}
            </div>
            <button onClick={() => (hidden ? hardDelete(q) : remove(q))} style={dangerBtn}>
              {hidden ? "Delete" : "Hide"}
            </button>
          </div>
        );
      })}
      {rows.length === 0 && <p style={{ color: MUTED, fontSize: 13 }}>No questions yet.</p>}
    </div>
  );
}

// ===========================================================================
// BONUS MCQ
// ===========================================================================
function BonusTab({ api, seriesId }: { api: ApiFn; seriesId: number }) {
  const [tests, setTests] = useState<any[]>([]);
  const [testId, setTestId] = useState<number | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [csv, setCsv] = useState("");
  const [parsed, setParsed] = useState<any[] | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/tier2/excel/admin/tests?series_id=${seriesId}`, "GET").then((r) => {
      const list = r?.tests || [];
      setTests(list);
      if (list.length && testId === null) setTestId(list[0].id);
    }).catch(() => {});
  }, [seriesId]); // eslint-disable-line

  function load() {
    if (!testId) return;
    api(`/tier2/excel/admin/bonus?test_id=${testId}`, "GET").then((r) => setRows(r?.questions || [])).catch(() => {});
  }
  useEffect(load, [testId]); // eslint-disable-line

  function check(text?: string) {
    const raw = stripHeader(parseCSV(text ?? csv), "question");
    const out = raw.map((r, i) => {
      const [q_en, q_hi, a, b, c, d, correct, exp_en, exp_hi] = r;
      return {
        test_id: testId as number,
        question_en: (q_en || "").trim(),
        question_hi: (q_hi || "").trim(),
        option_a: (a || "").trim(), option_b: (b || "").trim(),
        option_c: (c || "").trim(), option_d: (d || "").trim(),
        correct_option: (correct || "A").trim().toUpperCase(),
        explanation_en: (exp_en || "").trim(),
        explanation_hi: (exp_hi || "").trim(),
        display_order: i + 1,
      };
    }).filter((q) => q.question_en);

    const bad = out.filter((q) => !["A", "B", "C", "D"].includes(q.correct_option));
    setParsed(out);
    setMsg(`${out.length} MCQ found.` + (bad.length ? ` ${bad.length} have no valid A/B/C/D answer.` : ""));
  }

  async function upload() {
    if (!parsed?.length || !testId) return alert("Press Check first.");
    setBusy(true);
    try {
      const r = await api("/tier2/excel/admin/bonus/bulk", "POST", { test_id: testId, questions: parsed });
      const f = r?.failed || [];
      setMsg(`${r.added} MCQ added.` + (f.length ? `\nFailed:\n• ` + f.map((x: any) => `Row ${x.row} — ${x.error}`).join("\n• ") : ""));
      setParsed(null); setCsv(""); load();
    } catch (e: any) { alert(e?.message || "Upload failed"); }
    finally { setBusy(false); }
  }

  if (tests.length === 0) {
    return <p style={{ color: MUTED, fontSize: 13.5, lineHeight: 1.6 }}>Create a mock in the Tests tab first.</p>;
  }

  return (
    <div>
      {/* SSSC notice me Spreadsheet exam sirf 5 Excel questions ka hai —
          shortcut-key MCQ ka koi zikr nahi. Backend ne inhe test se hata
          diya hai. Tab isliye rakha hai ki purana data mit na jaye aur
          faisla aapka rahe. */}
      <div style={{ background: "rgba(255,107,107,0.1)", border: "1px solid rgba(255,107,107,0.4)", borderRadius: 12, padding: 13, marginBottom: 16, fontSize: 12.5, lineHeight: 1.7, color: "#e0dacb" }}>
        <b style={{ color: "#ff6b6b" }}>Ye ab test me nahi jaata.</b><br />
        SSSC notice ke hisaab se Spreadsheet Exam sirf 5 Excel questions ka hai — shortcut-key
        MCQ ka koi zikr nahi. Students ko ab ye bonus round dikhta hi nahi. Purana data
        surakshit hai, par yahan naya banane ka koi faayda nahi.
      </div>

      <Field label="Bonus round for which mock" hint="Purana data dekhne ke liye.">
        <select style={inputStyle} value={testId ?? ""} onChange={(e) => setTestId(Number(e.target.value))}>
          {tests.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </Field>

      <div style={{ ...cardBox, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>Bulk upload — shortcut MCQ</h3>
        <p style={{ margin: "0 0 10px", fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          9 columns: <b style={{ color: "#e0dacb" }}>Question EN, Question HI, A, B, C, D,
          Correct (A/B/C/D), Explanation EN, Explanation HI</b>
        </p>
        <input type="file" accept=".csv,.tsv,.txt" onChange={(e) => {
          const f = e.target.files?.[0]; if (!f) return;
          const rd = new FileReader();
          rd.onload = () => { const t = String(rd.result || ""); setCsv(t); check(t); };
          rd.readAsText(f);
        }} style={{ marginBottom: 12, fontSize: 13 }} />
        <textarea rows={5} value={csv} onChange={(e) => setCsv(e.target.value)}
          placeholder="Or paste here…" style={{ ...inputStyle, fontFamily: "monospace", fontSize: 12.5 }} />
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button onClick={() => check()} style={ghostBtn}>Check</button>
          <button onClick={upload} disabled={busy || !parsed} style={goldBtn}>
            {busy ? "Uploading…" : `Upload ${parsed ? parsed.length : ""}`}
          </button>
        </div>
        {msg && <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>{msg}</pre>}
      </div>

      {rows.map((q, i) => {
        const hidden = q.is_active === false;
        return (
          <div key={q.id} style={{ ...rowCard, opacity: hidden ? 0.45 : 1 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>
                {i + 1}. {q.question_en}
                {hidden ? <span style={{ fontSize: 10, fontWeight: 900, color: "#ff6b6b", border: "1px solid rgba(255,107,107,0.35)", background: "rgba(255,107,107,0.14)", borderRadius: 6, padding: "1px 6px", marginLeft: 6 }}>HIDDEN</span> : null}
              </div>
              <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>Correct: {q.correct_option}</div>
            </div>
            {hidden ? null : (
              <button onClick={async () => { await api(`/tier2/excel/admin/bonus/${q.id}`, "DELETE"); load(); }} style={dangerBtn}>Hide</button>
            )}
          </div>
        );
      })}
      {rows.length === 0 && <p style={{ color: MUTED, fontSize: 13 }}>No bonus MCQ in this mock yet.</p>}
    </div>
  );
}

// ── Worksheet test ─────────────────────────────────────────────────────────
//
// Excel test ka doosra roop: student ko sirf chhapa hua page milta hai aur
// use poori sheet khud banani hoti hai.
//
// Yahan admin WAHI SheetEditor use karta hai jo student ke saamne aata hai.
// Jaisi sheet aap yahan banayenge, hu-ba-hu waisi student ko banani hogi —
// bold aur merge samet. Alag se koi format sikhne ki zaroorat nahi.
//
// Jin column ko student ko NIKALNA hai, unme FORMULA likhiye. Wahi cell PDF
// me khaali chhapte hain — sample me HRA, DA, PF, Net Salary khaali the.
function WorksheetTab({ api, seriesId }: { api: ApiFn; seriesId: number }) {
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<any>({
    title: "", mock_number: 1, duration_min: 10, pass_marks: 4,
    start_cell: "A1", is_free: false, start_strict: true,
  });
  const [sheet, setSheet] = useState<SheetValue>({ cells: {}, bold: [], merges: [] });
  const [computed, setComputed] = useState<Record<string, string>>({});
  const [ins, setIns] = useState<any[]>([
    { label_en: "Create the worksheet as given above", label_hi: "Worksheet upar jaisi banaiye",
      cells: "", marks: 2, check_format: true },
  ]);

  function load() {
    api(`/tier2/excel/admin/tests?series_id=${seriesId}`, "GET")
      .then((r) => setList((r?.tests || []).filter((t: any) => t.kind === "worksheet")))
      .catch(() => {});
  }
  useEffect(load, [seriesId]); // eslint-disable-line

  // Formula ka jawab wahi engine deta hai jo jaanch karta hai
  useEffect(() => {
    const grid = toGridData(sheet.cells);
    if (!Object.values(sheet.cells).some((v) => (v || "").startsWith("="))) {
      setComputed({}); return;
    }
    const t = setTimeout(() => {
      api("/tier2/excel/worksheet/preview", "POST", { grid_data: grid })
        .then((d: any) => setComputed(d?.cells || {})).catch(() => {});
    }, 400);
    return () => clearTimeout(t);
  }, [sheet.cells]); // eslint-disable-line

  function reset() {
    setEditId(null);
    setForm({ ...form, title: "", mock_number: Number(form.mock_number) + 1, is_free: false });
    setSheet({ cells: {}, bold: [], merges: [] });
    setIns([{ label_en: "Create the worksheet as given above",
              label_hi: "Worksheet upar jaisi banaiye", cells: "", marks: 2, check_format: true }]);
    setMsg("");
  }

  function edit(t: any) {
    setEditId(t.id);
    setForm({
      title: t.title || "", mock_number: t.mock_number || 1,
      duration_min: t.duration_min || 10, pass_marks: t.pass_marks || 4,
      start_cell: (t.start_cell || "A1").toUpperCase(),
      is_free: !!t.is_free, start_strict: t.start_strict !== false,
    });
    const cells: Record<string, string> = {};
    (t.grid_data || "").split(";").forEach((row: string, r: number) => {
      row.split("|").forEach((v: string, c: number) => {
        if ((v || "").trim() !== "") {
          let s = "", n = c + 1;
          while (n > 0) { s = String.fromCharCode(65 + ((n - 1) % 26)) + s; n = Math.floor((n - 1) / 26); }
          cells[`${s}${r + 1}`] = v;
        }
      });
    });
    setSheet({ cells, bold: t.bold_cells || [], merges: t.merges || [] });
    setIns((t.instructions || []).length ? t.instructions : ins);
    setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save() {
    if (!form.title.trim()) return alert("Title chahiye");
    setBusy(true); setMsg("");
    const body = {
      series_id: seriesId, kind: "worksheet",
      title: form.title,
      mock_number: Number(form.mock_number) || null,
      duration_min: Number(form.duration_min) || 10,
      pass_marks: Number(form.pass_marks) || 4,
      total_questions: ins.length,
      bonus_count: 0,
      is_free: !!form.is_free,
      display_order: Number(form.mock_number) || 0,
      grid_data: toGridData(sheet.cells),
      start_cell: (form.start_cell || "A1").toUpperCase(),
      bold_cells: sheet.bold, merges: sheet.merges,
      start_strict: !!form.start_strict,
      instructions: ins.map((q) => ({
        label_en: q.label_en, label_hi: q.label_hi,
        cells: (q.cells || "").toUpperCase(),
        marks: Number(q.marks) || 2,
        check_format: !!q.check_format,
      })),
    };
    try {
      if (editId) await api(`/tier2/excel/admin/tests/${editId}`, "PUT", body);
      else await api("/tier2/excel/admin/tests", "POST", body);
      setMsg(`Save ho gaya — ${ins.reduce((n, q) => n + (Number(q.marks) || 0), 0)} marks.`);
      reset(); load();
    } catch (e: any) {
      // Backend sheet ko khud chala kar dekhta hai. Yahan jo aata hai wo
      // asli wajah hoti hai — "ye cell kisi instruction me nahi aate" jaisi.
      setMsg(`Ruk gaya — ${e?.message || "save nahi hua"}`);
    } finally { setBusy(false); }
  }

  const marksTotal = ins.reduce((n, q) => n + (Number(q.marks) || 0), 0);
  const hasFormula = Object.values(sheet.cells).some((v) => (v || "").startsWith("="));

  return (
    <div>
      <div style={{ ...cardBox, marginBottom: 16 }}>
        <h3 style={{ margin: "0 0 4px", fontSize: 15 }}>
          {editId ? `Worksheet #${editId} badal rahe hain` : "Naya worksheet"}
        </h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
          Neeche wahi editor hai jo student ke saamne aata hai. Jaisi sheet aap banayenge,
          hu-ba-hu waisi use banani hogi — bold aur merge samet.<br />
          <b style={{ color: "#e0dacb" }}>Jin column ko student ko nikalna hai unme formula likhiye</b> —
          wahi cell PDF me khaali chhapte hain.
        </p>

        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Title"><input style={inputStyle} value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Worksheet 1 — Salary Sheet" /></Field>
          <Field label="Number"><input type="number" style={inputStyle} value={form.mock_number}
            onChange={(e) => setForm({ ...form, mock_number: e.target.value })} /></Field>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Minutes"><input type="number" style={inputStyle} value={form.duration_min}
            onChange={(e) => setForm({ ...form, duration_min: e.target.value })} /></Field>
          <Field label="Pass marks"><input type="number" style={inputStyle} value={form.pass_marks}
            onChange={(e) => setForm({ ...form, pass_marks: e.target.value })} /></Field>
          <Field label="Start cell" hint="Table yahan se shuru honi chahiye">
            <input style={inputStyle} value={form.start_cell}
              onChange={(e) => setForm({ ...form, start_cell: e.target.value.toUpperCase() })}
              placeholder="A1" /></Field>
        </div>

        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, marginBottom: 6, cursor: "pointer" }}>
          <input type="checkbox" checked={!!form.start_strict}
            onChange={(e) => setForm({ ...form, start_strict: e.target.checked })} />
          Galat cell se shuru = score 0 (asli exam jaisa)
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, marginBottom: 14, cursor: "pointer" }}>
          <input type="checkbox" checked={!!form.is_free}
            onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
          Free — bina khareede khule
        </label>

        <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>
          Sheet {hasFormula ? "" : <span style={{ color: "#ff6b6b", fontWeight: 400 }}>· abhi koi formula nahi hai</span>}
        </div>
        <div style={{ background: "#fff", borderRadius: 8, padding: 8, marginBottom: 14 }}>
          <SheetEditor rows={14} cols={10} value={sheet} onChange={setSheet} computed={computed} />
        </div>

        {/* Instructions = sawal */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 6 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800 }}>Instructions (yahi sawal hain)</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: marksTotal === 10 ? "#4ade80" : GOLD }}>
            {marksTotal} marks
          </span>
        </div>
        <p style={{ fontSize: 11.5, color: MUTED, margin: "0 0 10px", lineHeight: 1.65 }}>
          Har instruction apne cell ke daayre ki maalik hai. Daayra khaali chhoda to poori sheet.
          Comma se kai hisse: <span style={{ fontFamily: "monospace" }}>A1:I3,A4:D11</span>.
          Bold/merge sirf us instruction me jaanche jate hain jisme <b>format</b> laga ho.
        </p>

        {ins.map((q, i) => (
          <div key={i} style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontWeight: 900, fontSize: 13, color: GOLD }}>{i + 1}.</span>
              <input style={{ ...inputStyle, marginBottom: 0 }} value={q.label_en || ""}
                placeholder="HRA is 12% of Basic Salary"
                onChange={(e) => setIns(ins.map((x, j) => j === i ? { ...x, label_en: e.target.value } : x))} />
              <button onClick={() => setIns(ins.filter((_, j) => j !== i))}
                style={{ ...dangerBtn, padding: "6px 9px" }}>×</button>
            </div>
            <input style={inputStyle} value={q.label_hi || ""} placeholder="HRA = Basic Salary ka 12%"
              onChange={(e) => setIns(ins.map((x, j) => j === i ? { ...x, label_hi: e.target.value } : x))} />
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input style={{ ...inputStyle, fontFamily: "monospace" }} value={q.cells || ""}
                placeholder="E4:E11"
                onChange={(e) => setIns(ins.map((x, j) => j === i ? { ...x, cells: e.target.value.toUpperCase() } : x))} />
              <input type="number" style={{ ...inputStyle, maxWidth: 70 }} value={q.marks}
                onChange={(e) => setIns(ins.map((x, j) => j === i ? { ...x, marks: e.target.value } : x))} />
              <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, whiteSpace: "nowrap", marginBottom: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={!!q.check_format}
                  onChange={(e) => setIns(ins.map((x, j) => j === i ? { ...x, check_format: e.target.checked } : x))} />
                format
              </label>
            </div>
          </div>
        ))}
        <button onClick={() => setIns([...ins, { label_en: "", label_hi: "", cells: "", marks: 2, check_format: false }])}
          style={{ ...ghostBtn, marginBottom: 12 }}>+ Instruction</button>

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={save} disabled={busy} style={{ ...goldBtn, flex: 1 }}>
            {busy ? "Saving…" : editId ? "Update" : "Create worksheet"}
          </button>
          {editId ? <button onClick={reset} style={ghostBtn}>Cancel</button> : null}
        </div>

        {msg ? (
          <p style={{ fontSize: 12.5, marginTop: 10, whiteSpace: "pre-wrap", lineHeight: 1.7,
                      color: msg.startsWith("Ruk") ? "#ff6b6b" : "#4ade80" }}>{msg}</p>
        ) : null}
      </div>

      {list.map((t) => (
        <div key={t.id} style={{ ...rowCard, opacity: t.is_active === false ? 0.45 : 1 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13.5 }}>
              {t.title}
              {t.is_free ? <span style={{ fontSize: 10, color: "#4ade80", border: "1px solid rgba(74,222,128,0.4)", borderRadius: 6, padding: "1px 6px", marginLeft: 6 }}>FREE</span> : null}
            </div>
            <div style={{ fontSize: 11.5, color: MUTED, marginTop: 2 }}>
              ID {t.id} · start {t.start_cell || "A1"} · {(t.instructions || []).length} instructions ·
              {" "}{t.duration_min}min · pass {t.pass_marks}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <a href={`${API_URL}/tier2/excel/worksheet/pdf/${t.id}?user_id=1&download=0`}
               target="_blank" rel="noreferrer" style={{ ...ghostBtn, textDecoration: "none", padding: "6px 10px" }}>PDF</a>
            <button onClick={() => edit(t)} style={{ ...ghostBtn, padding: "6px 10px" }}>Edit</button>
          </div>
        </div>
      ))}
      {list.length === 0 && <p style={{ color: MUTED, fontSize: 13 }}>Abhi koi worksheet nahi.</p>}
    </div>
  );
}
