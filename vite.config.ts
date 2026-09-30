import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// Served from https://fenixawiles.github.io/CaloTrack/
const BASE = '/CaloTrack/';

export default defineConfig({
  base: BASE,
  define: {
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  },
  // Build into docs/ so GitHub Pages can serve it via "Deploy from a branch".
  build: {
    outDir: 'docs',
    emptyOutDir: true
  },
  plugins: [
    svelte(),
    VitePWA({
      // Self-destroying SW: ships a worker that unregisters itself and clears
      // all caches. This purges stale code from already-installed iOS PWAs so
      // they always load the latest build (offline caching is off for now —
      // reliability first while the app stabilises).
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'CaloTrack',
        short_name: 'CaloTrack',
        description: 'Free calorie & weight tracker. Your data stays on your device.',
        theme_color: '#0f766e',
        background_color: '#0b1120',
        display: 'standalone',
        orientation: 'portrait',
        scope: BASE,
        start_url: BASE,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Take control immediately and drop old caches so a new deploy never
        // leaves a stale/blank shell behind.
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        navigateFallback: `${BASE}index.html`,
        runtimeCaching: [
          {
            // Open Food Facts lookups: use network, fall back to cache when offline.
            urlPattern: /^https:\/\/world\.openfoodfacts\.org\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'openfoodfacts',
              expiration: { maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ]
});
