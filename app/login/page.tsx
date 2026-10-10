"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle, getGoogleRedirectResult, sendOtp, verifyOtp, resetRecaptcha } from "@/lib/firebase";
import { syncGoogleUser, saveUser, loginPhone, loginPassword, desktopExchange } from "@/lib/api";
import { desktopBridge } from "@/lib/desktop";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [desktopWaiting, setDesktopWaiting] = useState(false);
  // Oct 2026: login password se (har SMS ~₹5). OTP sirf naye account ke liye.
  const [showPhone, setShowPhone] = useState(false);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  function routeAfterAuth(user: any) {
    saveUser(user);
    if (user?.profile_completed === false) router.push("/profile-setup");
    else router.push("/");
  }

  // On mobile, Google login uses a full-page redirect. When the user comes
  // back to this page, pick up the result here and finish signing them in.
  useEffect(() => {
    (async () => {
      let g;
      try {
        g = await getGoogleRedirectResult();
      } catch (e: any) {
        setError(`Firebase redirect error: ${e?.code || e?.message || "unknown"}`);
        return;
      }
      if (!g) return; // normal load, or popup path (handled in handleGoogle)
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

  // Desktop app: Google login system browser me hota hai (lib/desktop.ts)
  async function handleDesktopGoogle() {
    const bridge = desktopBridge();
    if (!bridge) return;
    setError("");
    setStatus("Finish signing in with Google in your browser, then come back here.");
    setLoading(true);
    setDesktopWaiting(true);
    try {
      const { code, verifier } = await bridge.googleLogin();
      setDesktopWaiting(false);
      setStatus("Signing you in...");
      const res = await desktopExchange(code, verifier);
      if (!res.success || !res.user) {
        setStatus("");
        setError(res.detail || "Google sign-in failed");
        setLoading(false);
        return;
      }
      routeAfterAuth(res.user);
    } catch (e: any) {
      setDesktopWaiting(false);
      setStatus("");
      const msg = String(e?.message || "");
      // "Login cancelled" / "restarted" — bachche ne khud roka, error nahi dikhana
      if (!/cancelled|restarted/i.test(msg)) setError(msg.replace(/^Error invoking remote method '[^']+': (Error: )?/, "") || "Google sign-in failed");
      setLoading(false);
    }
  }

  function cancelDesktopGoogle() {
    desktopBridge()?.cancelGoogleLogin();
  }

  async function handleGoogle() {
    if (desktopBridge()) {
      await handleDesktopGoogle();
      return;
    }
    setError("");
    setStatus("");
    setLoading(true);
    try {
      const g = await signInWithGoogle();
      // Popup blocked → fell back to redirect (returns null); result handled on reload.
      // Popup cancelled by user → also null; just stop.
      if (!g) {
        setLoading(false);
        return;
      }
      setStatus(`Signing you in as ${g.email}...`);
      const res = await syncGoogleUser(g.googleId, g.email, g.name);
      if (!res.success || !res.user) {
        setStatus("");
        setError(res.detail || "Google sign-in failed");
        setLoading(false);
        return;
      }
      routeAfterAuth(res.user);
    } catch (e: any) {
      setStatus("");
      setError(e?.code === "auth/unauthorized-domain"
        ? "This domain isn't authorized in Firebase. Add selectionlab.in under Authentication → Settings → Authorized domains."
        : (e?.message || "Google sign-in was cancelled"));
      setLoading(false);
    }
  }

  // Resend timer — spam aur SMS cost dono rokta hai
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  async function handleSendOtp() {
    setError("");
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    try {
      await sendOtp(digits);
      setOtpSent(true);
      setResendIn(30);
      setStatus(`OTP sent to +91 ${digits}`);
    } catch (e: any) {
      resetRecaptcha();
      setError(e?.code === "auth/too-many-requests"
        ? "Too many attempts. Please try again after some time."
        : e?.message || "Could not send OTP. Please try again.");
    }
    setLoading(false);
  }

  async function handleVerifyOtp() {
    setError("");
    if (otp.trim().length < 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }
    setLoading(true);
    setStatus("Verifying OTP...");
    try {
      const idToken = await verifyOtp(otp);
      const res = await loginPhone(idToken);
      if (!res.success || !res.user) {
        setStatus("");
        setError(res.detail || "Login failed");
        setLoading(false);
        return;
      }
      routeAfterAuth(res.user);
    } catch (e: any) {
      setStatus("");
      setError(e?.code === "auth/invalid-verification-code"
        ? "Wrong OTP. Please check and try again."
        : e?.message || "Verification failed");
      setLoading(false);
    }
  }

  async function handlePasswordLogin() {
    setError("");
    setStatus("");
    if (!identifier.trim() || !password) {
      setError("Please enter your mobile number (or email) and password");
      return;
    }
    setLoading(true);
    const res = await loginPassword(identifier, password);
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

          {!showPhone ? (
            <>
              <input
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder="Mobile number or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                style={inputStyle}
              />
              <div style={{ position: "relative" }}>
                <input
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handlePasswordLogin(); }}
                  style={{ ...inputStyle, paddingRight: 64 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  style={{ position: "absolute", right: 8, top: 8, background: "none", border: "none", color: "#8a919d", fontSize: 12.5, fontWeight: 700, cursor: "pointer", padding: "6px 8px" }}
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
              <button
                onClick={handlePasswordLogin}
                disabled={loading}
                style={{ width: "100%", background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 12, padding: "14px 16px", fontSize: 15, fontWeight: 800, cursor: loading ? "default" : "pointer", opacity: loading ? 0.65 : 1, marginTop: 4 }}
              >
                {loading ? "Signing in..." : "Sign In"}
              </button>
              <div style={{ textAlign: "right", marginTop: 10 }}>
                <a href="/forgot-password" style={{ color: NAVY, fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  Forgot password?
                </a>
              </div>

              <div style={{ height: 1, background: "#eef0f3", margin: "16px 0" }} />
              <p style={{ margin: "0 0 10px", textAlign: "center", fontSize: 13, color: "#5c6472" }}>
                New to Selection Lab?
              </p>
              <button
                onClick={() => { setShowPhone(true); setError(""); setStatus(""); }}
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
                📱 Create account with mobile OTP
              </button>
            </>
          ) : (
            <div>
              {!otpSent ? (
                <>
                  <p style={{ margin: "0 0 12px", fontSize: 12.5, color: "#5c6472", lineHeight: 1.5 }}>
                    Already registered but never set a password? Use this once — you&apos;ll be asked to set a password, and next time you can sign in without OTP.
                  </p>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ ...inputStyle, width: 58, marginBottom: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#8a919d", fontWeight: 700 }}>+91</span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="10-digit mobile number"
                      value={phone}
                      maxLength={10}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      style={{ ...inputStyle, flex: 1 }}
                    />
                  </div>
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    style={{ width: "100%", background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 12, padding: "14px 16px", fontSize: 15, fontWeight: 800, cursor: loading ? "default" : "pointer", opacity: loading ? 0.65 : 1, marginTop: 4 }}
                  >
                    {loading ? "Sending..." : "Send OTP"}
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="Enter 6-digit OTP"
                    value={otp}
                    maxLength={6}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    style={{ ...inputStyle, letterSpacing: 6, textAlign: "center", fontSize: 18, fontWeight: 800 }}
                  />
                  <button
                    onClick={handleVerifyOtp}
                    disabled={loading}
                    style={{ width: "100%", background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 12, padding: "14px 16px", fontSize: 15, fontWeight: 800, cursor: loading ? "default" : "pointer", opacity: loading ? 0.65 : 1, marginTop: 4 }}
                  >
                    {loading ? "Verifying..." : "Verify & Continue"}
                  </button>
                  <button
                    onClick={() => { resetRecaptcha(); setOtpSent(false); setOtp(""); setStatus(""); }}
                    disabled={resendIn > 0}
                    style={{ width: "100%", background: "none", border: "none", color: resendIn > 0 ? "#c2c7d0" : NAVY, fontSize: 13, marginTop: 10, fontWeight: 700, cursor: resendIn > 0 ? "default" : "pointer" }}
                  >
                    {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Resend OTP"}
                  </button>
                </>
              )}
              <button
                onClick={() => { resetRecaptcha(); setShowPhone(false); setOtpSent(false); setOtp(""); setPhone(""); setError(""); setStatus(""); }}
                style={{ width: "100%", background: "none", border: "none", color: "#8a919d", fontSize: 13, marginTop: 12, cursor: "pointer" }}
              >
                ← Back to other options
              </button>
            </div>
          )}

          {/* Firebase invisible reCAPTCHA yahan mount hota hai */}
          <div id="recaptcha-container" />

          {status && (
            <div style={{ marginTop: 14, background: "#eef4ff", border: "1px solid #c3d5f5", color: "#1a2f55", borderRadius: 10, padding: "10px 12px", fontSize: 13, textAlign: "center" }}>
              {status}
              {desktopWaiting && (
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={cancelDesktopGoogle}
                    style={{ background: "none", border: "none", color: NAVY, fontSize: 13, fontWeight: 700, textDecoration: "underline", cursor: "pointer", padding: 0 }}
                  >
                    Cancel
                  </button>
                </div>
              )}
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
