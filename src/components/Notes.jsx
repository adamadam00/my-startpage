import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

// Shared formatting toolbar for both new and edit notes
function NoteToolbar({ targetSelector, onUpdate }) {
  const exec = (cmd, val = null) => {
    document.execCommand(cmd, false, val)
    setTimeout(() => {
      const el = document.querySelector(targetSelector)
      if (el) el.dispatchEvent(new Event('input', { bubbles: true }))
    }, 10)
  }
  const addBullet = () => {
    const sel = window.getSelection()
    const txt = sel?.toString() || ''
    if (txt.includes('\n')) {
      const lines = txt.split('\n')
      const html = lines.map(l => l.trim() ? `<li>${l}</li>` : '').filter(Boolean).join('')
      const range = sel.getRangeAt(0)
      range.deleteContents()
      const ul = document.createElement('ul')
      ul.className = 'note-bullets'
      ul.innerHTML = html
      range.insertNode(ul)
    } else {
      document.execCommand('insertUnorderedList', false, null)
      setTimeout(() => {
        const el = document.querySelector(targetSelector)
        if (el) el.querySelectorAll('ul:not(.note-bullets)').forEach(u => u.classList.add('note-bullets'))
      }, 0)
    }
    setTimeout(() => {
      const el = document.querySelector(targetSelector)
      if (el) el.dispatchEvent(new Event('input', { bubbles: true }))
    }, 20)
  }
  const setColor = (color) => {
    document.execCommand('foreColor', false, color)
    setTimeout(() => {
      const el = document.querySelector(targetSelector)
      if (el) el.dispatchEvent(new Event('input', { bubbles: true }))
    }, 10)
  }
  return (
    <div style={{ display: 'flex', gap: '0.15rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <button type="button" className="btn-xs" onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')} title="Bold"><strong>B</strong></button>
      <button type="button" className="btn-xs" onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')} title="Italic"><em>I</em></button>
      <button type="button" className="btn-xs" onMouseDown={e => e.preventDefault()} onClick={() => exec('underline')} title="Underline"><u>U</u></button>
      <button type="button" className="btn-xs" onMouseDown={e => e.preventDefault()} onClick={addBullet} title="Bullet">•</button>
      <div style={{ display: 'flex', gap: '0.1rem', marginLeft: '0.1rem' }}>
        {['#ff6b6b','#6c8fff','#6bffb8','#ffd32a'].map(c => (
          <button key={c} type="button" className="color-dot" onMouseDown={e => e.preventDefault()} onClick={() => setColor(c)} style={{ background: c }} title={c} />
        ))}
        <input type="color" className="color-picker" onMouseDown={e => e.preventDefault()} onChange={e => setColor(e.target.value)} title="Custom color" />
      </div>
    </div>
  )
}

// Component for individual file attachment with image preview
function FileAttachment({ file, noteId, onRefresh }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [imageScale, setImageScale] = useState(file.scale || 100)
  
  const daysOld = (new Date() - new Date(file.uploaded_at)) / (1000 * 60 * 60 * 24)
  const isOld = daysOld >= 6
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name)
  
  console.log('[FileAttachment]', file.name, 'isImage:', isImage, 'path:', file.path, 'saved scale:', file.scale)
  
  // Sync scale from props when file changes
  useEffect(() => {
    if (file.scale !== undefined && file.scale !== imageScale) {
      console.log('[FileAttachment] Syncing scale from props:', file.scale)
      setImageScale(file.scale)
    }
  }, [file.scale])
  
  useEffect(() => {
    if (isImage) {
      console.log('[FileAttachment] Fetching signed URL for:', file.path)
      supabase.storage
        .from('note-files')
        .createSignedUrl(file.path, 3600)
        .then(({ data, error }) => {
          if (error) {
            console.error('[FileAttachment] Signed URL error:', error)
          } else if (data) {
            console.log('[FileAttachment] Got signed URL:', data.signedUrl)
            setImageUrl(data.signedUrl)
          }
        })
    }
  }, [file.path, isImage])
  
  // Save scale when it changes
  const handleScaleChange = async (newScale) => {
    setImageScale(newScale)
    
    console.log('[Image Scale] Saving scale:', newScale, 'for file:', file.name)
    
    // Update file metadata in database
    const { data: note } = await supabase
      .from('notes')
      .select('files')
      .eq('id', noteId)
      .single()
    
    const updatedFiles = (note?.files || []).map(f => 
      f.path === file.path ? { ...f, scale: parseInt(newScale) } : f
    )
    
    console.log('[Image Scale] Updated files:', updatedFiles)
    
    await supabase
      .from('notes')
      .update({ files: updatedFiles })
      .eq('id', noteId)
    
    console.log('[Image Scale] Saved to database')
  }
  
  const handleDelete = async (e) => {
    e.stopPropagation()
    if (!confirm(`Delete "${file.name}"?`)) return
    
    await supabase.storage.from('note-files').remove([file.path])
    
    const { data: note } = await supabase
      .from('notes')
      .select('files')
      .eq('id', noteId)
      .single()
    
    const updatedFiles = (note?.files || []).filter(f => f.path !== file.path)
    
    await supabase
      .from('notes')
      .update({ files: updatedFiles })
      .eq('id', noteId)
    
    onRefresh?.()
  }
  
  const handleDownload = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    const { data } = await supabase.storage
      .from('note-files')
      .createSignedUrl(file.path, 3600)
    if (data) window.open(data.signedUrl, '_blank')
  }
  
  if (isImage && imageUrl) {
    return (
      <div className="note-image-preview" style={{ position: 'relative' }}>
        <img 
          src={imageUrl} 
          alt={file.name}
          style={{ 
            width: `${imageScale}%`,
            maxWidth: '100%',
            height: 'auto',
            borderRadius: '4px',
            display: 'block'
          }}
        />
        <div 
          className="note-image-controls"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.4rem', 
            marginTop: '0.25rem',
            opacity: 0,
            transition: 'opacity 0.2s ease'
          }}
        >
          <input 
            type="range" 
            min="25" 
            max="150" 
            value={imageScale}
            onChange={(e) => handleScaleChange(e.target.value)}
            style={{ width: '80px', accentColor: 'var(--accent)' }}
            title="Scale image"
          />
          <span style={{ fontSize: '0.65em', color: 'var(--text-dim)', minWidth: '2.5em' }}>{imageScale}%</span>
          <button
            className="btn-xs"
            onClick={() => window.open(imageUrl, '_blank')}
            onMouseDown={(e) => e.preventDefault()}
            title="Open full size"
            style={{ fontSize: '0.75em', padding: '0.2rem 0.4rem' }}
          >
            ↗
          </button>
          <button
            className="btn-xs"
            onClick={handleDelete}
            onMouseDown={(e) => e.preventDefault()}
            title="Delete image"
            style={{ fontSize: '0.9em' }}
          >
            ×
          </button>
        </div>
        <div style={{ fontSize: '0.7em', color: 'var(--text-dim)', marginTop: '0.15rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <span>📎 {file.name}</span>
          {daysOld >= 6 && (
            <span 
              style={{ 
                color: daysOld >= 6.5 ? 'var(--danger)' : 'var(--warning, orange)',
                fontWeight: '500',
                fontSize: '0.9em'
              }}
              title={`Uploaded ${new Date(file.uploaded_at).toLocaleDateString()}. Files auto-delete after 7 days.`}
            >
              💣 Expires in {Math.max(0, Math.ceil(7 - daysOld))} day{Math.ceil(7 - daysOld) !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', width: '100%' }}>
      <a 
        href="#"
        onClick={handleDownload}
        title={`${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)${daysOld >= 6 ? `\nUploaded ${new Date(file.uploaded_at).toLocaleDateString()}. Files auto-delete after 7 days.` : ''}`}
        style={{ 
          flex: 1, 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          minWidth: 0
        }}
      >
        📎 {file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name}
      </a>
      {daysOld >= 6 && (
        <span 
          style={{ 
            color: daysOld >= 6.5 ? 'var(--danger)' : 'var(--warning, orange)',
            fontWeight: '500',
            fontSize: '0.7em',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
          title={`Uploaded ${new Date(file.uploaded_at).toLocaleDateString()}. Files auto-delete after 7 days.`}
        >
          💣 {Math.max(0, Math.ceil(7 - daysOld))}d
        </span>
      )}
      <button
        className="btn-xs"
        onClick={handleDelete}
        onMouseDown={(e) => e.preventDefault()}
        title="Delete file"
        style={{ fontSize: '0.9em', flexShrink: 0 }}
      >
        ×
      </button>
    </div>
  )
}

// Helper to detect and linkify URLs
const linkifyText = (text) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  const parts = text.split(urlRegex)
  
  return parts.map((part, i) => {
    if (part.match(urlRegex)) {
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="note-link">{part}</a>
    }
    return part
  })
}

// Helper to parse basic markdown-style formatting
const parseFormatting = (text) => {
  if (!text) return null
  
  // If text contains HTML tags, render it directly as HTML
  if (text.includes('<') && text.includes('>')) {
    // Add note-bullets class to any ul tags that don't have it
    let html = text.replace(/<ul>/g, '<ul class="note-bullets">')
    html = html.replace(/<ul /g, '<ul class="note-bullets" ')
    return <span dangerouslySetInnerHTML={{ __html: html }} />
  }
  
  const lines = text.split('\n')
  const result = []
  let bulletGroup = []
  
  lines.forEach((line, lineIdx) => {
    let parts = line.split(/(\{(?:red|blue|green|yellow|orange|purple|pink|cyan)\}.*?\{\/(?:red|blue|green|yellow|orange|purple|pink|cyan)\})/g)
    parts = parts.map((part, i) => {
      const colorMatch = part.match(/^\{(red|blue|green|yellow|orange|purple|pink|cyan)\}(.*?)\{\/\1\}$/)
      if (colorMatch) {
        const colorMap = {
          red: '#ff6b6b',
          blue: '#6c8fff',
          green: '#6bffb8',
          yellow: '#ffd32a',
          orange: '#ff9f43',
          purple: '#a29bfe',
          pink: '#fd79a8',
          cyan: '#48dbfb'
        }
        return <span key={i} style={{ color: colorMap[colorMatch[1]] }}>{colorMatch[2]}</span>
      }
      
      const boldParts = part.split(/(\*\*.*?\*\*|__.*?__)/g)
      return boldParts.map((bPart, j) => {
        if (bPart.match(/^\*\*(.*)\*\*$/) || bPart.match(/^__(.*?)__$/)) {
          const content = bPart.slice(2, -2)
          return <strong key={`${i}-${j}`}>{content}</strong>
        }
        
        const italicParts = bPart.split(/(\*.*?\*|_.*?_)/g)
        return italicParts.map((iPart, k) => {
          if (iPart.match(/^\*(.*)\*$/) && !iPart.match(/^\*\*/)) {
            return <em key={`${i}-${j}-${k}`}>{iPart.slice(1, -1)}</em>
          }
          if (iPart.match(/^_(.*?)_$/) && !iPart.match(/^__/)) {
            return <em key={`${i}-${j}-${k}`}>{iPart.slice(1, -1)}</em>
          }
          
          return linkifyText(iPart)
        })
      })
    })
    
    if (line.trim().match(/^[-*]\s/)) {
      const bulletContent = line.trim().slice(2)
      bulletGroup.push(<li key={`li-${lineIdx}`}>{bulletContent}</li>)
    } else {
      if (bulletGroup.length > 0) {
        result.push(<ul key={`ul-${lineIdx}`} className="note-bullets">{bulletGroup}</ul>)
        bulletGroup = []
      }
      result.push(<span key={lineIdx}>{parts}{lineIdx < lines.length - 1 && <br />}</span>)
    }
  })
  
  if (bulletGroup.length > 0) {
    result.push(<ul key="ul-end" className="note-bullets">{bulletGroup}</ul>)
  }
  
  return result
}


export default function Notes({ notes = [], workspaceId, workspace, workspaces = [], userId, onRefresh, forceOpen }) {
  const safeNotes = Array.isArray(notes) ? notes : []
  const [open, setOpen] = useState(true)
  const [adding, setAdding] = useState(false)
  const [text, setText] = useState('')
  const [shareNote, setShareNote] = useState('')   // ws id to share to, '' = none
  const [editing, setEditing] = useState(null)
  const [editText, setEditText] = useState('')
  const [editShareNote, setEditShareNote] = useState('')  // ws id, '' = none
  const [err, setErr] = useState('')
  const [syncing, setSyncing] = useState(false)
  const [showActions, setShowActions] = useState(null)
  const [uploading, setUploading] = useState({})
  const [collapsedNotes, setCollapsedNotes] = useState(new Set())
  const textRef = useRef(null)
  const savedSelectionRef = useRef(null)
  
  const otherWorkspaces = workspaces.filter(w => w.id !== workspaceId)
  const canShare = otherWorkspaces.length > 0

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

  const [editingRef, setEditingRef] = useState(null)

  const insertFormatting = (before, after = '') => {
    const textarea = document.activeElement
    if (textarea.tagName !== 'TEXTAREA') return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = editText.substring(start, end)
    const newText = editText.substring(0, start) + before + selectedText + after + editText.substring(end)
    
    setEditText(newText)
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      const newPos = start + before.length + selectedText.length + after.length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  const startAdding = () => {
    setAdding(true)
    setOpen(true)
    setTimeout(() => textRef.current?.focus(), 50)
  }

  const addDateStamp = () => {
    const now = new Date()
    const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    const stamp = `**${dateStr}** ${timeStr}\n`
    setText(text + stamp)
    setTimeout(() => textRef.current?.focus(), 50)
  }

  const insertFormattingNew = (before, after = '') => {
    const textarea = textRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = text.substring(start, end)
    const newText = text.substring(0, start) + before + selectedText + after + text.substring(end)
    
    setText(newText)
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      const newPos = start + before.length + selectedText.length + after.length
      textarea.setSelectionRange(newPos, newPos)
    }, 0)
  }

  const add = async () => {
    // Get content from contentEditable div if available, fallback to text state
    const content = textRef.current?.innerHTML?.trim() || text.trim()
    if (!content) {
      setAdding(false)
      return
    }

    setErr('')

    // Shift all existing notes down by incrementing their position
    const shiftPromises = safeNotes.map(note => 
      supabase
        .from('notes')
        .update({ position: (note.position ?? 0) + 1 })
        .eq('id', note.id)
    )
    
    await Promise.all(shiftPromises)

    // Determine shared_to based on selected workspace
    const shared_to = shareNote || null

    // Add new note at position 0 (top)
    const { error } = await supabase.from('notes').insert({
      user_id: userId,
      workspace_id: workspaceId,
      content: content,
      position: 0,
      shared_to: shared_to,
    })

    if (error) {
      setErr(error.message)
      return
    }

    setText('')
    setAdding(false)
    setShareNote('')
    onRefresh?.()
  }

  const update = async (id) => {
    if (!editText.trim()) return
    const shared_to = editShareNote || null
    const { error } = await supabase
      .from('notes')
      .update({ content: editText.trim(), shared_to })
      .eq('id', id)
    if (error) { setErr(error.message); return }
    setEditing(null)
    setEditText('')
    setEditShareNote('')
    onRefresh?.()
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this note?')) return
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) { setErr(error.message); return }
    onRefresh?.()
  }

  const togglePin = async (id, currentlyPinned) => {
    const { error } = await supabase.from('notes').update({ pinned: !currentlyPinned }).eq('id', id)
    if (error) { setErr(error.message); return }
    onRefresh?.()
  }

  const moveUp = async (id) => {
    const sortedNotes = [...safeNotes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    const currentIndex = sortedNotes.findIndex(n => n.id === id)
    if (currentIndex <= 0) return // Already at top

    const current = sortedNotes[currentIndex]
    const above = sortedNotes[currentIndex - 1]

    // Swap positions
    const { error: err1 } = await supabase
      .from('notes')
      .update({ position: above.position ?? currentIndex - 1 })
      .eq('id', current.id)

    const { error: err2 } = await supabase
      .from('notes')
      .update({ position: current.position ?? currentIndex })
      .eq('id', above.id)

    if (err1 || err2) {
      setErr(err1?.message || err2?.message)
      return
    }

    onRefresh?.()
  }

  const moveDown = async (id) => {
    const sortedNotes = [...safeNotes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    const currentIndex = sortedNotes.findIndex(n => n.id === id)
    if (currentIndex === -1 || currentIndex >= sortedNotes.length - 1) return // Already at bottom

    const current = sortedNotes[currentIndex]
    const below = sortedNotes[currentIndex + 1]

    // Swap positions
    const { error: err1 } = await supabase
      .from('notes')
      .update({ position: below.position ?? currentIndex + 1 })
      .eq('id', current.id)

    const { error: err2 } = await supabase
      .from('notes')
      .update({ position: current.position ?? currentIndex })
      .eq('id', below.id)

    if (err1 || err2) {
      setErr(err1?.message || err2?.message)
      return
    }

    onRefresh?.()
  }

  return (
    <div className="card notes-panel">
      <div className="notes-header" onClick={() => setOpen((v) => !v)}>
        <div className="notes-header-left">
          <div className="section-name notes-title" style={{ paddingRight: 0 }} title="Notes">
            Notes
          </div>
        </div>

        <div className="notes-header-actions">
          {syncing && (
            <span className="settings-label" style={{ fontSize: '0.72em' }}>
              Syncing
            </span>
          )}

          <button
            type="button"
            className="icon-btn btn-primary"
            onClick={(e) => {
              e.stopPropagation()
              startAdding()
            }}
            title="Add note"
            aria-label="Add note"
            style={{ fontSize: '1.4em', fontWeight: 'bold' }}
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
        <div 
          className="notes-body"
          onClick={(e) => {
            // If clicking directly on notes-body (not a note card), deselect
            if (e.target.classList.contains('notes-body')) {
              setEditing(null)
              setEditText('')
            }
          }}
        >
          {adding && (
            <div className="note-new">
              <div
                ref={textRef}
                className="input note-editing"
                contentEditable
                suppressContentEditableWarning
                style={{ minHeight: '80px', padding: '0.5rem', outline: 'none', lineHeight: 1.5 }}
                onInput={(e) => setText(e.currentTarget.innerHTML)}
                data-placeholder="Write a note..."
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') add()
                  if (e.key === 'Escape') { setAdding(false); setText(''); setShareNote('') }
                }}
              />
              <div className="note-edit-toolbar" style={{ position: 'relative', marginTop: '0.3rem', overflow: 'visible' }} data-toolbar="true">
                <NoteToolbar targetSelector=".note-new .note-editing" />
                <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.3rem', alignItems: 'center' }}>
                  {canShare && (
                    <select
                      className="input"
                      style={{ fontSize: '0.72em', padding: '0.15rem 0.25rem' }}
                      value={shareNote}
                      onChange={e => setShareNote(e.target.value)}
                    >
                      <option value=''>No sharing</option>
                      {otherWorkspaces.map(w => (
                        <option key={w.id} value={w.id}>Share to: {w.name}</option>
                      ))}
                    </select>
                  )}
                  <div style={{ flex: 1 }} />
                  <button type="button" className="btn-xs" onClick={() => { setAdding(false); setText(''); setShareNote('') }}>×</button>
                  <button type="button" className="btn btn-primary btn-xs" onClick={add}>Save</button>
                </div>
              </div>
            </div>
          )}

          {err ? (
            <div className="settings-label" style={{ color: 'var(--danger)' }}>
              {err}
            </div>
          ) : null}

          {safeNotes
            .sort((a, b) => {
              if (a.pinned && !b.pinned) return -1
              if (!a.pinned && b.pinned) return 1
              if (a.shared_to && !b.shared_to) return 1
              if (!a.shared_to && b.shared_to) return -1
              return (a.position ?? 0) - (b.position ?? 0)
            })
            .map((note, sortedIndex) => {
            const value = noteValue(note)

            return (
              <div 
                key={note.id} 
                className={`note-item ${editing === note.id ? 'note-selected' : ''} ${collapsedNotes.has(note.id) ? 'note-collapsed' : ''} ${note.pinned ? 'note-pinned' : ''}`}
                style={note.shared_to ? { background: 'var(--notes-shared-bg)' } : {}}
                onDoubleClick={(e) => {
                  if (editing === note.id) return
                  e.preventDefault()
                  window.getSelection()?.removeAllRanges()
                  setCollapsedNotes(prev => {
                    const next = new Set(prev)
                    if (next.has(note.id)) next.delete(note.id)
                    else next.add(note.id)
                    return next
                  })
                }}
                onDragOver={(e) => {
                  // Allow file drops to pass through to contentEditable
                  if (e.dataTransfer.types.includes('Files')) {
                    return
                  }
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  e.currentTarget.classList.add('drag-over')
                }}
                onDragLeave={(e) => {
                  e.currentTarget.classList.remove('drag-over')
                }}
                onDrop={async (e) => {
                  // Allow file drops to pass through to contentEditable
                  if (e.dataTransfer.files.length > 0) {
                    console.log('[Note Item] File drop detected, letting it pass through')
                    return
                  }
                  
                  e.preventDefault()
                  e.currentTarget.classList.remove('drag-over')
                  const draggedId = e.dataTransfer.getData('noteId')
                  if (!draggedId || draggedId === note.id) return
                  
                  const sortedNotes = [...safeNotes].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                  const draggedIndex = sortedNotes.findIndex(n => n.id === draggedId)
                  const targetIndex = sortedNotes.findIndex(n => n.id === note.id)
                  
                  if (draggedIndex === -1 || targetIndex === -1) return
                  
                  // Reorder by updating all positions
                  const newOrder = [...sortedNotes]
                  const [movedNote] = newOrder.splice(draggedIndex, 1)
                  newOrder.splice(targetIndex, 0, movedNote)
                  
                  // Update all positions in batch
                  const updates = newOrder.map((n, idx) => 
                    supabase
                      .from('notes')
                      .update({ position: idx })
                      .eq('id', n.id)
                  )
                  
                  await Promise.all(updates)
                  onRefresh?.()
                }}
              >
                <>
                  {/* Up/Down reorder buttons - always visible on hover */}
                  <div className="note-reorder-btns">
                    {note.pinned && <span style={{ fontSize: '0.7em', opacity: 0.7, marginRight: '0.2rem' }}>📌</span>}
                    <button className="note-reorder-btn" title="Move up" onClick={(e) => { e.stopPropagation(); moveUp(note.id) }}>▲</button>
                    <button className="note-reorder-btn" title="Move down" onClick={(e) => { e.stopPropagation(); moveDown(note.id) }}>▼</button>
                  </div>
                  <div className="note-main">
                    {editing === note.id ? (
                      <div
                        key="edit-mode"
                        className="note-content note-editing"
                        contentEditable="true"
                        suppressContentEditableWarning
                        onInput={(e) => setEditText(e.currentTarget.innerHTML)}
                        style={note.files && note.files.length > 0 ? { minHeight: '2em' } : {}}
                        data-placeholder={!value.trim() && note.files && note.files.length > 0 ? "Type here..." : ""}
                        onDragOver={(e) => {
                          if (e.dataTransfer.types.includes('Files')) {
                            e.preventDefault()
                            e.stopPropagation()
                            e.currentTarget.classList.add('note-drag-over')
                          }
                        }}
                        onDragLeave={(e) => {
                          e.currentTarget.classList.remove('note-drag-over')
                        }}
                        onDrop={async (e) => {
                          if (e.dataTransfer.files.length > 0) {
                            e.preventDefault()
                            e.stopPropagation()
                            e.currentTarget.classList.remove('note-drag-over')
                            
                            console.log('[File Drop] Started, userId:', userId)
                            
                            const file = e.dataTransfer.files[0]
                            console.log('[File Drop] File:', file.name, 'Size:', file.size, 'Type:', file.type)
                            
                            const sizeMB = file.size / (1024 * 1024)
                            
                            if (sizeMB > 49) {
                              alert(`File too large: ${sizeMB.toFixed(1)}MB\nMaximum allowed: 49MB`)
                              return
                            }
                            
                            if (sizeMB > 30) {
                              const proceed = confirm(`Warning: Large file (${sizeMB.toFixed(1)}MB)\nFiles over 30MB may take longer to upload.\nContinue?`)
                              if (!proceed) return
                            }
                            
                            // Show upload indicator
                            setUploading(prev => ({ ...prev, [note.id]: { fileName: file.name, progress: 0 } }))
                            
                            const fileName = `${Date.now()}_${file.name}`
                            const filePath = `${userId}/${fileName}`
                            console.log('[File Drop] Uploading to:', filePath)
                            
                            const { data, error } = await supabase.storage
                              .from('note-files')
                              .upload(filePath, file)
                            
                            // Clear upload indicator
                            setUploading(prev => {
                              const next = { ...prev }
                              delete next[note.id]
                              return next
                            })
                            
                            if (error) {
                              console.error('[File Drop] Upload error:', error)
                              alert('Upload failed: ' + error.message)
                              return
                            }
                            
                            console.log('[File Drop] Upload success, path:', data.path)
                            
                            const files = note.files || []
                            files.push({
                              name: file.name,
                              size: file.size,
                              path: data.path,
                              uploaded_at: new Date().toISOString()
                            })
                            
                            await supabase
                              .from('notes')
                              .update({ files })
                              .eq('id', note.id)
                            
                            // Add a newline after dropping image so user can continue typing
                            const editDiv = e.currentTarget
                            if (editDiv) {
                              // Ensure there's a line break for typing
                              if (!editDiv.innerHTML.trim() || !editDiv.innerHTML.endsWith('\n')) {
                                editDiv.innerHTML += '<br>'
                                setEditText(editDiv.innerHTML)
                              }
                              
                              // Move cursor to end
                              editDiv.focus()
                              const range = document.createRange()
                              const sel = window.getSelection()
                              range.selectNodeContents(editDiv)
                              range.collapse(false)
                              sel.removeAllRanges()
                              sel.addRange(range)
                            }
                            
                            console.log('[File Drop] Complete, refreshing...')
                            onRefresh?.()
                          }
                        }}
                        onBlur={(e) => {
                          const clickedToolbar = e.relatedTarget?.closest('[data-toolbar]')
                          if (clickedToolbar) return
                          
                          if (editText.trim() && editText !== value) {
                            update(note.id)
                          } else if (!editText.trim()) {
                            setEditing(null)
                            setEditText('')
                          } else {
                            setEditing(null)
                          }
                        }}
                        onKeyDown={(e) => {
                          // Save shortcuts
                          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                            e.preventDefault()
                            update(note.id)
                          }
                          if (e.key === 'Escape') {
                            e.preventDefault()
                            setEditing(null)
                            setEditText('')
                          }
                          
                          // Formatting shortcuts
                          if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
                            e.preventDefault()
                            document.execCommand('bold', false, null)
                          }
                          if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
                            e.preventDefault()
                            document.execCommand('italic', false, null)
                          }
                          if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
                            e.preventDefault()
                            document.execCommand('underline', false, null)
                          }
                        }}
                        ref={(el) => {
                          if (el && editing === note.id) {
                            // Set innerHTML only if different to avoid duplication
                            const currentContent = el.innerHTML
                            if (currentContent !== editText) {
                              // Clear first to prevent duplication
                              el.innerHTML = ''
                              // Then set new content
                              el.innerHTML = editText
                            }
                            // Only focus and set cursor on initial edit
                            if (!el.dataset.initialized) {
                              el.dataset.initialized = 'true'
                              const range = document.createRange()
                              const sel = window.getSelection()
                              range.selectNodeContents(el)
                              range.collapse(false)
                              sel.removeAllRanges()
                              sel.addRange(range)
                              el.focus()
                            }
                          } else if (el) {
                            delete el.dataset.initialized
                            // Clear content when not editing to prevent leaks
                            el.innerHTML = ''
                          }
                        }}
                      />
                    ) : (
                      <>
                        <div
                          key="view-mode"
                          className="note-content"
                          onClick={(e) => {
                            // Don't enter edit mode if clicking a link
                            if (e.target.tagName === 'A') {
                              return
                            }
                            setEditing(note.id)
                            setEditText(value)
                            setEditShareNote(note.shared_to || '')
                          }}
                          onDragOver={(e) => {
                            if (e.dataTransfer.types.includes('Files')) {
                              e.preventDefault()
                              e.stopPropagation()
                              e.currentTarget.classList.add('note-drag-over')
                            }
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.classList.remove('note-drag-over')
                          }}
                          onDrop={async (e) => {
                            if (e.dataTransfer.files.length > 0) {
                              e.preventDefault()
                              e.stopPropagation()
                              e.currentTarget.classList.remove('note-drag-over')
                              
                              console.log('[File Drop - View Mode] Started, userId:', userId)
                              
                              const file = e.dataTransfer.files[0]
                              console.log('[File Drop - View Mode] File:', file.name, 'Size:', file.size, 'Type:', file.type)
                              
                              const sizeMB = file.size / (1024 * 1024)
                              
                              if (sizeMB > 49) {
                                alert(`File too large: ${sizeMB.toFixed(1)}MB\nMaximum allowed: 49MB`)
                                return
                              }
                              
                              if (sizeMB > 30) {
                                const proceed = confirm(`Warning: Large file (${sizeMB.toFixed(1)}MB)\nFiles over 30MB may take longer to upload.\nContinue?`)
                                if (!proceed) return
                              }
                              
                              // Show upload indicator
                              setUploading(prev => ({ ...prev, [note.id]: { fileName: file.name, progress: 0 } }))
                              
                              const fileName = `${Date.now()}_${file.name}`
                              const filePath = `${userId}/${fileName}`
                              console.log('[File Drop - View Mode] Uploading to:', filePath)
                              
                              const { data, error } = await supabase.storage
                                .from('note-files')
                                .upload(filePath, file)
                              
                              // Clear upload indicator
                              setUploading(prev => {
                                const next = { ...prev }
                                delete next[note.id]
                                return next
                              })
                              
                              if (error) {
                                console.error('[File Drop - View Mode] Upload error:', error)
                                alert('Upload failed: ' + error.message)
                                return
                              }
                              
                              console.log('[File Drop - View Mode] Upload success, path:', data.path)
                              
                              const files = note.files || []
                              files.push({
                                name: file.name,
                                size: file.size,
                                path: data.path,
                                uploaded_at: new Date().toISOString()
                              })
                              
                              await supabase
                                .from('notes')
                                .update({ files })
                                .eq('id', note.id)
                              
                              // Add a newline to note content if dropping image, so user can type below
                              const currentText = note.text || ''
                              if (!currentText.trim() || !currentText.endsWith('\n')) {
                                await supabase
                                  .from('notes')
                                  .update({ text: currentText + '\n' })
                                  .eq('id', note.id)
                              }
                              
                              console.log('[File Drop - View Mode] Complete, refreshing...')
                              onRefresh?.()
                            }
                          }}
                          title="Click to edit or drag files to attach"
                        >
                          {parseFormatting(value)}
                        </div>

                        {note.files && note.files.length > 0 && (
                          <div className="note-files">
                            {note.files.map((file, idx) => {
                              const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name)
                              return (
                                <div key={idx} className={`note-file ${!isImage ? 'note-file-attachment' : ''}`}>
                                  <FileAttachment file={file} noteId={note.id} onRefresh={onRefresh} />
                                </div>
                              )
                            })}
                          </div>
                        )}

                        {uploading[note.id] && (
                          <div style={{ 
                            marginTop: '0.5rem', 
                            padding: '0.5rem 0.75rem', 
                            background: 'rgba(59, 130, 246, 0.15)', 
                            border: '2px solid rgba(59, 130, 246, 0.5)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.85em',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            color: 'var(--text)',
                            fontWeight: '500'
                          }}>
                            <div style={{ 
                              width: '1.2rem', 
                              height: '1.2rem', 
                              border: '3px solid rgba(59, 130, 246, 0.8)', 
                              borderTop: '3px solid transparent',
                              borderRadius: '50%',
                              animation: 'spin 0.8s linear infinite',
                              flexShrink: 0
                            }} />
                            <span>📤 Uploading {uploading[note.id].fileName}...</span>
                          </div>
                        )}

                        <div className="note-actions-overlay">
                          {note.shared_to && (
                            <span 
                              style={{ fontSize: '0.8em', marginRight: '0.3rem' }}
                              title={`Shared to ${workspaces.find(w => w.id === note.shared_to)?.name || note.shared_to}`}
                            >
                              🔄
                            </span>
                          )}
                          {note.files && note.files.length > 0 && (
                            <span className="note-file-badge" title={`${note.files.length} attachment${note.files.length > 1 ? 's' : ''}`}>
                              📎 {note.files.length}
                            </span>
                          )}
                          <span style={{ fontSize: '0.65em', color: 'var(--text)' }}>
                            {note.updated_at ? new Date(note.updated_at).toLocaleString('en-US', { 
                              month: 'numeric', 
                              day: 'numeric', 
                              year: '2-digit',
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true 
                            }) : ''}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                  {editing === note.id && (
                  <>
                    {note.files && note.files.length > 0 && (
                      <div className="note-files" style={{ marginTop: '0.5rem' }}>
                        {note.files.map((file, idx) => {
                          const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name)
                          return (
                            <div key={idx} className={`note-file ${!isImage ? 'note-file-attachment' : ''}`}>
                              <FileAttachment file={file} noteId={note.id} onRefresh={onRefresh} />
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {uploading[note.id] && (
                      <div style={{ 
                        marginTop: '0.5rem', 
                        padding: '0.5rem 0.75rem', 
                        background: 'rgba(59, 130, 246, 0.15)', 
                        border: '2px solid rgba(59, 130, 246, 0.5)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.85em',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: 'var(--text)',
                        fontWeight: '500'
                      }}>
                        <div style={{ 
                          width: '1.2rem', 
                          height: '1.2rem', 
                          border: '3px solid rgba(59, 130, 246, 0.8)', 
                          borderTop: '3px solid transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.8s linear infinite',
                          flexShrink: 0
                        }} />
                        <span>📤 Uploading {uploading[note.id].fileName}...</span>
                      </div>
                    )}

                    <div className="note-edit-toolbar" data-toolbar="true">
                      {/* Row 1: formatting + colors */}
                      <div style={{ display: 'flex', gap: '0.15rem', alignItems: 'center', width: '100%', flexWrap: 'nowrap' }}>
                        <button type="button" className="btn-xs" onMouseDown={e => e.preventDefault()} onClick={() => document.execCommand('bold', false, null)} title="Bold"><strong>B</strong></button>
                        <button type="button" className="btn-xs" onMouseDown={e => e.preventDefault()} onClick={() => document.execCommand('underline', false, null)} title="Underline"><u>U</u></button>
                        <button type="button" className="btn-xs" onMouseDown={e => e.preventDefault()} onClick={() => {
                          const selection = window.getSelection()
                          const selectedText = selection?.toString()
                          if (selectedText?.includes('\n')) {
                            const range = selection.getRangeAt(0)
                            range.deleteContents()
                            const ul = document.createElement('ul')
                            ul.className = 'note-bullets'
                            ul.innerHTML = selectedText.split('\n').filter(l => l.trim()).map(l => `<li>${l}</li>`).join('')
                            range.insertNode(ul)
                            range.collapse(false)
                          } else {
                            document.execCommand('insertUnorderedList', false, null)
                            setTimeout(() => {
                              document.querySelectorAll('.note-editing ul:not(.note-bullets)').forEach(ul => ul.classList.add('note-bullets'))
                            }, 0)
                          }
                          setTimeout(() => document.querySelector('.note-editing')?.dispatchEvent(new Event('input', { bubbles: true })), 10)
                        }} title="Bullet">•</button>
                        <div style={{ width: '1px', height: '14px', background: 'var(--border)', margin: '0 0.1rem', flexShrink: 0 }} />
                        {[
                          ['#ff6b6b','Red'], ['#6c8fff','Blue'], ['#6bffb8','Green'],
                          ['#ffd32a','Yellow'], ['#ff9f2a','Orange'], ['#111111','Black'], ['#f0f0f0','White']
                        ].map(([color, label]) => (
                          <button key={color} type="button" className="color-dot"
                            onMouseDown={e => e.preventDefault()}
                            onClick={e => {
                              document.execCommand('foreColor', false, color)
                              e.target.closest('.note-item')?.querySelector('.note-editing')?.dispatchEvent(new Event('input', { bubbles: true }))
                            }}
                            title={label} style={{ background: color, border: color === '#f0f0f0' ? '1px solid #888' : color === '#111111' ? '1px solid #555' : undefined }}
                          />
                        ))}
                        <input type="color" className="color-picker" title="Custom color"
                          onMouseDown={() => {
                            const sel = window.getSelection()
                            if (sel && sel.rangeCount > 0) savedSelectionRef.current = sel.getRangeAt(0).cloneRange()
                          }}
                          onChange={e => {
                            if (savedSelectionRef.current) {
                              const sel = window.getSelection()
                              sel.removeAllRanges()
                              sel.addRange(savedSelectionRef.current)
                            }
                            document.execCommand('foreColor', false, e.target.value)
                            document.querySelector('.note-editing')?.dispatchEvent(new Event('input', { bubbles: true }))
                          }}
                        />
                      </div>
                      {/* Row 2: attach, share, spacer, timestamp, pin, delete */}
                      <div style={{ display: 'flex', gap: '0.15rem', alignItems: 'center', width: '100%' }}>
                        <button type="button" className="btn-xs"
                          onMouseDown={e => e.preventDefault()}
                          title="Attach file (max 49MB)"
                          style={{ color: 'var(--text-dim)', flexShrink: 0 }}
                          onClick={() => {
                            const input = document.createElement('input')
                            input.type = 'file'
                            input.accept = '*/*'
                            input.onchange = async (e) => {
                              const file = e.target.files[0]
                              if (!file) return
                              const sizeMB = file.size / (1024 * 1024)
                              if (sizeMB > 49) { alert(`File too large: ${sizeMB.toFixed(1)}MB\nMaximum: 49MB`); return }
                              if (sizeMB > 30) { if (!confirm(`Large file (${sizeMB.toFixed(1)}MB) — continue?`)) return }
                              const fileName = `${Date.now()}_${file.name}`
                              const { data, error } = await supabase.storage.from('note-files').upload(`${userId}/${fileName}`, file)
                              if (error) { alert('Upload failed: ' + error.message); return }
                              const files = [...(note.files || []), { name: file.name, size: file.size, path: data.path, uploaded_at: new Date().toISOString() }]
                              await supabase.from('notes').update({ files }).eq('id', note.id)
                              onRefresh?.()
                            }
                            input.click()
                          }}
                        >📎</button>
                        {canShare && (
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            <button type="button" className="btn-xs"
                              onMouseDown={e => e.preventDefault()}
                              onClick={e => {
                                e.stopPropagation()
                                const sel = e.currentTarget.nextSibling
                                sel.style.display = sel.style.display === 'none' ? 'block' : 'none'
                              }}
                              title={editShareNote ? `Sharing → ${otherWorkspaces.find(w => w.id === editShareNote)?.name}` : 'Share note'}
                              style={{ color: editShareNote ? 'var(--accent)' : 'var(--text-dim)', flexShrink: 0 }}
                            >📤</button>
                            <select className="input"
                              style={{ display: 'none', position: 'absolute', bottom: 'calc(100% + 4px)', left: 0, zIndex: 300, fontSize: '0.78em', padding: '0.25rem 0.4rem', minWidth: '130px', background: 'var(--bg2)', border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)', boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                              value={editShareNote}
                              onChange={e => { setEditShareNote(e.target.value); e.target.style.display = 'none' }}
                            >
                              <option value=''>No sharing</option>
                              {otherWorkspaces.map(w => <option key={w.id} value={w.id}>→ {w.name}</option>)}
                            </select>
                          </div>
                        )}
                        <div style={{ flex: 1 }} />
                        <span style={{ fontSize: '0.6em', color: 'var(--text-dim)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {note.updated_at ? new Date(note.updated_at).toLocaleString('en-AU', { month: 'numeric', day: 'numeric', year: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true }) : ''}
                        </span>
                        <button type="button" className="btn-xs" onMouseDown={e => e.preventDefault()}
                          onClick={() => togglePin(note.id, note.pinned)}
                          title={note.pinned ? 'Unpin' : 'Pin to top'}
                          style={{ color: note.pinned ? 'var(--accent)' : 'var(--text-dim)', flexShrink: 0 }}
                        >📌</button>
                        <button type="button" className="btn-xs" onMouseDown={e => e.preventDefault()}
                          onClick={() => remove(note.id)}
                          title="Delete note"
                          style={{ color: 'var(--danger)', flexShrink: 0 }}
                        >🗑</button>
                      </div>
                    </div>
                )}
                </>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}