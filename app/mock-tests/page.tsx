// Mock tests list - website redesign (Oct 2026). SEO app/mock-tests/layout.tsx me.
import Link from "next/link";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import MockSeriesGrid from "@/app/components/v2/MockSeriesGrid";
import { getMockSeriesServer } from "@/lib/serverApi";

export const revalidate = 60;

export default async function MockTestsPage() {
  const series = await getMockSeriesServer();
  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <nav className="v2-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <span style={{ color: "var(--text)", fontWeight: 700 }}>Mock Tests</span>
        </nav>
        <div style={{ paddingTop: 10 }}>
          <h1 className="v2-h1">Mock Tests</h1>
          <p className="v2-sub">Real exam interface — palette, timer, sections and negative marking. Free tests in every series.</p>
        </div>
        <MockSeriesGrid initial={series} />
      </main>
      <SiteFooter />
    </V2Shell>
  );
}
