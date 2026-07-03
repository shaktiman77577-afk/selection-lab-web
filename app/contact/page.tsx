import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Contact & Support",
  description: "Get in touch with Selection Lab — support, doubts, payment issues and feedback.",
};

const GOLD = "#FFAB00";

const CHANNELS = [
  { icon: "✈️", title: "Telegram (fastest)", desc: "Support, doubts, payment issues — usually replied within a few hours.", href: "https://t.me/Selection_Lab", label: "t.me/Selection_Lab" },
  { icon: "▶️", title: "YouTube", desc: "Free lessons and announcements by Nikki Ma'am.", href: "https://youtube.com/@englishbynikki", label: "English by Nikki" },
];

export default function ContactPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header style={{ position: "sticky", top: 0, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--header)", borderBottom: "1px solid var(--line)" }}>
        <Link href="/" style={{ color: "var(--text)", textDecoration: "none", fontSize: 18 }}>←</Link>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          Contact &amp; <span style={{ color: GOLD }}>Support</span>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 18px 60px", fontSize: 14.5, lineHeight: 1.7 }}>
        <h1 style={{ fontSize: 24 }}>We're here to help</h1>
        <p style={{ color: "var(--muted)" }}>
          Payment stuck? Course not unlocking? Doubt in a question? Reach us on any channel below.
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
          {CHANNELS.map((c) => (
            <a
              key={c.title}
              href={c.href}
              target="_blank"
              style={{ display: "flex", alignItems: "center", gap: 14, background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 16, textDecoration: "none", color: "var(--text)", boxShadow: "var(--shadow)" }}
            >
              <span style={{ fontSize: 30 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 15 }}>{c.title}</div>
                <div style={{ fontSize: 12.5, color: "var(--muted)" }}>{c.desc}</div>
              </div>
              <span style={{ color: GOLD, fontWeight: 800, fontSize: 12.5 }}>{c.label} →</span>
            </a>
          ))}
        </div>

        <h2 style={{ fontSize: 17, marginTop: 30 }}>Payment / refund issues</h2>
        <p>
          If money was deducted but the course didn't unlock, message us on Telegram with your <b>payment ID</b>{" "}
          (visible in your UPI/bank app). Genuine cases are refunded as per our{" "}
          <Link href="/terms" style={{ color: GOLD }}>refund policy</Link> — usually within 5-7 working days.
        </p>
      </main>
    </div>
  );
}
