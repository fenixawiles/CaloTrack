import type { Entry, Macros, Profile, ActivityLevel, Sex, Workout } from './types';
import { lastNDays, monthKey } from './date';

export function entryCalories(e: Entry): number {
  return Math.round(e.caloriesPerServing * e.servings);
}

export function entryMacros(e: Entry): Macros {
  if (!e.macros) return {};
  const s = e.servings;
  return {
    protein: e.macros.protein != null ? e.macros.protein * s : undefined,
    carbs: e.macros.carbs != null ? e.macros.carbs * s : undefined,
    fat: e.macros.fat != null ? e.macros.fat * s : undefined
  };
}

export function sumCalories(entries: Entry[]): number {
  return entries.reduce((t, e) => t + entryCalories(e), 0);
}

export function sumMacros(entries: Entry[]): Macros {
  const out: Macros = { protein: 0, carbs: 0, fat: 0 };
  for (const e of entries) {
    const m = entryMacros(e);
    out.protein! += m.protein ?? 0;
    out.carbs! += m.carbs ?? 0;
    out.fat! += m.fat ?? 0;
  }
  return out;
}

/** Map of date -> total calories for that date. */
export function caloriesByDate(entries: Entry[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) {
    map.set(e.date, (map.get(e.date) ?? 0) + entryCalories(e));
  }
  return map;
}

export interface DayPoint {
  date: string;
  calories: number;
  logged: boolean;
}

export function dailySeries(entries: Entry[], days: number): DayPoint[] {
  const byDate = caloriesByDate(entries);
  const loggedDates = new Set(entries.map((e) => e.date));
  return lastNDays(days).map((date) => ({
    date,
    calories: byDate.get(date) ?? 0,
    logged: loggedDates.has(date)
  }));
}

/**
 * Rolling average over logged days only, so a skipped day does not drag the
 * number toward zero. This keeps the headline number honest and non-punishing.
 */
export function rollingAverage(entries: Entry[], days: number): number | null {
  const series = dailySeries(entries, days).filter((d) => d.logged);
  if (series.length === 0) return null;
  const total = series.reduce((t, d) => t + d.calories, 0);
  return Math.round(total / series.length);
}

export function daysLoggedIn(entries: Entry[], days: number): number {
  return dailySeries(entries, days).filter((d) => d.logged).length;
}

export interface MonthSummary {
  key: string; // YYYY-MM
  total: number;
  daysLogged: number;
  average: number; // over logged days
}

export function monthlySummaries(entries: Entry[]): MonthSummary[] {
  const totals = new Map<string, number>();
  const logged = new Map<string, Set<string>>();
  for (const e of entries) {
    const mk = monthKey(e.date);
    totals.set(mk, (totals.get(mk) ?? 0) + entryCalories(e));
    if (!logged.has(mk)) logged.set(mk, new Set());
    logged.get(mk)!.add(e.date);
  }
  return [...totals.keys()]
    .sort()
    .map((key) => {
      const daysLogged = logged.get(key)!.size;
      const total = totals.get(key)!;
      return { key, total, daysLogged, average: daysLogged ? Math.round(total / daysLogged) : 0 };
    });
}

/** Cumulative running total across the given date keys for a month. */
export function cumulativeForMonth(entries: Entry[], mk: string): { date: string; cumulative: number }[] {
  const byDate = caloriesByDate(entries);
  const dates = [...byDate.keys()].filter((d) => monthKey(d) === mk).sort();
  let running = 0;
  return dates.map((date) => {
    running += byDate.get(date) ?? 0;
    return { date, cumulative: running };
  });
}

// ---------- Exercise / burn ----------
export function burnedByDate(workouts: Workout[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const w of workouts) {
    if (!w.caloriesBurned) continue;
    map.set(w.date, (map.get(w.date) ?? 0) + w.caloriesBurned);
  }
  return map;
}

export function sumBurned(workouts: Workout[]): number {
  return workouts.reduce((t, w) => t + (w.caloriesBurned ?? 0), 0);
}

/**
 * Effective calorie budget for a day. When subtractExercise is on, burned
 * calories are added back onto the target (net view). Otherwise the target
 * stands alone, because a TDEE-based goal already includes activity.
 */
export function effectiveTarget(
  target: number | undefined,
  burned: number,
  subtractExercise: boolean
): number | undefined {
  if (target == null) return undefined;
  return subtractExercise ? target + burned : target;
}

// ---------- TDEE / BMR (Mifflin–St Jeor) ----------
const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9
};

export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === 'male' ? base + 5 : base - 161;
}

export interface TdeeResult {
  bmr: number;
  tdee: number;
}

export function tdee(profile: Profile, weightKg: number): TdeeResult | null {
  const { sex, heightCm, age, activityLevel } = profile;
  if (!sex || !heightCm || !age || !weightKg || !activityLevel) return null;
  const b = bmr(sex, weightKg, heightCm, age);
  return { bmr: Math.round(b), tdee: Math.round(b * ACTIVITY_FACTOR[activityLevel]) };
}

/** ~7700 kcal per kg of body mass; convert a weekly rate to a daily calorie delta. */
export function calorieTargetForRate(tdeeValue: number, weeklyRateKg: number): number {
  const dailyDelta = (weeklyRateKg * 7700) / 7;
  return Math.round(tdeeValue + dailyDelta);
}
