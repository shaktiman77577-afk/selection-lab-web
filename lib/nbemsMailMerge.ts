/**
 * lib/nbemsMailMerge.ts — NBEMS naye pattern (v2) ka Mail merge hissa (25 marks).
 *
 * Model (MergeDoc) wahi hai jo app/components/MailMergeSim.tsx banata hai, aur
 * jaanch Task/grade() wali hi (lib/officeTasks.ts) — isliye runner me Word/PPT
 * jaisa hi chalta hai: browser me grade, backend sirf score lekar scale karta hai.
 *
 * Har task: letter pehle se type hai, «Field» wali jagah khaali. Student ko
 *   Start Mail Merge → Letters, Type a New List (Customize Columns se apne
 *   column), 5 record, list Save, merge fields daalna, Finish & Merge → All,
 *   aur merged document Save As karna hai.
 *
 * Marks (har task 25): Letters 1 · columns 3 · 5 records × 2 · list save 1 ·
 *   4 merge fields × 2 · sab letters merge 1 · merged file save 1.
 * Naya task jodna ho to mergeTask(...) se banaiye — 4 field aur 5 record rakhiye
 * taaki 25 bane (neeche assert hai). Tasks NBEMS pattern par hain, official nahi.
 */
import type { Task } from "@/lib/officeTasks";

export type MergeMode = "" | "letters" | "email" | "envelopes" | "labels";
export type MergeDoc = {
  mode: MergeMode;
  columns: string[];
  rows: string[][];
  listFile: string;          // "Candidates.mdb" — list save karne par
  body: string;              // letter, «Field» ke saath
  preview: boolean;
  merged: null | { count: number; fields: number; at: number };
  mergedFile: string;        // "CallLetters.docx"
};

/** Word ki "New Address List" ke shuruaati column */
export const WORD_DEFAULT_COLUMNS = [
  "Title", "First Name", "Last Name", "Company Name", "Address Line 1", "Address Line 2",
  "City", "State", "ZIP Code", "Country or Region", "Home Phone", "Work Phone", "E-mail Address",
];

export type MergeTask = Task<MergeDoc> & {
  letter: string;            // «Field» ke saath — question paper
  columns: string[];
  records: string[][];
  listFile: string;          // bina extension
  outFile: string;           // bina extension
};

const FIELD_RE = /«([^»]+)»/g;
const norm = (s: string) => (s || "").replace(/[ \t ]+/g, " ").trim();
const low = (s: string) => norm(s).toLowerCase();
const base = (s: string) => low(s).replace(/\.(mdb|accdb|docx|doc)$/i, "");

export function fieldsIn(body: string): string[] {
  return Array.from((body || "").matchAll(FIELD_RE)).map((m) => m[1]);
}

/** Letter ki har «Field» ke liye: uske aas-paas ka text (pichhli/agli field tak) */
type Spot = { field: string; before: string; after: string; atStart: boolean; atEnd: boolean };
function spots(letter: string): Spot[] {
  const out: Spot[] = [];
  for (const line of letter.split("\n")) {
    const parts = line.split(FIELD_RE);            // [text, field, text, field, text]
    for (let i = 1; i < parts.length; i += 2) {
      // Pados ke 4-4 shabd kaafi — poori line milana zaroori nahi
      out.push({
        field: parts[i], before: parts[i - 1].split(/\s+/).slice(-4).join(" "), after: (parts[i + 1] ?? "").split(/\s+/).slice(0, 4).join(" "),
        atStart: i === 1 && !norm(parts[0]), atEnd: i === parts.length - 2 && !norm(parts[i + 1] ?? ""),
      });
    }
  }
  return out;
}

/** Body ki kisi line me field sahi jagah hai? Bade-chhote akshar ka farak nahi. */
function spotOk(body: string, s: Spot): boolean {
  const tok = `«${s.field.toLowerCase()}»`;
  const before = low(s.before), after = low(s.after);
  return (body || "").split("\n").some((raw) => {
    const line = low(raw);
    let from = 0;
    for (;;) {
      const i = line.indexOf(tok, from);
      if (i < 0) return false;
      const left = norm(line.slice(0, i)), right = norm(line.slice(i + tok.length));
      const okL = s.atStart ? left === "" : before === "" || left.endsWith(before);
      const okR = s.atEnd ? right === "" : after === "" || right.startsWith(after);
      if (okL && okR) return true;
      from = i + 1;
    }
  });
}

function colIndex(d: MergeDoc, name: string) {
  return d.columns.findIndex((c) => low(c) === name.toLowerCase());
}
function hasRecord(d: MergeDoc, cols: string[], rec: string[]) {
  const idx = cols.map((c) => colIndex(d, c));
  if (idx.some((i) => i < 0)) return false;
  return d.rows.some((r) => idx.every((ci, j) => low(r[ci] || "") === rec[j].toLowerCase()));
}

export function blankBody(letter: string) {
  return letter.replace(FIELD_RE, "");
}

export function emptyMergeDoc(body = ""): MergeDoc {
  return { mode: "", columns: [], rows: [], listFile: "", body, preview: false, merged: null, mergedFile: "" };
}

function mergeTask(t: { id: string; title: string; intro: string; letter: string; columns: string[]; records: string[][];
                        listFile: string; outFile: string }): MergeTask {
  const sp = spots(t.letter);
  const checks: MergeTask["checks"] = [
    { label: "Mail merge started as Letters", marks: 1, fix: "Mailings → Start Mail Merge → Letters.",
      test: (d) => d.mode === "letters" },
    { label: `Recipient list has the columns ${t.columns.join(", ")}`, marks: 3,
      fix: "In Type a New List press Customize Columns, then Add / Rename so these exact column names are there.",
      test: (d) => t.columns.every((c) => colIndex(d, c) >= 0) },
    ...t.records.map((r, i) => ({
      label: `Record ${i + 1} (${r[0]}) entered correctly`, marks: 2,
      fix: `Check every value of this row: ${r.join(" | ")}`,
      test: (d: MergeDoc) => hasRecord(d, t.columns, r),
    })),
    { label: `Recipient list saved as ${t.listFile}`, marks: 1, fix: `When you press OK in the list, type ${t.listFile} as the file name.`,
      test: (d) => base(d.listFile) === t.listFile.toLowerCase() },
    ...sp.map((s) => ({
      label: `Merge field «${s.field}» inserted at the right place`, marks: 2,
      fix: `Click exactly where «${s.field}» is shown in the letter, then Insert Merge Field → ${s.field}. Do not type it by hand next to extra spaces or words.`,
      test: (d: MergeDoc) => spotOk(d.body, s),
    })),
    { label: `All ${t.records.length} letters merged`, marks: 1,
      fix: "Finish & Merge → Edit Individual Documents → All → OK, after the fields are in place.",
      test: (d) => !!d.merged && d.merged.fields > 0 && d.merged.count >= t.records.length && d.rows.length >= t.records.length },
    { label: `Merged document saved as ${t.outFile}.docx`, marks: 1, fix: `In the merged letters press Save As and type ${t.outFile}.`,
      test: (d) => !!d.merged && base(d.mergedFile) === t.outFile.toLowerCase() },
  ];
  const total = checks.reduce((a, c) => a + c.marks, 0);
  if (total !== 25) console.warn(`[mail merge] ${t.id} totals ${total}, expected 25`);
  return {
    ...t, app: "word", minutes: 20,
    steps: [
      "Mailings → Start Mail Merge → Letters.",
      `Select Recipients → Type a New List. Use Customize Columns so the list has the columns: ${t.columns.join(", ")}. You may delete the other columns.`,
      `Type the ${t.records.length} records given in the table.`,
      `Press OK and save the recipient list as ${t.listFile}.`,
      "In the letter, insert each merge field where «Field» is shown (click the spot, then Insert Merge Field).",
      "Use Preview Results to check the letters.",
      "Finish & Merge → Edit Individual Documents → All.",
      `Save the merged document as ${t.outFile}.docx.`,
    ],
    start: () => emptyMergeDoc(blankBody(t.letter)),
    checks,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
//  5 TASKS — naye pattern ke Mock 1-5 (DB me mock_number 6-10)
// ═══════════════════════════════════════════════════════════════════════════
export const MERGE_TASKS: MergeTask[] = [
  mergeTask({
    id: "mm1-call-letter", title: "Skill test call letters",
    intro: "Prepare call letters for the five candidates below using Mail Merge.",
    columns: ["Name", "Roll No", "Post", "Test Date"],
    records: [
      ["Ankit Sharma", "260114", "Junior Assistant", "12-03-2027"],
      ["Pooja Rani", "260127", "Junior Assistant", "12-03-2027"],
      ["Vikas Kumar", "260139", "Junior Accountant", "13-03-2027"],
      ["Neha Verma", "260152", "Stenographer", "13-03-2027"],
      ["Rahul Meena", "260168", "Junior Assistant", "14-03-2027"],
    ],
    listFile: "Candidates", outFile: "CallLetters",
    letter: [
      "OFFICE OF THE RECRUITMENT CELL",
      "No. RC/2027/Skill/114",
      "",
      "To,",
      "«Name»",
      "Roll No. «Roll No»",
      "",
      "Subject: Call letter for the Skill Test",
      "",
      "Sir/Madam,",
      "You have qualified the written examination for the post of «Post». You are requested to appear for the Skill Test on «Test Date» at 9:30 a.m. in the Computer Laboratory. Please bring this letter, your admit card and a valid photo identity card.",
      "",
      "Yours faithfully,",
      "Assistant Director (Recruitment)",
    ].join("\n"),
  }),
  mergeTask({
    id: "mm2-training", title: "Training nomination letters",
    intro: "Five officials have been nominated for training. Prepare their letters using Mail Merge.",
    columns: ["Name", "Designation", "Section", "Training Date"],
    records: [
      ["Sunita Devi", "Upper Division Clerk", "Accounts", "05-04-2027"],
      ["Rakesh Yadav", "Lower Division Clerk", "Establishment", "05-04-2027"],
      ["Meenakshi Iyer", "Assistant", "Examination", "06-04-2027"],
      ["Gaurav Singh", "Junior Assistant", "Record Room", "06-04-2027"],
      ["Farhan Ali", "Data Entry Operator", "IT Cell", "07-04-2027"],
    ],
    listFile: "Trainees", outFile: "Nominations",
    letter: [
      "ADMINISTRATION SECTION",
      "Office Order No. A-21/2027",
      "",
      "«Name»",
      "«Designation», «Section» Section",
      "",
      "Subject: Nomination for training on e-Office",
      "",
      "You are hereby nominated for a one-day training programme on e-Office to be held on «Training Date» in the Conference Hall from 10:00 a.m. to 5:00 p.m. Attendance is compulsory. Kindly hand over your urgent work to another official of the section before leaving for the training.",
      "",
      "Section Officer (Admin)",
    ].join("\n"),
  }),
  mergeTask({
    id: "mm3-leave", title: "Leave sanction letters",
    intro: "Prepare leave sanction letters for the five employees below using Mail Merge.",
    columns: ["Name", "Employee ID", "Leave Type", "Days"],
    records: [
      ["Kavita Joshi", "EMP1021", "Earned Leave", "10"],
      ["Mohan Lal", "EMP1034", "Half Pay Leave", "6"],
      ["Arti Saini", "EMP1047", "Child Care Leave", "30"],
      ["Deepak Rawat", "EMP1052", "Earned Leave", "15"],
      ["Salma Khatoon", "EMP1066", "Commuted Leave", "8"],
    ],
    listFile: "LeaveList", outFile: "LeaveLetters",
    letter: [
      "ESTABLISHMENT SECTION",
      "No. E-11/Leave/2027",
      "",
      "To,",
      "«Name» (Employee ID: «Employee ID»)",
      "",
      "Subject: Sanction of leave",
      "",
      "With reference to your application, the competent authority has sanctioned «Leave Type» for «Days» days. You are advised to report for duty on the day after the leave ends and to submit your joining report to this section.",
      "",
      "Under Secretary (Establishment)",
    ].join("\n"),
  }),
  mergeTask({
    id: "mm4-meeting", title: "Meeting invitation letters",
    intro: "Invite the five officers below to the review meeting using Mail Merge.",
    columns: ["Name", "Designation", "Department", "Meeting Date"],
    records: [
      ["Dr. Anil Kapoor", "Deputy Director", "Academics", "20-05-2027"],
      ["Ms. Ritu Malhotra", "Assistant Director", "Accreditation", "20-05-2027"],
      ["Mr. Sanjay Gupta", "Accounts Officer", "Finance", "20-05-2027"],
      ["Dr. Leena Thomas", "Joint Director", "Examination", "21-05-2027"],
      ["Mr. Harish Chand", "Section Officer", "Administration", "21-05-2027"],
    ],
    listFile: "Officers", outFile: "Invitations",
    letter: [
      "OFFICE OF THE EXECUTIVE DIRECTOR",
      "",
      "«Name»",
      "«Designation»",
      "«Department» Department",
      "",
      "Subject: Quarterly review meeting",
      "",
      "Dear Sir/Madam,",
      "A meeting to review the progress of pending work will be held on «Meeting Date» at 11:00 a.m. in Committee Room No. 2. You are requested to attend the meeting with the status report of your department.",
      "",
      "Personal Secretary to the Executive Director",
    ].join("\n"),
  }),
  mergeTask({
    id: "mm5-joining", title: "Joining instruction letters",
    intro: "Prepare joining letters for the five selected candidates using Mail Merge.",
    columns: ["Name", "City", "Post", "Joining Date"],
    records: [
      ["Priya Nair", "Kochi", "Junior Assistant", "01-07-2027"],
      ["Amit Chauhan", "Jaipur", "Junior Assistant", "01-07-2027"],
      ["Simran Kaur", "Ludhiana", "Junior Accountant", "02-07-2027"],
      ["Rohit Das", "Kolkata", "Stenographer", "02-07-2027"],
      ["Manish Tiwari", "Lucknow", "Junior Assistant", "03-07-2027"],
    ],
    listFile: "Appointees", outFile: "JoiningLetters",
    letter: [
      "RECRUITMENT SECTION",
      "No. RS/Joining/2027",
      "",
      "To,",
      "«Name»",
      "«City»",
      "",
      "Subject: Joining instructions for the post of «Post»",
      "",
      "Sir/Madam,",
      "With reference to your selection, you are directed to report for joining on «Joining Date» at 10:00 a.m. with your original certificates, two passport size photographs and the medical fitness certificate.",
      "",
      "Deputy Secretary (Recruitment)",
    ].join("\n"),
  }),
];

export const mergeTaskById = (id?: string | null) => MERGE_TASKS.find((t) => t.id === id);
