import { useState } from 'react'

// ── HELPERS ──────────────────────────────────────────────────────
const Toggle = ({ checked, onChange }) => (
  <button className="s2-toggle" data-on={checked} onClick={() => onChange(!checked)}>
    <span className="s2-toggle-thumb" />
  </button>
)
const Slider = ({ val, min, max, step = 1, onChange, unit = '' }) => (
  <div className="s2-slider-row">
    <input type="range" min={min} max={max} step={step} value={val} onChange={e => onChange(Number(e.target.value))} className="s2-slider" />
    <span className="s2-slider-val">{val}{unit}</span>
  </div>
)
const ColorPick = ({ value, onChange }) => (
  <label className="s2-color-pick">
    <span className="s2-color-swatch" style={{ background: value }} />
    <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)} />
  </label>
)

const Row = ({ label, children, search, id, configMode, isVisible, toggleVisible }) => {
  const key = id || label
  if (search && !label.toLowerCase().includes(search.toLowerCase())) return null
  if (configMode) {
    const checked = isVisible ? isVisible(key) : true
    return (
      <div className="s2-row s2-config-row" onClick={() => toggleVisible?.(key)}>
        <input type="checkbox" checked={checked} onChange={() => {}} className="s2-config-check" />
        <span className="s2-row-label" style={{ opacity: checked ? 1 : 0.4 }}>{label}</span>
      </div>
    )
  }
  if (isVisible && !isVisible(key)) return null
  return (
    <div className={`s2-row ${search && label.toLowerCase().includes(search.toLowerCase()) ? 's2-match' : ''}`}>
      <span className="s2-row-label">{label}</span>
      <div className="s2-row-ctrl">{children}</div>
    </div>
  )
}

const Adv = ({ id, show, onToggle }) => (
  <button className="s2-adv-toggle" onClick={() => onToggle(id)}>
    {show ? '▾ Hide advanced' : '▸ Show advanced'}
  </button>
)

const rp = (search, configMode, isVisible, toggleVisible) => ({ search, configMode, isVisible, toggleVisible })

const BG_PRESETS = [
  { label: '01-Solid', v: '01-solid' }, { label: '02-Noise', v: '02-noise' },
  { label: '03-Shapes', v: '03-dots' }, { label: '04-Grid', v: '04-grid' },
  { label: '05-Gradient', v: '05-gradient' }, { label: '06-Mesh', v: '06-mesh' },
  { label: '07-Nebula', v: '07-nebula' }, { label: '08-Stars', v: '16-starfield-old' },
  { label: '08b-Streaks', v: '29-star-streaks' }, { label: '09-Plasma', v: '17-plasma' },
  { label: '10-Inferno', v: '18-inferno' }, { label: '11-Mint', v: '19-mint' },
  { label: '12-Dusk', v: '20-dusk' }, { label: '13-Mono', v: '21-mono' },
  { label: '14-Fog', v: '22-fog' }, { label: '15-Scan', v: '23-scan' },
  { label: '16-Bokeh', v: '24-light-bokeh' }, { label: '17-Silver', v: '25-silver-radial' },
  { label: '18-Wall', v: '26-wall-texture' }, { label: '19-Concrete', v: '27-concrete' },
  { label: '20-Metal', v: '28-brushed-metal' },
]

// ── MAIN ─────────────────────────────────────────────────────────
export default function Settings2({ theme, setTheme, onClose, workspaces = [], activeWs, setActiveWs, onAddWorkspace, onRenameWorkspace, onDeleteWorkspace }) {
  const [newWsName, setNewWsName] = useState('')
  const [tab, setTab] = useState('appearance')
  const [search, setSearch] = useState('')
  const [adv, setAdv] = useState({})
  const [configMode, setConfigMode] = useState(false)
  const [visible, setVisible] = useState(() => {
    try { return JSON.parse(localStorage.getItem('settings_visible') || '{}') } catch { return {} }
  })

  const set = (key, val) => setTheme(prev => ({ ...prev, [key]: val }))
  const showAdv = (s) => adv[s] ?? false
  const toggleAdv = (s) => setAdv(p => ({ ...p, [s]: !p[s] }))
  const isVisible = (key) => visible[key] ?? true
  const toggleVisible = (key) => {
    setVisible(prev => { const n = { ...prev, [key]: !(prev[key] ?? true) }; localStorage.setItem('settings_visible', JSON.stringify(n)); return n })
  }

  const saveAsDefault = () => { localStorage.setItem('user_default_theme', JSON.stringify(theme)); alert('Current theme saved as global default.') }
  const resetToDefault = () => {
    const s = localStorage.getItem('user_default_theme')
    if (s) { setTheme(p => ({ ...p, ...JSON.parse(s) })); alert('Reset to your saved default.') }
    else alert('No saved default. Press "Save as default" first.')
  }

  const all = search || configMode
  const advOpen = (s) => showAdv(s) || all
  const r = rp(search, configMode, isVisible, toggleVisible)

  const TABS = [
    { id: 'appearance', label: 'Look' },
    { id: 'layout', label: 'Layout' },
    { id: 'notepad', label: 'Notepad' },
    { id: 'widgets', label: 'Widgets' },
    { id: 'system', label: 'System' },
  ]

  return (
    <div className="s2-backdrop" onClick={onClose}>
      <div className="s2-panel" onClick={e => e.stopPropagation()}>
        <div className="s2-header">
          <button className="s2-side-btn" onClick={() => set('settingsSide', (theme.settingsSide || 'right') === 'right' ? 'left' : 'right')} title="Move panel to other side">{(theme.settingsSide || 'right') === 'right' ? '◀' : '▶'}</button>
          <span className="s2-title">{configMode ? 'Choose visible settings' : 'Settings'}</span>
          <button className="s2-close" onClick={onClose}>×</button>
        </div>

        <div className="s2-tabs">
          {TABS.map(t => <button key={t.id} className={`s2-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>)}
        </div>

        <div className="s2-search-row">
          <input className="s2-search" placeholder="Search settings..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="s2-content">

          {/* ═══ APPEARANCE ═══ */}
          {(tab === 'appearance' || all) && <>
            <div className="s2-section-title">Background</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', padding: '0.2rem 0 0.5rem' }}>
              {BG_PRESETS.map(p => (
                <button key={p.v} className={`btn-xs${theme.bgPreset === p.v ? ' btn-primary' : ''}`} style={{ fontSize: '0.65em' }} onClick={() => set('bgPreset', p.v)}>{p.label}</button>
              ))}
            </div>
            <Row label="Animation speed" {...r}><Slider val={Math.round((theme.bgAnimSpeed ?? 1) * 100)} min={0} max={300} onChange={v => set('bgAnimSpeed', v / 100)} unit="%" /></Row>
            <Adv id="bg" show={showAdv('bg')} onToggle={toggleAdv} />
            {advOpen('bg') && <>
              <Row label="BG color 1" {...r}><ColorPick value={theme.bgC1 || '#2a4a6a'} onChange={v => set('bgC1', v)} /></Row>
              <Row label="BG color 2" {...r}><ColorPick value={theme.bgC2 || '#4a2a5a'} onChange={v => set('bgC2', v)} /></Row>
              <Row label="BG color 3" {...r}><ColorPick value={theme.bgC3 || '#1a3a4a'} onChange={v => set('bgC3', v)} /></Row>
              <Row label="BG blur" {...r}><Slider val={theme.bgBlur ?? 0} min={0} max={30} onChange={v => set('bgBlur', v)} unit="px" /></Row>
              <Row label="Pattern color" {...r}><ColorPick value={theme.patternColor || '#2a2a3f'} onChange={v => set('patternColor', v)} /></Row>
              <Row label="Pattern opacity" {...r}><Slider val={Math.round((theme.patternOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('patternOpacity', v / 100)} unit="%" /></Row>
            </>}

            <div className="s2-section-title">Colors</div>
            <Row label="Background" {...r}><ColorPick value={theme.bg} onChange={v => set('bg', v)} /></Row>
            <Row label="Cards" {...r}><ColorPick value={theme.card} onChange={v => set('card', v)} /></Row>
            <Row label="Accent" {...r}><ColorPick value={theme.accent} onChange={v => set('accent', v)} /></Row>
            <Row label="Primary text" {...r}><ColorPick value={theme.text} onChange={v => set('text', v)} /></Row>
            <Row label="Secondary text" {...r}><ColorPick value={theme.textDim} onChange={v => set('textDim', v)} /></Row>
            <Row label="Border" {...r}><ColorPick value={theme.border} onChange={v => set('border', v)} /></Row>
            <Adv id="colors" show={showAdv('colors')} onToggle={toggleAdv} />
            {advOpen('colors') && <>
              <Row label="Card bg 2" {...r}><ColorPick value={theme.bg2} onChange={v => set('bg2', v)} /></Row>
              <Row label="Card bg 3" {...r}><ColorPick value={theme.bg3} onChange={v => set('bg3', v)} /></Row>
              <Row label="Title bg" {...r}><ColorPick value={theme.titleBg} onChange={v => set('titleBg', v)} /></Row>
              <Row label="Border hover" {...r}><ColorPick value={theme.borderHover} onChange={v => set('borderHover', v)} /></Row>
              <Row label="Card opacity" {...r}><Slider val={Math.round((theme.cardOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('cardOpacity', v / 100)} unit="%" /></Row>
              <Row label="Border opacity" {...r}><Slider val={Math.round((theme.borderOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('borderOpacity', v / 100)} unit="%" /></Row>
              <Row label="Link color" {...r}><ColorPick value={theme.linkColor || '#5b9eff'} onChange={v => set('linkColor', v)} /></Row>
              <Row label="Visited link" {...r}><ColorPick value={theme.linkVisitedColor || '#c77dff'} onChange={v => set('linkVisitedColor', v)} /></Row>
              <Row label="Scrollbar" {...r}><ColorPick value={theme.scrollbarThumbColor || '#7890ff'} onChange={v => set('scrollbarThumbColor', v)} /></Row>
              <Row label="Handle opacity" {...r}><Slider val={theme.handleOpacity ?? 15} min={5} max={100} onChange={v => set('handleOpacity', v)} unit="%" /></Row>
            </>}

            <div className="s2-section-title">Wallpaper</div>
            <Row label="URL" {...r}><input className="s2-input" value={theme.wallpaper || ''} onChange={e => set('wallpaper', e.target.value)} placeholder="https://..." /></Row>
            <Adv id="wp" show={showAdv('wp')} onToggle={toggleAdv} />
            {advOpen('wp') && <>
              <Row label="Fit" {...r}><select className="s2-select" value={theme.wallpaperFit || 'cover'} onChange={e => set('wallpaperFit', e.target.value)}><option value="cover">Cover</option><option value="contain">Contain</option><option value="fill">Fill</option></select></Row>
              <Row label="Position X" {...r}><Slider val={theme.wallpaperX ?? 50} min={0} max={100} onChange={v => set('wallpaperX', v)} unit="%" /></Row>
              <Row label="Position Y" {...r}><Slider val={theme.wallpaperY ?? 50} min={0} max={100} onChange={v => set('wallpaperY', v)} unit="%" /></Row>
              <Row label="Scale" {...r}><Slider val={theme.wallpaperScale ?? 100} min={50} max={200} onChange={v => set('wallpaperScale', v)} unit="%" /></Row>
              <Row label="Blur" {...r}><Slider val={theme.wallpaperBlur ?? 0} min={0} max={30} onChange={v => set('wallpaperBlur', v)} unit="px" /></Row>
              <Row label="Dim" {...r}><Slider val={theme.wallpaperDim ?? 35} min={0} max={100} onChange={v => set('wallpaperDim', v)} unit="%" /></Row>
            </>}

            <div className="s2-section-title">Gradient</div>
            <Row label="Enable gradient" {...r}><Toggle checked={theme.cardsGradientEnabled ?? false} onChange={v => set('cardsGradientEnabled', v)} /></Row>
            {theme.cardsGradientEnabled && <>
              <Row label="Color 1" {...r}><ColorPick value={theme.cardsGradientColor1 || '#00ff88'} onChange={v => set('cardsGradientColor1', v)} /></Row>
              <Row label="Color 2" {...r}><ColorPick value={theme.cardsGradientColor2 || '#00ccff'} onChange={v => set('cardsGradientColor2', v)} /></Row>
              <Row label="Color 3" {...r}><ColorPick value={theme.cardsGradientColor3 || '#7b2ff7'} onChange={v => set('cardsGradientColor3', v)} /></Row>
              <Row label="Gradient type" {...r}><select className="s2-select" value={theme.cardsGradientType || 'linear'} onChange={e => set('cardsGradientType', e.target.value)}><option value="linear">Linear</option><option value="radial">Radial</option></select></Row>
              <Row label="Angle" {...r}><Slider val={theme.cardsGradientAngle ?? 180} min={0} max={360} onChange={v => set('cardsGradientAngle', v)} unit="°" /></Row>
              <Row label="Blend mode" {...r}><select className="s2-select" value={theme.cardsGradientBlendMode || 'overlay'} onChange={e => set('cardsGradientBlendMode', e.target.value)}><option value="normal">Normal</option><option value="overlay">Overlay</option><option value="multiply">Multiply</option><option value="screen">Screen</option></select></Row>
              <Row label="Opacity" {...r}><Slider val={Math.round((theme.cardsGradientOpacity ?? 0.5) * 100)} min={0} max={100} onChange={v => set('cardsGradientOpacity', v / 100)} unit="%" /></Row>
              <Row label="Apply to panels" {...r}><Toggle checked={theme.cardsGradientTargetPanels ?? true} onChange={v => set('cardsGradientTargetPanels', v)} /></Row>
              <Row label="Apply to wallpaper" {...r}><Toggle checked={theme.cardsGradientTargetWallpaper ?? false} onChange={v => set('cardsGradientTargetWallpaper', v)} /></Row>
            </>}
          </>}

          {/* ═══ LAYOUT ═══ */}
          {(tab === 'layout' || all) && <>
            <div className="s2-section-title">Grid</div>
            <Row label="Columns" {...r}><Slider val={theme.sectionsCols ?? 6} min={1} max={10} onChange={v => set('sectionsCols', v)} /></Row>
            <Row label="Topbar gap" {...r}><Slider val={theme.mainGapTop ?? 12} min={0} max={150} step={2} onChange={v => set('mainGapTop', v)} unit="px" /></Row>
            <Adv id="grid" show={showAdv('grid')} onToggle={toggleAdv} />
            {advOpen('grid') && <>
              <Row label="Section gap (v)" {...r}><Slider val={theme.sectionGap ?? 0} min={0} max={32} onChange={v => set('sectionGap', v)} unit="px" /></Row>
              <Row label="Section gap (h)" {...r}><Slider val={theme.sectionGapH ?? 0} min={0} max={32} onChange={v => set('sectionGapH', v)} unit="px" /></Row>
              <Row label="Link gap" {...r}><Slider val={Math.round((theme.linkGap ?? 0.5) * 100)} min={-50} max={200} step={5} onChange={v => set('linkGap', v / 100)} unit="%" /></Row>
              <Row label="Link padding" {...r}><Slider val={Math.round((theme.linksPaddingH ?? 0.75) * 100)} min={-140} max={200} step={5} onChange={v => set('linksPaddingH', v / 100)} unit="%" /></Row>
            </>}

            <div className="s2-section-title">Typography</div>
            <Row label="Font" {...r}><select className="s2-select" value={theme.font || "'DM Mono', monospace"} onChange={e => set('font', e.target.value)}><option value="'DM Mono', monospace">DM Mono</option><option value="'Inter', sans-serif">Inter</option><option value="'Fira Code', monospace">Fira Code</option><option value="'JetBrains Mono', monospace">JetBrains Mono</option><option value="'Space Grotesk', sans-serif">Space Grotesk</option><option value="system-ui, sans-serif">System UI</option></select></Row>
            <Row label="Body size" {...r}><Slider val={theme.fontSize ?? 14} min={10} max={20} onChange={v => set('fontSize', v)} unit="px" /></Row>
            <Row label="Topbar size" {...r}><Slider val={theme.topbarFontSize ?? 12} min={9} max={20} onChange={v => set('topbarFontSize', v)} unit="px" /></Row>

            <div className="s2-section-title">Cards & borders</div>
            <Row label="Corner radius" {...r}><Slider val={theme.radius ?? 10} min={0} max={24} onChange={v => { set('radius', v); set('sectionRadius', v); set('notesRadius', v) }} unit="px" /></Row>
            <Row label="Card padding" {...r}><Slider val={Math.round((theme.cardPadding ?? 0.75) * 100)} min={0} max={150} step={5} onChange={v => set('cardPadding', v / 100)} unit="%" /></Row>
            <Row label="Shadow" {...r}><Toggle checked={theme.cardShadowEnabled ?? false} onChange={v => set('cardShadowEnabled', v)} /></Row>
            {theme.cardShadowEnabled && <>
              <Row label="Shadow size" {...r}><Slider val={theme.cardShadowSize ?? 8} min={0} max={60} onChange={v => set('cardShadowSize', v)} unit="px" /></Row>
              <Row label="Shadow opacity" {...r}><Slider val={Math.round((theme.cardShadowOpacity ?? 0.3) * 100)} min={0} max={100} onChange={v => set('cardShadowOpacity', v / 100)} unit="%" /></Row>
              <Row label="Shadow color" {...r}><ColorPick value={theme.cardShadowColor || '#000000'} onChange={v => set('cardShadowColor', v)} /></Row>
            </>}
            <Adv id="cards" show={showAdv('cards')} onToggle={toggleAdv} />
            {advOpen('cards') && <>
              <Row label="Header height" {...r}><Slider val={Math.round((theme.headerPadding ?? 0.42) * 100)} min={10} max={80} step={2} onChange={v => set('headerPadding', v / 100)} unit="%" /></Row>
              <Row label="Page scale" {...r}><Slider val={Math.round((theme.pageScale ?? 1) * 100)} min={70} max={130} onChange={v => set('pageScale', v / 100)} unit="%" /></Row>
              <Row label="Section radius" {...r}><Slider val={theme.sectionRadius ?? 0} min={0} max={20} onChange={v => set('sectionRadius', v)} unit="px" /></Row>
            </>}
          </>}

          {/* ═══ NOTEPAD ═══ */}
          {(tab === 'notepad' || all) && <>
            <div className="s2-section-title">Dimensions</div>
            <Row label="Notepad width" {...r}><Slider val={theme.notepadWidth ?? 320} min={250} max={600} onChange={v => set('notepadWidth', v)} unit="px" /></Row>
            <Row label="Info column width" {...r}><Slider val={theme.archiveColWidth ?? 280} min={180} max={500} onChange={v => set('archiveColWidth', v)} unit="px" /></Row>
            <div className="s2-section-title">Typography</div>
            <Row label="Font" {...r}><select className="s2-select" value={theme.notesFontFamily || 'inherit'} onChange={e => set('notesFontFamily', e.target.value)}><option value="inherit">Same as app</option><option value="'DM Mono', monospace">DM Mono</option><option value="'Inter', sans-serif">Inter</option><option value="'Georgia', serif">Georgia</option><option value="system-ui, sans-serif">System UI</option></select></Row>
            <Row label="Font size" {...r}><Slider val={theme.notesFontSize ?? 13} min={10} max={20} onChange={v => set('notesFontSize', v)} unit="px" /></Row>
            <div className="s2-section-title">Colors</div>
            <Row label="Text color" {...r}><ColorPick value={theme.notesTextColor || '#e8e8f0'} onChange={v => set('notesTextColor', v)} /></Row>
            <Row label="Notepad opacity" {...r}><Slider val={Math.round((theme.notesCardBgOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('notesCardBgOpacity', v / 100)} unit="%" /></Row>
            <Row label="Shared tab bg" {...r}><ColorPick value={theme.notesSharedBg || '#1a1a28'} onChange={v => set('notesSharedBg', v)} /></Row>
          </>}

          {/* ═══ WIDGETS ═══ */}
          {(tab === 'widgets' || all) && <>
            <div className="s2-section-title">Clock</div>
            <Row label="Clock size" {...r}><Slider val={Math.round((theme.clockWidgetSize ?? 1) * 10)} min={5} max={30} onChange={v => set('clockWidgetSize', v / 10)} unit="×" /></Row>

            <div className="s2-section-title">Favicons</div>
            <Row label="Show favicons" {...r}><Toggle checked={theme.faviconEnabled ?? true} onChange={v => set('faviconEnabled', v)} /></Row>
            <Row label="Favicon size" {...r}><Slider val={theme.faviconSize ?? 13} min={10} max={24} onChange={v => set('faviconSize', v)} unit="px" /></Row>
            <Adv id="fav" show={showAdv('fav')} onToggle={toggleAdv} />
            {advOpen('fav') && <>
              <Row label="Favicon opacity" {...r}><Slider val={Math.round((theme.faviconOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('faviconOpacity', v / 100)} unit="%" /></Row>
              <Row label="Greyscale" {...r}><Toggle checked={theme.faviconGreyscale ?? false} onChange={v => set('faviconGreyscale', v)} /></Row>
              <Row label="Load delay" {...r}><Slider val={theme.faviconDelay ?? 0} min={0} max={5} step={0.5} onChange={v => set('faviconDelay', v)} unit="s" /></Row>
              <Row label="Fade-in" {...r}><Slider val={theme.faviconFade ?? 0.3} min={0} max={2} step={0.1} onChange={v => set('faviconFade', v)} unit="s" /></Row>
            </>}

            <div className="s2-section-title">News</div>
            <Row label="News font size" {...r}><Slider val={theme.newsFontSize ?? 12} min={9} max={18} onChange={v => set('newsFontSize', v)} unit="px" /></Row>
            <Row label="Widget panel position" {...r}><select className="s2-select" value={theme.widgetPanelPosition || 'above'} onChange={e => set('widgetPanelPosition', e.target.value)}><option value="above">Above archived</option><option value="below">Below archived</option></select></Row>
          </>}

          {/* ═══ SYSTEM ═══ */}
          {(tab === 'system' || all) && <>
            <div className="s2-section-title">Visibility</div>
            <Row label="Clock" {...r}><Toggle checked={!(theme.hideClock ?? false)} onChange={v => set('hideClock', !v)} /></Row>
            <Row label="Weather" {...r}><Toggle checked={!(theme.hideWeather ?? false)} onChange={v => set('hideWeather', !v)} /></Row>
            <Row label="Search bar" {...r}><Toggle checked={!(theme.hideSearch ?? false)} onChange={v => set('hideSearch', !v)} /></Row>
            <Row label="Cards" {...r}><Toggle checked={!(theme.hideCards ?? false)} onChange={v => set('hideCards', !v)} /></Row>
            <Row label="Notepad" {...r}><Toggle checked={!(theme.hideNotes ?? false)} onChange={v => set('hideNotes', !v)} /></Row>
            <Row label="Open links in new tab" {...r}><Toggle checked={theme.openInNewTab ?? true} onChange={v => set('openInNewTab', v)} /></Row>

            <div className="s2-section-title">Mobile</div>
            <Row label="Notepad first" {...r}><Toggle checked={theme.mobileNotesFirst ?? true} onChange={v => set('mobileNotesFirst', v)} /></Row>

            <div className="s2-section-title">Search engine</div>
            <Row label="Engine" {...r}><select className="s2-select" value={theme.searchEngineUrl || 'https://www.google.com/search?q='} onChange={e => set('searchEngineUrl', e.target.value)}><option value="https://www.google.com/search?q=">Google</option><option value="https://duckduckgo.com/?q=">DuckDuckGo</option><option value="https://www.bing.com/search?q=">Bing</option><option value="https://search.brave.com/search?q=">Brave</option><option value="https://www.perplexity.ai/search?q=">Perplexity</option></select></Row>

            <div className="s2-section-title">Workspaces</div>
            {workspaces.map(ws => (
              <div key={ws.id} className="s2-row" style={{ gap: '0.3rem' }}>
                <span className="s2-row-label" style={{ flex: 1, color: ws.id === activeWs ? 'var(--accent)' : undefined, cursor: 'pointer' }} onClick={() => setActiveWs?.(ws.id)}>{ws.name}</span>
                <button className="btn-xs" style={{ fontSize: '0.7em', padding: '0.15rem 0.3rem' }} onClick={() => { const n = prompt('Rename workspace:', ws.name); if (n?.trim()) onRenameWorkspace?.(ws.id, n.trim()) }}>✎</button>
                <button className="btn-xs" style={{ fontSize: '0.7em', padding: '0.15rem 0.3rem', color: 'var(--danger)' }} onClick={() => onDeleteWorkspace?.(ws.id)} disabled={workspaces.length <= 1}>✕</button>
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.3rem' }}>
              <input className="s2-input" style={{ flex: 1 }} placeholder="New workspace..." value={newWsName} onChange={e => setNewWsName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newWsName.trim()) { onAddWorkspace?.(newWsName.trim()); setNewWsName('') } }} />
              <button className="btn-xs btn-primary" style={{ fontSize: '0.72em' }} disabled={!newWsName.trim()} onClick={() => { if (newWsName.trim()) { onAddWorkspace?.(newWsName.trim()); setNewWsName('') } }}>Add</button>
            </div>
          </>}

        </div>

        <div className="s2-footer">
          {configMode ? (
            <button className="s2-btn" style={{ flex: 'none', width: '100%', borderColor: 'var(--accent)', color: 'var(--accent)' }} onClick={() => setConfigMode(false)}>Done — save visible settings</button>
          ) : (<>
            <button className="s2-btn" onClick={saveAsDefault}>Save as default</button>
            <button className="s2-btn" onClick={resetToDefault}>Reset to default</button>
            <button className="s2-btn" onClick={() => setConfigMode(true)} title="Choose which settings to show">☰</button>
          </>)}
        </div>

      </div>
    </div>
  )
}
