# RESONANZ sound and PALIMPSEST discoveries

Local changes only; no commit, push or deployment.

## Sound

- Replaced the strong sawtooth and inharmonic bell ratios with sine/triangle voices and harmonic partials. Each of the six chapters retains its own balance.
- Sideways input still sweeps continuously through three octaves. The register is lower (about C2–C5, with lower bass/rhythm chapters), and vertical bending still affects brightness.
- Removed filter resonance, reduced upper partials and added a fixed treble roll-off. The reverb is darker, with much less noise excitation.
- Rhythm now pulses at 0.65–2.2 Hz with moderate depth; vibrato is slower and shallower.
- Parameters interpolate over 110 ms. Playback has a 240 ms attack and a 120 ms release. Interrupted fades preserve the current envelope level. The audio context still requires the footer button, suspends when hidden and never resumes automatically.
- Updated the DE/EN descriptions and actual portfolio preview images.

## Illustrated discoveries

`src/creative/cityArtifacts.js` replaces eleven sparse line symbols with filled vector miniatures: modern pavilions, a wall fragment with a flower, riverside park, pocket watch, work boots, folded city view, church, book, Roman distance stone, storage vessel and foundations.

The illustrations use paper, stone, brass, leather and terracotta colours, soft contact shadows, perspective, material shading and fine details. Their silhouettes remain legible on mobile. The existing Blender ticket stays in use. Historical text and sources are unchanged.

The drawings are inline SVG: no image downloads, SVG filters, additional render loop or WebGL passes. The renderer is separate from the historical content. The desktop display is slightly larger; footer controls and story navigation retain their layout.

## Verification

- `node scripts/creative/check_audio.mjs`: actual oscillator response to horizontal wheel input, offline waveforms and spectra for all six chapters including maximum brightness/reverb, plus silent attack/release boundaries. Tested peak levels stay below 0.13; energy above 3 kHz remains below 0.2%.
- `npm run test:creative`: desktop/mobile controls, both languages, audio lifecycle, render budgets, layout and no-WebGL reading mode passed.
- All twelve discoveries checked in the real footer at 1414 × 820 (DE) and 390 × 844 (EN). SVG paint references resolve, text stays visible, no horizontal overflow or page errors. Contact sheet and representative full-page screenshots reviewed.
- `npm run build:creative-previews` and `npm run build` completed. The existing Three.js chunk-size advisory remains.

## Kurzfassung

Der Klang verwendet weichere, harmonische Stimmen, gedämpfte Höhen und sanfte Übergänge. Alle sechs Kapitel und die direkte Klangverformung bleiben bedienbar. Elf Fundstücke wurden als detaillierte, ressourcensparende Vektorminiaturen neu gezeichnet und im Desktop- sowie Handy-Footer geprüft. Nur lokal umgesetzt.
