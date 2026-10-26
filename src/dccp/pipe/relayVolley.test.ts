/** `dualis.relay.v1` — swarm-volley upgrades: paged exports + outbox backpressure.
 *
 * David's directive: manifest_hash is the one and only idempotency key, end
 * to end — "the same bind is never delivered twice." Paging and backpressure
 * invent no second scheme; they are grounded in manifest_hash throughout.
 *
 * Every test is honest: a page is a complete export; a saturated outbox
 * sheds load, never binds; chunk_id is a publisher hint, never a gate.
 */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  CarryDaemon,
  memoryOutboxStore,
  type NewOutboxEntry,
} from './daemon.ts'
import {
  RELAY_SCHEMA,
  RELAY_EXPORT_PAGE_LIMIT,
  memoryRelayOutboxStore,
  pageRelayExport,
  parseRelayExport,
  toRelayBundle,
  toRelayReceiptBundle,
  type RelayBundle,
} from './relay.ts'
import type { BindEndpoint } from './fatherBind.ts'

const ENDPOINT: BindEndpoint = { protocol: 'http', host: '127.0.0.1', port: '18099', path: '' }

function throwingFetch(): typeof fetch {
  return (async () => {
    throw new Error('connect ECONNREFUSED 127.0.0.1:18099')
  }) as unknown as typeof fetch
}

function walletEntry(hash: string): NewOutboxEntry {
  return {
    manifest_hash: hash,
    kind: 'wallet-bind',
    envelope: JSON.stringify({ kind: 'wallet-bind', v: '2', authority: 'NONE' }),
    endpoint: ENDPOINT,
    unity_id: 'dc.unity.test',
  }
}

function volleyBundle(hash: string, sequence: number): RelayBundle {
  return toRelayBundle(
    {
      schema: 'dualis.daemon.v1',
      manifest_hash: hash,
      kind: 'wallet-bind',
      envelope: 'box-bytes',
      endpoint: { ...ENDPOINT },
      unity_id: 'dc.unity.test',
      state: 'QUEUED',
      attempts: 1,
      next_attempt_at: 0,
      created_at: 0,
      last_error: 'HOLE · UNREACHABLE — the kernel endpoint did not answer.',
      receipt: null,
    },
    '2026-10-04T00:00:00Z',
    sequence,
  )
}

function receiptImportFor(manifestHash: string, receipt?: unknown) {
  return {
    schema: RELAY_SCHEMA,
    exported_at: '2026-10-04T22:00:00.000Z',
    receipts: [
      toRelayReceiptBundle({
        manifest_hash: manifestHash,
        outcome: 'DELIVERED',
        receipt: receipt ?? { accepted: true, box: manifestHash },
        reason: 'kernel accepted the box',
        answered_at: '2026-10-04T22:00:00.000Z',
      }),
    ],
  }
}

/* ---------------- paged exports ---------------- */

test('pages tile the outbox exactly — 1200 bundles, limit 500 → 500/500/200, no gaps, no overlaps', async () => {
  const bundles: RelayBundle[] = []
  for (let i = 0; i < 1200; i++) bundles.push(volleyBundle(`sha256:volley-${i}`, i))
  const seen = new Set<string>()
  let after = -1
  let pages = 0
  for (;;) {
    const { bundles: slice, page } = await pageRelayExport(bundles, after, 500)
    pages += 1
    assert.ok(slice.length <= 500, 'page bound respected')
    for (const b of slice) {
      assert.ok(!seen.has(b.manifest_hash), `no overlap: ${b.manifest_hash} twice`)
      seen.add(b.manifest_hash)
    }
    if (page.next_after_sequence === null) break
    after = page.next_after_sequence
    assert.ok(pages < 10, 'terminates')
  }
  assert.equal(pages, 3)
  assert.equal(seen.size, 1200, 'union of pages = full outbox, exactly once')
})

test('page metadata: chunk_id deterministic, total honest, cursor null on last page', async () => {
  const bundles = [volleyBundle('sha256:a', 0), volleyBundle('sha256:b', 1), volleyBundle('sha256:c', 2)]
  const first = await pageRelayExport(bundles, -1, 2)
  const again = await pageRelayExport(bundles, -1, 2)
  assert.equal(first.page.chunk_id, again.page.chunk_id, 'same input → same chunk_id')
  assert.equal(first.page.total_bundles, 3)
  assert.equal(first.page.next_after_sequence, 1, 'cursor = last sequence of the page')
  assert.equal(first.bundles.length, 2)
  const last = await pageRelayExport(bundles, first.page.next_after_sequence!, 2)
  assert.equal(last.bundles.length, 1)
  assert.equal(last.page.next_after_sequence, null, 'last page: cursor null')
  const other = await pageRelayExport([volleyBundle('sha256:z', 0)], -1, 2)
  assert.notEqual(first.page.chunk_id, other.page.chunk_id, 'different input → different chunk_id')
})

test('a page carrying one manifest twice collapses to one — by manifest_hash, the one key', async () => {
  const bundles = [
    volleyBundle('sha256:dup', 0),
    volleyBundle('sha256:dup', 1), // same bind, re-snapshotted — collapses
    volleyBundle('sha256:other', 2),
  ]
  const { bundles: slice, page } = await pageRelayExport(bundles, -1, 10)
  assert.equal(slice.length, 2, 'duplicate manifest collapses to one bundle')
  assert.equal(page.total_bundles, 2)
  const hashes = slice.map(b => b.manifest_hash).sort()
  assert.deepEqual(hashes, ['sha256:dup', 'sha256:other'])
})

test('daemon exportRelayPage: page round-trips through parseRelayExport, page block validated', async () => {
  const relayStore = memoryRelayOutboxStore()
  const d = new CarryDaemon({ store: memoryOutboxStore(), relayStore, fetchImpl: throwingFetch() })
  for (let i = 0; i < 5; i++) {
    await d.enqueue(walletEntry(`sha256:page-${i}`))
  }
  await d.pump()
  assert.equal((await d.relayList()).length, 5)
  const page1 = await d.exportRelayPage(-1, 2)
  assert.equal(page1.bundles.length, 2)
  assert.ok(page1.page, 'page block present')
  // Round-trip through JSON, as the counterparty would receive it.
  const parsed = parseRelayExport(JSON.parse(JSON.stringify(page1)))
  assert.equal(parsed.ok, true)
  assert.equal(parsed.bundles.length, 2)
  assert.ok(parsed.page, 'page block survives the round trip')
  assert.equal(parsed.page!.chunk_id, page1.page!.chunk_id)
  assert.equal(parsed.page!.total_bundles, 5)
  assert.notEqual(parsed.page!.next_after_sequence, null)
})

test('malformed page block fails closed — valid bundles are not trusted on a broken page', async () => {
  const good = await pageRelayExport([volleyBundle('sha256:ok', 0)], -1, 10)
  const tamperedShape = { schema: RELAY_SCHEMA, exported_at: 'x', exporter: 'dualis.app.v1', bundles: good.bundles, page: { chunk_id: 42, total_bundles: -1, next_after_sequence: 'later' } }
  const bad = parseRelayExport(tamperedShape)
  assert.equal(bad.ok, false)
  assert.match(bad.reasons[0], /page block is malformed/)
})

test('tampered chunk_id does NOT fail the parse — the digest is a hint, never a gate', async () => {
  const good = await pageRelayExport([volleyBundle('sha256:ok', 0)], -1, 10)
  const tampered = {
    schema: RELAY_SCHEMA,
    exported_at: 'x',
    exporter: 'dualis.app.v1',
    bundles: good.bundles,
    page: { ...good.page, chunk_id: 'sha256:lies' },
  }
  const parsed = parseRelayExport(tampered)
  assert.equal(parsed.ok, true, 'bundles are trusted on their own validation, never on the digest')
  assert.equal(parsed.bundles.length, 1)
  assert.equal(parsed.bundles[0].manifest_hash, 'sha256:ok')
})

test('default page limit is the documented bound', () => {
  assert.equal(RELAY_EXPORT_PAGE_LIMIT, 500)
})

/* ---------------- backpressure ---------------- */

test('saturated relay outbox: bind NOT relayed, stays QUEUED, relay-saturated fires, retry queue advances', async () => {
  const relayStore = memoryRelayOutboxStore()
  for (let i = 0; i < 3; i++) await relayStore.put(volleyBundle(`sha256:fill-${i}`, i))
  const events: string[] = []
  let now = 1_000_000
  const d = new CarryDaemon({
    store: memoryOutboxStore(),
    relayStore,
    fetchImpl: throwingFetch(),
    relayOutboxMax: 3,
    onEvent: e => void events.push(e.type),
    now: () => now,
    backoffMs: [10, 10, 10, 10],
  })
  await d.enqueue(walletEntry('sha256:shed-me'))
  await d.pump(now)
  now += 20
  await d.pump(now)
  const [entry] = await d.list()
  assert.equal(entry.state, 'QUEUED', 'bind stays honestly QUEUED in the retry queue')
  assert.notEqual(entry.relayed, true, 'bind is NOT marked relayed')
  assert.equal(entry.attempts, 2, 'retry queue advances independently of the valve')
  assert.ok(events.includes('relay-saturated'), 'saturation signal emitted')
  assert.ok(!events.includes('relayed'), 'no relayed event for the shed bind')
  assert.equal((await relayStore.all()).length, 3, 'outbox held at the bound — no drowning')
})

test('valve releases: after the outbox drains, relaying resumes', async () => {
  const relayStore = memoryRelayOutboxStore()
  for (let i = 0; i < 2; i++) await relayStore.put(volleyBundle(`sha256:fill-${i}`, i))
  let now = 1_000_000
  const d = new CarryDaemon({
    store: memoryOutboxStore(),
    relayStore,
    fetchImpl: throwingFetch(),
    relayOutboxMax: 2,
    now: () => now,
    backoffMs: [10, 10, 10, 10],
  })
  await d.enqueue(walletEntry('sha256:waits'))
  await d.pump(now)
  let [entry] = await d.list()
  assert.notEqual(entry.relayed, true, 'shed while saturated')
  // The export cycle drains the backlog (counterparty ingests, receipts clear).
  await relayStore.delete('sha256:fill-0')
  await relayStore.delete('sha256:fill-1')
  now += 20
  await d.pump(now)
  ;[entry] = await d.list()
  assert.equal(entry.relayed, true, 'relaying resumes once the outbox drains')
  assert.equal((await relayStore.all()).length, 1)
})

/* ---------------- idempotency at volley scale ---------------- */

test('duplicate receipts in one import collapse — first applies, rest ignored, by manifest_hash', async () => {
  const d = new CarryDaemon({ store: memoryOutboxStore(), relayStore: memoryRelayOutboxStore(), fetchImpl: throwingFetch() })
  await d.enqueue(walletEntry('sha256:volley-idem'))
  await d.pump()
  const dupImport = {
    schema: RELAY_SCHEMA,
    exported_at: '2026-10-04T22:00:00.000Z',
    receipts: [
      toRelayReceiptBundle({ manifest_hash: 'sha256:volley-idem', outcome: 'DELIVERED', receipt: { accepted: true }, reason: 'first', answered_at: '2026-10-04T22:00:00.000Z' }),
      toRelayReceiptBundle({ manifest_hash: 'sha256:volley-idem', outcome: 'DELIVERED', receipt: { accepted: true }, reason: 'replay', answered_at: '2026-10-04T22:00:00.000Z' }),
    ],
  }
  const result = await d.ingestRelayReceipts(dupImport)
  assert.equal(result.applied, 1, 'one delivery per manifest_hash, ever')
  assert.equal(result.ignored, 1, 'the duplicate is ignored, not settled twice')
  const [entry] = await d.list()
  assert.equal(entry.state, 'DELIVERED')
})

test('replayed receipt import after delivery is fully ignored — the bind is never delivered twice', async () => {
  const d = new CarryDaemon({ store: memoryOutboxStore(), relayStore: memoryRelayOutboxStore(), fetchImpl: throwingFetch() })
  await d.enqueue(walletEntry('sha256:volley-replay'))
  await d.pump()
  const first = await d.ingestRelayReceipts(receiptImportFor('sha256:volley-replay'))
  assert.equal(first.applied, 1)
  const replay = await d.ingestRelayReceipts(receiptImportFor('sha256:volley-replay'))
  assert.equal(replay.applied, 0, 'nothing applied twice')
  assert.equal(replay.ignored, 1, 'replay ignored honestly')
  const [entry] = await d.list()
  assert.equal(entry.state, 'DELIVERED')
})
