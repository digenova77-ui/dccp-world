/** Entanglement swapping. A Bell measurement on the inner pair entangles the outer pair.
 * This record has not run it.
 */

export function swappingProtocol(): string {
  return [
    'Start with two separate Bell pairs. Call them A with a, and B with b. A is entangled with a. B is entangled with b. A is not entangled with B.',
    'Measure a and b together, in the Bell basis. That uses up both pairs. The two-bit result says which correction to apply, and A and B are then entangled with each other. They never had to meet.',
    'This is the Bennett teleportation protocol, with the teleported state itself one half of a pair. Żukowski, Zeilinger, Horne, and Ekert described the swap in 1993. A quantum repeater chains swaps so a pair can be extended. Noise is handled by purification, which spends more pairs.',
    'Nothing is signaled faster than the two bits. Two ebits go in and one outer ebit comes out. This record has no pairs and no Bell counts.',
    'It does not solve the current blueprint.',
  ].join(' ')
}
