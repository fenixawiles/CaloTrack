// CaloTrack ↔ WHOOP proxy (Cloudflare Worker)
//
// The ONLY component that holds your WHOOP client secret. It:
//   1. exchanges an OAuth code for tokens         (POST /auth/token)
//   2. refreshes an expired access token          (POST /auth/refresh)
//   3. proxies read-only WHOOP API calls + CORS   (GET  /whoop/<path>)
//
// Your WHOOP tokens are returned to the browser and stored there — this Worker
// keeps no state and no database.
//
// Required secrets/vars (see worker/README.md):
//   WHOOP_CLIENT_ID       (secret)
//   WHOOP_CLIENT_SECRET   (secret)
//   ALLOWED_ORIGIN        (var, e.g. https://fenixawiles.github.io) — or "*"

const WHOOP_TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token';
const WHOOP_API_BASE = 'https://api.prod.whoop.com/developer';

function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

function json(body, env, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) }
  });
}

async function exchange(params, env) {
  const body = new URLSearchParams({
    ...params,
    client_id: env.WHOOP_CLIENT_ID,
    client_secret: env.WHOOP_CLIENT_SECRET
  });
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const text = await res.text();
  return new Response(text, {
    status: res.status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) }
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }

    // 1. Authorization code → tokens
    if (pathname === '/auth/token' && request.method === 'POST') {
      const { code, redirect_uri } = await request.json().catch(() => ({}));
      if (!code || !redirect_uri) return json({ error: 'missing code/redirect_uri' }, env, 400);
      return exchange({ grant_type: 'authorization_code', code, redirect_uri }, env);
    }

    // 2. Refresh token → new tokens
    if (pathname === '/auth/refresh' && request.method === 'POST') {
      const { refresh_token } = await request.json().catch(() => ({}));
      if (!refresh_token) return json({ error: 'missing refresh_token' }, env, 400);
      return exchange({ grant_type: 'refresh_token', refresh_token, scope: 'offline' }, env);
    }

    // 3. Proxy read-only WHOOP API calls
    if (pathname.startsWith('/whoop/') && request.method === 'GET') {
      const auth = request.headers.get('Authorization');
      if (!auth) return json({ error: 'missing Authorization' }, env, 401);
      const target = `${WHOOP_API_BASE}/${pathname.slice('/whoop/'.length)}${url.search}`;
      const res = await fetch(target, { headers: { Authorization: auth } });
      const text = await res.text();
      return new Response(text, {
        status: res.status,
        headers: { 'Content-Type': 'application/json', ...corsHeaders(env) }
      });
    }

    return json({ error: 'not found' }, env, 404);
  }
};
