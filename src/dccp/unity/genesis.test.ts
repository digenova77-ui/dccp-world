import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  GENESIS_PROTOCOL,
  deriveGenesisMark,
  genesisStatus,
  getFuseTime,
  recordFatherFuse,
  ensureGenesisAttestation,
  readGenesisLedger,
  verifyGenesisLedger,
  genesisMarkCopy,
  type BindStorage,
} from './genesis.ts'

function memStorage(): BindStorage {
  const store = new Map<string, string>()
  return {
    getItem: k => store.get(k) ?? null,
    setItem: (k, v) => { store.set(k, v) },
  }
}

const ID_A = 'unity:pilot.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const ID_B = 'unity:pilot.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const T1 = '2026-10-01T10:00:00.000Z'
const T2 = '2026-10-02T10:00:00.000Z'
const FUSE = '2026-10-03T10:00:00.000Z'

test('mark derivation is deterministic: one ID, one mark', async () => {
  const m1 = await deriveGenesisMark(ID_A)
  const m2 = await deriveGenesisMark(ID_A)
  assert.equal(m1, m2)
  assert.match(m1, /^[0-9a-f]{64}$/)
})

test('mark is non-transferable: different IDs, different marks', async () => {
  const ma = await deriveGenesisMark(ID_A)
  const mb = await deriveGenesisMark(ID_B)
  assert.notEqual(ma, mb)
})

test('protocol constant is dualis.genesis.v1', () => {
  assert.equal(GENESIS_PROTOCOL, 'dualis.genesis.v1')
})

test('pre-fuse: bound IDs are genesis, cohort open', () => {
  const s = memStorage()
  const st = genesisStatus(ID_A, T1, s)
  assert.equal(st.state, 'GENESIS')
  assert.equal(st.cohort, 'open')
  assert.equal(genesisMarkCopy(st), 'GENESIS · cohort open — bound before the fuse')
})

test('fuse-close: first fuse wins, later calls are no-ops', () => {
  const s = memStorage()
  assert.equal(getFuseTime(s), null)
  assert.equal(recordFatherFuse(FUSE, s), true)
  assert.equal(getFuseTime(s), FUSE)
  assert.equal(recordFatherFuse('2026-11-01T00:00:00.000Z', s), false)
  assert.equal(getFuseTime(s), FUSE)
})

test('post-fuse: bound-before is genesis, bound-after is standard', () => {
  const s = memStorage()
  recordFatherFuse(FUSE, s)
  const g = genesisStatus(ID_A, T1, s)
  assert.equal(g.state, 'GENESIS')
  assert.equal(g.cohort, 'closed')
  assert.equal(genesisMarkCopy(g), 'GENESIS · bound before the Father fuse')
  const std = genesisStatus(ID_B, '2026-10-04T10:00:00.000Z', s)
  assert.equal(std.state, 'STANDARD')
  assert.equal(std.cohort, 'closed')
  assert.equal(genesisMarkCopy(std), null)
})

test('attestation is idempotent: one ID, one ledger entry', async () => {
  const s = memStorage()
  const e1 = await ensureGenesisAttestation(ID_A, T1, s)
  const e2 = await ensureGenesisAttestation(ID_A, T1, s)
  assert.ok(e1 && e2)
  assert.equal(e1.entry_hash, e2.entry_hash)
  assert.equal(e1.seq, e2.seq)
  assert.equal(readGenesisLedger(s).length, 1)
})

test('ledger orders IDs by bind and chains hashes', async () => {
  const s = memStorage()
  const e1 = await ensureGenesisAttestation(ID_A, T1, s)
  const e2 = await ensureGenesisAttestation(ID_B, T2, s)
  assert.ok(e1 && e2)
  assert.equal(e1.seq, 1)
  assert.equal(e2.seq, 2)
  assert.equal(e2.prev_hash, e1.entry_hash)
  assert.equal(e2.mark, await deriveGenesisMark(ID_B))
  const v = await verifyGenesisLedger(s)
  assert.equal(v.ok, true)
  assert.equal(v.entries, 2)
})

test('post-fuse: bound-after IDs are never recorded', async () => {
  const s = memStorage()
  recordFatherFuse(FUSE, s)
  const e = await ensureGenesisAttestation(ID_B, '2026-10-04T10:00:00.000Z', s)
  assert.equal(e, null)
  assert.equal(readGenesisLedger(s).length, 0)
})

test('tampered ledger fails verification', async () => {
  const s = memStorage()
  await ensureGenesisAttestation(ID_A, T1, s)
  await ensureGenesisAttestation(ID_B, T2, s)
  const raw = JSON.parse(s.getItem('dccpworld.genesis-ledger.v1')!)
  raw[0].unity_id = ID_B // tamper: rewrite history
  s.setItem('dccpworld.genesis-ledger.v1', JSON.stringify(raw))
  const v = await verifyGenesisLedger(s)
  assert.equal(v.ok, false)
  assert.equal(v.failedAt, 1)
})

test('bot and human IDs get the identical offer: no kind field, no privilege', async () => {
  const s = memStorage()
  // The protocol takes only (unity_id, bound_at). A bot ID is just an ID.
  const botId = 'unity:pilot.bot0000000000000000000000000000'
  const e = await ensureGenesisAttestation(botId, T1, s)
  assert.ok(e)
  assert.ok(!('kind' in e))
  const st = genesisStatus(botId, T1, s)
  assert.equal(st.state, 'GENESIS')
  // Standing never weight: the entry carries no weight, rank, or privilege.
  const keys = Object.keys(e).sort()
  assert.deepEqual(keys, ['at', 'bound_at', 'entry_hash', 'mark', 'prev_hash', 'seq', 'unity_id'])
})
