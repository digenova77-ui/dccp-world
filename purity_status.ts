// Purity status — canonical emission (estate.purity.v1).
//
// ADOPTION.md Step 7 retirement (disposition D-T3-7, option A — native
// canonical emission): this surface now emits the canonical shape
// natively — schema "estate.purity.v1", protocol exactly "PURITY.v1"
// — instead of the legacy dialect string "DCCP_WORLD.PURITY.v1". The
// legacy string and this dialect's unique fields are preserved under
// dialect_extras; nothing is deleted. A static literal asserts; it
// probes nothing, so every grade is REPORTED, never measured.
// Field set mirrors canon_registry/purity_canonical.py
// emit_canonical() in the canon-registry.
export const status = {
  schema: "estate.purity.v1",
  dialect: "canonical",
  protocol: "PURITY.v1",
  source_protocol: "PURITY.v1",
  law: "LAW WINS",
  boundary: "NOT_FOR_EMISSION",
  emission: "HELD",
  unknown_never_pass: true,
  unknown_never_pass_evidence: "native_declaration",
  field_grades: {
    law: "REPORTED",
    boundary: "REPORTED",
    emission: "REPORTED",
    unknown_never_pass: "REPORTED"
  },
  dialect_extras: {
    legacy_protocol: "DCCP_WORLD.PURITY.v1",
    role: "atlas_and_observation"
  },
  translation_grade: "NATIVE",
  translation_losses: [],
  tripwires: []
};
