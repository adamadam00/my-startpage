import { useState, useEffect } from 'react'

const WMO = {
  0:  ['Clear', '☀️'],
  1:  ['Mainly clear', '🌤️'],
  2:  ['Partly cloudy', '⛅'],
  3:  ['Overcast', '☁️'],
  45: ['Foggy', '🌫️'],
  48: ['Icy fog', '🌫️'],
  51: ['Light drizzle', '🌦️'],
  53: ['Drizzle', '🌦️'],
  55: ['Heavy drizzle', '🌧️'],
  61: ['Light rain', '🌧️'],
  63: ['Rain', '🌧️'],
  65: ['Heavy rain', '🌧️'],
  71: ['Light snow', '🌨️'],
  73: ['Snow', '❄️'],
  75: ['Heavy snow', '❄️'],
  80: ['Showers', '🌦️'],
  81: ['Rain showers', '🌧️'],
  82: ['Violent showers', '⛈️'],
  95: ['Thunderstorm', '⛈️'],
  99: ['Thunderstorm', '⛈️'],
}

export default function Weather({ lat = -37.8136, lon = 144.9631, locationName = 'Melbourne' }) {
  const [weather, setWeather] = useState(null)
  const [error, setError]   = useState(false)

  useEffect(() => {
    setError(false)
    setWeather(null)
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weathercode,windspeed_10m&temperature_unit=celsius`
    )
      .then(r => r.json())
      .then(d => setWeather(d.current))
      .catch(() => setError(true))
  }, [lat, lon])

  if (error)   return <div className="weather-wrap">weather unavailable</div>
  if (!weather) return <div className="weather-wrap">loading weather…</div>

  const [desc, icon] = WMO[weather.weathercode] ?? ['Unknown', '🌡️']

  return (
    <div className="weather-wrap">
      <span>{icon}</span>
      <span className="weather-temp">{Math.round(weather.temperature_2m)}°C</span>
      <span>{desc}</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>{locationName}</span>
      <span style={{ opacity: 0.5 }}>·</span>
      <span>{Math.round(weather.windspeed_10m)} km/h</span>
    </div>
  )
}