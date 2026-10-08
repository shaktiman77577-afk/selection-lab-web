"use client";

/**
 * PromoPopup.tsx — targeted popup (admin panel → Popups).
 *
 * Layout me ek baar: <PromoPopup />. Kaunsa popup dikhe, ye backend tay karta
 * hai (routers/promos.py) — din me kitne, gap, rotation, khareed liya to band.
 * Yahan sirf ye tay hota hai ki KAHAN khul sakta hai:
 *
 *   - Test ke beech kabhi nahi (mock, typing, excel, descriptive, NBEMS...).
 *   - Typing test ka result aate hi khul sakta hai — page "sl:result-shown"
 *     event bhejta hai. Wahi sabse achha mauka hai.
 *   - Admin, login, profile setup par nahi.
 *
 * Login wale: server "next_check_at" batata hai — tab tak dobara nahi poochte,
 * taaki har page par API call na jaye. Result page par phir bhi poochte hain
 * (server apna din ka niyam khud lagata hai).
 * Bina login wale: har visit (browser session) me ek popup.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";

const BLOCKED: RegExp[] = [
  /^\/admin/, /^\/login/, /^\/profile-setup/, /^\/delete-account/, /^\/verify/, /^\/partner/,
  /^\/mock-test\/[^/]+\/?$/,          // mock chal raha hai (result page alag hai, wahan chalega)
  /^\/descriptive-test\//, /^\/excel-test\//, /^\/worksheet-test\//, /^\/excel-practice\//,
  /^\/typing-drill/, /^\/office-practice\/.+/, /^\/learn\//, /^\/tier2\/excel/,
  /^\/nbems-mock\/\d+/,               // NBEMS mock chal raha hai
  /^\/typing-test\//,                 // sirf result aane par (neeche)
];

function allowed(path: string, resultShown: boolean): boolean {
  if (/^\/typing-test\//.test(path)) return resultShown;
  return !BLOCKED.some((r) => r.test(path));
}

function ls(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key: string, v: string) {
  try { localStorage.setItem(key, v); } catch {}
}
function ss(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function ssSet(key: string, v: string) {
  try { sessionStorage.setItem(key, v); } catch {}
}

type Popup = {
  view_id: number | null; campaign_id: number; title: string; message: string;
  image_url: string; button_text: string; button_link: string;
};

export default function PromoPopup() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [popup, setPopup] = useState<Popup | null>(null);
  const [resultShown, setResultShown] = useState(false);
  const [forceTick, setForceTick] = useState(0);
  const busy = useRef(false);

  // Typing test ka result aaya / hata
  useEffect(() => {
    const on = () => { setResultShown(true); setForceTick((t) => t + 1); };
    const off = () => setResultShown(false);
    window.addEventListener("sl:result-shown", on);
    window.addEventListener("sl:result-hidden", off);
    return () => {
      window.removeEventListener("sl:result-shown", on);
      window.removeEventListener("sl:result-hidden", off);
    };
  }, []);

  // Naye page par result wali baat purani
  useEffect(() => { setResultShown(false); }, [pathname]);

  useEffect(() => {
    if (popup || busy.current) return;
    if (!allowed(pathname, resultShown)) return;

    const user = getUser();
    const uid = user?.id;
    const force = forceTick > 0 && resultShown;

    if (!uid) {
      if (ss("sl_promo_guest_done")) return;          // is visit me ho chuka
    } else if (!force) {
      const until = Number(ls(`sl_promo_next_${uid}`) || 0);
      if (until && Date.now() < until) return;
    }

    const delay = Math.max(0, Number(ls("sl_promo_delay") ?? 3)) * 1000;
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (cancelled) return;
      busy.current = true;
      try {
        const qs = new URLSearchParams({ platform: "web" });
        if (uid) qs.set("user_id", String(uid));
        else {
          const last = ls("sl_promo_guest_last");
          if (last) qs.set("last", last);
        }
        const res = await fetch(`${API_URL}/promos/next?${qs}`, { cache: "no-store" });
        const d = res.ok ? await res.json() : null;
        if (!d) return;
        if (d.delay_seconds != null) lsSet("sl_promo_delay", String(d.delay_seconds));
        if (uid && d.next_check_at) {
          const t = Date.parse(d.next_check_at);
          if (!Number.isNaN(t)) lsSet(`sl_promo_next_${uid}`, String(t));
        }
        if (!uid) ssSet("sl_promo_guest_done", "1");
        if (d.popup && !cancelled) {
          if (!uid) lsSet("sl_promo_guest_last", String(d.popup.campaign_id));
          setPopup(d.popup);
        }
      } catch {
        // Popup na aaye to koi baat nahi — site chalti rahe
      } finally {
        busy.current = false;
      }
    }, delay);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [pathname, resultShown, forceTick, popup]);

  // Test page par pahunch gaye (jaise popup khula tha aur "Start" daba diya) — band
  useEffect(() => {
    if (popup && !allowed(pathname, resultShown)) setPopup(null);
  }, [pathname, resultShown, popup]);

  const send = useCallback((action: "clicked" | "closed") => {
    if (!popup?.view_id) return;
    fetch(`${API_URL}/promos/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ view_id: popup.view_id, action }),
      keepalive: true,
    }).catch(() => {});
  }, [popup]);

  const close = useCallback(() => {
    send("closed");
    setPopup(null);
  }, [send]);

  const go = useCallback(() => {
    if (!popup) return;
    send("clicked");
    const link = popup.button_link || "";
    setPopup(null);
    if (!link) return;
    if (/^https?:\/\//i.test(link)) window.open(link, "_blank", "noopener");
    else router.push(link);
  }, [popup, send, router]);

  useEffect(() => {
    if (!popup) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [popup, close]);

  if (!popup) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={popup.title}
      onClick={close}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: "relative", width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto",
          background: "var(--card)", color: "var(--text)", borderRadius: 16,
          border: "1px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        }}
      >
        <button
          onClick={close}
          aria-label="Close"
          style={{
            position: "absolute", top: 8, right: 8, width: 32, height: 32, borderRadius: 16,
            border: "none", background: "rgba(0,0,0,0.45)", color: "#fff", fontSize: 18,
            lineHeight: "32px", cursor: "pointer", zIndex: 1,
          }}
        >
          ×
        </button>
        {popup.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={popup.image_url}
            alt=""
            onClick={popup.button_link ? go : undefined}
            style={{
              display: "block", width: "100%", height: "auto", borderRadius: "16px 16px 0 0",
              cursor: popup.button_link ? "pointer" : "default",
            }}
          />
        )}
        <div style={{ padding: "18px 18px 20px" }}>
          {popup.title && (
            <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1.3, marginBottom: 6, paddingRight: popup.image_url ? 0 : 28 }}>
              {popup.title}
            </div>
          )}
          {popup.message && (
            <div style={{ fontSize: 14, lineHeight: 1.6, color: "var(--text2)", whiteSpace: "pre-line" }}>
              {popup.message}
            </div>
          )}
          {popup.button_link && (
            <button
              onClick={go}
              style={{
                marginTop: 16, width: "100%", padding: "12px 16px", borderRadius: 10, border: "none",
                background: GOLD, color: NAVY, fontWeight: 800, fontSize: 15, cursor: "pointer",
              }}
            >
              {popup.button_text || "View"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
