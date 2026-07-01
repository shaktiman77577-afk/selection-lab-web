import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup } from "firebase/auth";

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

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  return {
    idToken,
    email: result.user.email,
    name: result.user.displayName,
    photoURL: result.user.photoURL,
  };
}
