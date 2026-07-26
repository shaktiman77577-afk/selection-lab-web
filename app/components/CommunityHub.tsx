"use client";

import { useEffect, useState } from "react";

const CONFIG_URL = "https://api.selectionlab.online/api/app-config";

// App ke jaise hi keys: community.youtube / telegram / instagram / whatsapp.
// Admin panel (app-config) se link badlo — app + website dono update.
const DEFAULTS = {
  youtube: "https://youtube.com/@selection_lab",
  telegram: "https://t.me/Selection_Lab",
  instagram: "",
  whatsapp: "",
};

type Links = typeof DEFAULTS;

function useCommunityLinks(): Links {
  const [links, setLinks] = useState<Links>(DEFAULTS);
  useEffect(() => {
    fetch(CONFIG_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        const c = cfg?.community;
        if (!c || typeof c !== "object") return;
        setLinks({
          youtube: String(c.youtube ?? "").trim() || DEFAULTS.youtube,
          telegram: String(c.telegram ?? "").trim() || DEFAULTS.telegram,
          instagram: String(c.instagram ?? "").trim(),
          whatsapp: String(c.whatsapp ?? "").trim(),
        });
      })
      .catch(() => {});
  }, []);
  return links;
}

const commCard: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  background: "var(--card)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  padding: 14,
  textDecoration: "none",
  color: "var(--text)",
  boxShadow: "var(--shadow)",
};

export default function CommunitySection() {
  const links = useCommunityLinks();

  const cards = [
    links.youtube && {
      href: links.youtube,
      icon: "▶️",
      title: "YouTube — Selection Lab",
      desc: "Free lessons, strategy videos and exam updates",
    },
    links.telegram && {
      href: links.telegram,
      icon: "✈️",
      title: "Telegram Community",
      desc: "Daily quizzes, PDFs, doubts and announcements",
    },
    links.instagram && {
      href: links.instagram,
      icon: "📸",
      title: "Instagram",
      desc: "Reels, tips and updates",
    },
    links.whatsapp && {
      href: links.whatsapp,
      icon: "💬",
      title: "WhatsApp",
      desc: "Join our WhatsApp community",
    },
  ].filter(Boolean) as { href: string; icon: string; title: string; desc: string }[];

  return (
    <section>
      <h2 style={{ fontSize: 18, fontWeight: 800, margin: "26px 0 10px" }}>Learn Free, Every Day</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        {cards.map((c) => (
          <a key={c.title} href={c.href} target="_blank" rel="noreferrer" style={commCard}>
            <span style={{ fontSize: 30 }}>{c.icon}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{c.title}</div>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>{c.desc}</div>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

// Floating button, bottom-right. WhatsApp configured ho to WhatsApp (green),
// warna Telegram (blue) — kyunki Telegram hamesha available hai.
export function CommunityFloat() {
  const links = useCommunityLinks();
  const isWA = !!links.whatsapp;
  const href = isWA ? links.whatsapp : links.telegram;
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={isWA ? "Chat on WhatsApp" : "Join us on Telegram"}
      style={{
        position: "fixed",
        right: 16,
        bottom: 18,
        zIndex: 60,
        width: 52,
        height: 52,
        borderRadius: "50%",
        background: isWA ? "#25D366" : "#229ED9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 26,
        boxShadow: "0 6px 18px rgba(0,0,0,0.28)",
        textDecoration: "none",
      }}
    >
      {isWA ? "💬" : "✈️"}
    </a>
  );
}
