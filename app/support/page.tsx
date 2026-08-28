"use client";

// Raise a ticket — sidebar se khulta hai.
//
// Pehle common sawaalon ke jawab dikhte hain (payment, access, PDF) — kaafi
// students ka kaam wahin ban jata hai aur ticket banane ki zaroorat hi nahi
// padti. Jinka nahi banta, wo form bhar dete hain.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";

const GOLD = "#FFAB00";
const GREEN = "#2e8b4a";

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
  const router = useRouter();
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

  if (done) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ fontSize: 48 }}>✅</div>
          <h1 style={{ fontSize: 21, fontWeight: 800, margin: "12px 0 8px" }}>Ticket received</h1>
          {done.ticket_id && (
            <div style={{ fontSize: 13, color: "var(--muted)" }}>
              Your ticket number is <b style={{ color: GOLD }}>#{done.ticket_id}</b>
            </div>
          )}
          <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.65, marginTop: 12 }}>
            {done.message || "We usually reply within 24 hours."}
          </p>
          <button onClick={() => router.push("/")} style={gold}>Back to home</button>
        </div>
      </div>
    );
  }

  const quick = QUICK[cat] || [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: 16 }}>
        <button onClick={() => router.back()} style={{ ...ghost, marginBottom: 14 }}>← Back</button>

        <h1 style={{ fontSize: 22, fontWeight: 800, margin: "0 0 6px" }}>
          Need <span style={{ color: GOLD }}>help?</span>
        </h1>
        <p style={{ fontSize: 13.5, color: "var(--muted)", margin: "0 0 14px", lineHeight: 1.6 }}>
          Tell us what went wrong and we will sort it out. Most tickets are answered within 24 hours.
        </p>

        {/* WhatsApp support — sirf is page par */}
        <a
          href="https://wa.me/918448493637"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
            background: "rgba(37,211,102,0.09)", border: "1px solid #25D36655", borderRadius: 12,
            padding: 12, marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 22 }}>💬</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text)" }}>Chat with us on WhatsApp</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1 }}>+91 84484 93637</div>
          </div>
        </a>

        {/* Purane tickets */}
        {mine.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>YOUR TICKETS</div>
            {mine.map((t) => (
              <div key={t.id} style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12, padding: 12, marginBottom: 8 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    #{t.id} · {t.subject}
                  </span>
                  <span
                    style={{
                      fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 6,
                      color: t.status === "open" ? GOLD : GREEN,
                      background: t.status === "open" ? "rgba(255,171,0,0.14)" : "rgba(46,139,74,0.14)",
                    }}
                  >
                    {t.status === "open" ? "WAITING" : "ANSWERED"}
                  </span>
                </div>
                {t.admin_reply && (
                  <div style={{ fontSize: 13, color: "var(--text2)", marginTop: 8, lineHeight: 1.6, background: "var(--chip)", borderRadius: 9, padding: 10 }}>
                    <b style={{ color: GREEN, fontSize: 11 }}>OUR REPLY</b>
                    <div style={{ marginTop: 4, whiteSpace: "pre-wrap" }}>{t.admin_reply}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Category */}
        <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--muted)", marginBottom: 8 }}>
          WHAT IS THIS ABOUT?
        </div>
        {CATEGORIES.map((c) => (
          <div
            key={c.id}
            onClick={() => setCat(c.id)}
            style={{
              display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer",
              background: "var(--card)", borderRadius: 12, padding: 13, marginBottom: 9,
              border: `1.5px solid ${cat === c.id ? GOLD : "var(--line)"}`,
            }}
          >
            <span style={{ fontSize: 20, flexShrink: 0 }}>{c.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{c.label}</div>
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>{c.hint}</div>
            </div>
          </div>
        ))}

        {/* Turant jawab — shayad ticket ki zaroorat hi na pade */}
        {quick.length > 0 && (
          <div style={{ background: "rgba(255,171,0,0.07)", border: `1px solid ${GOLD}44`, borderRadius: 14, padding: 15, marginTop: 14 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: GOLD, marginBottom: 10 }}>
              💡 THIS MIGHT ALREADY ANSWER IT
            </div>
            {quick.map((q, i) => (
              <details key={i} style={{ marginBottom: 8 }}>
                <summary style={{ cursor: "pointer", fontSize: 13.5, fontWeight: 700, padding: "6px 0" }}>{q.q}</summary>
                <div style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.7, padding: "4px 0 8px" }}>{q.a}</div>
              </details>
            ))}
          </div>
        )}

        {/* Form */}
        {cat && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--muted)", marginBottom: 10 }}>
              STILL NEED HELP? TELL US MORE
            </div>

            <Input label="Your name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
            <div style={{ display: "flex", gap: 10 }}>
              <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} flex />
              <Input label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} flex />
            </div>
            <Input
              label="Subject"
              value={form.subject}
              onChange={(v) => setForm({ ...form, subject: v })}
              placeholder="Paid ₹149 but descriptive series is locked"
            />

            <label style={{ fontSize: 12.5, color: "var(--muted)", display: "block", marginBottom: 5 }}>
              What happened?
            </label>
            <textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              rows={5}
              placeholder="Include your payment ID or the name of the course/test if you can — it helps us fix it faster."
              style={{ ...inputCss, minHeight: 110, resize: "vertical", marginBottom: 12 }}
            />

            <Input
              label="Screenshot link (optional)"
              value={form.screenshot}
              onChange={(v) => setForm({ ...form, screenshot: v })}
              placeholder="Upload on i.ibb.co and paste the link"
            />

            {error && (
              <div style={{ fontSize: 13, color: "#d64545", marginBottom: 10, fontWeight: 600 }}>{error}</div>
            )}

            <button onClick={submit} disabled={sending} style={{ ...gold, width: "100%", opacity: sending ? 0.6 : 1 }}>
              {sending ? "Sending…" : "Send ticket"}
            </button>

            <p style={{ fontSize: 11.5, color: "var(--muted)", textAlign: "center", marginTop: 10, lineHeight: 1.6 }}>
              We reply on the phone number or email you gave above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Input({
  label, value, onChange, placeholder, flex,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; flex?: boolean }) {
  return (
    <div style={{ marginBottom: 12, flex: flex ? 1 : undefined, minWidth: 0 }}>
      <label style={{ fontSize: 12.5, color: "var(--muted)", display: "block", marginBottom: 5 }}>{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={inputCss}
      />
    </div>
  );
}

const inputCss: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", background: "var(--card)", color: "var(--text)",
  border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", fontSize: 14.5,
  outline: "none", fontFamily: "inherit",
};

const gold: React.CSSProperties = {
  background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 12,
  padding: "13px 22px", fontWeight: 800, fontSize: 15, cursor: "pointer", marginTop: 14,
};

const ghost: React.CSSProperties = {
  background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)",
  borderRadius: 10, padding: "8px 14px", fontWeight: 700, fontSize: 13.5, cursor: "pointer",
};
      
