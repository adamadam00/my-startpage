// ─── Service Worker — Cache-first for assets, stale-while-revalidate for shell ───
const STATIC_CACHE = 'sp-static-v1'
const FONT_CACHE   = 'sp-fonts-v1'

// On install: take control immediately
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// On activate: delete old cache versions, claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== FONT_CACHE)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Never intercept Supabase API calls — always go to network
  if (url.hostname.includes('supabase.co')) return

  // Never intercept non-GET requests
  if (req.method !== 'GET') return

  // Google Fonts — cache first (they never change)
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached
          return fetch(req).then((response) => {
            cache.put(req, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  // Vite hashed assets (/assets/*.js, /assets/*.css) — cache first forever
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          if (cached) return cached
          return fetch(req).then((response) => {
            cache.put(req, response.clone())
            return response
          })
        })
      )
    )
    return
  }

  // App shell (index.html and navigation requests) — stale-while-revalidate
  // Serve the cached version instantly, then update cache in the background
  if (req.mode === 'navigate' || url.pathname === '/') {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const networkFetch = fetch(req)
            .then((response) => {
              cache.put(req, response.clone())
              return response
            })
            .catch(() => cached)
          // Return cached immediately if available, otherwise wait for network
          return cached || networkFetch
        })
      )
    )
    return
  }
})