import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBRmz4BaECYxLaGt4YWZuoLzWUUTYsQyi0",
  authDomain: "selection-lab.firebaseapp.com",
  projectId: "selection-lab",
  storageBucket: "selection-lab.firebasestorage.app",
  messagingSenderId: "912827115397",
  appId: "1:912827115397:web:f72c615ac5765f575606ec",
  measurementId: "G-BMEC3BTY24",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
const provider = new GoogleAuthProvider();

function isMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

type GoogleUser = {
  googleId: string;
  email: string;
  name: string;
  photoURL: string;
};

/**
 * Starts Google sign-in.
 * - Desktop: popup (instant, returns the user object).
 * - Mobile: full-page redirect (popup is blocked on most mobile browsers).
 *   On mobile this navigates away and returns null; the result is picked up
 *   by getGoogleRedirectResult() after the page reloads.
 */
export async function signInWithGoogle(): Promise<GoogleUser | null> {
  if (isMobile()) {
    // Redirect flow — page will navigate to Google and come back.
    await signInWithRedirect(auth, provider);
    return null;
  }
  const result = await signInWithPopup(auth, provider);
  return {
    googleId: result.user.uid,
    email: result.user.email || "",
    name: result.user.displayName || "",
    photoURL: result.user.photoURL || "",
  };
}

/**
 * Call this once when the login page loads. If the user is returning from a
 * Google redirect, it returns their info; otherwise null.
 */
export async function getGoogleRedirectResult(): Promise<GoogleUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    return {
      googleId: result.user.uid,
      email: result.user.email || "",
      name: result.user.displayName || "",
      photoURL: result.user.photoURL || "",
    };
  } catch {
    return null;
  }
}
