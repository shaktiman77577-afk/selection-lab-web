"use client";

// AdBanner — admin ke "Banners" wale system se hi chalta hai.
//
// Koi nayi table nahi banayi. banners table me pehle se image_url,
// image_url_mobile, link_url aur placement sab maujood hain. Bas placement ki
// nayi value daal do (jaise "score_checker_top") aur banner wahan aa jayega.
//
// Banner na ho to component kuch render nahi karta — page bilkul normal
// dikhta hai, khaali dabba nahi.

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";

type Banner = {
  id: number;
  image_url: string;
  image_url_mobile?: string | null;
  title?: string | null;
  link_url?: string | null;
};

export default function AdBanner({
  placement,
  maxWidth = 640,
}: {
  placement: string;
  maxWidth?: number;
}) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 820);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    let alive = true;
    fetch(`${API_URL}/banners/?placement=${encodeURIComponent(placement)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const list: Banner[] = d.banners || [];
        setBanner(list.length ? list[0] : null);
      })
      // Ad load na ho to chup rehna hai — page ka kaam nahi rukna chahiye
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [placement]);

  if (!banner) return null;

  const img =
    (narrow && banner.image_url_mobile) || banner.image_url || banner.image_url_mobile;
  if (!img) return null;

  const picture = (
    <img
      src={img}
      alt={banner.title || ""}
      style={{
        width: "100%",
        height: "auto",
        display: "block",
        borderRadius: 14,
        border: "1px solid var(--line)",
      }}
    />
  );

  return (
    <div style={{ maxWidth, margin: "14px auto" }}>
      {banner.link_url ? (
        <a
          href={banner.link_url}
          target={banner.link_url.startsWith("http") ? "_blank" : undefined}
          rel="noopener noreferrer sponsored"
          style={{ display: "block" }}
        >
          {picture}
        </a>
      ) : (
        picture
      )}
    </div>
  );
}
