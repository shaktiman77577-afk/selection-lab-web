"use client";

// Naya header: laptop par upar poora menu, phone par logo + ☰ + chhote chips.
// App ke andar (WebView) sirf ☰ dikhta hai - wahan "Back to app" milta hai.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/api";
import { isAppMode } from "@/lib/appMode";
import SideMenu from "@/app/components/SideMenu";
import ThemeToggle from "@/app/components/ThemeToggle";
import { IconMenu, IconSearch } from "./Icons";

const NAV = [
  { href: "/courses", label: "Courses" },
  { href: "/mock-tests", label: "Mock Tests" },
  { href: "/descriptive", label: "Descriptive" },
  { href: "/tier2", label: "Typing / Skill Test" },
  { href: "/blog", label: "Blog" },
  { href: "/about", label: "About" },
  { href: "/support", label: "Help" },
];

const CHIPS = NAV.slice(0, 5);

export default function SiteHeader() {
  const path = usePathname() || "/";
  const [menu, setMenu] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [inApp, setInApp] = useState(false);

  useEffect(() => {
    setLoggedIn(!!getUser());
    setInApp(isAppMode());
  }, []);

  const on = (href: string) => path === href || path.startsWith(href + "/");

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
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="v2-navlink" aria-current={on(n.href) ? "page" : undefined}>
                  {n.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="v2-spacer" />

          {!inApp && (
            <>
              <Link href="/search" className="v2-searchpill">
                <IconSearch size={17} />
                <span>Search courses, tests…</span>
              </Link>
              <Link href="/search" className="v2-iconbtn v2-mob" aria-label="Search">
                <IconSearch size={20} />
              </Link>
            </>
          )}

          <ThemeToggle />

          {!inApp && loggedIn !== null &&
            (loggedIn ? (
              <Link href="/my-learning" className="v2-btn v2-btn-ink v2-btn-sm">
                My Learning
              </Link>
            ) : (
              <Link href="/login" className="v2-btn v2-btn-gold v2-btn-sm">
                Login
              </Link>
            ))}

          <button className={`v2-iconbtn${inApp ? "" : " v2-mob"}`} aria-label="Open menu" onClick={() => setMenu(true)}>
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
