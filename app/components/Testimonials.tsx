"use client";

import { useEffect, useState } from "react";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";
// Admin-managed via App Content tab → app-config (same JSON the app uses).
const API = "https://api.selectionlab.online/api/app-config";

type Tm = { name: string; exam: string; quote: string; img?: string };

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Testimonials() {
  const [items, setItems] = useState<Tm[]>([]);

  useEffect(() => {
    fetch(API)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        const root = cfg?.config ?? cfg; // endpoint may wrap as { config: {...} }
        const list = root?.testimonials;
        if (!Array.isArray(list)) return;
        setItems(
          list.map((t: any) => ({
            name: String(t.name ?? ""),
            exam: String(t.exam ?? ""),
            quote: String(t.quote ?? ""),
            img: String(t.image_url ?? t.img ?? "").trim() || undefined,
          }))
        );
      })
      .catch(() => {});
  }, []);

  if (items.length === 0) return null;
  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "26px 0 10px" }}>
        🏆 Selection Stories
      </h2>
      <div
        style={{
          display: "flex",
          gap: 12,
          overflowX: "auto",
          paddingBottom: 6,
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {items.map((tm) => (
          <div
            key={tm.name}
            style={{
              minWidth: 260,
              maxWidth: 300,
              flexShrink: 0,
              scrollSnapAlign: "start",
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 14,
              padding: 16,
              boxShadow: "var(--shadow)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {tm.img ? (
                <img
                  src={tm.img}
                  alt={tm.name}
                  style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }}
                />
              ) : (
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: "50%",
                    background: GOLD,
                    color: NAVY,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 15,
                    flexShrink: 0,
                  }}
                >
                  {initials(tm.name)}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{tm.name}</div>
                <div style={{ fontSize: 11.5, color: GOLD, fontWeight: 700 }}>{tm.exam}</div>
              </div>
            </div>
            <p style={{ margin: "12px 0 0", fontSize: 13, lineHeight: 1.6, color: "var(--muted)" }}>
              &ldquo;{tm.quote}&rdquo;
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
