"use client";

// Live test result — window band hone aur admin ke publish karne ke baad.
// Route: app/mock-test/[id]/result/page.tsx
// Student ko sirf apna score, rank aur percentile dikhta hai — doosron ka nahi.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";

const GOLD = "#FFAB00";
const GREEN = "#2e8b4a";
const RED = "#d64545";

export default function LiveResultPage() {
  const params = useParams();
  const router = useRouter();
  const testId = Number(params.id);

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    fetch(`${API_URL}/mock-tests/${testId}/result?user_id=${(u as any).id}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not load result");
        setData(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testId]);

  if (loading) return <Center>Loading result…</Center>;

  if (error)
    return (
      <Center>
        <div style={{ fontSize: 36 }}>⚠️</div>
        <p style={{ color: "#e05555", fontSize: 14.5, textAlign: "center", margin: "10px 0 16px" }}>{error}</p>
        <button onClick={() => router.push("/")} style={gold}>Back to home</button>
      </Center>
    );

  // Result abhi publish nahi hua
  if (data?.pending)
    return (
      <Center>
        <div style={{ fontSize: 44 }}>⏳</div>
        <h2 style={{ fontSize: 20, fontWeight: 800, margin: "12px 0 6px", textAlign: "center" }}>
          Results not out yet
        </h2>
        <p style={{ fontSize: 14, color: "var(--muted)", textAlign: "center", lineHeight: 1.6, maxWidth: 360 }}>
          {data.message || "Results will be published for everyone once the live test ends."}
        </p>
        <button onClick={() => router.push("/")} style={{ ...gold, marginTop: 18 }}>Back to home</button>
      </Center>
    );

  const a = data.attempt || {};
  const total = data.total_attempts || 0;
  const rank = data.rank || 0;
  const top3 = rank <= 3;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        <button onClick={() => router.push("/")} style={{ ...ghost, marginBottom: 14 }}>← Home</button>

        {/* Rank card */}
        <div
          style={{
            background: top3
              ? "linear-gradient(135deg, #8a6d00, #FFAB00)"
              : "linear-gradient(135deg, #1a2f55, #2c4a85)",
            color: "#fff", borderRadius: 20, padding: "24px 18px", textAlign: "center",
          }}
        >
          <div style={{ fontSize: 13, opacity: 0.85 }}>{data.test?.title}</div>
          <div style={{ fontSize: 46, marginTop: 6 }}>{top3 ? "🏆" : "📊"}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>YOUR RANK</div>
          <div style={{ fontSize: 44, fontWeight: 800, lineHeight: 1.1, color: top3 ? "#1a1a1a" : GOLD }}>
            #{rank}
          </div>
          <div style={{ fontSize: 13.5, opacity: 0.9 }}>out of {total} students</div>

          <div
            style={{
              marginTop: 16, background: "rgba(0,0,0,0.22)", borderRadius: 14,
              padding: "12px 16px", display: "flex", justifyContent: "center", alignItems: "baseline", gap: 6,
            }}
          >
            <span style={{ fontSize: 30, fontWeight: 800 }}>{a.score}</span>
            <span style={{ fontSize: 15, opacity: 0.8 }}>/ {data.test?.total_marks}</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginTop: 14 }}>
          <Stat label="Correct" value={a.correct} color={GREEN} />
          <Stat label="Wrong" value={a.wrong} color={RED} />
          <Stat label="Skipped" value={a.skipped} color="var(--muted)" />
          <Stat label="Percentile" value={`${data.percentile}%`} color={GOLD} />
        </div>

        {/* Compare */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginTop: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 10 }}>How you did</div>
          <Row label="Topper's score" value={`${data.topper_score} / ${data.test?.total_marks}`} />
          <Row label="Average score" value={`${data.average_score} / ${data.test?.total_marks}`} />
          <Row label="Your score" value={`${a.score} / ${data.test?.total_marks}`} strong />
          <Row label="Students who attempted" value={String(total)} />
          {a.time_taken_seconds ? (
            <Row label="Time taken" value={`${Math.floor(a.time_taken_seconds / 60)} min`} />
          ) : null}
        </div>

        {/* Weak / strong areas */}
        {(data.weak_areas?.length > 0 || data.strong_areas?.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 14 }}>
            {data.strong_areas?.length > 0 && (
              <div style={{ background: "rgba(46,139,74,0.10)", border: `1px solid ${GREEN}55`, borderRadius: 14, padding: "13px 15px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: GREEN, letterSpacing: 0.6 }}>💪 STRONG AREAS</div>
                <div style={{ fontSize: 14, marginTop: 5 }}>{data.strong_areas.join(" · ")}</div>
              </div>
            )}
            {data.weak_areas?.length > 0 && (
              <div style={{ background: "rgba(214,69,69,0.10)", border: `1px solid ${RED}55`, borderRadius: 14, padding: "13px 15px" }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: RED, letterSpacing: 0.6 }}>📌 FOCUS HERE</div>
                <div style={{ fontSize: 14, marginTop: 5 }}>{data.weak_areas.join(" · ")}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>
                  Your accuracy was below 60% in these sections.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Section-wise breakdown */}
        {data.sections?.length > 0 && (
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: 16, marginTop: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>Section-wise performance</div>

            {data.sections.map((s: any) => {
              const pct = s.max_marks > 0 ? (s.score / s.max_marks) * 100 : 0;
              const bar = s.accuracy >= 75 ? GREEN : s.accuracy >= 50 ? GOLD : RED;
              return (
                <div key={s.section} style={{ marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: 700, fontSize: 14, flex: 1, minWidth: 0 }}>{s.section}</span>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>{s.score}</span>
                    <span style={{ fontSize: 12, color: "var(--muted)" }}>/ {s.max_marks}</span>
                  </div>

                  {/* Score bar */}
                  <div style={{ height: 7, borderRadius: 4, background: "var(--chip)", marginTop: 6, overflow: "hidden" }}>
                    <div style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height: "100%", background: bar, borderRadius: 4 }} />
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6, fontSize: 11.5, color: "var(--muted)" }}>
                    <span style={{ color: GREEN }}>✓ {s.correct}</span>
                    <span style={{ color: RED }}>✗ {s.wrong}</span>
                    <span>− {s.skipped} skipped</span>
                    <span style={{ marginLeft: "auto", fontWeight: 700, color: bar }}>{s.accuracy}% accuracy</span>
                  </div>
                </div>
              );
            })}

            <p style={{ fontSize: 11.5, color: "var(--muted)", margin: 0, lineHeight: 1.6 }}>
              Accuracy = correct ÷ attempted. Skipped questions don't affect accuracy.
            </p>
          </div>
        )}

        <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 12, lineHeight: 1.6, textAlign: "center" }}>
          Rank is calculated across everyone who attempted this live test.
        </p>

        <button onClick={() => router.push("/mock-tests")} style={{ ...gold, width: "100%", marginTop: 14 }}>
          Explore more mock tests
        </button>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color }}>{value}</div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, padding: "7px 0", borderTop: "1px solid var(--line)" }}>
      <span style={{ color: "var(--muted)" }}>{label}</span>
      <span style={{ fontWeight: strong ? 800 : 600, color: strong ? GOLD : "var(--text)" }}>{value}</span>
    </div>
  );
}

const gold: React.CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 12,
  padding: "13px 22px", fontWeight: 800, fontSize: 15, cursor: "pointer",
};

const ghost: React.CSSProperties = {
  background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)",
  borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
};
