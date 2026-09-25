"use client";

/**
 * NbemsExamStructure.tsx — NBEMS Junior Assistant skill test ka "Exam structure"
 * card. NBEMS series ke andar aur mock list par dikhta hai.
 *
 * Jo baatein sources me milti hain (75 min, 100 marks, CBT, qualifying %,
 * final = CBT + Skill) wo seedhi likhi hain. Hisson ka time/marks split
 * NBEMS ne nahi chhapa — wo saaf "our mock pattern" likh kar dikhate hain.
 */
import { useState } from "react";
import { DEFAULT_SECTIONS, MOCK_DISCLAIMER, PASS_PCT_GENERAL, PASS_PCT_RESERVED, SECTION_EMOJI, type MockSection } from "@/lib/nbemsMock";

const GOLD = "#FFAB00";

export default function NbemsExamStructure({ sections = DEFAULT_SECTIONS, startOpen = false }:
  { sections?: MockSection[]; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  const total = sections.reduce((a, s) => a + s.marks, 0);
  const mins = sections.reduce((a, s) => a + s.minutes, 0);

  const fact = (k: string, v: string) => (
    <div style={{ background: "var(--chip)", borderRadius: 10, padding: "8px 10px", minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{k}</div>
      <div style={{ fontSize: 14.5, fontWeight: 800, marginTop: 2 }}>{v}</div>
    </div>
  );

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 14, marginBottom: 12, boxShadow: "var(--shadow)" }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "transparent", border: "none",
                 padding: 0, cursor: "pointer", color: "var(--text)", textAlign: "left" }}>
        <span style={{ fontSize: 26 }}>🧾</span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 15.5, fontWeight: 800 }}>Exam structure</span>
          <span style={{ display: "block", fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>
            Skill Test (Stage II) · 75 minutes · 100 marks · computer based
          </span>
        </span>
        <span style={{ color: "var(--muted)", fontSize: 18 }}>{open ? "▴" : "▾"}</span>
      </button>

      {open && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: 12 }}>
            {fact("Duration", "75 minutes")}
            {fact("Total marks", "100")}
            {fact("Mode", "CBT (on computer)")}
            {fact("Qualifying", `${PASS_PCT_GENERAL}% · SC/ST ${PASS_PCT_RESERVED}%`)}
          </div>

          <div style={{ fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>
            <b>Final selection</b> is made on the total of your marks in the Computer Based Test (Stage I) and this
            Computer Knowledge / Skill Test (Stage II). So every mark here adds to your merit.
          </div>

          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>What is asked</div>
          <div style={{ fontSize: 13, lineHeight: 1.7, color: "var(--muted)", marginBottom: 12 }}>
            Typing of an official letter, data entry in an Excel sheet, a document in MS Word, a short
            presentation in MS PowerPoint, and objective questions on computer knowledge.
          </div>

          <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>
            Our mock pattern <span style={{ fontWeight: 500, color: "var(--muted)" }}>· one {mins}-minute clock, move between parts freely</span>
          </div>
          <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", marginBottom: 10 }}>
            {sections.map((s, i) => (
              <div key={s.key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", fontSize: 13,
                                        borderTop: i ? "1px solid var(--line)" : "none" }}>
                <span style={{ width: 22 }}>{SECTION_EMOJI[s.key]}</span>
                <span style={{ flex: 1, minWidth: 0 }}>{s.name}</span>
                <span style={{ color: "var(--muted)", fontVariantNumeric: "tabular-nums", width: 54, textAlign: "right" }}>{s.minutes} min</span>
                <b style={{ fontVariantNumeric: "tabular-nums", width: 64, textAlign: "right" }}>{s.marks} marks</b>
              </div>
            ))}
            <div style={{ display: "flex", gap: 10, padding: "8px 10px", fontSize: 13, borderTop: "1px solid var(--line)", background: "var(--chip)" }}>
              <b style={{ flex: 1, paddingLeft: 32 }}>Total</b>
              <b style={{ width: 54, textAlign: "right" }}>{mins} min</b>
              <b style={{ width: 64, textAlign: "right", color: GOLD }}>{total} marks</b>
            </div>
          </div>

          <div role="note" style={{ fontSize: 12, lineHeight: 1.65, color: "var(--muted)", background: "var(--chip)", borderRadius: 10, padding: "9px 11px" }}>
            <b style={{ color: "var(--text)" }}>Please note:</b> {MOCK_DISCLAIMER}
          </div>
        </div>
      )}
    </div>
  );
}
