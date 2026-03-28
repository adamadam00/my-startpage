import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Links from './Links'

function getColCount() {
  try {
    const t = JSON.parse(localStorage.getItem('current_theme') || '{}')
    const n = parseInt(t.sectionsCols)
    return (n >= 1 && n <= 5) ? n : 2
  } catch { return 2 }
}

function buildColumns(sections = [], colCount = 2) {
  const cols   = Math.max(colCount, 1)
  const sorted = [...sections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const allZero = sorted.length > 1 && sorted.every(s => (s.col_index ?? 0) === 0)
  const result  = Array.from({ length: cols }, () => [])
  sorted.forEach((s, i) => {
    const ci = allZero ? i % cols : Math.min(s.col_index ?? 0, cols - 1)
    result[ci].push(s)
  })
  return result
}

/* ── Droppable column shell ── */
function DroppableColumn({ id, children }) {
  const { setNodeRef } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className="section-col" style={{ minHeight: 60 }}>
      {children}
    </div>
  )
}

/* ── SectionCard ── */
function SectionCard({
  section,
  links = [],
  userId,
  workspaceId,
  onRefresh,
  openInNewTab,
  overlay = false,
}) {
  const [collapsed, setCollapsed] = useState(section.collapsed ?? false)
  const [renaming,  setRenaming]  = useState(false)
  const [name,      setName]      = useState(section.name ?? '')

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id })

  const style = overlay
    ? { opacity: 0.92, boxShadow: '0 8px 32px #0008', cursor: 'grabbing' }
    : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 }

  const sectionLinks = Array.isArray(links)
    ? links.filter(l => l.section_id === section.id)
    : []

  const toggleCollapse = async () => {
    const next = !collapsed
    setCollapsed(next)
    await supabase.from('sections').update({ collapsed: next }).eq('id', section.id)
  }

  const rename = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await supabase.from('sections').update({ name: name.trim() }).eq('id', section.id)
    setRenaming(false)
    onRefresh()
  }

  const deleteSection = async (e) => {
    e.stopPropagation()
    if (!confirm(`Delete "${section.name}" and all its links?`)) return
    await supabase.from('links').delete().eq('section_id', section.id)
    await supabase.from('sections').delete().eq('id', section.id)
    onRefresh()
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={style}
      className={`section-card${collapsed ? ' collapsed' : ''}`}
    >
      <div className="section-header" onClick={toggleCollapse}>
        <span
          className="drag-handle"
          {...(overlay ? {} : { ...attributes, ...listeners })}
          onClick={e => e.stopPropagation()}
          title="Drag to reorder"
        >⠿</span>

        {renaming ? (
          <form onSubmit={rename} onClick={e => e.stopPropagation()}
            style={{ flex: 1, display: 'flex', gap: '0.4rem' }}>
            <input className="input" value={name}
              onChange={e => setName(e.target.value)} autoFocus style={{ flex: 1 }} />
            <button className="btn btn-primary" type="submit">Save</button>
            <button className="btn" type="button" onClick={() => setRenaming(false)}>✕</button>
          </form>
        ) : (
          <span className="section-name">{section.name}</span>
        )}

        {!renaming && (
          <div className="section-actions">
            <button className="icon-btn" title="Rename"
              onClick={e => { e.stopPropagation(); setRenaming(true) }}>✎</button>
            <button className="icon-btn section-delete-btn" title="Delete"
              onClick={deleteSection}>✕</button>
          </div>
        )}

        <span style={{ color: 'var(--text-muted)', fontSize: '0.7em', marginLeft: '0.15rem', flexShrink: 0 }}>
          {collapsed ? '▶' : '▼'}
        </span>
      </div>

      {!collapsed && !overlay && (
        <Links
          links={sectionLinks}
          sectionId={section.id}
          workspaceId={workspaceId}
          userId={userId}
          onRefresh={onRefresh}
          openInNewTab={openInNewTab}
        />
      )}
      {!collapsed && overlay && (
        <div style={{ padding: '0.3rem var(--card-padding)', fontSize: '0.75em', color: 'var(--text-muted)' }}>
          {sectionLinks.length} link{sectionLinks.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

/* ── Root ── */
export default function Sections({
  sections = [],
  links    = [],
  userId,
  workspaceId,
  onRefresh,
  openInNewTab,
}) {
  const [addingSection, setAddingSection] = useState(false)
  const [newName,       setNewName]       = useState('')
  const [colCount,      setColCount]      = useState(getColCount)
  const [colItems,      setColItems]      = useState(() => buildColumns(sections, getColCount()))
  const [activeId,      setActiveId]      = useState(null)
  const migrationDone = useRef(false)
  const safeLinks     = Array.isArray(links) ? links : []

  /* Resync columns from DB whenever sections/colCount changes and not mid-drag */
  useEffect(() => {
    if (!activeId) setColItems(buildColumns(sections, colCount))
  }, [sections, colCount])

  /* One-time migration: spread all-zero col_index evenly */
  useEffect(() => {
    if (migrationDone.current || !sections.length || sections.length < 2) return
    const allZero = sections.every(s => (s.col_index ?? 0) === 0)
    if (!allZero) { migrationDone.current = true; return }
    migrationDone.current = true
    const cols   = Math.max(getColCount(), 1)
    const sorted = [...sections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    Promise.all(
      sorted.map((s, i) =>
        supabase.from('sections').update({
          col_index: i % cols,
          position:  Math.floor(i / cols),
        }).eq('id', s.id)
      )
    ).then(() => onRefresh())
  }, [sections])

  useEffect(() => {
    const handler = () => setColCount(getColCount())
    window.addEventListener('theme_cols_changed', handler)
    return () => window.removeEventListener('theme_cols_changed', handler)
  }, [])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const activeSection = activeId
    ? colItems.flat().find(s => s.id === activeId) ?? null
    : null

  const findColIdx = (id, state) => {
    if (typeof id === 'string' && id.startsWith('col-')) return parseInt(id.slice(4))
    for (let i = 0; i < state.length; i++) {
      if (state[i].some(s => s.id === id)) return i
    }
    return null
  }

  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragOver = ({ active, over }) => {
    if (!over || active.id === over.id) return
    setColItems(prev => {
      const fromCol = findColIdx(active.id, prev)
      const toCol   = findColIdx(over.id,   prev)
      if (fromCol === null || toCol === null) return prev

      const next    = prev.map(col => [...col])
      const fromIdx = next[fromCol].findIndex(s => s.id === active.id)
      if (fromIdx === -1) return prev

      if (fromCol === toCol) {
        const toIdx = next[toCol].findIndex(s => s.id === over.id)
        if (toIdx === -1) return prev
        next[fromCol] = arrayMove(next[fromCol], fromIdx, toIdx)
      } else {
        const [moved] = next[fromCol].splice(fromIdx, 1)
        const isColDrop = typeof over.id === 'string' && over.id.startsWith('col-')
        if (isColDrop) {
          next[toCol].push(moved)
        } else {
          const toIdx = next[toCol].findIndex(s => s.id === over.id)
          next[toCol].splice(toIdx === -1 ? next[toCol].length : toIdx, 0, moved)
        }
      }
      return next
    })
  }

  const handleDragEnd = async () => {
    setActiveId(null)
    await Promise.all(
      colItems.flatMap((col, ci) =>
        col.map((s, i) =>
          supabase.from('sections').update({ col_index: ci, position: i }).eq('id', s.id)
        )
      )
    )
    onRefresh()
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setColItems(buildColumns(sections, colCount))
  }

  const addSection = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    const shortestCol = colItems.reduce((min, col, i) =>
      col.length < colItems[min].length ? i : min, 0)
    await supabase.from('sections').insert({
      user_id:      userId,
      workspace_id: workspaceId,
      name:         newName.trim(),
      posi