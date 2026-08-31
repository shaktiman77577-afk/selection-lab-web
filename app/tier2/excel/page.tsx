"use client";

/**
 * app/tier2/excel/page.tsx — Excel / CPT ka ghar.
 *
 * Teen tab: Chart (38 formula cards), Practice (38 guided questions),
 * Tests (10 mock).
 *
 * Locked cards par blur lagta hai, par asli suraksha backend me hai — locked
 * card ke syntax/example server bhejta hi nahi.
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import ThemeToggle from "@/app/components/ThemeToggle";
import Disclaimer from "@/app/components/Disclaimer";

const GOLD = "#FFAB00";

const CATS: Record<string, string> = {
  basic: "Basic",
  conditional: "Conditional",
  text: "Text",
  lookup: "Lookup",
  date: "Date",
  advanced: "Advanced",
};

export default function ExcelHub() {
  const router = useRouter();
  const [tab, setTab] = useState<"chart" | "practice" | "tests">("chart");
  const [seriesId, setSeriesId] = useState<number | null>(null);
  const [seriesTitle, setSeriesTitle] = useState("");
  const [purchased, setPurchased] = useState(false);

  const [cards, setCards] = useState<any[]>([]);
  const [practice, setPractice] = useState<any[]>([]);
  const [tests, setTests] = useState<any[]>([]);
  const [weak, setWeak] = useState<any[]>([]);

  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const uid = (getUser() as any)?.id;

  // Series dhoondho — abhi ek hi hoti hai, isliye pehli le lete hain
  useEffect(() => {
    fetch(`${API_URL}/tier2/series?platform=web${uid ? `&user_id=${uid}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        const s = (d?.series || [])[0];
        if (!s) { setError("Tier 2 series is not available yet."); setLoading(false); return; }
        setSeriesId(s.id);
        setSeriesTitle(s.title);
      })
      .catch(() => { setError("Could not load."); setLoading(false); });
  }, [uid]);

  const load = useCallback(() => {
    if (!seriesId) return;
    const u = uid ? `&user_id=${uid}` : "";
    Promise.all([
      fetch(`${API_URL}/tier2/excel/chart?series_id=${seriesId}${u}`).then((r) => r.json()),
      fetch(`${API_URL}/tier2/excel/practice?series_id=${seriesId}${u}`).then((r) => r.json()),
      fetch(`${API_URL}/tier2/excel/tests?series_id=${seriesId}${u}`).then((r) => r.json()),
    ])
      .then(([c, p, t]) => {
        setCards(c?.cards || []);
        setPurchased(!!c?.is_purchased);
        setPractice(p?.questions || []);
        setTests(t?.tests || []);
      })
      .catch(() => setError("Could not load."))
      .finally(() => setLoading(false));

    if (uid) {
      fetch(`${API_URL}/tier2/excel/progress?user_id=${uid}`)
        .then((r) => r.json())
        .then((d) => setWeak(d?.weak || []))
        .catch(() => {});
    }
  }, [seriesId, uid]);

  useEffect(() => { load(); }, [load]);

  const shown = cards.filter((c) => {
    if (cat !== "all" && c.category !== cat) return false;
    if (!q.trim()) return true;
    const s = q.trim().toLowerCase();
    return (c.name || "").toLowerCase().includes(s) ||
           (c.what_en || "").toLowerCase().includes(s) ||
           (c.what_hi || "").toLowerCase().includes(s);
  });

  const doneCount = practice.filter((p) => p.done).length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--header)", backdropFilter: "blur(8px)", borderBottom: "1px solid var(--line)" }}>
        <button
          onClick={() => { try { router.back(); } catch { router.push("/tier2"); } }}
          aria-label="Back"
          style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 4 }}
        >←</button>
        <div style={{ fontWeight: 800, fontSize: 17, flex: 1 }}>Excel / CPT</div>
        <ThemeToggle />
      </header>

      <div style={{ display: "flex", gap: 6, padding: "10px 14px 0", maxWidth: 900, margin: "0 auto" }}>
        {(["chart", "practice", "tests"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer",
              border: `1px solid ${tab === t ? GOLD : "var(--line)"}`,
              background: tab === t ? GOLD : "transparent",
              color: tab === t ? "#1a1a1a" : "var(--text)",
            }}
          >
            {t === "chart" ? "Formula chart" : t === "practice" ? "Practice" : "Tests"}
          </button>
        ))}
      </div>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "14px 14px 40px" }}>
        <Disclaimer compact />

        {error ? <p style={{ color: "#c0392b", fontSize: 14 }}>{error}</p> : null}
        {loading ? <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p> : null}

        {/* ═══ CHART ═══ */}
        {!loading && tab === "chart" && (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search a formula…"
                style={{ flex: 1, minWidth: 150, padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", fontSize: 14 }}
              />
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--line)", background: "var(--card)", color: "var(--text)", fontSize: 14 }}
              >
                <option value="all">All</option>
                {Object.entries(CATS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            {purchased && uid && (
              <a
                href={`${API_URL}/tier2/excel/chart/pdf/${seriesId}?user_id=${uid}`}
                style={{ display: "block", textAlign: "center", background: GOLD, color: "#1a1a1a", borderRadius: 12, padding: "12px 0", fontWeight: 800, fontSize: 14, textDecoration: "none", marginBottom: 14 }}
              >
                ⬇️ Download the full chart as a PDF
              </a>
            )}

            {shown.map((c) => (
              <div
                key={c.id}
                onClick={() => setOpen(open === c.id ? null : c.id)}
                style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 13, marginBottom: 10, cursor: "pointer" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontFamily: "Consolas, monospace", fontWeight: 800, fontSize: 14.5, color: GOLD }}>{c.name}</span>
                  <span style={{ fontSize: 10, color: "var(--muted)", border: "1px solid var(--line)", borderRadius: 6, padding: "1px 6px" }}>
                    {CATS[c.category] || c.category}
                  </span>
                  <span style={{ flex: 1 }} />
                  {!c.unlocked && <span style={{ fontSize: 13 }}>🔒</span>}
                </div>
                <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 5, lineHeight: 1.55 }}>
                  {c.what_hi || c.what_en}
                </div>

                {c.unlocked ? (
                  open === c.id && (
                    <div style={{ marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
                      <div style={{ fontFamily: "Consolas, monospace", fontSize: 12.5, color: "var(--text)", background: "var(--chip)", padding: "8px 10px", borderRadius: 8, overflowX: "auto" }}>
                        {c.syntax}
                      </div>
                      <div style={{ fontFamily: "Consolas, monospace", fontSize: 12.5, color: "var(--muted)", marginTop: 8, overflowX: "auto" }}>
                        {c.example} → {c.example_result}
                      </div>
                      {(c.warning_hi || c.warning_en) && (
                        <div style={{ fontSize: 12, color: "#a04000", marginTop: 8, lineHeight: 1.55 }}>
                          ⚠️ {c.warning_hi || c.warning_en}
                        </div>
                      )}
                      {c.practice_question_id ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/excel-practice/${c.practice_question_id}`); }}
                          style={{ marginTop: 12, background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 9, padding: "9px 16px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
                        >
                          Practice →
                        </button>
                      ) : null}
                    </div>
                  )
                ) : (
                  <div style={{ marginTop: 10, borderTop: "1px solid var(--line)", paddingTop: 10, position: "relative" }}>
                    <div style={{ filter: "blur(4px)", userSelect: "none", pointerEvents: "none", fontFamily: "Consolas, monospace", fontSize: 12.5, color: "var(--muted)" }}>
                      =XXXXXX(range, criteria)<br />=XXXXXX(A2:A9, "North") → 1234
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); router.push("/tier2"); }}
                      style={{ position: "absolute", inset: 0, margin: "auto", height: 34, background: "var(--card)", border: `1px solid ${GOLD}`, color: GOLD, borderRadius: 8, padding: "0 14px", fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}
                    >
                      🔒 Unlock
                    </button>
                  </div>
                )}
              </div>
            ))}
            {shown.length === 0 && !loading && (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Nothing found.</p>
            )}
          </>
        )}

        {/* ═══ PRACTICE ═══ */}
        {!loading && tab === "practice" && (
          <>
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 13, marginBottom: 14 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700 }}>{doneCount} / {practice.length} formulas done</div>
              <div style={{ height: 7, background: "var(--chip)", borderRadius: 4, marginTop: 8, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${practice.length ? (doneCount / practice.length) * 100 : 0}%`, background: GOLD }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 8, lineHeight: 1.6 }}>
                No timer, no penalty. Try as many times as you like, and ask for a hint whenever you need one.
              </div>
            </div>

            {weak.length > 0 && (
              <div style={{ background: "rgba(192,57,43,0.08)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: 12, padding: 12, marginBottom: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 800, marginBottom: 6 }}>Weak in your recent tests</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {weak.map((w) => (
                    <span key={w.concept} style={{ fontSize: 11.5, fontFamily: "Consolas, monospace", border: "1px solid var(--line)", borderRadius: 6, padding: "3px 8px" }}>
                      {w.concept} {w.pct}%
                    </span>
                  ))}
                </div>
              </div>
            )}

            {[...practice].sort((a, b) => (b.unlocked !== false ? 1 : 0) - (a.unlocked !== false ? 1 : 0)).map((p) => {
              const open = p.unlocked !== false;
              return (
                <div
                  key={p.id}
                  onClick={() => open ? router.push(`/excel-practice/${p.id}`) : router.push("/tier2")}
                  style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", opacity: open ? 1 : 0.6 }}
                >
                  <span style={{ fontSize: 16 }}>{open ? (p.done ? "✅" : "⬜") : "🔒"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "Consolas, monospace", fontWeight: 800, fontSize: 13.5, color: GOLD }}>
                      {p.concept}
                      {open && !purchased ? (
                        <span style={{ fontSize: 9.5, fontWeight: 800, color: "#2e8b4a", border: "1px solid #2e8b4a", borderRadius: 5, padding: "1px 5px", marginLeft: 6, fontFamily: "inherit" }}>FREE</span>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.instruction_hi || p.instruction_en}
                    </div>
                  </div>
                  <span style={{ color: "var(--muted)" }}>›</span>
                </div>
              );
            })}
            {practice.length === 0 && <p style={{ color: "var(--muted)", fontSize: 14 }}>Practice questions coming soon.</p>}
          </>
        )}

        {/* ═══ TESTS ═══ */}
        {!loading && tab === "tests" && (
          <>
            {tests.map((t) => (
              <div key={t.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: "var(--chip)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 15, color: GOLD, flexShrink: 0 }}>
                  {t.mock_number || "•"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700 }}>
                    {t.title}
                    {t.is_free ? <span style={{ fontSize: 10, color: "#2e8b4a", border: "1px solid #2e8b4a", borderRadius: 6, padding: "1px 6px", marginLeft: 6 }}>FREE</span> : null}
                  </div>
                  <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
                    {t.total_questions} questions · {t.duration_min} min · pass {t.pass_marks}
                    {t.best ? ` · best ${t.best.score}/${t.best.total}` : ""}
                  </div>
                </div>
                {t.unlocked ? (
                  <button
                    onClick={() => router.push(`/excel-test/${t.id}`)}
                    style={{ background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 9, padding: "9px 16px", fontWeight: 800, fontSize: 12.5, cursor: "pointer", flexShrink: 0 }}
                  >
                    Start
                  </button>
                ) : (
                  <span style={{ fontSize: 13, color: "var(--muted)" }}>🔒</span>
                )}
              </div>
            ))}
            {tests.length === 0 && <p style={{ color: "var(--muted)", fontSize: 14 }}>Mock tests coming soon.</p>}
          </>
        )}
      </main>
    </div>
  );
}
