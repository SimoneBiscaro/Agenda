/* Agenda — service worker. A ogni modifica dell'app shell incrementare CACHE_VERSION
   e APP_VERSION in src/version.js (stesso valore). */
const CACHE_VERSION = '0.1.0';
const SHELL_CACHE = `agenda-shell-${CACHE_VERSION}`;

const SHELL = [
  './',
  './config.js',
  './fonts/atkinson-hyperlegible-latin-400-normal.woff2',
  './fonts/atkinson-hyperlegible-latin-700-normal.woff2',
  './fonts/lora-latin-500-normal.woff2',
  './fonts/lora-latin-600-normal.woff2',
  './icons/icon-maskable.svg',
  './icons/icon.svg',
  './index.html',
  './manifest.webmanifest',
  './src/domain/dates.js',
  './src/main.js',
  './src/router.js',
  './src/store/settings.js',
  './src/store/state.js',
  './src/ui/BigButton.js',
  './src/ui/Binding.js',
  './src/ui/CategoryChip.js',
  './src/ui/ColorPicker.js',
  './src/ui/Confirm.js',
  './src/ui/Header.js',
  './src/ui/PageFlip.js',
  './src/ui/Segmented.js',
  './src/ui/Sheet.js',
  './src/ui/SyncDot.js',
  './src/ui/Toast.js',
  './src/ui/html.js',
  './src/ui/icons.js',
  './src/version.js',
  './src/views/catalogo/CatalogoView.js',
  './src/views/giorno/GiornoView.js',
  './src/views/impostazioni/ImpostazioniView.js',
  './src/views/mese/MeseView.js',
  './src/views/settimana/SettimanaView.js',
  './styles/base.css',
  './styles/components.css',
  './styles/tokens.css',
  './vendor/htm.mjs',
  './vendor/preact-hooks.mjs',
  './vendor/preact.mjs',
];

const scopeUrl = (p) => new URL(p, self.registration.scope).href;
let shellUrls = null;
const isShell = (url) => {
  if (!shellUrls) shellUrls = new Set(SHELL.map(scopeUrl));
  return shellUrls.has(url);
};

self.addEventListener('install', (event) => {
  // cache: 'reload' evita di salvare copie vecchie prese dalla cache HTTP del browser
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      cache.addAll(SHELL.map((p) => new Request(p, { cache: 'reload' })))),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter((k) => k.startsWith('agenda-shell-') && k !== SHELL_CACHE)
      .map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

// La versione nuova si attiva solo quando l'utente tocca "Tocca per aggiornare".
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

async function cacheFirst(request, key) {
  const cache = await caches.open(SHELL_CACHE);
  const hit = await cache.match(key, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) cache.put(key, res.clone());
  return res;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // Supabase: mai in cache

  if (request.mode === 'navigate') {
    event.respondWith(cacheFirst(request, scopeUrl('./index.html')));
    return;
  }
  const clean = `${url.origin}${url.pathname}`;
  if (isShell(clean)) event.respondWith(cacheFirst(request, clean));
});
