/** The Universal RTE construct. Iris draws a room from a request.
 * She only uses lines the record already holds. An unknown request stays an empty room.
 */

export interface ConstructScene {
  title: string
  lines: string[]
  empty: boolean
  /** The determined plate this drawing branches from. The plate itself does not move. */
  from?: { kind: string; key: string }
  /** An Earth place this room can fly to. A lunar seed does not set one. */
  pin?: { lat: number; lon: number }
  /** The truth mesh, drawn with time along the length. */
  form?: 'mesh'
  steps?: number
  joints?: { end: boolean; grade?: 'two' | 'one' | 'conflict' }[]
  ties?: { from: number; to: number }[]
  shell?: { from: number; to: number }[]
  unknown?: { from: number; to: number }[]
}

const DRAW = /^(?:please |can you |could you )?(?:show me|i want to look at|i want to see|let me see|draw me|draw|load|construct|build me|put me in)\s+(?:a |an |the )?(.+?)\s*$/

export function drawRequest(utterance: string): string | null {
  const m = utterance.trim().toLowerCase().match(DRAW)
  if (!m) return null
  const subject = m[1].replace(/[?.!]+$/g, '').trim()
  return subject || null
}

export function sceneFrom(title: string, body: string[], from?: { kind: string; key: string }): ConstructScene {
  const lines = body.map(line => line.replace(/\s+/g, ' ').trim()).filter(Boolean).slice(0, 40)
  return { title: title.trim() || 'Untitled', lines, empty: false, from }
}

export function emptyScene(): ConstructScene {
  return { title: 'Empty', lines: [], empty: true }
}

let drawn: ConstructScene = emptyScene()

export function rememberConstruct(scene: ConstructScene): void {
  drawn = scene
}

export function drawnConstruct(): ConstructScene {
  return drawn
}
