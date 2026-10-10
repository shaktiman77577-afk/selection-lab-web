// Contact - website redesign (Oct 2026). Text aur links wahi, naya header/footer aur cards.
import type { Metadata } from "next";
import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import { IconNews, IconPlay, IconRight, IconSend } from "@/app/components/v2/Icons";

export const metadata: Metadata = pageMeta({
  title: "Contact & Support",
  description: "Get in touch with Selection Lab — support, doubts, payment issues and feedback.",
  path: "/contact",
});

const CHANNELS = [
  { Icon: IconNews, title: "Email", desc: "For support, payment issues, refunds and general queries.", href: "mailto:team.selectionlab@gmail.com", label: "team.selectionlab@gmail.com" },
  { Icon: IconSend, title: "Telegram (fastest)", desc: "Support, doubts, payment issues — usually replied within a few hours.", href: "https://t.me/Selection_Lab", label: "t.me/Selection_Lab" },
  { Icon: IconPlay, title: "YouTube", desc: "Free lessons and announcements by Nikki Ma'am.", href: "https://youtube.com/@englishbynikki", label: "English by Nikki" },
];

export default function ContactPage() {
  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <nav className="v2-crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <span style={{ color: "var(--text)", fontWeight: 700 }}>Contact</span>
          </nav>
          <h1 className="v2-h1" style={{ marginTop: 12 }}>
            We&apos;re here to help
          </h1>
          <p className="v2-sub" style={{ fontSize: 15 }}>
            Payment stuck? Course not unlocking? Doubt in a question? Reach us on any channel below.
          </p>

          <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
            {CHANNELS.map(({ Icon, title, desc, href, label }) => (
              <a key={title} href={href} target="_blank" rel="noopener noreferrer" className="v2-row" style={{ marginTop: 0, padding: 16 }}>
                <span className="v2-tile-ic" style={{ flex: "none" }}>
                  <Icon />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 800, fontSize: 15 }}>{title}</span>
                  <span style={{ display: "block", fontSize: 13, color: "var(--v2-muted)", marginTop: 2 }}>{desc}</span>
                  <span style={{ display: "block", fontSize: 13, color: "var(--v2-gold-ink)", fontWeight: 800, marginTop: 6 }}>{label}</span>
                </span>
                <IconRight size={18} />
              </a>
            ))}
          </div>

          <h2 className="v2-section-title">Payment / refund issues</h2>
          <p className="v2-prose">
            If money was deducted but the course didn&apos;t unlock, message us on Telegram or email{" "}
            <a href="mailto:team.selectionlab@gmail.com" style={{ color: "var(--v2-gold-ink)", fontWeight: 700 }}>
              team.selectionlab@gmail.com
            </a>{" "}
            with your <b>payment ID</b> (visible in your UPI/bank app). Genuine cases are refunded as per our{" "}
            <Link href="/terms" style={{ color: "var(--v2-gold-ink)", fontWeight: 700 }}>
              refund policy
            </Link>{" "}
            — usually within 5-7 working days.
          </p>
          <div className="v2-band gold" style={{ marginTop: 24 }}>
            <div>
              <b style={{ fontSize: 17 }}>Need help with an order or a test?</b>
              <p>Raise a ticket and track the reply in one place.</p>
            </div>
            <Link href="/support" className="v2-btn v2-btn-gold">
              Help &amp; Support
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </V2Shell>
  );
}
