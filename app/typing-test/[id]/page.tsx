"use client";

/**
 * app/typing-test/[id]/page.tsx — asli exam jaisa typing test.
 *
 * Teen screen ek hi page me:
 *   1. select  — "aapne kaunsa passage print kiya hai?"  (asli exam ka step)
 *   2. typing  — khali response box, timer, backspace band
 *   3. result  — WPM, accuracy, galtiyan, aur mistake highlighting
 *
 * Passage screen par NAHI dikhta (practice mode ke option ke alawa) — backend
 * bhi test passages ka text bhejta hi nahi, isliye network tab se bhi nahi
 * padha ja sakta.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import Disclaimer from "@/app/components/Disclaimer";

const GOLD = "#FFAB00";
const RED = "#c0392b";

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
  const [result, setResult] = useState<any>(null);

  const startedAt = useRef<number>(0);
  const boxRef = useRef<HTMLTextAreaElement | null>(null);
  const textRef = useRef("");
  textRef.current = text;

  // ── Load ──
  useEffect(() => {
    const u = getUser();
    if (!u) { router.replace("/login"); return; }
    fetch(`${API_URL}/tier2/typing/passage/${passageId}?user_id=${(u as any).id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not open this test");
        setMeta(d);
        setTimeLeft((d.duration_min || 10) * 60);
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

  // ── Number select ──
  function choose(n: number) {
    setPicked(n);
    setWrongPick(null);
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
    const keys = text.length;

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
          {need > 0 && (
            <span style={{ fontSize: 12, fontWeight: 800, color: keys >= need ? "#1c7a3e" : "#5f6a7d", fontVariantNumeric: "tabular-nums" }}>
              {keys.toLocaleString("en-IN")} / {need.toLocaleString("en-IN")} keystrokes
            </span>
          )}
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

        {showPassage && meta.passage_text ? (
          <div style={{ background: "#fffef5", borderBottom: "1px solid #d4d9e2", padding: "10px 14px", fontSize: 14.5, lineHeight: 1.9, maxHeight: "34vh", overflowY: "auto" }}>
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
                padding: doc ? "24px 28px" : "12px 14px",
                fontSize: doc ? 16 : 15.5,
                lineHeight: doc ? 1.5 : 1.8,
                fontFamily: doc
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
              {need > 0 && ` · ${keys.toLocaleString("en-IN")} keystrokes`}
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
  return (
    <Shell>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div
          style={{
            background: r.qualified ? "rgba(46,139,74,0.12)" : "rgba(192,57,43,0.1)",
            border: `1px solid ${r.qualified ? "#2e8b4a" : RED}`,
            borderRadius: 16, padding: 18, textAlign: "center", marginBottom: 16,
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

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
          <Box label="Words typed" value={r.words_typed} />
          <Box label="Correct words" value={r.words_correct} />
          <Box label="Wrong words" value={r.words_wrong} />
          <Box label="Gross WPM" value={r.gross_wpm} />
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

        <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>Error breakdown</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 10, marginBottom: 16 }}>
          <Box label="Spelling" value={r.err_spelling} />
          <Box label="Punctuation" value={r.err_punctuation} />
          <Box label="Capital" value={r.err_caps} />
          <Box label="Format" value={r.err_format} />
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, fontSize: 12.5, color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>
          {r.scoring_mode === "keystroke" ? (
            <>
              Five key depressions count as one word, so{" "}
              <b style={{ color: "var(--text)" }}>{Number(r.keystrokes || 0).toLocaleString("en-IN")}</b> keystrokes
              &divide; 5 &divide; {Math.round((r.seconds_taken || 600) / 60)} minutes ={" "}
              <b style={{ color: "var(--text)" }}>{r.net_wpm} WPM</b>. Mistakes do not reduce this
              speed — NCERT publishes no deduction formula — but they show up in your accuracy,
              and the accuracy bar still has to be cleared.
            </>
          ) : (
            <>
              A word with any mistake in it — spelling, punctuation, capitals or spacing — is not
              counted at all. So <b style={{ color: "var(--text)" }}>{r.words_correct}</b> correct
              words &divide; {Math.round((r.seconds_taken || 600) / 60)} minutes = <b style={{ color: "var(--text)" }}>{r.net_wpm} WPM</b>.
              {r.not_attempted_words > 0 && <> {r.not_attempted_words} words of the passage were left untyped and are not counted as mistakes.</>}
            </>
          )}
        </div>

        <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>Where the mistakes are</h3>
        <div
          style={{
            background: "#fff", color: "#111", border: "1px solid var(--line)", borderRadius: 12,
            padding: 14, fontSize: 14.5, lineHeight: 2, fontFamily: "Consolas, 'Courier New', monospace",
            whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: 20,
          }}
        >
          {(r.segments || []).map((s: any, i: number) => {
            const sp = i > 0 ? " " : "";
            if (s.op === "ok") return <span key={i} style={{ color: "#1c7a3e" }}>{sp}{s.text}</span>;
            if (s.op === "missing") return <span key={i} style={{ background: "#ffe0e0", color: RED, textDecoration: "underline" }} title="not typed">{sp}{s.text}</span>;
            if (s.op === "extra") return <span key={i} style={{ background: "#ffe0e0", color: RED, textDecoration: "line-through" }} title="not in the passage">{sp}{s.typed}</span>;
            return (
              <span key={i} style={{ background: "#ffe0e0", color: RED }} title={`you typed: ${s.typed}`}>
                {sp}{s.text}
              </span>
            );
          })}
        </div>
        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: -12, marginBottom: 20 }}>
          Green = correct · Red = mistake. Tap a red word to see what you actually typed.
        </p>

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
