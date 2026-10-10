// Courses page ke items - server (page.tsx) aur browser (CoursesExplorer) dono
// yahi use karte hain, isliye "use client" file se alag rakha hai.

export type Kind = "course" | "mock" | "descriptive" | "tier2";

export type CatalogItem = {
  key: string;
  kind: Kind;
  id: number;
  title: string;
  img: string;
  imgMobile?: string;
  price: number;
  original: number;
  purchased: boolean;
  bundleSize: number;
  recent: number;
  href: string;
};

export const KIND_LABEL: Record<Kind, string> = {
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

// Server aur browser dono yahi use karte hain (page.tsx se bhi)
export function toItem(kind: Kind, p: any): CatalogItem {
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
    title: kind === "course" ? (p.title || p.name || "Course") : p.title || p.name || KIND_LABEL[kind],
    img: kind === "course" ? (p.thumbnail_url || p.thumbnail || p.image_url || "") : p.thumbnail_url || "",
    imgMobile: p.thumbnail_url_mobile || undefined,
    price: Number(p.price) || 0,
    original: Number(p.original_price) || 0,
    purchased: !!(p.is_purchased || p.purchased),
    bundleSize: bundleCount(p),
    recent: Number(p.recent_buyers) || 0,
    href,
  };
}
