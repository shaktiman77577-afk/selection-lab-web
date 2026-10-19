// /current-affairs — Current Affairs (CA Pass): one-liners, quiz, PDF.
//
// LIVE (14 Oct 2026): Google me khula (index), sitemap me, homepage tile +
// header + ☰ menu me link. Latest din bina login ke padhne ko — wahi Google
// bhi dekhta hai. Baaki din / block quiz / PDF plan se. Paid content public
// HTML me kabhi nahi jaata (server bina login ke mangta hai), isliye Google
// aur student ek hi cheez dekhte hain — cloaking nahi, paywall markup ki zaroorat nahi.
//
// Data: page server par hi mahino ki list + chuna hua mahina le kar banta hai
// (60 second cache), isliye khulte hi mahine, din, block aur pehle cards dikhte
// hain. Poore cards login wale student ke liye browser turant mangta hai —
// plan wala content public HTML me nahi daal sakte, warna paid content bina
// kharide sabko (aur Google ko) dikh jaata.
//
// BAND (19 Oct 2026): lib/config.ts me SHOW_CURRENT_AFFAIRS = false — page par sirf
// "Coming soon" (Google ke liye noindex), saare links hate. true karte hi pehle jaisa.
import Link from "next/link";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import type { Metadata } from "next";
import { pageMeta, SITE } from "@/lib/seo";
import { API_URL, SHOW_CURRENT_AFFAIRS } from "@/lib/config";
import CAClient from "./CAClient";

const TITLE = "Daily Current Affairs 2026 in Hindi & English — One-Liners, Quiz & PDF | Selection Lab";
const DESC = "Daily current affairs one-liners in English and Hindi for SSC, Railway, Banking, State PCS, Police and court exams — " +
  "today's news free, block-wise quizzes with full explanations and monthly PDF magazines (Quick Revision, Detailed Notes, MCQ).";

// ?m= / ?b= / ?d= wale sab ek hi page ke roop — canonical hamesha /current-affairs
// (warna Google ko ek jaise dasiyon URL dikhte).
export const metadata: Metadata = SHOW_CURRENT_AFFAIRS
  ? pageMeta({ title: TITLE, description: DESC, path: "/current-affairs" })
  : { title: "Current Affairs — Coming soon", robots: { index: false, follow: true } };

const MN = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
  "November", "December"];

/** Google ke liye: ye roz badalne wala educational page hai, aur aaj ke one-liners ki list. */
function jsonLd(home: any, data: any): string {
  const latest: string = home?.recent_dates?.[0]?.date || "";
  const cards: any[] = (data?.cards || []).filter((c: any) => !latest || String(c.ca_date).slice(0, 10) === latest).slice(0, 30);
  const url = `${SITE}/current-affairs`;
  const day = latest ? `${Number(latest.slice(8, 10))} ${MN[Number(latest.slice(5, 7)) - 1]} ${latest.slice(0, 4)}` : "";
  const graph: any[] = [
    {
      "@type": "CollectionPage", "@id": url, url, name: "Daily Current Affairs — English + Hindi",
      description: DESC, inLanguage: ["en", "hi"],
      ...(latest ? { dateModified: latest } : {}),
      isPartOf: { "@type": "WebSite", name: "Selection Lab", url: SITE },
      publisher: { "@type": "Organization", name: "Selection Lab", url: SITE, logo: `${SITE}/logo.png` },
      about: ["Current Affairs", "General Knowledge", "Government exams"],
      ...(cards.length ? { mainEntity: {
        "@type": "ItemList", name: `Current Affairs — ${day}`, numberOfItems: cards.length,
        itemListElement: cards.map((c, i) => ({
          "@type": "ListItem", position: i + 1,
          name: `${String(c.stem_en || "").replace(/[\s—–-]+$/, "")} — ${c.answer_en || ""}`.slice(0, 300),
        })),
      } } : {}),
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Current Affairs", item: url },
      ],
    },
  ];
  return JSON.stringify({ "@context": "https://schema.org", "@graph": graph }).replace(/</g, "\\" + "u003c");
}

async function get(path: string): Promise<any> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export default async function CurrentAffairsPage({ searchParams }: {
  searchParams: Promise<{ m?: string; b?: string; d?: string }>;
}) {
  if (!SHOW_CURRENT_AFFAIRS) {
    return (
      <V2Shell>
        <SiteHeader />
        <main className="v2-wrap v2-main" style={{ minHeight: "50vh", textAlign: "center", paddingTop: 48 }}>
          <h1 className="v2-h1">Current Affairs</h1>
          <p style={{ color: "var(--muted)", marginTop: 10 }}>Coming soon. Meanwhile, practise with our mock tests.</p>
          <p style={{ marginTop: 18 }}>
            <Link href="/mock-tests" className="v2-btn v2-btn-gold">Go to Mock Tests</Link>
          </p>
        </main>
        <SiteFooter />
      </V2Shell>
    );
  }
  const sp = await searchParams;
  const home = (await get("/ca/home")) || { months: [], recent_dates: [], blocks: {}, access: null };
  const months: string[] = (home.months || []).map((m: any) => m.month);
  const month = sp.m && months.includes(sp.m) ? sp.m : months[0] || "";
  const first = month ? await get(`/ca/month/${month}`) : null;
  const b = Number(sp.b || 0);
  const d = sp.d && /^\d{4}-\d{2}-\d{2}$/.test(sp.d) && sp.d.startsWith(month) ? sp.d : "";

  return (
    <V2Shell>
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(home, first) }} />
      <CAClient home={home} initialMonth={month} initialData={first} initialBlock={b >= 1 && b <= 10 ? b : 0}
        initialDay={d} />
      <SiteFooter />
    </V2Shell>
  );
}
