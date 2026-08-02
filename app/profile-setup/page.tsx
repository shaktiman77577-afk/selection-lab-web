"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser, saveUser, User, linkPhone } from "@/lib/api";
import { sendOtp, verifyOtp, resetRecaptcha } from "@/lib/firebase";

const GOLD = "#FFAB00";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Phone OTP verification (sirf Google users ke liye — unka phone verified nahi hota)
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    setName(u.name || "");
    setPhone(u.phone || "");
    setEmail(u.email || "");
    // Phone se login kiya hai to number pehle se verified hai
    if (u.phone && !u.google_id) setPhoneVerified(true);
  }, [router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Kaunsa field maangna hai — jo user ke paas pehle se NAHI hai
  const needsPhone = !user?.phone;   // Google se aaya user
  const needsEmail = !user?.email;   // Phone+OTP se aaya user

  async function handleSendOtp() {
    setError("");
    const digits = phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(digits)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setOtpBusy(true);
    try {
      await sendOtp(digits);
      setOtpSent(true);
      setResendIn(30);
    } catch (e: any) {
      resetRecaptcha();
      setError(
        e?.code === "auth/too-many-requests"
          ? "Too many attempts. Please try again later."
          : e?.message || "Could not send OTP"
      );
    }
    setOtpBusy(false);
  }

  async function handleVerifyOtp() {
    setError("");
    if (otp.trim().length < 6) {
      setError("Please enter the 6-digit OTP");
      return;
    }
    if (!user?.id) return;
    setOtpBusy(true);
    try {
      const idToken = await verifyOtp(otp);
      const res = await linkPhone(user.id, idToken);
      if (!res.success) {
        setError(res.detail || "Could not verify number");
        setOtpBusy(false);
        return;
      }
      setPhoneVerified(true);
      if (res.user) {
        setUser(res.user);
        setPhone(res.user.phone || phone);
      }
    } catch (e: any) {
      setError(
        e?.code === "auth/invalid-verification-code"
          ? "Wrong OTP. Please check and try again."
          : e?.message || "Verification failed"
      );
    }
    setOtpBusy(false);
  }

  async function handleSubmit() {
    setError("");
    if (!name.trim()) return setError("Please enter your full name");
    if (needsPhone && !phoneVerified) return setError("Please verify your mobile number first");
    if (needsEmail && !/^\S+@\S+\.\S+$/.test(email.trim()))
      return setError("Please enter a valid email address");
    if (password || confirm) {
      if (password.length < 6) return setError("Password must be at least 6 characters");
      if (password !== confirm) return setError("Passwords do not match");
    }
    if (!user?.id) return setError("Session issue — please sign in again");

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/complete-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          name: name.trim(),
          // sirf wahi bhejo jo maanga gaya tha
          phone: needsPhone ? phone.trim() : null,
          email: needsEmail ? email.trim() : null,
          password: password || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not save profile");
      saveUser({ ...user, ...(data.user || {}), profile_completed: true });
      router.push("/");
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
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
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(13,11,8,0.7) 0%, rgba(13,11,8,0.55) 40%, rgba(13,11,8,0.92) 100%)",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 20,
          color: "#fff",
        }}
      >
        <img
          src="/logo.png"
          alt="Selection Lab"
          style={{ width: 96, height: 96, objectFit: "contain", marginBottom: 10 }}
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0, textAlign: "center" }}>
          Complete your <span style={{ color: GOLD }}>profile</span>
        </h1>
        <p style={{ color: "#cfc6b3", fontSize: 14, margin: "8px 0 22px", textAlign: "center" }}>
          One last step before you start learning
        </p>

        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "rgba(18,16,13,0.94)",
            border: `1px solid rgba(255,171,0,0.35)`,
            borderRadius: 20,
            padding: "24px 20px",
            backdropFilter: "blur(6px)",
          }}
        >
          {/* Jis se login kiya wo dikha do */}
          {(user?.email || user?.phone) && (
            <div
              style={{
                fontSize: 13,
                color: "#9a917f",
                background: "rgba(0,0,0,0.35)",
                borderRadius: 10,
                padding: "10px 12px",
                marginBottom: 14,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              Signed in as{" "}
              <span style={{ color: "#e0dacb" }}>{user?.email || user?.phone}</span>
            </div>
          )}

          <Label text="Full name" />
          <input
            style={inputStyle}
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          {/* ── Google user -> mobile number maango (OTP se verify) ── */}
          {needsPhone && (
            <>
              <Label text="Mobile number" />
              {phoneVerified ? (
                <div
                  style={{
                    ...inputStyle,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    color: "#5dd97c",
                    fontWeight: 700,
                  }}
                >
                  <span>+91 {phone.replace(/\D/g, "").slice(-10)}</span>
                  <span style={{ fontSize: 13 }}>✓ Verified</span>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 8 }}>
                    <input
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="10-digit mobile number"
                      inputMode="numeric"
                      maxLength={10}
                      value={phone}
                      disabled={otpSent}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    />
                    {!otpSent && (
                      <button
                        onClick={handleSendOtp}
                        disabled={otpBusy}
                        style={{
                          ...smallBtn,
                          opacity: otpBusy ? 0.6 : 1,
                        }}
                      >
                        {otpBusy ? "..." : "Send OTP"}
                      </button>
                    )}
                  </div>

                  {otpSent && (
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        style={{ ...inputStyle, flex: 1, letterSpacing: 5, textAlign: "center", fontWeight: 800 }}
                        placeholder="6-digit OTP"
                        inputMode="numeric"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      />
                      <button
                        onClick={handleVerifyOtp}
                        disabled={otpBusy}
                        style={{ ...smallBtn, opacity: otpBusy ? 0.6 : 1 }}
                      >
                        {otpBusy ? "..." : "Verify"}
                      </button>
                    </div>
                  )}

                  {otpSent && (
                    <button
                      onClick={() => {
                        resetRecaptcha();
                        setOtpSent(false);
                        setOtp("");
                      }}
                      disabled={resendIn > 0}
                      style={{
                        background: "none",
                        border: "none",
                        color: resendIn > 0 ? "#6b6558" : GOLD,
                        fontSize: 12.5,
                        cursor: resendIn > 0 ? "default" : "pointer",
                        marginBottom: 12,
                        padding: 0,
                      }}
                    >
                      {resendIn > 0 ? `Resend OTP in ${resendIn}s` : "Change number / Resend OTP"}
                    </button>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Phone user -> email maango ── */}
          {needsEmail && (
            <>
              <Label text="Email address" />
              <input
                type="email"
                style={inputStyle}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </>
          )}

          <Label text="Password (optional)" />
          <input
            type="password"
            style={inputStyle}
            placeholder="Minimum 6 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <Label text="Confirm password" />
          <input
            type="password"
            style={inputStyle}
            placeholder="Re-enter password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <p style={{ fontSize: 12, color: "#8d8371", margin: "2px 0 16px", lineHeight: 1.5 }}>
            Password set karoge to email + password se bhi sign in kar paoge.
          </p>

          {/* Firebase invisible reCAPTCHA */}
          <div id="recaptcha-container" />

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: "100%",
              padding: "15px",
              borderRadius: 12,
              border: "none",
              background: GOLD,
              color: "#1a1a1a",
              fontWeight: 800,
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : "Save & Continue"}
          </button>

          {error && (
            <p style={{ color: "#ff6b6b", fontSize: 13, textAlign: "center", marginTop: 14 }}>{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return <div style={{ fontSize: 12.5, color: "#9a917f", marginBottom: 6 }}>{text}</div>;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "13px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(0,0,0,0.4)",
  color: "#fff",
  fontSize: 15,
  marginBottom: 14,
  boxSizing: "border-box",
};

const smallBtn: React.CSSProperties = {
  background: GOLD,
  color: "#1a1a1a",
  border: "none",
  borderRadius: 12,
  padding: "0 16px",
  fontWeight: 800,
  fontSize: 14,
  cursor: "pointer",
  marginBottom: 14,
  whiteSpace: "nowrap",
};
