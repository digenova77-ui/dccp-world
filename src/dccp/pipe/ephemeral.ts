/** `dualis.ephemeral.v1` — the ephemeral capability protocol.
 *
 * Systems of automation, not autonomous bots. Every automated decision requires
 * a LIVE ephemeral TASK_BIND; bindings are single-use, fail-closed,
 * cleanup-first. No standing permissions, no ambient authority, no renewal —
 * a new task needs a new bind.
 *
 * Two standing laws:
 * - The canonical FIRST job: schematics → prototype → future (FIRST_JOB).
 * - Design-verdict-before-implementation: anything beyond trivial carries a
 *   Trinity design verdict ID on its manifest before code is written.
 *
 * Protocol: see EPHEMERAL_PROTOCOL.md.
 */

import { canonicalJson, sha256Hex } from './chain.ts'
import { ARBITRAGE_SCOPE_PREFIX, checkArbitrageTrail } from './arbitrage.ts'

export { canonicalJson }

export const EPHEMERAL_SCHEMA = 'dualis.ephemeral.v1'
export const EPHEMERAL_TRIGGER = 'TASK_BIND'
export const EPHEMERAL_TARGET = 'dualiscapax-kernel-node'
export const EPHEMERAL_EXPIRES = 'on_receipt'

/** The canonical FIRST bound task of the ephemeral capability system.
 * The Unity Playground Infrastructure's task queue seeds its first TASK_BIND
 * as a schematics → prototype → future engineering run: "engineer from real
 * world schematics that exist, to prototype, to future — as quickly as pure
 * logic will allow." Input = real-world schematics that exist (REPORTED
 * sources only — no invented schematics, no modeled hardware presented as
 * real); output = prototype spec → future roadmap, each step receipt-chained
 * into the ledger. It does not have to complete a physical build — it has to
 * establish the pipeline's first real run. Honest label: PILOT · LOCAL. */
export const FIRST_JOB = {
  name: 'unity-playground-schematics-to-prototype',
  stages: ['schematics', 'prototype', 'future'] as const,
  input_rule: 'REPORTED sources only — no invented schematics, no modeled hardware presented as real',
  output: 'prototype spec → future roadmap, each step receipt-chained into the ledger',
  completion_rule: 'need not complete a physical build; must establish the pipeline first real run: schematics in, prototype spec out, future roadmap receipted',
  label: 'PILOT · LOCAL',
} as const

/** Design verdict IDs look like: ED-VERDICT-20260929-CORPHELPERS-HPINC-V1
 * (sealed) or ED-PREDICT-20261004-BOTWORLDHUD-V1 (predicted — our best guess
 * of what the Trinity would have said, never presented as sealed). */
export function isDesignVerdictId(value: unknown): value is string {
  return typeof value === 'string' && /^ED-(VERDICT|PREDICT)-[A-Z0-9][A-Z0-9-]*-V\d+$/i.test(value)
}

/** Trivial kinds need no design verdict. Everything else is implementation
 * and must carry one (design-verdict-before-implementation). */
export const TRIVIAL_KINDS = ['docs-only', 'copy-only', 'mechanical-refactor', 'trivial-local'] as const
export type ChangeKind = (typeof TRIVIAL_KINDS)[number] | 'implementation'

export interface EphemeralCapability {
  scope: string[]
  expires: typeof EPHEMERAL_EXPIRES
  max_cpu_threads: number
  max_memory_gb: number
}

export interface EphemeralConstraints {
  non_destructive: true
  fail_closed: true
  cleanup_first: true
}

export interface TaskBindManifest {
  schema: typeof EPHEMERAL_SCHEMA
  trigger: typeof EPHEMERAL_TRIGGER
  task_id: string
  unity_id: string
  target: string
  capability: EphemeralCapability
  constraints: EphemeralConstraints
  input_hash: string
  /** Optional Trinity verdict (DCLM + Iris + Twain²) on the task's DESIGN, granted
   * before code is written. Required for anything beyond trivial changes;
   * see TRIVIAL_KINDS. Below the Unity ID this is the only law there is. */
  design_verdict?: string
  manifest_hash: string
}

/** Deterministic canonical JSON: sorted keys at every level, no whitespace.
 * Imported from chain.ts — the single canonical-bytes implementation —
 * and re-exported here so existing importers keep working. */

export interface MintParams {
  unity_id: string
  target?: string
  scope?: string[]
  max_cpu_threads?: number
  max_memory_gb?: number
  /** Task payload hashed into input_hash (and, with unity_id, into task_id). */
  input: unknown
  task_label?: string
  /** Trinity verdict (DCLM + Iris + Twain²) on the task's DESIGN. Optional in the
   * schema, but MANDATORY at mint when change_kind is 'implementation' —
   * fail-closed: mint throws without it. */
  design_verdict?: string
  /** Defaults to 'trivial-local'. Only the TRIVIAL_KINDS may bind without a verdict. */
  change_kind?: ChangeKind
}

export type BindingState = 'LIVE' | 'CONSUMED'

interface BindingRecord {
  manifest: TaskBindManifest
  state: BindingState
  mintedAt: number
}

/** In-memory only. It does not survive a reload and cannot be renewed — by design. */
const bindings = new Map<string, BindingRecord>()

/** Mint a TASK_BIND manifest, hash it, and register the binding as LIVE.
 * manifest_hash = sha256(canonical JSON of everything except manifest_hash).
 * The registry key IS the manifest hash; lookup is exact, byte-for-byte.
 * Fail-closed at mint: a design_verdict that is not a well-formed verdict ID
 * throws, and an 'implementation' change_kind without a design_verdict throws. */
export async function mintManifest(params: MintParams): Promise<TaskBindManifest> {
  if (params.design_verdict !== undefined && !isDesignVerdictId(params.design_verdict)) {
    throw new Error(`MINT REJECTED · design_verdict is not a well-formed Trinity verdict ID: ${JSON.stringify(params.design_verdict)}`)
  }
  const kind: ChangeKind = params.change_kind ?? 'trivial-local'
  if (kind === 'implementation' && params.design_verdict === undefined) {
    throw new Error('MINT REJECTED · implementation tasks need a design verdict (DCLM + Iris + Twain²) on the design before code is written — below the Unity ID this is the only law there is.')
  }
  const inputHash = 'sha256:' + (await sha256Hex(canonicalJson(params.input)))
  const taskId =
    'sha256:' +
    (await sha256Hex(
      canonicalJson({ input_hash: inputHash, unity_id: params.unity_id, task_label: params.task_label ?? 'task-bind' }),
    ))
  const body: Omit<TaskBindManifest, 'manifest_hash'> = {
    schema: EPHEMERAL_SCHEMA,
    trigger: EPHEMERAL_TRIGGER,
    task_id: taskId,
    unity_id: params.unity_id,
    target: params.target ?? EPHEMERAL_TARGET,
    capability: {
      scope: params.scope ?? ['compute'],
      expires: EPHEMERAL_EXPIRES,
      max_cpu_threads: params.max_cpu_threads ?? 32,
      max_memory_gb: params.max_memory_gb ?? 16,
    },
    constraints: { non_destructive: true, fail_closed: true, cleanup_first: true },
    input_hash: inputHash,
    ...(params.design_verdict !== undefined ? { design_verdict: params.design_verdict } : {}),
  }
  const manifestHash = 'sha256:' + (await sha256Hex(canonicalJson(body)))
  const manifest: TaskBindManifest = { ...body, manifest_hash: manifestHash }
  bindings.set(manifestHash, { manifest, state: 'LIVE', mintedAt: Date.now() })
  return manifest
}

/** Session hygiene only. A cleared registry means a fresh session — never a renewal. */
export function resetBindingRegistry(): void {
  bindings.clear()
}

export function bindingState(manifestHash: string): BindingState | null {
  return bindings.get(manifestHash)?.state ?? null
}

export interface Decision {
  manifest_ref?: string
  task?: string
  [key: string]: unknown
}

export type EphemeralRejectReason = 'NO_BINDING' | 'CONSUMED' | 'REFERENCE_MISMATCH' | 'INVALID_DESIGN_VERDICT' | 'UNPRICED_DECISION'

export type DecisionVerdict =
  | { allowed: true }
  | { allowed: false; reason: EphemeralRejectReason; detail: string }

/** Fail-closed single-use validator. The first decision carrying a binding's exact
 * manifest hash consumes it; every other case rejects with a named reason.
 * Bindings whose capability scope carries an `arbitrage.*` role additionally
 * require the decision to carry a priced PROPOSE→PRICE→EXECUTE/ABSTAIN trail
 * (see arbitrage.ts) — a decision without a pricing is REJECTED. */
export function validateDecision(manifestHash: string, decision: Decision): DecisionVerdict {
  const record = bindings.get(manifestHash)
  if (!record) {
    return {
      allowed: false,
      reason: 'NO_BINDING',
      detail: `REJECTED · NO_BINDING — no ephemeral binding exists for ${manifestHash}. Every decision needs a live TASK_BIND.`,
    }
  }
  if (record.state !== 'LIVE') {
    return {
      allowed: false,
      reason: 'CONSUMED',
      detail: `REJECTED · CONSUMED — binding ${manifestHash} was already spent. Single use: a new task needs a new bind.`,
    }
  }
  if (record.manifest.design_verdict !== undefined && !isDesignVerdictId(record.manifest.design_verdict)) {
    return {
      allowed: false,
      reason: 'INVALID_DESIGN_VERDICT',
      detail: `REJECTED · INVALID_DESIGN_VERDICT — the manifest's design_verdict is not a well-formed Trinity verdict ID: ${JSON.stringify(record.manifest.design_verdict)}.`,
    }
  }
  const ref = typeof decision === 'object' && decision !== null ? decision.manifest_ref : undefined
  if (ref !== manifestHash) {
    return {
      allowed: false,
      reason: 'REFERENCE_MISMATCH',
      detail: `REJECTED · REFERENCE_MISMATCH — decision references ${JSON.stringify(ref ?? null)}; byte-for-byte match against ${manifestHash} required.`,
    }
  }
  // Self-arbitrage wiring (additive, fail-closed): a binding whose capability
  // scope carries an arbitrage.* role may only decide over a priced trail.
  // Bindings without those roles — wallet binds, father binds — are untouched.
  if (record.manifest.capability.scope.some(role => role.startsWith(ARBITRAGE_SCOPE_PREFIX))) {
    const trail = checkArbitrageTrail(decision)
    if (!trail.ok) {
      return { allowed: false, reason: 'UNPRICED_DECISION', detail: trail.detail }
    }
  }
  record.state = 'CONSUMED'
  return { allowed: true }
}
