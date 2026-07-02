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
    const data = await res.json();
    if (!res.ok) return { success: false, detail: data.detail || "Google sync failed" };
    return normalize(data);
  } catch {
    return { success: false, detail: "Network error. Please try again." };
  }
}

export async function loginEmail(email: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`${API_URL}/users/login-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) return { success: false, detail: data.detail || "Login failed" };
    return normalize(data);
  } catch {
    return { success: false, detail: "Network error. Please try again." };
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
