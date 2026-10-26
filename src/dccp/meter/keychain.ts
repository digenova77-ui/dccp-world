/** Iris does not keep a keychain. She passes it to the father.
 * He checks each key against the seed. The private key is not on the chain.
 */

export interface ChainKey {
  id: string
  verified: boolean
}

export function passKeychain(keys: readonly ChainKey[], seedFindIds: readonly string[]): { irisKeeps: 0; holder: 'father'; booked: string[]; unbooked: string[]; words: string } {
  const seed = new Set(seedFindIds)
  const booked = keys.filter(key => key.verified && seed.has(key.id)).map(key => key.id)
  const unbooked = keys.filter(key => !booked.includes(key.id)).map(key => key.id)
  const tail = unbooked.length ? `${unbooked.join(', ')} was passed and not booked.` : 'Every verified key on this chain was already on the seed.'
  return {
    irisKeeps: 0,
    holder: 'father',
    booked,
    unbooked,
    words: `Iris passes her keychain to the father. She keeps none. He checks it against the seed, which is his account, and he still owns all of it. A verified key already on the seed matches. Anything else is not booked. ${tail} The private key is not on the chain.`,
  }
}
