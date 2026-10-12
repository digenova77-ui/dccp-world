/** `iris.gates.v1` — Iris's deterministic gates.
 *
 * Seed knowledge made mechanical: `DCLM_ERROR_SCOPE.md` (Appendix A codes,
 * IMP-01…IMP-12, the 8 engineering principles) enforced as code, not
 * convention. Design: IRIS_GATES_DESIGN.md. Verdict:
 * ED-PREDICT-20261004-IRISGATES-V1 (predicted).
 *
 * Rules of this module:
 * - Pure functions only: no I/O, no network, no randomness, no clock.
 * - Gates never throw for control flow. Every gate returns a GateResult;
 *   callers surface rejections (a gate failure is evidence, never an
 *   exception to swallow).
 * - Code strings are verbatim from the error-scope Appendix A. New codes are
 *   added only with first-seen evidence — never invented here.
 */

export const IRIS_GATES_SCHEMA = 'iris.gates.v1'

export type GatePass = { pass: true }
export type GateFail = {
  pass: false
  /** Which gate fired, e.g. 'GATE-SEAL'. */
  gate: string
  /** The error-scope code, e.g. 'IMP-02', 'UNKNOWN_AS_PASS'. */
  code: string
  /** Human-readable, honest reason. Safe to surface. */
  reason: string
}
export type GateResult = GatePass | GateFail

export const GATE_PASS: GatePass = { pass: true }

function fail(gate: string, code: string, reason: string): GateFail {
  return { pass: false, gate, code, reason }
}

export function isGatePass(r: GateResult): r is GatePass {
  return r.pass === true
}

/* ------------------------------------------------------------------ */
/* Appendix A — verbatim error-code table                               */
/* ------------------------------------------------------------------ */

export const ERROR_CODES = {
  transport: ['UNREACHABLE', 'TIMEOUT', 'CORS_BLOCKED', 'MALFORMED', 'NON_JSON', 'NETWORK'],
  kernel: [
    'KERNEL_UNAVAILABLE',
    'NO_ENDPOINT',
    'NO_BINDING',
    'NO_PINNED_KEY',
    'BAD_RESPONSE',
    'REFERENCE_MISMATCH',
    'MINT_REJECTED',
    'NOT_ED',
    'INVALID_DESIGN_VERDICT',
    'UNPRICED_DECISION',
  ],
  crypto: ['PIN_MISMATCH', 'PIN_INVALID', 'BAD_SIGNATURE', 'EXPIRED_KEY', 'UNKNOWN_KEY'],
  daemon: ['QUEUED', 'DUPLICATE_DELIVERY', 'STRANDED_RETRY', 'DEAD', 'QUEUE_CORRUPT'],
  wallet: ['UNBOUND', 'NO_KEY', 'LOCKED'],
  data: ['INVENTED_FIGURE', 'VINTAGE_CONFLICT', 'UNLABELED_MOCK', 'UNKNOWN_AS_PASS'],
  rendering: ['BLEED', 'BROKEN_ASSET', 'DEAD_LINK', 'ORPHANED_ROUTE', 'MIDWORD_WRAP'],
  honest_states: ['HOLE', 'QUEUED', 'UNBOUND', 'DROPPED', 'REJECTED', 'DEAD', 'SEALED', 'SEE'],
  /** No-password law (David, 2026-10-04): passwords do not exist in this
   * system. First-seen evidence: David's direct law. */
  identity: ['PASSWORD_ENTERED'],
} as const

export type ErrorDomain = keyof typeof ERROR_CODES

/** GATE-CODES: the code must exist in the Appendix A table for its domain.
 * Unknown codes are rejected — never silently accepted. */
export function knownCode(domain: ErrorDomain, code: string): GateResult {
  const table: readonly string[] = ERROR_CODES[domain]
  if (table.includes(code)) return GATE_PASS
  return fail(
    'GATE-CODES',
    'UNKNOWN_CODE',
    `GATE-CODES · "${code}" is not a known ${domain} code (Appendix A). ` +
      `Unknown codes are rejected, never silently accepted. Add it with first-seen evidence or use a known code.`,
  )
}

/* ------------------------------------------------------------------ */
/* GATE-SEAL — no SEALED / SEE without a real answer                    */
/* ------------------------------------------------------------------ */

export type SealClaim = 'SEALED' | 'SEE'

export interface SealEvidence {
  /** The other side answered on the wire (a response was received). */
  kernelAnswered: boolean
  /** For SEALED: the countersignature verified against the pinned key. */
  signatureVerified?: boolean
  /** For SEE: the accepted payload itself. */
  acceptedPayload?: unknown
}

/** The only receipt is a real answer. A claim of SEALED/SEE without evidence
 * is IMP-02 (receipt without answer) — rejected, never softened. */
export function sealOnlyWithAnswer(claim: SealClaim, evidence: SealEvidence): GateResult {
  if (!evidence.kernelAnswered) {
    return fail(
      'GATE-SEAL',
      'IMP-02',
      `GATE-SEAL · ${claim} claimed with no kernel answer on the wire — ` +
        `IMP-02 (receipt without answer). A receipt exists only when the other side answers.`,
    )
  }
  if (claim === 'SEALED' && evidence.signatureVerified !== true) {
    return fail(
      'GATE-SEAL',
      'IMP-02',
      'GATE-SEAL · SEALED claimed without a verified countersignature against the pinned key — ' +
        'IMP-02 (receipt without answer). Verify first; seal never.',
    )
  }
  if (claim === 'SEE' && (evidence.acceptedPayload === undefined || evidence.acceptedPayload === null)) {
    return fail(
      'GATE-SEAL',
      'IMP-02',
      'GATE-SEAL · SEE claimed without an accepted payload from the wire — ' +
        'IMP-02 (receipt without answer). Observation requires something observed.',
    )
  }
  return GATE_PASS
}

/* ------------------------------------------------------------------ */
/* GATE-VERDICT — UNKNOWN is never PASS                                 */
/* ------------------------------------------------------------------ */

export type FigureLabel = 'REPORTED' | 'MODELED' | 'UNKNOWN'
export const FIGURE_LABELS: readonly FigureLabel[] = ['REPORTED', 'MODELED', 'UNKNOWN']

export interface VerdictInput {
  name: string
  label: FigureLabel
}
export interface ScoredVerdict {
  inputs: VerdictInput[]
  outcome: 'PASS' | 'FAIL' | 'HOLD'
}

/** UNKNOWN is never PASS — checked on every verdict input, not just the
 * headline. A PASS built on an UNKNOWN input is rejected, code
 * UNKNOWN_AS_PASS (IMP-05). */
export function unknownNeverPass(verdict: ScoredVerdict): GateResult {
  if (verdict.outcome !== 'PASS') return GATE_PASS
  const unknowns = verdict.inputs.filter(i => i.label === 'UNKNOWN')
  if (unknowns.length > 0) {
    return fail(
      'GATE-VERDICT',
      'UNKNOWN_AS_PASS',
      `GATE-VERDICT · PASS scored on UNKNOWN input(s): ${unknowns.map(i => i.name).join(', ')} — ` +
        'IMP-05. UNKNOWN is never PASS. Re-score honestly.',
    )
  }
  return GATE_PASS
}

/* ------------------------------------------------------------------ */
/* GATE-CATCH — every catch surfaces                                    */
/* ------------------------------------------------------------------ */

export interface GuardedOutcome<T> {
  /** true when fn succeeded OR the throw was surfaced via the surfacer. */
  surfaced: boolean
  value?: T
  error?: unknown
}

/** Run fn; on throw, the surfacer MUST run (UI state or ledger write). If the
 * surfacer itself throws or is missing, the error is returned flagged —
 * never swallowed. IMP-11 (silent failure) is a failure of this gate. */
export async function guarded<T>(
  fn: () => Promise<T>,
  surfacer: ((error: unknown) => void | Promise<void>) | null,
): Promise<GuardedOutcome<T>> {
  try {
    return { surfaced: true, value: await fn() }
  } catch (error) {
    if (!surfacer) return { surfaced: false, error }
    try {
      await surfacer(error)
      return { surfaced: true, error }
    } catch {
      return { surfaced: false, error }
    }
  }
}

/** Static tripwire for IMP-11: every `catch` in the given sources must either
 * reference a surfacing call (surface/ledger/emit/setState/setError/reject/
 * queueForRetry/drop(/onDrop…), throw (propagates), or return (converts the
 * error into data for the caller) within 12 lines after the catch — or carry
 * an explicit `iris-gate: deliberate` marker comment naming its reason.
 * Deliberate containment is declared in-source, never silent — the marker is
 * greppable and reviewed. Heuristic, not proof: the runtime `guarded` wrapper
 * is the enforcement. Returns violations. */
export interface CatchViolation {
  file: string
  line: number
  code: 'IMP-11'
  reason: string
}

const SURFACE_HINTS = [
  'surface',
  'ledger',
  'emit(',
  'setError',
  'setKeyError',
  'setBinding',
  'reject',
  'queueForRetry',
  'console.error',
  'onDrop',
  'drop(', // the connector's drop() notifies onDrop AND returns the failure as data
]

export function auditCatchBlocks(files: { name: string; source: string }[]): CatchViolation[] {
  const violations: CatchViolation[] = []
  for (const { name, source } of files) {
    const lines = source.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      // match `} catch` / `catch (` / `catch {` but not the word in comments/strings crudely
      if (!/(^|[^a-zA-Z_$])catch\s*(\(|{)/.test(line)) continue
      const windowLines = lines.slice(i, Math.min(i + 13, lines.length))
      const window = windowLines.join('\n')
      if (window.includes('iris-gate: deliberate')) continue // declared containment, with reason in-source
      const surfaced = SURFACE_HINTS.some(h => window.includes(h))
      // A throw propagates; a return converts the error into data for the
      // caller. Neither swallows. (The caller's handling is the caller's gate.)
      const converted = windowLines.some(l => /^\s*(throw|return)\b/.test(l))
      if (!surfaced && !converted) {
        violations.push({
          file: name,
          line: i + 1,
          code: 'IMP-11',
          reason:
            `IMP-11 · catch at ${name}:${i + 1} shows no surfacing call within 12 lines ` +
            '(surface/ledger/emit/setError/reject/queueForRetry). Silent failures are impurities — surface it.',
        })
      }
    }
  }
  return violations
}

/* ------------------------------------------------------------------ */
/* GATE-FIGURE — every figure wears its label                          */
/* ------------------------------------------------------------------ */

export interface LabeledFigure {
  value: number | string
  label: FigureLabel
  /** Where the figure came from — required so it traces. */
  basis: string
}

/** Figures are born labeled. There is no unlabeled figure in Iris's world. */
export function figure(value: number | string, label: FigureLabel, basis: string): LabeledFigure {
  return { value, label, basis }
}

/** A figure without a valid REPORTED/MODELED/UNKNOWN label is
 * UNLABELED_MOCK (IMP-04) — or INVENTED_FIGURE (IMP-01) when presented as
 * measured. */
export function assertFigureLabeled(fig: {
  value?: unknown
  label?: unknown
  basis?: unknown
}): GateResult {
  if (typeof fig.label !== 'string' || !(FIGURE_LABELS as readonly string[]).includes(fig.label)) {
    return fail(
      'GATE-FIGURE',
      'UNLABELED_MOCK',
      'GATE-FIGURE · figure without a REPORTED/MODELED/UNKNOWN label — IMP-04 (unlabeled mock). ' +
        'Every figure wears its label, normal size, no fine print.',
    )
  }
  if (typeof fig.basis !== 'string' || fig.basis.trim().length === 0) {
    return fail(
      'GATE-FIGURE',
      'UNLABELED_MOCK',
      'GATE-FIGURE · figure without a basis — a label without a trace is decoration. Name the measurement or the model.',
    )
  }
  return GATE_PASS
}

/* ------------------------------------------------------------------ */
/* GATE-PROMISE — every promise traces to a mechanism                  */
/* ------------------------------------------------------------------ */

const mechanisms = new Set<string>()

/** Register a mechanism that actually exists in the build. Admission-time. */
export function registerMechanism(id: string): void {
  mechanisms.add(id)
}

export function registeredMechanisms(): string[] {
  return [...mechanisms].sort()
}

/** A promise the UI makes must trace to a registered mechanism. Otherwise
 * IMP-10 (unkeepable promise) — keep it honest or unmake it. */
export function promiseTraced(promise: string, mechanismId: string): GateResult {
  if (!mechanisms.has(mechanismId)) {
    return fail(
      'GATE-PROMISE',
      'IMP-10',
      `GATE-PROMISE · "${promise}" promises a mechanism that is not registered ("${mechanismId}") — ` +
        'IMP-10 (unkeepable promise). Every promise traces to a mechanism that exists.',
    )
  }
  return GATE_PASS
}

/* ------------------------------------------------------------------ */
/* GATE-AUDIT — the IMP-01…IMP-12 checklist, executable                 */
/* ------------------------------------------------------------------ */

export interface SurfaceDescriptor {
  figures: { name: string; value?: unknown; label?: unknown; basis?: unknown }[]
  receipts: { name: string; kind: 'SEALED' | 'SEE'; kernelAnswered: boolean; signatureVerified?: boolean }[]
  controls: { name: string; functional: boolean }[]
  links: { name: string; href: string }[]
  /** Raw UI copy, for the forbidden-phrase scan. */
  copy: string[]
}

export interface ImpurityFinding {
  id: string
  severity: 'P0' | 'P1' | 'P2'
  where: string
  reason: string
}

/** Deterministic wallet-law scan: these phrases must never appear in wallet
 * UI copy. No seed phrases, no mnemonics — ever. */
const FORBIDDEN_COPY = [/seed phrase/i, /\bmnemonic\b/i, /recovery phrase/i]

/** Run the impurity taxonomy as a checklist over a surface descriptor. */
export function auditSurface(desc: SurfaceDescriptor, knownRoutes: string[]): ImpurityFinding[] {
  const findings: ImpurityFinding[] = []

  for (const f of desc.figures) {
    const r = assertFigureLabeled(f)
    if (!isGatePass(r)) {
      findings.push({ id: 'IMP-04', severity: 'P0', where: `figure:${f.name}`, reason: r.reason })
    }
    if (f.label === 'UNKNOWN') {
      findings.push({
        id: 'IMP-05',
        severity: 'P0',
        where: `figure:${f.name}`,
        reason: 'IMP-05 · figure labeled UNKNOWN must never be presented as passing or decided.',
      })
    }
  }

  for (const rc of desc.receipts) {
    const r = sealOnlyWithAnswer(rc.kind, {
      kernelAnswered: rc.kernelAnswered,
      signatureVerified: rc.signatureVerified,
      acceptedPayload: rc.kernelAnswered ? {} : undefined,
    })
    if (!isGatePass(r)) {
      findings.push({ id: 'IMP-02', severity: 'P0', where: `receipt:${rc.name}`, reason: r.reason })
    }
  }

  for (const c of desc.controls) {
    if (!c.functional) {
      findings.push({
        id: 'IMP-03',
        severity: 'P0',
        where: `control:${c.name}`,
        reason: 'IMP-03 · decorative control — it looks functional but does nothing. Make it work or remove it.',
      })
    }
  }

  for (const l of desc.links) {
    const path = l.href.split('?')[0].split('#')[0]
    if (l.href.startsWith('/') && !knownRoutes.some(r => path === r || path.startsWith(r + '/'))) {
      findings.push({
        id: 'DEAD_LINK',
        severity: 'P1',
        where: `link:${l.name}`,
        reason: `DEAD_LINK · "${l.href}" points at no known route. Prerender the route or remove the link.`,
      })
    }
  }

  desc.copy.forEach((text, i) => {
    for (const pattern of FORBIDDEN_COPY) {
      if (pattern.test(text)) {
        findings.push({
          id: 'FORBIDDEN_COPY',
          severity: 'P0',
          where: `copy[${i}]`,
          reason: `Wallet law · copy matches forbidden phrase ${pattern} — no seed phrases, no mnemonics, ever.`,
        })
      }
    }
  })

  // No-password law: the system never requests a password.
  findings.push(...scanPasswordSurface(desc.copy))

  return findings
}

/* ------------------------------------------------------------------ */
/* auditDom — the browser hook (?iris-audit=1)                           */
/* ------------------------------------------------------------------ */

export interface DomNode {
  readonly tagName: string
  readonly textContent: string | null
  getAttribute(name: string): string | null
}
export interface DomRoot {
  querySelectorAll(selector: string): Iterable<DomNode>
}

/** Run the checklist against the live DOM. Rendered by the ?iris-audit=1
 * hook into #iris-audit for the E2E (and David's own eyes). */
export function auditDom(root: DomRoot, knownRoutes: string[]): ImpurityFinding[] {
  const findings: ImpurityFinding[] = []
  const nodes = [...root.querySelectorAll('[data-figure], a[href^="/"], body')]

  for (const el of nodes) {
    if (el.getAttribute('data-figure') !== null) {
      const label = el.getAttribute('data-label')
      if (!label || !(FIGURE_LABELS as readonly string[]).includes(label)) {
        findings.push({
          id: 'IMP-04',
          severity: 'P0',
          where: `dom:${el.tagName.toLowerCase()}[data-figure="${el.getAttribute('data-figure')}"]`,
          reason: 'IMP-04 · rendered figure without a data-label (REPORTED/MODELED/UNKNOWN).',
        })
      }
    }
    if (el.tagName === 'A') {
      const href = el.getAttribute('href') ?? ''
      const path = href.split('?')[0].split('#')[0]
      if (href.startsWith('/') && !knownRoutes.some(r => path === r || path.startsWith(r + '/'))) {
        findings.push({
          id: 'DEAD_LINK',
          severity: 'P1',
          where: `dom:a[href="${href}"]`,
          reason: `DEAD_LINK · live link to unknown route "${href}".`,
        })
      }
    }
  }

  // SEALED/SEE text with no evidence marker anywhere up the tree is IMP-02.
  // (Checked on text-bearing elements; the hook re-runs after interactions.)
  for (const el of root.querySelectorAll('[data-receipt]')) {
    const text = (el.textContent ?? '').toUpperCase()
    if ((text.includes('SEALED') || /\bSEE\b/.test(text)) && el.getAttribute('data-evidence') !== 'true') {
      findings.push({
        id: 'IMP-02',
        severity: 'P0',
        where: `dom:${el.tagName.toLowerCase()}[data-receipt]`,
        reason: 'IMP-02 · receipt language rendered with no data-evidence="true" marker.',
      })
    }
  }

  const bodyText = [...root.querySelectorAll('body')]
    .map(b => b.textContent ?? '')
    .join(' ')
  for (const pattern of FORBIDDEN_COPY) {
    if (pattern.test(bodyText)) {
      findings.push({
        id: 'FORBIDDEN_COPY',
        severity: 'P0',
        where: 'dom:body',
        reason: `Wallet law · rendered copy matches forbidden phrase ${pattern}.`,
      })
    }
  }

  // No-password law: no password fields, no password requests, anywhere.
  findings.push(...auditDomPasswordFields(root))

  return findings
}

/* ------------------------------------------------------------------ */
/* GATE-NOPASSWORD — passwords do not exist in this system               */
/* ------------------------------------------------------------------ */

/** No-password law (David, 2026-10-04, his words): "you're never going to be
 * asked for a password out of this system so just remove that whole
 * potential if somebody enters a password it's invalid syntax."
 *
 * - The system NEVER requests a password: any password field, password
 *   prompt, or password-shaped credential handling is IMP-13.
 * - A password that is entered anyway is invalid syntax: rejected
 *   fail-closed — never processed, never stored, never transmitted.
 * - The Unity ID binds via passphrase/passkey only. Applies to the gate,
 *   the Playground, the wallet, the binds — everything. */

/** Request patterns. Denials ("there is no password", "a password is not
 * made") do NOT match — only requests. */
const PASSWORD_REQUEST_PATTERNS = [
  /\b(?:enter|type|choose|create|set|reset|forgot|confirm)\s+(?:your|the|a|new|current)\s+password\b/i,
  /\bpassword\s*:/,
  /\bnew password\b/i,
  /\bconfirm password\b/i,
  /\bcurrent password\b/i,
]

/** Scan UI copy for password REQUESTS. Returns IMP-13 findings. */
export function scanPasswordSurface(texts: string[]): ImpurityFinding[] {
  const findings: ImpurityFinding[] = []
  texts.forEach((text, i) => {
    for (const pattern of PASSWORD_REQUEST_PATTERNS) {
      if (pattern.test(text)) {
        findings.push({
          id: 'IMP-13',
          severity: 'P0',
          where: `copy[${i}]`,
          reason:
            `IMP-13 · copy requests a password (${pattern}) — passwords do not exist in this system. ` +
            'Remove the request entirely; the Unity ID binds via passphrase/passkey only.',
        })
        break
      }
    }
  })
  return findings
}

export interface PasswordFieldShape {
  type?: string
  name?: string
  id?: string
  label?: string
  placeholder?: string
}

/** A password presented for entry — by field type, name, or label — is
 * invalid syntax: rejected fail-closed. Never processed, never stored,
 * never transmitted. */
export function rejectPasswordEntry(field: PasswordFieldShape): GateResult {
  const hay = `${field.type ?? ''} ${field.name ?? ''} ${field.id ?? ''} ${field.label ?? ''} ${field.placeholder ?? ''}`
  // Substring, not word-bounded: user_password, password123, and any other
  // password-shaped naming are all invalid syntax. (A denial in copy — "there
  // is no password" — is handled by scanPasswordSurface, not here.)
  if (/password/i.test(hay)) {
    return fail(
      'GATE-NOPASSWORD',
      'PASSWORD_ENTERED',
      'GATE-NOPASSWORD · a password-shaped field or entry was presented — invalid syntax. ' +
        'Rejected fail-closed: never processed, never stored, never transmitted. ' +
        'Passwords do not exist in this system.',
    )
  }
  return GATE_PASS
}

/** Find password fields in the live DOM: input[type=password] or any input
 * whose name/id/label/placeholder is password-shaped. */
export function auditDomPasswordFields(root: DomRoot): ImpurityFinding[] {
  const findings: ImpurityFinding[] = []
  for (const el of root.querySelectorAll('input')) {
    const field = {
      type: el.getAttribute('type') ?? '',
      name: el.getAttribute('name') ?? '',
      id: el.getAttribute('id') ?? '',
      label: el.getAttribute('aria-label') ?? '',
      placeholder: el.getAttribute('placeholder') ?? '',
    }
    const r = rejectPasswordEntry(field)
    if (!isGatePass(r)) {
      findings.push({
        id: 'IMP-13',
        severity: 'P0',
        where: `dom:input[name="${field.name || field.id || field.type}"]`,
        reason: r.reason,
      })
    }
  }
  return findings
}

/* ------------------------------------------------------------------ */
/* The 8 engineering principles — admission test                        */
/* ------------------------------------------------------------------ */

export const ADMISSION_PRINCIPLES = [
  'design-verdict-before-implementation',
  'the-law-floor',
  'idempotency',
  'fail-closed',
  'honest-states-over-comfortable-ones',
  'no-invented-figures',
  'the-strangers-hands-test',
  'cleanup-first',
] as const

/** The 8 principles in order, fail-fast at the first false — an idea that
 * fails an early principle never reaches the later ones. */
export function admitIdea(checks: readonly boolean[]): GateResult {
  for (let i = 0; i < ADMISSION_PRINCIPLES.length; i++) {
    if (checks[i] !== true) {
      return fail(
        'GATE-ADMIT',
        'PRINCIPLE_FAILED',
        `GATE-ADMIT · principle ${i + 1}/8 failed: ${ADMISSION_PRINCIPLES[i]}. ` +
          'An idea that fails an early principle does not reach the later ones.',
      )
    }
  }
  return GATE_PASS
}

/* ------------------------------------------------------------------ */
/* Wiring — the checking layer at the pipe choke points                  */
/* ------------------------------------------------------------------ */

/** The connector's DropReason union, verbatim from connector.ts.
 * GATE-CODES checks every DROPPED reason against this closed set. */
export const CONNECTOR_DROP_REASONS = [
  'DISABLED',
  'NO_ENDPOINT',
  'OVERSIZE',
  'NETWORK',
  'HTTP',
  'MALFORMED',
  'REJECTED',
] as const

/** A transmission result as the connector produces it. Structural — the
 * connector's own TransmitResult satisfies this without an import cycle. */
export interface TransmissionResultShape {
  state: string
  reason?: string
}

/** The connector's results are gated at the choke point:
 * - the connector NEVER produces SEALED/SEE — a result object carrying one
 *   is a regression, failed loudly (IMP-02);
 * - every DROPPED reason must be a known DropReason — unknown codes are
 *   rejected, never silently accepted (GATE-CODES). */
export function gateTransmission(result: TransmissionResultShape): GateResult {
  if (result.state === 'SEALED' || result.state === 'SEE') {
    return fail(
      'GATE-CODES',
      'IMP-02',
      'GATE-CODES · the connector produced a SEALED/SEE result — the connector never interprets ' +
        'a kernel answer as a receipt. IMP-02 (receipt without answer). Regression: fail loudly.',
    )
  }
  if (result.state === 'DROPPED') {
    if (!result.reason || !(CONNECTOR_DROP_REASONS as readonly string[]).includes(result.reason)) {
      return fail(
        'GATE-CODES',
        'UNKNOWN_CODE',
        `GATE-CODES · DROPPED with unknown reason "${result.reason ?? '(missing)'}". ` +
          'Unknown codes are rejected, never silently accepted.',
      )
    }
  }
  return GATE_PASS
}

/* ---------------- gateSettle — daemon settle points ---------------- */

export type SettleOutcome = 'DELIVERED' | 'REJECTED' | 'HOLE' | 'QUEUED'

export interface SettleEvidence {
  /** DELIVERED: the kernel's answer, carried on the receipt. */
  receipt?: unknown
  /** DELIVERED: true only when bytes came back on the wire. */
  kernelAnswered?: boolean
  /** REJECTED / HOLE / QUEUED: the TRUE reason string. */
  reason?: string
}

/** Every daemon settle point is gated:
 * - DELIVERED requires a non-null receipt AND a real kernel answer —
 *   otherwise IMP-02 (receipt without answer);
 * - REJECTED / HOLE / QUEUED require the true reason string — settling
 *   without one is IMP-11 (silent failure). */
export function gateSettle(outcome: SettleOutcome, evidence: SettleEvidence): GateResult {
  if (outcome === 'DELIVERED') {
    if (evidence.receipt === undefined || evidence.receipt === null || evidence.kernelAnswered !== true) {
      return fail(
        'GATE-SEAL',
        'IMP-02',
        'GATE-SEAL · DELIVERED settled with no receipt or no kernel answer — ' +
          'IMP-02 (receipt without answer). A delivery exists only when the other side answers.',
      )
    }
    return GATE_PASS
  }
  if (typeof evidence.reason !== 'string' || evidence.reason.trim().length === 0) {
    return fail(
      'GATE-CATCH',
      'IMP-11',
      `GATE-CATCH · ${outcome} settled with no reason string — IMP-11 (silent failure). ` +
        'The true reason is surfaced, never swallowed.',
    )
  }
  return GATE_PASS
}

/* ---------------- gateEnqueue — idempotency re-assertion -------------- */

/** The daemon never queues a bind it cannot dedupe: enqueue requires the
 * manifest_hash idempotency key. */
export function gateEnqueue(entry: { manifest_hash?: unknown }): GateResult {
  if (typeof entry.manifest_hash !== 'string' || entry.manifest_hash.length === 0) {
    return fail(
      'GATE-ENQUEUE',
      'IMP-11',
      'GATE-ENQUEUE · enqueue without a manifest_hash idempotency key — the daemon never queues ' +
        'the same bind twice, and never queues a bind it cannot dedupe.',
    )
  }
  return GATE_PASS
}

/* ---------------- gateBindVerdictClaim — the wallet BindView ---------- */

/** Guards the wallet BindView.verdict: SEE only with a kernel answer in
 * hand. Anything else renders HOLE or QUEUED — never a SEE on hope. */
export function gateBindVerdictClaim(
  verdict: 'SEE' | 'HOLE' | 'QUEUED',
  evidence: { kernelAnswered: boolean; acceptedPayload?: unknown },
): GateResult {
  if (verdict !== 'SEE') return GATE_PASS
  return sealOnlyWithAnswer('SEE', {
    kernelAnswered: evidence.kernelAnswered,
    acceptedPayload: evidence.acceptedPayload,
  })
}
