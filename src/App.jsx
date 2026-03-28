import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import Auth      from './components/Auth'
import Clock     from './components/Clock'
import Weather   from './components/Weather'
import SearchBar from './components/SearchBar'
import Notes     from './components/Notes'
import Sections  from './components/Sections'

const PATTERN_BG = ['bg-dots', 'bg-grid', 'bg-lines', 'bg-crosshatch']

const BG_OPTIONS = [
  { value: 'bg-solid',      label: 'Solid' },
  { value: 'bg-noise',      label: 'Noise' },
  { value: 'bg-dots',       label: 'Dots' },
  { value: 'bg-grid',       label: 'Grid' },
  { value: 'bg-mesh',       label: 'Mesh' },
  { value: 'bg-aurora',     label: 'Aurora' },
  { value: 'bg-stars',      label: 'Stars' },
  { value: 'bg-nebula',     label: 'Nebula' },
  { value: 'bg-circuit',    label: 'Circuit' },
  { value: 'bg-hex',        label: 'Hex' },
  { value: 'bg-lines',      label: 'Lines' },
  { value: 'bg-crosshatch', label: 'Crosshatch' },
  { value: 'bg-carbon',     label: 'Carbon' },
  { value: 'bg-topo',       label: 'Topo' },
  { value: 'bg-image',      label: 'Image' },
]

const FONTS = [
  'DM Mono', 'JetBrains Mono', 'IBM Plex Sans',
  'Inter', 'Outfit', 'Space Grotesk', 'Figtree', 'Geist',
]

const DEFAULT_THEME = {
  bg:             '#0c0c0f',
  card:           '#13131a',
  cardOpacity:    '1',
  border:         '#2a2a3a',
  borderOpacity:  '1',
  accent:         '#6c8fff',
  text:           '#e8e8f0',
  textDim:        '#7878a0',
  titleColor:     '#7878a0',
  btnBg:          '#1e3a8a',
  bgStyle:        'bg-dots',
  patternColor:   '#2a2a3a',
  patternOpacity: '1',
  font:           'DM Mono',
  fontSize:       '14',
  clockSize:      '1',
  radius:         '10',
  radiusSm:       '6',
  linkGap:        '0.5',
  cardPadding:    '1',
  sectionsCols:   '2',
  pageScale:      '1',
  handleOpacity:  '0.15',
  faviconOpacity: '1',
  faviconFilter:  'none',
  bgImage:        '',
  bgImageOpacity: '1',
}

function loadTheme() {
  try {
    const saved = JSON.parse(localStorage.getItem('current_theme') || '{}')
    return { ...DEFAULT_THEME, ...saved }
  } catch {
    return { ...DEFAULT_THEME }
  }
}

function applyTheme(t) {
  const r = document.documentElement.style
  r.setProperty('--bg',              t.bg)
  r.setProperty('--bg2',             t.bg)
  r.setProperty('--bg3',             t.card)
  r.setProperty('--card',            t.card)
  r.setProperty('--card-opacity',    t.cardOpacity)
  r.setProperty('--border',          t.border)
  r.setProperty('--border-opacity',  t.borderOpacity)
  r.setProperty('--accent',          t.accent)
  r.setProperty('--accent-dim',      t.accent + '22')
  r.setProperty('--accent-glow',     t.accent + '33')
  r.setProperty('--text',            t.text)
  r.setProperty('--text-dim',        t.textDim)
  r.setProperty('--text-muted',      t.textDim + '88')
  r.setProperty('--title-color',     t.titleColor)
  r.setProperty('--btn-bg',          t.btnBg)
  r.setProperty('--btn-text',        '#ffffff')
  r.setProperty('--font',            `'${t.font}', monospace`)
  r.setProperty('--font-size',       t.fontSize    + 'px')
  r.setProperty('--clock-size',      t.clockSize   + 'rem')
  r.setProperty('--radius',          t.radius      + 'px')
  r.setProperty('--radius-sm',       t.radiusSm    + 'px')
  r.setProperty('--link-gap',        t.linkGap     + 'rem')
  r.setProperty('--card-padding',    t.cardPadding + 'rem')
  r.setProperty('--page-scale',      t.pageScale)
  r.setProperty('--handle-opacity',  t.handleOpacity)
  r.setProperty('--favicon-opacity', t.faviconOpacity)
  r.setProperty('--favicon-filter',  t.faviconFilter)
  r.setProperty('--pattern-color',   t.patternColor)
  r.setProperty('--pattern-opacity', t.patternOpacity)
  window.dispatchEvent(new Event('theme_cols_changed'))
}

export default function App() {
  const [session,      setSession]      = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [workspaces,   setWorkspaces]   = useState([])
  const [activeWs,     setActiveWs]     = useState(null)
  const [sections,     setSections]     = useState([])
  const [links,        setLinks]        = useState([])
  const [notes,        setNotes]        = useState([])
  const [addingWs,     setAddingWs]     = useState(false)
  const [newWsName,    setNewWsName]    = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [theme,        setTheme]        = useState(loadTheme)
  const fileRef = useRef(null)

  /* ── Auth ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  /* ── Apply + persist theme on every change ── */
  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('current_theme', JSON.stringify(theme))
  }, [theme])

  /* ── Re-apply on tab focus — fixes revert bug ── */
  useEffect(() => {
    const onFocus = () => {
      const saved = loadTheme()
      setTheme(saved)
      applyTheme(saved)
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const set = (key, val) => setTheme(prev => ({ ...prev, [key]: val }))

  /* ── Data fetching ── */
  const fetchWorkspaces = useCallback(async () => {
    if (!session) return
    const { data } = await supabase
      .from('workspaces').select('*')
      .eq('user_id', session.user.id).order('created_at')
    if (data) {
      setWorkspaces(data)
      setActiveWs(prev => prev ?? data[0]?.id ?? null)
    }
  }, [session])

  const fetchData = useCallback(async () => {
    if (!session || !activeWs) return
    const [sec, lnk, nt] = await Promise.all([
      supabase.from('sections').select('*')
        .eq('workspace_id', activeWs)
        .eq('user_id', session.user.id)
        .order('position'),
      supabase.from('links').select('*')
        .eq('workspace_id', activeWs)
        .eq('user_id', session.user.id)
        .order('position'),
      supabase.from('notes').select('*')
        .eq('workspace_id', activeWs)
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false }),
    ])
    if (sec.data) setSections(sec.data)
    if (lnk.data) setLinks(lnk.data)
    if (nt.data)  setNotes(nt.data)
  }, [session, activeWs])

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])
  useEffect(() => { fetchData() },       [fetchData])

  /* ── Workspaces ── */
  const addWorkspace = async (e) => {
    e.preventDefault()
    if (!newWsName.trim()) return
    const { data } = await supabase.from('workspaces').insert({
      user_id: session.user.id, name: newWsName.trim(),
    }).select().single()
    setNewWsName(''); setAddingWs(false)
    await fetchWorkspaces()
    if (data) setActiveWs(data.id)
  }

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

  /* ── Image upload ── */
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setTheme(prev => ({ ...prev, bgStyle: 'bg-image', bgImage: ev.target.result }))
    }
    reader.readAsDataURL(file)
  }

  /* ── Settings ── */
  const saveSettings = () => {
    localStorage.setItem('current_theme', JSON.stringify(theme))
    applyTheme(theme)
    setShowSettings(false)
  }

  const resetSettings = () => {
    setTheme({ ...DEFAULT_THEME })
    localStorage.setItem('current_theme', JSON.stringify(DEFAULT_THEME))
    applyTheme(DEFAULT_THEME)
  }

  const exportSettings = () => {
    const exportable = { ...theme, bgImage: '' }
    const blob = new Blob([JSON.stringify(exportable, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'theme.json'; a.click()
  }

  const importSettings = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const t = { ...DEFAULT_THEME, ...JSON.parse(ev.target.result) }
        setTheme(t); applyTheme(t)
        localStorage.setItem('current_theme', JSON.stringify(t))
      } catch { alert('Invalid theme file') }
    }
    reader.readAsText(file)
  }

  /* ── Early returns ── */
  if (loading) return (
    <div className="auth-wrap" style={{ color: 'var(--text-dim)' }}>loading…</div>
  )
  if (!session) return <Auth onAuth={setSession} />

  const isPatternBg = PATTERN_BG.includes(theme.bgStyle)

  return (
    <div className="app">

      {/* ── Background ── */}
      <div
        className={`bg-layer ${theme.bgStyle}`}
        style={
          theme.bgStyle === 'bg-image'
            ? {
                backgroundImage:    theme.bgImage ? `url(${theme.bgImage})` : 'none',
                backgroundSize:     'cover',
                backgroundPosition: 'center',
                opacity: parseFloat(theme.bgImageOpacity ?? 1),
              }
            : {}
        }
      />

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="workspace-tabs">
          {workspaces.map(ws => (
            <button
              key={ws.id}
              className={`workspace-tab${activeWs === ws.id ? ' active' : ''}`}
              onClick={() => setActiveWs(ws.id)}
            >
              {ws.name}
              <button
                className="del-ws"
                onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id) }}
              >✕</button>
            </button>
          ))}

          {addingWs ? (
            <form onSubmit={addWorkspace} style={{ display: 'flex', gap: '0.3rem' }}>
              <input
                className="input"
                value={newWsName}
                onChange={e => setNewWsName(e.target.value)}
                placeholder="Name" autoFocus
                style={{ width: 100, padding: '0.2rem 0.5rem', fontSize: '0.78em' }}
              />
              <button className="btn btn-primary" type="submit"
                style={{ padding: '0.2rem 0.5rem', fontSize: '0.78em' }}>+</button>
              <button className="btn" type="button" onClick={() => setAddingWs(false)}
                style={{ padding: '0.2rem 0.4rem', fontSize: '0.78em' }}>✕</button>
            </form>
          ) : (
            <button className="btn btn-ghost" onClick={() => setAddingWs(true)}
              style={{ fontSize: '0.72em', padding: '0.2rem 0.5rem' }}>+ workspace</button>
          )}
        </div>

        <div className="topbar-widgets">
          <div className="clock-compact">
            <Clock />
          </div>
          <div className="topbar-divider" />
          <Weather />
          <div className="topbar-divider" />
          <SearchBar />
        </div>

        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={() => setShowSettings(s => !s)}
            style={{ fontSize: '0.78em' }}>⚙ settings</button>
          <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}
            style={{ fontSize: '0.78em' }}>sign out</button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="main-layout" style={{ gridTemplateColumns: '1fr 220px' }}>
        <div className="main-col">
          <Sections
            sections={sections ?? []}
            links={links ?? []}
            userId={session.user.id}
            workspaceId={activeWs}
            onRefresh={fetchData}
            openInNewTab={true}
          />
        </div>
        <div className="side-col">
          <Notes
            notes={notes ?? []}
            userId={session.user.id}
            workspaceId={activeWs}
            onRefresh={fetchData}
          />
        </div>
      </div>

      {/* ── Settings panel ── */}
      {showSettings && (
        <div className="modal-overlay" onClick={() => setShowSettings(false)}>
          <div className="settings-panel" onClick={e => e.stopPropagation()}>

            <div className="settings-header">
              <span style={{ fontWeight: 500 }}>Settings</span>
              <button className="icon-btn" onClick={() => setShowSettings(false)}>✕</button>
            </div>

            {/* Colours */}
            <div className="settings-section">
              <div className="settings-title">Colours</div>
              {[
                ['Background',   'bg'],
                ['Card',         'card'],
                ['Border',       'border'],
                ['Accent',       'accent'],
                ['Text',         'text'],
                ['Text dim',     'textDim'],
                ['Title colour', 'titleColor'],
                ['Button',       'btnBg'],
              ].map(([label, key]) => (
                <div className="settings-row" key={key}>
                  <span className="settings-label">{label}</span>
                  <input type="color" className="color-input"
                    value={theme[key]} onChange={e => set(key, e.target.value)} />
                </div>
              ))}
            </div>

            {/* Opacity */}
            <div className="settings-section">
              <div className="settings-title">Opacity</div>
              {[
                ['Card opacity',    'cardOpacity'],
                ['Border opacity',  'borderOpacity'],
                ['Handle opacity',  'handleOpacity'],
                ['Favicon opacity', 'faviconOpacity'],
              ].map(([label, key]) => (
                <div className="settings-row" key={key}>
                  <span className="settings-label">
                    {label} — {parseFloat(theme[key]).toFixed(2)}
                  </span>
                  <input type="range" min="0" max="1" step="0.01"
                    value={theme[key]} onChange={e => set(key, e.target.value)}
                    style={{ width: 100 }} />
                </div>
              ))}
            </div>

            {/* Background */}
            <div className="settings-section">
              <div className="settings-title">Background</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {BG_OPTIONS.map(opt => (
                  <button key={opt.value}
                    className={`preset-slot${theme.bgStyle === opt.value ? ' active' : ''}`}
                    style={{ flex: 'none', padding: '0.25rem 0.55rem' }}
                    onClick={() => set('bgStyle', opt.value)}>
                    {opt.label}
                  </button>
                ))}
              </div>

              {isPatternBg && (
                <>
                  <div className="settings-row" style={{ marginTop: '0.5rem' }}>
                    <span className="settings-label">Pattern colour</span>
                    <input type="color" className="color-input"
                      value={theme.patternColor}
                      onChange={e => set('patternColor', e.target.value)} />
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">
                      Pattern opacity — {parseFloat(theme.patternOpacity).toFixed(2)}
                    </span>
                    <input type="range" min="0" max="1" step="0.01"
                      value={theme.patternOpacity}
                      onChange={e => set('patternOpacity', e.target.value)}
                      style={{ width: 100 }} />
                  </div>
                </>
              )}

              {theme.bgStyle === 'bg-image' && (
                <>
                  <input ref={fileRef} type="file" accept="image/*"
                    style={{ display: 'none' }} onChange={handleImageUpload} />
                  <button className="btn"
                    style={{ marginTop: '0.5rem', fontSize: '0.8em', width: '100%' }}
                    onClick={() => fileRef.current?.click()}>
                    {theme.bgImage ? '↺ change image' : '↑ upload image'}
                  </button>
                  {theme.bgImage && (
                    <>
                      <img src={theme.bgImage} alt="bg preview"
                        style={{
                          width: '100%', height: 80, objectFit: 'cover',
                          borderRadius: 'var(--radius-sm)', marginTop: '0.4rem',
                          border: '1px solid var(--border)',
                        }} />
                      <div className="settings-row" style={{ marginTop: '0.4rem' }}>
                        <span className="settings-label">
                          Image opacity — {parseFloat(theme.bgImageOpacity).toFixed(2)}
                        </span>
                        <input type="range" min="0.05" max="1" step="0.01"
                          value={theme.bgImageOpacity}
                          onChange={e => set('bgImageOpacity', e.target.value)}
                          style={{ width: 100 }} />
                      </div>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Typography */}
            <div className="settings-section">
              <div className="settings-title">Typography</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                {FONTS.map(f => (
                  <button key={f}
                    className={`preset-slot${theme.font === f ? ' active' : ''}`}
                    style={{ flex: 'none', fontFamily: f }}
                    onClick={() => set('font', f)}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="settings-row" style={{ marginTop: '0.5rem' }}>
                <span className="settings-label">Font size — {theme.fontSize}px</span>
                <input type="range" min="11" max="18" step="1"
                  value={theme.fontSize} onChange={e => set('fontSize', e.target.value)}
                  style={{ width: 100 }} />
              </div>
              <div className="settings-row">
                <span className="settings-label">Clock size — {theme.clockSize}rem</span>
                <input type="range" min="0.7" max="2" step="0.05"
                  value={theme.clockSize} onChange={e => set('clockSize', e.target.value)}
                  style={{ width: 100 }} />
              </div>
            </div>

            {/* Layout */}
            <div className="settings-section">
              <div className="settings-title">Layout</div>
              <div className="settings-row">
                <span className="settings-label">Section columns</span>
                <div className="preset-slots">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n}
                      className={`preset-slot${parseInt(theme.sectionsCols) === n ? ' active' : ''}`}
                      onClick={() => {
                        set('sectionsCols', String(n))
                        window.dispatchEvent(new Event('theme_cols_changed'))
                      }}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row">
                <span className="settings-label">Border radius — {theme.radius}px</span>
                <input type="range" min="0" max="20" step="1"
                  value={theme.radius} onChange={e => set('radius', e.target.value)}
                  style={{ width: 100 }} />
              </div>
              <div className="settings-row">
                <span className="settings-label">Card padding — {theme.cardPadding}rem</span>
                <input type="range" min="0.25" max="2" step="0.05"
                  value={theme.cardPadding} onChange={e => set('cardPadding', e.target.value)}
                  style={{ width: 100 }} />
              </div>
              <div className="settings-row">
                <span className="settings-label">Link gap — {theme.linkGap}rem</span>
                <input type="range" min="0" max="1.5" step="0.05"
                  value={theme.linkGap} onChange={e => set('linkGap', e.target.value)}
                  style={{ width: 100 }} />
              </div>
              <div className="settings-row">
                <span className="settings-label">Page scale — {theme.pageScale}</span>
                <input type="range" min="0.5" max="1.5" step="0.05"
                  value={theme.pageScale} onChange={e => set('pageScale', e.target.value)}
                  style={{ width: 100 }} />
              </div>
            </div>

            {/* Favicons */}
            <div className="settings-section">
              <div className="settings-title">Favicons</div>
              <div className="settings-row">
                <span className="settings-label">Style</span>
                <div className="preset-slots">
                  {[
                    { label: 'Normal', value: 'none' },
                    { label: 'Dim',    value: 'opacity(0.5)' },
                    { label: 'Mono',   value: 'grayscale(1)' },
                    { label: 'None',   value: 'opacity(0)' },
                  ].map(opt => (
                    <button key={opt.value}
                      className={`preset-slot${theme.faviconFilter === opt.value ? ' active' : ''}`}
                      onClick={() => set('faviconFilter', opt.value)}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Import / Export / Reset */}
            <div className="settings-section">
              <div className="settings-title">Presets</div>
              <div className="import-export">
                <button className="btn" style={{ fontSize: '0.8em' }}
                  onClick={exportSettings}>↓ export</button>
                <label className="btn" style={{ fontSize: '0.8em', cursor: 'pointer' }}>
                  ↑ import
                  <input type="file" accept=".json" style={{ display: 'none' }}
                    onChange={importSettings} />
                </label>
                <button className="btn btn-danger" style={{ fontSize: '0.8em' }}
                  onClick={resetSettings}>reset</button>
              </div>
            </div>

            <div className="settings-footer">
              <button className="btn btn-primary" style={{ flex: 1 }}
                onClick={saveSettings}>Save & close</button>
              <button className="btn" onClick={() => setShowSettings(false)}>Cancel</button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}