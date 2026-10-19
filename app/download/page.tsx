"use client";

// /download — "Download our app" (Oct 2026). Student wala hissa poora English.
//
//  Windows card: latest installer (.exe) — link backend deta hai (GitHub ki
//  latest release se), isliye naye version par yahan kuch nahi badalna.
//
//  Android card: app abhi Play Store closed testing me hai.
//    login nahi        -> "Log in to request access"
//    request nahi      -> Gmail form
//    pending           -> "Request received", Gmail badal bhi sakte hain
//    added             -> Step 1 Join as tester, Step 2 Play Store
//    rejected          -> dobara form (chhota sa note)
//  Admin "App is public" kar de to sabko seedha Play Store button.
//
//  Admin ke switch (sab default OFF): Download page OFF = "Coming soon";
//  Android / Windows OFF = wo card nahi dikhta.
//
//  Backend: routers/testers.py (/api/testers/...). Admin: app/admin/ClosedTestersAdmin.tsx

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser } from "@/lib/api";
import { isDesktopApp } from "@/lib/desktop";
import V2Shell from "@/app/components/v2/V2Shell";
import SiteHeader from "@/app/components/v2/SiteHeader";
import SiteFooter from "@/app/components/v2/SiteFooter";
import "./download.css";

type WinInfo = { url: string; version: string | null; size_mb: number | null; ready: boolean };
type Config = {
  page_on?: boolean;
  android: { on?: boolean; mode: "closed" | "public"; play_url: string | null };
  windows: WinInfo & { on?: boolean };
};
type Me = {
  mode: "closed" | "public";
  status: "none" | "pending" | "added" | "rejected" | "public";
  gmail?: string | null;
  opt_in_url?: string | null;
  play_url?: string | null;
};

const GMAIL_RE = /^[a-z0-9](?:[a-z0-9.+_-]{0,62}[a-z0-9])?@gmail\.com$/;

function IconMonitor({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="3.5" width="19" height="13" rx="2" />
      <path d="M8 20.5h8M12 16.5v4" />
    </svg>
  );
}

function IconPhone({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="2.5" width="12" height="19" rx="2.5" />
      <path d="M10.5 18.5h3" />
    </svg>
  );
}

function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function DownloadPage() {
  const router = useRouter();
  const [cfg, setCfg] = useState<Config | null>(null);
  const [cfgErr, setCfgErr] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);
  const [inDesktop, setInDesktop] = useState(false);
  const [me, setMe] = useState<Me | null>(null);
  const [meLoading, setMeLoading] = useState(false);

  const [gmail, setGmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    setInDesktop(isDesktopApp());
    const u = getUser();
    setLoggedIn(!!u);

    fetch(`${API_URL}/testers/config`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setCfg(d))
      .catch(() => setCfgErr(true));

    if (u) {
      setMeLoading(true);
      fetch(`${API_URL}/testers/me`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (d) {
            setMe(d);
            if (d.gmail) setGmail(d.gmail);
          }
        })
        .catch(() => {})
        .finally(() => setMeLoading(false));
    }
  }, []);

  function goLogin() {
    try {
      sessionStorage.setItem("sl_after_login", "/download");
    } catch {}
    router.push("/login");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const g = gmail.trim().toLowerCase();
    setErr("");
    if (!GMAIL_RE.test(g)) {
      setErr("Please enter a valid Gmail address (for example, yourname@gmail.com).");
      return;
    }
    setSending(true);
    try {
      const r = await fetch(`${API_URL}/testers/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gmail: g }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.status === 401) {
        setErr("Your session has expired. Please log in again.");
        return;
      }
      if (!r.ok) {
        setErr(typeof d.detail === "string" ? d.detail : "Something went wrong. Please try again.");
        return;
      }
      setMe(d);
      setEditing(false);
    } catch {
      setErr("Could not reach the server. Please check your internet and try again.");
    } finally {
      setSending(false);
    }
  }

  const androidPublic = cfg?.android.mode === "public" || me?.status === "public";
  const playUrl = me?.play_url || cfg?.android.play_url || "";
  const win = cfg?.windows;
  const showAndroid = !!cfg?.page_on && !!cfg?.android.on;
  const showWindows = !!cfg?.page_on && !!cfg?.windows.on;
  const comingSoon = !!cfg && !showAndroid && !showWindows;

  // ── Android card body ──
  function androidBody() {
    if (!cfg && !cfgErr) return <p className="v2-sub">Loading…</p>;

    if (androidPublic) {
      return (
        <>
          <p className="v2-dl-text">Install Selection Lab from the Google Play Store.</p>
          {playUrl && (
            <a href={playUrl} target="_blank" rel="noopener noreferrer" className="v2-btn v2-btn-gold v2-dl-cta">
              Get it on Google Play
            </a>
          )}
        </>
      );
    }

    const intro = (
      <p className="v2-dl-text">
        Our Android app is in <b>closed testing</b> on the Google Play Store. Submit your Play Store Gmail ID to get early
        access.
      </p>
    );

    if (loggedIn === false) {
      return (
        <>
          {intro}
          <button className="v2-btn v2-btn-gold v2-dl-cta" onClick={goLogin}>
            Log in to request access
          </button>
          <p className="v2-dl-note">You need a Selection Lab account so we can tell you when you are added.</p>
        </>
      );
    }

    if (loggedIn === null || meLoading) return <p className="v2-sub">Loading…</p>;

    const status = me?.status || "none";

    if (status === "added") {
      return (
        <>
          <div className="v2-dl-ok">
            <IconCheck /> You&apos;re in! You have been added to our closed testing program.
          </div>
          <ol className="v2-dl-steps">
            {me?.opt_in_url && (
              <li>
                <b>Join as a tester</b>
                <span>
                  Open this on your phone and sign in with <b>{me?.gmail}</b>, then tap <b>Become a tester</b>.
                </span>
                <a href={me.opt_in_url} target="_blank" rel="noopener noreferrer" className="v2-btn v2-btn-ink v2-dl-cta">
                  Join as tester
                </a>
              </li>
            )}
            <li>
              <b>Download from the Play Store</b>
              <span>It can take a few minutes after joining before the Play Store shows the app.</span>
              {playUrl && (
                <a href={playUrl} target="_blank" rel="noopener noreferrer" className="v2-btn v2-btn-gold v2-dl-cta">
                  Download from Play Store
                </a>
              )}
            </li>
          </ol>
        </>
      );
    }

    if (status === "pending" && !editing) {
      return (
        <>
          <div className="v2-dl-ok">
            <IconCheck /> Request received
          </div>
          <p className="v2-dl-text">
            We will email <b>{me?.gmail}</b> as soon as you are added to the testing program. After that, the download
            link will appear right here.
          </p>
          <button className="v2-dl-link" onClick={() => setEditing(true)}>
            Entered the wrong Gmail? Change it
          </button>
        </>
      );
    }

    return (
      <>
        {intro}
        {status === "rejected" && !editing && (
          <p className="v2-dl-warn">Your previous request could not be approved. Please check your Gmail ID and submit again.</p>
        )}
        <form onSubmit={submit} className="v2-dl-form" noValidate>
          <label htmlFor="dl-gmail">Your Play Store Gmail ID</label>
          <input
            id="dl-gmail"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="yourname@gmail.com"
            value={gmail}
            onChange={(e) => setGmail(e.target.value)}
            disabled={sending}
          />
          <p className="v2-dl-note">Use the same Gmail account that is signed in to the Play Store on your phone.</p>
          {err && <p className="v2-dl-err">{err}</p>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <button type="submit" className="v2-btn v2-btn-gold" disabled={sending}>
              {sending ? "Submitting…" : "Submit"}
            </button>
            {editing && (
              <button
                type="button"
                className="v2-dl-link"
                onClick={() => {
                  setEditing(false);
                  setErr("");
                  setGmail(me?.gmail || "");
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </>
    );
  }

  // ── Windows card body ──
  function windowsBody() {
    if (inDesktop) {
      return (
        <div className="v2-dl-ok">
          <IconCheck /> You are already using the Windows app.
        </div>
      );
    }
    if (!cfg && !cfgErr) return <p className="v2-sub">Loading…</p>;
    const ready = !!win?.ready;
    return (
      <>
        <p className="v2-dl-text">Study on your laptop or PC with a faster, focused app. Same account, same purchases.</p>
        <ul className="v2-dl-points">
          <li>
            <IconCheck /> Opens faster than the browser
          </li>
          <li>
            <IconCheck /> Updates itself automatically
          </li>
          <li>
            <IconCheck /> Windows 10 and 11 (64-bit)
          </li>
        </ul>
        {ready ? (
          <a href={win!.url} className="v2-btn v2-btn-gold v2-dl-cta" rel="noopener">
            Download for Windows
          </a>
        ) : (
          <button className="v2-btn v2-btn-gold v2-dl-cta" disabled>
            Coming soon
          </button>
        )}
        {ready && (
          <p className="v2-dl-meta">
            {win?.version ? `Version ${win.version}` : ""}
            {win?.version && win?.size_mb ? " · " : ""}
            {win?.size_mb ? `${win.size_mb} MB` : ""}
          </p>
        )}
        <p className="v2-dl-note">
          If Windows shows <b>&ldquo;Windows protected your PC&rdquo;</b>, click <b>More info</b> and then <b>Run anyway</b>.
          This appears because our app is new.
        </p>
      </>
    );
  }

  return (
    <V2Shell>
      <SiteHeader />
      <main className="v2-wrap v2-main">
        <div className="v2-narrow">
          <nav className="v2-crumb" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <span style={{ color: "var(--text)", fontWeight: 700 }}>Download the app</span>
          </nav>
          <h1 className="v2-h1" style={{ marginTop: 12 }}>
            Download our app
          </h1>
          <p className="v2-sub" style={{ fontSize: 15 }}>
            Selection Lab on your phone and your computer — one account, everything in sync.
          </p>

          {cfgErr && (
            <div className="v2-msg" style={{ marginTop: 18, background: "var(--v2-gold-wash)", border: "1px solid rgba(255,171,0,0.45)" }}>
              Could not load the download links. Please refresh the page.
            </div>
          )}

          {!cfg && !cfgErr && <p className="v2-sub" style={{ marginTop: 22 }}>Loading…</p>}

          {comingSoon && (
            <section className="v2-box v2-dl-card" style={{ marginTop: 22, textAlign: "center", justifyItems: "center" }}>
              <div className="v2-box-ic">
                <IconPhone />
              </div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Coming soon</h2>
              <p className="v2-dl-text">Our apps are almost ready. Please check back soon.</p>
              <Link href="/" className="v2-btn v2-btn-gold">
                Back to home
              </Link>
            </section>
          )}

          {(showAndroid || showWindows) && (
          <div className={`v2-dl-grid${showAndroid && showWindows ? "" : " one"}`}>
            {showAndroid && (
            <section className="v2-box v2-dl-card" aria-labelledby="dl-android">
              <div className="v2-dl-head">
                <div className="v2-box-ic">
                  <IconPhone />
                </div>
                <div>
                  <h2 id="dl-android">Android app</h2>
                  <span className="v2-dl-badge">{androidPublic ? "Google Play" : "Closed testing"}</span>
                </div>
              </div>
              {androidBody()}
            </section>
            )}

            {showWindows && (
            <section className="v2-box v2-dl-card" aria-labelledby="dl-windows">
              <div className="v2-dl-head">
                <div className="v2-box-ic">
                  <IconMonitor />
                </div>
                <div>
                  <h2 id="dl-windows">Windows app</h2>
                  <span className="v2-dl-badge">For PC and laptop</span>
                </div>
              </div>
              {windowsBody()}
            </section>
            )}
          </div>
          )}

          <p className="v2-sub" style={{ marginTop: 22, textAlign: "center" }}>
            Need help? <Link href="/support" style={{ color: "var(--v2-gold-ink)", fontWeight: 700 }}>Contact support</Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </V2Shell>
  );
}
