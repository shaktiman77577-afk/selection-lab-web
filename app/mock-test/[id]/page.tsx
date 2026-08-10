"use client";

// Mock test player — TCS/SSC pattern exam interface.
// Route: app/mock-test/[id]/page.tsx   ({id} = mock_test id, series id NAHI)
//
// Backend contract (routers/mock_tests.py):
//   GET  /mock-tests/{id}?user_id=..  -> { mock_test, questions, total }
//   POST /mock-tests/submit           -> { user_id, mock_test_id, answers, time_taken_seconds }
//        answers ke keys STRING question ids hone chahiye.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";

const GOLD = "#FFAB00";
const GREEN = "#2e8b4a";
const RED = "#d64545";
const PURPLE = "#7c4dff";

type Q = {
  id: number;
  question: string;
  option_a: string; option_b: string; option_c: string; option_d: string;
  question_hi?: string | null;
  option_a_hi?: string | null; option_b_hi?: string | null;
  option_c_hi?: string | null; option_d_hi?: string | null;
  explanation?: string | null;
  explanation_hi?: string | null;
  correct_answer: string;
  marks: number;
  section: string;
};

const LETTERS = ["A", "B", "C", "D"] as const;

export default function MockTestPlayer() {
  const params = useParams();
  const router = useRouter();
  const testId = Number(params.id);

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Record<string, boolean>>({});
  const [visited, setVisited] = useState<Record<string, boolean>>({});
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [section, setSection] = useState<string>("");

  const [timeLeft, setTimeLeft] = useState(0);
  const startedAt = useRef<number>(Date.now());

  const [showPalette, setShowPalette] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showSolutions, setShowSolutions] = useState(false);
  const [capped, setCapped] = useState(false);   // live window ne timer chhota kiya
  const [isLive, setIsLive] = useState(false);
  const [restored, setRestored] = useState(false);

  // Phone ka browser tab reload kar de ya galti se back ho jaye to answers
  // na khoyein — har badlav local me save hota rehta hai.
  const saveKey = `sl_attempt_${testId}`;

  // ── Load test ──
  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    fetch(`${API_URL}/mock-tests/${testId}?user_id=${(u as any).id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not load test");
        setTest(d.mock_test);
        const qs: Q[] = d.questions || [];
        setQuestions(qs);
        setSection(qs[0]?.section || "");
        // Live test me timer window ke end par cap hota hai — sabke liye ek hi
        // deadline, isliye late join karne se extra time nahi milta.
        const secs = Number(d.effective_seconds) || (Number(d.mock_test?.duration_minutes) || 30) * 60;
        setTimeLeft(secs);
        setCapped(!!d.capped_by_window);
        setIsLive(!!d.live?.is_live);
        startedAt.current = Date.now();

        // Pehle se kuch bhara hua tha? Wapas le aao.
        try {
          const raw = localStorage.getItem(saveKey);
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved && typeof saved === "object") {
              if (saved.answers) setAnswers(saved.answers);
              if (saved.marked) setMarked(saved.marked);
              if (saved.visited) setVisited(saved.visited);
              if (typeof saved.idx === "number") setIdx(saved.idx);
              if (typeof saved.startedAt === "number") startedAt.current = saved.startedAt;
              setRestored(true);
            }
          }
        } catch {}
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  const sections = useMemo(() => {
    const seen: string[] = [];
    for (const q of questions) if (!seen.includes(q.section)) seen.push(q.section);
    return seen;
  }, [questions]);

  const current = questions[idx];

  // Mark current question visited
  useEffect(() => {
    if (current) setVisited((v) => ({ ...v, [current.id]: true }));
    if (current) setSection(current.section);
  }, [current]);

  // Har badlav par local save
  useEffect(() => {
    if (loading || result) return;
    try {
      localStorage.setItem(saveKey, JSON.stringify({
        answers, marked, visited, idx, startedAt: startedAt.current,
      }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, marked, visited, idx, loading, result]);

  // ── Submit ──
  const submit = useCallback(
    async (auto = false) => {
      if (submitting || result) return;
      setSubmitting(true);
      const u = getUser();
      try {
        const res = await fetch(`${API_URL}/mock-tests/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: (u as any)?.id ?? null,
            mock_test_id: testId,
            answers, // keys already string question ids
            time_taken_seconds: Math.round((Date.now() - startedAt.current) / 1000),
          }),
        });
        const d = await res.json();
        if (!res.ok) throw new Error(d.detail || "Could not submit test");
        setResult({ ...d, auto });   // live test me d.pending true aata hai
        try { localStorage.removeItem(saveKey); } catch {}
        setConfirmSubmit(false);
      } catch (e: any) {
        setError(e.message);
      }
      setSubmitting(false);
    },
    [answers, submitting, result, testId]
  );

  // ── Timer ──
  useEffect(() => {
    if (loading || result || !test) return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(t);
          submit(true); // time up -> auto submit
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [loading, result, test, submit]);

  // Galti se page band na ho jaye
  useEffect(() => {
    if (result || loading) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [result, loading]);

  function pick(letter: string) {
    if (!current) return;
    setAnswers((a) => ({ ...a, [String(current.id)]: letter }));
  }
  function clearResponse() {
    if (!current) return;
    setAnswers((a) => {
      const n = { ...a };
      delete n[String(current.id)];
      return n;
    });
  }
  function go(n: number) {
    if (n >= 0 && n < questions.length) setIdx(n);
    setShowPalette(false);
  }
  function markAndNext() {
    if (!current) return;
    setMarked((m) => ({ ...m, [String(current.id)]: true }));
    go(idx + 1);
  }

  const mmss = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const p = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${p(h)}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
  };

  const stats = useMemo(() => {
    let ans = 0, notAns = 0, mark = 0, notVisited = 0;
    for (const q of questions) {
      const k = String(q.id);
      const a = !!answers[k], m = !!marked[k], v = !!visited[k];
      if (m) mark++;
      else if (a) ans++;
      else if (v) notAns++;
      else notVisited++;
    }
    return { ans, notAns, mark, notVisited };
  }, [questions, answers, marked, visited]);

  function paletteColor(q: Q) {
    const k = String(q.id);
    if (marked[k]) return { bg: PURPLE, fg: "#fff" };
    if (answers[k]) return { bg: GREEN, fg: "#fff" };
    if (visited[k]) return { bg: RED, fg: "#fff" };
    return { bg: "var(--chip)", fg: "var(--text)" };
  }

  // ── States ──
  if (loading)
    return <Center>Loading test…</Center>;

  if (error && !test)
    return (
      <Center>
        <div style={{ fontSize: 34 }}>⚠️</div>
        <p style={{ fontSize: 14.5, margin: "10px 0 16px", color: "#e05555", textAlign: "center" }}>{error}</p>
        <button onClick={() => router.push("/mock-tests")} style={goldBtn}>Back to Mock Tests</button>
      </Center>
    );

  // ── RESULT ──
  if (result && result.pending) {
    // Live test — result sabka ek saath, window khatam hone ke baad
    return (
      <Center>
        <div style={{ fontSize: 44 }}>⏳</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "12px 0 6px", textAlign: "center" }}>Test submitted</h2>
        <p style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", lineHeight: 1.6, maxWidth: 360 }}>
          {result.message || "Results for everyone will be published after the live test ends."}
        </p>
        <button onClick={() => router.push(`/mock-test/${testId}/result`)} style={{ ...goldBtn, marginTop: 18 }}>
          Check result page
        </button>
        <button onClick={() => router.push("/")} style={{ ...ghostBtn, marginTop: 10 }}>
          Back to home
        </button>
      </Center>
    );
  }

  if (result) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
          <div
            style={{
              background: `linear-gradient(135deg, #1a2f55, #2c4a85)`,
              color: "#fff", borderRadius: 18, padding: "22px 18px", textAlign: "center",
            }}
          >
            <div style={{ fontSize: 40 }}>{result.passed ? "🎉" : "📊"}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              {result.auto ? "Time up — auto submitted" : "Test submitted"}
            </div>
            <div style={{ fontSize: 40, fontWeight: 800, color: GOLD, marginTop: 8 }}>
              {result.score}
              <span style={{ fontSize: 18, opacity: 0.8 }}> / {result.total_marks}</span>
            </div>
            <div style={{ fontSize: 14, marginTop: 6, fontWeight: 700, color: result.passed ? "#5dd97c" : "#ffb4b4" }}>
              {result.passed ? "PASSED ✓" : `Not cleared (need ${result.pass_percentage}%)`}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
            <Stat label="Correct" value={result.correct} color={GREEN} />
            <Stat label="Wrong" value={result.wrong} color={RED} />
            <Stat label="Skipped" value={result.skipped} color="var(--muted)" />
            <Stat label="Accuracy" value={`${result.accuracy}%`} color={GOLD} />
          </div>

          <button onClick={() => setShowSolutions((s) => !s)} style={{ ...goldBtn, width: "100%", marginTop: 14 }}>
            {showSolutions ? "Hide solutions" : "📖 View solutions"}
          </button>
          <button onClick={() => router.push("/mock-tests")} style={{ ...ghostBtn, width: "100%", marginTop: 10 }}>
            Back to Mock Tests
          </button>

          {showSolutions && (
            <div style={{ marginTop: 16 }}>
              {questions.map((q, i) => {
                const given = answers[String(q.id)];
                const ok = given === q.correct_answer;
                const qText = lang === "hi" && q.question_hi ? q.question_hi : q.question;
                const exp = lang === "hi" && q.explanation_hi ? q.explanation_hi : q.explanation;
                return (
                  <div key={q.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <b style={{ fontSize: 13 }}>Q{i + 1}</b>
                      <span style={{ fontSize: 11.5, fontWeight: 800, color: !given ? "var(--muted)" : ok ? GREEN : RED }}>
                        {!given ? "SKIPPED" : ok ? "CORRECT" : "WRONG"}
                      </span>
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>{qText}</div>
                    {LETTERS.map((L) => {
                      const key = `option_${L.toLowerCase()}` as keyof Q;
                      const keyHi = `option_${L.toLowerCase()}_hi` as keyof Q;
                      const txt = (lang === "hi" && q[keyHi] ? q[keyHi] : q[key]) as string;
                      if (!txt) return null;
                      const isCorrect = q.correct_answer === L;
                      const isGiven = given === L;
                      return (
                        <div
                          key={L}
                          style={{
                            marginTop: 6, fontSize: 13.5, padding: "8px 10px", borderRadius: 8,
                            border: `1px solid ${isCorrect ? GREEN : isGiven ? RED : "var(--line)"}`,
                            background: isCorrect ? "rgba(46,139,74,0.10)" : isGiven ? "rgba(214,69,69,0.10)" : "transparent",
                          }}
                        >
                          <b>{L}.</b> {txt} {isCorrect && "✓"} {isGiven && !isCorrect && "✗"}
                        </div>
                      );
                    })}
                    {exp && (
                      <div style={{ marginTop: 8, fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>
                        <b style={{ color: "var(--text)" }}>Explanation: </b>{exp}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!current) return <Center>No questions in this test.</Center>;

  const qText = lang === "hi" && current.question_hi ? current.question_hi : current.question;
  const lowTime = timeLeft <= 60;

  // ── EXAM SCREEN ──
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", paddingBottom: 150 }}>
      {/* Header: timer + submit */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 20, background: "var(--header)",
          borderBottom: "1px solid var(--line)", padding: "10px 14px",
          display: "flex", alignItems: "center", gap: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {test?.title}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Q {idx + 1} / {questions.length} · {current.marks} marks
            {Number(test?.negative_marking) > 0 && ` · −${test.negative_marking}`}
          </div>
        </div>
        <div
          style={{
            fontWeight: 800, fontVariantNumeric: "tabular-nums", fontSize: 16,
            color: lowTime ? RED : GOLD, background: lowTime ? "rgba(214,69,69,0.12)" : "rgba(255,171,0,0.12)",
            padding: "6px 10px", borderRadius: 8,
          }}
        >
          ⏱ {mmss(timeLeft)}
        </div>
        <button onClick={() => setConfirmSubmit(true)} style={{ ...goldBtn, padding: "8px 14px", fontSize: 13 }}>
          Submit
        </button>
      </div>

      {restored && (
        <div style={{ background: "rgba(46,139,74,0.12)", color: "#2e8b4a", fontSize: 12, padding: "8px 14px", fontWeight: 700 }}>
          ✓ Your earlier answers have been restored.
        </div>
      )}

      {/* Live test me window band hone ka note */}
      {capped && (
        <div style={{ background: "rgba(214,69,69,0.12)", color: "#d64545", fontSize: 12, padding: "8px 14px", fontWeight: 700 }}>
          ⏳ This live test closes soon — your timer matches the common deadline for everyone.
        </div>
      )}

      {/* Section tabs + language */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 14px 0", alignItems: "center" }}>
        {sections.map((s) => (
          <button
            key={s}
            onClick={() => {
              const first = questions.findIndex((q) => q.section === s);
              if (first >= 0) go(first);
            }}
            style={{
              flexShrink: 0, padding: "6px 12px", borderRadius: 20, fontSize: 12.5, fontWeight: 700,
              border: `1px solid ${section === s ? GOLD : "var(--line)"}`,
              background: section === s ? "rgba(255,171,0,0.14)" : "var(--card)",
              color: section === s ? GOLD : "var(--text)", cursor: "pointer",
            }}
          >
            {s}
          </button>
        ))}
        <button
          onClick={() => setLang((l) => (l === "en" ? "hi" : "en"))}
          style={{ marginLeft: "auto", flexShrink: 0, ...ghostBtn, padding: "6px 12px", fontSize: 12.5 }}
        >
          {lang === "en" ? "हिंदी" : "English"}
        </button>
      </div>

      {/* Question */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 14 }}>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 15.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{qText}</div>

          <div style={{ marginTop: 14 }}>
            {LETTERS.map((L) => {
              const key = `option_${L.toLowerCase()}` as keyof Q;
              const keyHi = `option_${L.toLowerCase()}_hi` as keyof Q;
              const txt = (lang === "hi" && current[keyHi] ? current[keyHi] : current[key]) as string;
              if (!txt) return null;
              const selected = answers[String(current.id)] === L;
              return (
                <div
                  key={L}
                  onClick={() => pick(L)}
                  style={{
                    display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer",
                    padding: "12px 14px", borderRadius: 12, marginBottom: 9,
                    border: `1.5px solid ${selected ? GOLD : "var(--line)"}`,
                    background: selected ? "rgba(255,171,0,0.10)" : "transparent",
                  }}
                >
                  <span
                    style={{
                      width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontWeight: 800, fontSize: 13,
                      background: selected ? GOLD : "var(--chip)", color: selected ? "#1a1a1a" : "var(--text)",
                    }}
                  >
                    {L}
                  </span>
                  <span style={{ fontSize: 14.5, lineHeight: 1.55, paddingTop: 3 }}>{txt}</span>
                </div>
              );
            })}
          </div>

          <button onClick={clearResponse} style={{ ...ghostBtn, fontSize: 12.5, padding: "7px 14px", marginTop: 4 }}>
            Clear response
          </button>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20,
          background: "var(--header)", borderTop: "1px solid var(--line)", padding: "10px 12px",
        }}
      >
        <div style={{ display: "flex", gap: 8, maxWidth: 640, margin: "0 auto" }}>
          <button onClick={() => go(idx - 1)} disabled={idx === 0} style={{ ...ghostBtn, flex: 1, opacity: idx === 0 ? 0.45 : 1 }}>
            ← Prev
          </button>
          <button onClick={markAndNext} style={{ ...ghostBtn, flex: 1.4, borderColor: PURPLE, color: PURPLE }}>
            Mark & Next
          </button>
          <button onClick={() => go(idx + 1)} disabled={idx === questions.length - 1} style={{ ...goldBtn, flex: 1.4, opacity: idx === questions.length - 1 ? 0.45 : 1 }}>
            Save & Next
          </button>
        </div>
        <button onClick={() => setShowPalette(true)} style={{ ...ghostBtn, width: "100%", marginTop: 8, fontSize: 12.5, padding: "8px 0" }}>
          ☰ Question Palette ({stats.ans} answered · {questions.length - stats.ans} left)
        </button>
      </div>

      {/* Palette sheet */}
      {showPalette && (
        <div
          onClick={() => setShowPalette(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 30, display: "flex", alignItems: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg)", width: "100%", maxHeight: "78vh", overflowY: "auto", borderRadius: "18px 18px 0 0", padding: 16 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <b style={{ fontSize: 16 }}>Question Palette</b>
              <button onClick={() => setShowPalette(false)} style={{ ...ghostBtn, padding: "6px 12px" }}>✕</button>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>
              <Legend color={GREEN} text={`Answered (${stats.ans})`} />
              <Legend color={RED} text={`Not answered (${stats.notAns})`} />
              <Legend color={PURPLE} text={`Marked (${stats.mark})`} />
              <Legend color="var(--chip)" text={`Not visited (${stats.notVisited})`} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(42px, 1fr))", gap: 8 }}>
              {questions.map((q, i) => {
                const c = paletteColor(q);
                return (
                  <button
                    key={q.id}
                    onClick={() => go(i)}
                    style={{
                      height: 42, borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer",
                      background: c.bg, color: c.fg,
                      border: i === idx ? `2px solid ${GOLD}` : "1px solid var(--line)",
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <button onClick={() => { setShowPalette(false); setConfirmSubmit(true); }} style={{ ...goldBtn, width: "100%", marginTop: 16 }}>
              Submit Test
            </button>
          </div>
        </div>
      )}

      {/* Submit confirm */}
      {confirmSubmit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 20, maxWidth: 380, width: "100%" }}>
            <b style={{ fontSize: 17 }}>Submit test?</b>
            <div style={{ fontSize: 13.5, color: "var(--muted)", margin: "10px 0 14px", lineHeight: 1.6 }}>
              Answered: <b style={{ color: GREEN }}>{stats.ans + stats.mark}</b> · Left:{" "}
              <b style={{ color: RED }}>{questions.length - stats.ans - stats.mark}</b>
              <br />You cannot change your answers after submitting.
            </div>
            {error && <p style={{ color: "#e05555", fontSize: 13 }}>{error}</p>}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setConfirmSubmit(false)} style={{ ...ghostBtn, flex: 1 }}>Cancel</button>
              <button onClick={() => submit(false)} disabled={submitting} style={{ ...goldBtn, flex: 1, opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Submitting…" : "Yes, submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 12, height: 12, borderRadius: 3, background: color, border: "1px solid var(--line)" }} />
      {text}
    </span>
  );
}

const goldBtn: React.CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10,
  padding: "11px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)",
  borderRadius: 10, padding: "11px 14px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
};
