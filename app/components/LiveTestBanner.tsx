"use client";

// Homepage ka LIVE TEST banner — hero carousel se alag, uske upar dikhta hai.
// Teen halat sambhalta hai:
//   upcoming → countdown + "Register for free" + Telegram reminder
//   running  → "LIVE NOW" + kitne log de rahe hain + "Start Test"
//   ended    → "Result jald aayega" / result publish hua to "Result dekho"

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";

const GOLD = "#FFAB00";

type LiveTest = {
  id: number;
  title: string;
  phase: "upcoming" | "running" | "ended" | "published";
  starts_at?: string;
  ends_at?: string;
  duration_minutes?: number;
  total_questions?: number;
  total_marks?: number;
  is_free?: boolean;
  already_attempted?: boolean;
  already_registered?: boolean;
  telegram_group?: string;
  live_count?: number;
  registered_count?: number;
  results_published?: boolean;
  seconds_to_start?: number;
  seconds_to_end?: number;
};

export default function LiveTestBanner() {
  const router = useRouter();
  const [test, setTest] = useState<LiveTest | null>(null);
  const [left, setLeft] = useState(0);
  const [busy, setBusy] = useState(false);
  const [justRegistered, setJustRegistered] = useState(false);

  function load() {
    const u = getUser();
    fetch(`${API_URL}/mock-tests/live${u ? `?user_id=${(u as any).id}` : ""}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const list: LiveTest[] = d?.live_tests || [];
        const t = list[0] || null;
        setTest(t);
        if (t) setLeft(t.phase === "upcoming" ? t.seconds_to_start || 0 : t.seconds_to_end || 0);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load();
    // Har 60 sec me refresh — count aur phase update hote rehte hain
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, []);

  // Countdown
  useEffect(() => {
    if (!test || left <= 0) return;
    const t = setInterval(() => {
      setLeft((s) => {
        if (s <= 1) {
          load(); // time khatam — phase badal gaya hoga
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [test, left]);

  async function register() {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    if (!test) return;
    setBusy(true);
    try {
      const res = await fetch(`${API_URL}/mock-tests/${test.id}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: (u as any).id }),
      });
      if (res.ok) {
        setJustRegistered(true);
        load();
      }
    } catch {}
    setBusy(false);
  }

  if (!test) return null;

  const dhms = (s: number) => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const p = (n: number) => String(n).padStart(2, "0");
    return d > 0 ? `${d}d ${p(h)}:${p(m)}:${p(sec)}` : `${p(h)}:${p(m)}:${p(sec)}`;
  };

  const when = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleString("en-IN", {
          day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
        })
      : "";

  const running = test.phase === "running";
  const ended = test.phase === "ended";
  const published = test.phase === "published" || test.results_published;

  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        marginBottom: 18,
        background: running
          ? "linear-gradient(135deg, #8c1c1c, #c62828)"
          : "linear-gradient(135deg, #1a2f55, #2c4a85)",
        color: "#fff",
        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
      }}
    >
      {/* Top strip */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "9px 16px",
          background: "rgba(0,0,0,0.22)",
          fontSize: 12, fontWeight: 800, letterSpacing: 1.2,
        }}
      >
        {running ? (
          <>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#ff5252", display: "inline-block", animation: "slpulse 1.2s infinite" }} />
            LIVE NOW
          </>
        ) : published ? (
          <>🏆 RESULT OUT</>
        ) : ended ? (
          <>⏳ RESULT AWAITED</>
        ) : (
          <>🔴 UPCOMING LIVE TEST</>
        )}
        <span style={{ marginLeft: "auto", opacity: 0.85, fontWeight: 700, letterSpacing: 0 }}>
          {test.is_free ? "FREE" : ""}
        </span>
      </div>

      <div style={{ padding: "16px 18px 18px" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, lineHeight: 1.3 }}>{test.title}</h2>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 8, fontSize: 12.5, opacity: 0.9 }}>
          {test.total_questions ? <span>📝 {test.total_questions} questions</span> : null}
          {test.duration_minutes ? <span>⏱ {test.duration_minutes} min</span> : null}
          {test.total_marks ? <span>🎯 {test.total_marks} marks</span> : null}
        </div>

        {/* Timing */}
        {(test.starts_at || test.ends_at) && (
          <div style={{ fontSize: 12.5, opacity: 0.85, marginTop: 6 }}>
            {when(test.starts_at)} — {when(test.ends_at)}
          </div>
        )}

        {/* Countdown */}
        {left > 0 && !published && (
          <div
            style={{
              marginTop: 14, background: "rgba(0,0,0,0.25)", borderRadius: 12,
              padding: "10px 14px", display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <span style={{ fontSize: 12, opacity: 0.85 }}>
              {running ? "Ends in" : "Starts in"}
            </span>
            <span style={{ marginLeft: "auto", fontSize: 20, fontWeight: 800, color: GOLD, fontVariantNumeric: "tabular-nums" }}>
              {dhms(left)}
            </span>
          </div>
        )}

        {/* Counts */}
        <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 13, fontWeight: 700 }}>
          {running && typeof test.live_count === "number" && (
            <span>🟢 {test.live_count} students live</span>
          )}
          {!running && typeof test.registered_count === "number" && test.registered_count > 0 && (
            <span>👥 {test.registered_count} registered</span>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
          {running && !test.already_attempted && (
            <button onClick={() => router.push(`/mock-test/${test.id}`)} style={primary}>
              ▶ Start Test Now
            </button>
          )}
          {running && test.already_attempted && (
            <div style={doneBox}>✓ Submitted — your result will be out soon</div>
          )}

          {test.phase === "upcoming" && (
            test.already_registered || justRegistered ? (
              <div style={doneBox}>✓ You are registered — see you at test time</div>
            ) : (
              <button onClick={register} disabled={busy} style={{ ...primary, opacity: busy ? 0.6 : 1 }}>
                {busy ? "Please wait..." : "🔔 Register Free"}
              </button>
            )
          )}

          {ended && <div style={doneBox}>Results are being prepared — check back shortly</div>}

          {published && (
            <>
              <button onClick={() => router.push(`/mock-test/${test.id}/result`)} style={primary}>
                🏆 View your Result &amp; Rank
              </button>
              <button onClick={() => router.push(`/mock-test/${test.id}?review=1`)} style={secondary}>
                📖 View solutions
              </button>
            </>
          )}

          {test.telegram_group && !published && (
            <a href={test.telegram_group} target="_blank" rel="noreferrer" style={secondary}>
              ✈️ Join Telegram for reminders
            </a>
          )}
        </div>
      </div>

      <style>{`@keyframes slpulse { 0%,100% { opacity: 1 } 50% { opacity: 0.25 } }`}</style>
    </div>
  );
}

const primary: React.CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 12,
  padding: "12px 20px", fontWeight: 800, fontSize: 14.5, cursor: "pointer", textDecoration: "none",
};

const secondary: React.CSSProperties = {
  background: "rgba(255,255,255,0.14)", color: "#fff",
  border: "1px solid rgba(255,255,255,0.35)", borderRadius: 12,
  padding: "12px 18px", fontWeight: 700, fontSize: 13.5, cursor: "pointer", textDecoration: "none",
};

const doneBox: React.CSSProperties = {
  background: "rgba(255,255,255,0.14)", borderRadius: 12,
  padding: "11px 16px", fontSize: 13.5, fontWeight: 700,
};
