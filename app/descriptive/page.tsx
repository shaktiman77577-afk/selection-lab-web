"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser, User } from "@/lib/api";
import { API_URL } from "@/lib/config";
import ThemeToggle from "@/app/components/ThemeToggle";
import SideMenu from "@/app/components/SideMenu";
import CheckoutSheet from "@/app/components/CheckoutSheet";

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
  thumbnail_url?: string;
  price?: number;
  original_price?: number;
  validity_days?: number;
  // lock status may arrive under any of these keys depending on backend:
  unlocked?: boolean;
  is_unlocked?: boolean;
  purchased?: boolean;
}

function isLocked(s: Series): boolean {
  if (Number(s.price ?? 0) <= 0) return false; // free series never locked
  return !(s.unlocked ?? s.is_unlocked ?? s.purchased ?? false);
}

export default function DescriptiveListPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [buying, setBuying] = useState<Series | null>(null); // series in checkout
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function load(u = getUser()) {
    const uid = (u as any)?.id;
    fetch(`${API_URL}/descriptive/series${uid ? `?user_id=${uid}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.series ?? data?.data ?? [];
        setSeries(list);
      })
      .catch(() => setError("Could not load tests. Please try again."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const u = getUser();
    setUser(u);
    load(u);
    // Razorpay checkout script (once)
    if (!document.querySelector('script[src*="checkout.razorpay.com"]')) {
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.async = true;
      document.body.appendChild(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function payForSeries(couponCode: string | null = null) {
    const u = getUser();
    if (!u || !buying) return;
    setPaying(true);
    setPayMsg(null);
    try {
      const res = await fetch(`${API_URL}/descriptive/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: (u as any).id, series_id: buying.id, coupon_code: couponCode }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.detail || "Could not create order");
      if (!window.Razorpay) throw new Error("Payment system is loading, please try again");
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
            const vres = await fetch(`${API_URL}/descriptive/verify`, {
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
            setPayMsg({ ok: true, text: "🎉 Series unlocked! All tests are now available." });
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

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      {/* ── Header ── */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "var(--header)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="Menu"
          style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 4 }}
        >
          ☰
        </button>
        <div style={{ fontWeight: 800, fontSize: 17, flex: 1 }}>Descriptive Tests</div>
        <ThemeToggle />
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 40px" }}>
        {/* ── Intro banner ── */}
        <section
          style={{
            background: `linear-gradient(135deg, ${NAVY}, #2c4a85)`,
            borderRadius: 18,
            padding: "22px 20px",
            color: "#fff",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", right: -30, top: -30, width: 150, height: 150, borderRadius: "50%", background: "rgba(255,171,0,0.15)" }} />
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>
            Descriptive Writing Practice
          </h1>
          <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", maxWidth: 460 }}>
            Essay, Précis and Letter writing tests for banking &amp; descriptive exams. Write against the clock, then compare with a model answer and your auto-score.
          </p>
        </section>

        <h2 style={h2}>Test Series</h2>

        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading tests…</p>
        ) : error ? (
          <p style={{ color: "#c0392b", fontSize: 14 }}>{error}</p>
        ) : series.length === 0 ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>
            New descriptive series launching soon — join our Telegram for updates!
          </p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
            {series.map((s) => {
              const locked = isLocked(s);
              const free = Number(s.price ?? 0) <= 0;
              return (
                <div
                  key={s.id}
                  onClick={() => router.push(`/descriptive/${s.id}`)}
                  style={{
                    background: "var(--card)",
                    border: "1px solid var(--line)",
                    borderRadius: 14,
                    overflow: "hidden",
                    cursor: "pointer",
                    boxShadow: "var(--shadow)",
                    position: "relative",
                  }}
                >
                  <div style={{ width: "100%", aspectRatio: "16 / 9", background: "var(--chip)", overflow: "hidden", position: "relative" }}>
                    {s.thumbnail_url ? (
                      <img src={s.thumbnail_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: 30 }}>✍️</div>
                    )}
                    <span
                      style={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        background: locked ? "rgba(0,0,0,0.65)" : free ? "#2e8b4a" : GOLD,
                        color: locked ? "#fff" : free ? "#fff" : "#1a1a1a",
                        fontSize: 10.5,
                        fontWeight: 800,
                        padding: "3px 8px",
                        borderRadius: 20,
                      }}
                    >
                      {locked ? "🔒 Locked" : free ? "FREE" : "✓ Unlocked"}
                    </span>
                  </div>
                  <div style={{ padding: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.4, minHeight: 36, overflow: "hidden" }}>{s.title}</div>
                    <div style={{ marginTop: 6, fontSize: 13.5 }}>
                      {free ? (
                        <b style={{ color: "#2e8b4a" }}>FREE</b>
                      ) : (
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
                        onClick={(e) => {
                          e.stopPropagation(); // card tap = demo dekho; ye button = kharido
                          if (!getUser()) { router.push("/login"); return; }
                          setBuying(s);
                        }}
                        style={{ marginTop: 8, width: "100%", background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "9px 0", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
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
      </main>

      {/* ── Checkout (shared component) ── */}
      {buying && (
        <CheckoutSheet
          open={!!buying}
          onClose={() => setBuying(null)}
          productType="descriptive"
          productId={buying.id}
          title={buying.title}
          price={Number(buying.price) || 0}
          original={Number(buying.original_price) || 0}
          paying={paying}
          onPay={(code) => payForSeries(code)}
        />
      )}

      {/* Payment result modal */}
      {payMsg && (
        <div
          onClick={() => setPayMsg(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 30, padding: 20 }}
        >
          <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: "22px 20px", maxWidth: 420, textAlign: "center" }}>
            <div style={{ fontSize: 34 }}>{payMsg.ok ? "🎉" : "⚠️"}</div>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, margin: "10px 0 14px" }}>{payMsg.text}</p>
            <button onClick={() => setPayMsg(null)} style={{ background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 800, cursor: "pointer" }}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}

const h2: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: "26px 0 10px" };
