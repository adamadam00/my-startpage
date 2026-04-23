// Vercel serverless function - proxies iCal to bypass CORS
// File location: Startpage/api/ical.js

module.exports = async function handler(req, res) {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'No URL provided' })

  try {
    const response = await fetch(decodeURIComponent(url))
    if (!response.ok) return res.status(response.status).json({ error: 'Fetch failed' })
    const text = await response.text()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'text/calendar')
    res.status(200).send(text)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
