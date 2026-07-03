"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser, User } from "@/lib/api";

const GOLD = "#FFAB00";
const BG = "#0d0b08";
const CARD = "#16130e";
const BORDER = "rgba(255,171,0,0.25)";
const GREEN = "#2e8b4a";
const RED = "#d9534f";
const PURPLE = "#8a5cd6";
const GREY = "#4a4436";

type Phase = "loading" | "locked" | "instructions" | "test" | "result";

export default function MockTestPlayer() {
  const params = useParams();
  const router = useRouter();
  const testId = Number(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [test, setTest] = useState<any>(null);
  const [qs, setQs] = useState<any[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [marked, setMarked] = useState<Set<number>>(new Set());
  const [visited, setVisited] = useState<Set<number>>(new Set([0]));
  const [selected, setSelected] = useState<string>("");
  const [remaining, setRemaining] = useState(0);
  const [showPalette, setShowPalette] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showSolutions, setShowSolutions] = useState(false);
  const [error, setError] = useState("");
  const timerRef = useRef<any>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    fetch(`${API_URL}/mock-tests/${testId}?user_id=${u.id}`)
      .then(async (r) => {
        const d = await r.json();
        if (r.status === 403) {
          setPhase("locked");
          return;
        }
        if (!r.ok) throw new Error(d.detail || "Could not load test");
        setTest(d.mock_test);
        setQs(d.questions || []);
        setPhase("instructions");
      })
      .catch((e) => {
        setError(e.message);
        setPhase("locked");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  function startTest() {
    const secs = (test?.duration_minutes || 60) * 60;
    setRemaining(secs);
    setPhase("test");
    timerRef.current = setInterval(() => {
      setRemaining((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          doSubmit(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  useEffect(() => () => clearInterval(timerRef.current), []);

  // Load saved answer when navigating
  useEffect(() => {
    const q = qs[idx];
    if (q) setSelected(answers[String(q.id)] || "");
    setVisited((v) => new Set(v).add(idx));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, qs]);

  function saveCurrent(sel: string) {
    const q = qs[idx];
    if (!q) return;
    setAnswers((a) => {
      const next = { ...a };
      if (sel) next[String(q.id)] = sel;
      else delete next[String(q.id)];
      return next;
    });
  }

  function saveAndNext() {
    saveCurrent(selected);
    if (idx < qs.length - 1) setIdx(idx + 1);
    else setShowPalette(true);
  }

  function markAndNext() {
    saveCurrent(selected);
    setMarked((m) => new Set(m).add(idx));
    if (idx < qs.length - 1) setIdx(idx + 1);
  }

  function clearResponse() {
    setSelected("");
    saveCurrent("");
  }

  async function doSubmit(auto = false) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);
    // Include current selection
    const finalAnswers: Record<string, string> = { ...answers };
    const q = qs[idx];
    if (q && selected) finalAnswers[String(q.id)] = selected;

    const totalSecs = (test?.duration_minutes || 60) * 60;
    try {
      const res = await fetch(`${API_URL}/mock-tests/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user?.id,
          mock_test_id: testId,
          answers: finalAnswers,
          time_taken_seconds: totalSecs - remaining,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Submit failed");
      setResult(d);
      setPhase("result");
      setConfirmSubmit(false);
    } catch (e: any) {
      submittedRef.current = false;
      setError(e.message);
      setConfirmSubmit(false);
      if (!auto) alert("Submit failed: " + e.message + " — try again");
    }
  }

  function qStatus(i: number): string {
    const q = qs[i];
    const answered = q && answers[String(q.id)];
    const isMarked = marked.has(i);
    if (answered && isMarked) return "am";
    if (isMarked) return "m";
    if (answered) return "a";
    if (visited.has(i)) return "na";
    return "nv";
  }

  const statusColor: Record<string, string> = { a: GREEN, na: RED, m: PURPLE, am: PURPLE, nv: GREY };

  const counts = { a: 0, na: 0, m: 0, am: 0, nv: 0 } as Record<string, number>;
  qs.forEach((_, i) => counts[qStatus(i)]++);

  const mmss = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  // ── LOADING / LOCKED ──
  if (phase === "loading")
    return (
      <Shell>
        <p style={{ color: "#8d8371", padding: 20 }}>Loading test...</p>
      </Shell>
    );

  if (phase === "locked")
    return (
      <Shell>
        <div style={{ padding: 40, textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <h2 style={{ fontSize: 18 }}>This test requires purchase</h2>
          <p style={{ color: "#9a917f", fontSize: 14 }}>{error || "Buy this test series in the Selection Lab app to attempt it."}</p>
          <button onClick={() => router.push("/mock-tests")} style={goldBtn}>
            Back to tests
          </button>
        </div>
      </Shell>
    );

  // ── INSTRUCTIONS ──
  if (phase === "instructions")
    return (
      <Shell>
        <div style={{ padding: 18, maxWidth: 560, margin: "0 auto" }}>
          <h1 style={{ fontSize: 21, fontWeight: 800 }}>{test?.title}</h1>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 16, margin: "14px 0" }}>
            {[
              ["Questions", qs.length],
              ["Duration", `${test?.duration_minutes} minutes`],
              ["Total marks", test?.total_marks],
              ["Negative marking", test?.negative_marking ? `−${test.negative_marking} per wrong answer` : "None"],
              ["Pass percentage", `${test?.pass_percentage}%`],
            ].map(([k, v]) => (
              <div key={String(k)} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,0.06)", fontSize: 14 }}>
                <span style={{ color: "#9a917f" }}>{k}</span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 13.5, color: "#cfc6b3", lineHeight: 1.7 }}>
            <p><b style={{ color: "#fff" }}>Instructions:</b></p>
            <p>• The timer starts as soon as you press Start. The test auto-submits when time ends.</p>
            <p>• <span style={{ color: "#5dd97c" }}>Green</span> = answered, <span style={{ color: "#ff8a8a" }}>Red</span> = seen but not answered, <span style={{ color: "#b79aec" }}>Purple</span> = marked for review, Grey = not visited.</p>
            <p>• Answers marked for review WILL be evaluated.</p>
            <p>• Do not refresh or close this page during the test — progress will be lost.</p>
          </div>
          <button onClick={startTest} style={{ ...goldBtn, width: "100%", padding: 15, fontSize: 16, marginTop: 10 }}>
            Start Test
          </button>
        </div>
      </Shell>
    );

  // ── RESULT ──
  if (phase === "result" && result)
    return (
      <Shell>
        <div style={{ padding: 18, maxWidth: 560, margin: "0 auto" }}>
          <div style={{ textAlign: "center", padding: "18px 0 6px" }}>
            <div style={{ fontSize: 46 }}>{result.passed ? "🏆" : "📊"}</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "8px 0 2px" }}>
              {result.passed ? "Congratulations!" : "Test Complete"}
            </h1>
            <span
              style={{
                display: "inline-block",
                marginTop: 6,
                padding: "4px 14px",
                borderRadius: 20,
                fontWeight: 800,
                fontSize: 13,
                background: result.passed ? "rgba(93,217,124,0.15)" : "rgba(255,107,107,0.12)",
                color: result.passed ? "#5dd97c" : "#ff8a8a",
                border: `1px solid ${result.passed ? "rgba(93,217,124,0.4)" : "rgba(255,107,107,0.35)"}`,
              }}
            >
              {result.passed ? "PASSED" : `NOT PASSED (need ${result.pass_percentage}%)`}
            </span>
          </div>

          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, textAlign: "center", margin: "14px 0" }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: GOLD }}>
              {result.score}
              <span style={{ fontSize: 17, color: "#9a917f" }}> / {result.total_marks}</span>
            </div>
            <div style={{ color: "#9a917f", fontSize: 13, marginTop: 2 }}>Your Score · Accuracy {result.accuracy}%</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {[
              ["Correct", result.correct, "#5dd97c"],
              ["Wrong", result.wrong, "#ff8a8a"],
              ["Skipped", result.skipped, "#9a917f"],
              ["Attempted", result.attempted, "#fff"],
            ].map(([k, v, c]) => (
              <div key={String(k)} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: String(c) }}>{v}</div>
                <div style={{ fontSize: 12, color: "#9a917f" }}>{k}</div>
              </div>
            ))}
          </div>

          <button onClick={() => setShowSolutions(!showSolutions)} style={{ ...goldBtn, width: "100%", marginTop: 16 }}>
            {showSolutions ? "Hide Solutions" : "View Solutions"}
          </button>
          <button onClick={() => router.push("/mock-tests")} style={{ ...ghostBtn, width: "100%", marginTop: 10 }}>
            Back to tests
          </button>

          {showSolutions && (
            <div style={{ marginTop: 18 }}>
              {qs.map((q, i) => {
                const my = answers[String(q.id)] || (i === idx ? selected : "") || null;
                const isCorrect = my === q.correct_answer;
                return (
                  <div key={q.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: "#9a917f", marginBottom: 6 }}>
                      Q{i + 1} ·{" "}
                      {my ? (
                        <span style={{ color: isCorrect ? "#5dd97c" : "#ff8a8a", fontWeight: 700 }}>
                          {isCorrect ? "Correct" : "Wrong"}
                        </span>
                      ) : (
                        <span style={{ color: "#9a917f" }}>Skipped</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.5 }}>{q.question}</div>
                    <div style={{ marginTop: 10 }}>
                      {(["A", "B", "C", "D"] as const).map((opt) => {
                        const text = q[`option_${opt.toLowerCase()}`];
                        const isAns = q.correct_answer === opt;
                        const isMine = my === opt;
                        return (
                          <div
                            key={opt}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 8,
                              marginBottom: 6,
                              fontSize: 13.5,
                              border: `1px solid ${isAns ? "rgba(93,217,124,0.5)" : isMine ? "rgba(255,107,107,0.5)" : "rgba(255,255,255,0.08)"}`,
                              background: isAns ? "rgba(93,217,124,0.08)" : isMine ? "rgba(255,107,107,0.07)" : "transparent",
                            }}
                          >
                            <b>{opt}.</b> {text} {isAns && "✓"} {isMine && !isAns && "✗ (your answer)"}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div style={{ marginTop: 8, fontSize: 13, color: "#cfc6b3", background: "rgba(255,171,0,0.05)", border: `1px dashed ${BORDER}`, borderRadius: 8, padding: "8px 10px" }}>
                        <b style={{ color: GOLD }}>Explanation:</b> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Shell>
    );

  // ── TEST PLAYER ──
  const q = qs[idx];
  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Top bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "rgba(13,11,8,0.97)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <div style={{ flex: 1, fontWeight: 700, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {test?.title}
        </div>
        <div
          style={{
            fontWeight: 800,
            fontSize: 15,
            fontVariantNumeric: "tabular-nums",
            color: remaining < 300 ? "#ff8a8a" : GOLD,
            border: `1px solid ${remaining < 300 ? "rgba(255,107,107,0.4)" : BORDER}`,
            borderRadius: 8,
            padding: "5px 10px",
          }}
        >
          ⏱ {mmss}
        </div>
        <button onClick={() => setShowPalette(!showPalette)} style={{ ...ghostBtn, padding: "7px 12px" }}>
          {showPalette ? "✕" : "☰"}
        </button>
      </header>

      {/* Question area */}
      <main style={{ flex: 1, padding: 16, paddingBottom: 130 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 15 }}>
            Question {idx + 1} <span style={{ color: "#9a917f", fontWeight: 600 }}>/ {qs.length}</span>
          </span>
          <span style={{ fontSize: 12, color: "#9a917f" }}>
            +{q?.marks} {test?.negative_marking ? `· −${test.negative_marking}` : ""}
          </span>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.6, fontWeight: 600, whiteSpace: "pre-wrap" }}>{q?.question}</div>

        <div style={{ marginTop: 16 }}>
          {(["A", "B", "C", "D"] as const).map((opt) => {
            const text = q?.[`option_${opt.toLowerCase()}`];
            const isSel = selected === opt;
            return (
              <div
                key={opt}
                onClick={() => setSelected(opt)}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  padding: "13px 14px",
                  borderRadius: 12,
                  marginBottom: 10,
                  cursor: "pointer",
                  border: `1.5px solid ${isSel ? GOLD : "rgba(255,255,255,0.12)"}`,
                  background: isSel ? "rgba(255,171,0,0.1)" : CARD,
                }}
              >
                <span
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 800,
                    flexShrink: 0,
                    background: isSel ? GOLD : "rgba(255,255,255,0.08)",
                    color: isSel ? "#1a1a1a" : "#fff",
                  }}
                >
                  {opt}
                </span>
                <span style={{ fontSize: 14.5, lineHeight: 1.5 }}>{text}</span>
              </div>
            );
          })}
        </div>
      </main>

      {/* Palette drawer */}
      {showPalette && (
        <div
          onClick={() => setShowPalette(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 20, display: "flex", justifyContent: "flex-end" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: 300, maxWidth: "85%", background: "#14110c", borderLeft: `1px solid ${BORDER}`, padding: 16, overflowY: "auto" }}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>Question Palette</h3>
            <div style={{ fontSize: 11.5, color: "#cfc6b3", lineHeight: 2, marginBottom: 12 }}>
              <Legend color={GREEN} label={`Answered (${counts.a + counts.am})`} />
              <Legend color={RED} label={`Not Answered (${counts.na})`} />
              <Legend color={PURPLE} label={`Marked for Review (${counts.m + counts.am})`} />
              <Legend color={GREY} label={`Not Visited (${counts.nv})`} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {qs.map((_, i) => {
                const st = qStatus(i);
                return (
                  <button
                    key={i}
                    onClick={() => {
                      saveCurrent(selected);
                      setIdx(i);
                      setShowPalette(false);
                    }}
                    style={{
                      aspectRatio: "1",
                      borderRadius: 8,
                      border: i === idx ? `2px solid ${GOLD}` : "1px solid rgba(255,255,255,0.15)",
                      background: statusColor[st],
                      color: "#fff",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "pointer",
                      position: "relative",
                    }}
                  >
                    {i + 1}
                    {st === "am" && (
                      <span style={{ position: "absolute", bottom: 2, right: 3, width: 7, height: 7, borderRadius: "50%", background: "#5dd97c" }} />
                    )}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setConfirmSubmit(true)} style={{ ...goldBtn, width: "100%", marginTop: 16 }}>
              Submit Test
            </button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(13,11,8,0.98)",
          borderTop: `1px solid ${BORDER}`,
          padding: "10px 12px",
          zIndex: 15,
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <button onClick={markAndNext} style={{ ...ghostBtn, flex: 1, fontSize: 12, padding: "10px 6px", color: "#b79aec", borderColor: "rgba(138,92,214,0.5)" }}>
            Mark for Review & Next
          </button>
          <button onClick={clearResponse} style={{ ...ghostBtn, 
            Save & Next
          </button>
        </div>
      </div>

      {/* Submit confirmation */}
      {confirmSubmit && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 30, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
        >
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20, maxWidth: 360, width: "100%" }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 17, textAlign: "center" }}>Submit test?</h3>
            <div style={{ fontSize: 13.5, lineHeight: 2, color: "#cfc6b3" }}>
              <div>✅ Answered: <b>{counts.a + counts.am}</b></div>
              <div>❌ Not answered: <b>{counts.na}</b></div>
              <div>🟣 Marked for review: <b>{counts.m + counts.am}</b></div>
              <div>⬜ Not visited: <b>{counts.nv}</b></div>
              <div>⏱ Time left: <b>{mmss}</b></div>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setConfirmSubmit(false)} style={{ ...ghostBtn, flex: 1 }}>
                Continue test
              </button>
              <button onClick={() => doSubmit()} style={{ ...goldBtn, flex: 1 }}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 14, height: 14, borderRadius: 4, background: color, display: "inline-block" }} />
      {label}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", background: BG, color: "#fff" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: "rgba(13,11,8,0.95)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <button onClick={() => router.push("/mock-tests")} style={{ ...ghostBtn, padding: "7px 12px" }}>
          ←
        </button>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          Mock <span style={{ color: GOLD }}>Test</span>
        </div>
      </header>
      {children}
    </div>
  );
}

const goldBtn: React.CSSProperties = {
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "#fff",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "12px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
