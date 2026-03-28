import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch { return null }
}

// Single draggable link row
function LinkItem({ link, onDelete, onEdit, openInNewTab }) {
  const [editing, setEditing] = useState(false)
  const [title,   setTitle]   = useState(link.title)
  const [url,     setUrl]     = useState(link.url)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const save = async (e) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    let href = url.trim()
    if (!href.startsWith('http')) href = 'https://' + href
    await supabase.from('links').update({ title: title.trim(), url: href }).eq('id', link.id)
    setEditing(false)
    onEdit()
  }

  if (editing) {
    return (
      <form onSubmit={save} style={{ display: 'flex', gap: '0.4rem', padding: '0.35rem 0' }}>
        <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" style={{ flex: 1 }} />
        <input className="input" value={url}   onChange={e => setUrl(e.target.value)}   placeholder="URL"   style={{ flex: 2 }} />
        <button className="btn btn-primary" type="submit">Save</button>
        <button className="btn" type="button" onClick={() => setEditing(false)}>✕</button>
      </form>
    )
  }

  const favicon = getFavicon(link.url)

  return (
    <div ref={setNodeRef} style={style} className="link-item">
      <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      {favicon && <img className="link-favicon" src={favicon} alt="" onError={e => e.target.style.display='none'} />}
      <a
        className="link-title"
        href={link.url}
        target={openInNewTab ? '_blank' : '_self'}
        rel="noreferrer"
      >
        {link.title}
      </a>
      <button className="link-delete icon-btn" onClick={() => setEditing(true)} title="Edit">✎</button>
      <button className="link-delete icon-btn" onClick={() => onDelete(link.id)} title="Delete">✕</button>
    </div>
  )
}

// Add link form
function AddLink({ sectionId, workspaceId, userId, onRefresh, onCancel }) {
  const [title, setTitle] = useState('')
  const [url,   setUrl]   = useState('')
  const [loading, setLoading] = useState(false)

  const add = async (e) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    setLoading(true)
    let href = url.trim()
    if (!href.startsWith('http')) href = 'https://' + href
    await supabase.from('links').insert({
      user_id:      userId,
      workspace_id: workspaceId,
      section_id:   sectionId,
      title:        title.trim(),
      url:          href,
      position:     9999,
    })
    setLoading(false)
    onRefresh()
    onCancel()
  }

  return (
    <form onSubmit={add} style={{ display: 'flex', gap: '0.4rem', padding: '0.35rem 0' }}>
      <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" style={{ flex: 1 }} autoFocus />
      <input className="input" value={url}   onChange={e => setUrl(e.target.value)}   placeholder="URL"   style={{ flex: 2 }} />
      <button className="btn btn-primary" type="submit" disabled={loading}>
        {loading ? '…' : 'Add'}
      </button>
      <button className="btn" type="button" onClick={onCancel}>✕</button>
    </form>
  )
}

// Exported links list for a section
export default function Links({ links, sectionId, workspaceId, userId, onRefresh, openInNewTab }) {
  const [adding, setAdding] = useState(false)

  const deleteLink = async (id) => {
    await supabase.from('links').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="links-list">
      {links.length === 0 && !adding && (
        <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', padding: '0.25rem 0' }}>
          no links yet
        </div>
      )}

      {links.map(link => (
        <LinkItem
          key={link.id}
          link={link}
          onDelete={deleteLink}
          onEdit={onRefresh}
          openInNewTab={openInNewTab}
        />
      ))}

      {adding
        ? <AddLink
            sectionId={sectionId}
            workspaceId={workspaceId}
            userId={userId}
            onRefresh={onRefresh}
            onCancel={() => setAdding(false)}
          />
        : <button className="btn-ghost icon-btn" onClick={() => setAdding(true)}
            style={{ fontSize: '0.8em', marginTop: '0.1rem' }}>
            + add link
          </button>
      }
    </div>
  )
}