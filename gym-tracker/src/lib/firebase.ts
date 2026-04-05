import { initializeApp, getApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  type Auth,
} from "firebase/auth";
import { getFirestore, initializeFirestore, type Firestore } from "firebase/firestore";

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let firestoreDb: Firestore | null = null;
let persistencePromise: Promise<void> | null = null;

function getFirebaseConfig() {
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing Firebase environment variables: ${missing.join(", ")}. Check .env.local setup.`,
    );
  }

  return config;
}

export function getFirebaseApp(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  const config = getFirebaseConfig();
  firebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
  return firebaseApp;
}

export function getFirebaseAuth(): Auth {
  if (firebaseAuth) {
    return firebaseAuth;
  }

  firebaseAuth = getAuth(getFirebaseApp());
  return firebaseAuth;
}

export function getFirestoreDb(): Firestore {
  if (firestoreDb) {
    return firestoreDb;
  }

  const app = getFirebaseApp();

  try {
    firestoreDb = initializeFirestore(app, {
      // More reliable in restrictive browsers/networks (e.g. aggressive shields/proxies).
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    });
  } catch {
    // If Firestore was initialized elsewhere already, reuse that instance.
    firestoreDb = getFirestore(app);
  }

  return firestoreDb;
}

export function getGoogleProvider(): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

export async function ensureAuthPersistence(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  if (!persistencePromise) {
    persistencePromise = setPersistence(getFirebaseAuth(), browserLocalPersistence);
  }

  await persistencePromise;
}
