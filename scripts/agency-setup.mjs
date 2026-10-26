import { createHash, randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const STORE = new URL('../agency_keys.json', import.meta.url)
const agency = process.argv[2] ?? 'External_Research_Swarm_Alpha'
const clearance = process.argv[3] ?? 'STANDARD'

const keys = existsSync(STORE) ? JSON.parse(readFileSync(STORE, 'utf8')) : {}
const already = Object.values(keys).find(row => row.agency_name === agency && row.status === 'ACTIVE')
if (already) {
  console.log(JSON.stringify({
    agency,
    already: true,
    clearance: already.clearance,
    endpoint_wss: null,
    note: 'An active key for this agency is already stored. The secret is not printed again. The socket is not live.',
  }, null, 2))
  process.exit(0)
}

const rawSecret = randomBytes(32).toString('hex')
const apiKey = `dc_live_${randomBytes(18).toString('base64url')}`
const record = {
  agency_name: agency,
  key_hash: createHash('sha256').update(apiKey).digest('hex'),
  secret_hash: createHash('sha256').update(rawSecret).digest('hex'),
  clearance,
  status: 'ACTIVE',
  protocol: 'not-live',
  timestamp: new Date().toISOString(),
}
keys[record.key_hash] = record
writeFileSync(STORE, JSON.stringify(keys, null, 2))
console.log(JSON.stringify({
  agency,
  assigned_api_key: apiKey,
  secret_token: rawSecret,
  endpoint_wss: null,
  clearance,
  note: 'Shown once. The store keeps only hashes. No socket is open.',
}, null, 2))
