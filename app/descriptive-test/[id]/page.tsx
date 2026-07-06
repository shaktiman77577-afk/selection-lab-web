"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUser, User } from "@/lib/api";
import { API_URL } from "@/lib/config";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";

const SECTION_ORDER = ["Essay", "Letter", "Precis", "Translation"];
const SECTION_LABEL: Record<string, string> = {
  Essay: "Essay",
  Letter: "Letter",
  Precis: "Précis",
  Translation: "Translation",
};

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

function countWords(t: string): number {
  const m = (t || "").match(/[A-Za-z']+/g);
  return m ? m.length : 0;
}

function mmss(sec: number): string {
  const m = Math.floor(Math.max(0, sec) / 60);
  const s = Math.max(0, sec) % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function DescriptiveTestPlayer() {
  const router = useRouter();
  const params = useParams();
  const testId = Number((params as any)?.id);

  const [test, setTest] = useState<any>(null);
  const [sections, setSections] = useState<{ type: string; questions: any[] }[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({}); // section type -> chosen question id
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});   // qid -> marked for review
  const [visited, setVisited] = useState<Record<number, boolean>>({}); // qid -> visited
  const [curSection, setCurSection] = useState(0);
  const [paused, setPaused] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false); // mobile drawer
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [seriesId, setSeriesId] = useState<number | null>(null);

  const [phase, setPhase] = useState<"writing" | "submitting" | "done">("writing");
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [result, setResult] = useState<any>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [timeUsedSec, setTimeUsedSec] = useState(0);

  const submittedRef = useRef(false);
  const durationRef = useRef(0);

  // ── load test ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!testId) return;
    const u = getUser();
    const uid = (u as any)?.id ?? "";
    fetch(`${API_URL}/descriptive/test/${testId}?user_id=${uid}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (r.status === 403) {
          setLocked(true);
          if (d?.series_id) setSeriesId(d.series_id);
          return null;
        }
        if (!r.ok || d?.success === false) throw new Error(d?.detail || "Could not load test");
        return d;
      })
      .then((d) => {
        if (!d) return;
        setTest(d.test);
        setSeriesId(d.test?.series_id ?? null);
        const qs: any[] = d.questions || [];
        // group by q_type into ordered sections
        const groups: Record<string, any[]> = {};
        qs.forEach((q) => {
          const t = q.q_type || "Essay";
          (groups[t] = groups[t] || []).push(q);
        });
        const ordered: { type: string; questions: any[] }[] = [];
        SECTION_ORDER.forEach((t) => {
          if (groups[t]) { ordered.push({ type: t, questions: groups[t] }); delete groups[t]; }
        });
        Object.keys(groups).forEach((t) => ordered.push({ type: t, questions: groups[t] }));
        setSections(ordered);
        const sel: Record<string, number> = {};
        ordered.forEach((s) => { if (s.questions[0]) sel[s.type] = s.questions[0].id; });
        setSelected(sel);
        const dur = Number(d.test?.duration_min || 40);
        durationRef.current = dur * 60;
        setSecondsLeft(dur * 60);
      })
      .catch((e) => setError(e?.message || "Could not load test."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // ── countdown (pauses on Pause) ───────────────────────────────────────────
  useEffect(() => {
    if (phase !== "writing" || loading || locked || !test || paused) return;
    if (secondsLeft <= 0) {
      submit();
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase, loading, locked, test, paused]);

  // ── mark the currently-open question as visited (self-contained; runs every render before any early return) ──
  useEffect(() => {
    const s = sections[curSection];
    const qid = s ? (selected[s.type] ?? s.questions[0]?.id) : undefined;
    if (qid != null && phase === "writing") {
      setVisited((v) => (v[qid] ? v : { ...v, [qid]: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curSection, sections, selected, phase]);

  async function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setPhase("submitting");
    setError("");
    setTimeUsedSec(Math.max(0, durationRef.current - secondsLeft));
    const u = getUser();
    try {
      // exactly one chosen question per section
      const payloadAnswers = sections
        .map((s) => {
          const qid = selected[s.type] ?? s.questions[0]?.id;
          return { question_id: qid, answer_text: answers[qid] || "" };
        })
        .filter((a) => a.question_id != null);
      const res = await fetch(`${API_URL}/descriptive/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: (u as any)?.id, test_id: testId, answers: payloadAnswers }),
      }).then((r) => r.json());
      if (res?.success === false) throw new Error(res.detail || "Submit failed");
      setResult(res);
      setPhase("done");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setError(e?.message || "Could not submit. Please try again.");
      submittedRef.current = false;
      setPhase("writing");
    }
  }

  async function downloadPdf() {
    if (!result) return;
    setPdfBusy(true);
    try {
      const ok = await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
      if (!ok) throw new Error("PDF library failed to load.");
      const jsPDF = (window as any).jspdf?.jsPDF;
      if (!jsPDF) throw new Error("PDF library unavailable.");

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const M = 40; // margin
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const maxW = pageW - M * 2;
      let y = M;

      const ensure = (h: number) => {
        if (y + h > pageH - M) {
          doc.addPage();
          y = M;
        }
      };
      const write = (text: string, size: number, style: "normal" | "bold", color: number[] = [30, 30, 30]) => {
        doc.setFont("helvetica", style);
        doc.setFontSize(size);
        doc.setTextColor(color[0], color[1], color[2]);
        const lines = doc.splitTextToSize(text || "—", maxW);
        for (const ln of lines) {
          ensure(size + 4);
          doc.text(ln, M, y);
          y += size + 4;
        }
      };
      const gap = (h: number) => {
        y += h;
      };

      // Title
      write(test?.title || "Descriptive Test", 18, "bold", [26, 47, 85]);
      write(`Total score: ${result.grand_total} / ${result.grand_max}`, 12, "bold", [200, 130, 0]);
      gap(6);

      (result.results || []).forEach((r: any, i: number) => {
        const s = r.score || {};
        ensure(40);
        doc.setDrawColor(220, 220, 220);
        doc.line(M, y, pageW - M, y);
        gap(12);
        write(`Q${i + 1} · ${r.q_type || "Essay"}`, 12, "bold", [26, 47, 85]);
        write(r.question || "", 11, "normal");
        gap(4);
        write(
          `Score: ${s.total_score ?? 0}/${s.total_max ?? 0}  ` +
            `(Word ${s.word_count_score ?? 0}/${s.max_word_marks ?? 0}, ` +
            `Spelling ${s.spelling_score ?? 0}/${s.max_spelling_marks ?? 0}, ` +
            `Grammar ${s.grammar_score ?? 0}/${s.max_grammar_marks ?? 0})  ` +
            `· ${s.word_count ?? 0} words`,
          10,
          "bold",
          [90, 90, 90]
        );
        gap(4);
        if (s.length_note) {
          write(`${s.length_label || "Length"}: ${s.length_note}`, 10, "normal", [120, 90, 30]);
          gap(2);
        }
        write("Your Answer:", 11, "bold");
        write(r.your_answer || "(left blank)", 11, "normal", [60, 60, 60]);
        gap(4);
        write("Grammar feedback:", 11, "bold");
        if (s.grammar_checked === false) {
          write("Grammar check was unavailable.", 10, "normal", [110, 110, 110]);
        } else if (s.grammar_word_capped) {
          write("Many words were not recognised as English; grammar could not be fully assessed.", 10, "normal", [110, 110, 110]);
        } else if (!s.grammar_issues || s.grammar_issues.length === 0) {
          write("No major grammar error found.", 10, "normal", [46, 139, 74]);
        } else {
          s.grammar_issues.forEach((it: any, k: number) => {
            const sugg = (it.suggestions || []).filter(Boolean);
            const line = `${k + 1}. ${it.short || it.message || "Issue"}` + (sugg.length ? `  ->  ${sugg.join(", ")}` : "");
            write(line, 10, "normal", [90, 70, 70]);
          });
        }
        gap(4);
        write("Model Answer:", 11, "bold");
        write(r.sample_answer || "—", 11, "normal", [60, 60, 60]);
        if (r.explanation) {
          gap(4);
          write("Examiner's Tips:", 11, "bold", [200, 130, 0]);
          write(r.explanation, 10, "normal", [80, 70, 40]);
        }
        gap(8);
      });

      const fname = (test?.title || "descriptive-test").replace(/[^a-z0-9]+/gi, "_").toLowerCase();
      doc.save(`${fname}_result.pdf`);
    } catch (e: any) {
      setError(e?.message || "Could not create PDF.");
    } finally {
      setPdfBusy(false);
    }
  }

  // ── locked / error / loading states ─────────────────────────────────────────
  if (loading) {
    return <Centered>Loading…</Centered>;
  }
  if (locked) {
    return (
      <Centered>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <p style={{ fontSize: 15, fontWeight: 700, margin: "10px 0" }}>This test is locked.</p>
          <button onClick={() => router.push(seriesId ? `/descriptive/${seriesId}` : "/descriptive")} style={goldBtn}>
            Go to series
          </button>
        </div>
      </Centered>
    );
  }
  if (error && !test) {
    return <Centered>{error}</Centered>;
  }

  const sec = sections[curSection];
  const isLast = curSection >= sections.length - 1;
  const selQid = sec ? (selected[sec.type] ?? sec.questions[0]?.id) : undefined;
  const selQ = sec ? (sec.questions.find((q) => q.id === selQid) || sec.questions[0]) : undefined;
  const wc = selQid != null ? countWords(answers[selQid] || "") : 0;
  const target = selQ?.word_limit ?? 250;
  const userName = (getUser() as any)?.name || "Candidate";

  // ── palette status logic (Oliveboard legend) ────────────────────────────────
  // green = answered · red = visited but not answered · purple = marked · grey = not visited
  type QStatus = "answered" | "notAnswered" | "marked" | "notVisited";
  function qStatus(qid: number): QStatus {
    if (marked[qid]) return "marked";
    if ((answers[qid] || "").trim() !== "") return "answered";
    if (visited[qid]) return "notAnswered";
    return "notVisited";
  }
  const STATUS_BG: Record<QStatus, string> = { answered: "#3aa655", notAnswered: "#d64545", marked: "#8e44ad", notVisited: "var(--chip)" };
  const STATUS_FG: Record<QStatus, string> = { answered: "#fff", notAnswered: "#fff", marked: "#fff", notVisited: "var(--text)" };
  const allQuestions = sections.flatMap((s) => s.questions.map((q) => ({ ...q, secType: s.type })));
  const counts = allQuestions.reduce(
    (a, q) => { a[qStatus(q.id)] += 1; return a; },
    { answered: 0, notAnswered: 0, marked: 0, notVisited: 0 } as Record<QStatus, number>
  );

  function gotoQuestion(q: any) {
    const si = sections.findIndex((s) => s.type === q.secType);
    if (si >= 0) {
      setCurSection(si);
      setSelected((p) => ({ ...p, [q.secType]: q.id }));
      setVisited((v) => ({ ...v, [q.id]: true }));
      setPaletteOpen(false);
    }
  }

  function saveAndNext() {
    if (!isLast) setCurSection((c) => c + 1);
    else if (confirm("This is the last section. Submit the whole test?")) submit();
  }
  function markAndNext() {
    if (selQid != null) setMarked((m) => ({ ...m, [selQid]: !m[selQid] }));
    if (!isLast) setCurSection((c) => c + 1);
  }
  function clearResponse() {
    if (selQid != null && confirm("Clear your answer for this question?")) {
      setAnswers((a) => ({ ...a, [selQid]: "" }));
    }
  }

  const smallGold: React.CSSProperties = { ...goldBtn, padding: "7px 12px", fontSize: 13 };
  const ghostBtn: React.CSSProperties = { background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 14px", fontWeight: 700, fontSize: 13, cursor: "pointer" };

  // ── sidebar (legend + palette + submit) — shared desktop/mobile ─────────────
  const Sidebar = (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 14, boxShadow: "var(--shadow)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: NAVY, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0 }}>
          {userName.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 13.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName}</div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>Time left: <b style={{ color: secondsLeft <= 60 ? "#e05555" : "var(--text)" }}>{mmss(secondsLeft)}</b></div>
        </div>
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, margin: "10px 0 6px" }}>Legend</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontSize: 11 }}>
        {([["answered", "Answered"], ["notAnswered", "Not Answered"], ["marked", "Marked"], ["notVisited", "Not Visited"]] as [QStatus, string][]).map(([k, label]) => (
          <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 20, height: 20, borderRadius: 6, background: STATUS_BG[k], color: STATUS_FG[k], display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 10, border: k === "notVisited" ? "1px solid var(--line)" : "none" }}>{counts[k]}</span>
            <span style={{ color: "var(--muted)" }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 12, fontWeight: 800, margin: "12px 0 6px" }}>Question Palette</div>
      {sections.map((s) => (
        <div key={s.type} style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: "var(--muted)", textTransform: "uppercase", marginBottom: 4 }}>{SECTION_LABEL[s.type] || s.type}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {s.questions.map((q) => {
              const num = allQuestions.findIndex((x) => x.id === q.id) + 1;
              const st = qStatus(q.id);
              const isCur = q.id === selQid && s.type === sec?.type;
              return (
                <button key={q.id} onClick={() => gotoQuestion({ ...q, secType: s.type })}
                  style={{ width: 32, height: 32, borderRadius: 8, fontWeight: 800, fontSize: 12.5, cursor: "pointer", background: STATUS_BG[st], color: STATUS_FG[st], border: isCur ? `2px solid ${GOLD}` : st === "notVisited" ? "1px solid var(--line)" : "none" }}>
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      ))}

      <button onClick={() => { if (confirm(`Answered: ${counts.answered} / ${allQuestions.length}\nSubmit the whole test?`)) submit(); }} disabled={phase === "submitting"}
        style={{ ...goldBtn, width: "100%", marginTop: 8, opacity: phase === "submitting" ? 0.6 : 1 }}>
        {phase === "submitting" ? "Scoring…" : "Submit Test"}
      </button>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Pause overlay */}
      {paused && phase === "writing" && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(0,0,0,0.78)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", textAlign: "center", padding: 20 }}>
          <div>
            <div style={{ fontSize: 44 }}>⏸️</div>
            <p style={{ fontSize: 17, fontWeight: 800, margin: "10px 0 4px" }}>Test paused</p>
            <p style={{ fontSize: 13, opacity: 0.8, marginBottom: 18 }}>Timer stopped at {mmss(secondsLeft)}</p>
            <button onClick={() => setPaused(false)} style={goldBtn}>▶ Resume test</button>
          </div>
        </div>
      )}

      {/* Mobile palette drawer */}
      {paletteOpen && phase === "writing" && (
        <div onClick={() => setPaletteOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90, background: "rgba(0,0,0,0.5)" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 290, maxWidth: "85%", background: "var(--bg)", padding: 12, overflowY: "auto" }}>
            {Sidebar}
          </div>
        </div>
      )}

      {/* Header: title · timer · pause · palette toggle */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: NAVY, color: "#fff", borderBottom: "1px solid var(--line)" }}>
        <div style={{ fontWeight: 800, fontSize: 15, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {test?.title || "Descriptive Test"}
        </div>
        {phase !== "done" && (
          <>
            <div style={{ fontWeight: 800, fontSize: 14.5, color: secondsLeft <= 60 ? "#ff9b9b" : "#fff", background: "rgba(255,255,255,0.14)", borderRadius: 10, padding: "6px 10px", minWidth: 70, textAlign: "center" }}>
              ⏱ {mmss(secondsLeft)}
            </div>
            <button onClick={() => setPaused((p) => !p)} aria-label="Pause" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "none", borderRadius: 10, padding: "7px 11px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>{paused ? "▶" : "⏸ Pause"}</button>
            <button onClick={() => setPaletteOpen(true)} aria-label="Palette" className="sl-palette-btn" style={{ background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "7px 11px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>☰</button>
          </>
        )}
      </header>

      {/* Section tabs (Oliveboard blue strip style) */}
      {phase !== "done" && sections.length > 0 && (
        <nav style={{ display: "flex", gap: 6, padding: "8px 14px", overflowX: "auto", borderBottom: "1px solid var(--line)", background: "var(--header)", whiteSpace: "nowrap" }}>
          {sections.map((s, i) => {
            const active = i === curSection;
            const secAnswered = s.questions.some((q) => (answers[q.id] || "").trim() !== "");
            return (
              <button key={s.type} onClick={() => setCurSection(i)}
                style={{ borderRadius: 8, padding: "7px 14px", fontSize: 13, fontWeight: 800, cursor: "pointer", flexShrink: 0, border: active ? "none" : "1px solid var(--line)", background: active ? GOLD : "var(--card)", color: active ? "#1a1a1a" : "var(--text)" }}>
                {SECTION_LABEL[s.type] || s.type}{secAnswered ? " ✓" : ""}
              </button>
            );
          })}
        </nav>
      )}

      <main style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 16px 110px" }}>
        {error ? <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 12 }}>{error}</p> : null}

        {phase === "done" && result ? (
          <div style={{ maxWidth: 820, margin: "0 auto" }}>
            <ResultView result={result} onPdf={downloadPdf} pdfBusy={pdfBusy} timeUsedSec={timeUsedSec} onExit={() => router.push(seriesId ? `/descriptive/${seriesId}` : "/descriptive")} />
          </div>
        ) : sec ? (
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            {/* LEFT: question + answer */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{SECTION_LABEL[sec.type] || sec.type}</div>
                {sec.questions.length > 1 ? (
                  <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 2 }}>
                    Read both questions below and <b style={{ color: "var(--text)" }}>select the ONE</b> you want to attempt. Only your selected question is scored.
                  </div>
                ) : null}
              </div>

              {sec.questions.map((q, qi) => {
                const multi = sec.questions.length > 1;
                const active = q.id === selQid;
                const qWc = countWords(answers[q.id] || "");
                const qTarget = q.word_limit ?? 250;
                const hasDraft = (answers[q.id] || "").trim() !== "";
                return (
                  <div
                    key={q.id}
                    onClick={() => { if (multi && !active) setSelected((p) => ({ ...p, [sec.type]: q.id })); }}
                    style={{
                      background: "var(--card)",
                      border: active ? `2px solid ${GOLD}` : "1px solid var(--line)",
                      borderRadius: 14, padding: 16, boxShadow: "var(--shadow)", marginBottom: 12,
                      cursor: multi && !active ? "pointer" : "default",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
                      {multi ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 800, color: active ? GOLD : "var(--muted)" }}>
                          <span style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${active ? GOLD : "var(--muted)"}`, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {active ? <span style={{ width: 8, height: 8, borderRadius: "50%", background: GOLD }} /> : null}
                          </span>
                          Question {qi + 1}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#1a1a1a", background: GOLD, borderRadius: 6, padding: "2px 8px" }}>
                          Question No {allQuestions.findIndex((x) => x.id === q.id) + 1}
                        </span>
                      )}
                      {q.marks != null ? <span style={{ fontSize: 12, color: "var(--muted)" }}>{q.marks} marks</span> : null}
                      {marked[q.id] ? <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: "#8e44ad", borderRadius: 6, padding: "2px 8px" }}>Marked</span> : null}
                      {multi && !active ? <span style={{ marginLeft: "auto", fontSize: 11.5, fontWeight: 800, color: GOLD }}>Tap to choose ›</span> : null}
                    </div>

                    <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.55, margin: "0 0 12px", whiteSpace: "pre-wrap" }}>{q.question}</p>

                    {(!multi || active) ? (
                      <>
                        <textarea
                          value={answers[q.id] || ""}
                          onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                          onPaste={(e) => e.preventDefault()}        /* block paste */
                          onDrop={(e) => e.preventDefault()}         /* block drag-drop */
                          onContextMenu={(e) => e.preventDefault()}  /* no right-click Paste */
                          onKeyDown={(e) => { if (e.key === "Tab" || e.key === "Enter") e.preventDefault(); }} /* Tab + Enter blocked */
                          placeholder="Write your answer here…"
                          rows={13}
                          disabled={phase === "submitting"}
                          style={{ width: "100%", boxSizing: "border-box", borderRadius: 10, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--text)", padding: 12, fontSize: 14.5, lineHeight: 1.6, resize: "vertical" }}
                        />
                        <div style={{ marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                          Words: <b style={{ color: qWc > qTarget ? "#e07b00" : "var(--text)" }}>{qWc}</b> / {qTarget}
                        </div>
                        <div style={{ marginTop: 4, fontSize: 11, color: "var(--muted)" }}>
                          ✍️ Type your answer — paste is disabled for a fair test.
                        </div>
                      </>
                    ) : hasDraft ? (
                      <div style={{ fontSize: 11.5, color: "#e0a13a" }}>You started answering this one. Tap to switch back — your draft is kept, but only the selected question is scored.</div>
                    ) : null}
                  </div>
                );
              })}
            </div>

            {/* RIGHT: sidebar (desktop only) */}
            <div className="sl-sidebar" style={{ width: 270, flexShrink: 0 }}>
              {Sidebar}
            </div>
          </div>
        ) : (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>This test has no questions yet.</p>
        )}
      </main>

      {/* Bottom action bar (Oliveboard style) */}
      {phase === "writing" && sec && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 60, background: "var(--header)", borderTop: "1px solid var(--line)", padding: "10px 14px", display: "flex", gap: 8, justifyContent: "space-between", backdropFilter: "blur(8px)" }}>
          <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
            <button onClick={markAndNext} style={{ ...ghostBtn, whiteSpace: "nowrap" }}>Mark for Review &amp; Next</button>
            <button onClick={clearResponse} style={{ ...ghostBtn, whiteSpace: "nowrap" }}>Clear Response</button>
          </div>
          <button onClick={saveAndNext} style={{ ...smallGold, padding: "9px 18px", whiteSpace: "nowrap" }}>
            {isLast ? "Save & Submit" : "Save & Next"}
          </button>
        </div>
      )}

      {/* responsive: hide desktop sidebar on small screens */}
      <style>{`
        @media (max-width: 860px) { .sl-sidebar { display: none; } }
        @media (min-width: 861px) { .sl-palette-btn { display: none; } }
      `}</style>
    </div>
  );
}

// ── Result view ───────────────────────────────────────────────────────────────
function ResultView({ result, onPdf, pdfBusy, onExit, timeUsedSec }: { result: any; onPdf: () => void; pdfBusy: boolean; onExit: () => void; timeUsedSec: number }) {
  const results: any[] = result.results || [];
  const agg = results.reduce(
    (a: any, r: any) => {
      const s = r.score || {};
      a.w += Number(s.word_count_score || 0); a.wm += Number(s.max_word_marks || 0);
      a.sp += Number(s.spelling_score || 0); a.spm += Number(s.max_spelling_marks || 0);
      a.gr += Number(s.grammar_score || 0); a.grm += Number(s.max_grammar_marks || 0);
      a.words += Number(s.word_count || 0);
      if ((r.your_answer || "").trim()) a.attempted += 1;
      return a;
    },
    { w: 0, wm: 0, sp: 0, spm: 0, gr: 0, grm: 0, words: 0, attempted: 0 }
  );
  const pct = result.grand_max > 0 ? (result.grand_total / result.grand_max) * 100 : 0;
  const v = verdictBand(pct);

  return (
    <div>
      {/* Hero scorecard */}
      <section style={{ background: `linear-gradient(135deg, ${NAVY}, #2c4a85)`, borderRadius: 18, padding: "22px 20px", color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          <ScoreRing pct={pct} color={v.color} />
          <div style={{ flex: 1, minWidth: 170 }}>
            <span style={{ display: "inline-block", background: v.color, color: "#10240f", fontWeight: 800, fontSize: 12.5, padding: "4px 12px", borderRadius: 20 }}>{v.label}</span>
            <div style={{ fontSize: 30, fontWeight: 800, margin: "8px 0 2px" }}>
              {result.grand_total} <span style={{ fontSize: 17, opacity: 0.75 }}>/ {result.grand_max}</span>
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.8 }}>marks scored</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <HeroStat label="Time taken" value={mmss(timeUsedSec)} />
          <HeroStat label="Words written" value={String(agg.words)} />
          <HeroStat label="Attempted" value={`${agg.attempted}/${results.length}`} />
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
          <button onClick={onPdf} disabled={pdfBusy} style={{ ...goldBtn, opacity: pdfBusy ? 0.6 : 1 }}>
            {pdfBusy ? "Preparing…" : "⬇ Download PDF"}
          </button>
          <button onClick={onExit} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 10, padding: "11px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            Back to series
          </button>
        </div>
      </section>

      {/* Aggregated breakdown — only when there are multiple questions */}
      {results.length > 1 && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 16, boxShadow: "var(--shadow)", marginTop: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Performance breakdown</div>
          <ScoreBar label="Length / format" got={agg.w} max={agg.wm} />
          <ScoreBar label="Spelling" got={agg.sp} max={agg.spm} />
          <ScoreBar label="Grammar" got={agg.gr} max={agg.grm} />
        </div>
      )}

      {results.map((r: any, i: number) => {
        const s = r.score || {};
        return (
          <div key={r.question_id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 16, boxShadow: "var(--shadow)", marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1a1a1a", background: GOLD, borderRadius: 6, padding: "2px 8px" }}>{r.q_type || "Essay"}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Question {i + 1}</span>
              <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 15, color: barColor(s.total_score, s.total_max) }}>{s.total_score ?? 0}/{s.total_max ?? 0}</span>
            </div>
            <p style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.5, margin: "0 0 12px" }}>{r.question}</p>

            {/* score bars */}
            <ScoreBar label={s.length_label || "Word count"} got={s.word_count_score} max={s.max_word_marks} extra={`${s.word_count ?? 0} / ${s.target_words ?? 0} words`} />
            <ScoreBar label="Spelling" got={s.spelling_score} max={s.max_spelling_marks} extra={`${s.spelling_correct ?? 0}/${s.spelling_total ?? 0} correct`} />
            <ScoreBar label="Grammar" got={s.grammar_score} max={s.max_grammar_marks} extra={s.grammar_checked === false ? "check unavailable" : s.grammar_word_capped ? "non-English words" : `${s.grammar_errors ?? 0} issue${(s.grammar_errors ?? 0) === 1 ? "" : "s"}`} />
            {s.length_note ? (
              <div style={{ fontSize: 12, color: "var(--muted)", background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 8, padding: "7px 10px", marginTop: 2 }}>
                {(r.q_type === "Letter" && s.letter_format && !(s.letter_format.salutation && s.letter_format.subject && s.letter_format.closing)) ? "⚠️ " : "ℹ️ "}
                {s.length_note}
              </div>
            ) : null}

            {/* answers comparison */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>YOUR ANSWER</div>
              <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {r.your_answer || <span style={{ color: "var(--muted)" }}>(left blank)</span>}
              </div>
            </div>

            <GrammarFeedback s={s} />

            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#2e8b4a", marginBottom: 4 }}>MODEL ANSWER</div>
              <div style={{ background: "rgba(46,139,74,0.06)", border: "1px solid rgba(46,139,74,0.3)", borderRadius: 10, padding: 12, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {r.sample_answer || <span style={{ color: "var(--muted)" }}>—</span>}
              </div>
            </div>
            {r.explanation ? (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, color: GOLD, marginBottom: 4 }}>💡 EXAMINER&apos;S TIPS</div>
                <div style={{ background: "rgba(255,171,0,0.07)", border: `1px solid rgba(255,171,0,0.35)`, borderRadius: 10, padding: 12, fontSize: 13.5, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                  {r.explanation}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function GrammarFeedback({ s }: { s: any }) {
  const box: React.CSSProperties = {
    background: "var(--bg)",
    border: "1px solid var(--line)",
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    lineHeight: 1.6,
  };
  const issues: any[] = s?.grammar_issues || [];

  let body: React.ReactNode;
  if (s?.grammar_checked === false) {
    body = <div style={{ ...box, color: "var(--muted)" }}>Grammar check was unavailable for this attempt.</div>;
  } else if (s?.grammar_word_capped) {
    body = <div style={{ ...box, color: "var(--muted)" }}>Many words weren&apos;t recognised as English, so grammar couldn&apos;t be fully assessed.</div>;
  } else if (issues.length === 0) {
    body = <div style={{ ...box, color: "#2e8b4a", fontWeight: 600 }}>✓ No major grammar error found.</div>;
  } else {
    body = (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {issues.map((it, i) => {
          const sugg = (it.suggestions || []).filter(Boolean);
          const kindLabel = it.kind === "punctuation" ? "Punctuation" : it.kind === "capitalization" ? "Capitalization" : "Grammar";
          const kindColor = it.kind === "punctuation" ? "#2980b9" : it.kind === "capitalization" ? "#8e44ad" : "#c0392b";
          return (
            <div key={i} style={box}>
              <div style={{ fontWeight: 700 }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", background: kindColor, borderRadius: 5, padding: "1px 7px", marginRight: 6, verticalAlign: "middle" }}>{kindLabel}</span>
                {i + 1}. {it.short || it.message || "Issue"}
              </div>
              {it.short && it.message && it.message !== it.short ? (
                <div style={{ color: "var(--muted)", marginTop: 2 }}>{it.message}</div>
              ) : null}
              {it.text ? <div style={{ marginTop: 4, fontStyle: "italic" }}>“…{it.text}…”</div> : null}
              {sugg.length ? <div style={{ marginTop: 4, color: "#2e8b4a" }}>Suggestion: {sugg.join(", ")}</div> : null}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 12.5, fontWeight: 800, color: "#7c3aed", marginBottom: 4 }}>GRAMMAR CORRECTION</div>
      {body}
    </div>
  );
}

function ScoreBar({ label, got, max, extra }: { label: string; got: number; max: number; extra?: string }) {
  const g = Number(got || 0);
  const m = Number(max || 0);
  const pct = m > 0 ? Math.max(0, Math.min(100, (g / m) * 100)) : 0;
  const fill = barColor(g, m);
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 3 }}>
        <span style={{ fontWeight: 700 }}>{label}</span>
        <span style={{ color: "var(--muted)" }}>
          {extra ? <span style={{ marginRight: 8 }}>{extra}</span> : null}
          <b style={{ color: "var(--text)" }}>{g}/{m}</b>
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 6, background: "var(--chip)", overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: fill }} />
      </div>
    </div>
  );
}

function barColor(got: number, max: number): string {
  const m = Number(max || 0);
  const ratio = m > 0 ? Number(got || 0) / m : 0;
  return ratio >= 0.8 ? "#2e8b4a" : ratio >= 0.5 ? GOLD : "#e05555";
}

function verdictBand(pct: number): { label: string; color: string } {
  if (pct >= 80) return { label: "Excellent", color: "#4cc46a" };
  if (pct >= 60) return { label: "Good", color: GOLD };
  if (pct >= 40) return { label: "Needs work", color: "#f0932b" };
  return { label: "Keep practising", color: "#ff8a8a" };
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ flex: 1, minWidth: 92, background: "rgba(255,255,255,0.1)", borderRadius: 12, padding: "10px 12px" }}>
      <div style={{ fontSize: 17, fontWeight: 800 }}>{value}</div>
      <div style={{ fontSize: 11, opacity: 0.8, marginTop: 1 }}>{label}</div>
    </div>
  );
}

function ScoreRing({ pct, color }: { pct: number; color: string }) {
  const r = 46;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct));
  const off = c * (1 - p / 100);
  return (
    <svg width="118" height="118" viewBox="0 0 118 118" style={{ flexShrink: 0 }}>
      <circle cx="59" cy="59" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="10" />
      <circle cx="59" cy="59" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} transform="rotate(-90 59 59)" />
      <text x="59" y="55" textAnchor="middle" fontSize="27" fontWeight="800" fill="#fff">{Math.round(p)}%</text>
      <text x="59" y="75" textAnchor="middle" fontSize="10.5" fill="rgba(255,255,255,0.7)">score</text>
    </svg>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontSize: 14 }}>
      {children}
    </div>
  );
}

const goldBtn: React.CSSProperties = {
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 10,
  padding: "11px 18px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};
