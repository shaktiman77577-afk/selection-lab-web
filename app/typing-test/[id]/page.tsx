"use client";

/**
 * app/typing-test/[id]/page.tsx — asli exam jaisa typing test.
 *
 * Teen screen ek hi page me:
 *   1. select  — "aapne kaunsa passage print kiya hai?"  (asli exam ka step)
 *   2. typing  — khali response box, live stats strip, timer, backspace band
 *   3. result  — WPM, accuracy, full/half/grey mistake highlighting,
 *                "How is this calculated?", Practice Mistakes, Next Passage,
 *                Share Score, Feedback
 *
 * Passage screen par NAHI dikhta (practice mode ke option ke alawa) — backend
 * bhi test passages ka text bhejta hi nahi, isliye network tab se bhi nahi
 * padha ja sakta. Isi wajah se live error-count sirf tabhi dikhta hai jab
 * passage pehle se screen par ho (practice / 'screen' mode) — paper-mode
 * asli test me galtiyan submit tak chhupi rehti hain, jaanbujh kar.
 *
 * Keystrokes ab live-tracked hain (onKeyDown se) — final text ki lambai se
 * nahi, taaki backspace se sudhare gaye characters bhi asli NCERT "key
 * depression" ke matlab me ginte hain. Backspace khud alag se track hota hai.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import Disclaimer from "@/app/components/Disclaimer";

const GOLD = "#FFAB00";
const RED = "#c0392b";
const BLUE = "#2563a8";
const GREY = "#8a8f99";
const GREEN = "#1c7a3e";

type Stage = "select" | "typing" | "result";

export default function TypingTestPage() {
  const params = useParams();
  const router = useRouter();
  const passageId = Number(params.id);

  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [stage, setStage] = useState<Stage>("select");
  const [picked, setPicked] = useState<number | null>(null);
  const [wrongPick, setWrongPick] = useState<any>(null);

  const [text, setText] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [showPassage, setShowPassage] = useState(false);
  const [hint, setHint] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [started, setStarted] = useState(false);
  // Hindi me student kaunsa font use kar raha hai. Mangal, InScript, Google
  // Indic aur Gboard — sab 'unicode'. KrutiDev alag hai, use badalna padta hai.
  const [script, setScript] = useState<"unicode" | "krutidev">("unicode");
  // /tier2 ke naye language-selector se ?script= aa gaya to dobara nahi poochte
  const [scriptPreset, setScriptPreset] = useState(false);
  const [result, setResult] = useState<any>(null);

  // ── Typing screen ke naye control ──
  const [fontSize, setFontSize] = useState(16);
  const [liveTick, setLiveTick] = useState(0);   // stats strip ko har ~300ms refresh karta hai

  // ── Result screen ke naye panels ──
  const [showPractice, setShowPractice] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");

  const startedAt = useRef<number>(0);
  const boxRef = useRef<HTMLTextAreaElement | null>(null);
  const textRef = useRef("");
  textRef.current = text;

  // Asli keystrokes — har character-producing key + space = 1, live ginta hai.
  // Backspace alag se, aur ye number me NAHI judta (NCERT "key depression"
  // sirf alphanumeric + space ko ginta hai — backspace uska hissa nahi).
  const keystrokeRef = useRef(0);
  const backspaceRef = useRef(0);

  // ── Load ──
  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/login"); return; }

    // Language selector se agar Hindi font pehle hi tay ho chuka hai
    if (typeof window !== "undefined") {
      const qp = new URLSearchParams(window.location.search).get("script");
      if (qp === "unicode" || qp === "krutidev") {
        setScript(qp);
        setScriptPreset(true);
      }
    }

    fetch(`${API_URL}/tier2/typing/passage/${passageId}?user_id=${(u as any).id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not open this test");
        setMeta(d);
        setTimeLeft((d.duration_min || 10) * 60);
        // Screen wale exam (NCERT) me kagaz hai hi nahi, isliye "kaunsa number
        // chhapa hai" poochhne ka koi matlab nahi. Seedha typing par jaate hain.
        if (d.passage_mode === "screen") {
          setPicked(d.test_number ?? 1);
          setStage("typing");
          setShowPassage(true);
          setTimeout(() => boxRef.current?.focus(), 80);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [passageId, router]);

  // ── Submit ──
  const submit = useCallback(async (auto = false) => {
    if (submitting || result) return;
    setSubmitting(true);
    const u = getUser();
    try {
      const res = await fetch(`${API_URL}/tier2/typing/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: (u as any)?.id,
          passage_id: passageId,
          selected_test_number: picked,
          typed_text: textRef.current,
          script,
          seconds_taken: startedAt.current
            ? Math.round((Date.now() - startedAt.current) / 1000)
            : (meta?.duration_min || 10) * 60,
          total_keystrokes: keystrokeRef.current,
          backspace_count: backspaceRef.current,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Could not submit");
      if (d.wrong_selection) {
        setWrongPick(d);
        setStage("select");
      } else {
        setResult({ ...d, auto });
        setStage("result");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setSubmitting(false);
  }, [submitting, result, passageId, picked, meta, script]);

  // ── Timer ──
  // Ghadi pehle akshar par chalti hai, screen khulte hi nahi. Kagaz sambhalne
  // aur baithne me jo waqt lagta hai wo student ka nahi katna chahiye.
  useEffect(() => {
    if (stage !== "typing" || !started) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); submit(true); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [stage, started, submit]);

  // ── Live stats strip refresh ──
  // Har keystroke par re-render karna phone par slow ho sakta hai, isliye
  // keystrokeRef/backspaceRef ko sirf har ~300ms me screen par utaarte hain.
  useEffect(() => {
    if (stage !== "typing") return;
    const t = setInterval(() => setLiveTick((n) => n + 1), 300);
    return () => clearInterval(t);
  }, [stage]);

  // ── Number select ──
  function choose(n: number) {
    setPicked(n);
    setWrongPick(null);
    keystrokeRef.current = 0;
    backspaceRef.current = 0;
    // Galat number ka faisla backend karega (test number client ko bheja hi
    // nahi jata) — isliye seedha typing screen par bhej dete hain, bilkul
    // asli exam ki tarah: galti submit par hi pata chalti hai.
    setStage("typing");
    setStarted(false);
    startedAt.current = 0;      // pehle akshar par set hoga
    setTimeout(() => boxRef.current?.focus(), 60);
  }

  // ── Editing poori khuli hai ──
  // Backspace, Delete, arrow keys, cursor, undo — sab chalta hai, jaise asli
  // exam me. NCERT ka notification saaf kehta hai "Backspace fully enabled",
  // aur P&H me bhi yahi hota hai.
  //
  // Sirf copy/paste band hai — notification me likha hai ki wo pakda jaane
  // par disqualification hai. Isliye rokte bhi hain aur bata bhi dete hain.
  function blockPaste() {
    setHint("Copy and paste are not allowed — in the real exam this disqualifies you");
    setTimeout(() => setHint(""), 2200);
  }

  function onPaste(e: React.ClipboardEvent) {
    e.preventDefault();
    blockPaste();
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value;
    // Pehla akshar — yahin se ghadi chalti hai
    if (!started && v.length > 0) {
      setStarted(true);
      startedAt.current = Date.now();
    }
    setText(v);
  }

  // Asli keystrokes — har printable key (letter/number/symbol/space) = 1.
  // Backspace/Delete alag counter me, is number me nahi judta.
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Backspace" || e.key === "Delete") {
      backspaceRef.current += 1;
    } else if (e.key.length === 1) {
      keystrokeRef.current += 1;
    }
    // Arrow keys, Tab, Enter, Ctrl/Alt/Shift, Home/End waghera — kuch nahi
  }

  // Screen/practice mode me passage pehle se dikh raha hota hai, isliye live
  // error-count client-side hi nikal sakte hain — passage kabhi backend se
  // paper-mode me bheja hi nahi jata (security), isliye wahan ye hamesha
  // null rehta hai aur strip me dikhta hi nahi.
  function liveErrorCount(): number | null {
    if (!meta) return null;
    const passageVisible = showPassage || meta.passage_mode === "screen";
    if (!passageVisible || !meta.passage_text) return null;
    const expWords = meta.passage_text.trim().split(/\s+/);
    const typWords = text.trim() ? text.trim().split(/\s+/) : [];
    let errs = 0;
    // Aakhri shabd chhod dete hain — abhi type ho hi raha ho sakta hai
    for (let i = 0; i < typWords.length - 1; i++) {
      if (expWords[i] !== typWords[i]) errs++;
    }
    return errs;
  }

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const low = timeLeft <= 60;

  if (loading) return <Shell><p style={{ color: "var(--muted)" }}>Loading…</p></Shell>;
  if (error && !meta) return <Shell><p style={{ color: RED }}>{error}</p></Shell>;

  // ═══════════════════ SELECT ═══════════════════
  if (stage === "select") {
    return (
      <Shell>
        <div style={{ maxWidth: 520, margin: "0 auto", textAlign: "center", paddingTop: 20 }}>
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 6px" }}>{meta.title}</h1>
          <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.65, margin: "0 0 20px" }}>
            Select the <b>Test Number</b> printed at the top of the passage in front of you.
            This is exactly what the real exam asks for, and picking the wrong number makes the
            whole test count as wrong.
          </p>

          {wrongPick && (
            <div style={{ background: "rgba(192,57,43,0.1)", border: `1px solid ${RED}`, borderRadius: 12, padding: 14, marginBottom: 18, textAlign: "left" }}>
              <div style={{ fontWeight: 800, color: RED, fontSize: 14, marginBottom: 4 }}>Wrong test number</div>
              <div style={{ fontSize: 13.5, lineHeight: 1.6 }}>{wrongPick.message}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8 }}>
                In the real exam this mistake wipes out the whole attempt. Fix it here: try
                again with the correct number.
              </div>
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {(meta.all_test_numbers || []).map((n: number) => (
              <button
                key={n}
                onClick={() => choose(n)}
                style={{
                  width: 62, height: 62, borderRadius: 14, cursor: "pointer",
                  background: picked === n ? GOLD : "var(--card)",
                  color: picked === n ? "#1a1a1a" : "var(--text)",
                  border: "1px solid var(--line)", fontSize: 20, fontWeight: 900,
                }}
              >
                {n}
              </button>
            ))}
          </div>

          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 20, lineHeight: 1.6 }}>
            {meta.duration_min || 10} minutes · target {meta.target_wpm || 30} WPM ·
            accuracy {meta.min_accuracy || 90}%
            {meta.min_keystrokes > 0 && <> · minimum {meta.min_keystrokes.toLocaleString("en-IN")} keystrokes</>}
            <br />
            Backspace and cursor keys work normally. Copy and paste are blocked — in the real
            exam they disqualify you.
            <br />
            <b style={{ color: "var(--text)" }}>The timer starts when you type the first letter</b>, not
            when the screen opens. Keep the printed passage in front of you first.
          </p>

          {meta.language === "hindi" && (
            scriptPreset ? (
              <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "10px 14px", marginTop: 18, textAlign: "left", fontSize: 12.5, color: "var(--muted)" }}>
                Typing in <b style={{ color: "var(--text)" }}>{script === "krutidev" ? "KrutiDev" : "Unicode"}</b> — chosen
                already. <button onClick={() => setScriptPreset(false)} style={{ background: "transparent", border: "none", color: GOLD, fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 12.5 }}>Change</button>
              </div>
            ) : (
              <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginTop: 18, textAlign: "left" }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 4 }}>Which Hindi font will you type in?</div>
                <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginBottom: 10 }}>
                  The exam lets you choose, so pick the one you actually practise with.
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {([
                    ["unicode", "Unicode", "Mangal, InScript, Google Indic, Gboard"],
                    ["krutidev", "KrutiDev", "Also DevLys and Remington"],
                  ] as const).map(([k, label, sub]) => (
                    <button
                      key={k}
                      onClick={() => setScript(k)}
                      style={{
                        flex: "1 1 45%", minWidth: 140, textAlign: "left", cursor: "pointer",
                        borderRadius: 10, padding: "10px 12px",
                        border: `1px solid ${script === k ? GOLD : "var(--line)"}`,
                        background: script === k ? "rgba(255,171,0,0.12)" : "transparent",
                        color: "var(--text)",
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800 }}>{label}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>{sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            )
          )}

          <Disclaimer compact />

          {meta.kind === "practice" && meta.passage_text ? (
            <label style={{ display: "flex", gap: 8, alignItems: "flex-start", justifyContent: "center", marginTop: 16, fontSize: 12.5, color: "var(--muted)", cursor: "pointer", textAlign: "left", maxWidth: 380, marginLeft: "auto", marginRight: "auto" }}>
              <input type="checkbox" checked={showPassage} onChange={(e) => setShowPassage(e.target.checked)} style={{ marginTop: 3 }} />
              <span>
                Show the passage on screen, only if you have no printer. Build the habit of
                typing from paper, or moving your eyes will feel hard in the real exam.
              </span>
            </label>
          ) : null}
        </div>
      </Shell>
    );
  }

  // ═══════════════════ TYPING ═══════════════════
  if (stage === "typing") {
    // NCERT ka notification saaf kehta hai: Times New Roman, 12pt, 1.5 line
    // spacing — "a document-style typing task, not a locked exam-player
    // interface". Isliye NCERT ki screen Word document jaisi hai, aur P&H ki
    // wahi purani exam wali patti ke saath.
    const doc = (meta.scoring_mode || "word") === "keystroke";
    const need = Number(meta.min_keystrokes || 0);
    // liveTick sirf re-render trigger karne ke liye hai — asli values refs se
    void liveTick;
    const liveKeys = keystrokeRef.current;
    const liveBackspace = backspaceRef.current;
    const totalWordsLive = meta.keystroke_word_count || meta.word_count || 0;
    const typedWordsLive = Math.floor(liveKeys / 5);
    const pendingWordsLive = Math.max(0, totalWordsLive - typedWordsLive);
    const liveErrs = liveErrorCount();

    return (
      <div
        style={{ minHeight: "100vh", background: "#f2f4f8", color: "#111", display: "flex", flexDirection: "column" }}
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
      >
        {/* Upar ki patti — asli exam jaisi */}
        <div style={{ background: "#fff", borderBottom: "1px solid #d4d9e2", padding: "8px 12px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: 0.4 }}>
            TEST NUMBER: <span style={{ color: "#1a2f55" }}>{picked}</span>
          </span>
          <span style={{ flex: 1 }} />
          {!started && (
            <span style={{ fontSize: 11, fontWeight: 700, color: "#1c7a3e", marginRight: 8 }}>
              Timer starts on your first letter
            </span>
          )}
          <span style={{ fontSize: 13, fontWeight: 800, color: !started ? "#5f6a7d" : low ? RED : "#111", fontVariantNumeric: "tabular-nums" }}>
            {mm}:{ss}
          </span>
        </div>

        {/* Screen-mode (NCERT-style) passages skip the select stage entirely,
            so agar font abhi tay nahi hua, yahi ek jagah hai use poochne ki —
            typing shuru hone se pehle, ek baar. */}
        {meta.language === "hindi" && meta.passage_mode === "screen" && !scriptPreset && (
          <div style={{ background: "#fff8e1", borderBottom: "1px solid #e8cf6a", padding: "10px 12px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "#7a5c00", marginBottom: 7 }}>
              Which Hindi font are you typing in?
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {([
                ["unicode", "Unicode", "Mangal, InScript, Google Indic, Gboard"],
                ["krutidev", "KrutiDev", "Also DevLys and Remington"],
              ] as const).map(([k, label, sub]) => (
                <button
                  key={k}
                  onClick={() => { setScript(k); setScriptPreset(true); }}
                  style={{
                    flex: "1 1 45%", minWidth: 150, textAlign: "left", cursor: "pointer",
                    borderRadius: 8, padding: "8px 11px",
                    border: `1px solid ${script === k ? "#c99b00" : "#e8cf6a"}`,
                    background: script === k ? "#fff0bf" : "#fffdf5",
                  }}
                >
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#4a3800" }}>{label}</div>
                  <div style={{ fontSize: 10.5, color: "#8a7020", marginTop: 1 }}>{sub}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        {meta.language === "hindi" && meta.passage_mode === "screen" && scriptPreset && (
          <div style={{ background: "#f7f9fc", borderBottom: "1px solid #d4d9e2", padding: "5px 12px", fontSize: 11, color: "#5f6a7d" }}>
            Typing in <b style={{ color: "#333" }}>{script === "krutidev" ? "KrutiDev" : "Unicode"}</b> —{" "}
            <button onClick={() => setScriptPreset(false)} style={{ background: "transparent", border: "none", color: "#1a2f55", fontWeight: 700, cursor: "pointer", padding: 0, fontSize: 11, textDecoration: "underline" }}>change</button>
          </div>
        )}

        {/* Doosri patti — font size + live stats */}
        <div style={{ background: "#f7f9fc", borderBottom: "1px solid #d4d9e2", padding: "6px 12px", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", fontSize: 11.5 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button
              onClick={() => setFontSize((f) => Math.max(12, f - 1))}
              style={{ width: 24, height: 24, borderRadius: 5, border: "1px solid #c7ccd6", background: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 12, color: "#333" }}
            >A-</button>
            <span style={{ width: 22, textAlign: "center", color: "#5f6a7d", fontWeight: 700 }}>{fontSize}</span>
            <button
              onClick={() => setFontSize((f) => Math.min(24, f + 1))}
              style={{ width: 24, height: 24, borderRadius: 5, border: "1px solid #c7ccd6", background: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 12, color: "#333" }}
            >A+</button>
          </div>
          <span style={{ color: "#c7ccd6" }}>|</span>
          <span style={{ fontWeight: 800, color: "#333", fontVariantNumeric: "tabular-nums" }}>
            {liveKeys.toLocaleString("en-IN")} <span style={{ fontWeight: 500, color: "#8a8f99" }}>keystrokes</span>
          </span>
          <span style={{ fontWeight: 800, color: "#333", fontVariantNumeric: "tabular-nums" }}>
            {liveBackspace.toLocaleString("en-IN")} <span style={{ fontWeight: 500, color: "#8a8f99" }}>backspace</span>
          </span>
          {totalWordsLive > 0 && (
            <span style={{ fontWeight: 800, color: pendingWordsLive === 0 ? "#1c7a3e" : "#333", fontVariantNumeric: "tabular-nums" }}>
              {typedWordsLive.toLocaleString("en-IN")} / {totalWordsLive.toLocaleString("en-IN")} <span style={{ fontWeight: 500, color: "#8a8f99" }}>words</span>
            </span>
          )}
          {liveErrs !== null && (
            <span style={{ fontWeight: 800, color: liveErrs > 0 ? RED : "#1c7a3e", fontVariantNumeric: "tabular-nums" }}>
              {liveErrs} <span style={{ fontWeight: 500, color: "#8a8f99" }}>errors so far</span>
            </span>
          )}
          {need > 0 && (
            <span style={{ marginLeft: "auto", fontWeight: 800, color: liveKeys >= need ? "#1c7a3e" : "#5f6a7d", fontVariantNumeric: "tabular-nums" }}>
              min {need.toLocaleString("en-IN")}
            </span>
          )}
        </div>

        {(showPassage || meta.passage_mode === "screen") && meta.passage_text ? (
          <div
            style={{
              background: "#fffef5", borderBottom: "1px solid #d4d9e2",
              padding: "12px 16px", maxHeight: "34vh", overflowY: "auto",
              fontSize: meta.language === "hindi" ? fontSize + 2 : fontSize,
              lineHeight: meta.language === "hindi" ? 2 : 1.9,
              fontFamily: meta.scoring_mode === "keystroke"
                ? "'Times New Roman', Times, serif" : "inherit",
              userSelect: "none",            // copy karke chipkane se rokte hain
            }}
            onCopy={(e) => e.preventDefault()}
          >
            {meta.passage_text}
          </div>
        ) : null}

        <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: 10 }}>
          <div style={{ border: "1px solid #b9c0cc", borderRadius: 4, background: "#fff", display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            {!doc && (
              <div style={{ display: "flex", alignItems: "center", padding: "6px 10px", borderBottom: "1px solid #dfe3ea", background: "#f7f9fc" }}>
                <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.6, color: "#333" }}>CANDIDATE RESPONSE BOX</span>
                <span style={{ flex: 1 }} />
                <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.3, color: RED }}>COPY / PASTE IS NOT ALLOWED</span>
              </div>
            )}
            <textarea
              ref={boxRef}
              value={text}
              onChange={onChange}
              onKeyDown={onKeyDown}
              onPaste={onPaste}
              onDrop={(e) => e.preventDefault()}
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="off"
              autoComplete="off"
              lang={meta.language === "hindi" ? "hi" : "en"}
              style={{
                flex: 1, width: "100%", border: "none", outline: "none", resize: "none",
                // NCERT: Times New Roman 12pt, 1.5 spacing — notification ka niyam.
                // P&H: monospace, jaise exam player me hota hai.
                // KrutiDev: apna hi legacy font — warna student ka khud ka typed
                // text bhi usko angrezi jaisa dikhega, jabki Unicode wale ko
                // poora Hindi dikhta hai.
                padding: doc ? "24px 28px" : "12px 14px",
                fontSize,
                lineHeight: doc ? 1.5 : 1.8,
                fontFamily: (meta.language === "hindi" && script === "krutidev")
                  ? "'KrutiDev010', sans-serif"
                  : doc
                    ? "'Times New Roman', Times, serif"
                    : "Consolas, 'Courier New', monospace",
                color: "#111", background: "#fff", boxSizing: "border-box",
              }}
            />
          </div>

          {hint && (
            <div style={{ marginTop: 8, background: "rgba(192,57,43,0.08)", border: `1px solid ${RED}`, color: RED, borderRadius: 8, padding: "8px 12px", fontSize: 13, fontWeight: 700, textAlign: "center" }}>
              {hint}
            </div>
          )}

          <div style={{ display: "flex", gap: 10, marginTop: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#555" }}>
              {text.trim() ? text.trim().split(/\s+/).length : 0} words
            </span>
            <span style={{ flex: 1 }} />
            <button
              onClick={() => submit(false)}
              disabled={submitting}
              style={{ background: "#1a2f55", color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}
            >
              {submitting ? "Submitting…" : "Submit"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════ RESULT ═══════════════════
  const r = result.result;
  const missedWords: string[] = (r.segments || [])
    .filter((s: any) => s.op === "wrong" || s.op === "missing")
    .map((s: any) => s.text)
    .filter(Boolean);
  const nextId = nextPassageId(meta);
  const scriptQS = script ? `?script=${script}` : "";

  async function shareScore() {
    const text = `I typed ${r.net_wpm} net WPM at ${r.accuracy}% accuracy on Selection Lab${r.qualified ? " — qualified! ✅" : ""}`;
    const nav: any = typeof navigator !== "undefined" ? navigator : null;
    if (nav?.share) {
      try { await nav.share({ text, title: "My typing score" }); } catch {}
    } else if (nav?.clipboard) {
      try {
        await nav.clipboard.writeText(text);
        setShareStatus("copied");
        setTimeout(() => setShareStatus("idle"), 2000);
      } catch {}
    }
  }

  async function sendFeedback() {
    const u = getUser();
    setFeedbackSending(true);
    try {
      await fetch(`${API_URL}/tier2/typing/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: (u as any)?.id,
          passage_id: passageId,
          rating: feedbackRating,
          message: feedbackMsg,
        }),
      });
      setFeedbackSent(true);
    } catch {}
    setFeedbackSending(false);
  }

  return (
    <Shell>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            background: r.qualified ? "rgba(46,139,74,0.12)" : "rgba(192,57,43,0.1)",
            border: `1px solid ${r.qualified ? "#2e8b4a" : RED}`,
            borderRadius: 16, padding: 18, textAlign: "center", marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 34 }}>{r.qualified ? "✅" : "📈"}</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: r.qualified ? "#2e8b4a" : RED, marginTop: 4 }}>
            {r.net_wpm} net WPM
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
            {r.verdict}
          </div>
          {result.auto && <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>Time over — submitted automatically</div>}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <SmallBtn onClick={shareScore}>{shareStatus === "copied" ? "Copied!" : "Share score"}</SmallBtn>
          <SmallBtn onClick={() => setShowFeedback((v) => !v)}>Feedback</SmallBtn>
          {nextId && (
            <SmallBtn onClick={() => router.push(`/typing-test/${nextId}${scriptQS}`)}>Next passage →</SmallBtn>
          )}
        </div>

        {showFeedback && (
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 14, marginBottom: 16 }}>
            {feedbackSent ? (
              <p style={{ fontSize: 13, color: "#2e8b4a", fontWeight: 700, margin: 0 }}>Thanks — feedback sent.</p>
            ) : (
              <>
                <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 8 }}>How was this passage?</div>
                <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => setFeedbackRating(n)}
                      style={{
                        width: 34, height: 34, borderRadius: 8, cursor: "pointer", fontSize: 15,
                        border: `1px solid ${feedbackRating === n ? GOLD : "var(--line)"}`,
                        background: feedbackRating === n ? "rgba(255,171,0,0.15)" : "transparent",
                        color: "var(--text)", fontWeight: 800,
                      }}
                    >{n}</button>
                  ))}
                </div>
                <textarea
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  placeholder="Anything wrong with the passage or scoring? (optional)"
                  style={{ width: "100%", minHeight: 60, borderRadius: 8, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)", padding: 10, fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
                />
                <button
                  onClick={sendFeedback}
                  disabled={feedbackSending}
                  style={{ marginTop: 8, background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                >
                  {feedbackSending ? "Sending…" : "Send feedback"}
                </button>
              </>
            )}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
          <Box label="Words typed" value={r.words_typed} />
          <Box label="Full mistakes" value={r.full_mistakes} />
          <Box label="Half mistakes" value={r.half_mistakes} />
          <Box label="Gross WPM" value={r.gross_wpm} />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
          <Box label="Keystrokes" value={Number(r.keystrokes || 0).toLocaleString("en-IN")} />
          <Box label="Backspace count" value={r.backspace_count} />
          <Box label="Net correct" value={r.net_correct} />
          <Box label="Accuracy" value={`${r.accuracy}%`} />
        </div>

        {/* Shartein — sab poori honi chahiye */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <Gate ok={r.speed_ok} label="Speed" value={`${r.net_wpm} WPM`} need={`${r.target_wpm} required`} />
          <Gate ok={r.accuracy_ok} label="Accuracy" value={`${r.accuracy}%`} need={`${r.min_accuracy}% required`} />
          {r.min_keystrokes > 0 && (
            <Gate
              ok={r.keystrokes_ok}
              label="Keystrokes"
              value={Number(r.keystrokes || 0).toLocaleString("en-IN")}
              need={`${Number(r.min_keystrokes).toLocaleString("en-IN")} required`}
            />
          )}
        </div>

        <HowCalculated r={r} />

        <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>Where the mistakes are</h3>
        <div
          style={{
            background: "#fff", color: "#111", border: "1px solid var(--line)", borderRadius: 12,
            padding: 14, fontSize: 14.5, lineHeight: 2, fontFamily: "Consolas, 'Courier New', monospace",
            whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 12,
          }}
        >
          {(r.segments || []).map((s: any, i: number) => {
            const sp = i > 0 ? " " : "";
            if (s.op === "ok") return <span key={i} style={{ color: GREEN }}>{sp}{s.text}</span>;
            if (s.op === "not_reached") return <span key={i} style={{ color: GREY }} title="not reached">{sp}{s.text}</span>;
            if (s.op === "missing") return <span key={i} style={{ background: "#ffe0e0", color: RED, textDecoration: "underline" }} title="not typed">{sp}{s.text}</span>;
            if (s.op === "extra") return <span key={i} style={{ background: "#ffe0e0", color: RED, textDecoration: "line-through" }} title="not in the passage">{sp}{s.typed}</span>;
            const half = s.severity === "half";
            return (
              <span key={i} style={{ background: half ? "#e3edf8" : "#ffe0e0", color: half ? BLUE : RED }} title={`you typed: ${s.typed}`}>
                {sp}{s.text}
              </span>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -6, marginBottom: 16 }}>
          <span style={{ color: GREEN, fontWeight: 700 }}>Green</span> = correct ·{" "}
          <span style={{ color: BLUE, fontWeight: 700 }}>Blue</span> = half mistake ·{" "}
          <span style={{ color: RED, fontWeight: 700 }}>Red</span> = full mistake ·{" "}
          <span style={{ color: GREY, fontWeight: 700 }}>Grey</span> = not reached. Tap a coloured word to see what you typed.
        </p>

        {missedWords.length > 0 && !showPractice && (
          <button
            onClick={() => setShowPractice(true)}
            style={{ width: "100%", background: "var(--card)", color: "var(--text)", border: `1px solid ${GOLD}`, borderRadius: 10, padding: "10px 0", fontWeight: 800, fontSize: 13.5, cursor: "pointer", marginBottom: 16 }}
          >
            Practice these {missedWords.length} words
          </button>
        )}
        {showPractice && <PracticeMistakes words={missedWords} onClose={() => setShowPractice(false)} />}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => window.location.reload()}
            style={{ flex: 1, background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            Try again
          </button>
          <button
            onClick={() => router.push("/tier2")}
            style={{ flex: 1, background: "transparent", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 0", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            All tests
          </button>
        </div>
      </div>
    </Shell>
  );
}

// ── Series ke andar agla test-number kaunsa hai ─────────────────────────────
function nextPassageId(meta: any): number | null {
  const seq: { id: number; test_number: number }[] = meta?.test_sequence || [];
  if (!seq.length) return null;
  const idx = seq.findIndex((s) => s.id === meta.id);
  if (idx === -1 || idx === seq.length - 1) return null;
  return seq[idx + 1].id;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "18px 16px 40px" }}>{children}</main>
    </div>
  );
}

function Gate({ ok, label, value, need }: { ok: boolean; label: string; value: string; need: string }) {
  return (
    <div style={{
      flex: 1, borderRadius: 12, padding: 12, textAlign: "center",
      background: ok ? "rgba(46,139,74,0.12)" : "rgba(192,57,43,0.1)",
      border: `1px solid ${ok ? "#2e8b4a" : RED}`,
    }}>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 800, marginTop: 2, color: ok ? "#2e8b4a" : RED }}>
        {ok ? "✓" : "✗"} {value}
      </div>
      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 2 }}>{need}</div>
    </div>
  );
}

function Box({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, textAlign: "center" }}>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function SmallBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{ background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
    >
      {children}
    </button>
  );
}

// ── "How is this calculated?" — mode ke hisaab se step-by-step formula ─────
function HowCalculated({ r }: { r: any }) {
  const [open, setOpen] = useState(false);
  const mins = Math.max(1, Math.round((r.seconds_taken || 600) / 60));
  const keystrokeMode = r.scoring_mode === "keystroke";

  const rows: [string, string][] = keystrokeMode
    ? [
        ["Total keystrokes", Number(r.keystrokes || 0).toLocaleString("en-IN")],
        ["÷ 5 (one word) ÷ time", `÷ 5 ÷ ${mins} min`],
        ["Gross / Net WPM", `${r.net_wpm} WPM`],
        ["Words typed", String(r.words_typed)],
        ["Full mistakes", String(r.full_mistakes)],
        ["Half mistakes × 0.5", `${r.half_mistakes} × 0.5 = ${(r.half_mistakes * 0.5).toFixed(1)}`],
        ["Net correct (typed − full − half×0.5)", String(r.net_correct)],
        ["Accuracy (net ÷ typed × 100)", `${r.accuracy}%`],
        ["Required to qualify", `${r.target_wpm} WPM · ${r.min_accuracy}% accuracy${r.min_keystrokes ? ` · ${Number(r.min_keystrokes).toLocaleString("en-IN")} min keystrokes` : ""}`],
        ["Result", r.qualified ? "Qualified" : "Not qualified"],
      ]
    : [
        ["Words typed", String(r.words_typed)],
        ["Full mistakes", String(r.full_mistakes)],
        ["Half mistakes × 0.5", `${r.half_mistakes} × 0.5 = ${(r.half_mistakes * 0.5).toFixed(1)}`],
        ["Net correct (typed − full − half×0.5)", String(r.net_correct)],
        ["Accuracy (net ÷ typed × 100)", `${r.accuracy}%`],
        ["Net speed (net correct ÷ time)", `${r.net_wpm} WPM`],
        ["Required to qualify", `${r.min_accuracy}% accuracy · ${r.target_wpm} WPM`],
        ["Result", r.qualified ? "Qualified" : "Not qualified"],
      ];

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 16, overflow: "hidden" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: "none", padding: "12px 14px", cursor: "pointer", color: "var(--text)" }}
      >
        <span style={{ fontSize: 13.5, fontWeight: 800 }}>How is this calculated?</span>
        <span style={{ color: "var(--muted)", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          {rows.map(([label, val], i) => (
            <div
              key={i}
              style={{
                display: "flex", justifyContent: "space-between", gap: 10, padding: "7px 0",
                borderTop: i > 0 ? "1px solid var(--line)" : "none", fontSize: 12.5,
                fontWeight: label === "Result" ? 800 : 400,
              }}
            >
              <span style={{ color: "var(--muted)" }}>{label}</span>
              <span style={{ fontWeight: 700, textAlign: "right", color: label === "Result" ? (r.qualified ? "#2e8b4a" : RED) : "var(--text)" }}>{val}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Practice Mistakes — sirf galat shabd, untimed retry ─────────────────────
function PracticeMistakes({ words, onClose }: { words: string[]; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const correctCount = words.filter((w, i) => (answers[i] || "").trim() === w).length;

  return (
    <div style={{ background: "var(--card)", border: `1px solid ${GOLD}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 14, fontWeight: 800 }}>Practice your mistakes</div>
        <button onClick={onClose} style={{ background: "transparent", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: 13 }}>Close</button>
      </div>
      {words.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "var(--muted)" }}>No mistakes to practice — clean run!</p>
      ) : (
        <>
          {words.map((w, i) => {
            const val = answers[i] || "";
            const isRight = checked && val.trim() === w;
            return (
              <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, width: 96, flexShrink: 0, color: "var(--muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{w}</span>
                <input
                  value={val}
                  onChange={(e) => setAnswers((a) => ({ ...a, [i]: e.target.value }))}
                  style={{
                    flex: 1, padding: "7px 9px", borderRadius: 6, fontSize: 13, minWidth: 0,
                    border: `1px solid ${checked ? (isRight ? "#2e8b4a" : RED) : "var(--line)"}`,
                    background: "#fff", color: "#111", boxSizing: "border-box",
                  }}
                />
                {checked && <span style={{ color: isRight ? "#2e8b4a" : RED, fontSize: 14, flexShrink: 0 }}>{isRight ? "✓" : "✗"}</span>}
              </div>
            );
          })}
          <div style={{ display: "flex", gap: 10, marginTop: 8, alignItems: "center" }}>
            <button
              onClick={() => setChecked(true)}
              style={{ background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
            >
              Check
            </button>
            {checked && <span style={{ fontSize: 12.5, color: "var(--muted)" }}>{correctCount} / {words.length} correct</span>}
          </div>
        </>
      )}
    </div>
  );
}
