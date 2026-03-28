import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import ImportExport from './ImportExport'

const FONTS = [
  { label: 'DM Mono',        value: "'DM Mono', monospace" },
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { label: 'Geist',          value: "'Geist', sans-serif" },
  { label: 'Inter',          value: "'Inter', sans-serif" },
  { label: 'IBM Plex Sans',  value: "'IBM Plex Sans', sans-serif" },
  { label: 'Outfit',         value: "'Outfit', sans-serif" },
  { label: 'Space Grotesk',  value: "'Space Grotesk', sans-serif" },
  { label: 'Figtree',        value: "'Figtree', sans-serif" },
]

const BG_PRESETS = ['noise', 'dots', 'grid', 'mesh', 'aurora', 'solid']

const DEFAULT_THEME = {
  bg:               '#0c0c0f',
  bg2:              '#13131a',
  bg3:              '#1a1a24',
  card:             '#13131a',
  cardOpacity:      1,
  borderOpacity:    1,
  handleOpacity:    0.15,
  border:           '#2a2a3a',
  borderHover:      '#3d3d55',
  text:             '#e8e8f0',
  textDim:          '#7878a0',
  accent:           '#6c8fff',
  danger:           '#ff6b6b',
  success:          '#6bffb8',
  btnBg:            '#6c8fff',
  btnText:          '#ffffff',
  font:             "'DM Mono', monospace",
  fontSize:         14,
  clockSize:        1.0,
  radius:           10,
  linkGap:          0.5,
  cardPadding:      1,
  sectionsCols:     2,
  pageScale:        1,
  faviconOpacity:   1,
  faviconGreyscale: false,
}

function Toggle({ checked, onChange, title }) {
  return (
    <label className="toggle" title={title}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

function Row({ label, children, tip }) {
  return (
    <div className="settings-row" title={tip}>
      <span className="settings-label">{label}</span>
      {children}
    </div>
  )
}

function SettingsSection({ title, children }) {
  return (
    <div className="settings-section">
      <div className="settings-title">{title}</div>
      {children}
    </div>
  )
}

export default function Settings({
  session, userSettings, onSettingsChange, onClose,
  onResetLinks, onExportAll,
  activeWs, workspaces,
  onAddWorkspace, onDeleteWorkspace, onRenameWorkspace, onSwitchWorkspace,
  uiVisibility,
}) {
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('current_theme')
      return saved ? { ...DEFAULT_THEME, ...JSON.parse(saved) } : DEFAULT_THEME
    } catch { return DEFAULT_THEME }
  })

  const [activeSlot,   setActiveSlot]   = useState(null)
  const [slotNames,    setSlotNames]    = useState({ 1: 'Preset 1', 2: 'Preset 2', 3: 'Preset 3', 4: 'Preset 4' })
  const [presets,      setPresets]      = useState({})
  const [clockFormat,  setClockFormat]  = useState(userSettings?.clock_format    ?? '12h')
  const [openNewTab,   setOpenNewTab]   = useState(userSettings?.open_in_new_tab ?? true)
  const [bgPreset,     setBgPreset]     = useState(userSettings?.bg_preset       ?? 'noise')
  const [bgImage,      setBgImage]      = useState(localStorage.getItem('bg_image') ?? null)
  const [weatherName,  setWeatherName]  = useState(userSettings?.weather_name ?? 'Melbourne')
  const [weatherLat,   setWeatherLat]   = useState(userSettings?.weather_lat  ?? -37.8136)
  const [weatherLon,   setWeatherLon]   = useState(userSettings?.weather_lon  ?? 144.9631)
  const [showClock,    setShowClock]    = useState(uiVisibility?.showClock   ?? true)
  const [showWeather,  setShowWeather]  = useState(uiVisibility?.showWeather ?? true)
  const [showSearch,   setShowSearch]   = useState(uiVisibility?.showSearch  ?? true)
  const [showNotes,    setShowNotes]    = useState(uiVisibility?.showNotes   ?? true)
  const [showPins,     setShowPins]     = useState(uiVisibility?.showPins    ?? true)
  const [saving,       setSaving]       = useState(false)
  const [newWsName,    setNewWsName]    = useState('')
  const [addingWs,     setAddingWs]     = useState(false)
  const [renamingWs,   setRenamingWs]   = useState(null)
  const [renameVal,    setRenameVal]    = useState('')
  const fileRef = useRef()

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('theme_presets').select('*')
        .eq('user_id', session.user.id)
      if (data) {
        const map = {}
        const names = { ...slotNames }
        data.forEach(p => { map[p.slot] = p.config; names[p.slot] = p.name })
        setPresets(map)
        setSlotNames(names)
      }
    }
    load()
  }, [session])

  // Live-apply theme to CSS vars and localStorage
  useEffect(() => {
    localStorage.setItem('current_theme', JSON.stringify(theme))
    const r = document.documentElement.style
    r.setProperty('--bg',               theme.bg)
    r.setProperty('--bg2',              theme.bg2)
    r.setProperty('--bg3',              theme.bg3)
    r.setProperty('--card',             theme.card)
    r.setProperty('--card-opacity',     theme.cardOpacity)
    r.setProperty('--border-opacity',   theme.borderOpacity)
    r.setProperty('--handle-opacity',   theme.handleOpacity ?? 0.15)
    r.setProperty('--border',           theme.border)
    r.setProperty('--border-hover',     theme.borderHover)
    r.setProperty('--text',             theme.text)
    r.setProperty('--text-dim',         theme.textDim)
    r.setProperty('--accent',           theme.accent)
    r.setProperty('--accent-dim',       theme.accent + '33')
    r.setProperty('--accent-glow',      theme.accent + '22')
    r.setProperty('--danger',           theme.danger)
    r.setProperty('--success',          theme.success)
    r.setProperty('--btn-bg',           theme.btnBg)
    r.setProperty('--btn-text',         theme.btnText)
    r.setProperty('--font',             theme.font)
    r.setProperty('--font-size',        theme.fontSize + 'px')
    r.setProperty('--clock-size',       theme.clockSize + 'rem')
    r.setProperty('--radius',           theme.radius + 'px')
    r.setProperty('--radius-sm',        Math.max(2, theme.radius - 4) + 'px')
    r.setProperty('--link-gap',         theme.linkGap + 'rem')
    r.setProperty('--card-padding',     theme.cardPadding + 'rem')
    r.setProperty('--sections-cols',    theme.sectionsCols)
    r.setProperty('--favicon-opacity',  theme.faviconOpacity)
    r.setProperty('--favicon-filter',   theme.faviconGreyscale ? 'grayscale(1)' : 'none')
    document.body.style.zoom = theme.pageScale
  }, [theme])

  const set = (key, val) => setTheme(t => ({ ...t, [key]: val }))

  const loadSlot = (slot) => {
    setActiveSlot(slot)
    if (presets[slot]) setTheme({ ...DEFAULT_THEME, ...presets[slot] })
  }

  const saveSlot = async (slot) => {
    if (!slot) return
    await supabase.from('theme_presets').upsert({
      user_id: session.user.id, slot, name: slotNames[slot], config: theme,
    }, { onConflict: 'user_id,slot' })
    setPresets(p => ({ ...p, [slot]: theme }))
  }

  const handleBgImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      localStorage.setItem('bg_image', ev.target.result)
      setBgImage(ev.target.result)
      setBgPreset('image')
    }
    reader.readAsDataURL(file)
  }

  const clearBgImage = () => {
    localStorage.removeItem('bg_image')
    setBgImage(null)
    setBgPreset('noise')
  }

  const resetTheme = () => {
    if (!confirm('⚠ Reset ALL theme settings to defaults?\n\nSaved presets will not be affected.')) return
    setTheme(DEFAULT_THEME)
  }

  const handleClose = async () => {
    setSaving(true)
    try {
      await supabase.from('user_settings').upsert({
        user_id:         session.user.id,
        clock_format:    clockFormat,
        open_in_new_tab: openNewTab,
        bg_preset:       bgPreset,
        weather_name:    weatherName,
        weather_lat:     parseFloat(weatherLat),
        weather_lon:     parseFloat(weatherLon),
      }, { onConflict: 'user_id' })

      if (activeSlot) await saveSlot(activeSlot)

      onSettingsChange({
        clock_format:    clockFormat,
        open_in_new_tab: openNewTab,
        bg_preset:       bgPreset,
        weather_name:    weatherName,
        weather_lat:     parseFloat(weatherLat),
        weather_lon:     parseFloat(weatherLon),
        showClock, showWeather, showSearch, showNotes, showPins,
      })
    } finally {
      setSaving(false)
      onClose()
    }
  }

  const handleAddWs = async (e) => {
    e.preventDefault()
    if (!newWsName.trim()) return
    await onAddWorkspace(newWsName.trim())
    setNewWsName('')
    setAddingWs(false)
  }

  const startRename = (ws) => {
    setRenamingWs(ws.id)
    setRenameVal(ws.name)
  }

  const submitRename = async (e, id) => {
    e.preventDefault()
    await onRenameWorkspace(id, renameVal)
    setRenamingWs(null)
  }

  return (
    <div className="settings-panel">

      {/* Sticky header */}
      <div className="settings-header">
        <span style={{ fontWeight: 500 }}>Settings</span>
        <span style={{ fontSize: '0.72em', color: 'var(--text-muted)' }}>Changes apply live</span>
      </div>

      {/* ── Workspaces ── */}
      <SettingsSection title="Workspaces">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {workspaces.map(ws => (
            <div key={ws.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {renamingWs === ws.id ? (
                <form onSubmit={e => submitRename(e, ws.id)}
                  style={{ flex: 1, display: 'flex', gap: '0.4rem' }}>
                  <input className="input" value={renameVal}
                    onChange={e => setRenameVal(e.target.value)} autoFocus style={{ flex: 1 }} />
                  <button className="btn btn-primary" type="submit">Save</button>
                  <button className="btn" type="button" onClick={() => setRenamingWs(null)}>✕</button>
                </form>
              ) : (
                <>
                  <button
                    className={`workspace-tab${activeWs === ws.id ? ' active' : ''}`}
                    style={{ flex: 1, textAlign: 'left' }}
                    onClick={() => onSwitchWorkspace(ws.id)}
                    title={`Switch to ${ws.name}`}>
                    {ws.name} {activeWs === ws.id && '✓'}
                  </button>
                  <button className="icon-btn" onClick={() => startRename(ws)}
                    title={`Rename ${ws.name}`}>✎</button>
                  {workspaces.length > 1 && (
                    <button className="icon-btn" onClick={() => onDeleteWorkspace(ws.id)}
                      title={`Delete ${ws.name}`}
                      style={{ color: 'var(--danger)' }}>✕</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>

        {workspaces.length < 5 && (
          addingWs ? (
            <form onSubmit={handleAddWs} style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="input" value={newWsName}
                onChange={e => setNewWsName(e.target.value)}
                placeholder="Workspace name" autoFocus style={{ flex: 1 }} />
              <button className="btn btn-primary" type="submit">Add</button>
              <button className="btn" type="button" onClick={() => setAddingWs(false)}>✕</button>
            </form>
          ) : (
            <button className="btn btn-ghost" onClick={() => setAddingWs(true)}
              title="Add a new workspace (max 5)"
              style={{ fontSize: '0.82em', alignSelf: 'flex-start' }}>
              + add workspace
            </button>
          )
        )}
        <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>
          Max 5 workspaces. Active workspace is remembered per device.
        </div>
      </SettingsSection>

      {/* ── Theme Presets ── */}
      <SettingsSection title="Theme Presets">
        <div className="preset-slots">
          {[1,2,3,4].map(slot => (
            <button key={slot}
              className={`preset-slot${activeSlot === slot ? ' active' : ''}`}
              onClick={() => loadSlot(slot)}
              title={presets[slot] ? `Load: ${slotNames[slot]}` : `Empty — saves current theme here`}>
              {slotNames[slot]}
            </button>
          ))}
        </div>
        {activeSlot && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="input" value={slotNames[activeSlot]}
              onChange={e => setSlotNames(n => ({ ...n, [activeSlot]: e.target.value }))}
              placeholder="Preset name" style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={() => saveSlot(activeSlot)}
              title={`Save current theme to slot ${activeSlot}`}>
              Save to {activeSlot}
            </button>
          </div>
        )}
      </SettingsSection>

      {/* ── Colors ── */}
      <SettingsSection title="Colors">
        {[
          ['Background',    'bg',          'Main page background'],
          ['Surface',       'bg2',         'Settings panel background'],
          ['Input / Hover', 'bg3',         'Input fields and hover highlights'],
          ['Card color',    'card',        'Section card background'],
          ['Border',        'border',      'Default border color'],
          ['Border hover',  'borderHover', 'Border color on hover'],
          ['Text',          'text',        'Primary text color'],
          ['Text dim',      'textDim',     'Labels and secondary text'],
          ['Accent',        'accent',      'Highlight and active color'],
          ['Danger',        'danger',      'Delete and warning color'],
          ['Success',       'success',     'Success message color'],
          ['Button BG',     'btnBg',       'Primary button background'],
          ['Button text',   'btnText',     'Primary button text'],
        ].map(([label, key, tip]) => (
          <Row key={key} label={label} tip={tip}>
            <input type="color" className="color-input"
              value={theme[key]} onChange={e => set(key, e.target.value)} title={tip} />
          </Row>
        ))}
      </SettingsSection>

      {/* ── Transparency ── */}
      <SettingsSection title="Transparency & Handles">
        <Row label={`Card opacity: ${Math.round(theme.cardOpacity * 100)}%`}
          tip="Lower = see background through cards">
          <input type="range" min="0.05" max="1" step="0.05"
            value={theme.cardOpacity}
            onChange={e => set('cardOpacity', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Border opacity: ${Math.round(theme.borderOpacity * 100)}%`}
          tip="0% = no borders visible">
          <input type="range" min="0" max="1" step="0.05"
            value={theme.borderOpacity}
            onChange={e => set('borderOpacity', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Drag handle opacity: ${Math.round((theme.handleOpacity ?? 0.15) * 100)}%`}
          tip="Visibility of ⠿ drag handles — they always brighten on hover">
          <input type="range" min="0" max="1" step="0.05"
            value={theme.handleOpacity ?? 0.15}
            onChange={e => set('handleOpacity', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
      </SettingsSection>

      {/* ── Typography ── */}
      <SettingsSection title="Typography">
        <Row label="Font family" tip="Font used throughout the page">
          <select className="input" style={{ width: 'auto', flex: 1 }}
            value={theme.font} onChange={e => set('font', e.target.value)}>
            {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </Row>
        <Row label={`Base size: ${theme.fontSize}px`} tip="Global font size">
          <input type="range" min="11" max="20" step="1"
            value={theme.fontSize}
            onChange={e => set('fontSize', parseInt(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Clock size: ${theme.clockSize}rem`} tip="Size of the clock in the topbar">
          <input type="range" min="0.7" max="2" step="0.05"
            value={theme.clockSize}
            onChange={e => set('clockSize', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
      </SettingsSection>

      {/* ── Layout ── */}
      <SettingsSection title="Layout">
        <Row label={`Page scale: ${Math.round(theme.pageScale * 100)}%`}
          tip="Zoom the entire page">
          <input type="range" min="0.5" max="1.5" step="0.05"
            value={theme.pageScale}
            onChange={e => set('pageScale', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Section columns: ${theme.sectionsCols}`}
          tip="Number of section columns">
          <input type="range" min="1" max="5" step="1"
            value={theme.sectionsCols}
            onChange={e => set('sectionsCols', parseInt(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Card padding: ${theme.cardPadding}rem`}
          tip="Space inside section cards">
          <input type="range" min="0.1" max="2" step="0.1"
            value={theme.cardPadding}
            onChange={e => set('cardPadding', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Link spacing: ${theme.linkGap}rem`}
          tip="Vertical gap between links">
          <input type="range" min="0" max="1.5" step="0.05"
            value={theme.linkGap}
            onChange={e => set('linkGap', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Border radius: ${theme.radius}px`}
          tip="Corner roundness">
          <input type="range" min="0" max="24" step="1"
            value={theme.radius}
            onChange={e => set('radius', parseInt(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
      </SettingsSection>

      {/* ── Favicons ── */}
      <SettingsSection title="Link Icons (Favicons)">
        <Row label={`Opacity: ${Math.round(theme.faviconOpacity * 100)}%`}
          tip="0% = icons hidden">
          <input type="range" min="0" max="1" step="0.05"
            value={theme.faviconOpacity}
            onChange={e => set('faviconOpacity', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label="Greyscale icons" tip="Make all website icons black and white">
          <Toggle checked={theme.faviconGreyscale}
            onChange={v => set('faviconGreyscale', v)}
            title="Greyscale favicons" />
        </Row>
      </SettingsSection>

      {/* ── Background ── */}
      <SettingsSection title="Background">
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {BG_PRESETS.map(p => (
            <button key={p}
              className={`preset-slot${bgPreset === p ? ' active' : ''}`}
              onClick={() => { setBgPreset(p); onSettingsChange({ bg_preset: p }) }}
              style={{ flex: 'none' }}
              title={`Background: ${p}`}>
              {p}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => fileRef.current.click()}
            title="Upload a local image as background">
            📁 Upload image
          </button>
          {bgImage && (
            <button className="btn btn-danger" onClick={clearBgImage}
              title="Remove background image">
              Remove image
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*"
            style={{ display: 'none' }} onChange={handleBgImage} />
        </div>
        {bgImage && (
          <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>
            ✓ Saved locally on this device only
          </div>
        )}
      </SettingsSection>

      {/* ── Show / Hide ── */}
      <SettingsSection title="Show / Hide Elements">
        <Row label="Clock in topbar" tip="Toggle clock visibility">
          <Toggle checked={showClock}
            onChange={v => { setShowClock(v); onSettingsChange({ showClock: v }) }}
            title="Toggle clock" />
        </Row>
        <Row label="Weather in topbar" tip="Toggle weather visibility">
          <Toggle checked={showWeather}
            onChange={v => { setShowWeather(v); onSettingsChange({ showWeather: v }) }}
            title="Toggle weather" />
        </Row>
        <Row label="Search bar" tip="Toggle search bar visibility">
          <Toggle checked={showSearch}
            onChange={v => { setShowSearch(v); onSettingsChange({ showSearch: v }) }}
            title="Toggle search bar" />
        </Row>
        <Row label="Notes panel" tip="Hide to use the space for more link columns">
          <Toggle checked={showNotes}
            onChange={v => { setShowNotes(v); onSettingsChange({ showNotes: v }) }}
            title="Toggle notes panel" />
        </Row>
        <Row label="Pin buttons on sections" tip="Toggle section pin icons">
          <Toggle checked={showPins}
            onChange={v => { setShowPins(v); onSettingsChange({ showPins: v }) }}
            title="Toggle pin buttons" />
        </Row>
      </SettingsSection>

      {/* ── Clock & Search ── */}
      <SettingsSection title="Clock & Search">
        <Row label="Clock format" tip="12-hour or 24-hour time display">
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['12h','24h'].map(f => (
              <button key={f}
                className={`engine-tab${clockFormat === f ? ' active' : ''}`}
                onClick={() => setClockFormat(f)}
                title={f === '12h' ? '12-hour (1:30 pm)' : '24-hour (13:30)'}>
                {f}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Open links in new tab" tip="Open clicked links in a new browser tab vs same tab">
          <Toggle checked={openNewTab} onChange={setOpenNewTab}
            title="Toggle new tab behaviour for links" />
        </Row>
        <Row label="Search engine URL" tip="Base URL for the search bar — must end with ?q= or &q=">
          <input
            className="input"
            style={{ flex: 1, fontSize: '0.78em' }}
            defaultValue={localStorage.getItem('search_url') || 'https://www.google.com.au/search?q='}
            placeholder="https://www.google.com.au/search?q="
            onBlur={e => {
              localStorage.setItem('search_url', e.target.value)
              window.dispatchEvent(new Event('search_url_changed'))
            }}
            title="Change to use any search engine"
          />
        </Row>
      </SettingsSection>

      {/* ── Weather ── */}
      <SettingsSection title="Weather Location">
        <input className="input" placeholder="City name (display only)"
          value={weatherName} onChange={e => setWeatherName(e.target.value)}
          title="City name shown next to weather" />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input className="input" placeholder="Latitude e.g. -37.8136"
            value={weatherLat} onChange={e => setWeatherLat(e.target.value)}
            title="Latitude coordinate" />
          <input className="input" placeholder="Longitude e.g. 144.9631"
            value={weatherLon} onChange={e => setWeatherLon(e.target.value)}
            title="Longitude coordinate" />
        </div>
        <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>
          Find coordinates at{' '}
          <a href="https://latlong.net" target="_blank" rel="noreferrer"
            style={{ color: 'var(--accent)' }}>latlong.net</a>
        </div>
      </SettingsSection>

      {/* ── Import / Export ── */}
      <SettingsSection title="Import / Export">
        <ImportExport session={session} workspaceId={activeWs} onRefresh={() => {}} />
        <button className="btn" onClick={onExportAll}
          title="Download full backup of all workspaces, links, notes and settings"
          style={{ width: '100%' }}>
          ⬇ Export everything (full backup)
        </button>
      </SettingsSection>

      {/* ── Danger Zone ── */}
      <SettingsSection title="⚠ Danger Zone">
        <button className="btn btn-danger" onClick={resetTheme}
          title="Reset all theme colours and layout to defaults"
          style={{ width: '100%' }}>
          ↺ Reset theme to defaults
        </button>
        <button className="btn btn-danger" onClick={onResetLinks}
          title="Delete all sections and links in the current workspace"
          style={{ width: '100%' }}>
          ✕ Clear all links in this workspace
        </button>
      </SettingsSection>

      {/* Sticky footer */}
      <div className="settings-footer">
        <button className="btn btn-primary" onClick={handleClose} disabled={saving}
          style={{ flex: 1 }}
          title="Save settings and close">
          {saving ? 'Saving…' : '✓ Save & Close'}
        </button>
      </div>

    </div>
  )
}