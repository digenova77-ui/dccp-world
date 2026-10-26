import { createHash } from 'node:crypto'
import { createFileRoute } from '@tanstack/react-router'
import { freshBox, fundWallet, sendUnits, viewWallet, type UnityBox } from '../../dccp/meter/unitybox'

const box: UnityBox = freshBox()

function receipt(body: string): string {
  return createHash('sha256').update(body).digest('hex')
}

export const Route = createFileRoute('/api/unity-wallet')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const handle = new URL(request.url).searchParams.get('handle') ?? ''
        const view = viewWallet(box, handle)
        if ('error' in view) return Response.json(view, { status: 400 })
        return Response.json({ handle, ...view })
      },
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as { op?: string; handle?: string; deposit?: number; from?: string; to?: string; amount?: number } | null
        if (!body) return Response.json({ error: 'The wallet did not receive that.' }, { status: 400 })
        if (body.op === 'open') {
          const opened = fundWallet(box, body.handle ?? '', Number(body.deposit ?? 0))
          if (!opened.ok) return Response.json(opened, { status: 400 })
          const view = viewWallet(box, body.handle ?? '')
          return Response.json({ ok: true, handle: body.handle, balance: opened.balance, taken: opened.taken, transfers: 'transfers' in view ? view.transfers : [] })
        }
        if (body.op === 'send') {
          const at = new Date().toISOString()
          const amount = Number(body.amount)
          const line = `${body.from}|${body.to}|${amount}|${at}|${box.seq + 1}`
          const sent = sendUnits(box, body.from ?? '', body.to ?? '', amount, at, receipt(line))
          if (!sent.ok) return Response.json(sent, { status: 400 })
          return Response.json({ ok: true, handle: body.from, balance: sent.balance, transfer: sent.transfer })
        }
        return Response.json({ error: 'That wallet action is not open.' }, { status: 400 })
      },
    },
  },
})
