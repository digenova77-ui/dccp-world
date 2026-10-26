/** A drawn room becomes an adventure on one Unity ID.
 * Sharing mints a key. The room opens for whoever holds that key, and for no one else.
 * There is no password. Hide takes the key back to the owner. Both options stay.
 */

export type Pipe = 'share' | 'hide'

export interface Adventure {
  id: string
  owner: string
  title: string
  lines: string[]
  options: readonly ['share', 'hide']
  chosen: Pipe | null
  /** The room's only access. Null until it is shared. Not a password. */
  key: string | null
  holders: string[]
  /** Permanent in this Unity ID. A later drawing advances it. The id does not change. */
  generation: number
  prior: string[]
}

export interface View {
  open: boolean
  lines: string[]
}

const KEY = 'dccpworld.adventures.v1'
const OPTIONS = ['share', 'hide'] as const
let memory: Adventure[] = []

function read(): Adventure[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return (JSON.parse(raw) as Adventure[]).map(row => ({ ...row, key: row.key ?? null, holders: row.holders?.length ? row.holders : [row.owner], options: OPTIONS, generation: row.generation ?? 1, prior: row.prior ?? [] }))
  } catch { /* private mode or node */ }
  return memory
}

function write(rows: Adventure[]): void {
  memory = rows
  try { localStorage.setItem(KEY, JSON.stringify(rows)) } catch { /* keep memory */ }
}

export function listAdventures(): Adventure[] {
  return read()
}

export function framework(owner: string | null): Adventure[] {
  if (!owner) return []
  return read().filter(row => row.owner === owner)
}

export function latestAdventure(owner: string | null): Adventure | null {
  return framework(owner)[0] ?? null
}

/** The room stays. A changed drawing advances the generation and keeps the key. */
export function keepAdventure(owner: string, title: string, lines: string[]): Adventure {
  const rows = read()
  const prior = rows.find(row => row.owner === owner && row.title === title)
  const incoming = lines.slice(0, 8)
  const changed = prior ? incoming.join('\n') !== prior.lines.join('\n') : false
  const next: Adventure = {
    id: prior?.id ?? `${owner}:${title}`,
    owner,
    title,
    lines: incoming,
    options: OPTIONS,
    chosen: prior?.chosen ?? null,
    key: prior?.key ?? null,
    holders: prior?.holders ?? [owner],
    generation: prior ? prior.generation + (changed ? 1 : 0) : 1,
    prior: prior && changed ? prior.lines : prior?.prior ?? [],
  }
  const rest = rows.filter(row => row.id !== next.id)
  write([next, ...rest])
  return next
}

export function choosePipe(owner: string, pipe: string): Adventure | { error: string } {
  if (pipe !== 'share' && pipe !== 'hide') return { error: 'Those are not the two options.' }
  const current = latestAdventure(owner)
  if (!current) return { error: 'There is no adventure on this Unity ID yet. Ask Iris to draw a room first.' }
  const next: Adventure = pipe === 'share'
    ? { ...current, chosen: 'share', options: OPTIONS, key: current.key ?? `key:${current.id}`, holders: current.holders.includes(current.owner) ? current.holders : [current.owner, ...current.holders] }
    : { ...current, chosen: 'hide', options: OPTIONS, holders: [current.owner] }
  write(read().map(row => row.id === next.id ? next : row))
  return next
}

/** Hand the key to another Unity ID. Share has to be in effect. No password is asked. */
export function giveAdventureKey(owner: string, to: string): Adventure | { error: string } {
  const current = latestAdventure(owner)
  if (!current?.key || current.chosen !== 'share') return { error: 'There is no shared key to give. Share the adventure first.' }
  const holder = to.trim()
  if (!holder || holder === owner) return { error: 'Name the other Unity ID. The key is not a password.' }
  const next = { ...current, holders: current.holders.includes(holder) ? current.holders : [...current.holders, holder] }
  write(read().map(row => row.id === next.id ? next : row))
  return next
}

/** The key alone opens the room. The owner always holds it. */
export function seeAdventure(adventure: Adventure, viewer: string | null): View {
  if (viewer === adventure.owner) return { open: true, lines: [`Yours. ${adventure.title}. Generation ${adventure.generation}.`, pipeLine(adventure), ...adventure.lines] }
  if (viewer && adventure.chosen === 'share' && adventure.key && adventure.holders.includes(viewer)) return { open: true, lines: [`Opened by the key. ${adventure.title}.`, ...adventure.lines] }
  if (adventure.chosen === 'hide') return { open: false, lines: ['An adventure is here. It is hidden.'] }
  if (!viewer) return { open: false, lines: ['Bind a Unity ID. This room opens by a key, and there is no password.'] }
  return { open: false, lines: ['An adventure is here. You do not hold its key.'] }
}

function pipeLine(adventure: Adventure): string {
  if (adventure.chosen === null || !adventure.key) return 'Share and hide are both open. No key yet, and no password.'
  const other = adventure.chosen === 'share' ? 'hide' : 'share'
  return `In effect: ${adventure.chosen}. Still considered: ${other}. Key only. No password.`
}
