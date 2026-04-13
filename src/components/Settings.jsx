import { useState, useRef, useEffect, useMemo } from 'react'

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
const DEFAULT_SECTION_ORDER = ['background','wallpaper','colours','typography','layout','cards','visibility','clock','favicons','notes','search','workspaces','importExport','danger','bookmarks']

function Row({ label, children, dimLabel = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '1.5rem', padding: '0.28rem 0', minHeight: '1.8rem',
    }}>
      <span style={{ fontSize: '0.82em', color: dimLabel ? 'var(--text-muted)' : 'var(--text)',
        whiteSpace: 'nowrap', flexShrink: 0 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flexShrink: 0 }}>
        {children}
      </div>
    </div>
  )
}

function Slider({ val, min, max, step = 1, onChange, unit = '', label = '' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
      <input type="range" min={min} max={max} step={step} value={val}
        title={label || undefined} onChange={e => onChange(Number(e.target.value))}
        style={{ width: 80 }} />
      <span style={{ fontSize: '0.72em', color: 'var(--text-dim)', minWidth: '2.8em', textAlign: 'right' }}>
        {val}{unit}
      </span>
    </div>
  )
}

function ColorPick({ value, onChange, label = '' }) {
  const safe = (value || '#000000').replace(/[^#0-9a-fA-F]/g, '').slice(0, 7)
  const hex  = safe.length === 7 ? safe : '#000000'
  return <input type="color" className="color-input" title={label || undefined} value={hex} onChange={e => onChange(e.target.value)} />
}

function Toggle({ checked, onChange, label = '' }) {
  return (
    <label className="toggle" title={label || undefined}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="settings-title" style={{
      textAlign: 'center', fontWeight: 700, marginTop: '0.3rem',
      color: 'var(--settings-title-color, #7878a0)',
    }}>{children}</div>
  )
}

function Group({
  id, title, children, defaultOpen = false, signal,
  draggable = false, isDragging = false,
  onDragStart, onDragEnd, onDrop, onOpenChange,
  openState,
}) {
  const [open, setOpen] = useState(openState ?? defaultOpen)
  const lastSignal = useRef(null)

  useEffect(() => {
    if (!signal || signal === lastSignal.current) return
    setOpen(signal.open)
    onOpenChange?.(signal.open)
    lastSignal.current = signal
  }, [signal, onOpenChange])

  useEffect(() => {
    if (typeof openState === 'boolean') setOpen(openState)
  }, [openState])

  return (
    <div
      className="settings-section"
      draggable={draggable}
      onDragStart={e => {
        if (!draggable) return
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', id)
        onDragStart?.(id)
      }}
      onDragEnd={() => onDragEnd?.()}
      onDragOver={e => {
        if (!draggable) return
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }}
      onDrop={e => {
        if (!draggable) return
        e.preventDefault()
        onDrop?.(id)
      }}
      style={isDragging ? { opacity: 0.55 } : undefined}
    >
      <div className="settings-title settings-group-title" style={{
        cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', fontWeight: 700, textAlign: 'center',
        color: 'var(--settings-title-color, #7878a0)', gap: '0.35rem',
      }} onClick={() => { const next = !open; setOpen(next); onOpenChange?.(next) }}>
        <div className="settings-group-actions settings-group-actions-left" style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {draggable && (
            <button type="button" className="settings-drag-handle" draggable title="Drag to reorder" aria-label="Drag to reorder" style={{ cursor: 'grab' }} onDragStart={e => { setDragging(true); onDragStart?.(id); try { e.dataTransfer.effectAllowed = 'move' } catch {} }} onDragEnd={e => { setDragging(false); onDragEnd?.(e) }} onDragOver={e => { if (!draggable) return; e.preventDefault() }} onDrop={e => { if (!draggable) return; e.preventDefault(); onDrop?.(id); setDragging(false) }}>
              ⋮⋮
            </button>
          )}
        </div>
        <span style={{ flex: 1, textAlign: 'center' }}>{title}</span>
        <button type="button" className="settings-chevron" title={open ? 'Collapse section' : 'Expand section'} aria-label={open ? 'Collapse section' : 'Expand section'} onClick={e => { e.stopPropagation(); const next = !open; setOpen(next); onOpenChange?.(next) }}>
          {open ? '▲' : '▼'}
        </button>
      </div>
      {open && <div style={{ marginTop: '0.4rem' }}>{children}</div>}
    </div>
  )
}

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
  const [newWsName, setNewWsName] = useState('')
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
  const forceSync = () => window.postMessage({ type: 'SP_FORCE_SYNC' }, '*')
  const [groupSignal, setGroupSignal] = useState(null)
  const [draggedSection, setDraggedSection] = useState(null)
  const bgFileRef = useRef(null)

  const set = (key, val) => setTheme(prev => ({ ...prev, [key]: val }))
  const normalizeOrder = (order) => {
    const source = Array.isArray(order) ? order : []
    const deduped = []
    for (const id of source) {
      if (DEFAULT_SECTION_ORDER.includes(id) && !deduped.includes(id)) deduped.push(id)
    }
    for (const id of DEFAULT_SECTION_ORDER) {
      if (!deduped.includes(id)) deduped.push(id)
    }
    return deduped
  }
  const sectionOrder = useMemo(() => normalizeOrder(theme.settingsSectionOrder), [theme.settingsSectionOrder])
  const [openSections, setOpenSections] = useState(() => {
    const src = theme.settingsOpenSections
    if (src && typeof src === 'object') return src
    return {}
  })

  useEffect(() => {
    if (theme.settingsOpenSections && typeof theme.settingsOpenSections === 'object') {
      setOpenSections(theme.settingsOpenSections)
    }
  }, [theme.settingsOpenSections])

  const setSectionOpen = (sectionId, isOpen) => {
    setOpenSections(prev => {
      const next = { ...prev, [sectionId]: isOpen }
      set('settingsOpenSections', next)
      return next
    })
  }

  const moveSection = (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return
    const next = [...sectionOrder]
    const fromIndex = next.indexOf(fromId)
    const toIndex = next.indexOf(toId)
    if (fromIndex < 0 || toIndex < 0) return
    const [item] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, item)
    set('settingsSectionOrder', next)
  }
  const resetSectionOrder = () => set('settingsSectionOrder', DEFAULT_SECTION_ORDER)
  const side    = theme.settingsSide || 'right'
  const allOpen = groupSignal?.open !== false
  const toggleAllGroups = () => setGroupSignal({ open: !allOpen, t: Date.now() })

  return (
    <>
      <div className="settings-veil" onClick={onClose} />

      <div className="settings-panel" data-side={side} style={{ width: 'min(380px, 74vw)' }}>

        <style>{`
          .settings-group-title:hover .settings-group-actions,
          .settings-group-title:focus-within .settings-group-actions,
          .settings-group-title:hover .settings-chevron,
          .settings-group-title:focus-within .settings-chevron,
          .settings-section[draggable="true"] .settings-group-actions:has(.settings-drag-handle:focus-visible),
          .settings-chevron:focus-visible { opacity: 1; }
          .settings-group-actions { opacity: 0; transition: opacity 140ms ease; }
          .settings-group-actions-left { min-width: 1rem; justify-content: flex-start; }
          .settings-drag-handle {
            appearance: none;
            background: transparent;
            border: 0;
            box-shadow: none;
            border-radius: 0;
            color: var(--settings-title-color, #7878a0);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-size: 1.08rem;
            line-height: 1;
            padding: 0;
            min-width: 1rem;
            height: auto;
            opacity: 0.9;
          }
          .settings-drag-handle:hover { color: var(--text); }
          .settings-drag-handle:active { cursor: grabbing; }
          .settings-chevron {
            appearance: none;
            background: transparent;
            border: 0;
            box-shadow: none;
            border-radius: 0;
            color: var(--settings-title-color, #7878a0);
            font-size: 0.9em;
            line-height: 1;
            opacity: 0.35;
            padding: 0;
            min-width: 1rem;
            transition: opacity 140ms ease, color 140ms ease;
          }
          .settings-chevron:hover { color: var(--text); opacity: 1; }
        `}</style>

        <div className="settings-header">
          <span style={{ fontWeight: 600, fontSize: '0.95em', letterSpacing: '0.02em' }}>Settings</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button className="icon-btn" style={{ fontSize: '1rem', width: '2rem', height: '2rem' }} title={allOpen ? 'Collapse all' : 'Expand all'} onClick={toggleAllGroups}>{allOpen ? '▴' : '▾'}</button>
            <button className="icon-btn" style={{ fontSize: '1rem', width: '2rem', height: '2rem' }} title="Reset settings section order" onClick={resetSectionOrder}>↺</button>
            <button className="icon-btn" style={{ fontSize: '1rem', width: '2rem', height: '2rem' }} title="Move panel" onClick={() => set('settingsSide', side === 'right' ? 'left' : 'right')}>{side === 'right' ? '←' : '→'}</button>
            <button className="icon-btn" style={{ fontSize: '1rem', width: '2rem', height: '2rem' }} onClick={onClose} title="Close (Esc)">✕</button>
          </div>
        </div>


        {sectionOrder.map((sectionId, index) => {
          const commonGroupProps = {
            key: sectionId,
            id: sectionId,
            signal: groupSignal,
            draggable: false,
            isDragging: draggedSection === sectionId,
            openState: openSections[sectionId] ?? false,
            onOpenChange: (isOpen) => setSectionOpen(sectionId, isOpen),
            onDragStart: setDraggedSection,
            onDragEnd: () => setDraggedSection(null),
            onDrop: (targetId) => {
              moveSection(draggedSection, targetId)
              setDraggedSection(null)
            },
          }

          if (sectionId === 'background') return (
            <Group title="Background" {...commonGroupProps}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', marginBottom: '0.4rem' }}>
                {BG_PRESETS.map(p => (
                  <button key={p.value} className={`btn-xs${theme.bgPreset === p.value ? ' btn-primary' : ''}`}
                    onClick={() => set('bgPreset', p.value)}>{p.label}</button>
                ))}
              </div>

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
                          <Slider label="Star density" val={gp('density', 3)} min={1} max={5} step={1} onChange={v => sp('density', v)} />
                        </Row>
                        <SectionTitle>Planets</SectionTitle>
                        <Row label="Show planets">
                          <Toggle label="Show planets" checked={gp('planets', false)} onChange={v => sp('planets', v)} />
                        </Row>
                        {gp('planets', false) && (
                          <Row label="Planet count">
                            <Slider label="Planet count" val={gp('planetCount', 2)} min={1} max={3} step={1} onChange={v => sp('planetCount', v)} />
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
          )

          if (sectionId === 'wallpaper') return (
            <Group title="Wallpaper overlay" defaultOpen={false} {...commonGroupProps}>
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
          )

          if (sectionId === 'colours') return (
            <Group title="Colours" defaultOpen={false} {...commonGroupProps}>
              <SectionTitle>Surfaces</SectionTitle>
              <Row label="Background"><ColorPick label="Background" value={theme.bg} onChange={v => set('bg', v)} /></Row>
              <Row label="Surface 2"><ColorPick label="Surface 2" value={theme.bg2} onChange={v => set('bg2', v)} /></Row>
              <Row label="Surface 3"><ColorPick label="Surface 3" value={theme.bg3} onChange={v => set('bg3', v)} /></Row>
              <Row label="Card">
                <ColorPick label="Card" value={(theme.card || '#13131a').replace(/[^#0-9a-fA-F]/g, '').slice(0, 7)} onChange={v => set('card', v)} />
              </Row>
              <SectionTitle>Borders</SectionTitle>
              <Row label="Border"><ColorPick label="Border" value={theme.border} onChange={v => set('border', v)} /></Row>
              <Row label="Border hover"><ColorPick label="Border hover" value={theme.borderHover} onChange={v => set('borderHover', v)} /></Row>
              <Row label="Border opacity"><Slider label="Border opacity" val={Math.round((theme.borderOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('borderOpacity', v / 100)} unit="%" /></Row>
              <SectionTitle>Text</SectionTitle>
              <Row label="Text"><ColorPick label="Text" value={theme.text} onChange={v => set('text', v)} /></Row>
              <Row label="Text dim"><ColorPick label="Text dim" value={theme.textDim} onChange={v => set('textDim', v)} /></Row>
              <Row label="Title / label"><ColorPick label="Title / label" value={theme.titleColor || theme.textDim} onChange={v => set('titleColor', v)} /></Row>
              <SectionTitle>Accent &amp; state</SectionTitle>
              <Row label="Accent"><ColorPick label="Accent" value={theme.accent} onChange={v => set('accent', v)} /></Row>
              <Row label="Danger"><ColorPick label="Danger" value={theme.danger} onChange={v => set('danger', v)} /></Row>
              <Row label="Success"><ColorPick label="Success" value={theme.success} onChange={v => set('success', v)} /></Row>
              <SectionTitle>Buttons</SectionTitle>
              <Row label="Button bg"><ColorPick label="Button bg" value={theme.btnBg} onChange={v => set('btnBg', v)} /></Row>
              <Row label="Button text"><ColorPick label="Button text" value={theme.btnText} onChange={v => set('btnText', v)} /></Row>
              <SectionTitle>Settings panel</SectionTitle>
              <Row label="Section title colour"><ColorPick label="Section title colour" value={theme.settingsTitleColor || '#7878a0'} onChange={v => set('settingsTitleColor', v)} /></Row>
              <Row label="Scrollbar colour"><ColorPick label="Scrollbar colour" value={theme.settingsScrollbarColor || theme.accent || '#6c8fff'} onChange={v => set('settingsScrollbarColor', v)} /></Row>
            </Group>
          )

          if (sectionId === 'typography') return (
            <Group title="Fonts" defaultOpen={false} {...commonGroupProps}>
              <Row label="Font family">
                <select className="input" style={{ maxWidth: 160, fontSize: '0.8em' }}
                  value={theme.font} onChange={e => set('font', e.target.value)}>
                  {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </Row>
              <Row label="Body font size"><Slider label="Body font size" val={theme.fontSize ?? 14} min={10} max={20} onChange={v => set('fontSize', v)} unit="px" /></Row>
              <Row label="Topbar font size"><Slider label="Topbar font size" val={theme.topbarFontSize ?? 12} min={9} max={20} onChange={v => set('topbarFontSize', v)} unit="px" /></Row>
              <Row label="Settings font size"><Slider label="Settings font size" val={theme.settingsFontSize ?? 13} min={10} max={20} onChange={v => set('settingsFontSize', v)} unit="px" /></Row>
            </Group>
          )

          if (sectionId === 'layout') return (
            <Group title="Layout & spacing" defaultOpen={false} {...commonGroupProps}>
              <Row label="Columns"><Slider label="Columns" val={theme.sectionsCols ?? 4} min={1} max={10} onChange={v => set('sectionsCols', v)} /></Row>
              <Row label="Topbar → cards gap"><Slider label="Topbar → cards gap" val={theme.mainGapTop ?? 12} min={0} max={150} step={2} onChange={v => set('mainGapTop', v)} unit="px" /></Row>
              <Row label="Section gap (v)"><Slider label="Section gap (v)" val={theme.sectionGap ?? 0} min={0} max={32} onChange={v => set('sectionGap', v)} unit="px" /></Row>
              <Row label="Section gap (h)"><Slider label="Section gap (h)" val={theme.sectionGapH ?? 0} min={0} max={32} onChange={v => set('sectionGapH', v)} unit="px" /></Row>
              <Row label="Link gap"><Slider label="Link gap" val={Math.round((theme.linkGap ?? 0.5) * 100)} min={0} max={200} step={5} onChange={v => set('linkGap', v / 100)} unit="%" /></Row>
              <Row label="Link left padding"><Slider label="Link left padding" val={Math.round((theme.linksPaddingH ?? 0.75) * 100)} min={-125} max={200} step={5} onChange={v => set('linksPaddingH', v / 100)} unit="%" /></Row>
              <Row label="Link handle size"><Slider label="Link handle size" val={theme.linkHandleSize ?? 13} min={10} max={24} onChange={v => set('linkHandleSize', v)} unit="px" /></Row>
              <Row label="Link handle opacity"><Slider label="Link handle opacity" val={Math.round((theme.linkHandleOpacity ?? 0.7) * 100)} min={0} max={100} onChange={v => set('linkHandleOpacity', v / 100)} unit="%" /></Row>
              <div style={{ paddingTop: '0.65rem', paddingBottom: '0.65rem' }}>
                <SectionTitle>Page scale</SectionTitle>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.35rem' }}>
                  {PAGE_SCALES.map(v => (
                    <button key={v} className={`btn-xs${Math.abs((theme.pageScale ?? 1) - v) < 0.01 ? ' btn-primary' : ''}`} onClick={() => set('pageScale', v)}>
                      {Math.round(v * 100)}%
                    </button>
                  ))}
                </div>
              </div>
            </Group>
          )

          if (sectionId === 'cards') return (
            <Group title="Cards & borders" defaultOpen={false} {...commonGroupProps}>
              <Row label="Card opacity"><Slider label="Card opacity" val={Math.round((theme.cardOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('cardOpacity', v / 100)} unit="%" /></Row>
              <Row label="Card corner radius"><Slider label="Card corner radius" val={theme.radius ?? 10} min={0} max={24} onChange={v => set('radius', v)} unit="px" /></Row>
              <Row label="Card handle size"><Slider label="Card handle size" val={theme.cardHandleSize ?? 13} min={10} max={24} onChange={v => set('cardHandleSize', v)} unit="px" /></Row>
              <Row label="Card handle opacity"><Slider label="Card handle opacity" val={Math.round((theme.cardHandleOpacity ?? 0.7) * 100)} min={0} max={100} onChange={v => set('cardHandleOpacity', v / 100)} unit="%" /></Row>
              <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.3rem' }}>
                {[{ l: 'Sharp', v: 0 }, { l: 'Normal', v: 10 }, { l: 'Round', v: 20 }].map(p => (
                  <button key={p.v} className={`btn-xs${theme.radius === p.v ? ' btn-primary' : ''}`} onClick={() => set('radius', p.v)}>{p.l}</button>
                ))}
              </div>
              <Row label="Section corner radius"><Slider label="Section corner radius" val={theme.sectionRadius ?? 0} min={0} max={24} onChange={v => set('sectionRadius', v)} unit="px" /></Row>
            </Group>
          )

          if (sectionId === 'visibility') return <Group title="Visibility" defaultOpen={false} {...commonGroupProps}><Row label="Show clock"><Toggle label="Show clock" checked={!(theme.hideClock ?? false)} onChange={v => set('hideClock', !v)} /></Row><Row label="Show weather"><Toggle label="Show weather" checked={!(theme.hideWeather ?? false)} onChange={v => set('hideWeather', !v)} /></Row><Row label="Show search bar"><Toggle label="Show search bar" checked={!(theme.hideSearch ?? false)} onChange={v => set('hideSearch', !v)} /></Row><Row label="Show cards"><Toggle label="Show cards" checked={!(theme.hideCards ?? false)} onChange={v => set('hideCards', !v)} /></Row><Row label="Show notes"><Toggle label="Show notes" checked={!(theme.hideNotes ?? false)} onChange={v => set('hideNotes', !v)} /></Row></Group>
          if (sectionId === 'clock') return <Group title="Clock" defaultOpen={false} {...commonGroupProps}><Row label="Clock widget size"><Slider label="Clock widget size" val={Math.round((theme.clockWidgetSize ?? 1) * 10)} min={5} max={30} onChange={v => set('clockWidgetSize', v / 10)} unit="×" /></Row></Group>
          if (sectionId === 'favicons') return <Group title="Favicons" defaultOpen={false} {...commonGroupProps}><Row label="Show favicons"><Toggle label="Show favicons" checked={theme.faviconEnabled ?? true} onChange={v => set('faviconEnabled', v)} /></Row><Row label="Favicon size"><Slider label="Favicon size" val={theme.faviconSize ?? 13} min={10} max={24} onChange={v => set('faviconSize', v)} unit="px" /></Row><Row label="Favicon opacity"><Slider label="Favicon opacity" val={Math.round((theme.faviconOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('faviconOpacity', v / 100)} unit="%" /></Row><Row label="Greyscale"><Toggle label="Greyscale" checked={theme.faviconGreyscale ?? false} onChange={v => set('faviconGreyscale', v)} /></Row><Row label="Load delay"><Slider label="Load delay" val={theme.faviconDelay ?? 0} min={0} max={5} step={0.5} onChange={v => set('faviconDelay', v)} unit="s" /></Row><Row label="Fade-in duration"><Slider label="Fade-in duration" val={theme.faviconFade ?? 0.3} min={0} max={2} step={0.1} onChange={v => set('faviconFade', v)} unit="s" /></Row></Group>
          if (sectionId === 'notes') return <Group title="Notes" defaultOpen={false} {...commonGroupProps}><Row label="Font size"><Slider label="Font size" val={theme.notesFontSize ?? 13} min={10} max={20} onChange={v => set('notesFontSize', v)} unit="px" /></Row><Row label="Gap between notes"><Slider label="Gap between notes" val={theme.notesGap ?? 0} min={0} max={32} onChange={v => set('notesGap', v)} unit="px" /></Row><Row label="Note card background"><ColorPick label="Note card background" value={theme.notesCardBg || '#13131a'} onChange={v => set('notesCardBg', v)} /></Row><Row label="Note card bg opacity"><Slider label="Note card bg opacity" val={Math.round((theme.notesCardBgOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('notesCardBgOpacity', v / 100)} unit="%" /></Row><Row label="Note text colour"><ColorPick label="Note text colour" value={theme.notesTextColor || '#e8e8f0'} onChange={v => set('notesTextColor', v)} /></Row><Row label="Note text background"><ColorPick label="Note text background" value={theme.notesTextBg || '#0c0c0f'} onChange={v => set('notesTextBg', v)} /></Row></Group>
          if (sectionId === 'search') return <Group title="Search" defaultOpen={false} {...commonGroupProps}><SectionTitle>Search engine</SectionTitle><Row label="Engine URL"><input className="input" style={{ fontSize: '0.78em' }} value={theme.searchEngineUrl || 'https://www.google.com.au/search?q='} onChange={e => set('searchEngineUrl', e.target.value)} placeholder="https://www.google.com.au/search?q=" /></Row><SectionTitle>Presets</SectionTitle><div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', padding: '0 0.75rem 0.4rem' }}><button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://www.google.com.au/search?q=')}>Google</button><button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://www.bing.com/search?q=')}>Bing</button><button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://duckduckgo.com/?q=')}>DuckDuckGo</button><button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://search.brave.com/search?q=')}>Brave</button><button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://www.perplexity.ai/search?q=')}>Perplexity</button></div><Row label="Open results"><select className="input" style={{ fontSize: '0.78em' }} value={(theme.openInNewTab ?? true) ? 'new' : 'same'} onChange={e => set('openInNewTab', e.target.value === 'new')}><option value="new">New tab</option><option value="same">Same tab</option></select></Row><Row label="Open links in new window"><Toggle label="Open links in new window" checked={theme.linksOpenNewWindow ?? true} onChange={v => set('linksOpenNewWindow', v)} /></Row></Group>
          if (sectionId === 'workspaces') return <Group title="Workspaces" defaultOpen={false} {...commonGroupProps}><div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.4rem' }}>{workspaces.map(ws => (<div key={ws.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.45rem', borderRadius: 'var(--radius-sm)', background: ws.id === activeWs ? 'var(--accent-dim)' : 'transparent', border: `1px solid ${ws.id === activeWs ? 'var(--accent)' : 'transparent'}` }}><span style={{ flex: 1, fontSize: '0.82em', cursor: 'pointer', color: ws.id === activeWs ? 'var(--accent)' : 'var(--text-dim)' }} onClick={() => onSetActiveWs(ws.id)}>{ws.name}</span><button className="btn-xs" onClick={() => { const n = prompt('Rename workspace:', ws.name); if (n?.trim()) onRenameWorkspace(ws.id, n.trim()) }}>✎</button><button className="btn-xs" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => onDeleteWorkspace(ws.id)} disabled={workspaces.length <= 1}>✕</button></div>))}</div><div style={{ display: 'flex', gap: '0.35rem' }}><input className="input" style={{ flex: 1, fontSize: '0.8em' }} placeholder="New workspace name…" value={newWsName} onChange={e => setNewWsName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newWsName.trim()) { onAddWorkspace(newWsName.trim()); setNewWsName('') } }} /><button className="btn-xs btn-primary" disabled={!newWsName.trim()} onClick={() => { if (newWsName.trim()) { onAddWorkspace(newWsName.trim()); setNewWsName('') } }}>Add</button></div></Group>
          if (sectionId === 'importExport') return <Group title="Import / Export" defaultOpen={false} {...commonGroupProps}><div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}><button className="btn-xs" onClick={onExportBackup}>↓ Full backup (JSON)</button><button className="btn-xs" onClick={onExportCSV}>↓ Links CSV</button></div><div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}><button className="btn-xs" disabled={importingBackup} onClick={() => backupFileRef.current?.click()}>{importingBackup ? '⟳ Importing…' : '↑ Import JSON / CSV'}</button></div><input ref={backupFileRef} type="file" accept="application/json,.json,.csv,text/csv" style={{ display: 'none' }} onChange={onImportBackup} /></Group>
          if (sectionId === 'danger') return <Group title="Danger zone" defaultOpen={false} {...commonGroupProps}><p style={{ fontSize: '0.78em', color: 'var(--text-dim)', lineHeight: 1.5, margin: '0.2rem 0 0.5rem' }}>Destructive — cannot be undone.</p><div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}><button className="btn btn-danger" style={{ fontSize: '0.78em', padding: '0.28rem 0.7rem' }} onClick={onResetWorkspaceLinks}>✕ Clear all sections &amp; links</button><button className="btn btn-danger" style={{ fontSize: '0.78em', padding: '0.28rem 0.7rem' }} onClick={() => { if (confirm('Reset all theme settings to defaults?')) onResetTheme() }}>↺ Reset theme to defaults</button></div></Group>
          if (sectionId === 'bookmarks') return <Group title="Bookmarks" defaultOpen={false} {...commonGroupProps}><Row label="Extension status"><span style={{ fontSize: '0.8em', color: bookmarkCount > 0 ? 'var(--success, #4caf50)' : 'var(--text-muted)' }}>{bookmarkCount > 0 ? `● ${bookmarkCount} bookmarks synced` : '○ Extension not detected'}</span></Row>{bookmarkCount > 0 && (<Row label="Re-sync"><button className="btn btn-primary" style={{ fontSize: '0.8em' }} onClick={forceSync}>↻ Force sync</button></Row>)}<Row label="Result font size"><Slider label="Result font size" val={theme.bmFontSize ?? 13} min={9} max={18} step={1} unit="px" onChange={v => setTheme(t => ({ ...t, bmFontSize: v }))} /></Row><Row label="Result background"><ColorPick label="Result background colour" value={theme.bmResultBg || '#13131a'} onChange={v => setTheme(t => ({ ...t, bmResultBg: v }))} /></Row><Row label="Result text colour"><ColorPick label="Result text colour" value={theme.bmResultText || '#e8e8f0'} onChange={v => setTheme(t => ({ ...t, bmResultText: v }))} /></Row>{bmFolders && bmFolders.length > 0 && (<><SectionTitle>Folder visibility</SectionTitle><div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>{bmFolders.map(f => (<label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0', paddingLeft: (f.depth * 12) + 'px', cursor: 'pointer', fontSize: '0.82em', color: hiddenFolders.includes(f.id) ? 'var(--text-muted)' : 'var(--text)', opacity: hiddenFolders.includes(f.id) ? 0.5 : 1 }}><input type="checkbox" checked={!hiddenFolders.includes(f.id)} onChange={() => toggleFolder(f.id)} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />{f.title}</label>))}</div></>)}{(!bmFolders || bmFolders.length === 0) && (<div style={{ fontSize: '0.8em', color: 'var(--text-muted)', padding: '0.5rem 0', lineHeight: 1.5 }}>Install the browser extension to enable bookmark search in the topbar.</div>)}</Group>
          return null
        })}
      </div>

      {onSignOut && (
        <div style={{ padding: '0.45rem 0.75rem', borderTop: '1px solid var(--border)', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
          fontSize: '0.78em', color: 'var(--text-muted)' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userEmail || 'Signed in'}
          </span>
          <button className="btn" style={{ flexShrink: 0, fontSize: '0.85em', padding: '0.2rem 0.6rem' }}
            onClick={onSignOut}>Sign out</button>
        </div>
      )}
      <div className="settings-footer" data-side={side} style={{ zIndex: 102, width: 'min(380px, 74vw)' }}>
        <button className="btn btn-primary" style={{ flex: 1 }}
          onClick={() => { onSave(); onClose() }}>Save &amp; Close</button>
        <button className="btn" onClick={onClose}>Close</button>
      </div>
    </>
  )
}
