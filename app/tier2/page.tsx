// /tier2 aur /tier2?s=4 — Typing / Skill Test.
// Asli page Tier2Client.tsx ("use client") hai. Ye server hissa sirf isliye
// hai ki link preview (WhatsApp / Telegram) aur Google ko series ka naam, image
// aur price mile — ?s= query layout.tsx tak pahunchti hi nahi, page tak aati hai.
import type { Metadata } from "next";
import Tier2Client from "./Tier2Client";
import { getShare, pageMeta, shareJsonLd, shareMeta } from "@/lib/seo";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function seriesId(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const s = seriesId((await searchParams).s);
  if (s) return shareMeta(await getShare("tier2", s), `/tier2?s=${s}`, "Typing / Skill Test");
  return pageMeta({
    title: "Typing & Skill Test Series — Court Clerk, SSC, NBEMS",
    description:
      "Typing test practice on the real exam pattern for High Court and university clerk, SSC and NBEMS — live WPM, mistake highlighting, Excel and CPT skill tests.",
    path: "/tier2",
  });
}

export default async function Page({ searchParams }: Props) {
  const s = seriesId((await searchParams).s);
  const ld = s ? shareJsonLd(await getShare("tier2", s), `/tier2?s=${s}`) : null;
  return (
    <>
      {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld }} />}
      <Tier2Client />
    </>
  );
}
