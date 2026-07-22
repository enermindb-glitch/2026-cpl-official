/* ==========================================================
   sw.js — service worker for the Chuka Premier League PWA.
   Caches the app shell so the site can install and reopen
   offline; falls through to the network for everything else
   (so live Google Sheets data still stays fresh).
   ========================================================== */

const CPL_CACHE = 'cpl-shell-v2';

// Bump CPL_CACHE (e.g. -> 'cpl-shell-v3') whenever you change any of
// these files so returning visitors get the update. Every page and
// script in the site is listed here (not just a curated subset) so the
// whole site — not only the homepage — works offline after a single
// visit, including team/player profile pages, the admin dashboard, and
// My Profile. Live data (Google Sheets CSV, Apps Script POSTs) is never
// cached here — see the fetch handler below and data.js's own
// localStorage fallback for that.
const SHELL_FILES = [
  // Pages
  'index.html', 'about.html', 'admin.html', 'enquiries.html',
  'equipment.html', 'gallery.html', 'league-a.html', 'league-b.html',
  'login.html', 'my-profile.html', 'news.html', 'officials.html',
  'player.html', 'players.html', 'referees.html', 'register.html',
  'register-official.html', 'register-player.html', 'register-referee.html',
  'register-team.html', 'team.html', 'transfers.html', 'verify.html',
  // Scripts
  'admin.js', 'auth.js', 'card.js', 'data.js', 'enquiries.js',
  'equipment.js', 'fixtures.js', 'gallery.js', 'layout.js',
  'my-profile.js', 'officials.js', 'player.js', 'players-directory.js',
  'profile-edit.js', 'referees.js', 'registrations.js', 'standings.js',
  'teams.js', 'transfers.js', 'verify.js',
  // Styles / manifest
  'styles.css', 'manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CPL_CACHE).then((cache) => {
      // cache files individually so one missing/renamed page
      // doesn't fail the whole install
      return Promise.all(
        SHELL_FILES.map((file) =>
          cache.add(file).catch((err) => console.warn('SW: skip', file, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CPL_CACHE).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Let live data (Google Sheets / apps-script calls, or any
  // other-origin request) always go to the network as normal.
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CPL_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached); // offline: fall back to cache

      // cache-first for instant loads, but refresh cache in background
      return cached || network;
    })
  );
});
