import { LoggedSet } from "@/lib/types";

export function calculateSetVolume(weight: number, reps: number): number {
  return weight * reps;
}

export function sanitizePositiveNumber(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Number(value);
}

export function normalizeSets(sets: LoggedSet[]): LoggedSet[] {
  return sets
    .map((set, index) => ({
      setNumber: index + 1,
      reps: sanitizePositiveNumber(set.reps),
      weight: sanitizePositiveNumber(set.weight),
    }))
    .filter((set) => set.reps > 0 && set.weight > 0);
}
