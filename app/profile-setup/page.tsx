"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import { getUser, saveUser, User } from "@/lib/api";

const GOLD = "#FFAB00";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace("/login");
      return;
    }
    setUser(u);
    setName(u.name || "");
    setPhone(u.phone || "");
  }, [router]);

  async function handleSubmit() {
    setError("");
    if (!name.trim()) return setError("Please enter your full name");
    if (!/^[6-9]\d{9}$/.test(phone.trim()))
      return setError("Please enter a valid 10-digit mobile number");
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords do not match");
    if (!user?.google_id || !user?.email) {
      return setError("Session issue — please sign in again");
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/setup-profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          google_id: user.google_id,
          email: user.email,
          name: name.trim(),
          phone: phone.trim(),
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Could not save profile");
      const updated: User = {
        ...user,
        ...(data.user || {}),
        name: name.trim(),
        phone: phone.trim(),
        profile_completed: true,
      };
      saveUser(updated);
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
          {user?.email && (
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
              Signed in as <span style={{ color: "#e0dacb" }}>{user.email}</span>
            </div>
          )}

          <Label text="Full name" />
          <input
            style={inputStyle}
            placeholder="Your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <Label text="Mobile number" />
          <input
            style={inputStyle}
            placeholder="10-digit mobile number"
            inputMode="numeric"
            maxLength={10}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          />

          <Label text="Password" />
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
            You can later sign in with this email and password on any device.
          </p>

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
          
