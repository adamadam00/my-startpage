import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  DndContext, closestCenter, PointerSensor,
  KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

function getFavicon(url) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=32` }
  catch { return null }
}

const SWATCH_COLORS = [
  { label: 'Reset',  value: '' },
  { label: 'Red',    value: '#ff6b6b' },
  { label: 'Orange', value: '#ff9f43' },
  { label: 'Yellow', value: '#ffd32a' },
  { label: 'Green',  value: '#6bffb8' },
  { label: 'Cyan',   value: '#48dbfb' },
  { label: 'Blue',   value: '#6c8fff' },
  { label: 'Purple', value: '#a29bfe' },
  { label: 'Pink',   value: '#fd79a8' },
]

function LinkItem({ link, onEdit, onDelete, openInNewTab, onRefresh }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: link.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const open = () => openInNewTab
    ? window.open(link.url, '_blank', 'noopener,noreferrer')
    : (window.location.href = link.url)
  const [showColors, setShowColors] = useState(false)

  const handleColor = async (color) => {
    await supabase.from('links').update({ color }).eq('id', link.id)
    setShowColors(false)
    onRefresh()
  }

  return (
    <div ref={setNodeRef} style={style} className="link-item">
      <span className="drag-handle" {...attributes} {...listeners} onClick={e => e.stopPropagation()} />
      {getFavicon(link.url) && (
        <img src={getFavicon(link.url)} alt="" className="link-favicon"
          onError={e => e.target.style.display='none'} />
      )}
      <span className="link-title" onClick={open} title={link.url}
        style={link.color ? { color: link.color } : {}}>
        {link.title}
      </span>

      <div className={`link-actions-overlay${showColors ? ' colors-open' : ''}`}>
        {showColors ? (
          <>
            {SWATCH_COLORS.map(c => (
              <button key={c.value || 'reset'} className="color-swatch-inline"
                title={c.label}
                onClick={e => { e.stopPropagation(); handleColor(c.value) }}
                style={{
                  background: c.value || 'linear-gradient(135deg, transparent 0 45%, var(--text-dim) 45% 55%, transparent 55% 100%)',
                  boxShadow: '0 0 0 1px var(--accent)',
                }}
              />
            ))}
            <button className="link-act link-act-del"
              onClick={e => { e.stopPropagation(); setShowColors(false) }}
              title="Close">✕</button>
          </>
        ) : (
          <>
            <button className="link-act link-act-color" title="Set color"
              onClick={e => { e.stopPropagation(); setShowColors(true) }}>●</button>
            <button className="link-act"
              onClick={e => { e.stopPropagation(); onEdit(link) }} title="Edit">✎</button>
            <button className="link-act link-act-del"
              onClick={e => { e.stopPropagation(); onDelete(link.id) }} title="Delete">✕</button>
          </>
        )}
      </div>
    </div>
  )
}

export default function Links({
  links = [],
  sectionId,
  workspaceId,
  userId,
  onRefresh,
  openInNewTab = true,
  externalAdding = false,
  onExternalAddingDone,
}) {
  const safeLinks = Array.isArray(links) ? links : []
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(null)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')

  useEffect(() => {
    if (externalAdding) setAdding(true)
  }, [externalAdding])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const closeForm = () => {
    setAdding(false); setEditing(null)
    setTitle(''); setUrl('')
    onExternalAddingDone?.()
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    let href = url.trim()
    if (!href.startsWith('http')) href = 'https://' + href
    await supabase.from('links').insert({
      user_id: userId, workspace_id: workspaceId, section_id: sectionId,
      title: title.trim(), url: href, position: safeLinks.length,
    })
    setTitle(''); setUrl(''); setAdding(false)
    onExternalAddingDone?.(); onRefresh()
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    let href = url.trim()
    if (!href.startsWith('http')) href = 'https://' + href
    await supabase.from('links').update({ title: title.trim(), url: href }).eq('id', editing.id)
    closeForm(); onRefresh()
  }

  const handleDelete = async (id) => {
    await supabase.from('links').delete().eq('id', id)
    onRefresh()
  }

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const from = safeLinks.findIndex(l => l.id === active.id)
    const to = safeLinks.findIndex(l => l.id === over.id)
    if (from === -1 || to === -1) return
    const next = arrayMove(safeLinks, from, to)
    await Promise.all(next.map((l, i) => supabase.from('links').update({ position: i }).eq('id', l.id)))
    onRefresh()
  }

  const formStyle = {
    display: 'flex', flexDirection: 'column', gap: '0.3rem',
    padding: `0.3rem var(--card-padding, 0.75rem) 0.4rem`,
  }

  return (
    <div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={safeLinks.map(l => l.id)} strategy={verticalListSortingStrategy}>
          <div className="links-list">
            {safeLinks.map(link =>
              editing?.id === link.id ? (
                <form key={link.id} onSubmit={handleEdit} style={formStyle}>
                  <input className="input" value={title} onChange={e => setTitle(e.target.value)}
                    placeholder="Title" autoFocus style={{ fontSize: '0.82em' }} />
                  <input className="input" value={url} onChange={e => setUrl(e.target.value)}
                    placeholder="URL" style={{ fontSize: '0.82em' }} />
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button className="btn btn-primary" type="submit" style={{ flex: 1, fontSize: '0.75em' }}>Save</button>
                    <button className="btn" type="button" style={{ fontSize: '0.75em' }} onClick={closeForm}>Cancel</button>
                  </div>
                </form>
              ) : (
                <LinkItem key={link.id} link={link}
                  onEdit={l => { setEditing(l); setTitle(l.title); setUrl(l.url) }}
                  onDelete={handleDelete} openInNewTab={openInNewTab} onRefresh={onRefresh} />
              )
            )}
          </div>
        </SortableContext>
      </DndContext>
      {adding && !editing && (
        <form onSubmit={handleAdd} style={formStyle}>
          <input className="input" value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Title" autoFocus style={{ fontSize: '0.82em' }} />
          <input className="input" value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://…" style={{ fontSize: '0.82em' }} />
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            <button className="btn btn-primary" type="submit" style={{ flex: 1, fontSize: '0.75em' }}>Add</button>
            <button className="btn" type="button" style={{ fontSize: '0.75em' }} onClick={closeForm}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}