# PASSUNG — implementation and design rationale

Local example: `/beispiele/passung/?lang=en` (German: `?lang=de`).
Reference: `Entwuerfe/beispiel-passung-konzept.jpg`.
Detailed machine reference: `Entwuerfe/passung-bauteil.jpg`, supplied after the initial implementation.

PASSUNG replaces PALIMPSEST as the third website in the middle pedestal. The shared project registry supplies both the hologram texture and its HTML links with the same translated title and real preview. It opens through the existing full-screen transition and returns with ESC. The old city study is retained as an unlisted reference; the portfolio's accessible links and sitemap now feature PASSUNG.

## Intent and research

The design aims to feel understandable, capable and welcoming. These are design aims; no conversion uplift or psychological effect has been measured for this particular page.

| Evidence | Application in PASSUNG |
| --- | --- |
| Tuch et al. (2012) experimentally found that visual complexity and familiarity of layout influenced first-impression aesthetic ratings. Lower-complexity, familiar layouts were rated more favourably in their experiments. [Primary publication](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/) | One main object, a restrained palette, familiar navigation, generous spacing and one prominent enquiry action. This is an application of the findings, not a claim that a particular colour guarantees trust. |
| Stanford's credibility guidelines synthesise research on professional presentation, usable navigation, verifiable information, visible people and clear contact routes. [Stanford source](https://credibility.stanford.edu/guidelines/) | Explain the process in plain language, make the next step clear, include a human workshop image, and identify the fictional concept honestly. No invented certifications, customer counts or employee biographies. |
| W3C explains why interaction-triggered motion can distract or cause discomfort and recommends an option to disable it, including support for the operating-system preference. [W3C SC 2.3.3](https://www.w3.org/WAI/WCAG21/Understanding/animation-from-interactions) | Native scrolling, direct chapter navigation, a motion control and `prefers-reduced-motion`. The scene rests when input stops and pauses while hidden. |

The greeting and project dialogue use constructive language: an initial idea is enough, questions can remain open, and the visitor controls the next step. This is an editorial design choice. Evaluating its effect would require usability sessions with the intended audience.

## Blender construction

The machine is authored in `scripts/creative/blender/build_passung.py`, saved as `Elemente/Beispiele/PASSUNG.blend` and exported to `PASSUNG_web.glb`. The source includes camera and studio lights.

Nine independently movable component groups follow the same X assembly axis:

1. Housing with rounded shoulders, mounting feet, through-bore and counterbores.
2. Rear cover.
3. Recessed main ball bearing.
4. Second ball bearing, shown ahead of the housing in the exploded pose.
5. Stepped shaft, relief grooves and milled keyway.
6. Closed retaining ring.
7. Precision spacer.
8. Front cover and seal.
9. Six front socket-head fasteners with recessed hex sockets and shanks. Rear screws travel with the rear cover.

Their assembled transforms and explosion distances are exported as glTF extras. Materials are merged within each moving group, and geometry is Draco-compressed. Small packed textures add milling detail and concentric face machining; the web export encodes those textures as lossless WebP. This is an illustrative assembly, not a verified manufacturing design.

The second model revision follows the supplied close-up: scalloped housing contours, rounded mounting feet, threaded bore details, a longer visible shaft, a C-ring, an external bearing and a recessed end cover. The reference pose is preserved at 70% separation; at zero the bearings and cover return into the compact housing assembly. The camera uses a shallower elevation and an almost horizontal projected shaft axis. Blueprint contours come from the authored Blender silhouette, and material-edge lines are batched per component.

The third revision adds the reference's spatial CAD drawing. The Blender export carries a compact `blueprintDraft` with the housing profile, depth layers, axis, bores and foot dimensions. `src/passung/blueprint.js` builds eight cross sections, longitudinal wall lines, drilled channels, counterbores, dashed hidden lines and a faint construction cage from those values. A translucent wall shell, depth-dependent line colours and a stronger blue section sheet make the volume readable. The moving section contour marks the metal cut; the line drawing remains depth-tested against the solid parts. Construction marks show extents and axes without invented dimension labels.

The longer CAD presentation follows the concept's proportions: the initial section moves from X −0.55 to +0.12, and the rear drawing extends by 0.55 model units. This increases the visible axial depth from 0.97 to 2.19 units. Cross sections and bore channels span that length; the foot ends and vertical bores retain their radii. Rear-cover and shaft wireframes share the same extension. The camera leaves a small additional gutter on narrow screens, returning to its previous centre as the CAD fades so the fully separated parts retain their space. Solid geometry and the assembly animation retain their authored dimensions.

The front screws were restored from the first Blender authoring script on 2026-09-28 and adapted to the current six-hole cover. They share its 0.995-radius bore circle and assembled offset. The `fasteners` group first follows the cover, then withdraws by another 0.85 units during the final part of the exploded movement; reverse scrolling seats the shanks in the same bores. The fully exploded view widens and shifts slightly to keep every screw inside the desktop and phone viewport. Initial CAD framing and fully assembled framing retain their previous dimensions. Material batching keeps nine moving groups, with 40 initial draw calls and approximately 134,000 triangles; the fully exploded scene uses 30 draws. The source, compressed model, fallback still and four gallery previews are regenerated together.

The drawing uses four batched line groups, a lightweight shell and one section contour. Geometry is built once, with fewer samples on phones and low-power devices. Scrolling only updates visibility, opacity and the cut position; invisible component wireframes are skipped. Rendering stops while the orbit is paused by hover or hidden content and the assembly has settled. CAD and metal fade into the existing scroll sequence without an additional animation loop.

`npm run build:passung` rebuilds the editable source, compressed web model and a transparent Cycles still. Blender's denoiser is disabled because the installed build lacks OpenImageDenoise. Compression is handled by the local glTF pipeline after export.

## Scroll choreography and presentation

- Idea: the rear portion is a cobalt technical drawing, meeting the solid aluminium part at a section plane. Both representations derive from the same Blender geometry and construction data.
- Manufacturing: bearing, shaft, rings, covers and fasteners separate along their shared axis.
- Quality: components move closer while the text explains fits and inspection.
- In use: every group returns to its original assembly position.
- Reverse scrolling reverses the sequence. Chapter links and keyboard activation provide direct access.
- Horizontal dragging rotates the view 360° around the vertical axis. Pointer capture retains mouse drags; `pan-y pinch-zoom` keeps vertical touch scrolling and browser pinch zoom native. Left/right arrows turn the focused canvas, Home and the reset control restore the original view. Manual rotation remains available with reduced motion and is cancelled when the page is hidden. There is no inertia after a manual drag. The automatic clockwise orbit resumes when the hover, drag and visibility pauses are cleared. Keyboard focus does not latch a pause.
- The orbit preserves the common model/CAD/clipping coordinates and ground shadows. Eight cached bounding-box corners per component keep rotated parts and screws in frame. The hotspot follows its location and hides on the opposite side; the original drafting labels return when the view is reset. Preview captures retain the original angle. `node scripts/creative/check_passung_rotation.mjs` checks real mouse and browser touch gestures, native scroll, full revolutions in three assembly states, framing, languages, keyboard, reset and idle rendering.
- The initial view turns clockwise at 2° per second, using elapsed time separately from the capped assembly interpolation step. Chapter buttons and keyboard input do not stop it. Hover is tested against actual visible solid faces with a raycaster; empty canvas space, reflections and clipped faces do not pause the model. Each of the nine moving groups has a German and English label displayed beside the pointer. Pointer exit resumes at the current angle. Hidden content suspends rendering; preview captures remain static.
- Per the revised interaction request, the orbit runs independently of reduced **assembly** motion, including the system setting. The existing motion control now explicitly refers to the assembly transition. The shared scene helper keeps its normal reduced-motion behavior for other examples; PASSUNG opts into continuous rendering for its orbit.
- The former C-ring is replaced in the Blender authoring script by a continuous annular prism with the same inner/outer radii and depth. Blender source, compressed GLB and fallback still are regenerated; the resulting ring has no nonmanifold edges.
- A softened planar reflection follows every assembly and viewing change. Its render target is 512 × 512 on desktop and 320 × 320 on constrained devices, without multisampling. A separate scene layer reflects the assembly, CAD and lights while excluding the floor and contact shadows. The mirror fades with ground distance and at the bottom of the viewport. Both render passes stop when the scene rests under a pause; the target is released on page exit. Initial measured totals are 64 draws / about 230,000 triangles on desktop and 76 draws / about 267,000 triangles on phone, including the reflection. `node scripts/creative/check_passung_auto.mjs` verifies clockwise start, all chapter buttons, reduced assembly motion, solid-face hover, bilingual component labels, keyboard continuation, hidden lifecycle, phone behavior and preview stability.
- The reference's light workbench, cobalt accents, oversized headline, four-stage rail and dark human-focused footer are retained in responsive HTML.
- English and German share the same state. Changing language does not reset the current chapter or form inputs.

The workshop image was generated using the built-in `image_gen__imagegen` tool with the concept as a style reference. It is disclosed as an illustration in the concept dialogue and image description. [Original generation prompt](../Entwuerfe/passung-werkstatt-bildprompt.txt). On 2026-09-28, a targeted edit opened the vernier caliper: the slider is visibly displaced and the external jaws surround the housing, replacing the implausibly closed instrument. [Final correction prompt](../Entwuerfe/passung-werkstatt-korrektur-bildprompt.txt); editable image master: `Entwuerfe/passung-werkstatt-korrigiert.png`. Delivery asset: `public/passung/workshop.webp`.

## Interaction and delivery

The later [visual refinement and live-site research](passung-style-2026-09-28.md) adds a drafting ruler, small interaction details and an editorial treatment of the workshop image.

- Information dialogs explain capabilities, collaboration, component relationships and the concept itself.
- The enquiry prepares a local text draft, which can be copied or downloaded. It sends no form data and stores no personal information. This is stated before the visitor submits the draft.
- Dialogs use native focus handling; ESC closes the active dialog first. The shared portfolio bridge supports language, pause, visibility and return navigation.
- Rendering is limited to 30 fps (24 on constrained devices) while the automatic orbit is active. Solid-face hover and hidden content stop it. Contact shadows use small shared textures; the polished floor adds one bounded planar reflection pass and no postprocessing chain.
- A Blender-rendered still covers loading and no-WebGL states. Four semantic chapters are present in the original HTML for no-JavaScript reading.

## Reproduction and verification

```sh
npm run build:passung
npm run dev -- --host 127.0.0.1
npm run test:passung
npm run build:passung-previews
npm run build
```

The browser check covers native intermediate scrolling, nine part positions, reversible assembly, both languages, phone layout, keyboard/focus, local enquiry download, idle/hidden rendering, motion preferences, WebGL fallback and no-JavaScript content. Review screenshots are written to `/tmp/passung-review/`.

The checks passed on desktop and phone. Additional 1366 × 768, 1280 × 800 and 1024 × 768 checks confirm that explanatory copy remains above the chapter rail. Four actual preview images were generated. The compressed model is approximately 614 KiB; its source `.blend` is self-contained with packed machining textures. The Vite production build completes with the existing shared Three.js chunk-size advisory.

## Kurzfassung

PASSUNG übernimmt die Bildvorlage als zweisprachige Beispielseite im mittleren Sockel. Das Bauteil folgt der später gelieferten Detailreferenz `Entwuerfe/passung-bauteil.jpg`, einschließlich Gehäusekontur, Teileabständen und Kameraperspektive. Die Baugruppe wurde in Blender modelliert; neun Teile werden beim Scrollen entlang einer gemeinsamen Achse getrennt und wieder zusammengefügt. Die ergänzende CAD-Zeichnung erhält räumliche Gehäuseschnitte, Bohrungskanäle, transparente Wandflächen und nach Tiefe abgestufte Linien aus denselben Blender-Konstruktionsdaten. Klare Orientierung, verständliche Texte und kontrollierbare Bewegung setzen die recherchierten Gestaltungsprinzipien um. Die Anfrage erzeugt einen lokalen Textentwurf. Kein Push oder Deployment.
