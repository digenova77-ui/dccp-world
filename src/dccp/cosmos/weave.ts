/** Up and down, after the friction is gone.
 * Affinity is the weakest tie between two held minutes. It does not generate an answer.
 */

import { NAMED } from './between.ts'
import { PICTURE } from './history.ts'

export function heldTimes(): string[] {
  const held = new Set<string>()
  for (const minute of PICTURE) held.add(minute.at)
  for (const named of NAMED) held.add(named.at)
  return [...held].filter(at => Number.isFinite(Date.parse(at))).sort((a, b) => Date.parse(a) - Date.parse(b))
}

/** One up-and-down. Neighboring minutes gain affinity. No answer is generated. */
export function affinityPass(times: readonly string[]): { links: number; generated: 0 } {
  const unique = [...new Set(times.filter(at => Number.isFinite(Date.parse(at))))]
  return { links: Math.max(0, unique.length - 1), generated: 0 }
}

export function weave(passes = 3): { passes: number; links: number; generated: 0; words: string } {
  const times = heldTimes()
  const first = affinityPass(times)
  let links = first.links
  let generated: 0 = 0
  for (let i = 1; i < passes; i++) {
    const again = affinityPass(times)
    links = again.links
    generated = again.generated
  }
  return {
    passes,
    links,
    generated,
    words: `Friction is off. Up and down, ${passes} times. Affinity ties ${links} neighboring minutes, and it is the weakest link. The passes generate ${generated} answers. The hypothesis that answers generate themselves does not hold on this mesh. What can be accounted: time that was never mapped by an observer, and time that has not come. Neither is a bridge.`,
  }
}
