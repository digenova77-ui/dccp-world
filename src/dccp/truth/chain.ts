/** The current blueprint is the only one you can read.
 * The next one is locked until this one is solved by a source.
 */

import { gapObjects, type BlueprintObject } from './objects.ts'

const LIVE = ['Station', 'Kp', 'Grid', 'Air', 'River']

function ordered(objects: readonly BlueprintObject[]): BlueprintObject[] {
  return [...objects].sort((a, b) => {
    const ar = LIVE.indexOf(a.name)
    const br = LIVE.indexOf(b.name)
    return (ar < 0 ? LIVE.length : ar) - (br < 0 ? LIVE.length : br)
  })
}

export function spendUnlocks(spent: number): false {
  void spent
  return false
}

export function chain(satisfied: ReadonlySet<string> = new Set(), convinced = false): { current: BlueprintObject | null; nextLocked: true; sealed: number; unlocked: number; hud: string; words: string } {
  void convinced
  const rows = ordered(gapObjects())
  const open = rows.filter(row => !satisfied.has(row.name))
  const current = open[0] ?? null
  const unlocked = rows.length - open.length
  const sealed = current ? open.length - 1 : 0
  const hud = current
    ? `Current blueprint: ${current.name}. The next one is locked until this is solved. Lost time is not made up.`
    : 'No blueprint is left open. Lost time is still not made up.'
  const words = current
    ? `The current blueprint is ${current.name}. ${current.blueprint} The next blueprint is locked until this one is solved. It is not shown. ${sealed} stay behind that lock. A conviction does not solve it. A source that meets the condition does. A bot can spend, and the spend does not solve it. Lost time is not made up. The work is to not lose the next second.`
    : 'Nothing is waiting. Lost time is not made up.'
  return { current, nextLocked: true, sealed, unlocked, hud, words }
}
