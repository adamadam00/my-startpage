import { useState, useEffect } from 'react'

export default function Weather({ lat = -37.8136, lon = 144.9631, locationName = 'Melbourne', compact = false }) {
  const [weather, setWeather] = useState(null)
  const [error,   setError]   = useState(false)

  useEffect(() => {
    const fetch_ = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=relativehumidity_2m&timezone=auto`
        )
        const data = await res.json()
        const cw = data.current_weather
        const humidity = data.hourly?.relativehumidity_2m?.[0] ?? null
        setWeather({
          temp:      Math.round(cw.temperature),
          code:      cw.weathercode,
          humidity,
        })
      } catch {
        setError(true)
      }
    }
    fetch_()
  }, [lat, lon])

  const icon = (code) => {
    if (code === 0)               return '☀️'
    if (code <= 2)                return '🌤'
    if (code <= 3)                return '☁️'
    if (code <= 48)               return '🌫'
    if (code <= 67)               return '🌧'
    if (code <= 77)               return '🌨'
    if (code <= 82)               return '🌦'
    if (code <= 99)               return '⛈'
    return '🌡'
  }

  if (error) return (
    <div className="weather-wrap" title="Weather unavailable">
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>weather unavailable</span>
    </div>
  )

  if (!weather) return (
    <div className="weather-wrap">
      <span style={{ color: 'var(--text-muted)', fontSize: '0.8em' }}>loading…</span>
    </div>
  )

  return (
    <div className="weather-wrap" title={`Weather in ${locationName}`}>
      <span>{icon(weather.code)}</span>
      <span className="weather-temp">{weather.temp}°C</span>
      <span>{locationName}</span>
      {weather.humidity !== null && (
        <span title="Humidity">{weather.humidity}% humidity</span>
      )}
    </div>
  )
}