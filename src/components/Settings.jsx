import { useState, useRef } from 'react'
import ImportExport from './ImportExport'

const FONTS = [
  { label: 'DM Mono',       value: 'DM Mono' },
  { label: 'JetBrains Mono',value: 'JetBrains Mono' },
  { label: 'Geist',         value: 'Geist' },
  { label: 'Inter',         value: 'Inter' },
  { label: 'IBM Plex Sans', value: 'IBM Plex Sans' },
  { label: 'Outfit',        value: 'Outfit' },
  { label: 'Space Grotesk', value: 'Space Grotesk' },
  { label: 'Figtree',       value: 'Figtree' },
]

const BG_OPTIONS = [
  { value: 'bg-solid',      label: 'Solid' },
  { value: 'bg-noise',      label: 'Noise' },
  { value: 'bg-dots',       label: 'Dots' },
  { value: 'bg-grid',       label: 'Grid' },
  { value: 'bg-lines',      label: 'Lines' },
  { value: 'bg-crosshatch', label: 'Crosshatch' },
  { value: 'bg-carbon',     label: 'Carbon' },
  { value: 'bg-topo',       label: 'Topo' },
  { value: 'bg-hex',        label: 'Hex' },
  { value: 'bg-circuit',    label: 'Circuit' },
  { value: 'bg-gradient',   label: 'Gradient' },
  { value: 'bg-mesh',       label: 'Blobs' },
  { value: 'bg-aurora',     label: 'Aurora' },
  { value: 'bg-stars',      label: 'Stars' },
  { value: 'bg-nebula',     label: 'Nebula' },
  { value: 'bg-starfield',  label: 'Starfield' },
  { value: 'bg-plasma',     label: 'Plasma' },
  { value: 'bg-fog',        label: 'Fog' },
  { value: 'bg-scan',       label: 'Scan' },
  { value: 'bg-vortex',     label: 'Vortex' },
  { value: 'bg-ripple',     label: 'Ripple' },
  { value: 'bg-filament',   label: 'Filament' },
  { value: 'bg-breath',     label: 'Breath' },
  { value: 'bg-shimmer',    label: 'Shimmer' },
  { value: 'bg-oil',        label: 'Oil' },
  { value: 'bg-image',      label: 'Image' },
]

const FAVICON_FILTERS = [
  { label: 'None',      value: 'none' },
  { label: 'Greyscale', value: 'grayscale(1)' },
  { label: 'Dim',       value: 'brightness(0.6)' },
  { label: 'Invert',    value: 'invert(1)' },
]

function Toggle({ checked, onChange, title }) {
  return (
    <label className="toggle" title={title}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

function Row({ label, children }) {
  return (
    <div className="settings-row">
      <span className="settings-label">{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>{children}</div>
    </div>
  )
}

function Sl({ label, min, max, step = 1, value, onChange, unit = '' }) {
  return (
    <Row label={label}>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))} />
      <span style={{ fontSize: '0.78em', color: 'var(--text-dim)', minWidth: 32, textAlign: 'right' }}>
        {value}{unit}
      </span>
    </Row>
  )
}

function ColPicker({ label, themeKey, t, set }) {
  return (
    <Row label={label}>
      <input type="color" className="color-input" value={'#' + (t[themeKey] || '000000')}
        onChange={e => set({ [themeKey]: e.target.value.replace('#', '') })} />
      <span style={{ fontSize: '0.72em', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
        #{t[themeKey]}
      </span>
    </Row>
  )
}

export default function Settings({
  workspaces = [], activeWs, onWorkspaceChange, onCreateWorkspace, onDeleteWorkspace,
  theme, setTheme, onClose, userId, onSignOut, side,
}) {
  const [newWsName, setNewWsName] = useState('')
  const [addingWs, setAddingWs] = useState(false)
  const [presets, setPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('theme-presets') || 'null') || [null, null, null, null] }
    catch { return [null, null, null, null] }
  })
  const imgRef = useRef(null)

  const set = (patch) => setTheme(prev => ({ ...prev, ...patch }))

  const t = theme

  const savePreset = (i) => {
    const next = [...presets]; next[i] = { ...t }
    setPresets(next)
    try { localStorage.setItem('theme-presets', JSON.stringify(next)) } catch {}
  }
  const loadPreset = (i) => { if (presets[i]) setTheme({ ...presets[i] }) }

  const isPatternBg = ['bg-dots','bg-grid','bg-lines','bg-crosshatch','bg-carbon','bg-topo','bg-hex','bg-circuit'].includes(t.bgStyle)
  const isGradientBg = t.bgStyle === 'bg-gradient'
  const isImageBg = t.bgStyle === 'bg-image'

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => set({ bgImage: ev.target.result })
    reader.readAsDataURL(file)
  }

  return (
    <>
      <div className="settings-veil" />
      <div className="settings-panel" data-side={side}>
        {/* ── Header ── */}
        <div className="settings-header">
          <span style={{ fontWeight: 600, fontSize: '0.9em' }}>Settings</span>
          <button className="icon-btn" onClick={onClose} title="Close">✕</button>
        </div>

        {/* ══════════════════════════════
            1. WORKSPACES
        ══════════════════════════════ */}
        <div className="settings-section">
          <div className="settings-title">Workspaces</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
            {workspaces.map(ws => (
              <div key={ws.id} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <button
                  onClick={() => onWorkspaceChange(ws.id)}
                  style={{
                    padding: '0.28rem 0.65rem', borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${ws.id === activeWs ? 'var(--accent)' : 'var(--border)'}`,
                    background: ws.id === activeWs ? 'var(--accent-dim)' : 'transparent',
                    color: ws.id === activeWs ? 'var(--accent)' : 'var(--text-dim)',
                    fontSize: '0.8em', cursor: 'pointer', fontFamily: 'var(--font)',
                  }}>
                  {ws.name}
                </button>
                {workspaces.length > 1 && (
                  <button onClick={() => onDeleteWorkspace(ws.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75em', padding: '0 0.2rem' }}
                    title="Delete workspace">✕</button>
                )}
              </div>
            ))}
          </div>
          {addingWs ? (
            <form onSubmit={e => { e.preventDefault(); if (newWsName.trim()) { onCreateWorkspace(newWsName.trim()); setNewWsName(''); setAddingWs(false) } }}
              style={{ display: 'flex', gap: '0.4rem' }}>
              <input className="input" value={newWsName} onChange={e => setNewWsName(e.target.value)}
                placeholder="Workspace name" autoFocus style={{ flex: 1, fontSize: '0.82em' }} />
              <button className="btn btn-primary" type="submit" style={{ fontSize: '0.78em' }}>Add</button>
              <button className="btn" type="button" style={{ fontSize: '0.78em' }} onClick={() => setAddingWs(false)}>✕</button>
            </form>
          ) : (
            <button className="btn" style={{ alignSelf: 'flex-start', fontSize: '0.78em' }}
              onClick={() => setAddingWs(true)}>+ New workspace</button>
          )}
        </div>

        {/* ══════════════════════════════
            2. BACKGROUND
        ══════════════════════════════ */}
        <div className="settings-section">
          <div className="settings-title">Background</div>

          {/* Style picker grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.3rem' }}>
            {BG_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => set({ bgStyle: opt.value })}
                style={{
                  padding: '0.28rem 0.2rem', fontSize: '0.72em', borderRadius: 'var(--radius-sm)',
                  border: `1px solid ${t.bgStyle === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: t.bgStyle === opt.value ? 'var(--accent-dim)' : 'transparent',
                  color: t.bgStyle === opt.value ? 'var(--accent)' : 'var(--text-dim)',
                  cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.12s',
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          {/* Pattern options */}
          {isPatternBg && <>
            <ColPicker label="Pattern colour" themeKey="patternColor" t={t} set={set} />
            <Sl label="Pattern opacity" min={0.1} max={1} step={0.05} value={t.patternOpacity ?? 1} onChange={v => set({ patternOpacity: v })} />
          </>}

          {/* Gradient options */}
          {isGradientBg && <>
            <Row label="Direction">
              <select value={t.gradientAngle ?? 135}
                onChange={e => set({ gradientAngle: Number(e.target.value) })}
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.8em', padding: '0.2rem 0.4rem' }}>
                {[[0,'↑'],[45,'↗'],[90,'→'],[135,'↘'],[180,'↓'],[225,'↙'],[270,'←'],[315,'↖']].map(([v,l]) =>
                  <option key={v} value={v}>{l} {v}°</option>
                )}
              </select>
            </Row>
            <Row label="Colours">
              <input value={t.gradientColors ?? ''} onChange={e => set({ gradientColors: e.target.value })}
                placeholder="hex,hex,hex" style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.78em', padding: '0.22rem 0.5rem', width: 160, fontFamily: 'monospace' }} />
            </Row>
          </>}

          {/* Image options */}
          {isImageBg && <>
            <Row label="Image">
              <button className="btn" style={{ fontSize: '0.78em' }} onClick={() => imgRef.current?.click()}>
                {t.bgImage ? 'Change image' : 'Upload image'}
              </button>
              <input ref={imgRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
            </Row>
            <Sl label="Opacity" min={0.1} max={1} step={0.05} value={t.bgImageOpacity ?? 1} onChange={v => set({ bgImageOpacity: v })} />
          </>}
        </div>

        {/* ══════════════════════════════
            3. COLOURS
        ══════════════════════════════ */}
        <div className="settings-section">
          <div className="settings-title">Colours</div>
          <ColPicker label="Background"    themeKey="bg"       t={t} set={set} />
          <ColPicker label="Card / surface" themeKey="card"    t={t} set={set} />
          <Sl label="Card opacity" min={0} max={1} step={0.05} value={t.cardOpacity ?? 1} onChange={v => set({ cardOpacity: v })} />
          <ColPicker label="Border"        themeKey="border"   t={t} set={set} />
          <Sl label="Border opacity" min={0} max={1} step={0.05} value={t.borderOpacity ?? 1} onChange={v => set({ borderOpacity: v })} />
          <ColPicker label="Accent"        themeKey="accent"   t={t} set={set} />
          <ColPicker label="Text"          themeKey="text"     t={t} set={set} />
          <ColPicker label="Text dim"      themeKey="textDim"  t={t} set={set} />
          <ColPicker label="Section titles" themeKey="titleColor" t={t} set={set} />
          <ColPicker label="Button"        themeKey="btnBg"    t={t} set={set} />
          <ColPicker label="Notes surface" themeKey="notesBg"  t={t} set={set} />
        </div>

        {/* ══════════════════════════════
            4. TYPOGRAPHY
        ══════════════════════════════ */}
        <div className="settings-section">
          <div className="settings-title">Typography</div>
          <Row label="Font">
            <select value={t.font ?? 'DM Mono'}
              onChange={e => set({ font: e.target.value })}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.8em', padding: '0.2rem 0.5rem', fontFamily: `'${e => e}', monospace` }}>
              {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Row>
          <Sl label="Body size"     min={10} max={20} value={t.workspaceFontSize ?? 14} onChange={v => set({ workspaceFontSize: v })} unit="px" />
          <Sl label="Topbar size"   min={10} max={16} value={t.topbarFontSize ?? 12}    onChange={v => set({ topbarFontSize: v })}    unit="px" />
          <Sl label="Settings size" min={10} max={16} value={t.settingsFontSize ?? 13}  onChange={v => set({ settingsFontSize: v })}  unit="px" />
          <Sl label="Notes size"    min={10} max={18} value={t.notesFontSize ?? 13}     onChange={v => set({ notesFontSize: v })}     unit="px" />
          <Sl label="Clock scale"   min={0.6} max={2.5} step={0.05} value={t.clockWidgetScale ?? 1} onChange={v => set({ clockWidgetScale: v })} unit="×" />
        </div>

        {/* ══════════════════════════════
            5. SPACING & LAYOUT
        ══════════════════════════════ */}
        <div className="settings-section">
          <div className="settings-title">Spacing & Layout</div>
          <Sl label="Columns"         min={1} max={6}   value={t.sectionsCols ?? 2}     onChange={v => set({ sectionsCols: v })} />
          <Sl label="Column gap"      min={0} max={32}  value={t.sectionGapH ?? 0}      onChange={v => set({ sectionGapH: v })}  unit="px" />
          <Sl label="Section gap"     min={0} max={24}  value={t.sectionGap ?? 0}       onChange={v => set({ sectionGap: v })}   unit="px" />
          <Sl label="Card padding"    min={0.25} max={2} step={0.05} value={t.cardPadding ?? 0.75} onChange={v => set({ cardPadding: v })} unit="rem" />
          <Sl label="Link gap"        min={0} max={1.5} step={0.05} value={t.linkGap ?? 0.5}       onChange={v => set({ linkGap: v })}    unit="rem" />
          <Sl label="Top gap"         min={0} max={48}  value={t.mainGapTop ?? 12}       onChange={v => set({ mainGapTop: v })}  unit="px" />
          <Sl label="Notes width"     min={180} max={480} value={t.notesWidth ?? 240}   onChange={v => set({ notesWidth: v })}  unit="px" />
        </div>

        {/* ══════════════════════════════
            6. SHAPE & SCALE
        ══════════════════════════════ */}
        <div className="settings-section">
          <div className="settings-title">Shape & Scale</div>
          <Sl label="Card radius"    min={0} max={20} value={t.radius ?? 10}          onChange={v => set({ radius: v })}          unit="px" />
          <Sl label="Button radius"  min={0} max={16} value={t.radiusSm ?? 6}         onChange={v => set({ radiusSm: v })}        unit="px" />
          <Sl label="Section radius" min={0} max={16} value={t.sectionRadius ?? 0}    onChange={v => set({ sectionRadius: v })}   unit="px" />
          <Sl label="Page scale"     min={0.5} max={1.5} step={0.02} value={t.pageScale ?? 1} onChange={v => set({ pageScale: v })} unit="×" />
          <Sl label="Handle opacity" min={0} max={1} step={0.05} value={t.handleOpacity ?? 0.15} onChange={v => set({ handleOpacity: v })} />
        </div>

        {/* ══════════════════════════════
            7. FAVICONS
        ══════════════════════════════ */}
        <div className="settings-section">
          <div className="settings-title">Favicons</div>
          <Sl label="Size"    min={10} max={24} value={t.faviconSize ?? 13}     onChange={v => set({ faviconSize: v })}    unit="px" />
          <Sl label="Opacity" min={0.1} max={1} step={0.05} value={t.faviconOpacity ?? 1} onChange={v => set({ faviconOpacity: v })} />
          <Row label="Filter">
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
              {FAVICON_FILTERS.map(f => (
                <button key={f.value} onClick={() => set({ faviconFilter: f.value })}
                  style={{
                    padding: '0.2rem 0.5rem', fontSize: '0.75em', borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${t.faviconFilter === f.value ? 'var(--accent)' : 'var(--border)'}`,
                    background: t.faviconFilter === f.value ? 'var(--accent-dim)' : 'transparent',
                    color: t.faviconFilter === f.value ? 'var(--accent)' : 'var(--text-dim)',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </Row>
        </div>

        {/* ══════════════════════════════
            8. BEHAVIOUR
        ══════════════════════════════ */}
        <div className="settings-section">
          <div className="settings-title">Behaviour</div>
          <Row label="Open links in new tab">
            <Toggle checked={t.openInNewTab ?? true} onChange={v => set({ openInNewTab: v })} />
          </Row>
          <Row label="Lock layout">
            <Toggle checked={t.locked ?? false} onChange={v => set({ locked: v })} />
          </Row>
          <Row label="Search URL">
            <input value={t.searchUrl ?? 'https://google.com/search?q='}
              onChange={e => set({ searchUrl: e.target.value })}
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', fontSize: '0.75em', padding: '0.22rem 0.5rem', width: 170, fontFamily: 'monospace' }} />
          </Row>
          <Row label="Settings side">
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {['right','left'].map(s => (
                <button key={s} onClick={() => set({ settingsSide: s })}
                  style={{
                    padding: '0.2rem 0.55rem', fontSize: '0.75em', borderRadius: 'var(--radius-sm)',
                    border: `1px solid ${(t.settingsSide ?? 'right') === s ? 'var(--accent)' : 'var(--border)'}`,
                    background: (t.settingsSide ?? 'right') === s ? 'var(--accent-dim)' : 'transparent',
                    color: (t.settingsSide ?? 'right') === s ? 'var(--accent)' : 'var(--text-dim)',
                    cursor: 'pointer', fontFamily: 'var(--font)',
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </Row>
        </div>

        {/* ══════════════════════════════
            9. THEME PRESETS
        ══════════════════════════════ */}
        <div className="settings-section">
          <div className="settings-title">Theme Presets</div>
          <div style={{ fontSize: '0.75em', color: 'var(--text-muted)' }}>
            Click to load · right-click to save current theme
          </div>
          <div className="preset-slots">
            {presets.map((p, i) => (
              <button key={i}
                className={`preset-slot${p ? '' : ''}`}
                onClick={() => loadPreset(i)}
                onContextMenu={e => { e.preventDefault(); savePreset(i) }}
                title={p ? `Load preset ${i + 1} (right-click to overwrite)` : `Right-click to save current theme as preset ${i + 1}`}
                style={{
                  background: p ? `#${p.bg}` : 'var(--bg3)',
                  borderColor: p ? `#${p.accent}` : 'var(--border)',
                  color: p ? `#${p.text}` : 'var(--text-muted)',
                }}>
                {p ? <span style={{ fontSize: '0.85em', fontWeight: 600 }}>{i + 1}</span> : <span style={{ opacity: 0.4 }}>{i + 1}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* ══════════════════════════════
            10. DATA
        ══════════════════════════════ */}
        <div className="settings-section">
          <div className="settings-title">Data</div>
          <ImportExport userId={userId} />
          <button className="btn btn-danger" style={{ fontSize: '0.8em', marginTop: '0.25rem' }}
            onClick={() => { if (confirm('Reset all settings to defaults?')) setTheme({}) }}>
            Reset to defaults
          </button>
        </div>

      </div>

      {/* ── Footer ── */}
      <div className="settings-footer" data-side={side}>
        <button className="btn btn-ghost" style={{ fontSize: '0.82em' }} onClick={onSignOut}>Sign out</button>
      </div>
    </>
  )
}