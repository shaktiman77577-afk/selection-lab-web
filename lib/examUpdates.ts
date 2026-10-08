// Exam Updates (/exam-updates) ke dono pages ki saajhi cheezein

export const STATUS_COLOR: Record<string, string> = {
  open: "#2e8b4a", closing: "#d9480f", upcoming: "#1c6dd0", closed: "#8a8f99",
  admit_card_out: "#7048e8", answer_key_out: "#7048e8", result_out: "#7048e8", info: "#8a8f99",
};

// "2026-11-04" -> "4 Nov 2026"; baaki text (TBA, "2026-12 (tentative)") jaisa hai
export function fmtDate(d?: string | null): string {
  if (!d) return "";
  const t = String(d).trim();
  const range = /^(\d{4}-\d{2}-\d{2})\s*(?:to|-|–)\s*(\d{4}-\d{2}-\d{2})$/.exec(t);
  if (range) return `${fmtDate(range[1])} to ${fmtDate(range[2])}`;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return t;
  return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
