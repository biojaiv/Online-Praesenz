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
- Hovering a header section gently raises its pedestal and triggers two brief light pulses. The website preview has an opaque surface. Its hologram disappears during the camera turn into the projected page; the surrounding tunnel contours combine slow waves with different wavelengths and speeds.

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

The browser checks use Playwright Chromium. `npm run build:cv` separately rebuilds CV documents; see the script and [CV documentation](docu_workprogress/) for its additional Python requirements.

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
- Beim Hover über einen Bereich in der Kopfzeile hebt sich der passende Sockel leicht und zeigt zwei kurze Lichtimpulse. Die Webseitenvorschau ist deckend. Während der Kameradrehung zur projizierten Seite verschwindet ihr Hologramm; die Wellen um die Seite überlagern ruhige Schwingungen mit unterschiedlichen Längen und Geschwindigkeiten.

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

Die Browserprüfungen verwenden Playwright Chromium. `npm run build:cv` erstellt die Lebenslaufdateien separat neu und benötigt zusätzlich Python-Werkzeuge; Einzelheiten stehen im Skript und in der [CV-Dokumentation](docu_workprogress/).

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
