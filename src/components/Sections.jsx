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
import Links from './Links'

function parseAFineStart(raw) {
  let data
  try { data = JSON.parse(raw) }
  catch { throw new Error('Not valid JSON — paste the export code exactly as copied from A Fine Start Settings.') }

  const extractBookmarks = (bms = []) =>
    bms
      .map(b => ({ title: b.name || b.title || 'Link', url: b.url || b.href || '' }))
      .filter(b => b.url)

  const groups = []

  // Format A (actual AFS): [[{name, bookmarks}], [{name, bookmarks}], ...]
  if (Array.isArray(data) && data.every(item => Array.isArray(item))) {
    data.forEach(col =>
      col.forEach(g => {
        if (g?.name) groups.push({ name: g.name, links: extractBookmarks(g.bookmarks) })
      })
    )
    if (groups.length) return groups
  }

  // Format B: flat array of groups [{name, bookmarks}, ...]
  if (Array.isArray(data) && data[0]?.name) {
    data.forEach(g => {
      if (g?.name) groups.push({ name: g.name, links: extractBookmarks(g.bookmarks || g.links) })
    })
    if (groups.length) return groups
  }

  // Format C: keyed object { columns/groups/data: [...] }
  const root = data.columns || data.groups || data.data || null
  if (Array.isArray(root)) {
    root.forEach(item => {
      if (Array.isArray(item)) {
        item.forEach(g => {
          if (g?.name) groups.push({ name: g.name, links: extractBookmarks(g.bookmarks) })
        })
      } else if (item?.name) {
        groups.push({ name: item.name, links: extractBookmarks(item.bookmarks || item.links) })
      }
    })
    if (groups.length) return groups
  }

  // Deep fallback: recursively find anything with name + bookmarks
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    const bms = node.bookmarks || node.links || node.items
    if ((node.name || node.title) && Array.isArray(bms)) {
      groups.push({ name: node.name || node.title, links: extractBookmarks(bms) })
      return
    }
    ;(Array.isArray(node) ? node : Object.values(node)).forEach(walk)
  }
  walk(data)

  if (groups.length) return groups

  throw new Error(
    `Could not find any groups. Detected structure: ${
      Array.isArray(data)
        ? `array[${data.length}], first item: ${JSON.stringify(data[0])?.slice(0, 120)}`
        : `object with keys: ${Object.keys(data).join(', ')}`
    }`
  )
}

function buildColumns(sections = [], colCount = 2) {
  const cols    = Math.max(colCount, 1)
  const sorted  = [...sections].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const allZero = sorted.length > 1 && sorted.every(s => (s.col_index ?? 0) === 0)
  const result  = Array.from({ length: cols }, () => [])
  sorted.forEach((s, i) => {
    const ci = allZero ? i % cols : Math.min(s.col_index ?? 0, cols - 1)
    result[ci].push(s)
  })
  return result
}

function SectionCard({ section, links = [], userId, workspaceId, onRefresh, openInNewTab }) {
  const [collapsed,  setCollapsed]  = useState(section.collapsed ?? false)
  const [renaming,   setRenaming]   = useState(false)
  const [name,       setName]       = useState(section.name ?? '')
  const [addingLink, setAddingLink] = useState(false)

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id })

  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0 : 1 }
  const sectionLinks = Array.isArray(links) ? links.filter(l => l.section_id === section.id) : []

  const toggleCollapse = async () => {
    const next = !collapsed; setCollapsed(next)
    await supabase.from('sections').update({ collapsed: next }).eq('id', section.id)
  }

  const rename = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    await supabase.from('sections').update({ name: name.trim() }).eq('id', section.id)
    setRenaming(false); onRefresh()
  }

  const deleteSection = async (e) => {
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
          onClick={e => e.stopPropagation()}>⠿</span>

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

export default function Sections({
  sections     = [],
  links        = [],
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
  const [activeId,      setActiveId]      = useState(null)

  const [showImport,    setShowImport]    = useState(false)
  const [importText,    setImportText]    = useState('')
  const [importError,   setImportError]   = useState('')
  const [importLoading, setImportLoading] = useState(false)
  const [importDone,    setImportDone]    = useState(false)

  const safeLinks = Array.isArray(links) ? links : []

  useEffect(() => { if (triggerAdd    > 0) setAddingSection(true)                                   }, [triggerAdd])
  useEffect(() => { if (triggerImport > 0) { setShowImport(true); setImportError(''); setImportDone(false) } }, [triggerImport])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const flat = buildColumns(sections, colCount).flat()
    const from = flat.findIndex(s => s.id === active.id)
    const to   = flat.findIndex(s => s.id === over.id)
    if (from === -1 || to === -1) return
    const next = arrayMove(flat, from, to)
    await Promise.all(next.map((s, i) =>
      supabase.from('sections').update({ position: i, col_index: i % colCount }).eq('id', s.id)
    ))
    onRefresh()
  }

  const addSection = async (e) => {
    e.preventDefault()
    if (!newName.trim()) return
    const pos = sections.length
    await supabase.from('sections').insert({
      user_id: userId, workspace_id: workspaceId,
      name: newName.trim(), position: pos,
      col_index: pos % colCount,
    })
    setNewName(''); setAddingSection(false); onRefresh()
  }

  const runImport = async () => {
    setImportError(''); setImportLoading(true)
    try {
      const groups = parseAFineStart(importText.trim())
      if (!groups.length) throw new Error('No groups found in the export.')

      const startPos = sections.length
      for (let gi = 0; gi < groups.length; gi++) {
        const g = groups[gi]
        const { data: sec, error: secErr } = await supabase.from('sections').insert({
          user_id: userId, workspace_id: workspaceId,
          name: g.name, position: startPos + gi,
          col_index: (startPos + gi) % colCount,
        }).select().single()
        if (secErr) throw new Error(secErr.message)
        if (g.links.length) {
          await supabase.from('links').insert(
            g.links.map((lnk, li) => ({
              user_id: userId, workspace_id: workspaceId,
              section_id: sec.id, title: lnk.title,
              url: lnk.url, position: li,
            }))
          )
        }
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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>

      {/* ── Sections grid ── */}
      <div className="sections-grid">
        <DndContext sensors={sensors} collisionDetection={closestCenter}
          onDragStart={({ active }) => setActiveId(active.id)}
          onDragEnd={handleDragEnd}>
          {colItemsList.map((col, ci) => (
            <div key={ci} className="section-col">
              <SortableContext items={col.map(s => s.id)} strategy={verticalListSortingStrategy}>
                {col.map(section => (
                  <SectionCard
                    key={section.id}
                    section={section}
                    links={safeLinks}
                    userId={userId}
                    workspaceId={workspaceId}
                    onRefresh={onRefresh}
                    openInNewTab={openInNewTab}
                  />
                ))}
              </SortableContext>
            </div>
          ))}
        </DndContext>
      </div>

      {/* ── Inline add-section form ── */}
      {addingSection && (
        <div className="add-section-fixed">
          <form onSubmit={addSection} style={{ display: 'flex', gap: '0.4rem' }}>
            <input className="input" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Section name" autoFocus
              style={{ width: 150, fontSize: '0.82em' }} />
            <button className="btn btn-primary" type="submit"
              style={{ fontSize: '0.82em' }}>Add</button>
            <button className="btn" type="button"
              style={{ fontSize: '0.82em' }}
              onClick={() => { setAddingSection(false); setNewName('') }}>✕</button>
          </form>
        </div>
      )}

      {/* ── Import modal ── */}
      {showImport && (
        <div className="modal-overlay" onClick={() => setShowImport(false)}>
          <div className="modal-box" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 500, fontSize: '0.95em' }}>Import from A Fine Start</span>
              <button className="icon-btn" onClick={() => setShowImport(false)}>✕</button>
            </div>

            <div style={{ fontSize: '0.8em', color: 'var(--text-dim)', lineHeight: 1.55 }}>
              In A Fine Start go to <strong>Settings → Export bookmarks</strong>, copy
              the entire code block shown, then paste it below. Your existing sections
              will not be removed — imported groups are added alongside them.
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
              <div style={{ fontSize: '0.78em', color: 'var(--danger)', lineHeight: 1.6,
                background: 'color-mix(in srgb, var(--danger) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)',
                borderRadius: 'var(--radius-sm)', padding: '0.5rem 0.65rem',
                whiteSpace: 'pre-wrap' }}>
                {importError}
              </div>
            )}

            {importDone && (
              <div style={{ fontSize: '0.82em', color: 'var(--success)',
                background: 'color-mix(in srgb, var(--success) 10%, transparent)',
                border: '1px solid color-mix(in srgb, var(--success) 30%, transparent)',
                borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.65rem' }}>
                ✓ Import successful!
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-primary" style={{ flex: 1 }}
                disabled={!importText.trim() || importLoading}
                onClick={runImport}>
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