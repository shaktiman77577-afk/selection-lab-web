"use client";

/**
 * app/search/page.tsx — poore result.
 *
 * Dropdown 12 tak dikhata hai. Usse zyada hone par student yahan aata hai:
 * har category se 20, aur category ke filter ke saath.
 *
 * Yahan se log NAHI hota (log=0). Ek hi search do baar ginti me aa jaati —
 * pehle dropdown se, phir yahan se — aur admin me har cheez dugni dikhti.
 */

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import ThemeToggle from "@/app/components/ThemeToggle";

const GOLD = "#FFAB00";

interface Result {
  kind: string;
  kind_label: string;
  id: any;
  title: string;
  subtitle?: string;
  price?: number;
  original_price?: number;
  thumbnail_url?: string;
  link: string;
}

function SearchPageInner() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [kind, setKind] = useState("all");
  const [loading, setLoading] = useState(true);
  const [trending, setTrending] = useState<any[]>([]);

  const run = useCallback(async (text: string) => {
    if (!text.trim()) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const uid = (getUser() as any)?.id;
    try {
      // log=0 — ye search dropdown me pehle hi gin li gayi thi
      const r = await fetch(
        `${API_URL}/search/?q=${encodeURIComponent(text)}&platform=web&limit=20&log=0${uid ? `&user_id=${uid}` : ""}`
      );
      const d = await r.json();
      setResults(d?.results || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const text = new URLSearchParams(window.location.search).get("q") || "";
    setQ(text);
    run(text);
    fetch(`${API_URL}/search/trending`)
      .then((r) => r.json())
      .then((d) => setTrending(d?.trending || []))
      .catch(() => {});
  }, [run]);

  function submit() {
    const text = q.trim();
    if (!text) return;
    router.push(`/search?q=${encodeURIComponent(text)}`);
    run(text);
  }

  const kinds = Array.from(new Set(results.map((r) => r.kind_label)));
  const shown = kind === "all" ? results : results.filter((r) => r.kind_label === kind);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header
        style={{
          position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", background: "var(--header)", backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button
          onClick={() => { try { router.back(); } catch { router.push("/"); } }}
          aria-label="Back"
          style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 4 }}
        >
          ←
        </button>
        <div style={{ fontWeight: 800, fontSize: 17, flex: 1 }}>Search</div>
        <ThemeToggle />
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "14px 16px 40px" }}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 8, background: "var(--card)",
            border: "1px solid var(--line)", borderRadius: 12, padding: "0 12px", marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 15, color: "var(--muted)" }}>🔎</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            placeholder="Search courses, mocks, tests…"
            aria-label="Search"
            style={{
              flex: 1, border: "none", outline: "none", background: "transparent",
              color: "var(--text)", fontSize: 14.5, padding: "12px 0", minWidth: 0,
            }}
          />
          <button
            onClick={submit}
            style={{ background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 9, padding: "7px 14px", fontWeight: 800, fontSize: 13, cursor: "pointer", margin: "6px 0" }}
          >
            Search
          </button>
        </div>

        {kinds.length > 1 && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
            {["all", ...kinds].map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                style={{
                  border: `1px solid ${kind === k ? GOLD : "var(--line)"}`,
                  background: kind === k ? GOLD : "transparent",
                  color: kind === k ? "#1a1a1a" : "var(--text)",
                  borderRadius: 20, padding: "6px 13px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                }}
              >
                {k === "all" ? `All (${results.length})` : k}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Searching…</p>
        ) : shown.length === 0 ? (
          <div>
            <p style={{ fontSize: 14.5, marginBottom: 4 }}>
              No results for <b>{q.trim()}</b>
            </p>
            <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, marginBottom: 16 }}>
              Check the spelling, or try a shorter word. Searching the exam name usually works best.
            </p>
            {trending.length > 0 && (
              <>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--muted)", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 8 }}>
                  Try one of these
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {trending.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => {
                        if (t.link) { router.push(t.link); return; }
                        const text = t.query || t.label;
                        setQ(text);
                        router.push(`/search?q=${encodeURIComponent(text)}`);
                        run(text);
                      }}
                      style={{ background: "transparent", border: "1px solid var(--line)", color: "var(--text)", borderRadius: 20, padding: "6px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          shown.map((r) => (
            <div
              key={`${r.kind}-${r.id}`}
              onClick={() => router.push(r.link)}
              style={{
                background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12,
                padding: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 12, cursor: "pointer",
              }}
            >
              {r.thumbnail_url ? (
                <img src={r.thumbnail_url} alt="" style={{ width: 62, height: 42, objectFit: "cover", borderRadius: 7, flexShrink: 0 }} />
              ) : (
                <div style={{ width: 62, height: 42, borderRadius: 7, background: "var(--chip)", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "var(--muted)", letterSpacing: 0.4, textTransform: "uppercase" }}>
                  {r.kind_label}
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2, lineHeight: 1.4 }}>{r.title}</div>
                {r.subtitle && (
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.subtitle}
                  </div>
                )}
              </div>
              {Number(r.price) > 0 && (
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: GOLD }}>₹{r.price}</div>
                  {Number(r.original_price) > Number(r.price) && (
                    <div style={{ fontSize: 11, color: "var(--muted)", textDecoration: "line-through" }}>
                      ₹{r.original_price}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={null}>
      <SearchPageInner />
    </Suspense>
  );
}
