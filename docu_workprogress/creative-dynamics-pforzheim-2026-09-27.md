# Stronger sculpture interaction and Pforzheim history

Local follow-up, 27 September 2026. No commit, push or deployment.

This supersedes the gentle sculpture deformation, fictional-city copy and on-demand-only city rendering described in `creative-blender-2026-09-27.md`.

## RESONANZ

The 82 Blender lamellae still share one geometry and one draw call. Dragging now morphs their complete spine from the authored pose into a tight spiral or an open wave. Each lamella follows the new tangent; its radius contracts at extreme settings. Horizontal motion changes the shape, vertical motion adds bending and depth. Damped response avoids an abrupt change on release. The visible mobile range and desktop handle remain keyboard accessible, and double-click resets shape and depth. Audio remains opt-in.

## PALIMPSEST

- Rebuilt the city in Blender 4.3.2. Added low interlocking pavilions inspired by the Reuchlinhaus, a sawtooth-roof workshop, a taller narrow modern building, a church with spire and clock, half-timber details, market stalls and a partially standing Roman house. They are evocative miniatures, not historical reconstructions.
- Regenerated the 2048px Cycles atlas. The city GLB is approximately 2.02 MB, including its atlas and movable details. The original editable architecture is in `PALIMPSEST.blend`; the evaluated city, route, anchors, tram and walking figure are in `PALIMPSEST_web_export.blend`.
- The single travelling marker samples the exact exported red polyline by arc length. The export contains its points and the four station indices. Clicking an era scrolls smoothly; the marker follows every curve and fold, including after a large wheel jump. Reduced motion uses direct positioning.
- Era anchors are 2026, 1924, 1643 and AD 244. 1643 refers to Merian's detailed view, AD 244 to the Roman distance stone. The initial era remains 1924 and matches the illustrated ticket.
- Exported a separate vertex-coloured Blender tram and pedestrian. Twelve instanced walkers (six on low-power devices), a slow bidirectional tram and twelve small smoke points (seven on low-power devices) share the existing renderer. The tram is restricted to the industrial layer; Pforzheim's tram operated from 1911 to 1964.
- Maximum seven draw calls with motion, six with smoke hidden. No runtime shadows, extra renderer or extra image request for smoke. Frame rate is capped at 30, or 20 on low-power devices. A pause button freezes ambient motion; scrolling can still move the marker. Hidden pages stop rendering, and reduced motion suppresses ambient animation.
- Twelve bilingual discoveries: Reuchlinhaus, remembrance of 1945, Enzauenpark, tramway, watch/jewellery manufacture, Rassler, Merian's view, St Michael's, Reuchlin's books, the distance stone, the beginnings of Portus and the Kappelhof foundations. Three manual choices per era avoid timed text replacement. Each has an illustration, introductory text, expanded story and primary-source link. The ticket is explicitly labelled as an illustration.
- Small original SVG drawings provide visual variety without eleven additional bitmap downloads. The footer fits desktop and phone viewports; stories remain available without WebGL. The noscript text summarises the historical context.

## Historical sources

All links are also stored next to the relevant DE/EN text in `src/creative/cityHistory.js` and exposed in the page. No external content is requested until a reader follows a source link.

- [City chronicle](https://www.pforzheim.de/stadt/stadtgeschichte/kleine-stadtchronik.html)
- [Roman origins and distance stone](https://www.pforzheim.de/kultur/stadtgeschichte.html)
- [Tramway archive](https://www.pforzheim.de/stadt/stadtgeschichte/stadtarchiv/schatzkammer/2011-archivale-des-monats/dezember-2011.html)
- [Technical Museum](https://www.technisches-museum.de/museum.html)
- [Hohenwart and the Rassler](https://www.pforzheim.de/stadt/ortsteile/hohenwart/sehenswertes-in-hohenwart.html)
- [Reuchlinhaus](https://www.schmuckmuseum.de/museum/das-reuchlinhaus.html)
- [23 February remembrance](https://www.pforzheim.de/stadt/stadtgeschichte/gedenken-friedenskultur/gedenktage/23-februar.html)
- [Enzauenpark](https://www.pforzheim.de/freizeit/parks/enzauenpark.html)
- [Schlossberg](https://www.pforzheim.de/stadt/stadtgeschichte/historische-stelen/schlossberg.html)
- [Johannes Reuchlin Museum](https://www.pforzheim.de/kultur/museen-ausstellungsorte/museum-johannes-reuchlin.html)
- [Archaeological Museum](https://www.pforzheim.de/kultur/museen-ausstellungsorte/archaeologisches-museum-pforzheim.html)

The remembrance story deliberately avoids a casualty total: the city's published pages use differing figures. The account states the date, destruction and deaths, the context of the war begun by Nazi Germany, and the purpose of the city's remembrance day.

## Verification

- `node scripts/creative/check_dynamics.mjs`: two-axis drag, substantial whole-spine movement, keyboard/reset, continuous progress, geometric distance to the exported polyline, all twelve DE/EN stories, source links, tram movement, pause/hidden lifecycle and reduced motion.
- `npm run test:creative`: desktop/mobile loading, draw/geometry budget, controls, languages, audio lifecycle, WAV output and WebGL fallback.
- `npm run build:creative-previews`: actual page captures for both languages and viewport sizes.
- `node scripts/creative/check_integration.mjs`: gallery/overlay/ESC/focus lifecycle; also run with `TEST_DEVICE=mobile`.

Browser checks use Chromium/SwiftShader; the render counts are measured, not a frame-rate guarantee for any specific physical device.

### Completed local checks

- Dynamics checks passed against the dev server, including measured travel along the polyline and all 24 translated story variants.
- The built pages passed `SITE_URL=http://127.0.0.1:4173 npm run test:creative`.
- Both desktop and mobile portfolio integration passed against port 4173.
- A separate aborted-GLB check confirmed that the reading fallback and its story navigation work, hide the motion button, and stop the continuous render loop. Normal model loading still starts visible city motion.
- Eight preview WebPs were regenerated; the final production build and `git diff --check` succeeded. The existing shared Three.js/Draco chunk-size notice remains.
- The latest local build is served at `http://127.0.0.1:4173/`.
