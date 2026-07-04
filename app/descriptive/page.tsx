"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, User } from "@/lib/api";
import { API_URL } from "@/lib/config";
import ThemeToggle from "@/app/components/ThemeToggle";
import SideMenu from "@/app/components/SideMenu";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";

interface Series {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  price?: number;
  original_price?: number;
  validity_days?: number;
  // lock status may arrive under any of these keys depending on backend:
  unlocked?: boolean;
  is_unlocked?: boolean;
  purchased?: boolean;
}

function isLocked(s: Series): boolean {
  if (Number(s.price ?? 0) <= 0) return false; // free series never locked
  return !(s.unlocked ?? s.is_unlocked ?? s.purchased ?? false);
}

export default function DescriptiveListPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    const uid = (u as any)?.id ?? "";
    fetch(`${API_URL}/descriptive/series?user_id=${uid}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.series ?? data?.data ?? [];
        setSeries(list);
      })
      .catch(() => setError("Could not load tests. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ── Header ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "var(--header)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
          style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 4 }}
        >
          ☰
        </button>
        <div style={{ fontWeight: 800, fontSize: 17, flex: 1 }}>Descriptive Tests</div>
        <ThemeToggle />
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 40px" }}>
        {/* ── Intro banner ── */}
        <section
          style={{
            background: `linear-gradient(135deg, ${NAVY}, #2c4a85)`,
            borderRadius: 18,
            padding: "22px 20px",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", right: -30, top: -30, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,171,0,0.15)" }} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>
            Descriptive Writing Practice
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", maxWidth: 460 }}>
            Essay, Précis and Letter writing tests for banking &amp; descriptive exams. Write against the clock, then compare with a model answer and your auto-score.
          </p>
        </section>

        <h2 style={h2}>Test Series</h2>

        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading tests…</p>
        ) : error ? (
          <p style={{ color: "#c0392b", fontSize: 14 }}>{error}</p>
        ) : series.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            New descriptive series launching soon — join our Telegram for updates!
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {series.map((s) => {
              const locked = isLocked(s);
              const free = Number(s.price ?? 0) <= 0;
              return (
                <div
                  key={s.id}
                  onClick={() => router.push(`/descriptive/${s.id}`)}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: 14,
                    overflow: "hidden",
                    cursor: "pointer",
                    boxShadow: "var(--shadow)",
                    position: "relative",
                  }}
                >
                  <div style={{ width: "100%", aspectRatio: "16 / 9", background: "var(--chip)", overflow: "hidden", position: "relative" }}>
                    {s.thumbnail_url ? (
                      <img src={s.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 30 }}>✍️</div>
                    )}
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        background: locked ? "rgba(0,0,0,0.65)" : free ? "#2e8b4a" : GOLD,
                        color: locked ? "#fff" : free ? "#fff" : "#1a1a1a",
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: 20,
                      }}
                    >
                      {locked ? "🔒 Locked" : free ? "FREE" : "✓ Unlocked"}
                    </span>
                  </div>
                  <div style={{ padding: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, minHeight: 36, overflow: "hidden" }}>{s.title}</div>
                    <div style={{ marginTop: 6, fontSize: 13.5 }}>
                      {free ? (
                        <b style={{ color: "#2e8b4a" }}>FREE</b>
                      ) : (
                        <>
                          <b style={{ color: GOLD }}>₹{s.price}</b>
                          {Number(s.original_price) > Number(s.price) && (
                            <span style={{ color: "var(--muted)", textDecoration: "line-through", fontSize: 11.5, marginLeft: 5 }}>
                              ₹{s.original_price}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

const h2: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: "26px 0 10px" };
        
