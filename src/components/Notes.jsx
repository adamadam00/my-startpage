import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Notes({ notes = [], workspaceId, userId, onRefresh }) {
  const safeNotes = Array.isArray(notes) ? notes : []
  const [open, setOpen]         = useState(true)
  const [adding, setAdding]     = useState(false)
  const [text, setText]         = useState('')
  const [editing, setEditing]   = useState(null)
  const [editText, setEditText] = useState('')
  const [err, setErr]           = useState('')

  const noteValue = (n) => {
    if (typeof n?.content === 'string') return n.content
    if (typeof n?.text    === 'string') return n.text
    if (typeof n?.note    === 'string') return n.note
    return ''
  }

  const add = async () => {
    if (!text.trim()) return
    setErr('')
    const { error } = await supabase.from('notes').insert({
      user_id: userId, workspace_id: workspaceId, content: text.trim(),
    })
    if (error) { setErr(error.message); return }
    setText(''); setAdding(false); onRefresh()
  }

  const update = async (id) => {
    if (!editText.trim()) return
    const { error } = await supabase
      .from('notes').update({ content: editText.trim() }).eq('id', id)
    if (error) { setErr(error.message); return }
    setEditing(null); setEditText(''); onRefresh()
  }

  const remove = async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    onRefresh()
  }

  return (
    <div className="notes-panel" style={{
      border: '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity) * 100%), transparent)',
      borderRadius: 'var(--radius)',
    }}>

      {/* ── Header ── */}
      <div
        className="notes-header"
        style={{ borderBottom: open ? '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity)*100%), transparent)' : '1px solid transparent' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '0.74em', fontWeight: 500, color: 'var(--title-color)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Notes
          </span>
          {safeNotes.length > 0 && (
            <span className="notes-count">{safeNotes.length}</span>
          )}
        </div>

        <button
          className="icon-btn"
          title="Add note"
          style={{ fontSize: '1.1em', width: 22, height: 22, flexShrink: 0 }}
          onClick={e => { e.stopPropagation(); setOpen(true); setAdding(true) }}
        >+</button>

        <span style={{ color: 'var(--text-muted)', fontSize: '0.7em', marginLeft: '0.2rem' }}>
          {open ? '▾' : '▸'}
        </span>
      </div>

      {/* ── Body ── */}
      {open && (
        <div className="notes-body">

          {/* New note input */}
          {adding && (
            <div className="note-new">
              <textarea
                className="input"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="New note…"
                autoFocus
                style={{ width: '100%', minHeight: 60, resize: 'vertical', lineHeight: 1.55 }}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add() }}
              />
              {err && <div style={{ fontSize: '0.8em', color: 'var(--danger)', marginTop: '0.2rem' }}>{err}</div>}
              <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={add}>Save</button>
                <button className="btn" onClick={() => { setAdding(false); setText(''); setErr('') }}>Cancel</button>
              </div>
            </div>
          )}

          {safeNotes.length === 0 && !adding && (
            <div style={{ fontSize: 'var(--font-size)', color: 'var(--text-muted)', padding: '0.65rem 0.15rem', textAlign: 'center' }}>
              No notes yet
            </div>
          )}

          {/* Note rows */}
          {safeNotes.map((n, i) => {
            const value = noteValue(n)
            return editing?.id === n.id ? (
              <div key={n.id} className="note-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <textarea
                    className="input"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    autoFocus
                    style={{ width: '100%', minHeight: 60, resize: 'vertical', lineHeight: 1.55 }}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) update(n.id) }}
                  />
                  <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.3rem' }}>
                    <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => update(n.id)}>Save</button>
                    <button className="btn" onClick={() => { setEditing(null); setEditText('') }}>Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={n.id} className="note-item">
                <span
                  className="note-content"
                  onClick={() => { setEditing(n); setEditText(value) }}
                  title="Click to edit"
                >{value}</span>
                <div className="note-actions">
                  <button
                    className="icon-btn"
                    onClick={() => { setEditing(n); setEditText(value) }}
                    title="Edit"
                    style={{ fontSize: '0.9em' }}
                  >✎</button>
                  <button
                    className="icon-btn"
                    onClick={() => remove(n.id)}
                    title="Delete"
                    style={{ fontSize: '0.9em', color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
                  >✕</button>
                </div>
              </div>
            )
          })}

        </div>
      )}
    </div>
  )
}