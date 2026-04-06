import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function Notes({ notes = [], workspaceId, userId, onRefresh, forceOpen }) {
  const safeNotes = Array.isArray(notes) ? notes : []
  const [open, setOpen]         = useState(true)

  useEffect(() => {
    if (forceOpen === undefined) return
    setOpen(forceOpen)
  }, [forceOpen])
  const [adding, setAdding]     = useState(false)
  const [text, setText]         = useState('')
  const [editing, setEditing]   = useState(null)
  const [editText, setEditText] = useState('')
  const [err, setErr]           = useState('')
  const [syncing, setSyncing]   = useState(false)
  const textRef                 = useRef(null)

  // Auto-refresh every 30s — cross-browser sync
  useEffect(() => {
    const id = setInterval(() => {
      setSyncing(true)
      onRefresh()
      setTimeout(() => setSyncing(false), 600)
    }, 30000)
    return () => clearInterval(id)
  }, [onRefresh])

  const noteValue = (n) => {
    if (typeof n?.content === 'string') return n.content
    if (typeof n?.text    === 'string') return n.text
    if (typeof n?.note    === 'string') return n.note
    return ''
  }

  const startAdding = () => {
    setAdding(true)
    setOpen(true)
    setTimeout(() => textRef.current?.focus(), 50)
  }

  const add = async () => {
    if (!text.trim()) { setAdding(false); return }
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
      height: 'auto',
      border: '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity)*100%), transparent)',
      borderRadius: 'var(--radius)',
    }}>

      {/* ── Header ── */}
      <div
        className="notes-header"
        style={{ borderBottom: open
          ? '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity)*100%), transparent)'
          : '1px solid transparent' }}
        onClick={() => setOpen(o => !o)}
      >
        <div style={{ display:'flex', alignItems:'center', gap:'0.3rem', flex:1, minWidth:0 }}>
          <span style={{ fontSize:'0.74em', fontWeight:500, color:'var(--title-color)', textTransform:'uppercase', letterSpacing:'0.06em' }}>
            Notes
          </span>
          {safeNotes.length > 0 && <span className="notes-count">{safeNotes.length}</span>}
          {syncing && <span style={{ fontSize:'0.65em', color:'var(--accent)', opacity:0.7 }}>↻</span>}
        </div>
        <span style={{ color:'var(--text-muted)', fontSize:'0.7em', marginLeft:'0.2rem' }}>
          {open ? '▾' : '▸'}
        </span>
      </div>

      {/* ── Body ── */}
      {open && (
        <div className="notes-body" style={{
          padding: 'var(--notes-padding-v, 0.35rem) var(--notes-padding-h, 0.5rem)',
        }}>

          {/* + New note — always at top */}
          {adding ? (
            <div className="note-new">
              <textarea
                ref={textRef}
                className="input"
                rows={4}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Type a note… Ctrl+Enter saves, Esc cancels"
                style={{ width:'100%', minHeight:96, resize:'vertical', lineHeight:1.55, fontSize:'var(--new-note-font-size, var(--notes-font-size, 13px))' }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add()
                  if (e.key === 'Escape') { setAdding(false); setText(''); setErr('') }
                }}
              />
              {err && <div style={{ fontSize:'0.8em', color:'var(--danger)', marginTop:'0.2rem' }}>{err}</div>}
              <div style={{ display:'flex', gap:'0.3rem', marginTop:'0.3rem' }}>
                <button className="btn btn-primary" style={{ flex:1 }} onClick={add}>Save</button>
                <button className="btn" onClick={() => { setAdding(false); setText(''); setErr('') }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={startAdding}
              style={{
                display:'flex', alignItems:'center', gap:'0.35rem',
                width:'100%', background:'none', border:'none',
                borderBottom: safeNotes.length > 0
                  ? '1px solid color-mix(in srgb, var(--border) 20%, transparent)'
                  : 'none',
                padding:'0.3rem 0.1rem 0.45rem',
                color:'var(--text-muted)',
                fontSize:'var(--font-size)',
                cursor:'pointer', textAlign:'left',
                transition:'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <span style={{ fontSize:'1.1em', lineHeight:1 }}>+</span>
              <span>New note</span>
            </button>
          )}

          {/* Note rows */}
          {safeNotes.map((n) => {
            const value = noteValue(n)
            return editing?.id === n.id ? (
              <div key={n.id} className="note-item" style={{ marginBottom: 'var(--notes-gap, 0px)', background: 'var(--notes-card-bg)', border: '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity)*60%), transparent)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.5rem', }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <textarea
                    className="input"
                    value={editText}
                    onChange={e => setEditText(e.target.value)}
                    autoFocus
                    style={{ width:'100%', minHeight:60, resize:'vertical', lineHeight:1.55 }}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) update(n.id)
                      if (e.key === 'Escape') { setEditing(null); setEditText('') }
                    }}
                  />
                  <div style={{ display:'flex', gap:'0.3rem', marginTop:'0.3rem' }}>
                    <button className="btn btn-primary" style={{ flex:1 }} onClick={() => update(n.id)}>Save</button>
                    <button className="btn" onClick={() => { setEditing(null); setEditText('') }}>Cancel</button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={n.id} className="note-item" style={{ marginBottom: 'var(--notes-gap, 0px)', background: 'var(--notes-card-bg)', border: '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity)*60%), transparent)', borderRadius: 'var(--radius-sm)', padding: '0.4rem 0.5rem', }}>
                <span className="note-content"
                  onClick={() => { setEditing(n); setEditText(value) }}
                  title="Click to edit">{value}</span>
                <div className="note-actions">
                  <button className="icon-btn" style={{ fontSize:'0.9em' }}
                    onClick={() => { setEditing(n); setEditText(value) }} title="Edit">✎</button>
                  <button className="icon-btn"
                    style={{ fontSize:'0.9em', color:'var(--text-muted)' }}
                    onClick={() => remove(n.id)} title="Delete"
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)' }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}>✕</button>
                </div>
              </div>
            )
          })}

        </div>
      )}
    </div>
  )
}