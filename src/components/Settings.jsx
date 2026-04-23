import { useState, useRef, useEffect, useMemo } from 'react'
import { supabase } from '../lib/supabase'

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
  { label: 'Roboto',         value: 'Roboto, sans-serif'          },
  { label: 'Open Sans',      value: "'Open Sans', sans-serif"     },
  { label: 'Lato',           value: 'Lato, sans-serif'            },
  { label: 'Noto Sans',      value: "'Noto Sans', sans-serif"     },
  { label: 'Work Sans',      value: "'Work Sans', sans-serif"     },
  { label: 'Manrope',        value: 'Manrope, sans-serif'         },
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
const DEFAULT_SECTION_ORDER = ['background','wallpaper','colours','notesColors','typography','gradient','layout','cards','notes','themePresets','visibility','clock','favicons','search','news','calendar','workspaces','importExport','bookmarks','danger']

function Row({ label, children, dimLabel = false }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: '1.5rem', padding: '0.28rem 0', minHeight: '1.8rem',
    }}>
      <span style={{ fontSize: '0.82em', color: dimLabel ? 'var(--text-muted)' : 'var(--text)',
        whiteSpace: 'nowrap', flexShrink: 0, fontWeight: 600 }}>{label}</span>
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
      textAlign: 'left', fontWeight: 600, marginTop: '0.3rem',
      color: 'var(--settings-subtitle-color)',
      paddingLeft: '0.75rem',
      fontSize: '0.85em',
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
      style={isDragging ? { opacity: 0.55 } : undefined}
    >
      <div className="settings-title settings-group-title" style={{
        cursor: 'pointer', userSelect: 'none', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', fontWeight: 700, textAlign: 'center',
        color: 'var(--settings-title-color, #7878a0)', gap: '0.35rem',
      }} onClick={() => { const next = !open; setOpen(next); onOpenChange?.(next) }}>
        <div className="settings-group-actions settings-group-actions-left" style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
          {draggable && (
            <button type="button" className="settings-drag-handle" draggable title="Drag to reorder" aria-label="Drag to reorder" style={{ cursor: 'grab' }} onDragStart={e => { setDragging(true); try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', id) } catch {} ; onDragStart?.(id) }} onDragEnd={e => { setDragging(false); onDragEnd?.(e) }} onDragOver={e => { if (!draggable) return; e.preventDefault() }} onDrop={e => { if (!draggable) return; e.preventDefault(); onDrop?.(id); setDragging(false) }}>
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
  onExportBackup, onExportCSV, onExportTheme, onImportTheme, onImportBackup,
  onResetWorkspaceLinks, onResetTheme,
  fileRef, backupFileRef, themeFileRef, importingBackup,
  workspaces, activeWs,
  mode, setMode,
  onAddWorkspace, onRenameWorkspace, onDeleteWorkspace, onSetActiveWs,
  onSignOut, userEmail,
  bmFolders, bookmarkCount,
  onClearAllNotes,
}) {
  const [activeTab, setActiveTab] = useState('design')
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

  // Theme presets state
  const [presets, setPresets] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sp_theme_presets') || '[]')
    } catch {
      return []
    }
  })

  const savePreset = (slot, name) => {
    const newPresets = [...presets]
    newPresets[slot] = {
      name: name || `Preset ${slot + 1}`,
      theme: { ...theme }
    }
    setPresets(newPresets)
    localStorage.setItem('sp_theme_presets', JSON.stringify(newPresets))
  }

  const loadPreset = (slot) => {
    if (presets[slot]?.theme) {
      setTheme(presets[slot].theme)
    }
  }

  const deletePreset = (slot) => {
    const newPresets = [...presets]
    newPresets[slot] = null
    setPresets(newPresets)
    localStorage.setItem('sp_theme_presets', JSON.stringify(newPresets))
  }

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

      <div className="settings-panel" data-side={side} style={{ width: 'min(380px, 74vw)', display: 'flex', flexDirection: 'column', height: '100%' }}>

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
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95em', letterSpacing: '0.02em' }}>Settings</span>
            <span style={{ fontSize: '0.65em', color: 'var(--text-dim)', opacity: 0.6 }}>
              v15.04.26
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button className="icon-btn" style={{ fontSize: '1rem', width: '2rem', height: '2rem' }} title={allOpen ? 'Collapse all' : 'Expand all'} onClick={toggleAllGroups}>{allOpen ? '▴' : '▾'}</button>
            <button className="icon-btn" style={{ fontSize: '1rem', width: '2rem', height: '2rem' }} title="Reset settings section order" onClick={resetSectionOrder}>↺</button>
            <button className="icon-btn" style={{ fontSize: '0.72rem', width: '2.4rem', height: '2rem', whiteSpace: 'nowrap' }} title="Move panel to other side" onClick={() => set('settingsSide', side === 'right' ? 'left' : 'right')}>{side === 'right' ? '⇐ side' : 'side ⇒'}</button>
            <button className="icon-btn" style={{ fontSize: '1rem', width: '2rem', height: '2rem' }} onClick={onClose} title="Close (Esc)">✕</button>
          </div>
        </div>

        {workspaces.length > 1 && (
          <div style={{ 
            padding: '0.5rem 0.85rem', 
            fontSize: '0.75em', 
            color: 'var(--text-dim)', 
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}>
            <span style={{ opacity: 0.7 }}>Theme for:</span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {workspaces.find(w => w.id === activeWs)?.name || 'Current Workspace'}
            </span>
          </div>
        )}

        <div style={{ 
          display: 'flex', 
          gap: '0', 
          padding: '0.5rem 0.85rem 0', 
          background: 'var(--bg2)',
          borderBottom: '2px solid var(--border)'
        }}>
          {[
            { id: 'background', label: 'BG' },
            { id: 'design', label: 'Design' },
            { id: 'layout', label: 'Layout' },
            { id: 'general', label: 'General' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ 
                flex: 1,
                padding: '0.5rem 0.5rem',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent)' : '2px solid transparent',
                background: activeTab === tab.id ? 'var(--card)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-dim)',
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.82em',
                transition: 'all 0.15s ease',
                marginBottom: '-2px',
                borderRadius: '4px 4px 0 0',
                fontFamily: 'var(--font)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ 
          overflowY: 'auto', 
          overflowX: 'hidden',
          flex: 1,
          minHeight: 0,
          paddingRight: '14px'
        }}>
        {sectionOrder.filter(sectionId => {
          // Filter sections by active tab
          const backgroundSections = ['background', 'wallpaper']
          const designSections = ['colours', 'notesColors', 'typography', 'gradient']
          const layoutSections = ['layout', 'cards', 'notes', 'themePresets', 'visibility', 'clock', 'favicons']
          const generalSections = ['workspaces', 'search', 'news', 'calendar', 'importExport', 'bookmarks', 'danger']
          
          if (activeTab === 'background') return backgroundSections.includes(sectionId)
          if (activeTab === 'design') return designSections.includes(sectionId)
          if (activeTab === 'layout') return layoutSections.includes(sectionId)
          if (activeTab === 'general') return generalSections.includes(sectionId)
          return false
        }).map((sectionId, index) => {
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
              <SectionTitle>Preset</SectionTitle>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', padding: '0 0.75rem 0.5rem' }}>
                {[
                  { label: '01-Solid', v: '01-solid' },
                  { label: '02-Noise', v: '02-noise' },
                  { label: '03-Shapes', v: '03-dots' },
                  { label: '04-Grid', v: '04-grid' },
                  { label: '05-Gradient', v: '05-gradient' },
                  { label: '06-Mesh', v: '06-mesh' },
                  { label: '07-Nebula', v: '07-nebula' },
                  { label: '08-Star-Old', v: '16-starfield-old' },
                  { label: '09-Plasma', v: '17-plasma' },
                  { label: '10-Inferno', v: '18-inferno' },
                  { label: '11-Mint', v: '19-mint' },
                  { label: '12-Dusk', v: '20-dusk' },
                  { label: '13-Mono', v: '21-mono' },
                  { label: '14-Fog', v: '22-fog' },
                  { label: '15-Scan', v: '23-scan' },
                  { label: '16-Lt-Bokeh', v: '24-light-bokeh' },
                  { label: '17-Silver', v: '25-silver-radial' },
                  { label: '18-Wall', v: '26-wall-texture' },
                  { label: '19-Concrete', v: '27-concrete' },
                  { label: '20-Metal', v: '28-brushed-metal' },
                ].map(p => (
                  <button
                    key={p.v}
                    className={`btn-xs${theme.bgPreset === p.v ? ' btn-primary' : ''}`}
                    onClick={() => set('bgPreset', p.v)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Pattern colour and opacity - only for 02-noise, 04-grid */}
              {['02-noise', '04-grid'].includes(theme.bgPreset) && (
                <>
                  <Row label="Pattern colour">
                    <ColorPick
                      label="Pattern colour"
                      value={theme.patternColor || '#2a2a3a'}
                      onChange={v => set('patternColor', v)}
                    />
                  </Row>

                  <Row label="Pattern opacity">
                    <Slider
                      label="Pattern opacity"
                      val={Math.round((theme.patternOpacity ?? 1) * 100)}
                      min={0}
                      max={100}
                      onChange={v => set('patternOpacity', v / 100)}
                      unit="%"
                    />
                  </Row>
                </>
              )}

              <Row label="Animation speed">
                <Slider
                  label="Animation speed"
                  val={theme.bgAnimSpeed ?? 1}
                  min={0}
                  max={8}
                  step={0.1}
                  onChange={v => set('bgAnimSpeed', v)}
                  unit="×"
                />
              </Row>

              <Row label="Background blur">
                <Slider
                  label="Background blur"
                  val={theme.bgBlur ?? 0}
                  min={0}
                  max={40}
                  onChange={v => set('bgBlur', v)}
                  unit="px"
                />
              </Row>

              {/* Pattern colour/opacity - only for 02-Noise */}
              {theme.bgPreset === '02-noise' && (
                <>
                  <Row label="Noise opacity">
                    <Slider val={Math.round((theme.bgNoiseOpacity ?? 0.04) * 100)} min={0} max={20} onChange={v => set('bgNoiseOpacity', v / 100)} unit="%" />
                  </Row>
                </>
              )}

              {/* 03-Shapes Settings */}
              {theme.bgPreset === '03-dots' && (
                <>
                  <SectionTitle>Pattern type</SectionTitle>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', padding: '0 0.75rem 0.5rem' }}>
                    {['circles', 'squares', 'diamonds', 'hexagons', 'triangles', 'stars'].map(p => (
                      <button key={p} className={`btn-xs${theme.bgDotPattern === p ? ' btn-primary' : ''}`} onClick={() => set('bgDotPattern', p)}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </button>
                    ))}
                  </div>
                  <Row label="Primary colour"><ColorPick value={theme.bgC1 || '#2a4a6a'} onChange={v => set('bgC1', v)} /></Row>
                  <Row label="Secondary colour"><ColorPick value={theme.bgC2 || '#4a2a5a'} onChange={v => set('bgC2', v)} /></Row>
                  <Row label="Pattern size"><Slider val={theme.bgDotScale ?? 24} min={8} max={80} onChange={v => set('bgDotScale', v)} unit="px" /></Row>
                  <Row label="Opacity"><Slider val={Math.round((theme.bgShapeOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('bgShapeOpacity', v / 100)} unit="%" /></Row>
                </>
              )}

              {/* 04-Grid Settings */}
              {theme.bgPreset === '04-grid' && (
                <>
                  <Row label="Primary colour"><ColorPick value={theme.bgC1 || '#2a4a6a'} onChange={v => set('bgC1', v)} /></Row>
                  <Row label="Secondary colour"><ColorPick value={theme.bgC2 || '#4a2a5a'} onChange={v => set('bgC2', v)} /></Row>
                  <Row label="Grid spacing"><Slider val={theme.bgGridScale ?? 32} min={12} max={100} onChange={v => set('bgGridScale', v)} unit="px" /></Row>
                  <Row label="Line thickness"><Slider val={theme.bgGridThickness ?? 1} min={1} max={3} onChange={v => set('bgGridThickness', v)} unit="px" /></Row>
                  <Row label="Opacity"><Slider val={Math.round((theme.bgGridOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('bgGridOpacity', v / 100)} unit="%" /></Row>
                </>
              )}

              {/* 05-Gradient Settings */}
              {theme.bgPreset === '05-gradient' && (
                <>
                  <Row label="Color 1 (top-left)"><ColorPick value={theme.bgC1 || '#1a2a4a'} onChange={v => set('bgC1', v)} /></Row>
                  <Row label="Color 2 (center)"><ColorPick value={theme.bgC2 || '#2a1a3a'} onChange={v => set('bgC2', v)} /></Row>
                  <Row label="Color 3 (bottom-right)"><ColorPick value={theme.bgC3 || '#1a3a2a'} onChange={v => set('bgC3', v)} /></Row>
                  <Row label="Angle"><Slider val={theme.bgGradientAngle ?? 135} min={0} max={360} onChange={v => set('bgGradientAngle', v)} unit="°" /></Row>
                  <Row label="Animation speed"><Slider val={theme.bgGradientSpeed ?? 25} min={5} max={60} onChange={v => set('bgGradientSpeed', v)} unit="s" /></Row>
                </>
              )}

              {/* 08-Star-Old Settings */}
              {theme.bgPreset === '16-starfield-old' && (
                <>
                  <Row label="Sky top"><ColorPick value={theme.bgC1 || '#05050f'} onChange={v => set('bgC1', v)} /></Row>
                  <Row label="Sky bottom"><ColorPick value={theme.bgC2 || '#000308'} onChange={v => set('bgC2', v)} /></Row>
                  <Row label="Star tint"><ColorPick value={theme.bgC3 || '#c8d2ff'} onChange={v => set('bgC3', v)} /></Row>
                  <Row label="Star size"><Slider val={theme.bgStarSize ?? 1} min={0.5} max={3} step={0.1} onChange={v => set('bgStarSize', v)} unit="×" /></Row>
                  <Row label="Star density"><Slider val={theme.bgStarDensity ?? 100} min={50} max={150} onChange={v => set('bgStarDensity', v)} unit="%" /></Row>
                  <Row label="Animation speed"><Slider val={theme.bgStarSpeed ?? 1} min={0.2} max={3} step={0.1} onChange={v => set('bgStarSpeed', v)} unit="×" /></Row>
                </>
              )}

              {/* 09-Plasma Settings */}
              {theme.bgPreset === '17-plasma' && (
                <>
                  <Row label="Primary color"><ColorPick value={theme.bgPlasmaC1 || '#6c8fff'} onChange={v => set('bgPlasmaC1', v)} /></Row>
                  <Row label="Secondary color"><ColorPick value={theme.bgPlasmaC2 || '#6bffb8'} onChange={v => set('bgPlasmaC2', v)} /></Row>
                  <Row label="Accent color"><ColorPick value={theme.bgPlasmaC3 || '#9c6fff'} onChange={v => set('bgPlasmaC3', v)} /></Row>
                  <Row label="Animation speed"><Slider val={theme.bgPlasmaSpeed ?? 1} min={0.2} max={3} step={0.1} onChange={v => set('bgPlasmaSpeed', v)} unit="×" /></Row>
                  <Row label="Blur amount"><Slider val={theme.bgPlasmaBlur ?? 55} min={20} max={100} onChange={v => set('bgPlasmaBlur', v)} unit="px" /></Row>
                  <Row label="Intensity"><Slider val={theme.bgPlasmaFlow ?? 100} min={50} max={150} onChange={v => set('bgPlasmaFlow', v)} unit="%" /></Row>
                </>
              )}

              {/* 10-Inferno Settings */}
              {theme.bgPreset === '18-inferno' && (
                <>
                  <Row label="Fire color 1"><ColorPick value={theme.bgInfernoC1 || '#ff410a'} onChange={v => set('bgInfernoC1', v)} /></Row>
                  <Row label="Fire color 2"><ColorPick value={theme.bgInfernoC2 || '#ff8c00'} onChange={v => set('bgInfernoC2', v)} /></Row>
                  <Row label="Ember color"><ColorPick value={theme.bgInfernoC3 || '#dc1400'} onChange={v => set('bgInfernoC3', v)} /></Row>
                  <Row label="Animation speed"><Slider val={theme.bgInfernoSpeed ?? 1} min={0.2} max={3} step={0.1} onChange={v => set('bgInfernoSpeed', v)} unit="×" /></Row>
                  <Row label="Intensity"><Slider val={theme.bgInfernoIntensity ?? 100} min={50} max={150} onChange={v => set('bgInfernoIntensity', v)} unit="%" /></Row>
                </>
              )}

              {/* 11-Mint Settings */}
              {theme.bgPreset === '19-mint' && (
                <>
                  <Row label="Primary color"><ColorPick value={theme.bgMintC1 || '#00dc8c'} onChange={v => set('bgMintC1', v)} /></Row>
                  <Row label="Secondary color"><ColorPick value={theme.bgMintC2 || '#00beff'} onChange={v => set('bgMintC2', v)} /></Row>
                  <Row label="Accent color"><ColorPick value={theme.bgMintC3 || '#009664'} onChange={v => set('bgMintC3', v)} /></Row>
                  <Row label="Animation speed"><Slider val={theme.bgMintSpeed ?? 1} min={0.2} max={3} step={0.1} onChange={v => set('bgMintSpeed', v)} unit="×" /></Row>
                  <Row label="Saturation"><Slider val={theme.bgMintSat ?? 100} min={50} max={150} onChange={v => set('bgMintSat', v)} unit="%" /></Row>
                </>
              )}

              {/* 12-Dusk Settings */}
              {theme.bgPreset === '20-dusk' && (
                <>
                  <Row label="Primary color"><ColorPick value={theme.bgDuskC1 || '#b43ca0'} onChange={v => set('bgDuskC1', v)} /></Row>
                  <Row label="Secondary color"><ColorPick value={theme.bgDuskC2 || '#dc508c'} onChange={v => set('bgDuskC2', v)} /></Row>
                  <Row label="Accent color"><ColorPick value={theme.bgDuskC3 || '#8c28b4'} onChange={v => set('bgDuskC3', v)} /></Row>
                  <Row label="Animation speed"><Slider val={theme.bgDuskSpeed ?? 1} min={0.2} max={3} step={0.1} onChange={v => set('bgDuskSpeed', v)} unit="×" /></Row>
                  <Row label="Glow intensity"><Slider val={theme.bgDuskGlow ?? 100} min={50} max={150} onChange={v => set('bgDuskGlow', v)} unit="%" /></Row>
                </>
              )}

              {/* 13-Mono Settings */}
              {theme.bgPreset === '21-mono' && (
                <>
                  <Row label="Primary color"><ColorPick value={theme.bgMonoC1 || '#3c508c'} onChange={v => set('bgMonoC1', v)} /></Row>
                  <Row label="Secondary color"><ColorPick value={theme.bgMonoC2 || '#5064b4'} onChange={v => set('bgMonoC2', v)} /></Row>
                  <Row label="Accent color"><ColorPick value={theme.bgMonoC3 || '#324678'} onChange={v => set('bgMonoC3', v)} /></Row>
                  <Row label="Animation speed"><Slider val={theme.bgMonoSpeed ?? 1} min={0.2} max={3} step={0.1} onChange={v => set('bgMonoSpeed', v)} unit="×" /></Row>
                  <Row label="Contrast"><Slider val={theme.bgMonoContrast ?? 100} min={50} max={150} onChange={v => set('bgMonoContrast', v)} unit="%" /></Row>
                </>
              )}

              {/* 14-Fog Settings */}
              {theme.bgPreset === '22-fog' && (
                <>
                  <Row label="Mist color"><ColorPick value={theme.bgC1 || '#3a4a6e'} onChange={v => set('bgC1', v)} /></Row>
                  <Row label="Animation speed"><Slider val={theme.bgFogSpeed ?? 1} min={0.2} max={3} step={0.1} onChange={v => set('bgFogSpeed', v)} unit="×" /></Row>
                  <Row label="Density"><Slider val={theme.bgFogDensity ?? 100} min={30} max={150} onChange={v => set('bgFogDensity', v)} unit="%" /></Row>
                  <Row label="Blur amount"><Slider val={theme.bgFogBlur ?? 85} min={40} max={120} onChange={v => set('bgFogBlur', v)} unit="px" /></Row>
                </>
              )}

              {/* 15-Scan Settings */}
              {theme.bgPreset === '23-scan' && (
                <>
                  <Row label="Scan line color"><ColorPick value={theme.bgC1 || '#6c8fff'} onChange={v => set('bgC1', v)} /></Row>
                  <Row label="Background tint"><ColorPick value={theme.bgC2 || '#05050d'} onChange={v => set('bgC2', v)} /></Row>
                  <Row label="Cycle duration"><Slider val={theme.bgScanSpeed ?? 7} min={3} max={15} onChange={v => set('bgScanSpeed', v)} unit="s" /></Row>
                  <Row label="Line intensity"><Slider val={theme.bgScanIntensity ?? 100} min={50} max={200} onChange={v => set('bgScanIntensity', v)} unit="%" /></Row>
                  <Row label="Line thickness"><Slider val={theme.bgScanThickness ?? 1} min={1} max={5} onChange={v => set('bgScanThickness', v)} unit="px" /></Row>
                </>
              )}

              {/* 16-Lt-Bokeh Settings */}
              {theme.bgPreset === '24-light-bokeh' && (
                <>
                  <Row label="Bokeh color"><ColorPick value={theme.bgBokehColor || '#6c8fff'} onChange={v => set('bgBokehColor', v)} /></Row>
                  <Row label="Glow intensity"><Slider val={theme.bgBokehGlow ?? 100} min={50} max={150} onChange={v => set('bgBokehGlow', v)} unit="%" /></Row>
                  <Row label="Blur amount"><Slider val={theme.bgBokehBlur ?? 60} min={30} max={100} onChange={v => set('bgBokehBlur', v)} unit="px" /></Row>
                </>
              )}

              {/* 17-Silver Settings */}
              {theme.bgPreset === '25-silver-radial' && (
                <>
                  <Row label="Center color"><ColorPick value={theme.bgSilverC1 || '#3a4a5a'} onChange={v => set('bgSilverC1', v)} /></Row>
                  <Row label="Edge color"><ColorPick value={theme.bgSilverC2 || '#1a2a3a'} onChange={v => set('bgSilverC2', v)} /></Row>
                  <Row label="Shimmer intensity"><Slider val={theme.bgSilverShimmer ?? 100} min={50} max={150} onChange={v => set('bgSilverShimmer', v)} unit="%" /></Row>
                </>
              )}

              {/* 18-Wall Settings */}
              {theme.bgPreset === '26-wall-texture' && (
                <>
                  <Row label="Base color"><ColorPick value={theme.bgWallColor || '#0f0f15'} onChange={v => set('bgWallColor', v)} /></Row>
                  <Row label="Texture intensity"><Slider val={theme.bgWallTexture ?? 100} min={50} max={150} onChange={v => set('bgWallTexture', v)} unit="%" /></Row>
                  <Row label="Roughness"><Slider val={theme.bgWallRough ?? 100} min={50} max={150} onChange={v => set('bgWallRough', v)} unit="%" /></Row>
                </>
              )}

              {/* 19-Concrete Settings */}
              {theme.bgPreset === '27-concrete' && (
                <>
                  <Row label="Base color"><ColorPick value={theme.bgConcreteColor || '#54585a'} onChange={v => set('bgConcreteColor', v)} /></Row>
                  <Row label="Texture density"><Slider val={theme.bgConcreteDensity ?? 100} min={50} max={150} onChange={v => set('bgConcreteDensity', v)} unit="%" /></Row>
                </>
              )}

              {/* 20-Metal Settings */}
              {theme.bgPreset === '28-brushed-metal' && (
                <>
                  <Row label="Base color"><ColorPick value={theme.bgC1 || '#9a9fb0'} onChange={v => set('bgC1', v)} /></Row>
                  <Row label="Dark tone"><ColorPick value={theme.bgC2 || '#7a8090'} onChange={v => set('bgC2', v)} /></Row>
                  <Row label="Shine intensity"><Slider val={theme.bgMetalShine ?? 25} min={10} max={40} onChange={v => set('bgMetalShine', v)} unit="%" /></Row>
                  <Row label="Rotation speed"><Slider val={theme.bgMetalSpeed ?? 20} min={10} max={40} onChange={v => set('bgMetalSpeed', v)} unit="s" /></Row>
                  <Row label="Grain detail"><Slider val={theme.bgMetalGrain ?? 2} min={1} max={4} onChange={v => set('bgMetalGrain', v)} unit="px" /></Row>
                </>
              )}
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
              <SectionTitle>Background & Surfaces</SectionTitle>
              <Row label="Wallpaper background"><ColorPick value={theme.bg} onChange={v => set('bg', v)} /></Row>
              <Row label="Settings panel background"><ColorPick value={theme.bg2} onChange={v => set('bg2', v)} /></Row>
              <Row label="Buttons and misc"><ColorPick value={theme.bg3} onChange={v => set('bg3', v)} /></Row>
              <Row label="Card background">
                <ColorPick value={(theme.card || '#13131a').replace(/[^#0-9a-fA-F]/g, '').slice(0, 7)} onChange={v => set('card', v)} />
              </Row>
              <Row label="Note panel background">
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <ColorPick value={theme.notesCardBg || '#13131a'} onChange={v => set('notesCardBg', v)} />
                  <button className="btn-xs" onClick={() => set('notesCardBg', (theme.card || '#13131a').replace(/[^#0-9a-fA-F]/g, '').slice(0, 7))}>Match cards</button>
                </div>
              </Row>
              <Row label="Header row color"><ColorPick value={theme.colHeaderColor ?? '#8888b0'} onChange={v => set('colHeaderColor', v)} /></Row>
              <Row label="Header background"><ColorPick value={theme.titleBg || theme.card || '#13131a'} onChange={v => set('titleBg', v)} /></Row>

              <SectionTitle>Borders</SectionTitle>
              <Row label="Border"><ColorPick value={theme.border} onChange={v => set('border', v)} /></Row>
              <Row label="Border hover"><ColorPick value={theme.borderHover} onChange={v => set('borderHover', v)} /></Row>
              <Row label="Border opacity"><Slider val={Math.round((theme.borderOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('borderOpacity', v / 100)} unit="%" /></Row>

              <SectionTitle>Accent Colors</SectionTitle>
              <Row label="Accent"><ColorPick value={theme.accent} onChange={v => set('accent', v)} /></Row>
              <Row label="Link"><ColorPick value={theme.linkColor || '#5b9eff'} onChange={v => set('linkColor', v)} /></Row>

              <SectionTitle>Scrollbar</SectionTitle>
              <Row label="Track"><ColorPick value={theme.scrollbarColor || theme.bg3} onChange={v => set('scrollbarColor', v)} /></Row>
              <Row label="Thumb"><ColorPick value={theme.scrollbarThumbColor || theme.accent} onChange={v => set('scrollbarThumbColor', v)} /></Row>

              <SectionTitle>Buttons</SectionTitle>
              <Row label="Background"><ColorPick value={theme.btnBg} onChange={v => set('btnBg', v)} /></Row>
              <Row label="Text"><ColorPick value={theme.btnText} onChange={v => set('btnText', v)} /></Row>
            </Group>
          )

          if (sectionId === 'notesColors') return (
            <Group title="Notes Colors" defaultOpen={false} {...commonGroupProps}>
              <Row label="Note text"><ColorPick value={theme.notesTextColor || '#e8e8f0'} onChange={v => set('notesTextColor', v)} /></Row>
              <Row label="Note opacity"><Slider val={Math.round((theme.notesCardBgOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('notesCardBgOpacity', v / 100)} unit="%" /></Row>
              <Row label="Shared note background"><ColorPick value={theme.notesSharedBg || '#1a1a28'} onChange={v => set('notesSharedBg', v)} /></Row>
            </Group>
          )
          // New section for text colors and settings panel
          if (sectionId === 'typography') return (
            <Group title="Typography & Text Colors" defaultOpen={false} {...commonGroupProps}>
              <SectionTitle>Text Colors</SectionTitle>
              <Row label="Primary text"><ColorPick label="Primary text" value={theme.text} onChange={v => set('text', v)} /></Row>
              <Row label="Secondary text"><ColorPick label="Secondary text" value={theme.textDim} onChange={v => set('textDim', v)} /></Row>
              <Row label="Header / Label"><ColorPick label="Header / Label" value={theme.titleColor || theme.textDim} onChange={v => set('titleColor', v)} /></Row>
              
              <SectionTitle>Settings Panel Colors</SectionTitle>
              <Row label="Section title"><ColorPick label="Section title" value={theme.settingsTitleColor || '#7878a0'} onChange={v => set('settingsTitleColor', v)} /></Row>
              <Row label="Section subtitle"><ColorPick label="Section subtitle" value={theme.settingsSubtitleColor || '#7890ff'} onChange={v => set('settingsSubtitleColor', v)} /></Row>
              <Row label="Handle"><ColorPick label="Handle" value={theme.handleColor || theme.settingsTitleColor || theme.accent || '#7878a0'} onChange={v => set('handleColor', v)} /></Row>
              
              <SectionTitle>Font Settings</SectionTitle>
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
              <Row label="Link gap"><Slider val={Math.round((theme.linkGap ?? 0.5) * 100)} min={-50} max={200} step={5} onChange={v => set('linkGap', v / 100)} unit="%" /></Row>
              <Row label="Link left padding"><Slider label="Link left padding" val={Math.round((theme.linksPaddingH ?? 0.75) * 100)} min={-140} max={200} step={5} onChange={v => set('linksPaddingH', v / 100)} unit="%" /></Row>
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
              <Row label="Corner radius"><Slider val={theme.radius ?? 10} min={0} max={24} onChange={v => { set('radius', v); set('sectionRadius', v); set('notesRadius', v) }} unit="px" /></Row>
              <Row label="Card padding"><Slider label="Card padding" val={Math.round((theme.cardPadding ?? 0.75) * 100)} min={0} max={150} step={5} onChange={v => set('cardPadding', v / 100)} unit="%" /></Row>
              <Row label="Header height"><Slider label="Header height" val={Math.round((theme.headerPadding ?? 0.42) * 100)} min={10} max={80} step={2} onChange={v => set('headerPadding', v / 100)} unit="%" /></Row>
              
              <SectionTitle>Card Shadow</SectionTitle>
              <Row label="Enable shadow"><Toggle checked={theme.cardShadowEnabled ?? false} onChange={v => set('cardShadowEnabled', v)} /></Row>
              <Row label="Notes match cards"><Toggle checked={theme.notesShadowMatchCards ?? true} onChange={v => set('notesShadowMatchCards', v)} /></Row>
              {theme.cardShadowEnabled && (<>
                <Row label="Shadow size"><Slider val={theme.cardShadowSize ?? 8} min={0} max={60} onChange={v => set('cardShadowSize', v)} unit="px" /></Row>
                <Row label="Shadow opacity"><Slider val={Math.round((theme.cardShadowOpacity ?? 0.3) * 100)} min={0} max={100} onChange={v => set('cardShadowOpacity', v / 100)} unit="%" /></Row>
                <Row label="Shadow color"><ColorPick value={theme.cardShadowColor || '#000000'} onChange={v => set('cardShadowColor', v)} /></Row>
                <Row label="Direction">
                  <select className="input" style={{ fontSize: '0.78em' }} value={theme.cardShadowDirection || 'top-lit'} onChange={e => set('cardShadowDirection', e.target.value)}>
                    <option value="top-lit">Top-lit</option>
                    <option value="even">Even</option>
                  </select>
                </Row>
                <Row label="Fade curve">
                  <select className="input" style={{ fontSize: '0.78em' }} value={theme.cardShadowCurve || 'linear'} onChange={e => set('cardShadowCurve', e.target.value)}>
                    <option value="linear">Linear</option>
                    <option value="soft">Soft</option>
                    <option value="sharp">Sharp</option>
                    <option value="glow">Glow</option>
                  </select>
                </Row>
              </>)}
            </Group>
          )

          if (sectionId === 'themePresets') return (
            <Group title="Theme presets" defaultOpen={false} {...commonGroupProps}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(slot => (
                  <div key={slot} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.35rem', 
                    padding: '0.3rem 0.5rem',
                    background: 'var(--bg3)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)'
                  }}>
                    <span style={{ 
                      fontSize: '0.75em', 
                      color: 'var(--text-muted)', 
                      minWidth: '1.5em' 
                    }}>
                      {slot + 1}
                    </span>
                    <span style={{ 
                      flex: 1, 
                      fontSize: '0.82em', 
                      color: presets[slot] ? 'var(--text)' : 'var(--text-muted)',
                      fontStyle: presets[slot] ? 'normal' : 'italic'
                    }}>
                      {presets[slot]?.name || 'Empty slot'}
                    </span>
                    <button 
                      className="btn-xs btn-primary" 
                      onClick={() => {
                        const name = prompt('Name this preset:', presets[slot]?.name || `Preset ${slot + 1}`)
                        if (name !== null) savePreset(slot, name.trim() || `Preset ${slot + 1}`)
                      }}
                      title="Save current theme"
                    >
                      Save
                    </button>
                    {presets[slot] && (
                      <>
                        <button 
                          className="btn-xs" 
                          onClick={() => loadPreset(slot)}
                          title="Load this preset"
                        >
                          Load
                        </button>
                        <button 
                          className="btn-xs" 
                          style={{ color: 'var(--danger)' }}
                          onClick={() => {
                            if (confirm(`Delete "${presets[slot].name}"?`)) deletePreset(slot)
                          }}
                          title="Delete preset"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Group>
          )

          if (sectionId === 'visibility') return <Group title="Visibility" defaultOpen={false} {...commonGroupProps}><Row label="Show clock"><Toggle checked={!(theme.hideClock ?? false)} onChange={v => set('hideClock', !v)} /></Row><Row label="Show weather"><Toggle checked={!(theme.hideWeather ?? false)} onChange={v => set('hideWeather', !v)} /></Row><Row label="Show search bar"><Toggle checked={!(theme.hideSearch ?? false)} onChange={v => set('hideSearch', !v)} /></Row><Row label="Show cards"><Toggle checked={!(theme.hideCards ?? false)} onChange={v => set('hideCards', !v)} /></Row><Row label="Show notes"><Toggle checked={!(theme.hideNotes ?? false)} onChange={v => set('hideNotes', !v)} /></Row><SectionTitle>Links</SectionTitle><Row label="Open links in new tab"><Toggle checked={theme.openInNewTab ?? true} onChange={v => set('openInNewTab', v)} /></Row></Group>
          if (sectionId === 'clock') return <Group title="Clock" defaultOpen={false} {...commonGroupProps}><Row label="Clock widget size"><Slider label="Clock widget size" val={Math.round((theme.clockWidgetSize ?? 1) * 10)} min={5} max={30} onChange={v => set('clockWidgetSize', v / 10)} unit="×" /></Row></Group>
          if (sectionId === 'favicons') return <Group title="Favicons" defaultOpen={false} {...commonGroupProps}><Row label="Show favicons"><Toggle label="Show favicons" checked={theme.faviconEnabled ?? true} onChange={v => set('faviconEnabled', v)} /></Row><Row label="Favicon size"><Slider label="Favicon size" val={theme.faviconSize ?? 13} min={10} max={24} onChange={v => set('faviconSize', v)} unit="px" /></Row><Row label="Favicon opacity"><Slider label="Favicon opacity" val={Math.round((theme.faviconOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('faviconOpacity', v / 100)} unit="%" /></Row><Row label="Greyscale"><Toggle label="Greyscale" checked={theme.faviconGreyscale ?? false} onChange={v => set('faviconGreyscale', v)} /></Row><Row label="Load delay"><Slider label="Load delay" val={theme.faviconDelay ?? 0} min={0} max={5} step={0.5} onChange={v => set('faviconDelay', v)} unit="s" /></Row><Row label="Fade-in duration"><Slider label="Fade-in duration" val={theme.faviconFade ?? 0.3} min={0} max={2} step={0.1} onChange={v => set('faviconFade', v)} unit="s" /></Row></Group>
          if (sectionId === 'notes') return (
            <Group title="Notes" defaultOpen={false} {...commonGroupProps}>
              <Row label="Panel width"><Slider val={theme.notesWidth ?? 288} min={200} max={400} onChange={v => set('notesWidth', v)} unit="px" /></Row>
              <Row label="Font family">
                <select className="input" style={{ fontSize: '0.78em' }} value={theme.notesFontFamily || 'inherit'} onChange={e => set('notesFontFamily', e.target.value)}>
                  <option value="inherit">Same as app</option>
                  <option value="'DM Mono', monospace">DM Mono</option>
                  <option value="'Inter', sans-serif">Inter</option>
                  <option value="'Georgia', serif">Georgia</option>
                  <option value="'Courier New', monospace">Courier New</option>
                  <option value="system-ui, sans-serif">System UI</option>
                </select>
              </Row>
              <Row label="Font size"><Slider val={theme.notesFontSize ?? 13} min={10} max={20} onChange={v => set('notesFontSize', v)} unit="px" /></Row>
              <Row label="Word wrap"><Toggle checked={theme.notesWordWrap ?? true} onChange={v => set('notesWordWrap', v)} /></Row>
              <div style={{ padding: '0.75rem 0 0.25rem', borderTop: '1px solid var(--border)', marginTop: '0.5rem' }}>
                <button className="btn-xs" style={{ color: 'var(--danger)', borderColor: 'var(--danger)', width: '100%' }} onClick={onClearAllNotes}>
                  Clear All Notes
                </button>
              </div>
            </Group>
          )

          if (sectionId === 'gradient') return (
            <Group title="Gradient" defaultOpen={false} {...commonGroupProps}>
              <Row label="Enable gradient"><Toggle checked={theme.cardsGradientEnabled ?? false} onChange={v => set('cardsGradientEnabled', v)} /></Row>
              {theme.cardsGradientEnabled && (<>
                <Row label="Color Stop 1">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                    <ColorPick value={theme.cardsGradientColor1 || '#00ff88'} onChange={v => set('cardsGradientColor1', v)} />
                    <Slider val={theme.cardsGradientPos1 ?? 0} min={0} max={100} onChange={v => set('cardsGradientPos1', v)} unit="%" />
                  </div>
                </Row>
                <Row label="Color Stop 2">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                    <ColorPick value={theme.cardsGradientColor2 || '#00ccff'} onChange={v => set('cardsGradientColor2', v)} />
                    <Slider val={theme.cardsGradientPos2 ?? 50} min={0} max={100} onChange={v => set('cardsGradientPos2', v)} unit="%" />
                  </div>
                </Row>
                <Row label="Color Stop 3">
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', width: '100%' }}>
                    <ColorPick value={theme.cardsGradientColor3 || '#7b2ff7'} onChange={v => set('cardsGradientColor3', v)} />
                    <Slider val={theme.cardsGradientPos3 ?? 100} min={0} max={100} onChange={v => set('cardsGradientPos3', v)} unit="%" />
                  </div>
                </Row>
                <Row label="Type">
                  <select className="input" style={{ fontSize: '0.78em' }} value={theme.cardsGradientType || 'linear'} onChange={e => set('cardsGradientType', e.target.value)}>
                    <option value="linear">Linear</option>
                    <option value="radial">Radial</option>
                  </select>
                </Row>
                {theme.cardsGradientType === 'linear' && (
                  <Row label="Angle"><Slider val={theme.cardsGradientAngle ?? 180} min={0} max={360} onChange={v => set('cardsGradientAngle', v)} unit="°" /></Row>
                )}
                <Row label="Blend mode">
                  <select className="input" style={{ fontSize: '0.78em' }} value={theme.cardsGradientBlendMode || 'overlay'} onChange={e => set('cardsGradientBlendMode', e.target.value)}>
                    <option value="normal">Normal</option>
                    <option value="overlay">Overlay</option>
                    <option value="multiply">Multiply</option>
                    <option value="screen">Screen</option>
                    <option value="color">Color</option>
                    <option value="hue">Hue</option>
                    <option value="saturation">Saturation</option>
                    <option value="luminosity">Luminosity</option>
                  </select>
                </Row>
                <Row label="Opacity"><Slider val={Math.round((theme.cardsGradientOpacity ?? 0.5) * 100)} min={0} max={100} onChange={v => set('cardsGradientOpacity', v / 100)} unit="%" /></Row>
                <Row label="Apply to panels"><Toggle checked={theme.cardsGradientTargetPanels ?? true} onChange={v => set('cardsGradientTargetPanels', v)} /></Row>
                <Row label="Apply to wallpaper"><Toggle checked={theme.cardsGradientTargetWallpaper ?? false} onChange={v => set('cardsGradientTargetWallpaper', v)} /></Row>
                <Row label="Apply to borders"><Toggle checked={theme.cardsGradientTargetBorder ?? false} onChange={v => set('cardsGradientTargetBorder', v)} /></Row>
                <Row label="Apply to card titles"><Toggle checked={theme.cardsGradientTargetTitle ?? false} onChange={v => set('cardsGradientTargetTitle', v)} /></Row>
              </>)}
            </Group>
          )
          if (sectionId === 'news') return (
            <Group title="News" defaultOpen={false} {...commonGroupProps}>
              <Row label="Show news button"><Toggle checked={!(theme.hideNews ?? false)} onChange={v => set('hideNews', !v)} /></Row>
              <SectionTitle>Appearance</SectionTitle>
              <Row label="Font size"><Slider val={theme.newsFontSize ?? 12} min={9} max={18} onChange={v => set('newsFontSize', v)} unit="px" /></Row>
              <Row label="Padding H"><Slider val={theme.newsPaddingH ?? 14} min={4} max={32} onChange={v => set('newsPaddingH', v)} unit="px" /></Row>
              <Row label="Padding V"><Slider val={theme.newsPaddingV ?? 8} min={2} max={24} onChange={v => set('newsPaddingV', v)} unit="px" /></Row>
              <SectionTitle>Feeds</SectionTitle>
              {[
                { id: 'abc',      label: 'ABC News AU' },
                { id: 'guardian', label: 'Guardian AU' },
                { id: 'sbs',      label: 'SBS News' },
                { id: 'reuters',  label: 'Reuters' },
                { id: 'verge',    label: 'The Verge' },
                { id: 'dezeen',   label: 'Dezeen' },
              ].map(f => {
                const disabled = (theme.newsDisabledFeeds || []).includes(f.id)
                return (
                  <Row key={f.id} label={f.label}>
                    <Toggle checked={!disabled} onChange={v => {
                      const cur = theme.newsDisabledFeeds || []
                      set('newsDisabledFeeds', v ? cur.filter(x => x !== f.id) : [...cur, f.id])
                    }} />
                  </Row>
                )
              })}
              <SectionTitle>Custom feeds</SectionTitle>
              {[1,2,3].map(n => (
                <div key={n} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', padding: '0 0.75rem 0.4rem' }}>
                  <input className="input" style={{ fontSize: '0.78em' }}
                    placeholder={`Label (Custom ${n})`}
                    value={theme[`newsCustom${n}Label`] || ''}
                    onChange={e => set(`newsCustom${n}Label`, e.target.value)}
                  />
                  <input className="input" style={{ fontSize: '0.78em' }}
                    placeholder="RSS feed URL"
                    value={theme[`newsCustom${n}`] || ''}
                    onChange={e => set(`newsCustom${n}`, e.target.value)}
                  />
                </div>
              ))}
            </Group>
          )
          if (sectionId === 'calendar') return (
            <Group title="Calendar & Gmail" defaultOpen={false} {...commonGroupProps}>
              <SectionTitle>Apps Script URL</SectionTitle>
              <div style={{ padding: '0 0.75rem 0.5rem', fontSize: '0.75em', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                Paste your Google Apps Script web app URL below. See setup instructions in the README.
              </div>
              <Row label="Script URL">
                <input className="input" style={{ fontSize: '0.75em' }}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={theme.calScriptUrl || ''}
                  onChange={e => set('calScriptUrl', e.target.value)}
                />
              </Row>
              <SectionTitle>Visibility</SectionTitle>
              <Row label="Show calendar"><Toggle checked={!(theme.hideCalendar ?? false)} onChange={v => set('hideCalendar', !v)} /></Row>
              <Row label="Show Gmail"><Toggle checked={!(theme.hideGmail ?? false)} onChange={v => set('hideGmail', !v)} /></Row>
            </Group>
          )
          if (sectionId === 'search') return <Group title="Search" defaultOpen={false} {...commonGroupProps}><SectionTitle>Search engine</SectionTitle><Row label="Engine URL"><input className="input" style={{ fontSize: '0.78em' }} value={theme.searchEngineUrl || 'https://www.google.com.au/search?q='} onChange={e => set('searchEngineUrl', e.target.value)} placeholder="https://www.google.com.au/search?q=" /></Row><SectionTitle>Presets</SectionTitle><div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.28rem', padding: '0 0.75rem 0.4rem' }}><button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://www.google.com.au/search?q=')}>Google</button><button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://www.bing.com/search?q=')}>Bing</button><button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://duckduckgo.com/?q=')}>DuckDuckGo</button><button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://search.brave.com/search?q=')}>Brave</button><button className="btn-xs" onClick={() => set('searchEngineUrl', 'https://www.perplexity.ai/search?q=')}>Perplexity</button></div><Row label="Open results"><select className="input" style={{ fontSize: '0.78em' }} value={(theme.openInNewTab ?? true) ? 'new' : 'same'} onChange={e => set('openInNewTab', e.target.value === 'new')}><option value="new">New tab</option><option value="same">Same tab</option></select></Row><Row label="Open links in new window"><Toggle label="Open links in new window" checked={theme.linksOpenNewWindow ?? true} onChange={v => set('linksOpenNewWindow', v)} /></Row></Group>
          if (sectionId === 'workspaces') return (
            <Group title="Workspaces" defaultOpen={false} {...commonGroupProps}>
              <SectionTitle>View Mode</SectionTitle>
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem' }}>
                <button 
                  className={`btn-xs${mode === 'home' ? ' btn-primary' : ''}`}
                  onClick={() => setMode('home')}
                >
                  🏠 Home (see all)
                </button>
                <button 
                  className={`btn-xs${mode === 'work' ? ' btn-primary' : ''}`}
                  onClick={() => setMode('work')}
                >
                  💼 Work (restricted)
                </button>
              </div>
              <SectionTitle>Manage Workspaces</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.4rem' }}>
                {workspaces.map(ws => (
                  <div key={ws.id} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.25rem 0.45rem', borderRadius: 'var(--radius-sm)', background: ws.id === activeWs ? 'var(--accent-dim)' : 'transparent', border: `1px solid ${ws.id === activeWs ? 'var(--accent)' : 'transparent'}` }}>
                    <span style={{ flex: 1, fontSize: '0.82em', cursor: 'pointer', color: ws.id === activeWs ? 'var(--accent)' : 'var(--text-dim)' }} onClick={() => onSetActiveWs(ws.id)}>
                      {ws.name}
                      <span style={{ fontSize: '0.85em', opacity: 0.6, marginLeft: '0.3rem' }}>
                        {ws.visibility === 'home' ? '🏠' : ws.visibility === 'work' ? '💼' : '🔄'}
                      </span>
                    </span>
                    <select
                      className="input"
                      style={{ fontSize: '0.7em', padding: '0.15rem 0.25rem', width: 'auto' }}
                      value={ws.visibility || 'both'}
                      onChange={async (e) => {
                        const { error } = await supabase
                          .from('workspaces')
                          .update({ visibility: e.target.value })
                          .eq('id', ws.id)
                        if (!error) {
                          const updated = workspaces.map(w => 
                            w.id === ws.id ? { ...w, visibility: e.target.value } : w
                          )
                          // This would need to call a parent function to update workspaces state
                          // For now, just reload
                          window.location.reload()
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="both">Both</option>
                      <option value="home">Home</option>
                      <option value="work">Work</option>
                    </select>
                    <button className="btn-xs" onClick={() => { const n = prompt('Rename workspace:', ws.name); if (n?.trim()) onRenameWorkspace(ws.id, n.trim()) }}>✎</button>
                    <button className="btn-xs" style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => onDeleteWorkspace(ws.id)} disabled={workspaces.length <= 1}>✕</button>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <input className="input" style={{ flex: 1, fontSize: '0.8em' }} placeholder="New workspace name…" value={newWsName} onChange={e => setNewWsName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newWsName.trim()) { onAddWorkspace(newWsName.trim()); setNewWsName('') } }} />
                <button className="btn-xs btn-primary" disabled={!newWsName.trim()} onClick={() => { if (newWsName.trim()) { onAddWorkspace(newWsName.trim()); setNewWsName('') } }}>Add</button>
              </div>
            </Group>
          )
          if (sectionId === 'importExport') return (
            <Group title="Import / Export" defaultOpen={false} {...commonGroupProps}>
              <SectionTitle>Data backup</SectionTitle>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                <button className="btn-xs" onClick={onExportBackup}>↓ Full backup (JSON)</button>
                <button className="btn-xs" onClick={onExportCSV}>↓ Links CSV</button>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                <button className="btn-xs" disabled={importingBackup} onClick={() => backupFileRef.current?.click()}>
                  {importingBackup ? '⟳ Importing…' : '↑ Import JSON / CSV'}
                </button>
              </div>
              <SectionTitle>Theme only</SectionTitle>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                <button className="btn-xs" onClick={onExportTheme}>↓ Export theme</button>
                <button className="btn-xs" onClick={() => themeFileRef.current?.click()}>↑ Import theme</button>
              </div>
              <input ref={backupFileRef} type="file" accept="application/json,.json,.csv,text/csv,.txt,text/plain" style={{ display: 'none' }} onChange={onImportBackup} />
              <input ref={themeFileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={onImportTheme} />
            </Group>
          )
          if (sectionId === 'danger') return <Group title="Danger zone" defaultOpen={false} {...commonGroupProps}><p style={{ fontSize: '0.78em', color: 'var(--text-dim)', lineHeight: 1.5, margin: '0.2rem 0 0.5rem' }}>Destructive — cannot be undone.</p><div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}><button className="btn btn-danger" style={{ fontSize: '0.78em', padding: '0.28rem 0.7rem' }} onClick={onResetWorkspaceLinks}>✕ Clear all sections &amp; links</button><button className="btn btn-danger" style={{ fontSize: '0.78em', padding: '0.28rem 0.7rem' }} onClick={() => { if (confirm('Reset all theme settings to defaults?')) onResetTheme() }}>↺ Reset theme to defaults</button></div></Group>
          if (sectionId === 'bookmarks') return <Group title="Bookmarks" defaultOpen={false} {...commonGroupProps}><Row label="Extension status"><span style={{ fontSize: '0.8em', color: bookmarkCount > 0 ? 'var(--success, #4caf50)' : 'var(--text-muted)' }}>{bookmarkCount > 0 ? `● ${bookmarkCount} bookmarks synced` : '○ Extension not detected'}</span></Row>{bookmarkCount > 0 && (<Row label="Re-sync"><button className="btn btn-primary" style={{ fontSize: '0.8em' }} onClick={forceSync}>↻ Force sync</button></Row>)}<Row label="Result font size"><Slider label="Result font size" val={theme.bmFontSize ?? 13} min={9} max={18} step={1} unit="px" onChange={v => setTheme(t => ({ ...t, bmFontSize: v }))} /></Row><Row label="Result background"><ColorPick label="Result background colour" value={theme.bmResultBg || '#13131a'} onChange={v => setTheme(t => ({ ...t, bmResultBg: v }))} /></Row><Row label="Result text colour"><ColorPick label="Result text colour" value={theme.bmResultText || '#e8e8f0'} onChange={v => setTheme(t => ({ ...t, bmResultText: v }))} /></Row>{bmFolders && bmFolders.length > 0 && (<><SectionTitle>Folder visibility</SectionTitle><div style={{ maxHeight: 220, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>{bmFolders.map(f => (<label key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.2rem 0', paddingLeft: (f.depth * 12) + 'px', cursor: 'pointer', fontSize: '0.82em', color: hiddenFolders.includes(f.id) ? 'var(--text-muted)' : 'var(--text)', opacity: hiddenFolders.includes(f.id) ? 0.5 : 1 }}><input type="checkbox" checked={!hiddenFolders.includes(f.id)} onChange={() => toggleFolder(f.id)} style={{ accentColor: 'var(--accent)', flexShrink: 0 }} />{f.title}</label>))}</div></>)}{(!bmFolders || bmFolders.length === 0) && (<div style={{ fontSize: '0.8em', color: 'var(--text-muted)', padding: '0.5rem 0', lineHeight: 1.5 }}>Install the browser extension to enable bookmark search in the topbar.</div>)}</Group>
          return null
        })}
        </div>
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
        <button className="btn" style={{ flexShrink: 0 }} title="Move panel to other side"
          onClick={() => set('settingsSide', side === 'right' ? 'left' : 'right')}>
          {side === 'right' ? '⇐ Left' : 'Right ⇒'}
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }}
          onClick={() => { onSave(); onClose() }}>Save &amp; Close</button>
      </div>
    </>
  )
}
