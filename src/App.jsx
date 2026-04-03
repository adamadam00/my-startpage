import React, { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from './lib/supabase'
import Auth      from './components/Auth'
import Clock     from './components/Clock'
import Weather   from './components/Weather'
import SearchBar from './components/SearchBar'
import Notes     from './components/Notes'
import Sections  from './components/Sections'
import Settings  from './components/Settings'

const BUILD      = '31 Mar 2026'
const PATTERN_BG = ['bg-dots', 'bg-grid', 'bg-lines']
const PLASMA_BG   = ['bg-plasma', 'bg-inferno', 'bg-mint', 'bg-dusk', 'bg-mono']

const BG_OPTIONS = [
  { value: 'bg-solid',    label: 'Solid' },
  { value: 'bg-noise',    label: 'Noise' },
  { value: 'bg-dots',     label: 'Dots' },
  { value: 'bg-grid',     label: 'Grid' },
  { value: 'bg-lines',    label: 'Lines' },
  { value: 'bg-gradient', label: 'Gradient' },
  { value: 'bg-mesh',     label: 'Blobs' },
  { value: 'bg-aurora',   label: 'Aurora' },
  { value: 'bg-starfield',label: 'Starfield' },
  { value: 'bg-stars',    label: 'Stars' },
  { value: 'bg-nebula',   label: 'Nebula' },
  { value: 'bg-circuit',  label: 'Circuit' },
  { value: 'bg-plasma',   label: 'Plasma' },
  { value: 'bg-inferno',  label: 'Inferno' },
  { value: 'bg-mint',     label: 'Mint' },
  { value: 'bg-dusk',     label: 'Dusk' },
  { value: 'bg-mono',     label: 'Mono' },
  { value: 'bg-image',    label: 'Image' },
]

const FONTS = [
  'DM Mono', 'JetBrains Mono', 'IBM Plex Sans',
  'Inter', 'Outfit', 'Space Grotesk', 'Figtree', 'Geist',
]

const DEFAULT_THEME = {
  bg:                '#0c0c0f',
  card:              '#13131a',
  cardOpacity:       '1',
  border:            '#2a2a3a',
  borderOpacity:     '1',
  accent:            '#6c8fff',
  text:              '#e8e8f0',
  textDim:           '#7878a0',
  titleColor:        '#7878a0',
  btnBg:             '#1e3a8a',
  notesBg:           '#13131a',
  notesInputBg:      '#0c0c0f',
  bgStyle:           'bg-dots',
  plasmaSpeed:       '1',
  plasmaBlur:        '1',
  patternColor:      '#2a2a3a',
  patternOpacity:    '1',
  gradientType:      'linear',
  gradientAngle:     '135',
  gradientColors:    '["#6c8fff","#9c6fff","#0c0c0f"]',
  font:              'DM Mono',
  workspaceFontSize: '14',
  topbarFontSize:    '12',
  settingsFontSize:  '13',
  clockWidgetScale:  '1',
  radius:            '10',
  radiusSm:          '6',
  sectionRadius:     '0',
  linkGap:           '0.5',
  sectionsCols:      '2',
  sectionGap:        '0',
  sectionGapH:       '0',
  mainGapTop:        '12',
  cardPadding:       '0.75',
  pageScale:         '1',
  handleOpacity:     '0.15',
  faviconOpacity:    '1',
  faviconFilter:     'none',
  faviconSize:       '13',
  bgImage:           '',
  bgImageOpacity:    '1',
  openInNewTab:      'true',
  notesFontSize:     '13',
  notesWidth:        '240',
  starfieldSpeed:    '1',
  starfieldColor:    '#ffffff',
  auroraSpeed:       '1',
  auroraColor:       '#6c8fff',
  meshSpeed:         '1',
  meshColor:         '#6c8fff',
  laserSpeed:        '1',
  laserColor:        '#6c8fff',
  laserColor2:       '#ff6bff',
  editbarScale:      '1',
  searchUrl:         'https://google.com/search?q=',
  locked:            'false',
}

function loadTheme() {
  try { return { ...DEFAULT_THEME, ...JSON.parse(localStorage.getItem('current_theme') || '{}') } }
  catch { return { ...DEFAULT_THEME } }
}

function applyTheme(t) {
  const r = document.documentElement.style
  r.setProperty('--bg',                 t.bg)
  r.setProperty('--bg2',                t.bg)
  r.setProperty('--bg3',                t.card)
  r.setProperty('--card',               t.card)
  r.setProperty('--card-opacity',       t.cardOpacity)
  r.setProperty('--border',             t.border)
  r.setProperty('--border-opacity',     t.borderOpacity)
  r.setProperty('--accent',             t.accent)
  r.setProperty('--accent-dim',         t.accent + '22')
  r.setProperty('--accent-glow',        t.accent + '33')
  r.setProperty('--text',               t.text)
  r.setProperty('--text-dim',           t.textDim)
  r.setProperty('--text-muted',         t.textDim + '88')
  r.setProperty('--title-color',        t.titleColor)
  r.setProperty('--btn-bg',             t.btnBg)
  r.setProperty('--btn-text',           '#ffffff')
  r.setProperty('--notes-bg',           t.notesBg      ?? t.card)
  r.setProperty('--notes-input-bg',     t.notesInputBg ?? t.bg)
  r.setProperty('--font',               `'${t.font}', monospace`)
  r.setProperty('--font-size',          t.workspaceFontSize  + 'px')
  r.setProperty('--topbar-font-size',   t.topbarFontSize     + 'px')
  r.setProperty('--settings-font-size', (t.settingsFontSize ?? '13') + 'px')
  r.setProperty('--clock-widget-size',  t.clockWidgetScale   + 'rem')
  r.setProperty('--radius',             t.radius             + 'px')
  r.setProperty('--radius-sm',          t.radiusSm           + 'px')
  r.setProperty('--section-radius',     (t.sectionRadius ?? '0')   + 'px')
  r.setProperty('--link-gap',           t.linkGap            + 'rem')
  r.setProperty('--section-gap',        t.sectionGap         + 'px')
  r.setProperty('--section-gap-h',      t.sectionGapH        + 'px')
  r.setProperty('--main-gap-top',       (t.mainGapTop  ?? '12')   + 'px')
  r.setProperty('--card-padding',       (t.cardPadding ?? '0.75') + 'rem')
  r.setProperty('--page-scale',         t.pageScale)
  r.setProperty('--handle-opacity',     t.handleOpacity)
  r.setProperty('--favicon-opacity',    t.faviconOpacity)
  r.setProperty('--favicon-filter',     t.faviconFilter)
  r.setProperty('--favicon-size',       (t.faviconSize ?? '13') + 'px')
  r.setProperty('--pattern-color',      t.patternColor)
  r.setProperty('--pattern-opacity',    t.patternOpacity)
  const _spd = parseFloat(t.plasmaSpeed ?? 1)
  r.setProperty('--plasma-speed-a', (20 / _spd).toFixed(1) + 's')
  r.setProperty('--plasma-speed-b', (28 / _spd).toFixed(1) + 's')
  const _blr = parseFloat(t.plasmaBlur ?? 1)
  r.setProperty('--plasma-blur-a',  (45 * _blr).toFixed(0) + 'px')
  r.setProperty('--plasma-blur-b',  (65 * _blr).toFixed(0) + 'px')
  r.setProperty('--notes-font-size',    t.notesFontSize + 'px')
  r.setProperty('--notes-width',        t.notesWidth    + 'px')
  // animated bg speed/colour
  const _sf = parseFloat(t.starfieldSpeed ?? 1)
  r.setProperty('--starfield-speed-a', (80  / _sf).toFixed(1) + 's')
  r.setProperty('--starfield-speed-b', (130 / _sf).toFixed(1) + 's')
  r.setProperty('--starfield-color',   t.starfieldColor ?? '#ffffff')
  r.setProperty('--aurora-speed',      (12 / parseFloat(t.auroraSpeed ?? 1)).toFixed(1) + 's')
  r.setProperty('--aurora-color',      t.auroraColor ?? '#6c8fff')
  r.setProperty('--mesh-color',        t.meshColor ?? t.accent ?? '#6c8fff')
  r.setProperty('--laser-color',       t.laserColor  ?? '#6c8fff')
  r.setProperty('--laser-color2',      t.laserColor2 ?? '#ff6bff')
  r.setProperty('--laser-speed',       t.laserSpeed  ?? '1')
  r.setProperty('--editbar-scale',     t.editbarScale ?? '1')
}

const lcKey = (id) => `ws_data_${id}`

// ── Laser bounce canvas background ──────────────────────────────────────────
function LaserCanvas({ color, color2, speed }) {
  const ref = React.useRef()
  React.useEffect(() => {
    const canvas = ref.current; if (!canvas) return
    const ctx = canvas.getContext('2d')
    let id
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize(); window.addEventListener('resize', resize)
    const s = Math.max(0.2, parseFloat(speed) || 1)
    const mk = (x, y, dx, dy, c) => ({ x, y, dx: dx*s, dy: dy*s, c, t: [] })
    const beams = [
      mk(200, 150,  2.2,  1.3, color  || '#6c8fff'),
      mk(600, 400, -1.7,  1.9, color2 || '#ff6bff'),
      mk(900, 200,  1.5, -2.1, color  || '#6c8fff'),
      mk(400, 600, -2.4, -1.1, color2 || '#ff6bff'),
    ]
    ctx.fillStyle = '#05050f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    const draw = () => {
      ctx.fillStyle = 'rgba(5,5,15,0.18)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      beams.forEach(b => {
        b.x += b.dx; b.y += b.dy
        if (b.x < 0 || b.x > canvas.width)  b.dx = -b.dx
        if (b.y < 0 || b.y > canvas.height) b.dy = -b.dy
        b.t.push({ x: b.x, y: b.y })
        if (b.t.length > 80) b.t.shift()
        ctx.save()
        for (let i = 1; i < b.t.length; i++) {
          const a   = i / b.t.length
          const hex = Math.floor(a * 255).toString(16).padStart(2, '0')
          ctx.beginPath()
          ctx.moveTo(b.t[i-1].x, b.t[i-1].y)
          ctx.lineTo(b.t[i].x,   b.t[i].y)
          ctx.strokeStyle = b.c + hex
          ctx.lineWidth   = 1 + a * 2.5
          ctx.shadowColor = b.c
          ctx.shadowBlur  = 18 * a
          ctx.stroke()
        }
        // bright tip dot
        ctx.beginPath(); ctx.arc(b.x, b.y, 2.5, 0, Math.PI * 2)
        ctx.fillStyle   = '#ffffff'
        ctx.shadowColor = b.c
        ctx.shadowBlur  = 24
        ctx.fill()
        ctx.restore()
      })
      id = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(id); window.removeEventListener('resize', resize) }
  }, [color, color2, speed])
  return <canvas ref={ref} style={{ position:'absolute', inset:0, width:'100%', height:'100%' }} />
}

export default function App() {
  const [session,              setSession]              = useState(null)
  const [loading,              setLoading]              = useState(true)
  const [workspaces,           setWorkspaces]           = useState([])
  const [activeWs,             setActiveWs]             = useState(null)
  const [sections,             setSections]             = useState([])
  const [links,                setLinks]                = useState([])
  const [notes,                setNotes]                = useState([])
  const [addingWs,             setAddingWs]             = useState(false)
  const [newWsName,            setNewWsName]            = useState('')
  const [showSettings,         setShowSettings]         = useState(false)
  const [theme,                setTheme]                = useState(loadTheme)
  const [themeSyncing,         setThemeSyncing]         = useState(false)
  const [importingBackup,      setImportingBackup]      = useState(false)
  const [addSectionTrigger,    setAddSectionTrigger]    = useState(0)
  const [importSectionTrigger, setImportSectionTrigger] = useState(0)
  const [collapseAllTrigger,   setCollapseAllTrigger]   = useState(0)
  const [expandAllTrigger,     setExpandAllTrigger]     = useState(0)
  const [allExpanded,          setAllExpanded]          = useState(true)
  const fileRef       = useRef(null)
  const backupFileRef = useRef(null)
  const wsCache       = useRef({})
  const sessionRef    = useRef(null)
  const syncTimer     = useRef(null)
  const topbarRef     = useRef(null)

  useEffect(() => { sessionRef.current = session }, [session])

  // Set --topbar-h CSS variable based on actual topbar height
  useEffect(() => {
    const el = topbarRef.current
    if (!el) return
    const update = () => document.documentElement.style.setProperty('--topbar-h', el.offsetHeight + 'px')
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])


  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session); setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('current_theme', JSON.stringify(theme))
  }, [theme])

  useEffect(() => {
    const onFocus = () => { const s = loadTheme(); setTheme(s); applyTheme(s) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  const syncThemeToCloud = useCallback(async (t) => {
    const s = sessionRef.current
    if (!s) return
    clearTimeout(syncTimer.current)
    syncTimer.current = setTimeout(async () => {
      setThemeSyncing(true)
      try {
        await supabase.from('user_settings').upsert(
          { user_id: s.user.id, theme: { ...t, bgImage: '' } },
          { onConflict: 'user_id' }
        )
      } catch {}
      finally { setThemeSyncing(false) }
    }, 2000)
  }, [])

  const fetchTheme = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_settings').select('theme').eq('user_id', userId).maybeSingle()
      if (error) { console.warn('fetchTheme error:', error.message); return }
      if (data?.theme && Object.keys(data.theme).length > 0) {
        const merged = { ...DEFAULT_THEME, ...data.theme }
        setTheme(merged); applyTheme(merged)
        localStorage.setItem('current_theme', JSON.stringify(merged))
      } else {
        const local = loadTheme()
        await supabase.from('user_settings').upsert(
          { user_id: userId, theme: { ...local, bgImage: '' } }, { onConflict: 'user_id' }
        )
      }
    } catch (e) { console.warn('fetchTheme failed:', e.message) }
  }, [])

  useEffect(() => {
    if (session?.user?.id) fetchTheme(session.user.id)
  }, [session?.user?.id])

  const set = (key, val) => setTheme(prev => ({ ...prev, [key]: val }))

  const fetchWorkspaces = useCallback(async () => {
    const s = sessionRef.current
    if (!s) return
    const { data } = await supabase.from('workspaces').select('*')
      .eq('user_id', s.user.id).order('created_at')
    if (data) {
      setWorkspaces(data)
      setActiveWs(prev => {
        const stored = localStorage.getItem('active_ws')
        if (stored && data.find(w => w.id === stored)) return stored
        return prev ?? data[0]?.id ?? null
      })
    }
  }, [])

  const fetchData = useCallback(async (wsId, silent = false) => {
    const s = sessionRef.current
    if (!s || !wsId) return
    if (!silent) {
      let hit = wsCache.current[wsId]
      if (!hit) {
        try {
          const raw = localStorage.getItem(lcKey(wsId))
          if (raw) hit = JSON.parse(raw)
        } catch {}
      }
      if (hit) {
        wsCache.current[wsId] = hit
        setSections(hit.sections); setLinks(hit.links); setNotes(hit.notes)
        fetchData(wsId, true); return
      }
    }
    const [sec, lnk, nt] = await Promise.all([
      supabase.from('sections').select('*').eq('workspace_id', wsId).eq('user_id', s.user.id).order('position'),
      supabase.from('links').select('*').eq('workspace_id', wsId).eq('user_id', s.user.id).order('position'),
      supabase.from('notes').select('*').eq('workspace_id', wsId).eq('user_id', s.user.id).order('created_at', { ascending: false }),
    ])
    const fresh = { sections: sec.data ?? [], links: lnk.data ?? [], notes: nt.data ?? [] }
    wsCache.current[wsId] = fresh
    try { localStorage.setItem(lcKey(wsId), JSON.stringify(fresh)) } catch {}
    setSections(fresh.sections); setLinks(fresh.links); setNotes(fresh.notes)
  }, [])

  const switchWorkspace = useCallback((id) => {
    localStorage.setItem('active_ws', id)
    delete wsCache.current[id]
    try { localStorage.removeItem(lcKey(id)) } catch {}
    setActiveWs(id)
  }, [])

  const handleRefresh = useCallback(() => {
    if (!activeWs) return
    delete wsCache.current[activeWs]
    try { localStorage.removeItem(lcKey(activeWs)) } catch {}
    fetchData(activeWs)
  }, [activeWs, fetchData])

  useEffect(() => { fetchWorkspaces() }, [session])
  useEffect(() => { if (activeWs) fetchData(activeWs) }, [activeWs])

  const addWorkspace = async (e) => {
    e.preventDefault()
    if (!newWsName.trim()) return
    const s = sessionRef.current
    const { data } = await supabase.from('workspaces')
      .insert({ user_id: s.user.id, name: newWsName.trim() }).select().single()
    setNewWsName(''); setAddingWs(false)
    await fetchWorkspaces()
    if (data) switchWorkspace(data.id)
  }

  const deleteWorkspace = async (id) => {
    if (!confirm('Delete this workspace and all its data?')) return
    delete wsCache.current[id]
    try { localStorage.removeItem(lcKey(id)) } catch {}
    await supabase.from('links').delete().eq('workspace_id', id)
    await supabase.from('sections').delete().eq('workspace_id', id)
    await supabase.from('notes').delete().eq('workspace_id', id)
    await supabase.from('workspaces').delete().eq('id', id)
    const remaining = workspaces.filter(w => w.id !== id)
    setWorkspaces(remaining)
    switchWorkspace(remaining[0]?.id ?? null)
  }

  const saveSettings = async () => {
    localStorage.setItem('current_theme', JSON.stringify(theme))
    applyTheme(theme); setShowSettings(false)
    syncThemeToCloud(theme)
  }

  const resetSettings = async () => {
    setTheme({ ...DEFAULT_THEME })
    localStorage.setItem('current_theme', JSON.stringify(DEFAULT_THEME))
    applyTheme(DEFAULT_THEME); syncThemeToCloud(DEFAULT_THEME)
  }

  const exportSettings = () => {
    const blob = new Blob([JSON.stringify({ ...theme, bgImage: '' }, null, 2)], { type: 'application/json' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = 'theme.json'; a.click()
  }

  const importSettings = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const t = { ...DEFAULT_THEME, ...JSON.parse(ev.target.result) }
        setTheme(t); applyTheme(t); localStorage.setItem('current_theme', JSON.stringify(t))
      } catch { alert('Invalid theme file') }
    }
    reader.readAsText(file)
  }

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    if (file.size > 2 * 1024 * 1024) { alert('Please use an image under 2 MB.'); return }
    const reader = new FileReader()
    reader.onload = (ev) =>
      setTheme(prev => ({ ...prev, bgStyle: 'bg-image', bgImage: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const exportFullBackup = async () => {
    const s = sessionRef.current; if (!s) return
    try {
      const [wsRes, secRes, lnkRes, ntRes] = await Promise.all([
        supabase.from('workspaces').select('*').eq('user_id', s.user.id).order('created_at'),
        supabase.from('sections').select('*').eq('user_id', s.user.id).order('position'),
        supabase.from('links').select('*').eq('user_id', s.user.id).order('position'),
        supabase.from('notes').select('*').eq('user_id', s.user.id).order('created_at', { ascending: false }),
      ])
      const backup = {
        version: 2, exported_at: new Date().toISOString(),
        theme: { ...theme, bgImage: '' },
        workspaces: (wsRes.data ?? []).map(ws => ({
          name: ws.name,
          sections: (secRes.data ?? []).filter(sec => sec.workspace_id === ws.id).map(sec => ({
            name: sec.name, position: sec.position, collapsed: sec.collapsed ?? false,
            links: (lnkRes.data ?? []).filter(l => l.section_id === sec.id)
              .map(l => ({ title: l.title, url: l.url, position: l.position })),
          })),
          notes: (ntRes.data ?? []).filter(n => n.workspace_id === ws.id)
            .map(n => ({ content: n.content, created_at: n.created_at })),
        })),
      }
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
      a.download = `mystartpage-backup-${new Date().toISOString().slice(0,10)}.json`; a.click()
    } catch (e) { alert('Export failed: ' + e.message) }
  }

  const importFullBackup = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const backup = JSON.parse(ev.target.result)
        if (!backup.workspaces || !Array.isArray(backup.workspaces)) { alert('Invalid backup file.'); return }
        if (!confirm(`This will ADD ${backup.workspaces.length} workspace(s). Existing data will not be deleted. Continue?`)) return
        setImportingBackup(true)
        const s = sessionRef.current
        if (backup.theme && Object.keys(backup.theme).length > 0) {
          const t = { ...DEFAULT_THEME, ...backup.theme }
          setTheme(t); applyTheme(t); localStorage.setItem('current_theme', JSON.stringify(t))
          await supabase.from('user_settings').upsert({ user_id: s.user.id, theme: t }, { onConflict: 'user_id' })
        }
        for (const ws of backup.workspaces) {
          const { data: newWs } = await supabase.from('workspaces')
            .insert({ user_id: s.user.id, name: ws.name }).select().single()
          if (!newWs) continue
          for (const sec of ws.sections ?? []) {
            const { data: newSec } = await supabase.from('sections').insert({
              user_id: s.user.id, workspace_id: newWs.id,
              name: sec.name, position: sec.position ?? 0, collapsed: sec.collapsed ?? false,
            }).select().single()
            if (!newSec) continue
            if (sec.links?.length)
              await supabase.from('links').insert(
                sec.links.map((l, i) => ({
                  user_id: s.user.id, workspace_id: newWs.id, section_id: newSec.id,
                  title: l.title, url: l.url, position: l.position ?? i,
                }))
              )
          }
          if (ws.notes?.length)
            await supabase.from('notes').insert(
              ws.notes.map(n => ({ user_id: s.user.id, workspace_id: newWs.id, content: n.content }))
            )
        }
        await fetchWorkspaces(); setImportingBackup(false); alert('Backup imported successfully!')
      } catch (err) { setImportingBackup(false); alert('Import failed: ' + err.message) }
    }
    reader.readAsText(file)
  }

  const refreshCache = async () => {
    Object.keys(localStorage).filter(k => k.startsWith('ws_data_')).forEach(k => localStorage.removeItem(k))
    wsCache.current = {}
    try {
      const reg = await navigator.serviceWorker?.getRegistration()
      if (reg?.waiting) reg.waiting.postMessage('SKIP_WAITING')
      const keys = await caches.keys()
      await Promise.all(keys.map(k => caches.delete(k)))
      await reg?.unregister(); await navigator.serviceWorker?.register('/sw.js')
    } catch {}
    window.location.reload()
  }

  if (loading) return <div className="auth-wrap" style={{ color: 'var(--text-dim)' }}>Loading…</div>
  if (!session) return <Auth onAuth={setSession} />

  const isPatternBg  = PATTERN_BG.includes(theme.bgStyle)
  const isPlasmasBg  = PLASMA_BG.includes(theme.bgStyle)
  const colCount     = parseInt(theme.sectionsCols) || 2
  const notesWidth   = parseInt(theme.notesWidth)   || 240
  const openInNewTab = theme.openInNewTab !== 'false'
  const locked       = theme.locked === 'true'

  const getBgStyle = () => {
    if (theme.bgStyle === 'bg-image') return {
      backgroundImage: theme.bgImage ? `url(${theme.bgImage})` : 'none',
      backgroundSize: 'cover', backgroundPosition: 'center',
      opacity: parseFloat(theme.bgImageOpacity ?? 1),
    }
    if (theme.bgStyle === 'bg-gradient') {
      try {
        const colors = JSON.parse(theme.gradientColors || '["#6c8fff","#0c0c0f"]')
        return {
          background: theme.gradientType === 'radial'
            ? `radial-gradient(ellipse at center, ${colors.join(', ')})`
            : `linear-gradient(${theme.gradientAngle}deg, ${colors.join(', ')})`,
        }
      } catch { return {} }
    }
    return {}
  }

  const gradColors = (() => {
    try { return JSON.parse(theme.gradientColors) } catch { return ['#6c8fff', '#0c0c0f'] }
  })()
  const updateGradColor = (i, val) => {
    const next = [...gradColors]; next[i] = val
    set('gradientColors', JSON.stringify(next))
  }
  const addGradStop = () => {
    if (gradColors.length >= 6) return
    set('gradientColors', JSON.stringify([...gradColors, '#444466']))
  }
  const removeGradStop = (i) => {
    if (gradColors.length <= 2) return
    set('gradientColors', JSON.stringify(gradColors.filter((_, idx) => idx !== i)))
  }

  return (
    <div className="app">
      <div className={`bg-layer ${theme.bgStyle}`} style={getBgStyle()}>
        {theme.bgStyle === 'bg-laser' && (
          <LaserCanvas color={theme.laserColor} color2={theme.laserColor2} speed={theme.laserSpeed} />
        )}
      </div>

      {/* Topbar */}
      <div className="topbar" ref={topbarRef}>
        <div className="workspace-tabs">
          {workspaces.map(ws => (
            <button key={ws.id}
              className={`workspace-tab${activeWs === ws.id ? ' active' : ''}`}
              onClick={() => switchWorkspace(ws.id)}>
              {ws.name}
              <button className="del-ws"
                onClick={e => { e.stopPropagation(); deleteWorkspace(ws.id) }}>✕</button>
            </button>
          ))}
          {addingWs ? (
            <form onSubmit={addWorkspace} style={{ display: 'flex', gap: '0.4rem' }}>
              <input className="input" value={newWsName} onChange={e => setNewWsName(e.target.value)}
                placeholder="Name" autoFocus
                style={{ width: 110, padding: '0.2rem 0.6rem', fontSize: 'var(--topbar-font-size)' }} />
              <button className="btn btn-primary" type="submit">+</button>
              <button className="btn" type="button" onClick={() => setAddingWs(false)}>✕</button>
            </form>
          ) : (
            <button className="btn btn-ghost" onClick={() => setAddingWs(true)}
              style={{ padding: '0.25rem 0.7rem' }}>+</button>
          )}
        </div>

        <div className="topbar-widgets">
          <div className="clock-compact"><Clock /></div>
          <div className="topbar-divider" />
          <Weather />
          <div className="topbar-divider" />
          <SearchBar searchUrl={theme.searchUrl} />
        </div>

        <div className="topbar-actions">
          <button className="btn btn-ghost"
            title={allExpanded ? 'Collapse all sections' : 'Expand all sections'}
            style={{ padding: '0.25rem 0.6rem', fontSize: '0.9em' }}
            onClick={() => {
              if (allExpanded) setCollapseAllTrigger(n => n + 1)
              else             setExpandAllTrigger(n => n + 1)
              setAllExpanded(v => !v)
            }}>{allExpanded ? '▸' : '▾'}</button>
          {locked && (
            <span title="Cards locked — unlock in Settings"
              style={{ fontSize: '0.85em', color: 'var(--text-muted)', userSelect: 'none' }}>🔒</span>
          )}
          <button className="btn btn-ghost"
            title="Add section"
            style={{ padding: '0.25rem 0.65rem', fontSize: '1.1em', lineHeight: 1 }}
            onClick={() => setAddSectionTrigger(n => n + 1)}>+</button>
          <button className="btn btn-ghost" onClick={() => setShowSettings(s => !s)}>⚙ Settings</button>
          <button className="btn btn-ghost" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </div>
      </div>

      {/* Main layout */}
      <div className="main-layout" style={{ gridTemplateColumns: `1fr` }}>
        <div className="main-col" style={{ paddingRight: `${notesWidth + 12}px` }}>
          <Sections
            sections={sections ?? []}
            links={links ?? []}
            userId={session.user.id}
            workspaceId={activeWs}
            onRefresh={handleRefresh}
            openInNewTab={openInNewTab}
            colCount={colCount}
            triggerAdd={addSectionTrigger}
            triggerImport={importSectionTrigger}
            triggerCollapseAll={collapseAllTrigger}
            triggerExpandAll={expandAllTrigger}
            locked={locked}
          />
        </div>
      </div>

      {/* Notes — fixed panel, outside grid so overflow:hidden can't clip it */}
      <div style={{
        position: 'fixed',
        top: 'var(--topbar-h, 40px)',
        right: 0,
        width: `${notesWidth}px`,
        height: 'calc(100vh - var(--topbar-h, 40px))',
        overflowY: 'auto',
        zIndex: 10,
        padding: '0.75rem 0.75rem 0.75rem 0',
      }}>
        <Notes
          notes={notes ?? []}
          userId={session.user.id}
          workspaceId={activeWs}
          onRefresh={handleRefresh}
        />
      </div>

      {/* Settings panel */}
      {showSettings && (
        <Settings
          theme={theme}
          set={set}
          workspaces={workspaces}
          activeWs={activeWs}
          onSwitchWs={switchWorkspace}
          onDeleteWs={deleteWorkspace}
          onSave={saveSettings}
          onReset={resetSettings}
          onClose={() => setShowSettings(false)}
          onExport={exportSettings}
          onImport={importSettings}
          onImageUpload={handleImageUpload}
          onExportBackup={exportSettings}
          onImportBackup={(e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setImportingBackup(true)
            const r = new FileReader()
            r.onload = async (ev) => {
              try {
                const data = JSON.parse(ev.target.result)
                if (data.workspaces) {
                  for (const ws of data.workspaces) {
                    const { data: newWs } = await supabase.from('workspaces').insert({ user_id: session.user.id, name: ws.name }).select().single()
                    if (ws.sections?.length) await supabase.from('sections').insert(ws.sections.map(s => ({ ...s, id: undefined, workspace_id: newWs.id, user_id: session.user.id })))
                    if (ws.links?.length)    await supabase.from('links').insert(ws.links.map(l => ({ ...l, id: undefined, workspace_id: newWs.id, user_id: session.user.id })))
                    if (ws.notes?.length)   await supabase.from('notes').insert(ws.notes.map(n => ({ ...n, id: undefined, workspace_id: newWs.id, user_id: session.user.id })))
                  }
                }
                handleRefresh()
              } catch (err) { alert('Import failed: ' + err.message) }
              finally { setImportingBackup(false) }
            }
            r.readAsText(f)
          }}
          fileRef={fileRef}
          backupFileRef={backupFileRef}
          onRefreshCache={() => caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k))).then(handleRefresh))}
          themeSyncing={themeSyncing}
          importingBackup={importingBackup}
          onAddSection={() => setAddSectionTrigger(n => n + 1)}
          onImportSection={() => setImportSectionTrigger(n => n + 1)}
          onCollapseAll={() => { setCollapseAllTrigger(n => n + 1); setAllExpanded(false) }}
          onExpandAll={()   => { setExpandAllTrigger(n => n + 1);   setAllExpanded(true)  }}
        />
      )}
    </div>
  )
}