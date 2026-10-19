"use client";

/**
 * TestersHomeCard.tsx — admin home par "📲 Closed Testers" ka card (Oct 2026).
 *
 * admin/page.tsx 300KB ki file hai, usme naya tile jodna mushkil tha — isliye
 * ye card ExamUpdatesAdmin.tsx ke ExamDatesBox (jo home par sabse upar render
 * hota hai) ke andar se dikhta hai. Click = /admin/testers.
 * Pending requests ki ginti bhi dikhata hai. Jiske paas "users" right nahi
 * (backend 403 deta hai), use card nahi dikhta.
 */

import { useEffect, useState } from "react";

type ApiFn = (path: string, method?: string, body?: any) => Promise<any>;

export default function TestersHomeCard({ api }: { api: ApiFn }) {
  const [pending, setPending] = useState<number | null>(null);
  const [live, setLive] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    api("/testers/admin/list?status=pending")
      .then((d) => {
        setPending(d?.counts?.pending ?? (d?.rows || []).length);
        setLive(!!(d?.settings?.page_on && d?.settings?.android_on));
      })
      .catch((e: any) => {
        // Right nahi hai -> card hi nahi. Table abhi nahi bani ya server ki
        // koi aur gadbad -> card dikhe, taaki page tak pahunch sakein.
        if (/access|403|Admin access/i.test(String(e?.message || ""))) setHidden(true);
        else setPending(0);
      });
  }, [api]);

  if (hidden) return null;
  const n = pending ?? 0;
  return (
    <button
      onClick={() => (window.location.href = "/admin/testers")}
      style={{
        width: "100%", textAlign: "left", cursor: "pointer", marginBottom: 12,
        background: "#16130e", border: "1px solid rgba(61,190,139,0.4)",
        borderLeft: "4px solid #3DBE8B", borderRadius: 16, padding: "14px 16px", color: "#fff",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 24 }}>📲</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, color: "#3DBE8B" }}>
            Closed Testers
            {n > 0 && (
              <span style={{ marginLeft: 8, background: "#FFAB00", color: "#1a1a1a", borderRadius: 999, padding: "1px 8px", fontSize: 12 }}>
                {n} pending
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: "#9a917f" }}>
            Android app — Gmail requests, Play Store testing · Website par {live ? "ON 🟢" : "OFF"}
          </div>
        </div>
        <span style={{ color: "#3DBE8B", fontSize: 18 }}>→</span>
      </div>
    </button>
  );
}
