import { useState, useEffect, useRef } from 'react'

const ENGINES = [
  { key: 'google', label: 'Google', url: 'https://google.com/search?q=' },
  { key: 'ddg',    label: 'DDG',    url: 'https://duckduckgo.com/?q=' },
  { key: 'yt',     label: 'YouTube', url: 'https://youtube.com/results?search_query=' },
]

export default function SearchBar({ openInNewTab = true }) {
  const [query,  setQuery]  = useState('')
  const [engine, setEngine] = useState('google')
  const inputRef = useRef(null)

  // Press "/" anywhere to focus the search box
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
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
    const eng = ENGINES.find(e => e.key === engine)
    const target = openInNewTab ? '_blank' : '_self'
    window.open(eng.url + encodeURIComponent(query), target)
    setQuery('')
  }

  return (
    <div className="search-wrap">
      <div className="engine-tabs">
        {ENGINES.map(e => (
          <button
            key={e.key}
            className={`engine-tab${engine === e.key ? ' active' : ''}`}
            onClick={() => setEngine(e.key)}
          >
            {e.label}
          </button>
        ))}
      </div>
      <form className="search-row" onSubmit={search}>
        <input
          ref={inputRef}
          className="input search-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder='Search… (press "/" to focus)'
        />
        <button className="btn btn-primary" type="submit">Go</button>
      </form>
    </div>
  )
}