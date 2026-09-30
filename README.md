# 🍃 CaloTrack

A free, self-hosted calorie & weight tracker that runs as a mobile web app (PWA) from
GitHub Pages. No accounts, no ads, no paywalls — every feature is here for good, and your
data stays on your device.

**Live app:** https://fenixawiles.github.io/CaloTrack/

## Features

- **Daily logging** — calorie ring vs. your goal, grouped by meal, with a friendly date navigator.
- **Barcode scanning** — point your phone camera at a product; nutrition is pulled from the
  free [Open Food Facts](https://world.openfoodfacts.org) database and saved to your library.
- **Personal food library** — create foods with calories, serving size/unit, optional macros,
  and favorites for fast re-use.
- **Trends** — daily bar chart (30/90 days), rolling averages, **monthly cumulative totals +
  daily averages**, and a consistency heatmap.
- **Workouts & routines** — log a session with its exercises (sets/reps/load) and a total
  calorie burn (e.g. from WHOOP). Save any set of exercises as a reusable **routine**
  (like "Strength B") and load the whole thing in one tap next time. Detail is always
  optional — log just a name and a burn if that's all you want.
- **Weight tracking** — log weigh-ins, see the trend line and progress toward a goal.
- **Goals** — set a daily calorie target and a weight goal, with an optional **TDEE/BMR
  estimator** (Mifflin–St Jeor).
- **Backup & restore** — one-tap JSON export/import with gentle reminders. Your data is
  portable and yours.
- **Offline-first PWA** — installable to your home screen, works with no connection.

### Honest energy balance
Exercise is tracked and shown as an honest **in − out = net**, but by default it does **not**
inflate your calorie budget — because a TDEE-based goal already includes an activity factor,
so adding it again would double-count. A toggle in Settings turns on the net-budget behavior
for those working from a sedentary/BMR baseline.

### Designed to be kind
Progress is framed around **rolling averages** and **days logged**, never broken streaks or
guilt. Missing a day is completely fine.

## Run locally

```bash
npm install
npm run dev
```

Open the printed URL. Barcode scanning needs HTTPS or `localhost` (both provided by the dev
server and the deployed site).

## Build

```bash
npm run build      # outputs to dist/
npm run preview    # preview the production build
```

## Deploy (GitHub Pages)

Deployment is automatic via GitHub Actions on every push to `main`.

**One-time setup:** in the repo, go to **Settings → Pages → Build and deployment → Source**
and choose **GitHub Actions**. After the next push, the app is live at the URL above.

> The app is served from the `/CaloTrack/` sub-path (`base` in `vite.config.ts`). If you rename
> the repository, update `base` and the paths in `index.html` to match.

## Your data & backups

Everything is stored locally in your browser (IndexedDB). That keeps it private and free —
but it also means clearing your browser data or switching devices will lose it unless you
**export a backup** (Settings → Export backup). Import the JSON file on any device to restore.

## Icons

App icons are pre-generated in `public/icons/`. To regenerate them from the SVG sources:

```bash
npm install sharp   # one-off
node scripts/gen-icons.mjs
```

## Tech

Svelte 5 · Vite · TypeScript · idb (IndexedDB) · @zxing/browser (barcodes) · vite-plugin-pwa.
No backend, no tracking.
