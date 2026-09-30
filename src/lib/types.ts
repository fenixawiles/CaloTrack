export type ServingUnit = 'g' | 'ml' | 'oz' | 'piece' | 'cup' | 'tbsp' | 'tsp' | 'serving';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type Units = 'metric' | 'imperial';
export type ThemePref = 'system' | 'light' | 'dark';
export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface Macros {
  protein?: number; // grams
  carbs?: number;
  fat?: number;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  caloriesPerServing: number;
  servingSize: number; // numeric amount for one serving
  servingUnit: ServingUnit;
  macros?: Macros; // per serving
  barcode?: string;
  favorite?: boolean;
  source: 'manual' | 'off';
  createdAt: number;
  updatedAt: number;
}

export interface Entry {
  id: string;
  date: string; // YYYY-MM-DD (local)
  foodId?: string; // reference into foods, if from library
  name: string; // snapshot so log survives food edits/deletes
  caloriesPerServing: number; // snapshot
  servings: number; // multiplier
  mealType: MealType;
  macros?: Macros; // per serving snapshot
  loggedAt: number;
}

export interface WeightRecord {
  id: string;
  date: string; // YYYY-MM-DD
  value: number; // stored in kg always (canonical)
  loggedAt: number;
  note?: string;
}

export interface Goal {
  id: string;
  dailyCalorieTarget?: number;
  targetWeightKg?: number;
  startWeightKg?: number;
  weeklyRateKg?: number; // negative = losing, positive = gaining
  activeFrom: string; // YYYY-MM-DD
  createdAt: number;
}

export interface Profile {
  sex?: Sex;
  age?: number;
  heightCm?: number;
  activityLevel?: ActivityLevel;
}

export interface Settings {
  id: 'settings';
  units: Units;
  theme: ThemePref;
  firstName?: string;
  profile: Profile;
  backupReminderDays: number; // 0 = never
  lastBackupAt?: number;
  onboarded?: boolean;
  // When true, logged exercise calories add back to the daily budget.
  // Default false: a TDEE-based goal already includes an activity factor,
  // so adding exercise on top would double-count it.
  subtractExercise: boolean;
  whoop?: WhoopConfig;
}

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  units: 'imperial',
  theme: 'system',
  profile: {},
  backupReminderDays: 14,
  subtractExercise: false
};

// ---------- Exercise / workouts ----------
export type WeightUnit = 'kg' | 'lb';

/** One exercise inside a logged workout. All detail fields are optional. */
export interface ExerciseEntry {
  name: string;
  sets?: number;
  reps?: number; // reps per set
  weight?: number; // load, stored in the unit it was entered in
  weightUnit?: WeightUnit;
}

/** A reusable workout template, e.g. "Strength B" = a fixed list of exercises. */
export interface RoutineExercise {
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  weightUnit?: WeightUnit;
}

export interface Routine {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  createdAt: number;
  updatedAt: number;
}

/** A logged workout session. Exercises and burn are all optional. */
export interface Workout {
  id: string;
  date: string; // YYYY-MM-DD (local)
  name?: string; // e.g. "Strength B", or a freeform label
  routineId?: string; // if started from a routine
  exercises: ExerciseEntry[];
  caloriesBurned?: number; // e.g. the WHOOP total for the session
  note?: string;
  source?: 'manual' | 'whoop';
  whoopId?: string; // WHOOP activity id, for de-duplication on sync
  loggedAt: number;
}

/** WHOOP connection config (safe to back up — holds no secrets or tokens). */
export interface WhoopConfig {
  clientId?: string;
  proxyUrl?: string; // Cloudflare Worker base URL
}
