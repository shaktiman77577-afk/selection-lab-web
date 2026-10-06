"use client";

// Descriptive series list (website redesign, Oct 2026).
// Sirf LOOK badla hai. Khareedne ka poora logic (order, 100% coupon, Razorpay,
// verify, CheckoutSheet) purane page se akshar-akshar waisa hi hai.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getUser } from "@/lib/api";
import { API_URL } from "@/lib/config";
import CheckoutSheet from "@/app/components/CheckoutSheet";
import ProductCard from "./ProductCard";
import { IconPen, IconSend, IconLock } from "./Icons";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const GOLD = "#FFAB00";

interface Series {
  id: number;
  title: string;
  description?: string;
  thumbnail_url?: string;
  thumbnail_url_mobile?: string;
  price?: number;
  original_price?: number;
  validity_days?: number;
  // lock status may arrive under any of these keys depending on backend:
  is_purchased?: boolean;
  unlocked?: boolean;
  is_unlocked?: boolean;
  purchased?: boolean;
  telegram_group?: string;
  [key: string]: any;
}

function isLocked(s: Series): boolean {
  if (Number(s.price ?? 0) <= 0) return false; // free series never locked
  // Backend `is_purchased` bhejta hai; baaki naam purane builds ke liye rakhe hain
  return !(s.is_purchased ?? s.unlocked ?? s.is_unlocked ?? s.purchased ?? false);
}

export default function DescriptiveList({ initial }: { initial: Series[] }) {
  const router = useRouter();
  const [series, setSeries] = useState<Series[]>(initial);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState<Series | null>(null); // series in checkout
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function load(u = getUser()) {
    const uid = (u as any)?.id;
    // platform=web -> backend "App only" wali series website pe nahi dikhata
    fetch(`${API_URL}/descriptive/series?platform=web${uid ? `&user_id=${uid}` : ""}`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.series ?? data?.data ?? [];
        setSeries(list);
        setError("");
      })
      .catch(() => setError("Could not load tests. Please try again."));
  }

  useEffect(() => {
    const u = getUser();
    // Login ho to user ke saath dobara (Locked / Unlocked sahi dikhe)
    if (u) load(u);
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
      // 100% coupon — server ne seedha unlock kar diya, Razorpay ki zaroorat nahi
      if (order.free) {
        setBuying(null);
        setPayMsg({ ok: true, text: "🎉 Series unlocked with your coupon! All tests are now available." });
        setPaying(false);
        load();
        return;
      }
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
    <>
      {error && <div className="v2-msg err">{error}</div>}

      {series.length === 0 ? (
        <div className="v2-empty">
          <IconPen size={40} />
          <p style={{ margin: "10px 0 0" }}>New descriptive series launching soon — join our Telegram for updates!</p>
        </div>
      ) : (
        <div className="v2-grid">
          {series.map((s, k) => {
            const locked = isLocked(s);
            const free = Number(s.price ?? 0) <= 0;
            return (
              <ProductCard
                key={s.id}
                href={`/descriptive/${s.id}`}
                title={s.title}
                img={s.thumbnail_url || undefined}
                imgMobile={s.thumbnail_url_mobile || undefined}
                price={Number(s.price) || 0}
                original={Number(s.original_price) || 0}
                owned={!locked && !free}
                priority={k < 4}
                fallback={<IconPen size={30} />}
                badge={
                  locked ? (
                    <span className="v2-tag dark">
                      <IconLock size={12} /> Locked
                    </span>
                  ) : free ? (
                    <span className="v2-tag solid">FREE</span>
                  ) : (
                    <span className="v2-tag gold">✓ Unlocked</span>
                  )
                }
                actions={
                  s.telegram_group || locked ? (
                    <>
                      {s.telegram_group ? (
                        <a href={s.telegram_group} target="_blank" rel="noreferrer" className="v2-tg">
                          <IconSend size={15} /> Telegram channel
                        </a>
                      ) : null}
                      {locked ? (
                        <button
                          className="v2-btn v2-btn-gold v2-btn-sm"
                          style={{ width: "100%" }}
                          onClick={() => {
                            // card tap = demo dekho; ye button = kharido
                            if (!getUser()) {
                              router.push("/login");
                              return;
                            }
                            setBuying(s);
                          }}
                        >
                          Buy ₹{s.price}
                        </button>
                      ) : null}
                    </>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      )}

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
            <button onClick={() => setPayMsg(null)} className="v2-btn v2-btn-gold v2-btn-sm">
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}
