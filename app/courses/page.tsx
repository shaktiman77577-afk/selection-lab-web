// Courses page - website redesign (Oct 2026), current repo ke saath mila hua.
//
// Yahan SAB kuch ek jagah: Bundles, Courses, Mock Tests, Descriptive aur
// Typing/Skill Test, upar tabs ke saath ("?tab=mock" wala link seedha usi tab
// par khulta hai). Bundle apne aap pehchana jata hai (bundle_items me ek se
// zyada cheezein) aur har jagah "BUNDLE PACK · N in 1" ribbon lagta hai.
//
// Data server par aata hai (60 sec cache) taaki page turant dikhe; login wale
// student ke "Purchased" nishaan browser me alag se aate hain.
// SEO title/description app/courses/layout.tsx me hain (waisa hi).
import Link from "next/link";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import CoursesExplorer from "@/app/components/v2/CoursesExplorer";
import { toItem, type CatalogItem } from "@/app/components/v2/catalog";
import { getCoursesServer, getMockSeriesServer, getDescriptiveSeriesServer, getTier2SeriesServer } from "@/lib/serverApi";

export const revalidate = 60;

export default async function CoursesPage() {
  const [courses, mocks, desc, tier2] = await Promise.all([
    getCoursesServer(),
    getMockSeriesServer(),
    getDescriptiveSeriesServer(),
    getTier2SeriesServer(),
  ]);
  const items: CatalogItem[] = [
    ...courses.filter((c: any) => (c.visible_on ?? "both") !== "app").map((c: any) => toItem("course", c)),
    ...mocks.map((s: any) => toItem("mock", s)),
    ...desc.map((s: any) => toItem("descriptive", s)),
    ...tier2.map((s: any) => toItem("tier2", s)),
  ];

  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <nav className="v2-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <span style={{ color: "var(--text)", fontWeight: 700 }}>Courses</span>
        </nav>
        <div style={{ paddingTop: 10 }}>
          <h1 className="v2-h1">Courses &amp; Test Series</h1>
          <p className="v2-sub">Bundles, video courses, mock tests, descriptive and typing tests — all in one place.</p>
        </div>
        <CoursesExplorer items={items} />
      </main>
      <SiteFooter />
    </V2Shell>
  );
}
