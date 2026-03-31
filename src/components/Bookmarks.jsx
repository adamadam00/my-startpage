import { useState } from 'react'
import { supabase } from '../lib/supabase'

function getFavicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` }
  catch { return null }
}

export default function Bookmarks({ items = [], workspaceId, userId, onRefresh }) {
  const [adding, setAdding]   = useState(false)
  const [title, setTitle]     = useState('')
  const [url, setUrl]         = useState('')
  const [loading, setLoading] = useState(false)

  const add = async (e) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    setLoading(true)
    let href = url.trim()
    if (!/^https?:\/\//i.test(href)) href = 'https://' + href
    await supabase.from('bookmarks').insert({
      user_id: userId, workspace_id: workspaceId,
      title: title.trim(), url: href, position: items.length,
    })
    setTitle(''); setUrl(''); setAdding(false); setLoading(false); onRefresh()
  }

  const remove = async (id) => {
    await supabase.from('bookmarks').delete().eq('id', id); onRefresh()
  }

  return (
    <div className="bookmarks-bar">
      {items.map(b => (
        <div key={b.id} className="bookmark-item" title={b.url}>
          <a href={b.url} target="_blank" rel="noopener noreferrer" className="bookmark-link">
            {getFavicon(b.url) && <img src={getFavicon(b.url)} alt="" className="bookmark-favicon" />}
            <span className="bookmark-title">{b.title}</span>
          </a>
          <button className="bookmark-remove" onClick={() => remove(b.id)} title="Remove">×</button>
        </div>
      ))}
      {adding ? (
        <form className="bookmark-add-form" onSubmit={add}>
          <input autoFocus placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input placeholder="https://…" value={url} onChange={e => setUrl(e.target.value)} />
          <button type="submit" disabled={loading}>Add</button>
          <button type="button" onClick={() => setAdding(false)}>✕</button>
        </form>
      ) : (
        <button className="bookmark-add-btn" onClick={() => setAdding(true)}>+ bookmark</button>
      )}
    </div>
  )
}