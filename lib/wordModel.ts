/**
 * lib/wordModel.ts — TipTap ka JSON <-> jaanch ka model (lib/officeTasks WordDoc).
 *
 * Isme TipTap ka koi code import nahi hota (sirf JSON ki shakal), taaki ye
 * akele test ho sake. WordSimTiptap isi se kaam leta hai.
 */
import type { Align, WordDoc, WPara, WTable, WCell } from "@/lib/officeTasks";

export type JSONContent = {
  type?: string;
  attrs?: Record<string, any>;
  content?: JSONContent[];
  marks?: { type: string; attrs?: Record<string, any> }[];
  text?: string;
};

const ptOf = (v: any): number | null => {
  if (!v) return null;
  const s = String(v);
  const n = parseFloat(s);
  if (isNaN(n)) return null;
  return s.endsWith("px") ? Math.round(n * 0.75 * 10) / 10 : n;       // 16px = 12pt
};

type Inl = { text: string; bold: boolean[]; italic: boolean[]; underline: boolean[]; sizes: (number | null)[] };
function readInline(nodes: JSONContent[] | undefined, into?: Inl): Inl {
  const r: Inl = into || { text: "", bold: [], italic: [], underline: [], sizes: [] };
  for (const n of nodes || []) {
    if (n.type === "text") {
      const marks = n.marks || [];
      const has = (t: string) => marks.some((m) => m.type === t);
      const ts = marks.find((m) => m.type === "textStyle");
      const size = ptOf(ts?.attrs?.fontSize);
      for (const ch of n.text || "") {
        r.text += ch; r.bold.push(has("bold")); r.italic.push(has("italic")); r.underline.push(has("underline")); r.sizes.push(size);
      }
    } else if (n.type === "hardBreak") {
      r.text += " "; r.bold.push(false); r.italic.push(false); r.underline.push(false); r.sizes.push(null);
    } else if (n.content) {
      readInline(n.content, r);
    }
  }
  return r;
}
/** Paragraph ka font size: saare akshar ek hi size ke hon to wahi, warna NaN (mixed) */
function paraSize(r: Inl): number {
  const s = r.sizes.filter((_, i) => !/\s/.test(r.text[i]));
  if (!s.length) return 12;
  const first = s[0] ?? 12;
  return s.every((x) => (x ?? 12) === first) ? first : NaN;
}
const alignOf = (a: any): Align => (a === "center" || a === "right" || a === "justify" ? a : "left");

export function jsonToDoc(json: JSONContent, fileName: string): WordDoc {
  const blocks: (WPara | WTable)[] = [];
  for (const b of json.content || []) {
    if (b.type === "paragraph") {
      const r = readInline(b.content);
      const lh = parseFloat(String(b.attrs?.lineHeight ?? ""));
      blocks.push({ kind: "p", text: r.text, bold: r.bold, italic: r.italic, underline: r.underline,
                    align: alignOf(b.attrs?.textAlign), size: paraSize(r), spacing: isNaN(lh) ? 1 : lh,
                    indent: !!b.attrs?.textIndent && parseFloat(String(b.attrs.textIndent)) > 0 });
    } else if (b.type === "table") {
      const rows: WCell[][] = (b.content || []).map((tr) => (tr.content || []).map((cell) => {
        const r = readInline(cell.content ? cell.content.flatMap((p, i) => (i ? [{ type: "hardBreak" }, p] : [p])) as JSONContent[] : []);
        const letters = r.bold.filter((_, k) => !/\s/.test(r.text[k]));
        const firstPara = (cell.content || [])[0];
        return { text: r.text.trim(), bold: letters.length > 0 && letters.every(Boolean), align: alignOf(firstPara?.attrs?.textAlign) };
      }));
      blocks.push({ kind: "table", rows, borders: !!b.attrs?.borders });
    }
  }
  return { blocks: blocks.filter((x) => x.kind === "table" || x.text.trim()), fileName };
}

export function docToJson(doc?: WordDoc): JSONContent {
  if (!doc || !doc.blocks.length) return { type: "doc", content: [{ type: "paragraph" }] };
  const para = (p: WPara): JSONContent => {
    const content: JSONContent[] = [];
    let i = 0;
    while (i < p.text.length) {
      let j = i + 1;
      while (j < p.text.length && p.bold[j] === p.bold[i] && p.italic[j] === p.italic[i] && p.underline[j] === p.underline[i]) j++;
      const marks: any[] = [];
      if (p.bold[i]) marks.push({ type: "bold" });
      if (p.italic[i]) marks.push({ type: "italic" });
      if (p.underline[i]) marks.push({ type: "underline" });
      if (p.size && p.size !== 12) marks.push({ type: "textStyle", attrs: { fontSize: `${p.size}pt` } });
      content.push({ type: "text", text: p.text.slice(i, j), ...(marks.length ? { marks } : {}) });
      i = j;
    }
    return { type: "paragraph", attrs: { textAlign: p.align === "left" ? null : p.align,
             lineHeight: p.spacing && p.spacing !== 1 ? String(p.spacing) : null, textIndent: p.indent ? "0.5in" : null },
             ...(content.length ? { content } : {}) };
  };
  const out: JSONContent[] = doc.blocks.map((b) => b.kind === "p" ? para(b) : ({
    type: "table", attrs: { borders: b.borders },
    content: b.rows.map((r) => ({ type: "tableRow", content: r.map((c) => ({
      type: "tableCell",
      content: [{ type: "paragraph", attrs: { textAlign: c.align === "left" ? null : c.align },
                  ...(c.text ? { content: [{ type: "text", text: c.text, ...(c.bold ? { marks: [{ type: "bold" }] } : {}) }] } : {}) }],
    })) })),
  }));
  out.push({ type: "paragraph" });
  return { type: "doc", content: out };
}

