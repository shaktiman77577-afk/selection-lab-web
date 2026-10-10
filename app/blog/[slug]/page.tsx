import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BLOG_CSS } from "@/lib/blogHtml";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";

// Website redesign (Oct 2026): sirf bahar ka frame badla (naya header/footer,
// breadcrumb, CTA band). Post render karne, SEO metadata aur structured data
// ka saara logic waisa hi hai.

const LINK = "var(--v2-gold-ink)";
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
  // Naye editor ki post me Google ke liye alag title/description ho sakta hai
  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt || plainText(post).slice(0, 155);
  return {
    title,
    description,
    keywords: post.focus_keyword ? [post.focus_keyword] : undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      url: `/blog/${post.slug}`,
      images: post.cover_url ? [{ url: post.cover_url, alt: post.cover_alt || post.title }] : undefined,
      type: "article",
      publishedTime: post.created_at || undefined,
      modifiedTime: post.updated_at || post.created_at || undefined,
    },
    twitter: { card: post.cover_url ? "summary_large_image" : "summary", title, description },
  };
}

// Description / schema ke liye saada text — HTML ya purana likhawat dono se
function plainText(post: any): string {
  const c = String(post?.content || "");
  const t = post?.content_format === "html"
    ? c.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"')
    : c.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/^#+\s*/gm, "");
  return t.replace(/\s+/g, " ").trim();
}

// Google ke liye structured data: Article + FAQ + breadcrumb
function jsonLd(post: any) {
  const url = `https://www.selectionlab.in/blog/${post.slug}`;
  const out: any[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: (post.meta_title || post.title || "").slice(0, 110),
      description: post.meta_description || post.excerpt || plainText(post).slice(0, 155),
      image: post.cover_url ? [post.cover_url] : undefined,
      datePublished: post.created_at,
      dateModified: post.updated_at || post.created_at,
      author: { "@type": "Organization", name: "Selection Lab", url: "https://www.selectionlab.in" },
      publisher: { "@type": "Organization", name: "Selection Lab", url: "https://www.selectionlab.in" },
      mainEntityOfPage: url,
      keywords: post.focus_keyword || undefined,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://www.selectionlab.in" },
        { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.selectionlab.in/blog" },
        { "@type": "ListItem", position: 3, name: post.title, item: url },
      ],
    },
  ];
  const faqs = (Array.isArray(post.faqs) ? post.faqs : []).filter((f: any) => f?.q && f?.a);
  if (faqs.length) {
    out.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((f: any) => ({
        "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }
  // "</script>" jaisa text JSON ke andar ho to bhi script tag na toote
  return JSON.stringify(out).replace(/</g, "\\u003c");
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
        style={{ color: LINK, fontWeight: 700, textDecoration: "underline" }}
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
        <h2 key={i} style={{ fontSize: 20, fontWeight: 800, margin: "28px 0 8px" }}>
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
            className="v2-btn v2-btn-gold"
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
        <ul key={i} style={{ margin: "0 0 14px", paddingLeft: 22, listStyle: "disc" }}>
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
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <article style={{ maxWidth: 760, margin: "0 auto", fontSize: 16, lineHeight: 1.8 }}>
          <nav className="v2-crumb" aria-label="Breadcrumb" style={{ lineHeight: 1.5 }}>
            <Link href="/">Home</Link> / <Link href="/blog">Blog</Link>
          </nav>
          <h1 className="v2-h1" style={{ margin: "12px 0 8px", lineHeight: 1.3 }}>
            {post.title}
          </h1>
          <div style={{ fontSize: 13, color: "var(--v2-muted)", marginBottom: 20 }}>
            {new Date(post.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })} · Selection Lab
            {post.updated_at && String(post.updated_at).slice(0, 10) !== String(post.created_at).slice(0, 10) && (
              <> · Updated {new Date(post.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</>
            )}
          </div>
          {post.cover_url && (
            <img src={post.cover_url} alt={post.cover_alt || post.title} style={{ width: "100%", borderRadius: 16, marginBottom: 22, border: "1px solid var(--v2-line)" }} />
          )}
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(post) }} />
          <style>{BLOG_CSS}</style>
          {post.content_format === "html" ? (
            // Naye editor ki post — HTML backend par save se pehle saaf hota hai
            // (core/html_clean.py). Kaagaz jaisi safed patti par, taaki editor me
            // chuna hua har rang (kaala text bhi) dark theme me bhi dikhe.
            <>
              <div className="sl-blog" style={{ background: "#fffdf8", color: "#1b1b1b", borderRadius: 16, padding: "20px 18px", border: "1px solid var(--v2-line)" }}
                dangerouslySetInnerHTML={{ __html: post.content }} />
            </>
          ) : (
            renderContent(post.content)
          )}

          {Array.isArray(post.faqs) && post.faqs.some((f: any) => f?.q && f?.a) && (
            <section className="sl-faq" style={{ marginTop: 28 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 12px" }}>Frequently Asked Questions</h2>
              {post.faqs.filter((f: any) => f?.q && f?.a).map((f: any, i: number) => (
                <details key={i} open={i === 0}>
                  <summary>{f.q}</summary>
                  <div style={{ marginTop: 8, whiteSpace: "pre-wrap", color: "var(--text)" }}>{f.a}</div>
                </details>
              ))}
            </section>
          )}

          <div className="v2-band gold" style={{ marginTop: 36 }}>
            <div>
              <b style={{ fontSize: 18 }}>Preparing for government exams?</b>
              <p>Try our free mock tests on the real exam interface.</p>
            </div>
            <Link href="/mock-tests" className="v2-btn v2-btn-gold">
              Start a free mock test
            </Link>
          </div>
        </article>
      </main>
      <SiteFooter />
    </V2Shell>
  );
}
