"use client";

/**
 * app/worksheet-test/[id]/page.tsx — chhape hue page se poori sheet banana.
 *
 * Excel test ka doosra roop, purane formula-wale test ke saath-saath.
 *
 * SHEET SIRF PDF ME MILTI HAI, SCREEN PAR NAHI — jaan-boojh kar. Asli exam
 * me kagaz saamne rakh kar screen par type karna padta hai, aur wahi asli
 * mushkil hai. Screen par saath dikha dete to abhyas aasan ho jata aur exam
 * me wo aadat kaam na aati. Isi wajah se sheet ka content backend response
 * me bhi nahi aata — network tab kholkar bhi nahi padha ja sakta.
 */

import { useEffect, useRef, useState, useCallback, type ReactNode, type CSSProperties,
         type ChangeEvent as RChangeEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { SheetEditor, toGridData, type SheetValue } from "@/app/components/SheetEditor";
import SheetHelp from "@/app/components/SheetHelp";
import PracticeNotice from "@/app/components/PracticeNotice";

const GOLD = "#FFAB00";
const GREEN = "#1c7a3e";
const RED = "#c0392b";

type Stage = "loading" | "brief" | "work" | "upload" | "result";
/** Kaam kahan hoga — website ki sheet par, ya apne laptop ke Excel me */
type Mode = "web" | "xlsx";

// Kaam ka waqt dono ke liye barabar hai. Ye extra minutes uske BAAD milte
// hain, sirf file save karke upload karne ke liye — kaam karne ke liye
// nahi. Laptop par kaam waise bhi tez hota hai; wahan zyada waqt de dete to
// dono tareeke ek hi taraazu par na tulte.
const UPLOAD_SECONDS = 120;

export default function WorksheetTest() {
  const params = useParams();
  const router = useRouter();
  const testId = Number(params.id);

  const [stage, setStage] = useState<Stage>("loading");
  const [test, setTest] = useState<any>(null);
  const [sheet, setSheet] = useState<SheetValue>({ cells: {}, bold: [], merges: [] });
  const [computed, setComputed] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState<{
    grid: string; bold: string[]; merges: string[];
    borders?: string[]; align?: Record<string, string>; wrap?: string[]; num_formats?: Record<string, string>;
  } | null>(null);
  // Upload robust: aakhri chuni file yaad rahe — net gaya to "Try again" usi
  // file ko dobara bheje, student ko phir se dhoondhni na pade.
  const lastFile = useRef<File | null>(null);
  const [readSummary, setReadSummary] = useState("");
  const [printing, setPrinting] = useState(false);
  const [mode, setMode] = useState<Mode>("web");
  const [uploadLeft, setUploadLeft] = useState(UPLOAD_SECONDS);
  const [warnings, setWarnings] = useState<string[]>([]);
  const file = useRef<HTMLInputElement | null>(null);

  const startedAt = useRef(0);
  const ref = useRef({ sheet });
  ref.current = { sheet };
  const uid = (getUser() as any)?.id;

  useEffect(() => {
    if (!getUser()) { router.replace("/login"); return; }
    fetch(`${API_URL}/tier2/excel/worksheet/${testId}?user_id=${uid}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not open this test");
        setTest(d.test);
        setTimeLeft((d.test?.duration_min || 10) * 60);
        setStage("brief");
      })
      .catch((e) => { setError(e.message); setStage("result"); });
  }, [testId, uid, router]);

  const submit = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    const s = ref.current.sheet;
    try {
      const r = await fetch(`${API_URL}/tier2/excel/worksheet/submit`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: uid, test_id: testId,
          grid_data: toGridData(s.cells),
          bold_cells: s.bold, merges: s.merges,
          border_cells: s.borders || [], align_cells: s.align || {},
          wrap_cells: s.wrap || [], num_formats: s.fmt || {},
          seconds_taken: Math.round((Date.now() - startedAt.current) / 1000),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Could not submit");
      setResult(d); setStage("result");
      // Submit ke baad grid state chhoo nahi rahe, par printout usi se
      // banega — isliye alag rakh lete hain.
      setSubmitted({ grid: toGridData(s.cells), bold: s.bold, merges: s.merges,
                     borders: s.borders || [], align: s.align || {}, wrap: s.wrap || [],
                     num_formats: s.fmt || {} });
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }, [busy, uid, testId]);

  const submitXlsx = useCallback(async (f: File) => {
    if (busy) return;
    lastFile.current = f;
    setBusy(true); setError("");
    try {
      const fd = new FormData();
      fd.append("file", f);
      fd.append("user_id", String(uid));
      fd.append("test_id", String(testId));
      fd.append("seconds_taken", String(Math.round((Date.now() - startedAt.current) / 1000)));
      let r: Response;
      try {
        r = await fetch(`${API_URL}/tier2/excel/worksheet/submit-xlsx`, { method: "POST", body: fd });
      } catch {
        // Fetch khud fail = net nahi pahuncha. File yaad hai, dobara bhej sakte hain.
        throw new Error("The upload did not go through. Check your internet and tap Try again — your file is kept.");
      }
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.detail || "Your file could not be checked");
      setResult(d); setStage("result");
      setWarnings(d.warnings || []);
      setReadSummary(d.read_summary || "");
      if (d.submitted) setSubmitted(d.submitted);
    } catch (e: any) { setError(e.message); }
    setBusy(false);
  }, [busy, uid, testId]);

  useEffect(() => {
    if (stage !== "work") return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s > 1) return s - 1;
        clearInterval(t);
        // Laptop wale ko kaam ke baad file save karke upload karne ka
        // alag waqt milta hai — kaam ka waqt dono ke liye barabar hi tha.
        if (mode === "xlsx") setStage("upload"); else submit();
        return 0;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [stage, submit, mode]);

  useEffect(() => {
    if (stage !== "upload") return;
    const t = setInterval(() => {
      setUploadLeft((s) => { if (s <= 1) { clearInterval(t); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(t);
  }, [stage]);

  // Formula ka jawab backend se — wahi engine jo jaanch karta hai, taaki
  // jo dikhe aur jis par marks mile dono ek hi hisaab se nikle.
  //
  // Pehle 400ms rukta tha aur naye jawab AANE TAK cell me "…" chhap jata
  // tha. Excel me jawab turant dikhta hai; yahan har akshar par cell khaali
  // ho jata tha aur sheet toothi hui lagti thi. Ab intezaar chhota hai aur
  // purana jawab tab tak dikhta rehta hai jab tak naya na aa jaye —
  // sirf badle hue cell hi hilte hain.
  const seq = useRef(0);
  useEffect(() => {
    if (stage !== "work") return;
    const has = Object.values(sheet.cells).some((v) => (v || "").startsWith("="));
    if (!has) { setComputed({}); return; }
    const my = ++seq.current;
    const t = setTimeout(() => {
      fetch(`${API_URL}/tier2/excel/worksheet/preview`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grid_data: toGridData(sheet.cells) }),
      })
        .then((r) => r.json())
        .then((d) => {
          // Der se aaya purana jawab naye ko na mitaye
          if (my !== seq.current) return;
          setComputed(d?.cells || {});
        })
        .catch(() => {});
    }, 120);
    return () => clearTimeout(t);
  }, [sheet.cells, stage]);

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");

  if (stage === "loading") return <Shell><p style={{ color: "var(--muted)" }}>Loading…</p></Shell>;

  // ═══════════ BRIEF — PDF lo, phir shuru karo ═══════════
  if (stage === "brief") {
    return (
      <Shell>
        <h2 style={{ fontSize: 19, fontWeight: 900, margin: "0 0 4px" }}>{test?.title}</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 16px" }}>
          {test?.duration_min} min · {test?.total_marks} marks · qualify {test?.pass_marks}
        </p>

        <PracticeNotice />

        <div style={{ background: "var(--card)", border: "1px solid var(--line)",
                      borderRadius: 12, padding: 14, marginBottom: 14, lineHeight: 1.8, fontSize: 13.5 }}>
          <b>How to take this test</b>
          <div style={{ color: "var(--muted)", marginTop: 6 }}>
            1. Download the PDF below and <b style={{ color: "var(--text)" }}>print it</b>.
            In the real exam you get this sheet on paper.<br />
            2. Keep the paper in front of you. The sheet is not shown on screen, so type it by looking at the paper.<br />
            3. Start the table at <b style={{ color: "var(--text)" }}>{test?.start_cell}</b>.
            {test?.start_strict ? " In the real exam, a table that starts in the wrong cell makes the printout invalid." : ""}<br />
            4. Make bold whatever is printed in bold{test?.has_merge ? ", and merge the title cells" : ""}.
            {" "}Match the alignment, Wrap Text and number formats (%, decimals) shown on the paper.<br />
            {test?.has_borders ? (
              <>
                <b style={{ color: RED }}>Apply All Borders to the whole table.</b> Without borders
                the table does not show up on the printout, and the test counts as not done.<br />
              </>
            ) : null}
            5. Fill the empty columns with a <b style={{ color: "var(--text)" }}>formula</b>.
            Answers typed in by hand get no marks.
          </div>
        </div>

        <a href={`${API_URL}/tier2/excel/worksheet/pdf/${testId}?user_id=${uid}`}
           style={{ display: "block", textAlign: "center", background: "var(--card)",
                    border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 10,
                    padding: "13px 0", fontWeight: 800, fontSize: 14,
                    textDecoration: "none", marginBottom: 12 }}>
          📄 Download question paper (PDF)
        </a>

        {/* Laptop hai to asli Excel me kaam — wahi keyboard, wahi fill
            handle, wahi mahaul jo asli exam me milega. Number wahi checker
            deta hai, isliye dono raaste barabar hain. */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)",
                      borderRadius: 12, padding: 13, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
            Where will you do the work?
          </div>
          {([
            ["web", "On this website", "Phone or laptop — fill the sheet right here"],
            ["xlsx", "In Excel on your laptop", "Excel, LibreOffice or WPS — then upload the .xlsx file here"],
          ] as [Mode, string, string][]).map(([m, title, sub]) => (
            <button key={m} onClick={() => setMode(m)}
              style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                       background: mode === m ? "rgba(255,171,0,0.10)" : "transparent",
                       border: `1px solid ${mode === m ? GOLD : "var(--line)"}`,
                       borderRadius: 10, padding: "10px 12px", marginBottom: 8,
                       color: "var(--text)" }}>
              <div style={{ fontSize: 13, fontWeight: 800 }}>
                {mode === m ? "● " : "○ "}{title}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{sub}</div>
            </button>
          ))}
          {mode === "xlsx" && (
            <p style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.65, margin: "2px 0 0" }}>
              You get the same {test?.duration_min} minutes for the work, and then{" "}
              <b style={{ color: "var(--text)" }}>2 extra minutes</b> to save and upload the file.
              Save it as <b style={{ color: "var(--text)" }}>.xlsx</b>.
            </p>
          )}
        </div>

        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 14 }}>
          The timer starts only when you press the button below, so print the PDF first
          without any hurry.
        </p>

        <button onClick={() => { startedAt.current = Date.now(); setStage("work"); }}
                style={gold}>Start — the timer begins</button>

        {/* Yahin apne aap khulta hai — timer abhi shuru nahi hua, isliye
            help padhne me bachche ka exam ka waqt nahi jaata. */}
        <SheetHelp startCell={test?.start_cell || "A1"} />
      </Shell>
    );
  }

  // ═══════════ WORK ═══════════
  if (stage === "work") {
    return (
      <Shell>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card)",
                      border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px",
                      marginBottom: 12 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800 }}>
            Table starts at {test?.start_cell}
          </span>
          <span style={{ flex: 1 }} />
          <a href={`${API_URL}/tier2/excel/worksheet/pdf/${testId}?user_id=${uid}`}
             style={{ fontSize: 12, color: GOLD, textDecoration: "none", fontWeight: 700 }}>
            PDF
          </a>
          <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                         color: timeLeft <= 60 ? RED : "var(--text)" }}>{mm}:{ss}</span>
        </div>

        {mode === "web" ? (
          <>
            <PracticeNotice compact />
            <SheetEditor rows={18} cols={10} value={sheet} onChange={setSheet} computed={computed} />
          </>
        ) : (
          <div style={{ background: "var(--card)", border: "1px solid var(--line)",
                        borderRadius: 12, padding: 16, lineHeight: 1.8, fontSize: 13.5 }}>
            <b>Build it in your own Excel</b>
            <div style={{ color: "var(--muted)", marginTop: 6 }}>
              Keep the paper in front of you and build the worksheet on your laptop.
              Start the table at <b style={{ color: "var(--text)" }}>{test?.start_cell}</b>.
              Fill the empty columns with formulas. Answers typed in by hand get no
              marks.<br />
              When you finish, save the file as <b style={{ color: "var(--text)" }}>.xlsx</b>.
              The upload page opens as soon as the timer ends.
            </div>
          </div>
        )}

        <button onClick={() => (mode === "xlsx" ? setStage("upload") : submit())}
                disabled={busy} style={{ ...gold, marginTop: 14 }}>
          {busy ? "Submitting…" : mode === "xlsx" ? "Done — upload my file" : "Submit"}
        </button>

        {/* Test ke dauran button haath ke paas rehta hai, par apne aap
            khulta nahi — timer chal raha hai. */}
        <SheetHelp startCell={test?.start_cell || "A1"} />
        {error ? <p style={{ color: RED, fontSize: 13, marginTop: 10 }}>{error}</p> : null}
      </Shell>
    );
  }

  // ═══════════ UPLOAD — laptop par bani file yahan ═══════════
  if (stage === "upload") {
    const um = String(Math.floor(uploadLeft / 60)).padStart(2, "0");
    const us = String(uploadLeft % 60).padStart(2, "0");
    const late = uploadLeft <= 0;
    return (
      <Shell>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card)",
                      border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px",
                      marginBottom: 12 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800 }}>Upload your file</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 14, fontWeight: 800, fontVariantNumeric: "tabular-nums",
                         color: late ? RED : uploadLeft <= 30 ? RED : "var(--text)" }}>
            {um}:{us}
          </span>
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)",
                      borderRadius: 12, padding: 16, marginBottom: 14, lineHeight: 1.8, fontSize: 13.5 }}>
          <b>Choose your .xlsx file</b>
          <div style={{ color: "var(--muted)", marginTop: 6 }}>
            In Excel use <b style={{ color: "var(--text)" }}>Save As → Excel Workbook (.xlsx)</b>.
            In LibreOffice or WPS, choose ".xlsx" too. All three make the same kind of file.
            It is checked exactly like the sheet on this website.
          </div>
        </div>

        {/* Der ho gayi to bhi upload band nahi karte — number to mil hi
            jaane chahiye. Par ye khulkar likh dete hain ki der hui, taaki
            student ko lage nahi ki der se koi farak nahi padta. */}
        {late && (
          <p style={{ fontSize: 12.5, color: RED, lineHeight: 1.7, marginBottom: 12 }}>
            The upload time is over. Your file will still be checked, but in the real
            exam a late printout is not accepted.
          </p>
        )}

        <input
          ref={file}
          type="file"
          accept=".xlsx,.xlsm,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          style={{ display: "none" }}
          onChange={(e: RChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            // Value khaali karo — warna wahi file dobara chunne par browser
            // onChange chalata hi nahi (galti theek karke dobara bhejna ho to)
            e.target.value = "";
            if (f) submitXlsx(f);
          }}
        />
        <button onClick={() => file.current?.click()} disabled={busy} style={gold}>
          {busy ? "Checking…" : "📄 Choose file and submit"}
        </button>
        {error && lastFile.current && !busy ? (
          <button onClick={() => lastFile.current && submitXlsx(lastFile.current)}
                  style={{ ...gold, marginTop: 10, background: "transparent", color: GOLD, border: `1px solid ${GOLD}` }}>
            ↻ Try again with the same file
          </button>
        ) : null}

        {error ? <p style={{ color: RED, fontSize: 13, marginTop: 12 }}>{error}</p> : null}

        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginTop: 14 }}>
          Can't find the file? In Excel, open File → Save As to see which folder it was saved in.
        </p>
      </Shell>
    );
  }

  // ═══════════ RESULT ═══════════
  if (error && !result) return <Shell><p style={{ color: RED, fontSize: 14 }}>{error}</p></Shell>;
  if (!result) return <Shell><p style={{ color: "var(--muted)" }}>Loading…</p></Shell>;

  const lostToStart = result.start_strict && !result.start_ok && result.would_be > 0;
  // Border na lagana = printout me table dikhti hi nahi (asli exam me fail)
  const lostToBorders = result.borders_required && result.borders_ok === false && result.would_be > 0;

  return (
    <Shell>
      <div style={{ background: result.qualified ? "rgba(28,122,62,0.12)" : "rgba(192,57,43,0.1)",
                    border: `1px solid ${result.qualified ? GREEN : RED}`, borderRadius: 16,
                    padding: 18, textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 32 }}>{result.qualified ? "✅" : "📈"}</div>
        <div style={{ fontSize: 26, fontWeight: 900, marginTop: 4,
                      color: result.qualified ? GREEN : RED }}>
          {result.score} / {result.total}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          {result.pass_marks} needed to qualify
        </div>
      </div>

      {/* File theek padhi gayi — kaunsi sheet, kitne cell. Bharosa isi se banta hai. */}
      {readSummary ? (
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px", lineHeight: 1.6 }}>{readSummary}</p>
      ) : null}

      {lostToBorders && (
        <div style={{ background: "rgba(192,57,43,0.08)", border: `1px solid ${RED}`,
                      borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 13.5, lineHeight: 1.75 }}>
          <b style={{ color: RED }}>The table has no borders</b>
          <div style={{ color: "var(--muted)", marginTop: 6 }}>
            Without <b style={{ color: "var(--text)" }}>All Borders</b>, the table does not show up
            on the printout, so in the real exam it counts as not done. The score is 0.
            <br />
            <span style={{ color: GREEN }}>
              The rest of your work was worth <b>{result.would_be} marks</b>. Select the whole
              table and apply All Borders next time.
            </span>
          </div>
        </div>
      )}

      {/* Ek galti, ek jagah. Poori sheet galat nahi thi — bas shuruaat. */}
      {lostToStart && (
        <div style={{ background: "rgba(192,57,43,0.08)", border: `1px solid ${RED}`,
                      borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 13.5, lineHeight: 1.75 }}>
          <b style={{ color: RED }}>The table started in the wrong cell</b>
          <div style={{ color: "var(--muted)", marginTop: 6 }}>
            It should start at <b style={{ color: "var(--text)" }}>{result.start_cell}</b>, but
            yours starts at <b style={{ color: "var(--text)" }}>{result.start_found}</b>.
            In the real exam such a printout is treated as invalid, so the score is 0.
            <br />
            <span style={{ color: GREEN }}>
              The rest of your work was worth <b>{result.would_be} marks</b>. This was the
              only mistake.
            </span>
          </div>
        </div>
      )}

      {/* Dhanche ki galti — khaali row chhodni thi aur chhooti nahi.
          Pehle iski wajah se poora paper doob jata tha aur student ko sau
          galtiyan dikhti thin. Ab aadha number katta hai aur wajah saamne
          likhi hoti hai. */}
      {result.layout_notes?.length > 0 && (
        <div style={{ background: "rgba(255,171,0,0.08)", border: `1px solid ${GOLD}`,
                      borderRadius: 12, padding: 14, marginBottom: 14, fontSize: 13.5, lineHeight: 1.75 }}>
          <b style={{ color: GOLD }}>The table layout was a little different</b>
          <div style={{ color: "var(--muted)", marginTop: 6 }}>
            {result.layout_notes.map((d: any, i: number) => (
              <div key={i}>
                {d.op === "blank_row_missing"
                  ? <>On the paper <b style={{ color: "var(--text)" }}>row {d.ref}</b> is left empty, but you filled it.</>
                  : d.op === "blank_row_extra"
                  ? <>You left <b style={{ color: "var(--text)" }}>row {d.ref}</b> empty, but on the paper it is not empty.</>
                  : d.op === "blank_col_missing"
                  ? <>On the paper <b style={{ color: "var(--text)" }}>column {d.ref}</b> is empty, but you filled it.</>
                  : <>You left <b style={{ color: "var(--text)" }}>column {d.ref}</b> empty, but on the paper it is not empty.</>}
              </div>
            ))}
            <span style={{ color: GREEN }}>
              Everything else was matched in its place. Only <b>{result.layout_penalty} marks</b> were deducted.
            </span>
          </div>
        </div>
      )}

      {/* Upload wali file me kuch aisa mila jo batana zaroori hai */}
      {warnings.length > 0 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)",
                      borderRadius: 12, padding: 13, marginBottom: 14,
                      fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7 }}>
          {warnings.map((w: string, i: number) => <div key={i}>· {w}</div>)}
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                    margin: "0 0 10px" }}>
        <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Marks by instruction</h3>
      </div>

      {(result.questions || []).map((q: any, i: number) => {
        const full = q.got_marks >= q.marks;
        const none = q.got_marks <= 0;
        return (
          <div key={i} style={{ background: "var(--card)", border: "1px solid var(--line)",
                                borderLeft: `3px solid ${full ? GREEN : none ? RED : GOLD}`,
                                borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{i + 1}.</span>
              <span style={{ fontSize: 13, flex: 1, lineHeight: 1.5 }}>
                {/* Tier 2 sirf English — _hi tabhi jab English likhi hi na ho */}
                {q.label_en || q.label_hi}
              </span>
              <span style={{ fontSize: 12.5, fontWeight: 800,
                             color: full ? GREEN : none ? RED : GOLD }}>
                {q.got_marks} / {q.marks}
              </span>
            </div>

            {(q.wrong?.length > 0 || q.format?.length > 0) && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)",
                            fontSize: 12, fontFamily: "Consolas, monospace", lineHeight: 1.8 }}>
                {q.wrong.slice(0, 8).map((d: any) => (
                  <div key={d.ref} style={{ color: "var(--muted)" }}>
                    <b style={{ color: RED }}>{d.ref}</b>{" "}
                    {d.op === "missing" ? "left empty"
                      : d.op === "no_formula" ? <><b>{d.got}</b> typed in by hand — a formula was needed</>
                      : d.op === "caps" ? <>capital and small letters differ — <b>{d.got}</b></>
                      : d.op === "extra" ? <>nothing should be here</>
                      : d.op === "depends" ? (
                        // Formula theek hai, dikkat kisi aur cell me hai. Ye
                        // batana zaroori hai, warna student sahi formula ko
                        // baar-baar badalta rahega.
                        <>the formula is <b style={{ color: GREEN }}>correct</b>, but a cell it
                          depends on is filled wrongly — got <b>{d.got}</b>, expected{" "}
                          <b style={{ color: GREEN }}>{d.want}</b></>
                      ) : (
                        <>
                          {d.typed ? <>you typed <b>{d.typed}</b>, </> : null}
                          got <b>{d.got}</b>, expected <b style={{ color: GREEN }}>{d.want}</b>
                        </>
                      )}
                  </div>
                ))}
                {q.wrong.length > 8 && (
                  <div style={{ color: "var(--muted)" }}>…and {q.wrong.length - 8} more {q.wrong.length - 8 === 1 ? "cell" : "cells"}</div>
                )}
                {q.format.map((d: any) => (
                  <div key={d.ref + d.op} style={{ color: "var(--muted)" }}>
                    <b style={{ color: RED }}>{d.ref}</b>{" "}
                    {d.op === "bold_missing" ? "not made bold"
                      : d.op === "bold_extra" ? "should not be bold"
                      : d.op === "merge_missing" ? "not merged"
                      : d.op === "merge_extra" ? "should not be merged"
                      : d.op === "border_missing" ? `— no border on ${d.count} ${d.count === 1 ? "cell" : "cells"} (−0.5)`
                      : d.op === "align_wrong" ? `aligned ${d.got}, should be ${d.want}`
                      : d.op === "wrap_missing" ? "Wrap Text not applied"
                      : d.op === "fmt_wrong" ? <>shows <b>{d.got}</b>, should show <b style={{ color: GREEN }}>{d.want}</b></>
                      : d.op}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {result.extra_cells?.length > 0 && (
        <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7 }}>
          Your sheet also had cells filled that are not on the paper:{" "}
          <span style={{ fontFamily: "Consolas, monospace" }}>
            {result.extra_cells.slice(0, 10).join(", ")}
          </span>
        </p>
      )}

      {/* Asli exam me kaam khatam karke printout nikalna hota hai aur wahi
          jaancha jata hai. Isliye student apna printout nikaal kar question
          paper ke saath rakh kar khud milaa sake — wahi aadat kaam aati hai. */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12,
                    padding: 13, marginTop: 16, marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 4 }}>Print your answer</div>
        <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 10px", lineHeight: 1.7 }}>
          Compare it with the question paper. In the real exam, your printout is what gets checked.
        </p>
        <button
          onClick={async () => {
            if (!submitted || printing) return;
            setPrinting(true);
            try {
              const r = await fetch(`${API_URL}/tier2/excel/worksheet/answer-pdf`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  user_id: uid, test_id: testId,
                  grid_data: submitted.grid, bold_cells: submitted.bold, merges: submitted.merges,
                  border_cells: submitted.borders || [], align_cells: submitted.align || {},
                  wrap_cells: submitted.wrap || [], num_formats: submitted.num_formats || {},
                }),
              });
              if (!r.ok) throw new Error("PDF failed");
              const blob = await r.blob();
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = `My-answer-${testId}.pdf`;
              a.click();
              URL.revokeObjectURL(a.href);
            } catch { alert("The PDF could not be created. Please try again."); }
            setPrinting(false);
          }}
          disabled={!submitted || printing}
          style={{ ...ghost, width: "100%", borderColor: GOLD, color: GOLD }}
        >
          {printing ? "Preparing…" : "📄 My answer (PDF)"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => window.location.reload()} style={gold}>Try again</button>
        <button onClick={() => router.push("/tier2/excel")} style={ghost}>All tests</button>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <main style={{ maxWidth: 760, margin: "0 auto", padding: "16px 14px 40px" }}>{children}</main>
    </div>
  );
}

const gold: CSSProperties = {
  flex: 1, width: "100%", background: GOLD, color: "#1a1a1a", border: "none",
  borderRadius: 10, padding: "13px 0", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const ghost: CSSProperties = {
  flex: 1, background: "transparent", color: "var(--text)", border: "1px solid var(--line)",
  borderRadius: 10, padding: "13px 0", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
