"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";

const GOLD = "#FFAB00";
const BG = "var(--bg)";
const CARD = "var(--card)";
const BORDER = "var(--border)";

export default function MockTestsPage() {
  const router = useRouter();
  const [series, setSeries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const u = getUser();
    // platform=web -> backend "App only" wali series website pe nahi bhejta,
    // aur "Website only" wali sahi dikhne lagti hai.
    const url = `${API_URL}/mock-tests/series?platform=web${u ? `&user_id=${u.id}` : ""}`;
    fetch(url)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not load test series");
        setSeries(d.series || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "var(--text)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "var(--header)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <button onClick={() => router.push("/")} style={backBtn}>
          ←
        </button>
        <div style={{ fontWeight: 800, fontSize: 17 }}>
          Mock <span style={{ color: GOLD }}>Tests</span>
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        {loading && <p style={{ color: "var(--muted)" }}>Loading test series...</p>}
        {error && <p style={{ color: "#ff8a8a", fontSize: 14 }}>{error}</p>}
        {!loading && !error && series.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--muted)" }}>
            <div style={{ fontSize: 40 }}>📝</div>
            <p>Test series coming soon. Stay tuned!</p>
          </div>
        )}

        {series.map((s) => (
          <div
            key={s.id}
            onClick={() => router.push(`/mock-tests/${s.id}`)}
            style={{
              background: CARD,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              overflow: "hidden",
              marginBottom: 14,
              cursor: "pointer",
            }}
          >
            {/* Thumbnail — admin me lagayi ho tabhi dikhti hai */}
            {s.thumbnail_url && (
              <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "var(--chip)", overflow: "hidden" }}>
                <img
                  src={s.thumbnail_url}
                  alt=""
                  aria-hidden
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(14px) brightness(0.7)", transform: "scale(1.1)" }}
                />
                <img
                  src={s.thumbnail_url}
                  alt=""
                  style={{ position: "relative", width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                />
              </div>
            )}

            <div style={{ padding: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: 16.5, fontWeight: 800 }}>{s.title}</h3>
                  {s.description && (
                    <p
                      style={{
                        margin: "6px 0 0",
                        fontSize: 13,
                        color: "var(--muted)",
                        lineHeight: 1.5,
                        // Lambi description card ko na phaila de — 3 line ke baad cut
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {s.description}
                    </p>
                  )}
                </div>
                {s.is_purchased ? (
                  <span style={badge("#5dd97c")}>OWNED ✓</span>
                ) : Number(s.price) === 0 ? (
                  <span style={badge("#5dd97c")}>FREE</span>
                ) : (
                  <span style={badge(GOLD)}>₹{s.price}</span>
                )}
              </div>

              <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 12.5, color: "var(--text2)", flexWrap: "wrap" }}>
                <span>📝 {s.tests_count} tests</span>
                {s.free_count > 0 && !s.is_purchased && Number(s.price) > 0 && (
                  <span style={{ color: "#5dd97c" }}>🎁 {s.free_count} free</span>
                )}
                {Number(s.original_price) > Number(s.price) && !s.is_purchased && (
                  <span style={{ color: "var(--muted)", textDecoration: "line-through" }}>₹{s.original_price}</span>
                )}
              </div>

              <div
                style={{
                  marginTop: 12,
                  textAlign: "center",
                  padding: "10px 0",
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13.5,
                  background: "rgba(255,171,0,0.12)",
                  color: GOLD,
                  border: `1px solid ${BORDER}`,
                }}
              >
                {s.is_purchased ? "View Tests →" : s.free_count > 0 ? "Try Free Tests →" : "View Series →"}
              </div>
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}

function badge(color: string): React.CSSProperties {
  return {
    flexShrink: 0,
    padding: "4px 10px",
    borderRadius: 8,
    fontWeight: 800,
    fontSize: 13,
    color,
    border: `1px solid ${color}55`,
    background: `${color}18`,
  };
}

const backBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--text)",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "6px 12px",
  fontSize: 15,
  cursor: "pointer",
};
