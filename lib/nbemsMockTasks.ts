/**
 * lib/nbemsMockTasks.ts — NBEMS 75-minute full mock ke Word (20 marks) aur
 * PowerPoint (10 marks) tasks. Har mock ka ek Word + ek PPT task.
 *
 * Model aur grade() lib/officeTasks.ts wale hi hain, isliye WordSimTiptap /
 * PptSim bina badle chalte hain. Free practice (office-practice) ki list me ye
 * tasks NAHI dikhte — sirf mock ke andar. Checks ke marks jod kar Word = 20,
 * PPT = 10 bante hain, isliye scorecard me scale karna hi nahi padta.
 *
 * Naye tasks jodne ho to yahin jodiye aur mock row (nbems_mocks) me uska id
 * word_task_id / ppt_task_id me likh dijiye. Tasks NBEMS pattern par bane hain,
 * official sawaal nahi hain.
 */
import { newSlide, type Align, type Task, type WordDoc, type WPara, type WTable, type PptDoc, type PSlide } from "@/lib/officeTasks";

// ── helpers (officeTasks.ts wale export nahi hain, isliye yahan apne) ─────────
const norm = (s: string) => (s || "").replace(/\s+/g, " ").trim();
const low = (s: string) => norm(s).toLowerCase();
const paras = (d: WordDoc) => d.blocks.filter((b): b is WPara => b.kind === "p");
const tables = (d: WordDoc) => d.blocks.filter((b): b is WTable => b.kind === "table");
const findPara = (d: WordDoc, text: string) => paras(d).find((p) => norm(p.text) === norm(text));
const startsWith = (d: WordDoc, text: string) => paras(d).find((p) => low(p.text).startsWith(low(text)));
const allOf = (flags: boolean[], p: WPara, from = 0, len = p.text.length) => {
  let any = false;
  for (let i = from; i < from + len; i++) {
    if (/\s/.test(p.text[i] || "")) continue;
    any = true;
    if (!flags[i]) return false;
  }
  return any;
};
function phraseHas(d: WordDoc, phrase: string, key: "bold" | "italic" | "underline"): boolean {
  for (const p of paras(d)) {
    const i = p.text.toLowerCase().indexOf(phrase.toLowerCase());
    if (i >= 0 && allOf(p[key], p, i, phrase.length)) return true;
  }
  return false;
}
const fileIs = (name: string, want: string) =>
  low(name).replace(/\.docx$|\.pptx$/, "") === want.toLowerCase().replace(/\.docx$|\.pptx$/, "");
const plainText = (d: WordDoc) => paras(d).map((p) => p.text).join(" ");
/** Header row se table dhoondo — pehli row ke cells, bade-chhote ka farak nahi */
const tableWithHead = (d: WordDoc, head: string[]) =>
  tables(d).find((t) => t.rows[0] && t.rows[0].map((c) => low(c.text)).join("|") === head.map((h) => h.toLowerCase()).join("|"));
const rowsMatch = (t: WTable | undefined, rows: string[][], from = 1) =>
  !!t && rows.every((r, i) => t.rows[i + from] && r.every((v, j) => norm(t.rows[i + from][j]?.text) === v));

function makeDoc(texts: string[], size = 12, fileName = ""): WordDoc {
  return {
    fileName,
    blocks: texts.map((t) => ({
      kind: "p" as const, text: t, align: "left" as Align, size, spacing: 1, indent: false,
      bold: Array(t.length).fill(false), italic: Array(t.length).fill(false), underline: Array(t.length).fill(false),
    })),
  };
}

// PPT helpers
const slideTitled = (d: PptDoc, t: string) => d.slides.find((s) => low(s.title) === t.toLowerCase());
const cleanBullets = (s?: PSlide) => (s?.bullets || []).map(norm).filter(Boolean);
const bulletsAre = (s: PSlide | undefined, want: string[]) => {
  const b = cleanBullets(s).map((x) => x.toLowerCase());
  return b.length === want.length && want.every((w, i) => b[i] === w.toLowerCase());
};

// ═══════════════════════════════════════════════════════════════════════════
//  WORD — har task 20 marks
// ═══════════════════════════════════════════════════════════════════════════

// Mock 1 — Office notice + schedule table (khaali document se)
const M1_BODY = "All shortlisted candidates are informed that the Computer Skill Test will be held in the Computer Laboratory on the second floor. Candidates must report thirty minutes before their batch time along with the admit card and a valid photo identity card.";
const M1_HEAD = ["S. No.", "Roll No.", "Name", "Batch Time"];
const M1_ROWS = [
  ["1", "260145", "Deepak Yadav", "9:30 a.m."],
  ["2", "260178", "Shalini Gupta", "9:30 a.m."],
  ["3", "260203", "Mohit Bansal", "11:30 a.m."],
  ["4", "260231", "Farah Khan", "11:30 a.m."],
];

// Mock 2 — Find & Replace + formatting (bhara hua document)
const M2_START = [
  "CIRCULAR",
  "A Training Programme on e-Office will be organised for all dealing hands on 15th March, 2027 in the Conference Hall. The Section Officer of each section shall nominate two officials for the programme and send their names by 10th March, 2027.",
  "The training will cover the creation of e-files, movement of files, noting on the system and the use of digital signatures. The Section Officer shall ensure that the nominated officials attend the full session from 10:00 a.m. to 4:00 p.m.",
  "Officials who have already attended a similar training during the last six months need not be nominated again. Any query in this regard may be addressed to the Section Officer (Training).",
];
const M2_FIND = "Section Officer";
const M2_REPL = "Under Secretary";
const M2_COUNT = M2_START.join(" ").split(M2_FIND).length - 1;
const m2Body = (d: WordDoc) => paras(d).filter((p) => norm(p.text).split(" ").length >= 12);

// Mock 3 — Leave register table
const M3_TITLE = "LEAVE REGISTER - JANUARY 2027";
const M3_HEAD = ["S. No.", "Name", "Designation", "Leave Type", "Days"];
const M3_ROWS = [
  ["1", "Ravi Shankar", "Assistant", "Casual Leave", "2"],
  ["2", "Anjali Mehra", "Junior Assistant", "Earned Leave", "5"],
  ["3", "Sanjay Dubey", "Stenographer", "Half Pay Leave", "3"],
  ["4", "Pooja Rana", "Junior Assistant", "Casual Leave", "1"],
  ["5", "Harish Chand", "Section Officer", "Earned Leave", "6"],
];
const M3_SIXTH = ["6", "Kavita Negi", "Assistant", "Earned Leave", "4"];
const M3_TOTAL = `Total leave days: ${[...M3_ROWS, M3_SIXTH].reduce((a, r) => a + Number(r[4]), 0)}`;

// Mock 4 — Official letter formatting (bhara hua, 11 pt me)
const M4_BODY1 = "With reference to the letter of the Training Division dated 1st March, 2027, it is informed that the following officials of this section are nominated for the training on e-Office to be held from 22nd March, 2027 to 24th March, 2027.";
const M4_BODY2 = "The officials have been directed to report at the training venue by 9:45 a.m. on the first day. It is requested that the course material and the login details may be provided to them on the day of registration.";
const M4_NEW = "The names of the nominated officials are Shri Amit Verma, Assistant, and Ms. Neha Kapoor, Junior Assistant.";
const M4_START = [
  "No. ADM/Trg/2027/12",
  "Dated: 8th March, 2027",
  "To,",
  "The Deputy Director (Training),",
  "Training Division, New Delhi",
  "Subject: Nomination for training on e-Office.",
  "Sir,",
  M4_BODY1,
  M4_BODY2,
  "Yours faithfully,",
  "(R. K. Sharma)",
  "Assistant Director (Admin)",
];
const M4_SIGN = ["Yours faithfully,", "(R. K. Sharma)", "Assistant Director (Admin)"];
const m4Body = (d: WordDoc) => [M4_BODY1, M4_BODY2].map((t) => findPara(d, t));

// Mock 5 — Minutes of meeting
const M5_TITLE = "MINUTES OF THE MEETING";
const M5_LINE = "Date: 12th April, 2027 | Venue: Conference Room";
const M5_BODY = "A meeting of the heads of sections was held under the chairmanship of the Joint Director to review the pending files and the progress of digitisation of old records. The following decisions were taken in the meeting.";
const M5_HEAD = ["S. No.", "Action Point", "Responsibility"];
const M5_ROWS = [
  ["1", "Clear all files pending for more than 30 days", "All Section Officers"],
  ["2", "Scan and upload old records of the year 2015", "Record Section"],
  ["3", "Send the monthly progress report", "Administration Section"],
];

export const MOCK_WORD_TASKS: Task<WordDoc>[] = [
  {
    id: "m1-word", app: "word", title: "Office notice with a schedule table", minutes: 20,
    intro: "Create a new document and prepare the office notice below exactly as given.",
    steps: [
      "Type the heading: OFFICE NOTICE — Bold, 16 pt, Center aligned",
      "On the next line type: Computer Skill Test - Schedule — and Underline it",
      "Type the paragraph: " + M1_BODY,
      "Paragraph: 12 pt, Justified, line spacing 1.5",
      "Insert a table with 4 columns. Header row: " + M1_HEAD.join(" | "),
      ...M1_ROWS.map((r) => r.join(" | ")),
      "Header row Bold, borders on the complete table",
      "Save the file as Notice_Mock1.docx",
    ],
    checks: [
      { label: "Heading OFFICE NOTICE typed", marks: 2, fix: "Type OFFICE NOTICE in capital letters on its own line.", test: (d) => !!findPara(d, "OFFICE NOTICE") },
      { label: "Heading Bold", marks: 1, fix: "Select the heading and press B.", test: (d) => { const p = findPara(d, "OFFICE NOTICE"); return !!p && allOf(p.bold, p); } },
      { label: "Heading 16 pt", marks: 1, fix: "Click in the heading and choose 16 in the Size box.", test: (d) => findPara(d, "OFFICE NOTICE")?.size === 16 },
      { label: "Heading centred", marks: 1, fix: "Click in the heading and press Center.", test: (d) => findPara(d, "OFFICE NOTICE")?.align === "center" },
      { label: "Second line typed", marks: 1, fix: "Type Computer Skill Test - Schedule on its own line.", test: (d) => !!findPara(d, "Computer Skill Test - Schedule") },
      { label: "Second line underlined", marks: 1, fix: "Select the second line and press U.", test: (d) => { const p = findPara(d, "Computer Skill Test - Schedule"); return !!p && allOf(p.underline, p); } },
      { label: "Paragraph typed exactly", marks: 3, fix: "Compare every word, comma and full stop with the given text.", test: (d) => !!findPara(d, M1_BODY) },
      { label: "Paragraph 12 pt", marks: 1, fix: "Click in the paragraph and choose 12.", test: (d) => findPara(d, M1_BODY)?.size === 12 },
      { label: "Paragraph Justified", marks: 1, fix: "Click in the paragraph and press Justify.", test: (d) => findPara(d, M1_BODY)?.align === "justify" },
      { label: "Line spacing 1.5", marks: 1, fix: "Click in the paragraph and choose 1.5 in the Spacing box.", test: (d) => findPara(d, M1_BODY)?.spacing === 1.5 },
      { label: "Table header row correct", marks: 1, fix: "The first row must be: " + M1_HEAD.join(" | "), test: (d) => !!tableWithHead(d, M1_HEAD) },
      { label: "All 4 records typed correctly", marks: 3, fix: "Compare each roll number, name and time with the list.", test: (d) => rowsMatch(tableWithHead(d, M1_HEAD), M1_ROWS) },
      { label: "Header row Bold", marks: 1, fix: "Select the header row and press B.", test: (d) => { const t = tableWithHead(d, M1_HEAD); return !!t && t.rows[0].every((c) => c.bold); } },
      { label: "Borders on the table", marks: 1, fix: "Click in the table and press Borders.", test: (d) => !!tableWithHead(d, M1_HEAD)?.borders },
      { label: "Saved as Notice_Mock1.docx", marks: 1, fix: "Press Save As and type Notice_Mock1.", test: (d) => fileIs(d.fileName, "Notice_Mock1.docx") },
    ],
  },
  {
    id: "m2-word", app: "word", title: "Circular: Find & Replace and formatting", minutes: 20,
    intro: "The circular below is already typed in 11 pt. Edit and format it as instructed.",
    steps: [
      `Replace every "${M2_FIND}" with "${M2_REPL}" (use Find & Replace)`,
      "Heading CIRCULAR: Bold, 16 pt, Center aligned",
      "All three paragraphs: 12 pt, Justified, line spacing 1.15, first-line indent",
      "Make \"Training Programme on e-Office\" Bold",
      "Make \"Conference Hall\" Italic",
      "Underline \"15th March, 2027\"",
      "Do not change any other text",
      "Save the file as Circular_Mock2.docx",
    ],
    start: () => makeDoc(M2_START, 11),     // 11 pt se shuru — 12 karna hi kaam hai
    checks: [
      { label: `No "${M2_FIND}" left`, marks: 2, fix: "Open Find & Replace and press Replace All.", test: (d) => !plainText(d).toLowerCase().includes(M2_FIND.toLowerCase()) },
      { label: `All ${M2_COUNT} replaced with "${M2_REPL}"`, marks: 2, fix: `Type ${M2_REPL} exactly in the Replace with box.`,
        test: (d) => plainText(d).split(M2_REPL).length - 1 === M2_COUNT },
      { label: "Rest of the text unchanged", marks: 2, fix: "Only the words asked for should change. Use Undo if you typed over something.",
        // Kuch replace hi nahi kiya to ye mark muft na mile
        test: (d) => plainText(d).includes(M2_REPL) && low(plainText(d).split(M2_REPL).join(M2_FIND)) === low(M2_START.join(" ")) },
      { label: "Heading Bold", marks: 1, fix: "Select CIRCULAR and press B.", test: (d) => { const p = findPara(d, "CIRCULAR"); return !!p && allOf(p.bold, p); } },
      { label: "Heading 16 pt", marks: 1, fix: "Click in CIRCULAR and choose 16.", test: (d) => findPara(d, "CIRCULAR")?.size === 16 },
      { label: "Heading centred", marks: 1, fix: "Click in CIRCULAR and press Center.", test: (d) => findPara(d, "CIRCULAR")?.align === "center" },
      { label: "All paragraphs 12 pt", marks: 1, fix: "Select all three paragraphs and choose 12.", test: (d) => m2Body(d).length === 3 && m2Body(d).every((p) => p.size === 12) },
      { label: "All paragraphs Justified", marks: 2, fix: "Select all three paragraphs and press Justify.", test: (d) => m2Body(d).length === 3 && m2Body(d).every((p) => p.align === "justify") },
      { label: "Line spacing 1.15", marks: 2, fix: "Select all three paragraphs and choose 1.15 in Spacing.", test: (d) => m2Body(d).length === 3 && m2Body(d).every((p) => p.spacing === 1.15) },
      { label: "First-line indent", marks: 2, fix: "Click in each paragraph and press the first-line indent button.", test: (d) => m2Body(d).length === 3 && m2Body(d).every((p) => p.indent) },
      { label: "\"Training Programme on e-Office\" Bold", marks: 1, fix: "Select the words and press B.", test: (d) => phraseHas(d, "Training Programme on e-Office", "bold") },
      { label: "\"Conference Hall\" Italic", marks: 1, fix: "Select the words and press I.", test: (d) => phraseHas(d, "Conference Hall", "italic") },
      { label: "\"15th March, 2027\" Underlined", marks: 1, fix: "Select the date and press U.", test: (d) => phraseHas(d, "15th March, 2027", "underline") },
      { label: "Saved as Circular_Mock2.docx", marks: 1, fix: "Press Save As and type Circular_Mock2.", test: (d) => fileIs(d.fileName, "Circular_Mock2.docx") },
    ],
  },
  {
    id: "m3-word", app: "word", title: "Leave register table", minutes: 20,
    intro: "Create a new document with the leave register below.",
    steps: [
      `Type the heading: ${M3_TITLE} — Bold, 14 pt, Center aligned`,
      "Insert a table with 5 columns. Header row: " + M3_HEAD.join(" | "),
      ...M3_ROWS.map((r) => r.join(" | ")),
      "Header row Bold and centred, borders on the complete table",
      "Days column (numbers) Right aligned",
      "Add one more row at the end: " + M3_SIXTH.join(" | "),
      `Below the table type: ${M3_TOTAL} — and make it Bold`,
      "Save the file as LeaveRegister.docx",
    ],
    checks: [
      { label: "Heading typed", marks: 1, fix: `Type ${M3_TITLE} exactly.`, test: (d) => !!findPara(d, M3_TITLE) },
      { label: "Heading Bold", marks: 1, fix: "Select the heading and press B.", test: (d) => { const p = findPara(d, M3_TITLE); return !!p && allOf(p.bold, p); } },
      { label: "Heading 14 pt", marks: 1, fix: "Choose 14 in the Size box.", test: (d) => findPara(d, M3_TITLE)?.size === 14 },
      { label: "Heading centred", marks: 1, fix: "Press Center.", test: (d) => findPara(d, M3_TITLE)?.align === "center" },
      { label: "Table header row correct", marks: 2, fix: "The first row must be: " + M3_HEAD.join(" | "), test: (d) => !!tableWithHead(d, M3_HEAD) },
      { label: "All 5 records typed correctly", marks: 4, fix: "Compare every name, designation, leave type and number with the list.", test: (d) => rowsMatch(tableWithHead(d, M3_HEAD), M3_ROWS) },
      { label: "Sixth row added correctly", marks: 2, fix: "Click in the last row, press + Row and type the sixth record.", test: (d) => rowsMatch(tableWithHead(d, M3_HEAD), [M3_SIXTH], 6) },
      { label: "Header row Bold", marks: 1, fix: "Select the header row and press B.", test: (d) => { const t = tableWithHead(d, M3_HEAD); return !!t && t.rows[0].every((c) => c.bold); } },
      { label: "Header row centred", marks: 1, fix: "Select the header cells and press Center.", test: (d) => { const t = tableWithHead(d, M3_HEAD); return !!t && t.rows[0].every((c) => c.align === "center"); } },
      { label: "Borders on the table", marks: 1, fix: "Click in the table and press Borders.", test: (d) => !!tableWithHead(d, M3_HEAD)?.borders },
      { label: "Days column right-aligned", marks: 2, fix: "Select the number cells in the Days column and press Align right.",
        test: (d) => { const t = tableWithHead(d, M3_HEAD); const r = t?.rows.slice(1).filter((x) => norm(x[4]?.text)) || []; return r.length >= 5 && r.every((x) => x[4].align === "right"); } },
      { label: "Total line typed", marks: 1, fix: `Below the table type ${M3_TOTAL}`, test: (d) => !!findPara(d, M3_TOTAL) },
      { label: "Total line Bold", marks: 1, fix: "Select the total line and press B.", test: (d) => { const p = findPara(d, M3_TOTAL); return !!p && allOf(p.bold, p); } },
      { label: "Saved as LeaveRegister.docx", marks: 1, fix: "Press Save As and type LeaveRegister.", test: (d) => fileIs(d.fileName, "LeaveRegister.docx") },
    ],
  },
  {
    id: "m4-word", app: "word", title: "Official letter formatting", minutes: 20,
    intro: "The letter below is typed in 11 pt without any formatting. Format it as an official letter.",
    steps: [
      "Date line (Dated: 8th March, 2027): Right aligned",
      "Subject line: Bold and Underlined",
      "Both body paragraphs: 12 pt, Justified, line spacing 1.5, first-line indent",
      "After the second body paragraph add this paragraph: " + M4_NEW,
      "The last three lines (Yours faithfully, name, designation): Right aligned",
      "Save the file as Letter_Mock4.docx",
    ],
    start: () => makeDoc(M4_START, 11),
    checks: [
      { label: "Date line right-aligned", marks: 2, fix: "Click in the date line and press Align right.", test: (d) => startsWith(d, "Dated:")?.align === "right" },
      { label: "Subject line Bold", marks: 2, fix: "Select the whole subject line and press B.", test: (d) => { const p = startsWith(d, "Subject:"); return !!p && allOf(p.bold, p); } },
      { label: "Subject line Underlined", marks: 2, fix: "Select the whole subject line and press U.", test: (d) => { const p = startsWith(d, "Subject:"); return !!p && allOf(p.underline, p); } },
      { label: "Body paragraphs 12 pt", marks: 2, fix: "Select both paragraphs and choose 12.", test: (d) => m4Body(d).every((p) => p?.size === 12) },
      { label: "Body paragraphs Justified", marks: 2, fix: "Select both paragraphs and press Justify.", test: (d) => m4Body(d).every((p) => p?.align === "justify") },
      { label: "Line spacing 1.5", marks: 2, fix: "Select both paragraphs and choose 1.5 in Spacing.", test: (d) => m4Body(d).every((p) => p?.spacing === 1.5) },
      { label: "First-line indent", marks: 2, fix: "Click in each body paragraph and press the first-line indent button.", test: (d) => m4Body(d).every((p) => !!p?.indent) },
      { label: "New paragraph typed exactly", marks: 2, fix: "Check names, commas and the full stop in the new paragraph.", test: (d) => !!findPara(d, M4_NEW) },
      { label: "Last three lines right-aligned", marks: 2, fix: "Select Yours faithfully and the two lines below it and press Align right.",
        test: (d) => M4_SIGN.every((t) => findPara(d, t)?.align === "right") },
      { label: "Saved as Letter_Mock4.docx", marks: 2, fix: "Press Save As and type Letter_Mock4.", test: (d) => fileIs(d.fileName, "Letter_Mock4.docx") },
    ],
  },
  {
    id: "m5-word", app: "word", title: "Minutes of a meeting", minutes: 20,
    intro: "Create a new document and prepare the minutes below.",
    steps: [
      `Type the heading: ${M5_TITLE} — Bold, Underlined, 16 pt, Center aligned`,
      `Next line: ${M5_LINE} — Center aligned`,
      "Type the paragraph: " + M5_BODY,
      "Paragraph: 12 pt, Justified",
      "Insert a table with 3 columns. Header row: " + M5_HEAD.join(" | "),
      ...M5_ROWS.map((r) => r.join(" | ")),
      "Header row Bold, borders on the complete table, S. No. column centred",
      "Save the file as Minutes_Mock5.docx",
    ],
    checks: [
      { label: "Heading typed", marks: 1, fix: `Type ${M5_TITLE} exactly.`, test: (d) => !!findPara(d, M5_TITLE) },
      { label: "Heading Bold", marks: 1, fix: "Select the heading and press B.", test: (d) => { const p = findPara(d, M5_TITLE); return !!p && allOf(p.bold, p); } },
      { label: "Heading Underlined", marks: 1, fix: "Select the heading and press U.", test: (d) => { const p = findPara(d, M5_TITLE); return !!p && allOf(p.underline, p); } },
      { label: "Heading 16 pt", marks: 1, fix: "Choose 16 in the Size box.", test: (d) => findPara(d, M5_TITLE)?.size === 16 },
      { label: "Heading centred", marks: 1, fix: "Press Center.", test: (d) => findPara(d, M5_TITLE)?.align === "center" },
      { label: "Date and venue line typed", marks: 1, fix: `Type ${M5_LINE} exactly, with the | sign.`, test: (d) => !!findPara(d, M5_LINE) },
      { label: "Date and venue line centred", marks: 1, fix: "Click in the line and press Center.", test: (d) => findPara(d, M5_LINE)?.align === "center" },
      { label: "Paragraph typed exactly", marks: 3, fix: "Compare every word, comma and full stop with the given text.", test: (d) => !!findPara(d, M5_BODY) },
      { label: "Paragraph 12 pt", marks: 1, fix: "Choose 12.", test: (d) => findPara(d, M5_BODY)?.size === 12 },
      { label: "Paragraph Justified", marks: 1, fix: "Press Justify.", test: (d) => findPara(d, M5_BODY)?.align === "justify" },
      { label: "Table header row correct", marks: 1, fix: "The first row must be: " + M5_HEAD.join(" | "), test: (d) => !!tableWithHead(d, M5_HEAD) },
      { label: "All 3 action points typed correctly", marks: 3, fix: "Compare every action point and responsibility with the list.", test: (d) => rowsMatch(tableWithHead(d, M5_HEAD), M5_ROWS) },
      { label: "Header row Bold", marks: 1, fix: "Select the header row and press B.", test: (d) => { const t = tableWithHead(d, M5_HEAD); return !!t && t.rows[0].every((c) => c.bold); } },
      { label: "Borders on the table", marks: 1, fix: "Click in the table and press Borders.", test: (d) => !!tableWithHead(d, M5_HEAD)?.borders },
      { label: "S. No. column centred", marks: 1, fix: "Select the S. No. cells and press Center.",
        test: (d) => { const t = tableWithHead(d, M5_HEAD); return !!t && t.rows.length >= 4 && t.rows.slice(0, 4).every((r) => r[0]?.align === "center"); } },
      { label: "Saved as Minutes_Mock5.docx", marks: 1, fix: "Press Save As and type Minutes_Mock5.", test: (d) => fileIs(d.fileName, "Minutes_Mock5.docx") },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════════════════
//  POWERPOINT — har task 10 marks
// ═══════════════════════════════════════════════════════════════════════════
const P1_BULLETS = ["DigiLocker", "UMANG", "BHIM UPI", "e-Hospital"];
const P3_DOS = ["Use strong passwords", "Lock your computer when you leave the seat", "Keep the antivirus updated"];
const P3_DONTS = ["Do not share your OTP", "Do not open unknown attachments", "Do not use pen drives from outside"];
const P5_BULLETS = ["Clean offices and public places", "Proper disposal of waste", "Awareness among citizens", "Use of dustbins"];

export const MOCK_PPT_TASKS: Task<PptDoc>[] = [
  {
    id: "m1-ppt", app: "ppt", title: "Create a presentation: Digital India", minutes: 10,
    intro: "Create a three-slide presentation on Digital India.",
    steps: [
      "Slide 1 (Title Slide): title Digital India, subtitle Power to Empower",
      "Make the title of slide 1 Bold",
      "Slide 2 (Title and Content): heading Key Initiatives with these four bullet points: " + P1_BULLETS.join(", "),
      "Slide 3 (Title Only): heading Thank You",
      "Save as DigitalIndia.pptx",
    ],
    start: () => ({ slides: [newSlide("title")], deletedTitles: [], fileName: "" }),
    checks: [
      { label: "Slide 1: Title Slide with title Digital India", marks: 2, fix: "On slide 1 keep the Title Slide layout and type Digital India as the title.",
        test: (d) => d.slides[0]?.layout === "title" && low(d.slides[0].title) === "digital india" },
      { label: "Subtitle Power to Empower", marks: 1, fix: "Type Power to Empower in the subtitle box of slide 1.", test: (d) => low(d.slides[0]?.subtitle || "") === "power to empower" },
      { label: "Slide 1 title Bold", marks: 1, fix: "Click on slide 1 and press B.", test: (d) => !!d.slides[0]?.titleBold },
      { label: "Slide 2: Key Initiatives", marks: 1, fix: "Add slide 2 with the Title and Content layout and the heading Key Initiatives.",
        test: (d) => d.slides[1]?.layout === "content" && low(d.slides[1].title) === "key initiatives" },
      { label: "All four bullet points", marks: 2, fix: "Type one initiative per line, in the given order.", test: (d) => bulletsAre(d.slides[1], P1_BULLETS) },
      { label: "Slide 3: Title Only, Thank You", marks: 2, fix: "Add slide 3 with the Title Only layout and type Thank You.",
        test: (d) => d.slides[2]?.layout === "titleOnly" && low(d.slides[2].title) === "thank you" },
      { label: "Saved as DigitalIndia.pptx", marks: 1, fix: "Press Save As and type DigitalIndia.", test: (d) => fileIs(d.fileName, "DigitalIndia.pptx") },
    ],
  },
  {
    id: "m2-ppt", app: "ppt", title: "Edit a presentation: Office Procedure", minutes: 10,
    intro: "A presentation is already open. Edit it as instructed.",
    steps: [
      "Delete the slide titled Old Data",
      "On the Record Keeping slide add one more bullet point at the end: Weeding out of old files",
      "Slide 1 heading: Bold and font size 40 (press A+ twice)",
      "Add a new slide at the end with the Title Only layout and the heading Questions?",
      "Save as OfficeProcedure.pptx",
    ],
    start: () => {
      const a = newSlide("title", "Office Procedure"); a.subtitle = "Induction Training";
      const b = newSlide("content", "File Management"); b.bullets = ["Opening of a new file", "Movement of files", "Closing of files"];
      const c = newSlide("content", "Old Data"); c.bullets = ["This slide is not needed"];
      const e = newSlide("content", "Record Keeping"); e.bullets = ["Classification of records", "Record retention schedule"];
      return { slides: [a, b, c, e], deletedTitles: [], fileName: "" };
    },
    checks: [
      { label: "\"Old Data\" slide deleted", marks: 2, fix: "Select the Old Data slide and press Delete slide.",
        test: (d) => !slideTitled(d, "Old Data") && d.deletedTitles.some((t) => low(t) === "old data") },
      { label: "Other slides kept", marks: 1, fix: "Only the Old Data slide should be deleted.",
        test: (d) => !slideTitled(d, "Old Data") && ["Office Procedure", "File Management", "Record Keeping"].every((t) => !!slideTitled(d, t)) },
      { label: "New bullet on Record Keeping", marks: 2, fix: "Click at the end of the last bullet, press Enter and type Weeding out of old files.",
        test: (d) => { const b = cleanBullets(slideTitled(d, "Record Keeping")).map((x) => x.toLowerCase()); return b.length === 3 && b[2] === "weeding out of old files"; } },
      { label: "Slide 1 heading Bold, 40 pt or more", marks: 2, fix: "Click on slide 1, press B and then A+ twice.",
        test: (d) => { const s = slideTitled(d, "Office Procedure"); return !!s && s.titleBold && s.titleSize >= 40; } },
      { label: "Last slide: Title Only, Questions?", marks: 2, fix: "Go to the last slide, choose Title Only, press + New slide and type Questions?",
        test: (d) => { const s = d.slides[d.slides.length - 1]; return !!s && s.layout === "titleOnly" && low(s.title) === "questions?"; } },
      { label: "Saved as OfficeProcedure.pptx", marks: 1, fix: "Press Save As and type OfficeProcedure.", test: (d) => fileIs(d.fileName, "OfficeProcedure.pptx") },
    ],
  },
  {
    id: "m3-ppt", app: "ppt", title: "Create a presentation: Cyber Safety at Work", minutes: 10,
    intro: "Create a four-slide presentation on cyber safety.",
    steps: [
      "Slide 1 (Title Slide): title Cyber Safety at Work, subtitle Awareness Session",
      "Slide 2 (Title and Content): heading Do's with these points: " + P3_DOS.join("; "),
      "Slide 3 (Title and Content): heading Don'ts with these points: " + P3_DONTS.join("; "),
      "Slide 4 (Blank): add a text box, type Report incidents to the IT Cell and drag it to a new place",
      "Save as CyberSafety.pptx",
    ],
    start: () => ({ slides: [newSlide("title")], deletedTitles: [], fileName: "" }),
    checks: [
      { label: "Slide 1 title", marks: 1, fix: "Type Cyber Safety at Work as the title of slide 1.", test: (d) => low(d.slides[0]?.title || "") === "cyber safety at work" },
      { label: "Slide 1 subtitle", marks: 1, fix: "Type Awareness Session in the subtitle box.", test: (d) => low(d.slides[0]?.subtitle || "") === "awareness session" },
      { label: "Slide 2: Do's with 3 points", marks: 2, fix: "Heading Do's and the three points, one per line, in order.",
        test: (d) => low(d.slides[1]?.title || "") === "do's" && bulletsAre(d.slides[1], P3_DOS) },
      { label: "Slide 3: Don'ts with 3 points", marks: 2, fix: "Heading Don'ts and the three points, one per line, in order.",
        test: (d) => low(d.slides[2]?.title || "") === "don'ts" && bulletsAre(d.slides[2], P3_DONTS) },
      { label: "Slide 4 is Blank", marks: 1, fix: "Choose the Blank layout before pressing + New slide.", test: (d) => d.slides[3]?.layout === "blank" },
      { label: "Text box with the given text", marks: 1, fix: "Press T Text box on slide 4 and type Report incidents to the IT Cell.",
        test: (d) => !!d.slides[3]?.boxes.some((b) => low(b.text) === "report incidents to the it cell") },
      { label: "Text box moved", marks: 1, fix: "Drag the text box by its orange bar.", test: (d) => !!d.slides[3]?.boxes.some((b) => b.moved) },
      { label: "Saved as CyberSafety.pptx", marks: 1, fix: "Press Save As and type CyberSafety.", test: (d) => fileIs(d.fileName, "CyberSafety.pptx") },
    ],
  },
  {
    id: "m4-ppt", app: "ppt", title: "Edit a presentation: Annual Report", minutes: 10,
    intro: "A presentation is already open. Edit it as instructed.",
    steps: [
      "Slide 1: add the subtitle Administration Division",
      "Change the heading Targets to Targets for 2027-28",
      "After the Achievements slide, add a new Title and Content slide with the heading Challenges and at least two bullet points",
      "Achievements heading: Bold and font size 40 (press A+ twice)",
      "Save as AnnualReport.pptx",
    ],
    start: () => {
      const a = newSlide("title", "Annual Report 2026-27");
      const b = newSlide("content", "Achievements"); b.bullets = ["All files digitised", "Pendency reduced by 40%", "Two new training programmes"];
      const c = newSlide("content", "Targets"); c.bullets = ["Paperless office", "Online leave management"];
      return { slides: [a, b, c], deletedTitles: [], fileName: "" };
    },
    checks: [
      { label: "Subtitle added", marks: 2, fix: "On slide 1 type Administration Division in the subtitle box.", test: (d) => low(d.slides[0]?.subtitle || "") === "administration division" },
      { label: "Heading changed to Targets for 2027-28", marks: 2, fix: "Click in the Targets heading and add for 2027-28.",
        test: (d) => !!slideTitled(d, "Targets for 2027-28") && !slideTitled(d, "Targets") },
      { label: "Challenges slide in position 3", marks: 1, fix: "Select the Achievements slide, choose Title and Content, press + New slide and type Challenges.",
        test: (d) => d.slides[2]?.layout === "content" && low(d.slides[2].title) === "challenges" },
      { label: "At least two bullet points on Challenges", marks: 1, fix: "Type two or more points, one per line.", test: (d) => cleanBullets(slideTitled(d, "Challenges")).length >= 2 },
      { label: "Achievements heading Bold, 40 pt or more", marks: 2, fix: "Click on the Achievements slide, press B and then A+ twice.",
        test: (d) => { const s = slideTitled(d, "Achievements"); return !!s && s.titleBold && s.titleSize >= 40; } },
      { label: "Saved as AnnualReport.pptx", marks: 2, fix: "Press Save As and type AnnualReport.", test: (d) => fileIs(d.fileName, "AnnualReport.pptx") },
    ],
  },
  {
    id: "m5-ppt", app: "ppt", title: "Create a presentation: Swachh Bharat Mission", minutes: 10,
    intro: "Create a four-slide presentation on the Swachh Bharat Mission.",
    steps: [
      "Slide 1 (Title Slide): title Swachh Bharat Mission — Bold, font size 40 (press A+ twice); subtitle Launched on 2nd October, 2014",
      "Slide 2 (Title and Content): heading Objectives with these points: " + P5_BULLETS.join("; "),
      "Slide 3 (Title and Content): heading Our Office Activities with at least three points of your own",
      "Slide 4 (Title Only): heading Thank You",
      "Save as SwachhBharat.pptx",
    ],
    start: () => ({ slides: [newSlide("title")], deletedTitles: [], fileName: "" }),
    checks: [
      { label: "Slide 1 title", marks: 1, fix: "Type Swachh Bharat Mission as the title of slide 1.", test: (d) => low(d.slides[0]?.title || "") === "swachh bharat mission" },
      { label: "Slide 1 title Bold, 40 pt or more", marks: 2, fix: "Click on the title, press B and then A+ twice.", test: (d) => !!d.slides[0]?.titleBold && (d.slides[0]?.titleSize || 0) >= 40 },
      { label: "Slide 1 subtitle", marks: 1, fix: "Type Launched on 2nd October, 2014 in the subtitle box.", test: (d) => low(d.slides[0]?.subtitle || "") === "launched on 2nd october, 2014" },
      { label: "Slide 2: Objectives with 4 points", marks: 2, fix: "Heading Objectives and the four points, one per line, in order.",
        test: (d) => low(d.slides[1]?.title || "") === "objectives" && bulletsAre(d.slides[1], P5_BULLETS) },
      { label: "Slide 3: at least three points", marks: 1, fix: "Heading Our Office Activities and three or more points.",
        test: (d) => low(d.slides[2]?.title || "") === "our office activities" && cleanBullets(d.slides[2]).length >= 3 },
      { label: "Slide 4: Title Only, Thank You", marks: 1, fix: "Add slide 4 with the Title Only layout and type Thank You.",
        test: (d) => d.slides[3]?.layout === "titleOnly" && low(d.slides[3].title) === "thank you" },
      { label: "Saved as SwachhBharat.pptx", marks: 2, fix: "Press Save As and type SwachhBharat.", test: (d) => fileIs(d.fileName, "SwachhBharat.pptx") },
    ],
  },
];

export const MOCK_TASKS: Task<any>[] = [...MOCK_WORD_TASKS, ...MOCK_PPT_TASKS];
export const mockTask = (id?: string | null) => MOCK_TASKS.find((t) => t.id === id);
