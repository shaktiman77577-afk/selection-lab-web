// Descriptive series list - website redesign (Oct 2026). SEO app/descriptive/layout.tsx me.
// Khareedne ka logic DescriptiveList me, purane page jaisa hi.
import Link from "next/link";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import DescriptiveList from "@/app/components/v2/DescriptiveList";
import { getDescriptiveSeriesServer } from "@/lib/serverApi";

export const revalidate = 60;

export default async function DescriptivePage() {
  const series = await getDescriptiveSeriesServer();
  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <nav className="v2-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <span style={{ color: "var(--text)", fontWeight: 700 }}>Descriptive</span>
        </nav>
        <div style={{ paddingTop: 10 }}>
          <h1 className="v2-h1">Descriptive Writing Practice</h1>
          <p className="v2-sub">
            Essay, Précis and Letter writing tests. Write against the clock, then compare with a model answer and your auto-score.
          </p>
        </div>
        <div style={{ marginTop: 22 }}>
          <DescriptiveList initial={series} />
        </div>
      </main>
      <SiteFooter />
    </V2Shell>
  );
}
