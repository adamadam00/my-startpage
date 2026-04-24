// Vercel serverless function - proxies iCal and Gmail Atom feeds
// File location: Startpage/api/ical.js

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'No URL provided' })

  const decoded = decodeURIComponent(url)
  try {
    const response = await fetch(decoded, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'text/calendar, text/plain, */*',
      }
    })
    if (!response.ok) {
      return res.status(502).json({ error: `Upstream returned HTTP ${response.status}` })
    }
    const text = await response.text()
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.status(200).send(text)
  } catch (err) {
    console.error('[ical]', err.message, '|', decoded.slice(0, 80))
    return res.status(500).json({ error: err.message })
  }
}
