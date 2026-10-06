"use client";

/**
 * app/nbems-mock/page.tsx — NBEMS 75-minute full mocks ki list.
 * ?s=<tier2 series id>. Mock 1 free, baaki series kharidne par.
 * Backend: GET /api/nbems-mock/mocks
 */
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import { mmss, difficultyOf, PATTERN_GROUPS, type MockSection, type MockStats } from "@/lib/nbemsMock";

const GOLD = "#FFAB00";
const GREEN = "#2e8b4a";
const RED = "#c0392b";

type Summary = { attempt_id: number; total_marks: number; qualified: boolean; submitted_at?: string };
type MockRow = {
  id: number; title: string; mock_number: number; duration_min: number; total_marks: number;
  is_free: boolean; unlocked: boolean; sections: MockSection[];
  pattern?: "v1" | "v2"; typing_minute_options?: number[] | null;
  in_progress: { attempt_id: number; remaining: number } | null;
  last: Summary | null; best: Summary | null; attempts: number;
  stats?: MockStats;
};

export default function NbemsMockList() {
  const router = useRouter();
  const [sid, setSid] = useState<number>(0);
  const [mocks, setMocks] = useState<MockRow[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const s = Number(new URLSearchParams(window.location.search).get("s")) || 0;
    setSid(s);
    if (!s) { setError("Open the full mocks from the NBEMS series in Typing/Skill Test."); setMocks([]); return; }
    const uid = (getUser() as any)?.id;
    fetch(`${API_URL}/nbems-mock/mocks?series_id=${s}${uid ? `&user_id=${uid}` : ""}`)
      .then(async (r) => { const d = await r.json(); if (!r.ok) throw new Error(d.detail || "Could not load the mocks"); return d; })
      .then((d) => setMocks(d.mocks || []))
      .catch((e) => { setError(e.message || "Could not load the mocks"); setMocks([]); });
  }, []);

  function openMock(m: MockRow) {
    if (!getUser()) { router.push("/login"); return; }
    if (!m.unlocked) { router.push(`/tier2?s=${sid}`); return; }      // wahan "Unlock all" hai
    router.push(`/nbems-mock/${m.id}?s=${sid}`);
  }

  // Do group: Exam Pattern (naya) upar, Practice 75 min (purana) neeche.
  // Number har group me 1 se — database ka mock_number (6-10) student ko nahi dikhta.
  const groups = PATTERN_GROUPS.map((g) => ({
    ...g,
    list: (mocks || []).filter((m) => (m.pattern === "v2" ? "v2" : "v1") === g.pattern)
      .sort((a, b) => a.mock_number - b.mock_number),
  })).filter((g) => g.list.length > 0);

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "14px 14px 40px", color: "var(--text)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <button onClick={() => router.push(sid ? `/tier2?s=${sid}` : "/tier2")} aria-label="Back"
          style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--text)" }}>←</button>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800 }}>Full mocks</div>
          <div style={{ fontSize: 12.5, color: "var(--muted)" }}>NBEMS Junior Assistant skill test</div>
        </div>
      </div>

      {mocks === null && <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>}
      {error && <p style={{ color: RED, fontSize: 13.5 }}>{error}</p>}
      {mocks && !error && mocks.length === 0 && <p style={{ color: "var(--muted)", fontSize: 14 }}>The full mocks are coming soon.</p>}

      {groups.map((g) => (
        <section key={g.pattern} style={{ marginBottom: 22 }}>
          <div style={{ margin: "6px 2px 10px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{g.title}</h2>
              {g.tag && <span style={{ fontSize: 10.5, fontWeight: 900, color: "#1a1a1a", background: GOLD, borderRadius: 20, padding: "2px 8px" }}>{g.tag.toUpperCase()}</span>}
              <span style={{ fontSize: 12.5, color: "var(--muted)" }}>· {g.list.length} mocks</span>
            </div>
            <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>{g.sub}</div>
          </div>
      {g.list.map((m, idx) => {
        const run = m.in_progress;
        const diff = difficultyOf(m.stats);
        const label = g.pattern === "v2" ? `Exam Pattern Mock ${idx + 1}` : `Practice Mock ${idx + 1}`;
        return (
          <div key={m.id} style={{ background: "var(--card)", border: `1px solid ${run ? GOLD : "var(--line)"}`, borderRadius: 14,
                                   padding: 14, marginBottom: 10, boxShadow: "var(--shadow)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,171,0,0.14)", color: GOLD, fontWeight: 900,
                             display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 800 }}>
                  {label}
                  {diff && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: diff.color, border: `1px solid ${diff.color}`, borderRadius: 6, padding: "1px 6px" }}>{diff.label}</span>}
                  {m.is_free && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 800, color: GREEN, border: `1px solid ${GREEN}`, borderRadius: 6, padding: "1px 6px" }}>FREE</span>}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                  {m.pattern === "v2"
                    ? <>Typing {(m.typing_minute_options || [10, 15, 25]).join("/")} min + {m.duration_min} min · {m.total_marks} marks · Typing, Fill in the blanks, Mail merge, Excel</>
                    : <>{m.duration_min} min · {m.total_marks} marks · Typing, Excel, Word, PowerPoint, 15 MCQ</>}
                </div>
                {run && <div style={{ fontSize: 12.5, color: GOLD, fontWeight: 700, marginTop: 4 }}>In progress · {mmss(run.remaining)} left on the clock</div>}
                {!run && m.last && (
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>
                    Last score <b style={{ color: m.last.qualified ? GREEN : RED }}>{m.last.total_marks} / {m.total_marks}</b>
                    {m.best && m.attempts > 1 && <span style={{ color: "var(--muted)" }}> · best {m.best.total_marks}</span>}
                  </div>
                )}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              {!run && m.last && (
                <button onClick={() => router.push(`/nbems-mock/result/${m.last!.attempt_id}?s=${sid}`)}
                  style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid var(--line)", background: "transparent", color: "var(--text)", fontWeight: 700, cursor: "pointer" }}>
                  Scorecard
                </button>
              )}
              <button onClick={() => openMock(m)}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 800,
                         background: m.unlocked ? GOLD : "var(--chip)", color: m.unlocked ? "#1a1a1a" : "var(--text)" }}>
                {!m.unlocked ? "🔒 Unlock" : run ? "Resume" : m.last ? "Attempt again" : "Start mock"}
              </button>
            </div>
          </div>
        );
      })}
        </section>
      ))}
    </div>
  );
}
