# Interaktive Beispielwebseite als räumliche Projektion

- Ausgangspunkt: `8e84b18`, Arbeitsbranch `work/ihk-hologram-film-20260922-082805`. Bereits vorhandene IHK-Änderungen und unversionierte Entwürfe wurden übernommen bzw. unberührt gelassen. Keine `AGENTS.md` im Projekt oder in den übergeordneten Verzeichnissen gefunden. Kein Commit, Push oder Deployment für diesen Auftrag.
- Vorlage vor Umsetzung geöffnet: `Beispielwebseiten/VL_Beispiel.png`. Das Original bleibt unverändert. Hardwaremotiv: Ausschnitt `(575, 130)–(1536, 921)`, WebP mit 961 × 791 px / 194.706 Bytes. Die Vorschau wurde aus der echten HTML-Seite bei 1440 × 960 px gerendert und auf 900 × 600 px reduziert (67.508 Bytes).
- Eigene Route: `/beispiel/`, als zweiter Vite-HTML-Einstieg innerhalb desselben Projekts. Echte Navigation, Überschriften, auswählbarer Text, aufklappbare Erklärung und Kontaktlink. DE/EN über das bestehende i18n-System. Projekt- und Bildungsdaten stammen aus den vorhandenen IHK-Texten und CV-JSON-Dateien. Keine erfundenen Kunden oder Qualifikationen; das Hardwaremotiv und die Gestaltungsstudie werden ausdrücklich eingeordnet. Keine Formulare oder vorgetäuschten Versandfunktionen.
- Der tatsächliche mittlere Sockel ist `card-projekte` (Layoutindex 1). Seine bisherige „Coming soon“-Fläche wurde durch die kleine Vorschau ersetzt. Raycasting, ein räumlich positionierter Tastaturlink und der normale Link im Projekte-Menü öffnen dieselbe Projektion.
- Kamera: exklusiver Zustand innerhalb der vorhandenen Render-Schleife; gespeicherte Position, Blickrichtung, Orbit, Steuerungsziel und Scrollversatz. 1,05 s Anfahrt mit weicher Beschleunigung, anschließend 1,5 s kontinuierliche Drehung um die vertikale Weltachse von −Z nach +Z. Die Kamera bleibt oberhalb und vor dem Sockel, der nach der Drehung hinter ihr liegt. Rückfahrt kehrt die Bewegung um und stellt Zustand und Fokus wieder her. Mehrfachaktivierung startet keine zweite Fahrt.
- Bedienung: gleichursprüngliches iframe, erst bei Aktivierung geladen, während der Anfahrt inert. Frontaler HTML-Lichtbereich mit deckender heller Textfläche, weichem Rand, feiner statischer Körnung und kurzer sanfter Aufhellung. Temporärer räumlicher Lichtkegel mit 26 sparsamen Lichtstaubpunkten; keine neuen Partikelsäulen auf den Sockeln. Effekte nehmen keine Eingaben an. Kamera und Szene-Scroll bleiben während der Bedienung gesperrt.
- Modalität und Fokus: natives `dialog`, ständig erreichbare Rückkehr und separater Seitenaufruf. Nachrichten aus dem iframe werden auf Herkunft und Fenster geprüft. Escape funktioniert auch innerhalb des iframe. Schließen entfernt iframe, temporäre Listener, Timer, Lichtgeometrien und Materialien. Reduzierte Bewegung öffnet ohne Kamerafahrt; mobile Geräte erhalten keinen Lichtkegel oder Körnung. Bei fehlendem WebGL führt der normale Menülink zur eigenständigen Seite.

## Dateien

- Neu: `beispiel/index.html`, `vite.config.js`, `src/example/{main.js,style.css}`, `src/data/example.messages.js`, `src/scene/{examplePreview.js,exampleFlight.js}`, `src/ui/{exampleProjection.js,exampleProjection.css}`, `public/example/{hardware.webp,preview.webp}`, `scripts/example/{check_browser.mjs,check_production.mjs}`.
- Erweitert: `index.html`, `package.json`, `src/{main.js,i18n.js,style.css}`, `src/scene/{cards.js,stage.js}`, `src/ui/router.js`, `scripts/ihk/check_hologram_film.mjs` (Synchronisation nach Sprachwechsel, unveränderte 3-px-Toleranz).
- IHK-Filme, PDFs und zugehörige Quelldokumente wurden in diesem Auftrag nicht verändert. Vorhandene lokale Änderungen aus dem vorherigen IHK-Auftrag bleiben erhalten.

## Prüfungen

- `npm run build`: erfolgreich; beide HTML-Einstiege und lokale Motive werden nach `dist/` übernommen.
- `node --check` für neue/angepasste JS-Module und Tests sowie `git diff --check`: erfolgreich. Kein separates Lint-/Typecheck-Script vorhanden.
- `npm run test:example:production`: erfolgreich. Zehn DE/EN-Kombinationen bei 1920 × 1080, 1440 × 900, 1366 × 768, 768 × 1024 und 390 × 844; keine horizontalen Überläufe der Beispielseite. HTTP 200 und richtige Dateitypen für Motive sowie bestehende DE/EN-PDFs und Filme. WebGL-Ausfall simuliert, normaler Link zur Beispielseite geprüft. Native Tastaturscrollfunktion, separates Fenster und Rückkehr zum Abschlussprojekt geprüft.
- `npm run test:projection`: erfolgreich, einschließlich Desktop/Mobilgerät, Maus, Pinch, DE/EN und Lebenslauf-Regressionsprüfung.
- `npm run test:navigation`: erfolgreich, einschließlich Maus/Touch, Untermenüs und reduzierter Bewegung.
- `npm run test:ihk` mit `IHK_TEST_WIDTHS=1366,390`: vier DE/EN-Kombinationen erfolgreich; tatsächliche Downloads, Filmwiedergabe, Navigation, Tastatur und HTTP.
- `npm run test:hologram`: erfolgreich in DE/EN auf Desktop und Mobilgerät. Ein erster Test maß unmittelbar nach dem Sprachwechsel noch die vorherige CSS-Matrix, während der Header bereits seine Größe geändert hatte. Der Test wartet jetzt innerhalb eines begrenzten Zeitfensters auf den zugehörigen Renderdurchlauf, weiterhin mit derselben 3-px-Toleranz. Gemessene Abweichungen im abschließenden Durchlauf: 0,015–1,405 px.
- `npm run test:example`: erfolgreich auf Desktop und Mobilgerät. Tatsächliche Aktivierung der mittleren 3D-Vorschau, kontinuierliche halbe Kameradrehung (mit gemessenen Zwischenstellungen), Sockel hinter der Kamera, ruhige Kamera beim Mausrad-/Touch-Scrollen, Textauswahl, DE/EN-Wechsel, Escape aus dem iframe, Rückfahrt samt Blickrichtung/Fokus, Tastaturaktivierung, erneutes Öffnen, schnelle Mehrfachklicks sowie Abbruch während der Anfahrt geprüft. Reduzierte Bewegung lässt die Kameraposition unverändert. Ein Fehler im neuen Touch-Test betraf dessen Playwright-Argumentübergabe; die protokollierten Touch-Ereignisse und der tatsächliche Scrollweg waren bereits korrekt. Nach Korrektur besteht auch dieser Test vollständig.

Bild- und Messnachweise liegen außerhalb des Repositorys unter `/tmp/example-projection-check`, `/tmp/example-production-check`, `/tmp/example-regression-projection`, `/tmp/example-regression-navigation`, `/tmp/example-regression-reader` und `/tmp/example-regression-hologram-final`. Desktop-, Mobil-, DE- und EN-Ansichten wurden visuell geöffnet und mit der Vorlage bzw. der vorhandenen Szene verglichen. Browserprüfungen erfolgten mit Chromium/SwiftShader und mobilen Geräteprofilen; kein physisches Smartphone oder Safari-Test.

## Lokal ansehen

- Portfolio: `http://127.0.0.1:4173/`
- Direkte Beispielseite: `http://127.0.0.1:4173/beispiel/?lang=de`
- Kein separates Lint- oder Typecheck-Script im vorhandenen Projekt. JavaScript-Syntaxprüfung und Vite-Build sind verfügbar. Bekannte bestehende npm-prefix-Meldung und Vite-Warnung zur Größe des Hauptbundles; keine Änderung der lokalen `.npmrc`.

## Verbleibende Einschränkungen

Keine bekannten Funktionsfehler in den geprüften Abläufen. Browserabdeckung: Chromium mit Mobil-Emulation; physische Geräte und Safari wurden nicht geprüft. Die vorhandenen npm-/Bundle-Hinweise sind oben dokumentiert.
