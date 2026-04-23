// Vercel serverless function - proxies iCal requests server-side to bypass CORS
// Place this file at: /api/ical.js (in your project root, not in src/)

export default async function handler(req, res) {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'No URL provided' })

  try {
    const response = await fetch(decodeURIComponent(url))
    if (!response.ok) return res.status(response.status).json({ error: 'Fetch failed' })
    const text = await response.text()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Content-Type', 'text/plain')
    res.status(200).send(text)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}
