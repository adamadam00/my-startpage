import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Bookmarks({ items, workspaceId, userId, onRefresh }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const getFavicon = (url) => {
    try {
      const domain = new URL(url).hostname
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    } catch {
      return null
    }
  }

  const add = async (e) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    setLoading(true)
    let href = url.trim()
    if (!href.startsWith('http')) href = 'https://' + href
    await supabase.from('bookmarks').insert({
      user_id: userId,
      workspace_id: workspaceId,
      title: title.trim(),
      url: href,
    })
    setTitle('')
    setUrl('')
    setAdding(false)
    setLoading(false)
    onRefresh()
  }

  const remove = async (id) => {
    await supabase.from('bookmarks').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '11px', letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
          bookmarks
        </span>
        <button onClick={() => setAdding(!adding)} style={ghostBtn}>
          {adding ? '✕' : '+ add'}
        </button>
      </div>

      {adding && (
        <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="title" style={inputSm} />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="url" style={inputSm} />
          <button type="submit" disabled={loading} style={{ ...ghostBtn, background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '6px 12px' }}>
            {loading ? '…' : 'save'}
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {items.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', padding: '8px 0' }}>no bookmarks yet</p>
        )}
        {items.map(b => (
          <div key={b.id} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            transition: 'background 0.15s',
            cursor: 'pointer',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {getFavicon(b.url) && (
              <img src={getFavicon(b.url)} alt="" width={14} height={14} style={{ borderRadius: '2px', flexShrink: 0 }} />
            )}
            <a href={b.url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, color: 'var(--text)', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {b.title}
            </a>
            <button onClick={() => remove(b.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '12px', padding: '0 2px', lineHeight: 1 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

const ghostBtn = {
  background: 'none',
  border: 'none',
  color: 'var(--text-dim)',
  fontSize: '11px',
  fontFamily: 'var(--font-mono)',
  cursor: 'pointer',
  padding: '2px 4px',
}

const inputSm = {
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  padding: '7px 10px',
  color: 'var(--text)',
  fontSize: '12px',
  outline: 'none',
  width: '100%',
}
