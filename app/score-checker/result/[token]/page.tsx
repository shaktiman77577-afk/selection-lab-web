"use client";

// Result page.
//
// Ye client component hai aur token useParams() se leta hai — jaan-boojh kar.
// Next 15/16 me server component ka `params` ab Promise hai, aur usi ek cheez
// par bahut saare upgrades tootte hain. useParams() client par shuru se same
// tarah kaam karta hai, to yahan wo jhanjhat aata hi nahi.

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import AdBanner from "@/app/components/AdBanner";

const GOLD = "#FFAB00";
const GREEN = "#5dd97c";
const RED = "#ff6b6b";

export default function ResultPage() {
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const token = params?.token as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // marking scheme — user badal sakta hai, par sirf DIKHNE ke liye.
  // Rank hamesha exam ki official scheme par bana rehta hai.
  const [editScheme, setEditScheme] = useState(false);
  const [mc, setMc] = useState("");
  const [mw, setMw] = useState("");

  const [showReview, setShowReview] = useState(false);

  const load = useCallback(
    async (overrideMc?: string, overrideMw?: string) => {
      if (!token) return;
      setLoading(true);
      setError("");
      try {
        const qs = new URLSearchParams();
        if (overrideMc) qs.set("mc", overrideMc);
        if (overrideMw) qs.set("mw", overrideMw);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";

        const res = await fetch(`${API_URL}/score-checker/result/${token}${suffix}`);
        const d = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(d.detail || `Could not load result (${res.status})`);
        setData(d);
        if (!overrideMc && !overrideMw) {
          setMc(String(d.exam?.marks_correct ?? 1));
          setMw(String(d.exam?.marks_wrong ?? 0.25));
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !data) return <Shell><Muted>Loading your result...</Muted></Shell>;
  if (error) return <Shell><ErrorBox msg={error} /></Shell>;
  if (!data) return null;

  const c = data.candidate || {};
  const r = data.result || {};
  const sections: any[] = r.sections || [];
  const responses: any[] = data.responses || [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header style={headerStyle}>
        <button onClick={() => router.push("/score-checker")} style={backBtn} aria-label="Back">
          ←
        </button>
        <div style={{ fontWeight: 800, fontSize: 17 }}>
          Your <span style={{ color: GOLD }}>Result</span>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        {/* Marking scheme confirm na ho to saaf-saaf bata do.
            RankMitra par yahi galti dikhi thi — default +2/-0.5 laga rehta hai
            aur candidate ko apne marks double dikhte hain. */}
        {data.exam && !data.exam.is_configured && (
          <Notice>
            The marking scheme for this exam has not been verified yet. Scores are
            shown at {data.exam.marks_correct} for a correct answer and
            −{data.exam.marks_wrong} for a wrong one. Change it below if your exam
            differs.
          </Notice>
        )}

        {/* Score */}
        <div style={{ ...cardStyle, textAlign: "center", padding: "22px 16px" }}>
          <div style={{ fontSize: 13, color: "var(--muted)", fontWeight: 600 }}>Total score</div>
          <div style={{ fontSize: 46, fontWeight: 900, color: GOLD, lineHeight: 1.1, margin: "4px 0 10px" }}>
            {r.score}
          </div>
          <div style={{ display: "flex", justifyContent: "center", gap: 18, flexWrap: "wrap" }}>
            <Stat label="Correct" value={r.total_correct} color={GREEN} />
            <Stat label="Wrong" value={r.total_wrong} color={RED} />
            <Stat label="Unattempted" value={r.total_blank} color="var(--muted)" />
          </div>
        </div>

        {/* Candidate */}
        <div style={{ ...cardStyle, marginTop: 14 }}>
          <Row label="Name" value={c.name} />
          <Row label="Roll number" value={c.roll_no} />
          <Row label="Category" value={c.category} />
          <Row label="Exam date" value={c.exam_date} />
          <Row label="Shift" value={c.shift_no ? `Shift ${c.shift_no}` : null} />
          <Row label="Venue" value={c.venue} last />
        </div>

        {/* Rank */}
        <SectionHeading>Your rank</SectionHeading>
        <RankBlock rank={data.rank} updatedAt={data.ranks_updated_at} />

        {/* Sections */}
        <SectionHeading>Section-wise marks</SectionHeading>
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "var(--chip)" }}>
                <Th align="left">Section</Th>
                <Th>Att</Th>
                <Th>Blank</Th>
                <Th>Right</Th>
                <Th>Wrong</Th>
                <Th>Marks</Th>
              </tr>
            </thead>
            <tbody>
              {sections.map((s) => (
                <tr key={s.name} style={{ borderTop: "1px solid var(--line)" }}>
                  <Td align="left">{s.name}</Td>
                  <Td>{s.attempted}</Td>
                  <Td>{s.blank}</Td>
                  <Td color={GREEN}>{s.correct}</Td>
                  <Td color={RED}>{s.wrong}</Td>
                  <Td bold>{s.score}</Td>
                </tr>
              ))}
              <tr style={{ borderTop: "1px solid var(--border)", background: "var(--chip)" }}>
                <Td align="left" bold>Overall</Td>
                <Td bold>{r.total_correct + r.total_wrong}</Td>
                <Td bold>{r.total_blank}</Td>
                <Td bold color={GREEN}>{r.total_correct}</Td>
                <Td bold color={RED}>{r.total_wrong}</Td>
                <Td bold>{r.score}</Td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Marking scheme */}
        <div style={{ ...cardStyle, marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontSize: 13 }}>
              <span style={{ color: "var(--muted)" }}>Marking: </span>
              <span style={{ color: GREEN, fontWeight: 700 }}>+{r.marks_correct}</span>
              <span style={{ color: "var(--muted)" }}> / </span>
              <span style={{ color: RED, fontWeight: 700 }}>−{r.marks_wrong}</span>
            </div>
            <button onClick={() => setEditScheme((v) => !v)} style={smallBtn}>
              {editScheme ? "Cancel" : "Change"}
            </button>
          </div>

          {editScheme && (
            <div style={{ display: "flex", gap: 10, marginTop: 12, alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <div style={miniLabel}>Correct</div>
                <input style={inputStyle} value={mc} onChange={(e) => setMc(e.target.value)} inputMode="decimal" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={miniLabel}>Wrong</div>
                <input style={inputStyle} value={mw} onChange={(e) => setMw(e.target.value)} inputMode="decimal" />
              </div>
              <button
                onClick={() => {
                  setEditScheme(false);
                  load(mc, mw);
                }}
                style={{ ...smallBtn, background: GOLD, color: "#1a1408", borderColor: GOLD, fontWeight: 800 }}
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <StatsBlock stats={data.stats} myScore={r.score} shiftNo={c.shift_no} category={c.category} />

        <AdBanner placement="score_checker_result" />

        {/* Question-wise review */}
        {responses.length > 0 && (
          <>
            <SectionHeading>Question-wise review</SectionHeading>
            <button onClick={() => setShowReview((v) => !v)} style={{ ...smallBtn, width: "100%", padding: "11px 12px" }}>
              {showReview ? "Hide all questions" : `Show all ${responses.length} questions`}
            </button>

            {showReview && (
              <div style={{ marginTop: 12 }}>
                {responses.map((q) => (
                  <QuestionCard key={q.id} q={q} />
                ))}
              </div>
            )}
          </>
        )}

        <div style={{ height: 28 }} />
      </main>
    </div>
  );
}

// ── Rank ────────────────────────────────────────────────────────────────────
function RankBlock({ rank, updatedAt }: { rank: any; updatedAt?: string | null }) {
  // Rank background me banta hai, submit ke turant baad nahi. Pehli baar aane
  // wale ko khaali dabbe dikhane se behtar hai saaf bata dena ki kab aayega.
  if (!rank) {
    return (
      <div style={{ ...cardStyle, textAlign: "center", color: "var(--muted)", fontSize: 13.5, lineHeight: 1.6 }}>
        Ranks are worked out every few minutes. Refresh this page shortly and
        yours will be here.
      </div>
    );
  }

  const items = [
    { label: "Overall", rank: rank.overall_rank, total: rank.overall_total, pc: rank.overall_percentile },
    { label: "In your shift", rank: rank.shift_rank, total: rank.shift_total, pc: rank.shift_percentile },
    { label: "In your category", rank: rank.category_rank, total: rank.category_total, pc: rank.category_percentile },
  ].filter((i) => i.rank != null);

  return (
    <>
      <div style={{ display: "grid", gap: 10 }}>
        {items.map((i) => (
          <div key={i.label} style={{ ...cardStyle, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{i.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
                {i.rank}
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--muted)" }}> / {i.total}</span>
              </div>
            </div>
            {i.pc != null && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: GOLD }}>{i.pc}</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>percentile</div>
              </div>
            )}
          </div>
        ))}
      </div>
      {updatedAt && (
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
          Ranks last updated {new Date(updatedAt).toLocaleString()}
        </div>
      )}
    </>
  );
}

// ── Stats ───────────────────────────────────────────────────────────────────
function StatsBlock({
  stats,
  myScore,
  shiftNo,
  category,
}: {
  stats: any;
  myScore: number;
  shiftNo?: number | null;
  category?: string | null;
}) {
  if (!stats || !stats.total) return null;

  const myShift = (stats.shifts || []).find((x: any) => x.shift_no === shiftNo);
  const myCat = (stats.categories || []).find((x: any) => x.category === category);

  // Distribution ~20 bucket ka hota hai — phone par poora dikhana bhaari lagta
  // hai. Isliye user ke score ke aas-paas ki 7 line hi dikhate hain.
  const dist: any[] = stats.distribution || [];
  let window: any[] = dist;
  if (dist.length > 7) {
    let idx = dist.findIndex((d: any) => Number(d.mark) <= Number(myScore));
    if (idx < 0) idx = dist.length - 1;
    const start = Math.max(0, Math.min(idx - 3, dist.length - 7));
    window = dist.slice(start, start + 7);
  }
  const maxAbove = Math.max(...window.map((d: any) => Number(d.above) || 0), 1);

  return (
    <>
      <SectionHeading>How everyone else did</SectionHeading>

      <div style={{ ...cardStyle, marginBottom: 12 }}>
        <Row label="Sheets submitted so far" value={stats.total} />
        <Row label="Average score" value={stats.avg_score} />
        {myShift && <Row label={`Shift ${shiftNo} average`} value={myShift.avg_score} />}
        {myCat && <Row label={`${category} average`} value={myCat.avg_score} />}
        <Row label="Highest score" value={stats.top_score} last />
      </div>

      {window.length > 0 && (
        <div style={cardStyle}>
          <div style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600, marginBottom: 10 }}>
            Candidates at or above each score
          </div>
          {window.map((d: any) => {
            const mine = Number(d.mark) <= Number(myScore) &&
              window.findIndex((x: any) => Number(x.mark) <= Number(myScore)) ===
                window.indexOf(d);
            return (
              <div key={d.mark} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                <div style={{ width: 42, fontSize: 12.5, fontWeight: mine ? 800 : 600, color: mine ? GOLD : "var(--text)" }}>
                  {d.mark}
                </div>
                <div style={{ flex: 1, height: 8, borderRadius: 4, background: "var(--chip)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.round((Number(d.above) / maxAbove) * 100)}%`,
                      height: "100%",
                      background: mine ? GOLD : "var(--border)",
                    }}
                  />
                </div>
                <div style={{ width: 52, textAlign: "right", fontSize: 12, color: "var(--muted)" }}>
                  {d.above}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Ye disclaimer zaroori hai. Sample self-selected hai — submit wahi karte
          hain jinka score theek hota hai, isliye average upar khinch jaata hai. */}
      <p style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6, marginTop: 10 }}>
        These numbers come from the {stats.total} sheets submitted here, not from
        every candidate who sat the exam. People who scored well are more likely
        to check, so the real averages are usually lower than what you see.
      </p>
    </>
  );
}

// ── Question card ───────────────────────────────────────────────────────────
// `key?: any` jaan-boojh kar likha hai — repo ke ProfileItem me bhi yahi hai.
// Is setup me custom component par key pass karne par TS excess-prop error
// deta hai, isliye props me declare kar dena hi saaf rasta hai.
function QuestionCard({ q }: { q: any; key?: any }) {
  const status = !q.is_attempted ? "blank" : q.is_correct ? "right" : "wrong";
  const tone = status === "right" ? GREEN : status === "wrong" ? RED : "var(--muted)";
  const label = status === "right" ? "Correct" : status === "wrong" ? "Wrong" : "Not attempted";

  // options: {"1": {id, text}, ...}
  const entries: [string, any][] = Object.entries(q.options || {}).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  );

  return (
    <div style={{ ...cardStyle, marginBottom: 10, borderLeft: `3px solid ${tone}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 6 }}>
        <div style={{ fontWeight: 800, fontSize: 13 }}>Q{q.q_no}</div>
        <div style={{ fontSize: 11.5, color: tone, fontWeight: 700 }}>{label}</div>
      </div>

      {q.question_text && (
        <div style={{ fontSize: 13.5, lineHeight: 1.6, marginBottom: 10 }}>{q.question_text}</div>
      )}

      {entries.map(([no, opt]) => {
        const isCorrect = opt?.id && opt.id === q.correct_option_id;
        const isChosen = opt?.id && opt.id === q.chosen_option_id;
        return (
          <div
            key={no}
            style={{
              display: "flex",
              gap: 8,
              padding: "7px 9px",
              borderRadius: 8,
              marginBottom: 5,
              fontSize: 13,
              lineHeight: 1.5,
              background: isCorrect
                ? "rgba(93,217,124,0.10)"
                : isChosen
                ? "rgba(255,107,107,0.10)"
                : "transparent",
              border: `1px solid ${
                isCorrect ? "rgba(93,217,124,0.35)" : isChosen ? "rgba(255,107,107,0.30)" : "transparent"
              }`,
            }}
          >
            <span style={{ color: "var(--muted)", flexShrink: 0 }}>{no}.</span>
            <span style={{ flex: 1 }}>{opt?.text || ""}</span>
            {isCorrect && <span style={{ color: GREEN, fontSize: 11.5, fontWeight: 700 }}>Answer</span>}
            {isChosen && !isCorrect && (
              <span style={{ color: RED, fontSize: 11.5, fontWeight: 700 }}>You</span>
            )}
          </div>
        );
      })}

      {/* Key mil gayi par question text nahi aaya — phir bhi kuch to dikhe */}
      {entries.length === 0 && (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Correct option and your option were recorded, but the question text is not
          stored for this sheet.
        </div>
      )}
    </div>
  );
}

// ── chhote UI helpers ───────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <main style={{ maxWidth: 640, margin: "0 auto", padding: 24 }}>{children}</main>
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <p style={{ color: "var(--muted)", fontSize: 14 }}>{children}</p>;
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div
      style={{
        padding: 14,
        borderRadius: 12,
        background: "rgba(255,107,107,0.08)",
        border: "1px solid rgba(255,107,107,0.35)",
        color: "#ff8a8a",
        fontSize: 13.5,
        lineHeight: 1.6,
      }}
    >
      {msg}
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 12,
        borderRadius: 12,
        marginBottom: 14,
        background: "rgba(255,171,0,0.08)",
        border: "1px solid rgba(255,171,0,0.35)",
        fontSize: 12.5,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontSize: 15, fontWeight: 800, margin: "20px 0 10px" }}>{children}</h2>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 19, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{label}</div>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value?: any; last?: boolean }) {
  if (!value) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 12,
        padding: "9px 0",
        borderBottom: last ? "none" : "1px solid var(--line)",
        fontSize: 13.5,
      }}
    >
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, textAlign: "right" }}>{value}</span>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "left" }) {
  return (
    <th
      style={{
        padding: "9px 8px",
        textAlign: align || "center",
        fontSize: 11.5,
        fontWeight: 700,
        color: "var(--muted)",
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  bold,
  color,
}: {
  children: React.ReactNode;
  align?: "left";
  bold?: boolean;
  color?: string;
}) {
  return (
    <td
      style={{
        padding: "9px 8px",
        textAlign: align || "center",
        fontWeight: bold ? 800 : 500,
        color: color || "inherit",
      }}
    >
      {children}
    </td>
  );
}

const headerStyle: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 10,
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 16px",
  background: "var(--header)",
  borderBottom: "1px solid var(--border)",
};

const backBtn: React.CSSProperties = {
  background: "var(--chip)",
  color: "var(--text)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  width: 34,
  height: 34,
  fontSize: 16,
  cursor: "pointer",
};

const cardStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 16,
  padding: 16,
};

const smallBtn: React.CSSProperties = {
  background: "var(--chip)",
  color: "var(--text)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 12.5,
  fontWeight: 700,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 10px",
  borderRadius: 10,
  background: "var(--chip)",
  color: "var(--text)",
  border: "1px solid var(--line)",
  fontSize: 14,
  outline: "none",
};

const miniLabel: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--muted)",
  marginBottom: 5,
  fontWeight: 600,
};
