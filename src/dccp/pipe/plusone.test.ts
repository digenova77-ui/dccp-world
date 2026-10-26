/** `dualis.plusone.v1` tests — the +1 mechanism.
 *
 * The full matrix, per the law:
 * - seal on (gates-passed + valid +1 assent)
 * - withhold on (gates-passed, no +1) — silence and explicit alike
 * - refuse on (gates-failed + +1) — the +1 does not resurrect
 * - refuse on (no gates record at all)
 * - refuse on malformed +1, and on a +1 bound to another verdict
 * - determinism: same inputs, same seal — no hidden state
 *
 * Verdict: ED-PREDICT-20261004-PLUSONE-V1 (predicted).
 *
 * Standing +1 grants (the factory contract):
 * - seal on (gates-passed + valid grant, verdict in scope) — grant cited
 * - refuse on (gates-failed + valid grant) — the grant never resurrects
 * - withhold on revoked grant; withhold with true reason on expired grant
 * - refuse on out-of-scope / unscoped verdict
 * - explicit attestation always wins over a grant
 * - revokeGrant is pure: mints the revoked copy, input untouched
 */

import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  PLUSONE_SCHEMA,
  PLUSONE_GRANT_SCHEMA,
  ratify,
  revokeGrant,
  type GatedVerdict,
  type PlusOneAttestation,
  type StandingGrant,
} from './plusone.ts'

const HOLDER = 'unity:david.digenova'
const VERDICT_ID = 'ED-DECIDED-20261004-5050-V1'
const CONTENT_HASH = 'a'.repeat(64)
const AT = '2026-10-04T23:55:00.000Z'

function gated(over: Partial<GatedVerdict> = {}): GatedVerdict {
  return {
    schema: 'iris.gates.v1',
    verdict_id: VERDICT_ID,
    gates_passed: true,
    gate_receipts: ['GATE-SEAL', 'GATE-VERDICT', 'GATE-UNKNOWN'],
    content_hash: CONTENT_HASH,
    ...over,
  }
}

function plusOne(over: Partial<PlusOneAttestation> = {}): PlusOneAttestation {
  return {
    schema: PLUSONE_SCHEMA,
    holder: HOLDER,
    stance: 'assent',
    verdict_id: VERDICT_ID,
    content_hash: CONTENT_HASH,
    attested_at: AT,
    ...over,
  }
}

test('seal: gates-passed + valid +1 assent → SEALED', async () => {
  const out = await ratify({ gated: gated(), attestation: plusOne(), recorded_at: AT })
  assert.equal(out.outcome, 'SEALED')
  assert.equal(out.schema, PLUSONE_SCHEMA)
  if (out.outcome !== 'SEALED') return
  assert.equal(out.verdict_id, VERDICT_ID)
  assert.equal(out.content_hash, CONTENT_HASH)
  assert.deepEqual(out.gate_receipts, ['GATE-SEAL', 'GATE-VERDICT', 'GATE-UNKNOWN'])
  assert.equal(out.plusone.holder, HOLDER)
  assert.equal(out.plusone.attested_at, AT)
  assert.equal(out.seal_id.length, 64)
})

test('seal is deterministic: same inputs, same seal_id, no hidden state', async () => {
  const a = await ratify({ gated: gated(), attestation: plusOne(), recorded_at: AT })
  const b = await ratify({ gated: gated(), attestation: plusOne(), recorded_at: AT })
  assert.deepEqual(a, b)
  if (a.outcome === 'SEALED' && b.outcome === 'SEALED') {
    assert.equal(a.seal_id, b.seal_id)
  } else {
    assert.fail('expected both SEALED')
  }
})

test('seal binds the +1 reason when given', async () => {
  const out = await ratify({
    gated: gated(),
    attestation: plusOne({ reason: 'the logic is pure' }),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'SEALED')
  if (out.outcome !== 'SEALED') return
  assert.equal(out.plusone.reason, 'the logic is pure')
})

test('withhold: gates-passed + silence → WITHHELD, never SEALED', async () => {
  const out = await ratify({ gated: gated(), attestation: null, recorded_at: AT })
  assert.equal(out.outcome, 'WITHHELD')
  if (out.outcome !== 'WITHHELD') return
  assert.equal(out.holder, null)
  assert.match(out.reason ?? '', /silence/)
  assert.equal(out.recorded_at, AT)
  assert.ok(!('seal_id' in out), 'withhold must never mint a seal id')
})

test('withhold: gates-passed + explicit withhold → WITHHELD with holder and reason', async () => {
  const out = await ratify({
    gated: gated(),
    attestation: plusOne({ stance: 'withhold', reason: 'not yet — want the Q8 digits first' }),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'WITHHELD')
  if (out.outcome !== 'WITHHELD') return
  assert.equal(out.holder, HOLDER)
  assert.equal(out.reason, 'not yet — want the Q8 digits first')
  assert.ok(!('seal_id' in out), 'withhold must never mint a seal id')
})

test('withhold-then-assent: two independent calls, no hidden state', async () => {
  const w = await ratify({ gated: gated(), attestation: null, recorded_at: AT })
  assert.equal(w.outcome, 'WITHHELD')
  const s = await ratify({ gated: gated(), attestation: plusOne(), recorded_at: AT })
  assert.equal(s.outcome, 'SEALED')
  // The withhold record is untouched by the later seal — the caller keeps records.
  assert.equal(w.outcome, 'WITHHELD')
})

test('refuse: gates-failed + valid +1 → REFUSED, attempt recorded, nothing seals', async () => {
  const out = await ratify({
    gated: gated({ gates_passed: false }),
    attestation: plusOne(),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.equal(out.attempted_plusone, HOLDER)
  assert.match(out.reason, /does not resurrect/)
  assert.ok(!('seal_id' in out))
})

test('refuse: no gates record at all + +1 → REFUSED', async () => {
  const out = await ratify({ gated: null, attestation: plusOne(), recorded_at: AT })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.equal(out.attempted_plusone, HOLDER)
  assert.match(out.reason, /no gates record/)
})

test('refuse: no gates record and no +1 → REFUSED with UNKNOWN verdict', async () => {
  const out = await ratify({ gated: null, attestation: null, recorded_at: AT })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.equal(out.verdict_id, 'UNKNOWN')
  assert.equal(out.attempted_plusone, null)
})

test('refuse: +1 bound to a different verdict_id → REFUSED', async () => {
  const out = await ratify({
    gated: gated(),
    attestation: plusOne({ verdict_id: 'ED-DECIDED-20261004-OTHER-V1' }),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.equal(out.attempted_plusone, HOLDER)
  assert.match(out.reason, /verdict-specific/)
})

test('refuse: +1 bound to different content_hash → REFUSED', async () => {
  const out = await ratify({
    gated: gated(),
    attestation: plusOne({ content_hash: 'b'.repeat(64) }),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.match(out.reason, /different verdict or content/)
})

test('refuse: malformed +1 attestation → REFUSED, never upgraded to withhold', async () => {
  const bad = plusOne({ holder: '' })
  const out = await ratify({ gated: gated(), attestation: bad, recorded_at: AT })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.match(out.reason, /malformed/)
})

test('refuse: wrong schema on the +1 → REFUSED', async () => {
  const bad = { ...plusOne(), schema: 'dualis.plusone.v0' } as unknown as PlusOneAttestation
  const out = await ratify({ gated: gated(), attestation: bad, recorded_at: AT })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.match(out.reason, /malformed/)
})

test('seal carries no clock of its own: identical inputs across times seal identically', async () => {
  // The attestation timestamp is input, not minted: two attestations at
  // different times are different inputs and seal differently — honestly.
  const early = await ratify({ gated: gated(), attestation: plusOne({ attested_at: AT }), recorded_at: AT })
  const late = await ratify({
    gated: gated(),
    attestation: plusOne({ attested_at: '2026-10-05T00:00:00.000Z' }),
    recorded_at: AT,
  })
  assert.equal(early.outcome, 'SEALED')
  assert.equal(late.outcome, 'SEALED')
  if (early.outcome === 'SEALED' && late.outcome === 'SEALED') {
    assert.notEqual(early.seal_id, late.seal_id, 'different input timestamps are different ratifications')
  }
})

/* ——— standing +1 grants: the factory contract ——— */

const GRANT_ID = 'GRANT-FACTORY-20261004-A'

function grant(over: Partial<StandingGrant> = {}): StandingGrant {
  return {
    schema: PLUSONE_GRANT_SCHEMA,
    grant_id: GRANT_ID,
    holder: HOLDER,
    scope: ['factory-queue', 'pin-publish', 'seal-path'],
    issued_at: '2026-10-04T20:00:00.000Z',
    expires_at: '2026-10-11T20:00:00.000Z',
    revoked: false,
    note: 'factory standing +1 — David 2026-10-04',
    ...over,
  }
}

function gatedInScope(over: Partial<GatedVerdict> = {}): GatedVerdict {
  return gated({ work_class: 'factory-queue', ...over })
}

test('grant seal: gates-passed + valid standing grant → SEALED, grant cited', async () => {
  const out = await ratify({
    gated: gatedInScope(),
    attestation: null,
    standing_grant: grant(),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'SEALED')
  if (out.outcome !== 'SEALED') return
  assert.equal(out.plusone.via, 'standing-grant')
  assert.equal(out.plusone.grant_id, GRANT_ID)
  assert.equal(out.plusone.holder, HOLDER)
  assert.equal(out.plusone.reason, 'factory standing +1 — David 2026-10-04')
  assert.equal(out.seal_id.length, 64)
  assert.ok(!('attested_at' in out.plusone) || out.plusone.attested_at === undefined)
})

test('grant seal is deterministic: same inputs, same seal_id', async () => {
  const a = await ratify({
    gated: gatedInScope(),
    attestation: null,
    standing_grant: grant(),
    recorded_at: AT,
  })
  const b = await ratify({
    gated: gatedInScope(),
    attestation: null,
    standing_grant: grant(),
    recorded_at: AT,
  })
  assert.deepEqual(a, b)
  if (a.outcome === 'SEALED' && b.outcome === 'SEALED') {
    assert.equal(a.seal_id, b.seal_id)
  } else {
    assert.fail('expected both SEALED')
  }
})

test('grant never resurrects: gates-failed + valid grant → REFUSED', async () => {
  const out = await ratify({
    gated: gatedInScope({ gates_passed: false }),
    attestation: null,
    standing_grant: grant(),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.match(out.reason, /does not resurrect/)
  assert.equal(out.attempted_plusone, HOLDER)
  assert.ok(!('seal_id' in out))
})

test('grant: no gates record + grant → REFUSED, grant or not', async () => {
  const out = await ratify({
    gated: null,
    attestation: null,
    standing_grant: grant(),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.match(out.reason, /no gates record/)
})

test('revoked grant → WITHHELD, true reason names the revocation', async () => {
  const dead = revokeGrant({
    grant: grant(),
    revoked_at: '2026-10-05T00:30:00.000Z',
    reason: 'rotating to grant B',
  })
  const out = await ratify({
    gated: gatedInScope(),
    attestation: null,
    standing_grant: dead,
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'WITHHELD')
  if (out.outcome !== 'WITHHELD') return
  assert.equal(out.holder, HOLDER)
  assert.match(out.reason ?? '', /revoked/)
  assert.match(out.reason ?? '', /rotating to grant B/)
  assert.ok(!('seal_id' in out), 'withhold must never mint a seal id')
})

test('revokeGrant is pure: mints the revoked copy, input untouched', async () => {
  const live = grant()
  const dead = revokeGrant({ grant: live, revoked_at: '2026-10-05T00:30:00.000Z' })
  assert.equal(dead.revoked, true)
  assert.equal(dead.revoked_at, '2026-10-05T00:30:00.000Z')
  assert.equal(dead.grant_id, GRANT_ID)
  assert.equal(live.revoked, false, 'the input grant is untouched')
  assert.ok(!('revoked_at' in live), 'the input grant gains no fields')
})

test('revoked beats expired: a dead grant withholds as revoked', async () => {
  const dead = revokeGrant({
    grant: grant({ expires_at: '2026-10-04T20:00:00.000Z' }),
    revoked_at: '2026-10-04T21:00:00.000Z',
  })
  const out = await ratify({
    gated: gatedInScope(),
    attestation: null,
    standing_grant: dead,
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'WITHHELD')
  if (out.outcome !== 'WITHHELD') return
  assert.match(out.reason ?? '', /revoked/)
})

test('expired grant → WITHHELD, true reason names the cure: renewal', async () => {
  const out = await ratify({
    gated: gatedInScope(),
    attestation: null,
    standing_grant: grant({ expires_at: '2026-10-04T20:00:00.000Z' }),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'WITHHELD')
  if (out.outcome !== 'WITHHELD') return
  assert.equal(out.holder, HOLDER)
  assert.match(out.reason ?? '', /expired/)
  assert.match(out.reason ?? '', /renewal/)
  assert.ok(!('seal_id' in out))
})

test('grant at the exact expiry boundary → WITHHELD (valid only while recorded_at < expires_at)', async () => {
  const out = await ratify({
    gated: gatedInScope(),
    attestation: null,
    standing_grant: grant({ expires_at: AT }),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'WITHHELD')
  if (out.outcome !== 'WITHHELD') return
  assert.match(out.reason ?? '', /expired/)
})

test('grant one tick before expiry → SEALED', async () => {
  const out = await ratify({
    gated: gatedInScope(),
    attestation: null,
    standing_grant: grant({ expires_at: '2026-10-04T23:55:00.001Z' }),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'SEALED')
})

test('out-of-scope verdict → REFUSED, scope named', async () => {
  const out = await ratify({
    gated: gated({ work_class: 'treasury' }),
    attestation: null,
    standing_grant: grant(),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.match(out.reason, /outside.*scope/)
  assert.match(out.reason, /treasury/)
  assert.equal(out.attempted_plusone, HOLDER)
  assert.ok(!('seal_id' in out))
})

test('unscoped verdict (no work_class) → REFUSED: grants never cover the unscoped', async () => {
  const out = await ratify({
    gated: gated(),
    attestation: null,
    standing_grant: grant(),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.match(out.reason, /UNSCOPED/)
})

test('malformed grant → REFUSED, never upgraded to withhold', async () => {
  const out = await ratify({
    gated: gatedInScope(),
    attestation: null,
    standing_grant: grant({ grant_id: '' }),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.match(out.reason, /malformed/)
})

test('malformed grant timestamps → REFUSED: expiry must be comparable', async () => {
  const out = await ratify({
    gated: gatedInScope(),
    attestation: null,
    standing_grant: grant({ expires_at: 'someday' }),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.match(out.reason, /malformed/)
})

test('explicit attestation wins over grant: withhold stands', async () => {
  const out = await ratify({
    gated: gatedInScope(),
    attestation: plusOne({ stance: 'withhold', reason: 'holding for David himself' }),
    standing_grant: grant(),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'WITHHELD')
  if (out.outcome !== 'WITHHELD') return
  assert.equal(out.holder, HOLDER)
  assert.equal(out.reason, 'holding for David himself')
})

test('explicit attestation wins over grant: assent seals per-verdict', async () => {
  const out = await ratify({
    gated: gatedInScope(),
    attestation: plusOne(),
    standing_grant: grant(),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'SEALED')
  if (out.outcome !== 'SEALED') return
  assert.equal(out.plusone.via, 'per-verdict')
  assert.equal(out.plusone.attested_at, AT)
  assert.ok(out.plusone.grant_id === undefined)
})

test('malformed attestation is not laundered by a valid grant → REFUSED', async () => {
  const out = await ratify({
    gated: gatedInScope(),
    attestation: plusOne({ holder: '' }),
    standing_grant: grant(),
    recorded_at: AT,
  })
  assert.equal(out.outcome, 'REFUSED')
  if (out.outcome !== 'REFUSED') return
  assert.match(out.reason, /malformed/)
})
