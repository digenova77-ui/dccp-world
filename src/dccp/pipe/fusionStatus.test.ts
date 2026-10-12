import assert from 'node:assert/strict'
import { test } from 'node:test'
import { fusionSummary, type FusionSnapshot } from './fusionStatus.ts'

function snap(over: Partial<FusionSnapshot> = {}): FusionSnapshot {
  return {
    endpoint: { configured: false, url: 'NO ENDPOINT CONFIGURED', protocol: '', host: '', port: '', path: '', label: 'REPORTED' },
    father: { state: 'UNPINNED', label: 'REPORTED' },
    latest: null,
    counts: { queued: 0, inFlight: 0, delivered: 0, rejected: 0, dead: 0, total: 0 },
    ...over,
  }
}

function latest(state: 'QUEUED' | 'IN_FLIGHT' | 'DELIVERED' | 'REJECTED' | 'DEAD', lastError: string | null = null, receipt: FusionSnapshot['latest'] extends infer L ? L extends { receipt: infer R } ? R : never : never = null, relayed = false) {
  return {
    kind: 'father-bind' as const,
    state,
    manifestHash: 'abc123',
    endpointUrl: 'https://example:8443/api/v2',
    attempts: state === 'DEAD' ? 12 : 1,
    lastError,
    receipt,
    relayed,
    label: 'REPORTED' as const,
  }
}

test('no bind attempted is said plainly — never a fake confirmation', () => {
  const s = fusionSummary(snap())
  assert.equal(s.text, 'NO BIND ATTEMPTED')
  assert.equal(s.tone, 'wait')
  assert.match(s.detail, /REPORTED/)
})

test('QUEUED is carrying, never a receipt', () => {
  const s = fusionSummary(snap({ latest: latest('QUEUED', 'HOLE · UNREACHABLE — the kernel endpoint did not answer.') }))
  assert.match(s.text, /CARRYING/)
  assert.equal(s.tone, 'wait')
  assert.match(s.detail, /not a receipt/)
  assert.match(s.detail, /UNREACHABLE/)
})

test('REJECTED surfaces the true reason string', () => {
  const s = fusionSummary(snap({ latest: latest('REJECTED', 'REJECTED · NO_PINNED_KEY — the queued bind carries no pinned Father public key.') }))
  assert.equal(s.text, 'REJECTED')
  assert.equal(s.tone, 'hole')
  assert.match(s.detail, /NO_PINNED_KEY/)
})

test('DEAD reports attempts honestly', () => {
  const s = fusionSummary(snap({ latest: latest('DEAD', 'DEAD · 12 attempts, no kernel answer.') }))
  assert.match(s.text, /DEAD · 12 attempts/)
  assert.equal(s.tone, 'hole')
})

test('FUSED & BOUND only on DELIVERED with a kernel receipt', () => {
  const s = fusionSummary(
    snap({
      latest: latest('DELIVERED', null, {
        manifestHash: 'abc123',
        boundAt: '2026-10-04T20:00:00.000Z',
        fatherFingerprint: 'sha256:deadbeef',
        kind: 'father-bind',
        label: 'REPORTED',
      }),
    }),
  )
  assert.equal(s.text, 'FUSED & BOUND')
  assert.equal(s.tone, 'see')
  assert.match(s.detail, /2026-10-04T20:00:00\.000Z/)
  assert.match(s.detail, /REPORTED/)
})

test('DELIVERED without bound_at still confirms, but claims no bound_at', () => {
  const s = fusionSummary(
    snap({
      latest: latest('DELIVERED', null, {
        manifestHash: 'abc123',
        boundAt: null,
        fatherFingerprint: null,
        kind: 'wallet-bind',
        label: 'REPORTED',
      }),
    }),
  )
  assert.equal(s.text, 'FUSED & BOUND')
  assert.match(s.detail, /kernel answered/)
})

test('RELAYED is labeled relayed, never delivered', () => {
  const s = fusionSummary(
    snap({ latest: latest('QUEUED', 'HOLE · UNREACHABLE — the kernel endpoint did not answer.', null, true) }),
  )
  assert.match(s.text, /RELAYED/)
  assert.match(s.text, /QUEUED/)
  assert.equal(s.tone, 'wait')
  assert.match(s.detail, /Relayed is not delivered/)
  assert.match(s.detail, /REPORTED/)
})

test('non-relayed QUEUED keeps the carrying label', () => {
  const s = fusionSummary(snap({ latest: latest('QUEUED', 'HOLE · UNREACHABLE — the kernel endpoint did not answer.') }))
  assert.match(s.text, /CARRYING/)
  assert.doesNotMatch(s.text, /RELAYED/)
})
