"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";
const CONFIG_URL = "https://api.selectionlab.online/api/app-config";

// Same admin announcement as the app (app-config se). Admin panel se text
// badlo — app aur website dono jagah ek saath update ho jayega.
export default function AnnouncementBar() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [link, setLink] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch(CONFIG_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (!cfg) return;
        const root = cfg.config ?? cfg; // endpoint may wrap as { config: {...} }
        // Defensive: config me announcement string ya object dono ho sakta hai.
        const a = root.announcement ?? root.announcement_banner ?? root.announcementBar;
        if (!a) return;
        if (typeof a === "string") {
          setText(a.trim());
          return;
        }
        const enabled =
          "enabled" in a ? !!a.enabled : "active" in a ? !!a.active : true;
        if (!enabled) return;
        setText(String(a.text ?? a.message ?? a.title ?? "").trim());
        setLink(String(a.link ?? a.url ?? "").trim());
      })
      .catch(() => {});
  }, []);

  if (!text || dismissed) return null;

  function open() {
    if (!link) return;
    if (link.startsWith("http")) window.open(link, "_blank");
    else router.push(link);
  }

  return (
    <div
      style={{
        background: GOLD,
        color: NAVY,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "9px 12px",
        fontSize: 13,
        fontWeight: 700,
      }}
    >
      <span
        onClick={open}
        style={{ flex: 1, textAlign: "center", cursor: link ? "pointer" : "default", lineHeight: 1.4 }}
      >
        📢 {text}
        {link && <span style={{ textDecoration: "underline", marginLeft: 6 }}>Dekho →</span>}
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss announcement"
        style={{
          border: "none",
          background: "rgba(0,0,0,0.12)",
          color: NAVY,
          width: 22,
          height: 22,
          borderRadius: "50%",
          cursor: "pointer",
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ✕
      </button>
    </div>
  );
}
