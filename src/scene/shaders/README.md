# Hologram GLSL

The active document contours and pedestal jets use small GLSL modules through Three.js `ShaderMaterial`. Vite's `?raw` imports bundle the source into JavaScript; there is no shader fetch at runtime and no shader-loader dependency. Tested against the installed Three.js **0.185.1** and its WebGL 2 renderer.

## Files and ownership

| File | Responsibility |
| --- | --- |
| `hologramCommon.glsl` | Periodic motion, view-space Fresnel and a travelling activation envelope |
| `hologramEdge.vert.glsl` | Positions on the existing rectangular particle contour; angle response; bounded point sizes |
| `hologramEdge.frag.glsl` | Soft particle edges, subtle scan modulation at sufficient pixel size, accent and opacity |
| `ringJet.vert.glsl` | Seed-driven particle rise, turbulence and the projected document boundary |
| `ringJet.frag.glsl` | Jet colour, soft fade and clipping below the document |
| `../materials/hologramEdgeMaterial.js` | Contour material factory and static fallback positions |
| `../materials/ringJetMaterial.js` | Jet material factory, including the mirrored upper jet |
| `../materials/hologramControls.js` | Independent uniform state, quality, motion preference, local time and activation lifetime |
| `../materials/shaderFallback.js` | Shared public renderer error hook with per-effect fallback and cleanup |

`cards.js` owns geometry and scene placement. The material controllers own their uniform containers and fallback registrations. The upper and lower jets of **one** pedestal deliberately share a geometry and material; different pedestals do not share interactive uniforms. There is no additional animation loop, canvas, scene pass, particle allocation per frame, or fullscreen effect.

## Coordinates and colour

Contour vertices are calculated in document-local coordinates, then transformed by `modelViewMatrix` and `projectionMatrix`. Its plane normal is transformed by `normalMatrix`. Fresnel compares that normal to the camera direction in **view space**; the absolute dot product handles both sides. On a front-facing flat sheet the contour still comes from its perimeter geometry, independently of Fresnel.

Jet clipping uses the document's projected lower edge and `gl_FragCoord` in drawing-buffer pixels. Resize and adaptive DPR changes update `uViewport`. Conservative CPU bounding spheres include the positions generated on the GPU.

Colours are linear RGB. The contour retains the previous linear `(0.47, 0.75, 1.0)` colour. `colorspace_fragment` converts only for the current renderer target; the composer receives linear colour, while direct rendering receives the appropriate output conversion. Materials set `toneMapped: false`, matching their emissive particle role. The existing composer still owns bloom and final scene presentation.

## Uniforms

| Uniform | Meaning |
| --- | --- |
| `uTime` | Local seconds, wrapped at 1024; advances only with visible, enabled motion |
| `uMotion` | Effective motion preference, including low quality and compact contours |
| `uQuality` | 0 low, 1 balanced, 2 full; updated without recompilation |
| `uEnhanced` | Developer switch for added Fresnel, activation and scan modulation |
| `uActivation` | Progress of one 620 ms pulse; -1 when inactive |
| `uHalfWidth`, `uHalfHeight` | Real contour dimensions, independent of camera zoom |
| `uOpacity`, `uReveal` | Existing document/jet reveal lifecycle |
| `uPixelRatio`, `uViewport` | Actual renderer resolution, not CSS screen size |
| `uHover`, `uAccent` | Local interaction strength and contour colour |

The clock freezes at its current value when paused, reduced motion is requested, or low quality is selected. It resumes from that value. Motion frequencies complete whole cycles over 1024 seconds, avoiding a phase jump at clock wrap. Activation is event-driven and ends automatically; it never schedules a repeating flash.

Low quality keeps static particles. Balanced enables motion, the activation and restrained edge-angle response. Full additionally allows very slight displacement during activation and subtle scan modulation. Scan density depends on projected point size and is suppressed on small particles; `fwidth` softens the sprite boundary. Reduced motion cancels activation and freezes all new decorative motion, including preference changes after loading.

## Content and failure behaviour

The opaque document shader, source textures, scroll coordinates and hit targets are not modified. The website wings retain their original content. The old, inactive `hologramField.js` is not re-enabled; this implementation does not stack a new volume over the current jets. Orrery PBR materials and the HTML fullscreen transition remain separate.

The shader error handler recognises only the two registered programs. On a compile/link failure, it schedules a switch to static `PointsMaterial` particles after the current draw. A small generated sprite and authored perimeter/jet positions supply the replacement; mirrored jets switch together. Other shader errors are still reported. Disposing cards unregisters callbacks, restores the earlier debug hook and releases the existing geometry/material/texture resources. Renderer context restoration recreates GPU programs through Three.js in the usual way; WebGL unavailability uses the portfolio's existing HTML fallback.

## Verification and development

Run `npm run test:glsl` with the dev server on port 5173. The check compiles the actual shaders, exercises independent hover/activation state, quality and live reduced motion, compares actual document pixels, verifies clock wrapping, checks draw/resource counts across ten open/close cycles and deliberately breaks each shader to verify the static fallback. It writes its report and screenshots to `/tmp/glsl-review` by default.

`__stage.cards.setShaderEffects(false)` disables the added decoration for comparison; `true` restores it. This is a development/inspection API, not another visitor-facing setting. Prefer editing a small `.glsl` file and using Vite reload over patching compiled programs. After checks, `npm run build` bundles the tested source for the local preview.

### References

- [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html): uniforms and source management.
- [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html): shader error hook and render statistics.
- [Three.js colour management](https://threejs.org/manual/pages/color-management.html): working and output colour spaces.

---

## Deutsch

Die aktiven Hologrammkanten und Jets liegen in eigenen GLSL-Dateien. Materialmodule verwalten unabhängige Uniforms, lokale Zeit, Qualitätsstufen, kurze Aktivierungsimpulse und den statischen Ersatz bei Shaderfehlern. Die vorhandene Szene liefert weiterhin den einzigen Takt für diese Effekte. Dokumentinhalt, Texturen, Trefferflächen und Vollbildseiten bleiben getrennt.

`npm run test:glsl` prüft die tatsächlichen GPU-Programme einschließlich Lesbarkeit, Ressourcenverbrauch, reduzierter Bewegung und absichtlich ausgelöstem Kompilierungsfehler. Die Shader werden mit Vite gebündelt und benötigen keine zusätzlichen Laufzeitanfragen.
