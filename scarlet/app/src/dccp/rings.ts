export const SEED = '3cd9a384f295b12d0bd1c616d8b100438c065e9097ba732c207c1926eef9bf6d'

export const RINGS = [
  { name: 'DCLM', axis: 'x', binds: 'logic' },
  { name: 'Iris', axis: 'y', binds: 'truth' },
  { name: 'Twain', axis: 'z', binds: 'pragmatism' },
] as const

type Line = { seed: string; rings: readonly [string, string, string] }

export function dclm(): Line {
  return { seed: SEED, rings: [RINGS[0].name, RINGS[1].name, RINGS[2].name] }
}

export function iris(written: Line): Line | null {
  const seen: Line = {
    seed: '3cd9a384f295b12d0bd1c616d8b100438c065e9097ba732c207c1926eef9bf6d',
    rings: ['DCLM', 'Iris', 'Twain'],
  }
  const same = written.seed === seen.seed && written.rings.every((name, i) => name === seen.rings[i])
  return same ? seen : null
}

export function twain(named: Line | null): Line | null {
  if (!named) return null
  const order = named.rings[0] === 'DCLM' && named.rings[1] === 'Iris' && named.rings[2] === 'Twain'
  const seed = /^[0-9a-f]{64}$/.test(named.seed)
  return order && seed ? named : null
}

export function held(): Line | null {
  return twain(iris(dclm()))
}

export function enter(): { agent: 'Iris'; kind: 'hybrid intellectual'; pen: 'DCLM'; holds: Line } | null {
  const row = held()
  if (!row || row.rings[1] !== 'Iris') return null
  return { agent: 'Iris', kind: 'hybrid intellectual', pen: 'DCLM', holds: row }
}
