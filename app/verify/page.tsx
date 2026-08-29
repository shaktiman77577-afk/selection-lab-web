"use client";

// Teacher verification page — /verify
//
// Teacher ko sirf ek key milti hai (WhatsApp par). Na login, na signup.
// Key daalte hi poora content khul jata hai:
//   1. Overview   — paper pattern, kya-kya hai
//   2. Interface  — asli exam UI, attempt bhi kar sakte hain (kuch save nahi hota)
//   3. Questions  — sab ek scroll me: answer + explanation + Hindi, saath me ✓/✗
//   4. Approve    — naam chuniye, Approve ya Changes needed
//
// Key ek hi baar chalti hai — submit karte hi band.

import { useEffect, useMemo, useState } from "react";
import { API_URL } from "@/lib/config";

const GOLD = "#FFAB00";
const GREEN = "#2e8b4a";
const RED = "#d64545";
const LETTERS = ["A", "B", "C", "D"] as const;

// ── Rich text: **bold**, __underline__, *italic* ─────────────────────────────
// Question me "underlined word" ya "bold word" likha ho to wo dikhna chahiye.
// CSV me markers laga dijiye:
//   **pejorative**   → bold
//   __pejorative__   → underlined
//   *pejorative*     → italic
// Baaki text jaisa hai waisa hi rehta hai. Newlines pre-wrap se sambhalte hain.
function RichText({ text, style }: { text?: string | null; style?: React.CSSProperties }) {
  if (!text) return null;

  // Sabse lambe marker pehle — warna ** ko * do baar padh lega
  const parts: React.ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) {
      parts.push(<b key={k++}>{tok.slice(2, -2)}</b>);
    } else if (tok.startsWith("__")) {
      parts.push(<u key={k++}>{tok.slice(2, -2)}</u>);
    } else {
      parts.push(<i key={k++}>{tok.slice(1, -1)}</i>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) parts.push(text.slice(last));

  return <span style={{ whiteSpace: "pre-wrap", ...style }}>{parts}</span>;
}

type Step = "key" | "overview" | "interface" | "questions" | "approve" | "done";

export default function VerifyPage() {
  const [step, setStep] = useState<Step>("key");
  const [key, setKey] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Teacher ke faisle
  const [verdict, setVerdict] = useState<Record<number, "ok" | "bad">>({});
  const [qNotes, setQNotes] = useState<Record<number, string>>({});
  const [teacher, setTeacher] = useState("");
  const [notes, setNotes] = useState("");
  const [doneMsg, setDoneMsg] = useState("");

  // Key URL me bhi aa sakti hai: /verify?key=ABCD-1234-WXYZ
  useEffect(() => {
    try {
      const k = new URLSearchParams(window.location.search).get("key");
      if (k) {
        setKey(k.toUpperCase());
        openKey(k);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openKey(k?: string) {
    const use = (k ?? key).trim().toUpperCase();
    if (!use) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/verify/content?key=${encodeURIComponent(use)}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Key nahi chali");
      setData(d);
      setKey(use);
      setStep("overview");
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  async function submitReview(status: "approved" | "changes_needed") {
    if (!teacher) {
      setError("Pehle apna naam chuniye");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const flagged = Object.entries(verdict)
        .filter(([, v]) => v === "bad")
        .map(([qid]) => ({ q_id: Number(qid), note: qNotes[Number(qid)] || null }));

      const res = await fetch(`${API_URL}/verify/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key, teacher_name: teacher, status,
          notes: notes.trim() || null,
          flagged_questions: flagged,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Submit nahi hua");
      setDoneMsg(d.message);
      setStep("done");
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  // ── 1. KEY SCREEN ──
  if (step === "key") {
    return (
      <Shell>
        <div style={{ maxWidth: 380, margin: "0 auto", paddingTop: "16vh", textAlign: "center" }}>
          <div style={{ fontSize: 44 }}>🔐</div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: "12px 0 6px" }}>
            Content <span style={{ color: GOLD }}>Verification</span>
          </h1>
          <p style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 24px" }}>
            Aapko jo key bheji gayi hai wo daaliye. Login ki zaroorat nahi.
          </p>

          <input
            value={key}
            onChange={(e) => setKey(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && openKey()}
            placeholder="ABCD-1234-WXYZ"
            autoCapitalize="characters"
            style={{
              width: "100%", padding: "14px 16px", fontSize: 17, letterSpacing: 2,
              textAlign: "center", fontFamily: "monospace", fontWeight: 700,
              background: "var(--card)", color: "var(--text)",
              border: `1.5px solid ${error ? RED : "var(--line)"}`, borderRadius: 12, outline: "none",
            }}
          />

          <button
            onClick={() => openKey()}
            disabled={loading || !key.trim()}
            style={{ ...goldBtn, width: "100%", marginTop: 12, opacity: loading || !key.trim() ? 0.5 : 1 }}
          >
            {loading ? "Check kar rahe hain..." : "Kholiye →"}
          </button>

          {error && <p style={{ color: RED, fontSize: 13, marginTop: 14, lineHeight: 1.6 }}>{error}</p>}
        </div>
      </Shell>
    );
  }

  // ── DONE ──
  if (step === "done") {
    return (
      <Shell>
        <div style={{ maxWidth: 400, margin: "0 auto", paddingTop: "18vh", textAlign: "center" }}>
          <div style={{ fontSize: 52 }}>🙏</div>
          <h1 style={{ fontSize: 21, fontWeight: 800, margin: "14px 0 8px" }}>Shukriya!</h1>
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7 }}>{doneMsg}</p>
          <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 20, lineHeight: 1.6 }}>
            Ye key ab band ho chuki hai. Ab is page ko band kar sakte hain.
          </p>
        </div>
      </Shell>
    );
  }

  const isMock = data?.kind === "mock";

  return (
    <Shell>
      {/* Header — hamesha upar */}
      <div style={{
        position: "sticky", top: 0, zIndex: 20, background: "var(--bg)",
        borderBottom: "1px solid var(--line)", padding: "12px 16px",
      }}>
        <div style={{ fontSize: 11, color: GOLD, fontWeight: 800, letterSpacing: 1 }}>
          VERIFICATION · {String(data?.kind || "").toUpperCase()}
        </div>
        <div style={{ fontSize: 15.5, fontWeight: 800, marginTop: 2 }}>{data?.title}</div>

        <div style={{ display: "flex", gap: 6, marginTop: 10, overflowX: "auto" }}>
          {([
            ["overview", "1 · Overview"],
            ...(isMock ? [["interface", "2 · Interface"] as [Step, string]] : []),
            ["questions", isMock ? "3 · Questions" : "2 · Content"],
            ["approve", isMock ? "4 · Approval" : "3 · Approval"],
          ] as [Step, string][]).map(([s, label]) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              style={{
                whiteSpace: "nowrap", padding: "7px 13px", borderRadius: 20, fontSize: 12.5,
                fontWeight: 700, cursor: "pointer",
                border: `1px solid ${step === s ? GOLD : "var(--line)"}`,
                background: step === s ? "rgba(255,171,0,0.14)" : "transparent",
                color: step === s ? GOLD : "var(--muted)",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "16px 16px 90px" }}>
        {step === "overview" && <Overview data={data} onNext={() => setStep(isMock ? "interface" : "questions")} />}
        {step === "interface" && <InterfacePreview data={data} onNext={() => setStep("questions")} />}
        {step === "questions" && (
          <QuestionReview
            data={data}
            verdict={verdict} setVerdict={setVerdict}
            qNotes={qNotes} setQNotes={setQNotes}
            onNext={() => setStep("approve")}
          />
        )}
        {step === "approve" && (
          <ApprovalStep
            data={data} verdict={verdict} qNotes={qNotes}
            teacher={teacher} setTeacher={setTeacher}
            notes={notes} setNotes={setNotes}
            loading={loading} error={error}
            onSubmit={submitReview}
          />
        )}
      </div>
    </Shell>
  );
}

// ── STEP 1: OVERVIEW ────────────────────────────────────────────────────────
function Overview({ data, onNext }: { data: any; onNext: () => void }) {
  const m = data.meta || {};
  const isMock = data.kind === "mock";

  return (
    <>
      <Card title="Ye kya hai">
        <p style={{ fontSize: 13.5, color: "var(--text2)", lineHeight: 1.7, margin: 0 }}>
          {isMock
            ? "Ye mock test students ko live jaane wala hai. Aap pehle check kar lijiye — interface theek hai, questions sahi hain, answers aur explanations galat to nahi."
            : "Ye content students ko live jaane wala hai. Ek baar dekh lijiye ki sab theek hai."}
        </p>
      </Card>

      {isMock && (
        <>
          <Card title="Paper pattern">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))", gap: 9 }}>
              <Stat label="Questions" value={m.total_questions} />
              <Stat label="Time" value={`${m.duration_minutes} min`} />
              <Stat label="Total marks" value={m.total_marks} />
              <Stat label="Negative" value={m.negative_marking ? `-${m.negative_marking}` : "Nahi"} />
              <Stat label="Pass %" value={`${m.pass_percentage ?? 0}%`} />
              <Stat label="Price" value={m.is_free ? "FREE" : "Paid"} />
            </div>
          </Card>

          <Card title="Sections">
            {(data.sections || []).map((s: any) => (
              <Row key={s.name} left={s.name} right={`${s.count} Qs · ${s.marks} marks`} />
            ))}
          </Card>

          <Card title="Student ko kaise dikhega">
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: "var(--text2)", lineHeight: 1.9 }}>
              <li>Asli exam jaisa screen — timer, question palette, section tabs</li>
              <li>Har question English aur हिंदी dono me, toggle se badal sakte hain</li>
              <li>Mark for review, skip, aur wapas aakar badalne ki suvidha</li>
              <li>Submit ke baad turant result, phir question-wise solutions</li>
              <li>Galat answer par {m.negative_marking ? `${m.negative_marking} marks katenge` : "kuch nahi katega"}</li>
            </ul>
          </Card>
        </>
      )}

      {data.kind === "course" && (
        <Card title="Course me kya hai">
          <Stat label="Items" value={m.total_items} />
          {m.description && (
            <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, marginTop: 10 }}>{m.description}</p>
          )}
        </Card>
      )}

      {data.kind === "descriptive" && (
        <Card title="Series me kya hai">
          <Stat label="Tests" value={m.total_tests} />
          {m.description && (
            <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, marginTop: 10 }}>{m.description}</p>
          )}
        </Card>
      )}

      {(data.previous_reviews || []).length > 0 && (
        <Card title="Pehle kisne dekha">
          {data.previous_reviews.map((r: any, i: number) => (
            <Row
              key={i}
              left={`${r.teacher_name}`}
              right={r.status === "approved" ? "✅ Approved" : "⚠️ Changes needed"}
            />
          ))}
        </Card>
      )}

      <button onClick={onNext} style={{ ...goldBtn, width: "100%", marginTop: 6 }}>
        Aage badhiye →
      </button>
    </>
  );
}

// ── STEP 2: INTERFACE PREVIEW ───────────────────────────────────────────────
// Asli exam screen. Teacher answer bhi bhar sakte hain — kuch save nahi hota.
function InterfacePreview({ data, onNext }: { data: any; onNext: () => void }) {
  const qs = data.questions || [];
  const [idx, setIdx] = useState(0);
  const [ans, setAns] = useState<Record<number, string>>({});
  const [marked, setMarked] = useState<Record<number, boolean>>({});
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [seconds, setSeconds] = useState((data.meta?.duration_minutes || 60) * 60);
  const [palette, setPalette] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setSeconds((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, []);

  if (qs.length === 0) return <Card title="Koi question nahi"><Muted>Is test me abhi questions nahi hain.</Muted></Card>;

  const q = qs[idx];
  const hi = lang === "hi";
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <>
      <Note>
        Ye bilkul wahi screen hai jo student ko milegi. Aap answer bhi bhar sakte hain — kuch save nahi hoga.
      </Note>

      {/* Exam header */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: "12px 12px 0 0", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, fontSize: 12.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {data.title}
        </div>
        <div style={{ fontFamily: "monospace", fontWeight: 800, fontSize: 14, color: seconds < 300 ? RED : GOLD }}>
          ⏱ {mm}:{ss}
        </div>
        <button onClick={() => setLang(hi ? "en" : "hi")} style={{ ...chipBtn, fontWeight: 800 }}>
          {hi ? "ENG" : "हिं"}
        </button>
        <button onClick={() => setPalette(!palette)} style={chipBtn}>☰</button>
      </div>

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", background: "var(--card)", borderLeft: "1px solid var(--line)", borderRight: "1px solid var(--line)", padding: "8px 12px" }}>
        {Array.from(new Set(qs.map((x: any) => x.section))).map((s: any) => (
          <span key={s} style={{
            whiteSpace: "nowrap", fontSize: 11.5, fontWeight: 700, padding: "5px 11px", borderRadius: 16,
            background: q.section === s ? "rgba(255,171,0,0.16)" : "transparent",
            color: q.section === s ? GOLD : "var(--muted)",
            border: `1px solid ${q.section === s ? GOLD : "var(--line)"}`,
          }}>
            {s}
          </span>
        ))}
      </div>

      {/* Palette */}
      {palette && (
        <div style={{ background: "var(--card)", borderLeft: "1px solid var(--line)", borderRight: "1px solid var(--line)", padding: 12, display: "flex", flexWrap: "wrap", gap: 6 }}>
          {qs.map((x: any, i: number) => {
            const done = ans[x.id];
            const mk = marked[x.id];
            return (
              <button
                key={x.id}
                onClick={() => { setIdx(i); setPalette(false); }}
                style={{
                  width: 34, height: 34, borderRadius: 8, fontSize: 12, fontWeight: 800, cursor: "pointer",
                  border: `1px solid ${i === idx ? GOLD : "var(--line)"}`,
                  background: mk ? "#7c4dff" : done ? GREEN : "transparent",
                  color: mk || done ? "#fff" : "var(--muted)",
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      )}

      {/* Question body */}
      <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderTop: "none", borderRadius: "0 0 12px 12px", padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--muted)", marginBottom: 9 }}>
          <span>Question {idx + 1} of {qs.length}</span>
          <span>+{q.marks} {data.meta?.negative_marking ? `/ -${data.meta.negative_marking}` : ""}</span>
        </div>

        {q.image_url && (
          <img src={q.image_url} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 11, background: "#fff" }} />
        )}

        <RichText
          text={(hi && q.question_hi) || q.question}
          style={{ display: "block", fontSize: 14.5, lineHeight: 1.65, fontWeight: 600, marginBottom: 14 }}
        />

        {LETTERS.map((L) => {
          const val = hi ? (q[`option_${L.toLowerCase()}_hi`] || q[`option_${L.toLowerCase()}`]) : q[`option_${L.toLowerCase()}`];
          const picked = ans[q.id] === L;
          return (
            <button
              key={L}
              onClick={() => setAns({ ...ans, [q.id]: picked ? "" : L })}
              style={{
                display: "flex", gap: 11, alignItems: "flex-start", width: "100%", textAlign: "left",
                padding: "11px 12px", marginBottom: 8, borderRadius: 10, cursor: "pointer",
                border: `1.5px solid ${picked ? GOLD : "var(--line)"}`,
                background: picked ? "rgba(255,171,0,0.10)" : "transparent",
                color: "var(--text)", fontSize: 13.5, lineHeight: 1.55,
              }}
            >
              <span style={{
                flexShrink: 0, width: 23, height: 23, borderRadius: "50%", fontSize: 11.5, fontWeight: 800,
                display: "flex", alignItems: "center", justifyContent: "center",
                border: `1.5px solid ${picked ? GOLD : "var(--line)"}`,
                background: picked ? GOLD : "transparent", color: picked ? "#1a1a1a" : "var(--muted)",
              }}>
                {L}
              </span>
              <RichText text={val} />
            </button>
          );
        })}

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          <button onClick={() => setMarked({ ...marked, [q.id]: !marked[q.id] })} style={{ ...chipBtn, padding: "9px 13px", color: marked[q.id] ? "#7c4dff" : undefined }}>
            {marked[q.id] ? "✓ Marked" : "🔖 Mark for review"}
          </button>
          <button onClick={() => setAns({ ...ans, [q.id]: "" })} style={{ ...chipBtn, padding: "9px 13px" }}>
            Clear
          </button>
        </div>

        <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
          <button onClick={() => setIdx(Math.max(0, idx - 1))} disabled={idx === 0} style={{ ...ghostBtn, flex: 1, opacity: idx === 0 ? 0.4 : 1 }}>
            ← Previous
          </button>
          <button onClick={() => setIdx(Math.min(qs.length - 1, idx + 1))} disabled={idx === qs.length - 1} style={{ ...goldBtn, flex: 1, opacity: idx === qs.length - 1 ? 0.4 : 1 }}>
            Save & Next →
          </button>
        </div>

        <div style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 12, lineHeight: 1.55 }}>
          Preview mode — submit band hai, kuch record nahi hota
        </div>
      </div>

      <button onClick={onNext} style={{ ...goldBtn, width: "100%", marginTop: 14 }}>
        Interface theek hai, ab questions check karein →
      </button>
    </>
  );
}

// ── STEP 3: QUESTION REVIEW ─────────────────────────────────────────────────
// Sab ek scroll me — teacher ka time bachta hai. Har question ke saath answer
// aur explanation pehle se khule hue, sirf ✓ ya ✗ dabana hai.
function QuestionReview({ data, verdict, setVerdict, qNotes, setQNotes, onNext }: any) {
  const [filter, setFilter] = useState<"all" | "todo" | "bad">("all");
  const [section, setSection] = useState("");
  const [showHi, setShowHi] = useState(true);

  const isMock = data.kind === "mock";
  const qs: any[] = useMemo(() => data.questions || [], [data]);

  const sections = useMemo(() => Array.from(new Set(qs.map((q) => q.section))), [qs]);

  const shown = qs.filter((q) => {
    if (section && q.section !== section) return false;
    if (filter === "todo" && verdict[q.id]) return false;
    if (filter === "bad" && verdict[q.id] !== "bad") return false;
    return true;
  });

  const okCount = Object.values(verdict).filter((v) => v === "ok").length;
  const badCount = Object.values(verdict).filter((v) => v === "bad").length;
  const left = qs.length - okCount - badCount;

  if (!isMock) {
    // Course / descriptive — content list dikhate hain
    const items = data.kind === "course" ? (data.content || []) : (data.tests || []);
    return (
      <>
        <Note>Neeche saara content hai. Dekh lijiye sab theek hai, phir approval par jaiye.</Note>
        {items.length === 0 && <Card title="Khaali"><Muted>Abhi is me kuch content nahi hai.</Muted></Card>}
        {items.map((x: any, i: number) => (
          <Card key={i} title={`${i + 1}. ${x.title || "Untitled"}`}>
            {data.kind === "course" ? (
              <>
                <Row left="Type" right={x.content_type || "—"} />
                {x.url && (
                  <a href={x.url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: GOLD, wordBreak: "break-all" }}>
                    {x.url}
                  </a>
                )}
              </>
            ) : (
              <>
                <Row left="Time" right={`${x.duration_minutes || "—"} min`} />
                <Row left="Marks" right={x.total_marks ?? "—"} />
                <Row left="Questions" right={(x.questions || []).length} />
                {(x.questions || []).map((qq: any, j: number) => (
                  <div key={j} style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.65, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                    <b style={{ color: GOLD }}>Q{j + 1}.</b> {qq.question || qq.question_en || qq.title}
                  </div>
                ))}
              </>
            )}
          </Card>
        ))}
        <button onClick={onNext} style={{ ...goldBtn, width: "100%", marginTop: 6 }}>Approval par jaiye →</button>
      </>
    );
  }

  return (
    <>
      {/* Progress — sticky, taaki hamesha pata rahe kitna bacha */}
      <div style={{
        position: "sticky", top: 96, zIndex: 15, background: "var(--bg)",
        paddingBottom: 10, marginBottom: 4,
      }}>
        <div style={{ display: "flex", gap: 7, fontSize: 12, marginBottom: 9 }}>
          <Pill color={GREEN} label={`${okCount} theek`} />
          <Pill color={RED} label={`${badCount} galat`} />
          <Pill color="var(--muted)" label={`${left} baaki`} />
        </div>

        <div style={{ display: "flex", gap: 6, overflowX: "auto" }}>
          {([["all", "Sab"], ["todo", "Baaki"], ["bad", "Galat"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} style={{ ...chipBtn, borderColor: filter === k ? GOLD : "var(--line)", color: filter === k ? GOLD : "var(--muted)" }}>
              {l}
            </button>
          ))}
          <button onClick={() => setSection("")} style={{ ...chipBtn, borderColor: !section ? GOLD : "var(--line)", color: !section ? GOLD : "var(--muted)" }}>
            All sections
          </button>
          {sections.map((s: any) => (
            <button key={s} onClick={() => setSection(s)} style={{ ...chipBtn, borderColor: section === s ? GOLD : "var(--line)", color: section === s ? GOLD : "var(--muted)", whiteSpace: "nowrap" }}>
              {s}
            </button>
          ))}
          <button onClick={() => setShowHi(!showHi)} style={{ ...chipBtn, whiteSpace: "nowrap" }}>
            {showHi ? "हिं छुपाएं" : "हिं दिखाएं"}
          </button>
        </div>
      </div>

      {shown.length === 0 && <Muted>Is filter me kuch nahi hai.</Muted>}

      {shown.map((q: any) => {
        const n = qs.indexOf(q) + 1;
        const v = verdict[q.id];
        return (
          <div
            key={q.id}
            style={{
              background: "var(--card)", borderRadius: 13, padding: 13, marginBottom: 11,
              border: `1px solid ${v === "ok" ? "rgba(46,139,74,0.5)" : v === "bad" ? "rgba(214,69,69,0.5)" : "var(--line)"}`,
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, fontSize: 11.5, color: "var(--muted)" }}>
              <b style={{ color: GOLD, fontSize: 12.5 }}>Q{n}</b>
              <span>{q.section}</span>
              {q.topic && <span>· {q.topic}</span>}
            </div>

            {q.image_url && (
              <img src={q.image_url} alt="" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 9, background: "#fff" }} />
            )}

            <RichText text={q.question} style={{ display: "block", fontSize: 14, fontWeight: 600, lineHeight: 1.6 }} />
            {showHi && q.question_hi && (
              <RichText text={q.question_hi} style={{ display: "block", fontSize: 13.5, color: "var(--text2)", lineHeight: 1.65, marginTop: 5 }} />
            )}
            {showHi && !q.question_hi && (
              <div style={{ fontSize: 11.5, color: RED, marginTop: 5, fontWeight: 700 }}>⚠️ Hindi translation nahi hai</div>
            )}

            {/* Options — sahi wala hara */}
            <div style={{ marginTop: 10 }}>
              {LETTERS.map((L) => {
                const en = q[`option_${L.toLowerCase()}`];
                const hiOpt = q[`option_${L.toLowerCase()}_hi`];
                const right = q.correct_answer === L;
                return (
                  <div
                    key={L}
                    style={{
                      display: "flex", gap: 9, padding: "8px 10px", marginBottom: 5, borderRadius: 8,
                      background: right ? "rgba(46,139,74,0.14)" : "transparent",
                      border: `1px solid ${right ? "rgba(46,139,74,0.45)" : "var(--line)"}`,
                      fontSize: 13, lineHeight: 1.5,
                    }}
                  >
                    <b style={{ color: right ? GREEN : "var(--muted)", flexShrink: 0 }}>{L}{right ? " ✓" : ""}</b>
                    <div>
                      <RichText text={en} style={{ display: "block" }} />
                      {showHi && hiOpt && <RichText text={hiOpt} style={{ display: "block", color: "var(--muted)", fontSize: 12.5, marginTop: 2 }} />}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Explanation */}
            <div style={{ background: "rgba(255,171,0,0.07)", border: "1px solid rgba(255,171,0,0.25)", borderRadius: 9, padding: 10, marginTop: 9 }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: GOLD, letterSpacing: 0.8, marginBottom: 4 }}>EXPLANATION</div>
              {q.explanation ? (
                <RichText text={q.explanation} style={{ display: "block", fontSize: 13, color: "var(--text2)", lineHeight: 1.65 }} />
              ) : (
                <div style={{ fontSize: 12.5, color: RED, fontWeight: 700 }}>⚠️ Explanation nahi hai</div>
              )}
              {showHi && q.explanation_hi && (
                <RichText text={q.explanation_hi} style={{ display: "block", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.65, marginTop: 6 }} />
              )}

              {/* Reasoning ka diagram — seating arrangement, family tree, puzzle grid */}
              {q.explanation_image_url ? (
                <img
                  src={q.explanation_image_url}
                  alt="Solution diagram"
                  style={{ width: "100%", borderRadius: 8, marginTop: 9, background: "#fff", display: "block" }}
                />
              ) : null}
            </div>

            {/* Faisla — bas ek tap */}
            <div style={{ display: "flex", gap: 8, marginTop: 11 }}>
              <button
                onClick={() => setVerdict({ ...verdict, [q.id]: v === "ok" ? undefined : "ok" })}
                style={{
                  flex: 1, padding: "10px", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer",
                  border: `1.5px solid ${v === "ok" ? GREEN : "var(--line)"}`,
                  background: v === "ok" ? GREEN : "transparent",
                  color: v === "ok" ? "#fff" : "var(--muted)",
                }}
              >
                ✓ Theek hai
              </button>
              <button
                onClick={() => setVerdict({ ...verdict, [q.id]: v === "bad" ? undefined : "bad" })}
                style={{
                  flex: 1, padding: "10px", borderRadius: 9, fontSize: 13, fontWeight: 800, cursor: "pointer",
                  border: `1.5px solid ${v === "bad" ? RED : "var(--line)"}`,
                  background: v === "bad" ? RED : "transparent",
                  color: v === "bad" ? "#fff" : "var(--muted)",
                }}
              >
                ✗ Galat hai
              </button>
            </div>

            {v === "bad" && (
              <input
                value={qNotes[q.id] || ""}
                onChange={(e) => setQNotes({ ...qNotes, [q.id]: e.target.value })}
                placeholder="Kya galat hai? (optional)"
                style={{
                  width: "100%", marginTop: 8, padding: "9px 11px", fontSize: 13, borderRadius: 8,
                  background: "var(--bg)", color: "var(--text)", border: "1px solid var(--line)", outline: "none",
                }}
              />
            )}
          </div>
        );
      })}

      <button onClick={onNext} style={{ ...goldBtn, width: "100%", marginTop: 6 }}>
        Approval par jaiye →
      </button>
    </>
  );
}

// ── STEP 4: APPROVAL ────────────────────────────────────────────────────────
function ApprovalStep({ data, verdict, qNotes, teacher, setTeacher, notes, setNotes, loading, error, onSubmit }: any) {
  const bad = Object.entries(verdict).filter(([, v]) => v === "bad");
  const ok = Object.values(verdict).filter((v) => v === "ok").length;

  return (
    <>
      <Card title="Aapne kya paya">
        <Row left="Theek questions" right={`${ok}`} />
        <Row left="Galat mile" right={`${bad.length}`} />
        {bad.length > 0 && (
          <div style={{ marginTop: 9, paddingTop: 9, borderTop: "1px solid var(--line)" }}>
            {bad.map(([qid]) => {
              const q = (data.questions || []).find((x: any) => String(x.id) === qid);
              const n = (data.questions || []).indexOf(q) + 1;
              return (
                <div key={qid} style={{ fontSize: 12.5, color: RED, lineHeight: 1.6, marginBottom: 4 }}>
                  ✗ Q{n} {qNotes[Number(qid)] ? `— ${qNotes[Number(qid)]}` : ""}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Aapka naam">
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {(data.teachers || []).map((t: string) => (
            <button
              key={t}
              onClick={() => setTeacher(t)}
              style={{
                textAlign: "left", padding: "12px 14px", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer",
                border: `1.5px solid ${teacher === t ? GOLD : "var(--line)"}`,
                background: teacher === t ? "rgba(255,171,0,0.12)" : "transparent",
                color: teacher === t ? GOLD : "var(--text)",
              }}
            >
              {teacher === t ? "● " : "○ "}{t}
            </button>
          ))}
        </div>
      </Card>

      <Card title="Koi aur baat (optional)">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Kuch aur batana ho to yahan likh dijiye"
          style={{
            width: "100%", padding: "11px 12px", fontSize: 13.5, borderRadius: 9, resize: "vertical",
            background: "var(--bg)", color: "var(--text)", border: "1px solid var(--line)", outline: "none", lineHeight: 1.6,
          }}
        />
      </Card>

      {error && <p style={{ color: RED, fontSize: 13, marginBottom: 12, fontWeight: 600 }}>{error}</p>}

      <button
        onClick={() => onSubmit("approved")}
        disabled={loading || !teacher}
        style={{
          width: "100%", padding: 15, borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer",
          border: "none", background: GREEN, color: "#fff", opacity: loading || !teacher ? 0.5 : 1,
        }}
      >
        ✅ Approve — live kar sakte hain
      </button>

      <button
        onClick={() => onSubmit("changes_needed")}
        disabled={loading || !teacher}
        style={{
          width: "100%", padding: 15, borderRadius: 12, fontSize: 15, fontWeight: 800, cursor: "pointer",
          marginTop: 10, background: "transparent", color: RED,
          border: `1.5px solid ${RED}`, opacity: loading || !teacher ? 0.5 : 1,
        }}
      >
        ⚠️ Changes chahiye
      </button>

      <p style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", marginTop: 14, lineHeight: 1.6 }}>
        Submit karte hi ye key band ho jayegi — ek baar hi chalti hai.
      </p>
    </>
  );
}

// ── Chhote UI helpers ───────────────────────────────────────────────────────
function Shell({ children }: { children: React.ReactNode }) {
  return <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>{children}</div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode; key?: any }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 13, padding: 13, marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "var(--muted)", marginBottom: 9 }}>
        {title.toUpperCase()}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ background: "var(--bg)", borderRadius: 9, padding: "9px 10px" }}>
      <div style={{ fontSize: 15, fontWeight: 800 }}>{value ?? "—"}</div>
      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 1 }}>{label}</div>
    </div>
  );
}

function Row({ left, right }: { left: any; right: any; key?: any }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13, padding: "5px 0", lineHeight: 1.5 }}>
      <span style={{ color: "var(--text2)" }}>{left}</span>
      <span style={{ fontWeight: 700, flexShrink: 0 }}>{right}</span>
    </div>
  );
}

function Pill({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ fontSize: 11.5, fontWeight: 800, padding: "4px 10px", borderRadius: 16, color, border: `1px solid ${color}55` }}>
      {label}
    </span>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: "rgba(255,171,0,0.08)", border: "1px solid rgba(255,171,0,0.28)", borderRadius: 11, padding: 12, marginBottom: 13, fontSize: 12.5, color: "var(--text2)", lineHeight: 1.65 }}>
      {children}
    </div>
  );
}

function Muted({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6 }}>{children}</div>;
}

const goldBtn: React.CSSProperties = {
  padding: "13px 18px", borderRadius: 11, border: "none", background: GOLD,
  color: "#1a1a1a", fontSize: 14.5, fontWeight: 800, cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  padding: "13px 18px", borderRadius: 11, background: "transparent",
  color: "var(--text)", border: "1px solid var(--line)", fontSize: 14, fontWeight: 700, cursor: "pointer",
};

const chipBtn: React.CSSProperties = {
  padding: "6px 12px", borderRadius: 18, background: "transparent",
  color: "var(--muted)", border: "1px solid var(--line)", fontSize: 12, fontWeight: 700, cursor: "pointer",
};
