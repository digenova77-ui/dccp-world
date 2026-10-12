# DCCP World

The Unity/HUD world application — the interactive 3D world build for the
DualisCapax project.

## Architecture

This is a **3D (layered) architecture**, not a flat codebase:

- **Domain modules** under `src/dccp/`: `world`, `cosmos`, `explorer`,
  `pipe`, `rte`, `unity`, `engine`, `meter`, `live`, `ui`, `data`, `index`
- **Cross-cutting concerns** spanning all modules:
  - `trinity` — DCLM / Iris / Twain² verdict discipline
  - `truth` — evidence grading (`PROVEN` / `REPORTED` / `INFERRED` / `UNKNOWN`)
  - `ledger` — hash-chained records
  - `iris` — containment gates

Patterns repeated across layers (the Trinity review shape, the evidence
labels) are the architecture, not duplication. See `AGENTS.md` and the
`*_DESIGN.md` docs at the repo root for sealed design decisions.

## Develop

```sh
npm run dev      # serve on 0.0.0.0:8080
npm test         # full test suite
npm run typecheck
npm run build
```

See `AGENTS.md` for the full builder contract.
