import { useState } from 'react'
import { supabase } from '../lib/supabase'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Links from './Links'

// Single draggable section card
function SectionCard({ section, links, userId, workspaceId, onRefresh, openInNewTab }) {
  const [collapsed, setCollapsed] = useState(section.collapsed ?? false)
  const [renaming,  setRenaming]  = useState(false)
  const [name,      setName]      = useState(section.name)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const toggleCollapse = async () => {
    const next = !collapsed
    setCollapsed(next)
    await supabase.from('sections').update({ collapsed: next }).eq('id', section.id)
  }

  const togglePin = async (e) => {
    e.stopPropagation()
    await supabase.from('sections').update({ pinned: !section.pinned }).eq('id', section.id)
    onRefresh()
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

        {/* Drag handle */}
        <span className="drag-handle" {...attributes} {...listeners} onClick={e => e.stopPropagation()}>⠿</span>

        {/* Pin indicator */}
        {section.pinned && <span className="section-pin" title="Pinned">📌</span>}

        {/* Name or rename form */}
        {renaming ? (
          <form onSubmit={rename} onClick={e => e.stopPropagation()} style={{ flex: 1, display: 'flex', gap: '0.4rem' }}>
            <input
              className="input"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
              style={{ flex: 1 }}
            />
            <button className="btn btn-primary" type="submit">Save</button>
            <button className="btn" type="button" onClick={() => setRenaming(false)}>✕</button>
          </form>
        ) : (
          <span className="section-name">{section.name}</span>
        )}

        {/* Actions — only show on hover via CSS opacity */}
        {!renaming && (
          <span style={{ display: 'flex', gap: '0.2rem', opacity: 0 }} className="section-actions">
            <button className="icon-btn" title="Rename"
              onClick={e => { e.stopPropagation(); setRenaming(true) }}>✎</button>
            <button className="icon-btn" title={section.pinned ? 'Unpin' : 'Pin'}
              onClick={togglePin}>📌</button>
            <button className="icon-btn" title="Delete section"
              onClick={deleteSection} style={{ color: 'var(--danger)' }}>✕</button>
          </span>
        )}

        {/* Collapse arrow */}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7em', marginLeft: '0.25rem' }}>
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

// Main Sections component
export default function Sections({ sections, links, userId, workspaceId, onRefresh, openInNewTab }) {
  const [addingSection, setAddingSection] = useState(false)
  const [newName,       setNewName]       = useState('')

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  }))

  // Pinned sections always float to top
  const sorted = [...sections].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return a.position - b.position
  })

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return
    const oldIndex = sorted.findIndex(s => s.id === active.id)
    const newIndex = sorted.findIndex(s => s.id === over.id)
    const reordered = arrayMove(sorted, oldIndex, newIndex)
    // Save new positions to Supabase
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
    const pos = sections.length
    await supabase.from('sections').insert({
      user_id:      userId,
      workspace_id: workspaceId,
      name:         newName.trim(),
      position:     pos,
      pinned:       false,
      collapsed:    false,
    })
    setNewName('')
    setAddingSection(false)
    onRefresh()
  }

  return (
    <div className="sections-wrap">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={sorted.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {sorted.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              links={links.filter(l => l.section_id === section.id).sort((a, b) => a.position - b.position)}
              userId={userId}
              workspaceId={workspaceId}
              onRefresh={onRefresh}
              openInNewTab={openInNewTab}
            />
          ))}
        </SortableContext>
      </DndContext>

      {sections.length === 0 && !addingSection && (
        <div style={{ fontSize: '0.85em', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
          No sections yet — add one below
        </div>
      )}

      {addingSection ? (
        <form onSubmit={addSection} style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="input"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Section name"
            autoFocus
          />
          <button className="btn btn-primary" type="submit">Add</button>
          <button className="btn" type="button" onClick={() => setAddingSection(false)}>✕</button>
        </form>
      ) : (
        <button className="btn btn-ghost" onClick={() => setAddingSection(true)}
          style={{ alignSelf: 'flex-start', fontSize: '0.85em' }}>
          + new section
        </button>
      )}
    </div>
  )
}