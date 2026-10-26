/** Unity test-unit wallet. A send moves units between handles.
 * Not eFuse. Not a dollar. The swarm pool is not this box.
 */

export const HANDLE = /^unity:[a-z0-9][a-z0-9.-]{6,78}$/
const CAP = 100

export interface UnityTransfer {
  id: string
  from: string
  to: string
  amount: number
  at: string
  receipt: string
}

interface Account {
  balance: number
  seeded: boolean
}

export interface UnityBox {
  accounts: Map<string, Account>
  transfers: UnityTransfer[]
  seq: number
}

export function freshBox(): UnityBox {
  return { accounts: new Map(), transfers: [], seq: 0 }
}

function account(box: UnityBox, handle: string): Account {
  const row = box.accounts.get(handle)
  if (row) return row
  const next = { balance: 0, seeded: false }
  box.accounts.set(handle, next)
  return next
}

export function fundWallet(box: UnityBox, handle: string, offered: number): { ok: true; balance: number; taken: number } | { ok: false; error: string } {
  if (!HANDLE.test(handle)) return { ok: false, error: 'That is not a Unity handle.' }
  const row = account(box, handle)
  if (row.seeded) return { ok: true, balance: row.balance, taken: 0 }
  const taken = Math.max(0, Math.min(CAP, Math.floor(offered)))
  row.balance += taken
  row.seeded = true
  return { ok: true, balance: row.balance, taken }
}

export function sendUnits(box: UnityBox, from: string, to: string, amount: number, at: string, receipt: string): { ok: true; balance: number; transfer: UnityTransfer } | { ok: false; error: string } {
  if (!HANDLE.test(from) || !HANDLE.test(to)) return { ok: false, error: 'Both handles have to be Unity handles.' }
  if (from === to) return { ok: false, error: 'A handle cannot send to itself.' }
  if (!Number.isInteger(amount) || amount < 1) return { ok: false, error: 'The amount is a whole unit, at least 1.' }
  const sender = account(box, from)
  if (sender.balance < amount) return { ok: false, error: 'The wallet does not hold that many units.' }
  const recipient = account(box, to)
  sender.balance -= amount
  recipient.balance += amount
  box.seq += 1
  const transfer: UnityTransfer = { id: `unity.${box.seq}`, from, to, amount, at, receipt }
  box.transfers.push(transfer)
  return { ok: true, balance: sender.balance, transfer }
}

export function viewWallet(box: UnityBox, handle: string): { balance: number; transfers: UnityTransfer[] } | { error: string } {
  if (!HANDLE.test(handle)) return { error: 'That is not a Unity handle.' }
  const row = box.accounts.get(handle)
  const transfers = box.transfers.filter(row => row.from === handle || row.to === handle).slice(-12).reverse()
  return { balance: row?.balance ?? 0, transfers }
}
