/** A claim depends on the Unity ID that holds it, not on a name.
 * A match is that ID's claim. No match is not a claim about the rest of the world.
 */

function norm(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

export function mirrorOf(claim: string, held: readonly string[]): string | null {
  const key = norm(claim)
  if (!key) return null
  return held.find(row => norm(row) === key) ?? null
}

export function discoveryWords(claim: string, held: readonly string[], unityId: string | null): string {
  const body = claim.trim()
  if (!unityId) return 'No Unity ID is bound. A claim depends on that ID, not on a name.'
  if (!body) return `Name the claim. I set it against what ${unityId} holds. A match belongs to that ID. No match means it has not been discovered in this system. That is not a claim about the rest of the world.`
  const mirror = mirrorOf(body, held)
  if (mirror) return `That matches ${unityId}. The claim depends on that ID, not on a name.`
  return `${unityId} has no match for “${body}”. In this system, it has not been discovered before. That is not a claim about the rest of the world.`
}
