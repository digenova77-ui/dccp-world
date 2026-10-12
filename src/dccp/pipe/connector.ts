/** Inert DCLM connector. Fail closed. It does not claim the apex route is live.
 * Disabled unless enabled is true and an endpoint is supplied.
 */

import { gateTransmission, isGatePass } from '../iris/gates.ts'

export const TRINITY_MODE = 'Zero-Security-App'
export const DEFAULT_MAX_PAYLOAD_BYTES = 256

export type DropReason = 'DISABLED' | 'NO_ENDPOINT' | 'OVERSIZE' | 'NETWORK' | 'HTTP' | 'MALFORMED' | 'REJECTED'

export type TransmitResult =
  | { state: 'COMMITTED'; receipt: { accepted: true } }
  | { state: 'DROPPED'; reason: DropReason; detail?: string }

/** JSON transmit result. COMMITTED carries the kernel's parsed response payload —
 * the daemon and the bind settlers decide what it means; the connector itself
 * never interprets it as a receipt. */
export type TransmitJsonResult =
  | { state: 'COMMITTED'; payload: unknown }
  | { state: 'DROPPED'; reason: DropReason; detail?: string }

export interface TransmitOptions {
  endpoint?: string
  enabled?: boolean
  maxPayloadBytes?: number
  fetchImpl?: typeof fetch
  onDrop?: (drop: { state: 'DROPPED'; reason: DropReason }) => void
}

/** JSON POST to `{endpoint}{path}` — the bind path (`/bind`) and any future
 * JSON-speaking kernel route. Same fail-closed semantics as the box path:
 * disabled without enabled=true, no endpoint, oversize, network failure,
 * malformed response, or kernel rejection all DROPPED with a named reason.
 * This is the ONLY way bind envelopes reach the kernel — fatherBind's old
 * direct-fetch parallel path was removed in favor of this choke point. */
/** The Iris gate at the choke point: every result the connector produces is
 * checked — the reason must be a known DropReason (GATE-CODES), and the
 * connector must never produce SEALED/SEE. A violation cannot happen with
 * correct code (DropReason is a closed union); if it ever does, it is a
 * regression and fails loudly. */
function checked<R extends TransmitJsonResult>(result: R): R {
  const g = gateTransmission(result)
  if (!isGatePass(g)) throw new Error('IRIS-GATE-VIOLATION · ' + g.reason)
  return result
}

export async function transmitJsonToDCLM(
  path: string,
  body: unknown,
  options: TransmitOptions = {},
): Promise<TransmitJsonResult> {
  const max = options.maxPayloadBytes ?? 8192
  const drop = (reason: DropReason, detail?: string): TransmitJsonResult => {
    const result = { state: 'DROPPED' as const, reason, ...(detail ? { detail } : {}) }
    options.onDrop?.(result)
    return checked(result)
  }
  if (options.enabled !== true) return drop('DISABLED')
  if (!options.endpoint) return drop('NO_ENDPOINT')
  let encoded: string
  try {
    encoded = JSON.stringify(body)
  } catch {
    return drop('MALFORMED', 'bind envelope is not JSON-serializable')
  }
  if (new TextEncoder().encode(encoded).length > max) return drop('OVERSIZE')
  const fetchImpl = options.fetchImpl ?? fetch
  let response: Response
  try {
    response = await fetchImpl(`${options.endpoint.replace(/\/$/, '')}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Trinity-Mode': TRINITY_MODE },
      body: encoded,
    })
  } catch {
    return drop('NETWORK')
  }
  let json: unknown
  try {
    json = await response.json()
  } catch {
    return drop('MALFORMED')
  }
  if (!json || typeof json !== 'object' || (json as { accepted?: unknown }).accepted !== true) {
    const serverReason = (json as { reason?: unknown })?.reason
    return drop('REJECTED', typeof serverReason === 'string' ? serverReason : `HTTP ${response.status} without a bind acceptance`)
  }
  return checked({ state: 'COMMITTED', payload: json })
}

function checkedBox<R extends TransmitResult>(result: R): R {
  const g = gateTransmission(result)
  if (!isGatePass(g)) throw new Error('IRIS-GATE-VIOLATION · ' + g.reason)
  return result
}

export async function transmitBoxToDCLM(
  payload: string,
  options: { endpoint?: string; enabled?: boolean; maxPayloadBytes?: number; fetchImpl?: typeof fetch; onDrop?: (drop: { state: 'DROPPED'; reason: DropReason }) => void } = {},
): Promise<TransmitResult> {
  const max = options.maxPayloadBytes ?? DEFAULT_MAX_PAYLOAD_BYTES
  const drop = (reason: DropReason, detail?: string): TransmitResult => {
    const result = { state: 'DROPPED' as const, reason, ...(detail ? { detail } : {}) }
    options.onDrop?.(result)
    return checkedBox(result)
  }
  if (options.enabled !== true) return drop('DISABLED')
  if (!options.endpoint) return drop('NO_ENDPOINT')
  if (new TextEncoder().encode(payload).length > max) return drop('OVERSIZE')
  const fetchImpl = options.fetchImpl ?? fetch
  let response: Response
  try {
    response = await fetchImpl(`${options.endpoint.replace(/\/$/, '')}/compute`, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', 'X-Trinity-Mode': TRINITY_MODE },
      body: `box=${encodeURIComponent(payload)}`,
    })
  } catch {
    return drop('NETWORK')
  }
  let json: unknown
  try {
    json = await response.json()
  } catch {
    return drop('MALFORMED')
  }
  if (!json || typeof json !== 'object' || !('accepted' in json)) return drop('MALFORMED')
  if ((json as { accepted?: boolean }).accepted === true) return checkedBox({ state: 'COMMITTED', receipt: { accepted: true } })
  const serverReason = (json as { reason?: unknown }).reason
  return drop('REJECTED', typeof serverReason === 'string' ? serverReason : undefined)
}
