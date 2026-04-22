// ─── CACHE MANAGER ─────────────────────────────────────────────────────────────
// LocalStorage-based caching for instant load times

const CACHE_VERSION = 'v1'
const MAX_AGE = 5 * 60 * 1000 // 5 minutes

const CacheManager = {
  // Save data to cache
  save(key, data) {
    try {
      const cacheKey = `${CACHE_VERSION}_${key}`
      const cacheData = {
        data,
        timestamp: Date.now(),
      }
      localStorage.setItem(cacheKey, JSON.stringify(cacheData))
      return true
    } catch (error) {
      console.error('Cache save failed:', error)
      return false
    }
  },

  // Load data from cache
  load(key, maxAge = MAX_AGE) {
    try {
      const cacheKey = `${CACHE_VERSION}_${key}`
      const cached = localStorage.getItem(cacheKey)
      
      if (!cached) return null

      const { data, timestamp } = JSON.parse(cached)
      const age = Date.now() - timestamp

      // Return data if fresh enough
      if (age < maxAge) {
        return data
      }

      // Cache expired, remove it
      this.clear(key)
      return null
    } catch (error) {
      console.error('Cache load failed:', error)
      return null
    }
  },

  // Clear specific cache entry
  clear(key) {
    try {
      const cacheKey = `${CACHE_VERSION}_${key}`
      localStorage.removeItem(cacheKey)
      return true
    } catch (error) {
      console.error('Cache clear failed:', error)
      return false
    }
  },

  // Clear all cache entries
  clearAll() {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_VERSION)) {
          localStorage.removeItem(key)
        }
      })
      return true
    } catch (error) {
      console.error('Cache clear all failed:', error)
      return false
    }
  },

  // Get cache age in ms
  getAge(key) {
    try {
      const cacheKey = `${CACHE_VERSION}_${key}`
      const cached = localStorage.getItem(cacheKey)
      
      if (!cached) return null

      const { timestamp } = JSON.parse(cached)
      return Date.now() - timestamp
    } catch (error) {
      return null
    }
  },

  // Check if cache exists and is fresh
  isFresh(key, maxAge = MAX_AGE) {
    const age = this.getAge(key)
    return age !== null && age < maxAge
  }
}

export default CacheManager
