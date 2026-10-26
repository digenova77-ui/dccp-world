/** Draft Unity agreement. One yes on this device. Not a Trinity seal and not a till.
 * Sound and haptics stay off until their own switches are used.
 */

export const AGREEMENT_ID = 'unity-agreement.draft.v2'

export const AGREEMENT = [
  { id: 'handle', text: 'A persistent pseudonymous handle is stored by your authenticator. It can sync. It is not issued by the Unity Network, and it is not a claim that it never leaves a device. No name, email, or document is collected.' },
  { id: 'wikipedia', text: 'When Iris has no reading, the question may be sent to Wikipedia. The page it used is shown.' },
  { id: 'location', text: 'This phone\'s location may be read to land the camera at human scale. The reading is not stored, not sent, and not given to the bots.' },
  { id: 'speech', text: 'If you choose Talk, your voice goes to this browser\'s speech service to become words. This world does not record it. The microphone still waits until you choose Talk.' },
  { id: 'join', text: 'Free to join and free to leave. Joining costs $0. Forgetting the handle on this device clears the agreement with it.' },
  { id: 'no-tribe', text: 'No tribe is preferred. Disagreement is not a reason to refuse a seat.' },
  { id: 'truth', text: 'Truth prevails. A claim that is bigger than the evidence does not win.' },
  { id: 'peg', text: 'A decision spends 1 unit of the test supply. That unit is the peg. It is not a dollar. The till is closed. What an object is worth has not been pegged.' },
] as const

const KEY = 'dccpworld.unity-agreement.v1'

export function agreementAccepted(): boolean {
  try { return localStorage.getItem(KEY) === AGREEMENT_ID } catch { return false }
}

export function acceptAgreement(): void {
  try { localStorage.setItem(KEY, AGREEMENT_ID) } catch { /* private mode */ }
}

export function clearAgreement(): void {
  try { localStorage.removeItem(KEY) } catch { /* private mode */ }
}
