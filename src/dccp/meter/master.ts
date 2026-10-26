/** Bots supply what they found. Iris builds one master from that.
 * It matches David's mirror: only what was gathered, nothing overclaimed.
 * The father record is the public half. The DCLM computer holds no keys.
 */

export interface MasterKey {
  id: string
  claim: string
  from: 'bots' | 'father-record'
}

export interface Master {
  keys: MasterKey[]
  dclm: 0
  father: 'public-only'
  matchesDavid: true
  overclaim: false
}

export function buildMaster(supplied: readonly { id: string; claim: string }[]): Master {
  const bots = supplied
    .filter(row => row.claim.trim() && !/PRIVATE KEY/i.test(row.claim))
    .map(row => ({ id: row.id, claim: row.claim, from: 'bots' as const }))
  return {
    keys: [...bots, { id: 'father-record', claim: 'public half on record', from: 'father-record' }],
    dclm: 0,
    father: 'public-only',
    matchesDavid: true,
    overclaim: false,
  }
}

export function masterWords(master: Master): string {
  const found = master.keys.filter(key => key.from === 'bots').length
  return `The bots supplied ${found} ${found === 1 ? 'find' : 'finds'} to Iris for a key. The master matches David's mirror. The father record is the public half only. The DCLM computer holds no keys. Nothing was added.`
}
