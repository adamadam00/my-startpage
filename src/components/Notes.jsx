import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export default function Notes({
  notes       = [],
  workspaceId,
  userId,
  onRefresh,
}) {
  const safeNotes = Array.isArray(notes) ? notes : []

  const [open,      setOpen]      = useState(true)
  const [adding,    setAdding]    = useState(false)
  const [text,      setText]      = useState('')
  const [editing,   setEditing]   = useState(null)
  const [editText,  setEditText]  = useState('')
  const [reminder,  setReminder]  = useState('')
  const [fired,     setFired]     = useState({})

  /* ── Reminder tick ── */
  useEffect(() => {
    const tick = setInterval(() => {
      const now = Date.now()
      safeNotes.forEach(n => {
        if (n.remind_at && !fired[n.id]) {
          if (new Date(n.remind_at).getTime() <= now) {
            setFired(prev => ({ ...prev, [n.id]: true }))
          }
        }
      })
    }, 10000)
    return () => clearInterval(tick)
  }, [safeNotes, fired])

  /* ── Add ── */
  const add = async () => {
    if (!text.trim()) return
    await supabase.from('notes').insert({
      user_id:      userId,
      workspace_id: workspaceId,
      content:      text.trim(),
      remind_at:    reminder || null,
    })
    setText(''); setReminder(''); setAdding(false)
    onRefresh()
  }

  /* ── Update ── */
  const update = async (id) => {
    if (!editText.trim()) return
    await supabase.from('notes').update({ content: editText.trim() }).eq('id', id)
    setEditing(null); setEditText('')
    onRefresh()
  }

  /* ── Delete ── */
  const remove = async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    onRefresh()
  }

  const firedCount = safeNotes.filter(n => fired[n.id]).length

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>

      {/* Header */}
      <div className="notes-header" onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: '0.74em', fontWeight: 500, color: 'var(--title-color)',
          textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Notes
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {firedCount > 0 && (
            <span className="notes-badge">{firedCount}</span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7em' }}>
            {open ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {open && (
        <>
          {/* Note list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {safeNotes.length === 0 && !adding && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.8em', padding: '0.2rem 0' }}>
                no notes yet
              </p>
            )}

            {safeNotes.map(n => (
              <div
                key={n.id}
                className={`note-item${fired[n.id] ? ' reminder-fired' : ''}`}
              >
                {editing === n.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <textarea
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      rows={3}
                      autoFocus
                      className="input"
                      style={{ resize: 'vertical', lineHeight: 1.5 }}
                    />
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.75em' }}
                        onClick={() => update(n.id)}>Save</button>
                      <button className="btn" style={{ fontSize: '0.75em' }}
                        onClick={() => { setEditing(null); setEditText('') }}>✕</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p style={{ color: 'var(--text)', fontSize: '0.85em',
                      lineHeight: 1.5, whiteSpace: 'pre-wrap', margin: 0 }}>
                      {n.content}
                    </p>
                    {n.remind_at && (
                      <div className="note-reminder-label">
                        ⏰ {new Date(n.remind_at).toLocaleString()}
                        {fired[n.id] && ' — due!'}
                      </div>
                    )}
                    <div className="note-actions"
                      style={{ display: 'flex', gap: '0.2rem', marginTop: '0.3rem',
                        opacity: 0, transition: 'opacity 0.15s' }}>
                      <button className="icon-btn" style={{ fontSize: '0.75em' }}
                        onClick={() => { setEditing(n.id); setEditText(n.content) }}>✎</button>
                      <button className="icon-btn" style={{ fontSize: '0.75em', color: 'var(--danger)' }}
                        onClick={() => remove(n.id)}>✕</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Add form */}
          {adding ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="jot something down…"
                rows={3}
                autoFocus
                className="input"
                style={{ resize: 'vertical', lineHeight: 1.5 }}
              />
              <input
                type="datetime-local"
                className="input"
                value={reminder}
                onChange={e => setReminder(e.target.value)}
                style={{ fontSize: '0.78em' }}
                title="Optional reminder"
              />
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button className="btn btn-primary" style={{ flex: 1, fontSize: '0.78em' }}
                  onClick={add}>Add</button>
                <button className="btn" style={{ fontSize: '0.78em' }}
                  onClick={() => { setAdding(false); setText(''); setReminder('') }}>✕</button>
              </div>
            </div>
          ) : (
            <button
              className="btn btn-ghost"
              onClick={() => setAdding(true)}
              style={{ fontSize: '0.75em', padding: '0.2rem 0',
                textAlign: 'left', color: 'var(--text-muted)' }}
            >
              + add note
            </button>
          )}
        </>
      )}
    </div>
  )
}