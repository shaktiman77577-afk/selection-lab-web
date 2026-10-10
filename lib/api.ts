import { API_URL } from "./config";

export interface User {
  id: number;
  google_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  profile_pic?: string;
  points?: number;
  streak_days?: number;
  target_exam?: string;
  referral_code?: string;
  profile_completed?: boolean;
}

interface AuthResponse {
  success: boolean;
  user?: User;
  detail?: string;
}

// ── Login token (Security Phase 2, Sep 2026) ──
// Backend login par token deta hai. Pehle website use phenk deti thi aur API
// ko sirf user_id bhejti thi — koi bhi kisi aur ka user_id daal sakta tha.
// Ab token yahan save hota hai, aur layout.tsx ka chhota script har API call
// me "Authorization: Bearer <token>" jod deta hai.
const TOKEN_KEY = "sl_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/** isLogin = naya login (Google / phone / email). Tab token naya rakho — ya
 *  na mile to purana hata do, warna pichhle account ka token naye account ke
 *  saath chala jata aur backend 403 deta. linkPhone jaise kaam login nahi. */
function normalize(data: any, isLogin = false): AuthResponse {
  if (data && typeof data === "object") {
    let user: User | null = null;
    if (data.user) user = data.user as User;
    else if (typeof data.id === "number") user = data as User;
    if (user) {
      if (isLogin) setToken(typeof data.token === "string" ? data.token : null);
      return { success: true, user };
    }
  }
  return { success: false, detail: "Unexpected response" };
}

export async function syncGoogleUser(
  googleId: string,
  email: string,
  name: string
): Promise<AuthResponse> {
  try {
    // Google ka ID token (lib/firebase.ts ne rakha) — backend isse verify
    // karta hai. Ek baar use karke mita dete hain.
    let idToken: string | null = null;
    try {
      idToken = sessionStorage.getItem("sl_google_idtoken");
      sessionStorage.removeItem("sl_google_idtoken");
    } catch {}
    const res = await fetch(`${API_URL}/users/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ google_id: googleId, email, name, id_token: idToken }),
    });
    // Parse the body defensively — a crashing server may return non-JSON.
    let data: any = {};
    let raw = "";
    try {
      raw = await res.text();
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      // Show the backend's real reason (FastAPI puts it in `detail`).
      return {
        success: false,
        detail: data.detail || raw || `Server error ${res.status}`,
      };
    }
    return normalize(data, true);
  } catch (e: any) {
    // fetch() itself threw — this is NOT a normal server error. It means the
    // browser blocked the response, almost always a CORS issue OR the backend
    // crashed with an unhandled exception (bare 500 has no CORS headers).
    // Surface the raw reason instead of hiding it as a generic message.
    return {
      success: false,
      detail: `Cannot reach server (${e?.message || "network/CORS"}). If this says "Failed to fetch", the API crashed without CORS headers or CORS is blocking selectionlab.in.`,
    };
  }
}

export async function loginEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_URL}/users/login-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    let data: any = {};
    let raw = "";
    try {
      raw = await res.text();
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      return { success: false, detail: data.detail || raw || `Login failed (${res.status})` };
    }
    return normalize(data, true);
  } catch (e: any) {
    return { success: false, detail: `Cannot reach server (${e?.message || "network/CORS"})` };
  }
}

export async function loginPhone(idToken: string, name?: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_URL}/users/login-phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: idToken, name: name || null }),
    });
    let data: any = {};
    let raw = "";
    try {
      raw = await res.text();
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      return { success: false, detail: data.detail || raw || `Login failed (${res.status})` };
    }
    return normalize(data, true);
  } catch (e: any) {
    return { success: false, detail: `Cannot reach server (${e?.message || "network/CORS"})` };
  }
}

export async function linkPhone(userId: number, idToken: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_URL}/users/link-phone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, id_token: idToken }),
    });
    let data: any = {};
    let raw = "";
    try {
      raw = await res.text();
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }
    if (!res.ok) {
      return { success: false, detail: data.detail || raw || `Could not link phone (${res.status})` };
    }
    return normalize(data);
  } catch (e: any) {
    return { success: false, detail: `Cannot reach server (${e?.message || "network/CORS"})` };
  }
}

const USER_KEY = "sl_user";

export function saveUser(user: User) {
  if (typeof window !== "undefined") localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

export function logout() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(USER_KEY);
    setToken(null);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  Login bina OTP + account merge (Oct 2026) — backend: routers/account.py
//  Har SMS ~₹5 ka hai. Ab login password (ya Google) se; OTP sirf naye phone
//  signup, forgot password (jab email na ho) aur merge ke saboot ke liye.
//  Token har API call me layout.tsx wala fetch wrapper khud jodta hai.
// ═══════════════════════════════════════════════════════════════════════════

export interface ApiResult<T = any> {
  ok: boolean;
  status: number;
  data: T & { detail?: string };
}

async function call<T = any>(path: string, method: "GET" | "POST", body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
    let data: any = {};
    try {
      const raw = await res.text();
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }
    if (!res.ok && typeof data.detail !== "string") {
      data.detail = `Something went wrong (${res.status}). Please try again.`;
    }
    return { ok: res.ok, status: res.status, data };
  } catch (e: any) {
    return { ok: false, status: 0, data: { detail: "Cannot reach server. Please check your internet." } as any };
  }
}

/** Login wala jawab: token + user dono save karo. */
function loginResult(r: ApiResult): AuthResponse {
  if (!r.ok) return { success: false, detail: r.data.detail };
  const out = normalize(r.data, true);
  if (out.success && out.user) saveUser(out.user);
  return out;
}

/** Mobile ya email + password se login. */
export async function loginPassword(identifier: string, password: string): Promise<AuthResponse> {
  return loginResult(await call("/users/login-password", "POST", { identifier: identifier.trim(), password }));
}

export interface AccountStatus {
  has_password: boolean;
  has_phone: boolean;
  has_email: boolean;
  has_google: boolean;
  profile_completed: boolean;
  needs_password: boolean;
  phone_masked: string;
  email_masked: string;
}

export async function getAccountStatus(): Promise<ApiResult<AccountStatus>> {
  return call<AccountStatus>("/users/account-status", "GET");
}

export async function setPassword(password: string): Promise<ApiResult> {
  return call("/users/set-password", "POST", { password });
}

export type Contact = { phone?: string; email?: string };

export interface AccountCheck {
  status: "free" | "mine" | "other";
  via: "phone" | "email";
  other?: { name: string; contact: string; banned: boolean };
}

/** Ye number/email kisi doosre account par to nahi? */
export async function accountCheck(c: Contact): Promise<ApiResult<AccountCheck>> {
  return call<AccountCheck>("/users/account-check", "POST", c);
}

/** Merge ka saboot shuru. email -> server code bhejta hai; sms -> hum Firebase se. */
export async function mergeStart(c: Contact): Promise<ApiResult<{ method: "email" | "sms"; sent_to: string }>> {
  return call("/users/merge/start", "POST", c);
}

/** Saboot ke saath merge. Jo account bacha, uska token + user save ho jata hai. */
export async function mergeConfirm(
  c: Contact & { id_token?: string; code?: string }
): Promise<AuthResponse & { kept?: "this" | "other" }> {
  const r = await call("/users/merge/confirm", "POST", c);
  return { ...loginResult(r), kept: r.data?.kept };
}

export interface ForgotStart {
  method: "email" | "sms";
  sent_to: string;
  phone?: string;
  sms_available?: boolean;
  email_available?: boolean;
}

export async function forgotStart(identifier: string, via?: "email" | "sms"): Promise<ApiResult<ForgotStart>> {
  return call<ForgotStart>("/users/forgot/start", "POST", { identifier: identifier.trim(), via: via || null });
}

export async function forgotReset(args: {
  identifier: string;
  new_password: string;
  code?: string;
  id_token?: string;
}): Promise<AuthResponse> {
  return loginResult(await call("/users/forgot/reset", "POST", { ...args, identifier: args.identifier.trim() }));
}

/**
 * Sliding session: din me ek baar naya token. Roz aane wala bachcha kabhi
 * logout nahi hota (aur use dobara login / OTP nahi lagta).
 * "merged" = ye account doosre me merge ho chuka — logout karke login karwao.
 */
export async function refreshSession(): Promise<"ok" | "merged" | "expired" | "skip"> {
  if (!getToken() || !getUser()) return "skip";
  const r = await call("/users/refresh-token", "POST");
  if (r.ok) {
    if (typeof r.data?.token === "string") setToken(r.data.token);
    if (r.data?.user) {
      const old = getUser();
      saveUser({ ...(old || {}), ...r.data.user });
    }
    return "ok";
  }
  if (r.status === 401) {
    return /merged/i.test(r.data?.detail || "") ? "merged" : "expired";
  }
  return "skip";   // network / server ki gadbad — kuch mat chhedo
}
