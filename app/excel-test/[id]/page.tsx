"use client";

/**
 * app/excel-test/[id]/page.tsx — Excel mock test (SSSC pattern).
 *
 * Asli exam ka dhaancha (Advt 30C/31C/32C, notice 30-01-2023):
 *   5 question · har ek 2 marks · 10 minute · qualify ke liye 4+ marks
 *   Word Processing sirf unki jaanchi jaati hai jinke Spreadsheet me 4+
 *   marks aaye — isliye Excel hi asli darwaza hai.
 *
 * Practice se teen farak, aur teeno jaan-boojh kar:
 *   1. Timer chalta hai, khatam hone par apne aap submit
 *   2. Hint nahi, auto-suggest nahi — exam me ye milte nahi
 *   3. Jawab har question ke baad nahi, sirf result screen par
 *
 * EK SHEET, PAANCH KAAM — asli exam me candidate ke saamne ek hi data sheet
 * hoti hai. Isliye question badalne par sheet wahi rehti hai, sirf highlight
 * sarakta hai. Pehle har question ki apni chhoti table thi, jo flashcard
 * jaisa lagta tha.
 *
 * Har question ke DO hisse, 1-1 mark ke. 2 marks ek hi formula par tikana na
 * lamba sawal banata hai na insaaf — ek galti aur poore 2 gaye.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { ExcelGrid, FormulaBar } from "@/app/components/ExcelGrid";

const GOLD = "#FFAB00";
const GREEN = "#1c7a3e";
const RED = "#c0392b";

type Stage = "loading" | "test" | "result";

/** answers[questionId][partIndex] = formula */
type Answers = Record<number, Record<number, string>>;

export default function ExcelTest() {
  const params = useParams();
  const router = useRouter();
  const testId = Number(params.id);

  const [stage, setStage] = useState<Stage>("loading");
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);

  const [idx, setIdx] = useState(0);
  const [part, setPart] = useState(0);          // kaunsa hissa abhi khula hai
  const [answers, setAnswers] = useState<Answers>({});

  // ── Excel jaisa haath-chalana ──
  // live[qid][partIdx] = { "E2": "500", ... }  — Enter dabane par aaya jawab
  const [live, setLive] = useState<Record<string, Record<string, string>>>({});
  // Student ne fill handle kheench kar kahan tak bhara
  const [fillRanges, setFillRanges] = useState<Record<string, string>>({});
  // Formula bar me cursor hai to grid par tap karne se reference judta hai
  const [typing, setTyping] = useState(false);
  const [picked, setPicked] = useState<{ ref: string; nonce: number } | null>(null);
  const nonce = useRef(0);

  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hindi, setHindi] = useState(true);

  const startedAt = useRef(0);
  const qStart = useRef(Date.now());
  const times = useRef<Record<number, number>>({});
  const stateRef = useRef({ answers });
  stateRef.current = { answers };

  const uid = (getUser() as any)?.id;

  useEffect(() => {
    if (!getUser()) { router.replace("/login"); return; }
    fetch(`${API_URL}/tier2/excel/test/${testId}?user_id=${uid}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not open this test");
        setTest(d.test);
        setQuestions(d.questions || []);
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
    const { answers: A } = stateRef.current;
    try {
      const r = await fetch(`${API_URL}/tier2/excel/test/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: uid,
          test_id: testId,
          answers: Object.entries(A).map(([qid, parts]) => ({
            question_id: Number(qid),
            // Object.entries pehle hi string keys deta hai, isliye seedha
            // wapas object bana lete hain — backend part index string se
            // hi padhta hai.
            part_formulas: Object.fromEntries(Object.entries(parts || {})),
            // Purane backend ke liye — wahan sirf ek formula jata tha
            formula: (parts as any)?.[0] || "",
            seconds: times.current[Number(qid)] || 0,
          })),
          bonus_answers: [],
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

  /** Enter dabane par — Excel ki tarah cell me jawab aa jata hai.
   *  Backend sirf calculator ki tarah chalta hai; sahi jawab kahin nahi
   *  aata, isliye ye cheating nahi, asli mahaul hai. */
  const evaluate = useCallback(async (qid: number, pi: number, formula: string, range?: string) => {
    const key = `${qid}:${pi}`;
    if (!formula.trim()) { setLive((L) => ({ ...L, [key]: {} })); return; }
    try {
      const r = await fetch(`${API_URL}/tier2/excel/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, question_id: qid, part_index: pi, formula, fill_range: range || null }),
      });
      const d = await r.json();
      if (!r.ok) return;
      const map: Record<string, string> = {};
      (d.cells || []).forEach(([ref, v]: [string, string]) => { map[ref] = v; });
      setLive((L) => ({ ...L, [key]: map }));
    } catch { /* network gaya to cell khaali reh jaye, test na ruke */ }
  }, [uid]);

  /** Fill handle kheencha gaya — formula poori range me bhar do */
  const doFill = useCallback((qid: number, pi: number, formula: string, range: string) => {
    setFillRanges((F) => ({ ...F, [`${qid}:${pi}`]: range }));
    evaluate(qid, pi, formula, range);
  }, [evaluate]);

  useEffect(() => {
    if (stage !== "test") return;
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
    setPart(0);
    setTyping(false);
  }

  function setAns(qid: number, pi: number, v: string) {
    setAnswers((a) => ({ ...a, [qid]: { ...(a[qid] || {}), [pi]: v } }));
  }

  /** Ek question ke kitne hisse bhare hue hain */
  function filled(q: any): number {
    const a = answers[q.id] || {};
    const n = q.parts?.length || 1;
    let c = 0;
    for (let i = 0; i < n; i++) if ((a[i] || "").trim()) c++;
    return c;
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

    const parts: any[] = q.parts?.length ? q.parts : [{ index: 0, label_en: q.instruction_en, label_hi: q.instruction_hi, target_cell: q.target_cell }];
    const p = parts[part] || parts[0];
    const sheet = p.grid_data || q.grid_data || test?.grid_data || "";
    const doneParts = questions.reduce((n, x) => n + filled(x), 0);
    const totalParts = questions.reduce((n, x) => n + (x.parts?.length || 1), 0);

    return (
      <Shell>
        <Bar mm={mm} ss={ss} low={low}
             left={`Q ${idx + 1} / ${questions.length}`}
             right={`${doneParts}/${totalParts} filled`} />

        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "12px 0" }}>
          {questions.map((x, i) => {
            const f = filled(x);
            const n = x.parts?.length || 1;
            return (
              <button
                key={x.id}
                onClick={() => goto(i)}
                style={{
                  minWidth: 34, height: 30, borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 800,
                  border: `1px solid ${i === idx ? GOLD : "var(--line)"}`,
                  // Aadha bhara hua alag rang — student ko dikhe ki kahan
                  // ek hissa chhoot raha hai.
                  background: i === idx ? GOLD
                    : f === n ? "rgba(28,122,62,0.22)"
                    : f > 0 ? "rgba(255,171,0,0.16)" : "transparent",
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
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6 }}>
            {q.marks || 2} marks
            {parts.length > 1 ? ` · ${parts.length} parts, ${(q.marks || 2) / parts.length} mark each` : ""}
          </div>
        </div>

        {/* Ek hi sheet — question badalne par ye wahi rehti hai */}
        <ExcelGrid
          gridData={sheet}
          targetCell={p.target_cell}
          fillRange={p.fill_range}
          values={live[`${q.id}:${part}`]}
          filledRange={fillRanges[`${q.id}:${part}`]}
          canFill={!!p.fill_range}
          pickMode={typing}
          onPick={(ref) => { nonce.current += 1; setPicked({ ref, nonce: nonce.current }); }}
          onFill={(range) => doFill(q.id, part, (answers[q.id] || {})[part] || "", range)}
        />

        {typing && (
          <div style={{ fontSize: 11.5, color: GOLD, marginTop: 6, lineHeight: 1.5 }}>
            Cell par tap kijiye — uska reference formula me apne aap jud jayega.
            Ungli kheenchiye to poori range (jaise C2:C7).
          </div>
        )}

        <div style={{ marginTop: 12 }}>
          {parts.map((pt: any, i: number) => {
            const on = i === part;
            const val = (answers[q.id] || {})[i] || "";
            return (
              <div
                key={i}
                onClick={() => { if (!on) { setPart(i); setTyping(false); } }}
                style={{
                  border: `1px solid ${on ? GOLD : "var(--line)"}`,
                  background: on ? "rgba(255,171,0,0.06)" : "transparent",
                  borderRadius: 12, padding: 12, marginBottom: 10, cursor: on ? "default" : "pointer",
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
                  {parts.length > 1 && (
                    <span style={{ fontWeight: 900, fontSize: 13, color: on ? GOLD : "var(--muted)" }}>
                      ({String.fromCharCode(97 + i)})
                    </span>
                  )}
                  <span style={{ fontSize: 13.5, lineHeight: 1.55, flex: 1 }}>
                    {hindi ? (pt.label_hi || pt.label_en) : pt.label_en}
                  </span>
                  {val.trim() ? <span style={{ fontSize: 12, color: GREEN }}>✓</span> : null}
                </div>

                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6, fontFamily: "Consolas, monospace" }}>
                  {pt.fill_range
                    ? <>Write in <b>{pt.target_cell}</b>, fill down to <b>{(pt.fill_range || "").split(":")[1]}</b></>
                    : <>Answer cell: <b>{pt.target_cell}</b></>}
                </div>

                {pt.fill_range && on && (
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>
                    Enter dabaiye, phir cell ke kone ka chhota chaukor neeche kheench kar{" "}
                    <b style={{ color: "var(--text)" }}>{(pt.fill_range || "").split(":")[1]}</b> tak bhariye —
                    jaise Excel me karte hain.
                  </div>
                )}

                {on && (
                  /* suggest nahi bheja — test me auto-suggest band */
                  <FormulaBar
                    value={val}
                    onChange={(v) => setAns(q.id, i, v)}
                    onFocusChange={setTyping}
                    pendingRef={picked}
                    onSubmit={() => {
                      // Excel: Enter dabate hi cell me jawab aata hai
                      evaluate(q.id, i, (answers[q.id] || {})[i] || "", fillRanges[`${q.id}:${i}`]);
                    }}
                    targetCell={pt.target_cell}
                  />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button
            onClick={() => goto(Math.max(0, idx - 1))}
            disabled={idx === 0}
            style={{ ...ghost, opacity: idx === 0 ? 0.4 : 1 }}
          >
            ← Previous
          </button>
          {idx < questions.length - 1 ? (
            <button onClick={() => goto(idx + 1)} style={gold}>Next →</button>
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
          You needed {result.pass_marks} marks to qualify
        </div>
        {/* Notice ka sabse zaroori niyam — student ko yaad rehna chahiye ki
            Excel hi darwaza hai, typing baad me aati hai. */}
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 9, lineHeight: 1.6 }}>
          {result.qualified
            ? "In the real exam your typing paper is checked only after this — you have cleared that gate."
            : "In the real exam, if you score below the pass mark here, your typing paper is not checked at all."}
        </div>
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
      {(result.questions || []).map((d: any, i: number) => {
        const marks = d.marks ?? 2;
        const got = d.got_marks ?? 0;
        const tone = got >= marks ? GREEN : got <= 0 ? RED : GOLD;
        return (
          <div key={d.question_id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${tone}`, borderRadius: 10, padding: 12, marginBottom: 10 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{i + 1}.</span>
              <span style={{ fontFamily: "Consolas, monospace", fontSize: 12, color: GOLD }}>{d.concept}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 12.5, fontWeight: 800, color: tone }}>{got} / {marks}</span>
            </div>
            <div style={{ fontSize: 13, marginTop: 6, lineHeight: 1.55 }}>
              {hindi ? (d.instruction_hi || d.instruction_en) : d.instruction_en}
            </div>

            {/* Table bhi dikhate hain — warna student ko yaad hi nahi rehta ki
                data kya tha, aur apni galti samajh nahi aati. */}
            {d.grid_data ? (
              <div style={{ marginTop: 9 }}>
                <ExcelGrid gridData={d.grid_data} targetCell="" />
              </div>
            ) : null}

            {(d.parts || []).map((p: any) => (
              <div key={p.index} style={{ marginTop: 10, paddingTop: 9, borderTop: "1px solid var(--line)" }}>
                <div style={{ display: "flex", gap: 7, alignItems: "baseline" }}>
                  {(d.parts || []).length > 1 && (
                    <span style={{ fontWeight: 900, fontSize: 12.5, color: p.is_correct ? GREEN : RED }}>
                      ({String.fromCharCode(97 + p.index)})
                    </span>
                  )}
                  <span style={{ fontSize: 12.5, lineHeight: 1.5, flex: 1 }}>
                    {hindi ? (p.label_hi || p.label_en) : p.label_en}
                  </span>
                  <span>{p.is_correct ? "✅" : "❌"}</span>
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 5, fontFamily: "Consolas, monospace", wordBreak: "break-all" }}>
                  You wrote: {p.typed_formula || "— skipped —"}
                </div>
                {!p.is_correct && (
                  <>
                    <div style={{ fontSize: 12.5, color: RED, marginTop: 4, lineHeight: 1.55 }}>
                      {hindi ? (p.feedback_hi || p.feedback) : p.feedback}
                    </div>
                    <div style={{ fontSize: 12.5, color: GREEN, marginTop: 4, fontFamily: "Consolas, monospace", wordBreak: "break-all" }}>
                      Correct: {p.correct_formula}
                      {p.fill_range ? ` (filled ${p.fill_range})` : p.expected_value ? ` → ${p.expected_value}` : ""}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        );
      })}

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
