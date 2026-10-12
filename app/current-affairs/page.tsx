// /current-affairs — Current Affairs (CA Pass): one-liners, quiz, PDF.
//
// ABHI CHHUPA HUA HAI (Oct 2026): homepage / header me link nahi, Google ke
// liye noindex + robots.ts me disallow. Sirf seedhe link se khulta hai.
// Launch ke waqt: privateMeta ko pageMeta karo, robots.ts se "/current-affairs"
// hatao, aur SiteHeader / homepage me link jodo.
//
// Data: page server par hi mahino ki list + chuna hua mahina le kar banta hai
// (60 second cache), isliye khulte hi mahine, din, block aur pehle cards dikhte
// hain. Poore cards login wale student ke liye browser turant mangta hai —
// login/CA Pass wala content public HTML me nahi daal sakte, warna 31 Dec ke
// baad paid content bina kharide sabko dikh jaata.
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import { privateMeta } from "@/lib/seo";
import { API_URL } from "@/lib/config";
import CAClient from "./CAClient";

export const metadata = privateMeta("Current Affairs — Daily One-Liners, Quiz & PDF (English + Hindi)");

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
      <CAClient home={home} initialMonth={month} initialData={first} initialBlock={b >= 1 && b <= 10 ? b : 0}
        initialDay={d} />
      <SiteFooter />
    </V2Shell>
  );
}
