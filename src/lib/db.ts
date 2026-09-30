import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Food, Entry, WeightRecord, Goal, Settings, Workout, Routine } from './types';
import { DEFAULT_SETTINGS } from './types';

interface CaloTrackDB extends DBSchema {
  foods: {
    key: string;
    value: Food;
    indexes: { byName: string; byBarcode: string };
  };
  entries: {
    key: string;
    value: Entry;
    indexes: { byDate: string; byFood: string };
  };
  weights: {
    key: string;
    value: WeightRecord;
    indexes: { byDate: string };
  };
  goals: {
    key: string;
    value: Goal;
    indexes: { byActiveFrom: string };
  };
  workouts: {
    key: string;
    value: Workout;
    indexes: { byDate: string };
  };
  routines: {
    key: string;
    value: Routine;
    indexes: { byName: string };
  };
  settings: {
    key: string;
    value: Settings;
  };
}

const DB_NAME = 'calotrack';
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<CaloTrackDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<CaloTrackDB>> {
  if (!dbPromise) {
    dbPromise = openDB<CaloTrackDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('foods')) {
          const foods = db.createObjectStore('foods', { keyPath: 'id' });
          foods.createIndex('byName', 'name');
          foods.createIndex('byBarcode', 'barcode');
        }
        if (!db.objectStoreNames.contains('entries')) {
          const entries = db.createObjectStore('entries', { keyPath: 'id' });
          entries.createIndex('byDate', 'date');
          entries.createIndex('byFood', 'foodId');
        }
        if (!db.objectStoreNames.contains('weights')) {
          const weights = db.createObjectStore('weights', { keyPath: 'id' });
          weights.createIndex('byDate', 'date');
        }
        if (!db.objectStoreNames.contains('goals')) {
          const goals = db.createObjectStore('goals', { keyPath: 'id' });
          goals.createIndex('byActiveFrom', 'activeFrom');
        }
        if (!db.objectStoreNames.contains('workouts')) {
          const workouts = db.createObjectStore('workouts', { keyPath: 'id' });
          workouts.createIndex('byDate', 'date');
        }
        if (!db.objectStoreNames.contains('routines')) {
          const routines = db.createObjectStore('routines', { keyPath: 'id' });
          routines.createIndex('byName', 'name');
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
      }
    });
  }
  return dbPromise;
}

export function uid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------- Settings ----------
export async function getSettings(): Promise<Settings> {
  const db = await getDB();
  const s = await db.get('settings', 'settings');
  if (!s) {
    await db.put('settings', DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS };
  }
  // Merge in any new default fields added by later versions.
  return { ...DEFAULT_SETTINGS, ...s, profile: { ...DEFAULT_SETTINGS.profile, ...s.profile } };
}

export async function saveSettings(s: Settings): Promise<void> {
  const db = await getDB();
  await db.put('settings', s);
}

// ---------- Foods ----------
export async function getFoods(): Promise<Food[]> {
  const db = await getDB();
  const all = await db.getAll('foods');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getFood(id: string): Promise<Food | undefined> {
  const db = await getDB();
  return db.get('foods', id);
}

export async function findFoodByBarcode(barcode: string): Promise<Food | undefined> {
  const db = await getDB();
  return db.getFromIndex('foods', 'byBarcode', barcode);
}

export async function saveFood(food: Food): Promise<void> {
  const db = await getDB();
  await db.put('foods', food);
}

export async function deleteFood(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('foods', id);
}

// ---------- Entries ----------
export async function getEntriesForDate(date: string): Promise<Entry[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('entries', 'byDate', date);
  return rows.sort((a, b) => a.loggedAt - b.loggedAt);
}

export async function getAllEntries(): Promise<Entry[]> {
  const db = await getDB();
  return db.getAll('entries');
}

export async function saveEntry(entry: Entry): Promise<void> {
  const db = await getDB();
  await db.put('entries', entry);
}

export async function deleteEntry(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('entries', id);
}

/** Distinct foods logged recently, most-recent first, for quick re-add. */
export async function getRecentEntryNames(limit = 20): Promise<Entry[]> {
  const db = await getDB();
  const all = await db.getAll('entries');
  all.sort((a, b) => b.loggedAt - a.loggedAt);
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
  const db = await getDB();
  const all = await db.getAll('weights');
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

export async function saveWeight(w: WeightRecord): Promise<void> {
  const db = await getDB();
  await db.put('weights', w);
}

export async function deleteWeight(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('weights', id);
}

// ---------- Goals ----------
export async function getGoals(): Promise<Goal[]> {
  const db = await getDB();
  const all = await db.getAll('goals');
  return all.sort((a, b) => a.activeFrom.localeCompare(b.activeFrom));
}

/** The goal in effect (latest activeFrom on or before today). */
export async function getCurrentGoal(): Promise<Goal | undefined> {
  const goals = await getGoals();
  if (goals.length === 0) return undefined;
  return goals[goals.length - 1];
}

export async function saveGoal(g: Goal): Promise<void> {
  const db = await getDB();
  await db.put('goals', g);
}

export async function deleteGoal(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('goals', id);
}

// ---------- Workouts ----------
export async function getWorkoutsForDate(date: string): Promise<Workout[]> {
  const db = await getDB();
  const rows = await db.getAllFromIndex('workouts', 'byDate', date);
  return rows.sort((a, b) => a.loggedAt - b.loggedAt);
}

export async function getAllWorkouts(): Promise<Workout[]> {
  const db = await getDB();
  return db.getAll('workouts');
}

export async function saveWorkout(w: Workout): Promise<void> {
  const db = await getDB();
  await db.put('workouts', w);
}

export async function deleteWorkout(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('workouts', id);
}

// ---------- Routines (workout templates) ----------
export async function getRoutines(): Promise<Routine[]> {
  const db = await getDB();
  const all = await db.getAll('routines');
  return all.sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveRoutine(r: Routine): Promise<void> {
  const db = await getDB();
  await db.put('routines', r);
}

export async function deleteRoutine(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('routines', id);
}

// ---------- Bulk (backup/restore) ----------
export async function exportAll() {
  const db = await getDB();
  const [foods, entries, weights, goals, workouts, routines, settings] = await Promise.all([
    db.getAll('foods'),
    db.getAll('entries'),
    db.getAll('weights'),
    db.getAll('goals'),
    db.getAll('workouts'),
    db.getAll('routines'),
    db.get('settings', 'settings')
  ]);
  return { foods, entries, weights, goals, workouts, routines, settings };
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
  const db = await getDB();
  const tx = db.transaction(
    ['foods', 'entries', 'weights', 'goals', 'workouts', 'routines', 'settings'],
    'readwrite'
  );
  if (mode === 'replace') {
    await Promise.all([
      tx.objectStore('foods').clear(),
      tx.objectStore('entries').clear(),
      tx.objectStore('weights').clear(),
      tx.objectStore('goals').clear(),
      tx.objectStore('workouts').clear(),
      tx.objectStore('routines').clear()
    ]);
  }
  for (const f of data.foods ?? []) await tx.objectStore('foods').put(f);
  for (const e of data.entries ?? []) await tx.objectStore('entries').put(e);
  for (const w of data.weights ?? []) await tx.objectStore('weights').put(w);
  for (const g of data.goals ?? []) await tx.objectStore('goals').put(g);
  for (const wk of data.workouts ?? []) await tx.objectStore('workouts').put(wk);
  for (const r of data.routines ?? []) await tx.objectStore('routines').put(r);
  if (data.settings) await tx.objectStore('settings').put(data.settings);
  await tx.done;
}
