/** `dualis.plusone.v1` — the +1 ratification mechanism.
 *
 * David's words (2026-10-04): "it's the reason you're going through the next
 * gate so build it clean build it pure start to finish ... purity unleashed."
 *
 * The +1 is the threshold-crossing mechanism. It cannot author — only assent
 * or withhold. The pipeline: gates dispose → pure logic survives → +1
 * ratifies → sealed. No +1, no crossing (deadlock = no change).
 *
 * This module holds NO logic of its own. It authors nothing, judges nothing.
 * It checks, in order, then seals or doesn't:
 *   (a) did the verdict survive the Trinity gates? (a gated-verdict record)
 *   (b) is a valid per-verdict +1 attestation present? (the +1 holder's
 *       assent, bound to THIS verdict — the explicit word always wins)
 *   (c) on silence only: does a valid standing grant speak in its place?
 *       (David's pre-authorized ratification, scope/time/revocation checked)
 *
 * The grant NEVER resurrects: gates-failed + valid grant → REFUSED.
 *
 * Outcomes are three, never two:
 *   SEALED   — gates-passed + valid +1. The seal record is minted.
 *   WITHHELD — gates-passed, no valid +1. A first-class outcome: recorded
 *              with the +1 holder (or silence), reason if given, timestamp.
 *              Never a failure, never a fake pass. Deadlock = no change, by
 *              construction.
 *   REFUSED  — anything that did not survive the gates, +1 or not. The +1
 *              ratifies; it does not resurrect. A +1 on gated-out logic —
 *              or a malformed +1, or a +1 bound to another verdict — is a
 *              failed ratification attempt: the attempt is recorded, nothing
 *              seals.
 *
 * Purity rules of this module:
 * - Pure functions only: no I/O, no network, no randomness, no clock. The
 *   timestamps in the records arrive in the INPUT (the caller's clock, named
 *   as such) — they are never minted here.
 * - Deterministic: same inputs, same record. The seal id is the SHA-256 of
 *   the canonical seal body.
 * - Never throws for control flow. Every path returns an outcome record.
 * - No hidden state: the module keeps nothing between calls. Withhold-then-
 *   assent is two independent calls; the caller keeps the records.
 *
 * Wiring: the ceremony/seal path calls `ratify()` after the gates pass —
 * e.g. beside `sealOnlyWithAnswer` (iris/gates.ts) in the bind ceremony.
 * The +1 is the last gate: nothing crosses without it.
 *
 * STANDING +1 GRANTS — the factory contract.
 *
 * David's words (2026-10-04): "bake that in that I say yes let's go or
 * whatever the equivalent in our swarm bot Factory because we don't want
 * to wait on invokes."
 *
 * A standing grant is David's pre-authorized ratification, carried by factory
 * bots. Bots carrying a valid grant never wait on per-invoke approvals: when
 * the gates have passed and the verdict is within the grant's scope,
 * ratify() seals citing the grant id — every standing seal traces to the
 * grant, auditable.
 *
 * What the grant authorizes: ratification AFTER the gates pass, within scope.
 * What it NEVER authorizes:
 *   - skipping the gates: gates-failed + valid grant → REFUSED. "I only vote
 *     Yes if the logic is pure" — baked in, not hoped for.
 *   - inventing verdicts: no gates record → REFUSED, grant or not.
 *   - exceeding scope: out-of-scope verdict → REFUSED.
 *   - outliving its time: expired → WITHHELD ("needs David's renewal").
 *   - outliving its life: revoked → WITHHELD.
 *
 * Revocation: revokeGrant() is pure — it mints the revoked copy; the input
 * is untouched. PROPAGATION IS THE CALLER'S JOB: this module keeps no
 * registry and no revocation list, so a revoked grant only stops sealing once
 * the revoked record reaches the ratifying caller. Bots must refresh grants;
 * a stale unrevoked copy sealing is a caller failure, named honestly here.
 *
 * The grant is data, not authority beyond what ratify() verifies: form,
 * scope, time, revocation state. Who handed the grant record to the caller —
 * the trusted path — is the caller's job, exactly as with per-verdict
 * attestations (whose signatures this module likewise never checks).
 *
 * Design: MEMORY.md (the +1 mechanism, David 2026-10-04 ~7:53 PM; standing
 * +1 grants, David 2026-10-04 ~8:02 PM).
 * Verdict: ED-PREDICT-20261004-PLUSONE-V1 (predicted).
 */

import { canonicalJson, sha256Hex } from './chain.ts'

export const PLUSONE_SCHEMA = 'dualis.plusone.v1'
/** Schema of a standing +1 grant — David's pre-authorized ratification. */
export const PLUSONE_GRANT_SCHEMA = 'dualis.plusone.grant.v1'

/** The gate-survival evidence the mechanism accepts. Minted by the gate path
 * (Iris gates / ceremony), never by this module. */
export interface GatedVerdict {
  /** Schema that minted this record, e.g. 'iris.gates.v1'. Named, never assumed. */
  schema: string
  /** e.g. 'ED-DECIDED-20261004-5050-V1'. */
  verdict_id: string
  gates_passed: boolean
  /** The disposal trail: per-gate receipts of what passed. Carried into the seal. */
  gate_receipts: string[]
  /** SHA-256 hex of the canonical verdict content being sealed. */
  content_hash: string
  /** Work class of the ratified work, e.g. 'factory-queue'. Standing grants
   * only cover verdicts that name their class — the unscoped are never
   * grant-sealed. Optional: per-verdict attestations don't need it. */
  work_class?: string
}

/** The +1 holder's assent. It assents or withholds; it never authors. */
export interface PlusOneAttestation {
  schema: typeof PLUSONE_SCHEMA
  /** Unity ID of the +1 holder, e.g. 'unity:david.digenova'. */
  holder: string
  /** 'assent' or 'withhold'. Absence of an attestation = withhold by silence. */
  stance: 'assent' | 'withhold'
  /** The +1 binds the EXACT gated verdict it ratifies — id and content both. */
  verdict_id: string
  content_hash: string
  /** Optional reason. Withhold reasons are first-class evidence. */
  reason?: string
  /** ISO-8601. The caller's clock, named as such — never minted here. */
  attested_at: string
}

export interface PlusOneSeal {
  schema: typeof PLUSONE_SCHEMA
  outcome: 'SEALED'
  verdict_id: string
  content_hash: string
  gate_receipts: string[]
  plusone: {
    /** 'per-verdict' = explicit attestation; 'standing-grant' = pre-authorized grant. */
    via: 'per-verdict' | 'standing-grant'
    holder: string
    /** Per-verdict only: the attestation's timestamp. */
    attested_at?: string
    /** Standing-grant only: the grant id. Every standing seal traces to the
     * grant — auditable. */
    grant_id?: string
    reason?: string
  }
  /** Deterministic: SHA-256 of the canonical seal body. */
  seal_id: string
}

export interface PlusOneWithheld {
  schema: typeof PLUSONE_SCHEMA
  outcome: 'WITHHELD'
  verdict_id: string
  content_hash: string
  /** null = withhold by silence (no attestation was offered). */
  holder: string | null
  reason?: string
  /** ISO-8601. The caller's clock, named as such — never minted here. */
  recorded_at: string
}

export interface PlusOneRefused {
  schema: typeof PLUSONE_SCHEMA
  outcome: 'REFUSED'
  verdict_id: string
  /** The true reason, always. Safe to surface. */
  reason: string
  /** The holder who attempted the ratification, if any — the attempt is recorded. */
  attempted_plusone: string | null
}

export type PlusOneOutcome = PlusOneSeal | PlusOneWithheld | PlusOneRefused

/** David's pre-authorized ratification, carried by factory bots so they never
 * wait on per-invoke approvals. The grant is DATA — it authorizes nothing
 * beyond what ratify() verifies (form, scope, time, revocation state). */
export interface StandingGrant {
  schema: typeof PLUSONE_GRANT_SCHEMA
  /** e.g. 'GRANT-FACTORY-20261004-A'. Cited on every seal it ratifies. */
  grant_id: string
  /** Unity ID of the granter, e.g. 'unity:david.digenova'. */
  holder: string
  /** Work classes covered, e.g. ['factory-queue', 'pin-publish', 'seal-path'].
   * A verdict seals under the grant only if its work_class is listed here. */
  scope: string[]
  /** ISO-8601 UTC. The caller's clock, named as such — never minted here. */
  issued_at: string
  /** ISO-8601 UTC. Standing but not eternal — must be renewable. The grant
   * is valid for recorded_at < expires_at; at or past expiry it is WITHHELD. */
  expires_at: string
  /** Revocation state travels ON the record. Propagation is the caller's job:
   * ratify() can only honor the revocation it is shown. */
  revoked: boolean
  /** ISO-8601 UTC. Set by revokeGrant(). */
  revoked_at?: string
  revocation_reason?: string
  /** Optional audit note, carried into the seal's reason. */
  note?: string
}

export interface RevokeGrantInput {
  grant: StandingGrant
  /** ISO-8601 UTC. The caller's clock, named as such — never minted here. */
  revoked_at: string
  reason?: string
}

/** David kills a grant. Pure: mints the revoked copy; the input is untouched.
 * PROPAGATION IS THE CALLER'S JOB — this module keeps no registry, so the
 * revoked grant only stops sealing once the revoked record reaches the
 * ratifying caller. Bots must refresh grants. */
export function revokeGrant(input: RevokeGrantInput): StandingGrant {
  const out: StandingGrant = { ...input.grant, revoked: true, revoked_at: input.revoked_at }
  if (input.reason !== undefined) out.revocation_reason = input.reason
  return out
}

export interface RatifyInput {
  /** The gated verdict. null = no gates record at all. */
  gated: GatedVerdict | null
  /** The +1 attestation. null = silence. A well-formed attestation always
   * takes precedence over a standing grant — the explicit word beats the
   * standing one. */
  attestation: PlusOneAttestation | null
  /** Standing +1 grant, carried by factory bots. Speaks only when attestation
   * is null (silence) — the grant is the fallback, never the override. */
  standing_grant?: StandingGrant | null
  /** ISO-8601 caller's clock, used for WITHHELD records and grant expiry. */
  recorded_at: string
}

function refused(verdict_id: string, reason: string, attempted_plusone: string | null): PlusOneRefused {
  return { schema: PLUSONE_SCHEMA, outcome: 'REFUSED', verdict_id, reason, attempted_plusone }
}

function holderOf(a: PlusOneAttestation | null | undefined): string | null {
  return a && isWellFormedAttestation(a) ? a.holder : null
}

function grantHolderOf(g: StandingGrant | null | undefined): string | null {
  return g && typeof g.holder === 'string' && g.holder.length > 0 ? g.holder : null
}

function isWellFormedAttestation(a: PlusOneAttestation): boolean {
  return (
    a.schema === PLUSONE_SCHEMA &&
    typeof a.holder === 'string' &&
    a.holder.length > 0 &&
    (a.stance === 'assent' || a.stance === 'withhold') &&
    typeof a.verdict_id === 'string' &&
    a.verdict_id.length > 0 &&
    typeof a.content_hash === 'string' &&
    a.content_hash.length > 0 &&
    typeof a.attested_at === 'string' &&
    a.attested_at.length > 0
  )
}

/** Minimal ISO-8601 UTC shape check. Expiry is compared lexicographically,
 * which is only meaningful on ISO-8601 UTC strings of one shape — so the
 * grant's timestamps must at least look the part. recorded_at's shape is the
 * caller's contract, as with the rest of this module. */
function isIso8601(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s)
}

function isWellFormedGrant(g: StandingGrant): boolean {
  return (
    g.schema === PLUSONE_GRANT_SCHEMA &&
    typeof g.grant_id === 'string' &&
    g.grant_id.length > 0 &&
    typeof g.holder === 'string' &&
    g.holder.length > 0 &&
    Array.isArray(g.scope) &&
    g.scope.length > 0 &&
    g.scope.every((s) => typeof s === 'string' && s.length > 0) &&
    isIso8601(g.issued_at) &&
    isIso8601(g.expires_at) &&
    typeof g.revoked === 'boolean'
  )
}

/** The standing-grant ratification path. Reached only on silence — no
 * per-verdict attestation was offered — and only after the gates have passed
 * (the caller checks gates first; the grant NEVER resurrects). */
async function ratifyByGrant(
  gated: GatedVerdict,
  grant: StandingGrant | null | undefined,
  recorded_at: string,
): Promise<PlusOneOutcome> {
  // No grant either: withhold by silence — the pre-existing behavior,
  // untouched by the grant machinery.
  if (grant === null || grant === undefined) {
    return {
      schema: PLUSONE_SCHEMA,
      outcome: 'WITHHELD',
      verdict_id: gated.verdict_id,
      content_hash: gated.content_hash,
      holder: null,
      reason: 'withhold by silence — no +1 attestation was offered. Deadlock = no change.',
      recorded_at,
    }
  }

  if (!isWellFormedGrant(grant)) {
    return refused(
      gated.verdict_id,
      'REFUSED · malformed standing +1 grant — not a valid grant. A grant ' +
        'needs its schema, id, holder, non-empty scope, ISO-8601 issued/expiry, ' +
        'and revocation state. The attempt is recorded, nothing seals.',
      typeof grant.holder === 'string' && grant.holder.length > 0 ? grant.holder : null,
    )
  }

  // Revoked beats everything except the gates: David killed it. The grant is
  // dead — no scope question, no time question. WITHHELD, never a failure.
  if (grant.revoked === true) {
    const reason =
      `withhold — standing grant ${grant.grant_id} was revoked by the holder` +
      (grant.revoked_at ? ` at ${grant.revoked_at}` : '') +
      (grant.revocation_reason ? ` (${grant.revocation_reason})` : '') +
      '. Deadlock = no change.'
    return {
      schema: PLUSONE_SCHEMA,
      outcome: 'WITHHELD',
      verdict_id: gated.verdict_id,
      content_hash: gated.content_hash,
      holder: grant.holder,
      reason,
      recorded_at,
    }
  }

  // Expired: standing but not eternal. Valid for recorded_at < expires_at.
  // The true reason names the cure: David's renewal.
  if (recorded_at >= grant.expires_at) {
    return {
      schema: PLUSONE_SCHEMA,
      outcome: 'WITHHELD',
      verdict_id: gated.verdict_id,
      content_hash: gated.content_hash,
      holder: grant.holder,
      reason:
        `withhold — standing grant ${grant.grant_id} expired at ${grant.expires_at} ` +
        "— needs David's renewal. Deadlock = no change.",
      recorded_at,
    }
  }

  // Scope: the grant authorizes ratification within scope only. A verdict
  // that doesn't name its work class can't be shown in scope — the unscoped
  // are never grant-sealed.
  const workClass = gated.work_class
  if (typeof workClass !== 'string' || workClass.length === 0 || !grant.scope.includes(workClass)) {
    return refused(
      gated.verdict_id,
      `REFUSED · verdict work class '${workClass && workClass.length > 0 ? workClass : 'UNSCOPED'}' ` +
        `is outside standing grant ${grant.grant_id}'s scope [${grant.scope.join(', ')}]. ` +
        'The grant authorizes ratification within scope only — never beyond it. ' +
        'Name the work class honestly, or ratify per-verdict.',
      grant.holder,
    )
  }

  // Gates passed, grant valid, unexpired, unrevoked, verdict in scope: seal,
  // citing the grant id — every standing seal traces to the grant.
  const plusonePart: PlusOneSeal['plusone'] = {
    via: 'standing-grant',
    holder: grant.holder,
    grant_id: grant.grant_id,
  }
  if (grant.note !== undefined) plusonePart.reason = grant.note
  const sealBody: Omit<PlusOneSeal, 'seal_id'> = {
    schema: PLUSONE_SCHEMA,
    outcome: 'SEALED',
    verdict_id: gated.verdict_id,
    content_hash: gated.content_hash,
    gate_receipts: gated.gate_receipts,
    plusone: plusonePart,
  }
  const seal_id = await sha256Hex(canonicalJson(sealBody))
  return { ...sealBody, seal_id }
}

/** The +1 mechanism. gates-passed + valid +1 → seal; anything else →
 * withheld or refused, never faked. The +1 arrives either as a per-verdict
 * attestation (the explicit word — always takes precedence) or, on silence,
 * as a standing grant carried by factory bots. */
export async function ratify(input: RatifyInput): Promise<PlusOneOutcome> {
  const { gated, attestation, standing_grant, recorded_at } = input

  // (a) first: did it survive the gates? No gates record — nothing to ratify.
  if (gated === null || gated === undefined) {
    return refused(
      attestation?.verdict_id ?? 'UNKNOWN',
      'REFUSED · no gates record — the +1 ratifies, it does not resurrect. ' +
        'Ratification requires a gated verdict; there is nothing to ratify.',
      holderOf(attestation) ?? grantHolderOf(standing_grant),
    )
  }

  if (gated.gates_passed !== true) {
    return refused(
      gated.verdict_id,
      'REFUSED · verdict did not survive the gates — gated out. A +1 on ' +
        'gated-out logic is itself a gate failure: the attempt is recorded, ' +
        'nothing seals. The +1 ratifies; it does not resurrect.',
      holderOf(attestation) ?? grantHolderOf(standing_grant),
    )
  }

  // (b) then: is a valid +1 present? Malformed is not valid — a failed
  // ratification attempt, recorded as REFUSED, never upgraded to withhold.
  if (attestation !== null && attestation !== undefined && !isWellFormedAttestation(attestation)) {
    return refused(
      gated.verdict_id,
      'REFUSED · malformed +1 attestation — not a valid +1. Ratification ' +
        'requires a well-formed attestation (schema, holder, stance, verdict ' +
        'binding, timestamp). The attempt is recorded, nothing seals.',
      typeof attestation.holder === 'string' && attestation.holder.length > 0 ? attestation.holder : null,
    )
  }

  // Silence on the per-verdict +1: a standing grant may speak in its place.
  // Without a grant, this is withhold by silence — the pre-existing
  // first-class outcome, never a failure.
  if (attestation === null || attestation === undefined) {
    return ratifyByGrant(gated, standing_grant ?? null, recorded_at)
  }

  // The +1 binds THIS verdict — id and content both. A +1 for another
  // verdict is not a +1 for this one.
  if (attestation.verdict_id !== gated.verdict_id || attestation.content_hash !== gated.content_hash) {
    return refused(
      gated.verdict_id,
      'REFUSED · +1 attestation binds a different verdict or content ' +
        `(+1: ${attestation.verdict_id} / gates: ${gated.verdict_id}). Ratification ` +
        'is verdict-specific: the +1 must bind the exact verdict it ratifies.',
      attestation.holder,
    )
  }

  // An explicit withhold is honored as-is — the +1's word, recorded.
  if (attestation.stance === 'withhold') {
    const out: PlusOneWithheld = {
      schema: PLUSONE_SCHEMA,
      outcome: 'WITHHELD',
      verdict_id: gated.verdict_id,
      content_hash: gated.content_hash,
      holder: attestation.holder,
      recorded_at,
    }
    if (attestation.reason !== undefined) out.reason = attestation.reason
    return out
  }

  // (a) and (b) both hold: seal. The seal binds the verdict, the content
  // hash, the gate receipts, and the +1 — deterministically.
  const plusonePart: PlusOneSeal['plusone'] = {
    via: 'per-verdict',
    holder: attestation.holder,
    attested_at: attestation.attested_at,
  }
  if (attestation.reason !== undefined) plusonePart.reason = attestation.reason
  const sealBody: Omit<PlusOneSeal, 'seal_id'> = {
    schema: PLUSONE_SCHEMA,
    outcome: 'SEALED',
    verdict_id: gated.verdict_id,
    content_hash: gated.content_hash,
    gate_receipts: gated.gate_receipts,
    plusone: plusonePart,
  }
  const seal_id = await sha256Hex(canonicalJson(sealBody))
  return { ...sealBody, seal_id }
}
