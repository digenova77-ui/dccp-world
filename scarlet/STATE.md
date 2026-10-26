# STATE DECLARATION

Base commit: `a350746b51e8839cc2e5addb4b0e346c49905edd`.

The new scene chunk is `scarlet/cut/scene-Dok2Pn7w.js`, sha256 `d17457389bad4360588a7ef8cc2aee8f1f3501a65184e9304b8ff5b3f8324ffc`. A second build from this same source reproduced that hash. The shell beside it is `index-DAyli9D-.js`, sha256 `a4f7f451984755bea6efdb0076fa8f790cb181ee249e5ce9ddefcdf13a5b78f4`. The old hosted file `scarlet/hosted/index-BZqyS948.js` is untouched and still `ac02eb7d026c6b1c2169e0c59283d52574335d6ddc958d25ead986f10fa88cc9`.

`src/dccp/handoff.ts` was not edited. Gate diff is zero.

`purity_status.ts` was not edited.

Zoom. The camera height moves continuously. The rung is the nearest of the ten heights in log space. The card is always that one rung. It is never a blend. A ladder button sets the height to that rung's height. The boundary is the log midpoint:

| Rung | Height m | From m | To m |
|---|---:|---:|---:|
| LOCAL | 1.7 | 0 | 45.16635916254486 |
| MUNICIPAL | 1200 | 45.16635916254486 | 5477.225575051666 |
| REGIONAL | 25000 | 5477.225575051666 | 70710.67811865483 |
| PROVINCIAL | 200000 | 70710.67811865483 | 565685.4249492377 |
| NATIONAL | 1600000 | 565685.4249492377 | 3098386.6769659356 |
| INTERNATIONAL | 6000000 | 3098386.6769659356 | 12000000.000000011 |
| PLANETARY | 24000000 | 12000000.000000011 | 2190890230.0206633 |
| SOLAR | 200000000000 | 2190890230.0206633 | 9999999999999964 |
| GALACTIC | 5e20 | 9999999999999964 | 2.236067977499794e23 |
| COSMIC | 1e26 | 2.236067977499794e23 | none |

LOCAL and REGIONAL. No point: both empty. A point selects the nearest city inside 40 km. LOCAL then names that city and its three nearest other city records, with distances rounded to integer kilometres. REGIONAL then names that city's region and counts the city records in it. That count is not a population. SOLAR, GALACTIC, and COSMIC stay empty.

Perf overlay. It is off unless the URL has `?perf`. It then writes one line into the page: the mean and the worst of the last 300 frame intervals, the draw calls the renderer counted, and the renderer's pixel ratio. The line is not written to storage and is not sent.

Opening. `src/dccp/opening.ts` is 3784 bytes. It generates 3500 points and 36 sprites on the device. It loads nothing. No texture and no video ship. The points move onto the helix and the sprites onto the two Iris cores, then they are removed and the visitor can zoom. A pointer, a key, or the wheel skips it. Reduced motion skips it. The scene chunk grew from 532082 bytes to 538632 bytes. That 6550 bytes is the bars, the meter, and the opening together.

Shell files. `favicon.svg` is referenced relatively and is in this cut. `__grok/manifest.webmanifest` is in this cut. `icon-180.png` is not emitted. It is not intended.

Tokens. All eight locked hexes are in the new cut. The near-misses `#05070e`, `#f4efe4`, `#e7c98a`, `#4fe3d4`, `#8a6cff`, and `#f1f5f9` are not.
