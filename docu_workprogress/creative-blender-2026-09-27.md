# Blender refinement of the creative examples

Local work, 27 September 2026. No commit, push or deployment.

## References and scope

- `Entwuerfe/beispiel-resonanz-konzept.jpg`
- `Entwuerfe/beispiel-palimpsest-konzept-v4.jpg`

The two live examples and their portfolio preview images were refined against these references. The portfolio’s original pedestal and Orrery Blender sources remain the existing authored assets. The curved, translated pedestal lettering continues to use its cylindrical Three.js mesh; baking that lettering would lose the live language and hover behaviour. The separate shader document remains a plan.

## Blender authoring

Blender 4.3.2 was used locally, through its Python interface and Cycles CPU rendering. The source scenes are in `Elemente/Beispiele/`:

- `RESONANZ.blend`: a shaped, closed silver lamella, repeated along an authored S-shaped spine with an inward curl. The web export shares one geometry between 82 transforms. The browser preserves those positions and changes them gently in response to the instrument controls. A small studio environment supplies the long metal reflections; there is no shadow or postprocessing pass.
- `PALIMPSEST.blend`: four thin, irregular paper terraces with curved folds, modern façades and roof gardens, brick workshops and chimneys, old-town arches, a gatehouse, a fountain, trees, people, trams, ruins, columns, a mosaic and small architectural plan marks. Normals are corrected before baking. Window reveals, material grain and contact shading are baked into a 2048 × 2048 Cycles diffuse atlas at 32 samples.
- `PALIMPSEST_web_export.blend`: evaluated geometry and the baked material. Its atlas path is relative. The red route, active terrace edge and four year anchors stay separate so they remain interactive. The route follows the paper and fold surface, including the stairs.
- `Fahrkarte_1924.blend`: a creased paper ticket with uneven edges and a printed surface. German and English renders become small transparent WebPs. The print textures and renders remain beside the source scene.

The Blender files are authored interpretations of the reference JPGs, not imported photogrammetry. Their architecture, materials, lighting and composition are substantially more detailed than the earlier browser-generated primitives.

## Browser integration and detail

- `src/creative/blenderAsset.js` loads Draco-compressed GLBs only within the opened example, and releases each decoder worker after loading.
- `soundSculpture.js` renders the lamellae with one `InstancedMesh`. The desktop mesh has 188,928 rendered triangles; the lighter geometry has 78,720, with the same 82 lamellae and composition (about 58% fewer triangles). The existing 30 fps cap, reduced-motion setting, visibility pause and audio consent remain active.
- `cityModel.js` combines the baked city with its timeline, selected edge and one inexpensive contact shadow: four draw calls. There are no real-time shadows. The optimizer converts the baked atlas to `KHR_materials_unlit` and removes unused normals/tangents. Empty year-anchor nodes are explicitly retained and validated after pruning. The actual projected geometry determines the camera framing so the paper fits on desktop and mobile.
- The larger, narrower RESONANZ masthead, serif poem, chapter indicator, wave drawing, small points, circular controls and drag handle follow the reference layout. The range controls remain real keyboard-accessible inputs. The English mobile heading has its own type size to preserve the intended three lines.
- PALIMPSEST keeps 1924 active initially. Only the selected era gets the filled red badge. The footer contains the ticket and a short translated explanation; its link stays above the overhanging paper canvas and remains clickable.
- A missing WebGL context or failed model request still leaves readable content and the controls available. Tests explicitly require successful model loading in the normal browser path.
- The opening transition waits for the first rendered model image. Card previews are actual DE/EN screenshots of the implemented pages, not the concept JPGs.

## Delivery and reproduction

Run `npm run build:creative-models` to author/export, bake, compress and render with Blender and ImageMagick. `--python-exit-code 1` makes a Blender script failure stop the pipeline. It is intentionally separate from the ordinary site build.

With the dev server running, `npm run build:creative-previews` captures the eight real gallery/transition images. `npm run build` then packages them. Ordinary builds use the existing GLBs and do not need Blender.

Approximate web sizes: RESONANZ 31 KB, its lighter variant 27 KB, PALIMPSEST 2.14 MB including the baked JPEG atlas; each translated ticket WebP is 41 KB. The larger city asset loads only after opening the example. The editable scenes, original atlas and concept JPGs are not part of the initial portfolio download.

## Verification

- Both Blender models, their lighter export and the ticket renders were inspected in the browser against the concept JPGs.
- `npm run test:creative`: desktop/mobile, DE/EN, successful authored-model loading, draw-call budget, mobile geometry, audio consent/pause, WAV export, era selection, artifact dialog and no-WebGL navigation.
- `node scripts/creative/check_integration.mjs`: portfolio gallery, curved descriptions, deferred resources, matching opening preview, nested ESC, language and focus restoration.
- `npm run build:creative-models`: full Blender authoring, baking, both geometry detail levels, ticket renders and compression completed successfully.
- `npm run build:creative-previews` and `npm run build`: successful; the preview server on port 4173 serves the new build.
- `SITE_URL=http://127.0.0.1:4173 node scripts/creative/check_integration.mjs`: built desktop gallery and fullscreen workflow.
- `SITE_URL=http://127.0.0.1:4173 TEST_DEVICE=mobile node scripts/creative/check_integration.mjs`: mobile integration, model loading, retained year anchors, language changes and return to the correct card.
- `SITE_URL=http://127.0.0.1:4173 npm run test:creative`: the final built pages also pass all desktop/mobile, language, controls, audio and fallback checks.
- `git diff --check`: clean.

The browser checks use Chromium/SwiftShader. Draw-call and geometry counts are measured; they are not a frame-rate guarantee for a particular physical device.

## Lokal ansehen

- http://127.0.0.1:4173/#projekte/webseiten
- http://127.0.0.1:4173/beispiele/resonanz/?lang=de
- http://127.0.0.1:4173/beispiele/palimpsest/?lang=de
