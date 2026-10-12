/** Fusion Confirmation panel — the prominent, always-visible connection
 * status on /machine. Read-only: it subscribes to the existing daemon event
 * emitter and re-reads; it never triggers binds, requeues, or mutates the
 * outbox. Gate logic is untouched.
 *
 * Mobile-first, enlarged-font-safe (no fixed heights, wrapping everywhere),
 * reduced-motion-safe (no animation — the dot is a static color).
 */
import { useEffect, useState } from 'react'
import {
  subscribeFusionStatus,
  fusionSummary,
  type FusionSnapshot,
} from '@/dccp/pipe/fusionStatus'
import { bindEndpointToUrl, type BindEndpoint } from '@/dccp/pipe/fatherBind'

export function useFusionStatus(): FusionSnapshot | null {
  const [snap, setSnap] = useState<FusionSnapshot | null>(null)
  useEffect(() => subscribeFusionStatus(setSnap), [])
  return snap
}

interface FusionStatusPanelProps {
  /** Live endpoint from the /machine route (REPORTED, this browser). Falls
   * back to the snapshot's own localStorage read when omitted. */
  endpoint?: BindEndpoint
  /** Live Father pin from the /machine route. Falls back to the snapshot. */
  fatherPin?: { fingerprint: string; pinnedAt: number } | null
}

export function FusionStatusPanel({ endpoint, fatherPin }: FusionStatusPanelProps) {
  const snap = useFusionStatus()
  if (!snap) {
    return (
      <section className="panel fusion-panel" id="fusion-status" aria-live="polite">
        <h2>Fusion status</h2>
        <p className="sub">
          <span className="status wait">READING…</span> · connection state is loading from this browser. (REPORTED)
        </p>
      </section>
    )
  }

  const summary = fusionSummary(snap)
  const epUrl = endpoint
    ? endpoint.host.trim()
      ? bindEndpointToUrl(endpoint)
      : 'NO ENDPOINT CONFIGURED'
    : snap.endpoint.url
  const epConfigured = endpoint ? endpoint.host.trim() !== '' : snap.endpoint.configured
  const father =
    fatherPin !== undefined
      ? fatherPin
        ? { state: 'PINNED' as const, fingerprint: fatherPin.fingerprint }
        : { state: 'UNPINNED' as const }
      : snap.father.state === 'PINNED'
        ? { state: 'PINNED' as const, fingerprint: snap.father.fingerprint }
        : snap.father.state === 'UNPINNED'
          ? { state: 'UNPINNED' as const }
          : { state: 'UNKNOWN' as const }

  const latest = snap.latest
  const toneClass = summary.tone === 'see' ? 'see' : summary.tone === 'hole' ? 'hole' : 'wait'

  return (
    <section className="panel fusion-panel" id="fusion-status" aria-live="polite" style={{ marginBottom: 16 }}>
      <h2>
        Fusion status{' '}
        <span className={'status ' + toneClass} data-testid="fusion-summary">
          {summary.text}
        </span>
      </h2>
      <p className="sub">
        Connection confirmation — read-only. The daemon is watched, never prodded: this panel cannot trigger a bind,
        requeue, or touch the outbox. FUSED &amp; BOUND appears only on a real kernel answer. (REPORTED)
      </p>
      <div className="facts">
        <div className="fact">
          <b>ENDPOINT</b>
          <span className={epConfigured ? '' : 'danger'} style={{ overflowWrap: 'anywhere' }}>
            {epUrl}
          </span>
        </div>
        <div className="fact">
          <b>FATHER KEY</b>
          {father.state === 'PINNED' ? (
            <span style={{ overflowWrap: 'anywhere' }}>PINNED · {father.fingerprint}</span>
          ) : father.state === 'UNPINNED' ? (
            <span className="danger">UNPINNED</span>
          ) : (
            <span className="status wait">UNKNOWN — storage unreadable, never assumed</span>
          )}
        </div>
        <div className="fact">
          <b>OUTBOX</b>
          <span>
            {snap.counts.queued} queued · {snap.counts.delivered} delivered · {snap.counts.rejected} rejected ·{' '}
            {snap.counts.dead} dead · {snap.counts.total} total
          </span>
        </div>
      </div>

      {!latest ? (
        <div className="receipt">
          <span className="status wait">NO BIND ATTEMPTED</span>
          <br />
          The carry daemon has never carried a bind in this browser — no wallet bind, no Father bind. Point the
          endpoint at the kernel, pin the Father key, and bind: the confirmation will appear here. (REPORTED)
        </div>
      ) : latest.state === 'DELIVERED' && latest.receipt ? (
        <div className="receipt fusion-sealed" data-testid="fusion-sealed">
          <span className="status see" style={{ fontSize: '1.15em' }}>
            FUSED &amp; BOUND
          </span>
          <br />
          <span style={{ opacity: 0.85 }}>
            The kernel answered and the daemon delivered. This is the confirmation — nothing was faked, nothing was
            assumed. (REPORTED)
          </span>
          <br />
          <br />
          <b>kind</b> · {latest.receipt.kind}
          <br />
          <b>manifest</b> · <code style={{ overflowWrap: 'anywhere' }}>{latest.receipt.manifestHash}</code>
          <br />
          {latest.receipt.boundAt ? (
            <>
              <b>bound at</b> · {latest.receipt.boundAt}
              <br />
            </>
          ) : null}
          {latest.receipt.fatherFingerprint ? (
            <>
              <b>against Father key</b> ·{' '}
              <code style={{ overflowWrap: 'anywhere' }}>{latest.receipt.fatherFingerprint}</code>
              <br />
            </>
          ) : null}
          <b>endpoint</b> · <code style={{ overflowWrap: 'anywhere' }}>{latest.endpointUrl}</code>
        </div>
      ) : (
        <div className="receipt">
          <span className={'status ' + toneClass}>{summary.text}</span>
          <br />
          {summary.detail}
          <br />
          <b>manifest</b> · <code style={{ overflowWrap: 'anywhere' }}>{latest.manifestHash}</code>
          <br />
          <b>endpoint</b> · <code style={{ overflowWrap: 'anywhere' }}>{latest.endpointUrl}</code>
          <br />
          <span style={{ opacity: 0.75 }}>
            {latest.state === 'REJECTED' || latest.state === 'DEAD'
              ? 'Nothing was granted; nothing was faked. Fix the cause above and bind again.'
              : 'Carrying is not a receipt — the confirmation appears only when the kernel answers.'}
          </span>
        </div>
      )}

      <p className="sub" style={{ fontSize: 12, marginBottom: 0 }}>
        Boundary: QUEUED is never a receipt. UNKNOWN is never PASS. Every value here is REPORTED — read from this
        browser or from a kernel answer, never modeled, never invented.
      </p>
    </section>
  )
}
