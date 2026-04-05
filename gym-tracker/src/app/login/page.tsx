"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function LoginPage() {
  const { user, loading, error, signInWithGoogle } = useAuth();
  const router = useRouter();
  const [signInError, setSignInError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  const handleGoogleSignIn = async () => {
    try {
      setSignInError(null);
      setIsSigningIn(true);
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (loginError) {
      setSignInError(loginError instanceof Error ? loginError.message : "Google sign-in failed.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(63,63,70,0.35),_transparent_55%)]" />

      <section className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950/80 p-8 shadow-2xl shadow-black/50 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">IRON LOG</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Earn every rep.</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">
          Sign in with Google to track workouts, log sets, and beat your personal records.
        </p>

        {(error || signInError) && (
          <div className="mt-5 rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error ?? signInError}
          </div>
        )}

        <button
          type="button"
          disabled={isSigningIn || loading}
          onClick={handleGoogleSignIn}
          className="mt-8 flex w-full items-center justify-center rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSigningIn ? "Signing in..." : "Continue with Google"}
        </button>
      </section>
    </main>
  );
}
