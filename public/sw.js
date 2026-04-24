// Startpage Service Worker
const CACHE = 'startpage-v1'

// On install — cache the app shell immediately
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(['/']))
      .then(() => self.skipWaiting())
  )
})
 
// On activate — drop old caches
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Fetch strategy:
// - Weather API: network-first (fresh data preferred), fall back to cache
// - Supabase/auth: network only (never serve stale auth)  
// - Everything else (JS/CSS/HTML): cache-first, revalidate in background
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url)

  // Skip non-GET and browser-extension requests
  if (e.request.method !== 'GET') return
  if (!url.protocol.startsWith('http')) return

  // Supabase + auth + API functions — always network, never cache
  if (url.hostname.includes('supabase') || url.pathname.includes('/auth/') || url.pathname.startsWith('/api/')) {
    return  // let it fall through to network
  }

  // Weather API — network first with 4s timeout, fall back to cache
  if (url.hostname.includes('open-meteo.com')) {
    e.respondWith(
      Promise.race([
        fetch(e.request).then(res => {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()))
          return res
        }),
        new Promise((_, rej) => setTimeout(() => rej('timeout'), 4000))
      ]).catch(() => caches.match(e.request))
    )
    return
  }

  // App shell + assets — cache first, update in background (stale-while-revalidate)
  e.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(e.request)
      const fetchPromise = fetch(e.request).then(res => {
        if (res.ok) cache.put(e.request, res.clone())
        return res
      }).catch(() => cached)

      return cached || fetchPromise
    })
  )
})