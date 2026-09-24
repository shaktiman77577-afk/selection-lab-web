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
         type ChangeEvent as RChangeEvent,
         type ClipboardEvent as RClipboardEvent } from "react";

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
  // ── Phase 2C: exam ki formatting. Sab optional — purana data chalta rahe ──
  borders?: string[];              // All Borders wale cell
  align?: Record<string, "left" | "center" | "right">;
  wrap?: string[];                 // Wrap Text
  fmt?: Record<string, string>;    // "0.00%", "0.0", "#,##0.00"
};

/** Number format -> chhapne wala roop. Backend (worksheet.fmt_display) jaisa hi. */
export function fmtDisplay(v: string, fmt?: string): string {
  const m = /^(#,##)?0(?:\.(0+))?(%?)$/.exec((fmt || "").trim());
  const t = (v ?? "").toString();
  if (!m || t.trim() === "") return t;
  const x = Number(t.replace(/,/g, "").trim());
  if (!isFinite(x)) return t;
  const dp = (m[2] || "").length;
  if (m[3]) return `${(x * 100).toFixed(dp)}%`;
  if (m[1]) return x.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  return x.toFixed(dp);
}

function fmtParts(fmt?: string): { pct: boolean; dp: number; comma: boolean } | null {
  const m = /^(#,##)?0(?:\.(0+))?(%?)$/.exec((fmt || "").trim());
  return m ? { pct: !!m[3], dp: (m[2] || "").length, comma: !!m[1] } : null;
}
function fmtBuild(p: { pct: boolean; dp: number; comma: boolean }): string {
  return `${p.comma ? "#,##" : ""}0${p.dp > 0 ? "." + "0".repeat(p.dp) : ""}${p.pct ? "%" : ""}`;
}

/** Poori sheet ki copy — undo/redo ke liye (formatting samet) */
function snap(v: SheetValue): SheetValue {
  return JSON.parse(JSON.stringify({ borders: [], align: {}, wrap: [], fmt: {}, ...v }));
}

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


/**
 * Formula ko dr row aur dc column sarka do — fill handle ke liye.
 *
 * $ wale reference apni jagah jame rehte hain, baaki sarakte hain. Yahi
 * cheez exam me jaanchi jaati hai: E4 me =C4*D4 likh kar neeche kheencho
 * to E5 me =C5*D5 banna chahiye. Jisne =$C$4*$D$4 likha uske neeche wale
 * cell me wahi purana jawab aata rahega, aur wo galat hai.
 *
 * Quote ke andar ka text chhua nahi jata — "A1" ek shabd hai, cell ka
 * pata nahi.
 */
const REF_RE = /(\$?)([A-Za-z]{1,3})(\$?)(\d{1,5})/g;
const STR_RE = /"(?:[^"]|"")*"/g;

export function shiftFormula(formula: string, dr: number, dc: number): string {
  if (!formula) return formula;
  const shiftPart = (txt: string) =>
    txt.replace(REF_RE, (m, cd, letters, rd, digits) => {
      let col = colIndex(letters);
      let row = Number(digits);
      if (!cd) col += dc;
      if (!rd) row += dr;
      if (col < 0 || row < 1) return m;          // sheet se bahar — waise hi rehne do
      return `${cd}${colLetter(col)}${rd}${row}`;
    });

  const out: string[] = [];
  let pos = 0;
  STR_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = STR_RE.exec(formula)) !== null) {
    out.push(shiftPart(formula.slice(pos, m.index)));
    out.push(m[0]);                              // quoted text jaisa ka waisa
    pos = m.index + m[0].length;
  }
  out.push(shiftPart(formula.slice(pos)));
  return out.join("");
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

/** Screen par point se cell dhoondhna — ungli/mouse jahan hai, wahan ka cell. */
function cellFromPoint(x: number, y: number): { r: number; c: number } | null {
  const el = document.elementFromPoint(x, y) as HTMLElement | null;
  const td = el?.closest?.("td[data-r]") as HTMLElement | null;
  if (!td) return null;
  const r = Number(td.dataset.r), c = Number(td.dataset.c);
  return Number.isFinite(r) && Number.isFinite(c) ? { r, c } : null;
}

/** Ungli ko theher kar select karne me kitna waqt lage */
const HOLD_MS = 350;
/** Itna hil gaya to ye scroll hai, selection nahi */
const HOLD_SLOP = 10;

/**
 * AutoFill ki series — Excel jaisa.
 *   ["1","2"]  step 2 -> "3"     (do number = ginti aage badhti hai)
 *   ["5"]      step 3 -> null    (ek number = copy hi hota hai)
 *   ["Item 1"] step 2 -> "Item 3" (text ke aakhir ka number badhta hai)
 * null = series nahi, purani copy wali chaal chale (formula, saada text).
 */
export function seriesAt(line: string[], step: number): string | null {
  const vals = line.map((v) => (v ?? "").trim());
  if (!vals.length || vals.some((v) => v === "" || v.startsWith("="))) return null;
  const isN = (v: string) => /^-?\d+(\.\d+)?$/.test(v);
  const dec = (v: string) => (v.split(".")[1] || "").length;
  if (vals.every(isN)) {
    if (vals.length < 2) return null;
    const nums = vals.map(Number);
    const d = (nums[nums.length - 1] - nums[0]) / (nums.length - 1);
    const out = nums[0] + d * step;
    const dp = Math.max(...vals.map(dec), d % 1 ? (String(d).split(".")[1] || "").length : 0);
    return String(Number(out.toFixed(Math.min(dp, 10))));
  }
  // "Item 1", "Q1", "Case-7" — aakhir ka number
  const parts = vals.map((v) => /^(.*?)(\d+)$/.exec(v));
  if (parts.every(Boolean) && parts.every((p) => p![1] === parts[0]![1]) && !/^-?$/.test(parts[0]![1])) {
    const nums = parts.map((p) => Number(p![2]));
    const d = nums.length >= 2 ? (nums[nums.length - 1] - nums[0]) / (nums.length - 1) : 1;
    if (!Number.isInteger(d)) return null;
    const n = nums[0] + d * step;
    if (n < 0) return null;
    const width = parts[0]![2].length;
    const digits = parts[0]![2].startsWith("0") ? String(n).padStart(width, "0") : String(n);
    return parts[0]![1] + digits;
  }
  return null;
}

export function SheetEditor({
  rows = 16,
  cols = 10,
  value,
  onChange,
  computed,
  disabled,
  advanced,
}: {
  rows?: number;
  cols?: number;
  value: SheetValue;
  onChange: (v: SheetValue) => void;
  /** Formula wale cell ke jawab — { "E4": "144" } */
  computed?: Record<string, string>;
  disabled?: boolean;
  /** Admin ke liye — row/column jodne-hatane ke button */
  advanced?: boolean;
}) {
  const [anchor, setAnchor] = useState({ r: 0, c: 0 });
  const [focus, setFocus] = useState({ r: 0, c: 0 });
  const [editing, setEditing] = useState<{ r: number; c: number } | null>(null);
  const [draft, setDraft] = useState("");
  // Excel me har aadmi Ctrl+Z baar-baar dabata hai. Iske bina ek galti par
  // poora cell dobara likhna padta hai.
  const hist = useRef<SheetValue[]>([]);
  const future = useRef<SheetValue[]>([]);
  // mode: cell chunna hai ya fill handle kheencha ja raha hai
  const drag = useRef<{ mode: "sel" | "fill"; from: { r: number; c: number }; moved: boolean } | null>(null);
  // Ungli dabi hai par abhi tay nahi ki selection hai ya scroll
  const hold = useRef<{ r: number; c: number; x: number; y: number; timer: any } | null>(null);
  const selecting = useRef(false);
  const wrap = useRef<HTMLDivElement | null>(null);
  const input = useRef<HTMLInputElement | null>(null);
  const isTouch = useRef(false);
  const [fillTarget, setFillTo] = useState<{ r: number; c: number } | null>(null);
  // Apni copy — isme formula bhi hai, isliye paste par wo Excel ki tarah
  // sarak sakta hai. Bahar se aaye text me sirf akshar hote hain.
  const clip = useRef<{ cells: Record<string, string>; bold: string[]; box: Box } | null>(null);

  const sel = norm(anchor, focus);
  const boldSet = new Set((value.bold || []).map((b) => b.toUpperCase()));
  const merges = (value.merges || []).map((m) => ({ key: m, box: mergeBox(m) }))
    .filter((m) => m.box) as { key: string; box: Box }[];

  /** Cell kis merge ka hissa hai */
  const mergeAt = (r: number, c: number) => merges.find((m) => inBox(m.box, r, c));

  // Cell ka input tabhi focus kare jab likhna GRID se shuru hua ho.
  //
  // Formula bar me pehla akshar likhte hi editing chalu ho jati thi, aur ye
  // effect focus utha kar cell ke input me daal deta tha — ungli bar par
  // hoti aur akshar wahan jate hi nahi the. Isliye upar wali patti me sirf
  // ek hi akshar chhap pata tha. Agar user pehle se kisi input me likh raha
  // hai to focus wahin rehne dete hain.
  useEffect(() => {
    if (!editing) return;
    const ae = document.activeElement as HTMLElement | null;
    if (ae && (ae.tagName === "INPUT" || ae.tagName === "TEXTAREA")) return;
    input.current?.focus();
  }, [editing]);

  // Chuna hua cell nazar me rehna chahiye. Enter dabate-dabate neeche jate
  // waqt cell parde se bahar nikal jata tha aur student aage bina dekhe
  // type karta rehta tha — exam me ye bahut mehnga padta hai.
  useEffect(() => {
    const el = wrap.current?.querySelector(
      `td[data-r="${focus.r}"][data-c="${focus.c}"]`) as HTMLElement | null;
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [focus.r, focus.c]);

  /**
   * Ungli kheenchne par scroll na ho — sirf tab jab selection chal rahi ho.
   *
   * touch-action CSS me hamesha band kar dete to sheet scroll hi na hoti
   * aur badi worksheet me neeche ki row tak pahunchna namumkin ho jata.
   * Isliye scroll tabhi rukta hai jab ungli theher kar selection shuru ho
   * chuki ho ya fill handle pakda gaya ho.
   */
  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const stop = (e: TouchEvent) => { if (selecting.current) e.preventDefault(); };
    el.addEventListener("touchmove", stop, { passive: false });
    return () => el.removeEventListener("touchmove", stop);
  }, []);

  /**
   * Kheenchna window par sunte hain, cell par nahi.
   *
   * Pehle ye har cell ke onPointerEnter par tha. Mouse par chalta tha, par
   * ungli se nahi: touch me browser pehle hi pointer ko us cell se baandh
   * deta hai jahan ungli padi thi, isliye baaki cell ko event milta hi
   * nahi tha — na range chunna ho pata tha, na formula neeche kheenchna.
   * Window par sunne se dono jagah ek jaisa chalta hai.
   */
  useEffect(() => {
    if (disabled) return;

    const move = (e: PointerEvent) => {
      const h = hold.current;
      if (h) {
        // Abhi tay nahi hua. Ungli sarki to ye scroll hai — chhod do.
        if (Math.abs(e.clientX - h.x) > HOLD_SLOP || Math.abs(e.clientY - h.y) > HOLD_SLOP) {
          clearTimeout(h.timer);
          hold.current = null;
        }
        return;
      }
      const d = drag.current;
      if (!d) return;
      const at = cellFromPoint(e.clientX, e.clientY);
      if (!at) return;
      if (at.r !== d.from.r || at.c !== d.from.c) d.moved = true;
      if (d.mode === "sel") setFocus(at);
      else setFillTo(at);
    };

    const up = (e: PointerEvent) => {
      if (hold.current) { clearTimeout(hold.current.timer); hold.current = null; }
      const d = drag.current;
      drag.current = null;
      selecting.current = false;
      if (!d) return;
      const at = cellFromPoint(e.clientX, e.clientY) || d.from;
      if (d.mode === "fill") {
        if (d.moved) fillTo(at);
        setFillTo(null);
      }
    };

    // Ungli parde se bahar chali jaye ya call aa jaye — gesture wahin khatam
    const cancel = () => {
      if (hold.current) { clearTimeout(hold.current.timer); hold.current = null; }
      drag.current = null;
      selecting.current = false;
      setFillTo(null);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", cancel);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", cancel);
    };
  });

  /** Har badlav yahin se guzarta hai, taaki undo ke liye purana roop bach jaye. */
  function apply(next: SheetValue) {
    hist.current.push(snap(value));
    if (hist.current.length > 60) hist.current.shift();
    future.current = [];
    onChange(next);
  }

  function undo() {
    const prev = hist.current.pop();
    if (!prev) return;
    future.current.push(snap(value));
    setEditing(null); setDraft(""); onChange(prev);
  }

  function redo() {
    const next = future.current.pop();
    if (!next) return;
    hist.current.push(snap(value));
    setEditing(null); setDraft(""); onChange(next);
  }

  function set(ref: string, text: string) {
    const cells = { ...value.cells };
    // Excel jaisa: "12.5%" likha to value 0.125 aur format % — warna ye
    // text ban jaata aur na hisaab me aata, na sample se milta.
    const pm = /^\s*(-?\d+(?:\.(\d+))?)\s*%\s*$/.exec(text ?? "");
    if (pm) {
      const n = Number(pm[1]) / 100;
      cells[ref] = String(Number(n.toPrecision(12)));
      const fmt = { ...(value.fmt || {}), [ref]: fmtBuild({ pct: true, dp: (pm[2] || "").length, comma: false }) };
      apply({ ...value, cells, fmt });
      return;
    }
    if ((text ?? "").trim() === "") delete cells[ref];
    else cells[ref] = text;
    apply({ ...value, cells });
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
    // Cell ke andar likha ja raha ho to grid ke shortcut band.
    //
    // Ye handler poore scroll wale dabbe par laga hai, aur cell ka input
    // usi dabbe ke ANDAR hai — isliye cell me dabaya gaya har button yahan
    // tak pahunchta tha. Backspace yahan aakar preventDefault ho jata aur
    // ek akshar mitne ki jagah poori selection saaf kar deta tha. Aur har
    // saadharan akshar startEdit dobara chala kar draft ko usi ek akshar
    // par la deta tha — isliye cell me ek se zyada akshar likhe hi nahi
    // jate the.
    if (editing) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) return;
    if (e.ctrlKey || e.metaKey) {
      const k = e.key.toLowerCase();
      if (k === "b") { e.preventDefault(); toggleBold(); }
      else if (k === "z") { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      else if (k === "y") { e.preventDefault(); redo(); }
      return;                       // c/x/v browser ke copy-paste event bante hain
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
    if (e.key === "Enter" || e.key === "F2") { e.preventDefault(); startEdit(focus.r, focus.c); return; }
    if (e.key === "Tab") {
      e.preventDefault();
      const c = Math.max(0, Math.min(cols - 1, focus.c + (e.shiftKey ? -1 : 1)));
      setAnchor({ r: focus.r, c }); setFocus({ r: focus.r, c });
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      clearSel();
      return;
    }
    // Koi akshar dabaya — Excel ki tarah seedha likhna shuru
    if (e.key.length === 1 && !e.altKey) {
      e.preventDefault();
      startEdit(focus.r, focus.c, e.key);
    }
  }

  function clearSel() {
    const cells = { ...value.cells };
    for (let r = sel.r1; r <= sel.r2; r++)
      for (let c = sel.c1; c <= sel.c2; c++) delete cells[refOf(r, c)];
    apply({ ...value, cells });
  }

  // ── Copy / Cut / Paste ──
  // Excel ki sabse gehri aadat. Iske bina ek hi jaisi cheez baar-baar likhni
  // padti hai. Bahar (asli Excel) ke saath bhi chalta hai — clipboard me
  // wahi TSV jata hai jo Excel samajhta hai.
  function selText(): string {
    const out: string[] = [];
    for (let r = sel.r1; r <= sel.r2; r++) {
      const row: string[] = [];
      for (let c = sel.c1; c <= sel.c2; c++) {
        const raw = value.cells[refOf(r, c)] ?? "";
        row.push(raw.startsWith("=") ? (computed?.[refOf(r, c)] ?? raw) : raw);
      }
      out.push(row.join("\t"));
    }
    return out.join("\n");
  }

  function rememberClip() {
    const cells: Record<string, string> = {};
    const bold: string[] = [];
    for (let r = sel.r1; r <= sel.r2; r++)
      for (let c = sel.c1; c <= sel.c2; c++) {
        const ref = refOf(r, c);
        if (value.cells[ref] !== undefined) cells[ref] = value.cells[ref];
        if (boldSet.has(ref)) bold.push(ref);
      }
    clip.current = { cells, bold, box: { ...sel } };
  }

  function onCopy(e: RClipboardEvent) {
    if (disabled || editing) return;
    e.preventDefault();
    rememberClip();
    e.clipboardData.setData("text/plain", selText());
  }

  function onCut(e: RClipboardEvent) {
    if (disabled || editing) return;
    e.preventDefault();
    rememberClip();
    e.clipboardData.setData("text/plain", selText());
    clearSel();
  }

  function onPaste(e: RClipboardEvent) {
    if (disabled || editing) return;
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain") ?? "";
    const cells = { ...value.cells };
    const bold = new Set(boldSet);
    const c0 = clip.current;

    // Apni hi copy hai to formula bhi saath aata hai aur Excel ki tarah
    // sarakta hai. Bahar se aaye text me formula ka pata hi nahi chalta,
    // isliye wo jaisa hai waisa hi baith jata hai.
    if (c0 && text === selTextOf(c0)) {
      const dr = focus.r - c0.box.r1, dc = focus.c - c0.box.c1;
      for (let r = c0.box.r1; r <= c0.box.r2; r++)
        for (let c = c0.box.c1; c <= c0.box.c2; c++) {
          const src = c0.cells[refOf(r, c)];
          const ref = refOf(r + dr, c + dc);
          if (r + dr >= rows || c + dc >= cols) continue;
          if (src === undefined) delete cells[ref];
          else cells[ref] = src.startsWith("=") ? shiftFormula(src, dr, dc) : src;
          if (c0.bold.includes(refOf(r, c))) bold.add(ref); else bold.delete(ref);
        }
    } else {
      const grid = text.replace(/\r/g, "").split("\n").map((l: string) => l.split("\t"));
      grid.forEach((row: string[], i: number) => row.forEach((cell: string, j: number) => {
        const r = focus.r + i, c = focus.c + j;
        if (r >= rows || c >= cols) return;
        const ref = refOf(r, c);
        if (cell.trim() === "") delete cells[ref];
        else cells[ref] = cell;
      }));
    }
    apply({ ...value, cells, bold: Array.from(bold).sort() });
  }

  /** Clipboard me kya gaya tha — apni copy pehchanne ke liye */
  function selTextOf(c0: { cells: Record<string, string>; box: Box }): string {
    const out: string[] = [];
    for (let r = c0.box.r1; r <= c0.box.r2; r++) {
      const row: string[] = [];
      for (let c = c0.box.c1; c <= c0.box.c2; c++) {
        const raw = c0.cells[refOf(r, c)] ?? "";
        row.push(raw.startsWith("=") ? (computed?.[refOf(r, c)] ?? raw) : raw);
      }
      out.push(row.join("\t"));
    }
    return out.join("\n");
  }

  // ── Formatting (Phase 2C) — Excel ke Home tab jaisa ──
  function selRefs(): string[] {
    const refs: string[] = [];
    for (let r = sel.r1; r <= sel.r2; r++)
      for (let c = sel.c1; c <= sel.c2; c++) refs.push(refOf(r, c));
    return refs;
  }

  /** All Borders — chuni hui har cell ke chaaron taraf line. Dobara dabao to hatao. */
  function toggleBorders() {
    const refs = selRefs();
    const cur = new Set(value.borders || []);
    const all = refs.every((x) => cur.has(x));
    refs.forEach((x) => (all ? cur.delete(x) : cur.add(x)));
    apply({ ...value, borders: Array.from(cur).sort() });
  }

  function setAlign(a: "left" | "center" | "right") {
    const refs = selRefs();
    const cur = { ...(value.align || {}) };
    const all = refs.every((x) => cur[x] === a);
    refs.forEach((x) => { if (all) delete cur[x]; else cur[x] = a; });
    apply({ ...value, align: cur });
  }

  function toggleWrap() {
    const refs = selRefs();
    const cur = new Set(value.wrap || []);
    const all = refs.every((x) => cur.has(x));
    refs.forEach((x) => (all ? cur.delete(x) : cur.add(x)));
    apply({ ...value, wrap: Array.from(cur).sort() });
  }

  const shownOf = (ref: string) => {
    const raw = value.cells[ref] ?? "";
    return raw.startsWith("=") ? (computed?.[ref] ?? "") : raw;
  };
  const isNum = (t: string) => t.trim() !== "" && isFinite(Number(t.replace(/,/g, "").trim()));

  /** % button — Excel ki tarah "0%" lagata hai; sab par pehle se ho to hatata hai. */
  function togglePct() {
    const refs = selRefs();
    const cur = { ...(value.fmt || {}) };
    const all = refs.every((x) => fmtParts(cur[x])?.pct);
    refs.forEach((x) => {
      if (all) delete cur[x];
      else cur[x] = fmtBuild({ pct: true, dp: fmtParts(cur[x])?.dp ?? 0, comma: false });
    });
    apply({ ...value, fmt: cur });
  }

  /** Decimal badhao/ghatao — jo abhi dikh raha hai usi se shuru, Excel jaisa. */
  function changeDecimals(delta: 1 | -1) {
    const refs = selRefs();
    const cur = { ...(value.fmt || {}) };
    let touched = false;
    refs.forEach((x) => {
      const t = shownOf(x);
      if (!isNum(t)) return;
      const p = fmtParts(cur[x]) || { pct: false, comma: false,
        dp: (t.replace(/,/g, "").split(".")[1] || "").length };
      cur[x] = fmtBuild({ ...p, dp: Math.max(0, Math.min(6, p.dp + delta)) });
      touched = true;
    });
    if (touched) apply({ ...value, fmt: cur });
  }

  function toggleBold() {
    const refs: string[] = [];
    for (let r = sel.r1; r <= sel.r2; r++)
      for (let c = sel.c1; c <= sel.c2; c++) refs.push(refOf(r, c));
    const allBold = refs.every((x) => boldSet.has(x));
    const next = new Set(boldSet);
    refs.forEach((x) => (allBold ? next.delete(x) : next.add(x)));
    apply({ ...value, bold: Array.from(next).sort() });
  }

  /**
   * Fill handle kheenchne par — Excel ka sabse zyada istemaal hone wala kaam.
   *
   * Worksheet test me 4 formula column x 8 row = 32 formula hote hain. Iske
   * bina student ko 32 baar likhna padta, aur ye Excel ka test na rehkar
   * typing ka test ban jata. Asli exam me bhi ek likh kar neeche kheencha
   * jata hai — aur wahi $ ki jaanch hai.
   */
  function fillTo(to: { r: number; c: number }) {
    const box = norm({ r: sel.r1, c: sel.c1 }, to);
    const srcRows = sel.r2 - sel.r1 + 1;
    const srcCols = sel.c2 - sel.c1 + 1;
    const cells = { ...value.cells };
    const bold = new Set(boldSet);
    const borders = new Set(value.borders || []);
    const wrapS = new Set(value.wrap || []);
    const align = { ...(value.align || {}) };
    const fmt = { ...(value.fmt || {}) };
    let touched = false;

    // Excel ka AutoFill: neeche/upar kheencha to har column apni series,
    // daayein/baayein to har row. Pehle hum source ko bas dohraate the —
    // 1, 2 kheenchne par 1, 2, 1, 2 banta tha, jabki Excel 3, 4, 5 banata hai.
    // Serial number wala column exam me isi se bharta hai.
    const vertical = box.r1 < sel.r1 || box.r2 > sel.r2;

    for (let r = box.r1; r <= box.r2; r++) {
      for (let c = box.c1; c <= box.c2; c++) {
        if (inBox(sel, r, c)) continue;                 // source khud rehne do
        // Excel ka niyam: source me se jo cell is jagah par padta hai
        const sr = sel.r1 + ((r - sel.r1) % srcRows + srcRows) % srcRows;
        const sc = sel.c1 + ((c - sel.c1) % srcCols + srcCols) % srcCols;
        const srcRef = refOf(sr, sc);
        const src = value.cells[srcRef];
        const ref = refOf(r, c);

        // Series ki line: is column (ya row) ke source cells, kram se
        const line: string[] = [];
        if (vertical) for (let k = sel.r1; k <= sel.r2; k++) line.push(value.cells[refOf(k, c)] ?? "");
        else for (let k = sel.c1; k <= sel.c2; k++) line.push(value.cells[refOf(r, k)] ?? "");
        const step = vertical ? r - sel.r1 : c - sel.c1;      // source ke pehle cell se doori
        const series = seriesAt(line, step);

        if (series !== null) cells[ref] = series;
        else if (src === undefined || src === "") delete cells[ref];
        else cells[ref] = src.startsWith("=") ? shiftFormula(src, r - sr, c - sc) : src;

        // Formatting bhi saath jaati hai, jaise Excel me
        if (boldSet.has(srcRef)) bold.add(ref); else bold.delete(ref);
        if ((value.borders || []).includes(srcRef)) borders.add(ref); else borders.delete(ref);
        if ((value.wrap || []).includes(srcRef)) wrapS.add(ref); else wrapS.delete(ref);
        if (value.align?.[srcRef]) align[ref] = value.align[srcRef]; else delete align[ref];
        if (value.fmt?.[srcRef]) fmt[ref] = value.fmt[srcRef]; else delete fmt[ref];
        touched = true;
      }
    }
    if (touched) {
      apply({ ...value, cells, bold: Array.from(bold).sort(), borders: Array.from(borders).sort(),
              wrap: Array.from(wrapS).sort(), align, fmt });
      setFocus({ r: box.r2, c: box.c2 });
    }
  }

  function toggleMerge() {
    const key = `${refOf(sel.r1, sel.c1)}:${refOf(sel.r2, sel.c2)}`;
    const existing = merges.find((m) =>
      m.box.r1 === sel.r1 && m.box.c1 === sel.c1 && m.box.r2 === sel.r2 && m.box.c2 === sel.c2);
    if (existing) {
      apply({ ...value, merges: (value.merges || []).filter((m) => m !== existing.key) });
      return;
    }
    if (sel.r1 === sel.r2 && sel.c1 === sel.c2) return;   // ek cell merge nahi hota
    // Overlap hatate hain, warna do merge ek hi cell par lag jate
    const keep = (value.merges || []).filter((m) => {
      const b = mergeBox(m);
      return !b || b.r2 < sel.r1 || b.r1 > sel.r2 || b.c2 < sel.c1 || b.c1 > sel.c2;
    });
    apply({ ...value, merges: [...keep, key] });
  }

  /**
   * Poori row/column jodna ya hatana.
   *
   * Ye sabse zyada ADMIN ke kaam ka hai. Sheet banate waqt beech me ek
   * khaali row reh jaye to abhi tak use hatane ka koi tareeka hi nahi tha —
   * poori sheet dobara type karni padti thi. Aur wahi khaali row student ke
   * paper par pahunch kar uske number le doobti hai.
   */
  function spliceAxis(kind: "row" | "col", at: number, delta: 1 | -1) {
    const mv = (r: number, c: number): { r: number; c: number } | null => {
      const v = kind === "row" ? r : c;
      let nv = v;
      if (delta === 1) { if (v >= at) nv = v + 1; }
      else { if (v === at) return null; if (v > at) nv = v - 1; }
      return kind === "row" ? { r: nv, c } : { r, c: nv };
    };

    const cells: Record<string, string> = {};
    for (const [ref, v] of Object.entries(value.cells)) {
      const p = parseRef(ref);
      if (!p) continue;
      const n = mv(p.r, p.c);
      if (n) cells[refOf(n.r, n.c)] = v;
    }
    const bold: string[] = [];
    for (const ref of value.bold || []) {
      const p = parseRef(ref);
      if (!p) continue;
      const n = mv(p.r, p.c);
      if (n) bold.push(refOf(n.r, n.c));
    }
    const mgs: string[] = [];
    for (const m of value.merges || []) {
      const b = mergeBox(m);
      if (!b) continue;
      const a = mv(b.r1, b.c1), z = mv(b.r2, b.c2);
      if (a && z && (a.r !== z.r || a.c !== z.c)) mgs.push(`${refOf(a.r, a.c)}:${refOf(z.r, z.c)}`);
    }
    const moveList = (xs?: string[]) => (xs || []).map((ref) => {
      const p = parseRef(ref); const n = p ? mv(p.r, p.c) : null;
      return n ? refOf(n.r, n.c) : null;
    }).filter(Boolean) as string[];
    const moveMap = <T,>(o?: Record<string, T>) => {
      const out: Record<string, T> = {};
      for (const [ref, v] of Object.entries(o || {})) {
        const p = parseRef(ref); const n = p ? mv(p.r, p.c) : null;
        if (n) out[refOf(n.r, n.c)] = v;
      }
      return out;
    };
    apply({ cells, bold: bold.sort(), merges: mgs,
            borders: moveList(value.borders).sort(), align: moveMap(value.align),
            wrap: moveList(value.wrap).sort(), fmt: moveMap(value.fmt) });
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
        {/* Format — Excel ke Home tab jaisa. Exam me printout inhi se banta hai. */}
        <button onClick={toggleBorders} disabled={disabled} title="All Borders"
                style={btn}>▦ Borders</button>
        <button onClick={() => setAlign("left")} disabled={disabled} title="Align left"
                style={btn}>⇤</button>
        <button onClick={() => setAlign("center")} disabled={disabled} title="Center"
                style={btn}>↔</button>
        <button onClick={() => setAlign("right")} disabled={disabled} title="Align right"
                style={btn}>⇥</button>
        <button onClick={toggleWrap} disabled={disabled} title="Wrap Text"
                style={btn}>Wrap</button>
        <button onClick={togglePct} disabled={disabled} title="Percent style"
                style={btn}>%</button>
        <button onClick={() => changeDecimals(1)} disabled={disabled} title="Increase decimal"
                style={btn}>.0+</button>
        <button onClick={() => changeDecimals(-1)} disabled={disabled} title="Decrease decimal"
                style={btn}>.0−</button>
        <button onClick={undo} disabled={disabled} title="Ctrl+Z"
                style={btn}>↶</button>
        <button onClick={redo} disabled={disabled} title="Ctrl+Shift+Z"
                style={btn}>↷</button>
        {advanced && (
          <>
            <span style={{ width: 1, height: 20, background: "var(--line)" }} />
            <button onClick={() => spliceAxis("row", sel.r1, 1)} disabled={disabled}
                    title="Insert a row above" style={btn}>+Row</button>
            <button onClick={() => spliceAxis("row", sel.r1, -1)} disabled={disabled}
                    title="Delete this row" style={btn}>−Row</button>
            <button onClick={() => spliceAxis("col", sel.c1, 1)} disabled={disabled}
                    title="Insert a column on the left" style={btn}>+Col</button>
            <button onClick={() => spliceAxis("col", sel.c1, -1)} disabled={disabled}
                    title="Delete this column" style={btn}>−Col</button>
          </>
        )}
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
          placeholder="Cell content — text, a number or =formula"
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
        onCopy={onCopy}
        onCut={onCut}
        onPaste={onPaste}
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
                  // Kheenchte waqt dikhe ki kahan tak bharega
                  const inFill = !!fillTarget && !inBox(sel, r, c) &&
                    inBox(norm({ r: sel.r1, c: sel.c1 }, fillTarget), r, c);
                  const raw = value.cells[ref] ?? "";
                  // Formula wale cell me JAWAB dikhta hai, formula nahi —
                  // bilkul Excel ki tarah. Formula upar bar me dikhta hai.
                  const val = raw.startsWith("=") ? (computed?.[ref] ?? "…") : raw;
                  // % aur decimal format wahi dikhe jo printout par chhapega
                  const shown = value.fmt?.[ref] ? fmtDisplay(val, value.fmt[ref]) : val;
                  const hasBorder = !!value.borders?.includes(ref);
                  const wrapped = !!value.wrap?.includes(ref);
                  // "12.50%" bhi number hai — Excel ise daayein rakhta hai, aur
                  // grader (eff_align) bhi. Warna yahan baayein dikhta aur jaanch
                  // daayein maangti.
                  const num = /^-?[\d,]+(\.\d+)?%?$/.test(shown.trim()) && shown.trim() !== "";
                  const err = shown.startsWith("#");

                  return (
                    <td
                      key={c}
                      data-r={r}
                      data-c={c}
                      {...span}
                      onPointerDown={(e: RPointerEvent) => {
                        if (disabled) return;
                        const touch = (e as any).pointerType === "touch";
                        isTouch.current = touch;
                        commit(null);
                        setAnchor({ r, c }); setFocus({ r, c });

                        if (!touch) {
                          e.preventDefault();
                          drag.current = { mode: "sel", from: { r, c }, moved: false };
                          wrap.current?.focus();
                          return;
                        }
                        // Ungli se: turant kheenchna shuru nahi karte, warna
                        // sheet scroll hi na ho. Ungli theher jaye tabhi
                        // range chunna shuru hota hai.
                        if (hold.current) clearTimeout(hold.current.timer);
                        hold.current = {
                          r, c, x: e.clientX, y: e.clientY,
                          timer: setTimeout(() => {
                            hold.current = null;
                            selecting.current = true;
                            drag.current = { mode: "sel", from: { r, c }, moved: false };
                          }, HOLD_MS),
                        };
                      }}
                      onPointerUp={() => {
                        // Mobile par keyboard nahi hota, isliye "type karna
                        // shuru karo to edit khul jaye" wala Excel tareeka
                        // kaam nahi karta. Wahan tap par hi editor khulta
                        // hai. Par ungli theher kar range chuni ho to nahi —
                        // warna bold/merge ke liye cell chunna hi mushkil
                        // ho jata.
                        const d = drag.current;
                        if (isTouch.current && !d && hold.current) {
                          clearTimeout(hold.current.timer);
                          hold.current = null;
                          startEdit(r, c);
                        }
                      }}
                      onDoubleClick={() => startEdit(r, c)}
                      style={{
                        position: "relative",
                        // Border wale cell ki gaadhi kaali line — printout par
                        // bas yahi lines chhapti hain. Baaki halki line sirf
                        // screen ki gridline hai (Excel me bhi chhapti nahi).
                        border: isFocus ? `2px solid ${BLUE}`
                          : inFill ? `1px dashed ${BLUE}`
                          : hasBorder ? "1px solid #222" : `1px solid ${LINE}`,
                        background: isFocus ? "#fff" : on ? "#e8f0fe" : inFill ? "#f0f6ff" : "#fff",
                        padding: 0, minWidth: 78,
                        textAlign: value.align?.[ref] ?? (m ? "center" : num ? "right" : "left"),
                        fontWeight: boldSet.has(ref) ? 800 : 400,
                        color: err ? "#c0392b" : "#111",
                        whiteSpace: wrapped ? "normal" : "nowrap", fontSize: 13,
                        maxWidth: wrapped ? 150 : undefined, wordBreak: wrapped ? "break-word" : undefined,
                        height: wrapped ? "auto" : 30,   // Wrap Text par row oonchi
                      }}
                    >
                      {/* Fill handle — selection ke neeche-daayen kone par,
                          bilkul Excel jaisa. Yahin se formula neeche kheencha
                          jata hai.

                          position:relative upar cell par lagana ZAROORI hai.
                          Uske bina ye chaukor cell ke kone par nahi, poore
                          page ke kone par chala jata tha — aur Excel ka sabse
                          zyada kaam aane wala auzaar pakad me hi nahi aata
                          tha. */}
                      {!disabled && !isEdit && r === sel.r2 && c === sel.c2 && (
                        <span
                          onPointerDown={(e: RPointerEvent) => {
                            e.preventDefault();
                            (e as any).stopPropagation?.();
                            isTouch.current = (e as any).pointerType === "touch";
                            selecting.current = true;
                            drag.current = { mode: "fill", from: { r, c }, moved: false };
                          }}
                          title="Drag down to fill"
                          style={{
                            position: "absolute", right: -5, bottom: -5,
                            // Ungli ke liye 11px ka nishaan bahut chhota hai.
                            // Dikhne me utna hi rehta hai, par pakad ka
                            // daayra bada kar dete hain.
                            width: 22, height: 22, zIndex: 4,
                            cursor: "crosshair", touchAction: "none",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <span style={{ width: 11, height: 11, background: BLUE,
                                         border: "2px solid #fff", borderRadius: 2,
                                         pointerEvents: "none" }} />
                        </span>
                      )}
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
        Tap a cell and type · Enter moves down · Tab moves right ·
        to copy a formula down, drag the <b>blue square</b> at the corner of the cell ·
        to select several cells, <b>press and hold</b>, then drag, and then press{" "}
        <b>B</b> or <b>Merge</b>
      </div>
    </div>
  );
}

const btn: CSSProperties = {
  background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)",
  borderRadius: 8, padding: "6px 11px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
};
