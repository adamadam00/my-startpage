import { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
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

/* ── SectionCard ──────────────────────────────────────────── */
function SectionCard({ section, links, userId, workspaceId, onRefresh, openInNewTab, overlay = false }) {
  const [collapsed, setCollapsed] = useState(section.collapsed ?? false)
  const [renaming,  setRenaming]  = useState(false)
  const [name,      setName]      = useState(section.name)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id })

  const style = overlay
    ? { opacity: 0.92, boxShadow: '0 8px 32px #0008', cursor: 'grabbing' }
    : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 }

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
        <Links links={links} sectionId={section.id} workspaceId={workspaceId}
          userId={userId} onRefresh={onRefresh} openInNewTab={openInNewTab} />
      )}
      {!collapsed && overlay && (
        <div style={{ padding: '0.3rem var(--card-padding)', fontSize: '0.75em', color: 'var(--text-muted)' }}>
          {links.length} link{links.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

/* ── SectionColumn ────────────────────────────────────────── */
function SectionColumn({ col, colIdx, links, userId, workspaceId, onRefresh, openInNewTab }) {
  const [items,    setItems]    = useState(col)
  const [activeId, setActiveId] = useState(null)

  useEffect(() => { setItems(col) }, [col])

  const activeSection = items.find(s => s.id === activeId) ?? null

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragStart = ({ active }) => setActiveId(active.id)

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const from = items.findIndex(s => s.id === active.id)
    const to   = items.findIndex(s => s.id === over.id)
    if (from === -1 || to === -1 || from === to) return

    const next = arrayMove(items, from, to)
    setItems(next)

    // Save position within this column only
    await Promise.all(
      next.map((s, i) =>
        supabase.from('sections').update({ position: i, col_index: colIdx }).eq('id', s.id)
      )
    )
    onRefresh()
  }

  const handleDragCancel = () => setActiveId(null)

  return (
    <div className="section-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext items={items.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {items.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              links={links.filter(l => l.section_id === section.id)}
              userId={userId}
              workspaceId={workspaceId}
              onRefresh={onRefresh}
              openInNewTab={openInNewTab}
            />
          ))}
        </SortableContext>

        <DragOverlay dropAnimation={{ duration: 150, easing: 'ease' }}>
          {activeSection && (
            <SectionCard
              section={activeSection}
              links={links.filter(l => l.section_id === activeSection.id)}
              userId={userId}
              workspaceId={workspaceId}
              onRefresh={onRefresh}
              openInNewTab={openInNewTab}
              overlay
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

/* ── Root ─────────────────────────────────────────────────── */
export default function Sections({ sections, links, userId, workspaceId, onRefresh, openInNewTab }) {
  const [addingSection, setAddingSection] = useState(false)
  const [newName,       setNewName]       = useState('')
  const [colCount,      setColCount]      = useState(getColCount)

  useEffect(() => {
    const handler = () => setColCount(getColCount())
    window.addEventListener('theme_cols_changed', handler)
    return () => window.removeEventListener('theme_cols_changed', handler)
  }, [])

  const sorted = useMemo(() =>
    [...sections].sort((a, b) => a.position - b.position), [sections]
  )

  // Build columns from saved col_index — no forced even distribution
  const columns = useMemo(() => {
    const cols = Array.from({ length: colCount }, () => [])
    sorted.forEach(s => {
      const ci = (s.col_index ?? 0) % colCount
      cols[ci].push(s)
    })
    return cols
  }, [sorted, colCount])

  const addSection = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    // New sections go into the shortest column
    const shortestCol = columns.reduce((min, col, i) =>
      col.length < columns[min].length ? i : min, 0)
    await supabase.from('sections').insert({
      user_id:    userId,
      workspace_id: workspaceId,
      name:       newName.trim(),
      position:   columns[shortestCol].length,
      col_index:  shortestCol,
      pinned:     false,
      collapsed:  false,
    })
    setNewName('')
    setAddingSection(false)
    onRefresh()
  }

  return (
    <>
      <div className="sections-scroll">
        <div className="sections-grid">
          {columns.map((col, colIdx) => (
            <SectionColumn
              key={colIdx}
              col={col}
              colIdx={colIdx}
              links={links}
              userId={userId}
              workspaceId={workspaceId}
              onRefresh={onRefresh}
              openInNewTab={openInNewTab}
            />
          ))}
        </div>

        {sections.length === 0 && (
          <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', padding: '1rem' }}>
            No sections yet
          </div>
        )}
      </div>

      <div className="add-section-fixed">
        {addingSection ? (
          <form onSubmit={addSection} style={{ display: 'flex', gap: '0.4rem' }}>
            <input className="input" value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Section name" autoFocus style={{ width: 180 }} />
            <button className="btn btn-primary" type="submit">Add</button>
            <button className="btn" type="button"
              onClick={() => { setAddingSection(false); setNewName('') }}>✕</button>
          </form>
        ) : (
          <button className="btn btn-ghost"
            onClick={() => setAddingSection(true)}
            style={{ fontSize: '0.78em', opacity: 0.5, padding: '0.2rem 0.5rem' }}
            title="Add a new section">
            + new section
          </button>
        )}
      </div>
    </>
  )
}