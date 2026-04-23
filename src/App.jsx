import { useEffect, useRef, useState, useMemo } from 'react'
import Auth from './components/Auth'
import Sections from './components/Sections'
import Notes from './components/Notes'
import Settings from './components/Settings'
import { supabase } from './lib/supabase'
import CacheManager from './lib/cacheManager'
import './index.css'
 
// ─── CLOCK WIDGET ─────────────────────────────────────────────────────────────
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

// ─── WEATHER WIDGET ───────────────────────────────────────────────────────────
function WeatherWidget() {
  const [wx, setWx] = useState(null)
  const [forecast, setForecast] = useState([])
  const [open, setOpen] = useState(false)
  const closeTimer = useRef(null)

  const handleMouseEnter = () => {
    clearTimeout(closeTimer.current)
    setOpen(true)
  }
  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 200)
  }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const doFetch = async (lat, lon) => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=weathercode,temperature_2m_max,temperature_2m_min&temperature_unit=celsius&timezone=auto`
        )
        const d = await r.json()
        setWx(d.current_weather ?? null)
        if (d.daily) {
          setForecast(d.daily.time.slice(0, 5).map((date, i) => ({
            date,
            code: d.daily.weathercode[i],
            max: Math.round(d.daily.temperature_2m_max[i]),
            min: Math.round(d.daily.temperature_2m_min[i]),
          })))
        } else {
          setForecast([])
        }
      } catch {
        setForecast([])
      } finally {
        setLoading(false)
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => doFetch(coords.latitude, coords.longitude),
        () => doFetch(-37.8136, 144.9631),
        { timeout: 5000 } // Add timeout to geolocation
      )
    } else {
      doFetch(-37.8136, 144.9631)
    }
  }, [])

  // Show loading placeholder to prevent layout shift
  if (loading || !wx) {
    return (
      <div className="weather-wrap" style={{ opacity: 0.5 }}>
        <span className="weather-icon">⋯</span>
        <span className="weather-temp">--°</span>
      </div>
    )
  }

  const icons = {
    0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️', 45: '🌫', 48: '🌫',
    51: '🌦', 53: '🌦', 55: '🌧', 61: '🌧', 63: '🌧', 65: '🌧',
    71: '🌨', 73: '🌨', 75: '🌨', 80: '🌦', 81: '🌧', 82: '⛈',
    95: '⛈', 96: '⛈', 99: '⛈',
  }

  const descs = {
    0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
    45: 'Foggy', 48: 'Foggy', 51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
    61: 'Light rain', 63: 'Raining', 65: 'Heavy rain', 71: 'Light snow', 73: 'Snowing',
    75: 'Heavy snow', 80: 'Showers', 81: 'Rain showers', 82: 'Violent rain',
    95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Thunderstorm',
  }

  const dayLabel = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString([], { weekday: 'short' });
  }

  return (
    <div style={{ position: 'relative', overflow: 'visible' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div className="weather-wrap" style={{ cursor: forecast.length ? 'pointer' : 'default' }} title={forecast.length ? '5-day forecast' : ''}>
        <span className="weather-icon">{icons[wx.weathercode] || '🌡'}</span>
        <span className="weather-temp">{Math.round(wx.temperature)}°</span>
        <span className="weather-desc">{descs[wx.weathercode] || ''}</span>
      </div>
      {open && forecast.length > 0 && (
        <div className="weather-dropdown">
          <div className="weather-dropdown-inner">
            {forecast.map((day) => (
              <div key={day.date} className="weather-dropdown-row">
                <span style={{ fontSize: '1.1em' }}>{icons[day.code] || '🌡'}</span>
                <span style={{ flex: 1, color: 'var(--text-dim)', fontSize: '0.85em' }}>{descs[day.code] || 'Unknown'}</span>
                <span style={{ color: 'var(--text)', fontSize: '0.85em', fontWeight: 500 }}>{day.max}°</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.85em' }}>/ {day.min}°</span>
                <span style={{ color: 'var(--text-dim)', fontSize: '0.75em', marginLeft: '0.3rem' }}>{dayLabel(day.date)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── NEWS WIDGET ───────────────────────────────────────────────────────────────
const NEWS_FEEDS = [
  { id: 'abc',      label: 'ABC AU',    url: 'https://www.abc.net.au/news/feed/51120/rss.xml' },
  { id: 'guardian', label: 'Guardian',  url: 'https://www.theguardian.com/au/rss' },
  { id: 'sbs',      label: 'SBS',       url: 'https://www.sbs.com.au/news/feed' },
  { id: 'reuters',  label: 'Reuters',   url: 'https://feeds.reuters.com/reuters/topNews' },
  { id: 'verge',    label: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { id: 'dezeen',   label: 'Dezeen',    url: 'https://feeds.feedburner.com/dezeen' },
]
const RSS_PROXY = 'https://api.rss2json.com/v1/api.json?rss_url='

function NewsWidget({ theme, setTheme }) {
  const set = (k, v) => setTheme(prev => ({ ...prev, [k]: v }))
  const [open, setOpen] = useState(false)
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(false)
  const [activeFeed, setActiveFeed] = useState(null)
  const closeTimer = useRef(null)

  const disabledFeeds = theme.newsDisabledFeeds || []
  const customFeeds = [
    theme.newsCustom1 ? { id: 'custom1', label: theme.newsCustom1Label || 'Custom 1', url: theme.newsCustom1 } : null,
    theme.newsCustom2 ? { id: 'custom2', label: theme.newsCustom2Label || 'Custom 2', url: theme.newsCustom2 } : null,
    theme.newsCustom3 ? { id: 'custom3', label: theme.newsCustom3Label || 'Custom 3', url: theme.newsCustom3 } : null,
  ].filter(Boolean)

  const allFeeds = [...NEWS_FEEDS, ...customFeeds].filter(f => !disabledFeeds.includes(f.id))

  const fetchFeed = async (feed) => {
    setLoading(true)
    setArticles([])
    try {
      const res = await fetch(RSS_PROXY + encodeURIComponent(feed.url))
      const data = await res.json()
      setArticles((data.items || []).slice(0, 10))
    } catch {
      setArticles([])
    }
    setLoading(false)
  }

  const handleOpen = () => {
    clearTimeout(closeTimer.current)
    if (!open) {
      const first = allFeeds[0]
      if (first) { setActiveFeed(first); fetchFeed(first) }
      setOpen(true)
    }
  }
  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 300)
  }
  const handleMouseEnter = () => {
    clearTimeout(closeTimer.current)
    if (!open) {
      const first = allFeeds[0]
      if (first && !activeFeed) { setActiveFeed(first); fetchFeed(first) }
      setOpen(true)
    }
  }

  const switchFeed = (feed) => {
    setActiveFeed(feed)
    fetchFeed(feed)
  }

  if (allFeeds.length === 0) return null

  return (
    <div style={{ position: 'relative', overflow: 'visible' }} onMouseLeave={handleMouseLeave} onMouseEnter={handleMouseEnter}>
      <button className="icon-btn topbar-quick-btn topbar-news-btn" title="News" onClick={handleOpen}>N</button>
      {open && (
        <div className="news-dropdown">
          <div className="news-dropdown-inner">
            <div className="news-feed-tabs">
              {allFeeds.map(f => (
                <button key={f.id} className={`news-tab-btn${activeFeed?.id === f.id ? ' active' : ''}`} onClick={() => switchFeed(f)}>
                  {f.label}
                </button>
              ))}
            </div>
            <div className="news-articles">
              {loading && <div style={{ padding: '0.75rem', color: 'var(--text-dim)', fontSize: '0.82em' }}>Loading...</div>}
              {!loading && articles.length === 0 && <div style={{ padding: '0.75rem', color: 'var(--text-dim)', fontSize: '0.82em' }}>No articles found</div>}
              {!loading && articles.map((a, i) => (
                <a key={i} className="news-article-row" href={a.link} target="_blank" rel="noopener noreferrer">
                  <span className="news-article-title">{a.title}</span>
                  {a.pubDate && <span className="news-article-date">{new Date(a.pubDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>}
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CALENDAR WIDGET ───────────────────────────────────────────────────────────
// ─── CALENDAR WIDGET (iCal - no auth needed) ──────────────────────────────────
function parseIcal(text) {
  const events = []
  const blocks = text.split('BEGIN:VEVENT')
  blocks.slice(1).forEach(block => {
    const get = (key) => {
      const m = block.match(new RegExp(key + '[^:]*:([^\\r\\n]+)'))
      return m ? m[1].trim() : null
    }
    const parseDate = (str) => {
      if (!str) return null
      if (str.includes('T')) return new Date(str.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)/, '$1-$2-$3T$4:$5:$6$7'))
      return new Date(str.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3T00:00:00'))
    }
    const dtstart = get('DTSTART')
    const summary = get('SUMMARY')
    if (!dtstart || !summary) return
    const start = parseDate(dtstart)
    const dtend = get('DTEND')
    const end = parseDate(dtend)
    if (!start) return
    events.push({
      title: summary.replace(/\\,/g, ',').replace(/\\n/g, ' '),
      start: start.toISOString(),
      end: end ? end.toISOString() : start.toISOString(),
      allDay: !dtstart.includes('T'),
      location: (get('LOCATION') || '').replace(/\\,/g, ',') || null,
    })
  })
  return events.sort((a, b) => new Date(a.start) - new Date(b.start))
}

async function fetchIcal(url) {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 10000)
    const res = await fetch(`/api/ical?url=${encodeURIComponent(url)}`, { signal: controller.signal })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const text = await res.text()
    if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Not a valid iCal feed')
    return text
  } catch (err) {
    throw new Error(`Failed to fetch calendar: ${err.message}`)
  }
}

function CalendarWidget({ theme }) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const closeTimer = useRef(null)
  const fetched = useRef(false)

  const icalUrls = [theme.calIcalUrl, theme.calIcalUrl2, theme.calIcalUrl3].filter(Boolean)
  const urlKey = icalUrls.join('|')
  const lastUrlKey = useRef('')

  const fetchEvents = async () => {
    if (!icalUrls.length) return
    if (lastUrlKey.current === urlKey && fetched.current) return
    lastUrlKey.current = urlKey
    fetched.current = true
    setLoading(true)
    setError(null)
    try {
      const now = new Date()
      const cutoff = new Date()
      cutoff.setDate(cutoff.getDate() + 3)
      cutoff.setHours(23, 59, 59, 999)
      const results = await Promise.allSettled(icalUrls.map(u => fetchIcal(u)))
      const all = []
      results.forEach(r => {
        if (r.status === 'fulfilled') {
          try {
            parseIcal(r.value).forEach(ev => {
              const s = new Date(ev.start)
              if (s >= now && s <= cutoff) all.push(ev)
            })
          } catch { /* skip bad calendar */ }
        }
      })
      all.sort((a, b) => new Date(a.start) - new Date(b.start))
      setEvents(all)
      if (all.length === 0 && results.every(r => r.status === 'rejected')) {
        setError('Could not load calendars — check your iCal URLs')
      }
    } catch (e) {
      setError('Error loading calendar')
    } finally {
      setLoading(false)
    }
  }

  const handleMouseEnter = () => { clearTimeout(closeTimer.current); if (!open) { setOpen(true); fetchEvents() } }
  const handleMouseLeave = () => { closeTimer.current = setTimeout(() => setOpen(false), 300) }

  const grouped = {}
  events.forEach(ev => {
    const key = new Date(ev.start).toLocaleDateString('en-AU', { weekday: 'short', month: 'short', day: 'numeric' })
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(ev)
  })
  const formatTime = (iso, allDay) => allDay ? 'All day' : new Date(iso).toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })

  if (theme.hideCalendar) return null

  return (
    <div style={{ position: 'relative', overflow: 'visible' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button className="icon-btn topbar-quick-btn topbar-cal-btn" title="Calendar (next 3 days)">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="2" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.5"/>
          <line x1="5" y1="1" x2="5" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="11" y1="1" x2="11" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <rect x="4" y="8.5" width="2" height="2" rx="0.5" fill="currentColor"/>
          <rect x="7.5" y="8.5" width="2" height="2" rx="0.5" fill="currentColor"/>
          <rect x="11" y="8.5" width="2" height="2" rx="0.5" fill="currentColor"/>
        </svg>
      </button>
      {open && (
        <div className="cal-dropdown">
          <div className="cal-dropdown-inner">
            <div className="cal-header">
              Next 3 days
              <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: '0.75em', color: 'var(--accent)', textDecoration: 'none' }}>Open ↗</a>
            </div>
            {!icalUrls.length && <div className="cal-empty">⚙ Add your iCal URL in Settings → General → Calendar & Gmail</div>}
            {icalUrls.length > 0 && loading && <div className="cal-empty">Loading...</div>}
            {icalUrls.length > 0 && !loading && error && <div className="cal-empty" style={{ color: 'var(--danger)' }}>{error}</div>}
            {icalUrls.length > 0 && !loading && !error && events.length === 0 && <div className="cal-empty">No events in next 3 days 🎉</div>}
            {icalUrls.length > 0 && !loading && !error && Object.entries(grouped).map(([day, dayEvents]) => (
              <div key={day} className="cal-day-group">
                <div className="cal-day-label">{day}</div>
                {dayEvents.map((ev, i) => (
                  <a key={i} className="cal-event-row" href="https://calendar.google.com" target="_blank" rel="noopener noreferrer">
                    <span className="cal-event-time">{formatTime(ev.start, ev.allDay)}</span>
                    <span className="cal-event-title">{ev.title}</span>
                    {ev.location && <span className="cal-event-loc" title={ev.location}>📍</span>}
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}


// ─── GMAIL WIDGET ───────────────────────────────────────────────────────────────
function parseGmailAtom(xml) {
  const emails = []
  const parser = new DOMParser()
  const doc = parser.parseFromString(xml, 'text/xml')
  const entries = doc.querySelectorAll('entry')
  entries.forEach(entry => {
    const title = entry.querySelector('title')?.textContent || '(no subject)'
    const authorName = entry.querySelector('author name')?.textContent || ''
    const id = entry.querySelector('id')?.textContent || ''
    // Extract message ID from tag:gmail.google.com,2004:...
    const msgId = id.split(':').pop()
    emails.push({
      subject: title,
      from: authorName,
      link: `https://mail.google.com/mail/u/0/#inbox/${msgId}`
    })
  })
  return emails
}

function GmailWidget({ theme }) {
  const [open, setOpen] = useState(false)
  const [emails, setEmails] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const closeTimer = useRef(null)
  const fetched = useRef(false)

  const fetchEmails = async () => {
    if (fetched.current) return
    fetched.current = true
    setLoading(true)
    setError(null)
    try {
      const gmailAtom = 'https://mail.google.com/mail/feed/atom'
      const res = await fetch(`/api/ical?url=${encodeURIComponent(gmailAtom)}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const xml = await res.text()
      if (!xml.includes('<feed')) throw new Error('Not logged into Google or no access')
      setEmails(parseGmailAtom(xml))
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  const handleMouseEnter = () => {
    clearTimeout(closeTimer.current)
    if (!open) { setOpen(true); fetchEmails() }
  }
  const handleMouseLeave = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 300)
  }

  if (theme.hideGmail) return null

  return (
    <div style={{ position: 'relative', overflow: 'visible' }} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button className="icon-btn topbar-quick-btn topbar-gmail-btn" title="Unread Gmail">
        <svg width="14" height="11" viewBox="0 0 20 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="1" y="1" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
          <polyline points="1,2 10,9 19,2" stroke="currentColor" strokeWidth="1.5" fill="none"/>
        </svg>
        {emails.length > 0 && <span className="gmail-badge">{emails.length > 9 ? '9+' : emails.length}</span>}
      </button>
      {open && (
        <div className="cal-dropdown gmail-dropdown">
          <div className="cal-dropdown-inner">
            <div className="cal-header">
              Unread mail
              <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: '0.75em', color: 'var(--accent)', textDecoration: 'none' }}>Open ↗</a>
            </div>
            {loading && <div className="cal-empty">Loading...</div>}
            {!loading && error && <div className="cal-empty" style={{ color: 'var(--danger)' }}>{error} — make sure you're logged into Google</div>}
            {!loading && !error && emails.length === 0 && <div className="cal-empty">No unread emails 📭</div>}
            {!loading && !error && emails.map((em, i) => (
              <a key={i} className="gmail-row" href={em.link} target="_blank" rel="noopener noreferrer">
                <div className="gmail-from">{em.from}</div>
                <div className="gmail-subject">{em.subject}</div>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DEFAULT THEME ─────────────────────────────────────────────────────────────
const DEFAULT_THEME = {
  bg: '#0a0a0f', bg2: '#12121a', bg3: '#1a1a28',
  card: '#12121a', cardOpacity: 1, titleBg: '#0f0f18',
  border: '#2a2a3f', borderHover: '#3d3d5a', borderOpacity: 1,
  handleOpacity: 15,
  cardShadowEnabled: false,
  cardShadowSize: 8,
  cardShadowOpacity: 0.3,
  cardShadowColor: '#000000',
  cardShadowCurve: 'linear',
  cardShadowDirection: 'top-lit',
  notesShadowEnabled: false,
  notesShadowSize: 6,
  notesShadowOpacity: 0.25,
  notesShadowColor: '#000000',
  notesShadowCurve: 'linear',
  notesShadowDirection: 'top-lit',
  
  // Cards gradient
  cardsGradientEnabled: false,
  cardsGradientColor1: '#00ff88',
  cardsGradientPos1: 0,
  cardsGradientColor2: '#00ccff',
  cardsGradientPos2: 50,
  cardsGradientColor3: '#7b2ff7',
  cardsGradientPos3: 100,
  cardsGradientType: 'linear',
  cardsGradientAngle: 180,
  cardsGradientBlendMode: 'overlay',
  cardsGradientOpacity: 0.5,
  cardsGradientRadialScale: 100,
  cardsGradientTargetPanels: true,  // Apply to UI panels (cards/notes/topbar)
  cardsGradientTargetWallpaper: false,  // Apply to main background
  cardsGradientTargetBorder: false,
  cardsGradientTargetTitle: false,
  
  // Notes gradient
  notesGradientEnabled: false,
  notesGradientMatchCards: false,
  notesGradientColor1: '#00ff88',
  notesGradientPos1: 0,
  notesGradientColor2: '#00ccff',
  notesGradientPos2: 50,
  notesGradientColor3: '#7b2ff7',
  notesGradientPos3: 100,
  notesGradientType: 'linear',
  notesGradientAngle: 180,
  notesGradientBlendMode: 'overlay',
  notesGradientOpacity: 0.5,
  notesGradientTargetBg: true,
  notesGradientTargetBorder: false,
  notesGradientTargetTitle: false,
  
  // Topbar gradient
  topbarGradientEnabled: false,
  topbarGradientMatchCards: false,
  topbarGradientColor1: '#00ff88',
  topbarGradientPos1: 0,
  topbarGradientColor2: '#00ccff',
  topbarGradientPos2: 50,
  topbarGradientColor3: '#7b2ff7',
  topbarGradientPos3: 100,
  topbarGradientType: 'linear',
  topbarGradientAngle: 90,
  topbarGradientBlendMode: 'overlay',
  topbarGradientOpacity: 0.3,
  
  text: '#e8e8f5', textDim: '#8888b0', titleColor: '#9898c0',
  linkColor: '#5b9eff',
  linkVisitedColor: '#c77dff',
  accent: '#7890ff', danger: '#ff6b80', success: '#6bffc0',
  scrollbarColor: '#1f1f32', scrollbarThumbColor: '#7890ff',
  btnBg: '#3a3a4a', btnText: '#e8e8f0',
  font: "'DM Mono', monospace",
  fontSize: 14, topbarFontSize: 12, clockWidgetSize: 1, notesFontSize: 13, settingsFontSize: 13,
  radius: 10, sectionRadius: 0,
  linkGap: 0.5, cardPadding: 0.75, headerPadding: 0.42,
  sectionGap: 0, sectionGapH: 0, mainGapTop: 12, pageScale: 1,
  faviconOpacity: 1, faviconGreyscale: false, faviconSize: 13,
  patternColor: '#2a2a3f', patternOpacity: 1,
  bgPreset: 'noise',
  wallpaper: '', wallpaperFit: 'cover', linksPaddingH: 0.75,
  bgAnimSpeed: 1, bgC1: '', bgC2: '', bgC3: '', bgBlur: null,
  bgSt: {},
  searchEngineUrl: 'https://www.google.com/search?q=',
  settingsTitleColor: '#8888b0',
  settingsSubtitleColor: '#7890ff',
  bgGrassSky: '#020609', bgGrassGround: '#071a05',
  bgOceanSky: '#000814', bgOceanWater: '#001428',
  wallpaperX: 50, wallpaperY: 50, wallpaperScale: 100,
  wallpaperBlur: 0, wallpaperDim: 35, wallpaperOpacity: 100,
  sectionsCols: 6,
  notesGap: 0, notesCardBg: '#12121a', notesTextColor: '#e8e8f5', notesTextBg: '#0a0a0f', notesRadius: 4,
  notesSharedBg: '#1a1a28',
  settingsSide: 'right',
  bmFontSize: 13,
  bmResultBg: '',
  bmResultText: '',
  colHeaderColor: '#8888b0',
}

// ─── APPLY THEME ─────────────────────────────────────────────────────────────
function applyTheme(t) {
  if (!t) return
  const root = document.documentElement
  const s = (k, v) => { if (v !== undefined && v !== null) root.style.setProperty(k, String(v)) }
  s('--bg', t.bg); s('--bg2', t.bg2); s('--bg3', t.bg3)
  
  s('--card', t.card)
  s('--topbar-bg', t.card)
  s('--notes-card-bg', t.cardsGradientEnabled ? t.card : (t.notesCardBg || t.card))
  s('--col-header-color', t.colHeaderColor ?? '#8888b0')
  
  const baseBorderColor = t.border
  s('--card-opacity', t.cardOpacity ?? 1)  s('--title-bg', (t.cardsGradientEnabled && t.cardsGradientTargetTitle) ? 'rgba(0,0,0,0.1)' : (t.titleBg ?? t.card))
  s('--title-opacity', 1)
  s('--border', baseBorderColor)
  s('--border-opacity', t.cardsGradientEnabled && t.cardsGradientTargetBorder ? 0.2 : (t.borderOpacity ?? 1))
  s('--handle-opacity', 0.05)
  s('--handle-opacity-global', 0.05)
  s('--handle-size', '10px')
  s('--handle-color', t.handleColor ?? '#2a2a3a')
  s('--action-button-scale', 1)
  s('--text', t.text); s('--text-dim', t.textDim); s('--text-muted', t.textMuted ?? t.textDim)
  s('--title-color', t.titleColor ?? t.textDim)
  s('--link-color', t.linkColor ?? '#5b9eff')
  s('--link-visited-color', t.linkVisitedColor ?? '#c77dff')
  s('--accent', t.accent)
  if (t.accent) { s('--accent-dim', t.accent + '33'); s('--accent-glow', t.accent + '22') }
  s('--danger', t.danger); s('--success', t.success)
  s('--scrollbar-color', t.scrollbarColor ?? t.bg3)
  s('--scrollbar-thumb-color', t.scrollbarThumbColor ?? t.accent)
  s('--btn-bg', t.btnBg); s('--btn-text', t.btnText)
  
  // Card shadows
  if (t.cardShadowEnabled) {
    const size = t.cardShadowSize ?? 8
    const color = t.cardShadowColor ?? '#000000'
    const opacity = t.cardShadowOpacity ?? 0.3
    const curve = t.cardShadowCurve ?? 'linear'
    const direction = t.cardShadowDirection ?? 'top-lit'
    
    // Convert opacity to hex
    const toHex = (op) => Math.round(Math.min(op, 1) * 255).toString(16).padStart(2, '0')
    
    let shadow = ''
    
    // Top-lit: light from above, shadow below
    if (direction === 'top-lit') {
      if (curve === 'linear') {
        shadow = `0 ${size * 0.5}px ${size}px ${color}${toHex(opacity)}`
      } else if (curve === 'soft') {
        shadow = `0 ${size * 0.15}px ${size * 0.2}px ${color}${toHex(opacity * 0.8)}, 0 ${size * 0.3}px ${size * 0.5}px ${color}${toHex(opacity * 0.4)}, 0 ${size * 0.5}px ${size * 1.2}px ${color}${toHex(opacity * 0.15)}`
      } else if (curve === 'sharp') {
        shadow = `0 ${size * 0.25}px ${size * 0.3}px ${color}${toHex(opacity * 1.4)}, 0 ${size * 0.4}px ${size * 0.6}px ${color}${toHex(opacity * 0.3)}`
      } else if (curve === 'glow') {
        shadow = `0 ${size * 0.3}px ${size * 0.8}px ${color}${toHex(opacity * 0.5)}, 0 ${size * 0.5}px ${size * 1.2}px ${color}${toHex(opacity * 0.3)}`
      }
    }
    // Even: shadow all around, no directional offset
    else if (direction === 'even') {
      if (curve === 'linear') {
        shadow = `0 0 ${size}px ${color}${toHex(opacity)}`
      } else if (curve === 'soft') {
        shadow = `0 0 ${size * 0.2}px ${color}${toHex(opacity * 0.8)}, 0 0 ${size * 0.5}px ${color}${toHex(opacity * 0.4)}, 0 0 ${size * 1.2}px ${color}${toHex(opacity * 0.15)}`
      } else if (curve === 'sharp') {
        shadow = `0 0 ${size * 0.3}px ${color}${toHex(opacity * 1.4)}, 0 0 ${size * 0.6}px ${color}${toHex(opacity * 0.3)}`
      } else if (curve === 'glow') {
        shadow = `0 0 ${size * 0.4}px ${color}${toHex(opacity * 0.6)}, 0 0 ${size * 0.8}px ${color}${toHex(opacity * 0.4)}, 0 0 ${size * 1.4}px ${color}${toHex(opacity * 0.2)}`
      }
    }
    
    s('--card-shadow', shadow)
  } else {
    s('--card-shadow', 'none')
  }
  
  // Notes shadows - match cards if toggle on
  if (t.notesShadowMatchCards ?? true) {
    // Copy card shadow to notes
    const cardShadow = t.cardShadowEnabled
      ? (document.documentElement.style.getPropertyValue('--card-shadow') || 'none')
      : 'none'
    // Re-compute from card settings directly
    if (t.cardShadowEnabled) {
      const size = t.cardShadowSize ?? 8
      const color = t.cardShadowColor ?? '#000000'
      const opacity = t.cardShadowOpacity ?? 0.3
      const curve = t.cardShadowCurve ?? 'linear'
      const direction = t.cardShadowDirection ?? 'top-lit'
      const toHexN = (op) => Math.round(Math.min(op, 1) * 255).toString(16).padStart(2, '0')
      let shadow = ''
      if (direction === 'top-lit') {
        if (curve === 'linear') shadow = `0 ${size * 0.5}px ${size}px ${color}${toHexN(opacity)}`
        else if (curve === 'soft') shadow = `0 ${size * 0.15}px ${size * 0.2}px ${color}${toHexN(opacity * 0.8)}, 0 ${size * 0.3}px ${size * 0.5}px ${color}${toHexN(opacity * 0.4)}, 0 ${size * 0.5}px ${size * 1.2}px ${color}${toHexN(opacity * 0.15)}`
        else if (curve === 'sharp') shadow = `0 ${size * 0.25}px ${size * 0.3}px ${color}${toHexN(opacity * 1.4)}, 0 ${size * 0.4}px ${size * 0.6}px ${color}${toHexN(opacity * 0.3)}`
        else if (curve === 'glow') shadow = `0 ${size * 0.3}px ${size * 0.8}px ${color}${toHexN(opacity * 0.5)}, 0 ${size * 0.5}px ${size * 1.2}px ${color}${toHexN(opacity * 0.3)}`
      } else {
        if (curve === 'linear') shadow = `0 0 ${size}px ${color}${toHexN(opacity)}`
        else if (curve === 'soft') shadow = `0 0 ${size * 0.2}px ${color}${toHexN(opacity * 0.8)}, 0 0 ${size * 0.5}px ${color}${toHexN(opacity * 0.4)}, 0 0 ${size * 1.2}px ${color}${toHexN(opacity * 0.15)}`
        else if (curve === 'sharp') shadow = `0 0 ${size * 0.3}px ${color}${toHexN(opacity * 1.4)}, 0 0 ${size * 0.6}px ${color}${toHexN(opacity * 0.3)}`
        else if (curve === 'glow') shadow = `0 0 ${size * 0.4}px ${color}${toHexN(opacity * 0.6)}, 0 0 ${size * 0.8}px ${color}${toHexN(opacity * 0.4)}, 0 0 ${size * 1.4}px ${color}${toHexN(opacity * 0.2)}`
      }
      s('--notes-shadow', shadow)
    } else {
      s('--notes-shadow', 'none')
    }
  } else if (t.notesShadowEnabled) {
    const size = t.notesShadowSize ?? 6
    const color = t.notesShadowColor ?? '#000000'
    const opacity = t.notesShadowOpacity ?? 0.25
    const curve = t.notesShadowCurve ?? 'linear'
    const direction = t.notesShadowDirection ?? 'top-lit'
    
    const toHex = (op) => Math.round(Math.min(op, 1) * 255).toString(16).padStart(2, '0')
    
    let shadow = ''
    
    // Top-lit: light from above, shadow below
    if (direction === 'top-lit') {
      if (curve === 'linear') {
        shadow = `0 ${size * 0.5}px ${size}px ${color}${toHex(opacity)}`
      } else if (curve === 'soft') {
        shadow = `0 ${size * 0.15}px ${size * 0.2}px ${color}${toHex(opacity * 0.8)}, 0 ${size * 0.3}px ${size * 0.5}px ${color}${toHex(opacity * 0.4)}, 0 ${size * 0.5}px ${size * 1.2}px ${color}${toHex(opacity * 0.15)}`
      } else if (curve === 'sharp') {
        shadow = `0 ${size * 0.25}px ${size * 0.3}px ${color}${toHex(opacity * 1.4)}, 0 ${size * 0.4}px ${size * 0.6}px ${color}${toHex(opacity * 0.3)}`
      } else if (curve === 'glow') {
        shadow = `0 ${size * 0.3}px ${size * 0.8}px ${color}${toHex(opacity * 0.5)}, 0 ${size * 0.5}px ${size * 1.2}px ${color}${toHex(opacity * 0.3)}`
      }
    }
    // Even: shadow all around
    else if (direction === 'even') {
      if (curve === 'linear') {
        shadow = `0 0 ${size}px ${color}${toHex(opacity)}`
      } else if (curve === 'soft') {
        shadow = `0 0 ${size * 0.2}px ${color}${toHex(opacity * 0.8)}, 0 0 ${size * 0.5}px ${color}${toHex(opacity * 0.4)}, 0 0 ${size * 1.2}px ${color}${toHex(opacity * 0.15)}`
      } else if (curve === 'sharp') {
        shadow = `0 0 ${size * 0.3}px ${color}${toHex(opacity * 1.4)}, 0 0 ${size * 0.6}px ${color}${toHex(opacity * 0.3)}`
      } else if (curve === 'glow') {
        shadow = `0 0 ${size * 0.4}px ${color}${toHex(opacity * 0.6)}, 0 0 ${size * 0.8}px ${color}${toHex(opacity * 0.4)}, 0 0 ${size * 1.4}px ${color}${toHex(opacity * 0.2)}`
      }
    }
    
    s('--notes-shadow', shadow)
  } else {
    s('--notes-shadow', 'none')
  }
  
  // Cards gradient - always show when enabled
  if (t.cardsGradientEnabled) {
    const type = t.cardsGradientType ?? 'linear'
    const angle = t.cardsGradientAngle ?? 180
    const radialScale = t.cardsGradientRadialScale ?? 100
    const c1 = t.cardsGradientColor1 ?? '#00ff88'
    const p1 = t.cardsGradientPos1 ?? 0
    const c2 = t.cardsGradientColor2 ?? '#00ccff'
    const p2 = t.cardsGradientPos2 ?? 50
    const c3 = t.cardsGradientColor3 ?? '#7b2ff7'
    const p3 = t.cardsGradientPos3 ?? 100
    
    let gradientBg = ''
    if (type === 'linear') {
      gradientBg = `linear-gradient(${angle}deg, ${c1} ${p1}%, ${c2} ${p2}%, ${c3} ${p3}%)`
    } else if (type === 'radial') {
      gradientBg = `radial-gradient(ellipse ${radialScale}% ${radialScale}% at 50% 50%, ${c1} ${p1}%, ${c2} ${p2}%, ${c3} ${p3}%)`
    }
    
    s('--cards-gradient-bg', gradientBg)
    
    const blendMode = t.cardsGradientBlendMode ?? 'overlay'
    const opacity = t.cardsGradientOpacity ?? 0.5

    if (t.cardsGradientTargetPanels) {
      s('--panels-gradient', gradientBg)
      s('--panels-gradient-blend', blendMode)
      s('--panels-gradient-opacity', opacity)
    } else {
      s('--panels-gradient', 'none')
      s('--panels-gradient-blend', 'normal')
      s('--panels-gradient-opacity', 1)
    }
    
    if (t.cardsGradientTargetWallpaper) {
      s('--wallpaper-gradient', gradientBg)
      s('--wallpaper-gradient-blend', blendMode)
      s('--wallpaper-gradient-opacity', opacity)
    } else {
      s('--wallpaper-gradient', 'none')
      s('--wallpaper-gradient-blend', 'normal')
      s('--wallpaper-gradient-opacity', 1)
    }
  } else {
    s('--panels-gradient', 'none')
    s('--wallpaper-gradient', 'none')
  }
  
  s('--font', t.font)
  if (t.fontSize) s('--font-size', t.fontSize + 'px')
  if (t.topbarFontSize) s('--topbar-font-size', t.topbarFontSize + 'px')
  if (t.clockWidgetSize) s('--clock-widget-size', t.clockWidgetSize + 'rem')
  if (t.notesFontSize) s('--notes-font-size', t.notesFontSize + 'px')
  if (t.notesFontFamily) s('--notes-font-family', t.notesFontFamily)
  if (t.notesWidth) s('--notes-width', t.notesWidth + 'px')
  if (t.notesHeaderBg) s('--notes-header-bg', t.notesHeaderBg)
  if (t.notesHeaderTitleColor) s('--notes-header-title-color', t.notesHeaderTitleColor)
  s('--notes-word-wrap', (t.notesWordWrap ?? true) ? 'break-word' : 'normal')
  if (t.faviconSize) s('--favicon-size', t.faviconSize + 'px')
  if (t.radius != null) { s('--radius', t.radius + 'px'); s('--radius-sm', Math.max(2, t.radius - 4) + 'px') }
  s('--section-radius', (t.sectionRadius ?? 0) + 'px')
  if (t.linkGap != null) s('--link-gap', t.linkGap + 'rem')
  if (t.cardPadding != null) s('--card-padding', t.cardPadding + 'rem')
  if (t.headerPadding != null) s('--header-padding', t.headerPadding + 'rem')
  s('--section-gap', (t.sectionGap ?? 0) + 'px')
  s('--section-gap-h', (t.sectionGapH ?? 0) + 'px')
  s('--main-gap-top', (t.mainGapTop ?? 12) + 'px')
  s('--sections-cols', t.sectionsCols ?? 6)
  s('--favicon-opacity', t.faviconOpacity ?? 1)
  s('--favicon-filter', t.faviconGreyscale ? 'grayscale(1)' : 'none')
  s('--favicon-display', (t.faviconEnabled ?? true) ? 'block' : 'none')
  s('--favicon-delay', (t.faviconDelay ?? 0) + 's')
  s('--favicon-fade', (t.faviconFade ?? 0.3) + 's')
  s('--pattern-color', t.patternColor); s('--pattern-opacity', t.patternOpacity ?? 1)
  s('--wallpaper-dim', (t.wallpaperDim ?? 35) / 100)
  if (t.settingsFontSize) s('--settings-font-size', t.settingsFontSize + 'px')
  if (t.settingsTitleColor) s('--settings-title-color', t.settingsTitleColor)
  if (t.settingsSubtitleColor) s('--settings-subtitle-color', t.settingsSubtitleColor)
  if (t.settingsScrollbarColor) s('--settings-scrollbar-color', t.settingsScrollbarColor)

  let styleEl = document.getElementById('sp-overrides')
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = 'sp-overrides'
    document.head.appendChild(styleEl)
  }

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
    const r = parseInt(h.slice(0, 2), 16)
    const g = parseInt(h.slice(2, 4), 16)
    const b = parseInt(h.slice(4, 6), 16)
    return 'rgba(' + r + ',' + g + ',' + b + ',' + aa + ')'
  }

  const hexRgb = (hex) => {
    const h = (hex || '#000000').replace('#', '')
    return parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' + parseInt(h.slice(4, 6), 16)
  }

  const ps = (t.bgSt ?? {})[t.bgPreset] ?? {}
  const speed = ps.speed ?? 1
  const dur = (b) => speed <= 0 ? '9999s' : ((b / speed).toFixed(1) + 's')
  const c1 = ps.c1 || null
  const c2 = ps.c2 || null
  const c3 = ps.c3 || null
  const blur = ps.blur ?? null

  s('--plasma-speed-a', dur(20))
  s('--plasma-speed-b', dur(28))
  if (blur != null) { s('--plasma-blur-a', blur + 'px'); s('--plasma-blur-b', (blur + 20) + 'px') }

  if (c1) {
    s('--plasma-c1', rgba(c1, 0.28)); s('--plasma-c2', rgba(c2 || c1, 0.25)); s('--plasma-c3', rgba(c3 || c1, 0.18))
    s('--plasma-c4', rgba(c1, 0.14)); s('--plasma-c5', rgba(c2 || c1, 0.14)); s('--plasma-c6', rgba(c1, 0.16))
    s('--drift-c1', rgba(c1, 0.20))
    s('--drift-c2', rgba(c2 || c1, 0.16))
    s('--pulse-c', rgba(c1, 0.22))
    s('--tide-c1', rgba(c1, 0.24))
    s('--tide-c2', rgba(c2 || c1, 0.20))
  }

  // Apply user-defined plasma colors if set (overrides preset colors)
  const plasmaColors = {
    '17-plasma': [t.bgPlasmaC1, t.bgPlasmaC2, t.bgPlasmaC3],
    '18-inferno': [t.bgInfernoC1, t.bgInfernoC2, t.bgInfernoC3],
    '19-mint': [t.bgMintC1, t.bgMintC2, t.bgMintC3],
    '20-dusk': [t.bgDuskC1, t.bgDuskC2, t.bgDuskC3],
    '21-mono': [t.bgMonoC1, t.bgMonoC2, t.bgMonoC3]
  };
  const userColors = plasmaColors[t.bgPreset];
  if (userColors && userColors[0]) {
    s('--plasma-c1', rgba(userColors[0], 0.30));
    s('--plasma-c2', rgba(userColors[1] || userColors[0], 0.26));
    s('--plasma-c3', rgba(userColors[2] || userColors[0], 0.22));
    s('--plasma-c4', rgba(userColors[0], 0.14));
    s('--plasma-c5', rgba(userColors[1] || userColors[0], 0.16));
    s('--plasma-c6', rgba(userColors[2] || userColors[0], 0.18));
  }

  const sfGrad = ps.sfGrad ?? false
  if (sfGrad && c1) {
    s(
      '--starfield-bg-image',
      'radial-gradient(ellipse 80% 70% at 25% 45%, ' + rgba(c1, 0.22) + ' 0%, transparent 65%),' +
      'radial-gradient(ellipse 70% 80% at 75% 60%, ' + rgba(c2 || c1, 0.16) + ' 0%, transparent 65%)'
    )
  } else {
    s('--starfield-bg-image', 'none')
  }

  const fogColor = ps.fogColor || t.patternColor || null
  const fogOpacity = ps.fogOpacity ?? 1
  if (fogColor) {
    const rgb = hexRgb(fogColor)
    s('--fog-c1', 'rgba(' + rgb + ',' + (0.22 * fogOpacity).toFixed(3) + ')')
    s('--fog-c2', 'rgba(' + rgb + ',' + (0.18 * fogOpacity).toFixed(3) + ')')
    s('--fog-c3', 'rgba(' + rgb + ',' + (0.15 * fogOpacity).toFixed(3) + ')')
    s('--fog-c4', 'rgba(' + rgb + ',' + (0.16 * fogOpacity).toFixed(3) + ')')
    s('--fog-c5', 'rgba(' + rgb + ',' + (0.14 * fogOpacity).toFixed(3) + ')')
    s('--fog-c6', 'rgba(' + rgb + ',' + (0.10 * fogOpacity).toFixed(3) + ')')
  }

  const scanColor = ps.scanColor || t.patternColor || null
  const scanOpacity = ps.scanOpacity ?? 1
  if (scanColor) {
    const rgb = hexRgb(scanColor)
    s('--scan-line-c', 'rgba(' + rgb + ',' + (0.90 * scanOpacity).toFixed(3) + ')')
    s('--scan-mid-c', 'rgba(' + rgb + ',' + (0.55 * scanOpacity).toFixed(3) + ')')
    s('--scan-glow-c', 'rgba(' + rgb + ',' + (0.20 * scanOpacity).toFixed(3) + ')')
    s('--scan-glow2-c', 'rgba(' + rgb + ',' + (0.08 * scanOpacity).toFixed(3) + ')')
    s('--scan-glow3-c', 'rgba(' + rgb + ',' + (0.04 * scanOpacity).toFixed(3) + ')')
  }

  const gSky = t.bgGrassSky || '#020609'
  const gGnd = t.bgGrassGround || '#071a05'
  const oSky = t.bgOceanSky || '#000814'
  const oWtr = t.bgOceanWater || '#001428'

  var sfDensity = ps.density ?? 3
  var sfTileA = ([1200, 900, 700, 500, 350][sfDensity - 1] || 700) + 'px'
  var sfTileB = ([750, 600, 450, 320, 220][sfDensity - 1] || 450) + 'px'
  s('--sf-tile-a', sfTileA + ' ' + sfTileA)
  s('--sf-tile-b', sfTileB + ' ' + sfTileB)

  let bgEl = document.getElementById('sp-bg')
  if (!bgEl) {
    bgEl = document.createElement('style')
    bgEl.id = 'sp-bg'
    document.head.appendChild(bgEl)
  }

  bgEl.textContent = `
    .bg-aurora { animation-duration: ${dur(12)} !important; }
    html.bg-starfield::before { animation-duration: ${dur(80)} !important; }
    html.bg-starfield::after  { animation-duration: ${dur(130)} !important; }
    html.bg-16-starfield-old::before { animation-duration: ${dur(80)} !important; }
    html.bg-16-starfield-old::after  { animation-duration: ${dur(130)} !important; }
    html.bg-05-gradient       { animation-duration: ${dur(25)} !important; }
    html.bg-06-mesh           { animation-duration: ${dur(22)} !important; }
    html.bg-07-nebula         { animation-duration: ${dur(30)} !important; }
    html.bg-fog::before       { animation-duration: ${dur(42)} !important; }
    html.bg-fog::after        { animation-duration: ${dur(58)} !important; }
    html.bg-22-fog::before    { animation-duration: ${dur(42)} !important; }
    html.bg-22-fog::after     { animation-duration: ${dur(58)} !important; }
    html.bg-scan::before      { animation-duration: ${dur(7)} !important; }
    html.bg-23-scan::before   { animation-duration: ${dur(7)} !important; }
    html.bg-vortex::before    { animation-duration: ${dur(70)} !important; }
    html.bg-vortex::after     { animation-duration: ${dur(110)} !important; }
    .bg-layer:is(.bg-plasma,.bg-inferno,.bg-mint,.bg-dusk,.bg-mono)::before { animation-duration: ${dur(20)} !important; }
    .bg-layer:is(.bg-plasma,.bg-inferno,.bg-mint,.bg-dusk,.bg-mono)::after  { animation-duration: ${dur(28)} !important; }
    .bg-layer:is(.bg-17-plasma,.bg-18-inferno,.bg-19-mint,.bg-20-dusk,.bg-21-mono)::before { animation-duration: ${dur(20)} !important; }
    .bg-layer:is(.bg-17-plasma,.bg-18-inferno,.bg-19-mint,.bg-20-dusk,.bg-21-mono)::after  { animation-duration: ${dur(28)} !important; }
    html.bg-drift::before     { animation-duration: ${dur(35)} !important; }
    html.bg-drift::after      { animation-duration: ${dur(50)} !important; }
    html.bg-pulse::before     { animation-duration: ${dur(8)} !important; }
    html.bg-pulse::after      { animation-duration: ${dur(12)} !important; }
    html.bg-tide::before      { animation-duration: ${dur(20)} !important; }
    html.bg-tide::after       { animation-duration: ${dur(30)} !important; }
    html.bg-28-brushed-metal::after { animation-duration: ${dur(20)} !important; }

    html.bg-grass {
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
    html.bg-grass::before {
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
    html.bg-grass::after {
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

    html.bg-ocean {
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
    html.bg-ocean::before {
      content: '';
      position: absolute; bottom: -22%; left: -30%; width: 160%; height: 75%;
      background: ${oWtr};
      border-radius: 40% 60% 55% 45% / 35% 25% 45% 28%;
      opacity: .88;
      animation: ocean-wave-a ${dur(10)} ease-in-out infinite alternate;
    }
    html.bg-ocean::after {
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

  var oldPlanets = document.getElementById('sf-planets')
  if (oldPlanets) oldPlanets.remove()
  if (t.bgPreset === 'starfield' && ps.planets) {
    var sfLayer = document.querySelector('html.bg-starfield')
    if (sfLayer) {
      var planetCount = ps.planetCount ?? 2
      var planetDefs = [
        {
          size: 220, left: '-5%', top: '52%',
          gradient: 'radial-gradient(circle at 35% 35%, #5a7fb5 0%, #2a4a7a 40%, #0f1d3a 100%)',
          glow: '0 0 80px rgba(60,100,200,0.15)', ring: true, ringColor: 'rgba(140,170,220,0.32)',
        },
        {
          size: 80, left: '83%', top: '10%',
          gradient: 'radial-gradient(circle at 40% 38%, #c8936a 0%, #7a4a22 45%, #3a1f0a 100%)',
          glow: '0 0 40px rgba(180,100,40,0.12)', ring: false,
        },
        {
          size: 140, left: '8%', top: '8%',
          gradient: 'radial-gradient(circle at 42% 38%, #8a6ab5 0%, #4a3070 45%, #1a0f30 100%)',
          glow: '0 0 60px rgba(120,80,200,0.12)', ring: false,
        },
      ]
      var container = document.createElement('div')
      container.id = 'sf-planets'
      container.style.cssText = 'position:absolute;inset:0;overflow:visible;pointer-events:none;z-index:1;'
      planetDefs.slice(0, planetCount).forEach(function (p) {
        var planet = document.createElement('div')
        var inset = 'inset -' + Math.round(p.size * 0.12) + 'px -' + Math.round(p.size * 0.06) + 'px ' + Math.round(p.size * 0.22) + 'px rgba(0,0,0,0.65)'
        planet.style.cssText = 'position:absolute;width:' + p.size + 'px;height:' + p.size + 'px;left:' + p.left + ';top:' + p.top + ';border-radius:50%;background:' + p.gradient + ';box-shadow:' + inset + ',' + p.glow + ';pointer-events:none;'
        if (p.ring) {
          var ring = document.createElement('div')
          var rW = Math.round(p.size * 1.85)
          var rH = Math.round(p.size * 0.38)
          var rB = Math.round(p.size * 0.065)
          ring.style.cssText = 'position:absolute;width:' + rW + 'px;height:' + rH + 'px;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-18deg);border-radius:50%;border:' + rB + 'px solid ' + p.ringColor + ';box-shadow:0 0 ' + Math.round(p.size * 0.1) + 'px ' + p.ringColor + ';pointer-events:none;'
          planet.appendChild(ring)
        }
        container.appendChild(planet)
      })
      sfLayer.appendChild(container)
    }
  }

  s('--wallpaper-opacity', (t.wallpaperOpacity ?? 100) / 100)
  s('--bg-anim-speed', t.bgAnimSpeed ?? 1)
  if (t.bgC1) s('--bg-c1', t.bgC1)
  if (t.bgC2) s('--bg-c2', t.bgC2)
  if (t.bgC3) s('--bg-c3', t.bgC3)

  // Preset-specific colors (prevent bleeding between presets)
  // Each preset stores colors under unique keys and maps to unique CSS vars
  s('--bg-03-c1', t.bgDotsC1 || t.bgC1 || '#2a4a6a')
  s('--bg-03-c2', t.bgDotsC2 || t.bgC2 || '#4a2a5a')
  s('--bg-04-c1', t.bgGridC1 || '#2a4a6a')
  s('--bg-04-c2', t.bgGridC2 || '#4a2a5a')
  s('--bg-05-c1', t.bgGradC1 || '#1a2a4a')
  s('--bg-05-c2', t.bgGradC2 || '#2a1a3a')
  s('--bg-05-c3', t.bgGradC3 || '#1a3a2a')
  s('--bg-08-c1', t.bgC1 || t.bgStarC1 || '#05050f')
  s('--bg-08-c2', t.bgC2 || t.bgStarC2 || '#000308')
  s('--bg-08-c3', t.bgC3 || t.bgStarC3 || '#c8d2ff')
  s('--bg-14-c1', t.bgFogC1 || '#3a4a6e')
  s('--bg-15-c1', t.bgScanC1 || '#6c8fff')
  s('--bg-15-c2', t.bgScanC2 || '#05050d')

  // Fog color vars - set from preset-specific keys
  if (t.bgFogC1) {
    const rgb = hexRgb(t.bgFogC1)
    const op = 1
    s('--bg-fog-bg', t.bgFogC1)
    s('--bg-fog-c1', `rgba(${rgb},${(0.22 * op).toFixed(3)})`)
    s('--bg-fog-c2', `rgba(${rgb},${(0.16 * op).toFixed(3)})`)
  }
  // Scan color vars
  if (t.bgScanC1) {
    const rgb = hexRgb(t.bgScanC1)
    s('--bg-scan-c1', `rgba(${rgb},0.0)`)
    s('--bg-scan-c2', `rgba(${rgb},0.55)`)
    s('--bg-scan-c3', `rgba(${rgb},0.90)`)
    s('--bg-scan-glow1', `rgba(${rgb},0.20)`)
    s('--bg-scan-glow2', `rgba(${rgb},0.08)`)
    s('--bg-scan-glow3', `rgba(${rgb},0.04)`)
  }
  if (t.bgScanC2) s('--bg-scan-bg', t.bgScanC2)
  if (t.bgDotScale) s('--bg-dot-scale', t.bgDotScale + 'px')
  if (t.bgGridScale) s('--bg-grid-scale', t.bgGridScale + 'px')
  if (t.bgStarSize) s('--bg-star-size', t.bgStarSize)
  
  // Shape & Grid settings
  if (t.bgShapeOpacity != null) s('--bg-shape-opacity', t.bgShapeOpacity)
  if (t.bgGridThickness) s('--bg-grid-thickness', t.bgGridThickness + 'px')
  if (t.bgGridOpacity != null) s('--bg-grid-opacity', t.bgGridOpacity)
  
  // Gradient settings
  if (t.bgGradientAngle != null) s('--bg-gradient-angle', t.bgGradientAngle + 'deg')

  // Mesh colors
  if (t.bgMeshC1) { const r=hexRgb(t.bgMeshC1); s('--bg-mesh-c1', `rgba(${r},0.2)`) }
  if (t.bgMeshC2) { const r=hexRgb(t.bgMeshC2); s('--bg-mesh-c2', `rgba(${r},0.18)`) }
  if (t.bgMeshC3) { const r=hexRgb(t.bgMeshC3); s('--bg-mesh-c3', `rgba(${r},0.14)`) }

  // Nebula colors  
  if (t.bgNebulaC1) { const r=hexRgb(t.bgNebulaC1); s('--bg-nebula-c1', `rgba(${r},0.5)`) }
  if (t.bgNebulaC2) { const r=hexRgb(t.bgNebulaC2); s('--bg-nebula-c2', `rgba(${r},0.5)`) }
  
  // Starfield settings - density as multiplier, speed as multiplier
  s('--bg-star-size', t.bgStarSize ?? 1)
  s('--bg-star-density', t.bgStarDensity ? t.bgStarDensity / 100 : 1)
  s('--bg-star-speed', t.bgStarSpeed ?? 1)
  // Star streaks
  s('--bg-streak-bg', t.bgStreakBg || '#02020f')
  if (t.bgStreakC1) { const r = hexRgb(t.bgStreakC1); s('--bg-streak-c1', `rgba(${r},0.9)`) }
  if (t.bgStreakC2) { const r = hexRgb(t.bgStreakC2); s('--bg-streak-c2', `rgba(${r},0.7)`) }
  s('--bg-streak-speed', t.bgStreakSpeed ?? 1)
  s('--bg-streak-length', t.bgStreakLength ? t.bgStreakLength / 100 : 1)
  s('--bg-streak-density', t.bgStreakDensity ? t.bgStreakDensity / 100 : 1)
  
  // Plasma backgrounds
  if (t.bgPlasmaSpeed) s('--bg-plasma-speed', t.bgPlasmaSpeed)
  if (t.bgPlasmaBlur) s('--bg-plasma-blur', t.bgPlasmaBlur + 'px')
  if (t.bgPlasmaFlow) s('--bg-plasma-flow', t.bgPlasmaFlow + '%')
  if (t.bgPlasmaC1) s('--bg-plasma-c1', t.bgPlasmaC1)
  if (t.bgPlasmaC2) s('--bg-plasma-c2', t.bgPlasmaC2)
  if (t.bgPlasmaC3) s('--bg-plasma-c3', t.bgPlasmaC3)
  if (t.bgInfernoSpeed) s('--bg-inferno-speed', t.bgInfernoSpeed)
  if (t.bgInfernoIntensity) s('--bg-inferno-intensity', t.bgInfernoIntensity + '%')
  if (t.bgInfernoGlow) s('--bg-inferno-glow', t.bgInfernoGlow + '%')
  if (t.bgInfernoC1) s('--bg-inferno-c1', t.bgInfernoC1)
  if (t.bgInfernoC2) s('--bg-inferno-c2', t.bgInfernoC2)
  if (t.bgInfernoC3) s('--bg-inferno-c3', t.bgInfernoC3)
  if (t.bgMintSpeed) s('--bg-mint-speed', t.bgMintSpeed)
  if (t.bgMintSat) s('--bg-mint-sat', t.bgMintSat + '%')
  if (t.bgMintFlow) s('--bg-mint-flow', t.bgMintFlow + '%')
  if (t.bgMintC1) s('--bg-mint-c1', t.bgMintC1)
  if (t.bgMintC2) s('--bg-mint-c2', t.bgMintC2)
  if (t.bgMintC3) s('--bg-mint-c3', t.bgMintC3)
  if (t.bgDuskSpeed) s('--bg-dusk-speed', t.bgDuskSpeed)
  if (t.bgDuskGlow) s('--bg-dusk-glow', t.bgDuskGlow + '%')
  if (t.bgDuskPurple) s('--bg-dusk-purple', t.bgDuskPurple + '%')
  if (t.bgDuskC1) s('--bg-dusk-c1', t.bgDuskC1)
  if (t.bgDuskC2) s('--bg-dusk-c2', t.bgDuskC2)
  if (t.bgDuskC3) s('--bg-dusk-c3', t.bgDuskC3)
  if (t.bgMonoSpeed) s('--bg-mono-speed', t.bgMonoSpeed)
  if (t.bgMonoContrast) s('--bg-mono-contrast', t.bgMonoContrast + '%')
  if (t.bgMonoBlue) s('--bg-mono-blue', t.bgMonoBlue + '%')
  if (t.bgMonoC1) s('--bg-mono-c1', t.bgMonoC1)
  if (t.bgMonoC2) s('--bg-mono-c2', t.bgMonoC2)
  if (t.bgMonoC3) s('--bg-mono-c3', t.bgMonoC3)
  
  // Other backgrounds
  if (t.bgSilverC1) s('--bg-silver-c1', t.bgSilverC1)
  if (t.bgSilverC2) s('--bg-silver-c2', t.bgSilverC2)
  if (t.bgSilverShimmer) s('--bg-silver-shimmer', t.bgSilverShimmer + '%')
  if (t.bgWallColor) s('--bg-wall-color', t.bgWallColor)
  if (t.bgWallTexture) s('--bg-wall-texture', t.bgWallTexture + '%')
  if (t.bgWallRough) s('--bg-wall-rough', t.bgWallRough + '%')

  // Metal settings - always set so CSS vars are never stale
  s('--bg-metal-c1', t.bgMetalC1 || '#c8ccd8')
  s('--bg-metal-c2', t.bgMetalC2 || '#888da0')
  s('--bg-metal-c3', t.bgMetalC3 || '#e0e4f0')
  s('--bg-metal-shine-opacity', (t.bgMetalShine ?? 40) / 100)
  s('--bg-metal-grain-opacity', (t.bgMetalGrain ?? 80) / 100)
  s('--bg-metal-angle', (t.bgMetalAngle ?? 92) + 'deg')

  // Concrete - always set
  s('--bg-concrete-color', t.bgConcreteColor || '#4a4e52')
  s('--bg-concrete-depth', t.bgConcreteDepth ?? 0.85)
  s('--bg-concrete-scale', t.bgConcreteScale ?? 1)
  s('--bg-carbon-base', t.bgCarbonBase || '#0d0d0d')
  s('--bg-carbon-sheen', t.bgCarbonSheen ?? 1.0)
  s('--bg-carbon-scale', t.bgCarbonScale ?? 1)
  s('--bg-wall-scale', t.bgWallScale ?? 1)

  // Apply concrete texture variant
  if (document.documentElement.className.includes('bg-27-concrete')) {
    document.documentElement.dataset.texture = t.bgConcreteTexture || 'default'
  }
  
  // Fog settings
  if (t.bgFogSpeed) s('--bg-fog-speed', t.bgFogSpeed)
  if (t.bgFogDensity) s('--bg-fog-density', t.bgFogDensity + '%')
  if (t.bgFogBlur) s('--bg-fog-blur', t.bgFogBlur + 'px')
  
  // Scan settings
  if (t.bgScanSpeed) s('--bg-scan-speed', t.bgScanSpeed + 's')
  if (t.bgScanIntensity) s('--bg-scan-intensity', t.bgScanIntensity + '%')
  if (t.bgScanThickness) s('--bg-scan-thickness', t.bgScanThickness + 'px')
  
  s('--notes-gap', (t.sectionGap ?? 0) + 'px')
  s('--notes-radius', (t.notesRadius ?? 4) + 'px')
  s('--news-font-size', (t.newsFontSize ?? 12) + 'px')
  s('--news-padding-h', (t.newsPaddingH ?? 14) + 'px')
  s('--news-padding-v', (t.newsPaddingV ?? 8) + 'px')
  if (t.notesCardBg) s('--notes-card-bg', t.notesCardBg)
  s('--notes-card-bg-opacity', t.notesCardBgOpacity ?? 1)
  if (t.notesSharedBg) s('--notes-shared-bg', t.notesSharedBg)
  if (t.notesTextColor) s('--notes-text-color', t.notesTextColor)
  if (t.notesTextBg) s('--notes-input-bg', t.notesTextBg)
  root.dataset.settingsSide = t.settingsSide || 'right'
  document.body.style.fontFamily = t.font || "'DM Mono', monospace"
  document.body.style.color = t.text || '#e8e8f0'
  if (t.pageScale) document.body.style.zoom = t.pageScale

  // Apply background class to html element (never transformed, always viewport-anchored)
  document.documentElement.className = `bg-${t.bgPreset || 'noise'}`
  if (t.bgPreset === '03-dots') {
    document.documentElement.dataset.pattern = t.bgDotPattern || 'circles'
  } else {
    delete document.documentElement.dataset.pattern
  }
  if (t.bgPreset === '27-concrete') {
    document.documentElement.dataset.texture = t.bgConcreteTexture || 'default'
  } else {
    delete document.documentElement.dataset.texture
  }
}

export default function App() {
  const [session, setSession] = useState(null)
  const sessionRef = useRef(null)
  const searchInputRef = useRef(null)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [workspaces, setWorkspaces] = useState(() => {
    // Load workspaces from cache immediately for instant render
    return CacheManager.load('workspaces') || []
  })
  const [mode, setMode] = useState(() => {
    try {
      return localStorage.getItem('workspaceMode') || 'home'
    } catch {
      return 'home'
    }
  })
  const [activeWs, setActiveWs] = useState(() => {
    try {
      return CacheManager.load('activeWorkspace') || localStorage.getItem('activeWorkspace') || null
    } catch {
      return null
    }
  })
  const activeWsRef = useRef(activeWs)
  useEffect(() => { activeWsRef.current = activeWs }, [activeWs])
  const [sections, setSections] = useState(() => {
    // Load sections from cache immediately
    return CacheManager.load('sections') || []
  })
  const [links, setLinks] = useState(() => {
    // Load links from cache immediately
    return CacheManager.load('links') || []
  })
  const [notes, setNotes] = useState(() => {
    // Load notes from cache immediately
    return CacheManager.load('notes') || []
  })

  const [theme, setThemeState] = useState(() => {
    try { return { ...DEFAULT_THEME, ...(JSON.parse(localStorage.getItem('current_theme')) || {}) } }
    catch { return DEFAULT_THEME }
  })

  const saveThemeRef = useRef(null)
  const contentRef = useRef(null)
  
  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Sync when coming back online
      if (sessionRef.current) {
        handleRefresh()
      }
    }
    const handleOffline = () => setIsOnline(false)
    
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Position gradient on each panel based on viewport position
  // This is needed because background-attachment: fixed doesn't work with body's transform: scale
  useEffect(() => {
    const positionGradients = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const scale = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--page-scale')) || 1
      
      // Set viewport size variables (in unscaled space)
      document.documentElement.style.setProperty('--viewport-width', `${vw / scale}px`)
      document.documentElement.style.setProperty('--viewport-height', `${vh / scale}px`)
      
      // Position each panel's background to align with its viewport position
      const panels = document.querySelectorAll('.section-card, .note-item, .topbar')
      panels.forEach(panel => {
        const rect = panel.getBoundingClientRect()
        // Negative offsets so the gradient acts as if anchored to viewport
        const x = -rect.left / scale
        const y = -rect.top / scale
        panel.style.backgroundPosition = `${x}px ${y}px`
      })
    }
    
    positionGradients()
    window.addEventListener('resize', positionGradients)
    window.addEventListener('scroll', positionGradients, true)
    
    // Re-position when content changes
    const timer = setTimeout(positionGradients, 100)
    const interval = setInterval(positionGradients, 500)  // Catch dynamic changes
    
    return () => {
      window.removeEventListener('resize', positionGradients)
      window.removeEventListener('scroll', positionGradients, true)
      clearTimeout(timer)
      clearInterval(interval)
    }
  }, [sections, notes, theme])

  const persistTheme = (t, immediate = false) => {
    clearTimeout(saveThemeRef.current)
    const doSave = async () => {
      const uid = sessionRef.current?.user?.id
      const wsId = activeWsRef.current  // always current value, not stale closure
      
      console.log('[persistTheme] uid:', uid, 'wsId:', wsId)
      
      if (!uid) {
        console.log('[persistTheme] No user ID, skipping save')
        return
      }
      
      const { wallpaper, ...themeData } = t
      
      // Save theme to current workspace if we have one
      if (wsId) {
        const { error: wsErr } = await supabase
          .from('workspaces')
          .update({ theme: themeData })
          .eq('id', wsId)
        
        if (wsErr) {
          console.error('[workspace theme] save error:', wsErr.message)
        } else {
          console.log('[workspace theme] ✅ saved for workspace', wsId)
        }
      } else {
        console.log('[workspace theme] ⚠️ No activeWs, skipping workspace save')
      }
      
      // Also keep user_settings as global fallback
      const { data: updated, error: upErr } = await supabase
        .from('user_settings')
        .update({ theme: themeData })
        .eq('user_id', uid)
        .select('id')
      if (upErr) { console.error('[settings] update error:', upErr.message); return }
      if (!updated?.length) {
        const { error: insErr } = await supabase
          .from('user_settings')
          .insert({ user_id: uid, theme: themeData })
        if (insErr) console.error('[settings] insert error:', insErr.message)
        else console.log('[settings] created row in Supabase')
      } else {
        console.log('[settings] ✅ updated global user_settings')
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

  const [bgImage, setBgImage] = useState(() => localStorage.getItem('bg_image') || '')
  const [search, setSearch] = useState('')
  const [webSearch, setWebSearch] = useState('')
  const [bmSearch, setBmSearch] = useState('')
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

  const fileRef = useRef(null)
  const backupFileRef = useRef(null)

  useEffect(() => { applyTheme(theme) }, [theme])
  useEffect(() => { sessionRef.current = session }, [session])
  
  // Save active workspace to localStorage and cache
  useEffect(() => {
    if (activeWs) {
      localStorage.setItem('activeWorkspace', activeWs)
      CacheManager.save('activeWorkspace', activeWs)
      console.log('[activeWs] Saved to localStorage and cache:', activeWs)
    }
  }, [activeWs])

  // Save mode to localStorage
  useEffect(() => {
    localStorage.setItem('workspaceMode', mode)
    console.log('[Mode] Saved to localStorage:', mode)
  }, [mode])

  useEffect(() => {
    if (!session) return
    const timer = setTimeout(() => searchInputRef.current?.focus(), 350)
    return () => clearTimeout(timer)
  }, [session])

  useEffect(() => {
    if (!session) return
    const handleKey = (e) => {
      const active = document.activeElement
      if (
        e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey &&
        active?.tagName !== 'INPUT' &&
        active?.tagName !== 'TEXTAREA' &&
        active?.contentEditable !== 'true'
      ) {
        const input = searchInputRef.current
        if (!input) return
        input.focus()
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
        setter.call(input, e.key)
        input.dispatchEvent(new Event('input', { bubbles: true }))
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [session])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, sess) => setSession(sess ?? null))
    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const onVisible = async () => {
      if (document.visibilityState !== 'visible') return
      try {
        const { data } = await supabase.auth.getSession()
        if (data?.session) { setSession(data.session); handleRefresh() }
      } catch (_e) {}
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

  const loadUserSettings = async (force = false) => {
    const uid = sessionRef.current?.user?.id ?? session?.user?.id
    if (!uid) { console.log('[settings] no uid'); return }
    try {
      const { data, error } = await supabase
        .from('user_settings').select('theme').eq('user_id', uid).maybeSingle()
      if (error) { console.error('[settings] load error:', error.message); return }

      const localRaw = localStorage.getItem('current_theme')
      const localTheme = localRaw ? (() => { try { return JSON.parse(localRaw) } catch { return {} } })() : {}
      const remoteTheme = data?.theme ?? {}
      const hasLocal = Object.keys(localTheme).length > 5
      const hasRemote = Object.keys(remoteTheme).length > 5
      console.log('[settings]', force ? 'FORCE' : 'auto', '| local:', hasLocal, '| remote:', hasRemote)

      if (hasRemote) {
        const localTs = localTheme._savedAt || 0
        const remoteTs = remoteTheme._savedAt || 0
        if (force || !hasLocal || remoteTs > localTs) {
          const wall = localTheme.wallpaper ?? null
          const merged = { ...DEFAULT_THEME, ...remoteTheme, ...(wall ? { wallpaper: wall } : {}) }
          setThemeState(merged)
          localStorage.setItem('current_theme', JSON.stringify(merged))
          console.log('[settings] ✅ applied Supabase theme (_savedAt:', remoteTs, ')')
        } else {
          persistTheme(localTheme, true)
          console.log('[settings] local kept, pushed to Supabase (_savedAt:', localTs, ')')
        }
      } else {
        if (hasLocal) {
          persistTheme(localTheme, true)
          console.log('[settings] 🚀 bootstrapping Supabase from local')
        } else {
          console.log('[settings] neither local nor remote has data — using defaults')
        }
      }
    } catch (e) { console.error('[settings] exception:', e.message) }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setSession(null)
    setSettingsOpen(false)
  }

  const ensureWorkspace = async () => {
    // Check cache first
    const cachedWorkspaces = CacheManager.load('workspaces')
    const cachedActiveWs = CacheManager.load('activeWorkspace')
    
    if (cachedWorkspaces && cachedWorkspaces.length > 0) {
      setWorkspaces(cachedWorkspaces)
      setActiveWs(prev => prev ?? cachedActiveWs ?? cachedWorkspaces[0]?.id ?? null)
      
      // Refresh in background if online
      if (isOnline) {
        handleRefresh()
      }
      return
    }
    
    // No cache, must fetch (only works if online)
    if (!isOnline) {
      console.warn('[ensureWorkspace] Offline with no cache')
      return
    }
    
    const { data, error } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
    if (error) { alert(error.message); return }
    
    if (!data?.length) {
      const { data: created, error: err } = await supabase
        .from('workspaces').insert({ user_id: session.user.id, name: 'Home' }).select().single()
      if (err) { alert(err.message); return }
      
      setWorkspaces([created])
      setActiveWs(created.id)
      CacheManager.save('workspaces', [created])
      CacheManager.save('activeWorkspace', created.id)
      return
    }
    
    setWorkspaces(data)
    const wsId = data[0]?.id ?? null
    setActiveWs(prev => prev ?? wsId)
    CacheManager.save('workspaces', data)
    CacheManager.save('activeWorkspace', prev => prev ?? wsId)
  }

  const handleRefresh = async () => {
    if (!sessionRef.current?.user?.id) return
    
    // If offline, just use cache
    if (!isOnline) {
      console.log('[handleRefresh] Offline - using cached data')
      return
    }
    
    try {
      const { data: wsData, error: wsErr } = await supabase.from('workspaces').select('*').order('created_at', { ascending: true })
      if (wsErr) { console.error('Refresh error:', wsErr.message); return }
      
      setWorkspaces(wsData || [])
      CacheManager.save('workspaces', wsData || []) // Cache workspaces
      
      const currentWs = activeWs ?? wsData?.[0]?.id ?? null
      if (!currentWs) return
      
      if (!activeWs) {
        setActiveWs(currentWs)
        CacheManager.save('activeWorkspace', currentWs) // Cache active workspace
      }
      
      const [{ data: secData }, { data: linkData }, { data: noteData }] = await Promise.all([
        supabase.from('sections').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
        supabase.from('links').select('*').eq('workspace_id', currentWs).order('position', { ascending: true }),
        supabase.from('notes').select('*').eq('workspace_id', currentWs).order('created_at', { ascending: false }),
      ])
      
      setSections(secData || [])
      setLinks(linkData || [])
      setNotes(noteData || [])
      
      // Cache all data
      CacheManager.save('sections', secData || [])
      CacheManager.save('links', linkData || [])
      CacheManager.save('notes', noteData || [])
      CacheManager.save(`sections_${currentWs}`, secData || [])
      CacheManager.save(`links_${currentWs}`, linkData || [])
      CacheManager.save(`notes_${currentWs}`, noteData || [])
      
    } catch (err) {
      console.error('Refresh network error:', err.message)
      // On error, fall back to cache
      const cachedSections = CacheManager.load('sections')
      const cachedLinks = CacheManager.load('links')
      const cachedNotes = CacheManager.load('notes')
      if (cachedSections) setSections(cachedSections)
      if (cachedLinks) setLinks(cachedLinks)
      if (cachedNotes) setNotes(cachedNotes)
    }
  }

  useEffect(() => { 
    if (activeWs && session) {
      const loadWorkspaceTheme = async () => {
        const wsIdAtLoad = activeWs  // capture at call time
        const { data } = await supabase
          .from('workspaces')
          .select('theme')
          .eq('id', activeWs)
          .single()
        
        // Discard result if workspace changed while we were fetching
        if (activeWsRef.current !== wsIdAtLoad) return

        if (data?.theme && Object.keys(data.theme).length > 5) {
          const workspaceTheme = { ...DEFAULT_THEME, ...data.theme }
          setThemeState(workspaceTheme)
          localStorage.setItem('current_theme', JSON.stringify(workspaceTheme))
          console.log('[workspace] Applied workspace theme for', activeWs)
        }
      }
      
      loadWorkspaceTheme().then(() => handleRefresh())
    }
  }, [activeWs])

  useEffect(() => {
    const loadFromStorage = () => {
      try {
        const raw = localStorage.getItem('sp_bookmarks')
        if (!raw) return
        const data = JSON.parse(raw)
        if (data.bookmarks?.length) {
          setBookmarks(data.bookmarks)
          setBmFolders(data.folders || [])
          console.log('[bookmarks] loaded', data.bookmarks.length, 'from localStorage')
        }
      } catch (e) { console.error('[bookmarks] load error:', e) }
    }
    loadFromStorage()
    const onMessage = (e) => {
      if (e.data?.type === 'SP_BOOKMARKS_UPDATE' && e.data?.payload) {
        const { bookmarks: bm, folders: fl } = e.data.payload
        setBookmarks(bm || [])
        setBmFolders(fl || [])
        console.log('[bookmarks] postMessage update:', bm?.length)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (!session) return
    try {
      const raw = localStorage.getItem('sp_bookmarks')
      if (!raw) return
      const data = JSON.parse(raw)
      if (data.bookmarks?.length) {
        setBookmarks(data.bookmarks)
        setBmFolders(data.folders || [])
      }
    } catch (e) {}
  }, [session])

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return links
    return links.filter(l => (l.title || '').toLowerCase().includes(q) || (l.url || '').toLowerCase().includes(q))
  }, [links, search])

  const filteredBookmarks = useMemo(() => {
    const q = bmQuery.trim().toLowerCase()
    if (!q || !bookmarks.length) return []
    const hiddenFolders = (() => {
      try { return JSON.parse(localStorage.getItem('sp_bm_hidden') || '[]') } catch { return [] }
    })()
    return bookmarks
      .filter(b => !hiddenFolders.includes(b.folderId))
      .filter(b =>
        (b.title || '').toLowerCase().includes(q) ||
        (b.url || '').toLowerCase().includes(q)
      )
      .slice(0, 15)
  }, [bookmarks, bmQuery])

  const addWorkspace = async (name) => {
    const wsName = typeof name === 'string' ? name : prompt('Workspace name?')
    if (!wsName?.trim()) return
    
    // Ask for visibility
    const visibilityChoice = confirm(
      `Where should "${wsName}" be visible?\n\n` +
      `OK = Home & Work (both locations)\n` +
      `Cancel = Choose specific location`
    )
    
    let visibility = 'both'
    if (!visibilityChoice) {
      const isWork = confirm('Show only at Work?\n\nOK = Work only\nCancel = Home only')
      visibility = isWork ? 'work' : 'home'
    }
    
    const { data, error } = await supabase
      .from('workspaces').insert({ 
        user_id: session.user.id, 
        name: wsName.trim(),
        visibility: visibility 
      }).select().single()
    if (error) return alert(error.message)
    setWorkspaces(prev => [...prev, data])
    setActiveWs(data.id)
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
    setWorkspaces(next)
    setActiveWs(next[0]?.id ?? null)
  }

  const reorderWorkspaces = (newOrder) => {
    setWorkspaces(newOrder)
  }

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

	  const exportTheme = () => {
		const { wallpaper, ...themeExport } = theme
		const exportData = { ...themeExport, exportedAt: new Date().toISOString() }
		const a = document.createElement('a')
		a.href = URL.createObjectURL(new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' }))
		a.download = 'startpage-theme.json'
		a.click()
	  }

	  const [themeFileRef] = useState(() => ({ current: null }))

	  const handleImportTheme = (e) => {
		const file = e.target.files?.[0]
		if (!file) return
		e.target.value = ''
		const reader = new FileReader()
		reader.onload = (ev) => {
		  try {
			const data = JSON.parse(ev.target.result)
			const imported = { ...DEFAULT_THEME, ...data }
			delete imported.exportedAt
			setTheme(imported)
			alert('Theme imported successfully!')
		  } catch (err) {
			alert('Failed to import theme: ' + err.message)
		  }
		}
		reader.readAsText(file)
	  }

	  const resetWorkspaceLinks = async () => {
		if (!confirm('Delete ALL sections and links in this workspace? Notes are kept.')) return
		await supabase.from('links').delete().eq('workspace_id', activeWs)
		await supabase.from('sections').delete().eq('workspace_id', activeWs)
		handleRefresh()
	  }

	  const clearAllNotes = async () => {
		if (!confirm('Delete ALL notes in this workspace? This cannot be undone!')) return
		if (!confirm('Are you absolutely sure? All notes will be permanently deleted.')) return
		
		console.log('[clearAllNotes] Deleting all notes for workspace:', activeWs)
		
		// Delete all notes for this workspace
		const { error } = await supabase
		  .from('notes')
		  .delete()
		  .eq('workspace_id', activeWs)
		
		if (error) {
		  console.error('[clearAllNotes] Error:', error)
		  alert('Error deleting notes: ' + error.message)
		  return
		}
		
		console.log('[clearAllNotes] Success, refreshing...')
		handleRefresh()
		alert('All notes deleted successfully')
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
				if (secErr || !sec) continue
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
	  const bgDataAttrs = theme.bgPreset === '03-dots' ? { 'data-pattern': theme.bgDotPattern || 'circles' } : {}

	  if (loading) return <div className="center-fill">Loading…</div>
	  if (!session) return <Auth />

	  return (
		<>
		  {/* Offline indicator */}
		  {!isOnline && (
			<div style={{
			  position: 'fixed',
			  top: 0,
			  left: 0,
			  right: 0,
			  background: 'rgba(255, 107, 128, 0.95)',
			  color: '#fff',
			  padding: '0.5rem',
			  textAlign: 'center',
			  fontSize: '0.85em',
			  fontWeight: 500,
			  zIndex: 99999,
			  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
			}}>
			  🔴 Offline - viewing cached data
			</div>
		  )}
		  
		  <div className="app" ref={contentRef}>

			{/* Background blur overlay */}
			{(theme.bgBlur ?? 0) > 0 ? (
			  <div style={{
				position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
				backdropFilter: `blur(${theme.bgBlur}px)`,
				WebkitBackdropFilter: `blur(${theme.bgBlur}px)`,
			  }} />
			) : null}

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
			<div className="topbar">

			  {/* Workspace tabs */}
			  <div className="workspace-tabs">
				{workspaces
				  .filter(ws => {
					const visibility = ws.visibility || 'both'
					if (mode === 'home') return true // Home sees everything
					return visibility === 'work' || visibility === 'both'
				  })
				  .map(ws => (
				  <button
					key={ws.id}
					className={`workspace-tab${activeWs === ws.id ? ' active' : ''}`}
					onClick={() => setActiveWs(ws.id)}
				  >
					{ws.name}
				  </button>
				))}
			  </div>

			  <div className="topbar-divider" />

			  {/* Widgets: clock + weather + search */}
			  <div className="topbar-widgets">
				{!(theme.hideClock ?? false) && <ClockWidget />}
				{!(theme.hideClock ?? false) && !(theme.hideWeather ?? false) && <div className="topbar-divider" />}
				{!(theme.hideWeather ?? false) && <WeatherWidget />}
				{!(theme.hideNews ?? false) && <NewsWidget theme={theme} setTheme={setTheme} />}
				{!(theme.hideCalendar ?? false) && <CalendarWidget theme={theme} />}
				{!(theme.hideGmail ?? true) && <GmailWidget theme={theme} />}
				<div className="topbar-divider" />
				<a
				  className="icon-btn topbar-quick-btn"
				  title="New tab"
				  href="about:blank"
				  target="_blank"
				  rel="noreferrer"
				>
				  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
				    <rect x="1" y="1" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none"/>
				    <line x1="6.5" y1="3.5" x2="6.5" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
				    <line x1="3.5" y1="6.5" x2="9.5" y2="6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
				  </svg>
				</a>
				<a
				  className="icon-btn topbar-quick-btn topbar-google-btn"
				  title="Google"
				  href="https://www.google.com.au"
				  target="_blank"
				  rel="noreferrer"
				>
				  <svg width="16" height="16" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
				    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
				    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
				    <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
				    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
				  </svg>
				</a>
				{!(theme.hideSearch ?? false) && <div className="search-compact">
				  <div className="search-mode-bar">
					{[
					  { key: 'web', icon: '🌐', title: 'Web' },
					  { key: 'links', icon: '🔗', title: 'Links' },
					  { key: 'bookmarks', icon: '🔖', title: 'Bookmarks' },
					].map(({ key, icon, title }) => (
					  <button
						key={key}
						type="button"
						className={`search-mode-btn${searchMode === key ? ' active' : ''}`}
						title={title}
						aria-label={title}
						onClick={() => { setSearchMode(key); setSearch(''); setWebSearch(''); setBmQuery('') }}
					  >
						{icon}
					  </button>
					))}
				  </div>
				  <input
					className="input search-compact-input"
					placeholder={searchMode === 'web' ? 'Search the web…' : searchMode === 'links' ? 'Filter links…' : 'Search bookmarks…'}
					ref={searchInputRef}
					value={searchMode === 'web' ? webSearch : searchMode === 'links' ? search : bmQuery}
					onChange={e => {
					  if (searchMode === 'web') setWebSearch(e.target.value)
					  else if (searchMode === 'links') setSearch(e.target.value)
					  else setBmQuery(e.target.value)
					}}
					onKeyDown={e => {
					  if (searchMode === 'web' && e.key === 'Enter' && webSearch.trim()) {
						const url = (theme.searchEngineUrl || 'https://www.google.com/search?q=') + encodeURIComponent(webSearch.trim())
						const a = document.createElement('a')
						a.href = url
						a.target = '_blank'
						a.rel = 'noopener noreferrer'
						document.body.appendChild(a)
						a.click()
						document.body.removeChild(a)
						setWebSearch('')
					  }
					  if (searchMode === 'bookmarks' && e.key === 'Enter' && filteredBookmarks.length) {
						window.open(filteredBookmarks[0].url, '_blank', 'noopener,noreferrer')
						setBmQuery('')
					  }
					  if (e.key === 'Escape') { setSearch(''); setWebSearch(''); setBmQuery('') }
					}}
				  />
				  {(searchMode === 'web' ? webSearch : searchMode === 'links' ? search : bmQuery) && (
					<button className="icon-btn search-btn" title="Clear" onClick={() => { setSearch(''); setWebSearch(''); setBmQuery('') }}>✕</button>
				  )}
				  {searchMode === 'bookmarks' && bmQuery && filteredBookmarks.length > 0 && (
					<div className="bm-dropdown" style={{
					  fontSize: (theme.bmFontSize || 13) + 'px',
					  ...(theme.bmResultBg ? { background: theme.bmResultBg } : {}),
					  ...(theme.bmResultText ? { '--bm-text': theme.bmResultText } : {}),
					}}>
					  {filteredBookmarks.map((b, i) => (
						<a
						  key={b.id || i}
						  className="bm-result"
						  href={b.url}
						  target="_blank"
						  rel="noopener noreferrer"
						  onClick={() => setBmQuery('')}
						>
						  <span className="bm-result-url">{b.url.replace(/^https?:\/\//, '').split('/')[0]}</span>
						  <span className="bm-result-folder">{b.folder}</span>
						  <span className="bm-result-title">{b.title}</span>
						</a>
					  ))}
					</div>
				  )}
				</div>}
			  </div>
			  <div className="topbar-actions">
				<button
				  className="icon-btn topbar-quick-btn"
				  title={allCollapsed ? 'Expand all sections' : 'Collapse all sections'}
				  onClick={toggleAll}
				  style={{ fontSize: '1.3rem', width: '34px', height: '34px' }}
				>
				  {allCollapsed ? '▾' : '▴'}
				</button>
				<button
				  className="icon-btn topbar-quick-btn"
				  title="Settings"
				  onClick={() => setSettingsOpen(true)}
				  style={{ fontSize: '1.3rem', width: '34px', height: '34px' }}
				>⚙</button>
			  </div>
			</div>

			{/* ── MAIN LAYOUT ─────────────────────────────────── */}
			<main className="main-layout" style={{ gridTemplateColumns: !(theme.hideNotes ?? false) ? `1fr var(--notes-width, 240px)` : '1fr' }}>
			  {!(theme.hideCards ?? false) && <div className="main-col">
				<Sections
				  sections={sections}
				  links={searchMode === 'links' ? filteredLinks : links}
				  userId={session.user.id}
				  workspaceId={activeWs}
				  onRefresh={handleRefresh}
				  colCount={theme.sectionsCols ?? 6}
				  triggerCollapseAll={triggerCollapse}
				  triggerExpandAll={triggerExpand}
				  openInNewTab={theme.openInNewTab ?? true}
				  faviconEnabled={theme.faviconEnabled ?? true}
				  onAddSection={async () => {
					const name = window.prompt('Section name:', 'New Section')
					if (name === null) return
					const sectionName = name.trim() || 'New Section'
					const { error } = await supabase
					  .from('sections')
					  .insert({
						user_id: session.user.id,
						workspace_id: activeWs,
						name: sectionName,
						position: sections.length,
						col_index: 0,
						collapsed: false
					  })
					if (error) { console.error('Error creating section:', error.message); return }
					await handleRefresh()
				  }}
				/>
			  </div>}
			  {!(theme.hideNotes ?? false) && <div className="side-col">
				<Notes
				  notes={notes}
				  workspaceId={activeWs}
				  workspace={workspaces.find(w => w.id === activeWs)}
				  userId={session.user.id}
				  onRefresh={handleRefresh}
				  forceOpen={notesTrigger}
				/>
			  </div>}
			</main>

			{/* ── SETTINGS ────────────────────────────────────── */}
			{settingsOpen && (
			  <Settings
				theme={theme}
				setTheme={setTheme}
				onSave={() => { persistTheme(theme, true) }}
				onClose={() => setSettingsOpen(false)}
				onSignOut={handleSignOut}
				bmFolders={bmFolders}
				bookmarkCount={bookmarks.length}
				userEmail={session?.user?.email ?? ''}
				onImageUpload={handleImageUpload}
				onBgImageUpload={handleBgImageUpload}
				onExportBackup={exportFullBackup}
				onExportCSV={exportCSV}
				onExportTheme={exportTheme}
				onImportTheme={handleImportTheme}
				onImportBackup={handleImportBackup}
				onResetWorkspaceLinks={resetWorkspaceLinks}
				onClearAllNotes={clearAllNotes}
				onResetTheme={() => setTheme(DEFAULT_THEME)}
				fileRef={fileRef}
				backupFileRef={backupFileRef}
				themeFileRef={themeFileRef}
				importingBackup={importingBackup}
				workspaces={workspaces}
				activeWs={activeWs}
				mode={mode}
				setMode={setMode}
				onAddWorkspace={addWorkspace}
				onRenameWorkspace={renameWorkspace}
				onDeleteWorkspace={deleteWorkspace}
				onReorderWorkspaces={reorderWorkspaces}
				onSetActiveWs={setActiveWs}
			  />
			)}

		  </div>
		</>
	  )
	}
			
