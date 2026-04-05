export type WorkoutType = "push" | "pull" | "legs";

export interface LoggedSet {
  setNumber: number;
  reps: number;
  weight: number;
}

export interface ExerciseLogInput {
  exerciseName: string;
  sets: LoggedSet[];
}

export interface SaveWorkoutInput {
  userId: string;
  type: WorkoutType;
  logs: ExerciseLogInput[];
}

export interface PRRecord {
  id: string;
  user_id: string;
  exercise_name: string;
  best_volume: number;
  updated_at: Date | null;
}

export interface WorkoutSessionSummary {
  sessionId: string;
  newPrs: {
    exerciseName: string;
    volume: number;
  }[];
}

export interface WeightLogRecord {
  id: string;
  user_id: string;
  weight: number;
  date_key: string;
  logged_at: Date | null;
}

export interface WeeklyWeightSummary {
  weekStart: string;
  weekEnd: string;
  averageWeight: number;
  weeklyChange: number;
}
