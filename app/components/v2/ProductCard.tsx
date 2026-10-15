// Course / test series ka ek jaisa card (website redesign).
// Poster poora dikhta hai (contain) aur peeche usi ki blurred copy.
// Phone par mobile poster (square), bade screen par desktop wala.
// Poora card ek link hai; "actions" (Buy, Telegram) uske upar alag se dabte hain.
import Link from "next/link";
import type { ReactNode } from "react";

export type CardProps = {
  href: string;
  title: string;
  img?: string;
  imgMobile?: string;
  price?: number;
  original?: number;
  owned?: boolean;
  badge?: ReactNode;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  priority?: boolean;
  fallback?: ReactNode;
  /** Exam ho chuka: card faded, "Exam Over" tag, aur bina khareede walon ke liye Buy band */
  examOver?: boolean;
  /** 🔥 Trending (pichhle 30 din me sale) ya NEW (pichhle 30 din me bana) */
  tag?: "trending" | "new";
};

export default function ProductCard(p: CardProps) {
  const price = Number(p.price) || 0;
  const original = Number(p.original) || 0;
  const free = price <= 0;
  const off = !free && original > price ? Math.round((1 - price / original) * 100) : 0;
  const src = p.img || p.imgMobile || "";
  const bg = `url(${JSON.stringify(src)})`;
  const over = !!p.examOver;
  const lockedOver = over && !p.owned;

  return (
    <article className={`v2-card${over ? " v2-over" : ""}`}>
      <div className={`v2-media${p.imgMobile ? " sq" : ""}`}>
        {src ? (
          <>
            <div className="v2-media-bg" style={{ backgroundImage: bg }} aria-hidden="true" />
            <picture>
              {p.imgMobile && p.img ? <source media="(max-width: 819px)" srcSet={p.imgMobile} /> : null}
              <img src={src} alt="" loading={p.priority ? "eager" : "lazy"} decoding="async" />
            </picture>
          </>
        ) : (
          <div className="v2-media-empty">{p.fallback}</div>
        )}
        {p.badge ? <span className="v2-badge">{p.badge}</span> : null}
        {over ? (
          <span className="v2-over-ribbon">Exam Over</span>
        ) : p.tag === "trending" ? (
          <span className="v2-over-ribbon v2-trend">🔥 Trending</span>
        ) : p.tag === "new" ? (
          <span className="v2-over-ribbon v2-new">New</span>
        ) : null}
      </div>

      <div className="v2-body">
        <h3 className="v2-title">
          <Link href={p.href} className="v2-link">
            {p.title}
          </Link>
        </h3>
        {p.description ? <p className="v2-desc">{p.description}</p> : null}
        {p.meta ? <div className="v2-meta">{p.meta}</div> : null}
        <div className="v2-foot">
          {p.owned ? (
            <span className="v2-tag">OWNED ✓</span>
          ) : lockedOver ? (
            <span className="v2-tag over">🔒 EXAM OVER</span>
          ) : free ? (
            <span className="v2-free">FREE</span>
          ) : (
            <>
              <span className="v2-price">₹{price}</span>
              {off > 0 ? (
                <>
                  <span className="v2-strike">₹{original}</span>
                  <span className="v2-tag gold">{off}% OFF</span>
                </>
              ) : null}
            </>
          )}
        </div>
        {lockedOver ? (
          <div className="v2-actions">
            <button type="button" className="v2-btn v2-btn-sm v2-btn-over" style={{ width: "100%" }} disabled>
              🔒 Exam Over — Not Available
            </button>
          </div>
        ) : p.actions ? (
          <div className="v2-actions">{p.actions}</div>
        ) : null}
      </div>
    </article>
  );
}
