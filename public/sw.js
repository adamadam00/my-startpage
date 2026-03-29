const CACHE_NAME = 'newtab-cache-v1'

// On install: cache the app shell immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(['/', '/index.html']))
      .then(() => self.skipWaiting())
  )
})

// On activate: delete any old cache versions
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// Fetch strategy:
//   - Skip: Supabase, weather API, favicons (always live)
//   - JS/CSS/fonts: cache-first (Vite hashes filenames so stale is never an issue)
//   - HTML / navigate: network-first so deploys are picked up, fall back to cache
self.addEventListener('fetch', e => {
  const url = e.request.url

  // Always live — never cache these
  if (
    url.includes('supabase.co')       ||
    url.includes('open-meteo.com')    ||
    url.includes('fonts.googleapis.com') ||
    url.includes('fonts.gstatic.com') ||
    url.includes('google.com/s2/favicons')
  ) return

  // HTML / navigation — network first, cache fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
          return res
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  // Static assets (JS, CSS, images, woff2) — cache first
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type === 'opaque') return res
        const clone = res.clone()
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone))
        return res
      })
    })
  )
})

// Listen for a skip-waiting message from the settings "Refresh cache" button
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting()
})