/** Free things can be seen with no wallet. Everything else needs one.
 * The wallet is the Unity ID. It is how you view. It is not a purchase.
 * Children's events and the dark ledger are still not for sale.
 */

export interface ViewAsk {
  viewer: string | null
  owner: string
  belongs: boolean
  paid: boolean
}

export type Shelf = 'free' | 'data'

export function viewShelf(hasWallet: boolean, shelf: Shelf): { open: boolean; reason: string } {
  if (shelf === 'free') return { open: true, reason: 'This is free. The Earth is there to look at, and so is the fact that the landings exist. No wallet is required.' }
  if (!hasWallet) return { open: false, reason: 'This is not free. You need a wallet to view it. The wallet is your Unity ID. It does not buy a children\'s event, and it does not buy a database.' }
  return { open: true, reason: 'Your wallet is open, so you can view what is not free. A children\'s event still opens only if you own it or you belong to it. It is not for sale.' }
}

export function canView(ask: ViewAsk): { open: boolean; reason: string } {
  const inside = ask.viewer !== null && (ask.viewer === ask.owner || ask.belongs)
  if (ask.paid) return { open: false, reason: 'Access cannot be bought. A payment does not open a children\'s event or a dark ledger, and it does not sell a database of record.' }
  if (!ask.viewer) return { open: false, reason: viewShelf(false, 'data').reason }
  if (inside) return { open: true, reason: 'You own it, or you belong to it. Your wallet can view it. No payment was involved.' }
  return { open: false, reason: 'You do not own this and you do not belong to it. There is no way to buy in.' }
}

export function buyRecord(): { open: false; rows: never[]; reason: string } {
  return { open: false, rows: [], reason: canView({ viewer: 'buyer', owner: 'owner', belongs: false, paid: true }).reason }
}
