"use client";

// Heartbeat — website har 60 second me batati hai ki user online hai aur kya kar raha hai.
// Admin panel me "Live activity" isi se chalta hai, taaki deploy karne se pehle
// pata chal jaye ki koi test to nahi de raha.
//
// Layout me ek baar daal dijiye: <ActivityBeacon />
// Har page apne aap detect ho jata hai URL se — kuch aur karne ki zaroorat nahi.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";

function describe(path: string): { page: string; activity: string } {
  // Test dena sabse zaroori hai — deploy usi waqt nahi karna chahiye
  if (/^\/mock-test\/\d+/.test(path)) return { page: "Taking a mock test", activity: "taking_test" };
  if (/^\/descriptive-test\/\d+/.test(path)) return { page: "Writing a descriptive test", activity: "taking_test" };
  if (/^\/learn\/\d+/.test(path)) return { page: "Watching course content", activity: "reading" };
  if (/^\/course\/\d+/.test(path)) return { page: "Looking at a course", activity: "browsing" };
  if (/^\/mock-tests\/\d+/.test(path)) return { page: "Mock series page", activity: "browsing" };
  if (path.startsWith("/mock-tests")) return { page: "Mock tests list", activity: "browsing" };
  if (path.startsWith("/descriptive")) return { page: "Descriptive list", activity: "browsing" };
  if (path.startsWith("/courses")) return { page: "Courses list", activity: "browsing" };
  if (path.startsWith("/my-learning")) return { page: "My Learning", activity: "browsing" };
  if (path.startsWith("/blog")) return { page: "Reading the blog", activity: "reading" };
  if (path.startsWith("/login")) return { page: "Logging in", activity: "browsing" };
  if (path === "/") return { page: "Home page", activity: "browsing" };
  return { page: path, activity: "browsing" };
}

export default function ActivityBeacon() {
  const pathname = usePathname();

  useEffect(() => {
    const u = getUser();
    if (!u) return;   // logged out users track nahi karte

    const { page, activity } = describe(pathname || "/");

    const ping = () => {
      // Tab background me ho to mat bhejo — warna galat lagega ki banda active hai
      if (document.visibilityState !== "visible") return;
      fetch(`${API_URL}/admin-extra/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: (u as any).id,
          page,
          activity,
          detail: typeof document !== "undefined" ? document.title.slice(0, 120) : null,
        }),
        keepalive: true,
      }).catch(() => {});
    };

    ping();                                   // page khulte hi
    const t = setInterval(ping, 60000);       // phir har minute
    document.addEventListener("visibilitychange", ping);

    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", ping);
    };
  }, [pathname]);

  return null;
}
