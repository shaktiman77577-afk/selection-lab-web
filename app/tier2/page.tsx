"use client";

/**
 * app/tier2/page.tsx — Tier 2 Practice (typing test + Excel/CPT).
 *
 * Ek hi page me sab: series list, kharidne ka flow, aur kharidne ke baad
 * passages + progress. Descriptive ki tarah do alag route nahi banaye —
 * yahan zyadatar ek hi series hogi, to do page kholna bekaar ka kaam hai.
 *
 * Backend: /api/tier2/...
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getUser, User } from "@/lib/api";
import { API_URL } from "@/lib/config";
import ThemeToggle from "@/app/components/ThemeToggle";
import SideMenu from "@/app/components/SideMenu";
import CheckoutSheet from "@/app/components/CheckoutSheet";
import Disclaimer from "@/app/components/Disclaimer";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";

interface Series {
  id: number;
  title: string;
  description?: string;
  price?: number;
  original_price?: number;
  thumbnail_url?: string;
  thumbnail_url_mobile?: string;
  telegram_group?: string;
  is_purchased?: boolean;
  practice_count?: number;
  typing_test_count?: number;
  [key: string]: any;
}

interface Passage {
  id: number;
  title: string;
  test_number: number;
  kind: string;
  duration_min?: number;
  target_wpm?: number;
  unlocked?: boolean;
}

function isLocked(s: Series): boolean {
  if (Number(s.price ?? 0) <= 0) return false;
  return !s.is_purchased;
}

export default function Tier2Page() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [open, setOpen] = useState<Series | null>(null);
  // Series ke andar do hisse hain. Dono ek saath load karne ki zaroorat nahi —
  // jo khola jaye wahi mangwate hain, warna khaali intezaar hota hai.
  const [section, setSection] = useState<"typing" | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [progress, setProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [narrow, setNarrow] = useState(false);

  const [buying, setBuying] = useState<Series | null>(null);
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const load = useCallback((u = getUser()) => {
    const uid = (u as any)?.id;
    fetch(`${API_URL}/tier2/series?platform=web${uid ? `&user_id=${uid}` : ""}`)
      .then((r) => r.json())
      .then((d) => setSeries(d?.series || []))
      .catch(() => setError("Could not load Tier 2 Practice. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    load(u);
    if (!document.querySelector('script[src*="checkout.razorpay.com"]')) {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.body.appendChild(s);
    }
  }, [load]);

  // ── Series kholna: passages + progress ──
  // Locked series bhi poori khulti hai. Student ko pehle andar ka saamaan
  // dikhna chahiye — kitne passages, kitne test, aur free wala kaunsa hai.
  function openSeries(s: Series) {
    push();
    setOpen(s);
    setSection(null);
    setDetail(null);
  }

  // Typing wala hissa tabhi mangwate hain jab student usme jaye
  async function openTyping() {
    if (!open) return;
    push();
    setSection("typing");
    if (detail) return;                   // pehle se hai to dobara mat mangwao
    const uid = (getUser() as any)?.id;
    try {
      const r = await fetch(`${API_URL}/tier2/series/${open.id}${uid ? `?user_id=${uid}` : ""}`);
      setDetail(await r.json());
    } catch {
      setError("Could not load the passages.");
    }
    if (uid) {
      fetch(`${API_URL}/tier2/typing/progress?user_id=${uid}`)
        .then((r) => r.json())
        .then(setProgress)
        .catch(() => {});
    }
  }

  // ── Back button ──
  // Har andar wale step par browser ki history me ek entry daalte hain, taaki
  // back dabane par ek kadam peeche jaye, poora page chhod kar nahi.
  function push() {
    try { window.history.pushState({ tier2: true }, ""); } catch {}
  }

  function goBack() {
    try { window.history.back(); } catch { setSection(null); setOpen(null); }
  }

  useEffect(() => {
    function onPop() {
      if (section) setSection(null);
      else if (open) setOpen(null);
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, section]);

  function openBuy() {
    if (!getUser()) { router.push("/login"); return; }
    if (open) setBuying(open);
  }

  async function pay(couponCode: string | null = null) {
    const u = getUser();
    if (!u || !buying) return;
    setPaying(true);
    setPayMsg(null);
    try {
      const res = await fetch(`${API_URL}/tier2/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: (u as any).id, series_id: buying.id, coupon_code: couponCode }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.detail || "Could not create the order");
      if (!window.Razorpay) throw new Error("Payment system is still loading. Please try once more.");

      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Selection Lab",
        description: order.title || buying.title,
        order_id: order.order_id,
        prefill: { name: (u as any).name || "", email: (u as any).email || "", contact: (u as any).phone || "" },
        theme: { color: GOLD },
        handler: async (resp: any) => {
          try {
            const vres = await fetch(`${API_URL}/tier2/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: (u as any).id,
                series_id: buying.id,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                coupon_code: couponCode,
              }),
            });
            const vd = await vres.json();
            if (!vres.ok) throw new Error(vd.detail || "Verification failed");
            setBuying(null);
            setPayMsg({ ok: true, text: "🎉 Tier 2 Practice unlocked!" });
            load();
          } catch (e: any) {
            setPayMsg({ ok: false, text: e.message });
          }
          setPaying(false);
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (e: any) {
      setPayMsg({ ok: false, text: e.message });
      setPaying(false);
    }
  }

  const uid = (user as any)?.id;

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <header
        style={{
          position: "sticky", top: 0, zIndex: 50, display: "flex", alignItems: "center", gap: 10,
          padding: "10px 14px", background: "var(--header)", backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button
          onClick={() => (open ? goBack() : setMenuOpen(true))}
          aria-label={open ? "Back" : "Menu"}
          style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 4 }}
        >
          {open ? "←" : "☰"}
        </button>
        <div style={{ fontWeight: 800, fontSize: 17, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {section === "typing" ? "Typing test practice" : open ? open.title : "Tier 2 Practice"}
        </div>
        <ThemeToggle />
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 40px" }}>
        {!open && (
          <>
            <section
              style={{
                background: `linear-gradient(135deg, ${NAVY}, #2c4a85)`, borderRadius: 18,
                padding: "22px 20px", color: "#fff", position: "relative", overflow: "hidden",
              }}
            >
              <div style={{ position: "absolute", right: -30, top: -30, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,171,0,0.15)" }} />
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>Tier 2 Practice</h1>
              <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", maxWidth: 460 }}>
                Typing test and Excel/CPT, both set up the way the real exam runs. Print the
                passage, select its number, and type on an exam-style screen with the backspace
                key disabled.
              </p>
            </section>

            <Disclaimer />

            <h2 style={h2}>Series</h2>

            {loading ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>
            ) : error ? (
              <p style={{ color: "#c0392b", fontSize: 14 }}>{error}</p>
            ) : series.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Tier 2 Practice is coming soon.</p>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
                {series.map((s) => {
                  const locked = isLocked(s);
                  const free = Number(s.price ?? 0) <= 0;
                  return (
                    <div
                      key={s.id}
                      onClick={() => openSeries(s)}
                      style={{
                        background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14,
                        overflow: "hidden", cursor: "pointer", boxShadow: "var(--shadow)",
                      }}
                    >
                      <div style={{ width: "100%", aspectRatio: "16 / 9", background: "var(--chip)", position: "relative" }}>
                        {(s.thumbnail_url || s.thumbnail_url_mobile) ? (
                          <img
                            src={(narrow && s.thumbnail_url_mobile) || s.thumbnail_url || s.thumbnail_url_mobile}
                            alt=""
                            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          />
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 30 }}>⌨️</div>
                        )}
                        <span
                          style={{
                            position: "absolute", top: 8, left: 8,
                            background: locked ? "rgba(0,0,0,0.65)" : free ? "#2e8b4a" : GOLD,
                            color: locked || free ? "#fff" : "#1a1a1a",
                            fontSize: 10.5, fontWeight: 800, padding: "3px 8px", borderRadius: 20,
                          }}
                        >
                          {locked ? "🔒 Locked" : free ? "FREE" : "✓ Unlocked"}
                        </span>
                      </div>
                      <div style={{ padding: 12 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, lineHeight: 1.4 }}>{s.title}</div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
                          {s.practice_count || 0} practice passages · {s.typing_test_count || 0} typing tests
                        </div>
                        <div style={{ marginTop: 8, fontSize: 13.5 }}>
                          {free ? <b style={{ color: "#2e8b4a" }}>FREE</b> : (
                            <>
                              <b style={{ color: GOLD }}>₹{s.price}</b>
                              {Number(s.original_price) > Number(s.price) && (
                                <span style={{ color: "var(--muted)", textDecoration: "line-through", fontSize: 11.5, marginLeft: 5 }}>
                                  ₹{s.original_price}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {locked && (
                          <button
                            onClick={(e) => { e.stopPropagation(); if (!getUser()) { router.push("/login"); return; } setBuying(s); }}
                            style={{ marginTop: 10, width: "100%", background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "10px 0", fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}
                          >
                            Buy ₹{s.price}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Series ke andar: sirf do card ── */}
        {open && !section && (
          <>
            {isLocked(open) && (
              <div
                style={{
                  background: "var(--card)", border: `1px solid ${GOLD}`, borderRadius: 14,
                  padding: 14, marginBottom: 14, display: "flex", alignItems: "center", gap: 12,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800 }}>
                    <b style={{ color: GOLD }}>₹{open.price}</b>
                    {Number(open.original_price) > Number(open.price) && (
                      <span style={{ color: "var(--muted)", textDecoration: "line-through", fontSize: 12, marginLeft: 6 }}>
                        ₹{open.original_price}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3, lineHeight: 1.5 }}>
                    Try the free test first. The rest opens after you buy.
                  </div>
                </div>
                <button
                  onClick={openBuy}
                  style={{ background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "11px 18px", fontWeight: 800, fontSize: 13.5, cursor: "pointer", flexShrink: 0 }}
                >
                  Unlock all
                </button>
              </div>
            )}

            <SectionCard
              emoji="⌨️"
              title="Typing test practice"
              sub={`${open.practice_count || 0} practice passages and ${open.typing_test_count || 0} typing tests`}
              onClick={openTyping}
            />
            <SectionCard
              emoji="📊"
              title="Excel / CPT practice"
              sub="38 formula chart, guided practice and 10 mock tests"
              onClick={() => router.push("/tier2/excel")}
            />

            <Disclaimer />
          </>
        )}

        {/* ── Typing wala hissa ── */}
        {open && section === "typing" && (
          <>
            {!detail ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>
            ) : (
              <>
                {progress && progress.total_attempts > 0 && (
                  <ProgressCard progress={progress} />
                )}

                <h2 style={h2}>Practice passages</h2>
                <p style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.6, margin: "0 0 12px" }}>
                  Download the PDF and print it first. In the real exam the passage is handed to
                  you on paper, not shown on screen, so practise the same way.
                </p>

                {(detail.practice || []).some((p: Passage) => p.unlocked) && uid && (
                  <a
                    href={`${API_URL}/tier2/typing/pdf-all/${open.id}?user_id=${uid}`}
                    style={{
                      display: "block", textAlign: "center", background: GOLD, color: "#1a1a1a",
                      borderRadius: 12, padding: "12px 0", fontWeight: 800, fontSize: 14,
                      textDecoration: "none", marginBottom: 14,
                    }}
                  >
                    ⬇️ All practice passages in one PDF
                  </a>
                )}

                {(detail.practice || []).map((p: Passage) => (
                  <PassageRow key={p.id} p={p} uid={uid} router={router} onLocked={openBuy} />
                ))}
                {(detail.practice || []).length === 0 && (
                  <p style={{ color: "var(--muted)", fontSize: 14 }}>Practice passages coming soon.</p>
                )}

                <h2 style={h2}>Typing tests</h2>
                {(detail.tests || []).map((p: Passage) => (
                  <PassageRow key={p.id} p={p} uid={uid} router={router} isTest onLocked={openBuy} />
                ))}
                {(detail.tests || []).length === 0 && (
                  <p style={{ color: "var(--muted)", fontSize: 14 }}>Typing tests coming soon.</p>
                )}
              </>
            )}
          </>
        )}

      </main>

      {buying && (
        <CheckoutSheet
          open={!!buying}
          onClose={() => setBuying(null)}
          productType="tier2"
          productId={buying.id}
          title={buying.title}
          price={Number(buying.price) || 0}
          original={Number(buying.original_price) || 0}
          paying={paying}
          onPay={(code) => pay(code)}
        />
      )}

      {payMsg && (
        <div
          onClick={() => setPayMsg(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, padding: 20 }}
        >
          <div style={{ background: "var(--card)", borderRadius: 16, padding: 22, maxWidth: 340, textAlign: "center" }}>
            <div style={{ fontSize: 34 }}>{payMsg.ok ? "🎉" : "⚠️"}</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: "10px 0 16px" }}>{payMsg.text}</p>
            <button
              onClick={() => setPayMsg(null)}
              style={{ background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 800, cursor: "pointer" }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Series ke andar ka bada card ────────────────────────────────────────────
function SectionCard({ emoji, title, sub, onClick }: { emoji: string; title: string; sub: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14,
        padding: 16, marginBottom: 12, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 14, boxShadow: "var(--shadow)",
      }}
    >
      <div style={{ fontSize: 30 }}>{emoji}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15.5, fontWeight: 800 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4, lineHeight: 1.5 }}>{sub}</div>
      </div>
      <span style={{ color: "var(--muted)", fontSize: 22 }}>›</span>
    </div>
  );
}

// ── Ek passage ki row ───────────────────────────────────────────────────────
function PassageRow({ p, uid, router, isTest, onLocked }: { p: Passage; uid?: number; router: any; isTest?: boolean; onLocked: () => void }) {
  return (
    <div
      style={{
        background: "var(--card)", border: "1px solid var(--line)", borderRadius: 12,
        padding: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 12,
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: "var(--chip)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 900, fontSize: 16, color: GOLD,
        }}
      >
        {p.test_number}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>{p.title}</div>
        <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 2 }}>
          Test {p.test_number} · {p.duration_min || 10} min · {p.target_wpm || 30} net WPM
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        {p.unlocked && uid && (
          <a
            href={`${API_URL}/tier2/typing/pdf/${p.id}?user_id=${uid}`}
            style={{
              border: "1px solid var(--line)", borderRadius: 9, padding: "8px 11px",
              fontSize: 12, fontWeight: 700, textDecoration: "none", color: "var(--text)",
            }}
          >
            PDF
          </a>
        )}
        {p.unlocked ? (
          <button
            onClick={() => router.push(`/typing-test/${p.id}`)}
            style={{ background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 9, padding: "8px 14px", fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}
          >
            {isTest ? "Start" : "Practice"}
          </button>
        ) : (
          <button
            onClick={onLocked}
            style={{ background: "transparent", color: "var(--muted)", border: "1px solid var(--line)", borderRadius: 9, padding: "8px 14px", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
          >
            🔒 Unlock
          </button>
        )}
      </div>
    </div>
  );
}

// ── Progress: best/average + 30 din ka chart ────────────────────────────────
// Koi chart library nahi — seedha SVG. Bundle bhaari karne ki zaroorat nahi.
function ProgressCard({ progress }: { progress: any }) {
  const pts: number[] = (progress.attempts || []).map((a: any) => Number(a.net_wpm) || 0);
  const w = 300, h = 70;
  const max = Math.max(40, ...pts);
  const path = pts.length > 1
    ? pts.map((v, i) => `${i === 0 ? "M" : "L"} ${(i / (pts.length - 1)) * w} ${h - (v / max) * h}`).join(" ")
    : "";

  return (
    <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 14, padding: 14, marginBottom: 6 }}>
      <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
        <Stat label="Best" value={`${progress.best_wpm} WPM`} />
        <Stat label="Average" value={`${progress.avg_wpm} WPM`} />
        <Stat label="Accuracy" value={`${progress.avg_accuracy}%`} />
        <Stat label="Attempts" value={String(progress.total_attempts)} />
      </div>
      {pts.length > 1 && (
        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 70, display: "block", overflow: "visible" }}>
          <path d={path} fill="none" stroke={GOLD} strokeWidth={2} strokeLinejoin="round" />
        </svg>
      )}
      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 6 }}>
        Net WPM over the last 30 days
        {progress.wrong_selections > 0 ? ` · ${progress.wrong_selections} times a wrong test number was selected` : ""}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)" }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: GOLD }}>{value}</div>
    </div>
  );
}

const h2: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: "26px 0 10px" };
