import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../lib/supabase'
import DOMPurify from 'dompurify'

export default function Notepad({ userId, workspaceId, workspaces = [], onRefresh }) {
  const [tabs, setTabs] = useState([])
  const [activeTab, setActiveTab] = useState(null)
  const [saving, setSaving] = useState(false)
  const [showNewTabMenu, setShowNewTabMenu] = useState(false)
  const editorRef = useRef(null)
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
    } else if (!activeTab || !unique.find(t => t.id === activeTab)) {
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
      if (!error) lastSavedRef.current = content
      setSaving(false)
    }, 1500) // save after 1.5s of inactivity
  }

  // Save on unmount / tab switch
  const saveNow = useCallback(async () => {
    if (!editorRef.current || !activeTab) return
    const content = editorRef.current.innerHTML
    if (content === lastSavedRef.current) return
    await supabase.from('notepads').update({ content }).eq('id', activeTab)
    lastSavedRef.current = content
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
      if (upErr) { alert('Upload failed: ' + upErr.message); return }
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
  const colors = [
    { var: '--note-color-1', fallback: '#ff6b6b' },
    { var: '--note-color-2', fallback: '#6c8fff' },
    { var: '--note-color-3', fallback: '#6bffb8' },
    { var: '--note-color-4', fallback: '#ffd32a' },
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
            <span className="notepad-tab-title">{tab.title}</span>
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
              <div className="notepad-new-tab-menu" style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 9999 }} onClick={e => e.stopPropagation()}>
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
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => exec('bold')} title="Bold"><b>B</b></button>
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => exec('italic')} title="Italic"><i>I</i></button>
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => exec('underline')} title="Underline"><u>U</u></button>
        <div className="np-sep" />
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => setBlock('h1')} title="Heading 1" style={{ fontSize: '0.85em', fontWeight: 800 }}>H1</button>
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => setBlock('h2')} title="Heading 2" style={{ fontSize: '0.8em', fontWeight: 700 }}>H2</button>
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => setBlock('p')} title="Body text" style={{ fontSize: '0.75em' }}>P</button>
        <div className="np-sep" />
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => insertHR('solid')} title="Solid line">─</button>
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => insertHR('dashed')} title="Dashed line">┄</button>
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => insertHR('dotted')} title="Dotted line">┈</button>
        <div className="np-sep" />
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertUnorderedList')} title="Bullet list">•</button>
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={() => exec('insertOrderedList')} title="Numbered list">1.</button>
        <div className="np-sep" />
        {colors.map((c, i) => {
          const col = getComputedStyle(document.documentElement).getPropertyValue(c.var).trim() || c.fallback
          return <button key={i} className="np-color-dot" onMouseDown={e => e.preventDefault()} onClick={() => setColor(col)} style={{ background: col }} />
        })}
        <button className="np-btn" onMouseDown={e => e.preventDefault()} onClick={attachFile} title="Attach file">📎</button>
        <div style={{ flex: 1 }} />
        {saving && <span style={{ fontSize: '0.65em', color: 'var(--text-dim)', opacity: 0.6 }}>Saving...</span>}
        {currentTab?.shared_to && <span style={{ fontSize: '0.65em', color: 'var(--accent)', opacity: 0.7 }}>🔗 {currentTab.shared_to === '*' ? 'All workspaces' : workspaces.find(w => w.id === currentTab.shared_to)?.name || ''}</span>}
      </div>

      {/* ── EDITOR BODY (scrollable) ─────────────────────── */}
      <div className="notepad-body">
        <div
          ref={editorRef}
          className="notepad-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
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
            if (upErr) { alert('Upload failed: ' + upErr.message); return }
            const { data: urlData } = supabase.storage.from('note-files').getPublicUrl(filePath)
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
            if (isImage) {
              document.execCommand('insertHTML', false, `<img src="${urlData.publicUrl}" style="max-width:100%;border-radius:4px;margin:0.3em 0" />`)
              handleInput()
            }
            const newFiles = [...(currentTab.files || []), { name: file.name, url: urlData.publicUrl, path: filePath }]
            await supabase.from('notepads').update({ files: newFiles }).eq('id', currentTab.id)
            fetchTabs()
          }}
          data-placeholder="Start typing or drag files here..."
        />
      </div>

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
          if (upErr) { alert('Upload failed: ' + upErr.message); return }
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
          {currentTab.files.map((file, i) => {
            const isImage = /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name)
            return (
              <div key={i} className="notepad-file-chip">
                {isImage && <img src={file.url} alt="" className="notepad-file-thumb" />}
                <a href={file.url} target="_blank" rel="noopener noreferrer" className="notepad-file-name">{file.name}</a>
                <button className="notepad-file-remove" onClick={() => removeFile(i)} title="Remove">×</button>
              </div>
            )
          })}
        </>}
      </div>
    </div>
  )
}
