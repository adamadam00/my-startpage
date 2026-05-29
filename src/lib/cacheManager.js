// ─── CACHE MANAGER ─────────────────────────────────────────────────────────────
// LocalStorage-based caching for instant load times

const CACHE_VERSION = 'v1'
const MAX_AGE = 24 * 60 * 60 * 1000 // 24 hours — links/sections don't change often

const CacheManager = {
  save(key, data) {
    try {
      const cacheKey = `${CACHE_VERSION}_${key}`
      localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }))
      return true
    } catch (error) {
      console.error('Cache save failed:', error)
      return false
    }
  },

  // Always return cached data regardless of age — Supabase refreshes in background
  load(key) {
    try {
      const cacheKey = `${CACHE_VERSION}_${key}`
      const cached = localStorage.getItem(cacheKey)
      if (!cached) return null
      const { data } = JSON.parse(cached)
      return data ?? null
    } catch (error) {
      console.error('Cache load failed:', error)
      return null
    }
  },

  clear(key) {
    try {
      localStorage.removeItem(`${CACHE_VERSION}_${key}`)
      return true
    } catch (error) {
      return false
    }
  },

  clearAll() {
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith(CACHE_VERSION)) localStorage.removeItem(key)
      })
      return true
    } catch (error) {
      return false
    }
  },

  getAge(key) {
    try {
      const cached = localStorage.getItem(`${CACHE_VERSION}_${key}`)
      if (!cached) return null
      const { timestamp } = JSON.parse(cached)
      return Date.now() - timestamp
    } catch { return null }
  },

  isFresh(key, maxAge = MAX_AGE) {
    const age = this.getAge(key)
    return age !== null && age < maxAge
  }
}

export default CacheManager
