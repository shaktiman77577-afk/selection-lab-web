import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { STATUS_COLOR, fmtDate, WIDE_CSS } from "@/lib/examUpdates";

/**
 * /exam-updates/[slug] — ek vacancy ki poori jaankari.
 * Links ki table me jo link abhi nahi aaya (admit card, result) wahan
 * "Coming soon". Neeche "Prepare on Selection Lab" — is exam se jude hamare
 * products (backend naam se apne aap jodta hai; band product nahi aata).
 */

const GOLD = "#FFAB00";
const API_URL = "https://api.selectionlab.online/api";
const SITE = "https://www.selectionlab.in";

async function getExam(slug: string) {
  try {
    const res = await fetch(`${API_URL}/exam-updates/${slug}`, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const d = await res.json();
    return d.exam || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const e = await getExam(slug);
  if (!e) return { title: "Exam update not found" };
  const last = (e.dates || []).find((d: any) => d.label === "Last date to apply");
  const title = `${e.title}${e.total_vacancies ? ` — ${e.total_vacancies} Posts` : ""}`;
  const description = (e.short_info ||
    `${e.organization || ""} ${e.title}: dates, fees, age limit, eligibility and links.`).slice(0, 158) +
    (last && !e.short_info ? ` Last date ${fmtDate(last.date_text)}.` : "");
  return {
    title,
    description,
    alternates: { canonical: `/exam-updates/${e.slug}` },
    openGraph: { title, description, url: `/exam-updates/${e.slug}`, type: "article",
                 modifiedTime: e.updated_at || undefined,
                 images: e.cover_url ? [{ url: e.cover_url, alt: e.cover_alt || e.title }] : undefined },
    twitter: { card: e.cover_url ? "summary_large_image" : "summary", title, description,
               images: e.cover_url ? [e.cover_url] : undefined },
  };
}

// "General=700 | SC/OBC=350" -> [["General","700"],...]; jo pair nahi wo poora text
function pairs(text?: string | null): [string, string][] {
  return String(text || "").split("|").map((x) => x.trim()).filter(Boolean)
    .map((x) => { const i = x.indexOf("="); return i > 0 ? [x.slice(0, i).trim(), x.slice(i + 1).trim()] : ["", x]; });
}
function list(text?: string | null): string[] {
  return String(text || "").split("|").map((x) => x.trim()).filter(Boolean);
}

function jsonLd(e: any) {
  const url = `${SITE}/exam-updates/${e.slug}`;
  return JSON.stringify([
    {
      "@context": "https://schema.org", "@type": "Article", headline: e.title,
      description: e.short_info || e.title, mainEntityOfPage: url,
      datePublished: e.created_at, dateModified: e.updated_at || e.created_at,
      ...(e.cover_url ? { image: [e.cover_url] } : {}),
      author: { "@type": "Organization", name: "Selection Lab" },
      publisher: { "@type": "Organization", name: "Selection Lab", logo: { "@type": "ImageObject", url: `${SITE}/logo.png` } },
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Exam Updates", item: `${SITE}/exam-updates` },
        { "@type": "ListItem", position: 3, name: e.title, item: url },
      ],
    },
  ]).replace(/</g, "\\u003c");
}

const card: CSSProperties = {
  background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 14, marginBottom: 14,
  boxShadow: "var(--shadow)",
};
const h2: CSSProperties = { fontSize: 16.5, margin: "0 0 10px" };
const td: CSSProperties = { padding: "8px 6px", borderTop: "1px solid var(--line)", verticalAlign: "top", fontSize: 13.5 };

function Table({ rows }: { rows: [string, ReactNode][] }) {
  const r = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (!r.length) return null;
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {r.map(([k, v], i) => (
          <tr key={i}>
            <td style={{ ...td, color: "var(--muted)", width: "45%" }}>{k}</td>
            <td style={{ ...td, fontWeight: 600 }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function ExamUpdatePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const e = await getExam(slug);
  if (!e) notFound();

  const fee = pairs(e.fee);
  const vac = pairs(e.vacancy_breakup);
  const stages = list(e.selection_process);
  const quals = list(e.qualification);
  const relax = pairs(e.age_relaxation);
  const salary = list(e.salary);
  const prods = e.products || [];
  const lastDate = (e.dates || []).find((d: any) => d.label === "Last date to apply");
  const linkOf = (re: RegExp) => ((e.links || []).find((l: any) => l.url && re.test(l.label || "")) || {}).url;
  const applyLink = linkOf(/apply/i);
  const pdfLink = linkOf(/notification/i);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header style={{ position: "sticky", top: 0, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--header)", borderBottom: "1px solid var(--line)", zIndex: 10 }}>
        <Link href="/blog" style={{ color: "var(--text)", textDecoration: "none", fontSize: 18 }}>←</Link>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          Selection <span style={{ color: GOLD }}>Lab</span> Blog
        </div>
      </header>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(e) }} />

      <style dangerouslySetInnerHTML={{ __html: WIDE_CSS }} />
      <main className="sl-wide" style={{ lineHeight: 1.65 }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", background: STATUS_COLOR[e.status?.code] || "#8a8f99", borderRadius: 6, padding: "3px 9px" }}>
          {e.status?.text}
        </span>
        <h1 className="sl-h1" style={{ fontSize: 23, lineHeight: 1.35, margin: "10px 0 4px" }}>{e.title}</h1>
        <div style={{ fontSize: 13, color: "var(--muted)" }}>
          {[e.organization, e.advt_no ? `Advt. No. ${e.advt_no}` : "", e.state].filter(Boolean).join(" · ")}
        </div>
        {e.updated_at && (
          <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 3 }}>
            Updated {new Date(e.updated_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </div>
        )}

        {e.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={e.cover_url} alt={e.cover_alt || e.title} style={{ display: "block", width: "100%", maxWidth: 820, height: "auto", borderRadius: 14, margin: "14px 0 4px", border: "1px solid var(--line)" }} />
        )}
        {e.latest_update && (
          <div style={{ margin: "14px 0", padding: "10px 12px", borderRadius: 12, background: "rgba(255,171,0,0.14)", border: `1px solid ${GOLD}`, fontWeight: 700, fontSize: 14 }}>
            🔔 Latest update: {e.latest_update}
          </div>
        )}
        {e.short_info && <p style={{ fontSize: 14.5, margin: "14px 0" }}>{e.short_info}</p>}

        <div className="eu-grid">
          <aside className="eu-side">
            <div style={card}>
              <h2 style={h2}>⚡ Quick facts</h2>
              <Table rows={[
                ["Total posts", e.total_vacancies ? Number(e.total_vacancies).toLocaleString("en-IN") : ""],
                ["Last date", lastDate ? fmtDate(lastDate.date_text) : ""],
                ["Salary", salary[0] || ""],
                ["Age", e.age_min || e.age_max ? `${e.age_min || "?"}–${e.age_max || "?"} years` : ""],
              ]} />
              {(applyLink || pdfLink) && (
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {applyLink && <a href={applyLink} target="_blank" rel="noopener nofollow" style={{ flex: 1, textAlign: "center", background: GOLD, color: "#1a1a1a", borderRadius: 10, padding: "10px 12px", fontWeight: 800, fontSize: 13.5, textDecoration: "none" }}>Apply online ↗</a>}
                  {pdfLink && <a href={pdfLink} target="_blank" rel="noopener nofollow" style={{ flex: 1, textAlign: "center", border: `1px solid ${GOLD}`, color: "var(--text)", borderRadius: 10, padding: "10px 12px", fontWeight: 700, fontSize: 13.5, textDecoration: "none" }}>Notification PDF ↗</a>}
                </div>
              )}
            </div>
        {prods.length > 0 && (
              <div style={{ ...card, border: `1.5px solid ${GOLD}` }}>
                <h2 style={h2}>🎯 Prepare for this exam on Selection Lab</h2>
                {prods.map((p: any) => (
                  <Link key={`${p.kind}-${p.id}`} href={p.link} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderTop: "1px solid var(--line)", textDecoration: "none", color: "var(--text)" }}>
                    {p.thumbnail_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail_url} alt="" style={{ width: 64, height: 40, objectFit: "cover", borderRadius: 6, flexShrink: 0 }} />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, color: GOLD, fontWeight: 800 }}>{p.kind_label}</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.4 }}>{p.title}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap" }}>
                      {Number(p.price) > 0 ? `₹${p.price}` : "Free"} →
                    </span>
                  </Link>
                ))}
              </div>
            )}

          </aside>
          <div className="eu-main">
        {(e.dates || []).length > 0 && (
          <div style={card}>
            <h2 style={h2}>📅 Important dates</h2>
            <Table rows={(e.dates || []).map((d: any) => [d.label, `${fmtDate(d.date_text) || "To be announced"}${d.tentative && !/tentative/i.test(d.date_text || "") ? " (tentative)" : ""}`.replace(/^TBA$/, "To be announced")])} />
          </div>
        )}

        <div className="eu-pair">
        <div style={card}>
          <h2 style={h2}>📋 Overview</h2>
          <Table rows={[
            ["Organisation", e.organization],
            ["Post name", list(e.post_names).join(", ")],
            ["Total vacancies", e.total_vacancies ? Number(e.total_vacancies).toLocaleString("en-IN") : ""],
            ["Salary", salary.length > 1 ? <>{salary.map((s, i) => <div key={i}>{s}</div>)}</> : salary[0]],
            ["Category", e.category],
            ["State", e.state],
          ]} />
        </div>

        {vac.length > 0 && (
          <div style={card}>
            <h2 style={h2}>👥 Vacancy details</h2>
            <Table rows={vac.map(([k, v]) => [k || "—", v])} />
          </div>
        )}

        {(e.age_min || e.age_max || relax.length > 0) && (
          <div style={card}>
            <h2 style={h2}>🎂 Age limit</h2>
            <Table rows={[
              ["Minimum age", e.age_min ? `${e.age_min} years` : ""],
              ["Maximum age", e.age_max ? `${e.age_max} years` : ""],
              ["Age as on", fmtDate(e.age_as_on)],
            ]} />
            {relax.length > 0 && (
              <>
                <div style={{ fontSize: 13, fontWeight: 700, margin: "12px 0 4px" }}>Age relaxation</div>
                <Table rows={relax.map(([k, v]) => [k || "—", v])} />
              </>
            )}
          </div>
        )}

        {fee.length > 0 && (
          <div style={card}>
            <h2 style={h2}>💳 Application fee</h2>
            <Table rows={[...fee.map(([k, v]) => [k || "Fee", v] as [string, string]), ["Payment mode", e.fee_mode]]} />
          </div>
        )}

        {quals.length > 0 && (
          <div style={card}>
            <h2 style={h2}>🎓 Eligibility</h2>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
              {quals.map((q, i) => <li key={i} style={{ marginBottom: 4 }}>{q}</li>)}
            </ul>
          </div>
        )}

        </div>

        {stages.length > 0 && (
          <div style={card}>
            <h2 style={h2}>🧭 Selection process</h2>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
              {stages.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
            </ol>
            {e.typing_speed && <div style={{ fontSize: 13, marginTop: 8 }}><b>Typing speed:</b> {list(e.typing_speed).join(", ")}</div>}
          </div>
        )}

        {(e.links || []).length > 0 && (
          <div style={card}>
            <h2 style={h2}>🔗 Important links</h2>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <tbody>
                {(e.links || []).map((l: any, i: number) => (
                  <tr key={i}>
                    <td style={{ ...td, width: "55%" }}>{l.label}</td>
                    <td style={td}>
                      {l.url ? (
                        <a href={l.url} target="_blank" rel="noopener nofollow" style={{ color: GOLD, fontWeight: 800 }}>Click here ↗</a>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>Coming soon</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.6 }}>
          Information is collected from the official notification. Please verify every detail on the official website before applying.
        </p>
          </div>
        </div>
      </main>
    </div>
  );
}
