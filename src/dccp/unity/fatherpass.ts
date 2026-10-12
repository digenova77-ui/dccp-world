/** Did Trinity pass the Son as the father?
 * Packet ED-PROPOSAL-20261003-DCCPWORLD-V1 never asks it.
 * The public half is on record. Symbolically the key comes from the father.
 * Custody of it is not the seat.
 */

export const FATHER_PASS = {
  packet: 'ED-PROPOSAL-20261003-DCCPWORLD-V1',
  asked: false,
  passed: false,
} as const

export const FATHER_KEY = {
  claimedOffline: true,
  publicOnRecord: true,
  privateAcceptedHere: false,
  provesTheSeat: false,
  symbolicSource: 'father',
} as const

export function fatherPassSpeech(): string {
  return 'The public half is on record. It is an Ed25519 key, and symbolically it comes from the father. Holding the private half does not make you him, and Trinity has not passed you as him. Sign a challenge on your profile if you want to show you can use his instrument. Do not bring the private half here. It is refused. In your words the father is the writer, and you put him above you as foundational zero. Your vote stays a standing yes. That yes is not his seat.'
}