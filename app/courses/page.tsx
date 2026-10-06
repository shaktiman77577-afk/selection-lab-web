// Courses list - website redesign (Oct 2026). SEO title/description
// app/courses/layout.tsx me hain (waisa hi). Data server se, search/filter browser me.
import Link from "next/link";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import CoursesExplorer, { type SlimCourse } from "@/app/components/v2/CoursesExplorer";
import { getCoursesServer } from "@/lib/serverApi";
import { courseImage, courseTitle } from "@/lib/supabase";

export const revalidate = 60;

export default async function CoursesPage() {
  const raw = await getCoursesServer();
  const courses: SlimCourse[] = raw
    .filter((c: any) => (c.visible_on ?? "both") !== "app")
    .map((c: any) => ({
      id: c.id,
      title: courseTitle(c),
      img: courseImage(c),
      imgMobile: c.thumbnail_url_mobile || undefined,
      price: Number(c.price) || 0,
      original: Number(c.original_price) || 0,
      type: String(c.course_type || ""),
      recent: Number(c.recent_buyers) || 0,
    }));

  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <nav className="v2-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <span style={{ color: "var(--text)", fontWeight: 700 }}>Courses</span>
        </nav>
        <div style={{ paddingTop: 10 }}>
          <h1 className="v2-h1">Courses</h1>
          <p className="v2-sub">Video classes, notes and PYQs for SSC, IB, Railways and court exams — in Hindi and English.</p>
        </div>
        <CoursesExplorer courses={courses} />
      </main>
      <SiteFooter />
    </V2Shell>
  );
}
