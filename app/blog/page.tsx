// Blog list - website redesign (Oct 2026). Data aur SEO wahi; naya header/footer
// aur laptop par 3 column ke cards. Upar "Latest Exam Updates" (job
// notifications) - alag menu nahi, blog ke andar hi.
import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import { IconNews } from "@/app/components/v2/Icons";
import { STATUS_COLOR, fmtDate } from "@/lib/examUpdates";

export const metadata: Metadata = pageMeta({
  title: "Blog — Exam Updates & Study Material",
  description: "Latest government exam updates, strategy guides, vocabulary lists and study material from Selection Lab.",
  path: "/blog",
});

const API_URL = "https://api.selectionlab.online/api";

// Exam Updates (job notifications) — blog ke upar hi dikhte hain, alag menu nahi
async function getExamUpdates() {
  try {
    const res = await fetch(`${API_URL}/exam-updates/`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const d = await res.json();
    return d.exams || [];
  } catch {
    return [];
  }
}

async function getPosts() {
  try {
    const res = await fetch(`${API_URL}/blog/`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const d = await res.json();
    return d.posts || [];
  } catch {
    return [];
  }
}

function fmt(d?: string) {
  if (!d) return "";
  try {
    return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

export default async function BlogPage() {
  const [posts, exams] = await Promise.all([getPosts(), getExamUpdates()]);
  const topExams = exams.slice(0, 6);
  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <nav className="v2-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <span style={{ color: "var(--text)", fontWeight: 700 }}>Blog</span>
        </nav>
        <div style={{ paddingTop: 10 }}>
          <h1 className="v2-h1">Exam Updates &amp; Study Material</h1>
          <p className="v2-sub" style={{ fontSize: 15 }}>
            Notifications, strategy, vocabulary and preparation guides — updated regularly.
          </p>
        </div>

        {topExams.length > 0 && (
          <section className="v2-sec" style={{ marginTop: 22 }}>
            <div className="v2-head">
              <h2 className="v2-h2">🔔 Latest Exam Updates</h2>
              {exams.length > topExams.length && (
                <Link href="/exam-updates" className="v2-more">
                  View all →
                </Link>
              )}
            </div>
            <div className="v2-grid v2-grid-1">
              {topExams.map((e: any) => (
                <article key={e.slug} className="v2-card">
                  {e.cover_url && (
                    <div className="v2-media">
                      <div className="v2-media-bg" style={{ backgroundImage: `url(${JSON.stringify(e.cover_url)})` }} aria-hidden="true" />
                      <picture>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={e.cover_url} alt={e.cover_alt || e.title} loading="lazy" decoding="async" />
                      </picture>
                    </div>
                  )}
                  <div className="v2-body" style={{ gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <span className="v2-status" style={{ background: STATUS_COLOR[e.status?.code] || "#8a8f99" }}>
                        {e.status?.text}
                      </span>
                      {e.total_vacancies ? <span className="v2-meta">{Number(e.total_vacancies).toLocaleString("en-IN")} posts</span> : null}
                      {e.last_date && <span className="v2-meta">Last date {fmtDate(e.last_date)}</span>}
                    </div>
                    <h3 className="v2-title">
                      <Link href={`/exam-updates/${e.slug}`} className="v2-link">
                        {e.title}
                      </Link>
                    </h3>
                    {e.latest_update && <div style={{ fontSize: 13, color: "var(--v2-gold-ink)", fontWeight: 700 }}>🔔 {e.latest_update}</div>}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {posts.length > 0 && topExams.length > 0 && (
          <h2 className="v2-h2" style={{ margin: "36px 0 0" }}>
            📰 Articles
          </h2>
        )}
        {posts.length === 0 ? (
          <div className="v2-empty">
            <IconNews size={40} />
            <p style={{ margin: "10px 0 0" }}>First posts coming soon — join our Telegram for updates!</p>
          </div>
        ) : (
          <div className="v2-grid v2-grid-1" style={{ marginTop: 22 }}>
            {posts.map((p: any) => (
              <article key={p.slug} className="v2-card">
                <div className="v2-body" style={{ padding: 18, gap: 8 }}>
                  <span className="v2-tag gold" style={{ alignSelf: "flex-start" }}>
                    {fmt(p.created_at)}
                  </span>
                  <h2 style={{ margin: "4px 0 0", fontSize: 16.5, fontWeight: 800, lineHeight: 1.45 }}>
                    <Link href={`/blog/${p.slug}`} className="v2-link">
                      {p.title}
                    </Link>
                  </h2>
                  {p.excerpt && (
                    <p className="v2-desc" style={{ WebkitLineClamp: 3, fontSize: 14 }}>
                      {p.excerpt}
                    </p>
                  )}
                  <span className="v2-more" style={{ marginTop: "auto", paddingTop: 6 }}>
                    Read more →
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </V2Shell>
  );
}
