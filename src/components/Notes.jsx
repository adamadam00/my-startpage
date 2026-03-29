import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Notes({ notes = [], workspaceId, userId, onRefresh }) {
  const safeNotes = Array.isArray(notes) ? notes : []
  const [open,     setOpen]     = useState(true)
  const [adding,   setAdding]   = useState(false)
  const [text,     setText]     = useState('')
  const [editing,  setEditing]  = useState(null)
  const [editText, setEditText] = useState('')
  const [err,      setErr]      = useState('')

  const add = async () => {
    if (!text.trim()) return
    setErr('')
    const { error } = await supabase.from('notes').insert({
      user_id:      userId,
      workspace_id: workspaceId,
      content:      text.trim(),
    })
    if (error) { setErr(error.message); return }
    setText(''); setAdding(false); onRefresh()
  }

  const update = async (id) => {
    if (!editText.trim()) return
    await supabase.from('notes').update({ content: editText.trim() }).eq('id', id)
    setEditing(null); setEditText(''); onRefresh()
  }

  const remove = async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    onRefresh()
  }

  const taStyle = {
    width: '100%', background: 'var(--bg)',
    border: '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity)*100%), transparent)',
    borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.6rem',
    color: 'var(--text)', fontSize: 'var(--notes-font-size)',
    outline: 'none', resize: 'vertical', lineHeight: 1.55,
    fontFamily: 'var(--font)',
  }

  return (
    <div className="card" style={{ fontSize: 'var(--notes-font-size)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

      <div className="notes-header" onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: '0.74em', fontWeight: 500, color: 'var(--title-color)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Notes
        </span>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.7em' }}>{open ? '▼' : '▶'}</span>
      </div>

      {open && (
        <>
          {safeNotes.length === 0 && !adding && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82em', padding: '0 0.2rem' }}>No notes yet</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {safeNotes.map(n => (
              <div key={n.id} className="note-item">
                {editing === n.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <textarea value={editText} onChange={e => setEditText(e.target.value)}
                      rows={3} autoFocus style={taStyle} />
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.78em' }}
                        onClick={() => update(n.id)}>Save</button>
                      <button className="btn" style={{ fontSize: '0.78em' }}
                        onClick={() => { setEditing(null); setEditText('') }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ color: 'var(--text)', lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: 0, fontSize: 'inherit' }}>
                      {n.content}
                    </p>
                    <div className="note-actions">
                      <button className="icon-btn" style={{ fontSize: '0.78em' }}
                        onClick={() => { setEditing(n.id); setEditText(n.content) }}>✎</button>
                      <button className="icon-btn" style={{ fontSize: '0.78em', color: 'var(--danger)' }}
                        onClick={() => remove(n.id)}>✕</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {adding ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <textarea value={text} onChange={e => setText(e.target.value)}
                placeholder="Jot something down…" rows={3} autoFocus style={taStyle}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add() }} />
              {err && <p style={{ color: 'var(--danger)', fontSize: '0.75em' }}>{err}</p>}
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.78em' }} onClick={add}>
                  Add note
                </button>
                <button className="btn" style={{ fontSize: '0.78em' }}
                  onClick={() => { setAdding(false); setText(''); setErr('') }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-ghost"
              onClick={() => setAdding(true)}
              style={{ fontSize: '0.78em', padding: '0.25rem 0.2rem', textAlign: 'left', color: 'var(--text-muted)' }}>
              + Add note
            </button>
          )}
        </>
      )}
    </div>
  )
}