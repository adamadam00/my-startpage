import { useState, useEffect } from 'react'

const WX = {
  0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',
  51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',
  71:'🌨',73:'🌨',75:'🌨',80:'🌦',81:'🌧',82:'⛈',95:'⛈',
}

const REFRESH_MS = 15 * 60 * 1000   // 15 minutes

export default function Weather() {
  const [wx,   setWx]   = useState(null)
  const [stale, setStale] = useState(false)   // dims display if last fetch failed

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
          setStale(true)   // keep showing last reading, just dim it
        }
      },
      () => {}             // user denied geolocation — stay hidden
    )
  }

  useEffect(() => {
    fetchWx()
    const t = setInterval(fetchWx, REFRESH_MS)
    return () => clearInterval(t)
  }, [])

  if (!wx) return null

  return (
    <div className="weather-wrap" style={{ opacity: stale ? 0.45 : 1 }}
      title={stale ? 'Weather data may be outdated' : 'Updates every 15 minutes'}>
      <span className="weather-icon">{WX[wx.weathercode] ?? '🌡'}</span>
      <span className="weather-temp">{Math.round(wx.temperature)}°</span>
    </div>
  )
}