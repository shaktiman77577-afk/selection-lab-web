"use client";

/**
 * app/nbems-mock/[id]/page.tsx — NBEMS 75-minute full mock chalane wala page.
 *
 * Ek hi ghadi (server ki — refresh se time nahi badhta), paanch tab. Student
 * kisi bhi tab par ja sakta hai, asli CBT jaisa. Paancho hisse hamesha
 * mounted rehte hain (sirf chhupte hain), isliye tab badalne par Word /
 * PowerPoint / Excel ka kaam nahi mitta.
 *
 * Typing ka niyam: 10 minute sirf typing tab khule rehne par chalte hain,
 * pehli key dabane se. 10 minute poore = typing band.
 *
 * Har ~20 second (aur tab badalne par) poora kaam backend me save hota hai —
 * browser band ho ya phone badle, wahin se chalu. Ghadi khatam = auto submit.
 *
 * Word/PPT ki jaanch yahin browser me (lib/nbemsMockTasks.ts), baaki backend me.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { grade, type WordDoc, type PptDoc } from "@/lib/officeTasks";
import { mockTask } from "@/lib/nbemsMockTasks";
import { DEFAULT_SECTIONS, MOCK_DISCLAIMER, SECTION_EMOJI, mmss, type MockSection, type SectionKey } from "@/lib/nbemsMock";
import WordSimTiptap from "@/app/components/WordSimTiptap";
import PptSim from "@/app/components/PptSim";
import PdfViewer from "@/app/components/PdfViewer";
import { SheetEditor, toGridData, type SheetValue } from "@/app/components/SheetEditor";

const GOLD = "#FFAB00";
const GREEN = "#2e8b4a";
const RED = "#c0392b";
const SAVE_EVERY_MS = 20000;
const SHORT: Record<SectionKey, string> = { typing: "Typing", excel: "Excel", word: "Word", ppt: "PowerPoint", mcq: "MCQ" };

type Grade = { rows: { label: string; fix: string; marks: number; ok: boolean }[]; score: number; total: number; touched: boolean };
type StartData = {
  attempt_id: number; remaining: number; resumed: boolean; state: any;
  mock: { id: number; title: string; duration_min: number; total_marks: number; sections: MockSection[] };
  typing: { title: string; passage: string; minutes: number; target_wpm: number; check_line_breaks: boolean };
  excel: null | { test_id: number; title: string; start_cell: string; start_strict: boolean; has_merge: boolean; has_borders: boolean;
                  instructions: { label_en: string; marks: number }[] };
  word_task_id: string; ppt_task_id: string;
  mcq: { id: number; q_no: number; question: string; options: string[] }[];
};

export default function NbemsMockRunner() {
  const params = useParams() as { id?: string };
  const router = useRouter();
  const mockId = Number(params?.id);
  const [sid, setSid] = useState("");
  const uid = (getUser() as any)?.id;

  const [stage, setStage] = useState<"brief" | "starting" | "work" | "submitting" | "error">("brief");
  const [meta, setMeta] = useState<any>(null);        // brief ke liye list se
  const [error, setError] = useState("");
  const [data, setData] = useState<StartData | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [tab, setTab] = useState<SectionKey>("typing");
  const [confirm, setConfirm] = useState(false);
  const [saveNote, setSaveNote] = useState("");

  // ── Hisson ka kaam ──
  const [typed, setTyped] = useState("");
  const keysRef = useRef(0);
  const bsRef = useRef(0);
  const [typingSecs, setTypingSecs] = useState(0);
  const [typingStarted, setTypingStarted] = useState(false);
  const [sheet, setSheet] = useState<SheetValue>({ cells: {}, bold: [], merges: [] });
  const [computed, setComputed] = useState<Record<string, string>>({});
  const [showPaper, setShowPaper] = useState(false);
  const wordDoc = useRef<WordDoc | null>(null);
  const pptDoc = useRef<PptDoc | null>(null);
  // Pehli onChange (editor banne par) = shuruaati haalat. Usse alag hua to
  // "touched". Ref me — TipTap apna pehla onChange callback pakde rehta hai,
  // isliye state yahan purani dikh sakti hai.
  const wordBase = useRef<string | null>(null);
  const pptBase = useRef<string | null>(null);
  const wordTouched = useRef(false);
  const pptTouched = useRef(false);
  const autoTried = useRef(false);
  const [wordGrade, setWordGrade] = useState<Grade | null>(null);
  const [pptGrade, setPptGrade] = useState<Grade | null>(null);
  const [mcq, setMcq] = useState<Record<string, string>>({});
  const [times, setTimes] = useState<Record<string, number>>({});

  const dirty = useRef(false);
  const dataRef = useRef<StartData | null>(null);
  const finished = useRef(false);

  const sections = data?.mock.sections?.length ? data.mock.sections : (meta?.sections || DEFAULT_SECTIONS);
  const secOf = (k: SectionKey) => sections.find((s: MockSection) => s.key === k) || DEFAULT_SECTIONS.find((s) => s.key === k)!;
  const typingLimit = (data?.typing.minutes || 10) * 60;
  const typingLocked = typingSecs >= typingLimit || remaining <= 0;

  const wordTask = useMemo(() => mockTask(data?.word_task_id), [data?.word_task_id]);
  const pptTask = useMemo(() => mockTask(data?.ppt_task_id), [data?.ppt_task_id]);
  // Simulator sirf pehli baar start padhta hai — resume par saved kaam, warna task ka
  const wordStart = useMemo(() => (data ? (data.state?.word_doc as WordDoc) || (wordTask?.start ? wordTask.start() : undefined) : undefined), [data, wordTask]);
  const pptStart = useMemo(() => (data ? (data.state?.ppt_doc as PptDoc) || (pptTask?.start ? pptTask.start() : { slides: [], deletedTitles: [], fileName: "" }) : undefined), [data, pptTask]);

  // ── Brief ke liye mock ki jaankari (chal raha attempt bhi) ──
  useEffect(() => {
    if (!getUser()) { router.replace("/login"); return; }
    const s = new URLSearchParams(window.location.search).get("s") || "";
    setSid(s);
    if (!s) return;
    fetch(`${API_URL}/nbems-mock/mocks?series_id=${encodeURIComponent(s)}&user_id=${uid}`)
      .then((r) => r.json())
      .then((d) => setMeta((d.mocks || []).find((m: any) => m.id === mockId) || null))
      .catch(() => {});
  }, [mockId, uid, router]);

  // ── Save ke liye poora kaam ek object me ──
  const latest = useRef<() => any>(() => ({}));
  latest.current = () => ({
    typing: { text: typed, keystrokes: Math.max(keysRef.current, typed.length), backspaces: bsRef.current, seconds: typingSecs },
    excel: { sheet, grid_data: toGridData(sheet.cells), bold: sheet.bold, merges: sheet.merges, borders: sheet.borders || [],
             align: sheet.align || {}, wrap: sheet.wrap || [], num_formats: sheet.fmt || {} },
    word_doc: wordDoc.current, word_grade: wordGrade,
    ppt_doc: pptDoc.current, ppt_grade: pptGrade,
    mcq, times, tab,
  });

  const goResult = useCallback((attemptId: number) => {
    finished.current = true;
    router.replace(`/nbems-mock/result/${attemptId}${sid ? `?s=${encodeURIComponent(sid)}` : ""}`);
  }, [router, sid]);

  const save = useCallback(async (keepalive = false) => {
    if (!data || finished.current) return;
    dirty.current = false;
    try {
      const r = await fetch(`${API_URL}/nbems-mock/save`, {
        method: "POST", headers: { "Content-Type": "application/json" }, keepalive,
        body: JSON.stringify({ user_id: uid, attempt_id: data.attempt_id, state: latest.current() }),
      });
      const d = await r.json();
      if (d?.submitted) { goResult(data.attempt_id); return; }
      if (typeof d?.remaining === "number") setRemaining(d.remaining);   // server ki ghadi se milao
      setSaveNote(`Saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    } catch {
      dirty.current = true;
      setSaveNote("Not saved — check your internet");
    }
  }, [data, uid, goResult]);

  const submit = useCallback(async () => {
    if (!data || finished.current) return;
    setConfirm(false);
    setStage("submitting");
    for (let tryNo = 0; tryNo < 3; tryNo++) {
      try {
        const r = await fetch(`${API_URL}/nbems-mock/submit`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: uid, attempt_id: data.attempt_id, state: latest.current() }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not submit");
        goResult(data.attempt_id);
        return;
      } catch (e: any) {
        if (tryNo === 2) { setError((e?.message || "Could not submit") + ". Your work is saved — press Submit again."); setStage("work"); }
        await new Promise((res) => setTimeout(res, 1500));
      }
    }
  }, [data, uid, goResult]);

  // ── Shuru / resume ──
  async function start() {
    setStage("starting"); setError("");
    try {
      const r = await fetch(`${API_URL}/nbems-mock/start`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, mock_id: mockId }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Could not start the mock");
      const st = d.state || {};
      setTyped(st.typing?.text || "");
      keysRef.current = Number(st.typing?.keystrokes || 0);
      bsRef.current = Number(st.typing?.backspaces || 0);
      setTypingSecs(Number(st.typing?.seconds || 0));
      setTypingStarted(!!st.typing?.text);
      if (st.excel?.sheet) setSheet(st.excel.sheet);
      wordDoc.current = st.word_doc || null; pptDoc.current = st.ppt_doc || null;
      if (st.word_grade) setWordGrade(st.word_grade);
      if (st.ppt_grade) setPptGrade(st.ppt_grade);
      wordTouched.current = !!st.word_grade?.touched;
      pptTouched.current = !!st.ppt_grade?.touched;
      setMcq(st.mcq || {});
      setTimes(st.times || {});
      if (st.tab) setTab(st.tab);
      setRemaining(d.remaining);
      dataRef.current = d;
      setData(d);
      setStage("work");
      window.scrollTo({ top: 0 });
    } catch (e: any) {
      setError(e.message || "Could not start the mock");
      setStage("brief");
    }
  }

  // ── Ghadi: har second ──
  const tabRef = useRef(tab); tabRef.current = tab;
  const typStartRef = useRef(typingStarted); typStartRef.current = typingStarted;
  useEffect(() => {
    if (stage !== "work") return;
    const t = setInterval(() => {
      setRemaining((s) => s - 1);
      const k = tabRef.current;
      setTimes((x) => ({ ...x, [k]: (x[k] || 0) + 1 }));
      if (k === "typing" && typStartRef.current) setTypingSecs((s) => Math.min(typingLimit, s + 1));
    }, 1000);
    return () => clearInterval(t);
  }, [stage, typingLimit]);

  useEffect(() => {
    // Sirf ek baar apne aap — fail ho to student khud Submit dabaye (kaam save hai)
    if (stage === "work" && data && remaining <= 0 && !finished.current && !autoTried.current) {
      autoTried.current = true;
      submit();
    }
  }, [remaining, stage, data, submit]);

  // ── Autosave ──
  useEffect(() => {
    if (stage !== "work") return;
    const t = setInterval(() => { if (dirty.current) save(); }, SAVE_EVERY_MS);
    const hide = () => { if (document.visibilityState === "hidden" && dirty.current) save(true); };
    const leave = (e: BeforeUnloadEvent) => { if (!finished.current) { e.preventDefault(); e.returnValue = ""; } };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("beforeunload", leave);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", hide); window.removeEventListener("beforeunload", leave); };
  }, [stage, save]);

  function switchTab(k: SectionKey) {
    if (k === tab) return;
    setTab(k);
    if (dirty.current) save();
    window.scrollTo({ top: 0 });
  }

  // ── Excel: formula ka jawab (worksheet test wala hi calculator) ──
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
      }).then((r) => r.json()).then((d) => { if (my === seq.current) setComputed(d?.cells || {}); }).catch(() => {});
    }, 150);
    return () => clearTimeout(t);
  }, [sheet.cells, stage]);

  // ── Word / PPT: har badlaav par jaanch (sirf model par — tez hai) ──
  function onWord(d: WordDoc) {
    wordDoc.current = d;
    const js = JSON.stringify(d);
    if (wordBase.current === null) { wordBase.current = js; if (!wordTouched.current) return; }
    if (js !== wordBase.current) wordTouched.current = true;
    const t = mockTask(dataRef.current?.word_task_id);
    if (t) setWordGrade({ ...grade(t, d), touched: wordTouched.current });
    dirty.current = true;
  }
  function onPpt(d: PptDoc) {
    pptDoc.current = d;
    const js = JSON.stringify(d);
    if (pptBase.current === null) { pptBase.current = js; if (!pptTouched.current) return; }
    if (js !== pptBase.current) pptTouched.current = true;
    const t = mockTask(dataRef.current?.ppt_task_id);
    if (t) setPptGrade({ ...grade(t, d), touched: pptTouched.current });
    dirty.current = true;
  }

  const attempted: Record<SectionKey, boolean> = {
    typing: typed.trim().length > 0,
    excel: Object.values(sheet.cells).some((v) => (v || "").trim()),
    word: !!wordGrade?.touched,
    ppt: !!pptGrade?.touched,
    mcq: Object.keys(mcq).length > 0,
  };

  // ════════════════ BRIEF ════════════════
  if (stage === "brief" || stage === "starting") {
    const run = meta?.in_progress;
    return (
      <Shell>
        <button onClick={() => router.push(sid ? `/nbems-mock?s=${encodeURIComponent(sid)}` : "/tier2")} aria-label="Back"
          style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text)", padding: 0, marginBottom: 8 }}>←</button>
        <h1 style={{ fontSize: 20, fontWeight: 900, margin: "0 0 4px" }}>{meta?.title || "NBEMS full mock"}</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 14px" }}>
          {meta?.duration_min || 75} minutes · {meta?.total_marks || 100} marks · five parts on one clock
        </p>

        <div style={{ border: "1px solid var(--line)", borderRadius: 12, overflow: "hidden", marginBottom: 14 }}>
          {sections.map((s: MockSection, i: number) => (
            <div key={s.key} style={{ display: "flex", gap: 10, padding: "9px 12px", fontSize: 13.5, borderTop: i ? "1px solid var(--line)" : "none", background: "var(--card)" }}>
              <span>{SECTION_EMOJI[s.key]}</span><span style={{ flex: 1 }}>{s.name}</span>
              <span style={{ color: "var(--muted)" }}>{s.minutes} min</span><b style={{ width: 70, textAlign: "right" }}>{s.marks} marks</b>
            </div>
          ))}
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 14, fontSize: 13.5, lineHeight: 1.75, marginBottom: 14 }}>
          <b>How this mock works</b>
          <ol style={{ margin: "6px 0 0", paddingLeft: 20, color: "var(--muted)" }}>
            <li>One clock of <b style={{ color: "var(--text)" }}>{meta?.duration_min || 75} minutes</b> runs for the whole test. The times above are only a guide.</li>
            <li>Use the tabs at the top to move between the five parts at any time, as in the real CBT. Your work in each part stays.</li>
            <li><b style={{ color: "var(--text)" }}>Typing:</b> you get {secOf("typing").minutes} typing minutes. They run only while the Typing tab is open, starting from your first key. When they are used up, typing closes.</li>
            <li><b style={{ color: "var(--text)" }}>Word and PowerPoint:</b> finish with <b style={{ color: "var(--text)" }}>Save As</b> and the exact file name asked for. It carries marks.</li>
            <li>Your work is saved every few seconds. If the page closes, open this mock again and press Resume. The clock does not stop.</li>
            <li>When the clock reaches zero, the test is submitted on its own.</li>
          </ol>
        </div>

        <p role="note" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.65, background: "var(--chip)", borderRadius: 10, padding: "9px 11px", marginBottom: 14 }}>
          <b style={{ color: "var(--text)" }}>Practice only.</b> {MOCK_DISCLAIMER} The Word, PowerPoint and Excel editors here work like the real
          software but are not the same, so also practise on a real computer if you can.
        </p>

        {error && <p style={{ color: RED, fontSize: 13.5 }}>{error}</p>}
        <button onClick={start} disabled={stage === "starting"} style={goldBtn}>
          {stage === "starting" ? "Opening…" : run ? `Resume — ${mmss(run.remaining)} left` : "Start — the 75-minute clock begins"}
        </button>
      </Shell>
    );
  }

  if (stage === "error" || !data) return <Shell><p style={{ color: RED }}>{error || "Something went wrong."}</p></Shell>;

  // ════════════════ WORK ════════════════
  const cur = secOf(tab);
  const low = remaining <= 300;
  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 10px 60px", color: "var(--text)" }}>
      {/* ── Upar ki patti: ghadi + submit ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 30, background: "var(--bg)", paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card)", border: `1px solid ${low ? RED : "var(--line)"}`,
                      borderRadius: 12, padding: "8px 12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{data.mock.title}</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>{saveNote || "Your work is saved automatically"}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>Time left</div>
            <div style={{ fontSize: 20, fontWeight: 900, fontVariantNumeric: "tabular-nums", color: low ? RED : "var(--text)" }}>{mmss(remaining)}</div>
          </div>
          <button onClick={() => setConfirm(true)} disabled={stage === "submitting"}
            style={{ background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "10px 14px", fontWeight: 800, cursor: "pointer", flexShrink: 0 }}>
            {stage === "submitting" ? "Submitting…" : "Submit"}
          </button>
        </div>

        {/* ── Tabs ── */}
        <div role="tablist" style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 0" }}>
          {sections.map((s: MockSection) => {
            const on = s.key === tab;
            return (
              <button key={s.key} role="tab" aria-selected={on} onClick={() => switchTab(s.key)}
                style={{ flexShrink: 0, padding: "7px 11px", borderRadius: 10, cursor: "pointer", textAlign: "left",
                         border: `1.5px solid ${on ? GOLD : "var(--line)"}`, background: on ? "rgba(255,171,0,0.12)" : "var(--card)", color: "var(--text)" }}>
                <div style={{ fontSize: 13, fontWeight: 800 }}>
                  {SECTION_EMOJI[s.key]} {SHORT[s.key]}{" "}
                  <span style={{ display: "inline-block", width: 7, height: 7, borderRadius: 7, marginLeft: 3, verticalAlign: "middle",
                                 background: attempted[s.key] ? GREEN : "var(--line)" }} aria-label={attempted[s.key] ? "attempted" : "not attempted"} />
                </div>
                <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
                  {s.marks} marks · {s.key === "typing" ? `${mmss(typingLimit - typingSecs)} left` : `${s.minutes} min`}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ fontSize: 12, color: "var(--muted)", margin: "2px 2px 10px" }}>
        {cur.name} · suggested {cur.minutes} min · {cur.marks} marks · time spent here {mmss(times[tab] || 0)}
      </div>
      {error && <p style={{ color: RED, fontSize: 13 }}>{error}</p>}

      {/* ════ TYPING ════ */}
      <div style={{ display: tab === "typing" ? "block" : "none" }}>
        <Card>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <b style={{ flex: 1, fontSize: 14 }}>{data.typing.title}</b>
            <span style={{ fontSize: 13, fontWeight: 800, fontVariantNumeric: "tabular-nums", color: typingLocked ? RED : "var(--text)" }}>
              Typing time {mmss(typingLimit - typingSecs)}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 8 }}>
            Type the letter below exactly, with the same capital letters and punctuation.
            {data.typing.check_line_breaks ? " Press Enter wherever the letter starts a new line — line breaks are checked." : ""}{" "}
            Your {data.typing.minutes} minutes run only while this tab is open, from your first key. Aim for {data.typing.target_wpm} words per minute or more.
          </div>
          <div onCopy={(e) => e.preventDefault()}
            style={{ background: "#fff", color: "#111", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px",
                     maxHeight: 260, overflowY: "auto", whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.65,
                     fontFamily: "Consolas, 'Courier New', monospace", WebkitUserSelect: "none", userSelect: "none" }}>
            {data.typing.passage}
          </div>
        </Card>
        <textarea
          value={typed}
          disabled={typingLocked}
          placeholder={typingLocked ? "Typing time is over." : "Start typing here. The typing clock starts with your first key."}
          onChange={(e) => {
            if (typingLocked) return;
            if (!typingStarted && e.target.value.length > 0) setTypingStarted(true);
            setTyped(e.target.value); dirty.current = true;
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" || e.key === "Delete") bsRef.current += 1;
            else if (e.key.length === 1 || e.key === "Enter") keysRef.current += 1;
          }}
          onPaste={(e) => e.preventDefault()} onDrop={(e) => e.preventDefault()}
          spellCheck={false} autoCorrect="off" autoCapitalize="off" autoComplete="off"
          style={{ width: "100%", minHeight: 260, marginTop: 10, borderRadius: 10, border: "1px solid var(--line)", padding: 12, boxSizing: "border-box",
                   background: typingLocked ? "var(--chip)" : "#fff", color: "#111", fontSize: 15, lineHeight: 1.6,
                   fontFamily: "Consolas, 'Courier New', monospace", resize: "vertical" }} />
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
          {typed.trim() ? typed.trim().split(/\s+/).length : 0} words · {Math.max(keysRef.current, typed.length).toLocaleString("en-IN")} keystrokes
          {typingLocked && typed.trim() ? " · typing closed — it will be checked when you submit" : ""}
        </div>
      </div>

      {/* ════ EXCEL ════ */}
      <div style={{ display: tab === "excel" ? "block" : "none" }}>
        {!data.excel ? (
          <Card><p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5 }}>This mock has no Excel sheet yet. Move on to the other parts.</p></Card>
        ) : (
          <>
            <Card>
              <b style={{ fontSize: 14 }}>{data.excel.title}</b>
              <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7, margin: "6px 0 8px" }}>
                Build the sheet shown in the question paper. Start the table at <b style={{ color: "var(--text)" }}>{data.excel.start_cell}</b>.
                Make bold what is bold on the paper{data.excel.has_merge ? " and merge the title cells" : ""}.
                {data.excel.has_borders ? " Apply All Borders to the whole table." : ""} Fill the empty columns with a <b style={{ color: "var(--text)" }}>formula</b> —
                answers typed by hand get no marks.
              </div>
              {data.excel.instructions.length > 0 && (
                <ol style={{ margin: "0 0 10px", paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
                  {data.excel.instructions.map((q, i) => <li key={i}>{q.label_en} <span style={{ color: "var(--muted)" }}>({q.marks})</span></li>)}
                </ol>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button onClick={() => setShowPaper(!showPaper)} style={ghostBtn}>{showPaper ? "Hide question paper" : "📄 Show question paper"}</button>
                <a href={`${API_URL}/nbems-mock/excel-pdf/${data.attempt_id}?user_id=${uid}`} target="_blank" rel="noopener noreferrer"
                   style={{ ...ghostBtn, textDecoration: "none", display: "inline-block" }}>Open in new tab</a>
              </div>
              {showPaper && (
                <div style={{ marginTop: 10 }}>
                  <PdfViewer url={`${API_URL}/nbems-mock/excel-pdf/${data.attempt_id}?user_id=${uid}`} fileName="Excel-question-paper.pdf" />
                </div>
              )}
            </Card>
            <SheetEditor rows={18} cols={10} value={sheet} onChange={(v) => { setSheet(v); dirty.current = true; }} computed={computed} />
          </>
        )}
      </div>

      {/* ════ WORD ════ */}
      <div style={{ display: tab === "word" ? "block" : "none" }}>
        {!wordTask ? (
          <Card><p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5 }}>This mock has no Word task.</p></Card>
        ) : (
          <>
            <TaskBox title={wordTask.title} intro={wordTask.intro} steps={wordTask.steps} />
            <WordSimTiptap start={wordStart as WordDoc | undefined} onChange={onWord} />
          </>
        )}
      </div>

      {/* ════ POWERPOINT ════ */}
      <div style={{ display: tab === "ppt" ? "block" : "none" }}>
        {!pptTask ? (
          <Card><p style={{ margin: 0, color: "var(--muted)", fontSize: 13.5 }}>This mock has no PowerPoint task.</p></Card>
        ) : (
          <>
            <TaskBox title={pptTask.title} intro={pptTask.intro} steps={pptTask.steps} />
            <PptSim start={pptStart as PptDoc} onChange={onPpt} />
          </>
        )}
      </div>

      {/* ════ MCQ ════ */}
      <div style={{ display: tab === "mcq" ? "block" : "none" }}>
        <Card>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 8 }}>
            {Object.keys(mcq).length} of {data.mcq.length} answered · 1 mark each · no negative marking
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {data.mcq.map((q, i) => (
              <a key={q.id} href={`#q-${q.id}`}
                style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 800,
                         textDecoration: "none", color: mcq[String(q.id)] ? "#fff" : "var(--text)",
                         background: mcq[String(q.id)] ? GREEN : "var(--chip)" }}>{i + 1}</a>
            ))}
          </div>
        </Card>
        {data.mcq.map((q, i) => {
          const mine = mcq[String(q.id)];
          return (
            <div key={q.id} id={`q-${q.id}`} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 10, scrollMarginTop: 150 }}>
              <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.55, marginBottom: 8 }}>{i + 1}. {q.question}</div>
              {q.options.map((o, j) => {
                const L = "ABCD"[j];
                const on = mine === L;
                return (
                  <button key={L} type="button" onClick={() => { setMcq((m) => ({ ...m, [String(q.id)]: L })); dirty.current = true; }}
                    style={{ display: "flex", gap: 10, width: "100%", textAlign: "left", marginBottom: 6, padding: "9px 11px", borderRadius: 10, cursor: "pointer",
                             border: `1.5px solid ${on ? GOLD : "var(--line)"}`, background: on ? "rgba(255,171,0,0.12)" : "transparent", color: "var(--text)", fontSize: 13.5 }}>
                    <b style={{ width: 18 }}>{L}</b><span style={{ flex: 1 }}>{o}</span>
                  </button>
                );
              })}
              {mine && (
                <button type="button" onClick={() => { setMcq((m) => { const n = { ...m }; delete n[String(q.id)]; return n; }); dirty.current = true; }}
                  style={{ background: "transparent", border: "none", color: "var(--muted)", fontSize: 12, cursor: "pointer", padding: 0 }}>Clear answer</button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Submit se pehle ── */}
      {confirm && (
        <div role="dialog" aria-modal="true" onClick={() => setConfirm(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "var(--card)", color: "var(--text)", borderRadius: 14, padding: 18, width: "100%", maxWidth: 420 }}>
            <div style={{ fontSize: 17, fontWeight: 900, marginBottom: 4 }}>Submit the mock?</div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginBottom: 10 }}>{mmss(remaining)} is still left. After submitting you cannot change anything.</div>
            {sections.map((s: MockSection) => (
              <div key={s.key} style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
                <span>{SECTION_EMOJI[s.key]} {SHORT[s.key]}</span>
                <b style={{ color: s.key === "mcq" && attempted.mcq && Object.keys(mcq).length < data.mcq.length ? GOLD : attempted[s.key] ? GREEN : RED }}>
                  {s.key === "mcq" ? `${Object.keys(mcq).length}/${data.mcq.length} answered` : attempted[s.key] ? "Attempted" : "Not attempted"}
                </b>
              </div>
            ))}
            {((wordGrade?.touched && !wordDoc.current?.fileName) || (pptGrade?.touched && !pptDoc.current?.fileName)) && (
              <p style={{ fontSize: 12.5, color: RED, margin: "8px 0 0" }}>
                {wordGrade?.touched && !wordDoc.current?.fileName ? "Your Word file is not saved yet. " : ""}
                {pptGrade?.touched && !pptDoc.current?.fileName ? "Your PowerPoint file is not saved yet. " : ""}
                Saving with the right name carries marks.
              </p>
            )}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button onClick={() => setConfirm(false)} style={{ ...ghostBtn, flex: 1 }}>Keep working</button>
              <button onClick={submit} style={{ ...goldBtn, flex: 1, marginTop: 0 }}>Submit now</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 760, margin: "0 auto", padding: "14px 14px 40px", color: "var(--text)" }}>{children}</div>;
}
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 10 }}>{children}</div>;
}
function TaskBox({ title, intro, steps }: { title: string; intro: string; steps: string[] }) {
  return (
    <Card>
      <b style={{ fontSize: 14 }}>{title}</b>
      <div style={{ fontSize: 13, margin: "6px 0" }}>{intro}</div>
      <ol style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.7 }}>
        {steps.map((s, i) => <li key={i}>{s}</li>)}
      </ol>
    </Card>
  );
}

const goldBtn: React.CSSProperties = {
  width: "100%", marginTop: 4, padding: 13, borderRadius: 10, border: "none", cursor: "pointer",
  background: GOLD, color: "#1a1a1a", fontWeight: 800, fontSize: 15,
};
const ghostBtn: React.CSSProperties = {
  padding: "9px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "transparent",
  color: "var(--text)", fontWeight: 700, fontSize: 13, cursor: "pointer",
};
