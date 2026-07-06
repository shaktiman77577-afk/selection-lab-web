"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { getUser, User } from "@/lib/api";
import { API_URL } from "@/lib/config";
import ThemeToggle from "@/app/components/ThemeToggle";
import SideMenu from "@/app/components/SideMenu";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";

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
  const [menuOpen, setMenuOpen] = useState(false);
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

  function openTest(t: any) {
    if (t.unlocked) router.push(`/descriptive-test/${t.id}`);
    else buy();
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <SideMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

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
        <button onClick={() => router.back()} aria-label="Back" style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 4 }}>
          ←
        </button>
        <div style={{ fontWeight: 800, fontSize: 16, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {series?.title || "Descriptive Series"}
        </div>
        <ThemeToggle />
        <button onClick={() => setMenuOpen(true)} aria-label="Menu" style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text)", padding: 4 }}>
          ☰
        </button>
      </header>

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "16px 16px 40px" }}>
        {loading ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Loading…</p>
        ) : error && !series ? (
          <p style={{ color: "#c0392b", fontSize: 14 }}>{error}</p>
        ) : !series ? (
          <p style={{ color: "var(--muted)", fontSize: 14 }}>Series not found.</p>
        ) : (
          <>
            {/* Series hero */}
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
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, lineHeight: 1.3 }}>{series.title}</h1>
              {series.description ? (
                <p style={{ margin: "8px 0 0", fontSize: 13.5, lineHeight: 1.6, color: "rgba(255,255,255,0.85)", maxWidth: 460 }}>{series.description}</p>
              ) : null}
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {purchased ? (
                  <span style={{ background: "rgba(93,217,124,0.2)", color: "#c8f7d4", fontWeight: 800, fontSize: 13, padding: "8px 14px", borderRadius: 10 }}>
                    ✓ Purchased
                  </span>
                ) : price > 0 ? (
                  <>
                    <div style={{ fontSize: 20, fontWeight: 800 }}>
                      ₹{price}
                      {Number(series.original_price) > price && (
                        <span style={{ fontSize: 13, textDecoration: "line-through", color: "rgba(255,255,255,0.6)", marginLeft: 8 }}>₹{series.original_price}</span>
                      )}
                    </div>
                    <button onClick={buy} disabled={buying} style={{ ...goldBtn, opacity: buying ? 0.6 : 1 }}>
                      {buying ? "Please wait…" : "Unlock full series"}
                    </button>
                  </>
                ) : (
                  <span style={{ background: "rgba(93,217,124,0.2)", color: "#c8f7d4", fontWeight: 800, fontSize: 13, padding: "8px 14px", borderRadius: 10 }}>Free series</span>
                )}
              </div>
            </section>

            {error ? <p style={{ color: "#c0392b", fontSize: 13, marginTop: 12 }}>{error}</p> : null}

            <h2 style={h2}>Tests</h2>

            {tests.length === 0 ? (
              <p style={{ color: "var(--muted)", fontSize: 14 }}>No tests in this series yet.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {tests.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => openTest(t)}
                    style={{
                      background: "var(--card)",
                      border: "1px solid var(--line)",
                      borderRadius: 14,
                      padding: 14,
                      boxShadow: "var(--shadow)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      opacity: t.unlocked ? 1 : 0.85,
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.title}</div>
                      <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                        {t.question_count ?? 0} question{(t.question_count ?? 0) === 1 ? "" : "s"} · {t.duration_min ?? 30} min
                        {t.is_free ? " · Free" : ""}
                      </div>
                    </div>
                    {t.unlocked ? (
                      <span style={{ ...goldBtn, padding: "9px 14px", fontSize: 13 }}>Start →</span>
                    ) : (
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--muted)", border: "1px solid var(--line)", borderRadius: 10, padding: "9px 14px" }}>🔒 Locked</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {!purchased && price > 0 && (
              <div style={{ marginTop: 20, textAlign: "center" }}>
                <button onClick={buy} disabled={buying} style={{ ...goldBtn, padding: "13px 24px", opacity: buying ? 0.6 : 1 }}>
                  {buying ? "Please wait…" : `Unlock all tests · ₹${price}`}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

const goldBtn: React.CSSProperties = {
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 10,
  padding: "11px 18px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
};

const h2: React.CSSProperties = { fontSize: 18, fontWeight: 800, margin: "26px 0 10px" };
