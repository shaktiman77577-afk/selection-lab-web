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
  // ?review=1 -> seedha solutions; ?retry=1 -> purana attempt bhoolkar naya test
  const [mode, setMode] = useState<"test" | "review">("test");

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
  // Badi screen par palette hamesha right side me (Oliveboard jaisa),
  // chhoti screen par right se slide-in drawer.
  const [wide, setWide] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showSolutions, setShowSolutions] = useState(false);
  const [solutions, setSolutions] = useState<Record<string, any>>({});
  const [solLoading, setSolLoading] = useState(false);
  const [capped, setCapped] = useState(false);   // live window ne timer chhota kiya
  const [isLive, setIsLive] = useState(false);
  const [restored, setRestored] = useState(false);
  // Har question par kitna time laga — Testbook jaise speed indicators ke liye
  const [qTimes, setQTimes] = useState<Record<string, number>>({});
  const [showPaper, setShowPaper] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [reported, setReported] = useState<Record<string, boolean>>({});
  const [fullscreen, setFullscreen] = useState(false);
  const [userName, setUserName] = useState("");
  const qEnter = useRef<number>(Date.now());

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
    setUserName(((u as any).name || "").split(" ")[0] || "Student");
    const qs = new URLSearchParams(window.location.search);
    const review = qs.get("review") === "1";
    const retry = qs.get("retry") === "1";
    if (retry) {
      try { localStorage.removeItem(`sl_attempt_${testId}`); } catch {}
    }
    if (review) setMode("review");
    // exam=1 -> backend answers nahi bhejta (student network tab me na dekh sake).
    // Review mode me answers chahiye, isliye wahan exam=0.
    fetch(`${API_URL}/mock-tests/${testId}?user_id=${(u as any).id}&exam=${review ? 0 : 1}`)
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
        const live = !!d.live?.is_live;
        setTimeLeft(secs);
        setCapped(!!d.capped_by_window);
        setIsLive(!!d.live?.is_live);
        startedAt.current = Date.now();

        // Review mode: purana attempt aur solutions le aao, test shuru mat karo
        if (review) {
          fetch(`${API_URL}/mock-tests/${testId}/result?user_id=${(u as any).id}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((res) => {
              if (res && !res.pending) {
                if (res.attempt?.answers) setAnswers(res.attempt.answers);
                setResult({
                  score: res.attempt?.score,
                  total_marks: res.test?.total_marks,
                  correct: res.attempt?.correct,
                  wrong: res.attempt?.wrong,
                  skipped: res.attempt?.skipped,
                  accuracy: res.attempt?.correct != null && res.attempt?.correct + res.attempt?.wrong > 0
                    ? Math.round((res.attempt.correct / (res.attempt.correct + res.attempt.wrong)) * 1000) / 10
                    : 0,
                  passed: null,
                  reviewing: true,
                });
              }
            })
            .catch(() => {});
          return;
        }

        // Pehle se kuch bhara hua tha? Wapas le aao.
        try {
          const raw = localStorage.getItem(saveKey);
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved && typeof saved === "object") {
              if (saved.answers) setAnswers(saved.answers);
              if (saved.marked) setMarked(saved.marked);
              if (saved.visited) setVisited(saved.visited);
              if (saved.qTimes) setQTimes(saved.qTimes);
              if (typeof saved.idx === "number") setIdx(saved.idx);
              if (typeof saved.startedAt === "number") startedAt.current = saved.startedAt;
              // Normal test: jitna time bacha tha wahi wapas (pause/resume).
              // Live test: timer hamesha window se aata hai, resume se extra time nahi.
              if (!live && typeof saved.timeLeft === "number" && saved.timeLeft > 0) {
                setTimeLeft(Math.min(saved.timeLeft, secs));
              }
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

  // Mark current question visited + per-question time count
  useEffect(() => {
    if (current) setVisited((v) => ({ ...v, [current.id]: true }));
    if (current) setSection(current.section);
    qEnter.current = Date.now();
  }, [current]);

  // Question chhodte waqt uska time jod do
  function stampTime() {
    if (!current) return;
    const spent = Math.round((Date.now() - qEnter.current) / 1000);
    if (spent > 0 && spent < 3600) {
      setQTimes((t) => ({ ...t, [String(current.id)]: (t[String(current.id)] || 0) + spent }));
    }
    qEnter.current = Date.now();
  }

  // Har badlav par local save
  useEffect(() => {
    if (loading || result) return;
    try {
      localStorage.setItem(saveKey, JSON.stringify({
        answers, marked, visited, idx, qTimes, startedAt: startedAt.current,
        timeLeft, savedAt: Date.now(),
      }));
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, marked, visited, idx, timeLeft, loading, result]);

  // ── Submit ──
  const submit = useCallback(
    async (auto = false) => {
      if (submitting || result) return;
      stampTime();
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
            question_times: qTimes,
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

  useEffect(() => {
    const check = () => setWide(window.innerWidth >= 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
    stampTime();
    if (n >= 0 && n < questions.length) setIdx(n);
    setShowPalette(false);
  }
  function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen?.();
        setFullscreen(true);
      } else {
        document.exitFullscreen?.();
        setFullscreen(false);
      }
    } catch {}
  }

  // Question me galti — admin ko pata chal jaye
  async function reportQuestion() {
    if (!current) return;
    const reason = prompt("What is wrong with this question? (wrong answer, typo, unclear, etc.)");
    if (!reason || !reason.trim()) return;
    try {
      const u = getUser();
      await fetch(`${API_URL}/mock-tests/report-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: (u as any)?.id ?? null,
          mock_test_id: testId,
          question_id: current.id,
          reason: reason.trim(),
        }),
      });
      setReported((r) => ({ ...r, [String(current.id)]: true }));
    } catch {}
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

  async function openSolutions() {
    if (showSolutions) {
      setShowSolutions(false);
      return;
    }
    setShowSolutions(true);
    if (Object.keys(solutions).length) return;
    setSolLoading(true);
    try {
      const u = getUser();
      const r = await fetch(`${API_URL}/mock-tests/${testId}/solutions?user_id=${(u as any)?.id}`);
      const d = await r.json();
      if (r.ok) {
        const map: Record<string, any> = {};
        for (const s of d.solutions || []) map[String(s.id)] = s;
        setSolutions(map);
      } else {
        setError(d.detail || "Could not load solutions");
      }
    } catch (e: any) {
      setError(e.message);
    }
    setSolLoading(false);
  }

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

          {result.reviewing && (
            <div style={{ fontSize: 12.5, color: "var(--muted)", textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
              You attempted this test earlier. Review the solutions below, or take it again.
            </div>
          )}

          <button onClick={openSolutions} disabled={solLoading} style={{ ...goldBtn, width: "100%", marginTop: 14, opacity: solLoading ? 0.6 : 1 }}>
            {solLoading ? "Loading solutions…" : showSolutions ? "Hide solutions" : "📖 View solutions"}
          </button>
          <button
            onClick={() => {
              try { localStorage.removeItem(`sl_attempt_${testId}`); } catch {}
              window.location.href = `/mock-test/${testId}?retry=1`;
            }}
            style={{ ...ghostBtn, width: "100%", marginTop: 10 }}
          >
            🔄 Reattempt this test
          </button>
          <button onClick={() => router.push("/mock-tests")} style={{ ...ghostBtn, width: "100%", marginTop: 10 }}>
            Back to Mock Tests
          </button>

          {showSolutions && (
            <div style={{ marginTop: 16 }}>
              {questions.map((q, i) => {
                const sol = solutions[String(q.id)] || {};
                const correct = sol.correct_answer ?? q.correct_answer;
                const given = answers[String(q.id)];
                const ok = given === correct;
                const qText = lang === "hi" && q.question_hi ? q.question_hi : q.question;
                const exp = lang === "hi" && (sol.explanation_hi ?? q.explanation_hi)
                  ? (sol.explanation_hi ?? q.explanation_hi)
                  : (sol.explanation ?? q.explanation);
                return (
                  <div key={q.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 14, marginBottom: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 7 }}>
                      <b style={{ fontSize: 13 }}>Q{i + 1}</b>
                      <span
                        style={{
                          fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 6,
                          color: !given ? "var(--muted)" : ok ? GREEN : RED,
                          background: !given ? "var(--chip)" : ok ? "rgba(46,139,74,0.12)" : "rgba(214,69,69,0.12)",
                        }}
                      >
                        {!given ? "SKIPPED" : ok ? "CORRECT" : "WRONG"}
                      </span>

                      {/* Speed indicator — apna time vs sabka average */}
                      {sol.my_seconds != null && (
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>
                          You: {mmss(sol.my_seconds)}
                          {sol.avg_seconds != null && ` · Avg: ${mmss(sol.avg_seconds)}`}
                          {sol.avg_seconds != null && (
                            <b
                              style={{
                                marginLeft: 6,
                                color: sol.my_seconds <= sol.avg_seconds * 0.7 ? GREEN
                                  : sol.my_seconds <= sol.avg_seconds * 1.3 ? GOLD : RED,
                              }}
                            >
                              {sol.my_seconds <= sol.avg_seconds * 0.7 ? "⚡ Fast"
                                : sol.my_seconds <= sol.avg_seconds * 1.3 ? "On time" : "🐢 Slow"}
                            </b>
                          )}
                        </span>
                      )}

                      {sol.correct_pct != null && (
                        <span
                          style={{
                            marginLeft: "auto", fontSize: 10.5, fontWeight: 700,
                            color: GREEN, background: "rgba(46,139,74,0.12)",
                            padding: "2px 8px", borderRadius: 6,
                          }}
                        >
                          {sol.correct_pct}% answered correctly
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.6 }}>{qText}</div>
                    {LETTERS.map((L) => {
                      const key = `option_${L.toLowerCase()}` as keyof Q;
                      const keyHi = `option_${L.toLowerCase()}_hi` as keyof Q;
                      const txt = (lang === "hi" && q[keyHi] ? q[keyHi] : q[key]) as string;
                      if (!txt) return null;
                      const isCorrect = correct === L;
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

  // Palette — right sidebar aur mobile drawer, dono me yahi content jata hai
  const paletteBody = (
    <>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 11.5, color: "var(--muted)", marginBottom: 12 }}>
        <Legend color={GREEN} text={`Answered (${stats.ans})`} />
        <Legend color={RED} text={`Not answered (${stats.notAns})`} />
        <Legend color={PURPLE} text={`Marked (${stats.mark})`} />
        <Legend color="var(--chip)" text={`Not visited (${stats.notVisited})`} />
      </div>

      {sections.length > 1 && (
        <div style={{ marginBottom: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
          {sections.map((sec) => {
            const qs = questions.filter((q) => q.section === sec);
            const done = qs.filter((q) => answers[String(q.id)]).length;
            return (
              <div key={sec} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11.5, padding: "3px 0" }}>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sec}</span>
                <span style={{ color: done === qs.length ? GREEN : "var(--muted)", fontWeight: 700 }}>
                  {done}/{qs.length}
                </span>
              </div>
            );
          })}
        </div>
      )}

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

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button
          onClick={() => { setShowPalette(false); setShowPaper(true); }}
          style={{ ...ghostBtn, flex: 1, padding: "9px 0", fontSize: 12 }}
        >
          Question Paper
        </button>
        <button
          onClick={() => { setShowPalette(false); setShowInstructions(true); }}
          style={{ ...ghostBtn, flex: 1, padding: "9px 0", fontSize: 12 }}
        >
          Instructions
        </button>
      </div>

      <button
        onClick={() => { setShowPalette(false); setConfirmSubmit(true); }}
        style={{ ...goldBtn, width: "100%", marginTop: 10 }}
      >
        Submit Test
      </button>
    </>
  );

  // ── EXAM SCREEN ──
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", paddingBottom: 150 }}>
      {/* Header: timer + submit */}
      <div
        style={{
          position: "sticky", top: 0, zIndex: 20, background: "var(--header)",
          borderBottom: "1px solid var(--line)",
          padding: wide ? "10px 18px" : "8px 12px",
          display: "flex", alignItems: "center", gap: wide ? 14 : 8,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontWeight: 800, fontSize: wide ? 15 : 13,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {test?.title}
          </div>
          {/* Mobile par chhoti line — desktop par ye info status strip me hai */}
          {!wide && (
            <div style={{ fontSize: 10.5, color: "var(--muted)" }}>
              Q {idx + 1}/{questions.length} · {stats.ans} answered
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 7, flexShrink: 0,
            color: lowTime ? RED : GOLD,
            background: lowTime ? "rgba(214,69,69,0.12)" : "rgba(255,171,0,0.12)",
            padding: wide ? "7px 14px" : "5px 9px", borderRadius: 9,
          }}
        >
          {wide && <span style={{ fontSize: 11.5, color: "var(--muted)", fontWeight: 700 }}>Time Left</span>}
          <span style={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", fontSize: wide ? 19 : 14 }}>
            {mmss(timeLeft)}
          </span>
        </div>
        {wide && (
          <button onClick={toggleFullscreen} style={{ ...ghostBtn, padding: "8px 13px", fontSize: 12.5 }}>
            {fullscreen ? "⤡ Exit full screen" : "⤢ Full screen"}
          </button>
        )}
        {!isLive && (
          <button
            onClick={() => {
              // State pehle hi localStorage me save hai — bas bahar nikal jao
              if (confirm("Pause this test? Your answers and remaining time are saved. You can resume anytime.")) {
                router.push("/mock-tests");
              }
            }}
            style={{ ...ghostBtn, padding: wide ? "8px 14px" : "6px 9px", fontSize: 12.5 }}
          >
            {wide ? "⏸ Pause" : "⏸"}
          </button>
        )}
        <button
          onClick={() => setConfirmSubmit(true)}
          style={{ ...goldBtn, padding: wide ? "9px 22px" : "7px 13px", fontSize: wide ? 14 : 12.5 }}
        >
          {wide ? "Submit Test" : "Submit"}
        </button>
      </div>

      {restored && (
        <div style={{ background: "rgba(46,139,74,0.12)", color: "#2e8b4a", fontSize: 12, padding: "8px 14px", fontWeight: 700 }}>
          ✓ Resumed — your answers and remaining time were restored.
        </div>
      )}

      {/* Live test me window band hone ka note */}
      {capped && (
        <div style={{ background: "rgba(214,69,69,0.12)", color: "#d64545", fontSize: 12, padding: "8px 14px", fontWeight: 700 }}>
          ⏳ This live test closes soon — your timer matches the common deadline for everyone.
        </div>
      )}

      {/* MOBILE: status strip upar. DESKTOP: ye info right sidebar me jaati hai. */}
      {!wide && (
        <div
          style={{
            display: "flex", gap: 7, overflowX: "auto", padding: "7px 12px",
            borderBottom: "1px solid var(--line)", background: "var(--card)",
            fontSize: 10.5, alignItems: "center",
          }}
        >
          <Pill n={stats.ans} label="Answered" color={GREEN} />
          <Pill n={stats.notAns} label="Not ans" color={RED} />
          <Pill n={stats.mark} label="Marked" color={PURPLE} />
          <Pill n={stats.notVisited} label="Left" color="var(--muted)" />
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

      {/* Question + right side palette (Oliveboard jaisa) */}
      <div style={{ display: "flex", gap: 16, maxWidth: wide ? 1120 : 640, margin: "0 auto", padding: 14, alignItems: "flex-start" }}>
        <div
          style={{
            flex: 1, minWidth: 0, background: "var(--card)", border: "1px solid var(--line)",
            borderRadius: 14, padding: wide ? 24 : 15,
            minHeight: wide ? "58vh" : undefined,
          }}
        >
          {/* Question header — marks, negative marking, aur is question par bitaya time */}
          <div
            style={{
              display: "flex", alignItems: "center", gap: 9, flexWrap: "wrap",
              paddingBottom: 11, marginBottom: 13, borderBottom: "1px solid var(--line)", fontSize: 12,
            }}
          >
            <b style={{ fontSize: 13.5 }}>Question {idx + 1}</b>
            <span style={{ color: GREEN, fontWeight: 800, background: "rgba(46,139,74,0.12)", padding: "2px 8px", borderRadius: 6 }}>
              +{current.marks}
            </span>
            {Number(test?.negative_marking) > 0 && (
              <span style={{ color: RED, fontWeight: 800, background: "rgba(214,69,69,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                −{test.negative_marking}
              </span>
            )}
            <span style={{ marginLeft: "auto", color: "var(--muted)", fontVariantNumeric: "tabular-nums" }}>
              ⏱ {mmss(qTimes[String(current.id)] || 0)}
            </span>
            <button
              onClick={reportQuestion}
              disabled={!!reported[String(current.id)]}
              style={{
                background: "none", border: "none", padding: 0, cursor: "pointer",
                fontSize: 11.5, fontWeight: 700,
                color: reported[String(current.id)] ? GREEN : "var(--muted)",
              }}
            >
              {reported[String(current.id)] ? "✓ Reported" : "⚠ Report"}
            </button>
          </div>

          <div style={{ fontSize: wide ? 17 : 15, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{qText}</div>

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
                    display: "flex", gap: wide ? 12 : 10, alignItems: "flex-start", cursor: "pointer",
                    padding: wide ? "13px 16px" : "14px 13px",
                    borderRadius: 12, marginBottom: wide ? 8 : 10,
                    border: `1.5px solid ${selected ? GOLD : "var(--line)"}`,
                    background: selected ? "rgba(255,171,0,0.10)" : "transparent",
                  }}
                >
                  {wide ? (
                    /* Desktop — radio button, exam software jaisa */
                    <span
                      style={{
                        width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                        border: `2px solid ${selected ? GOLD : "var(--muted)"}`,
                        background: "transparent", position: "relative",
                      }}
                    >
                      {selected && (
                        <span style={{ position: "absolute", inset: 3, borderRadius: "50%", background: GOLD }} />
                      )}
                    </span>
                  ) : (
                    /* Mobile — A/B/C/D chip, ungli se tap karne layak */
                    <span
                      style={{
                        width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: 13.5,
                        background: selected ? GOLD : "var(--chip)", color: selected ? "#1a1a1a" : "var(--text)",
                      }}
                    >
                      {L}
                    </span>
                  )}
                  <span style={{ fontSize: wide ? 15.5 : 14.5, lineHeight: 1.6, paddingTop: wide ? 0 : 4 }}>
                    {wide && <b style={{ marginRight: 8, color: "var(--muted)" }}>{L}.</b>}
                    {txt}
                  </span>
                </div>
              );
            })}
          </div>

          {!wide && (
            <button onClick={clearResponse} style={{ ...ghostBtn, fontSize: 12.5, padding: "8px 16px", marginTop: 4 }}>
              Clear response
            </button>
          )}
        </div>

        {/* Badi screen: palette hamesha right side me chipka rehta hai */}
        {wide && (
          <aside
            style={{
              width: 290, flexShrink: 0, position: "sticky", top: 78,
              background: "var(--card)", border: "1px solid var(--line)",
              borderRadius: 14, padding: 16, maxHeight: "calc(100vh - 120px)", overflowY: "auto",
            }}
          >
            {/* Desktop sidebar ka header — user aur counts, Testbook jaisa */}
            <div style={{ display: "flex", alignItems: "center", gap: 9, paddingBottom: 11, marginBottom: 11, borderBottom: "1px solid var(--line)" }}>
              <span
                style={{
                  width: 34, height: 34, borderRadius: "50%", background: "rgba(255,171,0,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
                }}
              >
                👤
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{userName || "Student"}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  Question {idx + 1} of {questions.length}
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7, marginBottom: 13 }}>
              <Pill n={stats.ans} label="Answered" color={GREEN} />
              <Pill n={stats.mark} label="Marked" color={PURPLE} />
              <Pill n={stats.notAns} label="Not answered" color={RED} />
              <Pill n={stats.notVisited} label="Not visited" color="var(--muted)" />
            </div>

            {paletteBody}
          </aside>
        )}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 20,
          background: "var(--header)", borderTop: "1px solid var(--line)", padding: "10px 12px",
        }}
      >
        {wide ? (
          /* DESKTOP — Testbook jaisa: baayen review buttons, daayen Save & Next */
          <div style={{ display: "flex", gap: 10, maxWidth: 1120, margin: "0 auto", alignItems: "center" }}>
            <button onClick={markAndNext} style={{ ...ghostBtn, borderColor: PURPLE, color: PURPLE, padding: "11px 20px" }}>
              Mark for Review &amp; Next
            </button>
            <button onClick={clearResponse} style={{ ...ghostBtn, padding: "11px 20px" }}>
              Clear Response
            </button>
            <button onClick={() => go(idx - 1)} disabled={idx === 0} style={{ ...ghostBtn, padding: "11px 18px", opacity: idx === 0 ? 0.45 : 1 }}>
              ← Previous
            </button>
            <button
              onClick={() => go(idx + 1)}
              disabled={idx === questions.length - 1}
              style={{ ...goldBtn, marginLeft: "auto", padding: "11px 30px", opacity: idx === questions.length - 1 ? 0.45 : 1 }}
            >
              Save &amp; Next →
            </button>
          </div>
        ) : (
          /* MOBILE — bade tap targets, ek hi row */
          <div style={{ display: "flex", gap: 7, maxWidth: 640, margin: "0 auto" }}>
            <button onClick={() => go(idx - 1)} disabled={idx === 0} style={{ ...ghostBtn, flex: 1, padding: "13px 0", opacity: idx === 0 ? 0.45 : 1 }}>
              ←
            </button>
            <button onClick={markAndNext} style={{ ...ghostBtn, flex: 1.6, padding: "13px 0", borderColor: PURPLE, color: PURPLE, fontSize: 12.5 }}>
              Mark &amp; Next
            </button>
            <button
              onClick={() => go(idx + 1)}
              disabled={idx === questions.length - 1}
              style={{ ...goldBtn, flex: 1.8, padding: "13px 0", fontSize: 13, opacity: idx === questions.length - 1 ? 0.45 : 1 }}
            >
              Save &amp; Next
            </button>
          </div>
        )}
        {!wide && (
          <button onClick={() => setShowPalette(true)} style={{ ...ghostBtn, width: "100%", marginTop: 8, fontSize: 12.5, padding: "8px 0" }}>
            ☰ Question Palette ({stats.ans} answered · {questions.length - stats.ans} left)
          </button>
        )}
      </div>

      {/* Chhoti screen: right se slide-in drawer */}
      {showPalette && !wide && (
        <div
          onClick={() => setShowPalette(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 30, display: "flex", justifyContent: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--bg)", width: "min(88vw, 340px)", height: "100%",
              overflowY: "auto", padding: 16, boxShadow: "-8px 0 30px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <b style={{ fontSize: 16 }}>Question Palette</b>
              <button onClick={() => setShowPalette(false)} style={{ ...ghostBtn, padding: "6px 12px" }}>✕</button>
            </div>
            {paletteBody}
          </div>
        </div>
      )}

      {/* Question Paper — saare questions ek saath */}
      {showPaper && (
        <div
          onClick={() => setShowPaper(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 35, display: "flex", justifyContent: "center", alignItems: "flex-start", padding: "5vh 12px" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg)", width: "100%", maxWidth: 720, maxHeight: "88vh", overflowY: "auto", borderRadius: 16, padding: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, position: "sticky", top: -18, background: "var(--bg)", paddingTop: 4, paddingBottom: 8 }}>
              <b style={{ fontSize: 16, flex: 1 }}>Question Paper</b>
              <button onClick={() => setShowPaper(false)} style={{ ...ghostBtn, padding: "6px 12px" }}>✕</button>
            </div>

            {questions.map((q, i) => {
              const qt = lang === "hi" && q.question_hi ? q.question_hi : q.question;
              const picked = answers[String(q.id)];
              return (
                <div
                  key={q.id}
                  onClick={() => { setShowPaper(false); go(i); }}
                  style={{
                    background: "var(--card)", border: `1px solid ${i === idx ? GOLD : "var(--line)"}`,
                    borderRadius: 11, padding: 13, marginBottom: 9, cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 5 }}>
                    <b style={{ fontSize: 12.5 }}>Q{i + 1}</b>
                    <span style={{ fontSize: 10.5, color: "var(--muted)" }}>{q.section}</span>
                    {picked && (
                      <span style={{ marginLeft: "auto", fontSize: 10.5, fontWeight: 800, color: GREEN }}>
                        Answered: {picked}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>{qt}</div>
                  {LETTERS.map((L) => {
                    const key = `option_${L.toLowerCase()}` as keyof Q;
                    const keyHi = `option_${L.toLowerCase()}_hi` as keyof Q;
                    const txt = (lang === "hi" && q[keyHi] ? q[keyHi] : q[key]) as string;
                    if (!txt) return null;
                    return (
                      <div key={L} style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
                        <b>{L}.</b> {txt}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Instructions */}
      {showInstructions && (
        <div
          onClick={() => setShowInstructions(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 35, display: "flex", justifyContent: "center", alignItems: "center", padding: 14 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: "var(--bg)", width: "100%", maxWidth: 520, maxHeight: "85vh", overflowY: "auto", borderRadius: 16, padding: 18 }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <b style={{ fontSize: 16, flex: 1 }}>Instructions</b>
              <button onClick={() => setShowInstructions(false)} style={{ ...ghostBtn, padding: "6px 12px" }}>✕</button>
            </div>

            <div style={{ fontSize: 13.5, lineHeight: 1.75, color: "var(--text2)" }}>
              <p style={{ marginTop: 0 }}>
                <b style={{ color: "var(--text)" }}>{test?.title}</b><br />
                {questions.length} questions · {test?.duration_minutes} minutes · {test?.total_marks} marks
                {Number(test?.negative_marking) > 0 && ` · −${test.negative_marking} for each wrong answer`}
              </p>

              <b style={{ color: "var(--text)" }}>Colour codes in the palette</b>
              <div style={{ margin: "8px 0 14px" }}>
                <Legend color={GREEN} text="Answered" />{" "}
                <Legend color={RED} text="Visited but not answered" />{" "}
                <Legend color={PURPLE} text="Marked for review" />{" "}
                <Legend color="var(--chip)" text="Not visited yet" />
              </div>

              <b style={{ color: "var(--text)" }}>How to answer</b>
              <ul style={{ paddingLeft: 18, margin: "6px 0 14px" }}>
                <li><b>Save &amp; Next</b> — saves your answer and moves on</li>
                <li><b>Mark &amp; Next</b> — flags the question to come back to</li>
                <li><b>Clear response</b> — removes your answer</li>
                <li>You can jump to any question from the palette</li>
              </ul>

              <b style={{ color: "var(--text)" }}>Important</b>
              <ul style={{ paddingLeft: 18, margin: "6px 0 0" }}>
                <li>The test submits automatically when the timer ends</li>
                {isLive
                  ? <li>This is a <b>live test</b> — it cannot be paused, and results are published for everyone after the window closes</li>
                  : <li>You can pause and resume this test — your answers and remaining time are saved</li>}
                <li>Use the हिंदी / English toggle any time</li>
                <li>Found a mistake in a question? Tap <b>⚠ Report</b> above it</li>
              </ul>
            </div>

            <button onClick={() => setShowInstructions(false)} style={{ ...goldBtn, width: "100%", marginTop: 16 }}>
              Got it
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

function Pill({ n, label, color }: { n: number; label: string; color: string }) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0, color: "var(--muted)" }}>
      <span
        style={{
          minWidth: 19, height: 19, borderRadius: "50%", background: color,
          color: color === "var(--muted)" ? "var(--text)" : "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 10.5, padding: "0 5px",
          border: color === "var(--muted)" ? "1px solid var(--line)" : "none",
        }}
      >
        {n}
      </span>
      {label}
    </span>
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
