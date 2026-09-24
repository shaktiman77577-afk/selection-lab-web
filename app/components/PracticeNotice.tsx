"use client";

/**
 * app/components/PracticeNotice.tsx — Excel practice screens ka notice.
 *
 * Website ki sheet asli exam ke software jaisi nahi dikhti. Student ko ye
 * shuru me hi pata hona chahiye, warna wo sochega exam me bhi yahi screen
 * milegi. Excel test, Excel practice aur worksheet — teeno me yahi ek notice,
 * taaki text ek jagah badle to sab jagah badle.
 */
export default function PracticeNotice({ compact = false }: { compact?: boolean }) {
  return (
    <div
      role="note"
      style={{
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: compact ? "8px 11px" : "10px 13px",
        margin: "0 0 12px",
        fontSize: compact ? 11.5 : 12.5,
        lineHeight: 1.65,
        color: "var(--muted)",
        background: "var(--card)",
      }}
    >
      <b style={{ color: "var(--text)" }}>Practice only.</b>{" "}
      This spreadsheet helps you learn formulas and data entry easily. It is not the exact
      interface you will get in the exam.
    </div>
  );
}
