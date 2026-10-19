"use client";

// Naya header: laptop par upar poora menu + ☰ sidebar, phone par logo + ☰ + chhote chips.
// App ke andar (WebView) sirf ☰ dikhta hai - wahan "Back to app" milta hai.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/api";
import { isAppMode } from "@/lib/appMode";
import { SHOW_CURRENT_AFFAIRS } from "@/lib/config";
import SideMenu from "@/app/components/SideMenu";
import ThemeToggle from "@/app/components/ThemeToggle";
import { IconMenu, IconSearch } from "./Icons";

const NAV = [
  { href: "/courses", label: "Courses" },
  // Promote karna hai — Courses ke theek baad (Oct 2026)
  { href: "/current-affairs", label: "Current Affairs", ca: true },
  { href: "/mock-tests", label: "Mock Tests" },
  { href: "/descriptive", label: "Descriptive" },
  { href: "/tier2", label: "Typing & Skill" },
  // 960-1079px laptop par jagah kam — tab Blog upar nahi dikhta (link HTML me rehta
  // hai, footer / homepage / ☰ menu me bhi — SEO par asar nahi). 1080px+ par dikhta hai.
  { href: "/blog", label: "Blog", lg: true },
  { href: "/about", label: "About", xl: true },
  { href: "/support", label: "Help", xl: true },
] as { href: string; label: string; xl?: boolean; lg?: boolean; ca?: boolean }[];
// Current Affairs band ho to uska link nahi (lib/config.ts)
const NAV_ON = NAV.filter((n) => SHOW_CURRENT_AFFAIRS || !n.ca);

// Phone ki chips (scroll hoti hain) — About/Help chhod kar sab
const CHIPS = NAV_ON.filter((n) => !n.xl);

export default function SiteHeader() {
  const path = usePathname() || "/";
  const [menu, setMenu] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getUser());
    setInApp(isAppMode());
  }, []);

  // Exam Updates ab Blog ke andar hain, isliye wahan bhi "Blog" chamakta hai
  const on = (href: string) =>
    path === href || path.startsWith(href + "/") || (href === "/blog" && path.startsWith("/exam-updates"));

  return (
    <>
      <header className="v2-hdr">
        <div className="v2-wrap v2-hdr-in">
          <Link href="/" className="v2-brand" aria-label="Selection Lab home">
            <img src="/logo.png" alt="" />
            <span>
              Selection <b>Lab</b>
            </span>
          </Link>

          {!inApp && (
            <nav className="v2-nav" aria-label="Main">
              {NAV_ON.map((n) => (
                <Link key={n.href} href={n.href} className={`v2-navlink${n.xl ? " xl" : ""}${n.lg ? " lg" : ""}`} aria-current={on(n.href) ? "page" : undefined}>
                  {n.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="v2-spacer" />

          {!inApp && (
            <>
              <Link href="/search" className="v2-iconbtn v2-search-ic" aria-label="Search">
                <IconSearch size={20} />
              </Link>
            </>
          )}

          <ThemeToggle />

          {!inApp && loggedIn !== null &&
            (loggedIn ? (
              <Link href="/my-learning" className="v2-btn v2-btn-ink v2-btn-sm v2-hide-xs">
                My Learning
              </Link>
            ) : (
              <Link href="/login" className="v2-btn v2-btn-gold v2-btn-sm">
                Login
              </Link>
            ))}

          {/* ☰ sidebar har screen par (laptop par bhi) - poora menu wahi hai */}
          <button className="v2-iconbtn" aria-label="Open menu" onClick={() => setMenu(true)}>
            <IconMenu />
          </button>
        </div>

        {!inApp && (
          <nav className="v2-subnav" aria-label="Quick links">
            {CHIPS.map((n) => (
              <Link key={n.href} href={n.href} className="v2-chip" aria-current={on(n.href) ? "page" : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      <SideMenu open={menu} onClose={() => setMenu(false)} />
    </>
  );
}
