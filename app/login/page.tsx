"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, getGoogleRedirectResult } from "@/lib/firebase";
import { syncGoogleUser, loginEmail, saveUser } from "@/lib/api";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function routeAfterAuth(user: any) {
    saveUser(user);
    if (user?.profile_completed === false) router.push("/profile-setup");
    else router.push("/");
  }

  // On mobile, Google login uses a full-page redirect. When the user comes
  // back to this page, pick up the result here and finish signing them in.
  useEffect(() => {
    (async () => {
      setStatus("Checking Google sign-in...");
      let g;
      try {
        g = await getGoogleRedirectResult();
      } catch (e: any) {
        setStatus("");
        setError(`Firebase redirect error: ${e?.code || e?.message || "unknown"}`);
        return;
      }
      if (!g) {
        // No redirect result — either a normal first visit, OR the redirect
        // result was lost (common on mobile due to storage partitioning).
        setStatus("");
        return;
      }
      setStatus(`Signing you in as ${g.email}...`);
      setLoading(true);
      try {
        const res = await syncGoogleUser(g.googleId, g.email, g.name);
        if (res.success && res.user) {
          routeAfterAuth(res.user);
          return;
        }
        setStatus("");
        setError(res.detail || "Google sign-in failed");
      } catch (e: any) {
        setStatus("");
        setError(e?.message || "Google sign-in failed");
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      const g = await signInWithGoogle();
      // On mobile, signInWithGoogle returns null and redirects away —
      // the result is handled by the useEffect above after the page reloads.
      if (!g) return;
      const res = await syncGoogleUser(g.googleId, g.email, g.name);
      if (!res.success || !res.user) {
        setError(res.detail || "Google sign-in failed");
        setLoading(false);
        return;
      }
      routeAfterAuth(res.user);
    } catch (e: any) {
      setError(e?.message || "Google sign-in was cancelled");
      setLoading(false);
    }
  }

  async function handleEmailLogin() {
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    setLoading(true);
    const res = await loginEmail(email, password);
    if (!res.success || !res.user) {
      setError(res.detail || "Login failed");
      setLoading(false);
      return;
    }
    routeAfterAuth(res.user);
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 18px",
        background: "linear-gradient(160deg, #fff7e6 0%, #f6f4ee 45%, #eef2fa 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: -80, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(255,171,0,0.18)", filter: "blur(8px)" }} />
      <div style={{ position: "absolute", bottom: -90, left: -70, width: 240, height: 240, borderRadius: "50%", background: "rgba(26,47,85,0.10)", filter: "blur(8px)" }} />

      <div style={{ width: "100%", maxWidth: 400, position: "relative", zIndex: 1 }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <img
            src="/logo.png"
            alt="Selection Lab"
            style={{ width: 84, height: 84, objectFit: "contain", borderRadius: 18, boxShadow: "0 6px 20px rgba(0,0,0,0.12)" }}
          />
          <h1 style={{ margin: "16px 0 4px", fontSize: 27, fontWeight: 800, color: NAVY, letterSpacing: -0.3 }}>
            Welcome to <span style={{ color: GOLD }}>Selection Lab</span>
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: "#5c6472" }}>
            Sign in to continue your preparation
          </p>
        </div>

        <div
          style={{
            background: "#ffffff",
            borderRadius: 20,
            padding: "22px 20px",
            boxShadow: "0 10px 34px rgba(26,47,85,0.12)",
            border: "1px solid rgba(0,0,0,0.05)",
          }}
        >
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              background: "#fff",
              color: "#1f1f1f",
              border: "1.5px solid #dcdfe4",
              borderRadius: 12,
              padding: "14px 16px",
              fontSize: 15,
              fontWeight: 700,
              cursor: loading ? "default" : "pointer",
              opacity: loading ? 0.65 : 1,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
          >
            <GoogleIcon />
            {loading ? "Please wait..." : "Continue with Google"}
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "18px 0" }}>
            <div style={{ flex: 1, height: 1, background: "#e6e8ec" }} />
            <span style={{ fontSize: 12, color: "#9aa1ad", fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "#e6e8ec" }} />
          </div>

          {!showEmail ? (
            <button
              onClick={() => setShowEmail(true)}
              style={{
                width: "100%",
                background: "transparent",
                color: NAVY,
                border: "1.5px solid #d6dae2",
                borderRadius: 12,
                padding: "13px 16px",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign in with Email
            </button>
          ) : (
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />
              <button
                onClick={handleEmailLogin}
                disabled={loading}
                style={{
                  width: "100%",
                  background: GOLD,
                  color: "#1a1a1a",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 16px",
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: loading ? "default" : "pointer",
                  opacity: loading ? 0.65 : 1,
                  marginTop: 4,
                }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <button
                onClick={() => setShowEmail(false)}
                style={{ width: "100%", background: "none", border: "none", color: "#8a919d", fontSize: 13, marginTop: 12, cursor: "pointer" }}
              >
                ← Back to other options
              </button>
            </div>
          )}

          {status && (
            <div style={{ marginTop: 14, background: "#eef4ff", border: "1px solid #c3d5f5", color: "#1a2f55", borderRadius: 10, padding: "10px 12px", fontSize: 13, textAlign: "center" }}>
              {status}
            </div>
          )}

          {error && (
            <div style={{ marginTop: 14, background: "#fdeceb", border: "1px solid #f3c2be", color: "#c0392b", borderRadius: 10, padding: "10px 12px", fontSize: 13, textAlign: "center", wordBreak: "break-word" }}>
              {error}
            </div>
          )}
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 22, marginTop: 22 }}>
          <Badge icon="🔒" label="Secure & Safe" />
          <Badge icon="⚡" label="Easy & Fast" />
          <Badge icon="🏅" label="Trusted by Aspirants" />
        </div>

        <p style={{ textAlign: "center", color: "#8a919d", fontSize: 12, marginTop: 20, lineHeight: 1.6 }}>
          By continuing, you agree to our
          <br />
          <a href="/terms" style={{ color: NAVY, fontWeight: 600 }}>Terms of Service</a> and{" "}
          <a href="/privacy" style={{ color: NAVY, fontWeight: 600 }}>Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  background: "#f7f8fa",
  border: "1.5px solid #e2e5ea",
  borderRadius: 12,
  padding: "13px 14px",
  fontSize: 15,
  color: "#1f1f1f",
  marginBottom: 12,
  outline: "none",
};

function Badge({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ textAlign: "center", maxWidth: 80 }}>
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          border: `2px solid ${GOLD}`,
          background: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          margin: "0 auto 6px",
          boxShadow: "0 3px 10px rgba(0,0,0,0.06)",
        }}
      >
        {icon}
      </div>
      <div style={{ fontSize: 11, color: "#5c6472", fontWeight: 600, lineHeight: 1.3 }}>{label}</div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
                         }
