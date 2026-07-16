"use client";

import { useState } from "react";
import { API_URL } from "@/lib/config";

const GOLD = "#FFAB00";
const NAVY = "#1A2F55";

export default function DeleteAccountPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setError("");
    if (phone.trim().length < 10) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }
    if (!confirmed) {
      setError("Please confirm that you understand this is permanent.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/users/delete-by-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setDone(true);
      } else {
        setError(data.detail || "Could not delete account. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg, #FFF8EC)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "var(--card, #fff)",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
        }}
      >
        {done ? (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✓</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>
              Account Deleted
            </h1>
            <p style={{ color: "#666", fontSize: 14, marginTop: 12, lineHeight: 1.6 }}>
              Your Selection Lab account and all associated data have been
              permanently deleted. We&apos;re sorry to see you go.
            </p>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: NAVY, margin: 0 }}>
              Delete Your Account
            </h1>
            <p style={{ color: "#666", fontSize: 13.5, marginTop: 10, lineHeight: 1.6 }}>
              This will permanently delete your Selection Lab account and all your
              data — including purchased courses, test attempts, and progress.
              <b> This action cannot be undone.</b>
            </p>

            <div
              style={{
                background: "#FFF3E0",
                border: "1px solid #FFD699",
                borderRadius: 10,
                padding: "10px 12px",
                fontSize: 12.5,
                color: "#8a6d1f",
                marginTop: 14,
                lineHeight: 1.5,
              }}
            >
              Enter the phone number and password you used to sign up. If you
              signed up with Google, set a password first from the app
              (Profile Setup), or delete your account directly in the app:
              Profile → Delete Account.
            </div>

            <div style={{ marginTop: 18 }}>
              <label style={labelStyle}>Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                maxLength={10}
                placeholder="10-digit phone number"
                style={inputStyle}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                style={inputStyle}
              />
            </div>

            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                marginTop: 16,
                fontSize: 13,
                color: "#444",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                style={{ marginTop: 3 }}
              />
              <span>
                I understand that deleting my account is permanent and cannot be
                undone.
              </span>
            </label>

            {error && (
              <div
                style={{
                  background: "#FDECEB",
                  border: "1px solid #F3C2BE",
                  color: "#C0392B",
                  borderRadius: 10,
                  padding: "10px 12px",
                  fontSize: 13,
                  marginTop: 14,
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleDelete}
              disabled={loading}
              style={{
                width: "100%",
                marginTop: 20,
                padding: "14px",
                borderRadius: 12,
                border: "none",
                background: loading ? "#e57373" : "#D32F2F",
                color: "#fff",
                fontSize: 15,
                fontWeight: 800,
                cursor: loading ? "default" : "pointer",
              }}
            >
              {loading ? "Deleting..." : "Delete My Account"}
            </button>

            <p style={{ color: "#999", fontSize: 11.5, marginTop: 14, textAlign: "center" }}>
              Selection Lab · selectionlab.in
            </p>
          </>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 12.5,
  fontWeight: 700,
  color: NAVY,
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #ccc",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};
              
