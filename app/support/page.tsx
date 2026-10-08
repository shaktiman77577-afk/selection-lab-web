"use client";

// Raise a ticket — website redesign (Oct 2026).
//
// Pehle common sawaalon ke jawab dikhte hain (payment, access, PDF) — kaafi
// students ka kaam wahin ban jata hai aur ticket banane ki zaroorat hi nahi
// padti. Jinka nahi banta, wo form bhar dete hain.
// Sirf LOOK badla hai (naya header, laptop par do column); ticket bhejne aur
// purane tickets lane ka logic waisa hi.

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";

const CATEGORIES = [
  { id: "payment", icon: "💳", label: "Payment problem", hint: "Paid but not confirmed, refund, failed payment" },
  { id: "access", icon: "🔒", label: "Cannot access what I bought", hint: "Course, mock test or descriptive series locked" },
  { id: "technical", icon: "⚙️", label: "Something is not working", hint: "Test not opening, PDF not loading, app issue" },
  { id: "content", icon: "📚", label: "Content or question issue", hint: "Wrong answer, missing question, typo" },
  { id: "other", icon: "💬", label: "Something else", hint: "Any other question" },
];

// Turant jawab — ticket banane se pehle
const QUICK: Record<string, { q: string; a: string }[]> = {
  payment: [
    {
      q: "Money was deducted but I did not get access",
      a: "Don't worry — your payment is safe. This usually fixes itself within a few minutes. If it doesn't, raise a ticket below with your payment ID (from the SMS or your UPI app) and we will unlock it manually, usually within a few hours.",
    },
    {
      q: "Payment failed but money was deducted",
      a: "Failed payments are refunded automatically by your bank, usually in 3-5 working days. No action is needed from your side. If it has been longer than that, raise a ticket with the transaction ID.",
    },
  ],
  access: [
    {
      q: "I bought a bundle but only got one thing",
      a: "First, open My Learning and pull down to refresh. Everything included in your bundle should appear there. If something is still missing, raise a ticket and we will unlock it right away.",
    },
    {
      q: "My course shows as locked",
      a: "Make sure you are logged in with the same number or Google account you used while paying. This is the most common reason. If you still see a lock, raise a ticket with the number you paid from.",
    },
  ],
  technical: [
    {
      q: "The test is not opening or is stuck",
      a: "Close the tab completely and open it again — your answers are saved automatically, so nothing will be lost. If it still doesn't open, tell us which test in a ticket below.",
    },
    {
      q: "PDF is not loading",
      a: "PDFs are large, so they need a stable connection. Try switching between WiFi and mobile data. If it still fails, raise a ticket and mention which course and which PDF.",
    },
  ],
  content: [
    {
      q: "A question has a wrong answer",
      a: "You can report it directly from the test — open the question and tap ⚠ Report at the top. That is the fastest way for us to find it. You can also raise a ticket here with the test name and question number.",
    },
  ],
  other: [],
};

export default function SupportPage() {
  const [user, setUser] = useState<any>(null);
  const [cat, setCat] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "", screenshot: "" });
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState<any>(null);
  const [error, setError] = useState("");
  const [mine, setMine] = useState<any[]>([]);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u) {
      setForm((f) => ({
        ...f,
        name: (u as any).name || "",
        phone: (u as any).phone || "",
        email: (u as any).email || "",
      }));
      fetch(`${API_URL}/admin-extra/tickets/mine?user_id=${(u as any).id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setMine(d?.tickets || []))
        .catch(() => {});
    }
  }, []);

  async function submit() {
    if (!form.subject.trim() || !form.message.trim()) {
      setError("Please add a subject and describe the problem.");
      return;
    }
    if (!form.phone.trim() && !form.email.trim()) {
      setError("Please add your phone number or email so we can reply.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch(`${API_URL}/admin-extra/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, category: cat || "other", user_id: user?.id ?? null }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.detail || "Could not send");
      setDone(d);
    } catch (e: any) {
      setError(e.message);
    }
    setSending(false);
  }

  const quick = QUICK[cat] || [];

  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <nav className="v2-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <span style={{ color: "var(--text)", fontWeight: 700 }}>Help &amp; Support</span>
        </nav>

        {done ? (
          <div className="v2-empty" style={{ maxWidth: 460, margin: "0 auto" }}>
            <div style={{ fontSize: 48 }}>✅</div>
            <h1 className="v2-h1" style={{ fontSize: 24, margin: "12px 0 8px", color: "var(--text)" }}>
              Ticket received
            </h1>
            {done.ticket_id && (
              <p style={{ margin: 0 }}>
                Your ticket number is <b style={{ color: "var(--v2-gold-ink)" }}>#{done.ticket_id}</b>
              </p>
            )}
            <p className="v2-prose" style={{ marginTop: 12 }}>
              {done.message || "We usually reply within 24 hours."}
            </p>
            <Link href="/" className="v2-btn v2-btn-gold" style={{ marginTop: 18 }}>
              Back to home
            </Link>
          </div>
        ) : (
          <>
            <div style={{ paddingTop: 10 }}>
              <h1 className="v2-h1">Need help?</h1>
              <p className="v2-sub" style={{ fontSize: 15 }}>
                Tell us what went wrong and we will sort it out. Most tickets are answered within 24 hours.
              </p>
            </div>

            <div className="v2-detail">
              <div>
                <h2 className="v2-section-title" style={{ marginTop: 6 }}>
                  What is this about?
                </h2>
                <div className="v2-grid v2-grid-1" style={{ gap: 10 }} role="radiogroup" aria-label="Problem type">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      role="radio"
                      aria-checked={cat === c.id}
                      onClick={() => setCat(c.id)}
                      className="v2-row"
                      style={{
                        marginTop: 0,
                        textAlign: "left",
                        cursor: "pointer",
                        alignItems: "flex-start",
                        border: `1.5px solid ${cat === c.id ? "var(--v2-gold)" : "var(--v2-line)"}`,
                        background: cat === c.id ? "var(--v2-gold-wash)" : "var(--card)",
                        color: "var(--text)",
                      }}
                    >
                      <span style={{ fontSize: 20, flexShrink: 0 }} aria-hidden="true">
                        {c.icon}
                      </span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 700, fontSize: 14 }}>{c.label}</span>
                        <span style={{ display: "block", fontSize: 12.5, color: "var(--v2-muted)", marginTop: 2 }}>{c.hint}</span>
                      </span>
                    </button>
                  ))}
                </div>

                {/* Turant jawab — shayad ticket ki zaroorat hi na pade */}
                {quick.length > 0 && (
                  <div className="v2-bundle" style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "var(--v2-gold-ink)", marginBottom: 8 }}>This might already answer it</div>
                    {quick.map((q, i) => (
                      <details key={i} style={{ marginBottom: 6 }}>
                        <summary style={{ cursor: "pointer", fontSize: 14, fontWeight: 700, padding: "6px 0" }}>{q.q}</summary>
                        <div style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7, padding: "4px 0 8px" }}>{q.a}</div>
                      </details>
                    ))}
                  </div>
                )}

                {/* Form */}
                {cat && (
                  <div className="v2-box" style={{ marginTop: 18 }}>
                    <h2 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800 }}>Still need help? Tell us more</h2>
                    <Input label="Your name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} flex />
                      <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} flex />
                    </div>
                    <Input label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} placeholder="Paid ₹149 but descriptive series is locked" />

                    <label style={{ display: "block", marginBottom: 12 }}>
                      <span style={labelCss}>What happened?</span>
                      <textarea
                        className="v2-input"
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        rows={5}
                        placeholder="Include your payment ID or the name of the course/test if you can — it helps us fix it faster."
                        style={{ minHeight: 110 }}
                      />
                    </label>

                    <Input
                      label="Screenshot link (optional)"
                      value={form.screenshot}
                      onChange={(v) => setForm({ ...form, screenshot: v })}
                      placeholder="Upload on i.ibb.co and paste the link"
                    />

                    {error && <div className="v2-msg err">{error}</div>}

                    <button onClick={submit} disabled={sending} className="v2-btn v2-btn-gold" style={{ width: "100%", marginTop: 4 }}>
                      {sending ? "Sending…" : "Send ticket"}
                    </button>
                    <p className="v2-sub" style={{ textAlign: "center", fontSize: 12.5 }}>
                      We reply on the phone number or email you gave above.
                    </p>
                  </div>
                )}
              </div>

              <aside>
                <div className="v2-buycard" style={{ display: "grid", gap: 14 }}>
                  {/* WhatsApp support */}
                  <a href="https://wa.me/918448493637" target="_blank" rel="noopener noreferrer" className="v2-row" style={{ marginTop: 0, background: "rgba(37,211,102,0.08)", border: "1px solid rgba(37,211,102,0.35)" }}>
                    <span style={{ fontSize: 22 }} aria-hidden="true">
                      💬
                    </span>
                    <span style={{ flex: 1 }}>
                      <span style={{ display: "block", fontWeight: 800, fontSize: 14 }}>Chat with us on WhatsApp</span>
                      <span style={{ display: "block", fontSize: 12.5, color: "var(--v2-muted)", marginTop: 1 }}>+91 84484 93637</span>
                    </span>
                  </a>

                  {/* Purane tickets */}
                  {mine.length > 0 ? (
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", color: "var(--v2-muted)", marginBottom: 8 }}>YOUR TICKETS</div>
                      {mine.map((t) => (
                        <div key={t.id} className="v2-review" style={{ padding: 12 }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ fontSize: 13, fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              #{t.id} · {t.subject}
                            </span>
                            <span className={`v2-tag${t.status === "open" ? " gold" : ""}`}>{t.status === "open" ? "WAITING" : "ANSWERED"}</span>
                          </div>
                          {t.admin_reply && (
                            <div style={{ fontSize: 13.5, color: "var(--text2)", marginTop: 8, lineHeight: 1.6, background: "var(--v2-chip)", borderRadius: 10, padding: 10 }}>
                              <b style={{ color: "var(--v2-green)", fontSize: 11 }}>OUR REPLY</b>
                              <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{t.admin_reply}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="v2-sub" style={{ margin: 0 }}>
                      Your tickets and our replies will show up here.
                    </p>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </V2Shell>
  );
}

const labelCss: React.CSSProperties = { fontSize: 12.5, color: "var(--v2-muted)", display: "block", marginBottom: 5, fontWeight: 600 };

function Input({
  label,
  value,
  onChange,
  placeholder,
  flex,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  flex?: boolean;
}) {
  return (
    <label style={{ display: "block", marginBottom: 12, flex: flex ? "1 1 180px" : undefined, minWidth: 0 }}>
      <span style={labelCss}>{label}</span>
      <input className="v2-input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}
