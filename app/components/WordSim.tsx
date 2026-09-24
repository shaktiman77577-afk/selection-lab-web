"use client";

/**
 * app/components/WordSim.tsx — MS Word jaisa chhota editor (practice ke liye).
 *
 * Page ek contentEditable hai: har paragraph ek <p>, table ek <table>.
 * Paragraph ki formatting (size, alignment, spacing, indent) <p> ke style
 * me; Bold/Italic/Underline browser ke apne command se (<b>, <i>, <u>).
 * parseDoc() poore page ko ek saaf model (lib/officeTasks WordDoc) me badalta
 * hai — jaanch sirf usi model par hoti hai.
 */
import { useEffect, useRef, useState } from "react";
import type { Align, WordDoc, WPara, WTable, WCell } from "@/lib/officeTasks";

const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28];
const SPACINGS = [1, 1.15, 1.5, 2];
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Model -> HTML (pehle se bhare document ke liye) */
function toHtml(doc?: WordDoc): string {
  if (!doc || !doc.blocks.length) return "<p><br></p>";
  return doc.blocks.map((b) => {
    if (b.kind === "table") {
      return `<table data-borders="${b.borders ? 1 : 0}">${b.rows.map((r) => `<tr>${r.map((c) =>
        `<td style="text-align:${c.align}">${c.bold ? `<b>${esc(c.text)}</b>` : esc(c.text) || "<br>"}</td>`).join("")}</tr>`).join("")}</table>`;
    }
    const style = `text-align:${b.align};font-size:${b.size}pt;line-height:${b.spacing};${b.indent ? "text-indent:0.5in;" : ""}`;
    let html = "";
    for (let i = 0; i < b.text.length; i++) {
      let ch = esc(b.text[i]);
      if (b.bold[i]) ch = `<b>${ch}</b>`;
      if (b.italic[i]) ch = `<i>${ch}</i>`;
      if (b.underline[i]) ch = `<u>${ch}</u>`;
      html += ch;
    }
    return `<p style="${style}">${html || "<br>"}</p>`;
  }).join("") + "<p><br></p>";
}

function alignOf(el: HTMLElement): Align {
  const a = (el.style.textAlign || "").toLowerCase();
  return a === "center" || a === "right" || a === "justify" ? (a as Align) : "left";
}

/** Ek akshar Bold / Italic / Underline hai? (block tak ke saare ancestors dekh kar) */
function flagsOf(node: Node, stop: HTMLElement) {
  let b = false, i = false, u = false;
  let el = node.parentElement;
  while (el && el !== stop.parentElement) {
    const t = el.tagName;
    const cs = getComputedStyle(el);
    if (t === "B" || t === "STRONG" || parseInt(cs.fontWeight) >= 600) b = true;
    if (t === "I" || t === "EM" || cs.fontStyle === "italic") i = true;
    if (t === "U" || (el.style.textDecoration || el.style.textDecorationLine || "").includes("underline")) u = true;
    if (el === stop) break;
    el = el.parentElement;
  }
  return { b, i, u };
}

function readInline(root: HTMLElement) {
  let text = ""; const bold: boolean[] = [], italic: boolean[] = [], underline: boolean[] = [];
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  let n: Node | null = walk.nextNode();
  while (n) {
    if (n.nodeType === Node.TEXT_NODE) {
      const v = (n.nodeValue || "").replace(/\u00a0/g, " ");
      const f = flagsOf(n, root);
      for (const ch of v) { text += ch; bold.push(f.b); italic.push(f.i); underline.push(f.u); }
    } else if ((n as HTMLElement).tagName === "BR" && text && !text.endsWith(" ")) {
      text += " "; bold.push(false); italic.push(false); underline.push(false);
    }
    n = walk.nextNode();
  }
  return { text, bold, italic, underline };
}

export function parseDoc(editor: HTMLElement, fileName: string): WordDoc {
  const blocks: (WPara | WTable)[] = [];
  const para = (el: HTMLElement): WPara => {
    const r = readInline(el);
    const size = el.style.fontSize.endsWith("pt") ? parseFloat(el.style.fontSize) : 12;
    const lh = parseFloat(el.style.lineHeight);
    return { kind: "p", ...r, align: alignOf(el), size: size || 12, spacing: isNaN(lh) ? 1 : lh,
             indent: !!el.style.textIndent && parseFloat(el.style.textIndent) > 0 };
  };
  for (const node of Array.from(editor.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      if ((node.nodeValue || "").trim()) {
        const s = document.createElement("p"); s.textContent = node.nodeValue; editor.insertBefore(s, node); node.remove();
        blocks.push(para(s));
      }
      continue;
    }
    const el = node as HTMLElement;
    if (el.tagName === "TABLE") {
      const rows: WCell[][] = Array.from(el.querySelectorAll("tr")).map((tr) =>
        Array.from(tr.children).map((td) => {
          const r = readInline(td as HTMLElement);
          const letters = r.bold.filter((_, k) => !/\s/.test(r.text[k]));
          return { text: r.text.trim(), bold: letters.length > 0 && letters.every(Boolean), align: alignOf(td as HTMLElement) };
        }));
      blocks.push({ kind: "table", rows, borders: el.dataset.borders === "1" });
    } else if (["P", "DIV", "H1", "H2", "H3"].includes(el.tagName)) {
      blocks.push(para(el));
    }
  }
  return { blocks: blocks.filter((b) => b.kind === "table" || b.text.trim()), fileName };
}

export default function WordSim({ start, onChange }: { start?: WordDoc; onChange: (d: WordDoc) => void }) {
  const ed = useRef<HTMLDivElement | null>(null);
  const saved = useRef<Range | null>(null);
  const hist = useRef<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [panel, setPanel] = useState<"" | "save" | "find" | "table">("");
  const [find, setFind] = useState(""); const [repl, setRepl] = useState("");
  const [findMsg, setFindMsg] = useState("");
  const [tr, setTr] = useState(3); const [tc, setTc] = useState(3);
  const nameRef = useRef("");

  const emit = () => { if (ed.current) onChange(parseDoc(ed.current, nameRef.current)); };
  const snap = () => { if (ed.current) { hist.current.push(ed.current.innerHTML); if (hist.current.length > 60) hist.current.shift(); } };

  useEffect(() => {
    if (!ed.current) return;
    ed.current.innerHTML = toHtml(start);
    try { document.execCommand("defaultParagraphSeparator", false, "p"); } catch {}
    emit();
    const onSel = () => {
      const s = window.getSelection();
      if (s && s.rangeCount && ed.current && ed.current.contains(s.getRangeAt(0).commonAncestorContainer)) {
        saved.current = s.getRangeAt(0).cloneRange();
      }
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function restore() {
    const s = window.getSelection();
    if (saved.current && s) { s.removeAllRanges(); s.addRange(saved.current); }
  }
  /** Selection wale paragraphs / table cells */
  function targets(): HTMLElement[] {
    const root = ed.current; const r = saved.current;
    if (!root || !r) return [];
    const blockOf = (n: Node | null): HTMLElement | null => {
      let el: HTMLElement | null = n && (n.nodeType === 1 ? (n as HTMLElement) : n.parentElement);
      while (el && el !== root) {
        if (el.tagName === "TD" || el.tagName === "TH" || el.parentElement === root) return el;
        el = el.parentElement;
      }
      return null;
    };
    if (r.collapsed) { const b = blockOf(r.startContainer); return b && b.tagName !== "TABLE" ? [b] : []; }
    const cand = Array.from(root.querySelectorAll("td, th")) as HTMLElement[];
    for (const c of Array.from(root.children) as HTMLElement[]) if (c.tagName !== "TABLE") cand.push(c);
    const hit = cand.filter((c) => r.intersectsNode(c));
    return hit.length ? hit : ([blockOf(r.startContainer)].filter(Boolean) as HTMLElement[]);
  }
  function act(fn: () => void) { snap(); restore(); fn(); setTimeout(emit, 0); }
  const cmd = (c: string) => act(() => document.execCommand(c, false));
  const setStyle = (k: "textAlign" | "fontSize" | "lineHeight" | "textIndent", v: (el: HTMLElement) => string) =>
    act(() => targets().forEach((el) => { (el.style as any)[k] = v(el); }));

  function insertTable() {
    act(() => {
      const root = ed.current!; const r = saved.current;
      let at: Node | null = r ? r.startContainer : null;
      while (at && at.parentNode !== root) at = at.parentNode;
      const t = document.createElement("table"); t.dataset.borders = "0";
      for (let i = 0; i < Math.max(1, tr); i++) {
        const row = t.insertRow();
        for (let j = 0; j < Math.max(1, tc); j++) row.insertCell().innerHTML = "<br>";
      }
      const after = document.createElement("p"); after.innerHTML = "<br>";
      if (at && at.nextSibling) { root.insertBefore(t, at.nextSibling); root.insertBefore(after, t.nextSibling); }
      else { root.appendChild(t); root.appendChild(after); }
      setPanel("");
    });
  }
  function tableHere(): HTMLTableElement | null {
    let n: Node | null = saved.current?.startContainer || null;
    while (n && n !== ed.current) { if ((n as HTMLElement).tagName === "TABLE") return n as HTMLTableElement; n = n.parentNode; }
    return null;
  }
  function addRow() {
    act(() => {
      const t = tableHere(); if (!t) { alert("Click inside the table first."); return; }
      let n: Node | null = saved.current!.startContainer; let row: HTMLTableRowElement | null = null;
      while (n && n !== t) { if ((n as HTMLElement).tagName === "TR") row = n as HTMLTableRowElement; n = n.parentNode; }
      const cols = (row || t.rows[t.rows.length - 1]).cells.length;
      const nr = t.insertRow(row ? row.rowIndex + 1 : -1);
      for (let j = 0; j < cols; j++) nr.insertCell().innerHTML = "<br>";
    });
  }
  function toggleBorders() {
    act(() => { const t = tableHere(); if (!t) { alert("Click inside the table first."); return; }
      t.dataset.borders = t.dataset.borders === "1" ? "0" : "1"; });
  }

  // Find & Replace — Word jaisa: bade-chhote akshar ka farak nahi; pehla akshar
  // bada ho to naye shabd ka bhi bada ("Examination" -> "Selection test")
  function textNodes(): Text[] {
    const out: Text[] = []; const w = document.createTreeWalker(ed.current!, NodeFilter.SHOW_TEXT);
    let n = w.nextNode(); while (n) { out.push(n as Text); n = w.nextNode(); }
    return out;
  }
  const rx = () => new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  function doFind() {
    if (!find.trim()) return;
    const c = textNodes().reduce((a, t) => a + ((t.nodeValue || "").match(rx()) || []).length, 0);
    setFindMsg(c ? `Found ${c} time${c === 1 ? "" : "s"}.` : "Not found.");
  }
  function replaceAll() {
    if (!find.trim()) return;
    snap(); let c = 0;
    for (const t of textNodes()) {
      const v = t.nodeValue || "";
      const nv = v.replace(rx(), (m) => { c++; return m[0] === m[0].toUpperCase() && m[0] !== m[0].toLowerCase() ? repl.charAt(0).toUpperCase() + repl.slice(1) : repl; });
      if (nv !== v) t.nodeValue = nv;
    }
    setFindMsg(c ? `Replaced ${c} time${c === 1 ? "" : "s"}.` : "Not found.");
    setTimeout(emit, 0);
  }
  function undo() {
    const h = hist.current.pop(); if (h === undefined || !ed.current) return;
    ed.current.innerHTML = h; setTimeout(emit, 0);
  }
  function saveAs() {
    const n = nameDraft.trim().replace(/\.docx$/i, "");
    if (!n) return;
    nameRef.current = n + ".docx"; setFileName(nameRef.current); setPanel(""); setTimeout(emit, 0);
  }

  const B = (label: string, on: () => void, title: string, extra: any = {}) => (
    <button type="button" title={title} aria-label={title}
      onMouseDown={(e) => e.preventDefault()} onClick={on}
      style={{ minWidth: 32, height: 32, padding: "0 8px", border: "1px solid #c9ccd3", borderRadius: 6,
               background: "#fff", color: "#222", fontSize: 13, cursor: "pointer", flexShrink: 0, ...extra }}>{label}</button>
  );
  const sel = (label: string, opts: number[], on: (v: number) => void, fmt = (v: number) => String(v)) => (
    <select title={label} aria-label={label} defaultValue="" onChange={(e) => { if (e.target.value) on(Number(e.target.value)); e.target.value = ""; }}
      style={{ height: 32, border: "1px solid #c9ccd3", borderRadius: 6, background: "#fff", color: "#222", fontSize: 12.5, flexShrink: 0 }}>
      <option value="" disabled>{label}</option>
      {opts.map((o) => <option key={o} value={o}>{fmt(o)}</option>)}
    </select>
  );

  return (
    <div style={{ border: "1px solid #c9ccd3", borderRadius: 10, overflow: "hidden", background: "#f3f4f6" }}>
      <style>{`
        .wsim-page { outline: none; min-height: 320px; padding: 22px 20px; background: #fff; color: #111;
          font-family: Calibri, Carlito, Arial, sans-serif; font-size: 12pt; line-height: 1; }
        .wsim-page p { margin: 0 0 8px; }
        .wsim-page table { border-collapse: collapse; margin: 6px 0 10px; width: 100%; }
        .wsim-page td, .wsim-page th { padding: 4px 6px; min-width: 30px; vertical-align: top; border: 1px dashed #c3c7cf; }
        .wsim-page table[data-borders="1"] td, .wsim-page table[data-borders="1"] th { border: 1px solid #111; }
      `}</style>
      <div style={{ display: "flex", gap: 5, padding: 6, overflowX: "auto", borderBottom: "1px solid #d7d9de", alignItems: "center" }}>
        {B("↶", undo, "Undo")}
        {B("B", () => cmd("bold"), "Bold", { fontWeight: 800 })}
        {B("I", () => cmd("italic"), "Italic", { fontStyle: "italic" })}
        {B("U", () => cmd("underline"), "Underline", { textDecoration: "underline" })}
        {sel("Size", SIZES, (v) => setStyle("fontSize", () => `${v}pt`))}
        {B("⇤", () => setStyle("textAlign", () => "left"), "Align left")}
        {B("↔", () => setStyle("textAlign", () => "center"), "Center")}
        {B("⇥", () => setStyle("textAlign", () => "right"), "Align right")}
        {B("☰", () => setStyle("textAlign", () => "justify"), "Justify")}
        {sel("Spacing", SPACINGS, (v) => setStyle("lineHeight", () => String(v)), (v) => v.toFixed(v === 1.15 ? 2 : 1))}
        {B("⇥¶", () => setStyle("textIndent", (el) => (el.style.textIndent ? "" : "0.5in")), "First-line indent")}
        {B("▦ Table", () => setPanel(panel === "table" ? "" : "table"), "Insert table")}
        {B("+ Row", addRow, "Add row")}
        {B("Borders", toggleBorders, "Table borders")}
        {B("🔍 Replace", () => setPanel(panel === "find" ? "" : "find"), "Find and Replace")}
        {B("💾 Save As", () => { setNameDraft(fileName.replace(/\.docx$/i, "")); setPanel(panel === "save" ? "" : "save"); }, "Save As", { fontWeight: 700 })}
      </div>

      {panel === "table" && (
        <div style={{ display: "flex", gap: 8, padding: 8, alignItems: "center", flexWrap: "wrap", background: "#fff", borderBottom: "1px solid #d7d9de", fontSize: 13, color: "#222" }}>
          Rows <input type="number" min={1} max={20} value={tr} onChange={(e) => setTr(Number(e.target.value))} style={{ width: 54 }} />
          Columns <input type="number" min={1} max={10} value={tc} onChange={(e) => setTc(Number(e.target.value))} style={{ width: 54 }} />
          {B("Insert", insertTable, "Insert the table", { fontWeight: 700 })}
        </div>
      )}
      {panel === "find" && (
        <div style={{ display: "grid", gap: 6, padding: 8, background: "#fff", borderBottom: "1px solid #d7d9de", fontSize: 13, color: "#222" }}>
          <input placeholder="Find what" value={find} onChange={(e) => { setFind(e.target.value); setFindMsg(""); }} style={{ padding: 6 }} />
          <input placeholder="Replace with" value={repl} onChange={(e) => setRepl(e.target.value)} style={{ padding: 6 }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {B("Find", doFind, "Find")}{B("Replace All", replaceAll, "Replace All", { fontWeight: 700 })}
            <span style={{ fontSize: 12.5 }}>{findMsg}</span>
          </div>
        </div>
      )}
      {panel === "save" && (
        <div style={{ display: "flex", gap: 6, padding: 8, alignItems: "center", background: "#fff", borderBottom: "1px solid #d7d9de", fontSize: 13, color: "#222" }}>
          File name <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveAs()}
            style={{ flex: 1, minWidth: 0, padding: 6 }} autoCapitalize="none" autoCorrect="off" />.docx
          {B("Save", saveAs, "Save", { fontWeight: 700 })}
        </div>
      )}

      <div ref={ed} className="wsim-page" contentEditable suppressContentEditableWarning spellCheck={false}
           onInput={() => { setTimeout(emit, 0); }}
           onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") snap(); }} />
      <div style={{ padding: "5px 10px", fontSize: 12, color: "#555", borderTop: "1px solid #d7d9de" }}>
        {fileName ? <>💾 Saved as <b>{fileName}</b></> : "Not saved yet — use Save As."}
      </div>
    </div>
  );
}
