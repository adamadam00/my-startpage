import { useState, useEffect } from 'react'

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export default function Clock({ format = '12h' }) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const h24 = now.getHours()
  const min = String(now.getMinutes()).padStart(2, '0')
  const sec = String(now.getSeconds()).padStart(2, '0')

  let timeStr
  if (format === '24h') {
    timeStr = `${String(h24).padStart(2, '0')}:${min}`
  } else {
    const h12 = h24 % 12 || 12
    const ampm = h24 < 12 ? 'am' : 'pm'
    timeStr = `${h12}:${min} ${ampm}`
  }

  const dateStr = `${DAYS[now.getDay()]}, ${MONTHS[now.getMonth()]} ${now.getDate()} ${now.getFullYear()}`

  return (
    <div className="clock-wrap">
      <div className="clock-time">{timeStr}</div>
      <div className="clock-date">{dateStr}</div>
    </div>
  )
}