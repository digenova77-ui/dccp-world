/** `iris.gates.v1` tests — every gate proven, including the violation paths.
 * Design: IRIS_GATES_DESIGN.md. Verdict: ED-PREDICT-20261004-IRISGATES-V1 (predicted).
 *
 * Each invariant is proven both ways: the honest path passes, and the
 * violation is rejected/flagged — never silently accepted. */
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  ERROR_CODES,
  FIGURE_LABELS,
  ADMISSION_PRINCIPLES,
  GATE_PASS,
  knownCode,
  isGatePass,
  sealOnlyWithAnswer,
  unknownNeverPass,
  guarded,
  auditCatchBlocks,
  figure,
  assertFigureLabeled,
  registerMechanism,
  registeredMechanisms,
  promiseTraced,
  auditSurface,
  auditDom,
  admitIdea,
  scanPasswordSurface,
  rejectPasswordEntry,
  auditDomPasswordFields,
  gateTransmission,
  gateSettle,
  gateEnqueue,
  gateBindVerdictClaim,
  type DomRoot,
} from './gates.ts'

/** Pipe sources, read once at module load — the IMP-11 tripwire audits the
 * real code every run. (Sync top-level read: no async import dance inside
 * the test body.) */
const PIPE_DIR = fileURLToPath(new URL('../pipe/', import.meta.url))
const PIPE_SOURCES = ['connector.ts', 'daemon.ts', 'fatherBind.ts', 'ephemeral.ts', 'chain.ts'].map(name => ({
  name,
  source: readFileSync(PIPE_DIR + name, 'utf8'),
}))

/* ---------------- GATE-CODES ---------------- */

test('GATE-CODES: every Appendix A code is known, verbatim', () => {
  const expected: Record<string, string[]> = {
    transport: ['UNREACHABLE', 'TIMEOUT', 'CORS_BLOCKED', 'MALFORMED', 'NON_JSON', 'NETWORK'],
    kernel: [
      'KERNEL_UNAVAILABLE', 'NO_ENDPOINT', 'NO_BINDING', 'NO_PINNED_KEY', 'BAD_RESPONSE',
      'REFERENCE_MISMATCH', 'MINT_REJECTED', 'NOT_ED', 'INVALID_DESIGN_VERDICT', 'UNPRICED_DECISION',
    ],
    crypto: ['PIN_MISMATCH', 'PIN_INVALID', 'BAD_SIGNATURE', 'EXPIRED_KEY', 'UNKNOWN_KEY'],
    daemon: ['QUEUED', 'DUPLICATE_DELIVERY', 'STRANDED_RETRY', 'DEAD', 'QUEUE_CORRUPT'],
    wallet: ['UNBOUND', 'NO_KEY', 'LOCKED'],
    data: ['INVENTED_FIGURE', 'VINTAGE_CONFLICT', 'UNLABELED_MOCK', 'UNKNOWN_AS_PASS'],
    rendering: ['BLEED', 'BROKEN_ASSET', 'DEAD_LINK', 'ORPHANED_ROUTE', 'MIDWORD_WRAP'],
    honest_states: ['HOLE', 'QUEUED', 'UNBOUND', 'DROPPED', 'REJECTED', 'DEAD', 'SEALED', 'SEE'],
    identity: ['PASSWORD_ENTERED'],
  }
  for (const [domain, codes] of Object.entries(expected)) {
    assert.deepEqual(
      [...(ERROR_CODES as Record<string, readonly string[]>)[domain]],
      codes,
      `Appendix A table drift in domain ${domain}`,
    )
    for (const code of codes) {
      assert.ok(isGatePass(knownCode(domain as keyof typeof ERROR_CODES, code)), `${domain}:${code} unknown`)
    }
  }
})

test('GATE-CODES: an invented code is rejected, never silently accepted', () => {
  const r = knownCode('transport', 'FROBNICATED')
  assert.equal(r.pass, false)
  assert.equal(r.gate, 'GATE-CODES')
  assert.match(r.reason, /not a known transport code/)
})

/* ---------------- GATE-SEAL ---------------- */

test('GATE-SEAL: a fake SEALED with no kernel answer is rejected (IMP-02)', () => {
  const r = sealOnlyWithAnswer('SEALED', { kernelAnswered: false, signatureVerified: true })
  assert.equal(r.pass, false)
  assert.equal(r.code, 'IMP-02')
})

test('GATE-SEAL: SEALED without a verified signature is rejected', () => {
  const r = sealOnlyWithAnswer('SEALED', { kernelAnswered: true, signatureVerified: false })
  assert.equal(r.pass, false)
  assert.equal(r.code, 'IMP-02')
})

test('GATE-SEAL: SEE without an accepted payload is rejected', () => {
  const r = sealOnlyWithAnswer('SEE', { kernelAnswered: true })
  assert.equal(r.pass, false)
  assert.equal(r.code, 'IMP-02')
})

test('GATE-SEAL: a real answer seals — SEALED with verified signature passes', () => {
  assert.deepEqual(
    sealOnlyWithAnswer('SEALED', { kernelAnswered: true, signatureVerified: true }),
    GATE_PASS,
  )
})

test('GATE-SEAL: a real answer observes — SEE with accepted payload passes', () => {
  assert.deepEqual(
    sealOnlyWithAnswer('SEE', { kernelAnswered: true, acceptedPayload: { accepted: true } }),
    GATE_PASS,
  )
})

/* ---------------- GATE-VERDICT ---------------- */

test('GATE-VERDICT: UNKNOWN scored as PASS is rejected', () => {
  const r = unknownNeverPass({
    inputs: [
      { name: 'coverage', label: 'REPORTED' },
      { name: 'deployment', label: 'UNKNOWN' },
    ],
    outcome: 'PASS',
  })
  assert.equal(r.pass, false)
  assert.equal(r.code, 'UNKNOWN_AS_PASS')
  assert.match(r.reason, /deployment/)
})

test('GATE-VERDICT: honest verdicts pass — all-known PASS, and non-PASS outcomes', () => {
  assert.deepEqual(
    unknownNeverPass({
      inputs: [{ name: 'a', label: 'REPORTED' }, { name: 'b', label: 'MODELED' }],
      outcome: 'PASS',
    }),
    GATE_PASS,
  )
  assert.deepEqual(
    unknownNeverPass({ inputs: [{ name: 'a', label: 'UNKNOWN' }], outcome: 'HOLD' }),
    GATE_PASS,
  )
})

/* ---------------- GATE-CATCH ---------------- */

test('GATE-CATCH: guarded success returns the value, surfaced', async () => {
  const r = await guarded(async () => 42, null)
  assert.equal(r.surfaced, true)
  assert.equal(r.value, 42)
})

test('GATE-CATCH: a throw with a surfacer is surfaced, never swallowed', async () => {
  let surfaced: unknown = null
  const r = await guarded(
    async () => { throw new Error('boom') },
    e => { surfaced = e },
  )
  assert.equal(r.surfaced, true)
  assert.match((surfaced as Error).message, /boom/)
})

test('GATE-CATCH: a throw with no surfacer is flagged, not swallowed', async () => {
  const r = await guarded(async () => { throw new Error('silent') }, null)
  assert.equal(r.surfaced, false)
  assert.match((r.error as Error).message, /silent/)
})

test('GATE-CATCH: a surfacer that throws is flagged too', async () => {
  const r = await guarded(
    async () => { throw new Error('orig') },
    () => { throw new Error('surfacer broke') },
  )
  assert.equal(r.surfaced, false)
})

test('GATE-CATCH: auditCatchBlocks flags a silent catch (IMP-11)', () => {
  const violations = auditCatchBlocks([
    {
      name: 'silent.ts',
      source: `try {\n  await work()\n} catch (e) {\n  // ignore\n}\n`,
    },
  ])
  assert.equal(violations.length, 1)
  assert.equal(violations[0].code, 'IMP-11')
  assert.equal(violations[0].file, 'silent.ts')
})

test('GATE-CATCH: auditCatchBlocks passes a catch that surfaces', () => {
  const violations = auditCatchBlocks([
    {
      name: 'loud.ts',
      source: `try {\n  await work()\n} catch (e) {\n  emit('hole', entry)\n  await queueForRetry(entry, String(e))\n}\n`,
    },
  ])
  assert.deepEqual(violations, [])
})

test('GATE-CATCH: the real pipe sources have no silent catches', () => {
  const violations = auditCatchBlocks(PIPE_SOURCES)
  assert.deepEqual(violations, [], `silent catches in pipe/: ${JSON.stringify(violations)}`)
})

/* ---------------- GATE-FIGURE ---------------- */

test('GATE-FIGURE: a labeled figure with a basis passes', () => {
  assert.deepEqual(assertFigureLabeled(figure(1273500000, 'MODELED', 'drive extraction')), GATE_PASS)
  assert.ok((FIGURE_LABELS as readonly string[]).includes('REPORTED'))
  assert.ok((FIGURE_LABELS as readonly string[]).includes('MODELED'))
  assert.ok((FIGURE_LABELS as readonly string[]).includes('UNKNOWN'))
})

test('GATE-FIGURE: an unlabeled figure is UNLABELED_MOCK', () => {
  const r = assertFigureLabeled({ value: 42, basis: 'x' })
  assert.equal(r.pass, false)
  assert.equal(r.code, 'UNLABELED_MOCK')
})

test('GATE-FIGURE: a label without a basis is decoration — rejected', () => {
  const r = assertFigureLabeled({ value: 42, label: 'REPORTED', basis: '  ' })
  assert.equal(r.pass, false)
})

test('GATE-FIGURE: a bogus label is rejected', () => {
  const r = assertFigureLabeled({ value: 42, label: 'TRUST_ME', basis: 'x' })
  assert.equal(r.pass, false)
})

/* ---------------- GATE-PROMISE ---------------- */

test('GATE-PROMISE: a promise to an unregistered mechanism is IMP-10', () => {
  const r = promiseTraced('cross-site passkey login', 'mechanism-that-does-not-exist')
  assert.equal(r.pass, false)
  assert.equal(r.code, 'IMP-10')
})

test('GATE-PROMISE: a promise to a registered mechanism passes', () => {
  registerMechanism('daemon-carry')
  assert.deepEqual(promiseTraced('the daemon carries this bind', 'daemon-carry'), GATE_PASS)
  assert.ok(registeredMechanisms().includes('daemon-carry'))
})

/* ---------------- GATE-AUDIT ---------------- */

const KNOWN = ['/', '/machine', '/explorer', '/arbitrage', '/pyramid', '/story']

test('GATE-AUDIT: a clean surface yields no findings', () => {
  const findings = auditSurface(
    {
      figures: [{ name: 'boards', value: 72, label: 'REPORTED', basis: 'ministry extract' }],
      receipts: [{ name: 'bind', kind: 'SEE', kernelAnswered: true }],
      controls: [{ name: 'bind-button', functional: true }],
      links: [{ name: 'machine', href: '/machine' }],
      copy: ['Bind your Unity ID. No seed phrases here.'],
    },
    KNOWN,
  )
  // 'No seed phrases here.' mentions the forbidden phrase only to deny it —
  // the scan is literal: denial still matches. Assert the scan fires so the
  // wallet law stays absolute — copy must not name them at all.
  assert.ok(findings.some(f => f.id === 'FORBIDDEN_COPY'), 'forbidden-phrase scan must fire even on denial')
  const rest = findings.filter(f => f.id !== 'FORBIDDEN_COPY')
  assert.deepEqual(rest, [])
})

test('GATE-AUDIT: every impurity class is caught', () => {
  const findings = auditSurface(
    {
      figures: [
        { name: 'unlabeled', value: 1, basis: 'x' },
        { name: 'mystery-pass', value: 2, label: 'UNKNOWN', basis: 'x' },
      ],
      receipts: [{ name: 'fake', kind: 'SEALED', kernelAnswered: false }],
      controls: [{ name: 'decor', functional: false }],
      links: [{ name: 'ghost', href: '/nope' }],
      copy: ['write down your seed phrase'],
    },
    KNOWN,
  )
  const ids = findings.map(f => f.id)
  for (const want of ['IMP-04', 'IMP-05', 'IMP-02', 'IMP-03', 'DEAD_LINK', 'FORBIDDEN_COPY']) {
    assert.ok(ids.includes(want), `expected ${want} in ${ids.join(',')}`)
  }
  assert.ok(findings.every(f => f.severity === 'P0' || f.severity === 'P1'))
})

/* ---------------- auditDom ---------------- */

function fakeDom(nodes: { tag: string; text?: string; attrs?: Record<string, string> }[]): DomRoot {
  return {
    querySelectorAll(selector: string) {
      const out = nodes.filter(n => {
        if (selector === 'body') return n.tag === 'BODY'
        if (selector === 'input') return n.tag === 'INPUT'
        if (selector === '[data-figure], a[href^="/"], body') {
          return n.attrs?.['data-figure'] !== undefined || (n.tag === 'A' && (n.attrs?.href ?? '').startsWith('/')) || n.tag === 'BODY'
        }
        if (selector === '[data-receipt]') return n.attrs?.['data-receipt'] !== undefined
        return false
      })
      return {
        [Symbol.iterator]() {
          let i = 0
          return {
            next: () => {
              if (i >= out.length) return { value: undefined, done: true as const }
              const n = out[i++]
              return {
                value: {
                  tagName: n.tag,
                  textContent: n.text ?? null,
                  getAttribute: (name: string) => n.attrs?.[name] ?? null,
                },
                done: false as const,
              }
            },
          }
        },
      } as unknown as Iterable<{
        readonly tagName: string
        readonly textContent: string | null
        getAttribute(name: string): string | null
      }>
    },
  }
}

test('auditDom: catches an unlabeled figure, a dead link, and an unevidenced SEALED', () => {
  const dom = fakeDom([
    { tag: 'DIV', attrs: { 'data-figure': 'boards' }, text: '72' },
    { tag: 'A', attrs: { href: '/ghost' }, text: 'ghost' },
    { tag: 'DIV', attrs: { 'data-receipt': 'x' }, text: 'SEALED · done' },
    { tag: 'BODY', text: 'clean body' },
  ])
  const findings = auditDom(dom, KNOWN)
  const ids = findings.map(f => f.id)
  assert.ok(ids.includes('IMP-04'), 'unlabeled figure')
  assert.ok(ids.includes('DEAD_LINK'), 'dead link')
  assert.ok(ids.includes('IMP-02'), 'unevidenced SEALED')
})

test('auditDom: an evidenced receipt and labeled figure pass', () => {
  const dom = fakeDom([
    { tag: 'DIV', attrs: { 'data-figure': 'boards', 'data-label': 'REPORTED' }, text: '72' },
    { tag: 'DIV', attrs: { 'data-receipt': 'x', 'data-evidence': 'true' }, text: 'SEALED · done' },
    { tag: 'BODY', text: 'clean body' },
  ])
  assert.deepEqual(auditDom(dom, KNOWN), [])
})

/* ---------------- admission ---------------- */

test('GATE-ADMIT: fail-fast at the first failed principle', () => {
  const r = admitIdea([true, true, false, true, true, true, true, true])
  assert.equal(r.pass, false)
  assert.match(r.reason, /3\/8/)
  assert.match(r.reason, new RegExp(ADMISSION_PRINCIPLES[2]))
})

test('GATE-ADMIT: all eight true admits the idea', () => {
  assert.deepEqual(admitIdea([true, true, true, true, true, true, true, true]), GATE_PASS)
})

test('GATE-ADMIT: principle order is the documented eight', () => {
  assert.deepEqual([...ADMISSION_PRINCIPLES], [
    'design-verdict-before-implementation',
    'the-law-floor',
    'idempotency',
    'fail-closed',
    'honest-states-over-comfortable-ones',
    'no-invented-figures',
    'the-strangers-hands-test',
    'cleanup-first',
  ])
})

/* ---------------- GATE-NOPASSWORD ---------------- */

test('GATE-NOPASSWORD: a password request in copy is IMP-13', () => {
  const findings = scanPasswordSurface(['Enter your password to continue'])
  assert.equal(findings.length, 1)
  assert.equal(findings[0].id, 'IMP-13')
  assert.equal(findings[0].severity, 'P0')
})

test('GATE-NOPASSWORD: denials are not requests — "there is no password" passes', () => {
  assert.deepEqual(
    scanPasswordSurface([
      'There is no password.',
      'A password is not made.',
      'Bind a Unity ID first. The key belongs to that ID, and there is no password to set.',
    ]),
    [],
  )
})

test('GATE-NOPASSWORD: a password field is invalid syntax — rejected fail-closed', () => {
  const r = rejectPasswordEntry({ type: 'password', name: 'pw' })
  assert.equal(r.pass, false)
  assert.equal(r.code, 'PASSWORD_ENTERED')
  assert.match(r.reason, /never processed, never stored, never transmitted/)
})

test('GATE-NOPASSWORD: a password-named field is rejected even without type=password', () => {
  const r = rejectPasswordEntry({ type: 'text', name: 'user_password' })
  assert.equal(r.pass, false)
  assert.equal(r.code, 'PASSWORD_ENTERED')
})

test('GATE-NOPASSWORD: ordinary fields pass', () => {
  assert.deepEqual(rejectPasswordEntry({ type: 'text', name: 'endpoint-host', label: 'Host' }), GATE_PASS)
  assert.deepEqual(rejectPasswordEntry({}), GATE_PASS)
})

test('GATE-NOPASSWORD: auditDomPasswordFields catches a live password input', () => {
  const dom = fakeDom([
    { tag: 'INPUT', attrs: { type: 'password', name: 'pw' } },
    { tag: 'INPUT', attrs: { type: 'text', name: 'endpoint' } },
    { tag: 'BODY', text: 'clean' },
  ])
  const findings = auditDomPasswordFields(dom)
  assert.equal(findings.length, 1)
  assert.equal(findings[0].id, 'IMP-13')
})

test('GATE-NOPASSWORD: the wallet, gate, and bind flows carry no password potential', () => {
  // Static sweep: no password fields, no password enable-paths, no password
  // requests in the credential flows. The old Better Auth email/password
  // branch was removed entirely (no-password law, David, 2026-10-04).
  const machine = readFileSync(fileURLToPath(new URL('../../routes/machine.tsx', import.meta.url)), 'utf8')
  const hay = PIPE_SOURCES.map(s => s.source).join('\n') + '\n' + machine
  assert.ok(!/type\s*=\s*["']password["']/i.test(hay), 'a password input field exists')
  assert.ok(!/emailAndPassword/.test(hay), 'an email/password enable path exists')
  const findings = scanPasswordSurface([hay])
  assert.deepEqual(findings, [], `password requests in wallet/bind flows: ${JSON.stringify(findings).slice(0, 500)}`)
})

/* ---------------- WIRING: gateTransmission ---------------- */

test('WIRING: gateTransmission passes every known DropReason', () => {
  for (const reason of [
    'DISABLED', 'NO_ENDPOINT', 'OVERSIZE', 'NETWORK', 'HTTP', 'MALFORMED', 'REJECTED',
  ]) {
    assert.ok(
      isGatePass(gateTransmission({ state: 'DROPPED', reason })),
      `DROPPED:${reason} should pass`,
    )
  }
  assert.ok(isGatePass(gateTransmission({ state: 'COMMITTED' })), 'COMMITTED should pass')
})

test('WIRING: gateTransmission rejects an unknown drop reason', () => {
  const r = gateTransmission({ state: 'DROPPED', reason: 'FROBNICATED' })
  assert.equal(r.pass, false)
  assert.equal(r.gate, 'GATE-CODES')
  assert.equal(r.code, 'UNKNOWN_CODE')
})

test('WIRING: gateTransmission fails loudly if the connector ever emits SEALED', () => {
  for (const state of ['SEALED', 'SEE']) {
    const r = gateTransmission({ state })
    assert.equal(r.pass, false, `${state} must fail`)
    assert.equal(r.code, 'IMP-02')
    assert.match(r.reason, /never interprets/)
  }
})

/* ---------------- WIRING: gateSettle ---------------- */

test('WIRING: gateSettle DELIVERED requires a receipt and a real answer', () => {
  assert.ok(
    isGatePass(gateSettle('DELIVERED', { receipt: { accepted: true }, kernelAnswered: true })),
    'DELIVERED with receipt + answer should pass',
  )
  const noReceipt = gateSettle('DELIVERED', { kernelAnswered: true })
  assert.equal(noReceipt.pass, false)
  assert.equal(noReceipt.code, 'IMP-02')
  const noAnswer = gateSettle('DELIVERED', { receipt: { accepted: true }, kernelAnswered: false })
  assert.equal(noAnswer.pass, false)
  assert.equal(noAnswer.code, 'IMP-02')
})

test('WIRING: gateSettle REJECTED/HOLE/QUEUED require the true reason', () => {
  for (const outcome of ['REJECTED', 'HOLE', 'QUEUED'] as const) {
    assert.ok(
      isGatePass(gateSettle(outcome, { reason: 'HOLE · UNREACHABLE — the kernel did not answer.' })),
      `${outcome} with a reason should pass`,
    )
    const silent = gateSettle(outcome, { reason: '   ' })
    assert.equal(silent.pass, false, `${outcome} with an empty reason must fail`)
    assert.equal(silent.code, 'IMP-11')
  }
})

/* ---------------- WIRING: gateEnqueue ---------------- */

test('WIRING: gateEnqueue requires the manifest_hash idempotency key', () => {
  assert.ok(isGatePass(gateEnqueue({ manifest_hash: 'abc123' })), 'keyed enqueue should pass')
  assert.equal(gateEnqueue({}).pass, false)
  assert.equal(gateEnqueue({ manifest_hash: '' }).pass, false)
  const nonStringKey = gateEnqueue({ manifest_hash: 42 })
  assert.equal(nonStringKey.pass, false)
  assert.equal(nonStringKey.code, 'IMP-11')
})

/* ---------------- WIRING: gateBindVerdictClaim ---------------- */

test('WIRING: gateBindVerdictClaim lets SEE through only with a kernel answer', () => {
  assert.ok(
    isGatePass(gateBindVerdictClaim('SEE', { kernelAnswered: true, acceptedPayload: { accepted: true } })),
    'SEE with kernel answer should pass',
  )
  const noAnswer = gateBindVerdictClaim('SEE', { kernelAnswered: false })
  assert.equal(noAnswer.pass, false)
  assert.equal(noAnswer.code, 'IMP-02')
  const noPayload = gateBindVerdictClaim('SEE', { kernelAnswered: true })
  assert.equal(noPayload.pass, false)
  assert.equal(noPayload.code, 'IMP-02')
  assert.ok(isGatePass(gateBindVerdictClaim('HOLE', { kernelAnswered: false })), 'HOLE always passes the gate')
  assert.ok(isGatePass(gateBindVerdictClaim('QUEUED', { kernelAnswered: false })), 'QUEUED always passes the gate')
})
