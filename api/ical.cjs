// Vercel serverless function - proxies iCal and Gmail Atom feeds
// File location: Startpage/api/ical.cjs

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
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      }
    })
    // 304 means Google wants to return cached — just re-fetch without conditional headers
    if (response.status === 304 || !response.ok) {
      const retry = await fetch(decoded, {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible)',
          'Accept': 'text/calendar, text/plain, */*',
        }
      })
      if (!retry.ok) return res.status(502).json({ error: `Upstream returned HTTP ${retry.status}` })
      const text = await retry.text()
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('Cache-Control', 'no-store')
      return res.status(200).send(text)
    }
    const text = await response.text()
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(text)
  } catch (err) {
    console.error('[ical]', err.message, '|', decoded.slice(0, 80))
    return res.status(500).json({ error: err.message })
  }
}
