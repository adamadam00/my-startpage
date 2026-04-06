import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function ImportExport({ session, workspaceId, onRefresh }) {
  const [status,    setStatus]    = useState('')
  const [importing, setImporting] = useState(false)
  const fileRef = useRef()

  // ── EXPORT ──────────────────────────────────────────────────
  const exportJSON = async () => {
    const [{ data: sections }, { data: links }, { data: notes }] = await Promise.all([
      supabase.from('sections').select('*').eq('workspace_id', workspaceId).order('position'),
      supabase.from('links').select('*').eq('workspace_id', workspaceId),
      supabase.from('notes').select('*').eq('workspace_id', workspaceId),
    ])

    const payload = {
      exported_at: new Date().toISOString(),
      sections: sections.map(s => ({
        name:      s.name,
        pinned:    s.pinned,
        collapsed: s.collapsed,
        position:  s.position,
        links: links
          .filter(l => l.section_id === s.id)
          .sort((a, b) => a.position - b.position)
          .map(l => ({ title: l.title, url: l.url })),
      })),
      notes: notes.map(n => ({
        content:     n.content,
        reminder_at: n.reminder_at,
      })),
    }

    download(JSON.stringify(payload, null, 2), 'startpage-export.json', 'application/json')
    setStatus('✓ JSON exported')
  }

  const exportCSV = async () => {
    const [{ data: sections }, { data: links }] = await Promise.all([
      supabase.from('sections').select('*').eq('workspace_id', workspaceId).order('position'),
      supabase.from('links').select('*').eq('workspace_id', workspaceId),
    ])

    const rows = [['Section', 'Title', 'URL']]
    sections.forEach(s => {
      links
        .filter(l => l.section_id === s.id)
        .sort((a, b) => a.position - b.position)
        .forEach(l => rows.push([s.name, l.title, l.url]))
    })

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n')
    download(csv, 'startpage-export.csv', 'text/csv')
    setStatus('✓ CSV exported')
  }

  // ── IMPORT ──────────────────────────────────────────────────
  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const ext = file.name.split('.').pop().toLowerCase()
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const text = ev.target.result
      try {
        if (ext === 'csv') {
          await importCSV(text)
        } else {
          const json = JSON.parse(text)
          // aFineStart v3 format: array of arrays [[{name, bookmarks:[]}]]
          if (Array.isArray(json) && Array.isArray(json[0])) {
            await importAFineStartV2(json.flat())
          // aFineStart older format: {groups:[]}
          } else if (json.groups) {
            await importAFineStart(json)
          // Our own format: {sections:[]}
          } else if (json.sections) {
            await importOurJSON(json)
          } else {
            setStatus('⚠ Unrecognised file format')
          }
        }
      } catch (err) {
        setStatus('⚠ Failed to parse file: ' + err.message)
      }
      e.target.value = ''
    }
    reader.readAsText(file)
  }

  // Import our own JSON export
  const importOurJSON = async (json) => {
    setImporting(true)
    setStatus('Importing…')
    let pos = 0
    for (const s of json.sections ?? []) {
      const { data: sec } = await supabase.from('sections').insert({
        user_id:      session.user.id,
        workspace_id: workspaceId,
        name:         s.name ?? 'Imported',
        position:     pos++,
        pinned:       s.pinned ?? false,
        collapsed:    s.collapsed ?? false,
      }).select().single()
      if (sec) {
        let lpos = 0
        for (const l of s.links ?? []) {
          await supabase.from('links').insert({
            user_id:      session.user.id,
            workspace_id: workspaceId,
            section_id:   sec.id,
            title:        l.title,
            url:          l.url,
            position:     lpos++,
          })
        }
      }
    }
    for (const n of json.notes ?? []) {
      await supabase.from('notes').insert({
        user_id:      session.user.id,
        workspace_id: workspaceId,
        content:      n.content,
        reminder_at:  n.reminder_at ?? null,
        reminder_fired: false,
      })
    }
    setImporting(false)
    setStatus(`✓ Imported ${json.sections?.length ?? 0} sections`)
    onRefresh()
  }

  // Import aFineStart older format: {groups:[]}
  const importAFineStart = async (json) => {
    setImporting(true)
    setStatus('Importing from aFineStart…')
    const groups = json.groups ?? []
    let pos = 0
    for (const g of groups) {
      const { data: sec } = await supabase.from('sections').insert({
        user_id:      session.user.id,
        workspace_id: workspaceId,
        name:         g.name ?? g.title ?? 'Imported',
        position:     pos++,
        pinned:       false,
        collapsed:    false,
      }).select().single()
      if (sec) {
        const items = g.links ?? g.items ?? []
        let lpos = 0
        for (const l of items) {
          let href = l.url ?? l.href ?? ''
          if (href && !href.startsWith('http')) href = 'https://' + href
          await supabase.from('links').insert({
            user_id:      session.user.id,
            workspace_id: workspaceId,
            section_id:   sec.id,
            title:        l.title ?? l.name ?? href,
            url:          href,
            position:     lpos++,
          })
        }
      }
    }
    setImporting(false)
    setStatus(`✓ Imported ${groups.length} sections from aFineStart`)
    onRefresh()
  }

  // Import aFineStart v3 format: [[{name, bookmarks:[{name, url}]}]]
  const importAFineStartV2 = async (groups) => {
    setImporting(true)
    setStatus('Importing from aFineStart…')
    let pos = 0
    for (const g of groups) {
      const { data: sec } = await supabase.from('sections').insert({
        user_id:      session.user.id,
        workspace_id: workspaceId,
        name:         g.name ?? 'Imported',
        position:     pos++,
        pinned:       false,
        collapsed:    false,
      }).select().single()
      if (sec) {
        const items = g.bookmarks ?? g.links ?? g.items ?? []
        let lpos = 0
        for (const l of items) {
          let href = l.url ?? l.href ?? ''
          if (href && !href.startsWith('http')) href = 'https://' + href
          await supabase.from('links').insert({
            user_id:      session.user.id,
            workspace_id: workspaceId,
            section_id:   sec.id,
            title:        l.name ?? l.title ?? href,
            url:          href,
            position:     lpos++,
          })
        }
      }
    }
    setImporting(false)
    setStatus(`✓ Imported ${groups.length} sections from aFineStart`)
    onRefresh()
  }

  // Import CSV (Section, Title, URL)
  const importCSV = async (text) => {
    setImporting(true)
    setStatus('Importing CSV…')
    const lines = text.trim().split('\n').slice(1)
    const sectionMap = {}
    let pos = 0

    for (const line of lines) {
      const [section, title, url] = line
        .split(',')
        .map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))

      if (!section || !title || !url) continue

      if (!sectionMap[section]) {
        const { data: sec } = await supabase.from('sections').insert({
          user_id:      session.user.id,
          workspace_id: workspaceId,
          name:         section,
          position:     pos++,
          pinned:       false,
          collapsed:    false,
        }).select().single()
        sectionMap[section] = { id: sec.id, lpos: 0 }
      }

      await supabase.from('links').insert({
        user_id:      session.user.id,
        workspace_id: workspaceId,
        section_id:   sectionMap[section].id,
        title,
        url: url.startsWith('http') ? url : 'https://' + url,
        position:     sectionMap[section].lpos++,
      })
    }

    setImporting(false)
    setStatus(`✓ Imported ${lines.length} links from CSV`)
    onRefresh()
  }

  // ── HELPER ──────────────────────────────────────────────────
  const download = (content, filename, type) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([content], { type }))
    a.download = filename
    a.click()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ fontSize: '0.7em', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>
        Import / Export
      </div>

      <div className="import-export">
        <button className="btn" onClick={exportJSON}>⬇ Export JSON</button>
        <button className="btn" onClick={exportCSV}>⬇ Export CSV</button>
      </div>

      <div className="import-export">
        <button className="btn btn-primary" onClick={() => fileRef.current.click()} disabled={importing}>
          {importing ? 'Importing…' : '⬆ Import file'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv"
          style={{ display: 'none' }}
          onChange={handleFile}
        />
      </div>

      <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>
        Accepts: aFineStart JSON, our JSON export, or CSV (Section, Title, URL)
      </div>

      {status && (
        <div style={{
          fontSize: '0.8em',
          color: status.startsWith('⚠') ? 'var(--danger)' : 'var(--success)',
          padding: '0.4rem 0.6rem',
          background: 'var(--bg3)',
          borderRadius: 'var(--radius-sm)',
        }}>
          {status}
        </div>
      )}
    </div>
  )
}
