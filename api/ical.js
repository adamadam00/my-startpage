// Vercel serverless function - proxies iCal and Gmail Atom feeds
// File location: Startpage/api/ical.js

const https = require('https')
const http = require('http')

function fetchUrl(urlStr) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Timed out after 25s')), 25000)
    const lib = urlStr.startsWith('https') ? https : http
    const req = lib.get(urlStr, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CalendarBot/1.0)',
        'Accept': 'text/calendar, text/plain, */*',
      }
    }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        clearTimeout(timeout)
        fetchUrl(res.headers.location).then(resolve).catch(reject)
        return
      }
      if (res.statusCode !== 200) {
        clearTimeout(timeout)
        reject(new Error(`Upstream returned HTTP ${res.statusCode}`))
        return
      }
      let data = ''
      res.setEncoding('utf8')
      res.on('data', chunk => data += chunk)
      res.on('end', () => { clearTimeout(timeout); resolve(data) })
    })
    req.on('error', err => { clearTimeout(timeout); reject(err) })
  })
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'No URL provided' })

  const decoded = decodeURIComponent(url)

  try {
    const text = await fetchUrl(decoded)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.status(200).send(text)
  } catch (err) {
    console.error('[ical] error:', err.message, '| url:', decoded.slice(0, 80))
    res.status(500).json({ error: err.message })
  }
}
