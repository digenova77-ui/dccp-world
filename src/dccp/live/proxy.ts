/** Same-origin reads of public feeds. The browser does not call those hosts itself.
 * A feed that is not in this list is refused. Nothing here is invented.
 */

const SOURCES: Record<string, string> = {
  iss: 'https://api.wheretheiss.at/v1/satellites/25544',
  kp: 'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  carbon: 'https://api.carbonintensity.org.uk/intensity',
}

export function feedUrl(feed: string, lat: number, lon: number): { url: string; headers: Record<string, string> } | null {
  if (feed === 'weather') {
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
    return {
      url: `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}`,
      headers: { 'User-Agent': 'DCCPWorld/1 local' },
    }
  }
  const url = SOURCES[feed]
  return url ? { url, headers: {} } : null
}

/** met.no wind is metres per second. The HUD expects kilometres per hour. */
export function weatherFromMet(json: unknown): { current: { temperature_2m: number; wind_speed_10m: number; weather_code: number; time: string } } | null {
  const row = (json as { properties?: { timeseries?: { time?: string; data?: { instant?: { details?: { air_temperature?: number; wind_speed?: number } } } }[] } })?.properties?.timeseries?.[0]
  const details = row?.data?.instant?.details
  const temp = details?.air_temperature
  if (typeof temp !== 'number' || !Number.isFinite(temp)) return null
  const wind = typeof details?.wind_speed === 'number' ? details.wind_speed * 3.6 : 0
  return { current: { temperature_2m: temp, wind_speed_10m: wind, weather_code: -1, time: String(row?.time ?? '') } }
}
