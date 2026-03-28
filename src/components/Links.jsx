import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch { return null }
}

function EditModal({ link, onSave, onCancel }) {
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
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn" type="button" onClick={onCancel}>Cancel</button>
            <button className="btn btn-primary" type="submit">Save</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddModal({ sectionId, workspaceId, userId, onSave, onCancel }) {
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
      user_id: userId, workspace_id: workspaceId,
      section_id: sectionId, title: title.trim(),
      url: href, position: 9999,
    })
    setLoading(false)
    onSave()
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
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
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

function LinkItem({ link, onDelete, onEdited, openInNewTab }) {
  const [editing, setEditing] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    cursor: isDragging ? 'grabbing' : 'default',
  }

  const favicon = getFavicon(link.url)

  return (
    <>
      {editing && (
        <EditModal
          link={link}
          onSave={() => { setEditing(false); onEdited() }}
          onCancel={() => setEditing(false)}
        />
      )}
      <div ref={setNodeRef} style={style} className="link-item" {...attributes} {...listeners}>

        <span className="drag-handle" title="Drag to reorder">⠿</span>

        {favicon && (
          <img className="link-favicon" src={favicon} alt=""
            onError={e => { e.target.style.display = 'none' }} />
        )}

        <a
          className="link-title"
          href={link.url}
          target={openInNewTab ? '_blank' : '_self'}
          rel="noreferrer"
          title={link.url}
          onPointerDown={e => e.stopPropagation()}
        >
          {link.title}
        </a>

        {/* Edit — grey pencil */}
        <button
          className="icon-btn link-action-btn"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => setEditing(true)}
          title="Edit link">✎
        </button>

        {/* Delete — grey cross, NOT red */}
        <button
          className="icon-btn link-action-btn"
          onPointerDown={e => e.stopPropagation()}
          onClick={() => onDelete(link.id)}
          title="Delete link">✕
        </button>
      </div>
    </>
  )
}

export default function Links({ links, sectionId, workspaceId, userId, onRefresh, openInNewTab }) {
  const [adding, setAdding] = useState(false)

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  }))

  const sorted = [...links].sort((a, b) => a.position - b.position)

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = sorted.findIndex(l => l.id === active.id)
    const newIndex = sorted.findIndex(l => l.id === over.id)
    const reordered = arrayMove(sorted, oldIndex, newIndex)
    await Promise.all(
      reordered.map((l, i) =>
        supabase.from('links').update({ position: i }).eq('id', l.id)
      )
    )
    onRefresh()
  }

  const deleteLink = async (id) => {
    if (!confirm('Delete this link?')) return
    await supabase.from('links').delete().eq('id', id)
    onRefresh()
  }

  return (
    <>
      {adding && (
        <AddModal
          sectionId={sectionId}
          workspaceId={workspaceId}
          userId={userId}
          onSave={() => { setAdding(false); onRefresh() }}
          onCancel={() => setAdding(false)}
        />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="links-list">
            {sorted.length === 0 && (
              <div style={{ fontSize: '0.78em', color: 'var(--text-muted)' }}>no links yet</div>
            )}
            {sorted.map(link => (
              <LinkItem
                key={link.id}
                link={link}
                onDelete={deleteLink}
                onEdited={onRefresh}
                openInNewTab={openInNewTab}
              />
            ))}
            <button
              className="add-link-btn btn-ghost icon-btn"
              onClick={() => setAdding(true)}
              title="Add a link to this section">
              + add link
            </button>
          </div>
        </SortableContext>
      </DndContext>
    </>
  )
}