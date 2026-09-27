/**
 * lib/seo.ts — har page ka title, description, preview image aur Google schema.
 *
 * KYUN:
 * Course / series ke pages "use client" hain — browser me khulne ke baad data
 * laate hain. WhatsApp, Telegram aur Google usse pehle hi padh lete hain, isliye
 * har link par sirf "Selection Lab" ka common title aur logo aata tha, aur
 * og:url har page par homepage hota tha (Google ko lagta tha sab pages ek hi hain).
 * Ab har route ka server hissa (layout.tsx / page.tsx) yahan se metadata banata hai.
 */
import type { Metadata } from "next";

export const SITE = "https://www.selectionlab.in";
export const API = "https://api.selectionlab.online/api";
export const DEFAULT_IMAGE = "/og-image.png";

export type ShareKind = "course" | "mock" | "tier2" | "descriptive";
export type ShareInfo = {
  kind: ShareKind; id: number; title: string; description: string; image: string | null;
  price: number; original_price: number | null; items: number; course_type?: string | null;
  validity_days?: number | null; updated_at?: string | null; indexable: boolean;
};

/** Backend /api/share — 10 minute cache. Na mile to null (page phir bhi khulta hai). */
export async function getShare(kind: ShareKind, id: string | number): Promise<ShareInfo | null> {
  const n = Number(id);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    const r = await fetch(`${API}/share/${kind}/${n}`, { next: { revalidate: 600 } });
    if (!r.ok) return null;
    return (await r.json()) as ShareInfo;
  } catch {
    return null;
  }
}

const rupee = (v: number) => `₹${Math.round(v).toLocaleString("en-IN")}`;

export function priceLine(s: ShareInfo): string {
  if (!s.price) return "Free";
  return s.original_price ? `${rupee(s.price)} (MRP ${rupee(s.original_price)})` : rupee(s.price);
}

const KIND_WORD: Record<ShareKind, string> = {
  course: "Course", mock: "Mock Test Series", tier2: "Typing / Skill Test Series", descriptive: "Descriptive Test Series",
};
const ITEM_WORD: Record<ShareKind, string> = { course: "", mock: "mock tests", tier2: "tests", descriptive: "tests" };

/** Preview / Google description — 155 akshar ke andar, kaam ki baat pehle. */
export function shareDescription(s: ShareInfo): string {
  const bits: string[] = [];
  if (s.items && ITEM_WORD[s.kind]) bits.push(`${s.items} ${ITEM_WORD[s.kind]}`);
  bits.push(s.price ? `Price ${priceLine(s)}` : "Free");
  const head = bits.join(" · ") + ". ";
  const body = s.description || `${KIND_WORD[s.kind]} on Selection Lab — real exam interface, Hindi + English.`;
  const t = head + body;
  return t.length > 158 ? t.slice(0, 155).replace(/\s+\S*$/, "") + "…" : t;
}

/** Backend ka preview card. ?v= se naam/price/image badalte hi naya URL — purana cache nahi chalega. */
export function cardUrl(s: ShareInfo): string {
  const v = [s.title, s.price, s.original_price, s.image, s.items, s.updated_at].join("|");
  let h = 0;
  for (let i = 0; i < v.length; i++) h = (h * 31 + v.charCodeAt(i)) >>> 0;
  return `${API}/share/${s.kind}/${s.id}/card.jpg?v=${h.toString(36)}`;
}

/** Ek jagah se poora Metadata — title, description, canonical, OG, Twitter, robots. */
export function pageMeta(o: {
  title: string; description: string; path: string; image?: string | null; noindex?: boolean; type?: "website" | "article";
  card?: boolean;          // image apna 1200x630 preview card hai (size pakka pata hai)
}): Metadata {
  const image = o.image || DEFAULT_IMAGE;
  return {
    title: o.title,
    description: o.description,
    alternates: { canonical: o.path },
    openGraph: {
      type: o.type || "website",
      url: o.path,
      siteName: "Selection Lab",
      title: o.title,
      description: o.description,
      // Apni default image 1200x630 hai; course ki thumbnail ka size pata nahi, to size nahi likhte
      images: [o.image && !o.card ? { url: image, alt: o.title } : { url: image, width: 1200, height: 630, alt: o.title, type: "image/jpeg" }],
      locale: "en_IN",
    },
    twitter: { card: "summary_large_image", title: o.title, description: o.description, images: [image] },
    robots: o.noindex ? { index: false, follow: true } : { index: true, follow: true },
  };
}

/** Test dene / result / login jaise pages — Google me nahi aane chahiye. */
export function privateMeta(title: string): Metadata {
  return { title, robots: { index: false, follow: false } };
}

export function shareMeta(s: ShareInfo | null, path: string, fallbackTitle: string): Metadata {
  // Data na mila (API thodi der band / deploy ke beech) — saada title, par
  // noindex NAHI, warna ek chhoti gadbad se Google page ko hata sakta hai.
  if (!s) return pageMeta({ title: fallbackTitle, description: "Selection Lab — government exam preparation with real exam-interface tests in Hindi and English.", path });
  return pageMeta({
    title: `${s.title}${s.price ? ` — ${priceLine(s).split(" ")[0]}` : " — Free"}`,
    description: shareDescription(s),
    path,
    // Thumbnail seedha nahi — wo aksar 2-3 MB ki khadi PNG hoti hai jise WhatsApp /
    // Telegram chhod dete hain. Backend usse 1200x630 ka ~50 KB card banata hai.
    image: cardUrl(s),
    card: true,
    noindex: !s.indexable,
  });
}

/** Google ke liye structured data. Course = Course schema, series = Product + Offer. */
export function shareJsonLd(s: ShareInfo | null, path: string): string | null {
  if (!s) return null;
  const url = SITE + path;
  const offer = {
    "@type": "Offer", price: String(s.price || 0), priceCurrency: "INR", availability: "https://schema.org/InStock",
    url, category: s.price ? "Paid" : "Free",
  };
  const provider = { "@type": "Organization", name: "Selection Lab", sameAs: SITE };
  const data: any[] = [
    s.kind === "course"
      ? {
          "@context": "https://schema.org", "@type": "Course", name: s.title,
          description: s.description || shareDescription(s), provider, url,
          image: s.image || SITE + DEFAULT_IMAGE, inLanguage: ["en", "hi"],
          offers: offer,
          hasCourseInstance: { "@type": "CourseInstance", courseMode: "Online", courseWorkload: "PT1H" },
        }
      : {
          "@context": "https://schema.org", "@type": "Product", name: s.title,
          description: s.description || shareDescription(s), url,
          image: s.image || SITE + DEFAULT_IMAGE, brand: { "@type": "Brand", name: "Selection Lab" },
          category: KIND_WORD[s.kind], offers: offer,
        },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: s.kind === "course" ? "Courses" : s.kind === "mock" ? "Mock Tests" : s.kind === "tier2" ? "Typing / Skill Test" : "Descriptive", item: SITE + (s.kind === "course" ? "/courses" : s.kind === "mock" ? "/mock-tests" : s.kind === "tier2" ? "/tier2" : "/descriptive") },
        { "@type": "ListItem", position: 3, name: s.title, item: url },
      ],
    },
  ];
  // "</script>" jaisa text JSON me ho to bhi script tag na toote
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
