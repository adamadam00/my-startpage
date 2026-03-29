import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import Auth      from './components/Auth'
import Clock     from './components/Clock'
import Weather   from './components/Weather'
import SearchBar from './components/SearchBar'
import Notes     from './components/Notes'
import Sections  from './components/Sections'

const BUILD      = '29 Mar 2026'
const PATTERN_BG = ['bg-dots', 'bg-grid', 'bg-lines', 'bg-crosshatch']

const BG_OPTIONS = [
  { value: 'bg-solid',      label: 'Solid' },
  { value: 'bg-noise',      label: 'Noise' },
  { value: 'bg-dots',       label: 'Dots' },
  { value: 'bg-grid',       label: 'Grid' },
  { value: 'bg-gradient',   label: 'Gradient' },
  { value: 'bg-mesh',       label: 'Blobs' },
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
  bg:               '#0c0c0f',
  card:             '#13131a',
  cardOpacity:      '1',
  border:           '#2a2a3a',
  borderOpacity:    '1',
  accent:           '#6c8fff',
  text:             '#e8e8f0',
  textDim:          '#7878a0',
  titleColor:       '#7878a0',
  btnBg:            '#1e3a8a',
  notesBg:          '#13131a',
  bgStyle:          'bg-dots',
  patternColor:     '#2a2a3a',
  patternOpacity:   '1',
  gradientType:     'linear',
  gradientAngle:    '135',
  gradientColors:   '["#6c8fff","#9c6fff","#0c0c0f"]',
  font:             'DM Mono',
  workspaceFontSize:'14',
  topbarFontSize:   '12',
  clockWidgetScale: '1',
  radius:           '10',
  radiusSm:         '6',
  sectionRadius:    '0',
  linkGap:          '0.5',
  sectionsCols:     '2',
  sectionGap:       '0',
  sectionGapH:      '0',
  pageScale:        '1',
  handleOpacity:    '0.15',
  faviconOpacity:   '1',
  faviconFilter:    'none',
  bgImage:          '',
  bgImageOpacity:   '1',
  openInNewTab:     'true',
  notesFontSize:    '13',
  notesWidth:       '240',
  searchUrl:        'https://google.com/search?q=',
}

function loadTheme() {
  try { return { ...DEFAULT_THEME, ...JSON.parse(localStorage.getItem('current_theme') || '{}') } }
  catch { return { ...DEFAULT_THEME } }
}

function applyTheme(t) {
  const r = document.documentElement.style
  r.setProperty('--bg',                t.bg)
  r.setProperty('--bg2',               t.bg)
  r.setProperty('--bg3',               t.card)
  r.setProperty('--card',              t.card)
  r.setProperty('--card-opacity',      t.cardOpacity)
  r.setProperty('--border',            t.border)
  r.setProperty('--border-opacity',    t.borderOpacity)
  r.setProperty('--accent',            t.accent)
  r.setProperty('--accent-dim',        t.accent + '22')
  r.setProperty('--accent-glow',       t.accent + '33')
  r.setProperty('--text',              t.text)
  r.setProperty('--text-dim',          t.textDim)
  r.setProperty('--text-muted',        t.textDim + '88')
  r.setProperty('--title-color',       t.titleColor)
  r.setProperty('--btn-bg',            t.btnBg)
  r.setProperty('--btn-text',          '#ffffff')
  r.setProperty('--notes-bg',          t.notesBg ?? t.card)
  r.setProperty('--font',              `'${t.font}', monospace`)
  r.setProperty('--font-size',         t.workspaceFontSize + 'px')
  r.setProperty('--topbar-font-size',  t.topbarFontSize    + 'px')
  r.setProperty('--clock-widget-size', t.clockWidgetScale  + 'rem')
  r.setProperty('--radius',            t.radius            + 'px')
  r.setProperty('--radius-sm',         t.radiusSm          + 'px')
  r.setProperty('--section-radius',    (t.sectionRadius ?? '0') + 'px')
  r.setProperty('--link-gap',          t.linkGap           + 'rem')
  r.setProperty('--section-gap',       t.sectionGap        + 'px')
  r.setProperty('--section-gap-h',     t.sectionGapH       + 'px')
  r.setProperty('--page-scale',        t.pageScale)
  r.setProperty('--handle-opacity',    t.handleOpacity)
  r.setProperty('--favicon-opacity',   t.faviconOpacity)
  r.setProperty('--favicon-filter',    t.faviconFilter)
  r.setProperty('--pattern-color',     t.patternColor)
  r.setProperty('--pattern-opacity',   t.patternOpacity)
  r.setProperty('--notes-font-size',   t.notesFontSize + 'px')
  r.setProperty('--notes-width',       t.notesWidth    + 'px')
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('current_theme', JSON.stringify(theme))
  }, [theme])

  useEffect(() => {
    const onFocus = () => { const s = loadTheme(); setTheme(s); applyTheme(s) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const set = (key, val) => setTheme(prev => ({ ...prev, [key]: val }))

  const fetchWorkspaces = useCallback(async () => {
    if (!session) return
    const { data } = await supabase.from('workspaces').select('*')
      .eq('user_id', session.user.id).order('created_at')
    if (data) { setWorkspaces(data); setActiveWs(prev => prev ?? data[0]?.id ?? null) }
  }, [session])

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

  useEffect(() => { fetchWorkspaces() }, [fetchWorkspaces])
  useEffect(() => { fetchData() },       [fetchData])

  const addWorkspace = async (e) => {
    e.preventDefault()
    if (!newWsName.trim()) return
    const { data } = await supabase.from('workspaces')
      .insert({ user_id: session.user.id, name: newWsName.trim() }).select().single()
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
    setWorkspaces(remaining); setActiveWs(remaining[0]?.id ?? null)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert('Please use an image under 2 MB for local caching.'); return
    }
    const reader = new FileReader()
    reader.onload = (ev) =>
      setTheme(prev => ({ ...prev, bgStyle: 'bg-image', bgImage: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const saveSettings = () => {
    localStorage.setItem('current_theme', JSON.stringify(theme))
    applyTheme(theme); setShowSettings(false)
  }
  const resetSettings = () => {
    setTheme({ ...DEFAULT_THEME })
    localStorage.setItem('current_theme', JSON.stringify(DEFAULT_THEME))
    applyTheme(DEFAULT_THEME)
  }
  const exportSettings = () => {
    const blob = new Blob([JSON.stringify({ ...theme, bgImage: '' }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'theme.json'; a.click()
  }
  const importSettings = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const t = { ...DEFAULT_THEME, ...JSON.parse(ev.target.result) }
        setTheme(t); applyTheme(t); localStorage.setItem('current_theme', JSON.stringify(t))
      } catch { alert('Invalid theme file') }
    }
    reader.readAsText(file)
  }

  if (loading) return <div className="auth-wrap" style={{ color: 'var(--text-dim)' }}>Loading…</div>
  if (!session) return <Auth onAuth={setSession} />

  const isPatternBg  = PATTERN_BG.includes(theme.bgStyle)
  const colCount     = parseInt(theme.sectionsCols) || 2
  const notesWidth   = parseInt(theme.notesWidth)   || 240
  const openInNewTab = theme.openInNewTab !== 'false'

  const getBgStyle = () => {
    if (theme.bgStyle === 'bg-image') return {
      backgroundImage: theme.bgImage ? `url(${theme.bgImage})` : 'none',
      backgroundSize: 'cover', backgroundPosition: 'center',
      opacity: parseFloat(theme.bgImageOpacity ?? 1),
    }
    if (theme.bgStyle === 'bg-gradient') {
      try {
        const colors = JSON.parse(theme.gradientColors || '["#6c8fff","#0c0c0f"]')
        const stops  = colors.join(', ')
        return {
          background: theme.gradientType === 'radial'
            ? `radial-gradient(ellipse at center, ${stops})`
            : `linear-gradient(${theme.gradientAngle}deg, ${stops})`,
        }
      } catch { return {} }
    }
    return {}
  }

  const gradColors = (() => {
    try { return JSON.parse(theme.gradientColors) } catch { return ['#6c8fff', '#0c0c0f'] }
  })()
  const updateGradColor = (i, val) => {
    const next = [...gradColors]; next[i] = val
    set('gradientColors', JSON.stringify(next))
  }
  const addGradStop = () => {
    if (gradColors.length >= 6) return
    set('gradientColors', JSON.stringify([...gradColors, '#444466']))
  }
  const removeGradStop = (i) => {
    if (gradColors.length <= 2) return
    set('gradientColors', JSON.stringify(gradColors.filter((_, idx) => idx !== i)))
  }

  return (
    <div className="app">
      <div className={`bg-layer ${theme.bgStyle}`} style={getBgStyle()} />

      {/* ── Topbar ── */}
      <div className="topbar">
        <div className="workspace-tabs">
          {workspaces.map(ws => (
            <button key={ws.id}
              className={`workspace-tab${activeWs === ws.id ? ' active' : ''}`}
              onClick={() => setActiveWs(ws.id)}>
              {ws.name}
              <button className="del-ws"
                onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id) }}>✕</button>
            </button>
          ))}
          {addingWs ? (
            <form onSubmit={addWorkspace} style={{ display: 'flex', gap: '0.4rem' }}>
              <input className="input" value={newWsName}
                onChange={e => setNewWsName(e.target.value)}
                placeholder="Name" autoFocus
                style={{ width: 110, padding: '0.2rem 0.6rem', fontSize: 'var(--topbar-font-size)' }} />
              <button className="btn btn-primary" type="submit">+</button>
              <button className="btn" type="button" onClick={() => setAddingWs(false)}>✕</button>
            </form>
          ) : (
            <button className="btn btn-ghost" onClick={() => setAddingWs(true)}
              style={{ padding: '0.25rem 0.7rem' }}>+</button>
          )}
        </div>

        <div className="topbar-widgets">
          <div className="clock-compact"><Clock /></div>
          <div className="topbar-divider" />
          <Weather />
          <div className="topbar-divider" />
          <SearchBar searchUrl={theme.searchUrl} />
        </div>

        {/* ── build date removed from here ── */}
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={() => setShowSettings(s => !s)}>⚙ Settings</button>
          <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="main-layout" style={{ gridTemplateColumns: `1fr ${notesWidth}px` }}>
        <div className="main-col">
          <Sections
            sections={sections ?? []}
            links={links ?? []}
            userId={session.user.id}
            workspaceId={activeWs}
            onRefresh={fetchData}
            openInNewTab={openInNewTab}
            colCount={colCount}
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

            {/* Header now includes build date */}
            <div className="settings-header">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                <span style={{ fontWeight: 500 }}>Settings</span>
                <span style={{ fontSize: '0.68em', color: 'var(--text-muted)' }}>build {BUILD}</span>
              </div>
              <button className="icon-btn" onClick={() => setShowSettings(false)}>✕</button>
            </div>

            {/* Colours */}
            <div className="settings-section">
              <div className="settings-title">Colours</div>
              {[
                ['Background',    'bg'],
                ['Card',          'card'],
                ['Border',        'border'],
                ['Accent',        'accent'],
                ['Text',          'text'],
                ['Text dim',      'textDim'],
                ['Section title', 'titleColor'],
                ['Button',        'btnBg'],
                ['Notes panel',   'notesBg'],
              ].map(([label, key]) => (
                <div className="settings-row" key={key}>
                  <span className="settings-label">{label}</span>
                  <input type="color" className="color-input"
                    value={theme[key] ?? '#13131a'} onChange={e => set(key, e.target.value)} />
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
                  <span className="settings-label">{label} — {parseFloat(theme[key]).toFixed(2)}</span>
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
                      value={theme.patternColor} onChange={e => set('patternColor', e.target.value)} />
                  </div>
                  <div className="settings-row">
                    <span className="settings-label">
                      Pattern opacity — {parseFloat(theme.patternOpacity).toFixed(2)}
                    </span>
                    <input type="range" min="0" max="1" step="0.01"
                      value={theme.patternOpacity} onChange={e => set('patternOpacity', e.target.value)}
                      style={{ width: 100 }} />
                  </div>
                </>
              )}

              {theme.bgStyle === 'bg-gradient' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <div className="settings-row">
                    <span className="settings-label">Type</span>
                    <div className="preset-slots">
                      {['linear', 'radial'].map(gt => (
                        <button key={gt}
                          className={`preset-slot${theme.gradientType === gt ? ' active' : ''}`}
                          onClick={() => set('gradientType', gt)}>
                          {gt.charAt(0).toUpperCase() + gt.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>
                  {theme.gradientType === 'linear' && (
                    <div className="settings-row">
                      <span className="settings-label">Angle — {theme.gradientAngle}°</span>
                      <input type="range" min="0" max="360" step="5"
                        value={theme.gradientAngle} onChange={e => set('gradientAngle', e.target.value)}
                        style={{ width: 100 }} />
                    </div>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span className="settings-label">Colour stops ({gradColors.length}/6)</span>
                    {gradColors.map((c, i) => (
                      <div key={i} className="settings-row">
                        <span className="settings-label">Stop {i + 1}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input type="color" className="color-input" value={c}
                            onChange={e => updateGradColor(i, e.target.value)} />
                          {gradColors.length > 2 && (
                            <button className="icon-btn" style={{ fontSize: '0.7em' }}
                              onClick={() => removeGradStop(i)}>✕</button>
                          )}
                        </div>
                      </div>
                    ))}
                    {gradColors.length < 6 && (
                      <button className="btn" style={{ fontSize: '0.75em', alignSelf: 'flex-start' }}
                        onClick={addGradStop}>+ Add stop</button>
                    )}
                  </div>
                </div>
              )}

              {theme.bgStyle === 'bg-image' && (
                <>
                  <input ref={fileRef} type="file" accept="image/*"
                    style={{ display: 'none' }} onChange={handleImageUpload} />
                  <button className="btn"
                    style={{ marginTop: '0.5rem', fontSize: '0.8em', width: '100%' }}
                    onClick={() => fileRef.current?.click()}>
                    {theme.bgImage ? '↺ Change image' : '↑ Upload image (max 2 MB, cached locally)'}
                  </button>
                  {theme.bgImage && (
                    <>
                      <img src={theme.bgImage} alt="Background preview"
                        style={{ width: '100%', height: 80, objectFit: 'cover',
                          borderRadius: 'var(--radius-sm)', marginTop: '0.4rem',
                          border: '1px solid var(--border)' }} />
                      <div className="settings-row" style={{ marginTop: '0.4rem' }}>
                        <span className="settings-label">
                          Image opacity — {parseFloat(theme.bgImageOpacity).toFixed(2)}
                        </span>
                        <input type="range" min="0.05" max="1" step="0.01"
                          value={theme.bgImageOpacity} onChange={e => set('bgImageOpacity', e.target.value)}
                          style={{ width: 100 }} />
                      </div>
                      <button className="btn btn-danger"
                        style={{ marginTop: '0.35rem', fontSize: '0.75em', width: '100%' }}
                        onClick={() => set('bgImage', '')}>Remove image</button>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Typography */}
            <div className="settings-section">
              <div className="settings-title">Typography</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.5rem' }}>
                {FONTS.map(f => (
                  <button key={f}
                    className={`preset-slot${theme.font === f ? ' active' : ''}`}
                    style={{ flex: 'none', fontFamily: f }} onClick={() => set('font', f)}>
                    {f}
                  </button>
                ))}
              </div>
              {[
                ['Workspace font size', 'workspaceFontSize', 11, 18, 1, 'px'],
                ['Topbar font size',    'topbarFontSize',    10, 16, 1, 'px'],
              ].map(([label, key, min, max, step, unit]) => (
                <div className="settings-row" key={key}>
                  <span className="settings-label">{label} — {theme[key]}{unit}</span>
                  <input type="range" min={min} max={max} step={step}
                    value={theme[key]} onChange={e => set(key, e.target.value)}
                    style={{ width: 100 }} />
                </div>
              ))}
              <div className="settings-row">
                <span className="settings-label">Clock & weather scale — {theme.clockWidgetScale}rem</span>
                <input type="range" min="0.75" max="2.5" step="0.05"
                  value={theme.clockWidgetScale} onChange={e => set('clockWidgetScale', e.target.value)}
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
                      onClick={() => set('sectionsCols', String(n))}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              {[
                ['Section gap (vertical)',   'sectionGap',    0,   24,  1,    'px'],
                ['Section gap (horizontal)', 'sectionGapH',   0,   24,  1,    'px'],
                ['Section card radius',      'sectionRadius', 0,   20,  1,    'px'],
                ['Notes panel width',        'notesWidth',    140, 420, 10,   'px'],
                ['Notes font size',          'notesFontSize', 11,  18,  1,    'px'],
                ['Link gap',                 'linkGap',       0,   1.5, 0.05, 'rem'],
                ['Page scale',               'pageScale',     0.5, 1.3, 0.05, ''],
              ].map(([label, key, min, max, step, unit]) => (
                <div className="settings-row" key={key}>
                  <span className="settings-label">{label} — {theme[key]}{unit}</span>
                  <input type="range" min={min} max={max} step={step}
                    value={theme[key] ?? 0} onChange={e => set(key, e.target.value)}
                    style={{ width: 100 }} />
                </div>
              ))}
              <div className="settings-row">
                <span className="settings-label">Radius (buttons & inputs) — {theme.radius}px</span>
                <input type="range" min="0" max="20" step="1"
                  value={theme.radius} onChange={e => set('radius', e.target.value)}
                  style={{ width: 100 }} />
              </div>
            </div>

            {/* Search */}
            <div className="settings-section">
              <div className="settings-title">Search</div>
              <span className="settings-label" style={{ marginBottom: '0.15rem' }}>Search URL</span>
              <input className="input" value={theme.searchUrl}
                onChange={e => set('searchUrl', e.target.value)}
                placeholder="https://google.com/search?q="
                style={{ fontSize: '0.8em' }} />
              <div style={{ fontSize: '0.72em', color: 'var(--text-muted)' }}>
                Query is appended to the end of this URL.
              </div>
            </div>

            {/* Links */}
            <div className="settings-section">
              <div className="settings-title">Links</div>
              <div className="settings-row">
                <span className="settings-label">Open links in new tab</span>
                <label className="toggle">
                  <input type="checkbox" checked={theme.openInNewTab !== 'false'}
                    onChange={e => set('openInNewTab', e.target.checked ? 'true' : 'false')} />
                  <span className="toggle-slider" />
                </label>
              </div>
              <div className="settings-row">
                <span className="settings-label">Favicon style</span>
                <div className="preset-slots">
                  {[
                    { label: 'Normal', value: 'none' },
                    { label: 'Dim',    value: 'opacity(0.5)' },
                    { label: 'Mono',   value: 'grayscale(1)' },
                    { label: 'Hide',   value: 'opacity(0)' },
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

            {/* Presets */}
            <div className="settings-section">
              <div className="settings-title">Presets</div>
              <div className="import-export">
                <button className="btn" style={{ fontSize: '0.8em' }} onClick={exportSettings}>↓ Export</button>
                <label className="btn" style={{ fontSize: '0.8em', cursor: 'pointer' }}>
                  ↑ Import
                  <input type="file" accept=".json" style={{ display: 'none' }} onChange={importSettings} />
                </label>
                <button className="btn btn-danger" style={{ fontSize: '0.8em' }} onClick={resetSettings}>Reset</button>
              </div>
            </div>

            <div className="settings-footer">
              <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveSettings}>Save & close</button>
              <button className="btn" onClick={() => setShowSettings(false)}>Cancel</button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}