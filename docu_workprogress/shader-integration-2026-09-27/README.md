# Local GLSL integration — verification

The active contour and jet shaders were extracted from `cards.js` into five GLSL files, with material/state/fallback modules. See the [shader documentation](../../src/scene/shaders/README.md). No push or deployment was performed.

## Reproducible checks

- `npm run test:glsl` against Vite on port 5173: passed actual program compilation, per-pedestal activation, mirrored jets, all three quality levels, live reduced motion, paused clocks, document-pixel comparison, clock wrapping, ten open/close cycles and deliberate shader compile failures.
- `npm run test:render-budget`: passed.
- `npm run test:hologram-alignment`: passed existing document heights, transparent curved labels, unchanged preview content and direct desktop/mobile activation.
- `node scripts/ui/measure_glsl.mjs`: 30-second wall-clock/render-counter probe. It includes all composer passes, not only the final pass. Both baseline and follow-up used a 1280 × 900 viewport, DPR 0.75, the low profile and Chromium/SwiftShader.

## Measurements

| Measurement | Before | After |
| --- | ---: | ---: |
| Draw calls across complete frames, varying Orrery activity | 86–175 | 86–175 |
| Maximum points per frame | 10,970 | 10,970 |
| Resident geometries | 124 | 124 |
| Resident textures | 19 | 19 |
| Shader programs | 14 | 14 |
| Wall-clock frame intervals p50 / p95 | 300 / 876 ms | 236 / 639 ms |

The time figures are **software-renderer observations**, not a physical GPU benchmark or a claimed percentage speedup. Orrery activity and browser/CPU scheduling vary. The timer-query extension was exposed by this software renderer, but GPU durations were not collected. A physical low-power-device performance gate is not established by these numbers.

The controlled comparison is more useful for integration: with the scene frozen, enabling/disabling the enhancement gives **151 draw calls and 10,970 points** in both cases. After ten cycles, geometry/texture/program counts remain **124 / 19 / 14**. No extra rendering pass or particle allocation was introduced.

The document-pixel test first warms the render target to avoid a first-draw upload/conversion artefact. It then compares the real CV material with and without the contour: **zero changed interior pixels**. The contour changes the outer region. At a grazing angle, enhanced Fresnel produces a measurable edge response. At the 1024-second clock wrap, the average channel difference is 0.0000078125 out of 255.

Deliberately breaking the two shader programs replaces all eight affected drawable objects (six mirrored jets and two contours) with static particles. The documents remain opaque, fallback positions are finite, and the renderer's prior error hook is restored.

## Captures and raw results

The [before](before-home.png) and [after](after-home.png) captures show the same viewport/profile and original page layout. Background-light and UI-animation phases differ, so these are visual references, not a whole-image pixel regression.

- [Baseline counters](baseline.json)
- [Follow-up counters](measurement.json)
- [Shader checks](checks.json)

The existing inactive volume shader was not reintroduced. Later Orrery-route and fullscreen-frame proposals remain in the implementation plan.

The final `npm run build` succeeded with the existing Three.js/Draco chunk-size notice. Desktop and mobile portfolio integration passed on port 4173, including deferred loading, preview expansion, nested ESC, DE/EN switching and focus/scroll restoration. `git diff --check` is clean. The current result is available locally at `http://127.0.0.1:4173/`.
