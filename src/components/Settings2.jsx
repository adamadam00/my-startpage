import { useState, useEffect } from 'react'

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

const Row = ({ label, children, hint }) => (
  <div className="s2-row">
    <span className="s2-row-label">{label}</span>
    <div className="s2-row-ctrl">{children}</div>
    {hint && <div className="s2-row-hint">{hint}</div>}
  </div>
)

const AdvancedToggle = ({ show, onToggle }) => (
  <button className="s2-adv-toggle" onClick={onToggle}>
    {show ? '▾ Hide advanced' : '▸ Show advanced'}
  </button>
)

// ── MAIN COMPONENT ───────────────────────────────────────────────
export default function Settings2({ theme, setTheme, onClose, workspaces, activeWs, supabase, session }) {
  const [tab, setTab] = useState('appearance')
  const [adv, setAdv] = useState({})

  const set = (key, val) => setTheme(prev => ({ ...prev, [key]: val }))
  const showAdv = (section) => adv[section] ?? false
  const toggleAdv = (section) => setAdv(prev => ({ ...prev, [section]: !prev[section] }))

  const saveAsDefault = () => {
    localStorage.setItem('user_default_theme', JSON.stringify(theme))
    alert('Current theme saved as your global default.')
  }

  const resetToDefault = () => {
    const saved = localStorage.getItem('user_default_theme')
    if (saved) {
      setTheme(prev => ({ ...prev, ...JSON.parse(saved) }))
      alert('Reset to your saved default.')
    } else {
      alert('No saved default found. Use "Save as default" first.')
    }
  }

  const TABS = [
    { id: 'appearance', label: 'Appearance' },
    { id: 'layout', label: 'Layout' },
    { id: 'notepad', label: 'Notepad' },
    { id: 'visibility', label: 'Visibility' },
  ]

  return (
    <div className="s2-backdrop" onClick={onClose}>
      <div className="s2-panel" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="s2-header">
          <span className="s2-title">Settings</span>
          <button className="s2-close" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="s2-tabs">
          {TABS.map(t => (
            <button key={t.id} className={`s2-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="s2-content">

          {/* ── APPEARANCE ─────────────────────────────────── */}
          {tab === 'appearance' && <>
            <div className="s2-section-title">Colors</div>
            <Row label="Background"><ColorPick value={theme.bg} onChange={v => set('bg', v)} /></Row>
            <Row label="Cards"><ColorPick value={theme.card} onChange={v => set('card', v)} /></Row>
            <Row label="Accent"><ColorPick value={theme.accent} onChange={v => set('accent', v)} /></Row>
            <Row label="Primary text"><ColorPick value={theme.text} onChange={v => set('text', v)} /></Row>
            <Row label="Secondary text"><ColorPick value={theme.textDim} onChange={v => set('textDim', v)} /></Row>
            <Row label="Border"><ColorPick value={theme.border} onChange={v => set('border', v)} /></Row>

            <AdvancedToggle show={showAdv('colors')} onToggle={() => toggleAdv('colors')} />
            {showAdv('colors') && <>
              <Row label="Card bg 2"><ColorPick value={theme.bg2} onChange={v => set('bg2', v)} /></Row>
              <Row label="Card bg 3"><ColorPick value={theme.bg3} onChange={v => set('bg3', v)} /></Row>
              <Row label="Title bg"><ColorPick value={theme.titleBg} onChange={v => set('titleBg', v)} /></Row>
              <Row label="Border hover"><ColorPick value={theme.borderHover} onChange={v => set('borderHover', v)} /></Row>
              <Row label="Card opacity"><Slider val={Math.round((theme.cardOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('cardOpacity', v / 100)} unit="%" /></Row>
              <Row label="Border opacity"><Slider val={Math.round((theme.borderOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('borderOpacity', v / 100)} unit="%" /></Row>
              <Row label="Link color"><ColorPick value={theme.linkColor || '#5b9eff'} onChange={v => set('linkColor', v)} /></Row>
              <Row label="Visited link"><ColorPick value={theme.linkVisitedColor || '#c77dff'} onChange={v => set('linkVisitedColor', v)} /></Row>
              <Row label="Scrollbar"><ColorPick value={theme.scrollbarThumbColor || '#7890ff'} onChange={v => set('scrollbarThumbColor', v)} /></Row>
              <Row label="Handle opacity"><Slider val={theme.handleOpacity ?? 15} min={5} max={100} onChange={v => set('handleOpacity', v)} unit="%" /></Row>
            </>}

            <div className="s2-section-title">Background</div>
            <Row label="Pattern">
              <select className="s2-select" value={theme.bgPreset || 'noise'} onChange={e => set('bgPreset', e.target.value)}>
                <option value="noise">Noise</option>
                <option value="dots">Dots</option>
                <option value="grid">Grid</option>
                <option value="lines">Lines</option>
                <option value="none">None</option>
                <option value="ocean">Ocean</option>
                <option value="grass">Grass</option>
                <option value="starfield">Starfield</option>
              </select>
            </Row>
            <Row label="Animation speed"><Slider val={Math.round((theme.bgAnimSpeed ?? 1) * 100)} min={0} max={300} onChange={v => set('bgAnimSpeed', v / 100)} unit="%" /></Row>

            <AdvancedToggle show={showAdv('bg')} onToggle={() => toggleAdv('bg')} />
            {showAdv('bg') && <>
              <Row label="Pattern color"><ColorPick value={theme.patternColor || '#2a2a3f'} onChange={v => set('patternColor', v)} /></Row>
              <Row label="Pattern opacity"><Slider val={Math.round((theme.patternOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('patternOpacity', v / 100)} unit="%" /></Row>
            </>}

            <div className="s2-section-title">Wallpaper</div>
            <Row label="URL">
              <input className="s2-input" value={theme.wallpaper || ''} onChange={e => set('wallpaper', e.target.value)} placeholder="https://..." />
            </Row>
            <AdvancedToggle show={showAdv('wallpaper')} onToggle={() => toggleAdv('wallpaper')} />
            {showAdv('wallpaper') && <>
              <Row label="Fit">
                <select className="s2-select" value={theme.wallpaperFit || 'cover'} onChange={e => set('wallpaperFit', e.target.value)}>
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                  <option value="fill">Fill</option>
                </select>
              </Row>
              <Row label="Position X"><Slider val={theme.wallpaperX ?? 50} min={0} max={100} onChange={v => set('wallpaperX', v)} unit="%" /></Row>
              <Row label="Position Y"><Slider val={theme.wallpaperY ?? 50} min={0} max={100} onChange={v => set('wallpaperY', v)} unit="%" /></Row>
              <Row label="Scale"><Slider val={theme.wallpaperScale ?? 100} min={50} max={200} onChange={v => set('wallpaperScale', v)} unit="%" /></Row>
              <Row label="Blur"><Slider val={theme.wallpaperBlur ?? 0} min={0} max={30} onChange={v => set('wallpaperBlur', v)} unit="px" /></Row>
              <Row label="Dim"><Slider val={theme.wallpaperDim ?? 35} min={0} max={100} onChange={v => set('wallpaperDim', v)} unit="%" /></Row>
            </>}
          </>}

          {/* ── LAYOUT ─────────────────────────────────────── */}
          {tab === 'layout' && <>
            <div className="s2-section-title">Grid</div>
            <Row label="Columns"><Slider val={theme.sectionsCols ?? 6} min={1} max={10} onChange={v => set('sectionsCols', v)} /></Row>
            <Row label="Topbar gap"><Slider val={theme.mainGapTop ?? 12} min={0} max={150} step={2} onChange={v => set('mainGapTop', v)} unit="px" /></Row>

            <AdvancedToggle show={showAdv('grid')} onToggle={() => toggleAdv('grid')} />
            {showAdv('grid') && <>
              <Row label="Section gap (v)"><Slider val={theme.sectionGap ?? 0} min={0} max={32} onChange={v => set('sectionGap', v)} unit="px" /></Row>
              <Row label="Section gap (h)"><Slider val={theme.sectionGapH ?? 0} min={0} max={32} onChange={v => set('sectionGapH', v)} unit="px" /></Row>
              <Row label="Link gap"><Slider val={Math.round((theme.linkGap ?? 0.5) * 100)} min={-50} max={200} step={5} onChange={v => set('linkGap', v / 100)} unit="%" /></Row>
              <Row label="Link padding"><Slider val={Math.round((theme.linksPaddingH ?? 0.75) * 100)} min={-140} max={200} step={5} onChange={v => set('linksPaddingH', v / 100)} unit="%" /></Row>
            </>}

            <div className="s2-section-title">Typography</div>
            <Row label="Font">
              <select className="s2-select" value={theme.font || "'DM Mono', monospace"} onChange={e => set('font', e.target.value)}>
                <option value="'DM Mono', monospace">DM Mono</option>
                <option value="'Inter', sans-serif">Inter</option>
                <option value="'Fira Code', monospace">Fira Code</option>
                <option value="'JetBrains Mono', monospace">JetBrains Mono</option>
                <option value="'Space Grotesk', sans-serif">Space Grotesk</option>
                <option value="system-ui, sans-serif">System UI</option>
              </select>
            </Row>
            <Row label="Body size"><Slider val={theme.fontSize ?? 14} min={10} max={20} onChange={v => set('fontSize', v)} unit="px" /></Row>
            <Row label="Topbar size"><Slider val={theme.topbarFontSize ?? 12} min={9} max={20} onChange={v => set('topbarFontSize', v)} unit="px" /></Row>

            <AdvancedToggle show={showAdv('typo')} onToggle={() => toggleAdv('typo')} />
            {showAdv('typo') && <>
              <Row label="Corner radius"><Slider val={theme.radius ?? 10} min={0} max={24} onChange={v => set('radius', v)} unit="px" /></Row>
              <Row label="Section radius"><Slider val={theme.sectionRadius ?? 0} min={0} max={20} onChange={v => set('sectionRadius', v)} unit="px" /></Row>
              <Row label="Page scale"><Slider val={Math.round((theme.pageScale ?? 1) * 100)} min={70} max={130} onChange={v => set('pageScale', v / 100)} unit="%" /></Row>
            </>}

            <div className="s2-section-title">Cards</div>
            <Row label="Shadow"><Toggle checked={theme.cardShadowEnabled ?? false} onChange={v => set('cardShadowEnabled', v)} /></Row>
            {theme.cardShadowEnabled && <>
              <Row label="Shadow size"><Slider val={theme.cardShadowSize ?? 8} min={0} max={30} onChange={v => set('cardShadowSize', v)} unit="px" /></Row>
              <Row label="Shadow opacity"><Slider val={Math.round((theme.cardShadowOpacity ?? 0.3) * 100)} min={0} max={100} onChange={v => set('cardShadowOpacity', v / 100)} unit="%" /></Row>
            </>}
          </>}

          {/* ── NOTEPAD ────────────────────────────────────── */}
          {tab === 'notepad' && <>
            <div className="s2-section-title">Dimensions</div>
            <Row label="Notepad width"><Slider val={theme.notepadWidth ?? 320} min={250} max={600} onChange={v => set('notepadWidth', v)} unit="px" /></Row>
            <Row label="Info column width"><Slider val={theme.archiveColWidth ?? 280} min={180} max={500} onChange={v => set('archiveColWidth', v)} unit="px" /></Row>

            <div className="s2-section-title">Typography</div>
            <Row label="Font">
              <select className="s2-select" value={theme.notesFontFamily || 'inherit'} onChange={e => set('notesFontFamily', e.target.value)}>
                <option value="inherit">Same as app</option>
                <option value="'DM Mono', monospace">DM Mono</option>
                <option value="'Inter', sans-serif">Inter</option>
                <option value="'Georgia', serif">Georgia</option>
                <option value="'Courier New', monospace">Courier New</option>
                <option value="system-ui, sans-serif">System UI</option>
              </select>
            </Row>
            <Row label="Font size"><Slider val={theme.notesFontSize ?? 13} min={10} max={20} onChange={v => set('notesFontSize', v)} unit="px" /></Row>

            <div className="s2-section-title">Colors</div>
            <Row label="Text color"><ColorPick value={theme.notesTextColor || '#e8e8f0'} onChange={v => set('notesTextColor', v)} /></Row>
            <Row label="Notepad opacity"><Slider val={Math.round((theme.notesCardBgOpacity ?? 1) * 100)} min={0} max={100} onChange={v => set('notesCardBgOpacity', v / 100)} unit="%" /></Row>
            <Row label="Shared tab bg"><ColorPick value={theme.notesSharedBg || '#1a1a28'} onChange={v => set('notesSharedBg', v)} /></Row>
          </>}

          {/* ── VISIBILITY ─────────────────────────────────── */}
          {tab === 'visibility' && <>
            <div className="s2-section-title">Show / Hide</div>
            <Row label="Clock"><Toggle checked={!(theme.hideClock ?? false)} onChange={v => set('hideClock', !v)} /></Row>
            <Row label="Weather"><Toggle checked={!(theme.hideWeather ?? false)} onChange={v => set('hideWeather', !v)} /></Row>
            <Row label="Search bar"><Toggle checked={!(theme.hideSearch ?? false)} onChange={v => set('hideSearch', !v)} /></Row>
            <Row label="Cards"><Toggle checked={!(theme.hideCards ?? false)} onChange={v => set('hideCards', !v)} /></Row>
            <Row label="Notepad"><Toggle checked={!(theme.hideNotes ?? false)} onChange={v => set('hideNotes', !v)} /></Row>
            <Row label="Open links in new tab"><Toggle checked={theme.openInNewTab ?? true} onChange={v => set('openInNewTab', v)} /></Row>

            <div className="s2-section-title">Mobile</div>
            <Row label="Notepad first"><Toggle checked={theme.mobileNotesFirst ?? true} onChange={v => set('mobileNotesFirst', v)} /></Row>

            <div className="s2-section-title">Search</div>
            <Row label="Search engine">
              <select className="s2-select" value={theme.searchEngineUrl || 'https://www.google.com/search?q='} onChange={e => set('searchEngineUrl', e.target.value)}>
                <option value="https://www.google.com/search?q=">Google</option>
                <option value="https://duckduckgo.com/?q=">DuckDuckGo</option>
                <option value="https://www.bing.com/search?q=">Bing</option>
              </select>
            </Row>
          </>}
        </div>

        {/* Footer */}
        <div className="s2-footer">
          <button className="s2-btn" onClick={saveAsDefault}>Save as default</button>
          <button className="s2-btn" onClick={resetToDefault}>Reset to default</button>
        </div>
      </div>
    </div>
  )
}
