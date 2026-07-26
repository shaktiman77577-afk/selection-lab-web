"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser, User } from "@/lib/api";
import { getCourses, Course, courseTitle, courseImage } from "@/lib/supabase";

const GOLD = "#FFAB00";
const BG = "var(--bg)";
const CARD = "var(--card)";
const BORDER = "rgba(255,171,0,0.25)";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [avg, setAvg] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [owned, setOwned] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; final: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (u) {
      fetch(`${API_URL}/courses/my/${u.id}`)
        .then((r) => r.json())
        .then((d) => {
          const ids = (d.courses || []).map((c: any) => c.id);
          setOwned(ids.includes(courseId));
        })
        .catch(() => {});
    }
    getCourses().then((all) => {
      setCourse(all.find((c) => c.id === courseId) || null);
      setLoading(false);
    });
    fetch(`${API_URL}/coupons/public`)
      .then((r) => r.json())
      .then((d) => {
        const all = (d.coupons || []) as any[];
        // Sirf wahi chips dikhao jo is course pe chalenge (app jaisa filter)
        setCoupons(
          all.filter((c) => {
            const st = String(c.scope_type ?? "all");
            if (st === "all") return true;
            return st === "course" && String(c.scope_id ?? "") === String(courseId);
          })
        );
      })
      .catch(() => {});
    loadReviews();
    // Load Razorpay checkout script once
    if (!document.getElementById("rzp-script")) {
      const s = document.createElement("script");
      s.id = "rzp-script";
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(s);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  function loadReviews() {
    fetch(`${API_URL}/reviews/${courseId}`)
      .then((r) => r.json())
      .then((d) => {
        setReviews(d.reviews || []);
        setAvg(d.average || 0);
      })
      .catch(() => {});
  }

  async function submitReview() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!myRating) {
      setSubmitMsg("Please select a star rating");
      return;
    }
    setSubmitting(true);
    setSubmitMsg("");
    try {
      const res = await fetch(`${API_URL}/reviews/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_id: courseId,
          user_id: user.id,
          user_name: user.name || "Student",
          rating: myRating,
          review: myReview || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitMsg("Thank you! Your review has been posted.");
      setMyReview("");
      setMyRating(0);
      loadReviews();
    } catch {
      setSubmitMsg("Could not submit review. Please try again.");
    }
    setSubmitting(false);
  }

  async function applyCoupon(codeArg?: string) {
    const code = (codeArg || couponInput).trim().toUpperCase();
    if (!code || !course) return;
    setApplying(true);
    setCouponMsg("");
    try {
      const res = await fetch(`${API_URL}/coupons/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          amount: Number(course.price) || 0,
          product_type: "course",
          product_id: String(courseId),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setApplied(null);
        setCouponMsg(data.reason || data.detail || "Invalid coupon");
      } else {
        setApplied({ code, discount: data.discount, final: data.final_amount });
        setCouponInput(code);
        setCouponMsg("");
      }
    } catch {
      setCouponMsg("Could not check coupon. Try again.");
    }
    setApplying(false);
  }

  function removeCoupon() {
    setApplied(null);
    setCouponInput("");
    setCouponMsg("");
  }

  async function handleBuy() {
    if (!user) {
      router.push("/login");
      return;
    }
    if (!course) return;
    if (owned) {
      router.push("/my-learning");
      return;
    }
    setPayMsg(null);

    // Free course → direct enrollment
    const coursePrice = Number(course.price) || 0;
    if (coursePrice === 0) {
      setPaying(true);
      try {
        const res = await fetch(`${API_URL}/courses/enroll-free`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: user.id, course_id: courseId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Enrollment failed");
        setOwned(true);
        setPayMsg({ ok: true, text: "🎉 Enrolled! Find this course in My Learning and in the Selection Lab app." });
      } catch (e: any) {
        setPayMsg({ ok: false, text: e.message || "Enrollment failed" });
      }
      setPaying(false);
      return;
    }

    setPaying(true);
    try {
      // 1. Create order on backend (amount comes from DB — secure)
      const res = await fetch(`${API_URL}/payments/course-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, course_id: courseId, coupon_code: applied?.code || null }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.detail || "Could not start payment");

      // 2. Open Razorpay checkout
      if (!window.Razorpay) throw new Error("Payment system is loading, please try again");
      const rzp = new window.Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency,
        name: "Selection Lab",
        description: order.title,
        order_id: order.order_id,
        prefill: { name: user.name || "", email: user.email || "", contact: user.phone || "" },
        theme: { color: GOLD },
        handler: async (resp: any) => {
          // 3. Verify on backend → unlocks course
          try {
            const vres = await fetch(`${API_URL}/payments/verify-course`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: user.id,
                course_id: courseId,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                coupon_code: applied?.code || null,
              }),
            });
            const vdata = await vres.json();
            if (!vres.ok) throw new Error(vdata.detail || "Verification failed");
            setOwned(true);
            setShowCheckout(false);
            setPayMsg({ ok: true, text: "🎉 Payment successful! Course unlocked — open the Selection Lab app to start learning." });
          } catch (e: any) {
            setPayMsg({ ok: false, text: e.message || "Payment verification failed. Contact support with your payment ID." });
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      });
      rzp.open();
    } catch (e: any) {
      setPayMsg({ ok: false, text: e.message || "Could not start payment" });
    }
    setPaying(false);
  }

  if (loading) {
    return (
      <Shell>
        <p style={{ color: "var(--muted)", padding: 20 }}>Loading course...</p>
      </Shell>
    );
  }

  if (!course) {
    return (
      <Shell>
        <div style={{ padding: 20, textAlign: "center" }}>
          <p style={{ color: "var(--muted)" }}>Course not found.</p>
          <button onClick={() => router.push("/")} style={goldBtn}>
            Back to home
          </button>
        </div>
      </Shell>
    );
  }

  const price = Number(course.price) || 0;
  const original = Number(course.original_price) || 0;
  const discountPct = original > price && original > 0 ? Math.round(((original - price) / original) * 100) : 0;
  const features = (course.features || "")
    .split(",")
    .map((f: string) => f.trim())
    .filter(Boolean);

  return (
    <Shell>
      {/* Thumbnail */}
      {courseImage(course) && (
        <div style={{ width: "100%", background: "#000", display: "flex", justifyContent: "center" }}>
          <img
            src={courseImage(course)}
            alt={courseTitle(course)}
            style={{ width: "100%", maxWidth: 780, aspectRatio: "16 / 9", objectFit: "cover", display: "block" }}
          />
        </div>
      )}

      <div style={{ padding: 16 }}>
        {/* Title + rating */}
        <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, lineHeight: 1.3 }}>{courseTitle(course)}</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          {avg > 0 && (
            <span style={{ color: GOLD, fontWeight: 800, fontSize: 14 }}>
              ★ {avg} <span style={{ color: "var(--muted)", fontWeight: 600 }}>({reviews.length})</span>
            </span>
          )}
          {course.course_type && (
            <span style={{ fontSize: 11, color: "var(--muted)", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "2px 8px" }}>
              {course.course_type}
            </span>
          )}
        </div>

        {/* Social proof */}
        {Number(course.recent_buyers) > 0 && (
          <div style={{ marginTop: 10, fontSize: 13.5, color: "#ff9c5b", fontWeight: 700 }}>
            🔥 {course.recent_buyers} people recently purchased this course
          </div>
        )}

        {/* Price */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 14 }}>
          {price === 0 ? (
            <span style={{ color: "#5dd97c", fontWeight: 800, fontSize: 26 }}>FREE</span>
          ) : (
            <>
              <span style={{ color: GOLD, fontWeight: 800, fontSize: 26 }}>₹{price}</span>
              {original > price && (
                <>
                  <span style={{ color: "var(--muted)", textDecoration: "line-through", fontSize: 16 }}>₹{original}</span>
                  <span style={{ color: "#5dd97c", fontWeight: 800, fontSize: 14 }}>{discountPct}% OFF</span>
                </>
              )}
            </>
          )}
        </div>

        {/* Description */}
        {course.description && (
          <p style={{ color: "var(--text2)", fontSize: 14.5, lineHeight: 1.6, marginTop: 16 }}>{course.description}</p>
        )}

        {/* Features */}
        {features.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h2 style={sectionTitle}>What you get</h2>
            {features.map((f: string) => (
              <div key={f} style={{ display: "flex", gap: 8, fontSize: 14, color: "#e0dacb", marginBottom: 8 }}>
                <span style={{ color: "#5dd97c" }}>✔</span> {f}
              </div>
            ))}
          </div>
        )}

        {/* Reviews */}
        <div style={{ marginTop: 22 }}>
          <h2 style={sectionTitle}>Student Reviews</h2>

          {/* Write review */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 14, marginBottom: 14 }}>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginBottom: 8 }}>
              {user ? "Rate this course" : "Sign in to write a review"}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <span
                  key={s}
                  onClick={() => user && setMyRating(s)}
                  style={{
                    fontSize: 26,
                    cursor: user ? "pointer" : "default",
                    color: s <= myRating ? GOLD : "#4a4436",
                  }}
                >
                  ★
                </span>
              ))}
            </div>
            {user && (
              <>
                <textarea
                  placeholder="Share your experience (optional)"
                  value={myReview}
                  onChange={(e) => setMyReview(e.target.value)}
                  style={{ ...inputStyle, minHeight: 60 }}
                />
                <button onClick={submitReview} disabled={submitting} style={{ ...goldBtn, width: "100%" }}>
                  {submitting ? "Posting..." : "Post review"}
                </button>
              </>
            )}
            {!user && (
              <button onClick={() => router.push("/login")} style={{ ...goldBtn, width: "100%" }}>
                Sign in
              </button>
            )}
            {submitMsg && <p style={{ fontSize: 13, color: submitMsg.startsWith("Thank") ? "#5dd97c" : "#ff6b6b", marginTop: 10 }}>{submitMsg}</p>}
          </div>

          {/* Review list */}
          {reviews.length === 0 && <p style={{ color: "var(--muted)", fontSize: 13.5 }}>No reviews yet. Be the first!</p>}
          {reviews.map((r) => (
            <div key={r.id} style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12, marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{r.user_name || "Student"}</span>
                <span style={{ color: GOLD, fontSize: 13 }}>
                  {"★".repeat(r.rating)}
                  <span style={{ color: "#4a4436" }}>{"★".repeat(5 - r.rating)}</span>
                </span>
              </div>
              {r.review && <p style={{ fontSize: 13.5, color: "var(--text2)", margin: "6px 0 0", lineHeight: 1.5 }}>{r.review}</p>}
            </div>
          ))}
        </div>

        <div style={{ height: 90 }} />
      </div>

      {/* Sticky Buy bar */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 16px",
          background: "var(--header)",
          borderTop: `1px solid ${BORDER}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          zIndex: 20,
        }}
      >
        <div style={{ flex: 1 }}>
          {price === 0 ? (
            <span style={{ color: "#5dd97c", fontWeight: 800, fontSize: 18 }}>FREE</span>
          ) : applied ? (
            <>
              <span style={{ color: GOLD, fontWeight: 800, fontSize: 18 }}>₹{applied.final}</span>
              <span style={{ color: "var(--muted)", textDecoration: "line-through", fontSize: 13, marginLeft: 6 }}>₹{price}</span>
              <div style={{ color: "#5dd97c", fontSize: 11.5, fontWeight: 700 }}>{applied.code} applied</div>
            </>
          ) : (
            <>
              <span style={{ color: GOLD, fontWeight: 800, fontSize: 18 }}>₹{price}</span>
              {original > price && (
                <span style={{ color: "var(--muted)", textDecoration: "line-through", fontSize: 13, marginLeft: 6 }}>₹{original}</span>
              )}
            </>
          )}
        </div>
        <button
          onClick={() => {
            if (owned || price === 0) { handleBuy(); return; }
            if (!user) { router.push("/login"); return; }
            setShowCheckout(true);
          }}
          disabled={paying}
          style={{ ...goldBtn, padding: "13px 28px", fontSize: 15, opacity: paying ? 0.6 : 1, background: owned ? "#2e8b4a" : GOLD, color: owned ? "#fff" : "#1a1a1a" }}
        >
          {paying ? "Please wait..." : owned ? "✓ Enrolled — My Learning" : price === 0 ? "Enroll Free" : "Buy Now"}
        </button>
      </div>

      {/* ── Checkout (app-style full screen) ── */}
      {showCheckout && course && (
        <div style={{ position: "fixed", inset: 0, background: "var(--bg)", zIndex: 25, overflowY: "auto" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", padding: "14px 16px 120px" }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <button onClick={() => setShowCheckout(false)} aria-label="Back" style={{ ...ghostBtn, padding: "8px 12px", fontSize: 16 }}>←</button>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>Checkout</h1>
            </div>

            {/* Product card */}
            <div style={{ background: "linear-gradient(135deg, #1a2f55, #2c4a85)", borderRadius: 16, padding: "16px 18px", color: "#fff", display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 26, background: "rgba(255,255,255,0.12)", borderRadius: 12, padding: "10px 12px" }}>📖</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, opacity: 0.75 }}>COURSE</div>
                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3 }}>{courseTitle(course)}</div>
              </div>
            </div>

            {/* Price details */}
            <div style={{ background: "var(--card)", border: "1px solid var(--line)", borderRadius: 16, padding: "16px 18px", marginTop: 14, boxShadow: "var(--shadow)" }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 12 }}>🧾 Price Details</div>
              {(() => {
                const mrp = original > price ? original : price;
                const total = applied ? applied.final : price;
                const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", fontSize: 14.5, margin: "9px 0" };
                return (
                  <>
                    <div style={row}><span>Course Price</span><b>₹{mrp}</b></div>
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
                  </>
                );
              })()}
            </div>

            {/* Apply coupon */}
            <div style={{ border: `1px solid ${GOLD}`, background: "rgba(255,171,0,0.07)", borderRadius: 16, padding: "16px 18px", marginTop: 14 }}>
              <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 10 }}>🏷️ Apply Coupon</div>
              {applied ? (
                <div style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(93,217,124,0.5)", background: "rgba(93,217,124,0.1)", borderRadius: 12, padding: "12px 14px" }}>
                  <span style={{ color: "#2e8b4a", fontSize: 14, flex: 1 }}>
                    ✅ <b>{applied.code}</b> applied — ₹{applied.discount} off
                  </span>
                  <button onClick={removeCoupon} style={{ ...ghostBtn, padding: "6px 12px", fontSize: 12 }}>Remove</button>
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
                      style={{ ...inputStyle, marginBottom: 0, flex: 1, letterSpacing: 1 }}
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
          <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: "12px 16px", background: "var(--header)", borderTop: `1px solid ${BORDER}`, zIndex: 26 }}>
            <button
              onClick={handleBuy}
              disabled={paying}
              style={{ ...goldBtn, width: "100%", padding: "15px 20px", fontSize: 16, opacity: paying ? 0.6 : 1 }}
            >
              {paying ? "Please wait..." : `🔒 Pay Securely  ·  ₹${applied ? applied.final : price}`}
            </button>
          </div>
        </div>
      )}

      {/* Payment result modal */}
      {payMsg && (
        <div
          onClick={() => setPayMsg(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 30,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: CARD, border: `1px solid ${payMsg.ok ? "rgba(93,217,124,0.5)" : "rgba(255,107,107,0.5)"}`, borderRadius: 16, padding: 22, maxWidth: 360, width: "100%", textAlign: "center" }}
          >
            <div style={{ fontSize: 34 }}>{payMsg.ok ? "✅" : "⚠️"}</div>
            <p style={{ color: payMsg.ok ? "#5dd97c" : "#ff8a8a", fontSize: 14.5, lineHeight: 1.6, margin: "12px 0 16px" }}>
              {payMsg.text}
            </p>
            {!payMsg.ok && course.whatsapp_support && (
              <a
                href={course.whatsapp_support}
                target="_blank"
                style={{ ...goldBtn, display: "block", textDecoration: "none", marginBottom: 10 }}
              >
                Contact support on WhatsApp
              </a>
            )}
            <button onClick={() => setPayMsg(null)} style={{ ...ghostBtn, width: "100%" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div style={{ minHeight: "100vh", background: BG, color: "var(--text)" }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 16px",
          background: "var(--header)",
          borderBottom: `1px solid ${BORDER}`,
          backdropFilter: "blur(8px)",
        }}
      >
        <button onClick={() => router.push("/")} style={{ ...ghostBtn, padding: "7px 12px" }}>
          ←
        </button>
        <div style={{ fontWeight: 800, fontSize: 16 }}>
          Selection <span style={{ color: GOLD }}>Lab</span>
        </div>
      </header>
      {children}
    </div>
  );
}

const sectionTitle: React.CSSProperties = { fontSize: 17, fontWeight: 800, margin: "0 0 12px" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: 10,
  border: "1px solid var(--line)",
  background: "var(--chip)",
  color: "var(--text)",
  fontSize: 14,
  marginBottom: 12,
  boxSizing: "border-box",
};

const goldBtn: React.CSSProperties = {
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 10,
  padding: "12px 18px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const ghostBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--text)",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "9px 14px",
  fontWeight: 700,
  fontSize: 13,
  cursor: "pointer",
};
