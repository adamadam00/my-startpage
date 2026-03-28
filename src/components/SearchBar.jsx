import { useState, useEffect, useRef } from 'react'

const DEFAULT_SEARCH_URL = 'https://www.google.com.au/search?q='

export default function SearchBar({ openInNewTab = true, compact = false }) {
  const [query,     setQuery]     = useState('')
  const [searchUrl, setSearchUrl] = useState(
    () => localStorage.getItem('search_url') || DEFAULT_SEARCH_URL
  )
  const inputRef = useRef()

  // Listen for search URL changes from Settings
  useEffect(() => {
    const handler = () => {
      setSearchUrl(localStorage.getItem('search_url') || DEFAULT_SEARCH_URL)
    }
    window.addEventListener('search_url_changed', handler)
    return () => window.removeEventListener('search_url_changed', handler)
  }, [])

  // Press / to focus
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' &&
          document.activeElement.tagName !== 'INPUT' &&
          document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const search = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    const url = searchUrl + encodeURIComponent(query.trim())
    if (openInNewTab) window.open(url, '_blank')
    else window.location.href = url
    setQuery('')
  }

  if (compact) {
    return (
      <form onSubmit={search} className="search-compact" title="Search (press / to focus)">
        <input
          ref={inputRef}
          className="input search-compact-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search… ( / )"
        />
      </form>
    )
  }

  return (
    <form onSubmit={search} className="search-wrap">
      <div className="search-row">
        <input
          ref={inputRef}
          className="input search-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search… (press / to focus)"
        />
        <button className="btn btn-primary" type="submit" title="Search">→</button>
      </div>
    </form>
  )
}