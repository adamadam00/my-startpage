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
  faviconOpacity: 1, faviconGreyscale: false, faviconSize: 13, faviconEnabled: true, faviconDelay: 0, faviconFade: 0.3, openInNewTab: true,
  patternColor: '#2a2a3a', patternOpacity: 1,
  bgPreset: 'noise',
  wallpaper: '', wallpaperFit: 'cover', linksPaddingH: 0.75,
  bgAnimSpeed: 1, bgC1: '', bgC2: '', bgC3: '', bgBlur: null,
  settingsTitleColor: '#7878a0',
  bgGrassSky: '#020609', bgGrassGround: '#071a05',
  bgOceanSky: '#000814', bgOceanWater: '#001428',
  wallpaperX: 50, wallpaperY: 50, wallpaperScale: 100,
  wallpaperBlur: 0, wallpaperDim: 35, wallpaperOpacity: 100,
  sectionsCols: 4,
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
  s('--favicon-delay',   `${t.faviconDelay ?? 0}s`)
  s('--favicon-fade',    `${t.faviconFade  ?? 0.3}s`)
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
  const ps    = (t.bgSt ?? {})[t.bgPreset] ?? {}
  const speed = ps.speed ?? 1
  const dur   = (b) => speed <= 0 ? '9999s' : `${(b / speed).toFixed(1)}s`

  const rgba = (hex, a) => {
    const h = (hex || '#000000').replace('#', '')
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16)
    return `rgba(${r},${g},${b},${a})`
  }
  const hexRgb = (hex) => {
    const h = (hex || '#000000').replace('#', '')
    return `${parseInt(h.slice(0,2),16)},${parseInt(h.slice(2,4),16)},${parseInt(h.slice(4,6),16)}`
  }

  const c1   = ps.c1   || null
  const c2   = ps.c2   || null
  const c3   = ps.c3   || null
  const blur = ps.blur ?? null

  s('--plasma-speed-a', dur(20))
  s('--plasma-speed-b', dur(28))
  if (blur != null) { s('--plasma-blur-a', `${blur}px`); s('--plasma-blur-b', `${blur + 20}px`) }

  if (c1) {
    s('--plasma-c1', rgba(c1, 0.28)); s('--plasma-c2', rgba(c2||c1, 0.25)); s('--plasma-c3', rgba(c3||c1, 0.18))
    s('--plasma-c4', rgba(c1, 0.14)); s('--plasma-c5', rgba(c2||c1, 0.14)); s('--plasma-c6', rgba(c1, 0.16))
    s('--drift-c1', rgba(c1, 0.20))
    s('--drift-c2', rgba(c2||c1, 0.16))
    s('--pulse-c',  rgba(c1, 0.22))
    s('--tide-c1',  rgba(c1, 0.24))
    s('--tide-c2',  rgba(c2||c1, 0.20))
  }

  const sfGrad = ps.sfGrad ?? false
  if (sfGrad && c1) {
    s('--starfield-bg-image',
      `radial-gradient(ellipse 80% 70% at 25% 45%, ${rgba(c1,0.22)} 0%, transparent 65%),` +
      `radial-gradient(ellipse 70% 80% at 75% 60%, ${rgba(c2||c1,0.16)} 0%, transparent 65%)`)
  } else {
    s('--starfield-bg-image', 'none')
  }

  const fogColor   = ps.fogColor   || t.patternColor || null
  const fogOpacity = ps.fogOpacity ?? 1
  if (fogColor) {
    const rgb = hexRgb(fogColor)
    s('--fog-c1', `rgba(${rgb},${(0.22*fogOpacity).toFixed(3)})`)
    s('--fog-c2', `rgba(${rgb},${(0.18*fogOpacity).toFixed(3)})`)
    s('--fog-c3', `rgba(${rgb},${(0.15*fogOpacity).toFixed(3)})`)
    s('--fog-c4', `rgba(${rgb},${(0.16*fogOpacity).toFixed(3)})`)
    s('--fog-c5', `rgba(${rgb},${(0.14*fogOpacity).toFixed(3)})`)
    s('--fog-c6', `rgba(${rgb},${(0.10*fogOpacity).toFixed(3)})`)
  }

  const scanColor   = ps.scanColor   || t.patternColor || null
  const scanOpacity = ps.scanOpacity ?? 1
  if (scanColor) {
    const rgb = hexRgb(scanColor)
    s('--scan-line-c',  `rgba(${rgb},${(0.90*scanOpacity).toFixed(3)})`)
    s('--scan-mid-c',   `rgba(${rgb},${(0.55*scanOpacity).toFixed(3)})`)
    s('--scan-glow-c',  `rgba(${rgb},${(0.20*scanOpacity).toFixed(3)})`)
    s('--scan-glow2-c', `rgba(${rgb},${(0.08*scanOpacity).toFixed(3)})`)
    s('--scan-glow3-c', `rgba(${rgb},${(0.04*scanOpacity).toFixed(3)})`)
  }

  let bgEl = document.getElementById('sp-bg')
  if (!bgEl) { bgEl = document.createElement('style'); bgEl.id = 'sp-bg'; document.head.appendChild(bgEl) }
  bgEl.textContent = `
    .bg-aurora                               { animation-duration: ${dur(12)}  !important; }
    .bg-gradient                             { animation-duration: ${dur(20)}  !important; }
    .bg-mesh                                 { animation-duration: ${dur(22)}  !important; }
    .bg-nebula                               { animation-duration: ${dur(30)}  !important; }
    .bg-layer.bg-starfield::before           { animation-duration: ${dur(80)}  !important; }
    .bg-layer.bg-starfield::after            { animation-duration: ${dur(130)} !important; }
    .bg-layer.bg-fog::before                 { animation-duration: ${dur(42)}  !important; }
    .bg-layer.bg-fog::after                  { animation-duration: ${dur(58)}  !important; }
    .bg-layer.bg-scan::before                { animation-duration: ${dur(7)}   !important; }
    .bg-layer.bg-vortex::before              { animation-duration: ${dur(70)}  !important; }
    .bg-layer.bg-vortex::after               { animation-duration: ${dur(110)} !important; }
    .bg-layer:is(.bg-plasma,.bg-inferno,.bg-mint,.bg-dusk,.bg-mono)::before { animation-duration: ${dur(20)} !important; }
    .bg-layer:is(.bg-plasma,.bg-inferno,.bg-mint,.bg-dusk,.bg-mono)::after  { animation-duration: ${dur(28)} !important; }
    .bg-layer.bg-drift::before               { animation-duration: ${dur(35)}  !important; }
    .bg-layer.bg-drift::after                { animation-duration: ${dur(50)}  !important; }
    .bg-layer.bg-pulse::before               { animation-duration: ${dur(8)}   !important; }
    .bg-layer.bg-pulse::after                { animation-duration: ${dur(12)}  !important; }
    .bg-layer.bg-tide::before                { animation-duration: ${dur(20)}  !important; }
    .bg-layer.bg-tide::after                 { animation-duration: ${dur(30)}  !important; }
  `
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
  const [workspaces, setWorkspaces] = useState([])
  const [activeWs,   setActiveWs]   = useState(null)
  const [sections,   setSections]   = useState([])
  const [links,      setLinks]      = useState([])
  const [notes,      setNotes]      = useState([])

  const [theme, setThemeState] = useState(() => {
    try { return { ...DEFAULT_THEME, ...(JSON.parse(localStorage.getItem('current_theme')) || {}) } }
    catch { return DEFAULT_THEME }
  })

  const setTheme = (updater) => {
    setThemeState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      localStorage.setItem('current_theme', JSON.stringify(next))
      return next
    })
  }

  const [bgImage,         setBgImage]         = useState(() => localStorage.getItem('bg_image') || '')
  const [search,          setSearch]          = useState('')
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

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null); setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  // ── Re-auth + refresh when tab becomes visible again (fixes long-idle NetworkError) ──
  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session) { setSession(data.session); handleRefresh() }
      } catch { /* network still offline, ignore */ }
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
    ensureWorkspace().then(() => handleRefresh())
  }, [session])

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
              <input
                className="input search-compact-input"
                placeholder="Search links…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Escape' && setSearch('')}
              />
              {search && (
                <button className="icon-btn search-btn" onClick={() => setSearch('')} title="Clear">✕</button>
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
            <button className="icon-btn" title="Refresh" onClick={handleRefresh}>↻</button>
            <button className="btn" title="Settings" onClick={() => setSettingsOpen(true)}>Settings</button>
          </div>
        </div>

        {/* ── MAIN LAYOUT ─────────────────────────────────── */}
        <main className="main-layout" style={{ gridTemplateColumns: `1fr var(--notes-width, 240px)` }}>
          <div className="main-col">
            <Sections
              sections={sections}
              links={filteredLinks}
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
            onSave={() => { applyTheme(theme); localStorage.setItem('current_theme', JSON.stringify(theme)) }}
            onClose={() => setSettingsOpen(false)}
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