/** Entanglement metrics a laboratory can report.
 * This record has no density matrix, so none of them is a reading here.
 */

export function entanglementMetrics(): string {
  return [
    'Entanglement entropy. For a pure two-part state it is the von Neumann entropy of one part after the other is traced out. A product state scores 0. A two-qubit Bell state scores 1 ebit. That 1 is the definition of that state, not a measurement we made.',
    'Concurrence. For two qubits it runs from 0, separable, to 1, a Bell state. For a mixed state the Wootters value is max(0, λ1 − λ2 − λ3 − λ4) on a matrix built from the state. We do not have that matrix.',
    'Negativity. It is read from the negative eigenvalues of a partial transpose, so it can be used past two qubits. No transpose was taken here.',
    'CHSH. Local realistic models give a Bell parameter at most 2. Quantum mechanics allows up to 2√2. A laboratory reports the number from coincidence counts. This record has no counts.',
    'The landing entropy on the HUD is the spread of missing instruments. It is not an entanglement. The plate was not measured by any of these. None of them solves the current blueprint.',
  ].join(' ')
}
