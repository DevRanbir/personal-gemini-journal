import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Database } from 'firebase/database';

const hasFirebaseConfig = () => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    ""
  );
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "ai-barista-track-1.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "ai-barista-track-1",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "ai-barista-track-1.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "344135619629",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:344135619629:web:4e33b081f45a60ca6b14a4",
};

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

// Use Cloud Firestore as primary database. Realtime DB disabled to prevent missing RTDB warnings.
export const database: Database | null = null;
export const isFirebaseConfigured = hasFirebaseConfig();
export default app;
