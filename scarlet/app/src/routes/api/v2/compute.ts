import { createFileRoute } from '@tanstack/react-router'

const MAX_PAYLOAD = 256

function refuse(reason: string, status: number) {
  return Response.json(
    { accepted: false, computed: false, launched: false, reason },
    { status, headers: { 'access-control-allow-origin': '*' } },
  )
}

export const Route = createFileRoute('/api/v2/compute')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'POST, OPTIONS',
          'access-control-allow-headers': 'content-type',
        },
      }),
      POST: async ({ request }) => {
        const type = request.headers.get('content-type') ?? ''
        if (!type.includes('application/json')) return refuse('JSON_CONTENT_TYPE_REQUIRED', 415)
        let parsed: unknown
        try {
          parsed = await request.json()
        } catch {
          return refuse('INVALID_JSON', 400)
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return refuse('PAYLOAD_REQUIRED', 400)
        const row = parsed as { payload?: unknown; flags?: unknown }
        if (typeof row.payload !== 'string' || row.payload.length === 0) return refuse('PAYLOAD_REQUIRED', 400)
        if (row.flags !== 0) return refuse('FLAGS_MUST_BE_ZERO', 400)
        if (new TextEncoder().encode(row.payload).length > MAX_PAYLOAD) return refuse('PAYLOAD_TOO_LARGE', 413)
        return Response.json({
          accepted: true,
          computed: true,
          launched: false,
          live: false,
          till: 'closed',
          jacket: '/api/v2/compute',
          flags: 0,
        }, { headers: { 'access-control-allow-origin': '*' } })
      },
    },
  },
})
