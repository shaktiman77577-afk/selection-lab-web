"use client";

// Mock test series detail - website redesign (Oct 2026).
// Sirf LOOK badla hai: laptop par baayen tests ki list, daayen chipka hua
// "Buy Series" card; phone par neeche Buy patti. Test kholna, Solution,
// Reattempt, khareedna, 100% coupon aur verify - sab purane page jaisa hi.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import CheckoutSheet from "@/app/components/CheckoutSheet";
import { getUser, User } from "@/lib/api";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import { IconLock, IconRight, IconSend } from "@/app/components/v2/Icons";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const GOLD = "#FFAB00";

export default function SeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const seriesId = Number(params.id);

  const [user, setUser] = useState<User | null>(null);
  const [series, setSeries] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paying, setPaying] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [payMsg, setPayMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setUser(getUser());
    // Load Razorpay checkout script once
    if (!document.getElementById("rzp-script")) {
      const s = document.createElement("script");
      s.id = "rzp-script";
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      document.body.appendChild(s);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId]);

  function load() {
    const u = getUser();
    const url = u
      ? `${API_URL}/mock-tests/series/${seriesId}?user_id=${u.id}`
      : `${API_URL}/mock-tests/series/${seriesId}`;
    fetch(url)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.detail || "Could not load series");
        setSeries(d.series);
        setTests(d.tests || []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  async function buySeries(couponCode: string | null = null) {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setPaying(true);
    setPayMsg(null);
    try {
      const res = await fetch(`${API_URL}/payments/series-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: u.id, series_id: seriesId, coupon_code: couponCode }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.detail || "Could not create order");
      // 100% coupon — server ne seedha unlock kar diya, Razorpay ki zaroorat nahi
      if (order.free) {
        setShowCheckout(false);
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
        description: order.title,
        order_id: order.order_id,
        prefill: { name: u.name || "", email: u.email || "", contact: u.phone || "" },
        theme: { color: GOLD },
        handler: async (resp: any) => {
          try {
            const vres = await fetch(`${API_URL}/payments/verify-series`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: u.id,
                series_id: seriesId,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
                coupon_code: couponCode,
              }),
            });
            const vd = await vres.json();
            if (!vres.ok) throw new Error(vd.detail || "Verification failed");
            setShowCheckout(false);
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

  function openTest(t: any) {
    if (!getUser()) {
      router.push("/login");
      return;
    }
    if (!t.is_unlocked) return;
    // Pehle de chuke hain to seedha solution kholte hain
    router.push(`/mock-test/${t.id}${t.my_attempt ? "?review=1" : ""}`);
  }

  const price = Number(series?.price) || 0;
  const original = Number(series?.original_price) || 0;
  const owned = series?.is_purchased || price === 0;
  const freeCount = tests.filter((t) => t.is_free).length;
  const off = original > price && original > 0 ? Math.round(((original - price) / original) * 100) : 0;
  const img = String(series?.thumbnail_url || "");
  const imgMob = String(series?.thumbnail_url_mobile || "");

  const startBuy = () => {
    if (!getUser()) {
      router.push("/login");
      return;
    }
    setShowCheckout(true);
  };

  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <nav className="v2-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <Link href="/mock-tests">Mock Tests</Link>
          {series?.title ? (
            <>
              {" "}/ <span style={{ color: "var(--text)", fontWeight: 700 }}>{series.title}</span>
            </>
          ) : null}
        </nav>

        {loading && (
          <div className="v2-detail" aria-hidden="true">
            <div>
              <div className="v2-skel" style={{ height: 30, width: "60%" }} />
              <div className="v2-skel" style={{ height: 14, width: "80%", marginTop: 12 }} />
              {[0, 1, 2, 3].map((k) => (
                <div key={k} className="v2-skel" style={{ height: 66, marginTop: 12, borderRadius: 14 }} />
              ))}
            </div>
            <div className="v2-desk">
              <div className="v2-skel" style={{ height: 200, borderRadius: 18 }} />
            </div>
          </div>
        )}
        {error && <div className="v2-msg err" style={{ marginTop: 16 }}>{error}</div>}

        {series && (
          <div className="v2-detail">
            <div>
              {(img || imgMob) && (
                <div className="v2-cover" style={{ marginBottom: 18 }}>
                  <div className="v2-media-bg" style={{ backgroundImage: `url(${JSON.stringify(img || imgMob)})` }} aria-hidden="true" />
                  <picture>
                    {imgMob && img ? <source media="(max-width: 819px)" srcSet={imgMob} /> : null}
                    <img src={img || imgMob} alt={series.title || ""} fetchPriority="high" />
                  </picture>
                </div>
              )}

              <h1 className="v2-h1">{series.title}</h1>
              {series.description && <p className="v2-sub" style={{ fontSize: 15 }}>{series.description}</p>}
              <div className="v2-stat">
                <span>{tests.length} tests</span>
                {freeCount > 0 && <span className="ok">{freeCount} free</span>}
                {owned && <span className="ok">✓ Full access</span>}
              </div>

              {/* Phone par price yahin, Buy neeche ki patti me */}
              {!owned && (
                <div className="v2-mob v2-bigprice" style={{ marginTop: 14 }}>
                  <span className="p">₹{price}</span>
                  {original > price && <span className="s">₹{original}</span>}
                  {off > 0 && <span className="v2-tag">{off}% OFF</span>}
                </div>
              )}

              {/* Dedicated Telegram group — sabko dikhta hai */}
              {series.telegram_group && (
                <a href={series.telegram_group} target="_blank" rel="noreferrer" className="v2-tgcard">
                  <IconSend />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 800, fontSize: 14.5 }}>Join dedicated Telegram channel</span>
                    <span style={{ display: "block", fontSize: 12.5, opacity: 0.9 }}>Is exam ke updates, doubts aur free material</span>
                  </span>
                  <IconRight size={18} />
                </a>
              )}

              {payMsg && (
                <div className={`v2-msg ${payMsg.ok ? "ok" : "err"}`} style={{ marginTop: 16 }} role="status">
                  {payMsg.text}
                </div>
              )}

              <h2 className="v2-section-title">Tests</h2>
              {tests.map((t, i) => (
                <div
                  key={t.id}
                  className={`v2-test ${t.is_unlocked ? "open" : "locked"}`}
                  onClick={() => openTest(t)}
                  role={t.is_unlocked ? "button" : undefined}
                  tabIndex={t.is_unlocked ? 0 : undefined}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") openTest(t);
                  }}
                >
                  <span className="n">{t.my_attempt ? "✓" : t.is_unlocked ? i + 1 : <IconLock size={16} />}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="t">{t.title}</div>
                    <div className="m">
                      {t.total_questions} Qs · {t.duration_minutes} min · {t.total_marks} marks
                      {Number(t.negative_marking) > 0 && ` · −${t.negative_marking}`}
                    </div>
                    {/* Pehle de chuke hain to score dikhao */}
                    {t.my_attempt && (
                      <div className="a">
                        Attempted · {t.my_attempt.score}/{t.my_attempt.total_marks || t.total_marks} marks
                        <span style={{ color: "var(--v2-muted)", fontWeight: 600 }}>
                          {" · "}✓{t.my_attempt.correct} ✗{t.my_attempt.wrong}
                        </span>
                      </div>
                    )}
                  </div>

                  {t.is_free && !owned && !t.my_attempt && <span className="v2-tag">FREE</span>}

                  {t.my_attempt ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                      <button
                        className="v2-mini gold"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/mock-test/${t.id}?review=1`);
                        }}
                      >
                        Solution
                      </button>
                      <button
                        className="v2-mini"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/mock-test/${t.id}?retry=1`);
                        }}
                      >
                        Reattempt
                      </button>
                    </div>
                  ) : (
                    t.is_unlocked && <IconRight size={18} />
                  )}
                </div>
              ))}

              {tests.length === 0 && !loading && <p className="v2-sub" style={{ textAlign: "center", padding: 20 }}>Tests will be added soon.</p>}
            </div>

            {/* Laptop: chipka hua card */}
            <aside className="v2-desk">
              <div className="v2-buycard">
                {owned ? (
                  <>
                    <div style={{ fontSize: 20, fontWeight: 800, color: "var(--v2-green)" }}>✓ Full access</div>
                    <p className="v2-sub">All {tests.length} tests are unlocked for you. Pick any test from the list to start.</p>
                  </>
                ) : (
                  <>
                    <div className="v2-bigprice">
                      <span className="p">₹{price}</span>
                      {original > price && <span className="s">₹{original}</span>}
                      {off > 0 && <span className="v2-tag">{off}% OFF</span>}
                    </div>
                    <button onClick={startBuy} disabled={paying} className="v2-btn v2-btn-gold" style={{ width: "100%", marginTop: 16 }}>
                      {paying ? "Processing..." : "Buy Series"}
                    </button>
                    <ul className="v2-points">
                      <li>Unlock all {tests.length} tests</li>
                      {freeCount > 0 && <li>Try {freeCount} free test{freeCount > 1 ? "s" : ""} first</li>}
                      <li>Have a coupon? Apply it at checkout</li>
                    </ul>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}

        {series && !owned && <div className="v2-mobpad" />}
      </main>
      <SiteFooter />

      {/* Phone: neeche chipki Buy patti */}
      {series && !owned && (
        <div className="v2-mobbar">
          <div style={{ flex: 1 }}>
            <span className="v2-price" style={{ fontSize: 18 }}>
              ₹{price}
            </span>
            {original > price && (
              <span className="v2-strike" style={{ marginLeft: 6 }}>
                ₹{original}
              </span>
            )}
            <div style={{ fontSize: 11.5, color: "var(--v2-muted)" }}>Unlock all {tests.length} tests</div>
          </div>
          <button onClick={startBuy} disabled={paying} className="v2-btn v2-btn-gold">
            {paying ? "Processing..." : "Buy Series"}
          </button>
        </div>
      )}

      {/* ── Checkout (shared component) ── */}
      {series && (
        <CheckoutSheet
          open={showCheckout}
          onClose={() => setShowCheckout(false)}
          productType="mock"
          productId={seriesId}
          title={series.title || "Mock Series"}
          price={price}
          original={original}
          subLabel={`Unlock all ${tests.length} tests`}
          paying={paying}
          onPay={(code) => buySeries(code)}
        />
      )}
    </V2Shell>
  );
}
