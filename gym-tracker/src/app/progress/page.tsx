"use client";

import { useEffect, useMemo, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { ALL_EXERCISES } from "@/lib/constants";
import {
  getLastPerformedMap,
  getUserPRs,
  getWeightLogs,
  upsertDailyWeight,
} from "@/lib/firestore";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { type PRRecord, type WeightLogRecord, type WeeklyWeightSummary } from "@/lib/types";

function formatDate(date: Date | null) {
  if (!date) {
    return "-";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map((item) => Number(item));
  return new Date(year, month - 1, day);
}

function startOfWeekMonday(date: Date): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = (next.getDay() + 6) % 7;
  next.setDate(next.getDate() - diff);
  return next;
}

function endOfWeek(startDate: Date): Date {
  const next = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  next.setDate(next.getDate() + 6);
  return next;
}

function getWeeklySummaries(logs: WeightLogRecord[]): WeeklyWeightSummary[] {
  const grouped = new Map<string, WeightLogRecord[]>();

  logs.forEach((log) => {
    const weekStartDate = startOfWeekMonday(parseDateKey(log.date_key));
    const weekKey = formatDateKey(weekStartDate);

    if (!grouped.has(weekKey)) {
      grouped.set(weekKey, []);
    }

    grouped.get(weekKey)?.push(log);
  });

  const summaries: WeeklyWeightSummary[] = [];

  grouped.forEach((weekLogs, weekStartKey) => {
    const sortedLogs = [...weekLogs].sort((a, b) => a.date_key.localeCompare(b.date_key));
    const total = sortedLogs.reduce((sum, item) => sum + item.weight, 0);
    const averageWeight = total / sortedLogs.length;
    const firstWeight = sortedLogs[0]?.weight ?? 0;
    const lastWeight = sortedLogs[sortedLogs.length - 1]?.weight ?? 0;
    const weekStartDate = parseDateKey(weekStartKey);
    const weekEndDate = endOfWeek(weekStartDate);

    summaries.push({
      weekStart: weekStartKey,
      weekEnd: formatDateKey(weekEndDate),
      averageWeight: Number(averageWeight.toFixed(2)),
      weeklyChange: Number((lastWeight - firstWeight).toFixed(2)),
    });
  });

  return summaries.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

function getWeightChangeLabel(change: number): string {
  if (change > 0) {
    return `Gained ${change.toFixed(2)}`;
  }

  if (change < 0) {
    return `Lost ${Math.abs(change).toFixed(2)}`;
  }

  return "No change";
}

export default function ProgressPage() {
  const { user, loading, isAuthenticated } = useRequireAuth();
  const [prs, setPrs] = useState<PRRecord[]>([]);
  const [lastPerformed, setLastPerformed] = useState<Record<string, Date | null>>({});
  const [weightLogs, setWeightLogs] = useState<WeightLogRecord[]>([]);
  const [dailyWeightInput, setDailyWeightInput] = useState("");
  const [isSavingWeight, setIsSavingWeight] = useState(false);
  const [weightError, setWeightError] = useState<string | null>(null);
  const [weightSuccess, setWeightSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const todayKey = useMemo(() => formatDateKey(new Date()), []);

  useEffect(() => {
    if (!user) {
      return;
    }

    const fetchProgress = async () => {
      setIsLoading(true);
      try {
        const [prList, performedMap, weightLogList] = await Promise.all([
          getUserPRs(user.uid),
          getLastPerformedMap(user.uid),
          getWeightLogs(user.uid),
        ]);
        setPrs(prList);
        setLastPerformed(performedMap);
        setWeightLogs(weightLogList);

        const todayLog = weightLogList.find((item) => item.date_key === todayKey);
        if (todayLog) {
          setDailyWeightInput(String(todayLog.weight));
        } else if (weightLogList.length > 0) {
          setDailyWeightInput(String(weightLogList[weightLogList.length - 1].weight));
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, [user, todayKey]);

  const prMap = useMemo(() => {
    const next = new Map<string, PRRecord>();
    prs.forEach((pr) => {
      next.set(pr.exercise_name, pr);
    });
    return next;
  }, [prs]);

  const weeklySummaries = useMemo(() => getWeeklySummaries(weightLogs), [weightLogs]);

  const latestWeightLog = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;

  const handleSaveDailyWeight = async () => {
    if (!user) {
      return;
    }

    const numericWeight = Number(dailyWeightInput);
    if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
      setWeightError("Enter a valid positive weight.");
      setWeightSuccess(null);
      return;
    }

    try {
      setIsSavingWeight(true);
      setWeightError(null);
      setWeightSuccess(null);

      await upsertDailyWeight(user.uid, numericWeight);
      const updatedLogs = await getWeightLogs(user.uid);
      setWeightLogs(updatedLogs);
      setWeightSuccess("Daily weight saved.");
    } catch (error) {
      setWeightError(error instanceof Error ? error.message : "Failed to save daily weight.");
      setWeightSuccess(null);
    } finally {
      setIsSavingWeight(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-zinc-300">
        Loading progress board...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Progress</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Personal Record Board</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Best volume is tracked per exercise as weight × reps, across all saved sessions.
          </p>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Bodyweight Tracker</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Daily weight log</h2>
              <p className="mt-1 text-sm text-zinc-400">
                Log once daily. Weekly averages and change are calculated from Monday to Sunday.
              </p>
            </div>
            <div className="text-right text-sm text-zinc-400">
              <p>Latest: {latestWeightLog ? `${latestWeightLog.weight}` : "-"}</p>
              <p>Logged: {latestWeightLog?.logged_at ? formatDate(latestWeightLog.logged_at) : "-"}</p>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1 text-xs text-zinc-400">
              Today&apos;s Weight
              <input
                type="number"
                min={0}
                step="0.1"
                inputMode="decimal"
                value={dailyWeightInput}
                onChange={(event) => setDailyWeightInput(event.target.value)}
                className="rounded-md border border-zinc-700 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-zinc-400"
              />
            </label>
            <button
              type="button"
              disabled={isSavingWeight}
              onClick={handleSaveDailyWeight}
              className="h-10 rounded-md bg-white px-4 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingWeight ? "Saving..." : "Save Daily Weight"}
            </button>
          </div>

          {weightError && (
            <p className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {weightError}
            </p>
          )}
          {weightSuccess && (
            <p className="mt-3 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
              {weightSuccess}
            </p>
          )}

          <div className="mt-6 overflow-hidden rounded-xl border border-zinc-800">
            <div className="grid grid-cols-[1fr_0.8fr_1fr] border-b border-zinc-800 bg-black/40 px-4 py-3 text-xs uppercase tracking-[0.15em] text-zinc-500">
              <span>Week</span>
              <span>Avg Weight</span>
              <span>Lost/Gained</span>
            </div>

            {isLoading ? (
              <p className="px-4 py-4 text-sm text-zinc-400">Loading weekly weight data...</p>
            ) : weeklySummaries.length === 0 ? (
              <p className="px-4 py-4 text-sm text-zinc-400">No weight logs yet. Save your first daily weight.</p>
            ) : (
              weeklySummaries.map((summary) => (
                <div
                  key={summary.weekStart}
                  className="grid grid-cols-[1fr_0.8fr_1fr] border-b border-zinc-900 px-4 py-3 text-sm"
                >
                  <span className="text-zinc-200">
                    {summary.weekStart} to {summary.weekEnd}
                  </span>
                  <span className="font-mono text-zinc-200">{summary.averageWeight.toFixed(2)}</span>
                  <span
                    className={
                      summary.weeklyChange > 0
                        ? "text-amber-300"
                        : summary.weeklyChange < 0
                          ? "text-emerald-300"
                          : "text-zinc-400"
                    }
                  >
                    {getWeightChangeLabel(summary.weeklyChange)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950/70">
          <div className="grid grid-cols-[1.4fr_0.8fr_0.9fr] border-b border-zinc-800 px-4 py-3 text-xs uppercase tracking-[0.16em] text-zinc-500 sm:px-6">
            <span>Exercise</span>
            <span>Best Volume</span>
            <span>Last Performed</span>
          </div>

          {isLoading ? (
            <p className="px-4 py-6 text-sm text-zinc-400 sm:px-6">Loading progress...</p>
          ) : (
            <div>
              {ALL_EXERCISES.map((exercise) => {
                const pr = prMap.get(exercise);
                const lastDate = lastPerformed[exercise] ?? null;

                return (
                  <div
                    key={exercise}
                    className="grid grid-cols-[1.4fr_0.8fr_0.9fr] items-center border-b border-zinc-900 px-4 py-3 text-sm text-zinc-200 transition hover:bg-zinc-900/40 sm:px-6"
                  >
                    <span className="font-medium text-zinc-100">{exercise}</span>
                    <span className="font-mono text-zinc-300">
                      {pr ? `${pr.best_volume}` : "-"}
                    </span>
                    <span className="text-zinc-400">{formatDate(lastDate)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
