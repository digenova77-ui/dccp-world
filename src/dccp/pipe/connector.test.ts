import assert from 'node:assert/strict'
import { test } from 'node:test'
import { transmitBoxToDCLM, transmitJsonToDCLM } from './connector.ts'

test('the connector stays inert until it is enabled with an endpoint', async () => {
  const closed = await transmitBoxToDCLM('box')
  assert.equal(closed.state, 'DROPPED')
  if (closed.state === 'DROPPED') assert.equal(closed.reason, 'DISABLED')
  const over = await transmitBoxToDCLM('x'.repeat(257), { enabled: true, endpoint: 'https://kernel.example/api/v2' })
  assert.equal(over.state, 'DROPPED')
  if (over.state === 'DROPPED') assert.equal(over.reason, 'OVERSIZE')
})

test('a committed result requires accepted true, and a reject stays dropped', async () => {
  const ok = await transmitBoxToDCLM('dccpworld|module|demo|abc123', {
    enabled: true,
    endpoint: 'https://kernel.example/api/v2',
    fetchImpl: async () => new Response(JSON.stringify({ accepted: true }), { status: 200 }),
  })
  assert.equal(ok.state, 'COMMITTED')
  const no = await transmitBoxToDCLM('dccpworld|module|demo|abc123', {
    enabled: true,
    endpoint: 'https://kernel.example/api/v2',
    fetchImpl: async () => new Response(JSON.stringify({ accepted: false, reason: 'KERNEL_UNAVAILABLE' }), { status: 503 }),
  })
  assert.equal(no.state, 'DROPPED')
})

test('the JSON path posts to {endpoint}{path} with the Trinity header, fail-closed', async () => {
  let seenUrl = ''
  let seenHeaders: Record<string, string> = {}
  const r = await transmitJsonToDCLM('/bind', { protocol: 'dualis.bind.v1' }, {
    enabled: true,
    endpoint: 'https://kernel.example/api/v2/',
    fetchImpl: (async (url: string | URL | Request, init?: RequestInit) => {
      seenUrl = String(url)
      seenHeaders = Object.fromEntries(new Headers(init?.headers as HeadersInit).entries())
      return new Response(JSON.stringify({ accepted: true, receipt: { x: 1 } }), { status: 200 })
    }) as typeof fetch,
  })
  assert.equal(seenUrl, 'https://kernel.example/api/v2/bind')
  assert.equal(seenHeaders['content-type'], 'application/json')
  assert.equal(seenHeaders['x-trinity-mode'], 'Zero-Security-App')
  assert.equal(r.state, 'COMMITTED')
  if (r.state === 'COMMITTED') assert.deepEqual(r.payload, { accepted: true, receipt: { x: 1 } })
})

test('the JSON path drops without endpoint, on network failure, and on kernel rejection', async () => {
  const noEp = await transmitJsonToDCLM('/bind', {}, { enabled: true })
  assert.equal(noEp.state, 'DROPPED')
  if (noEp.state === 'DROPPED') assert.equal(noEp.reason, 'NO_ENDPOINT')
  const net = await transmitJsonToDCLM('/bind', {}, {
    enabled: true,
    endpoint: 'https://kernel.example',
    fetchImpl: (async () => { throw new Error('down') }) as typeof fetch,
  })
  assert.equal(net.state, 'DROPPED')
  if (net.state === 'DROPPED') assert.equal(net.reason, 'NETWORK')
  const rej = await transmitJsonToDCLM('/bind', {}, {
    enabled: true,
    endpoint: 'https://kernel.example',
    fetchImpl: (async () => new Response(JSON.stringify({ accepted: false, reason: 'BAD_SIG' }), { status: 400 })) as typeof fetch,
  })
  assert.equal(rej.state, 'DROPPED')
  if (rej.state === 'DROPPED') {
    assert.equal(rej.reason, 'REJECTED')
    assert.equal(rej.detail, 'BAD_SIG')
  }
})
