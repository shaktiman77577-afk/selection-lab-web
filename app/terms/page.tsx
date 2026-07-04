import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Selection Lab courses, tests and services.",
};

const GOLD = "#FFAB00";

export default function TermsPage() {
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
        <h1 style={{ color: "var(--text)", fontSize: 26 }}>Terms of Service</h1>
        <p style={{ color: "var(--muted)" }}>Last updated: 2 July 2026</p>

        <p>
          These terms govern your use of the Selection Lab website (selectionlab.in) and mobile
          application (the "Platform"). By creating an account or using the Platform, you agree to these
          terms.
        </p>

        <h2 style={h2}>1. Accounts</h2>
        <p>
          You must provide accurate information when creating an account and keep your login credentials
          secure. You are responsible for activity on your account. One account is meant for one person;
          sharing purchased content or account access is not permitted.
        </p>

        <h2 style={h2}>2. Courses and content</h2>
        <p>
          Courses, tests, questions, videos, PDFs and other materials on the Platform are the intellectual
          property of Selection Lab or its content partners. Your purchase gives you a personal,
          non-transferable license to access the content for the stated validity period. Copying,
          recording, redistributing or reselling content is strictly prohibited and may lead to account
          termination without refund.
        </p>

        <h2 style={h2}>3. Payments</h2>
        <p>
          Prices are listed in Indian Rupees. Payments are processed securely by Razorpay. Access to paid
          content is granted after successful payment verification. Coupon codes are subject to their stated
          conditions and may be single-use.
        </p>

        <h2 style={h2}>4. Refunds</h2>
        <p>
          Because courses are digital content that is accessible immediately after purchase, payments are
          generally non-refundable. If you were charged but did not receive access, or you made a duplicate
          payment, contact us within 7 days with your payment ID and we will investigate and refund genuine
          cases.
        </p>

        <h2 style={h2}>5. Acceptable use</h2>
        <p>
          You agree not to misuse the Platform — including attempting to bypass payment, scraping content,
          uploading harmful material, posting abusive reviews, or interfering with other users. We may
          suspend or terminate accounts that violate these terms.
        </p>

        <h2 style={h2}>6. Disclaimer</h2>
        <p>
          We work hard to keep content accurate and up to date, but we do not guarantee selection or success
          in any examination. The Platform is provided "as is" and may occasionally be unavailable due to
          maintenance or factors beyond our control.
        </p>

        <h2 style={h2}>7. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Selection Lab's total liability for any claim related to
          the Platform is limited to the amount you paid for the specific course or service giving rise to
          the claim.
        </p>

        <h2 style={h2}>8. Changes</h2>
        <p>
          We may update these terms from time to time. Continued use of the Platform after changes means you
          accept the updated terms.
        </p>

        <h2 style={h2}>9. Governing law and contact</h2>
        <p>
          These terms are governed by the laws of India. For any questions, reach us on Telegram at{" "}
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
