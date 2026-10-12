/** Browser calls for the live Unity wallet. The balance is on the server. */

export interface UnityView {
  handle: string
  balance: number
  transfers: { id: string; from: string; to: string; amount: number; at: string; receipt: string }[]
  error?: string
  taken?: number
  ok?: boolean
}

export async function unityOpen(handle: string, deposit: number): Promise<UnityView> {
  const res = await fetch('/api/unity-wallet', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ op: 'open', handle, deposit }),
  })
  return res.json() as Promise<UnityView>
}

export async function unitySend(from: string, to: string, amount: number): Promise<UnityView> {
  const res = await fetch('/api/unity-wallet', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ op: 'send', from, to, amount }),
  })
  return res.json() as Promise<UnityView>
}

export async function unityRead(handle: string): Promise<UnityView> {
  const res = await fetch(`/api/unity-wallet?handle=${encodeURIComponent(handle)}`)
  return res.json() as Promise<UnityView>
}
