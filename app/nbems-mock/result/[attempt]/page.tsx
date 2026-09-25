"use client";

/**
 * app/nbems-mock/result/[attempt]/page.tsx — NBEMS full mock ka combined scorecard.
 * Upar total aur har hisse ke marks, neeche har hisse ka review
 * (typing ki galtiyan, Excel ke sawaal, Word/PPT ke checks, MCQ ke jawab).
 * Backend: GET /api/nbems-mock/result/{attempt_id}
 */
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { MOCK_DISCLAIMER, PASS_PCT_GENERAL, PASS_PCT_RESERVED, SECTION_EMOJI, mmss, type MockSection, type SectionKey } from "@/lib/nbemsMock";

const GOLD = "#FFAB00";
const GREEN = "#2e8b4a";
const RED = "#c0392b";
const GREY = "#8a8f99";

export default function NbemsMockResult() {
  const params = useParams() as { attempt?: string };
  const router = useRouter();
  const attemptId = Number(params?.attempt);
  const [sid, setSid] = useState("");
  const [r, setR] = useState<any>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<SectionKey | null>(null);

  useEffect(() => {
    const u = getUser() as any;
    if (!u) { router.replace("/login"); return; }
    setSid(new URLSearchParams(window.location.search).get("s") || "");
    fetch(`${API_URL}/nbems-mock/result/${attemptId}?user_id=${u.id}`)
      .then(async (x) => { const d = await x.json(); if (!x.ok) throw new Error(d.detail || "Could not load the scorecard"); return d; })
      .then(setR)
      .catch((e) => setError(e.message || "Could not load the scorecard"));
  }, [attemptId, router]);

  const back = () => router.push(sid ? `/nbems-mock?s=${encodeURIComponent(sid)}` : "/tier2");

  if (error) return <Shell><p style={{ color: RED }}>{error}</p><button onClick={back} style={ghost}>Back to mocks</button></Shell>;
  if (!r) return <Shell><p style={{ color: "var(--muted)" }}>Loading…</p></Shell>;

  const sections: MockSection[] = r.mock.sections;
  const d = r.detail || {};
  const max = r.mock.total_marks || 100;
  const passGen = d.pass_general ?? (max * PASS_PCT_GENERAL) / 100;
  const passRes = d.pass_reserved ?? (max * PASS_PCT_RESERVED) / 100;
  const pct = Math.round((r.total_marks / max) * 100);

  return (
    <Shell>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button onClick={back} aria-label="Back" style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text)" }}>←</button>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Scorecard</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{r.mock.title}</div>
        </div>
      </div>

      {/* ── Total ── */}
      <div style={{ background: r.total_marks >= passGen ? "rgba(46,139,74,0.12)" : "rgba(192,57,43,0.10)",
                    border: `1px solid ${r.total_marks >= passGen ? GREEN : RED}`, borderRadius: 16, padding: 18, textAlign: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 40, fontWeight: 900, lineHeight: 1.1 }}>{r.total_marks}<span style={{ fontSize: 18, color: "var(--muted)" }}> / {max}</span></div>
        <div style={{ fontSize: 13, marginTop: 6 }}>
          {r.total_marks >= passGen
            ? <>Above the qualifying mark for all categories ({passGen}).</>
            : r.total_marks >= passRes
            ? <>Above the SC/ST qualifying mark ({passRes}), below the general mark ({passGen}).</>
            : <>Below the qualifying mark ({passGen} general, {passRes} SC/ST).</>}
        </div>
        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 6 }}>
          {pct}% · time used {mmss(d.seconds_used || 0)} of {r.mock.duration_min}:00
          {d.auto_submitted ? " · submitted automatically when the time ran out" : ""}
        </div>
      </div>

      {/* ── Hisse ── */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", marginBottom: 12 }}>
        {sections.map((s, i) => {
          const got = Number(r.marks?.[s.key] || 0);
          const part = d[s.key] || {};
          const frac = s.marks ? got / s.marks : 0;
          return (
            <div key={s.key} style={{ padding: "10px 12px", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13.5 }}>
                <span>{SECTION_EMOJI[s.key]}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{s.name}</span>
                <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{mmss(d.times?.[s.key] || 0)}</span>
                <b style={{ width: 72, textAlign: "right", color: part.attempted === false ? GREY : frac >= 0.5 ? GREEN : RED }}>{got} / {s.marks}</b>
              </div>
              <div style={{ height: 5, background: "var(--chip)", borderRadius: 5, marginTop: 6, overflow: "hidden" }}>
                <div style={{ width: `${Math.min(100, frac * 100)}%`, height: "100%", background: frac >= 0.5 ? GREEN : GOLD }} />
              </div>
              {part.attempted === false && <div style={{ fontSize: 11.5, color: GREY, marginTop: 4 }}>Not attempted</div>}
            </div>
          );
        })}
      </div>

      <p role="note" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.65, background: "var(--chip)", borderRadius: 10, padding: "9px 11px", marginBottom: 16 }}>
        <b style={{ color: "var(--text)" }}>Please note:</b> {MOCK_DISCLAIMER}
      </p>

      <h2 style={{ fontSize: 15, fontWeight: 800, margin: "0 0 8px" }}>Review each part</h2>
      {sections.map((s) => (
        <div key={s.key} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, marginBottom: 8 }}>
          <button onClick={() => setOpen(open === s.key ? null : s.key)} aria-expanded={open === s.key}
            style={{ display: "flex", width: "100%", alignItems: "center", gap: 10, padding: "12px 14px", background: "transparent", border: "none",
                     color: "var(--text)", cursor: "pointer", fontSize: 14, fontWeight: 800, textAlign: "left" }}>
            <span>{SECTION_EMOJI[s.key]}</span><span style={{ flex: 1 }}>{s.name}</span>
            <span style={{ color: "var(--muted)" }}>{open === s.key ? "▴" : "▾"}</span>
          </button>
          {open === s.key && <div style={{ padding: "0 14px 14px" }}>{review(s.key, d, r)}</div>}
        </div>
      ))}

      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={back} style={{ ...ghost, flex: 1 }}>All mocks</button>
        <button onClick={() => router.push(`/nbems-mock/${r.mock.id}${sid ? `?s=${encodeURIComponent(sid)}` : ""}`)}
          style={{ flex: 1, padding: 11, borderRadius: 10, border: "none", background: GOLD, color: "#1a1a1a", fontWeight: 800, cursor: "pointer" }}>
          Attempt again
        </button>
      </div>
    </Shell>
  );
}

// ── Har hisse ka review ─────────────────────────────────────────────────────
function review(key: SectionKey, d: any, r: any) {
  const part = d[key] || {};
  if (part.attempted === false && key !== "mcq") return <Muted>You did not attempt this part, so it got 0 marks.</Muted>;

  if (key === "typing") {
    const rows: [string, any][] = [
      ["Net speed", `${part.net_wpm} WPM (target ${part.target_wpm})`],
      ["Gross speed", `${part.gross_wpm} WPM`],
      ["Accuracy", `${part.accuracy}%`],
      ["Mistakes", Number(part.total_errors || 0)],
      ["Line-break mistakes", Number(part.line_errors || 0)],
    ];
    return (
      <>
        {rows.map(([k, v]) => <Row key={k} k={k} v={v} />)}
        <Muted>Marks = net WPM × 30 ÷ {part.target_wpm}, up to 30. Speed is worked out over the full typing time.</Muted>
        <div style={{ background: "#fff", color: "#111", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginTop: 10, fontSize: 13.5,
                      lineHeight: 1.9, fontFamily: "Consolas, 'Courier New', monospace", whiteSpace: "pre-wrap", wordBreak: "break-word",
                      WebkitUserSelect: "none", userSelect: "none", maxHeight: 420, overflowY: "auto" }}>
          {(part.segments || []).map((s: any, i: number) => {
            const sp = i > 0 ? (s.nl ? "\n".repeat(Math.min(2, Number(s.nl))) : " ") : "";
            if (s.op === "ok") return <span key={i} style={{ color: GREEN }}>{sp}{s.text}</span>;
            if (s.op === "not_reached") return <span key={i} style={{ color: GREY }}>{sp}{s.text}</span>;
            if (s.op === "extra") return <span key={i} title="not in the passage" style={{ background: "#ffe0e0", color: RED, textDecoration: "line-through" }}>{sp}{s.typed}</span>;
            return <span key={i} title={s.op === "missing" ? "not typed" : `you typed: ${s.typed}`}
                         style={{ background: "#ffe0e0", color: RED, textDecoration: s.op === "missing" ? "underline" : "none" }}>{sp}{s.text}</span>;
          })}
        </div>
        <Muted><span style={{ color: GREEN, fontWeight: 700 }}>Green</span> = correct · <span style={{ color: RED, fontWeight: 700 }}>Red</span> = mistake (hover or long-press to see what you typed) · <span style={{ color: GREY, fontWeight: 700 }}>Grey</span> = not reached.</Muted>
      </>
    );
  }

  if (key === "excel") {
    return (
      <>
        <Row k="Sheet score" v={`${part.raw_score} / ${part.raw_total} → ${part.marks} marks`} />
        {part.start_ok === false && <Muted>The table did not start at {part.start_cell}{part.start_found ? ` (it started at ${part.start_found})` : ""}.</Muted>}
        {part.borders_required && part.borders_ok === false && <Muted>All Borders were not applied to the whole table.</Muted>}
        {(part.layout_notes || []).map((n: any, i: number) => <Muted key={i}>{layoutNote(n)}</Muted>)}
        {(part.questions || []).map((q: any, i: number) => (
          <Row key={i} k={`${i + 1}. ${q.label}`} v={<b style={{ color: Number(q.got) >= Number(q.of) ? GREEN : RED }}>{q.got} / {q.of}</b>} />
        ))}
      </>
    );
  }

  if (key === "word" || key === "ppt") {
    return (
      <>
        {(part.rows || []).map((x: any, i: number) => (
          <div key={i} style={{ padding: "7px 0", borderTop: "1px solid var(--line)", fontSize: 13.5, lineHeight: 1.55 }}>
            <span style={{ color: x.ok ? GREEN : RED, fontWeight: 800 }}>{x.ok ? "✅" : "❌"}</span>{" "}
            <b>{x.label}</b> <span style={{ color: "var(--muted)", fontSize: 12 }}>({x.marks})</span>
            {!x.ok && <div style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: 24 }}>{x.fix}</div>}
          </div>
        ))}
      </>
    );
  }

  // MCQ
  return (
    <>
      <Row k="Correct" v={`${part.correct || 0} of ${part.count || 0} · ${part.answered || 0} answered`} />
      {(part.rows || []).map((q: any, i: number) => (
        <div key={q.id} style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.5, marginBottom: 6 }}>
            <span style={{ color: q.ok ? GREEN : q.selected ? RED : GREY }}>{q.ok ? "✅" : q.selected ? "❌" : "⏺"}</span> {i + 1}. {q.question}
          </div>
          {(q.options || []).map((o: string, j: number) => {
            const L = "ABCD"[j];
            const right = L === q.answer, mine = L === q.selected;
            return (
              <div key={L} style={{ fontSize: 13, padding: "4px 8px", borderRadius: 8, marginBottom: 3,
                                    background: right ? "rgba(46,139,74,0.14)" : mine ? "rgba(192,57,43,0.12)" : "transparent" }}>
                <b>{L}.</b> {o}{right ? " ✓" : ""}{mine && !right ? " (your answer)" : ""}
              </div>
            );
          })}
          {!q.selected && <Muted>Not answered.</Muted>}
          {q.explanation && <div style={{ fontSize: 12.5, color: "var(--muted)", lineHeight: 1.6, marginTop: 4 }}>{q.explanation}</div>}
        </div>
      ))}
    </>
  );
}

const LAYOUT: Record<string, string> = {
  blank_row_missing: "A blank row that is on the paper is missing near row",
  blank_row_extra: "There is an extra blank row near row",
  blank_col_missing: "A blank column that is on the paper is missing near column",
  blank_col_extra: "There is an extra blank column near column",
};
function layoutNote(n: any): string {
  if (typeof n === "string") return n;
  return `${LAYOUT[n?.op] || "Layout differs from the paper near"} ${n?.ref || ""}.`;
}

function Row({ k, v }: { k: string; v: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 13, padding: "6px 0", borderTop: "1px solid var(--line)" }}>
      <span style={{ color: "var(--muted)" }}>{k}</span><b style={{ flexShrink: 0, textAlign: "right" }}>{v}</b>
    </div>
  );
}
function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, marginTop: 6 }}>{children}</div>;
}
function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ maxWidth: 760, margin: "0 auto", padding: "14px 14px 40px", color: "var(--text)" }}>{children}</div>;
}
const ghost: React.CSSProperties = {
  padding: 11, borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--text)", fontWeight: 700, cursor: "pointer",
};
