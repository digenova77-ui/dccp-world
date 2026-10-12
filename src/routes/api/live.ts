import { createFileRoute } from '@tanstack/react-router'
import { feedUrl, weatherFromMet } from '../../dccp/live/proxy'

export const Route = createFileRoute('/api/live')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const q = new URL(request.url).searchParams
        const feed = q.get('feed') ?? ''
        const lat = Number(q.get('lat') ?? '44.18')
        const lon = Number(q.get('lon') ?? '-77.36')
        const target = feedUrl(feed, lat, lon)
        if (!target) return Response.json({ error: 'that feed is not open' }, { status: 404 })
        const ctrl = new AbortController()
        const timer = setTimeout(() => ctrl.abort(), 8_000)
        try {
          const res = await fetch(target.url, { signal: ctrl.signal, headers: target.headers, cache: 'no-store' })
          if (!res.ok) return Response.json({ error: `upstream ${res.status}` }, { status: 502 })
          const json = await res.json()
          if (feed === 'weather') {
            const shaped = weatherFromMet(json)
            if (!shaped) return Response.json({ error: 'no temperature' }, { status: 502 })
            return Response.json(shaped)
          }
          return Response.json(json)
        } catch {
          return Response.json({ error: 'the feed did not answer' }, { status: 502 })
        } finally {
          clearTimeout(timer)
        }
      },
    },
  },
})
