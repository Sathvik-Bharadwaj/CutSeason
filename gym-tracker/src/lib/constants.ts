import { WorkoutType } from "@/lib/types";

export const EXERCISE_TEMPLATES: Record<WorkoutType, string[]> = {
  push: [
    "Incline Press",
    "Cable Lateral Raises",
    "Low to High Cable Fly",
    "High to Low Cable Fly",
    "Pec Deck",
    "Ab Crunches",
  ],
  pull: [
    "Chest Supported T-Bar Row",
    "Lat Pulldown",
    "Single Arm Cable Lat Pull",
    "Preacher Curl",
    "Hammer Curl",
    "Trap Shrugs",
  ],
  legs: ["Incline Leg Press", "Leg Extensions", "Calf Raises", "Hamstring Curls"],
};

export const WORKOUT_TYPES: WorkoutType[] = ["push", "pull", "legs"];

export const ALL_EXERCISES = Array.from(
  new Set(Object.values(EXERCISE_TEMPLATES).flat()),
).sort((a, b) => a.localeCompare(b));
