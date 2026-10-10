// Website redesign: naya header/footer (Blog ke andar); content waisa hi.
import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { STATUS_COLOR, fmtDate as fmt, WIDE_CSS } from "@/lib/examUpdates";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";

/**
 * /exam-updates — sarkari vacancies (job notifications) ki list.
 * Data admin panel ke "Exam Updates" se (TSV upload). Status (Apply open,
 * Last date soon, Closed, Admit card out...) backend har baar date se nikalta hai.
 */

export const metadata: Metadata = pageMeta({
  title: "Exam Updates — Latest Govt Job Notifications, Admit Cards & Results",
  description: "Latest government job notifications for court, SSC, railway and clerical exams — important dates, fees, age limit, vacancies, admit card and result links, updated regularly.",
  path: "/exam-updates",
});

const GOLD = "#FFAB00";
const API_URL = "https://api.selectionlab.online/api";

async function getExams() {
  try {
    const res = await fetch(`${API_URL}/exam-updates/`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    const d = await res.json();
    return d.exams || [];
  } catch {
    return [];
  }
}

export default async function ExamUpdatesPage({ searchParams }: { searchParams: Promise<{ state?: string; category?: string }> }) {
  const sp = await searchParams;
  const all = await getExams();
  const states = Array.from(new Set(all.map((e: any) => e.state).filter(Boolean))) as string[];
  const cats = Array.from(new Set(all.map((e: any) => e.category).filter(Boolean))) as string[];
  const exams = all.filter((e: any) => (!sp.state || e.state === sp.state) && (!sp.category || e.category === sp.category));

  const chip = (label: string, href: string, on: boolean) => (
    <Link key={href} href={href} style={{
      fontSize: 12.5, padding: "6px 11px", borderRadius: 999, textDecoration: "none", whiteSpace: "nowrap",
      border: `1px solid ${on ? GOLD : "var(--line)"}`, background: on ? "rgba(255,171,0,0.15)" : "var(--card)",
      color: "var(--text)", fontWeight: on ? 700 : 500,
    }}>{label}</Link>
  );
  const q = (o: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    Object.entries(o).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return s ? `/exam-updates?${s}` : "/exam-updates";
  };

  return (
    <V2Shell>
      <SiteHeader />

      <style dangerouslySetInnerHTML={{ __html: WIDE_CSS }} />
      <main className="sl-wide">
        <nav className="v2-crumb" aria-label="Breadcrumb" style={{ marginBottom: 10 }}>
          <Link href="/">Home</Link> / <Link href="/blog">Blog</Link> / <span style={{ color: "var(--text)", fontWeight: 700 }}>Exam Updates</span>
        </nav>
        <h1 className="sl-h1" style={{ fontSize: 23, margin: "4px 0 4px" }}>Latest Exam Updates</h1>
        <p style={{ color: "var(--muted)", fontSize: 13.5, margin: "0 0 14px" }}>
          Government job notifications with important dates, fees, eligibility, admit cards and results.
        </p>

        {(states.length > 1 || cats.length > 1) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {cats.length > 1 && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                {chip("All", q({ state: sp.state }), !sp.category)}
                {cats.map((c) => chip(c, q({ state: sp.state, category: c }), sp.category === c))}
              </div>
            )}
            {states.length > 1 && (
              <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
                {chip("All states", q({ category: sp.category }), !sp.state)}
                {states.map((s) => chip(s, q({ category: sp.category, state: s }), sp.state === s))}
              </div>
            )}
          </div>
        )}

        {exams.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>No updates here yet. Please check back soon.</p>
        ) : <div className="sl-cards">{exams.map((e: any) => (
          <Link key={e.slug} href={`/exam-updates/${e.slug}`} style={{
            display: "block", background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14,
            padding: 15, marginBottom: 12, textDecoration: "none", color: "var(--text)", boxShadow: "var(--shadow)",
          }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#fff", background: STATUS_COLOR[e.status?.code] || "#8a8f99", borderRadius: 6, padding: "2px 8px" }}>
                {e.status?.text}
              </span>
              {e.state && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>{e.state}</span>}
              {e.category && <span style={{ fontSize: 11.5, color: "var(--muted)" }}>· {e.category}</span>}
            </div>
            {e.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.cover_url} alt={e.cover_alt || e.title} loading="lazy" style={{ display: "block", width: "100%", aspectRatio: "16 / 9", objectFit: "cover", borderRadius: 10, margin: "2px 0 10px" }} />
            )}
            <div style={{ fontWeight: 800, fontSize: 15.5, lineHeight: 1.45 }}>{e.title}</div>
            {e.organization && <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 3 }}>{e.organization}</div>}
            {e.latest_update && (
              <div style={{ fontSize: 12.5, color: GOLD, fontWeight: 700, marginTop: 6 }}>🔔 {e.latest_update}</div>
            )}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", fontSize: 12.5, marginTop: 8 }}>
              {e.total_vacancies ? <span><b>{Number(e.total_vacancies).toLocaleString("en-IN")}</b> posts</span> : null}
              {e.last_date && <span>Last date: <b>{fmt(e.last_date)}</b></span>}
            </div>
          </Link>
        ))}</div>}
      </main>
      <SiteFooter />
    </V2Shell>
  );
}
