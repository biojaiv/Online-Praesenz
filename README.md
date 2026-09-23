Application Website — Vladimir Leicht

An interactive, single-page job application by an IT specialist in systems integration.
Rather than a conventional portfolio with separate pages, it is a space containing
three sections as objects that the viewer moves towards and into.

1. What the Project Aims to Be

The website should not look like a CV uploaded to the internet. It should convey
the profession itself: infrastructure, signal paths and systems working out of sight.
That is why a network of circuit traces sits behind everything, also resembling
a starry sky — a motherboard and a universe share the same structure, at different scales.

Guiding principles

Principle

Implementation

Stillness before stimulation

No more than two pulses at once, with long pauses between them

No bouncing

Every transition is slow, gliding and ritual-like

One colour pair

Fibre blue for the resting state, amber for events and selection. Even the brief glitch pulses stay within this colour pair.

Content remains text

The CV is real HTML: selectable, searchable and indexable

No effect without a reason

Every animation communicates something

Atmospheric Reference

The visual language of the band Tool provides the atmospheric reference —
reinterpreted rather than directly quoted:

Fibonacci as a timing principle (Lateralus): spacing, pulse durations and
timings are not integer multiples of one another. The pattern almost never
repeats, without feeling random.

Sacred geometry: selected motifs from
Heiligegeometrie/DIVINE_SACRED_GEOMETRY_SYMBOLS-01.png appear in the space as
glowing vector symbols, with their brightness heavily subdued.

Deep black: objects emerge from nothing and disappear back into it.

2. The Background Scene

The Machine (Version 6)

A vast, procedurally built orrery stands behind and around the three pedestals
(src/scene/orreryMachine.js): concentric rings with graduated markings, twin
rails connected by rungs, staggered gear rings at the core, gimbal rings,
spherical cages and gears along the tracks, radial struts, three large tilted
rings and four smaller satellite mechanisms. Two shallow graduated rings and
two steeply tilted armillary rings are centred precisely on the middle of the
pedestal row — the structure surrounds the stage rather than simply sitting
behind it. The reference is Elemente/Orrery/orrery-source.png; the image is not
used as a texture. Instead, it is translated into geometry and simplified
where it would interfere with the foreground.

The machine rests in darkness. In its idle state, it is little more than a
silhouette against the mist. Light appears only occasionally and always
illuminates just part of the structure:

Travelling lights. Short-lived lights — cyan, occasionally amber or ice
blue — move along part of a single ring track for five to twelve seconds.
They illuminate only their immediate surroundings: gear teeth, rungs and
graduated markings. No more than three appear at once, with pauses of two
to six seconds. Their paths are selected using weighted sampling across all
rings in the main machine, the satellites and the armillary sphere around
the pedestals.

The light front. Every 11 to 22 seconds, a shell of light travels outwards
from the core at roughly 8.5 units per second, but only within a cone with a
half-angle of 22 to 40 degrees. It therefore sweeps across one sector of the
machine while leaving the rest dark. Every third front is amber, every fifth
violet; slightly more than half are directed towards the pedestals.

The core barely glows and briefly flares only when a light front begins.

Movement. All rotating groups move very slowly. The tilted rings — the
gimbal rings, the three large inclined rings and two additional travelling
rings in the main disc — do more than spin in place: they precess around the
core's axis. Each sits in a mount that slowly revolves around that axis, so
the plane of the ring visibly moves around the core. The armillary rings
around the pedestals do the same around their own centre. The machine keeps
moving behind the open CV, but the light fronts and travelling lights are
heavily subdued to keep the page readable.

Orbit. In its resting state, the stage responds to direct manipulation:
dragging with the mouse button held down, or with one finger on a tablet,
orbits the camera around the centre of the pedestal row. Horizontal movement
is unrestricted; vertical movement is limited. Motion eases to a stop after
release. From side angles, the camera automatically pulls back slightly to
keep all three pedestals in view. When approaching a pedestal, the viewing
angle returns to its starting position by the shortest route. On narrow
mobile screens, horizontal swiping selects the next pedestal instead.

Pulses

Pulses travel along the circuit traces — never more than two at once,
with pauses of 2.6 to 7.5 seconds. Each pulse has three phases:

Start

Travel

Impact

The pulse head appears on the track.

A tail follows behind it; the rune begins to glow.

The chip structure at the end of the track flashes in the same colour; the rune reaches peak brightness.

The impact is the defining moment. At the end of every track is a drawn chip
package: frame, core, pins and internal traces. It is almost invisible at
rest, then lights up in the pulse's colour for roughly one second when struck.

Runes

Each track has an associated rune that glows with its pulse. The runes are
defined as line strokes, not as a font — runes were carved rather than
written. This also avoids font-loading problems.

The five symbols used to convey meaning come from the Elder Futhark:

Symbol

Name

Meaning

ᚠ

Fehu

Prosperity

ᛃ

Jera

Competence

ᚨ

Ansuz

Intelligence

ᛊ

Sowilo

Success

ᚲ

Kenaz

Creativity

Additional symbols carry no intended message and serve only as texture:
Ogham (Beith, Luis, Muin) and alchemical element symbols (Ignis, Aer,
                                                          Terra, Sal). Two out of three runes carry meaning and are drawn brighter
                                                          than the decorative symbols.
                                                          
                                                          In addition to their pulse-driven glow, all runes have a subtle base shimmer
                                                          timed by the golden ratio. Each rune's phase is its track number multiplied
                                                          by the golden ratio. This distributes the moments of illumination as evenly
                                                          as possible, with no two runes running in sync. During the intro, this shimmer
                                                          runs at full strength — a quiet message to the visitor — before falling back
                                                          to one quarter of its intensity.
                                                          
                                                          Sacred Geometry Objects
                                                          
                                                          The PNG file is a visual reference atlas, not a permanently displayed
                                                          background image. Eleven line motifs are derived from it:
                                                          
                                                          Vesica Piscis, Torus / Lotus of Life, Seed of Life, Tree of Life,
Flower of Life, Egg of Life, Metatrons Cube,
Fruit of Life, Merkabah, Sri Yantra and Six Petal Rosette.

The figures share a common pool. Every 5.5 to 11.5 seconds, at most one
additional figure materialises at a new position and depth; no more than two
are visible at the same time. Each rotates slowly around all three axes,
glows for 7.5 to 13 seconds and disappears again. A pulse impact may trigger
an additional figure. Star Tetrahedron and Algiz are no longer included in
the selection pool. The header also avoids Merkabah, Sri Yantra and Metatron
motifs with overlapping triangles.

Depth

Four layers are staggered from z = −22 to −67, becoming dimmer and more
widely dispersed with distance. Behind them are 1,400 slowly twinkling stars,
roughly one in eight with a warm tint. Furthest back, at z = −190 to −270,
are four small nebula patches made from procedural fBm noise. They differ
in size, colour and rotation, all below 45% opacity. Their purpose is to
suggest space, not draw attention.

Title Illumination

When the page loads, an amber point of light travels once through
“IT SPECIALIST FOR SYSTEMS INTEGRATION”, letter by letter, followed by an
afterglow across the entire line. It does not repeat afterwards.

Intro Sequence

On the first visit, without a deep link or prefers-reduced-motion, a
six-second opening sequence plays. It can be skipped at any time with
a click or key press. An unobtrusive “Skip intro” text button is also visible
in the bottom-right corner from the start. After the first run, the intro is
marked as seen in local storage; subsequent visits start directly.

The space alone (0–0.7 s). The camera moves back from the depths to
its resting position.

The name (0.7–2.4 s) is revealed letter by letter from left to right,
with a rim of light following the reveal edge.

Signal disruption (~0.3 s): five abrupt frames with coloured ghost
copies of the name and sigil — noticeable, but not frantic. Film grain
and bloom briefly intensify with them.

Role and sigil (3.1–4.9 s): the job title fades in calmly, and the
sigil's three squares grow from nothing. The outer square turns left,
the middle one turns right, and the core pulses once.

Warp (4.95–6.0 s) towards the top-left corner. Only towards the end
do the pedestals rise from the depths. The middle pedestal first opens
  the project overview; choosing a website then starts the projection.
  There is no additional open button. The wordmark is the same DOM element
  used in the header. At the end, only its transform returns to zero,
guaranteeing pixel-perfect alignment.

A Calm Foreground

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

3. Structure

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

Navigation

There are no subpages. The header links to three sections, each with three
to four subsections. A click changes only the hash (#lebenslauf/faehigkeiten)
and triggers a camera move. ESC goes back. Deep links work, as does the
browser's back button.

The three menu items are designed as small instruments: a dial with an
orbiting satellite, each running at its own pace, an ordinal number (01–03)
and a title held between two corner brackets. On hover, the satellite speeds
up, the core glows amber, the brackets expand, and the submenu opens as a
semi-transparent panel beneath the instrument. The language switch is a
separate small control immediately to the right.

The three anchor points are stored in stage.slots at x = −9.2 / 0 / +9.2:

Section

Content

abschluss

Final project for the systems integration qualification (FISI) — server, UEM, clients, migration

projekte

IT projects — spatial project overview

projekte/webseiten

Websites — selection of the interactive example page

projekte/privat

Private projects — announced, with no projects available yet

lebenslauf

Career, skills, interests, contact

4. Technology

Component

Purpose

Vite

Development server and bundling

three

Scene, shaders, geometry

postprocessing (pmndrs)

Bloom, depth of field, vignette, film grain, SMAA

gsap

Choreography — the actual director

Implementation Techniques

A state texture instead of objects. The state of every track is stored
in a DataTexture, with one column per track. The vertex shader reads it
through an aId attribute. This keeps the core circuit-trace rendering at
three draw calls — lines, chips and runes — regardless of the number of
tracks. The sacred geometry objects are rendered separately from a small
pool, allowing each motif to rotate and fade in or out independently.

R = Head position 0..1   (−1 = track idle)
G = Pulse length
B = Hue (0 = teal, 1 = amber)
A = Impact flash 0..1

Hybrid rendering for the CV. The spatial preview is rendered as a texture
in WebGL. The reading version is real, selectable HTML within the existing
overlay. scripts/cv/build_legacy_projection.mjs exports the original SVGs,
without a portrait or date of birth, to public/cv/CV_Projection_*.webp and
CV_*.pdf. The DOCX reading versions are also exported without a date of birth
to CV_Reader_*.docx. Page anchors are defined in src/data/cvProjection.json.
Source files are not modified. Like the German reference, the PDF consists
of rasterised pages; selectable text is available in the HTML reading version.

To update: npm run build:cv. This requires Playwright Chromium and Python
with Pillow and PyMuPDF; CHROMIUM_PATH and CV_PYTHON can select local
installations. No running web server is required.

npm run test:harmony checks the intro, mobile pedestal selection, submenus,
downloads, German/English and minimum font size. npm run test:refinements
additionally checks hover/active colours, sounds, browser-language selection,
the header and permanently accessible contact details against the development
server (HARMONY_URL). Location, availability, email and PDF access sit directly
in the frame; “How this site is built” explains the technical evidence.

Known Pitfalls

active is a reserved word in GLSL ES and causes shaders to fail silently.

THREE.Clock is deprecated. Use THREE.Timer with update() and
getElapsed() / getDelta() instead.

Fibonacci numbers must not be used directly as durations in seconds;
otherwise, pauses can reach 68 seconds and the scene appears lifeless.

5. 3D Models (Meshy)

Division of work: Meshy creates only solid hard-surface objects — cubes,
pedestals, server racks and laptops. Anything glowing, holographic or transparent
is created procedurally in Three.js, because no image-to-3D service can reconstruct
glow, transparency or particles.

References and ready-to-use prompts are stored in Begrüßungsbild/meshy-input/.

Settings that actually take effect

Setting

Value

Reason

Topology

Smart Topology

Required for target_polycount to be respected

Model

Meshy T2

T1 ignores the polygon count entirely

Poly Count

12,000

The upper limit is 15,000

Pose

Off



Textures

PBR, 4K

Later reduced to 2K or 1K using gltf-transform

Export

GLB



Important details

Image-to-3D has no geometry prompt field, only texture_prompt.

Prompts are limited to 600 characters; beyond that, the API returns 400.

Negative prompts have no effect from Meshy 5 onwards. Phrases such as
“no rust” are ineffective and may be counterproductive. Instead, describe
what should be present in positive terms.

With the default model, should_remesh is set to false, which silently
causes the requested polygon count to be ignored.

Finished models belong in models/.

6. Commands

Note: npm install dev does not install this project's development
dependencies. It installs a separate, outdated npm package named dev,
which pulls in inotify and fails with current Node versions. Use
npm install for dependencies, followed by npm run dev for the
development server.

npm install
npm run dev      # Development server
npm run build    # Production bundle in dist/
npm run preview  # Preview the bundle locally

7. Accessibility and Fallbacks

No WebGL → the CV is delivered as a plain HTML version.

prefers-reduced-motion → no camera moves, no illumination sweep and
no typewriter effect; the page appears immediately in a still state.

Narrow screens → depth of field is disabled, camera moves are shorter,
and the panel fills the screen.

Keyboard → all sections are reachable using Tab, with a visible focus
ring; ESC always goes back.

Background tab → the render loop pauses.

8. Status

Foundation: frame, header, router, scene, postprocessing

Pulses, chip impacts, runes, mist, title illumination

The three cards as glass surfaces at the anchor points

Depth of field follows the pointer

Intro: camera move, film overlay, glitch, sigil awakening, warp

Click → camera move → panel grows from the pedestal

CSS3D layer with the CV from cv.json

Choreography: typewriter effect, education history, skill squares

Integrate Meshy models

Project Overview and Warp Waves (22 September 2026)

projectsBrowser.js uses the existing hologram styling for real HTML selection
controls. The first camera move must actually finish before the selection
appears. The subsequent 180° move remains under exclusive camera control.
warpTunnel.js draws single-colour and mixed-colour light contours based on
Beispielwebseiten/warptunnel.jpg: waves travel slowly from the outer field
of view towards the actual rectangular edge of the page. The iframe remains
sharp and interactive. ESC and the back control styled to match the footer
return to the project overview.

The example page extends native navigation with reading progress, gentle
fade-ins, chapter highlighting and subtle hardware parallax. Reduced motion
disables these new movements. Initial language selection: a German browser
uses DE; all others use EN. A manual selection is remembered. test:waves
checks these new effects, categories, scrolling and the return transition.






# Bewerbungsseite — Vladimir Leicht

Interaktive Einseiten-Bewerbung eines Fachinformatikers für Systemintegration.
Kein klassisches Portfolio mit Unterseiten, sondern **ein Raum**, in dem drei
Bereiche als Objekte stehen und in den man hineinfährt.

---

## 1. Was das Projekt sein will

Die Seite soll nicht wie ein Lebenslauf aussehen, der ins Netz gestellt wurde.
Sie soll den Beruf selbst spürbar machen: Infrastruktur, Signalwege, Systeme,
die im Verborgenen arbeiten. Deshalb liegt hinter allem ein Leiterbahnennetz,
das gleichzeitig wie ein Sternenhimmel wirkt — Mainboard und Universum sind
dieselbe Struktur, nur in anderem Maßstab.

**Leitsätze**

| Prinzip | Umsetzung |
|---|---|
| Stille vor Reiz | Höchstens zwei Impulse gleichzeitig, lange Pausen dazwischen |
| Nichts federt | Alle Übergänge langsam, gleitend, ritualhaft |
| Ein Farbpaar | Faserblau als Ruhezustand, Bernstein als Ereignis und Auswahl. Auch die kurzen Glitch-Impulse bleiben in diesem Farbpaar. |
| Inhalt bleibt Text | Der Lebenslauf ist echtes HTML, markierbar, durchsuchbar, indexierbar |
| Kein Effekt ohne Grund | Jede Animation transportiert eine Aussage |

### Atmosphärische Referenz

Als Stimmungsvorlage dient die Bildsprache der Band **Tool** — übersetzt, nicht
zitiert:

- **Fibonacci als Taktgeber** (*Lateralus*): Abstände, Impulsdauern und
  Timings stehen in keinem ganzzahligen Verhältnis zueinander. Das Muster
  wiederholt sich praktisch nie, ohne dass es zufällig wirkt.
- **Heilige Geometrie**: Ausgewählte Motive aus
  `Heiligegeometrie/DIVINE_SACRED_GEOMETRY_SYMBOLS-01.png` werden als
  leuchtende Vektorsymbole in den Raum gesetzt und stark gedämpft.
- **Tiefes Schwarz**: Dinge treten aus dem Nichts hervor und verschwinden
  wieder darin.

---

## 2. Die Szenerie im Hintergrund

### Die Maschine (Stand v6)

Hinter und um die drei Sockel steht ein riesiges, prozedural gebautes
Planetarium (`src/scene/orreryMachine.js`): konzentrische Ringe mit
Gradteilungen, Doppelschienen mit Sprossen, gestaffelte Zahnkränze im Kern,
Kardanringe, Sphärenkäfige und Zahnräder auf den Bahnen, radiale Streben,
drei große schräge Ringe sowie vier kleinere Satelliten-Mechanismen. Zwei
flache Skalenringe und zwei steile Armillarringe liegen genau um die Mitte
der Sockelreihe — die Struktur **umschließt** die Bühne, sie liegt nicht nur
dahinter. Vorlage ist `Elemente/Orrery/orrery-source.png`; das Bild wird
nicht als Textur verwendet, sondern in Geometrie übersetzt und dort
reduziert, wo es dem Vordergrund im Weg stünde.

Die Maschine liegt im Dunkeln. Im Ruhezustand ist sie kaum mehr als eine
Silhouette vor dem Nebel; Licht gibt es nur von Zeit zu Zeit, und es trifft
immer nur Teile der Struktur:

- **Läufer.** Kurzlebige Lichter (Cyan, seltener Bernstein oder Eis), die für
  fünf bis zwölf Sekunden ein Stück einer einzelnen Ringbahn entlangwandern
  und dabei nur ihre unmittelbare Umgebung erhellen — Zahnkranz, Sprossen,
  Skalenteilung. Höchstens drei zugleich, mit Pausen von zwei bis sechs
  Sekunden. Sie wählen ihre Bahn gewichtet aus allen Ringen der Haupt-
  maschine, der Satelliten und der Armillarsphäre um die Sockel.
- **Die Front.** Alle 11 bis 22 Sekunden läuft vom Kern eine Lichtschale mit
  rund 8,5 Einheiten je Sekunde nach außen — aber nur innerhalb eines Kegels
  von 22 bis 40 Grad halbem Öffnungswinkel. Sie streift also einen Sektor der
  Maschine und lässt den Rest dunkel. Jede dritte Front ist bernsteinfarben,
  jede fünfte violett; gut die Hälfte zielt in Richtung der Sockel.
- **Der Kern** glimmt kaum und flammt nur beim Start einer Front kurz auf.

**Bewegung.** Alle Drehgruppen laufen sehr langsam. Die geneigten Ringe —
Kardanringe, die drei großen Schrägringe und zwei zusätzliche Wanderringe in
der Hauptscheibe — drehen sich nicht nur in sich, sondern **präzedieren um
die Achse des Kerns**: jeder hängt in einem Halter, der langsam um die
Kernachse kreist, sodass die Ringebene sichtbar um den Kern wandert. Die
Armillarringe um die Sockel tun dasselbe um ihren Mittelpunkt. Hinter dem
geöffneten Lebenslauf bleibt die Maschine in Bewegung, Front und Läufer
werden aber stark gedämpft, damit die Seite lesbar bleibt.

**Orbit.** Im Ruhezustand lässt sich die Bühne anfassen: Ziehen mit gedrückter
Maustaste oder auf Tablets mit einem Finger dreht die Kamera um die Mitte der Sockelreihe
(horizontal frei, vertikal begrenzt) und läuft nach dem Loslassen aus. Seitlich
weicht die Kamera automatisch etwas zurück, damit alle drei Sockel im Bild
bleiben. Beim Anfahren eines Sockels kehrt der Blickwinkel auf kürzestem Weg
in die Ausgangslage zurück. Auf schmalen Mobilbildschirmen wählt horizontales
Wischen stattdessen den nächsten Sockel.

### Impulse

Auf den Leiterbahnen laufen Impulse — **niemals mehr als zwei gleichzeitig**,
mit Pausen von 2,6 bis 7,5 Sekunden. Ein Impuls hat drei Phasen:

```
   Start                    Lauf                     Aufprall
     │                        │                          │
  Kopf setzt              Schweif zieht            Chipstruktur am
  auf der Bahn            hinterher,               Bahnende blitzt in
  an                      Rune glimmt auf          derselben Farbe auf,
                                                   Rune erreicht Maximum
```

Der Aufprall ist der eigentliche Moment: Am Ende jeder Bahn sitzt ein
gezeichnetes Chipgehäuse — Rahmen, Kern, Anschlussbeinchen, Innenleitungen.
Es liegt im Ruhezustand fast unsichtbar da und leuchtet beim Treffer für rund
eine Sekunde in der Farbe des Impulses auf.

### Runen

Jede Bahn hat eine Rune zugeordnet, die mit dem Impuls mitglimmt. Sie sind als
**Strichzüge** definiert, nicht als Schriftart — Runen wurden geritzt, nicht
geschrieben. Das vermeidet zugleich Ladeprobleme mit Fonts.

Die fünf verwendeten bedeutungstragenden Zeichen stammen aus dem Älteren Futhark:

| Zeichen | Name | Bedeutung |
|---|---|---|
| ᚠ | Fehu | Wohlstand |
| ᛃ | Jera | Kompetenz |
| ᚨ | Ansuz | Intelligenz |
| ᛊ | Sowilo | Erfolg |
| ᚲ | Kenaz | Kreativität |

Dazu kommt Beiwerk ohne Aussage, nur als Textur: **Ogham** (Beith, Luis, Muin)
und **alchemistische Elementzeichen** (Ignis, Aer, Terra, Sal). Zwei von drei
Runen sind bedeutungstragend und werden heller gezeichnet als das Beiwerk.

Zusätzlich zum Impuls-Glimmen tragen alle Runen einen leisen **Grundglimmer
im goldenen Takt**: Die Phase jeder Rune ist ihre Bahnnummer mal goldenem
Schnitt — die Aufleuchtmomente verteilen sich dadurch maximal gleichmäßig,
ohne dass je zwei Runen synchron laufen. Während des Intros steht dieser
Glimmer auf voller Stärke (die stille Botschaft an den Besucher), danach
zieht er sich auf ein Viertel zurück.

### Sakrale Objekte

Die PNG-Datei ist ein visueller Referenzatlas, kein dauerhaft eingeblendetes
Hintergrundbild. Daraus sind elf verwendete Strichmotive abgeleitet:

`Vesica Piscis`, `Torus / Lotus of Life`, `Seed of Life`, `Tree of Life`,
`Flower of Life`, `Egg of Life`, `Metatrons Cube`,
`Fruit of Life`, `Merkabah`, `Sri Yantra` und `Six Petal Rosette`.

Die Figuren liegen in einem gemeinsamen Pool. Alle 5,5 bis 11,5 Sekunden
materialisiert sich höchstens eine weitere Figur an einer neuen Position und
Tiefe; maximal zwei sind gleichzeitig sichtbar. Jede rotiert langsam um alle
drei Achsen, glimmt 7,5 bis 13 Sekunden und verschwindet wieder. Ein
Impuls-Aufprall darf zusätzlich eine Figur auslösen. Star Tetrahedron und
Algiz gehören nicht mehr zum Auswahlpool. Die Kopfzeile verwendet außerdem
keine Merkabah-, Sri-Yantra- oder Metatron-Motive mit überlagerten Dreiecken.

### Tiefe

Vier Ebenen, gestaffelt von z = −22 bis −67, jede weiter hinten schwächer und
weiter gestreut. Dahinter 1400 Sterne mit langsamem Funkeln, davon etwa jeder
achte warm getönt. Ganz hinten (z = −190 bis −270) liegen **vier kleine
Nebelfelder** aus prozeduralem fBm-Rauschen — unterschiedlich groß, gefärbt und
gedreht, alle unter 45 % Deckkraft. Sie sollen Raum andeuten, nicht auffallen.

### Titel-Durchleuchtung

Beim Seitenaufruf wandert einmal ein bernsteinfarbener Lichtpunkt durch
„FACHINFORMATIKER FÜR SYSTEMINTEGRATION", Buchstabe für Buchstabe, gefolgt von
einem Nachhall über der ganzen Zeile. Danach nie wieder.

### Intro-Sequenz

Beim ersten Besuch (ohne Deep Link, ohne
`prefers-reduced-motion`) läuft eine Eröffnung von **sechs Sekunden**. Sie ist
jederzeit per Klick oder Taste abbrechbar; zusätzlich erscheint von
Beginn an unten rechts ein stiller Textknopf „Intro überspringen". Nach dem ersten
Durchlauf wird das Intro lokal als gesehen gespeichert; weitere Besuche starten direkt.

1. **Der Raum allein** (0–0,7 s). Die Kamera fährt aus der Tiefe auf ihre
   Ruheposition zurück.
2. **Der Name** (0,7–2,4 s) legt sich Buchstabe für Buchstabe von links nach
   rechts frei, ein Lichtsaum begleitet die Kante.
3. **Signalbruch** (~0,3 s): fünf harte Bilder mit farbigen Geisterkopien von
   Name und Sigil — spürbar, nicht hektisch. Filmkorn und Bloom ziehen kurz
   mit.
4. **Rolle und Sigil** (3,1–4,9 s): die Bezeichnung blendet ruhig ein, die
   drei Quadrate des Sigils wachsen aus dem Nichts — das äußere dreht nach
   links, das mittlere nach rechts, der Kern pulsiert einmal.
5. **Warp** (4,95–6,0 s) nach oben links; erst gegen Ende steigen die Sockel aus
   der Tiefe. Der mittlere Sockel führt zuerst zur Projektübersicht. Erst die Wahl einer Webseite startet die Projektion. Einen zusätzlichen Öffnen-Knopf gibt es nicht. Der Markenzug ist dasselbe DOM-Element wie in der Kopfzeile;
   am Ende fällt nur sein Transform auf null zurück, er rastet also
   zwangsläufig pixelgenau ein.

### Ruhe im Vordergrund

Die Kopfzeile trägt keine Dauerbewegung mehr: der Name steht in einem festen
Verlauf, die Rolle in festem Bernstein. Der Marken-Glitch ist ein Akzent etwa
jede halbe Minute (weiche Störungsarten bevorzugt, kaum Nachbeben), das
Symbol in der Kopfmitte erscheint nur noch alle 16 bis 30 Sekunden und
ausschließlich in Cyan oder Bernstein. Bedienelemente wechseln beim Hover in
ihre Zielfarbe — kein Signalbruch, kein Aufhellungsfilter, Bernstein bleibt
Bernstein.

Die Vorderkanten tragen die zweisprachigen Bereichstitel. Alle drei Sockel
ruhen in Faserblau; Hover wechselt langsam zwischen Blau und Bernstein,
der aktive Titel bleibt bis zum Verlassen bernsteinfarben. Bei reduzierter
Bewegung steht die Hoverfarbe still. Spiegelbilder der unteren Sockel rahmen
die Hologramme von oben ein. Die zusätzliche Textgravur wurde entfernt;
bereits in das GLB eingebackene Modellschrift bleibt erhalten.
Die Rahmen bleiben blau; obere und untere Jet-Streams tragen dynamische Blau-, Türkis- und Bernsteinbänder. Die Sockelkörper drehen sich langsam um ihre eigene Achse; Titel und Dokumente bleiben lesbar ausgerichtet. Die Beispielvorschau ist
auch beim Hover gedämpft blau; erst die geöffnete HTML-Seite trägt ihre
Originalfarben. Nach der Kameradrehung blendet die Kopfzeile aus. Ein ruhiger
blauer Rahmen, unscharfe Umgebung und langsame Randwellen begrenzen die
scharfe, bedienbare Seite. ESC oder der untere Zurück-Knopf führen zurück.

Die Lebenslauf-Projektion verwendet wieder die frühere zweispaltige
SVG-Gestaltung, ohne Porträt und Geburtsdatum. Die ausführliche Lesefassung bleibt echtes HTML.
Lesefassung und Download stehen in den jeweiligen Untermenüs, Zoomhinweise
in der Fußzeile. Mobil zeigt die Übersicht einen Sockel pro Ansicht, wählbar
per Wischen, Punktnavigation oder Pfeiltasten. Der TV-Synchronlauf der
Hologramme bleibt auf die Übersicht beschränkt.

---

## 3. Aufbau

```
webseite/
├── index.html                  Rahmen, Kopfzeile, Bühne, Fußzeile
├── package.json
├── public/
│   └── data/cv.json            Lebenslaufdaten, vom Code getrennt
├── src/
│   ├── main.js                 Einstiegspunkt
│   ├── style.css               Fibonacci-Abstände, Farbwelt
│   ├── scene/
│   │   ├── stage.js            Renderer, Kamera, Composer, Ankerpunkte
│   │   ├── background.js       Hintergrund-Fassade (Intro-Kompatibilität, Zustände)
│   │   ├── orreryMachine.js    Die Orrery-Maschine: Geometrie, Läufer, Sektor-Fronten, Präzession
│   │   ├── cards.js            Die drei Bereichskarten (Sockel, Platte, Staub)
│   │   └── runes.js            Zeichensatz als Strichzüge
│   └── ui/
│       ├── router.js           Hash-Router ohne Seitenwechsel
│       ├── intro.js            Eröffnungssequenz mit Warp in die Kopfzeile
│       └── title.js            Buchstabenweise Durchleuchtung
├── Begrüßungsbild/
│   ├── <Vorlagebild>.jpg
│   └── meshy-input/            Zugeschnittene Vorlagen + PROMPTS.txt
└── Lebenslauf/
    ├── <Originalbild>.jpg
    ├── lebenslauf_skills_v2.png/.jpg   Korrigierte Fassung
    └── cv.json
```

### Navigation

Es gibt **keine Unterseiten**. Die Kopfzeile verlinkt drei Bereiche mit je drei
bis vier Unterbereichen. Ein Klick ändert nur den Hash (`#lebenslauf/faehigkeiten`)
und löst eine Kamerafahrt aus. ESC führt zurück. Deep Links funktionieren,
der Browser-Zurück-Knopf auch.

Die drei Menüpunkte sind als kleine **Instrumente** gestaltet: ein Zifferblatt
mit kreisendem Trabanten (jedes in eigenem Takt), eine Ordnungszahl (01–03)
und der Titel, gefasst von zwei Eckklammern. Beim Ansteuern beschleunigt der
Trabant, der Kern brennt bernsteinfarben, die Klammern wachsen, und das
Untermenü klappt als halbtransparente Tafel unter das Instrument. Der
Sprachschalter ist ein eigenes kleines Schaltfeld rechts daneben.

Die drei Ankerpunkte liegen in `stage.slots` bei x = −9,2 / 0 / +9,2:

| Bereich | Inhalt |
|---|---|
| `abschluss` | Abschlussprojekt FISI — Server, UEM, Clients, Migration |
| `projekte` | IT-Projekte — räumliche Projektübersicht |
| `projekte/webseiten` | Webseiten — Auswahl der interaktiven Beispielseite |
| `projekte/privat` | Private Projekte — angekündigt, noch keine Projekte |
| `lebenslauf` | Werdegang, Fähigkeiten, Interessen, Kontakt |

---

## 4. Technik

| Baustein | Wofür |
|---|---|
| **Vite** | Entwicklungsserver und Bündelung |
| **three** | Szene, Shader, Geometrie |
| **postprocessing** (pmndrs) | Bloom, Depth of Field, Vignette, Filmkorn, SMAA |
| **gsap** | Choreografie — der eigentliche Regisseur |

### Kniffe, die hier drinstecken

**Zustandstextur statt Objekte.** Der Zustand aller Bahnen liegt in einer
`DataTexture` mit einer Spalte je Bahn. Der Vertex-Shader liest über ein
`aId`-Attribut daraus. Dadurch bleibt der Kern der Leiterbahnen bei **drei Draw
Calls** (Linien, Chips, Runen), egal wie viele Bahnen existieren. Die sakralen
Objekte werden separat aus einem kleinen Pool gerendert, damit jedes Motiv
unabhängig rotieren und ein- bzw. ausblenden kann.

```
R = Kopfposition 0..1   (−1 = Bahn ruht)
G = Impulslänge
B = Farbton (0 = blaugrün, 1 = bernstein)
A = Aufprallblitz 0..1
```

**Hybrid-Rendering für den Lebenslauf.** Die räumliche Vorschau läuft als
Textur in WebGL. Die Lesefassung ist echtes, auswählbares HTML im vorhandenen
Overlay. `scripts/cv/build_legacy_projection.mjs` exportiert die ursprünglichen
SVGs ohne Porträt und Geburtsdatum nach `public/cv/CV_Projection_*.webp` und `CV_*.pdf`.
Die DOCX-Lesefassungen werden ebenfalls ohne Geburtsdatum nach `CV_Reader_*.docx` exportiert. Die Seitenanker stehen in `src/data/cvProjection.json`. Quelldateien werden
nicht verändert. Die PDF-Fassung besteht wie die deutsche Vorlage aus
Rasterseiten; auswählbarer Text ist in der HTML-Lesefassung verfügbar.

Zum Aktualisieren: `npm run build:cv` (Playwright Chromium und Python mit
Pillow und PyMuPDF erforderlich; `CHROMIUM_PATH` und `CV_PYTHON` können
lokale Installationen auswählen). Kein laufender Webserver erforderlich.
`npm run test:harmony` prüft Intro, mobile Sockelauswahl, Untermenüs,
Downloads, DE/EN und die Mindestschriftgröße. `npm run test:refinements`
prüft zusätzlich Hover-/Aktivfarben, Klänge, Browser-Sprachwahl, Kopfzeile
und dauerhaft erreichbare Kontaktdaten gegen den Entwicklungsserver
(`HARMONY_URL`). Standort, Verfügbarkeit, E-Mail und PDF stehen direkt
im Rahmen; „Wie diese Seite gebaut ist“ erläutert die technischen Nachweise.

### Bekannte Stolpersteine

- `active` ist ein **reserviertes Wort in GLSL ES** und lässt Shader still
  scheitern.
- `THREE.Clock` ist abgekündigt, stattdessen `THREE.Timer` mit `update()` und
  `getElapsed()` / `getDelta()`.
- Fibonacci-Zahlen dürfen nicht direkt als Sekunden verwendet werden, sonst
  ergeben sich Pausen bis zu 68 Sekunden und die Szene wirkt tot.

---

## 5. 3D-Modelle (Meshy)

Arbeitsteilung: **Meshy baut nur solide Hard-Surface-Objekte** — Würfel,
Sockel, Serverrack, Laptops. Alles Leuchtende, Holografische und Durchsichtige
entsteht prozedural in Three.js, weil kein Image-to-3D-Dienst Glühen,
Transparenz oder Partikel rekonstruieren kann.

Vorlagen und fertige Prompts liegen in `Begrüßungsbild/meshy-input/`.

**Einstellungen, die tatsächlich greifen**

| Einstellung | Wert | Warum |
|---|---|---|
| Topologie | Smart Topology | Nur damit wird `target_polycount` beachtet |
| Modell | Meshy T2 | T1 ignoriert den Polycount vollständig |
| Poly Count | 12 000 | Obergrenze liegt bei 15 000 |
| Pose | aus | |
| Texturen | PBR, 4K | Später per `gltf-transform` auf 2K bzw. 1K |
| Export | GLB | |

**Wichtig zu wissen**

- Image-to-3D hat **kein Geometrie-Prompt-Feld**, nur `texture_prompt`.
- Prompts sind auf **600 Zeichen** begrenzt, darüber antwortet die API mit 400.
- **Negativ-Prompts wirken seit Meshy 5 nicht mehr.** Formulierungen wie „no
  rust" sind wirkungslos und möglicherweise kontraproduktiv — stattdessen
  positiv beschreiben, was da sein soll.
- Beim Standardmodell steht `should_remesh` auf `false`, dann wird der
  gewünschte Polycount stillschweigend ignoriert.

Fertige Modelle gehören nach `models/`.

---

## 6. Befehle

> **Hinweis:** `npm install dev` installiert nicht die Entwicklungsabhängigkeiten
> dieses Projekts, sondern ein separates veraltetes npm-Paket namens `dev`.
> Dieses zieht `inotify` nach und scheitert unter aktuellen Node-Versionen.
> Verwende `npm install` für die Abhängigkeiten und danach `npm run dev` für
> den Entwicklungsserver.

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Produktionsbündel nach dist/
npm run preview  # Bündel lokal prüfen
```

---

## 7. Barrierefreiheit und Fallbacks

- **Kein WebGL** → der Lebenslauf wird als reine HTML-Fassung ausgeliefert
- **`prefers-reduced-motion`** → keine Kamerafahrt, keine Durchleuchtung,
  kein Schreibmaschineneffekt; die Seite steht sofort still da
- **Schmale Bildschirme** → Tiefenunschärfe aus, Kamerafahrt verkürzt,
  Panel füllt den Bildschirm
- **Tastatur** → alle Bereiche per Tab erreichbar, sichtbarer Fokusring,
  ESC führt immer zurück
- **Tab im Hintergrund** → Renderschleife hält an

---

## 8. Stand

- [x] Grundgerüst: Rahmen, Kopfzeile, Router, Szenerie, Nachbearbeitung
- [x] Impulse, Chip-Aufprall, Runen, Nebel, Titel-Durchleuchtung
- [x] Die drei Karten als Glasflächen an den Ankerpunkten
- [x] Tiefenunschärfe folgt dem Zeiger
- [x] Intro: Kamerafahrt, Filmeinblendung, Glitch, Sigil-Erwachen, Warp
- [ ] Klick → Kamerafahrt → Panel wächst aus dem Sockel
- [ ] CSS3D-Ebene mit dem Lebenslauf aus `cv.json`
- [ ] Choreografie: Schreibmaschine, Bildungsweg, Fähigkeitsquadrate
- [ ] Meshy-Modelle einsetzen

### Projektübersicht und Warp-Wellen (22.09.2026)

`projectsBrowser.js` nutzt die bestehende Hologrammgestaltung für echte HTML-Auswahlfelder. Die erste Kamerafahrt muss tatsächlich beendet sein, bevor die Auswahl erscheint. Die folgende 180°-Fahrt bleibt unter exklusiver Kamerasteuerung. `warpTunnel.js` zeichnet einfarbige und gemischte Lichtkonturen nach der Referenz `Beispielwebseiten/warptunnel.jpg`: Wellen laufen langsam vom äußeren Sichtfeld auf den tatsächlichen rechteckigen Seitenrand zu. Das iframe bleibt scharf und bedienbar. ESC und der Zurück-Schalter im Fußzeilenstil führen zur Projektübersicht zurück.

Die Beispielseite ergänzt native Navigation um Lesefortschritt, sanftes Einblenden, Kapitelmarkierung und dezente Hardware-Parallaxe. Reduzierte Bewegung schaltet die neuen Bewegungen ab. Erster Sprachaufruf: deutscher Browser → DE, alle anderen → EN; eine manuelle Auswahl bleibt gespeichert. `test:waves` prüft diese neuen Effekte, Kategorien, Scrolling und Rückkehr.
