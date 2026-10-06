/**
 * lib/nbemsMock.ts — NBEMS 75-minute full mock: saanjhi cheezein.
 * Backend: /api/nbems-mock/... (routers/nbems_mock.py)
 */

export type SectionKey = "typing" | "excel" | "word" | "ppt" | "mcq" | "fill" | "merge";

export type MockSection = { key: SectionKey; name: string; minutes: number; marks: number; minute_options?: number[] };

/** Backend na bataye to yahi (SelectionLab ka mock pattern — NBEMS ka chhapa hua nahi) */
export const DEFAULT_SECTIONS: MockSection[] = [
  { key: "typing", name: "Typing (letter / official)", minutes: 10, marks: 30 },
  { key: "excel", name: "Excel data entry", minutes: 20, marks: 25 },
  { key: "word", name: "Word task", minutes: 20, marks: 20 },
  { key: "ppt", name: "PowerPoint", minutes: 10, marks: 10 },
  { key: "mcq", name: "Computer Knowledge (MCQ)", minutes: 15, marks: 15 },
];

/** Naya pattern (v2): typing ka time student chunta hai, baaki teen ek ghadi par */
export const V2_SECTIONS: MockSection[] = [
  { key: "typing", name: "Typing", minutes: 10, marks: 25, minute_options: [10, 15, 25] },
  { key: "fill", name: "Fill in the blanks (Word)", minutes: 15, marks: 25 },
  { key: "merge", name: "Mail merge", minutes: 20, marks: 25 },
  { key: "excel", name: "Excel (5 tasks)", minutes: 25, marks: 25 },
];

export const SECTION_EMOJI: Record<SectionKey, string> = {
  typing: "⌨️", excel: "📊", word: "📝", ppt: "📽️", mcq: "❓", fill: "✏️", merge: "✉️",
};

export const SHORT_NAME: Record<SectionKey, string> = {
  typing: "Typing", excel: "Excel", word: "Word", ppt: "PowerPoint", mcq: "MCQ", fill: "Fill blanks", merge: "Mail merge",
};

/** Typing passage kam se kam itne shabd — 25 min me tez typist bhi khatam na kare */
export const LONG_PASSAGE_WORDS = 1200;

/** Har jagah ek hi baat — asli test nahi, details aane par badlega */
export const MOCK_DISCLAIMER =
  "This mock is not the actual NBEMS test. NBEMS has not published a section-wise split or a scoring " +
  "formula for the skill test, so the timing and marks here are our own pattern. We will keep updating " +
  "it as more details about the scoring come out.";

export const PASS_PCT_GENERAL = 50;
export const PASS_PCT_RESERVED = 40;

export function mmss(total: number): string {
  const s = Math.max(0, Math.floor(total));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

/** Sab students ke submit hue attempts — backend /nbems-mock/mocks deta hai */
export type MockStats = { attempts: number; avg_pct: number | null };

/** Kam se kam itne attempts ke baad hi difficulty tag — warna ek-do bachchon se galat tag lagta */
export const DIFFICULTY_MIN_ATTEMPTS = 10;

/** Average % se Easy / Medium / Hard. Kam data par null (tag nahi dikhta). */
export function difficultyOf(s?: MockStats | null): { label: "Easy" | "Medium" | "Hard"; color: string } | null {
  if (!s || s.attempts < DIFFICULTY_MIN_ATTEMPTS || s.avg_pct == null) return null;
  if (s.avg_pct >= 60) return { label: "Easy", color: "#2e8b4a" };
  if (s.avg_pct >= 40) return { label: "Medium", color: "#d68910" };
  return { label: "Hard", color: "#c0392b" };
}

/** Dono pattern ke group — Full mocks list aur series card me yahi naam */
export const PATTERN_GROUPS = [
  { pattern: "v2" as const, title: "Exam Pattern Mocks", tag: "Latest",
    sub: "Same as the reported NBEMS skill test: typing first (10 / 15 / 25 min), then fill in the blanks, mail merge and Excel" },
  { pattern: "v1" as const, title: "Practice Mocks · 75 min", tag: "",
    sub: "Extra practice on one 75-minute clock: typing, Excel, Word, PowerPoint and 15 computer MCQs" },
];

export function isNbemsSeries(title?: string | null): boolean {
  return /nbems/i.test(title || "");
}
