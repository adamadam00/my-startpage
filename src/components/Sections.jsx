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
            <button className="icon-btn" title="Rename"
              onClick={e => { e.stopPropagation(); setRenaming(true) }}>✎
            </button>
            <button className="icon-btn section-delete-btn" title="Delete"
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
  const [localOrder,    setLocalOrder]    = useState(null)

  useEffect(() => {
    const handler = () => setColCount(getColCount())
    window.addEventListener('theme_cols_changed', handler)
    return () => window.removeEventListener('theme_cols_changed', handler)
  }, [])

  useEffect(() => { setLocalOrder(null) }, [sections])

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }))

  const base = localOrder ?? [...sections].sort((a, b) => a.position - b.position)

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = base.findIndex(s => s.id === active.id)
    const newIndex = base.findIndex(s => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const reordered = arrayMove(base, oldIndex, newIndex)
    setLocalOrder(reordered)
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
      {/* Columns — nothing after this div, button does NOT live here */}
      <div className="sections-scroll">
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

        {sections.length === 0 && (
          <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', padding: '1rem' }}>
            No sections yet
          </div>
        )}
      </div>

      {/*
        FIXED to bottom-left of viewport — completely outside document flow,
        zero effect on column stacking.
      */}
      <div className="add-section-fixed">
        {addingSection ? (
          <form onSubmit={addSection} style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              className="input"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Section name"
              autoFocus
              style={{ width: 180 }}
            />
            <button className="btn btn-primary" type="submit">Add</button>
            <button className="btn" type="button"
              onClick={() => { setAddingSection(false); setNewName('') }}>✕</button>
          </form>
        ) : (
          <button
            className="btn btn-ghost"
            onClick={() => setAddingSection(true)}
            style={{ fontSize: '0.78em', opacity: 0.5, padding: '0.2rem 0.5rem' }}
            title="Add a new section"
          >
            + new section
          </button>
        )}
      </div>
    </>
  )
}