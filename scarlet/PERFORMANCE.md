# PERFORMANCE SELF-REPORT

Grades are measured, modeled, or unknown. No number is borrowed from an earlier build. The only measured frame time is the `?perf` overlay, and this build did not open it.

- Draw calls, world: 11. Floor, gold ring, two strands, two bar meshes, one helix glow, Iris shell, two core glows, two cores. Modeled from the scene graph.
- Bars: 18, instanced, nine gold and nine aquamarine. Two draw calls. Not thinned. Their frame cost is UNKNOWN.
- Opening draw calls: 2, while it runs. 3500 points, 36 sprites. Modeled.
- Texture bytes: 0. Source. The opening loads nothing.
- Pixel-ratio cap: 2. Source.
- MSAA: off when `devicePixelRatio` is greater than 1. On when it is 1. Source.
- Blur passes: 0. No bloom chain. Source.
- `preserveDrawingBuffer`: false. Source.
- Opening scene code: 3784 bytes, `src/dccp/opening.ts`. Measured. Three.js is not in that count.
- Scene chunk: 538632 bytes. The previous cut's scene chunk was 532082 bytes. The difference is 6550 bytes. Measured. That difference is the bars, the meter, and the opening together.
- Frame interval: UNKNOWN.
- Weakest device: UNKNOWN.
