import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { toast } from './lib/stores';

// Surface otherwise-silent failures (e.g. a storage write that fails on iOS)
// as a visible message instead of a button that appears to do nothing.
function describe(err: unknown): string {
  if (err instanceof Error) return err.message || err.name;
  if (typeof err === 'string') return err;
  return 'Something went wrong.';
}

window.addEventListener('unhandledrejection', (e) => {
  toast(describe(e.reason), 'error');
});
window.addEventListener('error', (e) => {
  if (e.message) toast(`Error: ${e.message}`, 'error');
});

// Purge any stale service worker + caches from earlier builds so an installed
// PWA never runs old code on relaunch (root cause of "nothing saves on close").
(async () => {
  try {
    const regs = await navigator.serviceWorker?.getRegistrations?.();
    if (regs) for (const r of regs) await r.unregister();
    const keys = await caches?.keys?.();
    if (keys) await Promise.all(keys.map((k) => caches.delete(k)));
  } catch {
    /* ignore */
  }
})();

// Ask the browser to keep our data durable (resist eviction on iOS).
try {
  navigator.storage?.persist?.();
} catch {
  /* ignore */
}

// Detect a browser context where storage is blocked entirely (e.g. private
// mode), so the user is told rather than silently losing data.
try {
  const k = 'ct_selftest';
  localStorage.setItem(k, '1');
  if (localStorage.getItem(k) !== '1') throw new Error('read-back failed');
  localStorage.removeItem(k);
} catch {
  toast('Storage is blocked here, so data won’t be saved. Turn off Private Browsing or allow site data.', 'error');
}

const app = mount(App, { target: document.getElementById('app')! });

export default app;
