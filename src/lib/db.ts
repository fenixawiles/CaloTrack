import type { Food, Entry, WeightRecord, Goal, Settings, Workout, Routine } from './types';
import { DEFAULT_SETTINGS } from './types';

// Storage engine: localStorage.
//
// We deliberately do NOT use IndexedDB. Installed iOS home-screen apps
// (standalone PWAs) have long-standing WebKit bugs where IndexedDB writes hang
// or fail silently, which made every "save" appear dead. The data here is small
// (personal food/workout logs — well under localStorage's ~5MB budget), so a
// synchronous JSON-in-localStorage store is both simpler and far more reliable.
// The async function signatures are kept so the rest of the app is unchanged.

const NS = 'ct_';

function readArr<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(NS + key);
    if (!raw) return [];
    const val = JSON.parse(raw);
    return Array.isArray(val) ? (val as T[]) : [];
  } catch {
    return [];
  }
}

function writeArr<T>(key: string, value: T[]): void {
  // A quota error here throws and is surfaced by the global handler.
  localStorage.setItem(NS + key, JSON.stringify(value));
}

function upsert<T extends { id: string }>(arr: T[], item: T): T[] {
  const i = arr.findIndex((x) => x.id === item.id);
  if (i >= 0) arr[i] = item;
  else arr.push(item);
  return arr;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- Settings ----------
export async function getSettings(): Promise<Settings> {
  let s: Settings | null = null;
  try {
    const raw = localStorage.getItem(NS + 'settings');
    if (raw) s = JSON.parse(raw) as Settings;
  } catch {
    s = null;
  }
  if (!s) {
    await saveSettings(DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }
  return { ...DEFAULT_SETTINGS, ...s, profile: { ...DEFAULT_SETTINGS.profile, ...s.profile } };
}

export async function saveSettings(s: Settings): Promise<void> {
  localStorage.setItem(NS + 'settings', JSON.stringify(s));
}

// ---------- Foods ----------
export async function getFoods(): Promise<Food[]> {
  return readArr<Food>('foods').sort((a, b) => a.name.localeCompare(b.name));
}

export async function getFood(id: string): Promise<Food | undefined> {
  return readArr<Food>('foods').find((f) => f.id === id);
}

export async function findFoodByBarcode(barcode: string): Promise<Food | undefined> {
  return readArr<Food>('foods').find((f) => f.barcode === barcode);
}

export async function saveFood(food: Food): Promise<void> {
  writeArr('foods', upsert(readArr<Food>('foods'), food));
}

export async function deleteFood(id: string): Promise<void> {
  writeArr(
    'foods',
    readArr<Food>('foods').filter((f) => f.id !== id)
  );
}

// ---------- Entries ----------
export async function getEntriesForDate(date: string): Promise<Entry[]> {
  return readArr<Entry>('entries')
    .filter((e) => e.date === date)
    .sort((a, b) => a.loggedAt - b.loggedAt);
}

export async function getAllEntries(): Promise<Entry[]> {
  return readArr<Entry>('entries');
}

export async function saveEntry(entry: Entry): Promise<void> {
  writeArr('entries', upsert(readArr<Entry>('entries'), entry));
}

export async function deleteEntry(id: string): Promise<void> {
  writeArr(
    'entries',
    readArr<Entry>('entries').filter((e) => e.id !== id)
  );
}

export async function getRecentEntryNames(limit = 20): Promise<Entry[]> {
  const all = readArr<Entry>('entries').sort((a, b) => b.loggedAt - a.loggedAt);
  const seen = new Set<string>();
  const out: Entry[] = [];
  for (const e of all) {
    const key = e.foodId ?? e.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
    if (out.length >= limit) break;
  }
  return out;
}

// ---------- Weights ----------
export async function getWeights(): Promise<WeightRecord[]> {
  return readArr<WeightRecord>('weights').sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveWeight(w: WeightRecord): Promise<void> {
  writeArr('weights', upsert(readArr<WeightRecord>('weights'), w));
}

export async function deleteWeight(id: string): Promise<void> {
  writeArr(
    'weights',
    readArr<WeightRecord>('weights').filter((w) => w.id !== id)
  );
}

// ---------- Goals ----------
export async function getGoals(): Promise<Goal[]> {
  return readArr<Goal>('goals').sort((a, b) => a.activeFrom.localeCompare(b.activeFrom));
}

export async function getCurrentGoal(): Promise<Goal | undefined> {
  const goals = await getGoals();
  return goals.length ? goals[goals.length - 1] : undefined;
}

export async function saveGoal(g: Goal): Promise<void> {
  writeArr('goals', upsert(readArr<Goal>('goals'), g));
}

export async function deleteGoal(id: string): Promise<void> {
  writeArr(
    'goals',
    readArr<Goal>('goals').filter((g) => g.id !== id)
  );
}

// ---------- Workouts ----------
export async function getWorkoutsForDate(date: string): Promise<Workout[]> {
  return readArr<Workout>('workouts')
    .filter((w) => w.date === date)
    .sort((a, b) => a.loggedAt - b.loggedAt);
}

export async function getAllWorkouts(): Promise<Workout[]> {
  return readArr<Workout>('workouts');
}

export async function saveWorkout(w: Workout): Promise<void> {
  writeArr('workouts', upsert(readArr<Workout>('workouts'), w));
}

export async function deleteWorkout(id: string): Promise<void> {
  writeArr(
    'workouts',
    readArr<Workout>('workouts').filter((w) => w.id !== id)
  );
}

// ---------- Routines ----------
export async function getRoutines(): Promise<Routine[]> {
  return readArr<Routine>('routines').sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveRoutine(r: Routine): Promise<void> {
  writeArr('routines', upsert(readArr<Routine>('routines'), r));
}

export async function deleteRoutine(id: string): Promise<void> {
  writeArr(
    'routines',
    readArr<Routine>('routines').filter((r) => r.id !== id)
  );
}

// ---------- Bulk (backup/restore) ----------
export async function exportAll() {
  return {
    foods: readArr<Food>('foods'),
    entries: readArr<Entry>('entries'),
    weights: readArr<WeightRecord>('weights'),
    goals: readArr<Goal>('goals'),
    workouts: readArr<Workout>('workouts'),
    routines: readArr<Routine>('routines'),
    settings: (() => {
      try {
        const raw = localStorage.getItem(NS + 'settings');
        return raw ? (JSON.parse(raw) as Settings) : undefined;
      } catch {
        return undefined;
      }
    })()
  };
}

export interface ImportData {
  foods?: Food[];
  entries?: Entry[];
  weights?: WeightRecord[];
  goals?: Goal[];
  workouts?: Workout[];
  routines?: Routine[];
  settings?: Settings;
}

export async function importAll(data: ImportData, mode: 'replace' | 'merge'): Promise<void> {
  const tables: (keyof ImportData)[] = ['foods', 'entries', 'weights', 'goals', 'workouts', 'routines'];
  for (const t of tables) {
    const incoming = (data[t] as { id: string }[] | undefined) ?? [];
    if (mode === 'replace') {
      writeArr(t, incoming);
    } else {
      const existing = readArr<{ id: string }>(t);
      for (const item of incoming) upsert(existing, item);
      writeArr(t, existing);
    }
  }
  if (data.settings) await saveSettings(data.settings);
}
