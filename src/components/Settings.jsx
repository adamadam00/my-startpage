import { useState, useRef } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const FONTS = [
  { label: 'DM Mono',         value: "'DM Mono', monospace"               },
  { label: 'JetBrains Mono',  value: "'JetBrains Mono', monospace"         },
  { label: 'IBM Plex Mono',   value: "'IBM Plex Mono', monospace"          },
  { label: 'Inter',           value: 'Inter, system-ui, sans-serif'        },
  { label: 'Geist',           value: 'Geist, system-ui, sans-serif'        },
  { label: 'IBM Plex Sans',   value: "'IBM Plex Sans', sans-serif"         },
  { label: 'Outfit',          value: 'Outfit, sans-serif'                  },
  { label: 'Space Grotesk',   value: "'Space Grotesk', sans-serif"         },
  { label: 'Figtree',         value: 'Figtree, sans-serif'                 },
]

const BG_PRESETS = [
  // Dark animated / texture
  { label: 'Noise',       value: 'noise'         },
  { label: 'Solid',       value: 'solid'         },
  { label: 'Dots',        value: 'dots'          },
  { label: 'Grid',        value: 'grid'          },
  { label: 'Lines',       value: 'lines'         },
  { label: 'Gradient',    value: 'gradient'      },
  { label: 'Mesh',        value: 'mesh'          },
  { label: 'Aurora',      value: 'aurora'        },
  { label: 'Stars',       value: 'stars'         },
  { label: 'Nebula',      value: 'nebula'        },
  { label: 'Starfield',   value: 'starfield'     },
  { label: 'Fog',         value: 'fog'           },
  { label: 'Scan',        value: 'scan'          },
  { label: 'Vortex',      value: 'vortex'        },
  { label: 'Ripple',      value: 'ripple'        },
  { label: 'Filament',    value: 'filament'      },
  // Plasma variants
  { label: 'Plasma',      value: 'plasma'        },
  { label: 'Inferno',     value: 'inferno'       },
  { label: 'Mint',        value: 'mint'          },
  { label: 'Dusk',        value: 'dusk'          },
  { label: 'Mono',        value: 'mono'          },
  // Light
  { label: 'Bokeh',       value: 'light-bokeh'   },
  { label: 'Silver',      value: 'silver-radial' },
  { label: 'Wall',        value: 'wall-texture'  },
  { label: 'Timber',      value: 'timber-dark'   },
]

// ─────────────────────────────────────────────────────────────────────────────
// SMALL SHARED UI PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

// A labelled row — label on the left, control on the right
function Row({ label, children, dimLabel = false }) {
  return (
    <div className="settings-row">
      <span
        className="settings-label"
        style={{ color: dimLabel ? 'var(--text-muted)' : undefined }}
      >
        {label}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        {children}
      </div>
    </div>
  )
}

// Range slider + live numeric readout
function Slider({ val, min, max, step = 1, onChange, unit = '' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={val}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: 88 }}
      />
      <span style={{ fontSize: '0.73em', color: 'var(--text-dim)', minWidth: '3.2em', textAlign: 'right' }}>
        {val}{unit}
      </span>
    </div>
  )
}

// Colour picker — strips any alpha from the stored value before passing to <input type="color">
function ColorPick({ value, onChange }) {
  const safe = (value || '#000000').replace(/[^#0-9a-fA-F]/g, '').slice(0, 7)
  const hex  = safe.length === 7 ? safe : '#000000'
  return (
    <input
      type="color"
      className="color-input"
      value={hex}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// A small on/off toggle
function Toggle({ checked, onChange }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

// Section heading inside the panel
function SectionTitle({ children }) {
  return <div className="settings-title">{children}</div>
}

// Collapsible settings group
function Group({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="settings-section">
      <div
        className="settings-title"
        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', userSelect: 'none' }}
        onClick={() => setOpen(v => !v)}
      >
        <span>{title}</span>
        <span style={{ fontSize: '0.8em', opacity: 0.5 }}>{open ? '▲' : '▼'}</span>
      </div>
      {open && children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SETTINGS PANEL
// ─────────────────────────────────────────────────────────────────────────────

export default function Settings({
  theme,
  setTheme,
  onSave,
  onClose,
  onImageUpload,
  onBgImageUpload,
  onExportBackup,
  onExportCSV,
  onImportBackup,
  onResetWorkspaceLinks,
  fileRef,
  backupFileRef,
  importingBackup,
  workspaces,
  activeWs,
  onAddWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,
  onSetActiveWs,
}) {
  // ── Local state ───────────────────────────────────────────────
  const [newWsName, setNewWsName] = useState('')
  const bgFileRef                 = useRef(null)
  const csvFileRef                = useRef(null)

  // Shorthand setters
  const set  = (key, val)    => setTheme(prev => ({ ...prev, [key]: val }))
  const side = theme.settingsSide || 'right'

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* Veil — click to close */}
      <div className="settings-veil" onClick={onClose} />

      {/* The panel itself */}
      <div className="settings-panel" data-side={side}>

        {/* ── Fixed header ──────────────────────────────────── */}
        <div className="settings-header">
          <span style={{ fontWeight: 600, fontSize: '0.95em', letterSpacing: '0.02em' }}>
            Settings
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            {/* Toggle panel side */}
            <button
              className="btn-xs"
              title="Move panel to the other side"
              onClick={() => set('settingsSide', side === 'right' ? 'left' : 'right')}
            >
              {side === 'right' ? '← Left' : 'Right →'}
            </button>
            <button className="icon-btn" onClick={onClose} title="Close settings (Esc)">
              ✕
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════
            SECTION: BACKGROUND
        ══════════════════════════════════════════════════════ */}
        <Group title="Background" defaultOpen={true}>

          {/* Preset grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.3rem' }}>
            {BG_PRESETS.map(p => (
              <button
                key={p.value}
                className={`btn-xs${theme.bgPreset === p.value ? ' btn-primary' : ''}`}
                onClick={() => set('bgPreset', p.value)}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Pattern colour + opacity (for dot/grid/lines presets) */}
          <Row label="Pattern colour">
            <ColorPick value={theme.patternColor} onChange={v => set('patternColor', v)} />
          </Row>
          <Row label="Pattern opacity">
            <Slider val={Math.round((theme.patternOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('patternOpacity', v / 100)} unit="%" />
          </Row>

          {/* Custom background image upload */}
          <Row label="Custom bg image">
            <button className="btn-xs" onClick={() => bgFileRef.current?.click()}>
              Upload image
            </button>
            {theme.bgPreset === 'image' && (
              <button
                className="btn-xs"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => {
                  localStorage.removeItem('bg_image')
                  set('bgPreset', 'noise')
                }}
              >
                Remove
              </button>
            )}
          </Row>
          <input
            ref={bgFileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { onBgImageUpload(e.target.files?.[0]); e.target.value = '' }}
          />

        </Group>

        {/* ══════════════════════════════════════════════════════
            SECTION: WALLPAPER OVERLAY
        ══════════════════════════════════════════════════════ */}
        <Group title="Wallpaper overlay" defaultOpen={false}>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
            <button className="btn-xs" onClick={() => fileRef.current?.click()}>
              Upload wallpaper
            </button>
            {theme.wallpaper && (
              <button
                className="btn-xs"
                style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => set('wallpaper', '')}
              >
                Remove
              </button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => { onImageUpload(e.target.files?.[0]); e.target.value = '' }}
          />

          {theme.wallpaper && (
            <>
              <Row label="Fit">
                <select
                  className="input"
                  style={{ maxWidth: 110, fontSize: '0.8em' }}
                  value={theme.wallpaperFit || 'cover'}
                  onChange={e => set('wallpaperFit', e.target.value)}
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="fill">Fill</option>
                  <option value="none">None</option>
                </select>
              </Row>
              <Row label="Position X">
                <Slider val={theme.wallpaperX ?? 50} min={0} max={100} onChange={v => set('wallpaperX', v)} unit="%" />
              </Row>
              <Row label="Position Y">
                <Slider val={theme.wallpaperY ?? 50} min={0} max={100} onChange={v => set('wallpaperY', v)} unit="%" />
              </Row>
              <Row label="Scale">
                <Slider val={theme.wallpaperScale ?? 100} min={50} max={300} onChange={v => set('wallpaperScale', v)} unit="%" />
              </Row>
              <Row label="Blur">
                <Slider val={theme.wallpaperBlur ?? 0} min={0} max={40} onChange={v => set('wallpaperBlur', v)} unit="px" />
              </Row>
              <Row label="Dim overlay">
                <Slider val={theme.wallpaperDim ?? 35} min={0} max={100} onChange={v => set('wallpaperDim', v)} unit="%" />
              </Row>
              <Row label="Opacity">
                <Slider val={theme.wallpaperOpacity ?? 100} min={0} max={100} onChange={v => set('wallpaperOpacity', v)} unit="%" />
              </Row>
            </>
          )}

        </Group>

        {/* ══════════════════════════════════════════════════════
            SECTION: COLOURS
        ══════════════════════════════════════════════════════ */}
        <Group title="Colours" defaultOpen={true}>

          {/* Surface layers */}
          <SectionTitle>Surfaces</SectionTitle>
          <Row label="Background (bg)">
            <ColorPick value={theme.bg}  onChange={v => set('bg', v)} />
          </Row>
          <Row label="Surface 2 (bg2)">
            <ColorPick value={theme.bg2} onChange={v => set('bg2', v)} />
          </Row>
          <Row label="Surface 3 (bg3)">
            <ColorPick value={theme.bg3} onChange={v => set('bg3', v)} />
          </Row>
          <Row label="Card">
            <ColorPick value={(theme.card || '#13131a').replace(/[^#0-9a-fA-F]/g, '').slice(0, 7)} onChange={v => set('card', v)} />
          </Row>
          <Row label="Card opacity">
            <Slider val={Math.round((theme.cardOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('cardOpacity', v / 100)} unit="%" />
          </Row>

          {/* Borders */}
          <SectionTitle>Borders</SectionTitle>
          <Row label="Border">
            <ColorPick value={theme.border}      onChange={v => set('border', v)} />
          </Row>
          <Row label="Border hover">
            <ColorPick value={theme.borderHover} onChange={v => set('borderHover', v)} />
          </Row>
          <Row label="Border opacity">
            <Slider val={Math.round((theme.borderOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('borderOpacity', v / 100)} unit="%" />
          </Row>

          {/* Text */}
          <SectionTitle>Text</SectionTitle>
          <Row label="Text">
            <ColorPick value={theme.text}       onChange={v => set('text', v)} />
          </Row>
          <Row label="Text dim">
            <ColorPick value={theme.textDim}    onChange={v => set('textDim', v)} />
          </Row>
          <Row label="Title / label">
            <ColorPick value={theme.titleColor || theme.textDim} onChange={v => set('titleColor', v)} />
          </Row>

          {/* Accent & state */}
          <SectionTitle>Accent &amp; state</SectionTitle>
          <Row label="Accent">
            <ColorPick value={theme.accent}  onChange={v => set('accent', v)} />
          </Row>
          <Row label="Danger">
            <ColorPick value={theme.danger}  onChange={v => set('danger', v)} />
          </Row>
          <Row label="Success">
            <ColorPick value={theme.success} onChange={v => set('success', v)} />
          </Row>

          {/* Buttons */}
          <SectionTitle>Buttons</SectionTitle>
          <Row label="Button bg">
            <ColorPick value={theme.btnBg}   onChange={v => set('btnBg', v)} />
          </Row>
          <Row label="Button text">
            <ColorPick value={theme.btnText} onChange={v => set('btnText', v)} />
          </Row>

        </Group>

        {/* ══════════════════════════════════════════════════════
            SECTION: TYPOGRAPHY
        ══════════════════════════════════════════════════════ */}
        <Group title="Typography" defaultOpen={false}>

          <Row label="Font family">
            <select
              className="input"
              style={{ maxWidth: 170, fontSize: '0.8em' }}
              value={theme.font}
              onChange={e => set('font', e.target.value)}
            >
              {FONTS.map(f => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </Row>
          <Row label="Body font size">
            <Slider val={theme.fontSize ?? 14} min={10} max={20} onChange={v => set('fontSize', v)} unit="px" />
          </Row>
          <Row label="Topbar font size">
            <Slider val={theme.topbarFontSize ?? 12} min={9} max={16} onChange={v => set('topbarFontSize', v)} unit="px" />
          </Row>

        </Group>

        {/* ══════════════════════════════════════════════════════
            SECTION: LAYOUT & SPACING
        ══════════════════════════════════════════════════════ */}
        <Group title="Layout &amp; spacing" defaultOpen={true}>

          <Row label="Columns">
            <Slider val={theme.sectionsCols ?? 4} min={1} max={10} step={1} onChange={v => set('sectionsCols', v)} />
          </Row>
          <Row label="Topbar → cards gap">
            <Slider val={theme.mainGapTop ?? 12} min={0} max={120} step={2} onChange={v => set('mainGapTop', v)} unit="px" />
          </Row>
          <Row label="Section gap (vertical)">
            <Slider val={theme.sectionGap ?? 0} min={0} max={32} onChange={v => set('sectionGap', v)} unit="px" />
          </Row>
          <Row label="Section gap (horizontal)">
            <Slider val={theme.sectionGapH ?? 0} min={0} max={32} onChange={v => set('sectionGapH', v)} unit="px" />
          </Row>
          <Row label="Card padding">
            <Slider val={Math.round((theme.cardPadding ?? 0.75) * 100)} min={0} max={200} step={5} onChange={v => set('cardPadding', v / 100)} unit="%" />
          </Row>
          <Row label="Link gap">
            <Slider val={Math.round((theme.linkGap ?? 0.5) * 100)} min={0} max={200} step={5} onChange={v => set('linkGap', v / 100)} unit="%" />
          </Row>
          <Row label="Page scale">
            <Slider val={Math.round((theme.pageScale ?? 1) * 100)} min={50} max={150} step={5} onChange={v => set('pageScale', v / 100)} unit="%" />
          </Row>
          <Row label="Handle opacity">
            <Slider val={theme.handleOpacity ?? 15} min={0} max={100} onChange={v => set('handleOpacity', v)} unit="%" />
          </Row>

        </Group>

        {/* ══════════════════════════════════════════════════════
            SECTION: CARDS & BORDERS
        ══════════════════════════════════════════════════════ */}
        <Group title="Cards &amp; borders" defaultOpen={false}>

          <Row label="Card corner radius">
            <Slider val={theme.radius ?? 10} min={0} max={24} onChange={v => set('radius', v)} unit="px" />
          </Row>
          <Row label="Section corner radius">
            <Slider val={theme.sectionRadius ?? 0} min={0} max={24} onChange={v => set('sectionRadius', v)} unit="px" />
          </Row>

        </Group>

        {/* ══════════════════════════════════════════════════════
            SECTION: CLOCK
        ══════════════════════════════════════════════════════ */}
        <Group title="Clock" defaultOpen={false}>

          {/* Clock is always 12-hour. Only the widget size is exposed here. */}
          <Row label="Clock widget size">
            <Slider val={Math.round((theme.clockWidgetSize ?? 1) * 10)} min={5} max={30} onChange={v => set('clockWidgetSize', v / 10)} unit="×" />
          </Row>

        </Group>

        {/* ══════════════════════════════════════════════════════
            SECTION: FAVICONS
        ══════════════════════════════════════════════════════ */}
        <Group title="Favicons" defaultOpen={false}>

          <Row label="Favicon size">
            <Slider val={theme.faviconSize ?? 13} min={10} max={24} onChange={v => set('faviconSize', v)} unit="px" />
          </Row>
          <Row label="Favicon opacity">
            <Slider val={Math.round((theme.faviconOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('faviconOpacity', v / 100)} unit="%" />
          </Row>
          <Row label="Greyscale">
            <Toggle checked={theme.faviconGreyscale ?? false} onChange={v => set('faviconGreyscale', v)} />
          </Row>

        </Group>

        {/* ══════════════════════════════════════════════════════
            SECTION: NOTES
        ══════════════════════════════════════════════════════ */}
        <Group title="Notes" defaultOpen={true}>

          <Row label="Font size">
            <Slider val={theme.notesFontSize ?? 13} min={10} max={20} onChange={v => set('notesFontSize', v)} unit="px" />
          </Row>
          <Row label="Gap between notes">
            <Slider val={theme.notesGap ?? 0} min={0} max={32} onChange={v => set('notesGap', v)} unit="px" />
          </Row>
          <Row label="Note card background">
            <ColorPick value={theme.notesCardBg || '#13131a'} onChange={v => set('notesCardBg', v)} />
          </Row>
          <Row label="Note text colour">
            <ColorPick value={theme.notesTextColor || '#e8e8f0'} onChange={v => set('notesTextColor', v)} />
          </Row>
          <Row label="Note text background">
            <ColorPick value={theme.notesTextBg || '#0c0c0f'} onChange={v => set('notesTextBg', v)} />
          </Row>

        </Group>

        {/* ══════════════════════════════════════════════════════
            SECTION: WORKSPACES
        ══════════════════════════════════════════════════════ */}
        <Group title="Workspaces" defaultOpen={false}>

          {/* Workspace list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.3rem' }}>
            {workspaces.map(ws => (
              <div
                key={ws.id}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            '0.4rem',
                  padding:        '0.28rem 0.5rem',
                  borderRadius:   'var(--radius-sm)',
                  background:     ws.id === activeWs ? 'var(--accent-dim)' : 'transparent',
                  border:         `1px solid ${ws.id === activeWs ? 'var(--accent)' : 'transparent'}`,
                }}
              >
                <span
                  style={{ flex: 1, fontSize: '0.82em', cursor: 'pointer', color: ws.id === activeWs ? 'var(--accent)' : 'var(--text-dim)' }}
                  onClick={() => onSetActiveWs(ws.id)}
                >
                  {ws.name}
                </span>
                <button
                  className="btn-xs"
                  onClick={() => {
                    const name = prompt('Rename workspace:', ws.name)
                    if (name && name.trim()) onRenameWorkspace(ws.id, name.trim())
                  }}
                >
                  ✎
                </button>
                <button
                  className="btn-xs"
                  style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                  onClick={() => onDeleteWorkspace(ws.id)}
                  disabled={workspaces.length <= 1}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>

          {/* Add workspace */}
          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
            <input
              className="input"
              style={{ flex: 1, fontSize: '0.8em' }}
              placeholder="New workspace name…"
              value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && newWsName.trim()) {
                  onAddWorkspace(newWsName.trim())
                  setNewWsName('')
                }
              }}
            />
            <button
              className="btn-xs btn-primary"
              disabled={!newWsName.trim()}
              onClick={() => {
                if (newWsName.trim()) {
                  onAddWorkspace(newWsName.trim())
                  setNewWsName('')
                }
              }}
            >
              Add
            </button>
          </div>

        </Group>

        {/* ══════════════════════════════════════════════════════
            SECTION: IMPORT / EXPORT
        ══════════════════════════════════════════════════════ */}
        <Group title="Import / Export" defaultOpen={false}>

          {/* Export buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
            <button className="btn-xs" onClick={onExportBackup}>
              ↓ Full backup (JSON)
            </button>
            <button className="btn-xs" onClick={onExportCSV}>
              ↓ Links CSV
            </button>
          </div>

          {/* Import — JSON or CSV */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
            <button
              className="btn-xs"
              disabled={importingBackup}
              onClick={() => backupFileRef.current?.click()}
            >
              {importingBackup ? '⟳ Importing…' : '↑ Import JSON / CSV'}
            </button>
          </div>
          <input
            ref={backupFileRef}
            type="file"
            accept="application/json,.json,.csv,text/csv"
            style={{ display: 'none' }}
            onChange={onImportBackup}
          />

          {/* Hidden CSV file input — kept for programmatic use */}
          <input
            ref={csvFileRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={onImportBackup}
          />

        </Group>

        {/* ══════════════════════════════════════════════════════
            SECTION: DANGER ZONE
        ══════════════════════════════════════════════════════ */}
        <Group title="Danger zone" defaultOpen={false}>

          <p style={{ fontSize: '0.78em', color: 'var(--text-dim)', lineHeight: 1.5, margin: '0.3rem 0 0.6rem' }}>
            Destructive actions. Cannot be undone.
          </p>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="btn btn-danger"
              style={{ fontSize: '0.78em', padding: '0.3rem 0.75rem' }}
              onClick={onResetWorkspaceLinks}
            >
              ✕ Clear all sections &amp; links
            </button>
          </div>

        </Group>

      </div>

      {/* ── Fixed footer — Save / Close ─────────────────────── */}
      <div className="settings-footer" data-side={side}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={() => { onSave(); }}
        >
          Save theme
        </button>
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </>
  )
}