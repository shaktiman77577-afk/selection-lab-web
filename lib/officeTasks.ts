/**
 * lib/officeTasks.ts — NBEMS Word / PowerPoint practice: tasks aur unki jaanch.
 *
 * Simulator (WordSim / PptSim) apna kaam ek saaf "model" me deta hai; yahan ke
 * checks sirf us model ko dekhte hain — har baar same jawab, koi AI nahi.
 * Har check ke saath "fix" likha hai: galat hone par student ko yahi dikhta hai.
 * Tasks NBEMS pattern ki practice PDF se liye gaye hain (official nahi).
 */

// ── Word model ─────────────────────────────────────────────────────────────
export type Align = "left" | "center" | "right" | "justify";
export type WPara = {
  kind: "p";
  text: string;
  align: Align;
  size: number;            // pt
  spacing: number;         // 1, 1.15, 1.5, 2
  indent: boolean;         // first-line indent
  bold: boolean[];         // har akshar ka
  italic: boolean[];
  underline: boolean[];
};
export type WCell = { text: string; bold: boolean; align: Align };
export type WTable = { kind: "table"; rows: WCell[][]; borders: boolean };
export type WordDoc = { blocks: (WPara | WTable)[]; fileName: string };

// ── PowerPoint model ───────────────────────────────────────────────────────
export type Layout = "title" | "content" | "titleOnly" | "blank";
export type PBox = { id: string; text: string; x: number; y: number; moved: boolean };
export type PSlide = {
  id: string;
  layout: Layout;
  startLayout: Layout;     // layout badla ya nahi
  title: string;
  titleBold: boolean;
  titleSize: number;       // pt, default 32
  subtitle: string;
  bullets: string[];
  boxes: PBox[];
  isNew: boolean;          // student ne "New slide" se banaya
};
export type PptDoc = { slides: PSlide[]; deletedTitles: string[]; fileName: string };

export type Check<T> = { label: string; fix: string; marks: number; test: (d: T) => boolean };
export type Task<T> = {
  id: string;
  app: "word" | "ppt";
  title: string;
  minutes: number;
  intro: string;
  steps: string[];
  start?: () => T;          // pehle se bhara document (Find & Replace, slide editing)
  checks: Check<T>[];
};

// ── helpers ────────────────────────────────────────────────────────────────
const norm = (s: string) => (s || "").replace(/\s+/g, " ").trim();
const paras = (d: WordDoc) => d.blocks.filter((b): b is WPara => b.kind === "p");
const tables = (d: WordDoc) => d.blocks.filter((b): b is WTable => b.kind === "table");
const findPara = (d: WordDoc, text: string) => paras(d).find((p) => norm(p.text) === norm(text));
const allOf = (flags: boolean[], p: WPara, from = 0, len = p.text.length) => {
  let any = false;
  for (let i = from; i < from + len; i++) {
    if (/\s/.test(p.text[i] || "")) continue;            // space ka bold hona zaroori nahi
    any = true;
    if (!flags[i]) return false;
  }
  return any;
};
/** Paragraph ke andar "phrase" poora is formatting me hai? */
function phraseHas(d: WordDoc, phrase: string, key: "bold" | "italic" | "underline"): boolean {
  for (const p of paras(d)) {
    const i = p.text.toLowerCase().indexOf(phrase.toLowerCase());
    if (i >= 0 && allOf(p[key], p, i, phrase.length)) return true;
  }
  return false;
}
const fileIs = (name: string, want: string) =>
  norm(name).toLowerCase().replace(/\.docx$|\.pptx$/, "") === want.toLowerCase().replace(/\.docx$|\.pptx$/, "");
const body = (d: WordDoc) => paras(d).filter((p) => norm(p.text).split(" ").length >= 12);
const words = (s: string) => norm(s).split(" ").filter(Boolean).length;

// ── Word tasks ─────────────────────────────────────────────────────────────
const NOTICE_BODY = "Candidates must report to the designated computer laboratory on time. They should carefully follow all instructions displayed on the computer screen.";
const TABLE_HEAD = ["S. No.", "Name", "Roll No.", "Department", "Marks"];
const TABLE_ROWS = [
  ["1", "Rahul Kumar", "101", "Administration", "78"],
  ["2", "Priya Singh", "102", "Accounts", "85"],
  ["3", "Amit Sharma", "103", "Examination", "72"],
  ["4", "Neha Verma", "104", "Establishment", "91"],
  ["5", "Rohit Singh", "105", "Administration", "81"],
];
const FR_TEXT = [
  "The examination will be conducted in two stages. Candidates who qualify the first examination will be called for the second examination.",
  "The admit card for the examination will be available on the website. Candidates must carry the admit card to the examination centre.",
  "Any candidate found using unfair means during the examination will be disqualified.",
];
const FR_COUNT = FR_TEXT.join(" ").match(/examination/gi)!.length;

function simpleDoc(texts: string[], fileName = ""): WordDoc {
  return {
    fileName,
    blocks: texts.map((t) => ({
      kind: "p" as const, text: t, align: "left" as Align, size: 12, spacing: 1, indent: false,
      bold: Array(t.length).fill(false), italic: Array(t.length).fill(false), underline: Array(t.length).fill(false),
    })),
  };
}

function theTable(d: WordDoc): WTable | undefined {
  return tables(d).find((t) => t.rows[0] && t.rows[0].map((c) => norm(c.text).toLowerCase()).join("|") ===
    TABLE_HEAD.map((h) => h.toLowerCase()).join("|"));
}

export const WORD_TASKS: Task<WordDoc>[] = [
  {
    id: "w1-notice", app: "word", title: "Notice: typing and formatting", minutes: 8,
    intro: "Create a new document and prepare the notice below exactly as given.",
    steps: [
      "Type the heading: NBEMS JUNIOR ASSISTANT 2026",
      "On the next line type: Computer Skill Test",
      "Then type the body: " + NOTICE_BODY,
      "Heading: Bold, 16 pt, Center aligned",
      "Make the words \"Computer Skill Test\" Bold",
      "Body: 12 pt, Justified",
      "Save the file as NBEMS_Notice.docx",
    ],
    checks: [
      { label: "Heading typed exactly", marks: 1, fix: "Type NBEMS JUNIOR ASSISTANT 2026 on its own line, in capital letters.",
        test: (d) => !!findPara(d, "NBEMS JUNIOR ASSISTANT 2026") },
      { label: "Heading is Bold", marks: 1, fix: "Select the heading and press B.",
        test: (d) => { const p = findPara(d, "NBEMS JUNIOR ASSISTANT 2026"); return !!p && allOf(p.bold, p); } },
      { label: "Heading is 16 pt", marks: 1, fix: "Click in the heading and choose 16 in the font size box.",
        test: (d) => findPara(d, "NBEMS JUNIOR ASSISTANT 2026")?.size === 16 },
      { label: "Heading is centred", marks: 1, fix: "Click in the heading and press the Center button.",
        test: (d) => findPara(d, "NBEMS JUNIOR ASSISTANT 2026")?.align === "center" },
      { label: "\"Computer Skill Test\" typed and Bold", marks: 1, fix: "Type Computer Skill Test, select it and press B.",
        test: (d) => phraseHas(d, "Computer Skill Test", "bold") },
      { label: "Body typed exactly", marks: 2, fix: "Check spelling, capital letters and full stops in the body text.",
        test: (d) => !!findPara(d, NOTICE_BODY) },
      { label: "Body is 12 pt", marks: 1, fix: "Click in the body and choose 12 in the font size box.",
        test: (d) => findPara(d, NOTICE_BODY)?.size === 12 },
      { label: "Body is Justified", marks: 1, fix: "Click in the body and press the Justify button.",
        test: (d) => findPara(d, NOTICE_BODY)?.align === "justify" },
      { label: "Saved as NBEMS_Notice.docx", marks: 1, fix: "Press Save As and type NBEMS_Notice as the file name.",
        test: (d) => fileIs(d.fileName, "NBEMS_Notice.docx") },
    ],
  },
  {
    id: "w2-paragraph", app: "word", title: "Paragraph: alignment and spacing", minutes: 6,
    intro: "Type a short paragraph of 5–6 lines (at least 40 words) on any office topic, then format it.",
    steps: [
      "Type a paragraph of at least 40 words",
      "Try Left, Center and Right align — and finally Justify",
      "Font size 12 pt",
      "Line spacing 1.15",
      "First-line indent",
      "Save the document (any file name)",
    ],
    checks: [
      { label: "Paragraph of at least 40 words", marks: 2, fix: "Type a longer paragraph — 5 to 6 lines.",
        test: (d) => paras(d).some((p) => words(p.text) >= 40) },
      { label: "Finally Justified", marks: 1, fix: "Click in the paragraph and press Justify last.",
        test: (d) => paras(d).some((p) => words(p.text) >= 40 && p.align === "justify") },
      { label: "Font size 12 pt", marks: 1, fix: "Click in the paragraph and choose 12.",
        test: (d) => paras(d).some((p) => words(p.text) >= 40 && p.size === 12) },
      { label: "Line spacing 1.15", marks: 1, fix: "Choose 1.15 in the line spacing box.",
        test: (d) => paras(d).some((p) => words(p.text) >= 40 && p.spacing === 1.15) },
      { label: "First-line indent", marks: 1, fix: "Press the first-line indent button.",
        test: (d) => paras(d).some((p) => words(p.text) >= 40 && p.indent) },
      { label: "Document saved", marks: 1, fix: "Press Save As and give the file a name.",
        test: (d) => norm(d.fileName).length > 0 },
    ],
  },
  {
    id: "w3-table", app: "word", title: "Table creation", minutes: 10,
    intro: "Insert a table with the columns S. No. | Name | Roll No. | Department | Marks and enter the records.",
    steps: [
      "Insert a table with 5 columns",
      "Header row: " + TABLE_HEAD.join(" | "),
      ...TABLE_ROWS.map((r) => r.join(" | ")),
      "Header row Bold and centred",
      "Borders on the complete table",
      "Marks column right-aligned",
      "Add one more row and enter a sixth candidate (any details)",
      "Save as NBEMS_Table.docx",
    ],
    checks: [
      { label: "Header row typed correctly", marks: 1, fix: "The first row must be: " + TABLE_HEAD.join(" | "),
        test: (d) => !!theTable(d) },
      { label: "All 5 records typed correctly", marks: 3, fix: "Compare every name, roll number and mark with the list.",
        test: (d) => { const t = theTable(d); return !!t && TABLE_ROWS.every((r, i) => t.rows[i + 1] && r.every((v, j) => norm(t.rows[i + 1][j]?.text) === v)); } },
      { label: "Header row Bold", marks: 1, fix: "Select the header row and press B.",
        test: (d) => { const t = theTable(d); return !!t && t.rows[0].every((c) => c.bold); } },
      { label: "Header row centred", marks: 1, fix: "Select the header cells and press Center.",
        test: (d) => { const t = theTable(d); return !!t && t.rows[0].every((c) => c.align === "center"); } },
      { label: "Borders on the table", marks: 1, fix: "Click in the table and press Borders.",
        test: (d) => !!theTable(d)?.borders },
      { label: "Marks column right-aligned", marks: 1, fix: "Select the marks cells and press Right align.",
        test: (d) => { const t = theTable(d); return !!t && t.rows.slice(1).filter((r) => norm(r[4]?.text)).every((r) => r[4].align === "right"); } },
      { label: "Sixth candidate added", marks: 1, fix: "Click in the last row, press Add row and fill all 5 cells.",
        test: (d) => { const t = theTable(d); return !!t && t.rows.length >= 7 && t.rows[6].every((c) => norm(c.text)); } },
      { label: "Saved as NBEMS_Table.docx", marks: 1, fix: "Press Save As and type NBEMS_Table.",
        test: (d) => fileIs(d.fileName, "NBEMS_Table.docx") },
    ],
  },
  {
    id: "w4-find-replace", app: "word", title: "Find & Replace", minutes: 4,
    intro: "The document below uses the word \"examination\" many times. Replace it everywhere.",
    steps: [
      "Use Find to locate the word \"examination\"",
      "Use Replace All: examination → selection test",
      "Check that no \"examination\" is left",
      "Do not change any other text",
      "Save as NBEMS_Replace.docx",
    ],
    start: () => simpleDoc(FR_TEXT),
    checks: [
      { label: "No \"examination\" left", marks: 2, fix: "Open Find & Replace and press Replace All.",
        test: (d) => !/examination/i.test(paras(d).map((p) => p.text).join(" ")) },
      { label: `All ${FR_COUNT} replaced with "selection test"`, marks: 2, fix: "Type selection test exactly in the Replace box.",
        test: (d) => (paras(d).map((p) => p.text).join(" ").match(/selection test/gi) || []).length === FR_COUNT },
      { label: "Rest of the text unchanged", marks: 1, fix: "Only the word examination should change — use Undo if you typed over something.",
        test: (d) => norm(paras(d).map((p) => p.text).join(" ").replace(/selection test/gi, "examination")).toLowerCase()
          === norm(FR_TEXT.join(" ")).toLowerCase() },
      { label: "Saved as NBEMS_Replace.docx", marks: 1, fix: "Press Save As and type NBEMS_Replace.",
        test: (d) => fileIs(d.fileName, "NBEMS_Replace.docx") },
    ],
  },
  {
    id: "w5-biu", app: "word", title: "Bold, Italic and Underline", minutes: 4,
    intro: "Format only the words asked for — the rest of the paragraph must stay normal.",
    steps: [
      "Make \"Junior Assistant\" Bold",
      "Make \"computer laboratory\" Italic",
      "Underline \"on time\"",
      "Leave the other words as they are",
      "Save as NBEMS_Format.docx",
    ],
    start: () => simpleDoc(["Every Junior Assistant must report to the computer laboratory on time and follow the instructions of the invigilator."]),
    checks: [
      { label: "\"Junior Assistant\" Bold", marks: 1, fix: "Select Junior Assistant and press B.", test: (d) => phraseHas(d, "Junior Assistant", "bold") },
      { label: "\"computer laboratory\" Italic", marks: 1, fix: "Select computer laboratory and press I.", test: (d) => phraseHas(d, "computer laboratory", "italic") },
      { label: "\"on time\" Underlined", marks: 1, fix: "Select on time and press U.", test: (d) => phraseHas(d, "on time", "underline") },
      { label: "Other words not Bold", marks: 1, fix: "Only Junior Assistant should be bold — select the rest and press B again to remove it.",
        test: (d) => !phraseHas(d, "follow the instructions", "bold") && !phraseHas(d, "Every", "bold") },
      { label: "Saved as NBEMS_Format.docx", marks: 1, fix: "Press Save As and type NBEMS_Format.", test: (d) => fileIs(d.fileName, "NBEMS_Format.docx") },
    ],
  },
  {
    id: "w6-combined", app: "word", title: "Combined task (CBT-2 style)", minutes: 12,
    intro: "Do everything in one document, as in the real skill test.",
    steps: [
      "Heading: NBEMS CBT-2 PRACTICE — Bold, 14 pt, centred",
      "A body paragraph of at least 25 words — 12 pt, Justified",
      "A table with 3 columns (Name | Roll No. | Marks) and 3 candidates",
      "Table header Bold, borders on the table",
      "Save as NBEMS_CBT2.docx",
    ],
    checks: [
      { label: "Heading typed", marks: 1, fix: "Type NBEMS CBT-2 PRACTICE on its own line.", test: (d) => !!findPara(d, "NBEMS CBT-2 PRACTICE") },
      { label: "Heading Bold, 14 pt, centred", marks: 2, fix: "Click in the heading: B, 14 and Center.",
        test: (d) => { const p = findPara(d, "NBEMS CBT-2 PRACTICE"); return !!p && allOf(p.bold, p) && p.size === 14 && p.align === "center"; } },
      { label: "Body paragraph (25+ words), 12 pt, Justified", marks: 2, fix: "Type a longer paragraph, choose 12 and press Justify.",
        test: (d) => paras(d).some((p) => words(p.text) >= 25 && p.size === 12 && p.align === "justify") },
      { label: "Table with 3 columns and 3 candidates", marks: 2, fix: "Insert a table: header + 3 rows, 3 columns, all cells filled.",
        test: (d) => tables(d).some((t) => t.rows.length >= 4 && t.rows.every((r) => r.length === 3) && t.rows.slice(0, 4).every((r) => r.every((c) => norm(c.text)))) },
      { label: "Table header Bold, borders on", marks: 1, fix: "Bold the first row and press Borders.",
        test: (d) => tables(d).some((t) => t.borders && t.rows[0]?.every((c) => c.bold)) },
      { label: "Saved as NBEMS_CBT2.docx", marks: 1, fix: "Press Save As and type NBEMS_CBT2.", test: (d) => fileIs(d.fileName, "NBEMS_CBT2.docx") },
    ],
  },
];

// ── PowerPoint tasks ───────────────────────────────────────────────────────
export function newSlide(layout: Layout, title = "", isNew = false): PSlide {
  return { id: Math.random().toString(36).slice(2, 9), layout, startLayout: layout, title, titleBold: false,
           titleSize: 32, subtitle: "", bullets: [], boxes: [], isNew };
}
const slideTitled = (d: PptDoc, t: string) => d.slides.find((s) => norm(s.title).toLowerCase() === t.toLowerCase());

export const PPT_TASKS: Task<PptDoc>[] = [
  {
    id: "p1-create", app: "ppt", title: "Create slides", minutes: 10,
    intro: "Create a presentation on \"NBEMS Junior Assistant\".",
    steps: [
      "Slide 1 (Title Slide): title NBEMS Junior Assistant",
      "Slide 2: heading Computer Skills with at least five bullet points (for example Typing, Data Entry, MS Word, MS Excel, File Management)",
      "Slide 3: heading Important Tasks",
      "Apply basic text formatting (make a heading Bold)",
      "Save as NBEMS_JA_Presentation.pptx",
    ],
    start: () => ({ slides: [newSlide("title")], deletedTitles: [], fileName: "" }),
    checks: [
      { label: "Title slide: NBEMS Junior Assistant", marks: 2, fix: "On slide 1 use the Title Slide layout and type NBEMS Junior Assistant as the title.",
        test: (d) => d.slides[0]?.layout === "title" && norm(d.slides[0].title).toLowerCase() === "nbems junior assistant" },
      { label: "Slide 2: Computer Skills", marks: 1, fix: "Add a second slide (Title and Content) with the heading Computer Skills.",
        test: (d) => norm(d.slides[1]?.title || "").toLowerCase() === "computer skills" },
      { label: "At least five bullet points", marks: 2, fix: "Type one skill per line in the content box — at least five lines.",
        test: (d) => (slideTitled(d, "Computer Skills")?.bullets.filter((b) => norm(b)).length || 0) >= 5 },
      { label: "Slide 3: Important Tasks", marks: 1, fix: "Add a third slide with the heading Important Tasks.",
        test: (d) => norm(d.slides[2]?.title || "").toLowerCase() === "important tasks" },
      { label: "A heading is Bold", marks: 1, fix: "Click in a heading and press B.", test: (d) => d.slides.some((s) => s.titleBold && norm(s.title)) },
      { label: "Saved as NBEMS_JA_Presentation.pptx", marks: 1, fix: "Press Save As and type NBEMS_JA_Presentation.",
        test: (d) => fileIs(d.fileName, "NBEMS_JA_Presentation.pptx") },
    ],
  },
  {
    id: "p2-edit", app: "ppt", title: "Slide editing", minutes: 8,
    intro: "Edit the presentation that is already open.",
    steps: [
      "Insert a new slide",
      "Change the layout of any slide",
      "Add a text box and type something in it",
      "Make a heading Bold and increase its font size",
      "Move a text box to a different position",
      "Delete the slide titled \"Unwanted Slide\"",
      "Save as NBEMS_JA_Edited.pptx",
    ],
    start: () => {
      const a = newSlide("title", "NBEMS Junior Assistant"); a.subtitle = "Computer Skill Test";
      const b = newSlide("content", "Computer Skills"); b.bullets = ["Typing", "Data Entry", "MS Word", "MS Excel", "File Management"];
      const c = newSlide("content", "Unwanted Slide"); c.bullets = ["This slide is not needed"];
      return { slides: [a, b, c], deletedTitles: [], fileName: "" };
    },
    checks: [
      { label: "New slide inserted", marks: 1, fix: "Press New slide.", test: (d) => d.slides.some((s) => s.isNew) },
      { label: "Layout changed", marks: 1, fix: "Choose a different layout for any slide.", test: (d) => d.slides.some((s) => s.layout !== s.startLayout) },
      { label: "Text box added", marks: 1, fix: "Press Text box and type in it.", test: (d) => d.slides.some((s) => s.boxes.some((b) => norm(b.text))) },
      { label: "Heading Bold with a bigger font", marks: 2, fix: "Click in a heading, press B and then A+.",
        test: (d) => d.slides.some((s) => s.titleBold && s.titleSize > 32 && norm(s.title)) },
      { label: "Text box moved", marks: 1, fix: "Drag the text box to a new place.", test: (d) => d.slides.some((s) => s.boxes.some((b) => b.moved)) },
      { label: "\"Unwanted Slide\" deleted", marks: 1, fix: "Select the Unwanted Slide and press Delete slide.",
        test: (d) => !slideTitled(d, "Unwanted Slide") && d.deletedTitles.some((t) => norm(t).toLowerCase() === "unwanted slide") },
      { label: "Other slides kept", marks: 1, fix: "Only the Unwanted Slide should be deleted.",
        test: (d) => !!slideTitled(d, "NBEMS Junior Assistant") && !!slideTitled(d, "Computer Skills") },
      { label: "Saved as NBEMS_JA_Edited.pptx", marks: 1, fix: "Press Save As and type NBEMS_JA_Edited.", test: (d) => fileIs(d.fileName, "NBEMS_JA_Edited.pptx") },
    ],
  },
];

export const ALL_TASKS: Task<any>[] = [...WORD_TASKS, ...PPT_TASKS];

export function grade<T>(task: Task<T>, doc: T) {
  const rows = task.checks.map((c) => {
    let ok = false;
    try { ok = !!c.test(doc); } catch { ok = false; }
    return { label: c.label, fix: c.fix, marks: c.marks, ok };
  });
  const total = rows.reduce((a, r) => a + r.marks, 0);
  const score = rows.reduce((a, r) => a + (r.ok ? r.marks : 0), 0);
  return { rows, score, total };
}
