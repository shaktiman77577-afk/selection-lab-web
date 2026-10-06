"use client";

/**
 * Courses page — ab yahan SAB kuch ek jagah dikhta hai:
 * Bundles, Courses, Mock Tests, Descriptive aur Typing/Skill Test.
 *
 * - "All" tab: har section apni heading ke saath, ek ke neeche ek.
 * - Baaki tabs: sirf wahi section.
 * - Bundle apne aap pehchana jaata hai: jis product ke bundle_items me
 *   ek se zyada cheezein judi hon (descriptive me bundle_series_ids bhi ginte
 *   hain). Bundle sirf Bundles section me aata hai, dobara nahi.
 * - Card par click → us product ka apna page, jahan uska content dikhta hai.
 */

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ThemeToggle from "@/app/components/ThemeToggle";
import SideMenu from "@/app/components/SideMenu";
import { getCourses, courseTitle, courseImage } from "@/lib/supabase";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";

const GOLD = "#FFAB00";
const GREEN = "#2e8b4a";

type Kind = "course" | "mock" | "descriptive" | "tier2";
type Tab = "all" | "bundle" | Kind;

type Item = {
  key: string;
  kind: Kind;
  id: number;
  title: string;
  image: string;
  price: number;
  original: number;
  purchased: boolean;
  bundle: boolean;
  href: string;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bundle", label: "Bundles" },
  { id: "course", label: "Courses" },
  { id: "mock", label: "Mock Tests" },
  { id: "descriptive", label: "Descriptive" },
  { id: "tier2", label: "Typing/Skill Test" },
];

const KIND_LABEL: Record<Kind, string> = {
  course: "Course",
  mock: "Mock Test Series",
  descriptive: "Descriptive",
  tier2: "Typing/Skill Test",
};

/** bundle_items kabhi list, kabhi JSON string aata hai — dono sambhalte hain. */
function bundleCount(p: any): number {
  let raw = p?.bundle_items;
  if (typeof raw === "string") {
    try { raw = JSON.parse(raw); } catch { raw = []; }
  }
  if (raw && !Array.isArray(raw) && typeof raw === "object") raw = [raw];
  const items = Array.isArray(raw) ? raw.length : 0;
  const series = Array.isArray(p?.bundle_series_ids) ? p.bundle_series_ids.length : 0;
  return items + series;
}

function toItem(kind: Kind, p: any): Item {
  const id = Number(p.id);
  const href =
    kind === "course" ? `/course/${id}`
    : kind === "mock" ? `/mock-tests/${id}`
    : kind === "descriptive" ? `/descriptive/${id}`
    : `/tier2?s=${id}`;
  return {
    key: `${kind}-${id}`,
    kind,
    id,
    title: kind === "course" ? courseTitle(p) : p.title || p.name || KIND_LABEL[kind],
    image: kind === "course" ? courseImage(p) : p.thumbnail_url || p.thumbnail_url_mobile || "",
    price: Number(p.price) || 0,
    original: Number(p.original_price) || 0,
    purchased: !!(p.is_purchased || p.purchased),
    bundle: bundleCount(p) > 1,
    href,
  };
}

async function getList(path: string): Promise<any[]> {
  try {
    const r = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : d?.series ?? d?.data ?? [];
  } catch {
    return [];
  }
}

export default function CoursesPage() {
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTabState] = useState<Tab>("all");
  const [menuOpen, setMenuOpen] = useState(false);

  // ?tab=mock jaisa link seedha usi tab par khule
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && TABS.some((x) => x.id === t)) setTabState(t);
  }, []);

  function setTab(t: Tab) {
    setTabState(t);
    const url = t === "all" ? "/courses" : `/courses?tab=${t}`;
    window.history.replaceState(null, "", url);
    window.scrollTo({ top: 0 });
  }

  useEffect(() => {
    const uid = (getUser() as any)?.id;
    const u = uid ? `&user_id=${uid}` : "";
    Promise.all([
      getCourses(),
      getList(`/mock-tests/series?platform=web${u}`),
      getList(`/descriptive/series?platform=web${u}`),
      getList(`/tier2/series?platform=web${u}`),
    ]).then(([courses, mocks, desc, tier2]) => {
      setItems([
        ...courses.map((c) => toItem("course", c)),
        ...mocks.map((s) => toItem("mock", s)),
        ...desc.map((s) => toItem("descriptive", s)),
        ...tier2.map((s) => toItem("tier2", s)),
      ]);
      setLoading(false);
    });
  }, []);

  const matched = useMemo(() => {
    const s = q.trim().toLowerCase();
    return s ? items.filter((i) => i.title.toLowerCase().includes(s)) : items;
  }, [items, q]);

  // Har section ki list — bundle sirf Bundles me
  const sections = useMemo(() => {
    const pick = (id: Tab): Item[] =>
      id === "bundle" ? matched.filter((i) => i.bundle)
      : matched.filter((i) => i.kind === id && !i.bundle);
    return TABS.filter((t) => t.id !== "all").map((t) => ({ ...t, list: pick(t.id) }));
  }, [matched]);

  const visible = tab === "all" ? sections.filter((s) => s.list.length > 0) : sections.filter((s) => s.id === tab);
  const nothing = visible.every((s) => s.list.length === 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <header
        style={{ position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "var(--header)", borderBottom: "1px solid var(--line)" }}
      >
        <button onClick={() => setMenuOpen(true)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 4 }}>
          ☰
        </button>
        <div style={{ fontWeight: 800, fontSize: 17, flex: 1 }}>Courses</div>
        <ThemeToggle />
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "14px 16px 40px" }}>
        <input
          placeholder="🔍 Search courses, mock tests, typing..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          style={{
            width: "100%", boxSizing: "border-box", background: "var(--chip)",
            border: "1px solid var(--line)", color: "var(--text)", borderRadius: 12,
            padding: "12px 14px", fontSize: 14, outline: "none",
          }}
        />

        {/* Tabs — phone par side me scroll hote hain */}
        <div style={{ display: "flex", gap: 8, margin: "12px -16px 16px", padding: "0 16px 4px", overflowX: "auto", scrollbarWidth: "none" }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: "0 0 auto", padding: "8px 16px", borderRadius: 20, fontSize: 13, fontWeight: 800,
                cursor: "pointer", whiteSpace: "nowrap",
                border: `1px solid ${tab === t.id ? GOLD : "var(--line)"}`,
                background: tab === t.id ? GOLD : "var(--chip)",
                color: tab === t.id ? "#1a1a1a" : "var(--text)",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: "var(--muted)" }}>Loading...</p>
        ) : nothing ? (
          <p style={{ color: "var(--muted)" }}>
            Nothing found{q ? ` for "${q}"` : ""}. New courses launching soon!
          </p>
        ) : (
          visible.map((s) => (
            <section key={s.id} style={{ marginBottom: 26 }}>
              {(tab === "all" || s.list.length > 0) && (
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "0 0 10px" }}>
                  <h2 style={{ fontSize: 16, fontWeight: 800, margin: 0, flex: 1 }}>
                    {s.id === "bundle" ? "🎁 " : ""}{s.label}
                    <span style={{ color: "var(--muted)", fontWeight: 600, fontSize: 13 }}> ({s.list.length})</span>
                  </h2>
                  {tab === "all" && (
                    <button
                      onClick={() => setTab(s.id)}
                      style={{ background: "none", border: "none", color: GOLD, fontWeight: 800, fontSize: 13, cursor: "pointer", padding: 0 }}
                    >
                      See all →
                    </button>
                  )}
                </div>
              )}
              {s.list.length === 0 ? (
                <p style={{ color: "var(--muted)", fontSize: 14 }}>Nothing here yet. Coming soon!</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))", gap: 12 }}>
                  {s.list.map((c) => (
                    <Card key={c.key} c={c} onOpen={() => router.push(c.href)} />
                  ))}
                </div>
              )}
            </section>
          ))
        )}
      </main>
    </div>
  );
}

function Card({ c, onOpen }: { c: Item; onOpen: () => void }) {
  return (
    <div
      onClick={onOpen}
      style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, overflow: "hidden", cursor: "pointer", boxShadow: "var(--shadow)", display: "flex", flexDirection: "column" }}
    >
      <div style={{ width: "100%", aspectRatio: "16 / 9", background: "var(--chip)", overflow: "hidden" }}>
        {c.image && <img src={c.image} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </div>
      <div style={{ padding: 10, display: "flex", flexDirection: "column", flex: 1 }}>
        <div style={{ fontSize: 10.5, fontWeight: 800, color: GOLD, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 }}>
          {c.bundle ? "Bundle · " : ""}{KIND_LABEL[c.kind]}
        </div>
        <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, minHeight: 36, overflow: "hidden", flex: 1 }}>{c.title}</div>
        <div style={{ marginTop: 6, fontSize: 13.5 }}>
          {c.purchased ? (
            <b style={{ color: GREEN }}>✓ Purchased</b>
          ) : c.price === 0 ? (
            <b style={{ color: GREEN }}>FREE</b>
          ) : (
            <>
              <b style={{ color: GOLD }}>₹{c.price}</b>
              {c.original > c.price && (
                <span style={{ color: "var(--muted)", textDecoration: "line-through", fontSize: 11.5, marginLeft: 5 }}>₹{c.original}</span>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
