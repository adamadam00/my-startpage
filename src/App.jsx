import { useEffect, useRef, useState, useMemo } from 'react'
import Auth from './components/Auth'
import Sections from './components/Sections'
import Notes from './components/Notes'
import Settings from './components/Settings'
import { supabase } from './lib/supabase'
import './index.css'

// ─── CLOCK WIDGET ─────────────────────────────────────────────────────────────
function ClockWidget() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const hm   = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <div className="clock-compact">
      <span className="clock-compact-time">{hm}</span>
      <span className="clock-compact-date">{date}</span>
    </div>
  )
}

// ─── WEATHER WIDGET ───────────────────────────────────────────────────────────
function WeatherWidget() {
  const [wx, setWx] = useState(null)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true&temperature_unit=celsius`
        )
        const d = await r.json()
        setWx(d.current_weather)
      } catch {}
    }, () => {})
  }, [])
  if (!wx) return null
  const icons = { 0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',51:'🌦',53:'🌦',55:'🌦',61:'🌧',63:'🌧',65:'🌧',71:'🌨',73:'🌨',75:'🌨',80:'🌦',81:'🌦',82:'🌦',95:'⛈',96:'⛈',99:'⛈' }
  const descs = { 0:'Clear',1:'Mostly clear',2:'Partly cloudy',3:'Overcast',45:'Foggy',48:'Foggy',51:'Drizzle',53:'Drizzle',55:'Drizzle',61:'Rainy',63:'Rainy',65:'Heavy rain',71:'Snowy',73:'Snowy',75:'Heavy snow',80:'Showers',81:'Showers',82:'Heavy showers',95:'Stormy',96:'Stormy',99:'Stormy' }
  return (
    <div className="weather-wrap">
      <span className="weather-icon">{icons[wx.weathercode] || '🌡'}</span>
      <span className="weather-temp">{Math.round(wx.temperature)}°</span>
      <span className="weather-desc">{descs[wx.weathercode] || ''}</span>
    </div>
  )
}

// ─── DEFAULT THEME ─────────────────────────────────────────────────────────────
const DEFAULT_THEME = {
  bg: '#0c0c0f', bg2: '#13131a', bg3: '#1a1a24',
  card: '#13131a', cardOpacity: 1,
  border: '#2a2a3a', borderHover: '#3d3d55', borderOpacity: 1,
  handleOpacity: 15,
  text: '#e8e8f0', textDim: '#7878a0', titleColor: '#7878a0',
  accent: '#6c8fff', danger: '#ff6b6b', success: '#6bffb8',
  btnBg: '#3a3a4a', btnText: '#e8e8f0',
  font: "'DM Mono', monospace",
  fontSize: 14, topbarFontSize: 12, clockWidgetSize: 1, notesFontSize: 13, settingsFontSize: 13,
  radius: 10, sectionRadius: 0,
  linkGap: 0.5, cardPadding: 0.75,
  sectionGap: 0, sectionGapH: 0, mainGapTop: 12, pageScale: 1,
  faviconOpacity: 1, faviconGreyscale: false, faviconSize: 13,
  patternColor: '#2a2a3a', patternOpacity: 1,
  bgPreset: 'noise',
  wallpaper: '', wallpaperFit: 'cover', linksPaddingH: 0.75,
  bgAnimSpeed: 1, bgC1: '', bgC2: '', bgC3: '', bgBlur: null,
  bgSt: {},
  searchEngineUrl: 'https://www.google.com/search?q=',
  settingsTitleColor: '#7878a0',
  bgGrassSky: '#020609', bgGrassGround: '#071a05',
  bgOceanSky: '#000814', bgOceanWater: '#001428',
  wallpaperX: 50, wallpaperY: 50, wallpaperScale: 100,
  wallpaperBlur: 0, wallpaperDim: 35, wallpaperOpacity: 100,
  sectionsCols: 3,
  notesGap: 0, notesCardBg: '#13131a', notesTextColor: '#e8e8f0', notesTextBg: '#0c0c0f',
  settingsSide: 'right',
}

// ─── APPLY THEME ─────────────────────────────────────────────────────────────
function applyTheme(t) {
  if (!t) return
  const root = document.documentElement
  const s = (k, v) => { if (v !== undefined && v !== null) root.style.setProperty(k, String(v)) }
  s('--bg', t.bg); s('--bg2', t.bg2); s('--bg3', t.bg3)
  s('--card', t.card); s('--card-opacity', t.cardOpacity ?? 1)
  s('--border', t.border); s('--border-hover', t.borderHover)
  s('--border-opacity', t.borderOpacity ?? 1)
  s('--handle-opacity', (t.handleOpacity ?? 15) / 100)
  s('--text', t.text); s('--text-dim', t.textDim); s('--text-muted', t.textMuted ?? t.textDim)
  s('--title-color', t.titleColor ?? t.textDim)
  s('--accent', t.accent)
  if (t.accent) { s('--accent-dim', t.accent + '33'); s('--accent-glow', t.accent + '22') }
  s('--danger', t.danger); s('--success', t.success)
  s('--btn-bg', t.btnBg); s('--btn-text', t.btnText)
  s('--font', t.font)
  if (t.fontSize)        s('--font-size',        t.fontSize + 'px')
  if (t.topbarFontSize)  s('--topbar-font-size',  t.topbarFontSize + 'px')
  if (t.clockWidgetSize) s('--clock-widget-size', t.clockWidgetSize + 'rem')
  if (t.notesFontSize)   s('--notes-font-size',   t.notesFontSize + 'px')
  if (t.faviconSize)     s('--favicon-size',      t.faviconSize + 'px')
  if (t.radius != null)  { s('--radius', t.radius + 'px'); s('--radius-sm', Math.max(2, t.radius - 4) + 'px') }
  s('--section-radius',  (t.sectionRadius ?? 0) + 'px')
  if (t.linkGap != null)     s('--link-gap',     t.linkGap + 'rem')
  if (t.cardPadding != null) s('--card-padding', t.cardPadding + 'rem')
  s('--section-gap',   (t.sectionGap ?? 0) + 'px')
  s('--section-gap-h', (t.sectionGapH ?? 0) + 'px')
  s('--main-gap-top',  (t.mainGapTop ?? 12) + 'px')
  s('--sections-cols',  t.sectionsCols ?? 4)
  s('--favicon-opacity', t.faviconOpacity ?? 1)
  s('--favicon-filter',  t.faviconGreyscale ? 'grayscale(1)' : 'none')
  s('--favicon-display', (t.faviconEnabled ?? true) ? 'block' : 'none')
  s('--favicon-delay',   (t.faviconDelay ?? 0) + 's')
  s('--favicon-fade',    (t.faviconFade  ?? 0.3) + 's')
  s('--pattern-color',   t.patternColor); s('--pattern-opacity', t.patternOpacity ?? 1)
  s('--wallpaper-dim',   (t.wallpaperDim ?? 35) / 100)
  if (t.settingsFontSize) s('--settings-font-size', t.settingsFontSize + 'px')
  if (t.settingsTitleColor) s('--settings-title-color', t.settingsTitleColor)
  let styleEl = document.getElementById('sp-overrides')
  if (!styleEl) { styleEl = document.createElement('style'); styleEl.id = 'sp-overrides'; document.head.appendChild(styleEl) }
  const lph = t.linksPaddingH ?? 0.75
  if (lph >= 0) {
    styleEl.textContent = [
      '.links-list {',
      '  padding-left: ' + lph + 'rem !important;',
      '  padding-right: ' + lph + 'rem !important;',
      '  margin-left: 0 !important;',
      '}',
    ].join(' ')
  } else {
    styleEl.textContent = [
      '.links-list {',
      '  padding-left: 0 !important;',
      '  padding-right: var(--card-padding, 0.75rem) !important;',
      '  margin-left: ' + lph + 'rem !important;',
      '}',
    ].join(' ')
  }
  const rgba = (hex, aa) => {
    const h = (hex || '#000000').replace('#', '')
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16)
    return 'rgba(' + r + ',' + g + ',' + b + ',' + aa + ')'
  }
  const hexRgb = (hex) => {
    const h = (hex || '#000000').replace('#', '')
    return parseInt(h.slice(0,2),16) + ',' + parseInt(h.slice(2,4),16) + ',' + parseInt(h.slice(4,6),16)
  }
  const ps    = (t.bgSt ?? {})[t.bgPreset] ?? {}
  const speed = ps.speed ?? 1
  const dur   = (b) => speed <= 0 ? '9999s' : ((b / speed).toFixed(1) + 's')
  const c1    = ps.c1 || null
  const c2    = ps.c2 || null
  const c3    = ps.c3 || null
  const blur  = ps.blur ?? null

  s('--plasma-speed-a', dur(20))
  s('--plasma-speed-b', dur(28))
  if (blur != null) { s('--plasma-blur-a', blur + 'px'); s('--plasma-blur-b', (blur + 20) + 'px') }

  if (c1) {
    s('--plasma-c1', rgba(c1, 0.28)); s('--plasma-c2', rgba(c2||c1, 0.25)); s('--plasma-c3', rgba(c3||c1, 0.18))
    s('--plasma-c4', rgba(c1, 0.14)); s('--plasma-c5', rgba(c2||c1, 0.14)); s('--plasma-c6', rgba(c1, 0.16))
    s('--drift-c1',  rgba(c1, 0.20))
    s('--drift-c2',  rgba(c2||c1, 0.16))
    s('--pulse-c',   rgba(c1, 0.22))
    s('--tide-c1',   rgba(c1, 0.24))
    s('--tide-c2',   rgba(c2||c1, 0.20))
  }

  const sfGrad = ps.sfGrad ?? false
  if (sfGrad && c1) {
    s('--starfield-bg-image',
      'radial-gradient(ellipse 80% 70% at 25% 45%, ' + rgba(c1,0.22) + ' 0%, transparent 65%),' +
      'radial-gradient(ellipse 70% 80% at 75% 60%, ' + rgba(c2||c1,0.16) + ' 0%, transparent 65%)')
  } else {
    s('--starfield-bg-image', 'none')
  }

  const fogColor   = ps.fogColor   || t.patternColor || null
  const fogOpacity = ps.fogOpacity ?? 1
  if (fogColor) {
    const rgb = hexRgb(fogColor)
    s('--fog-c1', 'rgba(' + rgb + ',' + (0.22*fogOpacity).toFixed(3) + ')')
    s('--fog-c2', 'rgba(' + rgb + ',' + (0.18*fogOpacity).toFixed(3) + ')')
    s('--fog-c3', 'rgba(' + rgb + ',' + (0.15*fogOpacity).toFixed(3) + ')')
    s('--fog-c4', 'rgba(' + rgb + ',' + (0.16*fogOpacity).toFixed(3) + ')')
    s('--fog-c5', 'rgba(' + rgb + ',' + (0.14*fogOpacity).toFixed(3) + ')')
    s('--fog-c6', 'rgba(' + rgb + ',' + (0.10*fogOpacity).toFixed(3) + ')')
  }

  const scanColor   = ps.scanColor   || t.patternColor || null
  const scanOpacity = ps.scanOpacity ?? 1
  if (scanColor) {
    const rgb = hexRgb(scanColor)
    s('--scan-line-c',  'rgba(' + rgb + ',' + (0.90*scanOpacity).toFixed(3) + ')')
    s('--scan-mid-c',   'rgba(' + rgb + ',' + (0.55*scanOpacity).toFixed(3) + ')')
    s('--scan-glow-c',  'rgba(' + rgb + ',' + (0.20*scanOpacity).toFixed(3) + ')')
    s('--scan-glow2-c', 'rgba(' + rgb + ',' + (0.08*scanOpacity).toFixed(3) + ')')
    s('--scan-glow3-c', 'rgba(' + rgb + ',' + (0.04*scanOpacity).toFixed(3) + ')')
  }
  const gSky = t.bgGrassSky || '#020609'
  const gGnd = t.bgGrassGround || '#071a05'
  const oSky = t.bgOceanSky || '#000814'
  const oWtr = t.bgOceanWater || '#001428'
  // ── Starfield density CSS vars ────────────────────────────────
  var sfDensity = ps.density ?? 3
  var sfTileA   = ([1200, 900, 700, 500, 350][sfDensity - 1] || 700) + 'px'
  var sfTileB   = ([750,  600, 450, 320, 220][sfDensity - 1] || 450) + 'px'
  s('--sf-tile-a', sfTileA + ' ' + sfTileA)
  s('--sf-tile-b', sfTileB + ' ' + sfTileB)

  let bgEl = document.getElementById('sp-bg')
  if (!bgEl) { bgEl = document.createElement('style'); bgEl.id = 'sp-bg'; document.head.appendChild(bgEl) }
  bgEl.textContent = `
    .bg-aurora { animation-duration: ${dur(12)} !important; }
    .bg-layer.bg-starfield::before { animation-duration: ${dur(80)} !important; }
    .bg-layer.bg-starfield::after  { animation-duration: ${dur(130)} !important; }
    .bg-layer.bg-fog::before       { animation-duration: ${dur(42)} !important; }
    .bg-layer.bg-fog::after        { animation-duration: ${dur(58)} !important; }
    .bg-layer.bg-scan::before      { animation-duration: ${dur(7)} !important; }
    .bg-layer.bg-vortex::before    { animation-duration: ${dur(70)} !important; }
    .bg-layer.bg-vortex::after     { animation-duration: ${dur(110)} !important; }
    .bg-gradient                   { animation-duration: ${dur(20)} !important; }
    .bg-mesh                       { animation-duration: ${dur(22)} !important; }
    .bg-nebula                     { animation-duration: ${dur(30)} !important; }
    .bg-layer:is(.bg-plasma,.bg-inferno,.bg-mint,.bg-dusk,.bg-mono)::before { animation-duration: ${dur(20)} !important; }
    .bg-layer:is(.bg-plasma,.bg-inferno,.bg-mint,.bg-dusk,.bg-mono)::after  { animation-duration: ${dur(28)} !important; }
    .bg-layer.bg-drift::before     { animation-duration: ${dur(35)} !important; }
    .bg-layer.bg-drift::after      { animation-duration: ${dur(50)} !important; }
    .bg-layer.bg-pulse::before     { animation-duration: ${dur(8)} !important; }
    .bg-layer.bg-pulse::after      { animation-duration: ${dur(12)} !important; }
    .bg-layer.bg-tide::before      { animation-duration: ${dur(20)} !important; }
    .bg-layer.bg-tide::after       { animation-duration: ${dur(30)} !important; }

    .bg-layer.bg-grass {
      overflow: hidden;
      background-color: ${gSky};
      background-image:
        radial-gradient(6px 6px at 72% 12%, rgba(255,248,220,.95) 0, transparent 100%),
        radial-gradient(45px 45px at 72% 12%, rgba(255,240,180,.22) 0, transparent 100%),
        radial-gradient(100px 100px at 72% 12%, rgba(255,240,180,.06) 0, transparent 100%),
        radial-gradient(1.5px 1.5px at 5% 8%, rgba(255,255,255,.9) 0, transparent 100%),
        radial-gradient(1px 1px at 14% 4%, rgba(255,255,255,.7) 0, transparent 100%),
        radial-gradient(1px 1px at 23% 11%, rgba(255,255,255,.6) 0, transparent 100%),
        radial-gradient(1.5px 1.5px at 38% 6%, rgba(255,255,255,.8) 0, transparent 100%),
        radial-gradient(1px 1px at 50% 3%, rgba(255,255,255,.5) 0, transparent 100%),
        radial-gradient(1px 1px at 58% 14%, rgba(255,255,255,.65) 0, transparent 100%),
        radial-gradient(1.5px 1.5px at 80% 7%, rgba(255,255,255,.75) 0, transparent 100%),
        radial-gradient(1px 1px at 93% 4%, rgba(255,255,255,.8) 0, transparent 100%),
        radial-gradient(1px 1px at 33% 16%, rgba(255,255,255,.45) 0, transparent 100%),
        radial-gradient(1px 1px at 65% 10%, rgba(255,255,255,.55) 0, transparent 100%),
        linear-gradient(to bottom, ${gSky} 0%, ${gSky}bb 55%, ${gGnd}aa 66%, ${gGnd} 100%);
    }
    .bg-layer.bg-grass::before {
      content: '';
      position: absolute; bottom: 0; left: -5%; width: 110%; height: 42%;
      background: ${gGnd};
      clip-path: polygon(
        0% 100%, 0% 52%,
        1% 30%, 2% 50%, 3% 22%, 4% 46%, 5% 10%, 6% 40%, 7% 18%, 8% 44%,
        9% 6%, 10% 38%, 11% 20%, 12% 46%, 13% 8%, 14% 36%, 15% 16%, 16% 42%,
        17% 4%, 18% 34%, 19% 14%, 20% 40%, 21% 4%, 22% 30%, 23% 14%, 24% 42%,
        25% 6%, 26% 37%, 27% 18%, 28% 44%, 29% 8%, 30% 38%, 31% 16%, 32% 42%,
        33% 5%, 34% 34%, 35% 12%, 36% 42%, 37% 4%, 38% 32%, 39% 14%, 40% 40%,
        41% 6%, 42% 36%, 43% 18%, 44% 44%, 45% 8%, 46% 38%, 47% 16%, 48% 42%,
        49% 4%, 50% 32%, 51% 12%, 52% 42%, 53% 4%, 54% 30%, 55% 14%, 56% 40%,
        57% 6%, 58% 36%, 59% 18%, 60% 44%, 61% 8%, 62% 38%, 63% 16%, 64% 42%,
        65% 4%, 66% 32%, 67% 12%, 68% 42%, 69% 4%, 70% 30%, 71% 14%, 72% 40%,
        73% 6%, 74% 36%, 75% 18%, 76% 44%, 77% 8%, 78% 38%, 79% 16%, 80% 42%,
        81% 4%, 82% 32%, 83% 12%, 84% 42%, 85% 4%, 86% 30%, 87% 14%, 88% 40%,
        89% 6%, 90% 36%, 91% 18%, 92% 44%, 93% 8%, 94% 38%, 95% 16%, 96% 42%,
        97% 4%, 98% 32%, 99% 50%, 100% 52%, 100% 100%
      );
      animation: grass-sway ${dur(5)} ease-in-out infinite alternate;
      transform-origin: bottom center;
    }
    .bg-layer.bg-grass::after {
      content: '';
      position: absolute; bottom: 0; left: 0; right: 0; height: 50%;
      background-image:
        radial-gradient(2.5px 2.5px at 12% 40%, rgba(180,255,80,.7) 0, transparent 100%),
        radial-gradient(2px 2px at 28% 55%, rgba(200,255,100,.55) 0, transparent 100%),
        radial-gradient(2.5px 2.5px at 45% 35%, rgba(180,255,80,.65) 0, transparent 100%),
        radial-gradient(2px 2px at 62% 50%, rgba(200,255,100,.6) 0, transparent 100%),
        radial-gradient(2.5px 2.5px at 78% 42%, rgba(180,255,80,.55) 0, transparent 100%),
        radial-gradient(2px 2px at 18% 62%, rgba(200,255,100,.5) 0, transparent 100%),
        radial-gradient(2px 2px at 52% 68%, rgba(180,255,80,.6) 0, transparent 100%),
        radial-gradient(2.5px 2.5px at 88% 48%, rgba(200,255,100,.55) 0, transparent 100%),
        linear-gradient(to top, rgba(2,6,2,.7) 0%, transparent 100%);
      animation: firefly-blink ${dur(3)} ease-in-out infinite alternate;
      pointer-events: none;
    }
    @keyframes grass-sway   { 0% { transform: skewX(-2.5deg); } 100% { transform: skewX(2.5deg); } }
    @keyframes firefly-blink { 0% { opacity: .3; } 100% { opacity: 1; } }

    .bg-layer.bg-ocean {
      overflow: hidden;
      background-color: ${oSky};
      background-image:
        radial-gradient(7px 7px at 30% 18%, rgba(255,248,220,.95) 0, transparent 100%),
        radial-gradient(55px 55px at 30% 18%, rgba(255,240,180,.22) 0, transparent 100%),
        radial-gradient(120px 120px at 30% 18%, rgba(255,240,180,.06) 0, transparent 100%),
        linear-gradient(to right, transparent 28%, rgba(255,248,200,.04) 29.5%, rgba(255,248,200,.07) 30.5%, rgba(255,248,200,.04) 31.5%, transparent 33%),
        radial-gradient(1.5px 1.5px at 5% 8%, rgba(255,255,255,.85) 0, transparent 100%),
        radial-gradient(1px 1px at 12% 4%, rgba(255,255,255,.65) 0, transparent 100%),
        radial-gradient(1px 1px at 20% 12%, rgba(255,255,255,.55) 0, transparent 100%),
        radial-gradient(1.5px 1.5px at 42% 6%, rgba(255,255,255,.75) 0, transparent 100%),
        radial-gradient(1px 1px at 55% 14%, rgba(255,255,255,.6) 0, transparent 100%),
        radial-gradient(1.5px 1.5px at 63% 4%, rgba(255,255,255,.8) 0, transparent 100%),
        radial-gradient(1px 1px at 76% 10%, rgba(255,255,255,.55) 0, transparent 100%),
        radial-gradient(1px 1px at 86% 5%, rgba(255,255,255,.7) 0, transparent 100%),
        radial-gradient(1px 1px at 94% 15%, rgba(255,255,255,.6) 0, transparent 100%),
        radial-gradient(1px 1px at 18% 17%, rgba(255,255,255,.45) 0, transparent 100%),
        linear-gradient(to bottom, ${oSky} 0%, ${oSky}cc 36%, ${oWtr}cc 52%, ${oWtr} 100%);
    }
    .bg-layer.bg-ocean::before {
      content: '';
      position: absolute; bottom: -22%; left: -30%; width: 160%; height: 75%;
      background: ${oWtr};
      border-radius: 40% 60% 55% 45% / 35% 25% 45% 28%;
      opacity: .88;
      animation: ocean-wave-a ${dur(10)} ease-in-out infinite alternate;
    }
    .bg-layer.bg-ocean::after {
      content: '';
      position: absolute; bottom: -18%; left: -40%; width: 180%; height: 60%;
      background: color-mix(in srgb, ${oWtr} 85%, #000020);
      border-radius: 55% 45% 42% 58% / 25% 42% 28% 38%;
      opacity: .75;
      animation: ocean-wave-b ${dur(15)} ease-in-out infinite alternate-reverse;
    }
    @keyframes ocean-wave-a {
      0%   { transform: translateX(-6%) rotate(-1.5deg); border-radius: 40% 60% 55% 45% / 35% 25% 45% 28%; }
      100% { transform: translateX(6%)  rotate(1.5deg);  border-radius: 60% 40% 45% 55% / 25% 35% 28% 45%; }
    }
    @keyframes ocean-wave-b {
      0%   { transform: translateX(8%)  rotate(2deg);    border-radius: 55% 45% 42% 58% / 25% 42% 28% 38%; }
      100% { transform: translateX(-8%) rotate(-2deg);   border-radius: 45% 55% 58% 42% / 42% 25% 38% 28%; }
    }
  `
  // ── Starfield planet injection ────────────────────────────────
  var oldPlanets = document.getElementById('sf-planets')
  if (oldPlanets) oldPlanets.remove()
  if (t.bgPreset === 'starfield' && ps.planets) {
    var sfLayer = document.querySelector('.bg-layer.bg-starfield')
    if (sfLayer) {
      var planetCount = ps.planetCount ?? 2
      var planetDefs = [
        {
          size: 220, left: '-5%', top: '52%',
          gradient: 'radial-gradient(circle at 35% 35%, #5a7fb5 0%, #2a4a7a 40%, #0f1d3a 100%)',
          glow: '0 0 80px rgba(60,100,200,0.15)', ring: true, ringColor: 'rgba(140,170,220,0.32)'
        },
        {
          size: 80, left: '83%', top: '10%',
          gradient: 'radial-gradient(circle at 40% 38%, #c8936a 0%, #7a4a22 45%, #3a1f0a 100%)',
          glow: '0 0 40px rgba(180,100,40,0.12)', ring: false
        },
        {
          size: 140, left: '8%', top: '8%',
          gradient: 'radial-gradient(circle at 42% 38%, #8a6ab5 0%, #4a3070 45%, #1a0f30 100%)',
          glow: '0 0 60px rgba(120,80,200,0.12)', ring: false
        },
      ]
      var container = document.createElement('div')
      container.id = 'sf-planets'
      container.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:1;'
      planetDefs.slice(0, planetCount).forEach(function(p) {
        var planet = document.createElement('div')
        var inset = 'inset -' + Math.round(p.size*0.12) + 'px -' + Math.round(p.size*0.06) + 'px ' + Math.round(p.size*0.22) + 'px rgba(0,0,0,0.65)'
        planet.style.cssText = 'position:absolute;width:' + p.size + 'px;height:' + p.size + 'px;left:' + p.left + ';top:' + p.top + ';border-radius:50%;background:' + p.gradient + ';box-shadow:' + inset + ',' + p.glow + ';pointer-events:none;'
        if (p.ring) {
          var ring = document.createElement('div')
          var rW = Math.round(p.size * 1.85)
          var rH = Math.round(p.size * 0.38)
          var rB = Math.round(p.size * 0.065)
          ring.style.cssText = 'position:absolute;width:' + rW + 'px;height:' + rH + 'px;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-18deg);border-radius:50%;border:' + rB + 'px solid ' + p.ringColor + ';box-shadow:0 0 ' + Math.round(p.size*0.1) + 'px ' + p.ringColor + ';pointer-events:none;'
          planet.appendChild(ring)
        }
        container.appendChild(planet)
      })
      sfLayer.appendChild(container)
    }
  }

  s('--wallpaper-opacity', (t.wallpaperOpacity ?? 100) / 100)
  s('--notes-gap',       (t.notesGap ?? 0) + 'px')
  if (t.notesCardBg)    s('--notes-card-bg',    t.notesCardBg)
  if (t.notesTextColor) s('--notes-text-color', t.notesTextColor)
  if (t.notesTextBg)    s('--notes-input-bg',   t.notesTextBg)
  root.dataset.settingsSide = t.settingsSide || 'right'
  document.body.style.fontFamily       = t.font || "'DM Mono', monospace"
  document.body.style.backgroundColor = t.bg   || '#0c0c0f'
  document.body.style.color           = t.text || '#e8e8f0'
  if (t.pageScale) document.body.style.zoom = t.pageScale
}

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [session,  setSession]  = useState(null)
  const sessionRef              = useRef(null)
  const searchInputRef          = useRef(null)
  const [workspaces, setWorkspaces] = useState([])
  const [activeWs,   setActiveWs]   = useState(null)
  const [sections,   setSections]   = useState([])
  const [links,      setLinks]      = useState([])
  const [notes,      setNotes]      = useState([])

  const [theme, setThemeState] = useState(() => {
    try { return { ...DEFAULT_THEME, ...(JSON.parse(localStorage.getItem('current_theme')) || {}) } }
    catch { return DEFAULT_THEME }
  })

  // ── Supabase theme persistence ───────────────────────────────
  const saveThemeRef = useRef(null)

  const persistTheme = (t, immediate = false) => {
    clearTimeout(saveThemeRef.current)
    const doSave = async () => {
      const uid = sessionRef.current?.user?.id
      if (!uid) return
      const { wallpaper, ...themeData } = t  // wallpaper stays local-only
      // Try update first; if no row exists yet, insert
      const { data: updated, error: upErr } = await supabase
        .from('user_settings')
        .update({ theme: themeData, updated_at: new Date().toISOString() })
        .eq('user_id', uid)
        .select('id')
      if (upErr) { console.error('[settings] update error:', upErr.message); return }
      if (!updated?.length) {
        // Row doesn't exist yet — insert it
        const { error: insErr } = await supabase
          .from('user_settings')
          .insert({ user_id: uid, theme: themeData })
        if (insErr) console.error('[settings] insert error:', insErr.message)
        else console.log('[settings] created row in Supabase')
      } else {
        console.log('[settings] updated Supabase row')
      }
    }
    if (immediate) doSave()
    else saveThemeRef.current = setTimeout(doSave, 1500)
  }

    const setTheme = (updater) => {
    setThemeState(prev => {
      const base = typeof updater === 'function' ? updater(prev) : updater
      const next = { ...base, _savedAt: Date.now() }
      localStorage.setItem('current_theme', JSON.stringify(next))
      persistTheme(next)
      return next
    })
  }

  const [bgImage,         setBgImage]         = useState(() => localStorage.getItem('bg_image') || '')
  const [search,          setSearch]          = useState('')
  const [webSearch,       setWebSearch]       = useState('')
  const [searchMode,      setSearchMode]      = useState('web')
  const [settingsOpen,    setSettingsOpen]    = useState(false)
  const [loading,         setLoading]         = useState(true)
  const [importingBackup, setImportingBackup] = useState(false)

  // ── Collapse / Expand all ─────────────────────────────────────────────────
  const [allCollapsed,    setAllCollapsed]    = useState(false)
  const [triggerCollapse, setTriggerCollapse] = useState(0)
  const [triggerExpand,   setTriggerExpand]   = useState(0)
  const [notesTrigger,    setNotesTrigger]    = useState(undefined)

  const toggleAll = () => {
    if (allCollapsed) {
      setTriggerExpand(t => t + 1)
      setNotesTrigger(true)
      setAllCollapsed(false)
    } else {
      setTriggerCollapse(t => t + 1)
      setNotesTrigger(false)
      setAllCollapsed(true)
    }
  }

  const fileRef       = useRef(null)
  const backupFileRef = useRef(null)

  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => { sessionRef.current = session }, [session])

  // ── Focus search bar on new tab load ──────────────────────
  useEffect(() => {
    const timer = setTimeout(() => searchInputRef.current?.focus(), 80)
    return () => clearTimeout(timer)
  }, [])

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null); setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  // ── Re-auth on tab focus / network restore (fixes long-idle NetworkError) ──
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session) { setSession(data.session); handleRefresh() }
      } catch (_e) { /* still offline, ignore */ }
    }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [])

  useEffect(() => {
    if (!session) return
    loadUserSettings().then(() => ensureWorkspace()).then(() => handleRefresh())
  }, [session])

  // ── Load theme from Supabase ──────────────────────────────────────────────
  const loadUserSettings = async (force = false) => {
    const uid = sessionRef.current?.user?.id ?? session?.user?.id
    if (!uid) { console.log('[settings] no uid, skipping load'); return }
    try {
      const { data, error } = await supabase
        .from('user_settings').select('theme').eq('user_id', uid).maybeSingle()
      if (error) { console.error('[settings] load error:', error.message); return }

      const localRaw  = localStorage.getItem('current_theme')
      const localTheme  = localRaw ? (() => { try { return JSON.parse(localRaw) } catch { return {} } })() : {}
      const remoteTheme = data?.theme ?? {}
      const hasLocal  = Object.keys(localTheme).length  > 3
      const hasRemote = Object.keys(remoteTheme).length > 3
      console.log('[settings] load | force:', force, '| hasLocal:', hasLocal, '| hasRemote:', hasRemote)

      if (force && hasRemote) {
        // Manual refresh — always apply Supabase
        const wallpaper = localTheme.wallpaper ?? null
        const merged = { ...DEFAULT_THEME, ...remoteTheme, ...(wallpaper ? { wallpaper } : {}) }
        setThemeState(merged)
        localStorage.setItem('current_theme', JSON.stringify(merged))
        console.log('[settings] force-applied Supabase theme')
      } else if (!hasRemote && hasLocal) {
        // Supabase empty — push local up (bootstrap)
        console.log('[settings] bootstrapping Supabase from local')
        persistTheme({ ...DEFAULT_THEME, ...localTheme }, true)
      } else if (hasRemote && !hasLocal) {
        // Local empty — pull from Supabase
        const merged = { ...DEFAULT_THEME, ...remoteTheme }
        setThemeState(merged)
        localStorage.setItem('current_theme', JSON.stringify(merged))
        console.log('[settings] pulled Supabase theme (no local)')
      } else {
        console.log('[settings] both exist, keeping local, syncing to Supabase')
        persistTheme({ ...DEFAULT_THEME, ...localTheme }, true)
      }
    } catch (e) { console.error('[settings] load exception:', e) }
  }

    // ── Sign out ─────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setSettingsOpen(false)
  }

  // ── Workspace bootstrap ───────────────────────────────────────────────────
  const ensureWorkspace = async () => {
    const { data, error } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
    if (error) { alert(error.message); return }
    if (!data?.length) {
      const { data: created, error: err } = await supabase
        .from('workspaces').insert({ user_id: session.user.id, name: 'Home' }).select().single()
      if (err) { alert(err.message); return }
      setWorkspaces([created]); setActiveWs(created.id); return
    }
    setWorkspaces(data)
    setActiveWs(prev => prev ?? data[0]?.id ?? null)
  }

  // ── Data refresh ──────────────────────────────────────────────────────────
  const handleRefresh = async () => {
    if (!sessionRef.current?.user?.id) return
    try {
      const { data: wsData, error: wsErr } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
      if (wsErr) { console.error('Refresh error:', wsErr.message); return }
      setWorkspaces(wsData || [])
      const currentWs = activeWs ?? wsData?.[0]?.id ?? null
      if (!currentWs) return
      if (!activeWs) setActiveWs(currentWs)
      const [{ data: secData }, { data: linkData }, { data: noteData }] = await Promise.all([
        supabase.from('sections').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
        supabase.from('links').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
        supabase.from('notes').select('*').eq('workspace_id', currentWs).order('created_at', { ascending: false }),
      ])
      setSections(secData || []); setLinks(linkData || []); setNotes(noteData || [])
    } catch (err) {
      console.error('Refresh network error:', err.message)
    }
  }

  useEffect(() => { if (activeWs && session) handleRefresh() }, [activeWs])

  // ── Search filter ─────────────────────────────────────────────────────────
  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return links
    return links.filter(l => (l.title || '').toLowerCase().includes(q) || (l.url || '').toLowerCase().includes(q))
  }, [links, search])

  // ── Workspace CRUD ────────────────────────────────────────────────────────
  const addWorkspace = async (name) => {
    const wsName = typeof name === 'string' ? name : prompt('Workspace name?')
    if (!wsName?.trim()) return
    const { data, error } = await supabase
      .from('workspaces').insert({ user_id: session.user.id, name: wsName.trim() }).select().single()
    if (error) return alert(error.message)
    setWorkspaces(prev => [...prev, data]); setActiveWs(data.id)
  }

  const renameWorkspace = async (id, name) => {
    const { error } = await supabase.from('workspaces').update({ name }).eq('id', id)
    if (error) return alert(error.message)
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, name } : w))
  }

  const deleteWorkspace = async (id) => {
    if (!confirm('Delete this workspace?')) return
    const { error } = await supabase.from('workspaces').delete().eq('id', id)
    if (error) return alert(error.message)
    const next = workspaces.filter(w => w.id !== id)
    setWorkspaces(next); setActiveWs(next[0]?.id ?? null)
  }

  // ── Image uploads ─────────────────────────────────────────────────────────
  const handleImageUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setTheme(prev => ({ ...prev, wallpaper: e.target.result }))
    reader.readAsDataURL(file)
  }

  const handleBgImageUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      localStorage.setItem('bg_image', e.target.result)
      setBgImage(e.target.result)
      setTheme(prev => ({ ...prev, bgPreset: 'image' }))
    }
    reader.readAsDataURL(file)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  const exportFullBackup = async () => {
    const backup = { version: 2, exportedAt: new Date().toISOString(), theme, workspaces: [] }
    const { data: wsData } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
    for (const ws of wsData || []) {
      const [{ data: secData }, { data: noteData }] = await Promise.all([
        supabase.from('sections').select('*').eq('workspace_id', ws.id).order('position', { ascending: true }),
        supabase.from('notes').select('*').eq('workspace_id', ws.id).order('created_at', { ascending: false }),
      ])
      const sectionsWithLinks = []
      for (const sec of secData || []) {
        const { data: secLinks } = await supabase.from('links').select('*').eq('section_id', sec.id).order('position', { ascending: true })
        sectionsWithLinks.push({ name: sec.name, position: sec.position, collapsed: sec.collapsed, links: (secLinks || []).map(l => ({ title: l.title, url: l.url, position: l.position })) })
      }
      backup.workspaces.push({ name: ws.name, sections: sectionsWithLinks, notes: (noteData || []).map(n => ({ content: n.content })) })
    }
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
    a.download = 'startpage-backup.json'; a.click()
  }

  const exportCSV = async () => {
    const { data: secs } = await supabase.from('sections').select('*').eq('workspace_id', activeWs).order('position')
    const { data: lnks } = await supabase.from('links').select('*').eq('workspace_id', activeWs).order('position')
    const rows = [['Section', 'Title', 'URL']]
    secs?.forEach(s => lnks?.filter(l => l.section_id === s.id).forEach(l => rows.push([s.name, l.title, l.url])))
    const dq = '""'
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, dq) + '"').join(',')).join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'startpage-links.csv'; a.click()
  }

  const resetWorkspaceLinks = async () => {
    if (!confirm('Delete ALL sections and links in this workspace? Notes are kept.')) return
    await supabase.from('links').delete().eq('workspace_id', activeWs)
    await supabase.from('sections').delete().eq('workspace_id', activeWs)
    handleRefresh()
  }

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImportBackup = (e) => {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = ''
    setImportingBackup(true)
    const r = new FileReader()
    r.onload = async (ev) => {
      try {
        const uid = sessionRef.current?.user?.id
        if (!uid) throw new Error('Not logged in')
        const text = ev.target.result
        const ext  = f.name.split('.').pop().toLowerCase()
        if (ext === 'csv') {
          const lines = text.trim().split('\n').slice(1)
          const sectionMap = {}; let pos = 0
          for (const line of lines) {
            const [section, title, url] = line.split(',').map(c => c.trim().replace(/^"|"$/g, '').replace(/""/g, '"'))
            if (!section || !title || !url) continue
            if (!sectionMap[section]) {
              const { data: sec } = await supabase.from('sections').insert({ user_id: uid, workspace_id: activeWs, name: section, position: pos++, collapsed: false }).select().single()
              sectionMap[section] = { id: sec.id, lpos: 0 }
            }
            await supabase.from('links').insert({ user_id: uid, workspace_id: activeWs, section_id: sectionMap[section].id, title, url: url.startsWith('http') ? url : 'https://' + url, position: sectionMap[section].lpos++ })
          }
          await handleRefresh(); alert('CSV imported!'); return
        }
        const data = JSON.parse(text)
        if (Array.isArray(data)) {
          // flatten [[sec,sec,...]] or [[sec,sec],[sec,sec],...] → [sec,sec,sec,...]
          const rows = data.flat(2).filter(g => g && typeof g === 'object' && !Array.isArray(g))
          let imported = 0
          for (let i = 0; i < rows.length; i++) {
            const grp = rows[i]
            const { data: sec, error: secErr } = await supabase
              .from('sections')
              .insert({ user_id: uid, workspace_id: activeWs, name: grp.name ?? grp.title ?? 'Section', position: i, collapsed: false })
              .select().single()
            if (secErr || !sec) continue  // skip bad section, don't abort
            const lnks = (grp.bookmarks ?? grp.links ?? [])
              .filter(b => b && (b.url || b.href))
              .map((b, j) => ({
                user_id: uid, workspace_id: activeWs, section_id: sec.id,
                title: b.name ?? b.title ?? 'Link',
                url: (b.url ?? b.href ?? '').trim(),
                position: j,
              }))
            if (lnks.length) await supabase.from('links').insert(lnks)
            imported++
          }
          await handleRefresh(); alert('Imported ' + imported + ' of ' + rows.length + ' section(s).'); return
        }
        if (data.workspaces && Array.isArray(data.workspaces)) {
          if (!confirm('Add ' + data.workspaces.length + ' workspace(s)? Existing data is kept.')) return
          for (const ws of data.workspaces) {
            const { data: newWs } = await supabase.from('workspaces').insert({ user_id: uid, name: ws.name }).select().single()
            for (let si = 0; si < (ws.sections ?? []).length; si++) {
              const sec = ws.sections[si]
              const { data: newSec } = await supabase.from('sections').insert({ user_id: uid, workspace_id: newWs.id, name: sec.name, position: sec.position ?? si, collapsed: sec.collapsed ?? false }).select().single()
              const lnks = (sec.links ?? []).map((l, j) => ({ user_id: uid, workspace_id: newWs.id, section_id: newSec.id, title: l.title ?? l.name ?? 'Link', url: l.url, position: l.position ?? j }))
              if (lnks.length) await supabase.from('links').insert(lnks)
            }
            if (ws.notes?.length) await supabase.from('notes').insert(ws.notes.map(n => ({ user_id: uid, workspace_id: newWs.id, content: n.content ?? '' })))
          }
          if (data.theme) { const t = { ...DEFAULT_THEME, ...data.theme }; setTheme(t) }
          await handleRefresh(); alert('Backup imported!'); return
        }
        if (data.bg || data.text || data.accent) {
          setTheme({ ...DEFAULT_THEME, ...data }); alert('Theme imported.'); return
        }
        alert('Unrecognised format.')
      } catch (err) { alert('Import failed: ' + err.message) }
      finally { setImportingBackup(false) }
    }
    r.readAsText(f)
  }

  // ── Background ────────────────────────────────────────────────────────────
  const bgClass = (bgImage && theme.bgPreset === 'image') ? 'bg-layer bg-image' : `bg-layer bg-${theme.bgPreset || 'noise'}`
  const bgStyle = (bgImage && theme.bgPreset === 'image') ? { backgroundImage: `url(${bgImage})` } : {}

  if (loading) return <div className="center-fill">Loading…</div>
  if (!session) return <Auth />

  return (
    <>
      {/* Background */}
      <div className={bgClass} style={bgStyle} />

      <div className="app">

        {/* Wallpaper overlay */}
        {theme.wallpaper ? (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none',
            backgroundImage: `url(${theme.wallpaper})`,
            backgroundSize: `${theme.wallpaperScale ?? 100}%`,
            backgroundPosition: `${theme.wallpaperX ?? 50}% ${theme.wallpaperY ?? 50}%`,
            backgroundRepeat: 'no-repeat',
            filter: `blur(${theme.wallpaperBlur ?? 0}px)`,
            opacity: (theme.wallpaperOpacity ?? 100) / 100,
          }} />
        ) : null}
        {theme.wallpaper && theme.wallpaperDim > 0 ? (
          <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', background: `rgba(0,0,0,${(theme.wallpaperDim ?? 35) / 100})` }} />
        ) : null}

        {/* ── TOPBAR ──────────────────────────────────────── */}
        <div className="topbar" style={{ position: 'relative', zIndex: 2 }}>

          {/* Workspace tabs */}
          <div className="workspace-tabs">
            {workspaces.map(ws => (
              <button
                key={ws.id}
                className={`workspace-tab${activeWs === ws.id ? ' active' : ''}`}
                onClick={() => setActiveWs(ws.id)}
              >
                {ws.name}
                {workspaces.length > 1 && (
                  <span
                    className="del-ws"
                    onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id) }}
                  >✕</span>
                )}
              </button>
            ))}
            <button
              className="icon-btn"
              title="New workspace"
              onClick={() => addWorkspace()}
              style={{ fontSize: '1.1em', lineHeight: 1 }}
            >+</button>
          </div>

          <div className="topbar-divider" />

          {/* Widgets: clock + weather + search */}
          <div className="topbar-widgets">
            <ClockWidget />
            <div className="topbar-divider" />
            <WeatherWidget />
            <div className="search-compact" style={{ flex: 1 }}>
              <button
                className="btn-xs"
                title={searchMode === 'web' ? 'Switch to link search' : 'Switch to web search'}
                style={{ flexShrink: 0, fontSize: '0.72em', whiteSpace: 'nowrap' }}
                onClick={() => { setSearchMode(m => m === 'web' ? 'links' : 'web'); setSearch(''); setWebSearch('') }}
              >
                {searchMode === 'web' ? 'Web' : 'Links'}
              </button>
              <input
                className="input search-compact-input"
                placeholder={searchMode === 'web' ? 'Search the web...' : 'Filter links...'}
                ref={searchInputRef}
                value={searchMode === 'web' ? webSearch : search}
                onChange={e => searchMode === 'web' ? setWebSearch(e.target.value) : setSearch(e.target.value)}
                onKeyDown={e => {
                  if (searchMode === 'web' && e.key === 'Enter' && webSearch.trim()) {
                    const url = (theme.searchEngineUrl || 'https://www.google.com/search?q=') + encodeURIComponent(webSearch.trim())
                    if (theme.openInNewTab ?? true) { window.open(url, '_blank', 'noopener,noreferrer') } else { window.location.href = url }
                    setWebSearch('')
                  }
                  if (e.key === 'Escape') { setSearch(''); setWebSearch('') }
                }}
              />
              {(searchMode === 'web' ? webSearch : search) && (
                <button className="icon-btn search-btn" title="Clear"
                  onClick={() => searchMode === 'web' ? setWebSearch('') : setSearch('')}>x</button>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="topbar-actions">
            <button
              className="btn"
              title={allCollapsed ? 'Expand all sections' : 'Collapse all sections'}
              onClick={toggleAll}
            >
              {allCollapsed ? 'Expand' : 'Collapse'}
            </button>
            <button className="icon-btn" title="Refresh" onClick={async () => { await loadUserSettings(true); handleRefresh() }}>↻</button>
            <button className="btn" title="Settings" onClick={() => setSettingsOpen(true)}>Settings</button>
          </div>
        </div>

        {/* ── MAIN LAYOUT ─────────────────────────────────── */}
        <main className="main-layout" style={{ gridTemplateColumns: `1fr var(--notes-width, 240px)` }}>
          <div className="main-col">
            <Sections
              sections={sections}
              links={searchMode === 'links' ? filteredLinks : links}
              userId={session.user.id}
              workspaceId={activeWs}
              onRefresh={handleRefresh}
              colCount={theme.sectionsCols ?? 4}
              triggerCollapseAll={triggerCollapse}
              triggerExpandAll={triggerExpand}
              openInNewTab={theme.openInNewTab ?? true}
              faviconEnabled={theme.faviconEnabled ?? true}
            />
          </div>
          <div className="side-col">
            <Notes
              notes={notes}
              workspaceId={activeWs}
              userId={session.user.id}
              onRefresh={handleRefresh}
              forceOpen={notesTrigger}
            />
          </div>
        </main>

        {/* ── SETTINGS ────────────────────────────────────── */}
        {settingsOpen && (
          <Settings
            theme={theme}
            setTheme={setTheme}
            onSave={() => { persistTheme(theme, true) }}
            onClose={() => setSettingsOpen(false)}
            onSignOut={handleSignOut}
            userEmail={session?.user?.email ?? ''}
            onImageUpload={handleImageUpload}
            onBgImageUpload={handleBgImageUpload}
            onExportBackup={exportFullBackup}
            onExportCSV={exportCSV}
            onImportBackup={handleImportBackup}
            onResetWorkspaceLinks={resetWorkspaceLinks}
            onResetTheme={() => setTheme(DEFAULT_THEME)}
            fileRef={fileRef}
            backupFileRef={backupFileRef}
            importingBackup={importingBackup}
            workspaces={workspaces}
            activeWs={activeWs}
            onAddWorkspace={addWorkspace}
            onRenameWorkspace={renameWorkspace}
            onDeleteWorkspace={deleteWorkspace}
            onSetActiveWs={setActiveWs}
          />
        )}

      </div>
    </>
  )
}