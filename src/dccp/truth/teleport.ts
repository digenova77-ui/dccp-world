/** The Bennett protocol. A state moves only after two classical bits arrive.
 * This record has not run it.
 */

export function teleportProtocol(): string {
  return [
    'The 1993 protocol of Bennett, Brassard, Crépeau, Jozsa, Peres, and Wootters uses one shared Bell pair and a classical message.',
    'Alice holds an unknown qubit. She measures it together with her half of the pair, in the Bell basis. That yields two bits and destroys her copy. She sends the two bits on an ordinary channel. Bob applies one of four Pauli corrections, and his half then carries the state.',
    'The state is not copied. The pair is used up. Nothing in the qubit arrives before the two bits, so the protocol does not outrun light.',
    'Without a shared pair, the best average fidelity for an unknown qubit is 2/3. With a perfect pair it can be 1. A laboratory reports the fidelity it measured. This record has no pair, no Bell counts, and no fidelity.',
    'A camera flight is not this protocol. It does not solve the current blueprint.',
  ].join(' ')
}
