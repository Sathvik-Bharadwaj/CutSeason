"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      return;
    }

    router.replace(user ? "/dashboard" : "/login");
  }, [loading, user, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70 px-6 py-4 text-sm text-zinc-300">
        Loading IRON LOG...
      </div>
    </main>
  );
}
