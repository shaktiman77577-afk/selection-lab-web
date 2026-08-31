"use client";

/**
 * ExcelGrid.tsx — Excel jaisi chhoti table + formula bar.
 *
 * Practice aur test dono yahi use karte hain, taaki dono screen bilkul ek
 * jaisi lagein. Asli Excel ka clone nahi hai — 26 column, ribbon, sheet tabs
 * kuch nahi. Sirf utna hai jitne me formula test ho jaye: column letters,
 * row numbers, grid lines, aur ek editable cell.
 *
 * Formula alag box me type hota hai, cell ke andar nahi — mobile par cell ke
 * andar type karna takleef deta hai, aur Excel me bhi formula bar upar hi
 * hoti hai.
 */

import { useState, useRef, useEffect } from "react";

const LINE = "#d0d7e2";
const HEAD = "#eef1f6";
const BLUE = "#1a73e8";

export function colLetter(i: number): string {
  let s = "";
  i += 1;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

/** "Name|Sales;Raju|1200" -> [["Name","Sales"],["Raju","1200"]] */
export function parseGrid(gridData: string): string[][] {
  return (gridData || "")
    .split(";")
    .filter((l) => l.trim() !== "")
    .map((l) => l.split("|"));
}

export function ExcelGrid({
  gridData,
  targetCell,
  answer,
  answerState,
}: {
  gridData: string;
  targetCell: string;
  answer?: string;              // sahi hone par cell me jo value dikhegi
  answerState?: "none" | "right" | "wrong";
}) {
  const rows = parseGrid(gridData);
  const cols = Math.max(...rows.map((r) => r.length), 1);

  const cell = (c: number, r: number) => `${colLetter(c)}${r + 1}`;

  const th: React.CSSProperties = {
    background: HEAD, border: `1px solid ${LINE}`, color: "#5f6a7d",
    fontSize: 11, fontWeight: 700, textAlign: "center", padding: "4px 6px",
    position: "sticky", top: 0,
  };

  return (
    <div style={{ overflowX: "auto", border: `1px solid ${LINE}`, borderRadius: 6, background: "#fff" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 320 }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 34 }} />
            {Array.from({ length: cols }).map((_, c) => (
              <th key={c} style={th}>{colLetter(c)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              <td style={{ ...th, position: "static" }}>{r + 1}</td>
              {Array.from({ length: cols }).map((_, c) => {
                const ref = cell(c, r);
                const isTarget = ref === (targetCell || "").toUpperCase();
                const num = /^-?\d+(\.\d+)?$/.test((row[c] || "").trim());
                return (
                  <td
                    key={c}
                    style={{
                      border: isTarget ? `2px solid ${answerState === "right" ? "#1c7a3e" : answerState === "wrong" ? "#c0392b" : BLUE}` : `1px solid ${LINE}`,
                      padding: "6px 8px",
                      fontSize: 13,
                      color: "#111",
                      background: isTarget ? (answerState === "right" ? "#eaf7ee" : answerState === "wrong" ? "#fdecea" : "#e8f0fe") : "#fff",
                      textAlign: num ? "right" : "left",
                      whiteSpace: "nowrap",
                      fontWeight: r === 0 ? 700 : 400,
                      minWidth: 60,
                    }}
                  >
                    {isTarget ? (answer ?? "") : (row[c] || "")}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Formula bar.
 * suggest = function naam ki list. Practice me bheji jaati hai, test me NAHI —
 * exam me auto-suggest milta nahi, to test me dene se yaad karne ki zaroorat
 * hi khatam ho jaati.
 */
export function FormulaBar({
  value,
  onChange,
  onSubmit,
  targetCell,
  suggest,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  targetCell: string;
  suggest?: string[];
  disabled?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<string[]>([]);
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!suggest || suggest.length === 0) { setOpen(false); return; }
    // Aakhri shabd jo type ho raha hai usi par suggest — "=SUM(A1,AV" par bhi chalta hai
    const m = (value || "").match(/([A-Za-z]+)$/);
    if (!m) { setOpen(false); return; }
    const p = m[1].toUpperCase();
    const found = suggest.filter((f) => f.startsWith(p) && f !== p).slice(0, 6);
    setHits(found);
    setOpen(found.length > 0);
  }, [value, suggest]);

  function pick(fn: string) {
    const next = (value || "").replace(/([A-Za-z]+)$/, fn + "(");
    onChange(next);
    setOpen(false);
    ref.current?.focus();
  }

  return (
    <div style={{ position: "relative", marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "stretch", border: `1px solid ${LINE}`, borderRadius: 6, background: "#fff", overflow: "hidden" }}>
        <div style={{ background: HEAD, borderRight: `1px solid ${LINE}`, padding: "0 10px", display: "flex", alignItems: "center", fontSize: 12, fontWeight: 800, color: "#5f6a7d", minWidth: 46, justifyContent: "center" }}>
          {(targetCell || "").toUpperCase()}
        </div>
        <input
          ref={ref}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { setOpen(false); onSubmit?.(); }
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder || "=SUM(A1:A5)"}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="characters"
          autoComplete="off"
          style={{
            flex: 1, border: "none", outline: "none", padding: "11px 12px",
            fontSize: 15, fontFamily: "Consolas, 'Courier New', monospace",
            color: "#111", background: "#fff", minWidth: 0,
          }}
        />
      </div>

      {open && (
        <div
          style={{
            position: "absolute", left: 46, right: 0, top: "100%", marginTop: 2, zIndex: 20,
            background: "#fff", border: `1px solid ${LINE}`, borderRadius: 6,
            boxShadow: "0 6px 20px rgba(0,0,0,0.14)", overflow: "hidden",
          }}
        >
          {hits.map((f) => (
            <div
              key={f}
              onMouseDown={(e) => { e.preventDefault(); pick(f); }}
              style={{
                padding: "9px 12px", fontSize: 13.5, cursor: "pointer",
                fontFamily: "Consolas, 'Courier New', monospace", color: "#111",
                borderBottom: `1px solid ${HEAD}`,
              }}
            >
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
