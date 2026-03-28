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
  bg:              '#0c0c0f',
  bg2:             '#13131a',
  bg3:             '#1a1a24',
  card:            '#13131a',
  cardOpacity:     1,
  borderOpacity:   1,
  border:          '#2a2a3a',
  borderHover:     '#3d3d55',
  text:            '#e8e8f0',
  textDim:         '#7878a0',
  accent:          '#6c8fff',
  danger:          '#ff6b6b',
  success:         '#6bffb8',
  btnBg:           '#6c8fff',
  btnText:         '#ffffff',
  font:            "'DM Mono', monospace",
  fontSize:        14,
  clockSize:       2.5,
  radius:          10,
  linkGap:         0.5,
  cardPadding:     1,
  sectionsCols:    2,
  pageScale:       1,
  faviconOpacity:  1,
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

export default function Settings({
  session, userSettings, onSettingsChange, onClose,
  onResetLinks, onExportAll, activeWs, workspaces,
}) {
  const [theme,       setTheme]       = useState(DEFAULT_THEME)
  const [activeSlot,  setActiveSlot]  = useState(null)
  const [slotNames,   setSlotNames]   = useState({ 1: 'Preset 1', 2: 'Preset 2', 3: 'Preset 3', 4: 'Preset 4' })
  const [presets,     setPresets]     = useState({})
  const [clockFormat, setClockFormat] = useState(userSettings?.clock_format    ?? '12h')
  const [openNewTab,  setOpenNewTab]  = useState(userSettings?.open_in_new_tab ?? true)
  const [bgPreset,    setBgPreset]    = useState(userSettings?.bg_preset       ?? 'noise')
  const [bgImage,     setBgImage]     = useState(localStorage.getItem('bg_image') ?? null)
  const [weatherName, setWeatherName] = useState(userSettings?.weather_name    ?? 'Melbourne')
  const [weatherLat,  setWeatherLat]  = useState(userSettings?.weather_lat     ?? -37.8136)
  const [weatherLon,  setWeatherLon]  = useState(userSettings?.weather_lon     ?? 144.9631)
  const [showNotes,   setShowNotes]   = useState(userSettings?.show_notes      ?? true)
  const [showPins,    setShowPins]    = useState(userSettings?.show_pins       ?? true)
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const fileRef = useRef()

  // ESC to close
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Load saved presets
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

  // Live-apply theme changes
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--bg',               theme.bg)
    r.setProperty('--bg2',              theme.bg2)
    r.setProperty('--bg3',              theme.bg3)
    r.setProperty('--card',             theme.card)
    r.setProperty('--card-opacity',     theme.cardOpacity)
    r.setProperty('--border-opacity',   theme.borderOpacity)
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
      user_id: session.user.id,
      slot,
      name: slotNames[slot],
      config: theme,
    }, { onConflict: 'user_id,slot' })
    setPresets(p => ({ ...p, [slot]: theme }))
  }

  const handleBgImage = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const b64 = ev.target.result
      localStorage.setItem('bg_image', b64)
      setBgImage(b64)
      setBgPreset('image')
      onSettingsChange({ bgPreset: 'image' })
    }
    reader.readAsDataURL(file)
  }

  const clearBgImage = () => {
    localStorage.removeItem('bg_image')
    setBgImage(null)
    setBgPreset('noise')
    onSettingsChange({ bgPreset: 'noise' })
  }

  const resetSettings = () => {
    if (!confirm('⚠ Reset ALL theme settings back to defaults? Your presets will not be affected.')) return
    setTheme(DEFAULT_THEME)
  }

  const saveAll = async () => {
    setSaving(true)
    await supabase.from('user_settings').upsert({
      user_id:         session.user.id,
      clock_format:    clockFormat,
      open_in_new_tab: openNewTab,
      bg_preset:       bgPreset,
      weather_name:    weatherName,
      weather_lat:     parseFloat(weatherLat),
      weather_lon:     parseFloat(weatherLon),
      show_notes:      showNotes,
      show_pins:       showPins,
    }, { onConflict: 'user_id' })
    if (activeSlot) await saveSlot(activeSlot)
    onSettingsChange({ clockFormat, openNewTab, bgPreset, weatherName, weatherLat, weatherLon, show_notes: showNotes, show_pins: showPins })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="settings-panel">

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 500 }}>Settings</span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7em', color: 'var(--text-muted)' }}>ESC to close</span>
          <button className="icon-btn" onClick={onClose} title="Close settings">✕</button>
        </div>
      </div>

      {/* ── Theme Presets ── */}
      <div className="settings-section">
        <div className="settings-title">Theme Presets</div>
        <div className="preset-slots">
          {[1,2,3,4].map(slot => (
            <button
              key={slot}
              className={`preset-slot${activeSlot === slot ? ' active' : ''}`}
              onClick={() => loadSlot(slot)}
              title={presets[slot] ? `Load preset: ${slotNames[slot]}` : `Empty slot ${slot} — save current theme here`}
            >
              {slotNames[slot]}
            </button>
          ))}
        </div>
        {activeSlot && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              className="input"
              value={slotNames[activeSlot]}
              onChange={e => setSlotNames(n => ({ ...n, [activeSlot]: e.target.value }))}
              placeholder="Preset name"
              style={{ flex: 1 }}
            />
            <button
              className="btn btn-primary"
              onClick={() => saveSlot(activeSlot)}
              title={`Save current theme to slot ${activeSlot}`}
            >
              Save to {activeSlot}
            </button>
          </div>
        )}
      </div>

      {/* ── Colors ── */}
      <div className="settings-section">
        <div className="settings-title">Colors</div>
        {[
          ['Background',    'bg',          'Main page background color'],
          ['Surface',       'bg2',         'Panel and overlay background'],
          ['Input/Card BG', 'bg3',         'Input fields and hover backgrounds'],
          ['Card color',    'card',        'Section card background color'],
          ['Border',        'border',      'Default border color'],
          ['Border hover',  'borderHover', 'Border color on hover'],
          ['Text',          'text',        'Primary text color'],
          ['Text dim',      'textDim',     'Secondary/label text color'],
          ['Accent',        'accent',      'Highlight and active color'],
          ['Danger',        'danger',      'Delete and warning color'],
          ['Success',       'success',     'Success message color'],
          ['Button BG',     'btnBg',       'Primary button background'],
          ['Button text',   'btnText',     'Primary button text color'],
        ].map(([label, key, tip]) => (
          <Row key={key} label={label} tip={tip}>
            <input type="color" className="color-input"
              value={theme[key]}
              onChange={e => set(key, e.target.value)}
              title={tip}
            />
          </Row>
        ))}
      </div>

      {/* ── Transparency ── */}
      <div className="settings-section">
        <div className="settings-title">Transparency</div>
        <Row label={`Card opacity: ${Math.round(theme.cardOpacity * 100)}%`} tip="How opaque section cards are (lower = see background through)">
          <input type="range" min="0.05" max="1" step="0.05"
            value={theme.cardOpacity}
            onChange={e => set('cardOpacity', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Border opacity: ${Math.round(theme.borderOpacity * 100)}%`} tip="How visible borders and dividers are (0% = invisible borders)">
          <input type="range" min="0" max="1" step="0.05"
            value={theme.borderOpacity}
            onChange={e => set('borderOpacity', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
      </div>

      {/* ── Typography ── */}
      <div className="settings-section">
        <div className="settings-title">Typography</div>
        <Row label="Font family" tip="Font used for all text on the page">
          <select className="input" style={{ width: 'auto' }}
            value={theme.font} onChange={e => set('font', e.target.value)}>
            {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </Row>
        <Row label={`Base size: ${theme.fontSize}px`} tip="Base font size for all text">
          <input type="range" min="11" max="20" step="1"
            value={theme.fontSize}
            onChange={e => set('fontSize', parseInt(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Clock size: ${theme.clockSize}rem`} tip="Size of the clock display in the side panel">
          <input type="range" min="1" max="6" step="0.25"
            value={theme.clockSize}
            onChange={e => set('clockSize', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
      </div>

      {/* ── Layout ── */}
      <div className="settings-section">
        <div className="settings-title">Layout</div>
        <Row label={`Page scale: ${Math.round(theme.pageScale * 100)}%`} tip="Scale the entire page up or down — useful for different screen sizes">
          <input type="range" min="0.5" max="1.5" step="0.05"
            value={theme.pageScale}
            onChange={e => set('pageScale', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Section columns: ${theme.sectionsCols}`} tip="How many columns sections are arranged in">
          <input type="range" min="1" max="5" step="1"
            value={theme.sectionsCols}
            onChange={e => set('sectionsCols', parseInt(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Card padding: ${theme.cardPadding}rem`} tip="Spacing inside section cards">
          <input type="range" min="0.25" max="2" step="0.25"
            value={theme.cardPadding}
            onChange={e => set('cardPadding', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Link spacing: ${theme.linkGap}rem`} tip="Vertical gap between links in a section">
          <input type="range" min="0" max="1.5" step="0.05"
            value={theme.linkGap}
            onChange={e => set('linkGap', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label={`Border radius: ${theme.radius}px`} tip="How rounded corners are">
          <input type="range" min="0" max="24" step="1"
            value={theme.radius}
            onChange={e => set('radius', parseInt(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
      </div>

      {/* ── Favicons ── */}
      <div className="settings-section">
        <div className="settings-title">Link Icons (Favicons)</div>
        <Row label={`Opacity: ${Math.round(theme.faviconOpacity * 100)}%`} tip="How visible the website icons next to links are">
          <input type="range" min="0" max="1" step="0.05"
            value={theme.faviconOpacity}
            onChange={e => set('faviconOpacity', parseFloat(e.target.value))}
            style={{ flex: 1 }} />
        </Row>
        <Row label="Greyscale icons" tip="Turn all website icons black and white">
          <Toggle
            checked={theme.faviconGreyscale}
            onChange={v => set('faviconGreyscale', v)}
            title="Make all favicons black and white"
          />
        </Row>
      </div>

      {/* ── Background ── */}
      <div className="settings-section">
        <div className="settings-title">Background</div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {BG_PRESETS.map(p => (
            <button key={p}
              className={`preset-slot${bgPreset === p ? ' active' : ''}`}
              onClick={() => { setBgPreset(p); onSettingsChange({ bgPreset: p }) }}
              style={{ flex: 'none', minWidth: '55px' }}
              title={`Set background to ${p} pattern`}>
              {p}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn" onClick={() => fileRef.current.click()} title="Upload a local image as background">
            📁 Upload image
          </button>
          {bgImage && (
            <button className="btn btn-danger" onClick={clearBgImage} title="Remove background image and revert to preset">
              Remove image
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgImage} />
        </div>
        {bgImage && (
          <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>
            ✓ Local image saved on this device only
          </div>
        )}
      </div>

      {/* ── Clock & Search ── */}
      <div className="settings-section">
        <div className="settings-title">Clock & Links</div>
        <Row label="Clock format" tip="12-hour (1:30 pm) or 24-hour (13:30)">
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {['12h','24h'].map(f => (
              <button key={f}
                className={`engine-tab${clockFormat === f ? ' active' : ''}`}
                onClick={() => setClockFormat(f)}
                title={f === '12h' ? '12-hour format (1:30 pm)' : '24-hour format (13:30)'}>
                {f}
              </button>
            ))}
          </div>
        </Row>
        <Row label="Open links in new tab" tip="When on, clicking a link opens it in a new browser tab">
          <Toggle checked={openNewTab} onChange={setOpenNewTab} title="Open links in new tab" />
        </Row>
      </div>

      {/* ── UI Options ── */}
      <div className="settings-section">
        <div className="settings-title">UI Options</div>
        <Row label="Show notes panel" tip="Show the notes column on the right side. Hide it to get more space for link columns.">
          <Toggle checked={showNotes} onChange={setShowNotes} title="Show or hide the notes panel" />
        </Row>
        <Row label="Show pin buttons on sections" tip="Show the pin icon on sections, which keeps them at the top">
          <Toggle checked={showPins} onChange={setShowPins} title="Show pin buttons on section headers" />
        </Row>
      </div>

      {/* ── Weather ── */}
      <div className="settings-section">
        <div className="settings-title">Weather Location</div>
        <input className="input" placeholder="City name (display only)"
          value={weatherName} onChange={e => setWeatherName(e.target.value)}
          title="The city name shown next to the weather" />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input className="input" placeholder="Latitude e.g. -37.8136"
            value={weatherLat} onChange={e => setWeatherLat(e.target.value)}
            title="Latitude coordinate for weather data" />
          <input className="input" placeholder="Longitude e.g. 144.9631"
            value={weatherLon} onChange={e => setWeatherLon(e.target.value)}
            title="Longitude coordinate for weather data" />
        </div>
        <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>
          Find lat/lon at{' '}
          <a href="https://latlong.net" target="_blank" rel="noreferrer"
            style={{ color: 'var(--accent)' }}>latlong.net</a>
        </div>
      </div>

      {/* ── Import / Export ── */}
      <div className="settings-section">
        <div className="settings-title">Import / Export</div>
        <ImportExport session={session} workspaceId={activeWs} onRefresh={() => {}} />
        <button
          className="btn"
          onClick={onExportAll}
          title="Download a full backup of all workspaces, links, notes, and theme presets"
          style={{ width: '100%' }}
        >
          ⬇ Export everything (full backup)
        </button>
      </div>

      {/* ── Danger zone ── */}
      <div className="settings-section">
        <div className="settings-title" style={{ color: 'var(--danger)' }}>Danger Zone</div>
        <button
          className="btn btn-danger"
          onClick={resetSettings}
          title="Reset all colours, fonts and layout back to defaults"
          style={{ width: '100%' }}
        >
          ↺ Reset theme to defaults
        </button>
        <button
          className="btn btn-danger"
          onClick={onResetLinks}
          title="Delete all sections and links in the current workspace"
          style={{ width: '100%' }}
        >
          ✕ Clear all links in this workspace
        </button>
      </div>

      {/* ── Save ── */}
      <div style={{ display: 'flex', gap: '0.75rem', paddingBottom: '1rem' }}>
        <button
          className="btn btn-primary"
          onClick={saveAll}
          disabled={saving}
          style={{ flex: 1 }}
          title="Save all settings to your account"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save all settings'}
        </button>
        <button className="btn" onClick={onClose} title="Close settings panel">Close</button>
      </div>

    </div>
  )
}