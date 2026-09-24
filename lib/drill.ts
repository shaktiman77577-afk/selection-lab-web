/**
 * lib/drill.ts — 10-finger daily practice ka dimaag.
 *
 * Har session ka text YAHIN banta hai, har baar naya (random) — koi fixed
 * passage nahi, isliye student ratta nahi maar sakta, ungliyan hi seekhti hain.
 * Sirf unhi keys ke words aate hain jo us stage tak sikhayi gayi hain —
 * home row par "sad dad flask fall" jaise.
 *
 * Backend sirf nateeja save karta hai (stage, speed, accuracy, minute).
 */

export type Stage = {
  id: number;
  title: string;
  note: string;         // student ko kya karna hai
  keys: string;         // is stage me NAYI keys (drill inhi par zyada)
  kind: "letters" | "caps" | "numbers" | "symbols" | "words" | "court";
};

// Har stage pichhle saare stages ki keys bhi use karta hai.
export const STAGES: Stage[] = [
  { id: 1, title: "Home row", keys: "asdfjkl;", kind: "letters",
    note: "Rest your fingers on A S D F and J K L ;. Feel the bumps on F and J." },
  { id: 2, title: "G and H", keys: "gh", kind: "letters",
    note: "Your index fingers reach sideways: left index to G, right index to H." },
  { id: 3, title: "E, I, R, U", keys: "eiru", kind: "letters",
    note: "Reach up from the home row and come straight back." },
  { id: 4, title: "Full top row", keys: "tywoqp", kind: "letters",
    note: "T and Y with the index fingers, W and O with the ring fingers, Q and P with the little fingers." },
  { id: 5, title: "Bottom row: C V B N M", keys: "cvbnm", kind: "letters",
    note: "Reach down from the home row. B is the left index finger." },
  { id: 6, title: "X, Z, comma, full stop", keys: "xz,.", kind: "letters",
    note: "The last keys of the bottom row, and the comma and full stop." },
  { id: 7, title: "Capital letters (Shift)", keys: "", kind: "caps",
    note: "Hold Shift with the little finger of the OTHER hand, then press the letter." },
  { id: 8, title: "Numbers", keys: "1234567890", kind: "numbers",
    note: "Reach up two rows. Each number uses the same finger as the letter below it." },
  { id: 9, title: "Court symbols", keys: "'()-/:", kind: "symbols",
    note: "Apostrophe, brackets, hyphen, slash and colon — they come in every court passage." },
  { id: 10, title: "Common words", keys: "", kind: "words",
    note: "The whole keyboard. Keep your eyes on the screen, not on your hands." },
  { id: 11, title: "Court words", keys: "", kind: "court",
    note: "The words that come again and again in the exam passages." },
];

/** Kis stage tak kaunse chhote akshar (letters) khul chuke hain. */
export function lettersUpTo(stage: number): Set<string> {
  const s = new Set<string>();
  for (const st of STAGES) {
    if (st.id > stage) break;
    if (st.kind === "letters") for (const ch of st.keys) s.add(ch);
  }
  if (stage >= 7) "abcdefghijklmnopqrstuvwxyz,.;".split("").forEach((c) => s.add(c));
  return s;
}

// ── Kaunsi key kis ungli se ────────────────────────────────────────────────
export type Finger = "LP" | "LR" | "LM" | "LI" | "RI" | "RM" | "RR" | "RP" | "TH";
export const FINGER_NAME: Record<Finger, string> = {
  LP: "left little finger", LR: "left ring finger", LM: "left middle finger", LI: "left index finger",
  RI: "right index finger", RM: "right middle finger", RR: "right ring finger", RP: "right little finger",
  TH: "thumb",
};
export const FINGER_COLOR: Record<Finger, string> = {
  LP: "#e9b3c9", LR: "#f3cf9b", LM: "#bfe3a8", LI: "#a9d4f5",
  RI: "#b8b3ef", RM: "#bfe3a8", RR: "#f3cf9b", RP: "#e9b3c9", TH: "#dddddd",
};

// Keyboard ki rows (US/Indian layout) — base key aur Shift wala roop
export const ROWS: [string, string][][] = [
  [["`", "~"], ["1", "!"], ["2", "@"], ["3", "#"], ["4", "$"], ["5", "%"], ["6", "^"], ["7", "&"], ["8", "*"], ["9", "("], ["0", ")"], ["-", "_"], ["=", "+"]],
  [["q", "Q"], ["w", "W"], ["e", "E"], ["r", "R"], ["t", "T"], ["y", "Y"], ["u", "U"], ["i", "I"], ["o", "O"], ["p", "P"], ["[", "{"], ["]", "}"]],
  [["a", "A"], ["s", "S"], ["d", "D"], ["f", "F"], ["g", "G"], ["h", "H"], ["j", "J"], ["k", "K"], ["l", "L"], [";", ":"], ["'", "\""]],
  [["z", "Z"], ["x", "X"], ["c", "C"], ["v", "V"], ["b", "B"], ["n", "N"], ["m", "M"], [",", "<"], [".", ">"], ["/", "?"]],
];

const FINGER_OF: Record<string, Finger> = {};
(() => {
  const set = (keys: string, f: Finger) => keys.split("").forEach((k) => (FINGER_OF[k] = f));
  set("`1qaz", "LP"); set("2wsx", "LR"); set("3edc", "LM"); set("45rtfgvb", "LI");
  set("67yuhjnm", "RI"); set("8ik,", "RM"); set("9ol.", "RR"); set("0-=p[];'/", "RP");
  FINGER_OF[" "] = "TH";
})();

/** Ek akshar ke liye: kaunsi base key, Shift chahiye ya nahi, kaunsi ungli. */
export function keyInfo(ch: string): { base: string; shift: boolean; finger: Finger; shiftSide: "L" | "R" | null } {
  if (ch === " ") return { base: " ", shift: false, finger: "TH", shiftSide: null };
  for (const row of ROWS) {
    for (const [b, sh] of row) {
      if (ch === b) return { base: b, shift: false, finger: FINGER_OF[b] || "RP", shiftSide: null };
      if (ch === sh) {
        const f = FINGER_OF[b] || "RP";
        // Shift hamesha DOOSRE haath ki chhoti ungli se
        return { base: b, shift: true, finger: f, shiftSide: f.startsWith("L") ? "R" : "L" };
      }
    }
  }
  return { base: ch.toLowerCase(), shift: false, finger: "RP", shiftSide: null };
}

// ── Words ──────────────────────────────────────────────────────────────────
// Aam English words (chhote se bade). Stage ke hisaab se inme se wahi chune
// jaate hain jinke saare akshar khul chuke hon.
const COMMON = `a as ad add ads all alas ask asks dad dads fad fads fall falls flask flasks lad lads lass sad salad salads
has had hall halls half glad flag flags gas dash lash sash shall hash sag lag lags jag hag gall shag
are area ear ears era he her here hers his hid hide hire is it its if fire fires field fields filed
file files fair fail fails fear feel feels free fresh friday dear deal deals desk desks dress aside
said sale sales sure user users rule rules ruled read reads real rise risk side sides skill skills
still sir sea seal seek seed seem shed shift sheer shelf hurdle judge judged judges jail jails kid
the they there these this that than then them their to too took top type typed typist was were
what when where while who why with word words work works worker world write writer writes wrote
you your yours year years yet quit quite quiet quote quoted query power pay paid paper papers party
of off office officer offer often old order orders other out our over own post pole poor proper
people person place plea plead please point police price print printed prior proof put
can come comes copy copies court courts cover case cases cause civil claim clear clerk close come
bail bank base bench best book books both brief bring but by back bad bar bears been before below
man many may me mean meet member men mind money month more most much must my name need never new
next no none not note notes now number numbers on once one only open opened or
very view voice vote exam example exact extra next text taxi zero zone size maze prize lazy quiz
about above after again against also always among an and any appeal apply approve arrive at away
day days do does done down during each early end enough even every face fact far fast few final
first for form found from full get give given go going good great group hand hard have hear held
help high hold home hour house how however i in into issue job just keep kind know last late
law lawful lead least leave left less let life like line list little long look lost low made
main make matter might minute more morning move near new night nine now of often on order
part pass past period plan point present public reason record report request right room same
say second see seen sent set seven several short should show since six small so some soon
speed start state step still stop such summon take ten term than thank thing think three
through time today total true turn two under until up upon us use used value wait want
way week well went whole wide will within without woman yes`.split(/\s+/).filter(Boolean);

const COURT = `court judge bench bail appeal petition petitioner respondent appellant accused
complainant witness evidence affidavit advocate counsel registry registrar clerk hearing adjourned
adjournment order judgment decree suit plaint written statement summons notice warrant
magistrate sessions district tribunal commission section act rule clause annexure exhibit
certified copy record file filed dismissed allowed granted rejected disposed pending stay
injunction declaration execution revision review writ contempt compromise settlement
prosecution investigation charge sheet cognizance custody remand surety bond acquitted convicted
sentence fine compensation maintenance tenant landlord property possession agreement contract
deed registration stamp duty signature verification jurisdiction limitation condonation delay
application interim ex parte hon'ble learned counsel state versus plaintiff defendant
proceedings honourable directed observed submitted contended perused considered`.split(/\s+/).filter(Boolean);

const CAP_WORDS = `Monday Tuesday Wednesday Thursday Friday Saturday January February March April May June July
August September October November December Haryana Punjab Chandigarh Delhi India Court Judge State
Section Rule Act Order District Sessions Registrar Hisar Rohtak Karnal Ambala Panipat Sonipat Gurugram
Kumar Singh Devi Sharma Verma Yadav Rani Lal Ram Sita Mohan Suresh Anita Rakesh Sunita`.split(/\s+/).filter(Boolean);

// ── Random (har session alag) ─────────────────────────────────────────────
function rng(seed?: number) {
  let x = (seed ?? Math.floor(Math.random() * 2 ** 31)) || 1;
  return () => { x ^= x << 13; x ^= x >>> 17; x ^= x << 5; return ((x >>> 0) % 1_000_000) / 1_000_000; };
}
const pick = <T,>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];
/** Pichhle jaisa word lagatar do baar na aaye ("add add add" ubaau hai). */
function pickNew(r: () => number, xs: string[], prev?: string): string {
  let w = pick(r, xs);
  for (let i = 0; i < 4 && xs.length > 1 && w === prev; i++) w = pick(r, xs);
  return w;
}

function wordsFor(stage: number): { all: string[]; fresh: string[] } {
  const ok = lettersUpTo(stage);
  const st = STAGES.find((s) => s.id === stage)!;
  const all = COMMON.filter((w) => w.split("").every((c) => ok.has(c)));
  const fresh = st.kind === "letters" ? all.filter((w) => st.keys.split("").some((k) => w.includes(k))) : all;
  return { all, fresh: fresh.length >= 4 ? fresh : all };
}

/** Warm-up: nayi keys ke chhote jhund — "fj jf fff jjj fjf". */
function keyGroups(r: () => number, keys: string, n: number): string[] {
  const k = keys.replace(/\s/g, "").split("");
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const len = 2 + Math.floor(r() * 3);
    let g = "";
    for (let j = 0; j < len; j++) g += pick(r, k);
    out.push(g);
  }
  return out;
}

export type Part = "warmup" | "words" | "review";
export const PART_LABEL: Record<Part, string> = {
  warmup: "Warm-up: new keys", words: "Words", review: "Review: everything so far",
};

/**
 * Ek line (8-10 tukde) banao. Har call par naya — isi se "har baar naya pattern".
 */
export function makeLine(stage: number, part: Part, r: () => number = rng()): string {
  const st = STAGES.find((s) => s.id === stage) || STAGES[0];
  const { all, fresh } = wordsFor(Math.min(stage, 6));
  const n = 8 + Math.floor(r() * 3);
  const out: string[] = [];

  if (st.kind === "letters") {
    const home = "asdfjkl;";
    if (part === "warmup") return keyGroups(r, st.keys + (stage > 1 ? home.slice(0, 4) : ""), n).join(" ");
    const pool = part === "words" ? fresh : all;
    for (let i = 0; i < n; i++) out.push(pickNew(r, pool, out[out.length - 1]));
    if (st.id === 6) {
      // Is stage ki nayi keys comma aur full stop bhi hain — beech me comma,
      // aakhir me full stop, jaise sentence me aate hain
      for (let i = 1; i < out.length - 1; i++) if (r() < 0.25) out[i] += ",";
      out[out.length - 1] += ".";
    }
    return out.join(" ");
  }
  if (st.kind === "caps") {
    for (let i = 0; i < n; i++) {
      const w = r() < 0.5 ? pick(r, CAP_WORDS) : pick(r, COMMON);
      out.push(part === "warmup" || r() < 0.6 ? w[0].toUpperCase() + w.slice(1) : w);
    }
    return out.join(" ");
  }
  if (st.kind === "numbers") {
    for (let i = 0; i < n; i++) {
      if (part === "warmup") out.push(keyGroups(r, st.keys, 1)[0]);
      else if (r() < 0.5) out.push(String(Math.floor(r() * (r() < 0.5 ? 100 : 10000))));
      else out.push(pick(r, COMMON));
    }
    return out.join(" ");
  }
  if (st.kind === "symbols") {
    const sym = [
      () => `(${pick(r, ["a", "b", "c", "d", "i", "ii", "iii"])})`,
      () => `${pick(r, ["court", "state", "judge", "clerk", "party", "witness"])}'s`,
      () => `${Math.floor(r() * 900) + 10}/${2018 + Math.floor(r() * 8)}`,
      () => `${pick(r, ["CWP", "CRM", "RSA", "FAO", "CR"])}-${Math.floor(r() * 9000) + 100}`,
      () => `${pick(r, ["Rule", "Order", "Section", "Clause"])} ${Math.floor(r() * 90) + 1}:`,
      () => `ex-${pick(r, ["parte", "officio"])}`,
    ];
    for (let i = 0; i < n; i++) out.push(part === "warmup" || r() < 0.55 ? pick(r, sym)() : pick(r, COMMON));
    return out.join(" ");
  }
  if (st.kind === "court") {
    for (let i = 0; i < n; i++) out.push(pickNew(r, part === "review" && r() < 0.3 ? COMMON : COURT, out[out.length - 1]));
    return out.join(" ");
  }
  // "words": poora keyboard, thode capital aur full stop ke saath — sentence jaisa
  for (let i = 0; i < n; i++) {
    let w = pick(r, part === "review" && r() < 0.3 ? COURT : COMMON);
    if (i === 0) w = w[0].toUpperCase() + w.slice(1);
    out.push(w);
  }
  return out.join(" ") + ".";
}

/** Session ke hisse: 12 minute = 3 warm-up + 6 words + 3 review. */
export function partAt(elapsedSec: number, totalSec: number): Part {
  const f = elapsedSec / Math.max(1, totalSec);
  return f < 0.25 ? "warmup" : f < 0.75 ? "words" : "review";
}

export { rng };
