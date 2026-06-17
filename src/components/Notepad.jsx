import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import DOMPurify from 'dompurify'

// ── FILE ATTACHMENT with image preview + zoom ──────────────────────
function NotepadFile({ file, tabId, onRefresh, userId }) {
  const [imageUrl, setImageUrl] = useState(null)
  const [scale, setScale] = useState(file.scale || 100)
  const isImage = /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(file.name)

  useEffect(() => {
    if (isImage && file.path) {
      supabase.storage.from('note-files').createSignedUrl(file.path, 3600)
        .then(({ data }) => { if (data) setImageUrl(data.signedUrl) })
    }
  }, [file.path, isImage])

  const handleScaleChange = async (val) => {
    const newScale = parseInt(val)
    setScale(newScale)
    const { data: tab } = await supabase.from('notepads').select('files').eq('id', tabId).single()
    const updated = (tab?.files || []).map(f => f.path === file.path ? { ...f, scale: newScale } : f)
    await supabase.from('notepads').update({ files: updated }).eq('id', tabId)
  }

  const handleDelete = async () => {
    if (!await window.confirm(`Delete "${file.name}"?`)) return
    if (file.path) await supabase.storage.from('note-files').remove([file.path])
    const { data: tab } = await supabase.from('notepads').select('files').eq('id', tabId).single()
    const updated = (tab?.files || []).filter(f => f.path !== file.path)
    await supabase.from('notepads').update({ files: updated }).eq('id', tabId)
    onRefresh?.()
  }

  const downloadUrl = imageUrl || file.url || '#'

  return (
    <div className="notepad-file-chip">
      {isImage && <img src={downloadUrl} alt="" className="notepad-file-thumb" />}
      <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className="notepad-file-name">
        {file.name.length > 25 ? file.name.substring(0, 22) + '...' : file.name}
      </a>
      <button className="notepad-file-remove" onClick={handleDelete} title="Remove">×</button>
    </div>
  )
}

export default function Notepad({ userId, workspaceId, workspaces = [], onRefresh, theme }) {
  const [tabs, setTabs] = useState([])
  const [activeTab, setActiveTab] = useState(() => {
    try { return localStorage.getItem(`notepad_active_${workspaceId}`) || null } catch { return null }
  })
  const activeTabRef = useRef(null)
  useEffect(() => {
    activeTabRef.current = activeTab
    if (activeTab && workspaceId) localStorage.setItem(`notepad_active_${workspaceId}`, activeTab)
  }, [activeTab, workspaceId])
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showNewTabMenu, setShowNewTabMenu] = useState(false)
  const editorRef = useRef(null)
  const [selectedImg, setSelectedImg] = useState(null) // { el, src, width }

  // Handle clicks inside editor - detect image clicks
  const handleEditorClick = (e) => {
    handleEditorClickForTodo(e)
    // Remove previous selection highlight
    editorRef.current?.querySelectorAll('.np-img-selected').forEach(el => el.classList.remove('np-img-selected'))
    if (e.target.tagName === 'IMG') {
      const el = e.target
      el.classList.add('np-img-selected')
      const width = parseInt(el.style.width) || 100
      setSelectedImg({ el, src: el.src, width })
    } else {
      setSelectedImg(null)
    }
  }

  const imgResize = (val) => {
    if (!selectedImg?.el) return
    const w = parseInt(val)
    selectedImg.el.style.width = w + '%'
    selectedImg.el.style.maxWidth = '100%'
    setSelectedImg(prev => ({ ...prev, width: w }))
    handleInput()
  }

  const imgDelete = () => {
    if (!selectedImg?.el) return
    selectedImg.el.remove()
    setSelectedImg(null)
    handleInput()
  }

  const imgDeselect = () => {
    editorRef.current?.querySelectorAll('.np-img-selected').forEach(el => el.classList.remove('np-img-selected'))
    setSelectedImg(null)
  }
  const saveTimerRef = useRef(null)
  const lastSavedRef = useRef('')

  // ── FETCH TABS ──────────────────────────────────────────────
  const fetchTabs = useCallback(async () => {
    if (!userId || !workspaceId) return
    const { data, error } = await supabase
      .from('notepads')
      .select('*')
      .or(`workspace_id.eq.${workspaceId},shared_to.eq.*,shared_to.eq.${workspaceId}`)
      .eq('user_id', userId)
      .order('tab_order', { ascending: true })
    if (error) { console.error('Notepad fetch error:', error.message); return }

    // Deduplicate by id
    const unique = (data || []).filter((t, i, a) => a.findIndex(x => x.id === t.id) === i)
    setTabs(unique)

    // If no tabs, create default local tab
    if (unique.length === 0) {
      const { data: newTab, error: err } = await supabase.from('notepads').insert({
        user_id: userId,
        workspace_id: workspaceId,
        title: 'Local',
        content: '',
        tab_order: 0,
        shared_to: null,
      }).select().single()
      if (!err && newTab) {
        setTabs([newTab])
        setActiveTab(newTab.id)
      }
    } else if (!activeTabRef.current || !unique.find(t => t.id === activeTabRef.current)) {
      setActiveTab(unique[0].id)
    }
  }, [userId, workspaceId])

  useEffect(() => { fetchTabs() }, [fetchTabs])

  // ── ACTIVE TAB DATA ─────────────────────────────────────────
  const currentTab = tabs.find(t => t.id === activeTab)

  // Load content into editor when switching tabs
  useEffect(() => {
    if (!editorRef.current || !currentTab) return
    if (editorRef.current.innerHTML !== currentTab.content) {
      editorRef.current.innerHTML = DOMPurify.sanitize(currentTab.content || '')
      lastSavedRef.current = currentTab.content || ''
    }
  }, [activeTab, currentTab?.id])

  // ── AUTO-SAVE ───────────────────────────────────────────────
  const handleInput = () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(async () => {
      if (!editorRef.current || !activeTab) return
      const content = editorRef.current.innerHTML
      if (content === lastSavedRef.current) return
      setSaving(true)
      const { error } = await supabase
        .from('notepads')
        .update({ content })
        .eq('id', activeTab)
      if (!error) {
        lastSavedRef.current = content
        setTabs(prev => prev.map(t => t.id === activeTab ? { ...t, content } : t))
        setSaved(true); setTimeout(() => setSaved(false), 3000)
      }
      setSaving(false)
    }, 1500)
  }

  // Save on unmount / tab switch
  const saveNow = useCallback(async () => {
    if (!editorRef.current || !activeTab) return
    const content = editorRef.current.innerHTML
    if (content === lastSavedRef.current) return
    await supabase.from('notepads').update({ content }).eq('id', activeTab)
    lastSavedRef.current = content
    setTabs(prev => prev.map(t => t.id === activeTab ? { ...t, content } : t))
  }, [activeTab])

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); saveNow() }
  }, [activeTab])

  // ── TAB MANAGEMENT ──────────────────────────────────────────
  const addTab = async (shared = false) => {
    if (!userId || !workspaceId) { console.error('No userId or workspaceId'); return }
    const nextOrder = tabs.length
    const title = shared ? `Share ${nextOrder + 1}` : `Tab ${nextOrder + 1}`
    const { data, error } = await supabase.from('notepads').insert({
      user_id: userId,
      workspace_id: workspaceId,
      title,
      content: '',
      tab_order: nextOrder,
      shared_to: shared ? '*' : null,
    }).select().single()
    if (error) { console.error('Add tab error:', error.message); alert('Could not create tab: ' + error.message); return }
    setTabs(prev => [...prev, data])
    setActiveTab(data.id)
    setShowNewTabMenu(false)
  }

  const renameTab = async (id) => {
    const tab = tabs.find(t => t.id === id)
    if (!tab) return
    const name = await window.prompt('Tab name:', tab.title || '')
    if (!name?.trim()) return
    const { error } = await supabase.from('notepads').update({ title: name.trim() }).eq('id', id)
    if (!error) setTabs(prev => prev.map(t => t.id === id ? { ...t, title: name.trim() } : t))
  }

  const closeTab = async (id) => {
    if (tabs.length <= 1) return // keep at least one
    const ok = await window.confirm('Delete this notepad tab? Content will be lost.')
    if (!ok) return
    await supabase.from('notepads').delete().eq('id', id)
    setTabs(prev => prev.filter(t => t.id !== id))
    if (activeTab === id) {
      const remaining = tabs.filter(t => t.id !== id)
      setActiveTab(remaining[0]?.id || null)
    }
  }

  // ── TOOLBAR COMMANDS ────────────────────────────────────────
  const exec = (cmd, val = null) => {
    editorRef.current?.focus()
    document.execCommand(cmd, false, val)
    handleInput()
  }

  const changeFontSize = (delta) => {
    editorRef.current?.focus()
    const current = document.queryCommandValue('fontSize')
    const size = Math.min(7, Math.max(1, (parseInt(current) || 3) + delta))
    document.execCommand('fontSize', false, String(size))
    handleInput()
  }

  // ── CHECKBOX / TODO ────────────────────────────────────────
  const insertCheckboxes = () => {
    if (!editorRef.current) return
    const sel = window.getSelection()
    
    // If selection contains existing checkboxes, toggle them
    if (sel.rangeCount && !sel.isCollapsed) {
      const range = sel.getRangeAt(0)
      const container = range.commonAncestorContainer.nodeType === 3 ? range.commonAncestorContainer.parentElement : range.commonAncestorContainer
      const existing = container.querySelectorAll ? container.querySelectorAll('.np-todo') : []
      if (existing.length > 0) {
        existing.forEach(el => {
          const box = el.querySelector('.np-todo-box')
          if (!box) return
          const isChecked = box.textContent === '☑'
          box.textContent = isChecked ? '☐' : '☑'
          el.classList.toggle('np-todo-done', !isChecked)
        })
        handleInput()
        collapseChecked()
        return
      }
    }
    
    // No existing checkboxes — convert selected lines to checkboxes
    if (!sel.rangeCount || sel.isCollapsed) { alert('Select text to add checkboxes'); return }
    const text = sel.toString()
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) return
    
    const html = lines.map(line => {
      // Strip leading dash/bullet but not dashes within words
      const cleaned = line.replace(/^\s*[-–—•]\s+/, '').replace(/^\s*[-–—•](?=[A-Za-z])/, '')
      return `<div class="np-todo"><span class="np-todo-box" contenteditable="false">☐</span> ${DOMPurify.sanitize(cleaned || line)}</div>`
    }).join('')
    
    document.execCommand('insertHTML', false, html)
    handleInput()
  }

  // Handle clicks on checkbox boxes
  const handleEditorClickForTodo = (e) => {
    const box = e.target.closest('.np-todo-box')
    if (!box) return
    e.preventDefault()
    e.stopPropagation()
    const todo = box.closest('.np-todo')
    if (!todo) return
    const isChecked = box.textContent === '☑'
    box.textContent = isChecked ? '☐' : '☑'
    todo.classList.toggle('np-todo-done', !isChecked)
    handleInput()
    collapseChecked()
  }

  // Collapse consecutive checked items
  const collapseChecked = () => {
    if (!editorRef.current) return
    const collapseEnabled = theme?.checkboxCollapseEnabled ?? true
    const threshold = theme?.checkboxCollapseCount ?? 3
    if (!collapseEnabled) return
    
    // Remove existing collapse markers
    editorRef.current.querySelectorAll('.np-todo-collapsed').forEach(el => el.remove())
    // Expand any hidden items first
    editorRef.current.querySelectorAll('.np-todo-hidden').forEach(el => el.classList.remove('np-todo-hidden'))
    
    const todos = Array.from(editorRef.current.querySelectorAll('.np-todo'))
    let streak = []
    
    const collapseStreak = (items) => {
      if (items.length < threshold) return
      // Hide middle items, show first and last
      for (let i = 1; i < items.length - 1; i++) {
        items[i].classList.add('np-todo-hidden')
      }
      // Add collapse marker after first item
      const marker = document.createElement('div')
      marker.className = 'np-todo-collapsed'
      marker.contentEditable = 'false'
      marker.textContent = `▸ ${items.length - 2} more checked`
      marker.title = 'Click to expand'
      marker.onclick = () => {
        items.forEach(it => it.classList.remove('np-todo-hidden'))
        marker.remove()
        handleInput()
      }
      items[0].after(marker)
    }
    
    for (const todo of todos) {
      if (todo.classList.contains('np-todo-done')) {
        streak.push(todo)
      } else {
        if (streak.length >= threshold) collapseStreak(streak)
        streak = []
      }
    }
    if (streak.length >= threshold) collapseStreak(streak)
  }

  const dashToBullets = () => {
    if (!editorRef.current) return
    const sel = window.getSelection()
    if (!sel.rangeCount || sel.isCollapsed) { alert('Select the text you want to convert to bullets'); return }
    
    // Use plain text to avoid DOM traversal issues
    const text = sel.toString()
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length === 0) return
    
    const items = lines.map(line => {
      const cleaned = line.replace(/^\s*[-–—•]\s*/, '')
      return '<li>' + DOMPurify.sanitize(cleaned || line) + '</li>'
    }).join('')
    
    document.execCommand('insertHTML', false, '<ul>' + items + '</ul>')
    handleInput()
  }

  const insertHR = (style = 'solid') => {
    editorRef.current?.focus()
    const hr = document.createElement('hr')
    hr.style.border = 'none'
    hr.style.borderTop = `2px ${style} var(--text-dim)`
    hr.style.margin = '0.5em 0'
    const sel = window.getSelection()
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0)
      range.deleteContents()
      range.insertNode(hr)
      range.setStartAfter(hr)
      range.collapse(true)
      sel.removeAllRanges()
      sel.addRange(range)
    }
    handleInput()
  }

  const setBlock = (tag) => {
    exec('formatBlock', tag)
  }

  const setColor = (color) => {
    exec('foreColor', color)
  }

  // ── FILE HANDLING ───────────────────────────────────────────
  const attachFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '*/*'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file || !currentTab) return
      const fileName = `${Date.now()}_${file.name}`
      const filePath = `${userId}/${fileName}`
      const { error: upErr } = await supabase.storage.from('note-files').upload(filePath, file)
      if (upErr) { alert('Upload failed: ' + JSON.stringify(upErr)); return }
      const { data: urlData } = supabase.storage.from('note-files').getPublicUrl(filePath)
      const newFiles = [...(currentTab.files || []), { name: file.name, url: urlData.publicUrl, path: filePath }]
      await supabase.from('notepads').update({ files: newFiles }).eq('id', currentTab.id)
      fetchTabs()
    }
    input.click()
  }

  const removeFile = async (fileIndex) => {
    if (!currentTab) return
    const file = currentTab.files?.[fileIndex]
    if (!file) return
    if (file.path) await supabase.storage.from('note-files').remove([file.path])
    const newFiles = (currentTab.files || []).filter((_, i) => i !== fileIndex)
    await supabase.from('notepads').update({ files: newFiles }).eq('id', currentTab.id)
    fetchTabs()
  }

  // ── COLOR DOTS ──────────────────────────────────────────────
  const [customColor, setCustomColor] = useState('#ffffff')
  const colors = [
    { var: '--note-color-1', fallback: '#ff6b6b' },
    { var: '--note-color-2', fallback: '#4d9eff' },
    { var: '--note-color-3', fallback: '#6bffb8' },
    { var: '--note-color-4', fallback: '#ffd32a' },
    { fallback: '#ffffff' },
    { fallback: '#ff9f43' },
    { fallback: '#a55eea' },
    { fallback: '#0abde3' },
  ]

  // ── RENDER ──────────────────────────────────────────────────
  return (
    <div className="notepad-container">
      {/* ── TABS ROW ─────────────────────────────────────── */}
      <div className="notepad-tabs">
        {tabs.map(tab => (
          <div
            key={tab.id}
            className={`notepad-tab ${activeTab === tab.id ? 'active' : ''} ${tab.shared_to ? 'shared' : ''}`}
            onClick={async () => { await saveNow(); setActiveTab(tab.id) }}
          >
            {tab.shared_to && <span style={{ marginRight: '0.25rem' }}>🔗</span>}
            <span className="notepad-tab-title" onDoubleClick={(e) => { e.stopPropagation(); renameTab(tab.id) }}>{tab.title}</span>
            {tabs.length > 1 && (
              <button
                className="notepad-tab-close"
                onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                title="Close tab"
              >×</button>
            )}
          </div>
        ))}
        <div style={{ position: 'relative' }}>
          <button className="notepad-tab notepad-tab-add" onClick={() => setShowNewTabMenu(p => !p)} title="New tab">+</button>
          {showNewTabMenu && createPortal(
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9998 }} onClick={() => setShowNewTabMenu(false)}>
              <div className="notepad-new-tab-menu" style={{ position: 'fixed', top: '120px', right: '20px', zIndex: 9999 }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '0.5rem 0.6rem', fontSize: '0.8em', fontWeight: 600, color: 'var(--text-dim)', borderBottom: '1px solid var(--border)' }}>New Tab</div>
                <button onClick={() => addTab(false)}>📄 Local tab</button>
                <button onClick={() => addTab(true)}>🔗 Shared tab (all workspaces)</button>
              </div>
            </div>,
          document.body)}
        </div>
      </div>

      {/* ── TOP TOOLBAR (persistent) ─────────────────────── */}
      <div className="notepad-toolbar">
        <div className="np-row">
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')} title="Bold"><b>B</b></button>
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')} title="Italic"><i>I</i></button>
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => exec('underline')} title="Underline"><u>U</u></button>
          <div className="np-sep" />
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => setBlock('h1')} title="Heading 1" style={{ fontSize: '0.85em', fontWeight: 800 }}>H1</button>
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => setBlock('h2')} title="Heading 2" style={{ fontSize: '0.8em', fontWeight: 700 }}>H2</button>
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => setBlock('p')} title="Body text" style={{ fontSize: '0.75em' }}>P</button>
          <div className="np-sep" />
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => changeFontSize(-1)} title="Smaller text" style={{ fontSize: '0.7em', fontWeight: 700 }}>A−</button>
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => changeFontSize(1)} title="Bigger text" style={{ fontSize: '1em', fontWeight: 700 }}>A+</button>
          <div className="np-sep" />
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => insertHR('solid')} title="Solid line">─</button>
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => insertHR('dotted')} title="Dotted line">┈</button>
          <div className="np-sep" />
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertUnorderedList')} title="Bullet list">•</button>
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertOrderedList')} title="Numbered list">1.</button>
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={insertCheckboxes} title="Add/toggle checkboxes">☑</button>
          <div className="np-sep" />
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={dashToBullets} title="Convert dashes to bullets">⇢•</button>
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => { editorRef.current?.focus(); document.execCommand('undo') }} title="Undo (Ctrl+Z)">↩</button>
          <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={attachFile} title="Attach file">📎</button>
          <div style={{ flex: 1 }} />
          <span className={`np-save-light ${saving ? 'saving' : saved ? 'saved' : ''}`} title={saving ? 'Saving...' : saved ? 'Saved' : 'Idle'} />
          {currentTab?.shared_to && <span style={{ fontSize: '0.65em', color: 'var(--accent)', opacity: 0.7 }}>🔗 {currentTab.shared_to === '*' ? 'All workspaces' : workspaces.find(w => w.id === currentTab.shared_to)?.name || ''}</span>}
        </div>
        <div className="np-row">
          {colors.map((c, i) => {
            const col = c.var ? (getComputedStyle(document.documentElement).getPropertyValue(c.var).trim() || c.fallback) : c.fallback
            return <button key={i} className="np-color-dot" onMouseDown={e => e.preventDefault()} onClick={() => setColor(col)} style={{ background: col }} title={col} />
          })}
          <label className="np-color-dot np-color-custom" style={{ position: 'relative', cursor: 'pointer' }} title="Custom color">
            <input type="color" value={customColor} onChange={e => { setCustomColor(e.target.value); setColor(e.target.value) }} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }} />
          </label>
        </div>
      </div>

      {/* ── EDITOR BODY (scrollable) ─────────────────────── */}
      <div className="notepad-body">
        <div
          ref={editorRef}
          className="notepad-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onClick={handleEditorClick}
          onPaste={(e) => {
            e.preventDefault()
            const text = e.clipboardData.getData('text/html') || e.clipboardData.getData('text/plain')
            document.execCommand('insertHTML', false, DOMPurify.sanitize(text))
            handleInput()
          }}
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('notepad-drag-over') }}
          onDragLeave={(e) => { e.currentTarget.classList.remove('notepad-drag-over') }}
          onDrop={async (e) => {
            e.preventDefault()
            e.currentTarget.classList.remove('notepad-drag-over')
            if (!e.dataTransfer.files.length || !currentTab) return
            const file = e.dataTransfer.files[0]
            const fileName = `${Date.now()}_${file.name}`
            const filePath = `${userId}/${fileName}`
            const { error: upErr } = await supabase.storage.from('note-files').upload(filePath, file)
            if (upErr) { alert('Upload failed: ' + JSON.stringify(upErr)); return }
            const { data: urlData } = supabase.storage.from('note-files').getPublicUrl(filePath)
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
            if (isImage) {
              document.execCommand('insertHTML', false, `<img src="${urlData.publicUrl}" style="width:100%;max-width:100%;height:auto;border-radius:4px;margin:0.3em 0;display:block" />`)
              handleInput()
            }
            const newFiles = [...(currentTab.files || []), { name: file.name, url: urlData.publicUrl, path: filePath }]
            await supabase.from('notepads').update({ files: newFiles }).eq('id', currentTab.id)
            fetchTabs()
          }}
          data-placeholder="Start typing or drag files here..."
        />
      </div>

      {/* ── IMAGE CONTROLS (shown when image selected) ───── */}
      {selectedImg && (
        <div className="np-img-controls">
          <input type="range" min="10" max="150" value={selectedImg.width} onChange={e => imgResize(e.target.value)} style={{ width: '100px', accentColor: 'var(--accent)' }} title="Scale image" />
          <span style={{ fontSize: '0.7em', color: 'var(--text-dim)', minWidth: '2.5em' }}>{selectedImg.width}%</span>
          <button className="btn-xs" onClick={() => window.open(selectedImg.src, '_blank')} onMouseDown={e => e.preventDefault()} title="Open full size">↗</button>
          <button className="btn-xs" onClick={imgDelete} onMouseDown={e => e.preventDefault()} title="Delete image" style={{ color: 'var(--danger)' }}>×</button>
          <button className="btn-xs" onClick={imgDeselect} onMouseDown={e => e.preventDefault()} title="Done">✓</button>
        </div>
      )}

      {/* ── BOTTOM BAR (files, always visible) ───────────── */}
      <div className="notepad-files-bar" 
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('notepad-drag-over') }}
        onDragLeave={(e) => { e.currentTarget.classList.remove('notepad-drag-over') }}
        onDrop={async (e) => {
          e.preventDefault(); e.currentTarget.classList.remove('notepad-drag-over')
          if (!e.dataTransfer.files.length || !currentTab) return
          const file = e.dataTransfer.files[0]
          const fileName = `${Date.now()}_${file.name}`
          const filePath = `${userId}/${fileName}`
          const { error: upErr } = await supabase.storage.from('note-files').upload(filePath, file)
          if (upErr) { alert('Upload failed: ' + JSON.stringify(upErr)); return }
          const { data: urlData } = supabase.storage.from('note-files').getPublicUrl(filePath)
          const newFiles = [...(currentTab.files || []), { name: file.name, url: urlData.publicUrl, path: filePath }]
          await supabase.from('notepads').update({ files: newFiles }).eq('id', currentTab.id)
          fetchTabs()
        }}
      >
        {(!currentTab?.files || currentTab.files.length === 0) && (
          <span style={{ fontSize: '0.7em', color: 'var(--text-dim)', opacity: 0.4 }}>Drop files here or click 📎</span>
        )}
        {currentTab?.files && currentTab.files.length > 0 && <>
          {currentTab.files.map((file, i) => (
            <NotepadFile key={i} file={file} tabId={currentTab.id} onRefresh={fetchTabs} userId={userId} />
          ))}
        </>}
      </div>
    </div>
  )
}
