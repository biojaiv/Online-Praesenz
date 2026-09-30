# Vladimir Leicht — Application Website

**English** · [Deutsch ↓](#deutsch)

[Visit the website](https://vladimir-leicht.com/) · [Project documentation](docu_workprogress/)

An interactive application website for an IT specialist in systems integration. The three spatial sections present the final qualification project, IT projects and career history. Camera movement connects the sections; documents and the CV remain readable as HTML.

## Experience

- The three pedestals use the authored Blender files `Sockel_de.blend`, `Sockel_eng.blend` and `Sockel_oben.blend`. Their labels follow the selected language. The right pedestal uses green accents in both languages and on its upper cap.
- The background comes from `Elemente/Orrery/Hintergrund.blend`. Its exported GLB contains the main machine, four distant machines, rings and struts. The scene uses the four original Blender PBR materials. `orrery-source.png` is a visual reference in the “How this site is built” view; it does not cover the 3D model.
- Five or six lights travel along actual moving rings and struts. Each pass chooses different routes, including horizontal and vertical travel. Their range is adjusted to illuminate approximately 15–20% of the visible *sampled ring and strut lengths*. Actual screen brightness varies with metal reflections, occlusion and the fade in and out. Passes last 12–17 seconds and are separated by 11–22 seconds of darkness.
- Turning behind the pedestals reveals the distant machines with subdued lighting. The main structure remains episodic. Sparse, static stars sit farther behind the scene.
- The rings rotate more noticeably while retaining a calm pace. Reduced motion keeps the background animation still.
- The final project contains the systems integration qualification work. The project overview and CV provide spatial previews and readable content, with keyboard, touch and no WebGL fallbacks.
- Hovering a header section gently raises its pedestal and triggers two brief light pulses. All three hologram surfaces use an opaque dark blue matched to the scene; their text and images remain visible. Selecting a project opens its content in a full viewport.
- Clicking the middle hologram unfolds two opaque wings: amber Websites and cyan Systems integration. The Websites wing offers two direct preview cards: Tiefgang and PASSUNG. The Systems integration wing opens the Recovery Lab film. There is no divider or section switch. Up/Down and the wheel retain camera zoom; mobile presents both sheets as scrollable HTML. All holograms share one physical height and jet alignment, and opening a pedestal keeps the same content and lighting. Pages and video load only when selected.
- Rendering uses device hints and sustained frame timings to limit GPU resolution, with lighter post-processing on constrained devices. Fully unlit Orrery meshes are skipped before drawing; conservative bounds retain every potentially illuminated surface. The 3D scene and its decorative update loop pause behind an opened website. Closing releases the embedded document and stops its particle border. HTML remains at native resolution. See the [measurement notes](docu_workprogress/resource-usage-2026-09-24.md) and [MDN's WebGL guidance](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices).
- Selected projects fill the viewport with a blue particle border matching the hologram edges. The camera stays in place. The ESC/back control remains below the content; reduced motion and hidden tabs pause the edge animation. Check with `npm run test:fullscreen`.

## Two project wings and Recovery Lab

`src/data/projects.js` defines Tiefgang and PASSUNG under Websites, plus Recovery Lab under Systems integration. The two preview cards share their coordinates between the canvas texture and projected HTML links; clicking a card expands its own image into the matching page. The earlier KnallBlauMedia concepts are no longer listed on the pedestal. The CV again uses the original `CV_Projection_DE/EN.webp` assets; the later `CV_Hologram` variants are no longer displayed. All three pedestal descriptions wrap around cylindrical front strips with transparent text textures. They remain readable when orbiting and use the existing language and hover states. The wheel scrolls documents; hold the left mouse button or Ctrl while wheeling to zoom. `npm run test:hologram-alignment` checks geometry, unchanged preview content, labels and direct activation.

Recovery Lab uses the supplied German film and a fully translated English MP4, including diagram labels and all 13 explanation cards. A short description below the player distinguishes the existing lab from planned recovery extensions. An accessible transcript is included. Both videos are silent, 139.5 seconds, 1080p and about 12 MB each. `npm run build:recovery-film` regenerates the English film and transcripts from `scripts/recovery/film.html` and `english.js` (requires Playwright Chromium and FFmpeg); ordinary builds reuse the media. `npm run test:project-wings` checks the interaction with local dev and preview servers running.

## Tiefgang — a workplace comes to life

The Websites wing includes `/beispiel/?lang=en` (German: `?lang=de`). Seven scroll chapters follow Jana’s laptop from unboxing to a ready workplace. The supplied `Entwuerfe/Webseitenbeispiel_Tiefgang.png` supplies the hardware artwork inside responsive SVG layers. The surrounding bilingual HTML, DHCP dialogue, redundant uplink simulation and VM drawer share the chapter state.

The 00:04:12 counter is a compressed model timeline, not a measured deployment result. PXE and UEM chapters link to the actual baramundi pilot project. Reduced motion enables a reading view with seven still drawings; the generated HTML also contains complete English and German chapters without JavaScript. ESC closes an open VM first, then returns from the full viewport.

```sh
npm run test:tiefgang
npm run build:example-previews
```

The build regenerates `beispiel/index.html` from `src/example/reading.js`. Edit the shared content in `src/example/content.js`, not the generated HTML. See [implementation notes](docu_workprogress/tiefgang-2026-09-25.md).

## Archived RESONANZ and PALIMPSEST studies

The portfolio gallery now shows only Tiefgang and PASSUNG. RESONANZ and PALIMPSEST remain as local source studies; neither is linked from the portfolio, listed in the sitemap, or included in the production build.

- `/beispiele/resonanz/?lang=en`: “Forms of sound”: a silver, instanced sculpture with six distinct voices and three room choices. Dragging or scrolling sideways sweeps pitch and spectrum across three octaves while morphing the entire spine between spiral and wave. Vertical dragging changes bend, depth and brightness; vertical scrolling changes chapter. Double-click resets the form; the range also supports the keyboard. A slowly pulsing, centered footer button enables sound explicitly; playback stops when hidden or closed. The sound uses soft sine/triangle voices, harmonic overtones, restrained high frequencies and gentle attack/release envelopes. The former rotary controls and sound export have been removed.
- `/beispiele/palimpsest/?lang=en`: a Blender paper city based on Pforzheim: 2026, 1924, 1643 and AD 244. One red marker travels continuously along the exported line, including the folds. Blender landmarks are inspired by the Reuchlinhaus, central station, Kollmar & Jourdan, St Michael’s church and Leitgastturm. Residents leave entrances, small birds fly and appropriate chimneys smoke in the active era only. Other eras hold their poses; the tram moves only while 1924 is selected. The footer offers three sourced, illustrated discoveries per era (twelve in each language). Eleven detailed vector miniatures use shaded paper, stone, leather, clay and brass without added image requests or render passes. The initial 1924 selection matches the illustrated ticket; year controls and stories also work without WebGL.
- Both include German (`?lang=de`), responsive layouts, reduced motion and the existing full-screen/ESC lifecycle. These archived examples and their previews are not loaded by the portfolio. RESONANZ caps decorative motion near 30 fps; PALIMPSEST uses at most 30 fps (20 on low-power devices). The city can be paused; both examples stop rendering when hidden and respect reduced motion. The city uses one Cycles daylight atlas and separate timeline/selection geometry; no runtime shadow pass is needed. GPU pixel count is capped.
- `npm run build:creative-previews` captures both actual pages in DE/EN and desktop/mobile sizes using the running local server. These archived images are not used by the current portfolio cards.
- `npm run test:creative` checks controls, sideways scrolling, audio lifecycle, languages, mobile layout and no-WebGL navigation. `node scripts/creative/check_audio.mjs` measures the live oscillator response and rendered offline audio spectra. `node scripts/creative/check_integration.mjs` checks gallery integration, curved descriptions, matching previews and focus restoration. `node scripts/creative/check_dynamics.mjs` verifies substantial two-axis deformation, continuous marker travel on the exported polyline, the twelve DE/EN stories, active-era animation isolation and motion controls against the dev server. [Pforzheim and motion notes](docu_workprogress/creative-dynamics-pforzheim-2026-09-27.md). [Sound and active-era follow-up](docu_workprogress/creative-sound-active-eras-2026-09-27.md).

### PASSUNG — precision engineering

`/beispiele/passung/?lang=en` (German: `?lang=de`) implements the PASSUNG concept as one of the two responsive examples in the Websites wing, replacing the city study. Its preview expands into the existing full-screen projection, with the hologram border and ESC return. A drive assembly is authored in Blender and exported as nine movable component groups. Scrolling separates and assembles the housing, bearings, shaft, retaining ring, spacer, covers and fasteners along their common axis. The blue drawing and the solid metal share the same source geometry. The page includes chapter navigation, a motion control, accessible dialogs and a local enquiry draft that can be copied or downloaded.

The machine follows the detailed reference `Entwuerfe/passung-bauteil.jpg`, including the sculpted housing, rounded feet, component spacing and shallow camera angle. Its spatial CAD drawing uses exported Blender profiles and drilling data: depth sections, bore channels, dashed hidden lines and translucent wall surfaces meet the metal at a moving section plane. Machining textures are packed in the Blender source and losslessly compressed for the web export. The design follows the supplied JPG and draws on research into visual complexity, credibility and motion control. See [implementation and research notes](docu_workprogress/passung-implementation-2026-09-27.md). `npm run build:passung` rebuilds the Blender source and web exports; `npm run test:passung` checks interaction and fallbacks; `npm run build:passung-previews` captures the actual page in both languages and screen sizes.

The assembly rotates slowly clockwise, pauses over a hovered part and stands on a soft reflective floor. At full separation, nine numbered component labels and their leaders follow the model through manual rotation. The closed retaining ring and bilingual exploded-view terminology are documented in the [annotation notes](docu_workprogress/passung-annotations-2026-09-28.md).

### Blender sources and web exports

The editable scenes are in `Elemente/Beispiele/`: `RESONANZ.blend`, `PALIMPSEST.blend` and `Fahrkarte_1924.blend`. They follow the RESONANZ and PALIMPSEST v4 concept JPGs. The sculpture uses 82 instances of a sculpted metal lamella (one draw call); phones and low-power devices load the lighter geometry. The city includes locally inspired museum cubes, a glazed station hall, the green-tiled Kollmar & Jourdan factory, the sandstone church and city tower alongside workshop roofs, market stalls and Roman foundations. Doorways and smoke emitters are exported with their era to anchor animation in the authored geometry. The separate tram and pedestrian meshes retain vertex colours. The red route exports its actual vertices and station indices for continuous travel along the folded paper. The German and English tram tickets are small Blender renders.

`npm run build:creative-models` regenerates these assets with Blender, bakes the city light, compresses geometry with Draco and creates the ticket WebPs. It requires Blender 4.3+, ImageMagick and the installed npm dependencies. The normal build does **not** run Blender. After visual changes, run `npm run build:creative-previews` with the dev server running, then `npm run build`. The authoring script lives at `scripts/creative/blender/build_assets.py`; the printed ticket textures remain beside the `.blend` sources. [Blender implementation notes](docu_workprogress/creative-blender-2026-09-27.md).

The active hologram contours and jets now use [separate GLSL modules and material factories](src/scene/shaders/README.md). They add restrained Fresnel, a brief activation pulse and resolution-aware edge detail within the existing particle draws. Independent uniforms, adaptive quality, live reduced-motion handling and a static compile-error fallback share the existing scene lifecycle. Document textures remain opaque and unchanged. `npm run test:glsl` checks real rendering, content pixels, resource stability and shader failure. The [shader implementation plan](docu_workprogress/shader-umsetzungsplan-2026-09-27.md) retains the later Orrery and fullscreen-frame proposals.

## Performance and search metadata

The visual scene and document resolution are retained. Document pixel processing runs in a worker with the original canvas path as a compatibility fallback; `npm run test:efficiency` compares their pixels in both languages with the dev server running. Barlow uses the original, locally hosted WOFF2 subsets. Preview images use WebP, and sounds use lossless FLAC (WAV fallback) after the first user gesture.

`npm run build` checks derived media against source hashes. Checked-in, unchanged assets need no conversion tools; changing preview JPEGs or source WAVs requires ImageMagick or FFmpeg respectively. Keep `scripts/media-assets.json` and the derived files with those changes. The original documents and Blender exports remain the sources of truth.

The four public pages receive static titles, descriptions, canonical links, social previews and JSON-LD through `scripts/seo_plugin.mjs`; localized metadata follows the active language. `public/sitemap.xml` excludes the existing noindex concept demos. Cloudflare caches only content-hashed `/assets/` files immutably; stable document URLs revalidate. These hosting rules take effect on the next deployment.

## Run locally

```sh
npm ci
npm run dev
```

Vite prints the local URL. To check the production bundle:

```sh
npm run build
npm run preview
```

The regular build uses the checked-in `*_web.glb` files and does not require Blender. Re-export the authored models only when their `.blend` sources change:

```sh
npm run build:sockel
npm run build:background
npm run build
```

The export scripts require Blender in `PATH` or `BLENDER_PATH`. The background and pedestal exporters preserve the source files. The web models are compressed with Draco.

With the development server running at `http://127.0.0.1:5173/`, the focused browser checks are:

```sh
npm run test:sockel
npm run test:background
SITE_URL=http://127.0.0.1:5173 npm run test:inspection
```

The browser checks use Playwright Chromium. `npm run build:cv-projection` renders the CV hologram (`public/cv/CV_Projection_DE/EN.webp`) and its section anchors from `scripts/cv/hologram_content.mjs`. `npm run build:cv` separately rebuilds the downloadable CV documents; see the script and [CV documentation](docu_workprogress/) for its additional Python requirements.

## Repository map

| Path | Purpose |
| --- | --- |
| `src/scene/stage.js` | Renderer, camera, navigation and scene timing |
| `src/scene/cards.js` | Pedestals, language variants and foreground content |
| `src/scene/background.js` | Loads the authored Orrery and distant stars |
| `src/scene/orreryLighting.js`, `orreryPaths.js`, `orreryCoverage.js`, `orreryMaterials.js` | Motion, structural light routes, coverage and original material response |
| `Elemente/Sockel/`, `Elemente/Orrery/` | Blender sources, web GLBs and the Orrery reference PNG |
| `src/ui/siteInspection.js` | Bilingual “How this site is built” explanation |
| `scripts/sockel/`, `scripts/background/` | Exporters and browser checks |

Detailed notes: [Blender pedestals](docu_workprogress/blender-sockel-2026-09-24.md) and [Blender Orrery](docu_workprogress/blender-hintergrund-2026-09-24.md).

## Publishing

GitHub uses the `main` branch. Cloudflare Pages serves the project `webseite` at [vladimir-leicht.com](https://vladimir-leicht.com/). This Pages project uses `free` as its **production branch**, so a direct upload must specify that branch:

```sh
npm run build
wrangler pages deploy dist --project-name webseite --branch free
```

A `main` branch upload to this Pages project creates a preview deployment. Verify the production domain after publishing. Deployment requires access to the configured Cloudflare account.

---

# Deutsch

**Deutsch** · [English ↑](#vladimir-leicht--application-website)

[Website öffnen](https://vladimir-leicht.com/) · [Projektdokumentation](docu_workprogress/)

Eine interaktive Bewerbungsseite für einen Fachinformatiker für Systemintegration. Drei Bereiche im Raum zeigen das Abschlussprojekt, IT-Projekte und den Lebenslauf. Die Kamera verbindet die Bereiche; Dokumente und Lebenslauf bleiben als HTML lesbar.

## Darstellung

- Die drei Sockel stammen aus `Sockel_de.blend`, `Sockel_eng.blend` und `Sockel_oben.blend`. Ihre Beschriftungen passen sich der Seitensprache an. Der rechte Sockel hat in beiden Sprachen und am oberen Abschluss grüne Akzente.
- Der Hintergrund stammt aus `Elemente/Orrery/Hintergrund.blend`. Der GLB-Export enthält die Hauptmaschine, vier entfernte Maschinen, Ringe und Streben. Die vier ursprünglichen Blender-PBR-Materialien bleiben erhalten. `orrery-source.png` dient als Bildvorlage in „Wie diese Seite gebaut ist“ und liegt nicht über dem 3D-Modell.
- Fünf oder sechs Lichter wandern auf tatsächlichen, mitbewegten Ringen und Streben. Jeder Durchgang wählt andere Bahnen und bewegt sich auch waagerecht und senkrecht. Die Reichweite wird auf ungefähr 15–20 % der sichtbaren *abgetasteten Ring- und Strebenlänge* eingestellt. Reflexionen, Überdeckungen und das Ein- und Ausblenden verändern die tatsächlich sichtbare Helligkeit. Die Phasen dauern 12–17 Sekunden; dazwischen liegen 11–22 Sekunden Dunkelheit.
- Hinter den Sockeln werden die entfernten Maschinen dezent sichtbar. Die Hauptstruktur wird weiterhin nur zeitweise beleuchtet. Einzelne ruhende Sterne liegen noch weiter im Hintergrund.
- Die runden Elemente drehen sich deutlicher, aber ruhig. Bei reduzierter Bewegung steht die Hintergrundanimation still.
- Abschlussprojekt, Projektübersicht und Lebenslauf besitzen räumliche Vorschauen und lesbare Inhalte. Tastatur, Touch und ein Ersatzweg ohne WebGL werden unterstützt.
- Beim Hover über einen Bereich in der Kopfzeile hebt sich der passende Sockel leicht und zeigt zwei kurze Lichtimpulse. Alle drei Hologrammflächen haben ein deckendes Dunkelblau, das zur Szene passt; Texte und Bilder bleiben sichtbar. Ein ausgewähltes Projekt öffnet sich bildschirmfüllend.
- Beim Klick auf das mittlere Hologramm klappen zwei deckende Flügel auf: Webseiten in Amber und Systemintegration in Cyan. Der Webseiten-Flügel bietet zwei direkte Vorschaukarten für Tiefgang und PASSUNG; der Systemintegrations-Flügel öffnet den Recovery-Lab-Film. Trennlinie und Umschalter entfallen. Hoch-/Runterpfeil und Mausrad zoomen weiterhin; mobil sind beide Blätter untereinander scrollbar. Alle Hologramme haben dieselbe Höhe und denselben Übergang zum Jetstream. Beim Öffnen bleiben Inhalt und Beleuchtung gleich. Seiten und Film laden erst beim Auswählen.
- Gerätehinweise und dauerhaft langsame Bildzeiten begrenzen automatisch die GPU-Auflösung. Schwächere Geräte erhalten eine leichtere Nachbearbeitung. Vollständig unbeleuchtete Orrery-Flächen werden vor dem Zeichnen ausgelassen; großzügige Objektgrenzen erhalten alle möglicherweise beleuchteten Flächen. Hinter einer geöffneten Webseite pausieren die 3D-Szene und ihre zusätzlichen Animationen. Beim Schließen wird das eingebettete Dokument freigegeben und der Partikelrand angehalten. HTML bleibt in nativer Auflösung. Details stehen in den [Messnotizen](docu_workprogress/resource-usage-2026-09-24.md).
- Ausgewählte Projekte füllen den Bildschirm mit einem blauen Partikelrand wie an den Hologrammen. Die Kamera bleibt stehen. Die ESC-Rückkehr bleibt unter dem Inhalt; reduzierte Bewegung und verborgene Tabs stoppen die Randanimation. Prüfung mit `npm run test:fullscreen`.

## Zwei Projektflügel und Recovery Lab

`src/data/projects.js` enthält Tiefgang/Jana und PASSUNG unter Webseiten sowie Recovery Lab unter Systemintegration. Leinwandtextur und HTML-Klickziele teilen sich die Kartenkoordinaten; beim Öffnen wächst das jeweilige Vorschaubild in die dazugehörige Seite. Die früheren KnallBlauMedia-Konzepte werden am Sockel nicht mehr angeboten. Der Lebenslauf verwendet wieder die ursprünglichen Dateien `CV_Projection_DE/EN.webp`; die später erzeugten `CV_Hologram`-Varianten werden nicht mehr angezeigt. Alle drei Sockelbeschreibungen liegen als transparente Schrifttexturen auf zylindrisch gekrümmten Streifen am vorderen Ring. Sprache und Hover-Zustände bleiben verbunden. Das Mausrad scrollt Dokumente; mit linker Maustaste oder Strg wird gezoomt. Der alte Pfad `projekte/privat` führt jetzt zur Systemintegration.

Recovery Lab zeigt den vorgegebenen deutschen Film und eine vollständig übersetzte englische MP4-Fassung mit Grafikbeschriftungen und allen 13 Erklärungskarten. Unter dem Player stehen ein kurzer Erklärungstext sowie ein aufklappbares Transkript. Bestand und geplante Erweiterung bleiben ausdrücklich getrennt. Beide Filme sind ohne Ton, 139,5 Sekunden lang und jeweils etwa 12 MB groß. Die englische Fassung lässt sich mit `npm run build:recovery-film` erneut erzeugen; dafür werden Playwright Chromium und FFmpeg benötigt.

## Tiefgang — ein Arbeitsplatz entsteht

Der mittlere Sockel öffnet `/beispiel/?lang=de` (Englisch: `?lang=en`). Sieben Scrollkapitel begleiten Janas Laptop vom Auspacken bis zum fertigen Arbeitsplatz. Die Hardwarezeichnung aus `Entwuerfe/Webseitenbeispiel_Tiefgang.png` liegt in responsiven SVG-Ebenen. Die zweisprachigen HTML-Inhalte, DHCP-Gespräch, Uplink-Ausfall und VM-Schublade teilen sich den Kapitelzustand.

00:04:12 ist eine verdichtete Modellzeit, kein gemessenes Deployment-Ergebnis. PXE und UEM verweisen auf das echte baramundi-Pilotprojekt. Reduzierte Bewegung aktiviert eine Lesefassung mit sieben Standbildern; auch ohne JavaScript enthält das erzeugte HTML alle Kapitel auf Englisch und Deutsch. ESC schließt zuerst eine geöffnete VM, danach die Vollansicht.

Prüfen mit `npm run test:tiefgang`, Sockelvorschauen mit `npm run build:example-previews` aktualisieren. Der Build erzeugt `beispiel/index.html` aus gemeinsamen Inhalten in `src/example/content.js` und `reading.js`. [Technische Notizen](docu_workprogress/tiefgang-2026-09-25.md).

## Archivierte Studien RESONANZ und PALIMPSEST

Die Portfolio-Galerie zeigt jetzt nur Tiefgang und PASSUNG. RESONANZ und PALIMPSEST bleiben als lokale Quellstudien erhalten; sie sind weder im Portfolio noch in der Sitemap oder im Produktions-Build enthalten.

- `/beispiele/resonanz/?lang=de`: „Formen der Töne“: silberne Klangskulptur mit sechs deutlich verschiedenen Klangcharakteren und drei Räumen. Waagerechtes Ziehen oder seitliches Scrollen verändert Tonhöhe und Spektrum über drei Oktaven und verformt die gesamte Skulptur zwischen Spirale und Welle. Senkrechtes Ziehen verändert Biegung, Tiefe und Klanghelligkeit; senkrechtes Scrollen wechselt das Kapitel. Doppelklick setzt die Form zurück; der Formregler ist auch per Tastatur bedienbar. Der zentrale Tonknopf in der Fußzeile pulsiert langsam. Ton startet bewusst und stoppt beim Verbergen oder Schließen. Sinus- und Dreiecksstimmen, harmonische Obertöne, gedämpfte Höhen sowie sanftes Ein- und Ausblenden prägen den Klang. Drehknöpfe und Klangexport sind entfernt.
- `/beispiele/palimpsest/?lang=de`: Blender-Stadtmodell auf Grundlage Pforzheims: 2026, 1924, 1643 und 244 n. Chr. Ein roter Punkt wandert durchgehend auf der exportierten Zeitlinie, auch über die Falten. Die Blender-Gebäude orientieren sich an Reuchlinhaus, Hauptbahnhof, Kollmar & Jourdan, Schlosskirche St. Michael und Leitgastturm. Nur die aktive Epoche wird belebt: Figuren laufen aus Eingängen, kleine Vögel kreisen und passende Schornsteine rauchen. Andere Epochen behalten ihre letzte Position; die Straßenbahn fährt nur bei aktivem 1924. Im Footer stehen je Epoche drei illustrierte Geschichten mit Quellen (zwölf pro Sprache). Elf ausgearbeitete Vektorminiaturen zeigen Papier, Stein, Leder, Ton und Messing mit Materialschattierungen, ohne zusätzliche Bildanfragen oder Renderdurchgänge. Die anfängliche Auswahl 1924 passt zur illustrierten Fahrkarte; Jahreszahlen und Geschichten funktionieren auch ohne WebGL.
- Beide Seiten bieten Deutsch/Englisch, mobile Layouts, reduzierte Bewegung und den bestehenden Vollbild-/ESC-Ablauf. Diese archivierten Seiten und ihre Vorschaubilder lädt das Portfolio nicht mehr. RESONANZ begrenzt die dekorative Bewegung auf ungefähr 30 fps; PALIMPSEST auf höchstens 30 fps (20 auf schwächerer Hardware). Die Stadt lässt sich anhalten. Beide Beispiele pausieren beim Verbergen und beachten reduzierte Bewegung. Die Stadt verwendet einen in Cycles gebackenen Lichtatlas und separate Geometrien für Zeitlinie und Auswahl. Eine Schattenberechnung pro Frame entfällt; die Renderauflösung ist begrenzt.
- `npm run build:creative-previews` erzeugt echte Screenshots in beiden Sprachen und Bildschirmgrößen. Die aktuelle Galerie verwendet diese archivierten Bilder nicht.
- `npm run test:creative` prüft Bedienung, seitliches Scrollen, Audio-Lebenszyklus, Sprachen, mobiles Layout und WebGL-Ausfall. `node scripts/creative/check_audio.mjs` misst die tatsächliche Oszillatorreaktion und offline gerenderte Klangspektren. `node scripts/creative/check_integration.mjs` prüft Galerie, gekrümmte Beschriftungen, passende Vorschauen und Fokusrückgabe. `node scripts/creative/check_dynamics.mjs` prüft am Entwicklungsserver die stärkere zweiachsige Verformung, den wandernden Punkt auf der exportierten Zeitlinie, die zwölf Geschichten in DE/EN, Animationen ausschließlich in der aktiven Epoche und die Bewegungspause. [Pforzheim- und Bewegungsnotizen](docu_workprogress/creative-dynamics-pforzheim-2026-09-27.md). [Nachtrag zu Klang und aktiven Epochen](docu_workprogress/creative-sound-active-eras-2026-09-27.md).

### PASSUNG — Präzisionstechnik

`/beispiele/passung/?lang=de` (Englisch: `?lang=en`) setzt den PASSUNG-Entwurf als eine von zwei responsiven Beispielseiten im Webseiten-Flügel um und ersetzt dort die Stadtstudie. Ihre Vorschau öffnet sich in der bestehenden Vollbildprojektion mit Hologrammrand und ESC-Rückkehr. Die in Blender modellierte Antriebsbaugruppe besteht aus neun beweglichen Gruppen. Gehäuse, Lager, Welle, Ringe, Deckel und Verschraubung laufen beim Scrollen entlang derselben Achse zusammen und auseinander. Konstruktionslinien und Metalloberflächen nutzen dieselbe Geometrie. Dazu kommen Kapitelnavigation, Bewegungssteuerung, zugängliche Dialoge und ein lokaler Anfrageentwurf zum Kopieren oder Herunterladen.

Die Maschine folgt der Detailvorlage `Entwuerfe/passung-bauteil.jpg`: geschwungenes Gehäuse, gerundete Füße, passende Teileabstände und flacherer Kamerawinkel. Die räumliche CAD-Zeichnung nutzt exportierte Blender-Profile und Bohrungsdaten: Tiefenschnitte, Bohrungskanäle, gestrichelte verdeckte Kanten und transparente Wandflächen treffen an einer beweglichen Schnittebene auf das Metall. Bearbeitungstexturen sind in der Blender-Quelle eingebettet und für den Webexport verlustfrei komprimiert. Die Gestaltung orientiert sich an der JPG-Vorlage sowie Forschung zu visueller Komplexität, Glaubwürdigkeit und kontrollierbarer Bewegung. [Umsetzung und Recherche](docu_workprogress/passung-implementation-2026-09-27.md). `npm run build:passung` erzeugt Blender-Quelle und Webexporte; `npm run test:passung` prüft Bedienung und Ersatzdarstellungen; `npm run build:passung-previews` erstellt echte Vorschauen in beiden Sprachen und Bildschirmgrößen.

Die Baugruppe dreht sich langsam im Uhrzeigersinn, pausiert beim Hover über einem Bauteil und steht auf einer weich spiegelnden Fläche. Vollständig ausgefahren zeigen neun nummerierte Beschriftungen mit Bezugslinien die Teile auch während der manuellen Drehung. Der geschlossene Haltering und die zweisprachigen Namen sind in den [Beschriftungsnotizen](docu_workprogress/passung-annotations-2026-09-28.md) erläutert.

### Blender-Quellen und Webexporte

Unter `Elemente/Beispiele/` liegen die bearbeitbaren Szenen `RESONANZ.blend`, `PALIMPSEST.blend` und `Fahrkarte_1924.blend`. Grundlage sind die RESONANZ- und PALIMPSEST-v4-JPGs. Die Klangskulptur verwendet 82 Instanzen einer geformten Metalllamelle in einem Draw Call; für Mobilgeräte und schwächere Hardware gibt es eine reduzierte Geometrie. Die Stadt besitzt lokal inspirierte Museumswürfel, eine gläserne Bahnhofshalle, die grüne Kollmar-&-Jourdan-Fassade, Sandsteinkirche und Stadtturm neben Werkstätten, Marktständen und römischen Fundamenten. Eingänge und Rauchquellen werden mit ihrer Epoche exportiert, damit die Animation an der modellierten Architektur beginnt. Straßenbahn und Fußgänger werden als eigene Geometrien mit Vertexfarben exportiert. Die rote Route überträgt ihre tatsächlichen Punkte und Stationen für eine durchgängige Bewegung über die Papierfalten. Die deutsche und englische Fahrkarte sind kleine Blender-Renderings.

`npm run build:creative-models` erzeugt die Modelle, backt das Stadtlicht, komprimiert die Geometrien mit Draco und erstellt die Fahrkarten-WebPs. Dafür sind Blender 4.3+, ImageMagick und die installierten npm-Abhängigkeiten nötig. Der normale Build benötigt **kein Blender**. Nach sichtbaren Änderungen bei laufendem Entwicklungsserver `npm run build:creative-previews` und anschließend `npm run build` ausführen. Das Erstellungsskript liegt unter `scripts/creative/blender/build_assets.py`; die Drucktexturen der Fahrkarte bleiben bei den Blender-Dateien. [Blender-Umsetzungsnotizen](docu_workprogress/creative-blender-2026-09-27.md).

Die aktiven Hologrammkanten und Jets verwenden jetzt [eigene GLSL-Dateien und Materialmodule](src/scene/shaders/README.md). Dezentes Fresnel, ein kurzer Aktivierungsimpuls und an die Auflösung angepasste Kantendetails nutzen die vorhandenen Partikel-Zeichenaufrufe. Unabhängige Uniforms, Qualitätsstufen, dynamisch berücksichtigte reduzierte Bewegung und statischer Ersatz bei Shaderfehlern sind an den vorhandenen Lebenszyklus angeschlossen. Dokumenttexturen bleiben deckend und unverändert. `npm run test:glsl` prüft echte Renderausgaben, Inhaltspixel, Ressourcenstabilität und Shaderfehler. Weitere Orrery- und Vollbildrahmen-Effekte verbleiben im [Shader-Umsetzungsplan](docu_workprogress/shader-umsetzungsplan-2026-09-27.md).

## Leistung und Suchmaschinen

Szene und Dokumentauflösung bleiben erhalten. Die Pixelaufbereitung der Hologramme läuft in einem Worker; ältere Browser verwenden den bisherigen Canvas-Pfad. `npm run test:efficiency` vergleicht bei laufendem Entwicklungsserver die Pixel beider Varianten in DE und EN. Barlow wird mit den originalen WOFF2-Teilmengen lokal geladen. Vorschauen nutzen WebP, Sounds nach der ersten Nutzerinteraktion verlustfreies FLAC mit WAV-Fallback.

Der Build prüft die abgeleiteten Medien anhand ihrer Quelldatei-Hashes. Unveränderte, eingecheckte Dateien benötigen keine Konvertierungswerkzeuge. Nach Änderungen an Vorschau-JPEGs beziehungsweise WAVs werden ImageMagick beziehungsweise FFmpeg benötigt. Manifest und erzeugte Dateien gehören gemeinsam in die Versionsverwaltung.

Die fünf öffentlichen Seiten erhalten statische Seitentitel, Beschreibungen, kanonische URLs, Vorschaumetadaten und JSON-LD. Die Metadaten folgen außerdem der gewählten Sprache. Die Sitemap enthält keine bestehenden Noindex-Konzeptdemos. Cloudflare darf ausschließlich Dateien mit Inhalts-Hash dauerhaft cachen; stabile Dokument-URLs werden revalidiert. Die Hosting-Regeln gelten nach der nächsten Veröffentlichung.

## Lokal starten

```sh
npm ci
npm run dev
```

Vite zeigt die lokale Adresse an. Den Produktionsstand lokal prüfen:

```sh
npm run build
npm run preview
```

Der normale Build verwendet die eingecheckten `*_web.glb`-Dateien und benötigt Blender nicht. Nur nach Änderungen an den `.blend`-Quellen neu exportieren:

```sh
npm run build:sockel
npm run build:background
npm run build
```

Dafür muss Blender über `PATH` oder `BLENDER_PATH` erreichbar sein. Die Quelldateien bleiben unverändert; die Webmodelle werden mit Draco komprimiert.

Wenn der Entwicklungsserver unter `http://127.0.0.1:5173/` läuft, prüfen diese Browserläufe die betreffenden Bereiche:

```sh
npm run test:sockel
npm run test:background
SITE_URL=http://127.0.0.1:5173 npm run test:inspection
```

Die Browserprüfungen verwenden Playwright Chromium. `npm run build:cv-projection` rendert das Lebenslauf-Hologramm (`public/cv/CV_Projection_DE/EN.webp`) samt Sprungmarken aus `scripts/cv/hologram_content.mjs`. `npm run build:cv` erstellt die Lebenslaufdateien zum Herunterladen separat neu und benötigt zusätzlich Python-Werkzeuge; Einzelheiten stehen im Skript und in der [CV-Dokumentation](docu_workprogress/).

## Wichtige Dateien

| Pfad | Aufgabe |
| --- | --- |
| `src/scene/stage.js` | Renderer, Kamera, Navigation und Zeitsteuerung |
| `src/scene/cards.js` | Sockel, Sprachvarianten und Vordergrundinhalte |
| `src/scene/background.js` | Lädt die Blender-Orrery und die fernen Sterne |
| `src/scene/orreryLighting.js`, `orreryPaths.js`, `orreryCoverage.js`, `orreryMaterials.js` | Bewegung, Lichtbahnen, Abdeckung und Reaktion der Originalmaterialien |
| `Elemente/Sockel/`, `Elemente/Orrery/` | Blender-Quellen, Web-GLBs und Orrery-Bildvorlage |
| `src/ui/siteInspection.js` | Zweisprachige Erklärung „Wie diese Seite gebaut ist“ |
| `scripts/sockel/`, `scripts/background/` | Export und Browserprüfungen |

Details: [Blender-Sockel](docu_workprogress/blender-sockel-2026-09-24.md) und [Blender-Orrery](docu_workprogress/blender-hintergrund-2026-09-24.md).

## Veröffentlichung

GitHub verwendet den Branch `main`. Cloudflare Pages stellt das Projekt `webseite` auf [vladimir-leicht.com](https://vladimir-leicht.com/) bereit. Der **Produktionsbranch dieses Pages-Projekts heißt `free`**. Deshalb muss ein direkter Upload diesen Branch angeben:

```sh
npm run build
wrangler pages deploy dist --project-name webseite --branch free
```

Ein Upload mit `main` erzeugt in diesem Projekt lediglich eine Vorschau. Nach dem Upload sollte die Produktionsdomain geprüft werden. Für den Upload wird Zugang zum eingerichteten Cloudflare-Konto benötigt.
