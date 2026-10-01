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
    const res = await fetch(`${API_URL}/users/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ google_id: googleId, email, name }),
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
