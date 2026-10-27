// Vercel serverless function: fetches an RSS/Atom feed server-side (no CORS,
// no third-party proxy) and returns normalized JSON items.
// Deployed automatically by Vercel from the /api directory.

function pick(block, tag) {
  const m = block.match(new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'i'))
  return m ? m[1] : ''
}
function clean(s) {
  return (s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&#x27;/gi, "'")
    .replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ')
    .trim()
}
function parseFeed(xml) {
  const items = []
  let blocks = xml.match(/<item[\s\S]*?<\/item>/gi)
  if (!blocks || !blocks.length) blocks = xml.match(/<entry[\s\S]*?<\/entry>/gi)
  if (!blocks) return items
  for (const b of blocks.slice(0, 20)) {
    const title = clean(pick(b, 'title'))
    let link = clean(pick(b, 'link'))
    if (!link) {
      const m = b.match(/<link[^>]*href="([^"]+)"/i)
      if (m) link = m[1]
    }
    const pubDate = clean(pick(b, 'pubDate') || pick(b, 'published') || pick(b, 'updated') || pick(b, 'dc:date'))
    if (title) items.push({ title, link, pubDate })
  }
  return items
}

export default async function handler(req, res) {
  const url = req.query && req.query.url
  if (!url || !/^https?:\/\//i.test(url)) {
    res.status(400).json({ items: [], error: 'missing or invalid url' })
    return
  }
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; StartpageReader/1.0)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    })
    if (!r.ok) {
      res.status(200).json({ items: [], error: 'upstream ' + r.status })
      return
    }
    const text = await r.text()
    const items = parseFeed(text)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600')
    res.status(200).json({ items })
  } catch (e) {
    res.status(200).json({ items: [], error: String(e && e.message || e) })
  }
}
