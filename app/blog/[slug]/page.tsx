import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

const GOLD = "#FFAB00";
const API_URL = "https://api.selectionlab.online/api";

async function getPost(slug: string) {
  try {
    const res = await fetch(`${API_URL}/blog/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const d = await res.json();
    return d.post || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) return { title: "Post not found" };
  return {
    title: post.title,
    description: post.excerpt || post.content.slice(0, 150),
    openGraph: {
      title: post.title,
      description: post.excerpt || post.content.slice(0, 150),
      images: post.cover_url ? [{ url: post.cover_url }] : undefined,
      type: "article",
    },
  };
}

// Renderer: "## " = heading, blank line = paragraph, "- " lines = bullets,
// [text](url) = link, a paragraph that is ONLY a link = CTA button
function parseInline(text: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  const regex = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const href = m[2];
    const internal = href.startsWith("/") || href.includes("selectionlab.in");
    parts.push(
      <a
        key={`${keyPrefix}-${k++}`}
        href={href}
        target={internal ? undefined : "_blank"}
        rel={internal ? undefined : "noopener"}
        style={{ color: GOLD, fontWeight: 700, textDecoration: "underline" }}
      >
        {m[1]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderContent(content: string) {
  const blocks = content.split(/\n\s*\n/);
  return blocks.map((b, i) => {
    const t = b.trim();
    if (!t) return null;

    // Heading
    if (t.startsWith("## ")) {
      return (
        <h2 key={i} style={{ fontSize: 18, margin: "26px 0 8px" }}>
          {parseInline(t.slice(3), `h${i}`)}
        </h2>
      );
    }

    // CTA button: paragraph that is ONLY one link
    const onlyLink = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (onlyLink) {
      const href = onlyLink[2];
      const internal = href.startsWith("/") || href.includes("selectionlab.in");
      return (
        <div key={i} style={{ textAlign: "center", margin: "18px 0" }}>
          <a
            href={href}
            target={internal ? undefined : "_blank"}
            rel={internal ? undefined : "noopener"}
            style={{
              display: "inline-block",
              background: GOLD,
              color: "#1a1a1a",
              borderRadius: 10,
              padding: "13px 26px",
              fontWeight: 800,
              fontSize: 14.5,
              textDecoration: "none",
            }}
          >
            {onlyLink[1]}
          </a>
        </div>
      );
    }

    // Bullet list
    const lines = t.split("\n");
    if (lines.every((l) => l.trim().startsWith("- "))) {
      return (
        <ul key={i} style={{ margin: "0 0 14px", paddingLeft: 22 }}>
          {lines.map((l, j) => (
            <li key={j} style={{ marginBottom: 6 }}>
              {parseInline(l.trim().slice(2), `li${i}-${j}`)}
            </li>
          ))}
        </ul>
      );
    }

    // Paragraph
    return (
      <p key={i} style={{ margin: "0 0 14px", whiteSpace: "pre-wrap" }}>
        {parseInline(t, `p${i}`)}
      </p>
    );
  });
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPost(slug);
  if (!post) notFound();

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header style={{ position: "sticky", top: 0, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--header)", borderBottom: "1px solid var(--line)", zIndex: 10 }}>
        <Link href="/blog" style={{ color: "var(--text)", textDecoration: "none", fontSize: 18 }}>←</Link>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          Selection <span style={{ color: GOLD }}>Lab</span> Blog
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "22px 18px 60px", fontSize: 14.5, lineHeight: 1.8 }}>
        <h1 style={{ fontSize: 24, lineHeight: 1.35, margin: "0 0 6px" }}>{post.title}</h1>
        <div style={{ fontSize: 12, color: "var(--muted)", marginBottom: 18 }}>
          {new Date(post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · Selection Lab
        </div>
        {post.cover_url && (
          <img src={post.cover_url} alt="" style={{ width: "100%", borderRadius: 12, marginBottom: 18, border: "1px solid var(--line)" }} />
        )}
        {renderContent(post.content)}

        <div style={{ marginTop: 34, background: "var(--card)", border: `1.5px dashed ${GOLD}`, borderRadius: 14, padding: 16, textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Preparing for government exams?</div>
          <div style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 12px" }}>Try our free mock tests on the real exam interface.</div>
          <Link href="/mock-tests" style={{ background: GOLD, color: "#1a1a1a", textDecoration: "none", borderRadius: 10, padding: "11px 22px", fontWeight: 800, fontSize: 14, display: "inline-block" }}>
            Start Free Mock Test
          </Link>
        </div>
      </main>
    </div>
  );
              }
          
