import { createFileRoute } from '@tanstack/react-router'
import { DEFAULT_MAX_PAYLOAD_BYTES, TRINITY_MODE } from '../../../dccp/pipe/connector'

/** Transport only. No kernel is mounted. A well-formed box is still dropped. */

export const Route = createFileRoute('/api/v2/compute')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (request.headers.get('x-trinity-mode') !== TRINITY_MODE) {
          return Response.json({ accepted: false, reason: 'TRINITY_MODE_REQUIRED' }, { status: 400 })
        }
        const type = request.headers.get('content-type') ?? ''
        if (!type.includes('application/x-www-form-urlencoded')) {
          return Response.json({ accepted: false, reason: 'FORM_CONTENT_TYPE_REQUIRED' }, { status: 415 })
        }
        const text = await request.text()
        const box = new URLSearchParams(text).get('box')
        if (!box) return Response.json({ accepted: false, reason: 'BOX_REQUIRED' }, { status: 400 })
        if (new TextEncoder().encode(box).length > DEFAULT_MAX_PAYLOAD_BYTES) {
          return Response.json({ accepted: false, reason: 'PAYLOAD_TOO_LARGE', maxPayloadBytes: DEFAULT_MAX_PAYLOAD_BYTES }, { status: 413 })
        }
        return Response.json({ accepted: false, reason: 'KERNEL_UNAVAILABLE' }, { status: 503 })
      },
    },
  },
})
