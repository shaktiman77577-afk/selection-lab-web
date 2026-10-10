"use client";

/**
 * Profile setup (Oct 2026 — OTP bachat)
 *
 *  - Google se aaya bachcha: mobile number bas type karta hai, OTP NAHI.
 *    Number kisi doosre account par mila to "dono accounts ek karein?" —
 *    tab hi us number par SMS OTP jaata hai (saboot ke liye).
 *  - Phone se aaya bachcha: email maangte hain. Wo email doosre account ka
 *    nikla to us email par code (Resend) aur merge.
 *  - Password: phone wale ke liye zaroori (login ab password se hai),
 *    Google wale ke liye optional.
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import {
  getUser,
  saveUser,
  getToken,
  User,
  getAccountStatus,
  setPassword as apiSetPassword,
  accountCheck,
  mergeStart,
  mergeConfirm,
  AccountStatus,
} from "@/lib/api";
import { sendOtp, verifyOtp, resetRecaptcha } from "@/lib/firebase";

const GOLD = "#FFAB00";

type Merge = {
  via: "phone" | "email";
  value: string;               // 10-digit number ya email
  otherName: string;
  contact: string;
  step: "ask" | "code";
};

export default function ProfileSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const [merge, setMerge] = useState<Merge | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    setName(u.name && !/^user \d+$/i.test(u.name) ? u.name : "");
    setPhone((u.phone || "").replace(/\D/g, "").slice(-10));
    setEmail(u.email || "");
    getAccountStatus().then((r) => {
      if (r.ok) setStatus(r.data);
    });
  }, [router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  const needsPhone = !user?.phone;     // Google se aaya
  const needsEmail = !user?.email;     // Phone OTP se aaya
  const hasPassword = !!status?.has_password;
  const passwordRequired = !user?.google_id && !hasPassword;

  function validate(): string {
    if (!name.trim()) return "Please enter your full name";
    if (needsPhone && !/^[6-9]\d{9}$/.test(phone.replace(/\D/g, "").slice(-10)))
      return "Please enter a valid 10-digit mobile number";
    if (needsEmail && !/^\S+@\S+\.\S+$/.test(email.trim())) return "Please enter a valid email address";
    if (passwordRequired && !password) return "Please set a password — you will use it to sign in";
    if (password || confirm) {
      if (password.length < 6) return "Password must be at least 6 characters";
      if (password !== confirm) return "Passwords do not match";
    }
    return "";
  }

  async function completeProfile(u: User, digits: string, em: string) {
    // Password naye (bcrypt) raste se. Token na ho (bahut purana session)
    // tabhi purane complete-profile ke saath.
    let passwordInBody: string | null = null;
    if (password) {
      if (getToken()) {
        const r = await apiSetPassword(password);
        if (!r.ok) throw new Error(r.data.detail || "Could not save password");
      } else {
        passwordInBody = password;
      }
    }
    const res = await fetch(`${API_URL}/users/complete-profile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: u.id,
        name: name.trim(),
        phone: !u.phone ? digits : null,
        email: !u.email ? em : null,
        password: passwordInBody,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || "Could not save profile");
    saveUser({ ...u, ...(data.user || {}), profile_completed: true });
    router.push("/");
  }

  async function handleSubmit() {
    setError("");
    setInfo("");
    const v = validate();
    if (v) return setError(v);
    if (!user?.id) return setError("Session issue — please sign in again");

    const digits = phone.replace(/\D/g, "").slice(-10);
    const em = email.trim().toLowerCase();
    setLoading(true);
    try {
      // Number / email kisi aur account par to nahi?
      const check = needsPhone ? await accountCheck({ phone: digits }) : needsEmail ? await accountCheck({ email: em }) : null;
      if (check) {
        if (!check.ok && check.status !== 401 && check.status !== 403) {
          setError(check.data.detail || "Could not check the number. Please try again.");
          setLoading(false);
          return;
        }
        if (check.ok && check.data.status === "other") {
          if (check.data.other?.banned) {
            setError("This is linked to a suspended account. Please contact support.");
            setLoading(false);
            return;
          }
          setMerge({
            via: needsPhone ? "phone" : "email",
            value: needsPhone ? digits : em,
            otherName: check.data.other?.name || "another account",
            contact: check.data.other?.contact || "",
            step: "ask",
          });
          setLoading(false);
          return;
        }
      }
      await completeProfile(user, digits, em);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  // ── Merge ──
  async function startMerge() {
    if (!merge) return;
    setError("");
    setBusy(true);
    try {
      if (merge.via === "phone") {
        await sendOtp(merge.value);
      } else {
        const r = await mergeStart({ email: merge.value });
        if (!r.ok) throw new Error(r.data.detail || "Could not send the code");
      }
      setMerge({ ...merge, step: "code" });
      setResendIn(30);
    } catch (e: any) {
      resetRecaptcha();
      setError(e?.code === "auth/too-many-requests" ? "Too many attempts. Please try again later." : e?.message || "Could not send the code");
    }
    setBusy(false);
  }

  async function confirmMerge() {
    if (!merge) return;
    setError("");
    if (code.trim().length < 6) return setError("Please enter the 6-digit code");
    setBusy(true);
    try {
      const res =
        merge.via === "phone"
          ? await mergeConfirm({ phone: merge.value, id_token: await verifyOtp(code) })
          : await mergeConfirm({ email: merge.value, code: code.trim() });
      if (!res.success || !res.user) throw new Error(res.detail || "Could not merge the accounts");
      const kept = res.user;
      setUser(kept);
      setMerge(null);
      setCode("");
      setInfo("Accounts merged ✓ Everything from both accounts is now in one place.");
      setLoading(true);
      await completeProfile(kept, phone.replace(/\D/g, "").slice(-10), email.trim().toLowerCase());
    } catch (e: any) {
      setError(
        e?.code === "auth/invalid-verification-code"
          ? "Wrong OTP. Please check and try again."
          : e?.message || "Could not merge the accounts"
      );
      setLoading(false);
    }
    setBusy(false);
  }

  async function skipMerge() {
    // Number/email doosre account par hai, isliye abhi save nahi ho sakta.
    // Password phir bhi save kar dete hain; merge baad me popup se.
    setError("");
    setBusy(true);
    if (password && !validate() && getToken()) await apiSetPassword(password);
    setBusy(false);
    resetRecaptcha();
    setMerge(null);
    router.push("/");
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
          {merge ? (
            <>Merge your <span style={{ color: GOLD }}>accounts</span></>
          ) : (
            <>Complete your <span style={{ color: GOLD }}>profile</span></>
          )}
        </h1>
        <p style={{ color: "#cfc6b3", fontSize: 14, margin: "8px 0 22px", textAlign: "center" }}>
          {merge ? "Keep everything in one account" : "One last step before you start learning"}
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
          {merge ? (
            <>
              <p style={{ margin: "0 0 12px", fontSize: 14.5, lineHeight: 1.6, color: "#e0dacb" }}>
                This {merge.via === "phone" ? "mobile number" : "email"} is already linked to your other
                Selection Lab account <b style={{ color: "#fff" }}>({merge.otherName})</b>.
              </p>
              <p style={{ margin: "0 0 18px", fontSize: 13.5, lineHeight: 1.6, color: "#9a917f" }}>
                Merge both into one account — your courses, purchases, test results and progress from both will be kept together.
              </p>

              {merge.step === "ask" ? (
                <>
                  <button onClick={startMerge} disabled={busy} style={{ ...bigBtn, opacity: busy ? 0.6 : 1 }}>
                    {busy ? "Sending..." : merge.via === "phone" ? `Send OTP to ${merge.contact || "this number"}` : `Send code to ${merge.contact || "this email"}`}
                  </button>
                  <button onClick={skipMerge} disabled={busy} style={linkBtn}>
                    Not now
                  </button>
                </>
              ) : (
                <>
                  <Label text={merge.via === "phone" ? `OTP sent to ${merge.contact}` : `Code sent to ${merge.contact}`} />
                  <input
                    style={{ ...inputStyle, letterSpacing: 6, textAlign: "center", fontWeight: 800, fontSize: 18 }}
                    placeholder="6-digit code"
                    inputMode="numeric"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  />
                  <button onClick={confirmMerge} disabled={busy} style={{ ...bigBtn, opacity: busy ? 0.6 : 1 }}>
                    {busy ? "Merging..." : "Verify & merge"}
                  </button>
                  <button
                    onClick={() => { resetRecaptcha(); setCode(""); setMerge({ ...merge, step: "ask" }); }}
                    disabled={resendIn > 0 || busy}
                    style={{ ...linkBtn, color: resendIn > 0 ? "#6b6558" : GOLD }}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend code"}
                  </button>
                  <button onClick={skipMerge} disabled={busy} style={linkBtn}>
                    Not now
                  </button>
                </>
              )}
            </>
          ) : (
            <>
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
                  Signed in as <span style={{ color: "#e0dacb" }}>{user?.email || user?.phone}</span>
                </div>
              )}

              <Label text="Full name" />
              <input style={inputStyle} placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />

              {needsPhone && (
                <>
                  <Label text="Mobile number" />
                  <input
                    style={inputStyle}
                    placeholder="10-digit mobile number"
                    inputMode="numeric"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  />
                </>
              )}

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

              {hasPassword ? (
                <p style={{ fontSize: 12.5, color: "#8d8371", margin: "0 0 16px" }}>✓ Password already set</p>
              ) : (
                <>
                  <Label text={passwordRequired ? "Set a password" : "Password (optional)"} />
                  <input
                    type="password"
                    autoComplete="new-password"
                    style={inputStyle}
                    placeholder="Minimum 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <Label text="Confirm password" />
                  <input
                    type="password"
                    autoComplete="new-password"
                    style={inputStyle}
                    placeholder="Re-enter password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                  />
                  <p style={{ fontSize: 12, color: "#8d8371", margin: "2px 0 16px", lineHeight: 1.5 }}>
                    {passwordRequired
                      ? "Next time, sign in with your mobile number and this password — no OTP needed."
                      : "With a password you can also sign in using your mobile number or email."}
                  </p>
                </>
              )}

              <button onClick={handleSubmit} disabled={loading} style={{ ...bigBtn, opacity: loading ? 0.6 : 1 }}>
                {loading ? "Saving..." : "Save & Continue"}
              </button>
            </>
          )}

          {/* Firebase invisible reCAPTCHA (merge OTP) */}
          <div id="recaptcha-container" />

          {info && <p style={{ color: "#5dd97c", fontSize: 13, textAlign: "center", marginTop: 14 }}>{info}</p>}
          {error && <p style={{ color: "#ff6b6b", fontSize: 13, textAlign: "center", marginTop: 14 }}>{error}</p>}
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

const bigBtn: React.CSSProperties = {
  width: "100%",
  padding: "15px",
  borderRadius: 12,
  border: "none",
  background: GOLD,
  color: "#1a1a1a",
  fontWeight: 800,
  fontSize: 16,
  cursor: "pointer",
};

const linkBtn: React.CSSProperties = {
  width: "100%",
  background: "none",
  border: "none",
  color: "#9a917f",
  fontSize: 13.5,
  marginTop: 12,
  cursor: "pointer",
  padding: 6,
};
