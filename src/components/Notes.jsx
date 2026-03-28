import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function NoteItem({ note, onRefresh }) {
  const [editing,  setEditing]  = useState(false)
  const [text,     setText]     = useState(note.content)
  const [reminder, setReminder] = useState(note.reminder_at ? note.reminder_at.slice(0, 16) : '')

  const fired = note.reminder_fired && note.reminder_at

  const save = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await supabase.from('notes').update({
      content:     text.trim(),
      reminder_at: reminder ? new Date(reminder).toISOString() : null,
      reminder_fired: false,
    }).eq('id', note.id)
    setEditing(false)
    onRefresh()
  }

  const dismiss = async (e) => {
    e.stopPropagation()
    await supabase.from('notes').update({ reminder_fired: true }).eq('id', note.id)
    onRefresh()
  }

  const remove = async () => {
    await supabase.from('notes').delete().eq('id', note.id)
    onRefresh()
  }

  if (editing) {
    return (
      <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <textarea
          className="input"
          value={text}
          onChange={e => setText(e.target.value)}
          rows={3}
          autoFocus
          style={{ resize: 'vertical' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.8em', color: 'var(--text-dim)', flexShrink: 0 }}>
            Remind me:
          </label>
          <input
            type="datetime-local"
            className="input"
            value={reminder}
            onChange={e => setReminder(e.target.value)}
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" type="submit">Save</button>
          <button className="btn" type="button" onClick={() => setEditing(false)}>Cancel</button>
          {reminder && (
            <button className="btn btn-ghost" type="button"
              onClick={() => setReminder('')}
              style={{ fontSize: '0.8em' }}>
              Clear reminder
            </button>
          )}
        </div>
      </form>
    )
  }

  return (
    <div className={`note-item${fired ? ' reminder-fired' : ''}`}>
      {/* Reminder label */}
      {note.reminder_at && !note.reminder_fired && (
        <div className="note-reminder-label">
          ⏰ {new Date(note.reminder_at).toLocaleString('en-AU', {
            weekday: 'short', day: 'numeric', month: 'short',
            hour: '2-digit', minute: '2-digit'
          })}
        </div>
      )}

      {/* Fired alert */}
      {fired && (
        <div className="note-reminder-label" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          🔔 Reminder due!
          <button className="btn btn-ghost" style={{ fontSize: '0.75em', padding: '0.1rem 0.4rem' }}
            onClick={dismiss}>
            Dismiss
          </button>
        </div>
      )}

      <div style={{ marginTop: note.reminder_at ? '0.4rem' : 0 }}>
        {note.content}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem', opacity: 0 }}
        className="note-actions">
        <button className="icon-btn" style={{ fontSize: '0.8em' }} onClick={() => setEditing(true)}>✎ edit</button>
        <button className="icon-btn" style={{ fontSize: '0.8em', color: 'var(--danger)' }} onClick={remove}>✕ delete</button>
      </div>
    </div>
  )
}

export default function Notes({ items, workspaceId, userId, onRefresh }) {
  const [open,   setOpen]   = useState(false)
  const [adding, setAdding] = useState(false)
  const [text,   setText]   = useState('')
  const [reminder, setReminder] = useState('')

  // Check for fired reminders every 60 seconds
  useEffect(() => {
    const check = async () => {
      const now = new Date().toISOString()
      const due = items.filter(n =>
        n.reminder_at && !n.reminder_fired && n.reminder_at <= now
      )
      if (due.length > 0) {
        await Promise.all(
          due.map(n =>
            supabase.from('notes').update({ reminder_fired: true }).eq('id', n.id)
          )
        )
        onRefresh()
        setOpen(true) // auto-open panel when reminder fires
      }
    }
    check()
    const t = setInterval(check, 60_000)
    return () => clearInterval(t)
  }, [items, onRefresh])

  const firedCount = items.filter(n => n.reminder_fired && n.reminder_at).length

  // Auto-open if there are active fired reminders
  useEffect(() => {
    if (firedCount > 0) setOpen(true)
  }, [firedCount])

  const addNote = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await supabase.from('notes').insert({
      user_id:      userId,
      workspace_id: workspaceId,
      content:      text.trim(),
      reminder_at:  reminder ? new Date(reminder).toISOString() : null,
      reminder_fired: false,
    })
    setText('')
    setReminder('')
    setAdding(false)
    onRefresh()
  }

  return (
    <div className="card">
      {/* Header — always visible, click to toggle */}
      <div className="notes-header" onClick={() => setOpen(o => !o)}>
        <span style={{ fontSize: '0.8em', fontWeight: 500 }}>
          NOTES {items.length > 0 && <span style={{ color: 'var(--text-muted)' }}>({items.length})</span>}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {firedCount > 0 && (
            <span className="notes-badge">🔔 {firedCount}</span>
          )}
          <span style={{ color: 'var(--text-muted)', fontSize: '0.7em' }}>
            {open ? '▼' : '▶'}
          </span>
        </div>
      </div>

      {/* Collapsible body */}
      {open && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {items.length === 0 && !adding && (
            <div style={{ fontSize: '0.8em', color: 'var(--text-muted)' }}>no notes yet</div>
          )}

          {items.map(n => (
            <NoteItem key={n.id} note={n} onRefresh={onRefresh} />
          ))}

          {adding ? (
            <form onSubmit={addNote} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <textarea
                className="input"
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                placeholder="Write a note…"
                autoFocus
                style={{ resize: 'vertical' }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <label style={{ fontSize: '0.8em', color: 'var(--text-dim)', flexShrink: 0 }}>
                  Remind me:
                </label>
                <input
                  type="datetime-local"
                  className="input"
                  value={reminder}
                  onChange={e => setReminder(e.target.value)}
                  style={{ flex: 1, minWidth: 0 }}
                />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="btn btn-primary" type="submit">Add</button>
                <button className="btn" type="button" onClick={() => { setAdding(false); setReminder('') }}>Cancel</button>
              </div>
            </form>
          ) : (
            <button className="btn-ghost icon-btn"
              onClick={() => setAdding(true)}
              style={{ fontSize: '0.8em', alignSelf: 'flex-start' }}>
              + add note
            </button>
          )}
        </div>
      )}
    </div>
  )
}