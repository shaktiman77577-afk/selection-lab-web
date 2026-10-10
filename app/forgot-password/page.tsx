"use client";

/**
 * Forgot password (Oct 2026)
 * Pehle EMAIL par code (Resend — free). SMS (Firebase, ~₹5) sirf tab jab
 * account me email na ho ya bachcha khud "SMS bhejo" chune.
 * Naya password set hote hi login ho jaata hai.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { forgotStart, forgotReset, saveUser } from "@/lib/api";
import { sendOtp, verifyOtp, resetRecaptcha } from "@/lib/firebase";

const GOLD = "#FFAB00";
const NAVY = "#1a2f55";

type Sent = { method: "email" | "sms"; sentTo: string; smsAvailable: boolean; emailAvailable: boolean };

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  async function send(via?: "email" | "sms") {
    setError("");
    if (!identifier.trim()) return setError("Please enter your mobile number or email");
    setLoading(true);
    try {
      const r = await forgotStart(identifier, via);
      if (!r.ok) throw new Error(r.data.detail || "Could not send the code");
      if (r.data.method === "sms") {
        resetRecaptcha();
        await sendOtp(r.data.phone || identifier);
      }
      setSent({
        method: r.data.method,
        sentTo: r.data.sent_to,
        smsAvailable: !!r.data.sms_available,
        emailAvailable: !!r.data.email_available,
      });
      setCode("");
      setResendIn(30);
    } catch (e: any) {
      resetRecaptcha();
      setError(e?.code === "auth/too-many-requests" ? "Too many attempts. Please try again later." : e?.message || "Could not send the code");
    }
    setLoading(false);
  }

  async function reset() {
    setError("");
    if (!sent) return;
    if (code.trim().length < 6) return setError("Please enter the 6-digit code");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords do not match");
    setLoading(true);
    try {
      const res =
        sent.method === "sms"
          ? await forgotReset({ identifier, new_password: password, id_token: await verifyOtp(code) })
          : await forgotReset({ identifier, new_password: password, code: code.trim() });
      if (!res.success || !res.user) throw new Error(res.detail || "Could not reset the password");
      saveUser(res.user);
      router.push(res.user.profile_completed === false ? "/profile-setup" : "/");
    } catch (e: any) {
      setError(e?.code === "auth/invalid-verification-code" ? "Wrong OTP. Please check and try again." : e?.message || "Could not reset the password");
      setLoading(false);
    }
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
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img src="/logo.png" alt="Selection Lab" style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 16 }} />
          <h1 style={{ margin: "14px 0 4px", fontSize: 24, fontWeight: 800, color: NAVY }}>Reset your password</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#5c6472" }}>
            {sent ? "Enter the code and choose a new password" : "We will send you a verification code"}
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: 20, padding: "22px 20px", boxShadow: "0 10px 34px rgba(26,47,85,0.12)", border: "1px solid rgba(0,0,0,0.05)" }}>
          {!sent ? (
            <>
              <input
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder="Mobile number or email"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                style={inputStyle}
              />
              <button onClick={() => send()} disabled={loading} style={{ ...goldBtn, opacity: loading ? 0.65 : 1 }}>
                {loading ? "Sending..." : "Send code"}
              </button>
            </>
          ) : (
            <>
              <div style={{ background: "#eef4ff", border: "1px solid #c3d5f5", color: NAVY, borderRadius: 10, padding: "10px 12px", fontSize: 13, marginBottom: 14 }}>
                {sent.method === "email" ? "📧 Code sent to " : "📱 OTP sent to "}
                <b>{sent.sentTo}</b>
                {sent.method === "email" && <span style={{ color: "#5c6472" }}> — check Spam too</span>}
              </div>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="6-digit code"
                value={code}
                maxLength={6}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                style={{ ...inputStyle, letterSpacing: 6, textAlign: "center", fontSize: 18, fontWeight: 800 }}
              />
              <input type="password" autoComplete="new-password" placeholder="New password (min 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} />
              <input type="password" autoComplete="new-password" placeholder="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} style={inputStyle} />
              <button onClick={reset} disabled={loading} style={{ ...goldBtn, opacity: loading ? 0.65 : 1 }}>
                {loading ? "Saving..." : "Save password & sign in"}
              </button>

              <button onClick={() => send(sent.method)} disabled={resendIn > 0 || loading} style={{ ...linkBtn, color: resendIn > 0 ? "#c2c7d0" : NAVY }}>
                {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
              </button>
              {sent.method === "email" && sent.smsAvailable && (
                <button onClick={() => send("sms")} disabled={loading} style={linkBtn}>
                  Didn&apos;t get the email? Send OTP by SMS
                </button>
              )}
              {sent.method === "sms" && sent.emailAvailable && (
                <button onClick={() => send("email")} disabled={loading} style={linkBtn}>
                  Send the code to my email instead
                </button>
              )}
            </>
          )}

          <div id="recaptcha-container" />

          {error && (
            <div style={{ marginTop: 14, background: "#fdeceb", border: "1px solid #f3c2be", color: "#c0392b", borderRadius: 10, padding: "10px 12px", fontSize: 13, textAlign: "center" }}>
              {error}
            </div>
          )}

          <a href="/login" style={{ display: "block", textAlign: "center", color: "#8a919d", fontSize: 13, marginTop: 16, textDecoration: "none" }}>
            ← Back to sign in
          </a>
        </div>
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

const goldBtn: React.CSSProperties = {
  width: "100%",
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 12,
  padding: "14px 16px",
  fontSize: 15,
  fontWeight: 800,
  cursor: "pointer",
  marginTop: 4,
};

const linkBtn: React.CSSProperties = {
  width: "100%",
  background: "none",
  border: "none",
  color: NAVY,
  fontSize: 13,
  marginTop: 10,
  fontWeight: 700,
  cursor: "pointer",
};
