import { useRef } from 'react'

const FONTS = ['DM Mono','JetBrains Mono','IBM Plex Sans','Inter','Outfit','Space Grotesk','Figtree','Geist']

const BG_META = {
  'bg-solid':    { label:'Solid',         tip:'Flat solid colour' },
  'bg-noise':    { label:'Noise',         tip:'Subtle film-grain texture overlay' },
  'bg-dots':     { label:'Dots',          tip:'Regular dot grid — colour & opacity adjustable' },
  'bg-grid':     { label:'Grid',          tip:'Square grid lines — colour & opacity adjustable' },
  'bg-lines':    { label:'Lines',         tip:'Diagonal ruled lines — colour & opacity adjustable' },
  'bg-gradient': { label:'Gradient',      tip:'Directional gradient — configure type, angle & colours below' },
  'bg-mesh':     { label:'* Blobs',       tip:'Animated soft coloured blob mesh' },
  'bg-aurora':   { label:'* Aurora',      tip:'Animated northern-lights hue drift — speed & colour adjustable' },
  'bg-starfield':{ label:'* Starfield',   tip:'Animated drifting star field — speed & colour adjustable' },
  'bg-laser':    { label:'* Laser',       tip:'Animated laser beams bouncing around the screen' },
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
const PATTERN_BG   = ['bg-dots','bg-grid','bg-lines','bg-circuit']
const PLASMA_BG    = ['bg-plasma','bg-inferno','bg-mint','bg-dusk','bg-mono']
const GRADIENT_BG  = ['bg-gradient']
const IMAGE_BG     = ['bg-image']
const STARFIELD_BG = ['bg-starfield']
const AURORA_BG    = ['bg-aurora']
const LASER_BG     = ['bg-laser']
const MESH_BG      = ['bg-mesh']

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
    <div className="settings-row" title={tip||''}>
      <span className="settings-label" title={tip||''}>{label}</span>
      {children}
    </div>
  )
}
function Slider({ value, min, max, step=1, onChange }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:'0.4rem' }}>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(e.target.value)} style={{ maxWidth:90 }} />
      <span style={{ fontSize:'0.75em', color:'var(--text-muted)', minWidth:28, textAlign:'right' }}>{value}</span>
    </div>
  )
}
function Toggle({ checked, onChange, tip }) {
  return (
    <label className="toggle" title={tip||''}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider" />
    </label>
  )
}
function ColorRow({ label, tip, value, onChange }) {
  return (
    <Row label={label} tip={tip}>
      <input type="color" className="color-input"
        value={value||'#000000'} onChange={e => onChange(e.target.value)} />
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
  const importRef = fileRef       || useRef()
  const bkupRef   = backupFileRef || useRef()

  const isPattern  = PATTERN_BG.includes(theme.bgStyle)
  const isPlasma   = PLASMA_BG.includes(theme.bgStyle)
  const isGradient = GRADIENT_BG.includes(theme.bgStyle)
  const isImage    = IMAGE_BG.includes(theme.bgStyle)
  const isStarfield = STARFIELD_BG.includes(theme.bgStyle)
  const isAurora   = AURORA_BG.includes(theme.bgStyle)
  const isLaser    = LASER_BG.includes(theme.bgStyle)
  const isMesh     = MESH_BG.includes(theme.bgStyle)

  return (
    <>
      <div className="settings-veil" />
      <div className="settings-panel" data-side={theme.settingsSide||'right'}>

        {/* Header */}
        <div className="settings-header">
          <span style={{ fontWeight:600, fontSize:'1em' }}>Settings</span>
          <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
            {themeSyncing && <span style={{ fontSize:'0.72em', color:'var(--text-muted)' }}>saving…</span>}
            <button className="icon-btn" onClick={onClose} title="Close settings">✕</button>
          </div>
        </div>

        {/* ── 1. BACKGROUND ── */}
        <Sec title="Background">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'0.3rem' }}>
            {Object.entries(BG_META).map(([val,{label,tip}]) => (
              <button key={val}
                className={'btn btn-ghost'+(theme.bgStyle===val?' btn-primary':'')}
                style={{ fontSize:'0.75em', padding:'0.28rem 0.3rem', textAlign:'center' }}
                onClick={() => set('bgStyle',val)} title={tip}>{label}
              </button>
            ))}
          </div>

          <ColorRow label="Background colour" tip="Main page background colour"
            value={theme.bg} onChange={v => set('bg',v)} />

          {isPattern && <>
            <ColorRow label="Pattern colour" value={theme.patternColor} onChange={v => set('patternColor',v)} />
            <Row label="Pattern opacity">
              <Slider value={theme.patternOpacity} min={0} max={1} step={0.05} onChange={v => set('patternOpacity',v)} />
            </Row>
          </>}

          {isGradient && <>
            <Row label="Type">
              <select className="input" style={{ width:'auto', fontSize:'0.82em' }}
                value={theme.gradientType||'linear'} onChange={e => set('gradientType',e.target.value)}>
                <option value="linear">Linear</option>
                <option value="radial">Radial</option>
              </select>
            </Row>
            {(theme.gradientType||'linear')==='linear' && (
              <Row label="Angle">
                <Slider value={theme.gradientAngle||135} min={0} max={360} step={5}
                  onChange={v => set('gradientAngle',v)} />
              </Row>
            )}
          </>}

          {isImage && <>
            <Row label="Upload image" tip="JPG or PNG, max 2 MB">
              <button className="btn" style={{ fontSize:'0.8em' }}
                onClick={() => bkupRef.current?.click()}>Choose file</button>
            </Row>
            <Row label="Image opacity">
              <Slider value={theme.bgImageOpacity??1} min={0} max={1} step={0.05}
                onChange={v => set('bgImageOpacity',v)} />
            </Row>
          </>}

          {isPlasma && <>
            <Row label="Speed" tip="Animation speed — higher = faster">
              <Slider value={theme.plasmaSpeed??1} min={0.2} max={3} step={0.1}
                onChange={v => set('plasmaSpeed',v)} />
            </Row>
            <Row label="Blur" tip="Blur intensity — higher = softer blobs">
              <Slider value={theme.plasmaBlur??1} min={0.2} max={3} step={0.1}
                onChange={v => set('plasmaBlur',v)} />
            </Row>
          </>}

          {isStarfield && <>
            <Row label="Speed" tip="Star drift speed (1 = default, 4 = very fast)">
              <Slider value={theme.starfieldSpeed??1} min={0.1} max={4} step={0.1}
                onChange={v => set('starfieldSpeed',v)} />
            </Row>
            <ColorRow label="Star colour" tip="Tint colour of the star dots"
              value={theme.starfieldColor??'#ffffff'} onChange={v => set('starfieldColor',v)} />
          </>}

          {isAurora && <>
            <Row label="Speed" tip="Aurora hue-rotation speed (1 = default, 4 = very fast)">
              <Slider value={theme.auroraSpeed??1} min={0.1} max={4} step={0.1}
                onChange={v => set('auroraSpeed',v)} />
            </Row>
            <ColorRow label="Aurora colour" tip="Base hue tinting the aurora gradient"
              value={theme.auroraColor??'#6c8fff'} onChange={v => set('auroraColor',v)} />
          </>}

          {isMesh && <>
            <Row label="Speed" tip="Blob drift speed (1 = default, 4 = very fast)">
              <Slider value={theme.meshSpeed??1} min={0.1} max={4} step={0.1}
                onChange={v => set('meshSpeed',v)} />
            </Row>
            <ColorRow label="Blob colour" tip="Primary colour of the animated blobs"
              value={theme.meshColor??theme.accent??'#6c8fff'} onChange={v => set('meshColor',v)} />
          </>}

          {isLaser && <>
            <Row label="Speed" tip="Laser beam movement speed (1 = default, 5 = very fast)">
              <Slider value={theme.laserSpeed??1} min={0.2} max={5} step={0.1}
                onChange={v => set('laserSpeed',v)} />
            </Row>
            <ColorRow label="Beam colour 1" tip="Primary laser beam colour"
              value={theme.laserColor??'#6c8fff'} onChange={v => set('laserColor',v)} />
            <ColorRow label="Beam colour 2" tip="Secondary laser beam colour"
              value={theme.laserColor2??'#ff6bff'} onChange={v => set('laserColor2',v)} />
          </>}
        </Sec>

        {/* ── 2. COLOURS ── */}
        <Sec title="Colours">
          <ColorRow label="Card background"  value={theme.card}         onChange={v => set('card',v)}
            tip="Background colour of section cards" />
          <Row label="Card opacity" tip="How opaque cards are (0 = transparent, 1 = solid)">
            <Slider value={theme.cardOpacity??1} min={0} max={1} step={0.05}
              onChange={v => set('cardOpacity',v)} />
          </Row>
          <Row label="Card scale" tip="Zoom level for the entire page (0.6 = 60%, 1.4 = 140%)">
            <Slider value={theme.pageScale??1} min={0.6} max={1.4} step={0.05}
              onChange={v => set('pageScale',v)} />
          </Row>
          <ColorRow label="Border"           value={theme.border}       onChange={v => set('border',v)} />
          <Row label="Border opacity">
            <Slider value={theme.borderOpacity??1} min={0} max={1} step={0.05}
              onChange={v => set('borderOpacity',v)} />
          </Row>
          <ColorRow label="Accent"           value={theme.accent}       onChange={v => set('accent',v)}
            tip="Highlight colour for active items and hover states" />
          <ColorRow label="Text"             value={theme.text}         onChange={v => set('text',v)} />
          <ColorRow label="Text dim"         value={theme.textDim}      onChange={v => set('textDim',v)} />
          <ColorRow label="Section titles"   value={theme.titleColor}   onChange={v => set('titleColor',v)} />
          <ColorRow label="Button"           value={theme.btnBg}        onChange={v => set('btnBg',v)} />
          <ColorRow label="Notes bg"         value={theme.notesBg}      onChange={v => set('notesBg',v)} />
          <ColorRow label="Notes input"      value={theme.notesInputBg} onChange={v => set('notesInputBg',v)} />
        </Sec>

        {/* ── 3. TYPOGRAPHY ── */}
        <Sec title="Typography">
          <Row label="Font">
            <select className="input" style={{ width:'auto', fontSize:'0.82em' }}
              value={theme.font} onChange={e => set('font',e.target.value)}>
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Row>
          <Row label="Body size">
            <Slider value={theme.workspaceFontSize} min={10} max={20} step={1}
              onChange={v => set('workspaceFontSize',v)} />
          </Row>
          <Row label="Topbar size">
            <Slider value={theme.topbarFontSize} min={9} max={16} step={1}
              onChange={v => set('topbarFontSize',v)} />
          </Row>
          <Row label="Settings size">
            <Slider value={theme.settingsFontSize??13} min={10} max={16} step={1}
              onChange={v => set('settingsFontSize',v)} />
          </Row>
          <Row label="Clock scale">
            <Slider value={theme.clockWidgetScale} min={0.6} max={3} step={0.1}
              onChange={v => set('clockWidgetScale',v)} />
          </Row>
        </Sec>

        {/* ── 4. SPACING & LAYOUT ── */}
        <Sec title="Spacing & Layout">
          <Row label="Columns" tip="Number of section columns (1–6)">
            <Slider value={theme.sectionsCols??2} min={1} max={6} step={1}
              onChange={v => set('sectionsCols',v)} />
          </Row>
          <Row label="Column gap">
            <Slider value={theme.sectionGapH??0} min={0} max={32} step={1}
              onChange={v => set('sectionGapH',v)} />
          </Row>
          <Row label="Row gap">
            <Slider value={theme.sectionGap??0} min={0} max={32} step={1}
              onChange={v => set('sectionGap',v)} />
          </Row>
          <Row label="Card padding">
            <Slider value={theme.cardPadding??0.75} min={0} max={2} step={0.05}
              onChange={v => set('cardPadding',v)} />
          </Row>
          <Row label="Link gap">
            <Slider value={theme.linkGap??0.5} min={0} max={1.5} step={0.05}
              onChange={v => set('linkGap',v)} />
          </Row>
          <Row label="Top gap">
            <Slider value={theme.mainGapTop??12} min={0} max={48} step={1}
              onChange={v => set('mainGapTop',v)} />
          </Row>
          <Row label="Notes width">
            <Slider value={theme.notesWidth??240} min={160} max={420} step={10}
              onChange={v => set('notesWidth',v)} />
          </Row>
        </Sec>

        {/* ── 5. SHAPE & SCALE ── */}
        <Sec title="Shape & Scale">
          <Row label="Card radius">
            <Slider value={theme.radius??10} min={0} max={24} step={1}
              onChange={v => set('radius',v)} />
          </Row>
          <Row label="Button radius">
            <Slider value={theme.radiusSm??6} min={0} max={16} step={1}
              onChange={v => set('radiusSm',v)} />
          </Row>
          <Row label="Section radius">
            <Slider value={theme.sectionRadius??0} min={0} max={20} step={1}
              onChange={v => set('sectionRadius',v)} />
          </Row>
          <Row label="Edit bar scale"
            tip="Scale of edit/delete/drag buttons on links and section headers (1 = default, 0.5 = smaller)">
            <Slider value={theme.editbarScale??1} min={0.5} max={1.5} step={0.05}
              onChange={v => set('editbarScale',v)} />
          </Row>
          <Row label="Handle opacity">
            <Slider value={theme.handleOpacity??0.15} min={0} max={1} step={0.05}
              onChange={v => set('handleOpacity',v)} />
          </Row>
        </Sec>

        {/* ── 6. FAVICONS ── */}
        <Sec title="Favicons">
          <Row label="Size">
            <Slider value={theme.faviconSize??13} min={8} max={24} step={1}
              onChange={v => set('faviconSize',v)} />
          </Row>
          <Row label="Opacity">
            <Slider value={theme.faviconOpacity??1} min={0} max={1} step={0.05}
              onChange={v => set('faviconOpacity',v)} />
          </Row>
          <Row label="Filter">
            <select className="input" style={{ width:'auto', fontSize:'0.82em' }}
              value={theme.faviconFilter??'none'} onChange={e => set('faviconFilter',e.target.value)}>
              <option value="none">None</option>
              <option value="grayscale(1)">Greyscale</option>
              <option value="invert(1)">Invert</option>
              <option value="grayscale(1) opacity(0.6)">Greyscale dim</option>
            </select>
          </Row>
        </Sec>

        {/* ── 7. BEHAVIOUR ── */}
        <Sec title="Behaviour">
          <Row label="Open in new tab">
            <Toggle checked={theme.openInNewTab==='true'} onChange={v => set('openInNewTab',String(v))} />
          </Row>
          <Row label="Lock layout" tip="Prevents accidental section reordering">
            <Toggle checked={theme.locked==='true'} onChange={v => set('locked',String(v))} />
          </Row>
          <Row label="Settings side">
            <select className="input" style={{ width:'auto', fontSize:'0.82em' }}
              value={theme.settingsSide||'right'} onChange={e => set('settingsSide',e.target.value)}>
              <option value="right">Right</option>
              <option value="left">Left</option>
            </select>
          </Row>
          <Row label="Search URL">
            <input className="input" style={{ fontSize:'0.8em', maxWidth:180 }}
              value={theme.searchUrl??''} onChange={e => set('searchUrl',e.target.value)} />
          </Row>
        </Sec>

        {/* ── 8. DATA ── */}
        <Sec title="Data">
          <div style={{ display:'flex', gap:'0.4rem', flexWrap:'wrap' }}>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }}
              onClick={onExportBackup}>Export backup</button>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }}
              onClick={() => bkupRef.current?.click()}>Import backup</button>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }}
              onClick={onExport}>Export theme</button>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }}
              onClick={() => importRef.current?.click()}>Import theme</button>
            <button className="btn btn-ghost" style={{ fontSize:'0.8em' }}
              onClick={onRefreshCache}>Refresh cache</button>
          </div>
          {importingBackup && (
            <div style={{ fontSize:'0.78em', color:'var(--text-muted)', marginTop:'0.3rem' }}>Importing…</div>
          )}
          <input ref={importRef} type="file" accept=".json" style={{ display:'none' }} onChange={onImport} />
          <input ref={bkupRef}   type="file" accept=".json,.jpg,.png,.webp" style={{ display:'none' }}
            onChange={e => { onImportBackup?.(e); onImageUpload?.(e) }} />
        </Sec>

      </div>

      {/* Footer — z-index 102 so it sits ABOVE the panel (z-index 101) */}
      <div className="settings-footer" data-side={theme.settingsSide||'right'}>
        <button className="btn btn-primary" style={{ flex:1 }} onClick={() => { onSave(); onClose() }}>Save &amp; Exit</button>
        <button className="btn btn-ghost" style={{ flex:1 }} onClick={onSave}>Save</button>
        <button className="btn btn-ghost" onClick={onReset}>Reset defaults</button>
        <button className="btn btn-ghost" onClick={onClose}>Close</button>
      </div>
    </>
  )
}