// Vercel serverless function - proxies iCal and Gmail Atom feeds
// File location: Startpage/api/ical.js

const https = require('https')
const http = require('http')
const { URL } = require('url')

function get(urlStr, redirectCount) {
  if ((redirectCount || 0) > 5) return Promise.reject(new Error('Too many redirects'))
  return new Promise((resolve, reject) => {
    let parsed
    try { parsed = new URL(urlStr) } catch (e) { return reject(new Error('Invalid URL')) }
    const lib = parsed.protocol === 'https:' ? https : http
    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible)',
        'Accept': 'text/calendar, text/plain, */*',
      },
      timeout: 25000,
    }
    const req = lib.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const next = res.headers.location.startsWith('http')
          ? res.headers.location
          : parsed.origin + res.headers.location
        res.resume()
        return get(next, (redirectCount || 0) + 1).then(resolve).catch(reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`Upstream returned HTTP ${res.statusCode}`))
      }
      const chunks = []
      res.on('data', chunk => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Timed out after 25s')) })
    req.end()
  })
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'No URL provided' })

  const decoded = decodeURIComponent(url)
  try {
    const text = await get(decoded)
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    return res.status(200).send(text)
  } catch (err) {
    console.error('[ical]', err.message, '|', decoded.slice(0, 80))
    return res.status(500).json({ error: err.message })
  }
}
