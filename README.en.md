# Application Website — Vladimir Leicht

An interactive, single-page job application by an IT specialist in systems integration.
Rather than a conventional portfolio with separate pages, it is **a space** containing
three sections as objects that the viewer moves towards and into.

---

## 1. What the Project Aims to Be

The website should not look like a CV uploaded to the internet. It should convey
the profession itself: infrastructure, signal paths and systems working out of sight.
That is why a network of circuit traces sits behind everything, also resembling
a starry sky — a motherboard and a universe share the same structure, at different scales.

**Guiding principles**

| Principle | Implementation |
|---|---|
| Stillness before stimulation | No more than two pulses at once, with long pauses between them |
| No bouncing | Every transition is slow, gliding and ritual-like |
| One colour pair | Fibre blue for the resting state, amber for events and selection. Even the brief glitch pulses stay within this colour pair. |
| Content remains text | The CV is real HTML: selectable, searchable and indexable |
| No effect without a reason | Every animation communicates something |

### Atmospheric Reference

The visual language of the band **Tool** provides the atmospheric reference —
reinterpreted rather than directly quoted:

- **Fibonacci as a timing principle** (*Lateralus*): spacing, pulse durations and
  timings are not integer multiples of one another. The pattern almost never
  repeats, without feeling random.
- **Sacred geometry**: selected motifs from
  `Heiligegeometrie/DIVINE_SACRED_GEOMETRY_SYMBOLS-01.png` appear in the space as
  glowing vector symbols, with their brightness heavily subdued.
- **Deep black**: objects emerge from nothing and disappear back into it.

---

## 2. The Background Scene

### The Machine (Version 6)

A vast, procedurally built orrery stands behind and around the three pedestals
(`src/scene/orreryMachine.js`): concentric rings with graduated markings, twin
rails connected by rungs, staggered gear rings at the core, gimbal rings,
spherical cages and gears along the tracks, radial struts, three large tilted
rings and four smaller satellite mechanisms. Two shallow graduated rings and
two steeply tilted armillary rings are centred precisely on the middle of the
pedestal row — the structure **surrounds** the stage rather than simply sitting
behind it. The reference is `Elemente/Orrery/orrery-source.png`; the image is not
used as a texture. Instead, it is translated into geometry and simplified
where it would interfere with the foreground.

The machine rests in darkness. In its idle state, it is little more than a
silhouette against the mist. Light appears only occasionally and always
illuminates just part of the structure:

- **Travelling lights.** Short-lived lights — cyan, occasionally amber or ice
  blue — move along part of a single ring track for five to twelve seconds.
  They illuminate only their immediate surroundings: gear teeth, rungs and
  graduated markings. No more than three appear at once, with pauses of two
  to six seconds. Their paths are selected using weighted sampling across all
  rings in the main machine, the satellites and the armillary sphere around
  the pedestals.
- **The light front.** Every 11 to 22 seconds, a shell of light travels outwards
  from the core at roughly 8.5 units per second, but only within a cone with a
  half-angle of 22 to 40 degrees. It therefore sweeps across one sector of the
  machine while leaving the rest dark. Every third front is amber, every fifth
  violet; slightly more than half are directed towards the pedestals.
- **The core** barely glows and briefly flares only when a light front begins.

**Movement.** All rotating groups move very slowly. The tilted rings — the
gimbal rings, the three large inclined rings and two additional travelling
rings in the main disc — do more than spin in place: they **precess around the
core's axis**. Each sits in a mount that slowly revolves around that axis, so
the plane of the ring visibly moves around the core. The armillary rings
around the pedestals do the same around their own centre. The machine keeps
moving behind the open CV, but the light fronts and travelling lights are
heavily subdued to keep the page readable.

**Orbit.** In its resting state, the stage responds to direct manipulation:
dragging with the mouse button held down, or with one finger on a tablet,
orbits the camera around the centre of the pedestal row. Horizontal movement
is unrestricted; vertical movement is limited. Motion eases to a stop after
release. From side angles, the camera automatically pulls back slightly to
keep all three pedestals in view. When approaching a pedestal, the viewing
angle returns to its starting position by the shortest route. On narrow
mobile screens, horizontal swiping selects the next pedestal instead.

### Pulses

Pulses travel along the circuit traces — **never more than two at once**,
with pauses of 2.6 to 7.5 seconds. Each pulse has three phases:

| Start | Travel | Impact |
|---|---|---|
| The pulse head appears on the track. | A tail follows behind it; the rune begins to glow. | The chip structure at the end of the track flashes in the same colour; the rune reaches peak brightness. |

The impact is the defining moment. At the end of every track is a drawn chip
package: frame, core, pins and internal traces. It is almost invisible at
rest, then lights up in the pulse's colour for roughly one second when struck.

### Runes

Each track has an associated rune that glows with its pulse. The runes are
defined as **line strokes**, not as a font — runes were carved rather than
written. This also avoids font-loading problems.

The five symbols used to convey meaning come from the Elder Futhark:

| Symbol | Name | Meaning |
|---|---|---|
| ᚠ | Fehu | Prosperity |
| ᛃ | Jera | Competence |
| ᚨ | Ansuz | Intelligence |
| ᛊ | Sowilo | Success |
| ᚲ | Kenaz | Creativity |

Additional symbols carry no intended message and serve only as texture:
**Ogham** (Beith, Luis, Muin) and **alchemical element symbols** (Ignis, Aer,
Terra, Sal). Two out of three runes carry meaning and are drawn brighter
than the decorative symbols.

In addition to their pulse-driven glow, all runes have a subtle **base shimmer
timed by the golden ratio**. Each rune's phase is its track number multiplied
by the golden ratio. This distributes the moments of illumination as evenly
as possible, with no two runes running in sync. During the intro, this shimmer
runs at full strength — a quiet message to the visitor — before falling back
to one quarter of its intensity.

### Sacred Geometry Objects

The PNG file is a visual reference atlas, not a permanently displayed
background image. Eleven line motifs are derived from it:

`Vesica Piscis`, `Torus / Lotus of Life`, `Seed of Life`, `Tree of Life`,
`Flower of Life`, `Egg of Life`, `Metatrons Cube`,
`Fruit of Life`, `Merkabah`, `Sri Yantra` and `Six Petal Rosette`.

The figures share a common pool. Every 5.5 to 11.5 seconds, at most one
additional figure materialises at a new position and depth; no more than two
are visible at the same time. Each rotates slowly around all three axes,
glows for 7.5 to 13 seconds and disappears again. A pulse impact may trigger
an additional figure. Star Tetrahedron and Algiz are no longer included in
the selection pool. The header also avoids Merkabah, Sri Yantra and Metatron
motifs with overlapping triangles.

### Depth

Four layers are staggered from z = −22 to −67, becoming dimmer and more
widely dispersed with distance. Behind them are 1,400 slowly twinkling stars,
roughly one in eight with a warm tint. Furthest back, at z = −190 to −270,
are **four small nebula patches** made from procedural fBm noise. They differ
in size, colour and rotation, all below 45% opacity. Their purpose is to
suggest space, not draw attention.

### Title Illumination

When the page loads, an amber point of light travels once through
“IT SPECIALIST FOR SYSTEMS INTEGRATION”, letter by letter, followed by an
afterglow across the entire line. It does not repeat afterwards.

### Intro Sequence

On the first visit, without a deep link or `prefers-reduced-motion`, a
**six-second** opening sequence plays. It can be skipped at any time with
a click or key press. An unobtrusive “Skip intro” text button is also visible
in the bottom-right corner from the start. After the first run, the intro is
marked as seen in local storage; subsequent visits start directly.

1. **The space alone** (0–0.7 s). The camera moves back from the depths to
   its resting position.
2. **The name** (0.7–2.4 s) is revealed letter by letter from left to right,
   with a rim of light following the reveal edge.
3. **Signal disruption** (~0.3 s): five abrupt frames with coloured ghost
   copies of the name and sigil — noticeable, but not frantic. Film grain
   and bloom briefly intensify with them.
4. **Role and sigil** (3.1–4.9 s): the job title fades in calmly, and the
   sigil's three squares grow from nothing. The outer square turns left,
   the middle one turns right, and the core pulses once.
5. **Warp** (4.95–6.0 s) towards the top-left corner. Only towards the end
   do the pedestals rise from the depths. The middle pedestal first opens
   the project overview; choosing a website then starts the projection.
   There is no additional open button. The wordmark is the same DOM element
   used in the header. At the end, only its transform returns to zero,
   guaranteeing pixel-perfect alignment.

### A Calm Foreground

The header no longer contains continuous motion: the name uses a fixed
gradient, and the role stays amber. The brand glitch is an accent roughly
every half-minute, favouring gentle disturbances with almost no aftershocks.
The symbol in the centre of the header now appears only every 16 to 30 seconds,
exclusively in cyan or amber. On hover, controls change to their target colour:
no signal disruption, no brightening filter — amber remains amber.

The front edges carry the bilingual section titles. All three pedestals rest
in fibre blue. Hovering produces a slow transition between blue and amber;
the active title remains amber until the section is left. With reduced motion,
the hover colour stays still. Mirrored copies of the lower pedestals frame the
holograms from above. The additional engraved text has been removed; lettering
already baked into the GLB model remains.

The frames stay blue. Upper and lower jet streams carry dynamic bands of
blue, turquoise and amber. The pedestal bodies turn slowly around their own
axes, while titles and documents remain aligned for reading. The example
preview stays a subdued blue even on hover; only the open HTML page displays
its original colours. After the camera turn, the header fades out. A calm blue
frame, blurred surroundings and slow waves along the edges surround the
sharp, interactive page. ESC or the lower back button returns to the overview.

The CV projection once again uses the earlier two-column SVG design, without
a portrait or date of birth. The detailed reading version remains real HTML.
Reading and download options are in the respective submenus, with zoom hints
in the footer. On mobile, the overview shows one pedestal at a time, selectable
by swiping, dot navigation or arrow keys. The holograms' TV-style synchronisation
effect remains limited to the overview.

---

## 3. Structure

```text
webseite/
├── index.html                  Frame, header, stage, footer
├── package.json
├── public/
│   └── data/cv.json            CV data, separate from the code
├── src/
│   ├── main.js                 Entry point
│   ├── style.css               Fibonacci spacing, colour palette
│   ├── scene/
│   │   ├── stage.js            Renderer, camera, composer, anchor points
│   │   ├── background.js       Background facade (intro compatibility, states)
│   │   ├── orreryMachine.js    Orrery machine: geometry, travelling lights, sector fronts, precession
│   │   ├── cards.js            The three section cards (pedestal, plate, dust)
│   │   └── runes.js            Symbol set defined as line strokes
│   └── ui/
│       ├── router.js           Hash router without page changes
│       ├── intro.js            Opening sequence with warp into the header
│       └── title.js            Letter-by-letter illumination
├── Begrüßungsbild/
│   ├── <Vorlagebild>.jpg
│   └── meshy-input/            Cropped references + PROMPTS.txt
└── Lebenslauf/
    ├── <Originalbild>.jpg
    ├── lebenslauf_skills_v2.png/.jpg   Corrected version
    └── cv.json
```

### Navigation

There are **no subpages**. The header links to three sections, each with three
to four subsections. A click changes only the hash (`#lebenslauf/faehigkeiten`)
and triggers a camera move. ESC goes back. Deep links work, as does the
browser's back button.

The three menu items are designed as small **instruments**: a dial with an
orbiting satellite, each running at its own pace, an ordinal number (01–03)
and a title held between two corner brackets. On hover, the satellite speeds
up, the core glows amber, the brackets expand, and the submenu opens as a
semi-transparent panel beneath the instrument. The language switch is a
separate small control immediately to the right.

The three anchor points are stored in `stage.slots` at x = −9.2 / 0 / +9.2:

| Section | Content |
|---|---|
| `abschluss` | Final project for the systems integration qualification (FISI) — server, UEM, clients, migration |
| `projekte` | IT projects — spatial project overview |
| `projekte/webseiten` | Websites — selection of the interactive example page |
| `projekte/privat` | Private projects — announced, with no projects available yet |
| `lebenslauf` | Career, skills, interests, contact |

---

## 4. Technology

| Component | Purpose |
|---|---|
| **Vite** | Development server and bundling |
| **three** | Scene, shaders, geometry |
| **postprocessing** (pmndrs) | Bloom, depth of field, vignette, film grain, SMAA |
| **gsap** | Choreography — the actual director |

### Implementation Techniques

**A state texture instead of objects.** The state of every track is stored
in a `DataTexture`, with one column per track. The vertex shader reads it
through an `aId` attribute. This keeps the core circuit-trace rendering at
**three draw calls** — lines, chips and runes — regardless of the number of
tracks. The sacred geometry objects are rendered separately from a small
pool, allowing each motif to rotate and fade in or out independently.

```text
R = Head position 0..1   (−1 = track idle)
G = Pulse length
B = Hue (0 = teal, 1 = amber)
A = Impact flash 0..1
```

**Hybrid rendering for the CV.** The spatial preview is rendered as a texture
in WebGL. The reading version is real, selectable HTML within the existing
overlay. `scripts/cv/build_legacy_projection.mjs` exports the original SVGs,
without a portrait or date of birth, to `public/cv/CV_Projection_*.webp` and
`CV_*.pdf`. The DOCX reading versions are also exported without a date of birth
to `CV_Reader_*.docx`. Page anchors are defined in `src/data/cvProjection.json`.
Source files are not modified. Like the German reference, the PDF consists
of rasterised pages; selectable text is available in the HTML reading version.

To update: `npm run build:cv`. This requires Playwright Chromium and Python
with Pillow and PyMuPDF; `CHROMIUM_PATH` and `CV_PYTHON` can select local
installations. No running web server is required.

`npm run test:harmony` checks the intro, mobile pedestal selection, submenus,
downloads, German/English and minimum font size. `npm run test:refinements`
additionally checks hover/active colours, sounds, browser-language selection,
the header and permanently accessible contact details against the development
server (`HARMONY_URL`). Location, availability, email and PDF access sit directly
in the frame; “How this site is built” explains the technical evidence.

### Known Pitfalls

- `active` is a **reserved word in GLSL ES** and causes shaders to fail silently.
- `THREE.Clock` is deprecated. Use `THREE.Timer` with `update()` and
  `getElapsed()` / `getDelta()` instead.
- Fibonacci numbers must not be used directly as durations in seconds;
  otherwise, pauses can reach 68 seconds and the scene appears lifeless.

---

## 5. 3D Models (Meshy)

Division of work: **Meshy creates only solid hard-surface objects** — cubes,
pedestals, server racks and laptops. Anything glowing, holographic or transparent
is created procedurally in Three.js, because no image-to-3D service can reconstruct
glow, transparency or particles.

References and ready-to-use prompts are stored in `Begrüßungsbild/meshy-input/`.

**Settings that actually take effect**

| Setting | Value | Reason |
|---|---|---|
| Topology | Smart Topology | Required for `target_polycount` to be respected |
| Model | Meshy T2 | T1 ignores the polygon count entirely |
| Poly Count | 12,000 | The upper limit is 15,000 |
| Pose | Off | |
| Textures | PBR, 4K | Later reduced to 2K or 1K using `gltf-transform` |
| Export | GLB | |

**Important details**

- Image-to-3D has **no geometry prompt field**, only `texture_prompt`.
- Prompts are limited to **600 characters**; beyond that, the API returns 400.
- **Negative prompts have no effect from Meshy 5 onwards.** Phrases such as
  “no rust” are ineffective and may be counterproductive. Instead, describe
  what should be present in positive terms.
- With the default model, `should_remesh` is set to `false`, which silently
  causes the requested polygon count to be ignored.

Finished models belong in `models/`.

---

## 6. Commands

> **Note:** `npm install dev` does not install this project's development
> dependencies. It installs a separate, outdated npm package named `dev`,
> which pulls in `inotify` and fails with current Node versions. Use
> `npm install` for dependencies, followed by `npm run dev` for the
> development server.

```bash
npm install
npm run dev      # Development server
npm run build    # Production bundle in dist/
npm run preview  # Preview the bundle locally
```

---

## 7. Accessibility and Fallbacks

- **No WebGL** → the CV is delivered as a plain HTML version.
- **`prefers-reduced-motion`** → no camera moves, no illumination sweep and
  no typewriter effect; the page appears immediately in a still state.
- **Narrow screens** → depth of field is disabled, camera moves are shorter,
  and the panel fills the screen.
- **Keyboard** → all sections are reachable using Tab, with a visible focus
  ring; ESC always goes back.
- **Background tab** → the render loop pauses.

---

## 8. Status

- [x] Foundation: frame, header, router, scene, postprocessing
- [x] Pulses, chip impacts, runes, mist, title illumination
- [x] The three cards as glass surfaces at the anchor points
- [x] Depth of field follows the pointer
- [x] Intro: camera move, film overlay, glitch, sigil awakening, warp
- [ ] Click → camera move → panel grows from the pedestal
- [ ] CSS3D layer with the CV from `cv.json`
- [ ] Choreography: typewriter effect, education history, skill squares
- [ ] Integrate Meshy models

### Project Overview and Warp Waves (22 September 2026)

`projectsBrowser.js` uses the existing hologram styling for real HTML selection
controls. The first camera move must actually finish before the selection
appears. The subsequent 180° move remains under exclusive camera control.
`warpTunnel.js` draws single-colour and mixed-colour light contours based on
`Beispielwebseiten/warptunnel.jpg`: waves travel slowly from the outer field
of view towards the actual rectangular edge of the page. The iframe remains
sharp and interactive. ESC and the back control styled to match the footer
return to the project overview.

The example page extends native navigation with reading progress, gentle
fade-ins, chapter highlighting and subtle hardware parallax. Reduced motion
disables these new movements. Initial language selection: a German browser
uses DE; all others use EN. A manual selection is remembered. `test:waves`
checks these new effects, categories, scrolling and the return transition.
