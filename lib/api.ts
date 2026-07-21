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

function normalize(data: any): AuthResponse {
  if (data && typeof data === "object") {
    if (data.user) return { success: true, user: data.user as User };
    if (typeof data.id === "number") return { success: true, user: data as User };
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
    return normalize(data);
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
  if (typeof window !== "undefined") localStorage.removeItem(USER_KEY);
}
