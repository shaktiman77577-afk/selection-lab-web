// About - website redesign (Oct 2026). Text wahi, naya header/footer aur saaf padhne layak layout.
import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import { IconGlobe, IconScreen, IconTag } from "@/app/components/v2/Icons";

export const metadata: Metadata = pageMeta({
  title: "About Us",
  description: "Selection Lab — honest, bilingual government exam preparation with real exam-interface mock tests.",
  path: "/about",
});

const BELIEFS = [
  { Icon: IconTag, title: "Preparation should be affordable", text: "Serious test series and courses shouldn't cost thousands of rupees." },
  { Icon: IconScreen, title: "Practice should feel real", text: "Our mock tests clone the actual exam screen — palette, timer, sections, negative marking." },
  { Icon: IconGlobe, title: "Language should never be a barrier", text: "Everything we make is bilingual by design." },
];

export default function AboutPage() {
  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <nav className="v2-crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <span style={{ color: "var(--text)", fontWeight: 700 }}>About</span>
          </nav>
          <h1 className="v2-h1" style={{ marginTop: 12 }}>
            About Selection Lab
          </h1>
          <p className="v2-prose" style={{ marginTop: 14 }}>
            Selection Lab is a government exam preparation platform built for aspirants of <b>SSC CGL, SSC CHSL, IB Security Assistant, Railways RRB, UP Police, Allahabad High Court, CISF/CRPF</b> and related exams.
          </p>
          <p className="v2-prose" style={{ marginTop: 14 }}>
            We are a new platform — and we treat that as our biggest strength. No legacy clutter, no recycled content, no inflated claims. Just carefully-built courses, mock tests on a <b>real exam interface</b> (the same TCS/SSC-pattern screen you will face on exam day), and content in <b>both Hindi and English</b>.
          </p>

          <h2 className="v2-section-title">Our guide — Nikki Ma&apos;am</h2>
          <div className="v2-box" style={{ display: "flex", gap: 16, alignItems: "center" }}>
            <img src="/nikki_maam.png" alt="Nikki Ma'am" loading="lazy" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", objectPosition: "top", border: "3px solid var(--v2-gold)", flex: "none" }} />
            <p className="v2-prose" style={{ fontSize: 14.5 }}>
              Selection Lab courses are led by <b>Nikki Ma&apos;am</b>, known to thousands of aspirants through her YouTube channel{" "}
              <a href="https://youtube.com/@selection_lab" target="_blank" rel="noopener noreferrer" style={{ color: "var(--v2-gold-ink)", fontWeight: 700 }}>
                English by Nikki
              </a>
              , where she teaches English, strategy and exam skills for government exams — free, every day.
            </p>
          </div>

          <h2 className="v2-section-title">What we believe</h2>
          <div className="v2-why" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
            {BELIEFS.map(({ Icon, title, text }) => (
              <div key={title} className="v2-box">
                <div className="v2-box-ic">
                  <Icon size={20} />
                </div>
                <b>{title}</b>
                <p>{text}</p>
              </div>
            ))}
          </div>

          <h2 className="v2-section-title">Talk to us</h2>
          <p className="v2-prose">
            We&apos;re building Selection Lab in the open, with our students. Suggestions, doubts, complaints — everything is welcome on our{" "}
            <a href="https://t.me/Selection_Lab" target="_blank" rel="noopener noreferrer" style={{ color: "var(--v2-gold-ink)", fontWeight: 700 }}>
              Telegram
            </a>
            , or see the{" "}
            <Link href="/contact" style={{ color: "var(--v2-gold-ink)", fontWeight: 700 }}>
              Contact page
            </Link>
            .
          </p>
        </div>
      </main>
      <SiteFooter />
    </V2Shell>
  );
}
