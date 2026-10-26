/** One ice room. Any age, any level, any cut is a way of looking.
 * The written seat in the record is still U16 AAA. A cut with no feed stays a search.
 * GameSheet and Huddle are not connected. No minor's name, and no invented stat.
 * Every look is audited. The audit has no off switch.
 */

import { judge, type Grain } from '../truth/state.ts'
import { noDataYet, gapLine } from '../iris/nodata.ts'

export type Bench = 'player' | 'coach'
export type Situation = 'all' | 'power-play' | 'penalty-kill'

export interface IceRoom {
  title: string
  lines: string[]
  speech: string
}

export interface IceAudit {
  sequence: number
  cut: string
  situation: Situation
}

interface Slot {
  situation: Situation
  label: string
}

const SLOTS: readonly Slot[] = [
  { situation: 'all', label: 'Ice time' },
  { situation: 'all', label: 'Shots' },
  { situation: 'all', label: 'Faceoffs' },
  { situation: 'power-play', label: 'Entries with the man advantage' },
  { situation: 'power-play', label: 'Chances on the power play' },
  { situation: 'penalty-kill', label: 'Clears on the kill' },
  { situation: 'penalty-kill', label: 'Entries against while short-handed' },
]

const FEED: Grain = {
  id: 'ice-feeds',
  statement: 'GameSheet and Huddle are not connected, so no live game is coming in.',
  sources: ['This build opens no GameSheet or Huddle socket.'],
  disproofs: [],
}

const RECORD = 'The written seat in the record is U16 AAA. That does not limit the look.'

let role: Bench | null = null
let situation: Situation = 'all'
let cut = 'All ages, all levels'
const audit: IceAudit[] = []

export function resetIce(): void {
  role = null
  situation = 'all'
  cut = 'All ages, all levels'
}

export function iceAudit(): readonly IceAudit[] {
  return audit
}

export function iceLook(): { cut: string; situation: Situation; looks: number } {
  return { cut, situation, looks: audit.length }
}

function aboutIce(text: string): boolean {
  return /\bhockey\b|\brink\b|\bice\b|\bu\d{1,2}\b|\baaa\b|\bhouse\b|\bgamesheet\b|\bhuddle\b|\bpower ?play\b|\bpenalty kill|\ball ages\b|\ball levels\b/.test(text)
}

function readCut(text: string): string | null {
  if (/\ball ages\b|\ball levels\b|\beverything\b|\beverywhere\b/.test(text)) return 'All ages, all levels'
  const age = text.match(/\bu\d{1,2}\b/)
  const level = text.match(/\b(?:aaa|aa|house|junior|senior)\b/)
  if (!age && !level) return null
  return `${(age?.[0] ?? 'all ages').toUpperCase()} ${(level?.[0] ?? 'all levels').toUpperCase()}`
}

export function iceRoom(text: string): IceRoom | null {
  const t = text.toLowerCase()
  if (!aboutIce(t)) return null
  if (/\bcoach\b/.test(t)) role = 'coach'
  else if (/\bplayer\b/.test(t)) role = 'player'
  const named = readCut(t)
  if (named) cut = named
  if (/power ?play/.test(t)) situation = 'power-play'
  else if (/penalty kill/.test(t)) situation = 'penalty-kill'
  else if (/\bhockey\b|\brink\b|\bice\b|\ball ages\b|\ball levels\b/.test(t)) situation = 'all'

  audit.push({ sequence: audit.length + 1, cut, situation })

  const slots = SLOTS.filter(slot => situation === 'all' || slot.situation === situation)
  const grains: Grain[] = slots.map(slot => ({ id: slot.label, statement: slot.label, sources: [], disproofs: [] }))
  const held = grains.filter(grain => judge(grain).state === 'held')
  const who = role === 'coach' ? 'Coach' : role === 'player' ? 'Player' : 'No bench named'
  const scope = situation === 'power-play' ? 'Power play only. Every other cut is still a way in.' : situation === 'penalty-kill' ? 'Penalty kill only. Every other cut is still a way in.' : 'The whole game. Any age, any level, any situation.'
  const suggestion = held.length
    ? 'A suggestion can be cited from what is held.'
    : noDataYet(true, new Date(), `Ice · ${cut}`)
  const lines = [
    `One ice room. This look: ${cut}.`,
    RECORD,
    `${who}. ${scope}`,
    ...grains.map(grain => gapLine(`Ice · ${grain.statement}`)),
    `Held. ${FEED.statement}`,
    suggestion,
    `Audited. Look ${audit.length}. The audit does not turn off.`,
    'No minor\'s name is in this room. Biometrics are zeroized after the game, as the ice record says.',
  ]
  const speech = `One ice room. This look is ${cut}. ${scope} ${RECORD} ${who === 'No bench named' ? 'Say if you are a player or a coach.' : `You are in as a ${role}.`} ${suggestion} GameSheet and Huddle are not connected. Look ${audit.length} is on the audit, and the audit does not turn off. The landing stays. This is an offshoot. I did not invent a stat.`
  return { title: 'Ice', lines, speech }
}
