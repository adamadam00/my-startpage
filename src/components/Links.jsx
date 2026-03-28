import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function getFavicon(url) {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
  } catch { return null }
}

function LinkItem({ link, onEdit, onDelete, openInNewTab }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: link.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const favicon = getFavicon(link.url)

  const handleClick = () => {
    if (openInNewTab) {
      window.open(link.url, '_blank', 'noopener,noreferrer')
    } else {
      window.location.href = link.url
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="link-item">
      <span
        className="drag-handle"
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
      >⠿</span>

      {favicon && (
        <img
          src={favicon}
          alt=""
          className="link-favicon"
          onError={e => { e.target.style.display = 'none' }}
        />
      )}

      <span className="link-title" onClick={handleClick} title={link.url}>
        {link.title}
      </span>

      <button
        className="icon-btn link-action-btn"
        onClick={e => { e.stopPropagation(); onEdit(link) }}
        title="Edit"
      >✎</button>
      <button
        className="icon-btn link-action-btn"
        onClick={e => { e.stopPropagation(); onDelete(link.id) }}
        title="Delete"
      >✕</button>
    </div>
  )
}

export default function Links({
  links       = [],
  sectionId,
  workspaceId,
  userId,
  onRefresh,
  openInNewTab = true,
}) {
  const safeLinks = Array.isArray(links) ? links : []

  const [adding,   setAdding]   = useState(false)
  const [editing,  setEditing]  = useState(null)   // link object
  const [title,    setTitle]    = useState('')
  const [url,      setUrl]      = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  /* ── Add ── */
  const handleAdd = async (e) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    let href = url.trim()
    if (!href.startsWith('http')) href = 'https://' + href
    await supabase.from('links').insert({
      user_id:      userId,
      workspace_id: workspaceId,
      section_id:   sectionId,
      title:        title.trim(),
      url:          href,
      position:     safeLinks.length,
    })
    setTitle(''); setUrl(''); setAdding(false)
    onRefresh()
  }

  /* ── Edit ── */
  const startEdit = (link) => {
    setEditing(link)
    setTitle(link.title)
    setUrl(link.url)
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    let href = url.trim()
    if (!href.startsWith('http')) href = 'https://' + href
    await supabase.from('links').update({ title: title.trim(), url: href }).eq('id', editing.id)
    setEditing(null); setTitle(''); setUrl('')
    onRefresh()
  }

  /* ── Delete ── */
  const handleDelete = async (id) => {
    await supabase.from('links').delete().eq('id', id)
    onRefresh()
  }

  /* ── Drag reorder ── */
  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const from = safeLinks.findIndex(l => l.id === active.id)
    const to   = safeLinks.findIndex(l => l.id === over.id)
    if (from === -1 || to === -1) return
    const next = arrayMove(safeLinks, from, to)
    await Promise.all(
      next.map((l, i) => supabase.from('links').update({ position: i }).eq('id', l.id))
    )
    onRefresh()
  }

  const cancelForm = () => {
    setAdding(false); setEditing(null)
    setTitle(''); setUrl('')
  }

  return (
    <div>
      {/* ── Link list ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={safeLinks.map(l => l.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="links-list">
            {safeLinks.map(link => (
              editing?.id === link.id ? (
                /* Inline edit form */
                <form key={link.id} onSubmit={handleEdit}
                  style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem',
                    padding: '0.2rem 0.3rem' }}>
                  <input className="input" value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Title" autoFocus style={{ fontSize: '0.82em' }} />
                  <input className="input" value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="URL" style={{ fontSize: '0.82em' }} />
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="btn btn-primary" type="submit"
                      style={{ fontSize: '0.75em', flex: 1 }}>Save</button>
                    <button className="btn" type="button"
                      style={{ fontSize: '0.75em' }} onClick={cancelForm}>✕</button>
                  </div>
                </form>
              ) : (
                <LinkItem
                  key={link.id}
                  link={link}
                  onEdit={startEdit}
                  onDelete={handleDelete}
                  openInNewTab={openInNewTab}
                />
              )
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* ── Add form ── */}
      {adding ? (
        <form onSubmit={handleAdd}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem',
            padding: '0.3rem var(--card-padding)' }}>
          <input className="input" value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title" autoFocus style={{ fontSize: '0.82em' }} />
          <input className="input" value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..." style={{ fontSize: '0.82em' }} />
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button className="btn btn-primary" type="submit"
              style={{ fontSize: '0.75em', flex: 1 }}>Add</button>
            <button className="btn" type="button"
              style={{ fontSize: '0.75em' }} onClick={cancelForm}>✕</button>
          </div>
        </form>
      ) : (
        <button
          className="icon-btn add-link-btn"
          onClick={() => setAdding(true)}
          style={{ width: '100%', padding: '0.25rem var(--card-padding)',
            justifyContent: 'flex-start', color: 'var(--text-muted)',
            fontSize: '0.75em' }}
        >
          + add link
        </button>
      )}
    </div>
  )
}