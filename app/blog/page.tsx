// Blog list - website redesign (Oct 2026). Data aur SEO wahi; naya header/footer
// aur laptop par 3 column ke article cards.
import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import { IconNews } from "@/app/components/v2/Icons";

export const metadata: Metadata = pageMeta({
  title: "Blog — Exam Updates & Study Material",
  description: "Latest government exam updates, strategy guides, vocabulary lists and study material from Selection Lab.",
  path: "/blog",
});

const API_URL = "https://api.selectionlab.online/api";

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
  const posts = await getPosts();
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
