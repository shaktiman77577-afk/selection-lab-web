"use client";

// Descriptive series detail - website redesign (Oct 2026).
// Sirf LOOK badla hai: laptop par baayen tests, daayen chipka hua price card;
// phone par neeche "Unlock" patti. Khareedne (Razorpay + verify) ka logic
// purane page jaisa hi.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { getUser, User } from "@/lib/api";
import { API_URL } from "@/lib/config";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import { IconLock, IconPen } from "@/app/components/v2/Icons";

const GOLD = "#FFAB00";

function loadScript(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

export default function SeriesDetailPage() {
  const router = useRouter();
  const params = useParams();
  const seriesId = Number((params as any)?.id);

  const [user, setUser] = useState<User | null>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [buying, setBuying] = useState(false);

  function load() {
    const u = getUser();
    setUser(u);
    const uid = (u as any)?.id;
    fetch(`${API_URL}/descriptive/series/${seriesId}${uid ? `?user_id=${uid}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.success === false) throw new Error(d.detail || "Not found");
        setData(d);
      })
      .catch(() => setError("Could not load this series."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (seriesId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId]);

  async function buy() {
    const u = getUser();
    if (!u) {
      router.push("/login");
      return;
    }
    setBuying(true);
    setError("");
    try {
      const ok = await loadScript("https://checkout.razorpay.com/v1/checkout.js");
      if (!ok) throw new Error("Payment SDK failed to load.");

      const order = await fetch(`${API_URL}/descriptive/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: (u as any).id, series_id: seriesId }),
      }).then((r) => r.json());

      if (!order?.order_id) throw new Error(order?.detail || "Could not start payment.");

      const rzp = new (window as any).Razorpay({
        key: order.key_id,
        amount: order.amount,
        currency: order.currency || "INR",
        name: "Selection Lab",
        description: order.title || "Descriptive Series",
        order_id: order.order_id,
        prefill: { name: (u as any).name || "", email: (u as any).email || "" },
        theme: { color: GOLD },
        handler: async (resp: any) => {
          try {
            const v = await fetch(`${API_URL}/descriptive/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                user_id: (u as any).id,
                series_id: seriesId,
                razorpay_order_id: resp.razorpay_order_id,
                razorpay_payment_id: resp.razorpay_payment_id,
                razorpay_signature: resp.razorpay_signature,
              }),
            }).then((r) => r.json());
            if (v?.success) {
              setLoading(true);
              load();
            } else {
              setError("Payment could not be verified. If money was deducted, contact support.");
            }
          } catch {
            setError("Payment verification error. Contact support if you were charged.");
          }
        },
      });
      rzp.open();
    } catch (e: any) {
      setError(e?.message || "Payment failed.");
    } finally {
      setBuying(false);
    }
  }

  const series = data?.series;
  const tests: any[] = data?.tests || [];
  const purchased = !!data?.is_purchased;
  const price = Number(series?.price || 0);
  const original = Number(series?.original_price || 0);
  const off = original > price && original > 0 ? Math.round(((original - price) / original) * 100) : 0;
  const forSale = !purchased && price > 0;

  function openTest(t: any) {
    if (t.unlocked) router.push(`/descriptive-test/${t.id}`);
    else buy();
  }

  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <nav className="v2-crumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link> / <Link href="/descriptive">Descriptive</Link>
          {series?.title ? (
            <>
              {" "}/ <span style={{ color: "var(--text)", fontWeight: 700 }}>{series.title}</span>
            </>
          ) : null}
        </nav>

        {loading ? (
          <div className="v2-detail" aria-hidden="true">
            <div>
              <div className="v2-skel" style={{ height: 30, width: "60%" }} />
              <div className="v2-skel" style={{ height: 14, width: "80%", marginTop: 12 }} />
              {[0, 1, 2].map((k) => (
                <div key={k} className="v2-skel" style={{ height: 66, marginTop: 12, borderRadius: 14 }} />
              ))}
            </div>
            <div className="v2-desk">
              <div className="v2-skel" style={{ height: 200, borderRadius: 18 }} />
            </div>
          </div>
        ) : error && !series ? (
          <div className="v2-msg err" style={{ marginTop: 16 }}>{error}</div>
        ) : !series ? (
          <div className="v2-empty">Series not found.</div>
        ) : (
          <div className="v2-detail">
            <div>
              <h1 className="v2-h1">{series.title}</h1>
              {series.description ? <p className="v2-sub" style={{ fontSize: 15 }}>{series.description}</p> : null}
              <div className="v2-stat">
                <span>
                  {tests.length} test{tests.length === 1 ? "" : "s"}
                </span>
                {purchased && <span className="ok">✓ Purchased</span>}
                {!purchased && price <= 0 && <span className="ok">Free series</span>}
              </div>

              {/* Phone par price yahin */}
              {forSale && (
                <div className="v2-mob v2-bigprice" style={{ marginTop: 14 }}>
                  <span className="p">₹{price}</span>
                  {original > price && <span className="s">₹{original}</span>}
                  {off > 0 && <span className="v2-tag">{off}% OFF</span>}
                </div>
              )}

              {error ? <div className="v2-msg err" style={{ marginTop: 14 }}>{error}</div> : null}

              <h2 className="v2-section-title">Tests</h2>
              {tests.length === 0 ? (
                <p className="v2-sub">No tests in this series yet.</p>
              ) : (
                tests.map((t, i) => (
                  <div
                    key={t.id}
                    className={`v2-test open${t.unlocked ? "" : " locked"}`}
                    onClick={() => openTest(t)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") openTest(t);
                    }}
                  >
                    <span className="n">{t.unlocked ? i + 1 : <IconLock size={16} />}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="t">{t.title}</div>
                      <div className="m">
                        {t.question_count ?? 0} question{(t.question_count ?? 0) === 1 ? "" : "s"} · {t.duration_min ?? 30} min
                        {t.is_free ? " · Free" : ""}
                      </div>
                    </div>
                    {t.unlocked ? (
                      <span className="v2-btn v2-btn-gold v2-btn-sm">Start →</span>
                    ) : (
                      <span className="v2-mini" style={{ display: "inline-flex", alignItems: "center" }}>
                        Locked
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Laptop: chipka hua card */}
            <aside className="v2-desk">
              <div className="v2-buycard">
                {forSale ? (
                  <>
                    <div className="v2-bigprice">
                      <span className="p">₹{price}</span>
                      {original > price && <span className="s">₹{original}</span>}
                      {off > 0 && <span className="v2-tag">{off}% OFF</span>}
                    </div>
                    <button onClick={buy} disabled={buying} className="v2-btn v2-btn-gold" style={{ width: "100%", marginTop: 16 }}>
                      {buying ? "Please wait…" : "Unlock full series"}
                    </button>
                    <ul className="v2-points">
                      <li>Unlock all {tests.length} tests</li>
                      <li>Model answers and auto-score after every test</li>
                    </ul>
                  </>
                ) : (
                  <>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 20, fontWeight: 800, color: "var(--v2-green)" }}>
                      <IconPen /> {purchased ? "Purchased" : "Free series"}
                    </div>
                    <p className="v2-sub">All tests are open for you. Pick any test from the list to start writing.</p>
                  </>
                )}
              </div>
            </aside>
          </div>
        )}

        {series && forSale && <div className="v2-mobpad" />}
      </main>
      <SiteFooter />

      {/* Phone: neeche chipki patti */}
      {series && forSale && (
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
          </div>
          <button onClick={buy} disabled={buying} className="v2-btn v2-btn-gold">
            {buying ? "Please wait…" : "Unlock full series"}
          </button>
        </div>
      )}
    </V2Shell>
  );
}
