# Forms of sound and active Pforzheim eras

Local follow-up, 27 September 2026. No push or deployment. This supersedes the rotary controls, WAV export and ambient-animation counts in the earlier creative-example notes.

## RESONANZ

- Removed the rotary controls and sound-export interface and implementation. Retained the accessible shape range and three room choices.
- Changed the headline to “Formen der Töne” / “Forms of sound”. The centered footer sound button pulses slowly over 4.8 seconds until enabled. Reduced motion disables the pulse; hidden pages pause it.
- Horizontal trackpad scrolling now controls the actual instrument. Previously only vertical wheel input changed chapters. Shift + wheel also works; pinch zoom is preserved.
- Shape sweeps 3.75 octaves (approximately 65–880 Hz for the harmonic voice). Brightness, partial amplitudes, filter cutoff and gentle stereo position change continuously. Vertical bending also changes brightness.
- Six voices: bass impulse, pure tone, harmonics, airy space, tremolo rhythm and an inharmonic metallic voice. A fixed eight-oscillator graph plus noise, room convolution and modulation avoids recreating audio nodes while dragging. Parameter ramps smooth changes; bounded gain and a compressor control the output.
- Sound still starts through an explicit click, stops on hide/close and never resumes automatically.

## Pforzheim miniature

The architecture was rebuilt in Blender 4.3.2 and the shared Cycles atlas rebaked. The compressed city is **1,874,440 bytes**, including the atlas. Editable architecture and evaluated web scene remain separate `.blend` files.

- Reuchlinhaus: different cubes around a foyer, a glazed steel grid and a raised panelled volume.
- Central station: a broad glazed hall, canopy and stone clock wall.
- Kollmar & Jourdan: muted green ceramic façade, large arched windows, projecting corner bay and connecting passage.
- St Michael’s: sandstone, a long steep-roofed choir, buttresses and an offset tower; the nearby Leitgastturm replaces the former invented twin gate.
- Houses, factory roofs, courtyards and Roman remains provide smaller-scale variation. These are interpreted paper miniatures, not measured historical reconstructions.

Entrances and chimney outlets are authored in Blender and exported with their era. Walking/running residents follow short paths from entrances to the street and back; their legs move in the vertex shader. Five small instanced birds (three on low-power devices) circle the active terrace with moving wings. Smoke starts at the correct outlets and varies by chimney size. The tram belongs to the industrial layer.

Each era has a separate clock. Only the selected clock advances, so the other three eras preserve their exact poses. There are 28 resident instances on desktop and 16 on low-power devices; only seven/four update at once. Birds and smoke belong only to the selected layer. Pause, hidden-page handling and reduced motion remain supported. Maximum **eight draw calls**, with no additional renderer, runtime shadows or postprocessing. The existing 30/20 fps and pixel limits remain.

## Architectural references

Primary photographs and descriptions were consulted for modelling. Photographs are not shipped with the page.

- [Visit Pforzheim: Reuchlinhaus](https://www.visit-pforzheim.de/attraktion/reuchlinhaus-f96bc4ba71)
- [City of Pforzheim: Bahnhofplatz](https://www.pforzheim.de/stadt/stadtgeschichte/historische-stelen/bahnhofplatz.html)
- [Kollmar & Jourdan: building](https://kj-pforzheim.de/gebaude/) and [history](https://kj-pforzheim.de/historie/)
- [Karlsruhe University of Applied Sciences: VES, exterior photograph](https://www.h-ka.de/iras/ves)
- [City of Pforzheim: Schlossberg](https://www.pforzheim.de/stadt/stadtgeschichte/historische-stelen/schlossberg.html)

## Verification

- `node scripts/creative/check_audio.mjs` renders the production audio graph in an OfflineAudioContext, analyses the resulting waveform and checks live wheel input against actual oscillator frequencies. Measured dominant frequencies span 64.6–880.2 Hz; the spectral centroid spans 77–1,806 Hz. At the same shape, energy above 600 Hz is approximately 0.1% for the pure tone, 21% for harmonics and 45% for shimmer. Tested peak amplitudes stay below 0.14. These measurements verify signal differences; they are not a physical speaker loudness measurement.
- `npm run test:creative` checks DE/EN, desktop/mobile, removal of the former controls, centered sound action, wheel response, audio consent/lifecycle and WebGL fallback.
- `node scripts/creative/check_dynamics.mjs` checks sculpture interaction, exact timeline travel, the existing 24 translated discovery variants, changing residents/birds and frozen inactive eras, tram motion, pause and reduced motion.
- Eight actual-page previews were regenerated, and `npm run build` passed. The existing shared Three.js/Draco chunk-size notice remains.
- Both desktop and mobile `check_integration.mjs` runs passed against the built site at port 4173: deferred loading, matching previews, model loading, nested ESC, DE/EN switching and restored gallery focus/scroll.
- The audio, browser and dynamics checks above passed; `git diff --check` is clean. The latest build is served locally at `http://127.0.0.1:4173/`.

Browser rendering uses Chromium/SwiftShader. Draw-call counts are measured; they do not promise a frame rate on a particular physical device.
