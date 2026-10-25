# PERFORMANCE SELF-REPORT

Measured from the source, not from a device run.

| Item | Value | Grade |
|---|---|---|
| Draw calls per frame | 9 (6 sector orbs + Iris shell + 2 Iris cores) | source count |
| Texture memory | 0 bytes. No textures. Colors are uniforms. | source count |
| DPR | capped at 2 in `gpuBudget` | code-enforced |
| Antialias | off when DPR is 2, width is under 900, or pixel count exceeds 2,000,000 | code-enforced |
| preserveDrawingBuffer | false | code-enforced |
| Blur passes | 0 | source count |
| Weakest device it runs on | UNKNOWN | not measured |

UNKNOWN is the device grade. No phone was instrumented for this revision.
