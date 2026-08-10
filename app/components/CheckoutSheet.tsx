"use client";

// Shared full-screen checkout (app jaisa) — course, mock aur descriptive teeno
// isi ko use karte hain. Coupons yahin validate hote hain (product scope ke
// saath); payment khud page karata hai via onPay(couponCode).

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";

const GOLD = "#FFAB00";

const LABELS: Record<string, { tag: string; emoji: string }> = {
  course: { tag: "COURSE", emoji: "📖" },
  mock: { tag: "MOCK SERIES", emoji: "📝" },
  descriptive: { tag: "DESCRIPTIVE SERIES", emoji: "✍️" },
};

type Applied = { code: string; discount: number; final: number };

export default function CheckoutSheet({
  open,
  onClose,
  productType,
  productId,
  title,
  price,
  original = 0,
  subLabel,
  paying,
  onPay,
}: {
  open: boolean;
  onClose: () => void;
  productType: "course" | "mock" | "descriptive";
  productId: number | string;
  title: string;
  price: number;
  original?: number;
  subLabel?: string;
  paying: boolean;
  onPay: (couponCode: string | null, finalAmount: number) => void;
}) {
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<Applied | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [applying, setApplying] = useState(false);

  // Fresh state every time the sheet opens / product changes
  useEffect(() => {
    if (!open) return;
    setApplied(null);
    setCouponInput("");
    setCouponMsg("");
    fetch(`${API_URL}/coupons/public`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const all = (d?.coupons || []) as any[];
        setCoupons(
          all.filter((c) => {
            const st = String(c.scope_type ?? "all");
            if (st === "all") return true;
            return st === productType && String(c.scope_id ?? "") === String(productId);
          })
        );
      })
      .catch(() => {});
  }, [open, productType, productId]);

  async function applyCoupon(codeArg?: string) {
    const code = (codeArg || couponInput).trim().toUpperCase();
    if (!code) return;
    setApplying(true);
    setCouponMsg("");
    try {
      const res = await fetch(`${API_URL}/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          amount: price,
          product_type: productType,
          product_id: String(productId),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setApplied(null);
        setCouponMsg(data.reason || data.detail || "Invalid coupon");
      } else {
        setApplied({ code, discount: data.discount, final: data.final_amount });
        setCouponInput(code);
      }
    } catch {
      setCouponMsg("Could not check coupon. Try again.");
    }
    setApplying(false);
  }

  if (!open) return null;

  const L = LABELS[productType] || LABELS.course;
  const mrp = original > price ? original : price;
  const total = applied ? applied.final : price;
  const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 14.5, margin: "9px 0" };
  const goldBtn: React.CSSProperties = { background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 12, fontWeight: 800, cursor: "pointer" };
  const ghostBtn: React.CSSProperties = { background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 10, fontWeight: 700, cursor: "pointer" };
  const inputStyle: React.CSSProperties = { background: "var(--card)", color: "var(--text)", border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", fontSize: 14, outline: "none" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 25, overflowY: "auto" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "14px 16px 120px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <button onClick={onClose} aria-label="Back" style={{ ...ghostBtn, padding: "8px 12px", fontSize: 16 }}>←</button>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Checkout</h1>
        </div>

        {/* Product card */}
        <div style={{ background: "linear-gradient(135deg, #1a2f55, #2c4a85)", borderRadius: 16, padding: "16px 18px", color: "#fff", display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ fontSize: 26, background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 12px" }}>{L.emoji}</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, opacity: 0.75 }}>{L.tag}</div>
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{title}</div>
            {subLabel && <div style={{ fontSize: 12, opacity: 0.75, marginTop: 2 }}>{subLabel}</div>}
          </div>
        </div>

        {/* Price details */}
        <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 18px", marginTop: 14, boxShadow: "var(--shadow)" }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>🧾 Price Details</div>
          <div style={row}><span>Price</span><b>₹{mrp}</b></div>
          {mrp > price && (
            <div style={row}><span>Discount</span><b style={{ color: "#2e8b4a" }}>− ₹{mrp - price}</b></div>
          )}
          <div style={row}><span>Internet Handling Fee</span><span><s style={{ color: "var(--muted)" }}>₹10</s> <b style={{ color: "#2e8b4a" }}>FREE</b></span></div>
          <div style={row}><span>Platform Fee</span><span><s style={{ color: "var(--muted)" }}>₹5</s> <b style={{ color: "#2e8b4a" }}>FREE</b></span></div>
          <div style={row}><span>GST</span><b style={{ color: "var(--muted)" }}>Included</b></div>
          {applied && (
            <div style={row}><span>Coupon ({applied.code})</span><b style={{ color: "#2e8b4a" }}>− ₹{applied.discount}</b></div>
          )}
          <div style={{ borderTop: "1px dashed var(--line)", margin: "12px 0" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 17, fontWeight: 800 }}>Total Payable</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: GOLD }}>₹{total}</span>
          </div>
          {mrp - total > 0 && (
            <div style={{ marginTop: 12, background: "rgba(93,217,124,0.12)", color: "#2e8b4a", borderRadius: 10, padding: "10px 12px", fontSize: 14, fontWeight: 800, textAlign: "center" }}>
              🎉 You are saving ₹{mrp - total} on this order
            </div>
          )}
        </div>

        {/* Apply coupon */}
        <div style={{ border: `1px solid ${GOLD}`, background: "rgba(255,171,0,0.07)", borderRadius: 16, padding: "16px 18px", marginTop: 14 }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>🏷️ Apply Coupon</div>
          {applied ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(93,217,124,0.5)", background: "rgba(93,217,124,0.1)", borderRadius: 12, padding: "12px 14px" }}>
              <span style={{ color: "#2e8b4a", fontSize: 14, flex: 1 }}>
                ✅ <b>{applied.code}</b> applied — ₹{applied.discount} off
              </span>
              <button onClick={() => { setApplied(null); setCouponInput(""); setCouponMsg(""); }} style={{ ...ghostBtn, padding: "6px 12px", fontSize: 12 }}>Remove</button>
            </div>
          ) : (
            <>
              {coupons.map((cp) => (
                <div key={cp.code} onClick={() => applyCoupon(cp.code)} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, cursor: "pointer", padding: "4px 0" }}>
                  <span>🎟️</span>
                  <span style={{ flex: 1 }}>
                    Use <b style={{ color: GOLD, letterSpacing: 1 }}>{cp.code}</b> for{" "}
                    <b>{cp.discount_type === "percent" ? `${cp.discount_value}% off` : `₹${cp.discount_value} off`}</b>
                  </span>
                  <span style={{ color: GOLD, fontSize: 11.5, fontWeight: 800 }}>TAP TO APPLY</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 10, marginTop: coupons.length ? 10 : 0 }}>
                <input
                  placeholder="Have a coupon code?"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  style={{ ...inputStyle, flex: 1, letterSpacing: 1 }}
                />
                <button
                  onClick={() => applyCoupon()}
                  disabled={applying || !couponInput.trim()}
                  style={{ ...goldBtn, padding: "12px 18px", opacity: applying || !couponInput.trim() ? 0.6 : 1 }}
                >
                  {applying ? "..." : "Apply"}
                </button>
              </div>
            </>
          )}
          {couponMsg && <p style={{ color: "#ff6b6b", fontSize: 13, margin: "8px 0 0" }}>{couponMsg}</p>}
        </div>
      </div>

      {/* Sticky Pay bar */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", background: "var(--header)", borderTop: "1px solid var(--line)", zIndex: 26 }}>
        <button
          onClick={() => onPay(applied?.code || null, total)}
          disabled={paying}
          style={{ ...goldBtn, width: "100%", padding: "15px 20px", fontSize: 16, opacity: paying ? 0.6 : 1 }}
        >
          {paying ? "Please wait..." : `🔒 Pay Securely  ·  ₹${total}`}
        </button>
      </div>
    </div>
  );
}
