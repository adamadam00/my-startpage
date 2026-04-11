import { useState } from 'react'

export default function SearchBar({ searchUrl = 'https://google.com/search?q=' }) {
  const [query, setQuery] = useState('')

  const search = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    window.open(searchUrl + encodeURIComponent(query), '_blank')
    setQuery('')
  }

  return (
    <form onSubmit={search} className="search-compact">
      <input
        type="text"
        className="input search-compact-input"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search…"
        autoComplete="off"
      />
      <button type="submit" className="btn btn-primary search-btn">→</button>
    </form>
  )
}
 