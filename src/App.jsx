import { useEffect, useRef, useState, useMemo } from 'react'
import Auth from './components/Auth'
import Sections from './components/Sections'
import Notes from './components/Notes'
import Settings from './components/Settings'
import { supabase } from './lib/supabase'
import './index.css'

function safeLocalGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : v
  } catch {
    return fallback
  }
}

function safeLocalSet(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

function safeLocalRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch {}
}

function ClockWidget() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hm = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })

  return (
    <div className="clock-compact">
      <span className="clock-compact-time">{hm}</span>
      <span className="clock-compact-date">{date}</span>
    </div>
  )
}

function WeatherWidget() {
  const CACHE_KEY = 'wxcache'
  const CACHE_TTL = 25 * 60 * 1000

  const WX = {
    0: { icon: '☀️', label: 'Clear' },
    1: { icon: '🌤️', label: 'Mostly clear' },
    2: { icon: '⛅', label: 'Partly cloudy' },
    3: { icon: '☁️', label: 'Overcast' },
    45: { icon: '🌫️', label: 'Foggy' },
    48: { icon: '🌫️', label: 'Icy fog' },
    51: { icon: '🌦️', label: 'Light drizzle' },
    53: { icon: '🌦️', label: 'Drizzle' },
    55: { icon: '🌧️', label: 'Heavy drizzle' },
    61: { icon: '🌦️', label: 'Light rain' },
    63: { icon: '🌧️', label: 'Raining' },
    65: { icon: '🌧️', label: 'Heavy rain' },
    71: { icon: '🌨️', label: 'Light snow' },
    73: { icon: '🌨️', label: 'Snowing' },
    75: { icon: '❄️', label: 'Heavy snow' },
    80: { icon: '🌦️', label: 'Showers' },
    81: { icon: '🌧️', label: 'Rain showers' },
    82: { icon: '⛈️', label: 'Violent rain' },
    95: { icon: '⛈️', label: 'Thunderstorm' },
    96: { icon: '⛈️', label: 'Thunderstorm' },
    99: { icon: '⛈️', label: 'Thunderstorm' },
  }

  const [wx, setWx] = useState(() => {
    try {
      const raw = safeLocalGet(CACHE_KEY, null)
      if (!raw) return null
      const c = JSON.parse(raw)
      if (Date.now() - c.ts < CACHE_TTL) return c.data ?? null
    } catch {}
    return null
  })

  const [forecast, setForecast] = useState(() => {
    try {
      const raw = safeLocalGet(CACHE_KEY, null)
      if (!raw) return []
      const c = JSON.parse(raw)
      if (Date.now() - c.ts < CACHE_TTL) return c.forecast ?? []
    } catch {}
    return []
  })

  const [open, setOpen] = useState(false)
  const [stale, setStale] = useState(false)
  const [loading, setLoading] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const fetchByCoords = async (lat, lon) => {
      setLoading(true)
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
          `&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min` +
          `&forecast_days=5&timezone=auto`

        const r = await fetch(url)
        if (!r.ok) throw new Error('Weather request failed')

        const d = await r.json()

        const nextWx = d.current
          ? {
              temperature: d.current.temperature_2m,
              weathercode: d.current.weather_code,
            }
          : null

        const nextForecast = Array.isArray(d.daily?.time)
          ? d.daily.time.slice(0, 5).map((date, i) => ({
              date,
              code: d.daily.weather_code?.[i],
              max: Math.round(d.daily.temperature_2m_max?.[i]),
              min: Math.round(d.daily.temperature_2m_min?.[i]),
            }))
          : []

        if (nextWx) {
          setWx(nextWx)
          setForecast(nextForecast)
          setStale(false)
          safeLocalSet(
            CACHE_KEY,
            JSON.stringify({
              data: nextWx,
              forecast: nextForecast,
              ts: Date.now(),
            })
          )
        } else {
          throw new Error('No weather data returned')
        }
      } catch {
        setStale(true)
      } finally {
        setLoading(false)
      }
    }

    const fetchWx = async () => {
      const cached = safeLocalGet(CACHE_KEY, null)
      if (cached) {
        try {
          const c = JSON.parse(cached)
          if (Date.now() - c.ts < CACHE_TTL && c.data) {
            setWx(c.data)
            setForecast(c.forecast ?? [])
          }
        } catch {}
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async ({ coords }) => {
            await fetchByCoords(coords.latitude, coords.longitude)
          },
          async () => {
            await fetchByCoords(-37.8136, 144.9631)
          },
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
        )
      } else {
        await fetchByCoords(-37.8136, 144.9631)
      }
    }

    fetchWx()
    const id = setInterval(fetchWx, 15 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!open) return

    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!wx) return null

  const dayLabel = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div ref={ref} style={{ position: 'relative', overflow: 'visible' }}>
      <div
        className="weather-wrap"
        style={{ opacity: stale ? 0.55 : 1, cursor: 'pointer' }}
        title={stale ? 'Weather data may be outdated. Click for forecast.' : 'Click for forecast.'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="weather-icon">{WX[wx.weathercode]?.icon ?? '☁️'}</span>
        <span className="weather-temp">{Math.round(wx.temperature)}°</span>
        <span className="weather-desc">
          {loading ? 'Updating…' : WX[wx.weathercode]?.label ?? 'Weather'}
        </span>
      </div>

      {open && forecast.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 0.35rem)',
            left: 0,
            zIndex: 9999,
            background: 'var(--bg2)',
            border: '1px solid color-mix(in srgb, var(--border) calc(var(--border-opacity, 1) * 100%), transparent)',
            borderRadius: 'var(--radius)',
            padding: '0.5rem 0.75rem',
            minWidth: 230,
            boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
            fontSize: 'var(--topbar-font-size)',
            pointerEvents: 'auto',
          }}
        >
          {forecast.map((day, i) => (
            <div
              key={day.date}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.28rem 0',
                borderBottom:
                  i < forecast.length - 1
                    ? '1px solid color-mix(in srgb, var(--border) 40%, transparent)'
                    : 'none',
              }}
            >
              <span style={{ fontSize: '1.1em' }}>{WX[day.code]?.icon ?? '☁️'}</span>
              <span style={{ flex: 1, color: 'var(--text-dim)' }}>{dayLabel(day.date)}</span>
              <span style={{ color: 'var(--text)' }}>{day.max}°</span>
              <span style={{ color: 'var(--text-muted)' }}>{day.min}°</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const DEFAULT_THEME = {
  bg: '0c0c0f',
  bg2: '13131a',
  bg3: '1a1a24',
  card: '13131a',
  cardOpacity: 1,
  border: '2a2a3a',
  borderHover: '3d3d55',
  borderOpacity: 1,
  handleOpacity: 15,
  text: 'e8e8f0',
  textDim: '7878a0',
  titleColor: '7878a0',
  accent: '6c8fff',
  danger: 'ff6b6b',
  success: '6bffb8',
  btnBg: '3a3a4a',
  btnText: 'e8e8f0',
  font: 'DM Mono, monospace',
  fontSize: 14,
  topbarFontSize: 12,
  clockWidgetSize: 1,
  notesFontSize: 13,
  settingsFontSize: 13,
  radius: 10,
  sectionRadius: 0,
  linkGap: 0.5,
  cardPadding: 0.75,
  sectionGap: 0,
  sectionGapH: 0,
  mainGapTop: 12,
  pageScale: 1,
  faviconOpacity: 1,
  faviconGreyscale: false,
  faviconSize: 13,
  patternColor: '2a2a3a',
  patternOpacity: 1,
  bgPreset: 'noise',
  wallpaper: '',
  wallpaperFit: 'cover',
  linksPaddingH: 0.75,
  bgAnimSpeed: 1,
  bgC1: '',
  bgC2: '',
  bgC3: '',
  bgBlur: null,
  bgSt: '',
  searchEngineUrl: 'https://www.google.com.au/search?q=',
  settingsTitleColor: '7878a0',
  bgGrassSky: '020609',
  bgGrassGround: '071a05',
  bgOceanSky: '000814',
  bgOceanWater: '001428',
  wallpaperX: 50,
  wallpaperY: 50,
  wallpaperScale: 100,
  wallpaperBlur: 0,
  wallpaperDim: 35,
  wallpaperOpacity: 100,
  sectionsCols: 3,
  notesGap: 0,
  notesCardBg: '13131a',
  notesCardBgOpacity: 1,
  notesTextColor: 'e8e8f0',
  notesTextBg: '0c0c0f',
  settingsSide: 'right',
  bmFontSize: 13,
  bmResultBg: '',
  bmResultText: '',
}

function applyTheme(t) {
  if (!t) return
  const root = document.documentElement
  const s = (k, v) => {
    if (v !== undefined && v !== null) root.style.setProperty(k, String(v))
  }

  s('--bg', t.bg)
  s('--bg2', t.bg2)
  s('--bg3', t.bg3)
  s('--card', t.card)
  s('--card-opacity', t.cardOpacity ?? 1)
  s('--border', t.border)
  s('--border-hover', t.borderHover)
  s('--border-opacity', t.borderOpacity ?? 1)
  s('--handle-opacity', (t.handleOpacity ?? 15) / 100)
  s('--text', t.text)
  s('--text-dim', t.textDim)
  s('--text-muted', t.textMuted ?? t.textDim)
  s('--title-color', t.titleColor ?? t.textDim)
  s('--accent', t.accent)
  if (t.accent) {
    s('--accent-dim', `${t.accent}33`)
    s('--accent-glow', `${t.accent}22`)
  }
  s('--danger', t.danger)
  s('--success', t.success)
  s('--btn-bg', t.btnBg)
  s('--btn-text', t.btnText)
  s('--font', t.font)
  if (t.fontSize) s('--font-size', `${t.fontSize}px`)
  if (t.topbarFontSize) s('--topbar-font-size', `${t.topbarFontSize}px`)
  if (t.clockWidgetSize) s('--clock-widget-size', `${t.clockWidgetSize}rem`)
  if (t.notesFontSize) s('--notes-font-size', `${t.notesFontSize}px`)
  if (t.faviconSize) s('--favicon-size', `${t.faviconSize}px`)
  if (t.radius != null) {
    s('--radius', `${t.radius}px`)
    s('--radius-sm', `${Math.max(2, t.radius - 4)}px`)
  }
  s('--section-radius', `${t.sectionRadius ?? 0}px`)
  if (t.linkGap != null) s('--link-gap', `${t.linkGap}rem`)
  if (t.cardPadding != null) s('--card-padding', `${t.cardPadding}rem`)
  s('--section-gap', `${t.sectionGap ?? 0}px`)
  s('--section-gap-h', `${t.sectionGapH ?? 0}px`)
  s('--main-gap-top', `${t.mainGapTop ?? 12}px`)
  s('--sections-cols', t.sectionsCols ?? 4)
  s('--favicon-opacity', t.faviconOpacity ?? 1)
  s('--favicon-filter', t.faviconGreyscale ? 'grayscale(1)' : 'none')
  s('--favicon-display', t.faviconEnabled ?? true ? 'block' : 'none')
  s('--wallpaper-dim', (t.wallpaperDim ?? 35) / 100)
  if (t.settingsFontSize) s('--settings-font-size', `${t.settingsFontSize}px`)
  if (t.settingsTitleColor) s('--settings-title-color', t.settingsTitleColor)
  if (t.notesGap != null) s('--notes-gap', `${t.notesGap}px`)
  if (t.notesCardBg) s('--notes-card-bg', t.notesCardBg)
  s('--notes-card-bg-opacity', t.notesCardBgOpacity ?? 1)
  if (t.notesTextColor) s('--notes-text-color', t.notesTextColor)
  if (t.notesTextBg) s('--notes-text-bg', t.notesTextBg)

  let styleEl = document.getElementById('sp-overrides')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'sp-overrides'
    document.head.appendChild(styleEl)
  }

  const lph = t.linksPaddingH ?? 0.75
  if (lph > 0) {
    styleEl.textContent = [
      `.links-list {`,
      `padding-left: ${lph}rem !important;`,
      `padding-right: ${lph}rem !important;`,
      `margin-left: 0 !important;`,
      `}`,
    ].join('')
  } else {
    styleEl.textContent = [
      `.links-list {`,
      `padding-left: 0 !important;`,
      `padding-right: var(--card-padding, 0.75rem) !important;`,
      `margin-left: ${lph}rem !important;`,
      `}`,
    ].join('')
  }

  document.body.style.fontFamily = t.font || 'DM Mono, monospace'
  document.body.style.backgroundColor = `#${t.bg || '0c0c0f'}`
  document.body.style.color = `#${t.text || 'e8e8f0'}`
  if (t.pageScale) document.body.style.zoom = t.pageScale
}

export default function App() {
  const sessionRef = useRef(null)
  const searchInputRef = useRef(null)
  const fileRef = useRef(null)
  const backupFileRef = useRef(null)
  const saveThemeRef = useRef(null)

  const [session, setSession] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [activeWs, setActiveWs] = useState(null)
  const [sections, setSections] = useState([])
  const [links, setLinks] = useState([])
  const [notes, setNotes] = useState([])
  const [theme, setThemeState] = useState(() => {
    try {
      return { ...DEFAULT_THEME, ...JSON.parse(safeLocalGet('currenttheme', '{}')) }
    } catch {
      return DEFAULT_THEME
    }
  })
  const [bgImage, setBgImage] = useState(safeLocalGet('bgimage', null))
  const [search, setSearch] = useState('')
  const [webSearch, setWebSearch] = useState('')
  const [searchMode, setSearchMode] = useState('web')
  const [bookmarks, setBookmarks] = useState([])
  const [bmFolders, setBmFolders] = useState([])
  const [bmQuery, setBmQuery] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [importingBackup, setImportingBackup] = useState(false)
  const [allCollapsed, setAllCollapsed] = useState(false)
  const [triggerCollapse, setTriggerCollapse] = useState(0)
  const [triggerExpand, setTriggerExpand] = useState(0)
  const [notesTrigger, setNotesTrigger] = useState(undefined)
  const [sectionsNonce, setSectionsNonce] = useState(0)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => searchInputRef.current?.focus(), 350)
    return () => clearTimeout(timer)
  }, [session])

  const persistTheme = (t, immediate = false) => {
    clearTimeout(saveThemeRef.current)

    const doSave = async () => {
      const uid = sessionRef.current?.user?.id
      if (!uid) return

      const { wallpaper, ...themeData } = t
      const { data: updated, error: upErr } = await supabase
        .from('user_settings')
        .update({ theme: themeData, updated_at: new Date().toISOString() })
        .eq('user_id', uid)
        .select('id')

      if (upErr) return

      if (!updated?.length) {
        await supabase.from('user_settings').insert({ user_id: uid, theme: themeData })
      }
    }

    if (immediate) doSave()
    else saveThemeRef.current = setTimeout(doSave, 1500)
  }

  const setTheme = (updater) => {
    setThemeState((prev) => {
      const base = typeof updater === 'function' ? updater(prev) : updater
      const next = { ...base, savedAt: Date.now() }
      safeLocalSet('currenttheme', JSON.stringify(next))
      persistTheme(next)
      return next
    })
  }

  const toggleAll = () => {
    if (allCollapsed) {
      setTriggerExpand((t) => t + 1)
      setNotesTrigger(true)
      setAllCollapsed(false)
    } else {
      setTriggerCollapse((t) => t + 1)
      setNotesTrigger(false)
      setAllCollapsed(true)
    }
  }

  const loadUserSettings = async (force = false) => {
    const uid = sessionRef.current?.user?.id ?? session?.user?.id
    if (!uid) return

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('theme')
        .eq('user_id', uid)
        .maybeSingle()

      if (error) return

      let localTheme = {}
      try {
        localTheme = JSON.parse(safeLocalGet('currenttheme', '{}'))
      } catch {}

      const remoteTheme = data?.theme ?? {}
      const hasLocal = Object.keys(localTheme).length > 5
      const hasRemote = Object.keys(remoteTheme).length > 5

      if (hasRemote) {
        const localTs = localTheme.savedAt ?? 0
        const remoteTs = remoteTheme.savedAt ?? 0

        if (force || !hasLocal || remoteTs >= localTs) {
          const wall = localTheme.wallpaper ?? null
          const merged = { ...DEFAULT_THEME, ...remoteTheme, ...(wall ? { wallpaper: wall } : {}) }
          setThemeState(merged)
          safeLocalSet('currenttheme', JSON.stringify(merged))
        } else {
          persistTheme(localTheme, true)
        }
      } else if (hasLocal) {
        persistTheme(localTheme, true)
      }
    } catch {}
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setSettingsOpen(false)
  }

  const ensureWorkspace = async () => {
    const { data, error } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
    if (error) return

    if (!data?.length) {
      const { data: created, error: err } = await supabase
        .from('workspaces')
        .insert({ user_id: session.user.id, name: 'Home' })
        .select()
        .single()

      if (err) return
      setWorkspaces([created])
      setActiveWs(created.id)
      return
    }

    setWorkspaces(data)
    setActiveWs((prev) => prev ?? data[0]?.id ?? null)
  }

  const handleRefresh = async () => {
    if (!sessionRef.current?.user?.id) return

    try {
      const { data: wsData, error: wsErr } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: true })

      if (wsErr) return

      setWorkspaces(wsData)
      const currentWs = activeWs ?? wsData?.[0]?.id ?? null
      if (!currentWs) return
      if (!activeWs) setActiveWs(currentWs)

      const [{ data: secData }, { data: linkData }, { data: noteData }] = await Promise.all([
        supabase.from('sections').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
        supabase.from('links').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
        supabase.from('notes').select('*').eq('workspace_id', currentWs).order('created_at', { ascending: false }),
      ])

      setSections(secData ?? [])
      setLinks(linkData ?? [])
      setNotes(noteData ?? [])
      setSectionsNonce((n) => n + 1)
    } catch {}
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session) {
          setSession(data.session)
          handleRefresh()
        }
      } catch {}
    }

    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
    }
  }, [activeWs])

  useEffect(() => {
    if (!session) return
    loadUserSettings().then(ensureWorkspace).then(handleRefresh)
  }, [session])

  useEffect(() => {
    if (activeWs && session) handleRefresh()
  }, [activeWs, session])

  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const raw = safeLocalGet('spbookmarks', null)
        if (!raw) return
        const data = JSON.parse(raw)
        if (data.bookmarks?.length) {
          setBookmarks(data.bookmarks)
          setBmFolders(data.folders ?? [])
        }
      } catch {}
    }

    loadFromStorage()

    const onMessage = (e) => {
      if (e.data?.type === 'SP_BOOKMARKS_UPDATE' && e.data?.payload) {
        const { bookmarks: bm, folders: fl } = e.data.payload
        setBookmarks(bm ?? [])
        setBmFolders(fl ?? [])
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return links
    return links.filter(
      (l) => l.title?.toLowerCase().includes(q) || l.url?.toLowerCase().includes(q)
    )
  }, [links, search])

  const filteredBookmarks = useMemo(() => {
    const q = bmQuery.trim().toLowerCase()
    if (!q || !bookmarks.length) return []

    let hiddenFolders = []
    try {
      hiddenFolders = JSON.parse(safeLocalGet('spbmhidden', '[]'))
    } catch {}

    return bookmarks
      .filter((b) => !hiddenFolders.includes(b.folderId))
      .filter(
        (b) => b.title?.toLowerCase().includes(q) || b.url?.toLowerCase().includes(q)
      )
      .slice(0, 15)
  }, [bookmarks, bmQuery])

  const addWorkspace = async (name) => {
    const wsName = typeof name === 'string' ? name : prompt('Workspace name?')
    if (!wsName?.trim()) return

    const { data, error } = await supabase
      .from('workspaces')
      .insert({ user_id: session.user.id, name: wsName.trim() })
      .select()
      .single()

    if (error) return
    setWorkspaces((prev) => [...prev, data])
    setActiveWs(data.id)
  }

  const renameWorkspace = async (id, name) => {
    const { error } = await supabase.from('workspaces').update({ name }).eq('id', id)
    if (error) return
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? { ...w, name } : w)))
  }

  const deleteWorkspace = async (id) => {
    if (!confirm('Delete this workspace?')) return
    const { error } = await supabase.from('workspaces').delete().eq('id', id)
    if (error) return
    const next = workspaces.filter((w) => w.id !== id)
    setWorkspaces(next)
    setActiveWs(next[0]?.id ?? null)
  }

  const handleImageUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setTheme((prev) => ({ ...prev, wallpaper: e.target.result }))
    reader.readAsDataURL(file)
  }

  const handleBgImageUpload = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      safeLocalSet('bgimage', e.target.result)
      setBgImage(e.target.result)
      setTheme((prev) => ({ ...prev, bgPreset: 'image' }))
    }
    reader.readAsDataURL(file)
  }

  const exportFullBackup = async () => {
    const backup = {
      version: 2,
      exportedAt: new Date().toISOString(),
      theme,
      workspaces: [],
    }

    const { data: wsData } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })

    for (const ws of wsData ?? []) {
      const [{ data: secData }, { data: noteData }] = await Promise.all([
        supabase.from('sections').select('*').eq('workspace_id', ws.id).order('position', { ascending: true }),
        supabase.from('notes').select('*').eq('workspace_id', ws.id).order('created_at', { ascending: false }),
      ])

      const sectionsWithLinks = []

      for (const sec of secData ?? []) {
        const { data: secLinks } = await supabase
          .from('links')
          .select('*')
          .eq('section_id', sec.id)
          .order('position', { ascending: true })

        sectionsWithLinks.push({
          name: sec.name,
          position: sec.position,
          collapsed: sec.collapsed,
          colindex: sec.colindex ?? 0,
          links: (secLinks ?? []).map((l) => ({
            title: l.title,
            url: l.url,
            position: l.position,
          })),
        })
      }

      backup.workspaces.push({
        name: ws.name,
        sections: sectionsWithLinks,
        notes: (noteData ?? []).map((n) => ({ content: n.content })),
      })
    }

    const a = document.createElement('a')
    a.href = URL.createObjectURL(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    )
    a.download = 'startpage-backup.json'
    a.click()
  }

  const exportCSV = async () => {
    const { data: secs } = await supabase
      .from('sections')
      .select('*')
      .eq('workspace_id', activeWs)
      .order('position', { ascending: true })

    const { data: lnks } = await supabase
      .from('links')
      .select('*')
      .eq('workspace_id', activeWs)
      .order('position', { ascending: true })

    const rows = [['Section', 'Title', 'URL']]
    secs?.forEach((s) =>
      lnks?.filter((l) => l.section_id === s.id).forEach((l) => rows.push([s.name, l.title, l.url]))
    )

    const dq = '"'
    const csv = rows
      .map((r) => r.map((c) => dq + String(c).replaceAll(dq, dq + dq) + dq).join(','))
      .join('\n')

    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = 'startpage-links.csv'
    a.click()
  }

  const resetWorkspaceLinks = async () => {
    if (!confirm('Delete ALL sections and links in this workspace? Notes are kept.')) return
    await supabase.from('links').delete().eq('workspace_id', activeWs)
    await supabase.from('sections').delete().eq('workspace_id', activeWs)
    await handleRefresh()
  }

  const handleImportBackup = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    e.target.value = ''
    setImportingBackup(true)

    const r = new FileReader()
    r.onload = async (ev) => {
      try {
        const uid = sessionRef.current?.user?.id
        if (!uid) throw new Error('Not logged in')

        const text = ev.target.result
        const ext = f.name.split('.').pop().toLowerCase()

        if (ext === 'csv') {
          const lines = text.trim().split('\n').slice(1)
          const sectionMap = {}
          let pos = 0

          for (const line of lines) {
            const [section, title, url] = line
              .split(',')
              .map((c) => c.trim().replace(/^"/, '').replace(/"$/, ''))

            if (!section || !title || !url) continue

            if (!sectionMap[section]) {
              const { data: sec } = await supabase
                .from('sections')
                .insert({
                  user_id: uid,
                  workspace_id: activeWs,
                  name: section,
                  position: pos++,
                  collapsed: false,
                  colindex: 0,
                })
                .select()
                .single()

              sectionMap[section] = { id: sec.id, lpos: 0 }
            }

            await supabase.from('links').insert({
              user_id: uid,
              workspace_id: activeWs,
              section_id: sectionMap[section].id,
              title,
              url: url.startsWith('http') ? url : `https://${url}`,
              position: sectionMap[section].lpos++,
            })
          }

          await handleRefresh()
          alert('CSV imported!')
          return
        }

        const data = JSON.parse(text)

        if (Array.isArray(data)) {
          const rows = data.flat(2).filter((g) => g && typeof g === 'object' && !Array.isArray(g))
          let imported = 0

          for (let i = 0; i < rows.length; i += 1) {
            const grp = rows[i]
            const { data: sec, error: secErr } = await supabase
              .from('sections')
              .insert({
                user_id: uid,
                workspace_id: activeWs,
                name: grp.name ?? grp.title ?? 'Section',
                position: i,
                collapsed: false,
                colindex: 0,
              })
              .select()
              .single()

            if (secErr || !sec) continue

            const lnks = (grp.bookmarks ?? grp.links ?? [])
              .filter((b) => b && (b.url || b.href))
              .map((b, j) => ({
                user_id: uid,
                workspace_id: activeWs,
                section_id: sec.id,
                title: b.name ?? b.title ?? 'Link',
                url: (b.url ?? b.href ?? '').trim(),
                position: j,
              }))

            if (lnks.length) await supabase.from('links').insert(lnks)
            imported++
          }

          await handleRefresh()
          alert(`Imported ${imported} of ${rows.length} sections.`)
          return
        }

        if (data.workspaces && Array.isArray(data.workspaces)) {
          if (!confirm(`Add ${data.workspaces.length} workspaces? Existing data is kept.`)) return

          for (const ws of data.workspaces) {
            const { data: newWs } = await supabase
              .from('workspaces')
              .insert({ user_id: uid, name: ws.name })
              .select()
              .single()

            for (let si = 0; si < (ws.sections ?? []).length; si += 1) {
              const sec = ws.sections[si]
              const { data: newSec } = await supabase
                .from('sections')
                .insert({
                  user_id: uid,
                  workspace_id: newWs.id,
                  name: sec.name,
                  position: sec.position ?? si,
                  collapsed: sec.collapsed ?? false,
                  colindex: sec.colindex ?? 0,
                })
                .select()
                .single()

              const lnks = (sec.links ?? []).map((l, j) => ({
                user_id: uid,
                workspace_id: newWs.id,
                section_id: newSec.id,
                title: l.title ?? l.name ?? 'Link',
                url: l.url,
                position: l.position ?? j,
              }))

              if (lnks.length) await supabase.from('links').insert(lnks)
            }

            if (ws.notes?.length) {
              await supabase.from('notes').insert(
                ws.notes.map((n) => ({
                  user_id: uid,
                  workspace_id: newWs.id,
                  content: n.content ?? '',
                }))
              )
            }
          }

          if (data.theme) {
            const t = { ...DEFAULT_THEME, ...data.theme }
            setTheme(t)
          }

          await handleRefresh()
          alert('Backup imported!')
          return
        }

        if (data.bg || data.text || data.accent) {
          setTheme({ ...DEFAULT_THEME, ...data })
          alert('Theme imported.')
          return
        }

        alert('Unrecognised format.')
      } catch (err) {
        alert(`Import failed: ${err.message}`)
      } finally {
        setImportingBackup(false)
      }
    }

    r.readAsText(f)
  }
  const bgClass =
    bgImage && theme.bgPreset === 'image'
      ? 'bg-layer bg-image'
      : `bg-layer bg-${theme.bgPreset || 'noise'}`

  const bgStyle =
    bgImage && theme.bgPreset === 'image'
      ? {
          backgroundImage: `url(${bgImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : undefined

  if (loading) return <div className="center-fill">Loading...</div>
  if (!session) return <Auth />

  return (
    <div className={bgClass} style={bgStyle}>
      <div
        className="app"
        style={{
          position: 'relative',
          zIndex: 1,
          minHeight: '100vh',
        }}
      >
        {theme.wallpaper ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
              backgroundImage: `url(${theme.wallpaper})`,
              backgroundSize: `${theme.wallpaperScale ?? 100}%`,
              backgroundPosition: `${theme.wallpaperX ?? 50}% ${theme.wallpaperY ?? 50}%`,
              backgroundRepeat: 'no-repeat',
              filter: `blur(${theme.wallpaperBlur ?? 0}px)`,
              opacity: (theme.wallpaperOpacity ?? 100) / 100,
            }}
          />
        ) : null}

        {theme.wallpaper && (theme.wallpaperDim ?? 0) > 0 ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 0,
              pointerEvents: 'none',
              background: `rgba(0,0,0,${(theme.wallpaperDim ?? 35) / 100})`,
            }}
          />
        ) : null}

        <div className="topbar" style={{ position: 'relative', zIndex: 2 }}>
          <div className="workspace-tabs">
            {workspaces.map((ws) => (
              <button
                key={ws.id}
                className={`workspace-tab ${activeWs === ws.id ? 'active' : ''}`}
                onClick={() => setActiveWs(ws.id)}
              >
                {ws.name}
                {workspaces.length > 1 ? (
                  <span
                    className="del-ws"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteWorkspace(ws.id)
                    }}
                  >
                    ×
                  </span>
                ) : null}
              </button>
            ))}

            <button
              className="icon-btn"
              title="New workspace"
              onClick={() => addWorkspace()}
              style={{ fontSize: '1.1em', lineHeight: 1 }}
            >
              +
            </button>
          </div>

          <div className="topbar-divider" />

          <div className="topbar-widgets">
            <ClockWidget />
            <div className="topbar-divider" />
            <WeatherWidget />
          </div>

          <div className="search-compact">
            <div className="search-mode-bar">
              {[
                { key: 'web', label: 'Web' },
                { key: 'links', label: 'Links' },
                { key: 'bookmarks', label: 'Bookmarks' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  className={`search-mode-btn ${searchMode === key ? 'active' : ''}`}
                  title={key.charAt(0).toUpperCase() + key.slice(1)}
                  onClick={() => {
                    setSearchMode(key)
                    setSearch('')
                    setWebSearch('')
                    setBmQuery('')
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <input
              className="input search-compact-input"
              placeholder={
                searchMode === 'web'
                  ? 'Search the web'
                  : searchMode === 'links'
                    ? 'Filter links'
                    : 'Search bookmarks'
              }
              ref={searchInputRef}
              value={searchMode === 'web' ? webSearch : searchMode === 'links' ? search : bmQuery}
              onChange={(e) => {
                if (searchMode === 'web') setWebSearch(e.target.value)
                else if (searchMode === 'links') setSearch(e.target.value)
                else setBmQuery(e.target.value)
              }}
              onKeyDown={(e) => {
                if (searchMode === 'web' && e.key === 'Enter' && webSearch.trim()) {
                  const url = `${theme.searchEngineUrl || 'https://www.google.com.au/search?q='}${encodeURIComponent(webSearch.trim())}`
                  if (theme.openInNewTab ?? true) {
                    window.open(url, '_blank', 'noopener,noreferrer')
                  } else {
                    window.location.href = url
                  }
                  setWebSearch('')
                }

                if (searchMode === 'bookmarks' && e.key === 'Enter' && filteredBookmarks.length) {
                  window.open(filteredBookmarks[0].url, '_blank', 'noopener,noreferrer')
                  setBmQuery('')
                }

                if (e.key === 'Escape') {
                  setSearch('')
                  setWebSearch('')
                  setBmQuery('')
                }
              }}
            />

            <button
              className="icon-btn search-btn"
              title="Clear"
              onClick={() => {
                setSearch('')
                setWebSearch('')
                setBmQuery('')
              }}
            >
              ×
            </button>

            {searchMode === 'bookmarks' && bmQuery && filteredBookmarks.length > 0 ? (
              <div
                className="bm-dropdown"
                style={{
                  fontSize: `${theme.bmFontSize ?? 13}px`,
                  ...(theme.bmResultBg ? { background: theme.bmResultBg } : {}),
                  ...(theme.bmResultText ? { '--bm-text': theme.bmResultText } : {}),
                }}
              >
                {filteredBookmarks.map((b, i) => (
                  <a
                    key={b.id ?? i}
                    className="bm-result"
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setBmQuery('')}
                  >
                    <span className="bm-result-url">
                      {b.url.replace(/^https?:\/\//, '').split('/')[0]}
                    </span>
                    <span className="bm-result-folder">{b.folder}</span>
                    <span className="bm-result-title">{b.title}</span>
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="topbar-actions">
            <button
              className="btn"
              title={allCollapsed ? 'Expand all sections' : 'Collapse all sections'}
              onClick={toggleAll}
            >
              {allCollapsed ? 'Expand' : 'Collapse'}
            </button>

            <button
              className="icon-btn"
              title="Refresh"
              onClick={async () => {
                await loadUserSettings(true)
                await handleRefresh()
              }}
            >
              ↻
            </button>

            <button className="btn" title="Settings" onClick={() => setSettingsOpen(true)}>
              Settings
            </button>
          </div>
        </div>

        <main
          className="main-layout"
          style={{
            position: 'relative',
            zIndex: 2,
            gridTemplateColumns: '1fr var(--notes-width, 240px)',
          }}
        >
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

        {settingsOpen ? (
          <Settings
            theme={theme}
            setTheme={setTheme}
            onSave={() => persistTheme(theme, true)}
            onClose={() => setSettingsOpen(false)}
            onSignOut={handleSignOut}
            bmFolders={bmFolders}
            bookmarkCount={bookmarks.length}
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
        ) : null}
      </div>
    </div>
  )
}