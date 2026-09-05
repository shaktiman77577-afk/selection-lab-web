"use client";

/**
 * ExcelGrid.tsx — Excel jaisi sheet + formula bar.
 *
 * Practice aur test dono yahi use karte hain, taaki dono screen bilkul ek
 * jaisi lagein. Asli Excel ka clone nahi hai — ribbon, sheet tabs, formatting
 * kuch nahi. Par jo cheezein FORMULA banate waqt haath chalati hain, wo ab
 * yahan hain:
 *
 *   • Cell par tap karke reference daalna — asli Excel me aap "=" dabate
 *     hain, phir C2 par click, "*", phir D2 par click. Phone par "C2" haath
 *     se likhna sabse dheema hissa tha.
 *   • Cell par ungli kheench kar range daalna — C2:C8.
 *   • Enter dabate hi cell me jawab (backend calculator se).
 *   • Fill handle — cell ke kone ka chhota chaukor, neeche kheenchiye aur
 *     formula poori range me bhar jayega. Jisne $ galat lagaya use apni
 *     galti KHUD dikhegi, hamare batane se pehle.
 *   • Neeche status bar — chune hue cells ka Sum / Average / Count, jaise
 *     Excel me neeche dikhta hai.
 *
 * Formula alag box me type hota hai, cell ke andar nahi — mobile par cell ke
 * andar type karna takleef deta hai, aur Excel me bhi formula bar upar hi
 * hoti hai.
 */

import { useState, useRef, useEffect, useCallback, type CSSProperties,
         type PointerEvent as RPointerEvent, type KeyboardEvent as RKeyboardEvent } from "react";

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

/** "C4" -> {r:3, c:2} */
export function parseRef(ref: string): { r: number; c: number } | null {
  const m = /^\$?([A-Za-z]{1,3})\$?(\d{1,5})$/.exec((ref || "").trim());
  if (!m) return null;
  return { r: Number(m[2]) - 1, c: colIndex(m[1]) };
}

/** "Name|Sales;Raju|1200" -> [["Name","Sales"],["Raju","1200"]] */
export function parseGrid(gridData: string): string[][] {
  return (gridData || "")
    .split(";")
    .filter((l) => l.trim() !== "")
    .map((l) => l.split("|"));
}

type Box = { r1: number; r2: number; c1: number; c2: number };

function boxOf(a: string, b: string): Box | null {
  const A = parseRef(a), B = parseRef(b || a);
  if (!A || !B) return null;
  return {
    r1: Math.min(A.r, B.r), r2: Math.max(A.r, B.r),
    c1: Math.min(A.c, B.c), c2: Math.max(A.c, B.c),
  };
}

function boxOfRange(range: string): Box | null {
  const [a, b] = (range || "").split(":");
  return a ? boxOf(a, b || a) : null;
}

const inBox = (b: Box | null, r: number, c: number) =>
  !!b && r >= b.r1 && r <= b.r2 && c >= b.c1 && c <= b.c2;

export function ExcelGrid({
  gridData,
  targetCell,
  fillRange,
  values,
  answer,
  answerState,
  pickMode,
  onPick,
  onFill,
  filledRange,
  canFill,
  statusBar = true,
}: {
  gridData: string;
  targetCell: string;
  /** Sawal jitni range bharwana chahta hai — halke rang me ishara */
  fillRange?: string;
  /** Live jawab — { "E2": "500", "E3": "360" } */
  values?: Record<string, string>;
  /** Ek cell ka jawab (purana raasta, practice mode) */
  answer?: string;
  answerState?: "none" | "right" | "wrong";
  /** true = formula type ho raha hai, tap karne par reference judega */
  pickMode?: boolean;
  onPick?: (ref: string) => void;
  /** Fill handle kheenchne par — "E2:E6" */
  onFill?: (range: string) => void;
  /** Student ne asal me kahan tak bhara */
  filledRange?: string;
  canFill?: boolean;
  statusBar?: boolean;
}) {
  const rows = parseGrid(gridData);
  const cols = Math.max(...rows.map((r) => r.length), 1);

  const [sel, setSel] = useState<{ a: string; b: string } | null>(null);
  const drag = useRef<{ kind: "sel" | "fill"; from: string } | null>(null);
  const [dragTo, setDragTo] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const target = (targetCell || "").toUpperCase();
  const hintBox = boxOfRange(fillRange || "") || boxOf(target, target);
  const filledBox = boxOfRange(filledRange || "");
  const selBox = sel ? boxOf(sel.a, sel.b) : null;
  const dragBox = drag.current && dragTo ? boxOf(drag.current.from, dragTo) : null;

  /** Screen ke us point par kaunsa cell hai */
  function refAt(x: number, y: number): string | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const td = el?.closest?.("[data-ref]") as HTMLElement | null;
    return td?.getAttribute("data-ref") || null;
  }

  const finish = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (!d || !dragTo) { setDragTo(null); return; }
    const rng = d.from === dragTo ? d.from : `${d.from}:${dragTo}`;
    if (d.kind === "fill") {
      // Fill handle hamesha target cell se shuru hota hai
      onFill?.(dragTo === target ? target : `${target}:${dragTo}`);
    } else if (pickMode) {
      onPick?.(rng);
    } else {
      setSel({ a: d.from, b: dragTo });
    }
    setDragTo(null);
  }, [dragTo, pickMode, onPick, onFill, target]);

  useEffect(() => {
    if (!drag.current) return;
    const move = (e: PointerEvent) => {
      const r = refAt(e.clientX, e.clientY);
      if (r) setDragTo(r);
      e.preventDefault();
    };
    const up = () => finish();
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [dragTo, finish]);

  function startDrag(kind: "sel" | "fill", ref: string, e: RPointerEvent) {
    e.preventDefault();
    drag.current = { kind, from: ref };
    setDragTo(ref);
  }

  // ── Arrow keys — Excel ki tarah cell se cell ──
  function onKeyDown(e: RKeyboardEvent) {
    if (pickMode) return;                       // formula type ho raha hai
    const cur = parseRef(sel?.b || target || "A1");
    if (!cur) return;
    const d: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    const m = d[e.key];
    if (!m) return;
    e.preventDefault();
    const r = Math.max(0, Math.min(rows.length - 1, cur.r + m[0]));
    const c = Math.max(0, Math.min(cols - 1, cur.c + m[1]));
    const ref = `${colLetter(c)}${r + 1}`;
    setSel({ a: ref, b: ref });
  }

  /** Cell me dikhne wali value — live jawab, warna sheet ka data */
  function shown(ref: string, raw: string): string {
    const v = values?.[ref];
    if (v !== undefined) return v;
    if (ref === target && answer !== undefined && answer !== "") return answer;
    // Fill wali range ke cell student ko bharne hain, isliye khaali dikhte hain
    if (fillRange && inBox(hintBox, parseRef(ref)!.r, parseRef(ref)!.c) && !raw) return "";
    return raw;
  }

  // ── Status bar ── chune hue cells ka hisaab, jaise Excel me neeche
  const stat = (() => {
    if (!statusBar || !selBox) return null;
    const nums: number[] = [];
    let filledCount = 0;
    for (let r = selBox.r1; r <= selBox.r2; r++) {
      for (let c = selBox.c1; c <= selBox.c2; c++) {
        const ref = `${colLetter(c)}${r + 1}`;
        const t = shown(ref, (rows[r] || [])[c] || "").trim();
        if (t !== "") filledCount++;
        const n = Number(t.replace(/,/g, ""));
        if (t !== "" && Number.isFinite(n)) nums.push(n);
      }
    }
    const cells = (selBox.r2 - selBox.r1 + 1) * (selBox.c2 - selBox.c1 + 1);
    if (cells < 2 && nums.length < 1) return null;
    const sum = nums.reduce((a, b) => a + b, 0);
    return {
      count: filledCount,
      sum: nums.length ? Math.round(sum * 100) / 100 : null,
      avg: nums.length ? Math.round((sum / nums.length) * 100) / 100 : null,
    };
  })();

  const th: CSSProperties = {
    background: HEAD, border: `1px solid ${LINE}`, color: "#5f6a7d",
    fontSize: 11, fontWeight: 700, textAlign: "center", padding: "4px 6px",
  };

  const tone = answerState === "right" ? "#1c7a3e" : answerState === "wrong" ? "#c0392b" : BLUE;
  const tint = answerState === "right" ? "#eaf7ee" : answerState === "wrong" ? "#fdecea" : "#e8f0fe";

  return (
    <div>
      <div
        ref={wrapRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{
          overflowX: "auto", border: `1px solid ${LINE}`, borderRadius: 6,
          background: "#fff", outline: "none", touchAction: "pan-y",
          WebkitUserSelect: "none", userSelect: "none",
        }}
      >
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
                <td style={th}>{r + 1}</td>
                {Array.from({ length: cols }).map((_, c) => {
                  const ref = `${colLetter(c)}${r + 1}`;
                  const isTarget = ref === target;
                  const isHint = inBox(hintBox, r, c);
                  const isFilled = inBox(filledBox, r, c);
                  const isSel = inBox(selBox, r, c) || inBox(dragBox, r, c);
                  const text = shown(ref, row[c] || "");
                  const num = /^-?[\d,]+(\.\d+)?$/.test(text.trim()) && text.trim() !== "";
                  const err = text.startsWith("#");
                  // Fill handle sirf target cell par, aur tabhi jab kuch bhara ho
                  const showHandle = canFill && isTarget && !!onFill &&
                    (values?.[ref] !== undefined || (answer ?? "") !== "");

                  return (
                    <td
                      key={c}
                      data-ref={ref}
                      onPointerDown={(e) => startDrag("sel", ref, e)}
                      onClick={() => { if (pickMode) onPick?.(ref); }}
                      style={{
                        position: "relative",
                        border: isTarget ? `2px solid ${tone}`
                          : isSel ? `1px solid ${BLUE}`
                          : isHint || isFilled ? `1px solid ${tone}` : `1px solid ${LINE}`,
                        padding: "6px 8px",
                        fontSize: 13,
                        color: err ? "#c0392b" : "#111",
                        background: isTarget ? tint
                          : isSel ? "#dbe7fb"
                          : isFilled ? "#f0f6ff"
                          : isHint ? `${tint}88` : "#fff",
                        textAlign: num ? "right" : "left",
                        whiteSpace: "nowrap",
                        fontWeight: r === 0 ? 700 : 400,
                        minWidth: 60,
                        cursor: pickMode ? "cell" : "default",
                      }}
                    >
                      {text}
                      {showHandle && (
                        <span
                          onPointerDown={(e) => { e.stopPropagation(); startDrag("fill", ref, e); }}
                          title="Neeche kheenchiye"
                          style={{
                            position: "absolute", right: -4, bottom: -4,
                            width: 9, height: 9, background: tone,
                            border: "1px solid #fff", cursor: "crosshair", zIndex: 3,
                          }}
                        />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stat && (
        <div style={{
          display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end",
          background: HEAD, border: `1px solid ${LINE}`, borderTop: "none",
          borderRadius: "0 0 6px 6px", padding: "5px 10px",
          fontSize: 11.5, color: "#5f6a7d", fontFamily: "Consolas, monospace",
        }}>
          {stat.avg !== null && <span>Average: {stat.avg}</span>}
          <span>Count: {stat.count}</span>
          {stat.sum !== null && <span>Sum: {stat.sum}</span>}
        </div>
      )}
    </div>
  );
}

/**
 * Formula bar.
 *
 * suggest = function naam ki list. Practice me bheji jaati hai, test me NAHI —
 * exam me auto-suggest milta nahi, to test me dene se yaad karne ki zaroorat
 * hi khatam ho jaati.
 *
 * pendingRef = grid par tap kiya gaya cell. Jab ye badalta hai, uska
 * reference cursor ki jagah jud jata hai — theek Excel ki tarah: agar
 * cursor se pehle koi reference pada hai to wo BADAL jata hai, warna naya
 * JUD jata hai.
 */
export function FormulaBar({
  value,
  onChange,
  onSubmit,
  targetCell,
  suggest,
  disabled,
  placeholder,
  pendingRef,
  onFocusChange,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
  targetCell: string;
  suggest?: string[];
  disabled?: boolean;
  placeholder?: string;
  pendingRef?: { ref: string; nonce: number } | null;
  onFocusChange?: (focused: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<string[]>([]);
  const ref = useRef<HTMLInputElement | null>(null);
  const lastNonce = useRef(0);
  const caret = useRef<number | null>(null);

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

  // Grid par tap hua — reference cursor par daal do
  useEffect(() => {
    if (!pendingRef || pendingRef.nonce === lastNonce.current) return;
    lastNonce.current = pendingRef.nonce;

    const el = ref.current;
    const cur = value || "";
    const pos = caret.current ?? cur.length;
    let before = cur.slice(0, pos);
    const after = cur.slice(pos);

    // Cursor se pehle pehle se koi reference/range ho to wo badal jata hai —
    // Excel me bhi dobara click karne par reference badalta hai, judta nahi.
    const trailing = /(\$?[A-Za-z]{1,3}\$?\d{1,5})(\s*:\s*\$?[A-Za-z]{1,3}\$?\d{1,5})?$/;
    if (trailing.test(before)) before = before.replace(trailing, "");

    const next = before + pendingRef.ref + after;
    onChange(next);
    const np = before.length + pendingRef.ref.length;
    caret.current = np;
    setTimeout(() => { el?.focus(); try { el?.setSelectionRange(np, np); } catch {} }, 0);
  }, [pendingRef]); // eslint-disable-line

  function pick(fn: string) {
    const next = (value || "").replace(/([A-Za-z]+)$/, fn + "(");
    onChange(next);
    setOpen(false);
    ref.current?.focus();
  }

  const track = () => { caret.current = ref.current?.selectionStart ?? null; };

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
          onChange={(e) => { onChange(e.target.value); track(); }}
          onSelect={track}
          onClick={track}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => { track(); onFocusChange?.(false); }}
          onKeyUp={track}
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
