import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

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
  bg:            '#0c0c0f',
  bg2:           '#13131a',
  bg3:           '#1a1a24',
  card:          '#13131a',
  cardOpacity:   1,
  borderOpacity: 1,
  border:        '#2a2a3a',
  borderHover:   '#3d3d55',
  text:          '#e8e8f0',
  textDim:       '#7878a0',
  accent:        '#6c8fff',
  danger:        '#ff6b6b',
  success:       '#6bffb8',
  btnBg:         '#6c8fff',
  btnText:       '#ffffff',
  font:          "'DM Mono', monospace",
  fontSize:      14,
  clockSize:     3.5,
  radius:        10,
  linkGap:       0.5,
  cardPadding:   1,
  sectionsCols:  2,
  pageScale:     1,
}

function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

function Row({ label, children }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      {children}
    </div>
  )
}

export default function Settings({ session, userSettings, onSettingsChange, onClose }) {
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
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const fileRef = useRef()

  // Load saved presets from Supabase
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('theme_presets')
        .select('*')
        .eq('user_id', session.user.id)
      if (data) {
        const map = {}
        const names = { ...slotNames }
        data.forEach(p => {
          map[p.slot]   = p.config
          names[p.slot] = p.name
        })
        setPresets(map)
        setSlotNames(names)
      }
    }
    load()
  }, [session])

  // Apply theme to CSS variables live as you drag
  useEffect(() => {
    const r = document.documentElement.style
    r.setProperty('--bg',             theme.bg)
    r.setProperty('--bg2',            theme.bg2)
    r.setProperty('--bg3',            theme.bg3)
    r.setProperty('--card',           theme.card)
    r.setProperty('--card-opacity',   theme.cardOpacity)
    r.setProperty('--border-opacity', theme.borderOpacity)
    r.setProperty('--border',         theme.border)
    r.setProperty('--border-hover',   theme.borderHover)
    r.setProperty('--text',           theme.text)
    r.setProperty('--text-dim',       theme.textDim)
    r.setProperty('--accent',         theme.accent)
    r.setProperty('--accent-dim',     theme.accent + '33')
    r.setProperty('--accent-glow',    theme.accent + '22')
    r.setProperty('--danger',         theme.danger)
    r.setProperty('--success',        theme.success)
    r.setProperty('--btn-bg',         theme.btnBg)
    r.setProperty('--btn-text',       theme.btnText)
    r.setProperty('--font',           theme.font)
    r.setProperty('--font-size',      theme.fontSize + 'px')
    r.setProperty('--clock-size',     theme.clockSize + 'rem')
    r.setProperty('--radius',         theme.radius + 'px')
    r.setProperty('--radius-sm',      Math.max(2, theme.radius - 4) + 'px')
    r.setProperty('--link-gap',       theme.linkGap + 'rem')
    r.setProperty('--card-padding',   theme.cardPadding + 'rem')
    r.setProperty('--sections-cols',  theme.sectionsCols)
    r.setProperty('--page-scale',     theme.pageScale)
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
      name:   slotNames[slot],
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
      onSettingsChange({ bgPreset: 'image', bgImage: b64 })
    }
    reader.readAsDataURL(file)
  }

  const clearBgImage = () => {
    localStorage.removeItem('bg_image')
    setBgImage(null)
    setBgPreset('noise')
    onSettingsChange({ bgPreset: 'noise', bgImage: null })
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
    }, { onConflict: 'user_id' })
    if (activeSlot) await saveSlot(activeSlot)
    onSettingsChange({ clockFormat, openNewTab, bgPreset, bgImage, weatherName, weatherLat, weatherLon })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-panel">

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 500 }}>Settings</span>
          <button className="icon-btn" onClick={onClose}>✕</button>
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
                title={presets[slot] ? `Load: ${slotNames[slot]}` : 'Empty — save current theme here'}
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
              <button className="btn btn-primary" onClick={() => saveSlot(activeSlot)}>
                Save to {activeSlot}
              </button>
            </div>
          )}
        </div>

        {/* ── Colors ── */}
        <div className="settings-section">
          <div className="settings-title">Colors</div>
          {[
            ['Background',    'bg'],
            ['Surface',       'bg2'],
            ['Input/Card BG', 'bg3'],
            ['Card color',    'card'],
            ['Border',        'border'],
            ['Border hover',  'borderHover'],
            ['Text',          'text'],
            ['Text dim',      'textDim'],
            ['Accent',        'accent'],
            ['Danger',        'danger'],
            ['Success',       'success'],
            ['Button BG',     'btnBg'],
            ['Button text',   'btnText'],
          ].map(([label, key]) => (
            <Row key={key} label={label}>
              <input type="color" className="color-input"
                value={theme[key]} onChange={e => set(key, e.target.value)} />
            </Row>
          ))}
        </div>

        {/* ── Transparency ── */}
        <div className="settings-section">
          <div className="settings-title">Transparency</div>
          <Row label={`Card opacity: ${Math.round(theme.cardOpacity * 100)}%`}>
            <input type="range" min="0.05" max="1" step="0.05"
              value={theme.cardOpacity}
              onChange={e => set('cardOpacity', parseFloat(e.target.value))}
              style={{ flex: 1 }} />
          </Row>
          <Row label={`Border opacity: ${Math.round(theme.borderOpacity * 100)}%`}>
            <input type="range" min="0" max="1" step="0.05"
              value={theme.borderOpacity}
              onChange={e => set('borderOpacity', parseFloat(e.target.value))}
              style={{ flex: 1 }} />
          </Row>
        </div>

        {/* ── Typography ── */}
        <div className="settings-section">
          <div className="settings-title">Typography</div>
          <Row label="Font family">
            <select className="input" style={{ width: 'auto' }}
              value={theme.font} onChange={e => set('font', e.target.value)}>
              {FONTS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </Row>
          <Row label={`Base size: ${theme.fontSize}px`}>
            <input type="range" min="11" max="20" step="1"
              value={theme.fontSize}
              onChange={e => set('fontSize', parseInt(e.target.value))}
              style={{ flex: 1 }} />
          </Row>
          <Row label={`Clock size: ${theme.clockSize}rem`}>
            <input type="range" min="1.5" max="8" step="0.25"
              value={theme.clockSize}
              onChange={e => set('clockSize', parseFloat(e.target.value))}
              style={{ flex: 1 }} />
          </Row>
        </div>

        {/* ── Layout ── */}
        <div className="settings-section">
          <div className="settings-title">Layout</div>
          <Row label={`Page scale: ${Math.round(theme.pageScale * 100)}%`}>
            <input type="range" min="0.5" max="1.5" step="0.05"
              value={theme.pageScale}
              onChange={e => set('pageScale', parseFloat(e.target.value))}
              style={{ flex: 1 }} />
          </Row>
          <Row label={`Section columns: ${theme.sectionsCols}`}>
            <input type="range" min="1" max="5" step="1"
              value={theme.sectionsCols}
              onChange={e => set('sectionsCols', parseInt(e.target.value))}
              style={{ flex: 1 }} />
          </Row>
          <Row label={`Card padding: ${theme.cardPadding}rem`}>
            <input type="range" min="0.25" max="2" step="0.25"
              value={theme.cardPadding}
              onChange={e => set('cardPadding', parseFloat(e.target.value))}
              style={{ flex: 1 }} />
          </Row>
          <Row label={`Link spacing: ${theme.linkGap}rem`}>
            <input type="range" min="0" max="1.5" step="0.1"
              value={theme.linkGap}
              onChange={e => set('linkGap', parseFloat(e.target.value))}
              style={{ flex: 1 }} />
          </Row>
          <Row label={`Border radius: ${theme.radius}px`}>
            <input type="range" min="0" max="24" step="1"
              value={theme.radius}
              onChange={e => set('radius', parseInt(e.target.value))}
              style={{ flex: 1 }} />
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
                style={{ flex: 'none', minWidth: '55px' }}>
                {p}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => fileRef.current.click()}>📁 Upload image</button>
            {bgImage && <button className="btn btn-danger" onClick={clearBgImage}>Remove image</button>}
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBgImage} />
          </div>
          {bgImage && (
            <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>
              ✓ Local image loaded (this device only)
            </div>
          )}
        </div>

        {/* ── Clock & Links ── */}
        <div className="settings-section">
          <div className="settings-title">Clock & Links</div>
          <Row label="Clock format">
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {['12h','24h'].map(f => (
                <button key={f}
                  className={`engine-tab${clockFormat === f ? ' active' : ''}`}
                  onClick={() => setClockFormat(f)}>
                  {f}
                </button>
              ))}
            </div>
          </Row>
          <Row label="Open links in new tab">
            <Toggle checked={openNewTab} onChange={setOpenNewTab} />
          </Row>
        </div>

        {/* ── Weather ── */}
        <div className="settings-section">
          <div className="settings-title">Weather Location</div>
          <input className="input" placeholder="City name"
            value={weatherName} onChange={e => setWeatherName(e.target.value)} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="input" placeholder="Latitude e.g. -37.8136"
              value={weatherLat} onChange={e => setWeatherLat(e.target.value)} />
            <input className="input" placeholder="Longitude e.g. 144.9631"
              value={weatherLon} onChange={e => setWeatherLon(e.target.value)} />
          </div>
          <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>
            Find lat/lon at{' '}
            <a href="https://latlong.net" target="_blank" rel="noreferrer"
              style={{ color: 'var(--accent)' }}>latlong.net</a>
          </div>
        </div>

        {/* ── Save ── */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', paddingBottom: '1rem' }}>
          <button className="btn btn-primary" onClick={saveAll} disabled={saving} style={{ flex: 1 }}>
            {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save all settings'}
          </button>
          <button className="btn" onClick={onClose}>Close</button>
        </div>

      </div>
    </>
  )
}