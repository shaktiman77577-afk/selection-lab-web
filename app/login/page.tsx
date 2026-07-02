"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebase";
import { syncGoogleUser, loginEmail, saveUser } from "@/lib/api";

const GOLD = "#FFAB00";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function routeAfterAuth(user: any) {
    saveUser(user);
    if (user?.profile_completed === false) router.push("/profile-setup");
    else router.push("/");
  }

  async function handleGoogle() {
    setError("");
    setLoading(true);
    try {
      const g = await signInWithGoogle();
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
        minHeight: "100vh",
        width: "100%",
        position: "relative",
        display: "flex",
        flexDirection: "column",
        backgroundImage: "url('/library_bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundColor: "#0d0b08",
        overflow: "hidden",
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(13,11,8,0.55) 0%, rgba(13,11,8,0.30) 35%, rgba(13,11,8,0.90) 100%)",
        }}
      />

      {/* Instructor foreground (transparent PNG) */}
      <img
        src="/nikki_maam.png"
        alt=""
        style={{
          position: "absolute",
          bottom: 320,
          left: "50%",
          transform: "translateX(-50%)",
          width: 280,
          maxWidth: "72%",
          objectFit: "contain",
          zIndex: 1,
          pointerEvents: "none",
        }}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "0 20px",
          color: "#fff",
        }}
      >
        {/* Trusted badge top-right */}
        <div
          style={{
            alignSelf: "flex-end",
            marginTop: 20,
            border: `1px solid ${GOLD}`,
            borderRadius: 12,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 600,
            textAlign: "center",
            background: "rgba(0,0,0,0.35)",
          }}
        >
          <span style={{ color: GOLD }}>✔</span> Trusted by
          <br />
          Aspirants
        </div>

        {/* Logo */}
        <img
          src="/logo.png"
          alt="Selection Lab"
          style={{ width: 130, height: 130, objectFit: "contain", marginTop: 24 }}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        {/* Welcome */}
        <h1 style={{ fontSize: 38, fontWeight: 800, margin: "16px 0 0", letterSpacing: 1 }}>
          WELCOME <span style={{ color: GOLD }}>BACK!</span>
        </h1>
        <p
          style={{
            color: "#dcdcdc",
            fontSize: 19,
            textAlign: "center",
            margin: "8px 0 0",
            lineHeight: 1.3,
          }}
        >
          Sign in to continue your
          <br />
          learning journey
        </p>

        {/* Spacer */}
        <div style={{ flex: 1, minHeight: 40 }} />

        {/* Card */}
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            background: "rgba(18,16,13,0.94)",
            border: `1px solid rgba(255,171,0,0.35)`,
            borderRadius: 24,
            padding: "26px 22px",
            marginBottom: 24,
            backdropFilter: "blur(6px)",
          }}
        >
          <p
            style={{
              textAlign: "center",
              fontWeight: 700,
              fontSize: 19,
              margin: "0 0 18px",
            }}
          >
            Sign in with
          </p>

          {/* Google button */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 14,
              border: "none",
              background: "#fff",
              color: "#1a1a1a",
              fontWeight: 700,
              fontSize: 18,
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              opacity: loading ? 0.6 : 1,
            }}
          >
            <span style={{ color: "#4285F4", fontWeight: 800, fontSize: 22 }}>G</span>
            {loading ? "Please wait..." : "Continue with Google"}
          </button>

          {/* OR divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 0" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.2)" }} />
            <span style={{ color: "#999", fontSize: 13, fontWeight: 600 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.2)" }} />
          </div>

          {/* Trust badges */}
          <div style={{ display: "flex", justifyContent: "space-around" }}>
            {[
              { icon: "🛡", label: "Secure\n& Safe" },
              { icon: "👥", label: "Easy\n& Fast" },
              { icon: "🎖", label: "Trusted by\nAspirants" },
            ].map((b, i) => (
              <div key={i} style={{ textAlign: "center", flex: 1 }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: "50%",
                    border: `2px solid ${GOLD}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 22,
                    margin: "0 auto 8px",
                  }}
                >
                  {b.icon}
                </div>
                <div style={{ fontSize: 13, color: "#ccc", whiteSpace: "pre-line" }}>{b.label}</div>
              </div>
            ))}
          </div>

          {/* Email login toggle */}
          <p
            onClick={() => setShowEmail(!showEmail)}
            style={{ textAlign: "center", color: GOLD, fontSize: 13, marginTop: 18, cursor: "pointer" }}
          >
            {showEmail ? "Hide" : "Sign in with email"}
          </p>

          {showEmail && (
            <div style={{ marginTop: 12 }}>
              <input
                type="email"
                placeholder="Email"
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
                  padding: "14px",
                  borderRadius: 12,
                  border: "none",
                  background: GOLD,
                  color: "#1a1a1a",
                  fontWeight: 700,
                  fontSize: 16,
                  cursor: "pointer",
                }}
              >
                Login
              </button>
            </div>
          )}

          {error && (
            <p style={{ color: "#ff6b6b", fontSize: 13, textAlign: "center", marginTop: 14 }}>{error}</p>
          )}

          {/* Terms */}
          <p style={{ textAlign: "center", color: "#999", fontSize: 13, marginTop: 18, lineHeight: 1.5 }}>
            By continuing, you agree to our
            <br />
            <a href="/terms" style={{ color: GOLD, textDecoration: "none" }}>Terms of Service</a> and{" "}
            <a href="/privacy" style={{ color: GOLD, textDecoration: "none" }}>Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
  fontSize: 15,
  marginBottom: 12,
  boxSizing: "border-box",
};
    
