import { writable, get } from 'svelte/store';
import type { Settings, Food, Goal, Routine } from './types';
import { DEFAULT_SETTINGS } from './types';
import { getSettings, saveSettings, getFoods, getCurrentGoal, getRoutines } from './db';
import { todayKey } from './date';

export type Route =
  | 'today'
  | 'add'
  | 'foods'
  | 'trends'
  | 'weight'
  | 'goals'
  | 'settings'
  | 'workouts'
  | 'routines';

export const route = writable<Route>('today');
export const selectedDate = writable<string>(todayKey());

export const settings = writable<Settings>({ ...DEFAULT_SETTINGS });
export const foods = writable<Food[]>([]);
export const routines = writable<Routine[]>([]);
export const currentGoal = writable<Goal | undefined>(undefined);

// Bumped whenever entries/weights change so views can re-query.
export const dataVersion = writable<number>(0);
export function bumpData() {
  dataVersion.update((n) => n + 1);
}

export async function loadSettings() {
  settings.set(await getSettings());
  applyTheme();
}

export async function updateSettings(patch: Partial<Settings>) {
  const next = { ...get(settings), ...patch } as Settings;
  settings.set(next);
  await saveSettings(next);
  applyTheme();
}

export async function loadFoods() {
  foods.set(await getFoods());
}

export async function loadRoutines() {
  routines.set(await getRoutines());
}

export async function loadGoal() {
  currentGoal.set(await getCurrentGoal());
}

export async function loadAll() {
  await Promise.all([loadSettings(), loadFoods(), loadRoutines(), loadGoal()]);
}

// ---------- Theme ----------
export function applyTheme() {
  const pref = get(settings).theme;
  const dark =
    pref === 'dark' ||
    (pref === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (get(settings).theme === 'system') applyTheme();
  });
}

// ---------- Toasts ----------
export interface Toast {
  id: number;
  message: string;
  kind: 'info' | 'success' | 'error';
}
export const toasts = writable<Toast[]>([]);
let toastId = 0;
export function toast(message: string, kind: Toast['kind'] = 'info') {
  const id = ++toastId;
  toasts.update((t) => [...t, { id, message, kind }]);
  setTimeout(
    () => {
      toasts.update((t) => t.filter((x) => x.id !== id));
    },
    kind === 'error' ? 7000 : 3200
  );
}

export function navigate(to: Route) {
  route.set(to);
  if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
}
