"use client";

/**
 * SheetEditor.tsx — khaali sheet jise student khud bharta hai.
 *
 * Purani ExcelGrid sirf DIKHATI hai — sheet pehle se bhari hoti hai aur
 * student ek formula bar se ek cell bharta hai. Worksheet wale test me use
 * POORI SHEET KHUD BANANI hoti hai, isliye ye alag component hai.
 *
 * Excel ki wo aadatein jo yahan zaroori thi:
 *   • Cell par tap karke seedha usi me likhna
 *   • Enter se neeche, Tab se daayein, Shift+Tab se baayein
 *   • Arrow keys se cell badalna (jab type nahi kar rahe)
 *   • Ungli kheench kar kai cell chunna
 *   • Bold (Ctrl+B) aur Merge — dono par exam me marks hain
 *   • Formula likh kar Enter dabate hi cell me JAWAB dikhna
 *
 * Formula ka jawab backend se aata hai (wahi engine jo jaanch karta hai),
 * taaki jo student ko dikhe aur jis par marks mile, dono ek hi hisaab se
 * nikle. Do alag hisaab rakhte to kabhi na kabhi wo alag ho jate.
 */

import { useState, useRef, useEffect, type CSSProperties,
         type KeyboardEvent as RKeyboardEvent, type PointerEvent as RPointerEvent,
         type ChangeEvent as RChangeEvent } from "react";

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

export function colIndex(letters: string): number {
  let n = 0;
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export function refOf(r: number, c: number) { return `${colLetter(c)}${r + 1}`; }

export function parseRef(ref: string): { r: number; c: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d{1,5})$/.exec((ref || "").trim());
  return m ? { r: Number(m[2]) - 1, c: colIndex(m[1]) } : null;
}

export type SheetValue = {
  cells: Record<string, string>;   // { "A1": "Code", "E4": "=D4*12%" }
  bold: string[];
  merges: string[];                // ["A1:H1"]
};

/** { A1:"x" } -> "x|;|" wali sheet string, backend ke liye */
export function toGridData(cells: Record<string, string>): string {
  const pts: { r: number; c: number; v: string }[] = [];
  for (const [ref, v] of Object.entries(cells)) {
    const p = parseRef(ref);
    if (p && (v ?? "").trim() !== "") pts.push({ ...p, v });
  }
  if (!pts.length) return "";
  const maxR = Math.max(...pts.map((p) => p.r));
  const maxC = Math.max(...pts.map((p) => p.c));
  const at = new Map(pts.map((p) => [`${p.r}:${p.c}`, p.v]));
  const rows: string[] = [];
  for (let r = 0; r <= maxR; r++) {
    const row: string[] = [];
    for (let c = 0; c <= maxC; c++) row.push(at.get(`${r}:${c}`) ?? "");
    rows.push(row.join("|"));
  }
  return rows.join(";");
}

type Box = { r1: number; c1: number; r2: number; c2: number };
const norm = (a: { r: number; c: number }, b: { r: number; c: number }): Box => ({
  r1: Math.min(a.r, b.r), r2: Math.max(a.r, b.r),
  c1: Math.min(a.c, b.c), c2: Math.max(a.c, b.c),
});
const inBox = (b: Box | null, r: number, c: number) =>
  !!b && r >= b.r1 && r <= b.r2 && c >= b.c1 && c <= b.c2;

function mergeBox(m: string): Box | null {
  const [a, b] = (m || "").split(":");
  const pa = parseRef(a), pb = parseRef(b || a);
  return pa && pb ? norm(pa, pb) : null;
}

export function SheetEditor({
  rows = 16,
  cols = 10,
  value,
  onChange,
  computed,
  disabled,
}: {
  rows?: number;
  cols?: number;
  value: SheetValue;
  onChange: (v: SheetValue) => void;
  /** Formula wale cell ke jawab — { "E4": "144" } */
  computed?: Record<string, string>;
  disabled?: boolean;
}) {
  const [anchor, setAnchor] = useState({ r: 0, c: 0 });
  const [focus, setFocus] = useState({ r: 0, c: 0 });
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState("");
  const drag = useRef(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLInputElement | null>(null);

  const sel = norm(anchor, focus);
  const boldSet = new Set((value.bold || []).map((b) => b.toUpperCase()));
  const merges = (value.merges || []).map((m) => ({ key: m, box: mergeBox(m) }))
    .filter((m) => m.box) as { key: string; box: Box }[];

  /** Cell kis merge ka hissa hai */
  const mergeAt = (r: number, c: number) => merges.find((m) => inBox(m.box, r, c));

  useEffect(() => { if (editing) input.current?.focus(); }, [editing]);

  function set(ref: string, text: string) {
    const cells = { ...value.cells };
    if ((text ?? "").trim() === "") delete cells[ref];
    else cells[ref] = text;
    onChange({ ...value, cells });
  }

  function commit(move: "down" | "right" | "left" | null) {
    if (editing) {
      set(refOf(editing.r, editing.c), draft);
      setEditing(null);
      setDraft("");
    }
    if (!move) return;
    const d = move === "down" ? { r: 1, c: 0 }
      : move === "right" ? { r: 0, c: 1 } : { r: 0, c: -1 };
    const r = Math.max(0, Math.min(rows - 1, focus.r + d.r));
    const c = Math.max(0, Math.min(cols - 1, focus.c + d.c));
    setAnchor({ r, c }); setFocus({ r, c });
    wrap.current?.focus();
  }

  function startEdit(r: number, c: number, initial?: string) {
    if (disabled) return;
    const m = mergeAt(r, c);
    const at = m ? { r: m.box.r1, c: m.box.c1 } : { r, c };
    setEditing(at);
    setDraft(initial !== undefined ? initial : (value.cells[refOf(at.r, at.c)] ?? ""));
  }

  // ── Grid par keyboard ──
  function onKey(e: RKeyboardEvent) {
    if (disabled) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === "b") { e.preventDefault(); toggleBold(); }
      return;
    }
    const nav: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    if (nav[e.key]) {
      e.preventDefault();
      const [dr, dc] = nav[e.key];
      const r = Math.max(0, Math.min(rows - 1, focus.r + dr));
      const c = Math.max(0, Math.min(cols - 1, focus.c + dc));
      setFocus({ r, c });
      if (!e.shiftKey) setAnchor({ r, c });
      return;
    }
    if (e.key === "Enter") { e.preventDefault(); startEdit(focus.r, focus.c); return; }
    if (e.key === "Tab") {
      e.preventDefault();
      const c = Math.max(0, Math.min(cols - 1, focus.c + (e.shiftKey ? -1 : 1)));
      setAnchor({ r: focus.r, c }); setFocus({ r: focus.r, c });
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      const cells = { ...value.cells };
      for (let r = sel.r1; r <= sel.r2; r++)
        for (let c = sel.c1; c <= sel.c2; c++) delete cells[refOf(r, c)];
      onChange({ ...value, cells });
      return;
    }
    // Koi akshar dabaya — Excel ki tarah seedha likhna shuru
    if (e.key.length === 1 && !e.altKey) {
      e.preventDefault();
      startEdit(focus.r, focus.c, e.key);
    }
  }

  function toggleBold() {
    const refs: string[] = [];
    for (let r = sel.r1; r <= sel.r2; r++)
      for (let c = sel.c1; c <= sel.c2; c++) refs.push(refOf(r, c));
    const allBold = refs.every((x) => boldSet.has(x));
    const next = new Set(boldSet);
    refs.forEach((x) => (allBold ? next.delete(x) : next.add(x)));
    onChange({ ...value, bold: Array.from(next).sort() });
  }

  function toggleMerge() {
    const key = `${refOf(sel.r1, sel.c1)}:${refOf(sel.r2, sel.c2)}`;
    const existing = merges.find((m) =>
      m.box.r1 === sel.r1 && m.box.c1 === sel.c1 && m.box.r2 === sel.r2 && m.box.c2 === sel.c2);
    if (existing) {
      onChange({ ...value, merges: (value.merges || []).filter((m) => m !== existing.key) });
      return;
    }
    if (sel.r1 === sel.r2 && sel.c1 === sel.c2) return;   // ek cell merge nahi hota
    // Overlap hatate hain, warna do merge ek hi cell par lag jate
    const keep = (value.merges || []).filter((m) => {
      const b = mergeBox(m);
      return !b || b.r2 < sel.r1 || b.r1 > sel.r2 || b.c2 < sel.c1 || b.c1 > sel.c2;
    });
    onChange({ ...value, merges: [...keep, key] });
  }

  const th: CSSProperties = {
    background: HEAD, border: `1px solid ${LINE}`, color: "#5f6a7d",
    fontSize: 11, fontWeight: 700, textAlign: "center", padding: "3px 5px",
    userSelect: "none",
  };

  const cur = refOf(focus.r, focus.c);
  const curMerge = mergeAt(focus.r, focus.c);
  const curRef = curMerge ? refOf(curMerge.box.r1, curMerge.box.c1) : cur;

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
        <button onClick={toggleBold} disabled={disabled} title="Ctrl+B"
                style={{ ...btn, fontWeight: 900, minWidth: 34 }}>B</button>
        <button onClick={toggleMerge} disabled={disabled}
                style={btn}>Merge</button>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 11.5, color: "var(--muted)", fontFamily: "Consolas, monospace" }}>
          {curMerge ? `${curMerge.key} (merged)` : cur}
        </span>
      </div>

      {/* Formula bar — cell ka ASLI content, jawab nahi */}
      <div style={{ display: "flex", border: `1px solid ${LINE}`, borderRadius: 6,
                    background: "#fff", overflow: "hidden", marginBottom: 8 }}>
        <div style={{ background: HEAD, borderRight: `1px solid ${LINE}`, padding: "0 10px",
                      display: "flex", alignItems: "center", fontSize: 12, fontWeight: 800,
                      color: "#5f6a7d", minWidth: 46, justifyContent: "center" }}>
          {curRef}
        </div>
        <input
          value={editing ? draft : (value.cells[curRef] ?? "")}
          disabled={disabled}
          onChange={(e: RChangeEvent<HTMLInputElement>) => {
            if (!editing) startEdit(focus.r, focus.c, e.target.value);
            else setDraft(e.target.value);
          }}
          onKeyDown={(e: RKeyboardEvent) => { if (e.key === "Enter") { e.preventDefault(); commit("down"); } }}
          placeholder="Cell ka content — text, number ya =formula"
          spellCheck={false} autoCorrect="off" autoComplete="off"
          style={{ flex: 1, border: "none", outline: "none", padding: "10px 12px",
                   fontSize: 14.5, fontFamily: "Consolas, 'Courier New', monospace",
                   color: "#111", minWidth: 0 }}
        />
      </div>

      {/* Sheet */}
      <div
        ref={wrap}
        tabIndex={0}
        onKeyDown={onKey}
        style={{ overflow: "auto", border: `1px solid ${LINE}`, borderRadius: 6,
                 background: "#fff", outline: "none", maxHeight: "58vh",
                 WebkitUserSelect: "none", userSelect: "none" }}
      >
        <table style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ ...th, position: "sticky", left: 0, top: 0, zIndex: 3, width: 34 }} />
              {Array.from({ length: cols }).map((_, c) => (
                <th key={c} style={{ ...th, position: "sticky", top: 0, zIndex: 2, minWidth: 78 }}>
                  {colLetter(c)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, r) => (
              <tr key={r}>
                <td style={{ ...th, position: "sticky", left: 0, zIndex: 1 }}>{r + 1}</td>
                {Array.from({ length: cols }).map((_, c) => {
                  const m = mergeAt(r, c);
                  // Merge me sirf upar-baayan cell chhapta hai, baaki chhode jate hain
                  if (m && !(m.box.r1 === r && m.box.c1 === c)) return null;
                  const span = m
                    ? { colSpan: m.box.c2 - m.box.c1 + 1, rowSpan: m.box.r2 - m.box.r1 + 1 }
                    : {};
                  const ref = refOf(r, c);
                  const isEdit = editing && editing.r === r && editing.c === c;
                  const on = inBox(sel, r, c);
                  const isFocus = focus.r === r && focus.c === c;
                  const raw = value.cells[ref] ?? "";
                  // Formula wale cell me JAWAB dikhta hai, formula nahi —
                  // bilkul Excel ki tarah. Formula upar bar me dikhta hai.
                  const shown = raw.startsWith("=") ? (computed?.[ref] ?? "…") : raw;
                  const num = /^-?[\d,]+(\.\d+)?$/.test(shown.trim()) && shown.trim() !== "";
                  const err = shown.startsWith("#");

                  return (
                    <td
                      key={c}
                      {...span}
                      onPointerDown={(e: RPointerEvent) => {
                        if (disabled) return;
                        e.preventDefault();
                        drag.current = true;
                        commit(null);
                        setAnchor({ r, c }); setFocus({ r, c });
                        wrap.current?.focus();
                      }}
                      onPointerEnter={() => { if (drag.current) setFocus({ r, c }); }}
                      onPointerUp={() => { drag.current = false; }}
                      onDoubleClick={() => startEdit(r, c)}
                      style={{
                        border: isFocus ? `2px solid ${BLUE}` : `1px solid ${LINE}`,
                        background: isFocus ? "#fff" : on ? "#e8f0fe" : "#fff",
                        padding: 0, minWidth: 78, height: 30,
                        textAlign: m ? "center" : num ? "right" : "left",
                        fontWeight: boldSet.has(ref) ? 800 : 400,
                        color: err ? "#c0392b" : "#111",
                        whiteSpace: "nowrap", fontSize: 13,
                      }}
                    >
                      {isEdit ? (
                        <input
                          ref={input}
                          value={draft}
                          onChange={(e: RChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
                          onBlur={() => commit(null)}
                          onKeyDown={(e: RKeyboardEvent) => {
                            if (e.key === "Enter") { e.preventDefault(); commit("down"); }
                            else if (e.key === "Tab") { e.preventDefault(); commit(e.shiftKey ? "left" : "right"); }
                            else if (e.key === "Escape") { e.preventDefault(); setEditing(null); setDraft(""); }
                          }}
                          spellCheck={false} autoCorrect="off" autoComplete="off"
                          style={{ width: "100%", height: 28, border: "none", outline: "none",
                                   padding: "0 6px", fontSize: 13, background: "transparent",
                                   fontFamily: "Consolas, 'Courier New', monospace" }}
                        />
                      ) : (
                        <div style={{ padding: "0 6px", lineHeight: "28px", overflow: "hidden" }}>
                          {shown}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>
        Cell par tap karke likhiye · Enter se neeche · Tab se daayein ·
        kai cell chunne ke liye ungli kheenchiye, phir <b>B</b> ya <b>Merge</b>
      </div>
    </div>
  );
}

const btn: CSSProperties = {
  background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)",
  borderRadius: 8, padding: "6px 11px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
};
