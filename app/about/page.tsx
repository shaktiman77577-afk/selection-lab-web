import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Us",
  description: "Selection Lab — honest, bilingual government exam preparation with real exam-interface mock tests.",
};

const GOLD = "#FFAB00";

export default function AboutPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header style={{ position: "sticky", top: 0, display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "var(--header)", borderBottom: "1px solid var(--line)" }}>
        <Link href="/" style={{ color: "var(--text)", textDecoration: "none", fontSize: 18 }}>←</Link>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          Selection <span style={{ color: GOLD }}>Lab</span>
        </div>
      </header>

      <main style={{ maxWidth: 720, margin: "0 auto", padding: "24px 18px 60px", lineHeight: 1.8, fontSize: 14.5 }}>
        <h1 style={{ fontSize: 26 }}>About Selection Lab</h1>
        <p>
          Selection Lab is a government exam preparation platform built for aspirants of <b>SSC CGL, SSC CHSL,
          IB Security Assistant, Railways RRB, UP Police, Allahabad High Court, CISF/CRPF</b> and related exams.
        </p>
        <p>
          We are a new platform — and we treat that as our biggest strength. No legacy clutter, no recycled
          content, no inflated claims. Just carefully-built courses, mock tests on a <b>real exam interface</b>
          (the same TCS/SSC-pattern screen you will face on exam day), and content in <b>both Hindi and English</b>.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>Our Guide — Nikki Ma'am</h2>
        <p>
          Selection Lab courses are led by <b>Nikki Ma'am</b>, known to thousands of aspirants through her YouTube
          channel <a href="https://youtube.com/@selection_lab" style={{ color: GOLD }}>English by Nikki</a>,
          where she teaches English, strategy and exam skills for government exams — free, every day.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>What we believe</h2>
        <p>
          <b>Preparation should be affordable.</b> Serious test series and courses shouldn't cost thousands of rupees.<br />
          <b>Practice should feel real.</b> Our mock tests clone the actual exam screen — palette, timer, sections, negative marking.<br />
          <b>Language should never be a barrier.</b> Everything we make is bilingual by design.
        </p>

        <h2 style={{ fontSize: 18, marginTop: 28 }}>Talk to us</h2>
        <p>
          We're building Selection Lab in the open, with our students. Suggestions, doubts, complaints — everything
          is welcome on our <a href="https://t.me/Selection_Lab" style={{ color: GOLD }}>Telegram</a>, or see the{" "}
          <Link href="/contact" style={{ color: GOLD }}>Contact page</Link>.
        </p>
      </main>
    </div>
  );
}
