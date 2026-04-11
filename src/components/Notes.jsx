import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export default function Notes({ notes = [], workspaceId, userId, onRefresh, forceOpen }) {
  const safeNotes = Array.isArray(notes) ? notes : []
  const [open, setOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [editing, setEditing] = useState(null)
  const [editText, setEditText] = useState('')
  const [err, setErr] = useState('')
  const [syncing, setSyncing] = useState(false)
  const textRef = useRef(null)

  useEffect(() => {
    if (forceOpen === undefined) return
    setOpen(forceOpen)
  }, [forceOpen])

  useEffect(() => {
    const id = setInterval(() => {
      setSyncing(true)
      onRefresh?.()
      setTimeout(() => setSyncing(false), 600)
    }, 30000)
    return () => clearInterval(id)
  }, [onRefresh])

  const noteValue = (n) => {
    if (typeof n?.content === 'string') return n.content
    if (typeof n?.text === 'string') return n.text
    if (typeof n?.note === 'string') return n.note
    return ''
  }

  const startAdding = () => {
    setAdding(true)
    setOpen(true)
    setTimeout(() => textRef.current?.focus(), 50)
  }

  const add = async () => {
    if (!text.trim()) {
      setAdding(false)
      return
    }

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
    onRefresh?.()
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
    onRefresh?.()
  }

  const remove = async (id) => {
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) {
      setErr(error.message)
      return
    }
    onRefresh?.()
  }

  return (
    <div className="card notes-panel">
      <div className="notes-header" onClick={() => setOpen((v) => !v)}>
        <div
          className="section-name"
          style={{ paddingRight: 0 }}
          title="Notes"
        >
          Notes
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          {!!safeNotes.length && <span className="notes-count">{safeNotes.length}</span>}

          {syncing && (
            <span className="settings-label" style={{ fontSize: '0.72em' }}>
              Syncing
            </span>
          )}

          <button
            type="button"
            className="icon-btn"
            onClick={(e) => {
              e.stopPropagation()
              startAdding()
            }}
            title="Add note"
            aria-label="Add note"
          >
            +
          </button>

          <button
            type="button"
            className="icon-btn"
            onClick={(e) => {
              e.stopPropagation()
              setOpen((v) => !v)
            }}
            title={open ? 'Collapse notes' : 'Expand notes'}
            aria-label={open ? 'Collapse notes' : 'Expand notes'}
          >
            {open ? '▾' : '▸'}
          </button>
        </div>
      </div>

      {open && (
        <div className="notes-body">
          {adding && (
            <div className="note-new">
              <textarea
                ref={textRef}
                className="input"
                rows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a note..."
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add()
                  if (e.key === 'Escape') {
                    setAdding(false)
                    setText('')
                  }
                }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                <button type="button" className="btn btn-primary" onClick={add}>
                  Save
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setAdding(false)
                    setText('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {err ? (
            <div className="settings-label" style={{ color: 'var(--danger)' }}>
              {err}
            </div>
          ) : null}

          {safeNotes.map((note) => {
            const value = noteValue(note)

            return (
              <div key={note.id} className="note-item">
                <div style={{ flex: 1, minWidth: 0 }}>
                  {editing === note.id ? (
                    <>
                      <textarea
                        className="input"
                        rows={5}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        autoFocus
                        onKeyDown={(e) => {
                          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') update(note.id)
                          if (e.key === 'Escape') {
                            setEditing(null)
                            setEditText('')
                          }
                        }}
                      />
                      <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.35rem' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-xs"
                          onClick={() => update(note.id)}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs"
                          onClick={() => {
                            setEditing(null)
                            setEditText('')
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="note-content"
                        onClick={() => {
                          setEditing(note.id)
                          setEditText(value)
                        }}
                        title="Click to edit"
                      >
                        {value}
                      </div>

                      <div className="note-actions">
                        <button
                          type="button"
                          className="btn-xs"
                          onClick={() => {
                            setEditing(note.id)
                            setEditText(value)
                          }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-xs"
                          onClick={() => remove(note.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}