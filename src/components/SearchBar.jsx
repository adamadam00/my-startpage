import { useState } from 'react'

const ENGINES = [
  { key: 'google', label: 'G', url: 'https://google.com/search?q=' },
  { key: 'ddg',    label: 'D', url: 'https://duckduckgo.com/?q=' },
  { key: 'yt',     label: 'Y', url: 'https://youtube.com/results?search_query=' },
]

export default function SearchBar() {
  const [query,  setQuery]  = useState('')
  const [engine, setEngine] = useState('google')

  const search = (e) => {
    e.preventDefault()
    if (!query.trim()) return
    const eng = ENGINES.find(e => e.key === engine)
    window.open(eng.url + encodeURIComponent(query), '_blank')
    setQuery('')
  }

  return (
    <form onSubmit={search} className="search-compact">
      <div className="engine-tabs">
        {ENGINES.map(e => (
          <button key={e.key} type="button"
            className={`engine-tab${engine === e.key ? ' active' : ''}`}
            onClick={() => setEngine(e.key)}>
            {e.label}
          </button>
        ))}
      </div>
      <input
        type="text"
        className="input search-compact-input"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search…"
      />
      <button type="submit" className="btn btn-primary"
        style={{ flexShrink: 0, padding: '0.25rem 0.65rem', alignSelf: 'stretch' }}>
        →
      </button>
    </form>
  )
}