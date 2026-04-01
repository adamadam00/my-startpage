import { useState, useRef } from 'react'

const FONTS = ['DM Mono','JetBrains Mono','IBM Plex Sans','Inter','Outfit','Space Grotesk','Figtree','Geist']

const BG_META = {
  'bg-solid':    { label:'Solid',         tip:'Flat solid colour' },
  'bg-noise':    { label:'Noise',         tip:'Subtle film-grain texture overlay' },
  'bg-dots':     { label:'Dots',          tip:'Regular dot grid — colour & opacity adjustable' },
  'bg-grid':     { label:'Grid',          tip:'Square grid lines — colour & opacity adjustable' },
  'bg-lines':    { label:'Lines',         tip:'Diagonal ruled lines — colour & opacity adjustable' },
  'bg-gradient': { label:'Gradient',      tip:'Directional gradient — configure type, angle & colours below' },
  'bg-mesh':     { label:'* Blobs',       tip:'Animated soft coloured blob mesh using your accent colour' },
  'bg-aurora':   { label:'* Aurora',      tip:'Animated slow northern-lights hue drift' },
  'bg-starfield':{ label:'* Starfield',   tip:'Animated drifting star field — medium GPU use' },
  'bg-stars':    { label:'Stars',         tip:'Static scattered star pattern' },
  'bg-nebula':   { label:'Nebula',        tip:'Deep-space nebula cloud with scattered stars' },
  'bg-circuit':  { label:'Circuit',       tip:'Circuit-board trace grid' },
  'bg-plasma':   { label:'* Plasma',      tip:'Animated liquid colour blobs — higher GPU use' },
  'bg-inferno':  { label:'* Inferno',     tip:'Animated plasma — red/orange fire palette' },
  'bg-mint':     { label:'* Mint',        tip:'Animated plasma — green/teal/cyan palette' },
  'bg-dusk':     { label:'* Dusk',        tip:'Animated plasma — pink/violet/peach palette' },
  'bg-mono':     { label:'* Mono',        tip:'Animated plasma — deep navy monochrome' },
  'bg-image':    { label:'Image',         tip:'Upload a custom background image (max 2 MB)' },
}
const PATTERN_BG  = ['bg-dots','bg-grid','bg-lines','bg-circuit']
const PLASMA_BG   = ['bg-plasma','bg-inferno','bg-mint','bg-dusk','bg-mono']
const GRADIENT_BG = ['bg-gradient']
const IMAGE_BG    = ['bg-image']

function Sec({ title, children }) {
  return (
    <div className="settings-section">
      <div className="settings-title">{title}</div>
      {children}
    </div>
  )
}

function Row({ label, tip, children }) {
  return (
    <div className="settings-row" title={tip || ''}>
      <span className="settings-label" title={tip || ''}>{label}</span>
      {children}
    </div>
  )
}

function Slider({ value, min, max, step=1, onChange, tip }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }} title={tip || ''}>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(e.target.value)} style={{ maxWidth:90 }} />
      <span style={{ fontSize:'0.75em', color:'var(--text-muted)', minWidth:28, textAlign:'right' }}>{value}</span>
    </div>
  )
}

function Toggle({ checked, onChange, tip }) {
  return (
    <label className="toggle" title={tip || ''}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}

function ColorRow({ label, tip, value, onChange }) {
  return (
    <Row label={label} tip={tip}>
      <input type="color" className="color-input" value={value || '#000000'} onChange={e => onChange(e.target.value)} title={tip || ''} />
    </Row>
  )
}

export default function Settings({
  theme, set,
  workspaces, activeWs, onSwitchWs, onDeleteWs,
  onSave, onReset, onClose,
  onExport, onImport,
  onImageUpload,
  onExportBackup, onImportBackup,
  fileRef, backupFileRef,
  onRefreshCache,
  themeSyncing, importingBackup,
  onAddSection, onImportSection, onCollapseAll, onExpandAll,
}) {
  const [addingWs, setAddingWs] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const importRef  = fileRef  || useRef()
  const bkupRef    = backupFileRef || useRef()

  const isBg       = (v) => theme.bgStyle === v
  const isPattern  = PATTERN_BG.includes(theme.bgStyle)
  const isPlasma   = PLASMA_BG.includes(theme.bgStyle)
  const isGradient = GRADIENT_BG.includes(theme.bgStyle)
  const isImage    = IMAGE_BG.includes(theme.bgStyle)

  return (
    <>
      <div className="settings-veil" />
      <div className="settings-panel" data-side={theme.settingsSide || 'right'}>

        {/* ── Header ── */}
        <div className="settings-header">
          <span style={{ fontWeight:600, fontSize:'1em' }}>Settings</span>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            {themeSyncing && <span style={{ fontSize:'0.72em', color:'var(--text-muted)' }}>saving…</span>}
            <button className="icon-btn" onClick={onClose} title="Close settings">✕</button>
          </div>
        </div>

        {/* ══════════════════════════════════════════
            1. WORKSPACES
        ══════════════════════════════════════════ */}
        <Sec title="Workspaces">
          <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem' }}>
            {workspaces.map(w => (
              <div key={w.id} style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
                <button
                  className={'btn btn-ghost' + (w.id === activeWs ? ' btn-primary' : '')}
                  style={{ flex:1, textAlign:'left', fontSize:'0.82em' }}
                  onClick={() => onSwitchWs(w.id)}
                  title={'Switch to workspace: ' + w.name}
                >{w.name}</button>
                {workspaces.length > 1 && (
                  <button className="icon-btn" style={{ color:'var(--danger)', opacity:0.6 }}
                    onClick={() => onDeleteWs(w.id)} title={'Delete workspace: ' + w.name}>✕</button>
                )}
              </div>
            ))}
            {addingWs ? (
              <form onSubmit={e => { e.preventDefault(); if (newWsName.trim() && onSave) { onSave(newWsName.trim()); setNewWsName(''); setAddingWs(false) } else setAddingWs(false) }} style={{ display:'flex', gap:'0.3rem' }}>
                <input className="input" value={newWsName} onChange={e => setNewWsName(e.target.value)}
                  placeholder="Workspace name" autoFocus style={{ flex:1, fontSize:'0.82em' }} />
                <button type="button" className="btn" onClick={() => setAddingWs(false)}>Cancel</button>
              </form>
            ) : (
              <button className="btn" style={{ fontSize:'0.8em' }} onClick={() => setAddingWs(true)} title="Create a new workspace">+ New workspace</button>
            )}
          </div>
        </Sec>

        {/* ══════════════════════════════════════════
            2. BACKGROUND
        ══════════════════════════════════════════ */}
        <Sec title="Background">
          {/* Style picker grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'0.3rem' }}>
            {Object.entries(BG_META).map(([val, { label, tip }]) => (
              <button key={val}
                className={'btn btn-ghost' + (isBg(val) ? ' btn-primary' : '')}
                style={{ fontSize:'0.75em', padding:'0.28rem 0.3rem', textAlign:'center' }}
                onClick={() => set('bgStyle', val)}
                title={tip}
              >{label}</button>
            ))}
          </div>

          <ColorRow label="Background colour" tip="Main page background colour" value={theme.bg} onChange={v => set('bg', v)} />

          {isPattern && <>
            <ColorRow label="Pattern colour" tip="Colour of the pattern lines or dots" value={theme.patternColor} onChange={v => set('patternColor', v)} />
            <Row label="Pattern opacity" tip="How visible the pattern is (0 = invisible, 1 = full)">
              <Slider value={theme.patternOpacity} min={0} max={1} step={0.05} onChange={v => set('patternOpacity', v)} tip="Pattern visibility" />
            </Row>
          </>}

          {isGradient && <>
            <Row label="Type" tip="Linear goes in a straight direction; radial radiates from a point">
              <select className="input" style={{ width:'auto', fontSize:'0.82em' }} value={theme.gradientType || 'linear'} onChange={e => set('gradientType', e.target.value)}>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </Row>
            {(theme.gradientType || 'linear') === 'linear' && (
              <Row label="Angle" tip="Direction of the gradient in degrees (0 = top, 90 = right, 135 = diagonal)">
                <Slider value={theme.gradientAngle || 135} min={0} max={360} step={5} onChange={v => set('gradientAngle', v)} />
              </Row>
            )}
          </>}

          {isImage && <>
            <Row label="Upload image" tip="JPG or PNG, max 2 MB — displayed as a full-cover background">
              <button className="btn" style={{ fontSize:'0.8em' }} onClick={() => bkupRef.current?.click()}>Choose file</button>
            </Row>
            <Row label="Image opacity" tip="Blend the image with the background colour">
              <Slider value={theme.bgImageOpacity ?? 1} min={0} max={1} step={0.05} onChange={v => set('bgImageOpacity', v)} />
            </Row>
          </>}
          {isPlasma && <>
            <Row label="Speed" tip="Animation speed multiplier — higher = faster moving blobs">
              <Slider value={theme.plasmaSpeed ?? 1} min={0.2} max={3} step={0.1} onChange={v => set('plasmaSpeed', v)} />
            </Row>
            <Row label="Blur" tip="Blur intensity multiplier — higher = softer, more diffuse blobs">
              <Slider value={theme.plasmaBlur ?? 1} min={0.2} max={3} step={0.1} onChange={v => set('plasmaBlur', v)} />
            </Row>
          </>}
        </Sec>

        {/* ══════════════════════════════════════════
            3. COLOURS
        ══════════════════════════════════════════ */}
        <Sec title="Colours">
          <ColorRow label="Card background"   tip="Background colour of section cards and widgets"          value={theme.card}         onChange={v => set('card', v)} />
          <Row label="Card opacity" tip="How opaque cards are — lower values let the background show through">
            <Slider value={theme.cardOpacity ?? 1} min={0} max={1} step={0.05} onChange={v => set('cardOpacity', v)} />
          </Row>
          <ColorRow label="Border"        tip="Colour of card and element borders"        value={theme.border}       onChange={v => set('border', v)} />
          <Row label="Border opacity" tip="Visibility of all borders">
            <Slider value={theme.borderOpacity ?? 1} min={0} max={1} step={0.05} onChange={v => set('borderOpacity', v)} />
          </Row>
          <ColorRow label="Accent"        tip="Highlight colour for active items, links on hover, and focus rings" value={theme.accent}  onChange={v => set('accent', v)} />
          <ColorRow label="Text"          tip="Primary text colour"                       value={theme.text}         onChange={v => set('text', v)} />
          <ColorRow label="Text dim"      tip="Secondary / muted text colour"             value={theme.textDim}      onChange={v => set('textDim', v)} />
          <ColorRow label="Section titles" tip="Colour of section header labels"          value={theme.titleColor}   onChange={v => set('titleColor', v)} />
          <ColorRow label="Button"        tip="Background colour of primary action buttons" value={theme.btnBg}      onChange={v => set('btnBg', v)} />
          <ColorRow label="Notes bg"      tip="Background colour of the notes panel"      value={theme.notesBg}      onChange={v => set('notesBg', v)} />
          <ColorRow label="Notes input"   tip="Background colour of note text inputs"     value={theme.notesInputBg} onChange={v => set('notesInputBg', v)} />
        </Sec>

        {/* ══════════════════════════════════════════
            4. TYPOGRAPHY
        ══════════════════════════════════════════ */}
        <Sec title="Typography">
          <Row label="Font" tip="Main typeface used across the entire UI">
            <select className="input" style={{ width:'auto', fontSize:'0.82em' }} value={theme.font} onChange={e => set('font', e.target.value)}>
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Row>
          <Row label="Body size" tip="Font size for link text, section content, and notes">
            <Slider value={theme.workspaceFontSize} min={10} max={20} step={1} onChange={v => set('workspaceFontSize', v)} tip="Body font size in px" />
          </Row>
          <Row label="Topbar size" tip="Font size for the clock, search bar, workspace tabs, and bookmarks bar">
            <Slider value={theme.topbarFontSize} min={9} max={16} step={1} onChange={v => set('topbarFontSize', v)} tip="Topbar font size in px" />
          </Row>
          <Row label="Settings size" tip="Font size within this settings panel">
            <Slider value={theme.settingsFontSize ?? 13} min={10} max={16} step={1} onChange={v => set('settingsFontSize', v)} tip="Settings panel font size in px" />
          </Row>
          <Row label="Clock scale" tip="Size of the clock widget in the topbar (multiplier of the topbar font size)">
            <Slider value={theme.clockWidgetScale} min={0.6} max={3} step={0.1} onChange={v => set('clockWidgetScale', v)} tip="Clock size multiplier" />
          </Row>
        </Sec>

        {/* ══════════════════════════════════════════
            5. SPACING & LAYOUT
        ══════════════════════════════════════════ */}
        <Sec title="Spacing & Layout">
          <Row label="Columns" tip="Number of section columns in the main area">
            <Slider value={theme.sectionsCols ?? 2} min={1} max={6} step={1} onChange={v => set('sectionsCols', v)} />
          </Row>
          <Row label="Column gap" tip="Horizontal gap between section columns (px)">
            <Slider value={theme.sectionGapH ?? 0} min={0} max={32} step={1} onChange={v => set('sectionGapH', v)} />
          </Row>
          <Row label="Row gap" tip="Vertical gap between section cards (px)">
            <Slider value={theme.sectionGap ?? 0} min={0} max={32} step={1} onChange={v => set('sectionGap', v)} />
          </Row>
          <Row label="Card padding" tip="Inner padding of section cards (rem)">
            <Slider value={theme.cardPadding ?? 0.75} min={0} max={2} step={0.05} onChange={v => set('cardPadding', v)} />
          </Row>
          <Row label="Link gap" tip="Vertical spacing between links within a section (rem)">
            <Slider value={theme.linkGap ?? 0.5} min={0} max={1.5} step={0.05} onChange={v => set('linkGap', v)} />
          </Row>
          <Row label="Top gap" tip="Gap between the topbar and the main content area (px)">
            <Slider value={theme.mainGapTop ?? 12} min={0} max={48} step={1} onChange={v => set('mainGapTop', v)} />
          </Row>
          <Row label="Notes width" tip="Width of the notes sidebar panel (px)">
            <Slider value={theme.notesWidth ?? 240} min={160} max={420} step={10} onChange={v => set('notesWidth', v)} />
          </Row>
        </Sec>

        {/* ══════════════════════════════════════════
            6. SHAPE & SCALE
        ══════════════════════════════════════════ */}
        <Sec title="Shape & Scale">
          <Row label="Card radius" tip="Border radius of cards and modals (px)">
            <Slider value={theme.radius ?? 10} min={0} max={24} step={1} onChange={v => set('radius', v)} />
          </Row>
          <Row label="Button radius" tip="Border radius of buttons, inputs, and small elements (px)">
            <Slider value={theme.radiusSm ?? 6} min={0} max={16} step={1} onChange={v => set('radiusSm', v)} />
          </Row>
          <Row label="Section radius" tip="Border radius specifically for section cards (px) — set to 0 for flush/edge-to-edge look">
            <Slider value={theme.sectionRadius ?? 0} min={0} max={20} step={1} onChange={v => set('sectionRadius', v)} />
          </Row>
          <Row label="Page scale" tip="Zoom level for the entire page (1 = 100%). Use this to fit more on screen without changing font sizes">
            <Slider value={theme.pageScale ?? 1} min={0.5} max={1.5} step={0.05} onChange={v => set('pageScale', v)} />
          </Row>
          <Row label="Handle opacity" tip="Visibility of drag handles on section cards (0 = hidden, 0.15 = subtle)">
            <Slider value={theme.handleOpacity ?? 0.15} min={0} max={1} step={0.05} onChange={v => set('handleOpacity', v)} />
          </Row>
        </Sec>

        {/* ══════════════════════════════════════════
            7. FAVICONS
        ══════════════════════════════════════════ */}
        <Sec title="Favicons">
          <Row label="Size" tip="Width and height of favicon icons next to link titles (px)">
            <Slider value={theme.faviconSize ?? 13} min={8} max={24} step={1} onChange={v => set('faviconSize', v)} />
          </Row>
          <Row label="Opacity" tip="How visible the favicon icons are (1 = full colour, 0 = hidden)">
            <Slider value={theme.faviconOpacity ?? 1} min={0} max={1} step={0.05} onChange={v => set('faviconOpacity', v)} />
          </Row>
          <Row label="Filter" tip="CSS filter applied to all favicons — e.g. grayscale(1) to desaturate">
            <select className="input" style={{ width:'auto', fontSize:'0.82em' }} value={theme.faviconFilter ?? 'none'} onChange={e => set('faviconFilter', e.target.value)}>
              <option value="none">None</option>
              <option value="grayscale(1)">Greyscale</option>
              <option value="invert(1)">Invert</option>
              <option value="grayscale(1) opacity(0.6)">Greyscale dim</option>
            </select>
          </Row>
        </Sec>

        {/* ══════════════════════════════════════════
            8. BEHAVIOUR
        ══════════════════════════════════════════ */}
        <Sec title="Behaviour">
          <Row label="Open in new tab" tip="Links open in a new browser tab when clicked">
            <Toggle checked={theme.openInNewTab === 'true'} onChange={v => set('openInNewTab', String(v))} tip="Open links in a new tab" />
          </Row>
          <Row label="Lock layout" tip="Prevents accidental section reordering and hides drag handles">
            <Toggle checked={theme.locked === 'true'} onChange={v => set('locked', String(v))} tip="Lock section layout" />
          </Row>
          <Row label="Settings side" tip="Which edge of the screen the settings panel slides in from">
            <select className="input" style={{ width:'auto', fontSize:'0.82em' }} value={theme.settingsSide || 'right'} onChange={e => set('settingsSide', e.target.value)}>
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
          </Row>
          <Row label="Search URL" tip="The search engine URL — your query is appended after the last = or + character">
            <input className="input" style={{ fontSize:'0.8em', maxWidth:180 }} value={theme.searchUrl ?? ''} onChange={e => set('searchUrl', e.target.value)} title="Search engine URL, query is appended here" />
          </Row>
        </Sec>

        {/* ══════════════════════════════════════════
            9. SECTIONS — quick actions
        ══════════════════════════════════════════ */}
        <Sec title="Sections">
          <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }} onClick={onAddSection} title="Add a new empty section to the current workspace">+ Add section</button>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }} onClick={onImportSection} title="Import a section from a JSON file">Import</button>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }} onClick={onCollapseAll} title="Collapse all sections">Collapse all</button>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }} onClick={onExpandAll} title="Expand all sections">Expand all</button>
          </div>
        </Sec>

        {/* ══════════════════════════════════════════
            10. DATA
        ══════════════════════════════════════════ */}
        <Sec title="Data">
          <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }} onClick={onExportBackup} title="Export all workspaces, sections, links, notes and theme to a JSON file">Export backup</button>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }} onClick={() => bkupRef.current?.click()} title="Import and merge a previously exported backup file">Import backup</button>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }} onClick={onExport} title="Export just the current theme/appearance settings as JSON">Export theme</button>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }} onClick={() => importRef.current?.click()} title="Import a previously exported theme JSON file">Import theme</button>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }} onClick={onRefreshCache} title="Clear the service worker cache and reload the page — use if the app feels stale">Refresh cache</button>
          </div>
          {importingBackup && <div style={{ fontSize:'0.78em', color:'var(--text-muted)', marginTop:'0.3rem' }}>Importing…</div>}
          <input ref={importRef}  type="file" accept=".json" style={{ display:'none' }} onChange={onImport} />
          <input ref={bkupRef}    type="file" accept=".json,.jpg,.png,.webp" style={{ display:'none' }} onChange={(e) => { onImportBackup?.(e); onImageUpload?.(e) }} />
        </Sec>

      </div>

      {/* ── Footer ── */}
      <div className="settings-footer" data-side={theme.settingsSide || 'right'}>
        <button className="btn btn-primary" style={{ flex:1 }} onClick={onSave} title="Save all settings and close the panel">Save</button>
        <button className="btn btn-ghost"   onClick={onReset}  title="Reset all settings back to defaults — cannot be undone">Reset defaults</button>
        <button className="btn btn-ghost"   onClick={onClose}  title="Close without saving">Close</button>
      </div>
    </>
  )
}