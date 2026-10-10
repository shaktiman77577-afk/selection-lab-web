// lib/desktop.ts
//
// Windows desktop app (repo selection-lab-desktop). App apne preload se
// window.slDesktop deta hai — wahi isDesktopApp() ka nishaan hai.
//
// Google login app ke andar nahi hota (Google "embedded browser" me mana karta
// hai). Isliye desktop me:
//   1. slDesktop.googleLogin() -> app system browser me /desktop-login kholta hai
//   2. Bachcha wahan Google se login karta hai, page app ko ek chhota code deta hai
//   3. Yahan code + verifier se server asli token deta hai (lib/api.ts)
// Password / OTP login app ke andar seedhe chalte hain.

export type DesktopBridge = {
  version: string;
  platform: string;
  googleLogin: () => Promise<{ code: string; verifier: string }>;
  cancelGoogleLogin: () => Promise<void>;
};

export function desktopBridge(): DesktopBridge | null {
  if (typeof window === "undefined") return null;
  const b = (window as any).slDesktop;
  return b && typeof b.googleLogin === "function" ? (b as DesktopBridge) : null;
}

export function isDesktopApp(): boolean {
  return desktopBridge() !== null;
}

/** Browser wale /desktop-login page ke liye: app ka challenge/state sahi format me hai? */
export function validDesktopParams(c: string | null, s: string | null): boolean {
  return !!c && !!s && /^[A-Za-z0-9_-]{43}$/.test(c) && /^[A-Za-z0-9_-]{16,64}$/.test(s);
}
