import { useState, useEffect } from 'react'

const WX = {
  0:  { icon: '☀️', label: 'Clear'        },
  1:  { icon: '🌤', label: 'Mostly clear' },
  2:  { icon: '⛅', label: 'Partly cloudy'},
  3:  { icon: '☁️', label: 'Overcast'     },
  45: { icon: '🌫', label: 'Foggy'        },
  48: { icon: '🌫', label: 'Icy fog'      },
  51: { icon: '🌦', label: 'Light drizzle'},
  53: { icon: '🌦', label: 'Drizzle'      },
  55: { icon: '🌧', label: 'Heavy drizzle'},
  61: { icon: '🌧', label: 'Light rain'   },
  63: { icon: '🌧', label: 'Raining'      },
  65: { icon: '🌧', label: 'Heavy rain'   },
  71: { icon: '🌨', label: 'Light snow'   },
  73: { icon: '🌨', label: 'Snowing'      },
  75: { icon: '🌨', label: 'Heavy snow'   },
  80: { icon: '🌦', label: 'Showers'      },
  81: { icon: '🌧', label: 'Rain showers' },
  82: { icon: '⛈', label: 'Violent rain' },
  95: { icon: '⛈', label: 'Thunderstorm' },
}

const WIND_LABELS = [
  [1,  'Calm'],
  [5,  'Light breeze'],
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
  const [wx,    setWx]    = useState(null)
  const [stale, setStale] = useState(false)

  const fetchWx = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const r = await fetch(
            `https://api.open-meteo.com/v1/forecast` +
            `?latitude=${coords.latitude}&longitude=${coords.longitude}` +
            `&current_weather=true`
          )
          const d = await r.json()
          setWx(d.current_weather)
          setStale(false)
        } catch {
          setStale(true)
        }
      },
      () => {}
    )
  }

  useEffect(() => {
    fetchWx()
    const t = setInterval(fetchWx, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  if (!wx) return null

  const entry       = WX[wx.weathercode]
  const icon        = entry?.icon  ?? '🌡'
  // Prefer the sky condition label, but if it's clear/cloudy and wind
  // is notable, show the wind label instead — feels more useful
  const skyLabel    = entry?.label ?? 'Unknown'
  const wLabel      = windLabel(wx.windspeed)
  const isNeutralSky = [0, 1, 2, 3].includes(wx.weathercode)
  const descriptor  = (isNeutralSky && wx.windspeed >= 15) ? wLabel : skyLabel

  return (
    <div
      className="weather-wrap"
      style={{ opacity: stale ? 0.45 : 1 }}
      title={stale ? 'Weather data may be outdated' : 'Updates every 15 min'}>
      <span className="weather-icon">{icon}</span>
      <span className="weather-temp">{Math.round(wx.temperature)}°</span>
      <span className="weather-desc">{descriptor}</span>
    </div>
  )
}
