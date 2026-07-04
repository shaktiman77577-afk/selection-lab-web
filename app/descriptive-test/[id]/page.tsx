"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUser, User } from "@/lib/api";
import { API_URL } from "@/lib/config";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";

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
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [seriesId, setSeriesId] = useState<number | null>(null);

  const [phase, setPhase] = useState<"writing" | "submitting" | "done">("writing");
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [result, setResult] = useState<any>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const submittedRef = useRef(false);

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
        setQuestions(d.questions || []);
        const dur = Number(d.test?.duration_min || 30);
        setSecondsLeft(dur * 60);
      })
      .catch((e) => setError(e?.message || "Could not load test."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  // ── countdown ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== "writing" || loading || locked || !test) return;
    if (secondsLeft <= 0) {
      submit();
      return;
    }
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, phase, loading, locked, test]);

  async function submit() {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setPhase("submitting");
    setError("");
    const u = getUser();
    try {
      const payload = {
        user_id: (u as any)?.id,
        test_id: testId,
        answers: questions.map((q) => ({ question_id: q.id, answer_text: answers[q.id] || "" })),
      };
      const res = await fetch(`${API_URL}/descriptive/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
        write("Your Answer:", 11, "bold");
        write(r.your_answer || "(left blank)", 11, "normal", [60, 60, 60]);
        gap(4);
        write("Model Answer:", 11, "bold");
        write(r.sample_answer || "—", 11, "normal", [60, 60, 60]);
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

  const totalWords = questions.reduce((n, q) => n + countWords(answers[q.id] || ""), 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      {/* Sticky timer bar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "var(--header)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <div style={{ fontWeight: 800, fontSize: 15, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {test?.title || "Descriptive Test"}
        </div>
        {phase !== "done" && (
          <div
            style={{
              fontWeight: 800,
              fontSize: 15,
              color: secondsLeft <= 60 ? "#e05555" : "var(--text)",
              background: "var(--chip)",
              borderRadius: 10,
              padding: "6px 12px",
              minWidth: 74,
              textAlign: "center",
            }}
          >
            ⏱ {mmss(secondsLeft)}
          </div>
        )}
      </header>

      <main style={{ maxWidth: 820, margin: "0 auto", padding: "16px 16px 60px" }}>
        {error ? <p style={{ color: "#c0392b", fontSize: 13, marginBottom: 12 }}>{error}</p> : null}

        {phase === "done" && result ? (
          <ResultView result={result} onPdf={downloadPdf} pdfBusy={pdfBusy} onExit={() => router.push(seriesId ? `/descriptive/${seriesId}` : "/descriptive")} />
        ) : (
          <>
            {questions.map((q, i) => {
              const wc = countWords(answers[q.id] || "");
              const target = q.word_limit ?? 250;
              return (
                <div key={q.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 16, boxShadow: "var(--shadow)", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#1a1a1a", background: GOLD, borderRadius: 6, padding: "2px 8px" }}>{q.q_type || "Essay"}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>Question {i + 1} of {questions.length}</span>
                  </div>
                  <p style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.5, margin: "0 0 12px" }}>{q.question}</p>
                  <textarea
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                    placeholder="Write your answer here…"
                    rows={10}
                    disabled={phase === "submitting"}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      borderRadius: 10,
                      border: "1px solid var(--line)",
                      background: "var(--bg)",
                      color: "var(--text)",
                      padding: 12,
                      fontSize: 14.5,
                      lineHeight: 1.6,
                      resize: "vertical",
                    }}
                  />
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "var(--muted)" }}>
                    <span>
                      Words: <b style={{ color: wc > target ? "#e07b00" : "var(--text)" }}>{wc}</b> / {target}
                    </span>
                  </div>
                </div>
              );
            })}

            <div style={{ position: "sticky", bottom: 0, background: "var(--bg)", paddingTop: 8 }}>
              <button
                onClick={() => {
                  if (confirm("Submit your answers? You can't edit after this.")) submit();
                }}
                disabled={phase === "submitting"}
                style={{ ...goldBtn, width: "100%", padding: "14px", fontSize: 15, opacity: phase === "submitting" ? 0.6 : 1 }}
              >
                {phase === "submitting" ? "Scoring your answers…" : `Submit test (${totalWords} words)`}
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

// ── Result view ───────────────────────────────────────────────────────────────
function ResultView({ result, onPdf, pdfBusy, onExit }: { result: any; onPdf: () => void; pdfBusy: boolean; onExit: () => void }) {
  return (
    <div>
      <section
        style={{
          background: `linear-gradient(135deg, ${NAVY}, #2c4a85)`,
          borderRadius: 18,
          padding: "22px 20px",
          color: "#fff",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.85 }}>Your total score</div>
        <div style={{ fontSize: 34, fontWeight: 800, margin: "4px 0" }}>
          {result.grand_total} <span style={{ fontSize: 18, opacity: 0.8 }}>/ {result.grand_max}</span>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={onPdf} disabled={pdfBusy} style={{ ...goldBtn, opacity: pdfBusy ? 0.6 : 1 }}>
            {pdfBusy ? "Preparing…" : "⬇ Download PDF"}
          </button>
          <button onClick={onExit} style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 10, padding: "11px 18px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>
            Back to series
          </button>
        </div>
      </section>

      {(result.results || []).map((r: any, i: number) => {
        const s = r.score || {};
        return (
          <div key={r.question_id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 16, boxShadow: "var(--shadow)", marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#1a1a1a", background: GOLD, borderRadius: 6, padding: "2px 8px" }}>{r.q_type || "Essay"}</span>
              <span style={{ fontSize: 12, color: "var(--muted)" }}>Question {i + 1}</span>
              <span style={{ marginLeft: "auto", fontWeight: 800, fontSize: 15, color: GOLD }}>{s.total_score ?? 0}/{s.total_max ?? 0}</span>
            </div>
            <p style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.5, margin: "0 0 12px" }}>{r.question}</p>

            {/* score bars */}
            <ScoreBar label="Word count" got={s.word_count_score} max={s.max_word_marks} extra={`${s.word_count ?? 0} / ${s.target_words ?? 0} words`} />
            <ScoreBar label="Spelling" got={s.spelling_score} max={s.max_spelling_marks} extra={`${s.spelling_correct ?? 0}/${s.spelling_total ?? 0} correct`} />
            <ScoreBar label="Grammar" got={s.grammar_score} max={s.max_grammar_marks} extra={s.grammar_checked === false ? "check unavailable" : `${s.grammar_errors ?? 0} issue${(s.grammar_errors ?? 0) === 1 ? "" : "s"}`} />

            {s.grammar_checked === false && (
              <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>Grammar service was busy — full grammar marks awarded for this attempt.</p>
            )}

            {/* answers comparison */}
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--muted)", marginBottom: 4 }}>YOUR ANSWER</div>
              <div style={{ background: "var(--bg)", border: "1px solid var(--line)", borderRadius: 10, padding: 12, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {r.your_answer || <span style={{ color: "var(--muted)" }}>(left blank)</span>}
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#2e8b4a", marginBottom: 4 }}>MODEL ANSWER</div>
              <div style={{ background: "rgba(46,139,74,0.06)", border: "1px solid rgba(46,139,74,0.3)", borderRadius: 10, padding: 12, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                {r.sample_answer || <span style={{ color: "var(--muted)" }}>—</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScoreBar({ label, got, max, extra }: { label: string; got: number; max: number; extra?: string }) {
  const g = Number(got || 0);
  const m = Number(max || 0);
  const pct = m > 0 ? Math.max(0, Math.min(100, (g / m) * 100)) : 0;
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
        <div style={{ width: `${pct}%`, height: "100%", background: GOLD }} />
      </div>
    </div>
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
        
