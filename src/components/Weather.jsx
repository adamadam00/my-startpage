import { useState, useEffect, useRef } from 'react'

const WX = {
  0:  { icon: '☀️', label: 'Clear' },
  1:  { icon: '🌤', label: 'Mostly clear' },
  2:  { icon: '⛅', label: 'Partly cloudy' },
  3:  { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫', label: 'Foggy' },
  48: { icon: '🌫', label: 'Icy fog' },
  51: { icon: '🌦', label: 'Light drizzle' },
  53: { icon: '🌦', label: 'Drizzle' },
  55: { icon: '🌧', label: 'Heavy drizzle' },
  61: { icon: '🌧', label: 'Light rain' },
  63: { icon: '🌧', label: 'Raining' },
  65: { icon: '🌧', label: 'Heavy rain' },
  71: { icon: '🌨', label: 'Light snow' },
  73: { icon: '🌨', label: 'Snowing' },
  75: { icon: '🌨', label: 'Heavy snow' },
  80: { icon: '🌦', label: 'Showers' },
  81: { icon: '🌧', label: 'Rain showers' },
  82: { icon: '⛈', label: 'Violent rain' },
  95: { icon: '⛈', label: 'Thunderstorm' },
}

const WIND_LABELS = [
  [1, 'Calm'],
  [5, 'Light breeze'],
  [15, 'Breezy'],
  [30, 'Windy'],
  [50, 'Very windy'],
  [Infinity, 'Gale'],
]

function windLabel(kmh) {
  return WIND_LABELS.find(([max]) => kmh < max)?.[1] ?? 'Gale'
}

const REFRESH_MS = 15 * 60 * 1000
const POS_KEY = 'wx_pos'
const DATA_KEY = 'wx_data'
const DATA_TTL = 10 * 60 * 1000

export default function Weather() {
  const [wx, setWx] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem(DATA_KEY) || 'null')
      if (c && Date.now() - c.ts < DATA_TTL) return c.wx
    } catch {}
    return null
  })
  const [forecast, setForecast] = useState(() => {
    try {
      const c = JSON.parse(localStorage.getItem(DATA_KEY) || 'null')
      if (c && Date.now() - c.ts < DATA_TTL) return c.forecast ?? []
    } catch {}
    return []
  })
  const [stale, setStale] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const doFetch = async (lat, lon) => {
    try {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast` +
        `?latitude=${lat}&longitude=${lon}` +
        `&current_weather=true` +
        `&daily=weathercode,temperature_2m_max,temperature_2m_min` +
        `&timezone=auto`
      )
      const d = await r.json()
      const newWx = d.current_weather
      const newForecast = d.daily
        ? d.daily.time.slice(0, 5).map((date, i) => ({
            date,
            code: d.daily.weathercode[i],
            max: Math.round(d.daily.temperature_2m_max[i]),
            min: Math.round(d.daily.temperature_2m_min[i]),
          }))
        : []
      setWx(newWx)
      setForecast(newForecast)
      setStale(false)
      localStorage.setItem(DATA_KEY, JSON.stringify({ wx: newWx, forecast: newForecast, ts: Date.now() }))
    } catch {
      setStale(true)
    }
  }

  useEffect(() => {
    const cachedPos = localStorage.getItem(POS_KEY)
    if (cachedPos) {
      try {
        const { lat, lon } = JSON.parse(cachedPos)
        const cached = JSON.parse(localStorage.getItem(DATA_KEY) || 'null')
        if (!cached || Date.now() - cached.ts >= DATA_TTL) {
          doFetch(lat, lon)
        }
      } catch {}
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          const lat = coords.latitude
          const lon = coords.longitude
          localStorage.setItem(POS_KEY, JSON.stringify({ lat, lon }))
          doFetch(lat, lon)
        },
        () => { if (!cachedPos) doFetch(-37.8136, 144.9631) },
        { maximumAge: 600000, timeout: 5000 }
      )
    } else if (!cachedPos) {
      doFetch(-37.8136, 144.9631)
    }

    const t = setInterval(() => {
      const pos = localStorage.getItem(POS_KEY)
      if (pos) {
        const { lat, lon } = JSON.parse(pos)
        doFetch(lat, lon)
      }
    }, REFRESH_MS)

    return () => clearInterval(t)
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

  const entry = WX[wx.weathercode]
  const icon = entry?.icon ?? '🌡'
  const skyLabel = entry?.label ?? 'Unknown'
  const wLabel = windLabel(wx.windspeed)
  const isNeutralSky = [0, 1, 2, 3].includes(wx.weathercode)
  const descriptor = (isNeutralSky && wx.windspeed >= 15) ? wLabel : skyLabel

  const dayLabel = (dateStr, i) => {
    if (i === 0) return 'Today'
    const d = new Date(dateStr)
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div ref={ref} style={{ position: 'relative', overflow: 'visible' }}>
      <div
        className="weather-wrap"
        style={{ opacity: stale ? 0.45 : 1, cursor: 'pointer' }}
        title={stale ? 'Weather data may be outdated' : 'Click for 5-day forecast'}
        onClick={() => setOpen(v => !v)}
      >
        <span className="weather-icon">{icon}</span>
        <span className="weather-temp">{Math.round(wx.temperature)}°</span>
        <span className="weather-desc">{descriptor}</span>
      </div>

      {open && forecast.length > 0 && (
        <div className="weather-forecast" onClick={(e) => e.stopPropagation()}>
          {forecast.map((day, i) => {
            const wx2 = WX[day.code]
            return (
              <div key={day.date} className="weather-forecast-day">
                <span className="wf-icon">{wx2?.icon ?? '🌡'}</span>
                <span className="wf-day">{dayLabel(day.date, i)}</span>
                <span className="wf-hi">{day.max}°</span>
                <span className="wf-lo">{day.min}°</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}