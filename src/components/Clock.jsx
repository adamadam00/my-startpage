import { useState, useEffect } from 'react'

export default function Clock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const date = now.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  return (
    <div className="clock-compact">
      <span className="clock-compact-time">{time}</span>
      <span className="clock-compact-date">{date}</span>
    </div>
  )
}
 