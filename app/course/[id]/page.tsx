"use client";

// Course detail - website redesign (Oct 2026).
// Sirf LOOK badla hai: laptop par do column (baayen content, daayen chipka hua
// price card), phone par neeche Buy patti. Kharidne, free enroll, coupon,
// Razorpay, verify aur review ka saara logic purane page jaisa hi hai.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser, User } from "@/lib/api";
import { getCourses, Course, courseTitle, courseImage } from "@/lib/supabase";
import CheckoutSheet from "@/app/components/CheckoutSheet";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import { IconLock, IconRight, IconSend } from "@/app/components/v2/Icons";

const GOLD = "#FFAB00";

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
  const [reviews, setReviews] = useState<any[]>([]);
  const [avg, setAvg] = useState(0);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState("");
  const [paying, setPaying] = useState(false);
  const [payMsg, setPayMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [owned, setOwned] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  // Bundle me kya-kya milega — kharidne se PEHLE dikhna zaroori hai
  const [bundle, setBundle] = useState<any[]>([]);

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

    // Content endpoint bundle ki list bhi deta hai — login ki zaroorat nahi
    fetch(`${API_URL}/courses/${courseId}/content`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setBundle(d?.bundle || []))
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

  async function handleBuy(couponCode: string | null = null) {
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
        body: JSON.stringify({ user_id: user.id, course_id: courseId, coupon_code: couponCode }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.detail || "Could not start payment");
      // 100% coupon — server ne seedha unlock kar diya, Razorpay ki zaroorat nahi
      if (order.free) {
        setOwned(true);
        setShowCheckout(false);
        setPayMsg({ ok: true, text: "🎉 Course unlocked with your coupon! Open the Selection Lab app to start learning." });
        setPaying(false);
        return;
      }

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
                coupon_code: couponCode,
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
      <Frame>
        <div className="v2-detail" aria-hidden="true">
          <div>
            <div className="v2-skel" style={{ aspectRatio: "16 / 9", borderRadius: 18 }} />
            <div className="v2-skel" style={{ height: 30, width: "70%", marginTop: 18 }} />
            <div className="v2-skel" style={{ height: 14, width: "40%", marginTop: 12 }} />
          </div>
          <div className="v2-desk">
            <div className="v2-skel" style={{ height: 220, borderRadius: 18 }} />
          </div>
        </div>
      </Frame>
    );
  }

  if (!course) {
    return (
      <Frame>
        <div className="v2-empty">
          <p style={{ margin: "0 0 16px" }}>Course not found.</p>
          <Link href="/courses" className="v2-btn v2-btn-gold">
            See all courses
          </Link>
        </div>
      </Frame>
    );
  }

  const price = Number(course.price) || 0;
  const original = Number(course.original_price) || 0;
  const discountPct = original > price && original > 0 ? Math.round(((original - price) / original) * 100) : 0;
  const features = (course.features || "")
    .split(",")
    .map((f: string) => f.trim())
    .filter(Boolean);
  const img = courseImage(course);
  const imgMob = String((course as any).thumbnail_url_mobile || "");
  const tg = (course as any).telegram_group as string | undefined;

  const buyLabel = paying ? "Please wait..." : owned ? "✓ Enrolled — My Learning" : price === 0 ? "Enroll Free" : "Buy Now";
  const onBuyClick = () => {
    if (owned || price === 0) {
      handleBuy();
      return;
    }
    if (!user) {
      router.push("/login");
      return;
    }
    setShowCheckout(true);
  };

  const priceBlock = (
    <div className="v2-bigprice">
      {price === 0 ? (
        <span className="free">FREE</span>
      ) : (
        <>
          <span className="p">₹{price}</span>
          {original > price && (
            <>
              <span className="s">₹{original}</span>
              <span className="v2-tag">{discountPct}% OFF</span>
            </>
          )}
        </>
      )}
    </div>
  );

  return (
    <Frame>
      <nav className="v2-crumb" aria-label="Breadcrumb">
        <Link href="/">Home</Link> / <Link href="/courses">Courses</Link> /{" "}
        <span style={{ color: "var(--text)", fontWeight: 700 }}>{courseTitle(course)}</span>
      </nav>

      <div className="v2-detail">
        <div>
          {(img || imgMob) && (
            <div className="v2-cover">
              <div className="v2-media-bg" style={{ backgroundImage: `url(${JSON.stringify(img || imgMob)})` }} aria-hidden="true" />
              <picture>
                {imgMob && img ? <source media="(max-width: 819px)" srcSet={imgMob} /> : null}
                <img src={img || imgMob} alt={courseTitle(course)} fetchPriority="high" />
              </picture>
            </div>
          )}

          <h1 className="v2-h1" style={{ marginTop: 18 }}>
            {courseTitle(course)}
          </h1>
          <div className="v2-meta" style={{ marginTop: 10, alignItems: "center" }}>
            {avg > 0 && (
              <span style={{ color: "var(--v2-gold-ink)", fontWeight: 800 }}>
                ★ {avg} <span style={{ color: "var(--v2-muted)", fontWeight: 600 }}>({reviews.length} reviews)</span>
              </span>
            )}
            {course.course_type && <span className="v2-tag gold">{course.course_type}</span>}
            {Number(course.recent_buyers) > 0 && (
              <span style={{ color: "#c25e00", fontWeight: 700 }}>{course.recent_buyers} people recently purchased this course</span>
            )}
          </div>

          {/* Phone par price yahin, Buy neeche ki patti me */}
          <div className="v2-mob" style={{ marginTop: 16 }}>
            {priceBlock}
          </div>

          {/* Bundle me kya-kya milega — kharidne se pehle saaf dikhna chahiye */}
          {bundle.length > 0 && (
            <div className="v2-bundle" style={{ marginTop: 22 }}>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>This bundle includes {bundle.length} things</h2>
              <p className="v2-sub" style={{ marginTop: 4 }}>
                {owned ? "All of these are already unlocked for you — tap any one to open it." : "Buy once and everything below unlocks together."}
              </p>
              {bundle.map((b: any) => {
                const inner = (
                  <>
                    {b.thumbnail_url ? <img src={b.thumbnail_url} alt="" loading="lazy" /> : <span style={{ fontSize: 22 }}>{b.icon}</span>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="k">{String(b.label).toUpperCase()}</div>
                      <div className="t">{b.title}</div>
                    </div>
                    {owned ? <IconRight size={18} /> : <IconLock size={16} />}
                  </>
                );
                return owned ? (
                  <Link key={`${b.type}-${b.id}`} href={b.link} className="v2-row">
                    {inner}
                  </Link>
                ) : (
                  <div key={`${b.type}-${b.id}`} className="v2-row" style={{ opacity: 0.9 }}>
                    {inner}
                  </div>
                );
              })}
              {owned && (
                <Link href="/my-learning" className="v2-btn v2-btn-sm" style={{ width: "100%", marginTop: 10, border: "1px solid var(--v2-gold)", color: "var(--v2-gold-ink)" }}>
                  Open My Learning →
                </Link>
              )}
            </div>
          )}

          {/* Dedicated Telegram group — sabko dikhta hai, kharida ho ya na ho */}
          {tg && (
            <a href={tg} target="_blank" rel="noreferrer" className="v2-tgcard">
              <IconSend />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 800, fontSize: 14.5 }}>Join dedicated Telegram channel</span>
                <span style={{ display: "block", fontSize: 12.5, opacity: 0.9 }}>Is exam ke updates, doubts aur free material — sab yahan</span>
              </span>
              <IconRight size={18} />
            </a>
          )}

          {course.description && (
            <>
              <h2 className="v2-section-title">About this course</h2>
              <p className="v2-prose">{course.description}</p>
            </>
          )}

          {features.length > 0 && (
            <>
              <h2 className="v2-section-title">What you get</h2>
              <ul className="v2-feats">
                {features.map((f: string) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </>
          )}

          {/* Reviews */}
          <h2 className="v2-section-title">Student reviews</h2>
          <div className="v2-box" style={{ marginBottom: 14 }}>
            <div className="v2-sub" style={{ margin: "0 0 8px" }}>
              {user ? "Rate this course" : "Sign in to write a review"}
            </div>
            <div className="v2-stars" role="radiogroup" aria-label="Your rating">
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`v2-star${s <= myRating ? " on" : ""}`}
                  aria-label={`${s} star${s > 1 ? "s" : ""}`}
                  aria-pressed={s <= myRating}
                  disabled={!user}
                  onClick={() => user && setMyRating(s)}
                >
                  ★
                </button>
              ))}
            </div>
            {user ? (
              <>
                <textarea
                  className="v2-input"
                  placeholder="Share your experience (optional)"
                  value={myReview}
                  onChange={(e) => setMyReview(e.target.value)}
                  style={{ minHeight: 70, marginTop: 10 }}
                />
                <button onClick={submitReview} disabled={submitting} className="v2-btn v2-btn-gold" style={{ width: "100%", marginTop: 10 }}>
                  {submitting ? "Posting..." : "Post review"}
                </button>
              </>
            ) : (
              <Link href="/login" className="v2-btn v2-btn-gold" style={{ width: "100%", marginTop: 10 }}>
                Sign in
              </Link>
            )}
            {submitMsg && (
              <p className={`v2-msg ${submitMsg.startsWith("Thank") ? "ok" : "err"}`} style={{ marginTop: 10, marginBottom: 0 }}>
                {submitMsg}
              </p>
            )}
          </div>

          {reviews.length === 0 && <p className="v2-sub">No reviews yet. Be the first!</p>}
          {reviews.map((r) => (
            <div key={r.id} className="v2-review">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{r.user_name || "Student"}</span>
                <span style={{ color: GOLD, fontSize: 13 }} aria-label={`${r.rating} out of 5`}>
                  {"★".repeat(r.rating)}
                  <span style={{ color: "var(--v2-line2)" }}>{"★".repeat(5 - r.rating)}</span>
                </span>
              </div>
              {r.review && <p style={{ fontSize: 14, color: "var(--text2)", margin: "6px 0 0", lineHeight: 1.6 }}>{r.review}</p>}
            </div>
          ))}
        </div>

        {/* Laptop: chipka hua price card */}
        <aside className="v2-desk">
          <div className="v2-buycard">
            {priceBlock}
            <button onClick={onBuyClick} disabled={paying} className={`v2-btn ${owned ? "v2-btn-green" : "v2-btn-gold"}`} style={{ width: "100%", marginTop: 16 }}>
              {buyLabel}
            </button>
            <ul className="v2-points">
              <li>Unlocks right after payment</li>
              <li>Also available in the Selection Lab app</li>
              {price > 0 && !owned && <li>Have a coupon? Apply it at checkout</li>}
            </ul>
          </div>
        </aside>
      </div>

      <div className="v2-mobpad" />

      {/* Phone: neeche chipki Buy patti */}
      <div className="v2-mobbar">
        <div style={{ flex: 1 }}>
          {price === 0 ? (
            <span className="v2-free" style={{ fontSize: 18 }}>
              FREE
            </span>
          ) : (
            <>
              <span className="v2-price" style={{ fontSize: 18 }}>
                ₹{price}
              </span>
              {original > price && (
                <span className="v2-strike" style={{ marginLeft: 6 }}>
                  ₹{original}
                </span>
              )}
            </>
          )}
        </div>
        <button onClick={onBuyClick} disabled={paying} className={`v2-btn ${owned ? "v2-btn-green" : "v2-btn-gold"}`}>
          {buyLabel}
        </button>
      </div>

      {/* ── Checkout (shared component) ── */}
      {course && (
        <CheckoutSheet
          open={showCheckout}
          onClose={() => setShowCheckout(false)}
          productType="course"
          productId={courseId}
          title={courseTitle(course)}
          price={price}
          original={original}
          paying={paying}
          onPay={(code) => handleBuy(code)}
        />
      )}

      {/* Payment result modal */}
      {payMsg && (
        <div className="v2-modal" onClick={() => setPayMsg(null)}>
          <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div style={{ fontSize: 34 }}>{payMsg.ok ? "✅" : "⚠️"}</div>
            <p className={`v2-msg ${payMsg.ok ? "ok" : "err"}`} style={{ margin: "12px 0 16px" }}>
              {payMsg.text}
            </p>
            {!payMsg.ok && course.whatsapp_support && (
              <a href={course.whatsapp_support} target="_blank" rel="noreferrer" className="v2-btn v2-btn-gold" style={{ width: "100%", marginBottom: 10 }}>
                Contact support on WhatsApp
              </a>
            )}
            <button onClick={() => setPayMsg(null)} className="v2-btn" style={{ width: "100%", border: "1px solid var(--v2-line2)", background: "transparent", color: "var(--text)" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">{children}</main>
      <SiteFooter />
    </V2Shell>
  );
}
