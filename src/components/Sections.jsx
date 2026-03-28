import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  DndContext, closestCorners, PointerSensor,
  useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
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

function SectionCard({ section, links, userId, workspaceId, onRefresh, openInNewTab }) {
  const [collapsed, setCollapsed] = useState(section.collapsed ?? false)
  const [renaming,  setRenaming]  = useState(false)
  const [name,      setName]      = useState(section.name)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  }

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
    <div ref={setNodeRef} style={style} className={`section-card${collapsed ? ' collapsed' : ''}`}>
      <div className="section-header" onClick={toggleCollapse}>

        {/* Drag handle on section header */}
        <span
          className="drag-handle"
          {...attributes}
          {...listeners}
          onClick={e => e.stopPropagation()}
          title="Drag to reorder">⠿
        </span>

        {renaming ? (
          <form
            onSubmit={rename}
            onClick={e => e.stopPropagation()}
            style={{ flex: 1, display: 'flex', gap: '0.4rem' }}
          >
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
            <button className="icon-btn" title="Rename section"
              onClick={e => { e.stopPropagation(); setRenaming(true) }}>✎
            </button>
            <button className="icon-btn section-delete-btn" title="Delete section"
              onClick={deleteSection}>✕
            </button>
          </div>
        )}

        <span style={{ color: 'var(--text-muted)', fontSize: '0.7em', marginLeft: '0.15rem', flexShrink: 0 }}>
          {collapsed ? '▶' : '▼'}
        </span>
      </div>

      {!collapsed && (
        <Links
          links={links}
          sectionId={section.id}
          workspaceId={workspaceId}
          userId={userId}
          onRefresh={onRefresh}
          openInNewTab={openInNewTab}
        />
      )}
    </div>
  )
}

export default function Sections({ sections, links, userId, workspaceId, onRefresh, openInNewTab }) {
  const [addingSection, setAddingSection] = useState(false)
  const [newName,       setNewName]       = useState('')
  const [colCount,      setColCount]      = useState(getColCount)
  // Optimistic local ordering — avoids waiting for DB round-trip
  const [localOrder,    setLocalOrder]    = useState(null)

  useEffect(() => {
    const handler = () => setColCount(getColCount())
    window.addEventListener('theme_cols_changed', handler)
    return () => window.removeEventListener('theme_cols_changed', handler)
  }, [])

  // Reset local order when sections prop changes (after onRefresh)
  useEffect(() => { setLocalOrder(null) }, [sections])

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }))

  // Use optimistic local order if available, otherwise fall back to prop
  const base = localOrder ?? [...sections].sort((a, b) => a.position - b.position)

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return

    const oldIndex = base.findIndex(s => s.id === active.id)
    const newIndex = base.findIndex(s => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const reordered = arrayMove(base, oldIndex, newIndex)

    // Optimistic: update UI immediately
    setLocalOrder(reordered)

    // Persist to DB
    await Promise.all(
      reordered.map((s, i) =>
        supabase.from('sections').update({ position: i }).eq('id', s.id)
      )
    )
    onRefresh()
  }

  const addSection = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    await supabase.from('sections').insert({
      user_id: userId, workspace_id: workspaceId,
      name: newName.trim(), position: sections.length,
      pinned: false, collapsed: false,
    })
    setNewName('')
    setAddingSection(false)
    onRefresh()
  }

  return (
    <>
      {/* ── Sections columns ── */}
      <div className="sections-outer">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <SortableContext items={base.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <div className="sections-wrap" style={{ columnCount: colCount }}>
              {base.map(section => (
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
            </div>
          </SortableContext>
        </DndContext>

        {sections.length === 0 && !addingSection && (
          <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', padding: '1rem 0' }}>
            No sections yet — add one below
          </div>
        )}
      </div>

      {/* ── Add section — outside columns, always at bottom ── */}
      <div className="add-section-row">
        {addingSection ? (
          <form onSubmit={addSection} style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="input" value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Section name" autoFocus />
            <button className="btn btn-primary" type="submit">Add</button>
            <button className="btn" type="button" onClick={() => { setAddingSection(false); setNewName('') }}>✕</button>
          </form>
        ) : (
          <button className="btn btn-ghost add-section-btn"
            onClick={() => setAddingSection(true)}
            title="Add a new section"
            style={{ fontSize: '0.85em' }}>
            + new section
          </button>
        )}
      </div>
    </>
  )
}