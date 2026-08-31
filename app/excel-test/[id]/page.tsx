"use client";

/**
 * app/excel-test/[id]/page.tsx — Excel mock test.
 *
 * Practice se teen farak, aur teeno jaan-boojh kar:
 *   1. Timer chalta hai, khatam hone par apne aap submit
 *   2. Hint nahi, auto-suggest nahi — exam me ye milte nahi
 *   3. Jawab har question ke baad nahi, sirf result screen par
 *
 * Formula wale 10 question ke BAAD shortcut ka bonus round. Bonus qualifying
 * me nahi ginta — skip kar dena bilkul theek hai.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { ExcelGrid, FormulaBar } from "@/app/components/ExcelGrid";

const GOLD = "#FFAB00";
const GREEN = "#1c7a3e";
const RED = "#c0392b";

type Stage = "loading" | "test" | "bonus" | "result";

export default function ExcelTest() {
  const params = useParams();
  const router = useRouter();
  const testId = Number(params.id);

  const [stage, setStage] = useState<Stage>("loading");
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [bonus, setBonus] = useState<any[]>([]);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [bonusAns, setBonusAns] = useState<Record<number, string>>({});
  const [bIdx, setBIdx] = useState(0);

  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hindi, setHindi] = useState(true);

  const startedAt = useRef(0);
  const qStart = useRef(Date.now());
  const times = useRef<Record<number, number>>({});
  const stateRef = useRef({ answers, bonusAns });
  stateRef.current = { answers, bonusAns };

  const uid = (getUser() as any)?.id;

  useEffect(() => {
    if (!getUser()) { router.replace("/login"); return; }
    fetch(`${API_URL}/tier2/excel/test/${testId}?user_id=${uid}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not open this test");
        setTest(d.test);
        setQuestions(d.questions || []);
        setBonus(d.bonus || []);
        setTimeLeft((d.test?.duration_min || 10) * 60);
        startedAt.current = Date.now();
        qStart.current = Date.now();
        setStage("test");
      })
      .catch((e) => { setError(e.message); setStage("result"); });
  }, [testId, uid, router]);

  const submit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);
    const { answers: A, bonusAns: B } = stateRef.current;
    try {
      const r = await fetch(`${API_URL}/tier2/excel/test/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: uid,
          test_id: testId,
          answers: Object.entries(A).map(([qid, f]) => ({
            question_id: Number(qid), formula: f, seconds: times.current[Number(qid)] || 0,
          })),
          bonus_answers: Object.entries(B).map(([qid, sel]) => ({
            question_id: Number(qid), selected: sel,
          })),
          seconds_taken: Math.round((Date.now() - startedAt.current) / 1000),
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Could not submit");
      setResult(d);
      setStage("result");
    } catch (e: any) {
      setError(e.message);
    }
    setSubmitting(false);
  }, [submitting, uid, testId]);

  // Timer — bonus round me bhi chalta rehta hai
  useEffect(() => {
    if (stage !== "test" && stage !== "bonus") return;
    const t = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) { clearInterval(t); submit(); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [stage, submit]);

  function saveTime(qid: number) {
    times.current[qid] = (times.current[qid] || 0) + Math.round((Date.now() - qStart.current) / 1000);
    qStart.current = Date.now();
  }

  function goto(n: number) {
    if (questions[idx]) saveTime(questions[idx].id);
    setIdx(n);
  }

  const mm = String(Math.floor(timeLeft / 60)).padStart(2, "0");
  const ss = String(timeLeft % 60).padStart(2, "0");
  const low = timeLeft <= 60;

  // ═══════════════ LOADING ═══════════════
  if (stage === "loading") return <Shell><p style={{ color: "var(--muted)" }}>Loading…</p></Shell>;

  // ═══════════════ TEST ═══════════════
  if (stage === "test") {
    const q = questions[idx];
    if (!q) return <Shell><p style={{ color: RED }}>This test has no questions yet.</p></Shell>;
    const answered = Object.keys(answers).filter((k) => (answers[Number(k)] || "").trim()).length;

    return (
      <Shell>
        <Bar mm={mm} ss={ss} low={low} left={`Q ${idx + 1} / ${questions.length}`} right={`${answered} done`} />

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}>
          {questions.map((x, i) => {
            const done = (answers[x.id] || "").trim() !== "";
            return (
              <button
                key={x.id}
                onClick={() => goto(i)}
                style={{
                  width: 30, height: 30, borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 800,
                  border: `1px solid ${i === idx ? GOLD : "var(--line)"}`,
                  background: i === idx ? GOLD : done ? "rgba(28,122,62,0.18)" : "transparent",
                  color: i === idx ? "#1a1a1a" : "var(--text)",
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 13, marginBottom: 12 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.6, flex: 1 }}>
              {hindi ? (q.instruction_hi || q.instruction_en) : q.instruction_en}
            </div>
            <button
              onClick={() => setHindi(!hindi)}
              style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 8, padding: "4px 9px", fontSize: 11.5, fontWeight: 700, color: "var(--text)", cursor: "pointer", flexShrink: 0 }}
            >
              {hindi ? "EN" : "हि"}
            </button>
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
            Answer cell: <b style={{ fontFamily: "Consolas, monospace" }}>{q.target_cell}</b>
          </div>
        </div>

        <ExcelGrid gridData={q.grid_data} targetCell={q.target_cell} />

        {/* suggest nahi bheja — test me auto-suggest band */}
        <FormulaBar
          value={answers[q.id] || ""}
          onChange={(v) => setAnswers({ ...answers, [q.id]: v })}
          onSubmit={() => idx < questions.length - 1 && goto(idx + 1)}
          targetCell={q.target_cell}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button
            onClick={() => goto(Math.max(0, idx - 1))}
            disabled={idx === 0}
            style={{ ...ghost, opacity: idx === 0 ? 0.4 : 1 }}
          >
            ← Previous
          </button>
          {idx < questions.length - 1 ? (
            <button onClick={() => goto(idx + 1)} style={gold}>Next →</button>
          ) : bonus.length > 0 ? (
            <button
              onClick={() => { saveTime(q.id); setStage("bonus"); }}
              style={gold}
            >
              Bonus round →
            </button>
          ) : (
            <button onClick={() => { saveTime(q.id); submit(); }} style={gold}>
              {submitting ? "Submitting…" : "Submit"}
            </button>
          )}
        </div>

        {error ? <p style={{ color: RED, fontSize: 13, marginTop: 12 }}>{error}</p> : null}
      </Shell>
    );
  }

  // ═══════════════ BONUS ═══════════════
  if (stage === "bonus") {
    const b = bonus[bIdx];
    const opts = hindi ? (b.options_hi || []).map((o: string, i: number) => o || b.options[i]) : b.options;

    return (
      <Shell>
        <Bar mm={mm} ss={ss} low={low} left={`Bonus ${bIdx + 1} / ${bonus.length}`} right="Extra" />

        <div style={{ background: "rgba(255,171,0,0.1)", border: `1px solid ${GOLD}`, borderRadius: 12, padding: 12, margin: "12px 0", fontSize: 12.5, lineHeight: 1.6 }}>
          <b>Bonus round — shortcut keys.</b> These marks do not count towards qualifying. Skip them if you are not sure.
        </div>

        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.6 }}>
            {hindi ? (b.question_hi || b.question_en) : b.question_en}
          </div>
          <div style={{ marginTop: 12 }}>
            {["A", "B", "C", "D"].map((L, i) => {
              if (!opts[i]) return null;
              const on = bonusAns[b.id] === L;
              return (
                <button
                  key={L}
                  onClick={() => setBonusAns({ ...bonusAns, [b.id]: on ? "" : L })}
                  style={{
                    display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                    background: on ? "rgba(255,171,0,0.16)" : "transparent",
                    border: `1px solid ${on ? GOLD : "var(--line)"}`,
                    color: "var(--text)", borderRadius: 10, padding: "11px 12px",
                    marginBottom: 8, fontSize: 13.5, cursor: "pointer",
                  }}
                >
                  <span style={{ fontWeight: 800, color: on ? GOLD : "var(--muted)" }}>{L}</span>
                  <span>{opts[i]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
          <button onClick={() => setBIdx(Math.max(0, bIdx - 1))} disabled={bIdx === 0} style={{ ...ghost, opacity: bIdx === 0 ? 0.4 : 1 }}>
            ← Previous
          </button>
          {bIdx < bonus.length - 1 ? (
            <button onClick={() => setBIdx(bIdx + 1)} style={gold}>Next →</button>
          ) : (
            <button onClick={submit} style={gold}>{submitting ? "Submitting…" : "Submit test"}</button>
          )}
        </div>

        <button
          onClick={submit}
          style={{ ...ghost, width: "100%", marginTop: 10 }}
        >
          Skip bonus and submit
        </button>
      </Shell>
    );
  }

  // ═══════════════ RESULT ═══════════════
  if (error && !result) return <Shell><p style={{ color: RED, fontSize: 14 }}>{error}</p></Shell>;
  if (!result) return <Shell><p style={{ color: "var(--muted)" }}>Loading…</p></Shell>;

  return (
    <Shell>
      <div style={{ background: result.qualified ? "rgba(28,122,62,0.12)" : "rgba(192,57,43,0.1)", border: `1px solid ${result.qualified ? GREEN : RED}`, borderRadius: 16, padding: 18, textAlign: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 32 }}>{result.qualified ? "✅" : "📈"}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: result.qualified ? GREEN : RED, marginTop: 4 }}>
          {result.score} / {result.total}
        </div>
        <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          You needed {result.pass_marks} to pass
        </div>
        {result.bonus_total > 0 && (
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 8, borderTop: "1px solid var(--line)", paddingTop: 8 }}>
            Bonus (shortcut keys): <b style={{ color: "var(--text)" }}>{result.bonus_score} / {result.bonus_total}</b> — not counted towards qualifying
          </div>
        )}
      </div>

      {(result.strong?.length > 0 || result.weak?.length > 0) && (
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 13, marginBottom: 14 }}>
          {result.strong?.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 5 }}>These are solid</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {result.strong.map((c: string) => (
                  <span key={c} style={{ fontSize: 11.5, fontFamily: "Consolas, monospace", color: GREEN, border: `1px solid ${GREEN}`, borderRadius: 6, padding: "3px 8px" }}>{c}</span>
                ))}
              </div>
            </div>
          )}
          {result.weak?.length > 0 && (
            <div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 5 }}>These need work — tap to practise</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {result.weak.map((c: string) => (
                  <button
                    key={c}
                    onClick={() => router.push("/tier2/excel")}
                    style={{ fontSize: 11.5, fontFamily: "Consolas, monospace", color: RED, border: `1px solid ${RED}`, background: "transparent", borderRadius: 6, padding: "3px 8px", cursor: "pointer" }}
                  >
                    {c} →
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <h3 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 10px" }}>Question by question</h3>
      {(result.questions || []).map((d: any, i: number) => (
        <div key={d.question_id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${d.is_correct ? GREEN : RED}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: 13 }}>{i + 1}.</span>
            <span style={{ fontFamily: "Consolas, monospace", fontSize: 12, color: GOLD }}>{d.concept}</span>
            <span style={{ flex: 1 }} />
            <span>{d.is_correct ? "✅" : "❌"}</span>
          </div>
          <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>{d.instruction_en}</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6, fontFamily: "Consolas, monospace", wordBreak: "break-all" }}>
            You wrote: {d.typed_formula || "— skipped —"}
          </div>
          {!d.is_correct && (
            <>
              <div style={{ fontSize: 12.5, color: RED, marginTop: 4, lineHeight: 1.55 }}>
                {hindi ? (d.feedback_hi || d.feedback) : d.feedback}
              </div>
              <div style={{ fontSize: 12.5, color: GREEN, marginTop: 4, fontFamily: "Consolas, monospace", wordBreak: "break-all" }}>
                Correct: {d.correct_formula} → {d.expected_value}
              </div>
            </>
          )}
        </div>
      ))}

      {(result.bonus || []).length > 0 && (
        <>
          <h3 style={{ fontSize: 15, fontWeight: 800, margin: "18px 0 10px" }}>Bonus — shortcut keys</h3>
          {result.bonus.map((b: any, i: number) => (
            <div key={b.question_id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${b.is_correct ? GREEN : RED}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
              <div style={{ fontSize: 13, lineHeight: 1.55 }}>{i + 1}. {hindi ? (b.question_hi || b.question_en) : b.question_en}</div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5 }}>
                You chose: {b.selected || "— skipped —"} · Correct: {b.correct_option}
              </div>
              {b.explanation_hi || b.explanation_en ? (
                <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 5, lineHeight: 1.55 }}>
                  {hindi ? (b.explanation_hi || b.explanation_en) : b.explanation_en}
                </div>
              ) : null}
            </div>
          ))}
        </>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        <button onClick={() => window.location.reload()} style={gold}>Try again</button>
        <button onClick={() => router.push("/tier2/excel")} style={ghost}>All tests</button>
      </div>
    </Shell>
  );
}

function Bar({ mm, ss, low, left, right }: { mm: string; ss: string; low: boolean; left: string; right: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 12px" }}>
      <span style={{ fontSize: 12.5, fontWeight: 800 }}>{left}</span>
      <span style={{ flex: 1 }} />
      <span style={{ fontSize: 12, color: "var(--muted)" }}>{right}</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: low ? RED : "var(--text)", fontVariantNumeric: "tabular-nums" }}>
        {mm}:{ss}
      </span>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 40px" }}>{children}</main>
    </div>
  );
}

const gold: React.CSSProperties = {
  flex: 1, background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10,
  padding: "12px 0", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
const ghost: React.CSSProperties = {
  flex: 1, background: "transparent", color: "var(--text)", border: "1px solid var(--line)",
  borderRadius: 10, padding: "12px 0", fontWeight: 800, fontSize: 14, cursor: "pointer",
};
