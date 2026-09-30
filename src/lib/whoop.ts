import type { Workout, WhoopConfig } from './types';
import { uid, getAllWorkouts, saveWorkout } from './db';

// WHOOP API v2. OAuth + data calls are proxied through the user's own
// Cloudflare Worker, which holds the client secret and adds CORS.
// Spec: https://developer.whoop.com

const AUTHORIZE_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth';
// `offline` yields a refresh token; the rest are read scopes we use.
const SCOPES = 'offline read:workout read:body_measurement read:profile';

const STATE_KEY = 'ct_whoop_state';
const TOKENS_KEY = 'ct_whoop_tokens';

export interface WhoopTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // epoch ms
}

// ---------- token storage (device-only; not in backups) ----------
export function loadTokens(): WhoopTokens | null {
  try {
    const raw = localStorage.getItem(TOKENS_KEY);
    return raw ? (JSON.parse(raw) as WhoopTokens) : null;
  } catch {
    return null;
  }
}
function saveTokens(t: WhoopTokens) {
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(t));
  } catch {
    /* ignore */
  }
}
export function clearTokens() {
  try {
    localStorage.removeItem(TOKENS_KEY);
  } catch {
    /* ignore */
  }
}

export function isConfigured(cfg?: WhoopConfig): boolean {
  return !!(cfg?.clientId && cfg?.proxyUrl);
}
export function isConnected(): boolean {
  return !!loadTokens();
}

export function redirectUri(): string {
  // Matches whatever origin the app runs on (localhost in dev, Pages in prod).
  let base = import.meta.env.BASE_URL || '/';
  if (!base.endsWith('/')) base += '/';
  return `${location.origin}${base}`;
}

function proxyBase(cfg: WhoopConfig): string {
  return (cfg.proxyUrl || '').replace(/\/+$/, '');
}

// ---------- OAuth ----------
export function beginAuth(cfg: WhoopConfig) {
  const state = uid();
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: cfg.clientId!,
    redirect_uri: redirectUri(),
    scope: SCOPES,
    state
  });
  location.assign(`${AUTHORIZE_URL}?${params.toString()}`);
}

/**
 * If the current URL is an OAuth redirect (has ?code&state), exchange the code
 * for tokens via the proxy and store them. Returns a status for the UI.
 */
export async function handleRedirectIfPresent(
  cfg?: WhoopConfig
): Promise<'connected' | 'error' | null> {
  const url = new URL(location.href);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const err = url.searchParams.get('error');

  if (!code && !err) return null;

  // Always scrub the query so a refresh doesn't re-trigger.
  const clean = () => {
    url.searchParams.delete('code');
    url.searchParams.delete('state');
    url.searchParams.delete('error');
    url.searchParams.delete('scope');
    history.replaceState({}, '', url.toString());
  };

  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);

  if (err || !code || !state || state !== expected || !isConfigured(cfg)) {
    clean();
    return 'error';
  }

  try {
    const res = await fetch(`${proxyBase(cfg!)}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, redirect_uri: redirectUri() })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    saveTokens({
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000
    });
    clean();
    return 'connected';
  } catch (e) {
    console.error('WHOOP token exchange failed', e);
    clean();
    return 'error';
  }
}

async function getAccessToken(cfg: WhoopConfig): Promise<string> {
  let tokens = loadTokens();
  if (!tokens) throw new Error('Not connected to WHOOP.');
  // Refresh if expiring within 60s.
  if (Date.now() > tokens.expiresAt - 60_000 && tokens.refreshToken) {
    const res = await fetch(`${proxyBase(cfg)}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: tokens.refreshToken })
    });
    if (!res.ok) {
      clearTokens();
      throw new Error('WHOOP session expired — please reconnect.');
    }
    const data = await res.json();
    tokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? tokens.refreshToken,
      expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000
    };
    saveTokens(tokens);
  }
  return tokens.accessToken;
}

async function apiGet(cfg: WhoopConfig, path: string): Promise<any> {
  const token = await getAccessToken(cfg);
  const res = await fetch(`${proxyBase(cfg)}/whoop/${path.replace(/^\/+/, '')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`WHOOP API ${res.status}: ${await res.text()}`);
  return res.json();
}

// ---------- workouts ----------
function parseOffsetMinutes(tz: string | undefined): number {
  if (!tz || tz === 'Z') return 0;
  const m = /^([+-])(\d{2}):(\d{2})$/.exec(tz);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

/** Local calendar date (YYYY-MM-DD) the workout belongs to, honoring its tz. */
function workoutDateKey(startIso: string, tz?: string): string {
  const shifted = new Date(new Date(startIso).getTime() + parseOffsetMinutes(tz) * 60_000);
  const y = shifted.getUTCFullYear();
  const mo = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}

function prettySport(name: string | undefined): string {
  if (!name) return 'Workout';
  return name
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function kjToKcal(kj: number): number {
  return Math.round(kj / 4.184);
}

/** Map a WHOOP v2 workout record to a CaloTrack workout (unsaved). */
export function mapWorkout(rec: any): Workout {
  const kj = rec?.score?.kilojoule;
  const strain = rec?.score?.strain;
  return {
    id: uid(),
    date: workoutDateKey(rec.start, rec.timezone_offset),
    name: prettySport(rec.sport_name),
    exercises: [],
    caloriesBurned: typeof kj === 'number' ? kjToKcal(kj) : undefined,
    note: typeof strain === 'number' ? `WHOOP strain ${strain.toFixed(1)}` : undefined,
    source: 'whoop',
    whoopId: rec.id,
    loggedAt: Date.now()
  };
}

/** Fetch WHOOP workouts since `sinceIso`, following pagination. */
export async function fetchWorkoutsSince(cfg: WhoopConfig, sinceIso: string): Promise<Workout[]> {
  const out: Workout[] = [];
  let nextToken: string | undefined;
  let guard = 0;
  do {
    const params = new URLSearchParams({ limit: '25', start: sinceIso });
    if (nextToken) params.set('nextToken', nextToken);
    const page = await apiGet(cfg, `v2/activity/workout?${params.toString()}`);
    for (const rec of page.records ?? []) {
      if (rec.score_state && rec.score_state !== 'SCORED') {
        // Still import the session, just without a burn number.
      }
      out.push(mapWorkout(rec));
    }
    nextToken = page.next_token;
  } while (nextToken && ++guard < 40);
  return out;
}

/**
 * Pull recent WHOOP workouts and merge them in, de-duplicated by whoopId.
 * Existing synced workouts keep any exercises/name you added; only the burn
 * and strain note are refreshed.
 */
export async function syncRecentWorkouts(
  cfg: WhoopConfig,
  days = 30
): Promise<{ added: number; updated: number }> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const fetched = await fetchWorkoutsSince(cfg, since);
  const existing = await getAllWorkouts();
  const byWhoop = new Map(existing.filter((w) => w.whoopId).map((w) => [w.whoopId!, w]));

  let added = 0;
  let updated = 0;
  for (const w of fetched) {
    const prev = byWhoop.get(w.whoopId!);
    if (!prev) {
      await saveWorkout(w);
      added++;
      continue;
    }
    const merged: Workout = {
      ...prev,
      name: prev.name || w.name,
      caloriesBurned: w.caloriesBurned ?? prev.caloriesBurned,
      note: w.note ?? prev.note
    };
    if (merged.caloriesBurned !== prev.caloriesBurned || merged.note !== prev.note) {
      await saveWorkout(merged);
      updated++;
    }
  }
  return { added, updated };
}

/** Optional: current body weight (kg) from WHOOP. */
export async function fetchBodyWeightKg(cfg: WhoopConfig): Promise<number | null> {
  try {
    const m = await apiGet(cfg, 'v2/user/measurement/body');
    return typeof m?.weight_kilogram === 'number' ? m.weight_kilogram : null;
  } catch {
    return null;
  }
}
