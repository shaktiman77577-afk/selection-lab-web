import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Blog — Exam Updates & Study Material",
  description: "Latest government exam updates, strategy guides, vocabulary lists and study material from Selection Lab.",
};

const GOLD = "#FFAB00";
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

export default async function BlogPage() {
  const posts = await getPosts();
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header style={{ position: "sticky", top: 0, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--header)", borderBottom: "1px solid var(--line)", zIndex: 10 }}>
        <Link href="/" style={{ color: "var(--text)", textDecoration: "none", fontSize: 18 }}>←</Link>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          Selection <span style={{ color: GOLD }}>Lab</span> Blog
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 60px" }}>
        <h1 style={{ fontSize: 23, margin: "4px 0 4px" }}>Exam Updates &amp; Study Material</h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 18px" }}>
          Notifications, strategy, vocabulary and preparation guides — updated regularly.
        </p>

        {posts.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>First posts coming soon — join our Telegram for updates!</p>
        ) : (
          posts.map((p: any) => (
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
          ))
        )}
      </main>
    </div>
  );
}
