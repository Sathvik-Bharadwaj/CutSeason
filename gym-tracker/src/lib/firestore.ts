import { type User } from "firebase/auth";
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { ALL_EXERCISES } from "@/lib/constants";
import { getFirestoreDb } from "@/lib/firebase";
import { normalizeSets, calculateSetVolume } from "@/lib/pr";
import {
  type PRRecord,
  type SaveWorkoutInput,
  type WeightLogRecord,
  type WorkoutSessionSummary,
} from "@/lib/types";

export async function upsertUserProfile(user: User): Promise<void> {
  const db = getFirestoreDb();
  const userRef = doc(db, "users", user.uid);

  await setDoc(
    userRef,
    {
      id: user.uid,
      name: user.displayName ?? "",
      email: user.email ?? "",
    },
    { merge: true },
  );
}

function parseDate(value: unknown): Date | null {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  if (value instanceof Date) {
    return value;
  }

  return null;
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toPrDocId(userId: string, exerciseName: string): string {
  const normalized = exerciseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${userId}__${normalized}`.slice(0, 150);
}

function withFirestoreTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout while ${operationName}. Check browser shields/network and retry.`));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

export async function getUserPRs(userId: string): Promise<PRRecord[]> {
  const db = getFirestoreDb();
  const prQuery = query(collection(db, "prs"), where("user_id", "==", userId));
  const snapshot = await getDocs(prQuery);

  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        user_id: String(data.user_id ?? ""),
        exercise_name: String(data.exercise_name ?? ""),
        best_volume: Number(data.best_volume ?? 0),
        updated_at: parseDate(data.updated_at),
      } satisfies PRRecord;
    })
    .sort((a, b) => a.exercise_name.localeCompare(b.exercise_name));
}

export async function getTopPRs(userId: string, maxItems = 3): Promise<PRRecord[]> {
  const all = await getUserPRs(userId);
  return all.sort((a, b) => b.best_volume - a.best_volume).slice(0, maxItems);
}

export async function getLastPerformedMap(userId: string): Promise<Record<string, Date | null>> {
  const db = getFirestoreDb();
  const logsQuery = query(collection(db, "exercise_logs"), where("user_id", "==", userId));
  const snapshot = await getDocs(logsQuery);

  const byExercise: Record<string, Date | null> = {};
  ALL_EXERCISES.forEach((exercise) => {
    byExercise[exercise] = null;
  });

  snapshot.docs.forEach((item) => {
    const data = item.data();
    const exerciseName = String(data.exercise_name ?? "");
    const performedAt = parseDate(data.performed_at);

    if (!exerciseName || !performedAt) {
      return;
    }

    const existing = byExercise[exerciseName];
    if (!existing || performedAt.getTime() > existing.getTime()) {
      byExercise[exerciseName] = performedAt;
    }
  });

  return byExercise;
}

export async function upsertDailyWeight(
  userId: string,
  weight: number,
  targetDate = new Date(),
): Promise<void> {
  const numericWeight = Number(weight);
  if (!Number.isFinite(numericWeight) || numericWeight <= 0) {
    throw new Error("Weight must be a positive number.");
  }

  const db = getFirestoreDb();
  const now = Timestamp.now();
  const dateKey = formatDateKey(targetDate);
  const existingQuery = query(
    collection(db, "weight_logs"),
    where("user_id", "==", userId),
    where("date_key", "==", dateKey),
    limit(1),
  );

  const existingSnapshot = await getDocs(existingQuery);

  if (!existingSnapshot.empty) {
    await setDoc(
      existingSnapshot.docs[0].ref,
      {
        weight: numericWeight,
        logged_at: now,
      },
      { merge: true },
    );
    return;
  }

  const weightRef = doc(collection(db, "weight_logs"));
  await setDoc(weightRef, {
    id: weightRef.id,
    user_id: userId,
    weight: numericWeight,
    date_key: dateKey,
    logged_at: now,
  });
}

export async function getWeightLogs(userId: string): Promise<WeightLogRecord[]> {
  const db = getFirestoreDb();
  const weightQuery = query(collection(db, "weight_logs"), where("user_id", "==", userId));
  const snapshot = await getDocs(weightQuery);

  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        user_id: String(data.user_id ?? ""),
        weight: Number(data.weight ?? 0),
        date_key: String(data.date_key ?? ""),
        logged_at: parseDate(data.logged_at),
      } satisfies WeightLogRecord;
    })
    .filter((log) => log.weight > 0 && log.date_key)
    .sort((a, b) => {
      if (a.date_key === b.date_key) {
        return (a.logged_at?.getTime() ?? 0) - (b.logged_at?.getTime() ?? 0);
      }
      return a.date_key.localeCompare(b.date_key);
    });
}

async function upsertExercisePR(userId: string, exerciseName: string, volume: number): Promise<boolean> {
  const db = getFirestoreDb();
  const now = Timestamp.now();
  const prRef = doc(db, "prs", toPrDocId(userId, exerciseName));
  const snapshot = await withFirestoreTimeout(getDoc(prRef), 12000, `reading PR for ${exerciseName}`);

  if (!snapshot.exists()) {
    await withFirestoreTimeout(
      setDoc(prRef, {
        id: prRef.id,
        user_id: userId,
        exercise_name: exerciseName,
        best_volume: volume,
        updated_at: now,
      }),
      12000,
      `creating PR for ${exerciseName}`,
    );
    return true;
  }

  const current = Number(snapshot.data().best_volume ?? 0);

  if (volume <= current) {
    return false;
  }

  await withFirestoreTimeout(
    setDoc(
      prRef,
      {
        best_volume: volume,
        updated_at: now,
      },
      { merge: true },
    ),
    12000,
    `updating PR for ${exerciseName}`,
  );

  return true;
}

export async function saveWorkoutSession(input: SaveWorkoutInput): Promise<WorkoutSessionSummary> {
  const db = getFirestoreDb();
  const now = Timestamp.now();

  const sessionRef = doc(collection(db, "sessions"));
  await withFirestoreTimeout(
    setDoc(sessionRef, {
      id: sessionRef.id,
      user_id: input.userId,
      type: input.type,
      date: now,
    }),
    12000,
    "creating workout session",
  );

  const newPrs = new Map<string, number>();

  for (const log of input.logs) {
    const normalizedSets = normalizeSets(log.sets);
    if (normalizedSets.length === 0) {
      continue;
    }

    const exerciseLogRef = doc(collection(db, "exercise_logs"));
    await withFirestoreTimeout(
      setDoc(exerciseLogRef, {
        id: exerciseLogRef.id,
        session_id: sessionRef.id,
        user_id: input.userId,
        exercise_name: log.exerciseName,
        performed_at: now,
      }),
      12000,
      `creating exercise log for ${log.exerciseName}`,
    );

    let bestVolumeForExercise = 0;

    for (const set of normalizedSets) {
      const volume = calculateSetVolume(set.weight, set.reps);
      bestVolumeForExercise = Math.max(bestVolumeForExercise, volume);

      const setRef = doc(collection(db, "sets"));
      await withFirestoreTimeout(
        setDoc(setRef, {
          id: setRef.id,
          exercise_log_id: exerciseLogRef.id,
          session_id: sessionRef.id,
          user_id: input.userId,
          set_number: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          volume,
          created_at: now,
        }),
        12000,
        `saving set ${set.setNumber} for ${log.exerciseName}`,
      );
    }

    const isNewPr = await upsertExercisePR(input.userId, log.exerciseName, bestVolumeForExercise);
    if (isNewPr) {
      newPrs.set(log.exerciseName, bestVolumeForExercise);
    }
  }

  return {
    sessionId: sessionRef.id,
    newPrs: Array.from(newPrs.entries()).map(([exerciseName, volume]) => ({
      exerciseName,
      volume,
    })),
  };
}
