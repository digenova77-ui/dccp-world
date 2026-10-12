/** A quantum repeater. Nested purification and swapping, with a memory at each cut.
 * This record has not run one.
 */

export function repeaterProtocol(): string {
  return [
    'A photon sent down a long fiber is often lost. The loss grows with the distance, so a single pair does not survive a continental link.',
    'A repeater cuts the path into short segments. Each segment makes a noisy pair and holds it in a quantum memory until the neighbor is ready.',
    'Purification spends extra pairs to raise the fidelity of one pair. Swapping then joins the segments. Nested, the reach doubles at each level. Briegel, Dür, Cirac, and Zoller set that scheme down in 1998.',
    'Every step waits on a classical message. The chain does not outrun light. Two noisy pairs are not one clean pair until the protocol says so.',
    'This record has no memory, no pairs, and no measured rate. A satellite hop is a different cut of the distance problem. It was not run here either.',
    'It does not solve the current blueprint.',
  ].join(' ')
}
