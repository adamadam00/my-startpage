import { useState, useEffect, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Auth         from './components/Auth'
import Clock        from './components/Clock'
import Weather      from './components/Weather'
import SearchBar    from './components/SearchBar'
import Sections     from './components/Sections'
import Notes        from './components/Notes'
import Settings     from './components/Settings'
import ImportExport from './components/ImportExport'

// Apply a full theme config object to CSS variables
function applyTheme(cfg) {
  if (!cfg) return
  const r = document.documentElement.style
  const s = (k, v) => v !== undefined && r.setProperty(k, v)
  s('--bg',           cfg.bg)
  s('--bg2',          cfg.bg2)
  s('--bg3',          cfg.bg3)
  s('--card',         cfg.card)
  s('--card-opacity', cfg.cardOpacity)
  s('--border',       cfg.border)
  s('--border-hover', cfg.borderHover)
  s('--text',         cfg.text)
  s('--text-dim',     cfg.textDim)
  s('--accent',       cfg.accent)
  s('--accent-dim',   cfg.accent   ? cfg.accent + '33' : undefined)
  s('--accent-glow',  cfg.accent   ? cfg.accent + '22' : undefined)
  s('--danger',       cfg.danger)
  s('--success',      cfg.success)
  s('--btn-bg',       cfg.btnBg)
  s('--btn-text',     cfg.btnText)
  s('--font',         cfg.font)
  s('--font-size',    cfg.fontSize  ? cfg.fontSize  + 'px'  : undefined)
  s('--clock-size',   cfg.clockSize ? cfg.clockSize + 'rem' : undefined)
  s('--radius',       cfg.radius    ? cfg.radius    + 'px'  : undefined)
  s('--radius-sm',    cfg.radius    ? Math.max(4, cfg.radius - 4) + 'px' : undefined)
  s('--link-gap',     cfg.linkGap   ? cfg.linkGap   + 'rem' : undefined)
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

  // Derived display settings
  const clockFormat  = userSettings?.clock_format    ?? '12h'
  const openNewTab   = userSettings?.open_in_new_tab ?? true
  const bgPreset     = userSettings?.bg_preset       ?? 'noise'
  const weatherLat   = userSettings?.weather_lat     ?? -37.8136
  const weatherLon   = userSettings?.weather_lon     ?? 144.9631
  const weatherName  = userSettings?.weather_name    ?? 'Melbourne'
  const bgImage      = typeof window !== 'undefined' ? localStorage.getItem('bg_image') : null

  // ── Auth ────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Load user settings ──────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', session.user.id)
      .single()
    if (data) setUserSettings(data)
  }, [session])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  // ── Load active theme preset from Supabase ──────────────────
  useEffect(() => {
    if (!session) return
    const load = async () => {
      const { data } = await supabase
        .from('theme_presets')
        .select('*')
        .eq('user_id', session.user.id)
        .order('slot')
        .limit(1)
      if (data?.[0]?.config) applyTheme(data[0].config)
    }
    load()
  }, [session])

  // ── Load workspaces ─────────────────────────────────────────
  const fetchWorkspaces = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('workspaces')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at')
    if (data) {
      setWorkspaces(data)
      if (!activeWs && data.length > 0) setActiveWs(data[0].id)
    }
  }, [session, activeWs])

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])

  // ── Load sections, links, notes ─────────────────────────────
  const fetchData = useCallback(async () => {
    if (!session || !activeWs) return
    const [sec, lnk, nt] = await Promise.all([
      supabase.from('sections').select('*').eq('workspace_id', activeWs).eq('user_id', session.user.id).order('position'),
      supabase.from('links').select('*').eq('workspace_id', activeWs).eq('user_id', session.user.id).order('position'),
      supabase.from('notes').select('*').eq('workspace_id', activeWs).eq('user_id', session.user.id).order('created_at', { ascending: false }),
    ])
    if (sec.data)  setSections(sec.data)
    if (lnk.data)  setLinks(lnk.data)
    if (nt.data)   setNotes(nt.data)
  }, [session, activeWs])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Add workspace ───────────────────────────────────────────
  const addWorkspace = async (e) => {
    e.preventDefault()
    if (!newWsName.trim()) return
    if (workspaces.length >= 5) return
    const { data } = await supabase.from('workspaces').insert({
      user_id: session.user.id,
      name:    newWsName.trim(),
    }).select().single()
    setNewWsName('')
    setAddingWs(false)
    await fetchWorkspaces()
    if (data) setActiveWs(data.id)
  }

  // ── Delete workspace ────────────────────────────────────────
  const deleteWorkspace = async (id) => {
    if (!confirm('Delete this workspace and all its data?')) return
    await supabase.from('links').delete().eq('workspace_id', id)
    await supabase.from('sections').delete().eq('workspace_id', id)
    await supabase.from('notes').delete().eq('workspace_id', id)
    await supabase.from('workspaces').delete().eq('id', id)
    const remaining = workspaces.filter(w => w.id !== id)
    setWorkspaces(remaining)
    setActiveWs(remaining[0]?.id ?? null)
  }

  // ── Settings changed callback ───────────────────────────────
  const handleSettingsChange = (changes) => {
    setUserSettings(prev => ({ ...prev, ...changes }))
    if (changes.bgImage !== undefined || changes.bgPreset !== undefined) {
      // force re-render for bg
    }
    fetchSettings()
  }

  // ── Background style ────────────────────────────────────────
  const getBgStyle = () => {
    if (bgImage && (bgPreset === 'image' || localStorage.getItem('bg_image'))) {
      return { backgroundImage: `url(${bgImage})` }
    }
    return {}
  }

  const getBgClass = () => {
    if (bgImage && localStorage.getItem('bg_image')) return 'bg-layer bg-image'
    return `bg-layer bg-${bgPreset}`
  }

  // ── Loading / Auth screens ──────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
      loading…
    </div>
  )

  if (!session) return <Auth />

  // ── Main app ────────────────────────────────────────────────
  return (
    <>
      {/* Background layer */}
      <div className={getBgClass()} style={getBgStyle()} />

      <div className="app">

        {/* ── Top bar ── */}
        <header className="topbar">
          <div className="workspace-tabs">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                className={`workspace-tab${activeWs === ws.id ? ' active' : ''}`}
                onClick={() => setActiveWs(ws.id)}
              >
                {ws.name}
                {workspaces.length > 1 && (
                  <button
                    className="del-ws"
                    onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id) }}
                    title="Delete workspace"
                  >✕</button>
                )}
              </button>
            ))}

            {/* Add workspace (max 5) */}
            {workspaces.length < 5 && (
              addingWs ? (
                <form onSubmit={addWorkspace} style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    className="input"
                    value={newWsName}
                    onChange={e => setNewWsName(e.target.value)}
                    placeholder="Workspace name"
                    autoFocus
                    style={{ width: '140px' }}
                  />
                  <button className="btn btn-primary" type="submit">Add</button>
                  <button className="btn" type="button" onClick={() => setAddingWs(false)}>✕</button>
                </form>
              ) : (
                <button className="btn-ghost icon-btn" onClick={() => setAddingWs(true)}
                  style={{ fontSize: '0.8em' }} title="New workspace">
                  + workspace
                </button>
              )
            )}
          </div>

          {/* Top-right actions */}
          <div className="topbar-actions">
            <button className="btn" onClick={() => setShowSettings(true)}>
              ⚙ <span>Settings</span>
            </button>
            <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}
              title="Sign out" style={{ fontSize: '0.8em' }}>
              sign out
            </button>
          </div>
        </header>

        {/* ── Main layout ── */}
        <main className="main-layout">

          {/* Left column — sections + import/export */}
          <div className="main-col">
            {activeWs ? (
              <>
                <Sections
                  sections={sections}
                  links={links}
                  userId={session.user.id}
                  workspaceId={activeWs}
                  onRefresh={fetchData}
                  openInNewTab={openNewTab}
                />
                <div className="card">
                  <ImportExport
                    session={session}
                    workspaceId={activeWs}
                    onRefresh={fetchData}
                  />
                </div>
              </>
            ) : (
              <div className="card" style={{ color: 'var(--text-muted)', fontSize: '0.85em', textAlign: 'center', padding: '2rem' }}>
                Create a workspace above to get started
              </div>
            )}
          </div>

          {/* Right column — clock, weather, search, notes */}
          <div className="side-col">
            <div className="card">
              <Clock format={clockFormat} />
            </div>

            <div className="card">
              <Weather
                lat={weatherLat}
                lon={weatherLon}
                locationName={weatherName}
              />
            </div>

            <div className="card">
              <SearchBar openInNewTab={openNewTab} />
            </div>

            {activeWs && (
              <Notes
                items={notes}
                workspaceId={activeWs}
                userId={session.user.id}
                onRefresh={fetchData}
              />
            )}
          </div>
        </main>

      </div>

      {/* ── Settings panel ── */}
      {showSettings && (
        <Settings
          session={session}
          userSettings={userSettings}
          onSettingsChange={handleSettingsChange}
          onClose={() => setShowSettings(false)}
        />
      )}
    </>
  )
}