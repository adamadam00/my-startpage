import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

const URL_REGEX = /(https?:\/\/[^\s]+)/g

function renderWithLinks(text) {
  const parts = text.split(URL_REGEX)
  return parts.map((part, i) =>
    /^https?:\/\//.test(part)
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--accent)', textDecoration: 'underline', wordBreak: 'break-all' }}
            onClick={e => e.stopPropagation()}>{part}</a>
      : <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part}</span>
  )
}

export default function Notes({ notes = [], workspaceId, userId, onRefresh }) {
  const safeNotes      = Array.isArray(notes) ? notes : []
  const [open, setOpen]           = useState(true)
  const [adding, setAdding]       = useState(false)
  const [newText, setNewText]     = useState('')
  const [focusedId, setFocusedId] = useState(null)
  const [editTexts, setEditTexts] = useState({})
  const [err, setErr]             = useState('')
  const [dragging, setDragging]   = useState(false)
  const [uploading, setUploading] = useState(false)

  const refreshRef = useRef(onRefresh)
  useEffect(() => { refreshRef.current = onRefresh }, [onRefresh])
  useEffect(() => {
    const t = setInterval(() => refreshRef.current(), 60_000)
    return () => clearInterval(t)
  }, [])

  const add = async () => {
    if (!newText.trim()) return
    setErr('')
    const { error } = await supabase.from('notes').insert({
      user_id: userId, workspace_id: workspaceId, content: newText.trim(),
    })
    if (error) { setErr(error.message); return }
    setNewText(''); setAdding(false); onRefresh()
  }

  const saveNote = async (id, value) => {
    if (value?.trim()) await supabase.from('notes').update({ content: value.trim() }).eq('id', id)
    setFocusedId(null); onRefresh()
  }

  const remove = async (id) => { await supabase.from('notes').delete().eq('id', id); onRefresh() }

  const handleDrop = async (e) => {
    e.preventDefault(); setDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (!files.length) return
    const totalSize = files.reduce((s, f) => s + f.size, 0)
    if (totalSize > 25 * 1024 * 1024) { setErr('Files exceed 25 MB limit'); return }
    setUploading(true); setErr('')
    for (const file of files) {
      const path = `${userId}/${Date.now()}_${file.name}`
      const { error: uploadErr } = await supabase.storage.from('note-files').upload(path, file)
      if (uploadErr) {
        setErr(`Upload failed: ${uploadErr.message} — make sure the "note-files" bucket exists in Supabase Storage.`)
        setUploading(false); return
      }
      const { data: { publicUrl } } = supabase.storage.from('note-files').getPublicUrl(path)
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
      await supabase.from('notes').insert({
        user_id: userId, workspace_id: workspaceId,
        content: `📎 ${file.name}\n${publicUrl}\n(auto-deletes ${expiry})`,
      })
    }
    setUploading(false); onRefresh()
  }

  const taBase = {
    width: '100%',
    background: 'var(--notes-input-bg)',
    border: '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity)*100%), transparent)',
    borderRadius: 'var(--radius-sm)',
    padding: '0.4rem 0.6rem',
    color: 'var(--text)',
    outline: 'none',
    resize: 'none',
    lineHeight: 1.55,
    fontFamily: 'var(--font)',
    fontSize: 'var(--notes-font-size)',
  }

  return (
    <div className={`notes-panel${dragging ? ' notes-drag-over' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false) }}
      onDrop={handleDrop}>

      <div className="notes-header" onClick={() => setOpen(o => !o)}>
        <span>Notes {safeNotes.length > 0 && <span className="notes-count">{safeNotes.length}</span>}</span>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          {uploading && <span style={{ fontSize: '0.7em', color: 'var(--text-dim)' }}>uploading…</span>}
          <button className="notes-add-btn" onClick={() => setAdding(a => !a)}>+</button>
        </div>
      </div>

      {open && (
        <div className="notes-body">
          {dragging && <div className="notes-drop-zone">📁 Drop files · max 25 MB · kept 7 days</div>}

          {adding && (
            <div className="note-new">
              <textarea autoFocus
                style={{ ...taBase, minHeight: '80px' }}
                value={newText} onChange={e => setNewText(e.target.value)}
                onKeyDown={e => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add()
                  if (e.key === 'Escape') { setAdding(false); setNewText('') }
                }}
                placeholder="Type a note… ⌘↵ to save, Esc to cancel" />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem' }}>
                <button className="btn-xs btn-primary" onClick={add}>Save</button>
                <button className="btn-xs" onClick={() => { setAdding(false); setNewText('') }}>Cancel</button>
              </div>
              {err && <p style={{ color: 'var(--danger)', fontSize: '0.75em', margin: '0.2rem 0 0' }}>{err}</p>}
            </div>
          )}

          {safeNotes.length === 0 && !adding && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8em', padding: '0.4rem 0', margin: 0 }}>
              No notes · drag files here to share across browsers
            </p>
          )}

          {err && !adding && (
            <p style={{ color: 'var(--danger)', fontSize: '0.75em', margin: '0.2rem 0' }}>{err}</p>
          )}

          {safeNotes.map(n => (
            <div key={n.id} className="note-item">
              {focusedId === n.id ? (
                <textarea autoFocus
                  style={{ ...taBase, minHeight: '80px', maxHeight: '55vh', overflowY: 'auto' }}
                  value={editTexts[n.id] ?? n.content}
                  onChange={e => setEditTexts(prev => ({ ...prev, [n.id]: e.target.value }))}
                  onBlur={() => saveNote(n.id, editTexts[n.id] ?? n.content)}
                  onKeyDown={e => { if (e.key === 'Escape') { setFocusedId(null); onRefresh() } }} />
              ) : (
                <div className="note-content"
                  onClick={() => { setFocusedId(n.id); setEditTexts(prev => ({ ...prev, [n.id]: n.content })) }}
                  title="Click to edit">
                  {renderWithLinks(n.content)}
                </div>
              )}
              <button className="note-delete" onClick={() => remove(n.id)} title="Delete">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}