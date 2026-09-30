# CaloTrack WHOOP proxy (Cloudflare Worker)

A ~90-line Worker that lets the static CaloTrack app talk to the WHOOP API. It
holds your WHOOP **client secret**, performs the OAuth token exchange/refresh,
and proxies read-only WHOOP calls (which also solves CORS). It stores nothing —
your WHOOP tokens live in your browser.

You only need this if you want **automatic workout sync**. Manual entry works
without it.

## 1. Create a WHOOP developer app

1. Go to <https://developer.whoop.com> and sign in with your WHOOP account.
2. Create a new app. Note the **Client ID** and **Client Secret**.
3. Add a **Redirect URL** — exactly your app's URL, including the trailing slash:
   - Production: `https://fenixawiles.github.io/CaloTrack/`
   - Local dev (add this too if testing locally): `http://localhost:5173/CaloTrack/`
4. Request scopes: `read:workout`, `read:body_measurement`, `read:profile`, and
   `offline` (offline is what grants a refresh token).

## 2. Deploy the Worker

You need a free [Cloudflare account](https://dash.cloudflare.com/sign-up).

```bash
cd worker
npx wrangler login                       # opens browser once
npx wrangler secret put WHOOP_CLIENT_ID      # paste your Client ID
npx wrangler secret put WHOOP_CLIENT_SECRET  # paste your Client Secret
npx wrangler deploy
```

`wrangler deploy` prints the Worker URL, e.g.
`https://calotrack-whoop.<your-subdomain>.workers.dev`.

> Edit `ALLOWED_ORIGIN` in `wrangler.toml` if your app isn't at
> `https://fenixawiles.github.io` (then redeploy). `"*"` also works but is less tight.

## 3. Connect in the app

Open CaloTrack → **More → Connect WHOOP**, paste your **Client ID** and the
**Worker URL**, then tap **Connect**. Authorize on WHOOP, and you're returned to
the app. Use **Sync** on the Workouts screen to import recent workouts.

## Free tier

Cloudflare Workers include 100,000 requests/day free — vastly more than a
personal sync needs.
