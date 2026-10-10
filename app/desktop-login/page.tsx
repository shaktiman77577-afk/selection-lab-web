"use client";

// /desktop-login — Windows app ka Google login, bachche ke apne browser me.
//
// App ise kholta hai: /desktop-login?c=<challenge>&s=<state>
// Yahan Google login -> server se 2 minute ka code (is challenge se bandha)
// -> selectionlab://auth?code=...&s=... khulta hai aur Windows wo app ko deta
// hai. Code akela bekaar hai — app ka gupt verifier saath chahiye (lib/desktop.ts).

import { useEffect, useState } from "react";
import { signInWithGoogle, getGoogleRedirectResult } from "@/lib/firebase";
import { syncGoogleUser, desktopLoginCode } from "@/lib/api";
import { validDesktopParams } from "@/lib/desktop";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";

type Phase = "start" | "working" | "done" | "invalid";

export default function DesktopLoginPage() {
  const [phase, setPhase] = useState<Phase>("start");
  const [params, setParams] = useState<{ c: string; s: string } | null>(null);
  const [error, setError] = useState("");
  const [appLink, setAppLink] = useState("");
  const [email, setEmail] = useState("");

  async function finish(g: { googleId: string; email: string; name: string }, p: { c: string; s: string }) {
    setPhase("working");
    setEmail(g.email);
    const res = await syncGoogleUser(g.googleId, g.email, g.name);
    if (!res.success || !res.user) {
      setError(res.detail || "Google sign-in failed");
      setPhase("start");
      return;
    }
    const out = await desktopLoginCode(p.c);
    if (!out.code) {
      setError(out.detail || "Could not finish sign-in");
      setPhase("start");
      return;
    }
    const link = `selectionlab://auth?code=${encodeURIComponent(out.code)}&s=${encodeURIComponent(p.s)}`;
    setAppLink(link);
    setPhase("done");
    window.location.href = link;
  }

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const c = q.get("c");
    const s = q.get("s");
    if (!validDesktopParams(c, s)) {
      setPhase("invalid");
      return;
    }
    const p = { c: c as string, s: s as string };
    setParams(p);
    // Popup band tha to Firebase redirect se wapas aaye — wahi poora karo
    (async () => {
      try {
        const g = await getGoogleRedirectResult();
        if (g) await finish(g, p);
      } catch {}
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogle() {
    if (!params) return;
    setError("");
    try {
      const g = await signInWithGoogle();
      if (!g) return; // band kiya, ya redirect par gaye
      await finish(g, params);
    } catch (e: any) {
      setError(e?.message || "Google sign-in was cancelled");
      setPhase("start");
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 18px",
        background: "linear-gradient(160deg, #fff7e6 0%, #f6f4ee 45%, #eef2fa 100%)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "#fff",
          borderRadius: 20,
          padding: "28px 22px",
          boxShadow: "0 10px 34px rgba(26,47,85,0.12)",
          textAlign: "center",
        }}
      >
        <img src="/logo.png" alt="Selection Lab" style={{ width: 72, height: 72, borderRadius: 16 }} />
        <h1 style={{ margin: "14px 0 6px", fontSize: 22, fontWeight: 800, color: NAVY }}>
          {phase === "done" ? "You're signed in" : "Sign in to the desktop app"}
        </h1>

        {phase === "invalid" && (
          <p style={{ margin: "8px 0 0", fontSize: 14, color: "#5c6472", lineHeight: 1.55 }}>
            This link has expired. Open the Selection Lab app and click <b>Continue with Google</b> again.
          </p>
        )}

        {(phase === "start" || phase === "working") && (
          <>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: "#5c6472", lineHeight: 1.55 }}>
              Continue with Google here. You&apos;ll be sent back to the Selection Lab app automatically.
            </p>
            <button
              onClick={handleGoogle}
              disabled={phase === "working"}
              style={{
                width: "100%",
                background: "#fff",
                color: "#1f1f1f",
                border: "1.5px solid #dcdfe4",
                borderRadius: 12,
                padding: "14px 16px",
                fontSize: 15,
                fontWeight: 700,
                cursor: phase === "working" ? "default" : "pointer",
                opacity: phase === "working" ? 0.65 : 1,
              }}
            >
              {phase === "working" ? `Signing in${email ? ` as ${email}` : ""}...` : "Continue with Google"}
            </button>
          </>
        )}

        {phase === "done" && (
          <>
            <p style={{ margin: "0 0 18px", fontSize: 14, color: "#5c6472", lineHeight: 1.55 }}>
              Return to the Selection Lab app to continue. If your browser asks, choose <b>Open Selection Lab</b>.
              You can close this tab.
            </p>
            <a
              href={appLink}
              style={{
                display: "inline-block",
                background: GOLD,
                color: "#1a1a1a",
                borderRadius: 12,
                padding: "12px 22px",
                fontSize: 15,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Open Selection Lab app
            </a>
            <p style={{ margin: "14px 0 0", fontSize: 12, color: "#9aa1ad" }}>
              This link works for 2 minutes. If it expires, try again from the app.
            </p>
          </>
        )}

        {error && (
          <div style={{ marginTop: 14, background: "#fdeceb", border: "1px solid #f3c2be", color: "#c0392b", borderRadius: 10, padding: "10px 12px", fontSize: 13, wordBreak: "break-word" }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
