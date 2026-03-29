import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import {
  DndContext, closestCenter,
  PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Links from './Links'

/* ─────────────────────────────────────────
   A Fine Start parser
───────────────────────────────────────── */
function parseAFineStart(raw) {
  let data
  try { data = JSON.parse(raw) }
  catch { throw new Error('Not valid JSON — paste the export code exactly.') }

  const extractBookmarks = (bms = []) =>
    bms.map(b => ({ title: b.name || b.title || 'Link', url: b.url || b.href || '' }))
       .filter(b => b.url)

  const groups = []

  if (Array.isArray(data) && data.every(i => Array.isArray(i))) {
    data.forEach(col => col.forEach(g => {
      if (g?.name) groups.push({ name: g.name, links: extractBookmarks(g.bookmarks) })
    }))
    if (groups.length) return groups
  }
  if (Array.isArray(data) && data[0]?.name) {
    data.forEach(g => {
      if (g?.name) groups.push({ name: g.name, links: extractBookmarks(g.bookmarks || g.links) })
    })
    if (groups.length) return groups
  }
  const root = data.columns || data.groups || data.data || null
  if (Array.isArray(root)) {
    root.forEach(item => {
      if (Array.isArray(item)) item.forEach(g => {
        if (g?.name) groups.push({ name: g.name, links: extractBookmarks(g.bookmarks) })
      })
      else if (item?.name)
        groups.push({ name: item.name, links: extractBookmarks(item.bookmarks || item.links) })
    })
    if (groups.length) return groups
  }
  const walk = node => {
    if (!node || typeof node !== 'object') return
    const bms = node.bookmarks || node.links || node.items
    if ((node.name || node.title) && Array.isArray(bms)) {
      groups.push({ name: node.name || node.title, links: extractBookmarks(bms) }); return
    }
    ;(Array.isArray(node) ? node : Object.values(node)).forEach(walk)
  }
  walk(data)
  if (groups.length) return groups
  throw new Error(`No groups found. Keys: ${Object.keys(data).join(', ')}`)
}

/* ─────────────────────────────────────────
   Build columns from server data
───────────────────────────────────────── */
function buildColumns(sections = [], colCount = 2) {
  const cols   = Math.max(colCount, 1)
  const result = Array.from({ length: cols }, () => [])
  const sorted = [...sections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const allZero = sorted.length > 0 && sorted.every(s => (s.col_index ?? 0) === 0)

  sorted.forEach((s, i) => {
    const ci = allZero
      ? i % cols
      : Math.min(Math.max(s.col_index ?? 0, 0), cols - 1)
    result[ci].push(s)
  })
  return result
}

/* ─────────────────────────────────────────
   Section card
───────────────────────────────────────── */
function SectionCard({ section, links, userId, workspaceId, onRefresh, openInNewTab }) {
  const [collapsed,  setCollapsed]  = useState(section.collapsed ?? false)
  const [renaming,   setRenaming]   = useState(false)
  const [name,       setName]       = useState(section.name ?? '')
  const [addingLink, setAddingLink] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity:   isDragging ? 0.35 : 1,
    position:  'relative',
    zIndex:    isDragging ? 20 : 'auto',
  }

  const sectionLinks = links.filter(l => l.section_id === section.id)

  const toggleCollapse = async () => {
    const next = !collapsed; setCollapsed(next)
    await supabase.from('sections').update({ collapsed: next }).eq('id', section.id)
  }

  const rename = async e => {
    e.preventDefault()
    if (!name.trim()) return
    await supabase.from('sections').update({ name: name.trim() }).eq('id', section.id)
    setRenaming(false); onRefresh()
  }

  const deleteSection = async e => {
    e.stopPropagation()
    if (!confirm(`Delete "${section.name}" and all its links?`)) return
    await supabase.from('links').delete().eq('section_id', section.id)
    await supabase.from('sections').delete().eq('id', section.id)
    onRefresh()
  }

  return (
    <div ref={setNodeRef} style={style}
      className={`section-card${collapsed ? ' collapsed' : ''}`}>

      <div className="section-header" onClick={toggleCollapse}>
        <span className="drag-handle" {...attributes} {...listeners}
          onClick={e => e.stopPropagation()} title="Drag to reorder">⠿</span>

        {renaming ? (
          <form onSubmit={rename} onClick={e => e.stopPropagation()}
            style={{ flex: 1, display: 'flex', gap: '0.35rem' }}>
            <input className="input" value={name} onChange={e => setName(e.target.value)}
              autoFocus style={{ flex: 1, fontSize: '0.82em' }} />
            <button className="btn btn-primary" type="submit" style={{ fontSize: '0.75em' }}>Save</button>
            <button className="btn" type="button" style={{ fontSize: '0.75em' }}
              onClick={() => setRenaming(false)}>Cancel</button>
          </form>
        ) : (
          <span className="section-name">{section.name}</span>
        )}

        {!renaming && (
          <div className="section-actions">
            <button className="icon-btn" title="Add link"
              onClick={e => { e.stopPropagation(); setCollapsed(false); setAddingLink(true) }}>+</button>
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

      {!collapsed && (
        <Links
          links={sectionLinks}
          sectionId={section.id}
          workspaceId={workspaceId}
          userId={userId}
          onRefresh={onRefresh}
          openInNewTab={openInNewTab}
          externalAdding={addingLink}
          onExternalAddingDone={() => setAddingLink(false)}
        />
      )}
    </div>
  )
}

/* ─────────────────────────────────────────
   Independent column — owns its own state.
   NEVER calls onRefresh on drag — optimistic
   local update only, then silent DB persist.
───────────────────────────────────────── */
function SectionColumn({ initialItems, colIndex, links, userId, workspaceId, onRefresh, openInNewTab }) {
  // Local state — this is the source of truth for order during a session
  const [items, setItems] = useState(initialItems)

  // Only sync from parent when sections are added or deleted (length changes
  // or IDs change) — never let a post-drag refresh reorder us
  const itemIds     = initialItems.map(s => s.id).join(',')
  const prevIdsRef  = useState(() => itemIds)[0]

  useEffect(() => {
    // Rebuild local state only when the set of IDs actually changes
    setItems(
      [...initialItems].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemIds])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return

    const from = items.findIndex(s => s.id === active.id)
    const to   = items.findIndex(s => s.id === over.id)
    if (from === -1 || to === -1) return

    // 1. Update local state immediately — UI snaps into place
    const next = arrayMove(items, from, to)
    setItems(next)

    // 2. Persist to DB silently — do NOT call onRefresh()
    //    onRefresh would re-fetch and re-sort, fighting our local state
    await Promise.all(
      next.map((s, i) =>
        supabase.from('sections')
          .update({ position: i, col_index: colIndex })
          .eq('id', s.id)
      )
    )
  }

  return (
    <div className="section-col">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}>
        <SortableContext items={items.map(s => s.id)} strategy={verticalListSortingStrategy}>
          {items.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              links={links}
              userId={userId}
              workspaceId={workspaceId}
              onRefresh={onRefresh}
              openInNewTab={openInNewTab}
            />
          ))}
        </SortableContext>
      </DndContext>
    </div>
  )
}

/* ─────────────────────────────────────────
   Main Sections component
───────────────────────────────────────── */
export default function Sections({
  sections      = [],
  links         = [],
  userId,
  workspaceId,
  onRefresh,
  openInNewTab  = true,
  colCount      = 2,
  triggerAdd    = 0,
  triggerImport = 0,
}) {
  const [addingSection, setAddingSection] = useState(false)
  const [newName,       setNewName]       = useState('')
  const [showImport,    setShowImport]    = useState(false)
  const [importText,    setImportText]    = useState('')
  const [importError,   setImportError]   = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importDone,    setImportDone]    = useState(false)

  const safeLinks = Array.isArray(links) ? links : []

  useEffect(() => { if (triggerAdd    > 0) setAddingSection(true) }, [triggerAdd])
  useEffect(() => {
    if (triggerImport > 0) { setShowImport(true); setImportError(''); setImportDone(false) }
  }, [triggerImport])

  const addSection = async e => {
    e.preventDefault()
    if (!newName.trim()) return
    const cols     = buildColumns(sections, colCount)
    const shortest = cols.reduce((best, col, i) => col.length < cols[best].length ? i : best, 0)
    await supabase.from('sections').insert({
      user_id: userId, workspace_id: workspaceId,
      name: newName.trim(),
      position:  cols[shortest].length,
      col_index: shortest,
    })
    setNewName(''); setAddingSection(false); onRefresh()
  }

  const runImport = async () => {
    setImportError(''); setImportLoading(true)
    try {
      const groups = parseAFineStart(importText.trim())
      if (!groups.length) throw new Error('No groups found.')

      for (const g of groups) {
        const cols = buildColumns(sections, colCount)
        const ci   = cols.reduce((best, col, i) => col.length < cols[best].length ? i : best, 0)
        const { data: sec, error: secErr } = await supabase
          .from('sections')
          .insert({
            user_id: userId, workspace_id: workspaceId,
            name: g.name, position: cols[ci].length, col_index: ci,
          })
          .select().single()
        if (secErr) throw new Error(secErr.message)
        if (g.links.length)
          await supabase.from('links').insert(
            g.links.map((lnk, li) => ({
              user_id: userId, workspace_id: workspaceId,
              section_id: sec.id, title: lnk.title, url: lnk.url, position: li,
            }))
          )
      }
      setImportDone(true); onRefresh()
      setTimeout(() => { setShowImport(false); setImportText(''); setImportDone(false) }, 1800)
    } catch (err) {
      setImportError(err.message)
    } finally {
      setImportLoading(false)
    }
  }

  const colItemsList = buildColumns(sections, colCount)

  return (
    <div style={{ width: '100%' }}>

      <div className="sections-grid">
        {colItemsList.map((col, ci) => (
          <SectionColumn
            key={ci}
            initialItems={col}
            colIndex={ci}
            links={safeLinks}
            userId={userId}
            workspaceId={workspaceId}
            onRefresh={onRefresh}
            openInNewTab={openInNewTab}
          />
        ))}
      </div>

      {addingSection && (
        <div className="add-section-fixed">
          <form onSubmit={addSection} style={{ display: 'flex', gap: '0.4rem' }}>
            <input className="input" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Section name" autoFocus style={{ width: 150, fontSize: '0.82em' }} />
            <button className="btn btn-primary" type="submit" style={{ fontSize: '0.82em' }}>Add</button>
            <button className="btn" type="button" style={{ fontSize: '0.82em' }}
              onClick={() => { setAddingSection(false); setNewName('') }}>✕</button>
          </form>
        </div>
      )}

      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, fontSize: '0.95em' }}>Import from A Fine Start</span>
              <button className="icon-btn" onClick={() => setShowImport(false)}>✕</button>
            </div>

            <div style={{ fontSize: '0.8em', color: 'var(--text-dim)', lineHeight: 1.55 }}>
              In A Fine Start go to <strong>Settings → Export bookmarks</strong>, copy
              the entire code block, then paste it below.
            </div>

            <textarea
              value={importText}
              onChange={e => { setImportText(e.target.value); setImportError('') }}
              placeholder="Paste A Fine Start export code here…"
              style={{
                width: '100%', minHeight: 140, resize: 'vertical',
                background: 'var(--bg3)', color: 'var(--text)',
                border: `1px solid ${importError ? 'var(--danger)' : 'var(--border)'}`,
                borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.65rem',
                fontSize: '0.78em', fontFamily: 'var(--font)', outline: 'none', lineHeight: 1.5,
              }}
            />

            {importError && (
              <div style={{
                fontSize: '0.78em', color: 'var(--danger)', lineHeight: 1.6,
                background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
                borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.65rem', whiteSpace: 'pre-wrap',
              }}>{importError}</div>
            )}

            {importDone && (
              <div style={{
                fontSize: '0.82em', color: 'var(--success)',
                background: 'color-mix(in srgb, var(--success) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
                borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.65rem',
              }}>✓ Import successful!</div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }}
                disabled={!importText.trim() || importLoading} onClick={runImport}>
                {importLoading ? 'Importing…' : 'Import now'}
              </button>
              <button className="btn" onClick={() => setShowImport(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}