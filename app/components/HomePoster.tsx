"use client";

/**
 * HomePoster.tsx — homepage ka bada poster (Featured courses ke neeche).
 *
 * Alag component isliye banaya taaki app/page.tsx (530 lines) me sirf do line
 * ka badlav ho — mobile se badi file edit karna risky hai.
 *
 * Data wahi purani `banners` table se aata hai. Sirf wo banners yahan aate
 * hain jinka placement = "poster" hai. Baaki sab pehle ki tarah upar hero
 * carousel me hi dikhte rahenge.
 *
 * Poster off karna ho to admin panel me us banner ko delete kar dijiye ya
 * placement wapas "hero" kar dijiye — code chhune ki zaroorat nahi.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";

export default function HomePoster() {
  const router = useRouter();
  const [posters, setPosters] = useState<any[]>([]);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/banners/`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const all = (d?.banners || []) as any[];
        setPosters(all.filter((b) => (b.placement || "hero") === "poster"));
      })
      .catch(() => {});
  }, []);

  if (posters.length === 0) return null;

  function go(action: string) {
    const a = (action || "").trim();
    if (!a) return;
    if (a.startsWith("http")) window.open(a, "_blank");
    else router.push(a.startsWith("/") ? a : "/" + a);
  }

  return (
    <div style={{ marginTop: 26 }}>
      {posters.map((b) => {
        const img = (narrow && b.image_url_mobile) ? b.image_url_mobile : b.image_url;
        if (!img) return null;
        return (
          <div
            key={b.id}
            onClick={() => go(b.link_url || b.link || "")}
            role={b.link_url || b.link ? "link" : undefined}
            style={{
              borderRadius: 16,
              overflow: "hidden",
              marginBottom: 14,
              cursor: b.link_url || b.link ? "pointer" : "default",
              border: "1px solid var(--line)",
              boxShadow: "var(--shadow)",
              background: "var(--chip)",
            }}
          >
            <img
              src={img}
              alt={b.title || ""}
              style={{ width: "100%", display: "block", objectFit: "cover" }}
            />
          </div>
        );
      })}
    </div>
  );
}
