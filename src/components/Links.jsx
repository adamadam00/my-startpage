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

// Rename modal
function RenameModal({ link, onSave, onCancel }) {
  const [title, setTitle] = useState(link.title)
  const [url,   setUrl]   = useState(link.url)

  const save = async (e) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    let href = url.trim()
    if (!href.startsWith('http')) href = 'https://' + href
    await supabase.from('links').update({ title: title.trim(), url: href }).eq('id', link.id)
    onSave()
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Edit Link</div>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div>
            <label className="modal-label">Title</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="modal-label">URL</label>
            <input className="input" value={url} onChange={e => setUrl(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button className="btn" type="button" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary" type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function LinkItem({ link, onDelete, onEdit, openInNewTab }) {
  const [editing, setEditing] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const favicon = getFavicon(link.url)

  return (
    <>
      {editing && (
        <RenameModal
          link={link}
          onSave={() => { setEditing(false); onEdit() }}
          onCancel={() => setEditing(false)}
        />
      )}
      <div ref={setNodeRef} style={style} className="link-item">
        <span className="drag-handle" {...attributes} {...listeners} title="Drag to reorder">⠿</span>
        {favicon && (
          <img
            className="link-favicon"
            src={favicon}
            alt=""
            onError={e => e.target.style.display = 'none'}
          />
        )}
        <a
          className="link-title"
          href={link.url}
          target={openInNewTab ? '_blank' : '_self'}
          rel="noreferrer"
          title={link.url}
        >
          {link.title}
        </a>
        <button
          className="link-delete icon-btn"
          onClick={() => setEditing(true)}
          title="Edit link">✎
        </button>
        <button
          className="link-delete icon-btn"
          onClick={() => onDelete(link.id)}
          title="Delete link"
          style={{ color: 'var(--danger)' }}>✕
        </button>
      </div>
    </>
  )
}

function AddLink({ sectionId, workspaceId, userId, onRefresh, onCancel }) {
  const [title,   setTitle]   = useState('')
  const [url,     setUrl]     = useState('')
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
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-title">Add Link</div>
        <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div>
            <label className="modal-label">Title</label>
            <input className="input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Google" autoFocus />
          </div>
          <div>
            <label className="modal-label">URL</label>
            <input className="input" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://google.com" />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.25rem' }}>
            <button className="btn" type="button" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={loading}>
              {loading ? '…' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Links({ links, sectionId, workspaceId, userId, onRefresh, openInNewTab }) {
  const [adding, setAdding] = useState(false)

  const deleteLink = async (id) => {
    if (!confirm('Delete this link?')) return
    await supabase.from('links').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="links-list">
      {links.length === 0 && !adding && (
        <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', padding: '0.1rem 0' }}>
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

      {adding && (
        <AddLink
          sectionId={sectionId}
          workspaceId={workspaceId}
          userId={userId}
          onRefresh={onRefresh}
          onCancel={() => setAdding(false)}
        />
      )}

      <button
        className="add-link-btn btn-ghost icon-btn"
        onClick={() => setAdding(true)}
        title="Add a link to this section"
        style={{ fontSize: '0.78em', marginTop: '0.1rem' }}
      >
        + add link
      </button>
    </div>
  )
}