import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Selection Lab collects, uses and protects your information.",
};

const GOLD = "#FFAB00";

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "var(--header)",
          borderBottom: "1px solid rgba(255,171,0,0.25)",
        }}
      >
        <Link href="/" style={{ color: "var(--text)", textDecoration: "none", fontSize: 18 }}>
          ←
        </Link>
        <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>
          Selection <span style={{ color: GOLD }}>Lab</span>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 18px 60px", lineHeight: 1.7, fontSize: 14.5 }}>
        <h1 style={{ color: "var(--text)", fontSize: 26 }}>Privacy Policy</h1>
        <p style={{ color: "var(--muted)" }}>Last updated: 2 July 2026</p>

        <p>
          Selection Lab ("we", "our", "us") operates the website selectionlab.in and the Selection Lab
          mobile application (together, the "Platform"). This policy explains what information we collect,
          how we use it, and the choices you have.
        </p>

        <h2 style={h2}>1. Information we collect</h2>
        <p>
          <b>Account information.</b> When you sign in with Google, we receive your name, email address and
          profile picture from Google. During profile setup we also collect your mobile number and a password
          you choose.
        </p>
        <p>
          <b>Usage information.</b> We store your course enrollments, quiz and mock test attempts, scores,
          points, reviews you post, and similar activity needed to provide the Platform.
        </p>
        <p>
          <b>Payment information.</b> Payments are processed by Razorpay. We do not store your card, UPI or
          bank details. We keep records of your orders (amount, course purchased, payment ID) for support and
          accounting.
        </p>

        <h2 style={h2}>2. How we use information</h2>
        <p>
          We use your information to create and manage your account, provide courses and tests you enroll in,
          process payments, respond to support requests, improve the Platform, and send important service
          updates. We may send promotional messages about new courses; you can opt out at any time.
        </p>

        <h2 style={h2}>3. Sharing</h2>
        <p>
          We do not sell your personal information. We share data only with service providers needed to run
          the Platform — such as Google (sign-in), Razorpay (payments), and our hosting and database
          providers — and when required by law.
        </p>

        <h2 style={h2}>4. Data security</h2>
        <p>
          Passwords are stored in hashed form and data is transmitted over HTTPS. No method of storage or
          transmission is 100% secure, but we take reasonable measures to protect your information.
        </p>

        <h2 style={h2}>5. Your choices</h2>
        <p>
          You can update your profile details in the app. To request deletion of your account and associated
          data, contact us using the details below and we will process the request within a reasonable time.
        </p>

        <h2 style={h2}>6. Children</h2>
        <p>
          The Platform is intended for users preparing for government examinations. It is not directed at
          children under 13, and we do not knowingly collect their information.
        </p>

        <h2 style={h2}>7. Changes to this policy</h2>
        <p>
          We may update this policy from time to time. The "Last updated" date above reflects the latest
          version, and continued use of the Platform means you accept the updated policy.
        </p>

        <h2 style={h2}>8. Contact us</h2>
        <p>
          For questions or requests about this policy, reach us on Telegram at{" "}
          <a href="https://t.me/Selection_Lab" style={{ color: GOLD }}>
            t.me/Selection_Lab
          </a>
          .
        </p>
      </main>
    </div>
  );
}

const h2: React.CSSProperties = { color: "var(--text)", fontSize: 18, marginTop: 28 };
            
