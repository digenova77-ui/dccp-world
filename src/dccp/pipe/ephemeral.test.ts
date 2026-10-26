import assert from 'node:assert/strict'
import { test } from 'node:test'
import { sha256Hex } from './chain.ts'
import { canonicalJson, mintManifest, validateDecision, bindingState, resetBindingRegistry, isDesignVerdictId, FIRST_JOB } from './ephemeral.ts'

test.beforeEach(() => {
  resetBindingRegistry()
})

test('a minted bind carries the full schema and its hash covers everything except itself', async () => {
  const manifest = await mintManifest({ unity_id: 'dc.unity.id', input: { task: 'wallet-bind', key_id: 'k1' } })
  assert.equal(manifest.schema, 'dualis.ephemeral.v1')
  assert.equal(manifest.trigger, 'TASK_BIND')
  assert.equal(manifest.unity_id, 'dc.unity.id')
  assert.equal(manifest.target, 'dualiscapax-kernel-node')
  assert.deepEqual(manifest.capability, { scope: ['compute'], expires: 'on_receipt', max_cpu_threads: 32, max_memory_gb: 16 })
  assert.deepEqual(manifest.constraints, { non_destructive: true, fail_closed: true, cleanup_first: true })
  assert.match(manifest.task_id, /^sha256:[0-9a-f]{64}$/)
  assert.match(manifest.input_hash, /^sha256:[0-9a-f]{64}$/)
  assert.match(manifest.manifest_hash, /^sha256:[0-9a-f]{64}$/)
  const { manifest_hash, ...body } = manifest
  const recomputed = 'sha256:' + (await sha256Hex(canonicalJson(body)))
  assert.equal(manifest_hash, recomputed)
  assert.equal(bindingState(manifest_hash), 'LIVE')
})

test('a valid bind allows exactly one decision, then it is consumed', async () => {
  const manifest = await mintManifest({ unity_id: 'dc.unity.id', input: { task: 'wallet-bind' } })
  const first = validateDecision(manifest.manifest_hash, { manifest_ref: manifest.manifest_hash, task: 'wallet-bind-transmit' })
  assert.equal(first.allowed, true)
  assert.equal(bindingState(manifest.manifest_hash), 'CONSUMED')
  const second = validateDecision(manifest.manifest_hash, { manifest_ref: manifest.manifest_hash, task: 'wallet-bind-transmit' })
  assert.equal(second.allowed, false)
  if (!second.allowed) {
    assert.equal(second.reason, 'CONSUMED')
    assert.match(second.detail, /CONSUMED/)
  }
})

test('an unknown hash is rejected with NO_BINDING and names the reason', async () => {
  const unknown = 'sha256:' + '0'.repeat(64)
  const verdict = validateDecision(unknown, { manifest_ref: unknown, task: 'anything' })
  assert.equal(verdict.allowed, false)
  if (!verdict.allowed) {
    assert.equal(verdict.reason, 'NO_BINDING')
    assert.match(verdict.detail, /NO_BINDING/)
  }
})

test('a decision with no binding at all is rejected', async () => {
  const verdict = validateDecision('sha256:' + 'f'.repeat(64), { task: 'orphan-decision' })
  assert.equal(verdict.allowed, false)
  if (!verdict.allowed) {
    assert.equal(verdict.reason, 'NO_BINDING')
    assert.match(verdict.detail, /NO_BINDING/)
  }
})

test('a tampered manifest reference is rejected and does not consume the binding', async () => {
  const manifest = await mintManifest({ unity_id: 'dc.unity.id', input: { task: 'wallet-bind' } })
  const tampered = manifest.manifest_hash.slice(0, -1) + (manifest.manifest_hash.endsWith('0') ? '1' : '0')
  const verdict = validateDecision(manifest.manifest_hash, { manifest_ref: tampered, task: 'wallet-bind-transmit' })
  assert.equal(verdict.allowed, false)
  if (!verdict.allowed) {
    assert.equal(verdict.reason, 'REFERENCE_MISMATCH')
    assert.match(verdict.detail, /REFERENCE_MISMATCH/)
  }
  // The failed decision did not spend the real binding — it stays LIVE.
  assert.equal(bindingState(manifest.manifest_hash), 'LIVE')
  const ok = validateDecision(manifest.manifest_hash, { manifest_ref: manifest.manifest_hash })
  assert.equal(ok.allowed, true)
})

test('a decision missing the manifest reference is rejected as a mismatch', async () => {
  const manifest = await mintManifest({ unity_id: 'dc.unity.id', input: { task: 'wallet-bind' } })
  const verdict = validateDecision(manifest.manifest_hash, { task: 'wallet-bind-transmit' })
  assert.equal(verdict.allowed, false)
  if (!verdict.allowed) assert.equal(verdict.reason, 'REFERENCE_MISMATCH')
})

test('minted bindings are single-use and there is no renewal path', async () => {
  const first = await mintManifest({ unity_id: 'dc.unity.id', input: { task: 'a' } })
  const second = await mintManifest({ unity_id: 'dc.unity.id', input: { task: 'a' } })
  // Same input, same shape — deterministic, identical hash (not two lives of one binding).
  assert.equal(first.manifest_hash, second.manifest_hash)
  assert.equal(validateDecision(first.manifest_hash, { manifest_ref: first.manifest_hash }).allowed, true)
  assert.equal(validateDecision(second.manifest_hash, { manifest_ref: second.manifest_hash }).allowed, false)
})

test('a design verdict ID is recognized by its shape', () => {
  assert.equal(isDesignVerdictId('ED-VERDICT-20260929-CORPHELPERS-HPINC-V1'), true)
  assert.equal(isDesignVerdictId('ED-VERDICT-20261004-FIRSTJOB-V2'), true)
  assert.equal(isDesignVerdictId('not-a-verdict'), false)
  assert.equal(isDesignVerdictId('ED-VERDICT-missing-version'), false)
  assert.equal(isDesignVerdictId(undefined), false)
})

test('an implementation task without a design verdict is refused at mint', async () => {
  await assert.rejects(
    mintManifest({ unity_id: 'dc.unity.id', input: { task: 'build' }, change_kind: 'implementation' }),
    /design verdict/,
  )
})

test('an implementation task with a design verdict binds and validates once', async () => {
  const manifest = await mintManifest({
    unity_id: 'dc.unity.id',
    input: { task: 'first-job', job: FIRST_JOB.name },
    change_kind: 'implementation',
    design_verdict: 'ED-VERDICT-20261004-FIRSTJOB-V1',
  })
  assert.equal(manifest.design_verdict, 'ED-VERDICT-20261004-FIRSTJOB-V1')
  assert.match(manifest.manifest_hash, /^sha256:[0-9a-f]{64}$/)
  // The verdict rides inside the hashed body — it is covered by manifest_hash.
  const { manifest_hash, ...body } = manifest
  const recomputed = 'sha256:' + (await sha256Hex(canonicalJson(body)))
  assert.equal(manifest_hash, recomputed)
  assert.equal(validateDecision(manifest.manifest_hash, { manifest_ref: manifest.manifest_hash }).allowed, true)
})

test('a malformed design verdict is refused at mint', async () => {
  await assert.rejects(
    mintManifest({ unity_id: 'dc.unity.id', input: { task: 'x' }, change_kind: 'implementation', design_verdict: 'ED-VERDICT-nope' }),
    /well-formed/,
  )
})

test('trivial kinds bind without a design verdict', async () => {
  for (const kind of ['docs-only', 'copy-only', 'mechanical-refactor', 'trivial-local'] as const) {
    const manifest = await mintManifest({ unity_id: 'dc.unity.id', input: { task: kind }, change_kind: kind })
    assert.equal(manifest.design_verdict, undefined)
    assert.equal(validateDecision(manifest.manifest_hash, { manifest_ref: manifest.manifest_hash }).allowed, true)
  }
})

test('the canonical first job is schematics → prototype → future, honest PILOT · LOCAL', () => {
  assert.equal(FIRST_JOB.name, 'unity-playground-schematics-to-prototype')
  assert.deepEqual([...FIRST_JOB.stages], ['schematics', 'prototype', 'future'])
  assert.match(FIRST_JOB.input_rule, /REPORTED/)
  assert.equal(FIRST_JOB.label, 'PILOT · LOCAL')
})
