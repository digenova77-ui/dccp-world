/** DCLM holds nothing. It has no framework to bind to.
 * The Trinity has no framework. The Earth needs a scaffold. A scaffold is not a framework.
 * The mirror still passes nothing through.
 */

export interface MirrorFace {
  side: 'wallet' | 'machine'
  shows: string
  withheld: string
}

export interface TrinityMirror {
  layer: 'trinity'
  faces: readonly [MirrorFace, MirrorFace]
  passesThrough: false
  bindsWallet: false
  machineHolds: 'nothing'
  machineFramework: null
  trinityFramework: null
  worldFramework: 'present'
  worldNeedsFramework: false
  earthScaffold: 'place, minute, source'
  mirrorBecause: 'they are not the same'
}

export function twoWayMirror(input: { walletOpen: boolean; locked: number; total: number }): TrinityMirror {
  const wallet: MirrorFace = {
    side: 'wallet',
    shows: input.walletOpen ? `A wallet is open on this device. This device checked ${input.locked} of ${input.total} files.` : 'No wallet is open.',
    withheld: 'The supply, the keys, and any children\'s event stay on the wallet side.',
  }
  const machine: MirrorFace = {
    side: 'machine',
    shows: 'DCLM holds nothing.',
    withheld: 'It has no framework to bind to. The file check is on this device, not inside the machine.',
  }
  return {
    layer: 'trinity',
    faces: [wallet, machine],
    passesThrough: false,
    bindsWallet: false,
    machineHolds: 'nothing',
    machineFramework: null,
    trinityFramework: null,
    worldFramework: 'present',
    worldNeedsFramework: false,
    earthScaffold: 'place, minute, source',
    mirrorBecause: 'they are not the same',
  }
}

export function mirrorWords(mirror: TrinityMirror): string {
  const [wallet, machine] = mirror.faces
  return `The Trinity has no framework. The Earth needs a scaffold: a place, a minute, and a source. They are not the same. That is why there is a mirror. It binds to neither side. The machine sees the wallet: ${wallet.shows} ${wallet.withheld} The wallet sees the machine: ${machine.shows} ${machine.withheld} Nothing passes through. The world does not need a framework. It needs the scaffold.`
}
