"use client";

import { useEffect, useState } from "react";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";
// Admin-managed via App Content tab → app-config (same JSON the app uses).
const API = "https://api.selectionlab.online/api/app-config";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { days, hms: `${pad(h)}:${pad(m)}:${pad(sec)}` };
}

export default function ExamCountdown() {
  const [now, setNow] = useState<number | null>(null);
  const [exams, setExams] = useState<{ name: string; date: string }[]>([]);

  // Start the clock only on the client (avoids SSR/client mismatch).
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetch(API)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        const root = cfg?.config ?? cfg; // endpoint may wrap as { config: {...} }
        const list = root?.exam_dates;
        if (!Array.isArray(list)) return;
        setExams(
          list.map((e: any) => ({
            name: String(e.name ?? ""),
            date: String(e.date ?? e.exam_date ?? ""),
          }))
        );
      })
      .catch(() => {});
  }, []);

  if (now === null) return null;

  const upcoming = exams
    .filter((e) => e.name && e.date)
    .map((e) => ({ ...e, ts: new Date(e.date + "T00:00:00+05:30").getTime() }))
    .filter((e) => e.ts > now)
    .sort((a, b) => a.ts - b.ts);

  if (upcoming.length === 0) return null;

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "26px 0 10px" }}>
        ⏳ Exam Countdown
      </h2>
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 6,
          WebkitOverflowScrolling: "touch",
        }}
      >
        {upcoming.map((e) => {
          const p = parts(e.ts - now);
          const d = new Date(e.ts);
          const pretty = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
          return (
            <div
              key={e.name}
              style={{
                minWidth: 168,
                background: `linear-gradient(135deg, ${NAVY}, #2c4a85)`,
                color: "#fff",
                borderRadius: 14,
                padding: "14px 14px 12px",
                boxShadow: "var(--shadow)",
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, opacity: 0.9, lineHeight: 1.3 }}>{e.name}</div>
              <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 6 }}>
                <span style={{ fontSize: 30, fontWeight: 800, color: GOLD, lineHeight: 1 }}>{p.days}</span>
                <span style={{ fontSize: 12, opacity: 0.85 }}>days</span>
              </div>
              <div style={{ marginTop: 4, fontSize: 12.5, fontVariantNumeric: "tabular-nums", opacity: 0.9 }}>
                {p.hms}
              </div>
              <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>{pretty}</div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
