"use client";

// Download page ke link — sirf tab dikhte hain jab admin ne "Download page"
// (aur Android ya Windows) ON kiya ho. Default OFF = kuch nahi dikhta.
// Dekho lib/downloadConfig.ts

import Link from "next/link";
import { useDownloadVisible } from "@/lib/downloadConfig";

/** Footer ki LEARN list ka ek <li> */
export function DownloadFooterItem() {
  const on = useDownloadVisible();
  if (!on) return null;
  return (
    <li>
      <Link href="/download">Download App</Link>
    </li>
  );
}

/** Home page ki gold patti */
export function DownloadBand() {
  const on = useDownloadVisible();
  if (!on) return null;
  return (
    <section className="v2-sec v2-band gold">
      <div>
        <b>Get the Selection Lab app</b>
        <p>Take your preparation everywhere — download the Selection Lab app.</p>
      </div>
      <Link href="/download" className="v2-btn v2-btn-gold">
        Download the app
      </Link>
    </section>
  );
}
