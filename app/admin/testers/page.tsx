"use client";

// /admin/testers — Android closed testing requests (website /download page se).
// Login wahi jo /admin ka (sl_admin_token). Backend par "users" right chahiye.
// Dekho ClosedTestersAdmin.tsx

import { useEffect, useState } from "react";
import { API_URL } from "@/lib/config";
import ClosedTestersAdmin from "../ClosedTestersAdmin";

const TOKEN_KEY = "sl_admin_token";

function errText(detail: any): string {
  if (!detail) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.slice(0, 3).map((d: any) => d?.msg || JSON.stringify(d)).join(" · ");
  return JSON.stringify(detail);
}

async function api(path: string, method = "GET", body?: any) {
  let token = "";
  try { token = localStorage.getItem(TOKEN_KEY) || ""; } catch { /* */ }
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) throw new Error("Admin login khatam ho gaya — /admin par dobara login kijiye");
  if (!res.ok) throw new Error(errText(data.detail) || `Request failed (${res.status})`);
  return data;
}

export default function ClosedTestersAdminPage() {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  useEffect(() => {
    try { setHasToken(!!localStorage.getItem(TOKEN_KEY)); } catch { setHasToken(false); }
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "#0d0b08", color: "#fff", fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "14px 14px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <a href="/admin" style={{ color: "#FFAB00", textDecoration: "none", fontWeight: 700, fontSize: 13 }}>← Admin</a>
          <div style={{ flex: 1, fontWeight: 800, fontSize: 18 }}>📲 Closed Testers</div>
          <a href="/download" target="_blank" rel="noreferrer" style={{ color: "#FFAB00", fontSize: 12.5, fontWeight: 700, textDecoration: "none" }}>Student page ↗</a>
        </div>
        {hasToken === false && (
          <div style={{ background: "#16130e", border: "1px solid rgba(255,171,0,0.25)", borderRadius: 14, padding: 16 }}>
            Pehle <a href="/admin" style={{ color: "#FFAB00", fontWeight: 800 }}>/admin</a> par login kijiye, phir ye page dobara kholiye.
          </div>
        )}
        {hasToken && <ClosedTestersAdmin api={api} />}
      </div>
    </div>
  );
}
