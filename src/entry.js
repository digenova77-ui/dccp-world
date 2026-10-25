/**
 * World entry. The world opens only from a HUD handoff.
 * A browse with no handoff record stays shut.
 */
export const HANDOFF_KEY = "dccp.world.handoff";

export function readHandoff(storage) {
  if (!storage) return null;
  const raw = storage.getItem(HANDOFF_KEY);
  if (!raw) return null;
  try {
    const record = JSON.parse(raw);
    if (record && record.accepted === true && record.protocol === "DCCP/2" && record.from === "hud" && record.verify === "webauthn") {
      return record;
    }
    return null;
  } catch {
    return null;
  }
}

export function acceptHandoff(storage, record) {
  if (!storage || !record || record.accepted !== true) return false;
  storage.setItem(HANDOFF_KEY, JSON.stringify({
    protocol: "DCCP/2",
    accepted: true,
    from: "hud",
    verify: "webauthn",
    at: record.at || new Date().toISOString()
  }));
  return true;
}
