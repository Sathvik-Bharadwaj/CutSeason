"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ExerciseCard } from "@/components/ExerciseCard";
import { Navbar } from "@/components/Navbar";
import { SetInputRow } from "@/components/SetInputRow";
import { EXERCISE_TEMPLATES, WORKOUT_TYPES } from "@/lib/constants";
import { saveWorkoutSession } from "@/lib/firestore";
import { normalizeSets } from "@/lib/pr";
import { useRequireAuth } from "@/lib/useRequireAuth";
import { type LoggedSet, type WorkoutSessionSummary, type WorkoutType } from "@/lib/types";

type WorkoutStep = "type" | "exercises" | "logging" | "saved";

function typeLabel(type: WorkoutType) {
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function initializeSets(exercises: string[]): Record<string, LoggedSet[]> {
  const next: Record<string, LoggedSet[]> = {};
  exercises.forEach((exercise) => {
    next[exercise] = [{ setNumber: 1, reps: 0, weight: 0 }];
  });
  return next;
}

export default function WorkoutPage() {
  const { user, loading, isAuthenticated } = useRequireAuth();

  const [step, setStep] = useState<WorkoutStep>("type");
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [exerciseSets, setExerciseSets] = useState<Record<string, LoggedSet[]>>({});
  const [saveResult, setSaveResult] = useState<WorkoutSessionSummary | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const templateExercises = useMemo(() => {
    if (!selectedType) {
      return [];
    }

    return EXERCISE_TEMPLATES[selectedType];
  }, [selectedType]);

  const resetFlow = () => {
    setStep("type");
    setSelectedType(null);
    setSelectedExercises([]);
    setExerciseSets({});
    setSaveResult(null);
    setSaveError(null);
  };

  const handleSelectType = (type: WorkoutType) => {
    setSelectedType(type);
    setSelectedExercises([]);
    setExerciseSets({});
    setSaveResult(null);
    setSaveError(null);
    setStep("exercises");
  };

  const toggleExercise = (exercise: string) => {
    setSelectedExercises((current) =>
      current.includes(exercise)
        ? current.filter((name) => name !== exercise)
        : [...current, exercise],
    );
  };

  const startLogging = () => {
    if (selectedExercises.length === 0) {
      setSaveError("Select at least one exercise to continue.");
      return;
    }

    setSaveError(null);
    setExerciseSets(initializeSets(selectedExercises));
    setStep("logging");
  };

  const updateSetValue = (
    exerciseName: string,
    setIndex: number,
    field: "reps" | "weight",
    value: number,
  ) => {
    setExerciseSets((current) => ({
      ...current,
      [exerciseName]: (current[exerciseName] ?? []).map((set, index) =>
        index === setIndex ? { ...set, [field]: value } : set,
      ),
    }));
  };

  const addSet = (exerciseName: string) => {
    setExerciseSets((current) => {
      const sets = current[exerciseName] ?? [];
      return {
        ...current,
        [exerciseName]: [...sets, { setNumber: sets.length + 1, reps: 0, weight: 0 }],
      };
    });
  };

  const removeSet = (exerciseName: string, setIndex: number) => {
    setExerciseSets((current) => {
      const sets = current[exerciseName] ?? [];
      const filtered = sets
        .filter((_, index) => index !== setIndex)
        .map((set, index) => ({ ...set, setNumber: index + 1 }));

      return {
        ...current,
        [exerciseName]: filtered.length > 0 ? filtered : [{ setNumber: 1, reps: 0, weight: 0 }],
      };
    });
  };

  const saveWorkout = async () => {
    if (!user || !selectedType) {
      return;
    }

    const logs = selectedExercises.map((exerciseName) => ({
      exerciseName,
      sets: exerciseSets[exerciseName] ?? [],
    }));

    const hasValidSet = logs.some((log) => normalizeSets(log.sets).length > 0);
    if (!hasValidSet) {
      setSaveError("Add at least one set with reps and weight before saving.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError(null);
      const result = await saveWorkoutSession({
        userId: user.uid,
        type: selectedType,
        logs,
      });
      setSaveResult(result);
      setStep("saved");
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save workout.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !isAuthenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-zinc-300">
        Loading workout tracker...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      <Navbar />

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Workout Mode</p>
          <h1 className="mt-3 text-3xl font-semibold text-white">Build today&apos;s session</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Choose your split, select exercises, and log every set with intent.
          </p>
        </section>

        {saveError && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {saveError}
          </div>
        )}

        {step === "type" && (
          <section className="grid gap-3 sm:grid-cols-3">
            {WORKOUT_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleSelectType(type)}
                className="rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-10 text-center text-lg font-semibold tracking-wide text-white transition hover:-translate-y-0.5 hover:border-zinc-500"
              >
                {typeLabel(type)}
              </button>
            ))}
          </section>
        )}

        {step === "exercises" && selectedType && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Select exercises ({typeLabel(selectedType)})</h2>
              <button
                type="button"
                onClick={resetFlow}
                className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
              >
                Change split
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {templateExercises.map((exercise) => (
                <ExerciseCard
                  key={exercise}
                  name={exercise}
                  selected={selectedExercises.includes(exercise)}
                  onToggle={() => toggleExercise(exercise)}
                />
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-800 pt-4">
              <p className="text-sm text-zinc-400">{selectedExercises.length} exercise(s) selected</p>
              <button
                type="button"
                onClick={startLogging}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Start Logging
              </button>
            </div>
          </section>
        )}

        {step === "logging" && selectedType && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Log sets ({typeLabel(selectedType)})</h2>
              <button
                type="button"
                onClick={() => setStep("exercises")}
                className="rounded-md border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
              >
                Edit exercises
              </button>
            </div>

            <div className="mt-5 grid gap-5">
              {selectedExercises.map((exerciseName) => {
                const sets = exerciseSets[exerciseName] ?? [];
                return (
                  <article key={exerciseName} className="rounded-xl border border-zinc-800 bg-black/50 p-4">
                    <h3 className="text-base font-semibold text-white">{exerciseName}</h3>
                    <div className="mt-3 grid gap-2">
                      {sets.map((set, index) => (
                        <SetInputRow
                          key={`${exerciseName}-${set.setNumber}`}
                          setNumber={set.setNumber}
                          reps={set.reps}
                          weight={set.weight}
                          canRemove={sets.length > 1}
                          onRepsChange={(value) => updateSetValue(exerciseName, index, "reps", value)}
                          onWeightChange={(value) => updateSetValue(exerciseName, index, "weight", value)}
                          onRemove={() => removeSet(exerciseName, index)}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => addSet(exerciseName)}
                      className="mt-3 rounded-md border border-zinc-700 px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900"
                    >
                      + Add Set
                    </button>
                  </article>
                );
              })}
            </div>

            <div className="mt-6 border-t border-zinc-800 pt-5">
              <button
                type="button"
                disabled={isSaving}
                onClick={saveWorkout}
                className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSaving ? "Saving workout..." : "Save Workout"}
              </button>
            </div>
          </section>
        )}

        {step === "saved" && (
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-6">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Session Saved</p>
            <h2 className="mt-3 text-2xl font-semibold text-white">Workout complete.</h2>
            <p className="mt-2 text-sm text-zinc-400">Session ID: {saveResult?.sessionId}</p>

            <div className="mt-5 rounded-xl border border-zinc-800 bg-black/60 p-4">
              <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-300">PR Updates</h3>
              {saveResult && saveResult.newPrs.length > 0 ? (
                <ul className="mt-3 grid gap-2 text-sm text-zinc-200">
                  {saveResult.newPrs.map((pr) => (
                    <li key={pr.exerciseName} className="flex items-center justify-between rounded-lg bg-zinc-900/60 px-3 py-2">
                      <span>{pr.exerciseName}</span>
                      <span className="font-semibold">{pr.volume} vol</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-zinc-400">No new PRs this session. Keep pushing.</p>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={resetFlow}
                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-zinc-200"
              >
                Start Another Workout
              </button>
              <Link
                href="/progress"
                className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-900"
              >
                View Progress
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
