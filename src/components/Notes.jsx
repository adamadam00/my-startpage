import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Notes({ notes = [], workspaceId, userId, onRefresh }) {
  const safeNotes = Array.isArray(notes) ? notes : []
  const [open, setOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(null)
  const [editText, setEditText] = useState('')
  const [err, setErr] = useState('')

  const noteValue = (n) => {
    if (typeof n?.content === 'string') return n.content
    if (typeof n?.text === 'string') return n.text
    if (typeof n?.note === 'string') return n.note
    return ''
  }

  const add = async () => {
    if (!text.trim()) return
    setErr('')
    const { error } = await supabase.from('notes').insert({
      user_id: userId,
      workspace_id: workspaceId,
      content: text.trim(),
    })
    if (error) {
      setErr(error.message)
      return
    }
    setText('')
    setAdding(false)
    onRefresh()
  }

  const update = async (id) => {
    if (!editText.trim()) return
    const { error } = await supabase
      .from('notes')
      .update({ content: editText.trim() })
      .eq('id', id)

    if (error) {
      setErr(error.message)
      return
    }

    setEditing(null)
    setEditText('')
    onRefresh()
  }

  const remove = async (id) => {
    await supabase.from('notes').delete().eq('id', id)
    onRefresh()
  }

  const S = {
    card: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
      background:
        'color-mix(in srgb, var(--notes-bg) calc(var(--card-opacity) * 100%), transparent)',
      border:
        '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity) * 100%), transparent)',
      borderRadius: 'var(--radius)',
      overflow: 'hidden',
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.35rem 0.5rem 0.35rem 0.65rem',
      flexShrink: 0,
      cursor: 'pointer',
      userSelect: 'none',
    },
    hLeft: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.3rem',
      flex: 1,
      minWidth: 0,
    },
    title: {
      fontSize: '0.74em',
      fontWeight: 500,
      color: 'var(--title-color)',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    },
    count: {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--accent-dim)',
      color: 'var(--accent)',
      borderRadius: 99,
      fontSize: '0.7em',
      padding: '0 0.4em',
      minWidth: '1.4em',
    },
    addBtn: {
      background: 'none',
      border:
        '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity) * 100%), transparent)',
      borderRadius: 'var(--radius-sm)',
      color: 'var(--text-dim)',
      width: 22,
      height: 22,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.1em',
      lineHeight: 1,
      cursor: 'pointer',
      flexShrink: 0,
    },
    chev: {
      color: 'var(--text-muted)',
      fontSize: '0.7em',
      marginLeft: '0.2rem',
      flexShrink: 0,
    },
    body: {
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      padding: '0.35rem 0.5rem',
    },
    empty: {
      fontSize: 'var(--font-size)',
      color: 'var(--text-muted)',
      padding: '0.65rem 0.15rem',
      textAlign: 'center',
    },
    noteRow: (last) => ({
      display: 'flex',
      alignItems: 'flex-start',
      gap: '0.3rem',
      padding: '0.3rem 0',
      borderBottom: last
        ? 'none'
        : '1px solid color-mix(in srgb, var(--border) 22%, transparent)',
      minWidth: 0,
    }),
    noteTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    noteText: {
      display: 'block',
      width: '100%',
      minWidth: 0,
      color: 'var(--text)',
      WebkitTextFillColor: 'var(--text)',
      opacity: 1,
      visibility: 'visible',
      fontSize: 'var(--font-size)',
      lineHeight: 1.55,
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      overflowWrap: 'break-word',
      padding: '0.1rem 0',
      cursor: 'text',
      background: 'transparent',
    },
    editBtn: {
      flexShrink: 0,
      background: 'none',
      border: 'none',
      color: 'var(--text-muted)',
      cursor: 'pointer',
      fontSize: '0.9em',
      lineHeight: 1,
      padding: '0.15rem 0.15rem',
      opacity: 0,
      transition: 'color 0.15s, opacity 0.15s',
    },
    delBtn: {
      flexShrink: 0,
      background: 'none',
      border: 'none',
      color: 'var(--text-muted)',
      cursor: 'pointer',
      fontSize: '0.9em',
      lineHeight: 1,
      padding: '0.15rem 0.2rem',
      opacity: 0,
      transition: 'color 0.15s, opacity 0.15s',
    },
    ta: {
      width: '100%',
      background: 'var(--notes-input-bg)',
      border:
        '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity) * 100%), transparent)',
      borderRadius: 'var(--radius-sm)',
      padding: '0.4rem 0.6rem',
      color: 'var(--text)',
      fontSize: 'var(--font-size)',
      outline: 'none',
      resize: 'vertical',
      lineHeight: 1.55,
      fontFamily: 'var(--font)',
      minHeight: 60,
    },
    actRow: {
      display: 'flex',
      gap: '0.3rem',
      marginTop: '0.3rem',
    },
    btnSm: (p) => ({
      flex: p ? 1 : undefined,
      padding: '0.22rem 0.55rem',
      borderRadius: 'var(--radius-sm)',
      border: `1px solid ${p ? 'var(--btn-bg)' : 'var(--border)'}`,
      background: p ? 'var(--btn-bg)' : 'transparent',
      color: p ? 'var(--btn-text)' : 'var(--text-dim)',
      fontSize: 'var(--font-size)',
      cursor: 'pointer',
      fontFamily: 'var(--font)',
    }),
    errTxt: {
      fontSize: '0.8em',
      color: 'var(--danger)',
      marginTop: '0.2rem',
    },
  }

  return (
    <div style={S.card}>
      <div
        style={{
          ...S.header,
          borderBottom: open
            ? '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity) * 100%), transparent)'
            : '1px solid transparent',
        }}
        onClick={() => setOpen((o) => !o)}
      >
        <div style={S.hLeft}>
          <span style={S.title}>Notes</span>
          {safeNotes.length > 0 && <span style={S.count}>{safeNotes.length}</span>}
        </div>

        <button
          style={S.addBtn}
          title="Add note"
          onClick={(e) => {
            e.stopPropagation()
            setOpen(true)
            setAdding(true)
          }}
        >
          +
        </button>

        <span style={S.chev}>{open ? '▾' : '▸'}</span>
      </div>

      {open && (
        <div style={S.body}>
          {adding && (
            <div style={{ marginBottom: '0.5rem' }}>
              <textarea
                style={S.ta}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="New note…"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) add()
                }}
              />
              {err && <div style={S.errTxt}>{err}</div>}
              <div style={S.actRow}>
                <button style={S.btnSm(true)} onClick={add}>Save</button>
                <button
                  style={S.btnSm(false)}
                  onClick={() => {
                    setAdding(false)
                    setText('')
                    setErr('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {safeNotes.length === 0 && !adding && (
            <div style={S.empty}>No notes yet</div>
          )}

          {safeNotes.map((n, i) => {
            const last = i === safeNotes.length - 1
            const value = noteValue(n)

            return editing?.id === n.id ? (
              <div key={n.id} style={S.noteRow(last)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <textarea
                    style={S.ta}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) update(n.id)
                    }}
                  />
                  <div style={S.actRow}>
                    <button style={S.btnSm(true)} onClick={() => update(n.id)}>Save</button>
                    <button
                      style={S.btnSm(false)}
                      onClick={() => {
                        setEditing(null)
                        setEditText('')
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={n.id}
                style={S.noteRow(last)}
                onMouseEnter={(e) => {
                  e.currentTarget
                    .querySelectorAll('[data-btn]')
                    .forEach((b) => { b.style.opacity = '1' })
                }}
                onMouseLeave={(e) => {
                  e.currentTarget
                    .querySelectorAll('[data-btn]')
                    .forEach((b) => { b.style.opacity = '0' })
                }}
              >
                <div style={S.noteTextWrap}>
                  <div
                    style={S.noteText}
                    onClick={() => {
                      setEditing(n)
                      setEditText(value)
                    }}
                    title="Click to edit"
                  >
                    {value}
                  </div>
                </div>

                <button
                  data-btn
                  style={S.editBtn}
                  onClick={() => {
                    setEditing(n)
                    setEditText(value)
                  }}
                  title="Edit note"
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  ✎
                </button>

                <button
                  data-btn
                  style={S.delBtn}
                  onClick={() => remove(n.id)}
                  title="Delete note"
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--danger)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}