// Vercel serverless function - proxies iCal and Gmail Atom feeds
// File location: Startpage/api/ical.js

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'No URL provided' })

  const decoded = decodeURIComponent(url)

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 25000)
    const response = await fetch(decoded, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CalendarBot/1.0)',
        'Accept': 'text/calendar, text/plain, */*',
      }
    })
    clearTimeout(timer)
    if (!response.ok) {
      return res.status(502).json({ error: `Upstream returned HTTP ${response.status}` })
    }
    const text = await response.text()
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.status(200).send(text)
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'Upstream timed out after 25s' : err.message
    console.error('[ical] error:', msg, '| url:', decoded.slice(0, 80))
    res.status(500).json({ error: msg })
  }
}
