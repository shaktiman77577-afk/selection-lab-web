"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { loginEmail, signupEmail, saveUser, getUser } from "@/lib/api";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [dark, setDark] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);

  // redirect if already logged in
  useEffect(() => {
    if (getUser()) router.push("/home");
  }, [router]);

  async function handleSubmit() {
    setError(null);

    if (mode === "signup") {
      if (!name.trim()) return setError("Please enter your name");
      if (phone.trim().length !== 10) return setError("Enter a valid 10-digit mobile number");
      if (password.length < 6) return setError("Password must be at least 6 characters");
      if (password !== confirm) return setError("Passwords do not match");
    } else {
      if (!email.trim()) return setError("Please enter your email");
      if (!password) return setError("Please enter your password");
    }

    setLoading(true);
    const res =
      mode === "login"
        ? await loginEmail(email.trim(), password)
        : await signupEmail(name.trim(), email.trim(), phone.trim(), password);
    setLoading(false);

    if (res.success && res.user) {
      saveUser(res.user);
      router.push("/home");
    } else {
      setError(res.detail || "Something went wrong");
    }
  }

  const bg = dark ? "#0A0A0A" : "#F5F6FA";
  const cardBg = dark ? "#141414" : "#FFFFFF";
  const textColor = dark ? "#FFFFFF" : "#1A1A1A";
  const subText = dark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)";
  const border = dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const inputBg = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)";

  return (
    <div
      style={{ minHeight: "100vh", background: bg, transition: "background 0.3s" }}
      className="flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md">
        {/* Theme toggle */}
        <div className="flex justify-end mb-3">
          <button
            onClick={() => setDark(!dark)}
            style={{ background: cardBg, border: `1px solid ${border}`, color: textColor }}
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg"
          >
            {dark ? "☀️" : "🌙"}
          </button>
        </div>

        {/* Card */}
        <div
          style={{
            background: cardBg,
            border: `1px solid ${dark ? "rgba(255,171,0,0.2)" : border}`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          }}
          className="rounded-3xl p-8"
        >
          {/* Logo + title */}
          <div className="text-center mb-6">
            <div
              style={{ background: "linear-gradient(135deg, #FFAB00, #FF8E00)" }}
              className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl font-black text-white"
            >
              SL
            </div>
            <h1 className="text-2xl font-black" style={{ color: textColor }}>
              {mode === "login" ? "Welcome Back!" : "Create Account"}
            </h1>
            <p className="text-sm mt-1" style={{ color: subText }}>
              {mode === "login"
                ? "Sign in to continue learning"
                : "Join Selection Lab today"}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm text-center" style={{ background: "rgba(255,0,0,0.1)", color: "#E53935" }}>
              {error}
            </div>
          )}

          {/* Fields */}
          <div className="space-y-4">
            {mode === "signup" && (
              <Field label="Full Name" value={name} onChange={setName} placeholder="Enter your name"
                {...{ textColor, subText, inputBg, border }} />
            )}

            <Field label="Email" value={email} onChange={setEmail} placeholder="you@example.com" type="email"
              {...{ textColor, subText, inputBg, border }} />

            {mode === "signup" && (
              <Field label="Mobile Number" value={phone} onChange={(v) => setPhone(v.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit number" type="tel"
                {...{ textColor, subText, inputBg, border }} />
            )}

            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: subText }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                  style={{ background: inputBg, border: `1px solid ${border}`, color: textColor }}
                  className="w-full px-4 py-3 rounded-xl outline-none focus:border-[#FFAB00] transition"
                />
                <button
                  onClick={() => setShowPass(!showPass)}
                  style={{ color: subText }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm"
                >
                  {showPass ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {mode === "signup" && (
              <Field label="Confirm Password" value={confirm} onChange={setConfirm} placeholder="Re-enter password" type={showPass ? "text" : "password"}
                {...{ textColor, subText, inputBg, border }} />
            )}
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ background: "linear-gradient(135deg, #FFAB00, #FF8E00)", color: "#000" }}
            className="w-full mt-6 py-3.5 rounded-xl font-black text-base disabled:opacity-60 transition"
          >
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          {/* Switch mode */}
          <div className="text-center mt-5 text-sm" style={{ color: subText }}>
            {mode === "login" ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
              style={{ color: "#FFAB00" }}
              className="font-bold"
            >
              {mode === "login" ? "Sign Up" : "Sign In"}
            </button>
          </div>
        </div>

        <p className="text-center mt-6 text-xs" style={{ color: subText }}>
          Selection Lab — Made with care for aspirants
        </p>
      </div>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
  textColor, subText, inputBg, border,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; type?: string;
  textColor: string; subText: string; inputBg: string; border: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-2" style={{ color: subText }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ background: inputBg, border: `1px solid ${border}`, color: textColor }}
        className="w-full px-4 py-3 rounded-xl outline-none focus:border-[#FFAB00] transition"
      />
    </div>
  );
}
