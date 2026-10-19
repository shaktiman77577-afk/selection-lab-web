"use client";

// "Download our app" — admin ke switch (Oct 2026).
// Backend /testers/config batata hai: download page ON hai ya nahi, aur
// Android / Windows card ON hain ya nahi (sab default OFF). Menu, footer aur
// home page ka link isi se dikhta/chhupta hai. Ek page-load me ek hi request —
// sab jagah wahi promise. Dekho routers/testers.py, app/download/page.tsx

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";

export type DownloadConfig = {
  page_on?: boolean;
  android: { on?: boolean; mode: "closed" | "public"; play_url: string | null };
  windows: { on?: boolean; url: string | null; version: string | null; size_mb: number | null; ready: boolean };
};

let pending: Promise<DownloadConfig | null> | null = null;

export function loadDownloadConfig(): Promise<DownloadConfig | null> {
  if (!pending) {
    pending = fetch(`${API_URL}/testers/config`)
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((d) => {
        if (!d) pending = null; // fail hua to agli baar dobara poochho
        return d;
      });
  }
  return pending;
}

/** Download page dikhana hai? (page ON + kam se kam ek card ON) */
export function downloadVisible(d: DownloadConfig | null): boolean {
  return !!d?.page_on && !!(d.android?.on || d.windows?.on);
}

export function useDownloadVisible(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let alive = true;
    loadDownloadConfig().then((d) => {
      if (alive) setOn(downloadVisible(d));
    });
    return () => {
      alive = false;
    };
  }, []);
  return on;
}
