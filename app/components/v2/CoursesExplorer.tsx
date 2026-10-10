"use client";

// Courses page ka browser wala hissa (website redesign):
// tabs (All / Bundles / Courses / Mock Tests / Descriptive / Typing), search,
// Free/Paid, aur login wale student ke "Purchased" nishaan.
import { useEffect, useMemo, useState } from "react";
import ProductCard from "./ProductCard";
import { IconBook, IconMock, IconPen, IconKeyboard, IconSearch } from "./Icons";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";
import { KIND_LABEL, type CatalogItem, type Kind } from "./catalog";

type Tab = "all" | "bundle" | Kind;

const TABS: { id: Tab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bundle", label: "Bundles" },
  { id: "course", label: "Courses" },
  { id: "mock", label: "Mock Tests" },
  { id: "descriptive", label: "Descriptive" },
  { id: "tier2", label: "Typing/Skill Test" },
];

async function getList(path: string): Promise<any[]> {
  try {
    const r = await fetch(`${API_URL}${path}`, { cache: "no-store" });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : d?.series ?? d?.courses ?? d?.data ?? [];
  } catch {
    return [];
  }
}

const ICON: Record<Kind, React.ReactNode> = {
  course: <IconBook size={30} />,
  mock: <IconMock size={30} />,
  descriptive: <IconPen size={30} />,
  tier2: <IconKeyboard size={30} />,
};

type PriceF = "all" | "free" | "paid";

export default function CoursesExplorer({ items }: { items: CatalogItem[] }) {
  const [tab, setTabState] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const [price, setPrice] = useState<PriceF>("all");
  const [owned, setOwned] = useState<Set<string>>(new Set());

  // ?tab=mock jaisa link seedha usi tab par khule
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab") as Tab | null;
    if (t && TABS.some((x) => x.id === t)) setTabState(t);
  }, []);

  // Login ho to kharidi hui cheezon par "Purchased" (server wala data sabke liye ek hai)
  useEffect(() => {
    const uid = (getUser() as any)?.id;
    if (!uid) return;
    const u = `&user_id=${uid}`;
    Promise.all([
      getList(`/courses/?platform=web${u}`),
      getList(`/mock-tests/series?platform=web${u}`),
      getList(`/descriptive/series?platform=web${u}`),
      getList(`/tier2/series?platform=web${u}`),
    ]).then(([c, m, d, t]) => {
      const keys = new Set<string>();
      const add = (kind: Kind, arr: any[]) =>
        arr.forEach((p) => { if (p?.is_purchased || p?.purchased) keys.add(`${kind}-${Number(p.id)}`); });
      add("course", c);
      add("mock", m);
      add("descriptive", d);
      add("tier2", t);
      setOwned(keys);
    });
  }, []);

  function setTab(t: Tab) {
    setTabState(t);
    window.history.replaceState(null, "", t === "all" ? "/courses" : `/courses?tab=${t}`);
    window.scrollTo({ top: 0 });
  }

  const matched = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => {
      if (s && !i.title.toLowerCase().includes(s)) return false;
      if (price === "free" && i.price !== 0) return false;
      if (price === "paid" && i.price === 0) return false;
      return true;
    });
  }, [items, q, price]);

  // Har section ki list — bundle "Bundles" me bhi aur apne section me bhi
  const sections = useMemo(
    () =>
      TABS.filter((t) => t.id !== "all").map((t) => ({
        ...t,
        list: t.id === "bundle" ? matched.filter((i) => i.bundleSize > 1) : matched.filter((i) => i.kind === t.id),
      })),
    [matched]
  );

  const visible = tab === "all" ? sections.filter((s) => s.list.length > 0) : sections.filter((s) => s.id === tab);
  const nothing = visible.every((s) => s.list.length === 0);
  const count = (id: Tab) => (id === "all" ? matched.length : sections.find((s) => s.id === id)?.list.length ?? 0);

  return (
    <>
      <div className="v2-tabs" role="tablist" aria-label="Sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`v2-type${tab === t.id ? " on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label} <span className="n">{count(t.id)}</span>
          </button>
        ))}
      </div>

      <div className="v2-toolbar" style={{ marginTop: 12 }}>
        <label className="v2-search">
          <IconSearch size={18} />
          <span className="sr">Search</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search courses, mock tests, typing…" />
        </label>
        <div className="v2-seg" role="group" aria-label="Price">
          {(["all", "free", "paid"] as PriceF[]).map((p) => (
            <button key={p} className={price === p ? "on" : ""} aria-pressed={price === p} onClick={() => setPrice(p)}>
              {p === "all" ? "All" : p === "free" ? "Free" : "Paid"}
            </button>
          ))}
        </div>
      </div>

      {nothing ? (
        <div className="v2-empty">
          <IconBook size={40} />
          <p style={{ margin: "10px 0 0" }}>
            {items.length === 0 ? "New courses launching soon — join our Telegram for updates!" : `Nothing found${q ? ` for "${q}"` : ""}.`}
          </p>
        </div>
      ) : (
        visible.map((s) => (
          <section key={s.id} className="v2-sec" style={{ marginTop: 22 }}>
            {tab === "all" && (
              <div className="v2-head">
                <h2 className="v2-h2">
                  {s.label} <span style={{ color: "var(--v2-muted)", fontWeight: 600, fontSize: 15 }}>({s.list.length})</span>
                </h2>
                <button type="button" className="v2-more" onClick={() => setTab(s.id)} style={{ background: "none", border: 0, padding: 0, cursor: "pointer" }}>
                  See all →
                </button>
              </div>
            )}
            {s.list.length === 0 ? (
              <p className="v2-sub">Nothing here yet. Coming soon!</p>
            ) : (
              <div className="v2-grid">
                {(tab === "all" ? s.list.slice(0, 8) : s.list).map((c, k) => (
                  <ProductCard
                    key={`${s.id}-${c.key}`}
                    href={c.href}
                    title={c.title}
                    img={c.img}
                    imgMobile={c.imgMobile}
                    price={c.price}
                    original={c.original}
                    owned={c.purchased || owned.has(c.key)}
                    priority={k < 4}
                    fallback={ICON[c.kind]}
                    badge={c.bundleSize > 1 ? <span className="v2-ribbon">🎁 BUNDLE PACK · {c.bundleSize} in 1</span> : undefined}
                    meta={
                      <>
                        <span className="v2-kind">{KIND_LABEL[c.kind]}</span>
                        {c.bundleSize > 1 ? <span style={{ color: "#c2185b", fontWeight: 700 }}>{c.bundleSize} things in 1 pack — one price</span> : c.recent > 0 ? <span>{c.recent} students enrolled recently</span> : null}
                      </>
                    }
                  />
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </>
  );
}
