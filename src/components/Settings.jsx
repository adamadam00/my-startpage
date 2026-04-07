import { useState, useRef, useEffect } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FONTS = [
  { label: 'DM Mono',        value: "'DM Mono', monospace"        },
  { label: 'JetBrains Mono', value: "'JetBrains Mono', monospace" },
  { label: 'IBM Plex Mono',  value: "'IBM Plex Mono', monospace"  },
  { label: 'Inter',          value: 'Inter, system-ui, sans-serif'},
  { label: 'Geist',          value: 'Geist, system-ui, sans-serif'},
  { label: 'IBM Plex Sans',  value: "'IBM Plex Sans', sans-serif" },
  { label: 'Outfit',         value: 'Outfit, sans-serif'          },
  { label: 'Space Grotesk',  value: "'Space Grotesk', sans-serif" },
  { label: 'Figtree',        value: 'Figtree, sans-serif'         },
]

const BG_PRESETS = [
  { label: 'Noise',        value: 'noise'         },
  { label: 'Solid',        value: 'solid'         },
  { label: 'Dots',         value: 'dots'          },
  { label: '* Gradient',   value: 'gradient'      },
  { label: '* Mesh',       value: 'mesh'          },
  { label: '* Aurora',     value: 'aurora'        },
  { label: '* Nebula',     value: 'nebula'        },
  { label: '* Starfield',  value: 'starfield'     },
  { label: '* Fog',        value: 'fog'           },
  { label: '* Scan',       value: 'scan'          },
  { label: '* Vortex',     value: 'vortex'        },
  { label: '* Plasma',     value: 'plasma'        },
  { label: '* Inferno',    value: 'inferno'       },
  { label: '* Forest',     value: 'mint'          },
  { label: '* Dusk',       value: 'dusk'          },
  { label: '* Mono',       value: 'mono'          },
  { label: '* Drift',      value: 'drift'         },
  { label: '* Pulse',      value: 'pulse'         },
  { label: '* Tide',       value: 'tide'          },
  { label: 'Silver',       value: 'silver-radial' },
  { label: 'Wall',         value: 'wall-texture'  },
]

const ANIMATED_PRESETS = [
  'aurora','gradient','mesh','nebula',
  'starfield','fog','scan','vortex',
  'plasma','inferno','mint','dusk','mono',
  'drift','pulse','tide',
]
const PLASMA_PRESETS = ['plasma','inferno','mint','dusk','mono']

const PAGE_SCALES = [0.75, 0.85, 0.9, 1, 1.1, 1.15, 1.25]

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/** Label on left, control on right — tight layout */
function Row({ label, children, dimLabel = false }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '1.5rem',
      padding: '0.28rem 0',
      minHeight: '1.8rem',
    }}>
      <span style={{
        fontSize: '0.82em',
        color: dimLabel ? 'var(--text-muted)' : 'var(--text-dim)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
      }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

/** Compact slider with value readout */
function Slider({ val, min, max, step = 1, onChange, unit = '', label = '' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <input
        type="range" min={min} max={max} step={step} value={val}
        title={label || undefined}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: 80 }}
      />
      <span style={{ fontSize: '0.72em', color: 'var(--text-dim)', minWidth: '2.8em', textAlign: 'right' }}>
        {val}{unit}
      </span>
    </div>
  )
}

/** Colour swatch picker */
function ColorPick({ value, onChange, label = '' }) {
  const safe = (value || '#000000').replace(/[^#0-9a-fA-F]/g, '').slice(0, 7)
  const hex  = safe.length === 7 ? safe : '#000000'
  return (
    <input type="color" className="color-input" title={label || undefined} value={hex} onChange={e => onChange(e.target.value)} />
  )
}

/** On/off toggle */
function Toggle({ checked, onChange, label = '' }) {
  return (
    <label className="toggle" title={label || undefined}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

/** Sub-heading inside a group — centred + bold */
function SectionTitle({ children }) {
  return (
    <div className="settings-title" style={{
      textAlign: 'center',
      fontWeight: 700,
      marginTop: '0.3rem',
      color: 'var(--settings-title-color, #7878a0)',
    }}>
      {children}
    </div>
  )
}

/**
 * Collapsible group.
 * Pass `signal={{ open: bool, t: Date.now() }}` to bulk-open/close from the header.
 */
function Group({ title, children, defaultOpen = true, signal }) {
  const [open, setOpen] = useState(defaultOpen)
  const lastSignal = useRef(null)

  useEffect(() => {
    if (!signal || signal === lastSignal.current) return
    setOpen(signal.open)
    lastSignal.current = signal
  }, [signal])

  return (
    <div className="settings-section">
      <div
        className="settings-title"
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 700,
          textAlign: 'center',
          color: 'var(--settings-title-color, #7878a0)',
        }}
        onClick={() => setOpen(v => !v)}
      >
        <span style={{ flex: 1, textAlign: 'center' }}>{title}</span>
        <span style={{ fontSize: '0.75em', opacity: 0.45, marginLeft: '0.4rem' }}>
          {open ? '▲' : '▼'}
        </span>
      </div>
      {open && <div style={{ marginTop: '0.4rem' }}>{children}</div>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PANEL
// ─────────────────────────────────────────────────────────────────────────────

export default function Settings({
  theme, setTheme, onSave, onClose,
  onImageUpload, onBgImageUpload,
  onExportBackup, onExportCSV, onImportBackup,
  onResetWorkspaceLinks, onResetTheme,
  fileRef, backupFileRef, importingBackup,
  workspaces, activeWs,
  onAddWorkspace, onRenameWorkspace, onDeleteWorkspace, onSetActiveWs,
  onSignOut, userEmail,
  bmFolders, bookmarkCount,
}) {
  const [newWsName, setNewWsName]   = useState('')
  const [hiddenFolders, setHiddenFolders] = useState(() => {
    try { return JSON.parse(localStorage.getItem('sp_bm_hidden') || '[]') } catch { return [] }
  })
  const toggleFolder = (id) => {
    setHiddenFolders(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
      localStorage.setItem('sp_bm_hidden', JSON.stringify(next))
      return next
    })
  }
  const forceSync = () => window.dispatchEvent(new CustomEvent('sp_force_sync'))
  const [groupSignal, setGroupSignal] = useState(null)   // bulk open/close signal
  const bgFileRef = useRef(null)

  const set = (key, val) => setTheme(prev => ({ ...prev, [key]: val }))
  const side     = theme.settingsSide || 'right'
  const allOpen  = groupSignal?.open !== false  // default true

  const toggleAllGroups = () =>
    setGroupSignal({ open: !allOpen, t: Date.now() })

  return (
    <>
      {/* Veil */}
      <div className="settings-veil" onClick={onClose} />

      {/* Panel */}
      <div className="settings-panel" data-side={side} style={{ width: 'min(380px, 74vw)' }}>

        {/* ── Fixed header ──────────────────────────── */}
        <div className="settings-header">
          <span style={{ fontWeight: 600, fontSize: '0.95em', letterSpacing: '0.02em' }}>
            Settings
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              className="btn-xs"
              title={allOpen ? 'Collapse all sections' : 'Expand all sections'}
              onClick={toggleAllGroups}
            >
              {allOpen ? '▲ Close' : '▼ Expand'}
            </button>
            <button
              className="btn-xs"
              title="Move panel to the other side"
              onClick={() => set('settingsSide', side === 'right' ? 'left' : 'right')}
            >
              {side === 'right' ? '← Left' : 'Right →'}
            </button>
            <button className="icon-btn" onClick={onClose} title="Close (Esc)">✕</button>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            BACKGROUND
        ══════════════════════════════════════════ */}
        <Group title="Background" defaultOpen signal={groupSignal}>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', marginBottom: '0.4rem' }}>
            {BG_PRESETS.map(p => (
              <button
                key={p.value}
                className={`btn-xs${theme.bgPreset === p.value ? ' btn-primary' : ''}`}
                onClick={() => set('bgPreset', p.value)}
              >{p.label}</button>
            ))}
          </div>

          {/* ── Per-preset helpers ── */}
          {(() => {
            const gp = (key, def) => theme.bgSt?.[theme.bgPreset]?.[key] ?? def
            const sp = (key, val) => set('bgSt', {
              ...(theme.bgSt ?? {}),
              [theme.bgPreset]: { ...(theme.bgSt?.[theme.bgPreset] ?? {}), [key]: val }
            })
            return (
              <>
                {ANIMATED_PRESETS.includes(theme.bgPreset) && (
                  <>
                    <SectionTitle>Animation</SectionTitle>
                    <Row label="Speed">
                      <Slider label="Speed" val={Math.round(gp('speed', 1) * 100)} min={0} max={800} step={25}
                        onChange={v => sp('speed', v / 100)} unit="%" />
                    </Row>
                  </>
                )}

                {PLASMA_PRESETS.includes(theme.bgPreset) && (
                  <>
                    <SectionTitle>Plasma colours</SectionTitle>
                    <Row label="Colour 1"><ColorPick label="Colour 1" value={gp('c1', '#6c8fff')} onChange={v => sp('c1', v)} /></Row>
                    <Row label="Colour 2"><ColorPick label="Colour 2" value={gp('c2', '#9c6fff')} onChange={v => sp('c2', v)} /></Row>
                    <Row label="Colour 3"><ColorPick label="Colour 3" value={gp('c3', '#50c8ff')} onChange={v => sp('c3', v)} /></Row>
                    <Row label="Blur radius">
                      <Slider label="Blur radius" val={gp('blur', 45)} min={10} max={120} onChange={v => sp('blur', v)} unit="px" />
                    </Row>
                  </>
                )}

                {theme.bgPreset === 'fog' && (
                  <>
                    <SectionTitle>Fog colour</SectionTitle>
                    <Row label="Fog colour"><ColorPick label="Fog colour" value={gp('fogColor', '#323c6e')} onChange={v => sp('fogColor', v)} /></Row>
                    <Row label="Fog density">
                      <Slider label="Fog density" val={Math.round(gp('fogOpacity', 1) * 100)} min={0} max={100}
                        onChange={v => sp('fogOpacity', v / 100)} unit="%" />
                    </Row>
                  </>
                )}

                {theme.bgPreset === 'scan' && (
                  <>
                    <SectionTitle>Scan line</SectionTitle>
                    <Row label="Line colour"><ColorPick label="Line colour" value={gp('scanColor', '#6c8fff')} onChange={v => sp('scanColor', v)} /></Row>
                    <Row label="Brightness">
                      <Slider label="Brightness" val={Math.round(gp('scanOpacity', 1) * 100)} min={0} max={100}
                        onChange={v => sp('scanOpacity', v / 100)} unit="%" />
                    </Row>
                  </>
                )}

                {theme.bgPreset === 'starfield' && (
                  <>
                    <SectionTitle>Starfield gradient</SectionTitle>
                    <Row label="Gradient overlay">
                      <Toggle label="Gradient overlay" checked={gp('sfGrad', false)} onChange={v => sp('sfGrad', v)} />
                    </Row>
                    {gp('sfGrad', false) && (
                      <>
                        <Row label="Colour 1"><ColorPick label="Colour 1" value={gp('c1', '#6c8fff')} onChange={v => sp('c1', v)} /></Row>
                        <Row label="Colour 2"><ColorPick label="Colour 2" value={gp('c2', '#9c6fff')} onChange={v => sp('c2', v)} /></Row>
                      </>
                    )}
                    <SectionTitle>Stars</SectionTitle>
                    <Row label="Star density">
                      <Slider label="Star density" val={gp('density', 3)} min={1} max={5} step={1}
                        onChange={v => sp('density', v)} unit="" />
                    </Row>
                    <SectionTitle>Planets</SectionTitle>
                    <Row label="Show planets">
                      <Toggle label="Show planets" checked={gp('planets', false)} onChange={v => sp('planets', v)} />
                    </Row>
                    {gp('planets', false) && (
                      <Row label="Planet count">
                        <Slider label="Planet count" val={gp('planetCount', 2)} min={1} max={3} step={1}
                          onChange={v => sp('planetCount', v)} unit="" />
                      </Row>
                    )}
                  </>
                )}

                {theme.bgPreset === 'drift' && (
                  <>
                    <SectionTitle>Drift colours</SectionTitle>
                    <Row label="Colour 1"><ColorPick label="Colour 1" value={gp('c1', '#6c8fff')} onChange={v => sp('c1', v)} /></Row>
                    <Row label="Colour 2"><ColorPick label="Colour 2" value={gp('c2', '#9c6fff')} onChange={v => sp('c2', v)} /></Row>
                  </>
                )}

                {theme.bgPreset === 'pulse' && (
                  <>
                    <SectionTitle>Pulse colour</SectionTitle>
                    <Row label="Colour"><ColorPick label="Colour" value={gp('c1', '#6c8fff')} onChange={v => sp('c1', v)} /></Row>
                  </>
                )}

                {theme.bgPreset === 'tide' && (
                  <>
                    <SectionTitle>Tide colours</SectionTitle>
                    <Row label="Colour 1"><ColorPick label="Colour 1" value={gp('c1', '#005080')} onChange={v => sp('c1', v)} /></Row>
                    <Row label="Colour 2"><ColorPick label="Colour 2" value={gp('c2', '#0078c8')} onChange={v => sp('c2', v)} /></Row>
                  </>
                )}
              </>
            )
          })()}
          <Row label="Pattern colour">
            <ColorPick label="Pattern colour" value={theme.patternColor} onChange={v => set('patternColor', v)} />
          </Row>
          <Row label="Pattern opacity">
            <Slider label="Pattern opacity" val={Math.round((theme.patternOpacity ?? 1) * 100)} min={0} max={100}
              onChange={v => set('patternOpacity', v / 100)} unit="%" />
          </Row>
          <Row label="Custom bg image">
            <button className="btn-xs" onClick={() => bgFileRef.current?.click()}>Upload</button>
            {theme.bgPreset === 'image' && (
              <button className="btn-xs" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => { localStorage.removeItem('bg_image'); set('bgPreset', 'noise') }}>Remove</button>
            )}
          </Row>
          <input ref={bgFileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { onBgImageUpload(e.target.files?.[0]); e.target.value = '' }} />

        </Group>

        {/* ══════════════════════════════════════════
            WALLPAPER OVERLAY
        ══════════════════════════════════════════ */}
        <Group title="Wallpaper overlay" defaultOpen={false} signal={groupSignal}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
            <button className="btn-xs" onClick={() => fileRef.current?.click()}>Upload wallpaper</button>
            {theme.wallpaper && (
              <button className="btn-xs" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => set('wallpaper', '')}>Remove</button>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { onImageUpload(e.target.files?.[0]); e.target.value = '' }} />

          {theme.wallpaper && (<>
            <Row label="Fit">
              <select className="input" style={{ maxWidth: 110, fontSize: '0.8em' }}
                value={theme.wallpaperFit || 'cover'} onChange={e => set('wallpaperFit', e.target.value)}>
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="fill">Fill</option>
                <option value="none">None</option>
              </select>
            </Row>
            <Row label="Position X">
              <Slider label="Position X" val={theme.wallpaperX ?? 50} min={0} max={100} onChange={v => set('wallpaperX', v)} unit="%" />
            </Row>
            <Row label="Position Y">
              <Slider label="Position Y" val={theme.wallpaperY ?? 50} min={0} max={100} onChange={v => set('wallpaperY', v)} unit="%" />
            </Row>
            <Row label="Scale">
              <Slider label="Scale" val={theme.wallpaperScale ?? 100} min={50} max={300} onChange={v => set('wallpaperScale', v)} unit="%" />
            </Row>
            <Row label="Blur">
              <Slider label="Blur" val={theme.wallpaperBlur ?? 0} min={0} max={40} onChange={v => set('wallpaperBlur', v)} unit="px" />
            </Row>
            <Row label="Dim overlay">
              <Slider label="Dim overlay" val={theme.wallpaperDim ?? 35} min={0} max={100} onChange={v => set('wallpaperDim', v)} unit="%" />
            </Row>
            <Row label="Opacity">
              <Slider label="Opacity" val={theme.wallpaperOpacity ?? 100} min={0} max={100} onChange={v => set('wallpaperOpacity', v)} unit="%" />
            </Row>
          </>)}
        </Group>

        {/* ══════════════════════════════════════════
            COLOURS
        ══════════════════════════════════════════ */}
        <Group title="Colours" defaultOpen={false} signal={groupSignal}>

          <SectionTitle>Surfaces</SectionTitle>
          <Row label="Background"><ColorPick label="Background" value={theme.bg}  onChange={v => set('bg', v)} /></Row>
          <Row label="Surface 2"> <ColorPick label="Surface 2" value={theme.bg2} onChange={v => set('bg2', v)} /></Row>
          <Row label="Surface 3"> <ColorPick label="Surface 3" value={theme.bg3} onChange={v => set('bg3', v)} /></Row>
          <Row label="Card">
            <ColorPick label="Card" value={(theme.card || '#13131a').replace(/[^#0-9a-fA-F]/g, '').slice(0, 7)} onChange={v => set('card', v)} />
          </Row>
          <Row label="Card opacity">
            <Slider label="Card opacity" val={Math.round((theme.cardOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('cardOpacity', v / 100)} unit="%" />
          </Row>

          <SectionTitle>Borders</SectionTitle>
          <Row label="Border">       <ColorPick label="Border" value={theme.border}      onChange={v => set('border', v)} /></Row>
          <Row label="Border hover"> <ColorPick label="Border hover" value={theme.borderHover} onChange={v => set('borderHover', v)} /></Row>
          <Row label="Border opacity">
            <Slider label="Border opacity" val={Math.round((theme.borderOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('borderOpacity', v / 100)} unit="%" />
          </Row>

          <SectionTitle>Text</SectionTitle>
          <Row label="Text">         <ColorPick label="Text" value={theme.text}        onChange={v => set('text', v)} /></Row>
          <Row label="Text dim">     <ColorPick label="Text dim" value={theme.textDim}     onChange={v => set('textDim', v)} /></Row>
          <Row label="Title / label"><ColorPick label="Title / label" value={theme.titleColor || theme.textDim} onChange={v => set('titleColor', v)} /></Row>

          <SectionTitle>Accent &amp; state</SectionTitle>
          <Row label="Accent">  <ColorPick label="Accent" value={theme.accent}  onChange={v => set('accent', v)} /></Row>
          <Row label="Danger">  <ColorPick label="Danger" value={theme.danger}  onChange={v => set('danger', v)} /></Row>
          <Row label="Success"> <ColorPick label="Success" value={theme.success} onChange={v => set('success', v)} /></Row>

          <SectionTitle>Buttons</SectionTitle>
          <Row label="Button bg">   <ColorPick label="Button bg" value={theme.btnBg}   onChange={v => set('btnBg', v)} /></Row>
          <Row label="Button text"> <ColorPick label="Button text" value={theme.btnText} onChange={v => set('btnText', v)} /></Row>

          <SectionTitle>Settings panel</SectionTitle>
          <Row label="Section title colour">
            <ColorPick label="Section title colour" value={theme.settingsTitleColor || '#7878a0'} onChange={v => set('settingsTitleColor', v)} />
          </Row>

        </Group>

        {/* ══════════════════════════════════════════
            TYPOGRAPHY
        ══════════════════════════════════════════ */}
        <Group title="Typography" defaultOpen={false} signal={groupSignal}>
          <Row label="Font family">
            <select className="input" style={{ maxWidth: 160, fontSize: '0.8em' }}
              value={theme.font} onChange={e => set('font', e.target.value)}>
              {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
          </Row>
          <Row label="Body font size">
            <Slider label="Body font size" val={theme.fontSize ?? 14} min={10} max={20} onChange={v => set('fontSize', v)} unit="px" />
          </Row>
          <Row label="Topbar font size">
            <Slider label="Topbar font size" val={theme.topbarFontSize ?? 12} min={9} max={16} onChange={v => set('topbarFontSize', v)} unit="px" />
          </Row>
          <Row label="Settings font size">
            <Slider label="Settings font size" val={theme.settingsFontSize ?? 13} min={10} max={18} onChange={v => set('settingsFontSize', v)} unit="px" />
          </Row>
        </Group>

        {/* ══════════════════════════════════════════
            LAYOUT & SPACING
        ══════════════════════════════════════════ */}
        <Group title="Layout &amp; spacing" defaultOpen={false} signal={groupSignal}>

          <Row label="Columns">
            <Slider label="Columns" val={theme.sectionsCols ?? 4} min={1} max={10} onChange={v => set('sectionsCols', v)} />
          </Row>
          <Row label="Topbar → cards gap">
            <Slider label="Topbar → cards gap" val={theme.mainGapTop ?? 12} min={0} max={150} step={2} onChange={v => set('mainGapTop', v)} unit="px" />
          </Row>
          <Row label="Section gap (v)">
            <Slider label="Section gap (v)" val={theme.sectionGap ?? 0} min={0} max={32} onChange={v => set('sectionGap', v)} unit="px" />
          </Row>
          <Row label="Section gap (h)">
            <Slider label="Section gap (h)" val={theme.sectionGapH ?? 0} min={0} max={32} onChange={v => set('sectionGapH', v)} unit="px" />
          </Row>
          <Row label="Link gap">
            <Slider label="Link gap" val={Math.round((theme.linkGap ?? 0.5) * 100)} min={0} max={200} step={5}
              onChange={v => set('linkGap', v / 100)} unit="%" />
          </Row>
          <Row label="Link left padding">
            <Slider label="Link left padding" val={Math.round((theme.linksPaddingH ?? 0.75) * 100)} min={-100} max={200} step={5}
              onChange={v => set('linksPaddingH', v / 100)} unit="%" />
          </Row>
          <Row label="Handle opacity">
            <Slider label="Handle opacity" val={theme.handleOpacity ?? 15} min={0} max={100} onChange={v => set('handleOpacity', v)} unit="%" />
          </Row>

          <div style={{ paddingTop: '0.65rem', paddingBottom: '0.65rem' }}>
            <SectionTitle>Page scale</SectionTitle>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.35rem' }}>
              {PAGE_SCALES.map(v => (
                <button
                  key={v}
                  className={`btn-xs${Math.abs((theme.pageScale ?? 1) - v) < 0.01 ? ' btn-primary' : ''}`}
                  onClick={() => set('pageScale', v)}
                >
                  {Math.round(v * 100)}%
                </button>
              ))}
            </div>
          </div>

        </Group>

        {/* ══════════════════════════════════════════
            CARDS & BORDERS
        ══════════════════════════════════════════ */}
        <Group title="Cards &amp; borders" defaultOpen={false} signal={groupSignal}>

          <Row label="Card corner radius">
            <Slider label="Card corner radius" val={theme.radius ?? 10} min={0} max={24} onChange={v => set('radius', v)} unit="px" />
          </Row>
          {/* Quick presets */}
          <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.3rem' }}>
            {[{ l: 'Sharp', v: 0 }, { l: 'Normal', v: 10 }, { l: 'Round', v: 20 }].map(p => (
              <button
                key={p.v}
                className={`btn-xs${theme.radius === p.v ? ' btn-primary' : ''}`}
                onClick={() => set('radius', p.v)}
              >{p.l}</button>
            ))}
          </div>

          <Row label="Section corner radius">
            <Slider label="Section corner radius" val={theme.sectionRadius ?? 0} min={0} max={24} onChange={v => set('sectionRadius', v)} unit="px" />
          </Row>

        </Group>

        {/* ══════════════════════════════════════════
            CLOCK
        ══════════════════════════════════════════ */}
        <Group title="Clock" defaultOpen={false} signal={groupSignal}>
          <Row label="Clock widget size">
            <Slider label="Clock widget size" val={Math.round((theme.clockWidgetSize ?? 1) * 10)} min={5} max={30}
              onChange={v => set('clockWidgetSize', v / 10)} unit="×" />
          </Row>
        </Group>

        {/* ══════════════════════════════════════════
            FAVICONS
        ══════════════════════════════════════════ */}
        <Group title="Favicons" defaultOpen={false} signal={groupSignal}>
          <Row label="Show favicons">
            <Toggle label="Show favicons" checked={theme.faviconEnabled ?? true} onChange={v => set('faviconEnabled', v)} />
          </Row>
          <Row label="Favicon size">
            <Slider label="Favicon size" val={theme.faviconSize ?? 13} min={10} max={24} onChange={v => set('faviconSize', v)} unit="px" />
          </Row>
          <Row label="Favicon opacity">
            <Slider label="Favicon opacity" val={Math.round((theme.faviconOpacity ?? 1) * 100)} min={0} max={100}
              onChange={v => set('faviconOpacity', v / 100)} unit="%" />
          </Row>
          <Row label="Greyscale">
            <Toggle label="Greyscale" checked={theme.faviconGreyscale ?? false} onChange={v => set('faviconGreyscale', v)} />
          </Row>
          <Row label="Load delay">
            <Slider label="Load delay" val={theme.faviconDelay ?? 0} min={0} max={5} step={0.5}
              onChange={v => set('faviconDelay', v)} unit="s" />
          </Row>
          <Row label="Fade-in duration">
            <Slider label="Fade-in duration" val={theme.faviconFade ?? 0.3} min={0} max={2} step={0.1}
              onChange={v => set('faviconFade', v)} unit="s" />
          </Row>
        </Group>

        {/* ══════════════════════════════════════════
            NOTES
        ══════════════════════════════════════════ */}
        <Group title="Notes" defaultOpen={false} signal={groupSignal}>
          <Row label="Font size">
            <Slider label="Font size" val={theme.notesFontSize ?? 13} min={10} max={20} onChange={v => set('notesFontSize', v)} unit="px" />
          </Row>
          <Row label="Gap between notes">
            <Slider label="Gap between notes" val={theme.notesGap ?? 0} min={0} max={32} onChange={v => set('notesGap', v)} unit="px" />
          </Row>
          <Row label="Note card background"> <ColorPick label="Note card background" value={theme.notesCardBg || '#13131a'} onChange={v => set('notesCardBg', v)} /></Row>
          <Row label="Note text colour">     <ColorPick label="Note text colour" value={theme.notesTextColor || '#e8e8f0'} onChange={v => set('notesTextColor', v)} /></Row>
          <Row label="Note text background"> <ColorPick label="Note text background" value={theme.notesTextBg || '#0c0c0f'} onChange={v => set('notesTextBg', v)} /></Row>
        </Group>

        {/* ══════════════════════════════════════════
            SEARCH
        ══════════════════════════════════════════ */}
        <Group title="Search" defaultOpen={false} signal={groupSignal}>
          <SectionTitle>Search engine</SectionTitle>
          <Row label="Engine URL">
            <input
              className="input"
              style={{ fontSize: '0.78em' }}
              value={theme.searchEngineUrl || 'https://www.google.com/search?q='}
              onChange={e => set('searchEngineUrl', e.target.value)}
              placeholder="https://www.google.com/search?q="
            />
          </Row>
          <SectionTitle>Presets</SectionTitle>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', padding: '0 0.75rem 0.4rem' }}>
            <button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://www.google.com/search?q=')}>Google</button>
            <button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://www.bing.com/search?q=')}>Bing</button>
            <button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://duckduckgo.com/?q=')}>DuckDuckGo</button>
            <button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://search.brave.com/search?q=')}>Brave</button>
            <button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://www.perplexity.ai/search?q=')}>Perplexity</button>
          </div>
          <Row label="Open results">
            <select
              className="input"
              style={{ fontSize: '0.78em' }}
              value={(theme.openInNewTab ?? true) ? 'new' : 'same'}
              onChange={e => set('openInNewTab', e.target.value === 'new')}
            >
              <option value="new">New tab</option>
              <option value="same">Same tab</option>
            </select>
          </Row>
        </Group>

        {/* ══════════════════════════════════════════
            WORKSPACES
        ══════════════════════════════════════════ */}
        <Group title="Workspaces" defaultOpen={false} signal={groupSignal}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.4rem' }}>
            {workspaces.map(ws => (
              <div key={ws.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.25rem 0.45rem', borderRadius: 'var(--radius-sm)',
                background: ws.id === activeWs ? 'var(--accent-dim)' : 'transparent',
                border: `1px solid ${ws.id === activeWs ? 'var(--accent)' : 'transparent'}`,
              }}>
                <span style={{ flex: 1, fontSize: '0.82em', cursor: 'pointer',
                  color: ws.id === activeWs ? 'var(--accent)' : 'var(--text-dim)' }}
                  onClick={() => onSetActiveWs(ws.id)}>
                  {ws.name}
                </span>
                <button className="btn-xs" onClick={() => {
                  const n = prompt('Rename workspace:', ws.name)
                  if (n?.trim()) onRenameWorkspace(ws.id, n.trim())
                }}>✎</button>
                <button className="btn-xs" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => onDeleteWorkspace(ws.id)} disabled={workspaces.length <= 1}>✕</button>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <input className="input" style={{ flex: 1, fontSize: '0.8em' }}
              placeholder="New workspace name…" value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newWsName.trim()) { onAddWorkspace(newWsName.trim()); setNewWsName('') } }} />
            <button className="btn-xs btn-primary" disabled={!newWsName.trim()}
              onClick={() => { if (newWsName.trim()) { onAddWorkspace(newWsName.trim()); setNewWsName('') } }}>Add</button>
          </div>
        </Group>

        {/* ══════════════════════════════════════════
            IMPORT / EXPORT
        ══════════════════════════════════════════ */}
        <Group title="Import / Export" defaultOpen={false} signal={groupSignal}>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
            <button className="btn-xs" onClick={onExportBackup}>↓ Full backup (JSON)</button>
            <button className="btn-xs" onClick={onExportCSV}>↓ Links CSV</button>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button className="btn-xs" disabled={importingBackup} onClick={() => backupFileRef.current?.click()}>
              {importingBackup ? '⟳ Importing…' : '↑ Import JSON / CSV'}
            </button>
          </div>
          <input ref={backupFileRef} type="file" accept="application/json,.json,.csv,text/csv"
            style={{ display: 'none' }} onChange={onImportBackup} />
        </Group>

        {/* ══════════════════════════════════════════
            DANGER ZONE
        ══════════════════════════════════════════ */}
        <Group title="Danger zone" defaultOpen={false} signal={groupSignal}>
          <p style={{ fontSize: '0.78em', color: 'var(--text-dim)', lineHeight: 1.5, margin: '0.2rem 0 0.5rem' }}>
            Destructive — cannot be undone.
          </p>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            <button className="btn btn-danger" style={{ fontSize: '0.78em', padding: '0.28rem 0.7rem' }}
              onClick={onResetWorkspaceLinks}>
              ✕ Clear all sections &amp; links
            </button>
            <button className="btn btn-danger" style={{ fontSize: '0.78em', padding: '0.28rem 0.7rem' }}
              onClick={() => { if (confirm('Reset all theme settings to defaults?')) onResetTheme() }}>
              ↺ Reset theme to defaults
            </button>
          </div>
        </Group>

        {/* ── Bookmarks ───────────────────────────────────────────── */}
        <Group title="Bookmarks" defaultOpen={false}>
          <Row label="Extension status">
            <span style={{ fontSize: '0.8em', color: bookmarkCount > 0 ? 'var(--success, #4caf50)' : 'var(--text-muted)' }}>
              {bookmarkCount > 0 ? `● ${bookmarkCount} bookmarks synced` : '○ Extension not detected'}
            </span>
          </Row>
          {bookmarkCount > 0 && (
            <Row label="Re-sync">
              <button className="btn" style={{ fontSize: '0.8em' }}
                onClick={forceSync} title="Force re-sync bookmarks from Firefox">
                ↻ Force sync
              </button>
            </Row>
          )}
          {bmFolders && bmFolders.length > 0 && (
            <>
              <SectionTitle>Folder visibility</SectionTitle>
              <div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {bmFolders.map(f => (
                  <label key={f.id} title={`${hiddenFolders.includes(f.id) ? 'Show' : 'Hide'} folder: ${f.path || f.title}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0',
                             paddingLeft: (f.depth * 12) + 'px', cursor: 'pointer', fontSize: '0.82em',
                             color: hiddenFolders.includes(f.id) ? 'var(--text-muted)' : 'var(--text)',
                             opacity: hiddenFolders.includes(f.id) ? 0.5 : 1 }}>
                    <input type="checkbox" checked={!hiddenFolders.includes(f.id)}
                      onChange={() => toggleFolder(f.id)}
                      style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />
                    {f.title}
                  </label>
                ))}
              </div>
            </>
          )}
          {(!bmFolders || bmFolders.length === 0) && (
            <div style={{ fontSize: '0.8em', color: 'var(--text-muted)', padding: '0.5rem 0', lineHeight: 1.5 }}>
              Install the browser extension to enable bookmark search in the topbar.
            </div>
          )}
        </Group>

      </div>

      {/* ── Footer — z-index above panel so it's always visible ── */}
      {onSignOut && (
        <div style={{ padding: '0.45rem 0.75rem', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.78em', color: 'var(--text-muted)' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail || 'Signed in'}
          </span>
          <button className="btn" style={{ flexShrink: 0, fontSize: '0.85em', padding: '0.2rem 0.6rem' }}
            onClick={onSignOut}>
            Sign out
          </button>
        </div>
      )}
            <div className="settings-footer" data-side={side} style={{ zIndex: 102, width: 'min(380px, 74vw)' }}>
       
        <button className="btn btn-primary" style={{ flex: 1 }}
          onClick={() => { onSave(); onClose() }}>
          Save &amp; Close
        </button>
       
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  )
}