"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import {
  ensureAuthPersistence,
  getFirebaseAuth,
  getGoogleProvider,
} from "@/lib/firebase";
import { upsertUserProfile } from "@/lib/firestore";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: () => void = () => {};

    const setupAuth = async () => {
      try {
        await ensureAuthPersistence();
        const auth = getFirebaseAuth();

        unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
          if (!isMounted) {
            return;
          }

          setUser(currentUser);
          setLoading(false);

          if (currentUser) {
            try {
              await upsertUserProfile(currentUser);
            } catch (upsertError) {
              console.error("Failed to sync user profile", upsertError);
            }
          }
        });
      } catch (setupError) {
        if (isMounted) {
          setError(setupError instanceof Error ? setupError.message : "Failed to initialize auth.");
          setLoading(false);
        }
      }
    };

    setupAuth();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    setError(null);
    await ensureAuthPersistence();

    const auth = getFirebaseAuth();
    const result = await signInWithPopup(auth, getGoogleProvider());
    await upsertUserProfile(result.user);
  };

  const logout = async () => {
    setError(null);
    await signOut(getFirebaseAuth());
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      error,
      signInWithGoogle,
      logout,
    }),
    [user, loading, error],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
