// Vercel serverless function - proxies iCal and Gmail Atom feeds
// File location: Startpage/api/ical.js

module.exports = async function handler(req, res) {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'No URL provided' })

  try {
    const response = await fetch(decodeURIComponent(url), {
      headers: {
        // Pass through cookies for Gmail auth
        'Cookie': req.headers.cookie || '',
        'User-Agent': 'Mozilla/5.0',
      }
    })
    if (!response.ok) return res.status(response.status).json({ error: `Fetch failed: ${response.status}` })
    const text = await response.text()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'text/plain')
    res.status(200).send(text)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
