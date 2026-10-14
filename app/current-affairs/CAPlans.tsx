"use client";

// CA plan chunna + Razorpay se payment (free period khatam hone ke baad).
// Backend: routers/ca_plans.py — GET /ca/plans, POST /ca/plan/order, POST /ca/plan/verify.
// Student ko sab kuch English me dikhta hai.

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";

export type Plan = { id: number; name: string; days: number; price: number; mrp?: number | null; badge?: string | null; per_month?: number | null };

const rupee = (n: number) => `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function fmtDay(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getDate()} ${MN[d.getMonth()]} ${d.getFullYear()}`;
}
function duration(days: number) {
  if (days % 365 === 0) return days === 365 ? "1 year" : `${days / 365} years`;
  if (days % 30 === 0) return days === 30 ? "1 month" : `${days / 30} months`;
  return days === 1 ? "1 day" : `${days} days`;
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) return resolve(true);
    let s = document.getElementById("rzp-script") as HTMLScriptElement | null;
    if (!s) {
      s = document.createElement("script");
      s.id = "rzp-script";
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(s);
    }
    s.addEventListener("load", () => resolve(true));
    s.addEventListener("error", () => resolve(false));
    setTimeout(() => resolve(!!(window as any).Razorpay), 8000);
  });
}

export default function CAPlans({ userId, passCourseId, onLogin, onDone }: {
  userId?: number; passCourseId?: number | null; onLogin: () => void;
  onDone: (plan: string, expires?: string) => void;
}) {
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [pick, setPick] = useState<number | null>(null);
  const [showCoupon, setShowCoupon] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  useEffect(() => {
    const p = new URLSearchParams();
    if (userId) p.set("user_id", String(userId));
    fetch(`${API_URL}/ca/plans?${p}`).then((r) => (r.ok ? r.json() : null)).then((d) => {
      const list: Plan[] = d?.plans || [];
      setPlans(list);
      const best = list.find((x) => x.badge) || list[0];
      if (best) setPick(best.id);
      // Pichhla payment (verify nahi pahuncha tha) ab mil gaya — seedha khol do.
      // Sirf asli plan / pass par: free period ya kisi aur wajah se khula ho to
      // "Plan is active" galat dikhta tha.
      const why = d?.access?.reason;
      if (d?.access?.open && userId && (why === "plan" || why === "pass"))
        onDone(d.access.plan?.name || "Plan", d.access.plan?.expires_at);
    }).catch(() => setPlans([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const plan = plans?.find((x) => x.id === pick) || null;

  async function buy() {
    if (!userId) { onLogin(); return; }
    if (!plan) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch(`${API_URL}/ca/plan/order`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: plan.id, coupon_code: coupon.trim() || null, user_id: userId }),
      });
      const order = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(order.detail || "Could not start the payment. Please try again.");
      if (order.free) {
        setMsg({ ok: true, text: `You're in! Your plan is active till ${fmtDay(order.expires_at)}.` });
        onDone(order.plan, order.expires_at);
        setBusy(false);
        return;
      }
      if (!(await loadRazorpay())) throw new Error("The payment window could not load. Please check your internet and try again.");
      const u: any = getUser() || {};
      const rzp = new (window as any).Razorpay({
        key: order.key_id, amount: order.amount, currency: order.currency, name: "Selection Lab",
        description: order.title, order_id: order.order_id,
        prefill: { name: u.name || "", email: u.email || "", contact: u.phone || "" },
        theme: { color: "#FFAB00" },
        handler: async (resp: any) => {
          setBusy(true);
          setMsg({ text: "Confirming your payment…" });
          try {
            const v = await fetch(`${API_URL}/ca/plan/verify`, {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...resp, user_id: userId }),
            });
            const d = await v.json().catch(() => ({}));
            if (!v.ok) throw new Error(d.detail || "We could not confirm the payment.");
            setMsg({ ok: true, text: `Payment successful! Your plan is active till ${fmtDay(d.expires_at)}.` });
            onDone(d.plan, d.expires_at);
          } catch (e: any) {
            setMsg({ ok: false, text: `${e.message} If money was deducted, your plan will start automatically within a few minutes. Payment ID: ${resp.razorpay_payment_id}` });
          }
          setBusy(false);
        },
        modal: { ondismiss: () => setBusy(false) },
      });
      rzp.on?.("payment.failed", (e: any) => {
        setMsg({ ok: false, text: e?.error?.description || "The payment failed. Please try again." });
        setBusy(false);
      });
      rzp.open();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || "Something went wrong. Please try again." });
      setBusy(false);
    }
  }

  if (plans === null) return <div className="ca-plans"><div className="ca-psk" /><div className="ca-psk" /></div>;

  if (!plans.length) {
    return passCourseId
      ? <Link className="ca-btn ca-gold ca-wide" href={`/course/${passCourseId}`}>Get the Current Affairs Pass</Link>
      : <p className="ca-pnote">Plans will be available soon.</p>;
  }

  return (
    <div className="ca-plans">
      <div className="ca-pgrid">
        {plans.map((p) => (
          <button key={p.id} className={`ca-plan${pick === p.id ? " on" : ""}`} onClick={() => setPick(p.id)} aria-pressed={pick === p.id}>
            {p.badge && <span className="ca-pbadge">{p.badge}</span>}
            <span className="ca-pname">{p.name}</span>
            <span className="ca-pprice">
              {p.price > 0 ? rupee(p.price) : "Free"}
              {!!p.mrp && p.mrp > p.price && <s>{rupee(p.mrp)}</s>}
            </span>
            <span className="ca-pdur">{duration(p.days)}{p.per_month ? ` · ${rupee(p.per_month)}/month` : ""}</span>
          </button>
        ))}
      </div>
      {showCoupon ? (
        <input className="ca-search ca-coupon" value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())}
          placeholder="Coupon code" autoCapitalize="characters" />
      ) : (
        <button className="ca-plink" onClick={() => setShowCoupon(true)}>Have a coupon code?</button>
      )}
      <button className="ca-btn ca-gold ca-wide ca-pbuy" disabled={busy || !plan} onClick={buy}>
        {!userId ? "Log in to continue" : busy ? "Please wait…" : plan ? `Continue — ${plan.price > 0 ? rupee(plan.price) : "Free"}` : "Choose a plan"}
      </button>
      {msg && <div className={`ca-pmsg${msg.ok ? " ok" : msg.ok === false ? " bad" : ""}`}>{msg.text}</div>}
      <p className="ca-pnote">Secure payment by Razorpay · UPI, cards, net banking. Your plan starts right after payment.</p>
    </div>
  );
}

export const PLANS_CSS = `
.ca .ca-plans{display:grid;gap:10px;width:100%}
.ca .ca-pgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.ca .ca-plan{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left;border:1.5px solid var(--ca-line);background:var(--card);border-radius:14px;padding:14px 13px 12px}
.ca .ca-plan.on{border-color:#ffab00;background:var(--ca-wash);box-shadow:0 0 0 3px rgba(255,171,0,.18)}
.ca .ca-pbadge{position:absolute;top:-10px;right:10px;background:#1c3366;color:#fff;font-size:10.5px;font-weight:800;border-radius:999px;padding:3px 9px;letter-spacing:.3px}
.ca .ca-pname{font-size:13px;font-weight:700;color:var(--muted)}
.ca .ca-pprice{font-size:22px;font-weight:800;color:var(--text);display:flex;gap:7px;align-items:baseline}
.ca .ca-pprice s{font-size:13px;color:var(--muted);font-weight:600}
.ca .ca-pdur{font-size:12px;color:var(--muted)}
.ca .ca-plink{border:none;background:none;padding:0;font-size:12.5px;font-weight:700;color:var(--v2-gold-ink,#8a5a00);justify-self:start}
.ca .ca-coupon{max-width:240px;text-transform:uppercase}
.ca .ca-pbuy{padding:12px;font-size:14.5px}
.ca .ca-pbuy:disabled{opacity:.6}
.ca .ca-pmsg{font-size:13px;border-radius:10px;padding:9px 12px;background:var(--ca-chip)}
.ca .ca-pmsg.ok{background:#2e7d461a;color:var(--ca-green)}
.ca .ca-pmsg.bad{background:#c0392b14;color:var(--ca-red)}
.ca .ca-pnote{margin:0;font-size:11.5px;color:var(--muted)}
.ca .ca-psk{height:84px;border-radius:14px;background:var(--ca-chip);animation:caP 1.2s ease-in-out infinite}
`;
