"use client";

// Home ka banner carousel (website redesign).
// - Admin ke banners + Featured courses ke poster, poore dikhte hain (contain)
// - Dabba 16:9 (poster jaisa); phone par sab slides ke mobile poster hon to chaukor
// - 4.5 second me apne aap aage; mouse upar ho, tab chhupa ho ya
//   "reduce motion" on ho to rukta hai
// - Phone par swipe; laptop par < > buttons aur dots
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconLeft, IconRight } from "./Icons";

export type Slide = { img: string; imgMobile?: string; href: string; title?: string };

function Pic({ s, first }: { s: Slide; first: boolean }) {
  return (
    <>
      <div className="v2-slide-bg" style={{ backgroundImage: `url(${JSON.stringify(s.img)})` }} aria-hidden="true" />
      <picture>
        {s.imgMobile ? <source media="(max-width: 819px)" srcSet={s.imgMobile} /> : null}
        <img src={s.img} alt={s.title || ""} loading={first ? "eager" : "lazy"} decoding="async" fetchPriority={first ? "high" : "auto"} draggable={false} />
      </picture>
    </>
  );
}

export default function HeroCarousel({ slides }: { slides: Slide[] }) {
  const n = slides.length;
  const [i, setI] = useState(0);
  const [tick, setTick] = useState(0);
  const [paused, setPaused] = useState(false);
  const startX = useRef<number | null>(null);
  const swiped = useRef(false);

  const go = useCallback(
    (to: number) => {
      setI(((to % n) + n) % n);
      setTick((t) => t + 1);
    },
    [n]
  );

  useEffect(() => {
    if (n < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!document.hidden) setI((x) => (x + 1) % n);
    }, 4500);
    return () => clearInterval(id);
  }, [n, paused, tick]);

  if (n === 0) return null;

  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    if (swiped.current) {
      e.preventDefault();
      swiped.current = false;
    }
  };

  return (
    <section
      className={`v2-hero${slides.every((x) => x.imgMobile) ? " sq" : ""}`}
      aria-roledescription="carousel"
      aria-label="Offers"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={(e) => {
        startX.current = e.touches[0].clientX;
        swiped.current = false;
      }}
      onTouchMove={(e) => {
        if (startX.current !== null && Math.abs(e.touches[0].clientX - startX.current) > 10) swiped.current = true;
      }}
      onTouchEnd={(e) => {
        if (startX.current === null || n < 2) return;
        const dx = e.changedTouches[0].clientX - startX.current;
        startX.current = null;
        if (Math.abs(dx) < 40) return;
        go(i + (dx < 0 ? 1 : -1));
      }}
    >
      {slides.map((s, k) => {
        const cls = `v2-slide${k === i ? " on" : ""}`;
        const hidden = k !== i;
        const inner = <Pic s={s} first={k === 0} />;
        if (!s.href) {
          return (
            <div key={k} className={cls} aria-hidden={hidden}>
              {inner}
            </div>
          );
        }
        if (/^https?:/i.test(s.href)) {
          return (
            <a key={k} className={cls} aria-hidden={hidden} tabIndex={hidden ? -1 : 0} href={s.href} target="_blank" rel="noopener noreferrer" onClick={onClick}>
              {inner}
            </a>
          );
        }
        return (
          <Link key={k} className={cls} aria-hidden={hidden} tabIndex={hidden ? -1 : 0} href={s.href} onClick={onClick}>
            {inner}
          </Link>
        );
      })}

      {n > 1 && (
        <>
          <button className="v2-arrow prev" aria-label="Previous slide" onClick={() => go(i - 1)}>
            <IconLeft size={20} />
          </button>
          <button className="v2-arrow next" aria-label="Next slide" onClick={() => go(i + 1)}>
            <IconRight size={20} />
          </button>
          <div className="v2-dots">
            {slides.map((_, k) => (
              <button key={k} className={`v2-dot${k === i ? " on" : ""}`} aria-label={`Go to slide ${k + 1}`} onClick={() => go(k)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
