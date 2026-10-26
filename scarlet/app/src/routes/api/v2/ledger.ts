import { createFileRoute } from '@tanstack/react-router'

const LEDGER = 'https://dualiscapax.ai/api/v2/ledger'

export const Route = createFileRoute('/api/v2/ledger')({
  server: {
    handlers: {
      GET: async () => {
        const ctl = new AbortController()
        const timer = setTimeout(() => ctl.abort(), 2500)
        try {
          const res = await fetch(LEDGER, { signal: ctl.signal, headers: { accept: 'application/json' } })
          if (!res.ok) {
            return Response.json({ ok: false, code: 'LEDGER_HTTP', status: res.status }, { status: 502, headers: { 'access-control-allow-origin': '*' } })
          }
          const body = await res.json()
          return Response.json(body, { headers: { 'access-control-allow-origin': '*' } })
        } catch {
          return Response.json({ ok: false, code: 'LEDGER_OFFLINE' }, { status: 502, headers: { 'access-control-allow-origin': '*' } })
        } finally {
          clearTimeout(timer)
        }
      },
    },
  },
})
