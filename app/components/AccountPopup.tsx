"use client";

/**
 * AccountPopup.tsx — logged-in bachchon ke liye ek baar ka "account update"
 * (Oct 2026, OTP bachat). Layout me ek baar: <AccountPopup />.
 *
 *  1. Sliding session: din me ek baar /users/refresh-token — naya token.
 *     Roz aane wala bachcha kabhi logout nahi hota (dobara login/OTP nahi).
 *     Account merge ho chuka ho to logout karke login par bhejte hain.
 *  2. Session me ek baar /users/account-status, phir sirf EK cheez poochte hain:
 *       - profile adhoora      -> "Complete profile" (baad me bhi chalega)
 *       - phone wala, password nahi -> password set karna ZAROORI
 *         (login ab password se hoga; logged-in hai isliye OTP nahi lagta)
 *       - email nahi           -> email jodo; wo doosre account ka nikla to
 *                                 us email par code aur dono accounts ek
 *       - phone nahi           -> number jodo; doosre account ka nikla to SMS
 *                                 OTP aur merge
 *  Test ke beech, admin, login, profile setup par nahi khulta.
 */

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { API_URL } from "@/lib/config";
import {
  getUser,
  getToken,
  saveUser,
  logout,
  refreshSession,
  getAccountStatus,
  setPassword as apiSetPassword,
  accountCheck,
  mergeStart,
  mergeConfirm,
  AccountStatus,
  User,
} from "@/lib/api";
import { sendOtp, verifyOtp, resetRecaptcha } from "@/lib/firebase";

const GOLD = "#FFAB00";

const BLOCKED: RegExp[] = [
  /^\/admin/, /^\/login/, /^\/profile-setup/, /^\/forgot-password/, /^\/delete-account/, /^\/verify/, /^\/partner/,
  /^\/mock-test\/[^/]+\/?$/,
  /^\/descriptive-test\//, /^\/excel-test\//, /^\/worksheet-test\//, /^\/excel-practice\//,
  /^\/typing-drill/, /^\/office-practice\/.+/, /^\/learn\//, /^\/tier2\/excel/,
  /^\/nbems-mock\/\d+/, /^\/typing-test\//,
];

type Kind = "profile" | "password" | "email" | "phone";

const REFRESH_KEY = "sl_session_refreshed_at";
const SNOOZE_DAYS: Record<Kind, number> = { profile: 1, password: 0, email: 3, phone: 3 };

function ls(k: string): string | null {
  try { return localStorage.getItem(k); } catch { return null; }
}
function lsSet(k: string, v: string) {
  try { localStorage.setItem(k, v); } catch {}
}
function ss(k: string): string | null {
  try { return sessionStorage.getItem(k); } catch { return null; }
}
function ssSet(k: string, v: string) {
  try { sessionStorage.setItem(k, v); } catch {}
}

function pick(s: AccountStatus, uid: number): Kind | null {
  const snoozed = (k: Kind) => Number(ls(`sl_acct_snooze_${k}_${uid}`) || 0) > Date.now();
  if (!s.profile_completed) return snoozed("profile") ? null : "profile";
  if (s.needs_password) return "password";
  if (!s.has_email && !snoozed("email")) return "email";
  if (!s.has_phone && !snoozed("phone")) return "phone";
  return null;
}

export default function AccountPopup() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [kind, setKind] = useState<Kind | null>(null);
  const started = useRef(false);

  // Form state
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [value, setValue] = useState("");
  const [merge, setMerge] = useState<{ via: "phone" | "email"; value: string; name: string; contact: string; step: "ask" | "code" } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [canSkip, setCanSkip] = useState(false);
  const [done, setDone] = useState("");

  const blocked = BLOCKED.some((r) => r.test(pathname));

  useEffect(() => {
    if (started.current || blocked) return;
    const user = getUser();
    if (!user?.id || !getToken()) return;
    started.current = true;

    (async () => {
      // 1) Sliding session — din me ek baar
      const last = Number(ls(REFRESH_KEY) || 0);
      if (Date.now() - last > 20 * 60 * 60 * 1000) {
        const r = await refreshSession();
        if (r === "merged") {
          logout();
          router.push("/login");
          return;
        }
        if (r === "ok") lsSet(REFRESH_KEY, String(Date.now()));
      }

      // 2) Account update — session me ek baar
      if (ss("sl_acct_checked")) return;
      const st = await getAccountStatus();
      if (!st.ok) return;
      ssSet("sl_acct_checked", "1");
      const k = pick(st.data, user.id);
      if (k) setTimeout(() => setKind(k), 1500);
    })();
  }, [blocked, router]);

  // Test page par pahunch gaye — band (password wala bhi; agle page par phir)
  useEffect(() => {
    if (kind && blocked) {
      setKind(null);
      started.current = false;
      try { sessionStorage.removeItem("sl_acct_checked"); } catch {}
    }
  }, [blocked, kind]);

  function snooze(k: Kind) {
    const u = getUser();
    if (u?.id && SNOOZE_DAYS[k] > 0) {
      lsSet(`sl_acct_snooze_${k}_${u.id}`, String(Date.now() + SNOOZE_DAYS[k] * 86400000));
    }
    resetRecaptcha();
    setKind(null);
    setMerge(null);
    setError("");
  }

  function finish(msg: string) {
    setDone(msg);
    setTimeout(() => {
      setDone("");
      setKind(null);
      setMerge(null);
    }, 1800);
  }

  async function savePassword() {
    setError("");
    if (pw.length < 6) return setError("Password must be at least 6 characters");
    if (pw !== pw2) return setError("Passwords do not match");
    setBusy(true);
    const r = await apiSetPassword(pw);
    setBusy(false);
    if (!r.ok) {
      setError(r.data.detail || "Could not save the password");
      if (r.status === 0 || r.status >= 500) setCanSkip(true);   // server ki gadbad me bachcha atke nahi
      return;
    }
    finish("Password saved ✓ Next time sign in with your mobile number and password.");
  }

  async function saveContact() {
    setError("");
    const u = getUser();
    if (!u?.id) return;
    const isPhone = kind === "phone";
    const v = isPhone ? value.replace(/\D/g, "").slice(-10) : value.trim().toLowerCase();
    if (isPhone && !/^[6-9]\d{9}$/.test(v)) return setError("Please enter a valid 10-digit mobile number");
    if (!isPhone && !/^\S+@\S+\.\S+$/.test(v)) return setError("Please enter a valid email address");
    setBusy(true);
    try {
      const c = await accountCheck(isPhone ? { phone: v } : { email: v });
      if (!c.ok) throw new Error(c.data.detail || "Please try again");
      if (c.data.status === "other") {
        if (c.data.other?.banned) throw new Error("This is linked to a suspended account. Please contact support.");
        setMerge({ via: isPhone ? "phone" : "email", value: v, name: c.data.other?.name || "", contact: c.data.other?.contact || "", step: "ask" });
        setBusy(false);
        return;
      }
      if (c.data.status === "free") {
        const res = await fetch(`${API_URL}/users/complete-profile`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: u.id, name: u.name || "Student", phone: isPhone ? v : null, email: isPhone ? null : v }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.detail || "Could not save");
        saveUser({ ...u, ...(data.user || {}) });
      }
      finish(isPhone ? "Mobile number saved ✓" : "Email saved ✓");
    } catch (e: any) {
      setError(e?.message || "Something went wrong");
    }
    setBusy(false);
  }

  async function startMerge() {
    if (!merge) return;
    setError("");
    setBusy(true);
    try {
      if (merge.via === "phone") await sendOtp(merge.value);
      else {
        const r = await mergeStart({ email: merge.value });
        if (!r.ok) throw new Error(r.data.detail || "Could not send the code");
      }
      setMerge({ ...merge, step: "code" });
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
      setBusy(false);
      setDone("Accounts merged ✓ Everything is now in one account.");
      setTimeout(() => window.location.reload(), 1600);   // naye account ke saath page dobara
      return;
    } catch (e: any) {
      setError(e?.code === "auth/invalid-verification-code" ? "Wrong OTP. Please check and try again." : e?.message || "Could not merge the accounts");
    }
    setBusy(false);
  }

  if (!kind || blocked) return null;

  const u: User | null = getUser();
  const title =
    merge ? "Merge your accounts"
    : kind === "password" ? "Set your password"
    : kind === "profile" ? "Complete your profile"
    : kind === "email" ? "Add your email"
    : "Add your mobile number";

  return (
    <div role="dialog" aria-modal="true" aria-label={title} style={overlay}>
      <div style={card}>
        <h2 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800, color: "var(--text)" }}>{title}</h2>

        {done ? (
          <p style={{ margin: "8px 0 4px", color: "#2e9e57", fontWeight: 700, fontSize: 14.5, lineHeight: 1.5 }}>{done}</p>
        ) : merge ? (
          <>
            <p style={p}>
              This {merge.via === "phone" ? "mobile number" : "email"} is linked to your other Selection Lab account
              {merge.name ? <b> ({merge.name})</b> : null}. Merge both into one — courses, purchases and test results from both stay together.
            </p>
            {merge.step === "ask" ? (
              <button onClick={startMerge} disabled={busy} style={{ ...goldBtn, opacity: busy ? 0.6 : 1 }}>
                {busy ? "Sending..." : `Send ${merge.via === "phone" ? "OTP" : "code"} to ${merge.contact || "verify"}`}
              </button>
            ) : (
              <>
                <input
                  style={{ ...input, letterSpacing: 6, textAlign: "center", fontWeight: 800, fontSize: 18 }}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                />
                <button onClick={confirmMerge} disabled={busy} style={{ ...goldBtn, opacity: busy ? 0.6 : 1 }}>
                  {busy ? "Merging..." : "Verify & merge"}
                </button>
              </>
            )}
            <button onClick={() => snooze(kind)} disabled={busy} style={laterBtn}>Not now</button>
          </>
        ) : kind === "password" ? (
          <>
            <p style={p}>
              We&apos;re moving to password sign-in. Set a password once — next time sign in with your mobile number
              {u?.phone ? <b> ({u.phone.replace(/\D/g, "").slice(-10)})</b> : null} and this password, no OTP needed.
            </p>
            <input type="password" autoComplete="new-password" style={input} placeholder="New password (min 6 characters)" value={pw} onChange={(e) => setPw(e.target.value)} />
            <input type="password" autoComplete="new-password" style={input} placeholder="Confirm password" value={pw2} onChange={(e) => setPw2(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") savePassword(); }} />
            <button onClick={savePassword} disabled={busy} style={{ ...goldBtn, opacity: busy ? 0.6 : 1 }}>
              {busy ? "Saving..." : "Save password"}
            </button>
            {canSkip && <button onClick={() => snooze(kind)} style={laterBtn}>Skip for now</button>}
          </>
        ) : kind === "profile" ? (
          <>
            <p style={p}>Your profile is incomplete. It takes a minute — and if you have another Selection Lab account, you can merge them there.</p>
            <button onClick={() => { setKind(null); router.push("/profile-setup"); }} style={goldBtn}>Complete now</button>
            <button onClick={() => snooze(kind)} style={laterBtn}>Later</button>
          </>
        ) : (
          <>
            <p style={p}>
              {kind === "email"
                ? "Add your email so you can reset your password for free anytime, and get purchase receipts."
                : "Add your mobile number so you can sign in with it."}
            </p>
            <input
              style={input}
              type={kind === "email" ? "email" : "tel"}
              inputMode={kind === "email" ? "email" : "numeric"}
              placeholder={kind === "email" ? "you@example.com" : "10-digit mobile number"}
              value={value}
              maxLength={kind === "phone" ? 10 : undefined}
              onChange={(e) => setValue(kind === "phone" ? e.target.value.replace(/\D/g, "").slice(0, 10) : e.target.value)}
            />
            <button onClick={saveContact} disabled={busy} style={{ ...goldBtn, opacity: busy ? 0.6 : 1 }}>
              {busy ? "Saving..." : "Save"}
            </button>
            <button onClick={() => snooze(kind)} style={laterBtn}>Later</button>
          </>
        )}

        <div id="recaptcha-container" />
        {error && <p style={{ color: "#d64545", fontSize: 13, margin: "12px 0 0", textAlign: "center" }}>{error}</p>}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.55)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
};
const card: React.CSSProperties = {
  width: "100%", maxWidth: 400, maxHeight: "90vh", overflowY: "auto",
  background: "var(--card)", color: "var(--text)", borderRadius: 16, padding: "22px 20px",
  border: "1px solid var(--border)", boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
};
const p: React.CSSProperties = { margin: "0 0 14px", fontSize: 14, lineHeight: 1.55, color: "var(--text2)" };
const input: React.CSSProperties = {
  width: "100%", boxSizing: "border-box", padding: "12px 13px", borderRadius: 11,
  border: "1.5px solid var(--line)", background: "var(--chip)", color: "var(--text)",
  fontSize: 15, marginBottom: 10, outline: "none",
};
const goldBtn: React.CSSProperties = {
  width: "100%", background: GOLD, color: "#1a1a1a", border: "none", borderRadius: 12,
  padding: "13px 16px", fontSize: 15, fontWeight: 800, cursor: "pointer", marginTop: 2,
};
const laterBtn: React.CSSProperties = {
  width: "100%", background: "none", border: "none", color: "var(--text2)",
  fontSize: 13.5, fontWeight: 700, marginTop: 10, cursor: "pointer", padding: 6,
};
