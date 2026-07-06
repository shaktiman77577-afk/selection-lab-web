"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser, User } from "@/lib/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const GOLD = "#FFAB00";
const BG = "var(--bg)";
const CARD = "var(--card)";
const BORDER = "var(--border)";

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

  async function buySeries() {
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
        body: JSON.stringify({ user_id: u.id, series_id: seriesId }),
      });
      const order = await res.json();
      if (!res.ok) throw new Error(order.detail || "Could not create order");

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
              }),
            });
            const vd = await vres.json();
            if (!vres.ok) throw new Error(vd.detail || "Verification failed");
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
    router.push(`/mock-test/${t.id}`);
  }

  const price = Number(series?.price) || 0;
  const original = Number(series?.original_price) || 0;
  const owned = series?.is_purchased || price === 0;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: "var(--text)", paddingBottom: owned ? 20 : 90 }}>
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "12px 16px",
          background: "var(--header)",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <button onClick={() => router.push("/mock-tests")} style={backBtn}>
          ←
        </button>
        <div style={{ fontWeight: 800, fontSize: 16, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {series?.title || "Test Series"}
        </div>
      </header>

      <main style={{ maxWidth: 640, margin: "0 auto", padding: 16 }}>
        {loading && <p style={{ color: "var(--muted)" }}>Loading...</p>}
        {error && <p style={{ color: "#ff8a8a", fontSize: 14 }}>{error}</p>}

        {series && (
          <>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 16, marginBottom: 16 }}>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800 }}>{series.title}</h1>
              {series.description && (
                <p style={{ margin: "8px 0 0", fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6 }}>{series.description}</p>
              )}
              <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 13, color: "var(--text2)" }}>
                <span>📝 {tests.length} tests</span>
                <span style={{ color: "#5dd97c" }}>🎁 {tests.filter((t) => t.is_free).length} free</span>
                {owned && <span style={{ color: "#5dd97c", fontWeight: 700 }}>✓ Full access</span>}
              </div>
            </div>

            {payMsg && (
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 12,
                  marginBottom: 14,
                  fontSize: 14,
                  border: `1px solid ${payMsg.ok ? "rgba(93,217,124,0.5)" : "rgba(255,107,107,0.5)"}`,
                  background: payMsg.ok ? "rgba(93,217,124,0.08)" : "rgba(255,107,107,0.08)",
                  color: payMsg.ok ? "#5dd97c" : "#ff8a8a",
                }}
              >
                {payMsg.text}
              </div>
            )}

            {tests.map((t, i) => (
              <div
                key={t.id}
                onClick={() => openTest(t)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: CARD,
                  border: `1px solid ${t.is_unlocked ? BORDER : "var(--line)"}`,
                  borderRadius: 14,
                  padding: 14,
                  marginBottom: 10,
                  cursor: t.is_unlocked ? "pointer" : "default",
                  opacity: t.is_unlocked ? 1 : 0.65,
                }}
              >
                <span
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 14,
                    flexShrink: 0,
                    background: t.is_unlocked ? "rgba(255,171,0,0.15)" : "var(--chip)",
                    color: t.is_unlocked ? GOLD : "var(--muted)",
                  }}
                >
                  {t.is_unlocked ? i + 1 : "🔒"}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5 }}>{t.title}</div>
                  <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 3 }}>
                    {t.total_questions} Qs · {t.duration_minutes} min · {t.total_marks} marks
                    {Number(t.negative_marking) > 0 && ` · −${t.negative_marking}`}
                  </div>
                </div>
                {t.is_free && !owned && (
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#5dd97c", border: "1px solid rgba(93,217,124,0.4)", borderRadius: 6, padding: "3px 8px" }}>
                    FREE
                  </span>
                )}
                {t.is_unlocked && <span style={{ color: GOLD, fontWeight: 800 }}>→</span>}
              </div>
            ))}

            {tests.length === 0 && !loading && (
              <p style={{ color: "var(--muted)", textAlign: "center", padding: 20 }}>Tests will be added soon.</p>
            )}
          </>
        )}
      </main>

      {/* Sticky buy bar */}
      {series && !owned && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: "var(--card)",
            borderTop: `1px solid ${BORDER}`,
            zIndex: 15,
          }}
        >
          <div style={{ flex: 1 }}>
            <span style={{ color: GOLD, fontWeight: 800, fontSize: 18 }}>₹{price}</span>
            {original > price && (
              <span style={{ color: "var(--muted)", textDecoration: "line-through", fontSize: 13, marginLeft: 6 }}>₹{original}</span>
            )}
            <div style={{ fontSize: 11, color: "var(--muted)" }}>Unlock all {tests.length} tests</div>
          </div>
          <button
            onClick={buySeries}
            disabled={paying}
            style={{
              background: GOLD,
              color: "#1a1a1a",
              border: "none",
              borderRadius: 12,
              padding: "13px 26px",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              opacity: paying ? 0.6 : 1,
            }}
          >
            {paying ? "Processing..." : "Buy Series"}
          </button>
        </div>
      )}
    </div>
  );
}

const backBtn: React.CSSProperties = {
  background: "transparent",
  color: "var(--text)",
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  padding: "6px 12px",
  fontSize: 15,
  cursor: "pointer",
};
      
