import { crossPurity } from '../truth/purity.ts'
import { scaleLine } from '../cosmos/scale.ts'

/** What belongs on screen at this height. Country facts are the record.
 * Provincial lines exist only for the Canadian scopes we actually hold.
 * Planet-scale feeds are not pasted onto a city.
 */

export type BandTier = 'street' | 'civil' | 'cloud' | 'orbit' | 'cosmic'

export interface BandInput {
  tier: BandTier
  country: { name: string; a3: string; pop: number; popYear?: string | number } | null
  city: string | null
  province: { name: string; guard: string } | null
  quakesHere: number
  issAltKm: number | null
  kp: number | null
  carbon: number | null
}

export function scaleBand(input: BandInput): { title: string; lines: string[] } {
  if (input.tier === 'cosmic') return { title: 'Cosmic', lines: ['Past the world. A city reading would be the wrong instrument.', scaleLine(), 'The Trinity still grounds it.'] }
  if (input.tier === 'orbit') {
    const lines = [
      input.issAltKm !== null ? `Station ${Math.round(input.issAltKm)} km up` : 'Station reading not in',
      input.kp !== null ? `Kp ${input.kp.toFixed(1)}` : 'Kp not in',
      input.carbon !== null ? `Grid ${Math.round(input.carbon)} gCO₂/kWh` : 'Grid intensity not in',
    ]
    return { title: 'Planet', lines }
  }
  if (input.tier === 'cloud') {
    if (!input.country) return { title: 'Country', lines: ['Open water, or a border this map does not name.'] }
    return {
      title: input.country.name,
      lines: [
        `People ${input.country.pop.toLocaleString('en-US')}${input.country.popYear ? ` (${input.country.popYear})` : ''}. A record, not a live count.`,
        'The color on the map is that count. Cooler is fewer people. Warmer is more.',
        crossPurity(input.country.pop, []).words,
        input.quakesHere ? `${input.quakesHere} quakes here in the last day` : 'No quake in this country in the last day',
      ],
    }
  }
  if (input.tier === 'civil' && input.country?.a3 === 'CAN' && input.province) {
    return { title: input.province.name, lines: [input.province.guard, 'Provincial scope. No patient record is loaded.', 'The discs are cities in this country, colored by the map population.', crossPurity(input.country?.pop ?? null, []).words] }
  }
  if (input.city) return { title: input.city, lines: ['Human scale shows the place, not a file on the people.', 'The discs are cities in this country, colored by the map population.', crossPurity(input.country?.pop ?? null, []).words] }
  return { title: 'Here', lines: ['No city in the map under this point.'] }
}
