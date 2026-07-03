"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser, User } from "@/lib/api";

// ── Exam interface colors (light, Oliveboard/TCS style) ──
const BLUE = "#1e5aa8";
const BLUE_DARK = "#164a8c";
const GREEN = "#43a047";
const RED = "#e53935";
const PURPLE = "#8e44ad";
const GREY_BOX = "#eceff1";
const SIDEBAR = "#eaf0fa";
const TEXT = "#1c1c1c";
const GOLD = "#FFAB00";

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
  const [showInstructions, setShowInstructions] = useState(false);
  const [showQuestionPaper, setShowQuestionPaper] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showSolutions, setShowSolutions] = useState(false);
  const [lockInfo, setLockInfo] = useState<string>("");
  const [lang, setLang] = useState<"en" | "hi">("en");
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
          setLockInfo(typeof d.detail === "string" ? d.detail : "Purchase required to access this test");
          setPhase("locked");
          return;
        }
        if (!r.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Could not load test");
        setTest(d.mock_test);
        setQs(d.questions || []);
        setPhase("instructions");
      })
      .catch((e) => {
        setLockInfo(e.message);
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
      if (!res.ok) throw new Error(typeof d.detail === "string" ? d.detail : "Submit failed");
      setResult(d);
      setPhase("result");
      setConfirmSubmit(false);
    } catch (e: any) {
      submittedRef.current = false;
      setConfirmSubmit(false);
      if (!auto) alert("Submit failed: " + e.message + " — try again");
    }
  }

  // ── Status helpers ──
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

  const counts = { a: 0, na: 0, m: 0, am: 0, nv: 0 } as Record<string, number>;
  qs.forEach((_, i) => counts[qStatus(i)]++);

  const mmss = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;

  // ── Language helpers ──
  const hasHindi = qs.some((qq) => qq.question_hi);
  function isEnglishSection(qq: any) {
    return String(qq?.section || "").toLowerCase().includes("english");
  }
  function qText(qq: any) {
    if (lang === "hi" && qq?.question_hi && !isEnglishSection(qq)) return qq.question_hi;
    return qq?.question;
  }
  function optText(qq: any, opt: string) {
    const lower = opt.toLowerCase();
    if (lang === "hi" && !isEnglishSection(qq) && qq?.[`option_${lower}_hi`]) return qq[`option_${lower}_hi`];
    return qq?.[`option_${lower}`];
  }
  function expText(qq: any) {
    if (lang === "hi" && qq?.explanation_hi && !isEnglishSection(qq)) return qq.explanation_hi;
    return qq?.explanation;
  }

  // ── Sections (from question subjects) ──
  const sections: string[] = [];
  qs.forEach((q) => {
    if (!sections.includes(q.section || "General")) sections.push(q.section || "General");
  });
  const currentSection = qs[idx]?.section || "General";
  const sectionQuestionIdx = qs.map((q, i) => ({ q, i })).filter(({ q }) => (q.section || "General") === currentSection);

  function goToSection(s: string) {
    const first = qs.findIndex((q) => (q.section || "General") === s);
    if (first >= 0) {
      saveCurrent(selected);
      setIdx(first);
    }
  }

  function chipStyle(st: string, isCurrent: boolean): React.CSSProperties {
    const base: React.CSSProperties = {
      width: 34,
      height: 34,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: 13,
      cursor: "pointer",
      color: "#fff",
      border: isCurrent ? "2.5px solid #222" : "1px solid rgba(0,0,0,0.2)",
      position: "relative",
    };
    if (st === "a") return { ...base, background: GREEN, borderRadius: "6px 6px 14px 14px" };
    if (st === "na") return { ...base, background: RED, borderRadius: "14px 14px 6px 6px" };
    if (st === "m" || st === "am") return { ...base, background: PURPLE, borderRadius: "50%" };
    return { ...base, background: GREY_BOX, color: "#333", borderRadius: 4 };
  }

  // ═══════════ LOADING ═══════════
  if (phase === "loading")
    return (
      <LightShell>
        <p style={{ padding: 24, color: "#555" }}>Loading test...</p>
      </LightShell>
    );

  // ═══════════ LOCKED ═══════════
  if (phase === "locked")
    return (
      <LightShell>
        <div style={{ padding: 50, textAlign: "center", maxWidth: 420, margin: "0 auto" }}>
          <div style={{ fontSize: 44 }}>🔒</div>
          <h2 style={{ fontSize: 19, color: TEXT }}>This test requires purchase</h2>
          <p style={{ color: "#666", fontSize: 14 }}>{lockInfo || "Buy the test series to attempt this test."}</p>
          <button onClick={() => router.push("/mock-tests")} style={blueBtn}>
            Back to Tests
          </button>
        </div>
      </LightShell>
    );

  // ═══════════ INSTRUCTIONS ═══════════
  if (phase === "instructions")
    return (
      <LightShell title={test?.title}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: 18 }}>
          <h2 style={{ fontSize: 19, color: TEXT, borderBottom: "2px solid " + BLUE, paddingBottom: 8 }}>
            General Instructions
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", margin: "14px 0", fontSize: 14, color: TEXT }}>
            <tbody>
              {[
                ["Total Questions", qs.length],
                ["Duration", `${test?.duration_minutes} minutes`],
                ["Total Marks", test?.total_marks],
                ["Negative Marking", test?.negative_marking ? `−${test.negative_marking} per wrong answer` : "None"],
                ["Pass Percentage", `${test?.pass_percentage}%`],
              ].map(([k, v]) => (
                <tr key={String(k)}>
                  <td style={{ border: "1px solid #ccc", padding: "8px 12px", background: "#f5f7fa", fontWeight: 600, width: "50%" }}>{k}</td>
                  <td style={{ border: "1px solid #ccc", padding: "8px 12px" }}>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ fontSize: 13.5, color: "#333", lineHeight: 1.8 }}>
            <p>1. The clock will be set at the server. The countdown timer at the top right corner of screen will display the remaining time. When the timer reaches zero, the examination will end by itself.</p>
            <p>2. The Question Palette displayed on the right side of screen will show the status of each question using one of the following symbols:</p>
            <div style={{ display: "grid", gap: 8, margin: "10px 0 10px 12px" }}>
              <LegendRow color={GREY_BOX} textColor="#333" shape="4px" label="You have not visited the question yet." />
              <LegendRow color={RED} shape="14px 14px 6px 6px" label="You have not answered the question." />
              <LegendRow color={GREEN} shape="6px 6px 14px 14px" label="You have answered the question." />
              <LegendRow color={PURPLE} shape="50%" label="You have marked the question for review." />
            </div>
            <p>3. Questions <b>marked for review WILL be considered for evaluation</b> if answered.</p>
            <p>4. Click <b>Save &amp; Next</b> to save your answer and move to the next question. Click <b>Clear Response</b> to deselect your answer.</p>
            <p>5. Do <b>not</b> refresh or close this page during the test — your progress will be lost.</p>
          </div>
          <div style={{ textAlign: "center", marginTop: 18 }}>
            <button onClick={startTest} style={{ ...blueBtn, padding: "13px 60px", fontSize: 16 }}>
              I am ready to begin
            </button>
          </div>
        </div>
      </LightShell>
    );

  // ═══════════ RESULT ═══════════
  if (phase === "result" && result)
    return (
      <LightShell title={test?.title}>
        <div style={{ maxWidth: 640, margin: "0 auto", padding: 18 }}>
          <div style={{ textAlign: "center", padding: "14px 0 4px" }}>
            <div style={{ fontSize: 46 }}>{result.passed ? "🏆" : "📊"}</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: "8px 0 4px", color: TEXT }}>
              {result.passed ? "Congratulations!" : "Test Complete"}
            </h1>
            <span
              style={{
                display: "inline-block",
                padding: "4px 16px",
                borderRadius: 20,
                fontWeight: 800,
                fontSize: 13,
                background: result.passed ? "#e6f4e8" : "#fdeaea",
                color: result.passed ? GREEN : RED,
                border: `1px solid ${result.passed ? GREEN : RED}`,
              }}
            >
              {result.passed ? "PASSED" : `NOT PASSED (need ${result.pass_percentage}%)`}
            </span>
          </div>

          <div style={{ background: "#f5f8ff", border: `1px solid ${BLUE}`, borderRadius: 12, padding: 18, textAlign: "center", margin: "16px 0" }}>
            <div style={{ fontSize: 38, fontWeight: 800, color: BLUE }}>
              {result.score}
              <span style={{ fontSize: 17, color: "#777" }}> / {result.total_marks}</span>
            </div>
            <div style={{ color: "#666", fontSize: 13, marginTop: 2 }}>Your Score · Accuracy {result.accuracy}%</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
            {[
              ["Correct", result.correct, GREEN],
              ["Wrong", result.wrong, RED],
              ["Skipped", result.skipped, "#777"],
              ["Attempted", result.attempted, BLUE],
            ].map(([k, v, c]) => (
              <div key={String(k)} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 12, textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: String(c) }}>{v}</div>
                <div style={{ fontSize: 12, color: "#777" }}>{k}</div>
              </div>
            ))}
          </div>

          <button onClick={() => setShowSolutions(!showSolutions)} style={{ ...blueBtn, width: "100%", marginTop: 16 }}>
            {showSolutions ? "Hide Solutions" : "View Solutions"}
          </button>
          <button
            onClick={() => router.push("/mock-tests")}
            style={{ ...greyBtn, width: "100%", marginTop: 10 }}
          >
            Back to Tests
          </button>

          {showSolutions && (
            <div style={{ marginTop: 18 }}>
              {qs.map((q, i) => {
                const my = answers[String(q.id)] || null;
                const isCorrect = my === q.correct_answer;
                return (
                  <div key={q.id} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 10, padding: 14, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, color: "#777", marginBottom: 6 }}>
                      Q{i + 1} · {q.section}{" · "}
                      {my ? (
                        <span style={{ color: isCorrect ? GREEN : RED, fontWeight: 700 }}>{isCorrect ? "Correct" : "Wrong"}</span>
                      ) : (
                        <span>Skipped</span>
                      )}
                    </div>
                    <div style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.5, color: TEXT }}>{qText(q)}</div>
                    <div style={{ marginTop: 10 }}>
                      {(["A", "B", "C", "D"] as const).map((opt) => {
                        const text = optText(q, opt);
                        const isAns = q.correct_answer === opt;
                        const isMine = my === opt;
                        return (
                          <div
                            key={opt}
                            style={{
                              padding: "8px 10px",
                              borderRadius: 6,
                              marginBottom: 6,
                              fontSize: 13.5,
                              color: TEXT,
                              border: `1px solid ${isAns ? GREEN : isMine ? RED : "#e0e0e0"}`,
                              background: isAns ? "#e8f5e9" : isMine ? "#fdecea" : "#fff",
                            }}
                          >
                            <b>{opt}.</b> {text} {isAns && "✓"} {isMine && !isAns && "✗ (your answer)"}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && (
                      <div style={{ marginTop: 8, fontSize: 13, color: "#444", background: "#f5f8ff", border: `1px dashed ${BLUE}`, borderRadius: 6, padding: "8px 10px" }}>
                        <b style={{ color: BLUE }}>Explanation:</b> {expText(q)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </LightShell>
    );

  // ═══════════ TEST PLAYER ═══════════
  const q = qs[idx];

  const sidebar = (
    <div style={{ width: 280, background: SIDEBAR, borderLeft: "1px solid #c9d6ea", display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>
      {/* Candidate */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 12, borderBottom: "1px solid #c9d6ea" }}>
        <div style={{ width: 44, height: 44, borderRadius: 6, background: "#22304a", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>
          {(user?.name || "S").charAt(0).toUpperCase()}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, color: TEXT }}>{user?.name || "Student"}</div>
      </div>

      {/* Legend */}
      <div style={{ padding: 12, borderBottom: "1px solid #c9d6ea" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11.5, color: "#333" }}>
          <LegendCount color={GREEN} shape="6px 6px 14px 14px" n={counts.a + counts.am} label="Answered" />
          <LegendCount color={RED} shape="14px 14px 6px 6px" n={counts.na} label="Not Answered" />
          <LegendCount color={PURPLE} shape="50%" n={counts.m + counts.am} label="Marked" />
          <LegendCount color={GREY_BOX} textColor="#333" shape="4px" n={counts.nv} label="Not Visited" />
        </div>
      </div>

      {/* Palette */}
      <div style={{ padding: 12, flex: 1 }}>
        <div style={{ fontSize: 12, color: "#333", marginBottom: 8 }}>
          You are viewing <b>{currentSection}</b> section
          <br />
          <b>Question Palette:</b>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {sectionQuestionIdx.map(({ i }) => {
            const st = qStatus(i);
            return (
              <div
                key={i}
                onClick={() => {
                  saveCurrent(selected);
                  setIdx(i);
                  setShowPalette(false);
                }}
                style={chipStyle(st, i === idx)}
              >
                {i + 1}
                {st === "am" && (
                  <span style={{ position: "absolute", bottom: 1, right: 2, width: 8, height: 8, borderRadius: "50%", background: GREEN, border: "1px solid #fff" }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar buttons */}
      <div style={{ padding: 12, borderTop: "1px solid #c9d6ea", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <button onClick={() => setShowQuestionPaper(true)} style={sideBtn}>Question Paper</button>
        <button onClick={() => setShowInstructions(true)} style={sideBtn}>Instructions</button>
        <button
          onClick={() => setConfirmSubmit(true)}
          style={{ ...sideBtn, gridColumn: "1 / -1", background: BLUE, color: "#fff", border: "none", fontWeight: 800 }}
        >
          Submit
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#fff", color: TEXT }}>
      <style>{`
        .sl-sidebar-desktop { display: none; }
        @media (min-width: 900px) { .sl-sidebar-desktop { display: flex; } .sl-palette-btn { display: none !important; } }
        .sl-option:hover { background: #f0f5ff; }
      `}</style>

      {/* Blue header */}
      <div style={{ background: `linear-gradient(180deg, ${BLUE}, ${BLUE_DARK})`, color: "#fff", padding: "10px 14px", display: "flex", alignItems: "center", position: "relative" }}>
        <div style={{ fontWeight: 800, fontSize: 15, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {test?.title}
        </div>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, fontWeight: 800, fontSize: 16 }}>
          <img src="/logo.png" alt="" style={{ height: 26, width: 26, borderRadius: 4, objectFit: "contain" }} />
          <span className="sl-brand" style={{ whiteSpace: "nowrap" }}>
            Selection <span style={{ color: GOLD }}>Lab</span>
          </span>
        </div>
      </div>

      {/* Sections + timer bar */}
      <div style={{ background: "#fff", borderBottom: "1px solid #d5dce8", padding: "6px 10px", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", flex: 1, paddingBottom: 2 }}>
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => goToSection(s)}
              style={{
                padding: "6px 12px",
                fontSize: 12.5,
                fontWeight: 700,
                whiteSpace: "nowrap",
                cursor: "pointer",
                border: `1px solid ${s === currentSection ? BLUE : "#b9c8de"}`,
                background: s === currentSection ? "#d7e6fa" : "#eef3fa",
                color: s === currentSection ? BLUE_DARK : "#41537a",
                borderRadius: 4,
              }}
            >
              {s}
            </button>
          ))}
        </div>
        {hasHindi && (
          <select
            value={lang}
            onChange={(e) => setLang(e.target.value as "en" | "hi")}
            style={{ padding: "5px 6px", fontSize: 12.5, border: "1px solid #b9c8de", borderRadius: 4, background: "#fff", color: "#33436b", fontWeight: 700 }}
          >
            <option value="en">English</option>
            <option value="hi">हिंदी</option>
          </select>
        )}
        <div style={{ fontWeight: 800, fontSize: 14, fontVariantNumeric: "tabular-nums", color: remaining < 300 ? RED : TEXT, whiteSpace: "nowrap" }}>
          Time Left : {mmss}
        </div>
        <button className="sl-palette-btn" onClick={() => setShowPalette(true)} style={{ ...sideBtn, padding: "6px 10px" }}>
          ☰
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Question area */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e0e0e0", paddingBottom: 8, marginBottom: 12 }}>
            <span style={{ fontWeight: 800, fontSize: 15 }}>Question No {idx + 1}</span>
            <span style={{ fontSize: 12, color: "#666" }}>
              Marks: <b style={{ color: GREEN }}>+{q?.marks}</b>
              {test?.negative_marking ? (
                <>
                  {" / "}
                  <b style={{ color: RED }}>−{test.negative_marking}</b>
                </>
              ) : null}
            </span>
          </div>

          <div style={{ fontSize: 15.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{qText(q)}</div>

          <div style={{ marginTop: 18 }}>
            {(["A", "B", "C", "D"] as const).map((opt) => {
              const text = optText(q, opt);
              const isSel = selected === opt;
              return (
                <label
                  key={opt}
                  className="sl-option"
                  onClick={() => setSelected(opt)}
                  style={{
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                    padding: "10px 12px",
                    borderRadius: 6,
                    marginBottom: 6,
                    cursor: "pointer",
                    border: `1px solid ${isSel ? BLUE : "#e0e0e0"}`,
                    background: isSel ? "#e8f0fd" : "#fff",
                    fontSize: 14.5,
                    lineHeight: 1.5,
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "50%",
                      border: `2px solid ${isSel ? BLUE : "#999"}`,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {isSel && <span style={{ width: 9, height: 9, borderRadius: "50%", background: BLUE }} />}
                  </span>
                  <span>
                    <b>{opt.toLowerCase()})</b> {text}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Sidebar — desktop */}
        <div className="sl-sidebar-desktop" style={{ height: "100%" }}>
          {sidebar}
        </div>
      </div>

      {/* Sidebar — mobile drawer */}
      {showPalette && (
        <div onClick={() => setShowPalette(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 40, display: "flex", justifyContent: "flex-end" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ height: "100%" }}>
            {sidebar}
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div style={{ background: "#fff", borderTop: "1px solid #d5dce8", padding: "8px 10px", display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={markAndNext} style={{ ...greyBtn, flex: "1 1 auto", fontSize: 12.5 }}>
          Mark for Review &amp; Next
        </button>
        <button onClick={clearResponse} style={{ ...greyBtn, flex: "1 1 auto", fontSize: 12.5 }}>
          Clear Response
        </button>
        <button onClick={() => idx > 0 && setIdx(idx - 1)} disabled={idx === 0} style={{ ...greyBtn, flex: "0 1 auto", fontSize: 12.5, opacity: idx === 0 ? 0.45 : 1 }}>
          Previous
        </button>
        <button onClick={saveAndNext} style={{ ...blueBtn, flex: "2 1 auto" }}>
          Save &amp; Next
        </button>
      </div>

      {/* Question Paper modal */}
      {showQuestionPaper && (
        <Modal onClose={() => setShowQuestionPaper(false)} title="Question Paper">
          {qs.map((qq, i) => (
            <div key={qq.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee", fontSize: 13.5, color: TEXT }}>
              <b>Q{i + 1}.</b> {qText(qq)}
            </div>
          ))}
        </Modal>
      )}

      {/* Instructions modal */}
      {showInstructions && (
        <Modal onClose={() => setShowInstructions(false)} title="Instructions">
          <div style={{ fontSize: 13.5, color: "#333", lineHeight: 1.8 }}>
            <p>• The timer at the top right shows remaining time. The test auto-submits at zero.</p>
            <p>• <span style={{ color: GREEN, fontWeight: 700 }}>Green</span> = answered, <span style={{ color: RED, fontWeight: 700 }}>Red</span> = not answered, <span style={{ color: PURPLE, fontWeight: 700 }}>Purple</span> = marked for review, Grey = not visited.</p>
            <p>• Marked questions WILL be evaluated if answered.</p>
            <p>• Use Save &amp; Next to save your answer and move ahead.</p>
          </div>
        </Modal>
      )}

      {/* Submit confirmation */}
      {confirmSubmit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ background: "#fff", borderRadius: 10, padding: 20, maxWidth: 380, width: "100%", color: TEXT }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 17, textAlign: "center" }}>Submit test?</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
              <tbody>
                {[
                  ["Answered", counts.a + counts.am],
                  ["Not Answered", counts.na],
                  ["Marked for Review", counts.m + counts.am],
                  ["Not Visited", counts.nv],
                  ["Time Left", mmss],
                ].map(([k, v]) => (
                  <tr key={String(k)}>
                    <td style={{ border: "1px solid #ddd", padding: "7px 10px", background: "#f7f9fc" }}>{k}</td>
                    <td style={{ border: "1px solid #ddd", padding: "7px 10px", fontWeight: 700 }}>{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button onClick={() => setConfirmSubmit(false)} style={{ ...greyBtn, flex: 1 }}>
                Continue Test
              </button>
              <button onClick={() => doSubmit()} style={{ ...blueBtn, flex: 1 }}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── helpers ──
function LegendRow({ color, shape, label, textColor }: { color: string; shape: string; label: string; textColor?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
      <span style={{ width: 26, height: 26, background: color, borderRadius: shape, display: "inline-block", border: "1px solid rgba(0,0,0,0.15)" }} />
      <span style={{ color: textColor || "#333" }}>{label}</span>
    </div>
  );
}

function LegendCount({ color, shape, n, label, textColor }: { color: string; shape: string; n: number; label: string; textColor?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 26,
          height: 26,
          background: color,
          borderRadius: shape,
          color: textColor || "#fff",
          fontWeight: 800,
          fontSize: 12,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          border: "1px solid rgba(0,0,0,0.15)",
          flexShrink: 0,
        }}
      >
        {n}
      </span>
      {label}
    </div>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 10, maxWidth: 560, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #e0e0e0" }}>
          <b style={{ color: "#1c1c1c" }}>{title}</b>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#555" }}>✕</button>
        </div>
        <div style={{ padding: 16, overflowY: "auto" }}>{children}</div>
      </div>
    </div>
  );
}

function LightShell({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f4f6fa" }}>
      <div style={{ background: `linear-gradient(180deg, ${BLUE}, ${BLUE_DARK})`, color: "#fff", padding: "12px 16px", display: "flex", alignItems: "center", position: "relative" }}>
        <div style={{ fontWeight: 800, fontSize: 15, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title || "Mock Test"}</div>
        <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 8, fontWeight: 800 }}>
          <img src="/logo.png" alt="" style={{ height: 26, width: 26, borderRadius: 4, objectFit: "contain" }} />
          <span style={{ whiteSpace: "nowrap" }}>
            Selection <span style={{ color: GOLD }}>Lab</span>
          </span>
        </div>
      </div>
      {children}
    </div>
  );
}

const blueBtn: React.CSSProperties = {
  background: BLUE,
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "11px 20px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const greyBtn: React.CSSProperties = {
  background: "#f5f5f5",
  color: "#333",
  border: "1px solid #c9c9c9",
  borderRadius: 6,
  padding: "11px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};

const sideBtn: React.CSSProperties = {
  background: "#fff",
  color: "#33436b",
  border: "1px solid #b9c8de",
  borderRadius: 5,
  padding: "8px 6px",
  fontWeight: 700,
  fontSize: 11.5,
  cursor: "pointer",
};
