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
// Always let the user pick an account (avoids silent-fail when one is cached).
provider.setCustomParameters({ prompt: "select_account" });

type GoogleUser = {
  googleId: string;
  email: string;
  name: string;
  photoURL: string;
};

function toGoogleUser(result: any): GoogleUser {
  return {
    googleId: result.user.uid,
    email: result.user.email || "",
    name: result.user.displayName || "",
    photoURL: result.user.photoURL || "",
  };
}

/**
 * Starts Google sign-in using a POPUP on both desktop and mobile.
 *
 * Why popup (not redirect): the app is hosted on Vercel at selectionlab.in, but
 * Firebase's authDomain is selection-lab.firebaseapp.com. signInWithRedirect
 * stores its handshake state in a cross-origin iframe on the firebaseapp.com
 * origin. Modern mobile browsers partition/block that third-party storage, so
 * getRedirectResult() comes back null after returning from Google — the login
 * page just sat on "Checking Google sign-in...". A popup runs in a first-party
 * window, so storage partitioning doesn't break it. This is Firebase's own
 * recommended Option 2 for apps not hosted on Firebase Hosting.
 *
 * Returns the signed-in user directly (no redirect round-trip needed).
 */
export async function signInWithGoogle(): Promise<GoogleUser | null> {
  try {
    const result = await signInWithPopup(auth, provider);
    return toGoogleUser(result);
  } catch (e: any) {
    const code = e?.code || "";
    // User closed the popup / double-tapped — treat as a silent cancel.
    if (code === "auth/cancelled-popup-request" || code === "auth/popup-closed-by-user") {
      return null;
    }
    // Some in-app / restrictive browsers block popups outright. Fall back to
    // redirect there (getGoogleRedirectResult below will pick it up on reload).
    if (code === "auth/popup-blocked" || code === "auth/operation-not-supported-in-this-environment") {
      await signInWithRedirect(auth, provider);
      return null;
    }
    // Anything else (e.g. unauthorized-domain) — surface it to the caller.
    throw e;
  }
}

/**
 * Fallback for the rare popup-blocked case above, where we fell back to
 * signInWithRedirect. On a normal popup login this returns null (harmless).
 */
export async function getGoogleRedirectResult(): Promise<GoogleUser | null> {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    return toGoogleUser(result);
  } catch {
    return null;
  }
}
