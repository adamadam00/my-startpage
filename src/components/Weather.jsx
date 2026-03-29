import { useState, useEffect } from 'react'

const WX = {
  0:'☀️',1:'🌤',2:'⛅',3:'☁️',45:'🌫',48:'🌫',
  51:'🌦',53:'🌦',55:'🌧',61:'🌧',63:'🌧',65:'🌧',
  71:'🌨',73:'🌨',75:'🌨',80:'🌦',81:'🌧',82:'⛈',95:'⛈',
}

export default function Weather() {
  const [wx, setWx] = useState(null)
  useEffect(() => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try {
        const r = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current_weather=true`
        )
        const d = await r.json()
        setWx(d.current_weather)
      } catch {}
    }, () => {})
  }, [])
  if (!wx) return null
  return (
    <div className="weather-wrap">
      <span className="weather-icon">{WX[wx.weathercode] ?? '🌡'}</span>
      <span className="weather-temp">{Math.round(wx.temperature)}°</span>
    </div>
  )
}