import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Auth         from './components/Auth'
import Clock        from './components/Clock'
import Weather      from './components/Weather'
import SearchBar    from './components/SearchBar'
import Sections     from './components/Sections'
import Notes        from './components/Notes'
import Settings     from './components/Settings'

function applyTheme(cfg) {
  if (!cfg) return
  // Save currently applied theme so Settings can read it on open
  localStorage.setItem('current_theme', JSON.stringify(cfg))
  const r = document.documentElement.style
  const s = (k, v) => v !== undefined && v !== null && r.setProperty(k, String(v))
  s('--bg',              cfg.bg)
  s('--bg2',             cfg.bg2)
  s('--bg3',             cfg.bg3)
  s('--card',            cfg.card)
  s('--card-opacity',    cfg.cardOpacity)
  s('--border-opacity',  cfg.borderOpacity ?? 1)
  s('--border',          cfg.border)
  s('--border-hover',    cfg.borderHover)
  s('--text',            cfg.text)
  s('--text-dim',        cfg.textDim)
  s('--accent',          cfg.accent)
  s('--accent-dim',      cfg.accent ? cfg.accent + '33' : null)
  s('--accent-glow',     cfg.accent ? cfg.accent + '22' : null)
  s('--danger',          cfg.danger)
  s('--success',         cfg.success)
  s('--btn-bg',          cfg.btnBg)
  s('--btn-text',        cfg.btnText)
  s('--font',            cfg.font)
  s('--font-size',       cfg.fontSize    ? cfg.fontSize    + 'px'  : null)
  s('--clock-size',      cfg.clockSize   ? cfg.clockSize   + 'rem' : null)
  s('--radius',          cfg.radius      ? cfg.radius      + 'px'  : null)
  s('--radius-sm',       cfg.radius      ? Math.max(2, cfg.radius - 4) + 'px' : null)
  s('--link-gap',        cfg.linkGap     ? cfg.linkGap     + 'rem' : null)
  s('--card-padding',    cfg.cardPadding ? cfg.cardPadding + 'rem' : null)
  s('--sections-cols',   cfg.sectionsCols)
  s('--favicon-opacity', cfg.faviconOpacity ?? 1)
  s('--favicon-filter',  cfg.faviconGreyscale ? 'grayscale(1)' : 'none')
  if (cfg.pageScale) document.body.style.zoom = cfg.pageScale
}

// Read a value from the current saved theme
const savedTheme = () => {
  try { return JSON.parse(localStorage.getItem('current_theme') ?? '{}') } catch { return {} }
}

export default function App() {
  const [session,      setSession]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [workspaces,   setWorkspaces]   = useState([])
  const [activeWs,     setActiveWs]     = useState(null)
  const [sections,     setSections]     = useState([])
  const [links,        setLinks]        = useState([])
  const [notes,        setNotes]        = useState([])
  const [userSettings, setUserSettings] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [addingWs,     setAddingWs]     = useState(false)
  const [newWsName,    setNewWsName]    = useState('')

  // UI visibility — stored in localStorage so they're per-device
  const [showClock,   setShowClock]   = useState(() => localStorage.getItem('show_clock')   !== 'false')
  const [showWeather, setShowWeather] = useState(() => localStorage.getItem('show_weather') !== 'false')
  const [showSearch,  setShowSearch]  = useState(() => localStorage.getItem('show_search')  !== 'false')
  const [showNotes,   setShowNotes]   = useState(() => localStorage.getItem('show_notes')   !== 'false')
  const [showPins,    setShowPins]    = useState(() => localStorage.getItem('show_pins')    !== 'false')

  const clockFormat = userSettings?.clock_format    ?? '12h'
  const openNewTab  = userSettings?.open_in_new_tab ?? true
  const bgPreset    = userSettings?.bg_preset       ?? 'noise'
  const weatherLat  = userSettings?.weather_lat     ?? -37.8136
  const weatherLon  = userSettings?.weather_lon     ?? 144.9631
  const weatherName = userSettings?.weather_name    ?? 'Melbourne'
  const bgImage     = localStorage.getItem('bg_image')

  // ── Auth ─────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // ── Settings ──────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('user_settings').select('*')
      .eq('user_id', session.user.id).single()
    if (data) setUserSettings(data)
  }, [session])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  // ── Load active theme preset ──────────────────────────────────
  useEffect(() => {
    if (!session) return
    const load = async () => {
      const { data } = await supabase
        .from('theme_presets').select('*')
        .eq('user_id', session.user.id).order('slot').limit(1)
      if (data?.[0]?.config) applyTheme(data[0].config)
    }
    load()
  }, [session])

  // ── Workspaces ────────────────────────────────────────────────
  const fetchWorkspaces = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('workspaces').select('*')
      .eq('user_id', session.user.id).order('created_at')
    if (data) {
      setWorkspaces(data)
      if (!activeWs && data.length > 0) setActiveWs(data[0].id)
    }
  }, [session, activeWs])

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])

  // ── Data ──────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!session || !activeWs) return
    const [sec, lnk, nt] = await Promise.all([
      supabase.from('sections').select('*').eq('workspace_id', activeWs).eq('user_id', session.user.id).order('position'),
      supabase.from('links').select('*').eq('workspace_id', activeWs).eq('user_id', session.user.id).order('position'),
      supabase.from('notes').select('*').eq('workspace_id', activeWs).eq('user_id', session.user.id).order('created_at', { ascending: false }),
    ])
    if (sec.data) setSections(sec.data)
    if (lnk.data) setLinks(lnk.data)
    if (nt.data)  setNotes(nt.data)
  }, [session, activeWs])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Add workspace ─────────────────────────────────────────────
  const addWorkspace = async (e) => {
    e.preventDefault()
    if (!newWsName.trim() || workspaces.length >= 5) return
    const { data } = await supabase.from('workspaces').insert({
      user_id: session.user.id, name: newWsName.trim(),
    }).select().single()
    setNewWsName('')
    setAddingWs(false)
    await fetchWorkspaces()
    if (data) setActiveWs(data.id)
  }

  // ── Delete workspace ──────────────────────────────────────────
  const deleteWorkspace = async (id) => {
    if (!confirm('Delete this workspace and ALL its data? This cannot be undone.')) return
    await Promise.all([
      supabase.from('links').delete().eq('workspace_id', id),
      supabase.from('sections').delete().eq('workspace_id', id),
      supabase.from('notes').delete().eq('workspace_id', id),
    ])
    await supabase.from('workspaces').delete().eq('id', id)
    const remaining = workspaces.filter(w => w.id !== id)
    setWorkspaces(remaining)
    setActiveWs(remaining[0]?.id ?? null)
  }

  // ── Reset links ───────────────────────────────────────────────
  const resetLinks = async () => {
    if (!activeWs) return
    if (!confirm('⚠ DELETE all sections and links in this workspace?\n\nNotes will be kept. This cannot be undone.')) return
    await supabase.from('links').delete().eq('workspace_id', activeWs)
    await supabase.from('sections').delete().eq('workspace_id', activeWs)
    fetchData()
  }

  // ── Export everything ─────────────────────────────────────────
  const exportEverything = async () => {
    const [{ data: allSections }, { data: allLinks }, { data: allNotes }, { data: presets }, { data: settings }] =
      await Promise.all([
        supabase.from('sections').select('*').eq('user_id', session.user.id),
        supabase.from('links').select('*').eq('user_id', session.user.id),
        supabase.from('notes').select('*').eq('user_id', session.user.id),
        supabase.from('theme_presets').select('*').eq('user_id', session.user.id),
        supabase.from('user_settings').select('*').eq('user_id', session.user.id).single(),
      ])

    const payload = {
      exported_at: new Date().toISOString(),
      workspaces: workspaces.map(ws => ({
        name: ws.name,
        sections: (allSections ?? [])
          .filter(s => s.workspace_id === ws.id)
          .sort((a, b) => a.position - b.position)
          .map(s => ({
            name: s.name, pinned: s.pinned, collapsed: s.collapsed,
            links: (allLinks ?? [])
              .filter(l => l.section_id === s.id)
              .sort((a, b) => a.position - b.position)
              .map(l => ({ title: l.title, url: l.url })),
          })),
        notes: (allNotes ?? [])
          .filter(n => n.workspace_id === ws.id)
          .map(n => ({ content: n.content, reminder_at: n.reminder_at })),
      })),
      theme_presets: presets ?? [],
      user_settings: settings ?? {},
      current_theme: savedTheme(),
    }

    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }))
    a.download = `startpage-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }

  // ── Settings changes ──────────────────────────────────────────
  const handleSettingsChange = (changes) => {
    if (changes.showClock   !== undefined) { setShowClock(changes.showClock);     localStorage.setItem('show_clock',   changes.showClock) }
    if (changes.showWeather !== undefined) { setShowWeather(changes.showWeather); localStorage.setItem('show_weather', changes.showWeather) }
    if (changes.showSearch  !== undefined) { setShowSearch(changes.showSearch);   localStorage.setItem('show_search',  changes.showSearch) }
    if (changes.showNotes   !== undefined) { setShowNotes(changes.showNotes);     localStorage.setItem('show_notes',   changes.showNotes) }
    if (changes.showPins    !== undefined) { setShowPins(changes.showPins);       localStorage.setItem('show_pins',    changes.showPins) }
    setUserSettings(prev => ({ ...prev, ...changes }))
    fetchSettings()
  }

  // ── Background ────────────────────────────────────────────────
  const getBgClass = () => bgImage ? 'bg-layer bg-image' : `bg-layer bg-${bgPreset}`
  const getBgStyle = () => bgImage ? { backgroundImage: `url(${bgImage})` } : {}

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      loading…
    </div>
  )

  if (!session) return <Auth />

  return (
    <>
      <div className={getBgClass()} style={getBgStyle()} />

      <div className="app">

        {/* ── Topbar ── */}
        <header className="topbar">

          {/* Workspace tabs */}
          <div className="workspace-tabs">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                className={`workspace-tab${activeWs === ws.id ? ' active' : ''}`}
                onClick={() => setActiveWs(ws.id)}
                title={`Switch to workspace: ${ws.name}`}
              >
                {ws.name}
                {workspaces.length > 1 && (
                  <button
                    className="del-ws"
                    onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id) }}
                    title={`Delete workspace: ${ws.name}`}
                  >✕</button>
                )}
              </button>
            ))}

            {workspaces.length < 5 && (
              addingWs ? (
                <form onSubmit={addWorkspace} style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    className="input"
                    value={newWsName}
                    onChange={e => setNewWsName(e.target.value)}
                    placeholder="Workspace name"
                    autoFocus
                    style={{ width: '130px' }}
                  />
                  <button className="btn btn-primary" type="submit">Add</button>
                  <button className="btn" type="button" onClick={() => setAddingWs(false)}>✕</button>
                </form>
              ) : (
                <button
                  className="btn-ghost icon-btn"
                  onClick={() => setAddingWs(true)}
                  title="Add new workspace (max 5)"
                  style={{ fontSize: '0.78em' }}
                >+ workspace</button>
              )
            )}
          </div>

          {/* Topbar widgets */}
          <div className="topbar-widgets">
            {showClock && (
              <>
                <Clock format={clockFormat} compact />
                <div className="topbar-divider" />
              </>
            )}
            {showWeather && (
              <>
                <Weather lat={weatherLat} lon={weatherLon} locationName={weatherName} compact />
                <div className="topbar-divider" />
              </>
            )}
            {showSearch && (
              <SearchBar openInNewTab={openNewTab} compact />
            )}
          </div>

          {/* Actions */}
          <div className="topbar-actions">
            <button className="btn" onClick={() => setShowSettings(true)} title="Open settings panel">
              ⚙ <span>Settings</span>
            </button>
            <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}
              title="Sign out of your account" style={{ fontSize: '0.78em' }}>
              sign out
            </button>
          </div>
        </header>

        {/* ── Main layout ── */}
        <main className="main-layout" style={{
          gridTemplateColumns: showNotes ? '1fr 250px' : '1fr'
        }}>
          <div className="main-col">
            {activeWs ? (
              <Sections
                sections={sections}
                links={links}
                userId={session.user.id}
                workspaceId={activeWs}
                onRefresh={fetchData}
                openInNewTab={openNewTab}
                showPins={showPins}
              />
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85em', textAlign: 'center', padding: '2rem' }}>
                Create a workspace above to get started
              </div>
            )}
          </div>

          {showNotes && activeWs && (
            <div className="side-col">
              <Notes
                items={notes}
                workspaceId={activeWs}
                userId={session.user.id}
                onRefresh={fetchData}
              />
            </div>
          )}
        </main>
      </div>

      {showSettings && (
        <Settings
          session={session}
          userSettings={userSettings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
          onResetLinks={resetLinks}
          onExportAll={exportEverything}
          activeWs={activeWs}
          workspaces={workspaces}
          uiVisibility={{ showClock, showWeather, showSearch, showNotes, showPins }}
        />
      )}
    </>
  )
}