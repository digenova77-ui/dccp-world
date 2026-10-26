import assert from 'node:assert/strict'
import { test } from 'node:test'
import { CID_LAW, CURRENT_CID, HISTORICAL_LANDER_CID, ReceiptPipe, canonicalEvent, looksLikePrivateKey, sha256Hex } from './chain.ts'

test('event identity is the hash of the canonical body', async () => {
  const a = await sha256Hex(canonicalEvent('cid-law', CID_LAW))
  const b = await sha256Hex(canonicalEvent('cid-law', CID_LAW))
  assert.equal(a, b)
  assert.equal(a.length, 64)
})

test('members get one law frame; a repeat is suppressed', async () => {
  const pipe = new ReceiptPipe()
  assert.equal(pipe.seat('unity:pilot.abcdef0123456789'), 'member')
  const first = await pipe.ensureLaw()
  const second = await pipe.ensureLaw()
  assert.equal(first.ok && !first.duplicate, true)
  assert.equal(second.ok && second.duplicate, true)
  assert.equal(pipe.frames().length, 1)
  assert.equal(pipe.frames()[0]?.inputDigest, pipe.frames()[0]?.eventId)
  assert.equal(pipe.view().currentCid, CURRENT_CID)
  assert.notEqual(CURRENT_CID, HISTORICAL_LANDER_CID)
})

test('guests see no frames and cannot append', async () => {
  const pipe = new ReceiptPipe()
  assert.equal(pipe.seat(null), 'guest')
  const genesis = await pipe.genesis()
  const refused = await pipe.offer({ sequence: 1, kind: 'cid-law', body: CID_LAW, prevStateDigest: genesis })
  assert.deepEqual(refused, { ok: false, reason: 'not-member' })
  assert.deepEqual(pipe.frames(), [])
  const stream = pipe.readOnlyStream()
  assert.equal(stream.jacketBinding, 'closed')
  assert.equal(stream.publish, 'not-authorized')
  assert.equal('bind' in stream, false)
})

test('gaps and conflicting links are rejected', async () => {
  const pipe = new ReceiptPipe()
  pipe.seat('unity:member.dualiscapax01')
  const genesis = await pipe.genesis()
  const gap = await pipe.offer({ sequence: 2, kind: 'cid-law', body: CID_LAW, prevStateDigest: genesis })
  assert.deepEqual(gap, { ok: false, reason: 'gap' })
  const fork = await pipe.offer({ sequence: 1, kind: 'cid-law', body: CID_LAW, prevStateDigest: '0'.repeat(64) })
  assert.deepEqual(fork, { ok: false, reason: 'conflict' })
  assert.equal(pipe.frames().length, 0)
})

test('jacket binding and private keys are refused', async () => {
  const pipe = new ReceiptPipe()
  assert.equal(looksLikePrivateKey('-----BEGIN PRIVATE KEY-----\nfather.pem'), true)
  assert.equal(pipe.seat('-----BEGIN PRIVATE KEY-----\nfather.pem'), 'private-key')
  pipe.seat('unity:pilot.abcdef0123456789')
  const genesis = await pipe.genesis()
  const jacket = await pipe.offer({ sequence: 1, kind: 'jacket', body: { payload: 'unity:x|act|abc' }, prevStateDigest: genesis })
  assert.deepEqual(jacket, { ok: false, reason: 'jacket-closed' })
  assert.equal(pipe.frames().length, 0)
})
