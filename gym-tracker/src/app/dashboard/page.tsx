"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { getTopPRs } from "@/lib/firestore";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { type PRRecord } from "@/lib/types";

function formatTimestamp(date: Date | null) {
  if (!date) {
    return "No update yet";
  }

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { user, loading, isAuthenticated } = useRequireAuth();
  const [prHighlights, setPrHighlights] = useState<PRRecord[]>([]);
  const [isLoadingPrs, setIsLoadingPrs] = useState(true);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchPrs = async () => {
      setIsLoadingPrs(true);
      try {
        const top = await getTopPRs(user.uid, 3);
        setPrHighlights(top);
      } finally {
        setIsLoadingPrs(false);
      }
    };

    fetchPrs();
  }, [user]);

  if (loading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-zinc-300">
        Loading your dashboard...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Discipline First</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Welcome back{user?.displayName ? `, ${user.displayName.split(" ")[0]}` : ""}.
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Log every set. Keep the standard high. Progress is built on consistency.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Link
            href="/workout"
            className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:-translate-y-0.5 hover:border-zinc-600"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Start Workout</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">Track today&apos;s session</h2>
            <p className="mt-2 text-sm text-zinc-400">Choose Push, Pull, or Legs and capture every set.</p>
          </Link>

          <Link
            href="/progress"
            className="group rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:-translate-y-0.5 hover:border-zinc-600"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">View Progress</p>
            <h2 className="mt-4 text-2xl font-semibold text-white">Review your PR board</h2>
            <p className="mt-2 text-sm text-zinc-400">See per-exercise best volume and recent activity.</p>
          </Link>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Recent PR Highlights</h2>
            <span className="text-xs uppercase tracking-[0.18em] text-zinc-500">Top 3</span>
          </div>

          {isLoadingPrs ? (
            <p className="mt-4 text-sm text-zinc-400">Loading PR highlights...</p>
          ) : prHighlights.length === 0 ? (
            <p className="mt-4 text-sm text-zinc-400">
              No PRs yet. Finish your first workout to start building your board.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {prHighlights.map((pr, index) => (
                <div
                  key={pr.id}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-black/60 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {index + 1}. {pr.exercise_name}
                    </p>
                    <p className="text-xs text-zinc-500">Updated {formatTimestamp(pr.updated_at)}</p>
                  </div>
                  <p className="text-lg font-semibold text-zinc-100">{pr.best_volume} vol</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
