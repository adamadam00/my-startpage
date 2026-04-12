import { useState, useEffect, useRef } from 'react'

const WX = {
  0: { icon: '☀️', label: 'Clear' },
  1: { icon: '🌤', label: 'Mostly clear' },
  2: { icon: '⛅', label: 'Partly cloudy' },
  3: { icon: '☁️', label: 'Overcast' },
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

export default function Weather() {
  const [wx, setWx] = useState(null)
  const [forecast, setForecast] = useState([])
  const [stale, setStale] = useState(false)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const fetchWx = () => {
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
        setWx(d.current_weather)

        if (d.daily) {
          setForecast(
            d.daily.time.slice(0, 5).map((date, i) => ({
              date,
              code: d.daily.weathercode[i],
              max: Math.round(d.daily.temperature_2m_max[i]),
              min: Math.round(d.daily.temperature_2m_min[i]),
            }))
          )
        }

        setStale(false)
      } catch {
        setStale(true)
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => doFetch(coords.latitude, coords.longitude),
        () => doFetch(-37.8136, 144.9631)
      )
    } else {
      doFetch(-37.8136, 144.9631)
    }
  }

  useEffect(() => {
    fetchWx()
    const t = setInterval(fetchWx, REFRESH_MS)
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
  const descriptor = isNeutralSky && wx.windspeed >= 15 ? wLabel : skyLabel

  const dayLabel = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div ref={ref} className="weather-shell">
      <div
        className="weather-wrap"
        style={{ opacity: stale ? 0.45 : 1, cursor: 'pointer' }}
        title={stale ? 'Weather data may be outdated. Click for 5-day forecast.' : '5-day forecast'}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="weather-icon">{icon}</span>
        <span className="weather-temp">{Math.round(wx.temperature)}°</span>
        <span className="weather-desc">{descriptor}</span>
      </div>

      {open && forecast.length > 0 && (
        <div className="weather-dropdown">
          {forecast.map((day, i) => {
            const wx2 = WX[day.code]
            return (
              <div
                key={day.date}
                className="weather-forecast-row"
                style={{
                  borderBottom:
                    i < forecast.length - 1
                      ? '1px solid color-mix(in srgb, var(--border) 40%, transparent)'
                      : 'none',
                }}
              >
                <span className="weather-forecast-icon">{wx2?.icon ?? '·'}</span>
                <span className="weather-forecast-day">{dayLabel(day.date)}</span>
                <span className="weather-forecast-max">{day.max}°</span>
                <span className="weather-forecast-min">{day.min}°</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}