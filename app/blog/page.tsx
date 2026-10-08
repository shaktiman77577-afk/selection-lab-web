import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import Link from "next/link";
import { STATUS_COLOR, fmtDate, WIDE_CSS } from "@/lib/examUpdates";

export const metadata: Metadata = pageMeta({
  title: "Blog — Exam Updates & Study Material",
  description: "Latest government exam updates, strategy guides, vocabulary lists and study material from Selection Lab.",
  path: "/blog",
});

const GOLD = "#FFAB00";
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

export default async function BlogPage() {
  const [posts, exams] = await Promise.all([getPosts(), getExamUpdates()]);
  const topExams = exams.slice(0, 6);
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header style={{ position: "sticky", top: 0, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--header)", borderBottom: "1px solid var(--line)", zIndex: 10 }}>
        <Link href="/" style={{ color: "var(--text)", textDecoration: "none", fontSize: 18 }}>←</Link>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          Selection <span style={{ color: GOLD }}>Lab</span> Blog
        </div>
      </header>

      <style dangerouslySetInnerHTML={{ __html: WIDE_CSS }} />
      <main className="sl-wide">
        <h1 className="sl-h1" style={{ fontSize: 23, margin: "4px 0 4px" }}>Exam Updates &amp; Study Material</h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 18px" }}>
          Notifications, strategy, vocabulary and preparation guides — updated regularly.
        </p>

        {topExams.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "0 0 10px" }}>
              <h2 style={{ fontSize: 17, margin: 0 }}>🔔 Latest Exam Updates</h2>
              {exams.length > topExams.length && (
                <Link href="/exam-updates" style={{ fontSize: 13, color: GOLD, fontWeight: 700, textDecoration: "none" }}>View all →</Link>
              )}
            </div>
            <div className="sl-cards">
            {topExams.map((e: any) => (
              <Link key={e.slug} href={`/exam-updates/${e.slug}`} style={{
                display: "block", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12,
                padding: "11px 13px", marginBottom: 8, textDecoration: "none", color: "var(--text)",
              }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
                  <span style={{ fontSize: 10.5, fontWeight: 800, color: "#fff", background: STATUS_COLOR[e.status?.code] || "#8a8f99", borderRadius: 6, padding: "2px 7px" }}>
                    {e.status?.text}
                  </span>
                  {e.total_vacancies ? <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{Number(e.total_vacancies).toLocaleString("en-IN")} posts</span> : null}
                  {e.last_date && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>· Last date {fmtDate(e.last_date)}</span>}
                </div>
                {e.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.cover_url} alt={e.cover_alt || e.title} loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 9, margin: "4px 0 8px" }} />
                )}
                <div style={{ fontWeight: 700, fontSize: 14.5, lineHeight: 1.4 }}>{e.title}</div>
                {e.latest_update && <div style={{ fontSize: 12, color: GOLD, fontWeight: 700, marginTop: 4 }}>🔔 {e.latest_update}</div>}
              </Link>
            ))}
            </div>
          </section>
        )}

        {posts.length > 0 && topExams.length > 0 && <h2 style={{ fontSize: 17, margin: "0 0 10px" }}>📰 Articles</h2>}
        {posts.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>First posts coming soon — join our Telegram for updates!</p>
        ) : (
          <div className="sl-cards">{posts.map((p: any) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              style={{ display: "block", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 16, marginBottom: 12, textDecoration: "none", color: "var(--text)", boxShadow: "var(--shadow)" }}
            >
              <div style={{ fontWeight: 800, fontSize: 15.5, lineHeight: 1.45 }}>{p.title}</div>
              {p.excerpt && <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 6, lineHeight: 1.6 }}>{p.excerpt}</div>}
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>
                {new Date(p.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · Read more →
              </div>
            </Link>
          ))}</div>
        )}
      </main>
    </div>
  );
}
