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

// Bade screen par poori chaudai — list me cards ki grid, page me 2 column.
// Server pages me <style dangerouslySetInnerHTML={{ __html: WIDE_CSS }} />
export const WIDE_CSS = `
.sl-wide{max-width:1200px;margin:0 auto;padding:20px 16px 60px;box-sizing:border-box}
.sl-cards{display:grid;grid-template-columns:minmax(0,1fr);gap:12px;margin-bottom:12px}
.sl-cards>*{margin-bottom:0!important;box-sizing:border-box;height:100%}
@media(min-width:760px){.sl-cards{grid-template-columns:repeat(2,minmax(0,1fr))}.sl-h1{font-size:28px!important}}
@media(min-width:1100px){.sl-cards{grid-template-columns:repeat(3,minmax(0,1fr))}}
.eu-grid{display:grid;grid-template-columns:minmax(0,1fr);grid-template-areas:"side" "main";gap:16px;margin-top:16px}
.eu-main{grid-area:main;min-width:0}
.eu-side{grid-area:side;min-width:0}
.eu-pair{display:grid;grid-template-columns:minmax(0,1fr);gap:0 14px}
@media(min-width:960px){
  .eu-grid{grid-template-columns:minmax(0,1fr) 370px;grid-template-areas:"main side"}
  .eu-side{position:sticky;top:64px;align-self:start}
}
@media(min-width:1150px){.eu-pair{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;
