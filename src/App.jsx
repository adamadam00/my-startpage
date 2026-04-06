
  handleOpacity: 15,
  text: '#e8e8f0', textDim: '#7878a0', titleColor: '#7878a0',
  accent: '#6c8fff', danger: '#ff6b6b', success: '#6bffb8',
  btnBg: '#3a3a4a', btnText: '#e8e8f0',          // grey by default
  font: "'DM Mono', monospace",
  fontSize: 14, topbarFontSize: 12, clockWidgetSize: 1, notesFontSize: 13, settingsFontSize: 13,
  radius: 10, sectionRadius: 0,
  linkGap: 0.5, cardPadding: 0.75,
  sectionGap: 0, sectionGapH: 0, mainGapTop: 12, pageScale: 1,
  faviconOpacity: 1, faviconGreyscale: false, faviconSize: 13,
  patternColor: '#2a2a3a', patternOpacity: 1,
  bgPreset: 'noise',
  wallpaper: '', wallpaperFit: 'cover', linksPaddingH: 0.75,
  wallpaperX: 50, wallpaperY: 50, wallpaperScale: 100,
  wallpaperBlur: 0, wallpaperDim: 35, wallpaperOpacity: 100,
  sectionsCols: 4,
  notesGap: 0, notesCardBg: '#13131a', notesTextColor: '#e8e8f0', notesTextBg: '#0c0c0f',
  settingsSide: 'right',
}

// ─── APPLY THEME ─────────────────────────────────────────────────────────────
function applyTheme(t) {
  if (!t) return
  const root = document.documentElement
  const s = (k, v) => { if (v !== undefined && v !== null) root.style.setProperty(k, String(v)) }
  s('--bg', t.bg); s('--bg2', t.bg2); s('--bg3', t.bg3)
  s('--card', t.card); s('--card-opacity', t.cardOpacity ?? 1)
  s('--border', t.border); s('--border-hover', t.borderHover)
  s('--border-opacity', t.borderOpacity ?? 1)
  s('--handle-opacity', (t.handleOpacity ?? 15) / 100)
  s('--text', t.text); s('--text-dim', t.textDim); s('--text-muted', t.textMuted ?? t.textDim)
  s('--title-color', t.titleColor ?? t.textDim)
  s('--accent', t.accent)
  if (t.accent) { s('--accent-dim', t.accent + '33'); s('--accent-glow', t.accent + '22') }
  s('--danger', t.danger); s('--success', t.success)
  s('--btn-bg', t.btnBg); s('--btn-text', t.btnText)
  s('--font', t.font)
  if (t.fontSize)        s('--font-size',        t.fontSize + 'px')
  if (t.topbarFontSize)  s('--topbar-font-size',  t.topbarFontSize + 'px')
  if (t.clockWidgetSize) s('--clock-widget-size', t.clockWidgetSize + 'rem')
  if (t.notesFontSize)   s('--notes-font-size',   t.notesFontSize + 'px')
  if (t.faviconSize)     s('--favicon-size',      t.faviconSize + 'px')
  if (t.radius != null)  { s('--radius', t.radius + 'px'); s('--radius-sm', Math.max(2, t.radius - 4) + 'px') }
  s('--section-radius',  (t.sectionRadius ?? 0) + 'px')
  if (t.linkGap != null)     s('--link-gap',     t.linkGap + 'rem')
  if (t.cardPadding != null) s('--card-padding', t.cardPadding + 'rem')
  s('--section-gap',   (t.sectionGap ?? 0) + 'px')
  s('--section-gap-h', (t.sectionGapH ?? 0) + 'px')
  s('--main-gap-top',  (t.mainGapTop ?? 12) + 'px')
  s('--sections-cols',  t.sectionsCols ?? 4)
  s('--favicon-opacity', t.faviconOpacity ?? 1)
  s('--favicon-filter',  t.faviconGreyscale ? 'grayscale(1)' : 'none')
  s('--pattern-color',   t.patternColor); s('--pattern-opacity', t.patternOpacity ?? 1)
  s('--wallpaper-dim',   (t.wallpaperDim ?? 35) / 100)
  if (t.settingsFontSize) s('--settings-font-size', t.settingsFontSize + 'px')
  // Dynamic CSS override for link list horizontal padding
  let styleEl = document.getElementById('sp-overrides')
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'sp-overrides'; document.head.appendChild(styleEl) }
  styleEl.textContent = `.links-list { padding-left: ${t.linksPaddingH ?? 0.75}rem !important; padding-right: ${t.linksPaddingH ?? 0.75}rem !important; }`
  s('--wallpaper-opacity', (t.wallpaperOpacity ?? 100) / 100)
  s('--notes-gap',       (t.notesGap ?? 0) + 'px')
  if (t.notesCardBg)    s('--notes-card-bg',    t.notesCardBg)
  if (t.notesTextColor) s('--notes-text-color', t.notesTextColor)
  if (t.notesTextBg)    s('--notes-input-bg',   t.notesTextBg)
  root.dataset.settingsSide = t.settingsSide || 'right'
  document.body.style.fontFamily       = t.font || "'DM Mono', monospace"
  document.body.style.backgroundColor = t.bg   || '#0c0c0f'
  document.body.style.color           = t.text || '#e8e8f0'
  if (t.pageScale) document.body.style.zoom = t.pageScale
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [session,  setSession]  = useState(null)
  const sessionRef              = useRef(null)
  const [workspaces, setWorkspaces] = useState([])
  const [activeWs,   setActiveWs]   = useState(null)
  const [sections,   setSections]   = useState([])
  const [links,      setLinks]      = useState([])
  const [notes,      setNotes]      = useState([])

  const [theme, setThemeState] = useState(() => {
    try { return { ...DEFAULT_THEME, ...(JSON.parse(localStorage.getItem('current_theme')) || {}) } }
    catch { return DEFAULT_THEME }
  })

  // Wrap setTheme so every change auto-saves to localStorage
  const setTheme = (updater) => {
    setThemeState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('current_theme', JSON.stringify(next))
      return next
    })
  }

  const [bgImage,         setBgImage]         = useState(() => localStorage.getItem('bg_image') || '')
  const [search,          setSearch]          = useState('')
  const [settingsOpen,    setSettingsOpen]    = useState(false)
  const [loading,         setLoading]         = useState(true)
  const [importingBackup, setImportingBackup] = useState(false)

  const fileRef       = useRef(null)
  const backupFileRef = useRef(null)

  // Apply theme on every change (auto-saved via setTheme wrapper)
  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => { sessionRef.current = session }, [session])

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null); setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    ensureWorkspace().then(() => handleRefresh())
  }, [session])

  // ── Workspace bootstrap ───────────────────────────────────────────────────
  const ensureWorkspace = async () => {
    const { data, error } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
    if (error) { alert(error.message); return }
    if (!data?.length) {
      const { data: created, error: err } = await supabase
        .from('workspaces').insert({ user_id: session.user.id, name: 'Home' }).select().single()
      if (err) { alert(err.message); return }
      setWorkspaces([created]); setActiveWs(created.id); return
    }
    setWorkspaces(data)
    setActiveWs(prev => prev ?? data[0]?.id ?? null)
  }

  // ── Data refresh ──────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (!sessionRef.current?.user?.id) return
    const { data: wsData, error: wsErr } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
    if (wsErr) { alert(wsErr.message); return }
    setWorkspaces(wsData || [])
    const currentWs = activeWs ?? wsData?.[0]?.id ?? null
    if (!currentWs) return
    if (!activeWs) setActiveWs(currentWs)
    const [{ data: secData }, { data: linkData }, { data: noteData }] = await Promise.all([
      supabase.from('sections').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
      supabase.from('links').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
      supabase.from('notes').select('*').eq('workspace_id', currentWs).order('created_at', { ascending: false }), // newest first
    ])
    setSections(secData || []); setLinks(linkData || []); setNotes(noteData || [])
  }

  useEffect(() => { if (activeWs && session) handleRefresh() }, [activeWs])

  // ── Search filter ─────────────────────────────────────────────────────────
  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return links
    return links.filter(l => (l.title || '').toLowerCase().includes(q) || (l.url || '').toLowerCase().includes(q))
  }, [links, search])

  // ── Workspace CRUD ────────────────────────────────────────────────────────
  const addWorkspace = async (name) => {
    const wsName = typeof name === 'string' ? name : prompt('Workspace name?')
    if (!wsName?.trim()) return
    const { data, error } = await supabase
      .from('workspaces').insert({ user_id: session.user.id, name: wsName.trim() }).select().single()
    if (error) return alert(error.message)
    setWorkspaces(prev => [...prev, data]); setActiveWs(data.id)
  }

  const renameWorkspace = async (id, name) => {
    const { error } = await supabase.from('workspaces').update({ name }).eq('id', id)
    if (error) return alert(error.message)
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name } : w))
  }

  const deleteWorkspace = async (id) => {
    if (!confirm('Delete this workspace?')) return
    const { error } = await supabase.from('workspaces').delete().eq('id', id)
    if (error) return alert(error.message)
    const next = workspaces.filter(w => w.id !== id)
    setWorkspaces(next); setActiveWs(next[0]?.id ?? null)
  }

  // ── Image uploads ─────────────────────────────────────────────────────────
  const handleImageUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setTheme(prev => ({ ...prev, wallpaper: e.target.result }))
    reader.readAsDataURL(file)
  }

  const handleBgImageUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      localStorage.setItem('bg_image', e.target.result)
      setBgImage(e.target.result)
      setTheme(prev => ({ ...prev, bgPreset: 'image' }))
    }
    reader.readAsDataURL(file)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const exportFullBackup = async () => {
    const backup = { version: 2, exportedAt: new Date().toISOString(), theme, workspaces: [] }
    const { data: wsData } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
    for (const ws of wsData || []) {
      const [{ data: secData }, { data: noteData }] = await Promise.all([
        supabase.from('sections').select('*').eq('workspace_id', ws.id).order('position', { ascending: true }),
        supabase.from('notes').select('*').eq('workspace_id', ws.id).order('created_at', { ascending: false }),
      ])
      const sectionsWithLinks = []
      for (const sec of secData || []) {
        const { data: secLinks } = await supabase.from('links').select('*').eq('section_id', sec.id).order('position', { ascending: true })
        sectionsWithLinks.push({ name: sec.name, position: sec.position, collapsed: sec.collapsed, links: (secLinks || []).map(l => ({ title: l.title, url: l.url, position: l.position })) })
      }
      backup.workspaces.push({ name: ws.name, sections: sectionsWithLinks, notes: (noteData || []).map(n => ({ content: n.content })) })
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    a.download = 'startpage-backup.json'; a.click()
  }

  const exportCSV = async () => {
    const { data: secs } = await supabase.from('sections').select('*').eq('workspace_id', activeWs).order('position')
    const { data: lnks } = await supabase.from('links').select('*').eq('workspace_id', activeWs).order('position')
    const rows = [['Section', 'Title', 'URL']]
    secs?.forEach(s => lnks?.filter(l => l.section_id === s.id).forEach(l => rows.push([s.name, l.title, l.url])))
    const dq = '""'
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, dq) + '"').join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'startpage-links.csv'; a.click()
  }

  const resetWorkspaceLinks = async () => {
    if (!confirm('Delete ALL sections and links in this workspace? Notes are kept.')) return
    await supabase.from('links').delete().eq('workspace_id', activeWs)
    await supabase.from('sections').delete().eq('workspace_id', activeWs)
    handleRefresh()
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImportBackup = (e) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = ''
    setImportingBackup(true)
    const r = new FileReader()
    r.onload = async (ev) => {
      try {
        const uid = sessionRef.current?.user?.id
        if (!uid) throw new Error('Not logged in')
        const text = ev.target.result
        const ext  = f.name.split('.').pop().toLowerCase()
        if (ext === 'csv') {
          const lines = text.trim().split('\n').slice(1)
          const sectionMap = {}; let pos = 0
          for (const line of lines) {
            const [section, title, url] = line.split(',').map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
            if (!section || !title || !url) continue
            if (!sectionMap[section]) {
              const { data: sec } = await supabase.from('sections').insert({ user_id: uid, workspace_id: activeWs, name: section, position: pos++, collapsed: false }).select().single()
              sectionMap[section] = { id: sec.id, lpos: 0 }
            }
            await supabase.from('links').insert({ user_id: uid, workspace_id: activeWs, section_id: sectionMap[section].id, title, url: url.startsWith('http') ? url : 'https://' + url, position: sectionMap[section].lpos++ })
          }
          await handleRefresh(); alert('CSV imported!'); return
        }
        const data = JSON.parse(text)
        if (Array.isArray(data)) {
          const rows = (Array.isArray(data[0]) ? data[0] : data).filter(g => g && typeof g === 'object')
          for (let i = 0; i < rows.length; i++) {
            const grp = rows[i]
            const { data: sec } = await supabase.from('sections').insert({ user_id: uid, workspace_id: activeWs, name: grp.name ?? grp.title ?? 'Section', position: i, collapsed: false }).select().single()
            const lnks = (grp.bookmarks ?? grp.links ?? []).map((b, j) => ({ user_id: uid, workspace_id: activeWs, section_id: sec.id, title: b.name ?? b.title ?? 'Link', url: b.url, position: j }))
            if (lnks.length) await supabase.from('links').insert(lnks)
          }
          await handleRefresh(); alert('Imported ' + rows.length + ' section(s).'); return
        }
        if (data.workspaces && Array.isArray(data.workspaces)) {
          if (!confirm('Add ' + data.workspaces.length + ' workspace(s)? Existing data is kept.')) return
          for (const ws of data.workspaces) {
            const { data: newWs } = await supabase.from('workspaces').insert({ user_id: uid, name: ws.name }).select().single()
            for (let si = 0; si < (ws.sections ?? []).length; si++) {
              const sec = ws.sections[si]
              const { data: newSec } = await supabase.from('sections').insert({ user_id: uid, workspace_id: newWs.id, name: sec.name, position: sec.position ?? si, collapsed: sec.collapsed ?? false }).select().single()
              const lnks = (sec.links ?? []).map((l, j) => ({ user_id: uid, workspace_id: newWs.id, section_id: newSec.id, title: l.title ?? l.name ?? 'Link', url: l.url, position: l.position ?? j }))
              if (lnks.length) await supabase.from('links').insert(lnks)
            }
            if (ws.notes?.length) await supabase.from('notes').insert(ws.notes.map(n => ({ user_id: uid, workspace_id: newWs.id, content: n.content ?? '' })))
          }
          if (data.theme) { const t = { ...DEFAULT_THEME, ...data.theme }; setTheme(t) }
          await handleRefresh(); alert('Backup imported!'); return
        }
        if (data.bg || data.text || data.accent) {
          setTheme({ ...DEFAULT_THEME, ...data }); alert('Theme imported.'); return
        }
        alert('Unrecognised format.')
      } catch (err) { alert('Import failed: ' + err.message) }
      finally { setImportingBackup(false) }
    }
    r.readAsText(f)
  }

  // ── Background ────────────────────────────────────────────────────────────
  const bgClass = (bgImage && theme.bgPreset === 'image') ? 'bg-layer bg-image' : `bg-layer bg-${theme.bgPreset || 'noise'}`
  const bgStyle = (bgImage && theme.bgPreset === 'image') ? { backgroundImage: `url(${bgImage})` } : {}

  const activeWorkspace = workspaces.find(w => w.id === activeWs)

  if (loading) return <div className="center-fill">Loading…</div>
  if (!session) return <Auth />

  return (
    <>
      {/* Background — self-closing so bg animations never trap fixed children */}
      <div className={bgClass} style={bgStyle} />

      <div className="app">

        {/* Wallpaper overlay */}
        {theme.wallpaper ? (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            backgroundImage: `url(${theme.wallpaper})`,
            backgroundSize: `${theme.wallpaperScale ?? 100}%`,
            backgroundPosition: `${theme.wallpaperX ?? 50}% ${theme.wallpaperY ?? 50}%`,
            backgroundRepeat: 'no-repeat',
            filter: `blur(${theme.wallpaperBlur ?? 0}px)`,
            opacity: (theme.wallpaperOpacity ?? 100) / 100,
          }} />
        ) : null}
        {theme.wallpaper && theme.wallpaperDim > 0 ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: `rgba(0,0,0,${(theme.wallpaperDim ?? 35) / 100})` }} />
        ) : null}

        {/* ── TOPBAR ──────────────────────────────────────── */}
        <div className="topbar" style={{ position: 'relative', zIndex: 2 }}>

          {/* Workspace tabs */}
          <div className="workspace-tabs">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                className={`workspace-tab${activeWs === ws.id ? ' active' : ''}`}
                onClick={() => setActiveWs(ws.id)}
              >
                {ws.name}
                {workspaces.length > 1 && (
                  <span
                    className="del-ws"
                    onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id) }}
                  >✕</span>
                )}
              </button>
            ))}
            <button
              className="icon-btn"
              title="New workspace"
              onClick={() => addWorkspace()}
              style={{ fontSize: '1.1em', lineHeight: 1 }}
            >+</button>
          </div>

          <div className="topbar-divider" />

          {/* Widgets: clock + weather + search */}
          <div className="topbar-widgets">
            <ClockWidget />
            <div className="topbar-divider" />
            <WeatherWidget />
            <div className="search-compact" style={{ flex: 1 }}>
              <input
                className="input search-compact-input"
                placeholder="Search links…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setSearch('')}
              />
              {search && (
                <button className="icon-btn search-btn" onClick={() => setSearch('')} title="Clear">✕</button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="topbar-actions">
            <button className="icon-btn" title="Refresh" onClick={handleRefresh}>↻</button>
            <button className="icon-btn" title="Settings" onClick={() => setSettingsOpen(true)}>⚙</button>
          </div>
        </div>

        {/* ── MAIN LAYOUT ─────────────────────────────────── */}
        <main className="main-layout" style={{ gridTemplateColumns: `1fr var(--notes-width, 240px)` }}>
          <div className="main-col">
            <Sections
              sections={sections}
              links={filteredLinks}
              userId={session.user.id}
              workspaceId={activeWs}
              onRefresh={handleRefresh}
              colCount={theme.sectionsCols ?? 4}
            />
          </div>
          <div className="side-col">
            <Notes
              notes={notes}
              workspaceId={activeWs}
              userId={session.user.id}
              onRefresh={handleRefresh}
            />
          </div>
        </main>

        {/* ── SETTINGS ────────────────────────────────────── */}
        {settingsOpen && (
          <Settings
            theme={theme}
            setTheme={setTheme}
            onSave={() => { applyTheme(theme); localStorage.setItem('current_theme', JSON.stringify(theme)) }}
            onClose={() => setSettingsOpen(false)}
            onImageUpload={handleImageUpload}
            onBgImageUpload={handleBgImageUpload}
            onExportBackup={exportFullBackup}
            onExportCSV={exportCSV}
            onImportBackup={handleImportBackup}
            onResetWorkspaceLinks={resetWorkspaceLinks}
            onResetTheme={() => setTheme(DEFAULT_THEME)}
            fileRef={fileRef}
            backupFileRef={backupFileRef}
            importingBackup={importingBackup}
            workspaces={workspaces}
            activeWs={activeWs}
            onAddWorkspace={addWorkspace}
            onRenameWorkspace={renameWorkspace}
            onDeleteWorkspace={deleteWorkspace}
            onSetActiveWs={setActiveWs}
          />
        )}

      </div>
    </>
  )
}