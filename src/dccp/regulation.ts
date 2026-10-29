/**
 * Checks only. Nothing here moves a coin, sets a cap, or fills a held digit.
 * Free authority is the cap minus emitted minus what the reserve still holds.
 * A release returns held units. It does not create units. Winter at rest is
 * full scale and does not read a floor. A moving winter with no floor stays
 * UNSET. A floor of zero would stop emission, so it is a hole.
 */

export type Check =
  | { ok: true; value: number; grade: 'PROPOSED'; scope: 'SANDBOX'; settles: false }
  | { ok: false; reason: 'UNSET' | 'HOLE' }

function whole(n: number | null): n is number {
  return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0
}

/** Cap minus emitted minus reserve. Books that already overlap are a hole. */
export function freeAuthority(cap: number | null, emitted: number | null, reserve: number | null): Check {
  if (cap == null || emitted == null || reserve == null) return { ok: false, reason: 'UNSET' }
  if (!whole(cap) || !whole(emitted) || !whole(reserve)) return { ok: false, reason: 'HOLE' }
  if (emitted + reserve > cap) return { ok: false, reason: 'HOLE' }
  return { ok: true, value: cap - emitted - reserve, grade: 'PROPOSED', scope: 'SANDBOX', settles: false }
}

/** A payment fits only in free authority. The books are not written. */
export function admitDisburse(cap: number | null, emitted: number | null, reserve: number | null, amount: number | null): Check {
  const free = freeAuthority(cap, emitted, reserve)
  if (!free.ok) return free
  if (amount == null) return { ok: false, reason: 'UNSET' }
  if (!whole(amount) || amount === 0) return { ok: false, reason: 'HOLE' }
  if (amount > free.value) return { ok: false, reason: 'HOLE' }
  return { ok: true, value: amount, grade: 'PROPOSED', scope: 'SANDBOX', settles: false }
}

/**
 * Gross room is free authority plus the reserve. The release cannot exceed
 * the reserve, and disbursable + release cannot exceed gross.
 */
export function releaseRoom(
  free: number | null,
  reserve: number | null,
  disbursable: number | null,
  requested: number | null,
): Check {
  if (free == null || reserve == null || disbursable == null || requested == null) return { ok: false, reason: 'UNSET' }
  if (!whole(free) || !whole(reserve) || !whole(disbursable) || !whole(requested)) return { ok: false, reason: 'HOLE' }
  if (disbursable > free) return { ok: false, reason: 'HOLE' }
  const gross = free + reserve
  if (!Number.isSafeInteger(gross)) return { ok: false, reason: 'HOLE' }
  const headroom = gross - disbursable
  const released = Math.min(requested, reserve, headroom)
  if (disbursable + released > gross) return { ok: false, reason: 'HOLE' }
  return { ok: true, value: released, grade: 'PROPOSED', scope: 'SANDBOX', settles: false }
}

/**
 * Parts per million. Gradient 0 is summer and does not read the floor.
 * A higher gradient with no floor is UNSET. Floor 0 would stop emission.
 */
export function winterThrottle(gPpm: number | null, floorPpm: number | null): Check {
  if (gPpm == null) return { ok: false, reason: 'UNSET' }
  if (!Number.isInteger(gPpm) || gPpm < 0 || gPpm > 1_000_000) return { ok: false, reason: 'HOLE' }
  if (gPpm === 0) return { ok: true, value: 1_000_000, grade: 'PROPOSED', scope: 'SANDBOX', settles: false }
  if (floorPpm == null) return { ok: false, reason: 'UNSET' }
  if (!Number.isInteger(floorPpm) || floorPpm <= 0 || floorPpm > 1_000_000) return { ok: false, reason: 'HOLE' }
  const scale = 1_000_000 - Math.floor((gPpm * (1_000_000 - floorPpm)) / 1_000_000)
  if (scale <= 0) return { ok: false, reason: 'HOLE' }
  return { ok: true, value: scale, grade: 'PROPOSED', scope: 'SANDBOX', settles: false }
}
