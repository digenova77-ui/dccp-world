# DCCP World

Third depth. Entered only from the HUD handoff. Contains no website.

## Open
The world stays shut unless `sessionStorage` holds an accepted `DCCP/2` handoff from `hud`.
`tools/handoff-harness.html` writes that record for a verifier. It is not the world.

## Files
See `MANIFEST.md`, `STATE.md`, `TOKENS.md`, and `PERFORMANCE.md`.

## Frozen
`purity_status.ts` is not revised. Boundary remains `NOT_FOR_EMISSION`.

## Test
```sh
node --test tests/world.test.mjs
```
