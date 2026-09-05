"use client";

/**
 * app/excel-practice/[id]/page.tsx — guided practice.
 *
 * Timer nahi, penalty nahi, jitni baar chahe try. Hints teen level me, tabhi
 * khulti hain jab student khud maange. Auto-suggest chalu hai (test me nahi).
 *
 * Checking backend karti hai — formula wahan chalta hai, yahan nahi. Isliye
 * jawab browser me kabhi nahi aata.
 */

import { useEffect, useState, useRef, useCallback, type CSSProperties, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { ExcelGrid, FormulaBar } from "@/app/components/ExcelGrid";

const GOLD = "#FFAB00";
const GREEN = "#1c7a3e";
const RED = "#c0392b";

export default function ExcelPractice() {
  const params = useParams();
  const router = useRouter();
  const qid = Number(params.id);

  const [q, setQ] = useState<any>(null);
  const [suggest, setSuggest] = useState<string[]>([]);
  const [formula, setFormula] = useState("");
  const [res, setRes] = useState<any>(null);
  const [hintLevel, setHintLevel] = useState(0);
  const [tries, setTries] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hindi, setHindi] = useState(true);

  // ── Excel jaisa haath-chalana (test page jaisa hi) ──
  const [live, setLive] = useState<Record<string, string>>({});
  const [filledRange, setFilledRange] = useState<string>("");
  const [typing, setTyping] = useState(false);
  const [picked, setPicked] = useState<{ ref: string; nonce: number } | null>(null);
  const nonce = useRef(0);

  const uid = (getUser() as any)?.id;

  useEffect(() => {
    fetch(`${API_URL}/tier2/excel/practice/${qid}${uid ? `?user_id=${uid}` : ""}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not open this question");
        setQ(d.question);
        setSuggest(d.suggest || []);
      })
      .catch((e) => setError(e.message));
  }, [qid, uid]);

  async function check() {
    if (!formula.trim() || busy) return;
    setBusy(true);
    try {
      const r = await fetch(`${API_URL}/tier2/excel/practice/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, question_id: qid, formula }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || "Could not check the answer");
      setRes(d);
      setTries((t) => t + 1);
    } catch (e: any) {
      setError(e.message);
    }
    setBusy(false);
  }

  /** Enter dabane par cell me jawab — asli Excel ki tarah */
  const evaluate = useCallback(async (f: string, range?: string) => {
    if (!q || !f.trim()) { setLive({}); return; }
    try {
      const r = await fetch(`${API_URL}/tier2/excel/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: uid, question_id: q.id, part_index: 0, formula: f, fill_range: range || null }),
      });
      const d = await r.json();
      if (!r.ok) return;
      const map: Record<string, string> = {};
      (d.cells || []).forEach(([ref, v]: [string, string]) => { map[ref] = v; });
      setLive(map);
    } catch { /* chup rehna behtar — practice rukni nahi chahiye */ }
  }, [q, uid]);

  function retry() {
    setRes(null);
  }

  if (error && !q) {
    const locked = /purchase/i.test(error);
    return (
      <Shell>
        <button onClick={() => router.push("/tier2/excel")} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 0, marginBottom: 14 }}>←</button>
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 22, textAlign: "center" }}>
          <div style={{ fontSize: 34 }}>{locked ? "🔒" : "⚠️"}</div>
          <div style={{ fontSize: 16, fontWeight: 800, marginTop: 8 }}>
            {locked ? "This one is locked" : "Something went wrong"}
          </div>
          <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.65, margin: "8px 0 16px" }}>
            {locked
              ? "Four formulas are open for everyone — SUM, IF, LEFT and VLOOKUP. Try those first, and unlock the series for the remaining 34."
              : error}
          </p>
          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={() => router.push("/tier2/excel")}
              style={{ flex: 1, background: "transparent", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 10, padding: "11px 0", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}
            >
              Free ones
            </button>
            {locked && (
              <button
                onClick={() => router.push("/tier2")}
                style={{ flex: 1, background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "11px 0", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}
              >
                Unlock all
              </button>
            )}
          </div>
        </div>
      </Shell>
    );
  }
  if (!q) return <Shell><p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p></Shell>;

  const hints: string[] = (hindi ? q.hints_hi : q.hints_en) || q.hints_en || [];
  const instruction = hindi ? (q.instruction_hi || q.instruction_en) : q.instruction_en;

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <button onClick={() => { try { router.back(); } catch { router.push("/tier2/excel"); } }} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 0 }}>←</button>
        <span style={{ fontFamily: "Consolas, monospace", fontWeight: 800, fontSize: 15, color: GOLD }}>{q.concept}</span>
        <span style={{ flex: 1 }} />
        <button
          onClick={() => setHindi(!hindi)}
          style={{ background: "transparent", border: "1px solid var(--line)", borderRadius: 8, padding: "5px 10px", fontSize: 12, fontWeight: 700, color: "var(--text)", cursor: "pointer" }}
        >
          {hindi ? "English" : "हिंदी"}
        </button>
      </div>

      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 13, marginBottom: 14 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, lineHeight: 1.6 }}>{instruction}</div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
          Answer cell: <b style={{ fontFamily: "Consolas, monospace" }}>{q.target_cell}</b>
        </div>
      </div>

      <ExcelGrid
        gridData={q.grid_data}
        targetCell={q.target_cell}
        fillRange={q.fill_range}
        values={live}
        filledRange={filledRange}
        canFill={!!q.fill_range}
        pickMode={typing}
        onPick={(ref) => { nonce.current += 1; setPicked({ ref, nonce: nonce.current }); }}
        onFill={(range) => { setFilledRange(range); evaluate(formula, range); }}
        answer={res?.correct ? res.value : ""}
        answerState={res ? (res.correct ? "right" : "wrong") : "none"}
      />

      {typing && (
        <div style={{ fontSize: 11.5, color: GOLD, marginTop: 6, lineHeight: 1.5 }}>
          Cell par tap kijiye — reference apne aap jud jayega. Ungli kheenchiye to poori range.
        </div>
      )}

      <FormulaBar
        value={formula}
        onChange={(v) => { setFormula(v); if (res) setRes(null); }}
        onFocusChange={setTyping}
        pendingRef={picked}
        onSubmit={() => evaluate(formula, filledRange || undefined)}
        targetCell={q.target_cell}
        suggest={suggest}
        disabled={busy || res?.correct}
      />

      {/* ── Jawab ── */}
      {res && (
        <div
          style={{
            marginTop: 12, borderRadius: 12, padding: 13,
            background: res.correct ? "rgba(28,122,62,0.1)" : "rgba(192,57,43,0.08)",
            border: `1px solid ${res.correct ? GREEN : RED}`,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 800, color: res.correct ? GREEN : RED }}>
            {res.correct ? "✅ Correct!" : "Not quite"}
          </div>
          <div style={{ fontSize: 13.5, lineHeight: 1.65, marginTop: 5 }}>
            {hindi ? (res.feedback_hi || res.feedback) : res.feedback}
          </div>
          {res.correct && res.value ? (
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 6, fontFamily: "Consolas, monospace" }}>
              {q.target_cell} = {res.value}
            </div>
          ) : null}
        </div>
      )}

      {/* ── Hints ── */}
      {!res?.correct && (
        <div style={{ marginTop: 14 }}>
          {hints.slice(0, hintLevel).map((h, i) => (
            <div
              key={i}
              style={{ background: "var(--card)", border: "1px solid var(--line)", borderLeft: `3px solid ${GOLD}`, borderRadius: 8, padding: "10px 12px", marginBottom: 8, fontSize: 13.5, lineHeight: 1.6 }}
            >
              <b style={{ color: GOLD }}>Hint {i + 1}:</b> {h}
            </div>
          ))}
          {hintLevel < hints.length && (
            <button
              onClick={() => setHintLevel(hintLevel + 1)}
              style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 10, padding: "10px 16px", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              {hintLevel === 0 ? "Need a hint?" : hintLevel === hints.length - 1 ? "Show the answer" : "One more hint"}
            </button>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
        {res?.correct ? (
          <button
            onClick={() => router.push("/tier2/excel")}
            style={{ flex: 1, background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 800, fontSize: 14, cursor: "pointer" }}
          >
            Next formula →
          </button>
        ) : (
          <button
            onClick={check}
            disabled={busy || !formula.trim()}
            style={{ flex: 1, background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "12px 0", fontWeight: 800, fontSize: 14, cursor: "pointer", opacity: formula.trim() ? 1 : 0.5 }}
          >
            {busy ? "Checking…" : "Check"}
          </button>
        )}
      </div>

      {tries > 0 && !res?.correct && (
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 10, textAlign: "center" }}>
          {tries} tries so far — no rush, nothing is deducted for a wrong attempt here.
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <main style={{ maxWidth: 720, margin: "0 auto", padding: "16px 14px 40px" }}>{children}</main>
    </div>
  );
}
