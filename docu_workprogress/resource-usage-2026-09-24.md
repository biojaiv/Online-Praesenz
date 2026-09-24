# Rendering resource usage — 2026-09-24

## Behaviour

The middle preview uses its earlier muted colours at rest and original page colours on hover or keyboard focus. The 3D thumbnail changes colour through a shader uniform, without repainting or uploading its canvas texture each frame. Its opaque image and transparent surrounding panel are retained.

Rendering quality starts from available CPU/memory/input hints. Stage pixel budgets are 550,000, 1,000,000 and 1,800,000 pixels with DPR caps of 0.75, 1 and 1.5. Two sustained windows of slow frames lower quality; isolated pauses reset the measurement. HTML content is not downsampled. Constrained devices omit SMAA and use fewer bloom levels.

The Orrery keeps its authored geometry and PBR materials. Conservative world-space spheres determine whether each mesh can receive any active light. Meshes outside all light ranges are removed only from the render layer; they remain available for light path selection and inspection. Distant machines remain eligible in the rear view. The lighting test compares rendered pixels with culling disabled at two lit timestamps.

The stage and its additional energy update loop stop while the HTML project is open. Return navigation restarts them. Hidden miniature iframes are removed and restored on returning to the gallery. Closing the projection releases its wave canvas, renderer and WebGL context. Wave rendering uses scissor rectangles around the HTML aperture and does not retain an unnecessary GPU drawing buffer.

Each Blender decoder is limited to one worker on constrained devices and two on full-quality devices to reduce simultaneous decoding work.

## Comparison

Same browser setup before and after: Chromium/SwiftShader, 960 × 700 CSS viewport, DPR 1.5, hardware hints set to two logical cores and 2 GB, reduced motion. The actual hardware was not restricted to these hints. All Blender assets loaded; reduced motion keeps the Orrery unlit in the front view. Each sample lasted approximately three seconds.

| Measurement | Before | After |
| --- | ---: | ---: |
| Stage drawing-buffer pixels | 696,618 | 173,811 |
| Scene draw calls per home frame | 187 | 74 |
| Scene triangles per home frame | 546,096 | 343,608 |
| Stage frames while the HTML page was open | 2 | 0 |

This measures about 75% fewer stage pixels and 60% fewer scene draw calls in this specific unlit view. Illuminated and rear views deliberately draw more geometry. These counts do not establish a universal FPS improvement, total RAM reduction or performance guarantee for physical low-end devices.

## Checks

- `npm run test:render-budget`: hardware hints, pixel limits, high DPI and adaptive thresholds.
- `npm run test:example:preview`: DE/EN desktop/mobile preview parity, resting/hover/focus colours, suspended scene, miniature/context cleanup, keyboard activation and return focus.
- `npm run test:background`: authored materials, moving structural light, dark intervals, distant machines and culling pixel parity.
- `npm run test:inspection`: freeze/resume, close navigation, annotation placement and footer anchors.
- `TEST_DPR=0.5 npm run test:waves`: animated/static waves, projection scrolling and navigation.

Approach reference: [MDN — WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
