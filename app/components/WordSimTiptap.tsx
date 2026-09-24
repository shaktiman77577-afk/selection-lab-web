"use client";

/**
 * app/components/WordSimTiptap.tsx — MS Word jaisa editor, TipTap (v3) par.
 *
 * WordSim.tsx (browser ke execCommand wala) ka hi badla hua roop — props aur
 * jaanch ka model (lib/officeTasks WordDoc) bilkul wahi, isliye tasks aur
 * checks bina badle chalte hain. Wapas purane par jaana ho to task page me
 * sirf import badaliye.
 *
 * Packages (package.json): @tiptap/react @tiptap/pm @tiptap/core
 *   @tiptap/starter-kit @tiptap/extension-text-align
 *   @tiptap/extension-text-style @tiptap/extension-table
 */
import { useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle, FontSize } from "@tiptap/extension-text-style";
import { Table, TableRow, TableHeader, TableCell } from "@tiptap/extension-table";
import type { Align, WordDoc } from "@/lib/officeTasks";
import { jsonToDoc, docToJson } from "@/lib/wordModel";

const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28];
const SPACINGS = [1, 1.15, 1.5, 2];

/**
 * Paragraph ki line spacing aur first-line indent (Word me ye paragraph ki
 * cheez hai, akshar ki nahi), aur table ke borders — teeno apne attribute.
 */
const ParagraphFormat = Extension.create({
  name: "paragraphFormat",
  addGlobalAttributes() {
    return [
      {
        types: ["paragraph"],
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.lineHeight || null,
            renderHTML: (a: Record<string, any>) => (a.lineHeight ? { style: `line-height: ${a.lineHeight}` } : {}),
          },
          textIndent: {
            default: null,
            parseHTML: (el: HTMLElement) => el.style.textIndent || null,
            renderHTML: (a: Record<string, any>) => (a.textIndent ? { style: `text-indent: ${a.textIndent}` } : {}),
          },
        },
      },
      {
        types: ["table"],
        attributes: {
          borders: {
            default: false,
            parseHTML: (el: HTMLElement) => el.getAttribute("data-borders") === "1",
            renderHTML: (a: Record<string, any>) => ({ "data-borders": a.borders ? "1" : "0" }),
          },
        },
      },
    ];
  },
});

// ── Find & Replace (Word jaisa: bade-chhote ka farak nahi; pehla akshar bada
// ho to naye shabd ka bhi bada — "Examination" -> "Selection test") ─────────
function matchesIn(editor: Editor, find: string) {
  const rx = new RegExp(find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
  const out: { from: number; to: number; cap: boolean }[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (!node.isText || !node.text) return;
    rx.lastIndex = 0; let m: RegExpExecArray | null;
    while ((m = rx.exec(node.text))) {
      const c = m[0][0];
      out.push({ from: pos + m.index, to: pos + m.index + m[0].length, cap: c !== c.toLowerCase() && c === c.toUpperCase() });
      if (!m[0].length) rx.lastIndex++;
    }
  });
  return out;
}

export default function WordSimTiptap({ start, onChange }: { start?: WordDoc; onChange: (d: WordDoc) => void }) {
  const [fileName, setFileName] = useState("");
  const nameRef = useRef("");
  const [nameDraft, setNameDraft] = useState("");
  const [panel, setPanel] = useState<"" | "save" | "find" | "table">("");
  const [find, setFind] = useState(""); const [repl, setRepl] = useState("");
  const [findMsg, setFindMsg] = useState("");
  const [tr, setTr] = useState(3); const [tc, setTc] = useState(3);

  const editor = useEditor({
    immediatelyRender: false,                 // Next.js: server par render nahi, hydration ki galti nahi
    shouldRerenderOnTransaction: true,        // toolbar ka Bold/Italic "on" dikhe
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, blockquote: false, code: false, horizontalRule: false,
                             bulletList: false, orderedList: false, listItem: false, strike: false, link: false }),
      TextAlign.configure({ types: ["paragraph"] }),
      TextStyle,
      FontSize.configure({ types: ["textStyle"] }),
      Table.configure({ resizable: false }),
      TableRow, TableHeader, TableCell,
      ParagraphFormat,
    ],
    content: docToJson(start),
    editorProps: { attributes: { class: "wsim-page", spellcheck: "false" } },
    onUpdate: ({ editor }) => onChange(jsonToDoc(editor.getJSON(), nameRef.current)),
    onCreate: ({ editor }) => onChange(jsonToDoc(editor.getJSON(), nameRef.current)),
  });

  if (!editor) return <div style={{ padding: 20, color: "#666" }}>Loading the editor…</div>;

  const emit = () => onChange(jsonToDoc(editor.getJSON(), nameRef.current));
  const ch = () => editor.chain().focus();

  /** Kuch select nahi kiya to Word ki tarah poore paragraph par (size ke liye) */
  const withParagraph = (fn: (c: ReturnType<typeof ch>) => any) => {
    const { empty, $from } = editor.state.selection;
    let c = ch();
    if (empty && $from.parent.isTextblock) c = c.setTextSelection({ from: $from.start(), to: $from.end() });
    fn(c).run();
  };
  const setSize = (v: number) => withParagraph((c) => c.setFontSize(`${v}pt`));
  const align = (a: Align) => ch().setTextAlign(a).run();
  const spacing = (v: number) => ch().updateAttributes("paragraph", { lineHeight: v === 1 ? null : String(v) }).run();
  const indent = () => ch().updateAttributes("paragraph", { textIndent: editor.getAttributes("paragraph").textIndent ? null : "0.5in" }).run();
  const inTable = () => editor.isActive("table");
  function addRow() { if (!inTable()) { alert("Click inside the table first."); return; } ch().addRowAfter().run(); }
  function borders() {
    if (!inTable()) { alert("Click inside the table first."); return; }
    ch().updateAttributes("table", { borders: !editor.getAttributes("table").borders }).run();
  }
  function insertTable() {
    ch().insertTable({ rows: Math.max(1, tr), cols: Math.max(1, tc), withHeaderRow: false }).run();
    setPanel("");
  }
  function doFind() {
    if (!find.trim()) return;
    const n = matchesIn(editor, find).length;
    setFindMsg(n ? `Found ${n} time${n === 1 ? "" : "s"}.` : "Not found.");
  }
  function replaceAll() {
    if (!find.trim()) return;
    const ms = matchesIn(editor, find);
    if (!ms.length) { setFindMsg("Not found."); return; }
    let t = editor.state.tr;
    for (const m of [...ms].reverse()) {
      const text = m.cap ? repl.charAt(0).toUpperCase() + repl.slice(1) : repl;
      t = t.insertText(text, m.from, m.to);              // us jagah ki formatting (bold waghera) wahi rahti hai
    }
    editor.view.dispatch(t);
    setFindMsg(`Replaced ${ms.length} time${ms.length === 1 ? "" : "s"}.`);
  }
  function saveAs() {
    const n = nameDraft.trim().replace(/\.docx$/i, ""); if (!n) return;
    nameRef.current = n + ".docx"; setFileName(nameRef.current); setPanel(""); emit();
  }

  const B = (label: string, on: () => void, title: string, active = false, extra: any = {}) => (
    <button type="button" title={title} aria-label={title} aria-pressed={active}
      onMouseDown={(e) => e.preventDefault()} onClick={on}
      style={{ minWidth: 32, height: 32, padding: "0 8px", border: "1px solid #c9ccd3", borderRadius: 6,
               background: active ? "#ffe8b3" : "#fff", color: "#222", fontSize: 13, cursor: "pointer", flexShrink: 0, ...extra }}>{label}</button>
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
        .wsim-page table { border-collapse: collapse; margin: 6px 0 10px; width: 100%; table-layout: fixed; }
        .wsim-page td, .wsim-page th { padding: 4px 6px; min-width: 30px; vertical-align: top; border: 1px dashed #c3c7cf; font-weight: normal; }
        .wsim-page td p, .wsim-page th p { margin: 0; }
        .wsim-page table[data-borders="1"] td, .wsim-page table[data-borders="1"] th { border: 1px solid #111; }
        .wsim-page .selectedCell { background: rgba(255,171,0,0.18); }
      `}</style>
      <div style={{ display: "flex", gap: 5, padding: 6, overflowX: "auto", borderBottom: "1px solid #d7d9de", alignItems: "center" }}>
        {B("↶", () => ch().undo().run(), "Undo")}
        {B("↷", () => ch().redo().run(), "Redo")}
        {B("B", () => ch().toggleBold().run(), "Bold", editor.isActive("bold"), { fontWeight: 800 })}
        {B("I", () => ch().toggleItalic().run(), "Italic", editor.isActive("italic"), { fontStyle: "italic" })}
        {B("U", () => ch().toggleUnderline().run(), "Underline", editor.isActive("underline"), { textDecoration: "underline" })}
        {sel("Size", SIZES, setSize)}
        {B("⇤", () => align("left"), "Align left", editor.isActive({ textAlign: "left" }))}
        {B("↔", () => align("center"), "Center", editor.isActive({ textAlign: "center" }))}
        {B("⇥", () => align("right"), "Align right", editor.isActive({ textAlign: "right" }))}
        {B("☰", () => align("justify"), "Justify", editor.isActive({ textAlign: "justify" }))}
        {sel("Spacing", SPACINGS, spacing, (v) => v.toFixed(v === 1.15 ? 2 : 1))}
        {B("⇥¶", indent, "First-line indent", !!editor.getAttributes("paragraph").textIndent)}
        {B("▦ Table", () => setPanel(panel === "table" ? "" : "table"), "Insert table")}
        {B("+ Row", addRow, "Add row")}
        {B("Borders", borders, "Table borders", inTable() && !!editor.getAttributes("table").borders)}
        {B("🔍 Replace", () => setPanel(panel === "find" ? "" : "find"), "Find and Replace")}
        {B("💾 Save As", () => { setNameDraft(fileName.replace(/\.docx$/i, "")); setPanel(panel === "save" ? "" : "save"); }, "Save As", false, { fontWeight: 700 })}
      </div>

      {panel === "table" && (
        <div style={{ display: "flex", gap: 8, padding: 8, alignItems: "center", flexWrap: "wrap", background: "#fff", borderBottom: "1px solid #d7d9de", fontSize: 13, color: "#222" }}>
          Rows <input type="number" min={1} max={20} value={tr} onChange={(e) => setTr(Number(e.target.value))} style={{ width: 54 }} />
          Columns <input type="number" min={1} max={10} value={tc} onChange={(e) => setTc(Number(e.target.value))} style={{ width: 54 }} />
          {B("Insert", insertTable, "Insert the table", false, { fontWeight: 700 })}
        </div>
      )}
      {panel === "find" && (
        <div style={{ display: "grid", gap: 6, padding: 8, background: "#fff", borderBottom: "1px solid #d7d9de", fontSize: 13, color: "#222" }}>
          <input placeholder="Find what" value={find} onChange={(e) => { setFind(e.target.value); setFindMsg(""); }} style={{ padding: 6 }} />
          <input placeholder="Replace with" value={repl} onChange={(e) => setRepl(e.target.value)} style={{ padding: 6 }} />
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {B("Find", doFind, "Find")}{B("Replace All", replaceAll, "Replace All", false, { fontWeight: 700 })}
            <span style={{ fontSize: 12.5 }}>{findMsg}</span>
          </div>
        </div>
      )}
      {panel === "save" && (
        <div style={{ display: "flex", gap: 6, padding: 8, alignItems: "center", background: "#fff", borderBottom: "1px solid #d7d9de", fontSize: 13, color: "#222" }}>
          File name <input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveAs()}
            style={{ flex: 1, minWidth: 0, padding: 6 }} autoCapitalize="none" autoCorrect="off" />.docx
          {B("Save", saveAs, "Save", false, { fontWeight: 700 })}
        </div>
      )}

      <EditorContent editor={editor} />
      <div style={{ padding: "5px 10px", fontSize: 12, color: "#555", borderTop: "1px solid #d7d9de" }}>
        {fileName ? <>💾 Saved as <b>{fileName}</b></> : "Not saved yet — use Save As."}
      </div>
    </div>
  );
}
