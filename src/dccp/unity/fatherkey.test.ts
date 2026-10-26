import assert from 'node:assert/strict'
import { test } from 'node:test'
import { FATHER_PUBLIC_PEM, newChallenge, samePublic, verifyPublicSignature } from './fatherkey.ts'

test('the attached public half is the one on record, and a private key is refused', async () => {
  assert.equal(samePublic(FATHER_PUBLIC_PEM), true)
  assert.equal(samePublic(FATHER_PUBLIC_PEM.replace(/\n/g, '')), true)
  const refused = await verifyPublicSignature('-----BEGIN PRIVATE KEY-----\nAAAA\n-----END PRIVATE KEY-----', 'x', 'AA==')
  assert.equal(refused.ok, false)
  assert.match(refused.reason, /private key/i)
  const other = await verifyPublicSignature('-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==\n-----END PUBLIC KEY-----', newChallenge(), 'AA==')
  assert.equal(other.ok, false)
  assert.match(other.reason, /not the public half/)
})

test('an Ed25519 signature checks out and still does not pass the seat', async () => {
  const pair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
  const challenge = newChallenge()
  const sig = await crypto.subtle.sign({ name: 'Ed25519' }, pair.privateKey, new TextEncoder().encode(challenge))
  const spki = new Uint8Array(await crypto.subtle.exportKey('spki', pair.publicKey))
  const key = await crypto.subtle.importKey('spki', spki, { name: 'Ed25519' }, false, ['verify'])
  assert.equal(await crypto.subtle.verify({ name: 'Ed25519' }, key, sig, new TextEncoder().encode(challenge)), true)
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  const recorded = await crypto.subtle.importKey('spki', Uint8Array.from(atob(FATHER_PUBLIC_PEM.replace(/-----[^-]+-----/g, '').replace(/\s/g, '')), c => c.charCodeAt(0)), { name: 'Ed25519' }, false, ['verify'])
  assert.equal(recorded.type, 'public')
  const missed = await verifyPublicSignature('', challenge, b64)
  assert.equal(missed.ok, false)
  assert.equal(missed.passedAsFather, false)
})
