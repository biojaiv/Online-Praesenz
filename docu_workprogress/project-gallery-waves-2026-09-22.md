# Projektübersicht, Warp-Wellen und persönliche Angaben · 22.09.2026

Basis: bestehender Arbeitsstand auf `work/ihk-hologram-film-20260922-082805`, Commit `8e84b18`, einschließlich der vorherigen uncommitteten Änderungen. Originaldokumente, fremde Entwürfe und lokale npm-Konfiguration unverändert. Kein Push oder Deployment.

## Änderungen

- Geburtsdatum aus den DE/EN-Webdaten und der HTML-Lesefassung entfernt. Beide Lebenslaufprojektionen/PDFs ohne Porträt und Geburtsdatum neu exportiert. Bereinigte DOCX-Downloads unter `public/cv/CV_Reader_DE.docx` und `CV_Reader_EN.docx`; Originaldateien bleiben erhalten.
- Obere Sockel übernehmen Akzentring und gespiegelten Jet. Sechs Strahlen teilen ihre Geometrien/Shaderzustände paarweise; gemeinsame Beleuchtung pro Sockelpaar vermeidet drei zusätzliche Punktlichter. Blau, Türkis und Bernstein bewegen sich in den Strahlen. Nur die Sockelkörper drehen kontinuierlich und langsam; Texte bleiben lesbar.
- Vordergründige Titel zur Kamera ausgerichtet und gegen Verdeckung durch die Sockelkörper abgesichert. Hover wechselt langsam zwischen Faserblau und Orange; Auswahl bleibt Orange bis zum Verlassen. Überschriften des linken und mittleren Hologramms zentriert.
- Mittlerer Sockel führt zuerst zu einer bedienbaren Projektübersicht. Sichtbarkeit wartet auf das tatsächliche Ende der Kamerafahrt; auf Touchgeräten wird ein Durchklick beim Einblenden verhindert. Navigation und Übersicht bieten „Webseiten“/„Websites“ sowie „Private Projekte“/„Private projects“. Letztere sind ausdrücklich angekündigt und enthalten keine erfundenen Projekte.
- Erst die Auswahl einer Webseite startet die anschließende 180°-Fahrt. Escape bzw. der Zurück-Schalter führt zur Projektübersicht zurück, auch nach einem Sprachwechsel innerhalb der Projektion.
- `Beispielwebseiten/warptunnel.jpg` vor Umsetzung geöffnet. Die Vorlage wird durch prozedural gezeichnete, langsam einlaufende Lichtwellen umgesetzt; die Wellen enden am tatsächlichen rechteckigen HTML-Rand. Kein statisches Foto als Ersatz für Bewegung. Zurück-Schalter im Stil der Hauptseiten-Fußzeile.
- Beispielseite mit Lesefortschritt, sanftem Einblenden, Kapitelmarkierung und dezenter Hardware-Parallaxe. Native Scroll-, Link- und Tastaturbedienung bleibt erhalten.
- Kopftrennlinie erhält Orange beim Hover; klickbare Navigation und Fußzeilenelemente erhalten kurze Verzerrungsimpulse. Reduzierte Bewegung deaktiviert neue Rotationen und Animationen. Erstaufruf: deutscher Browser → Deutsch, alle anderen → Englisch; manuelle Auswahl bleibt gespeichert.

## Dateien

Neue Module: `src/ui/projectsBrowser.js`, `warpTunnel.js`, `controlDistortion.js`, `src/example/interactions.js`.
Geändert: `index.html`, `src/main.js`, `i18n.js`, `harmony.css`; `src/scene/cards.js`, `stage.js`, `examplePreview.js`; `src/ui/reader.js`, `download.js`, `exampleProjection.js`, `exampleProjection.css`; `src/example/main.js`, `style.css`; `src/data/cv.de.json`, `cv.en.json`, `example.messages.js`; `scripts/cv/build_legacy_projection.mjs`, `scripts/ihk/build_projection.mjs`; Exportdateien in `public/cv/` und beide IHK-Projektionstexturen. Tests, `package.json` und `README.md` entsprechend aktualisiert.

## Prüfung

- Build erfolgreich; bekannte Hinweise zur lokalen npm-Prefix-Konfiguration und Bundlegröße bleiben unverändert.
- Alle XML-Bestandteile beider DOCX-Ausgaben auf Geburtsdatum geprüft; keine Treffer. Beide PDFs strukturell gültig, je zwei Seiten; alle vier Seiten gerendert und visuell geprüft.
- IHK-Artefaktprüfung: deutsche Originalabsätze, Inhaltsverzeichnisziele und Bildunterschriften korrekt. Bestehende DE/EN-Filme weiterhin H.264/yuv420p, 52,5 Sekunden, ohne Audio, Faststart, fehlerfrei decodiert.
- `test:example`: Desktop mit echter kontinuierlicher 180°-Drehung und mobiler Touchlauf mit reduzierter Bewegung bestanden, einschließlich Mehrfachaktivierung, Scrollen ohne Kamerabewegung, Textauswahl, Sprachwechsel, Escape, Fokus und erneutem Öffnen.
- `test:refinements`: alle drei Hover-/Auswahlzustände und Hin-/Rück-Sounds bestanden; gleiche Hologrammhöhen, Sprachwahl DE/EN/FR samt gespeichertem Wechsel, PDF-Download und WebGL-Ersatzdarstellung geprüft.
- HTTP-Prüfung sämtlicher `dist/ihk/`- und `dist/cv/`-Dateien gegen den lokalen Produktionsserver: HTTP 200, korrekter Dateityp, Inhalt bytegleich, alle Dateien unter 25 MiB.
- `test:waves`: Desktop/animiert und Mobil/reduziert bestanden: sechs Jets, synchrone Sockelrotation, Menükategorien, Tunnelbewegung bzw. Stillstand, Lesefortschritt passend zur Scrollposition, Einblenden und Fokuswiederherstellung. Verzerrungsanimation der Fußzeile auch ohne WebGL geprüft.
- `test:example:production`: zehn DE/EN-Ansichten (1920 × 1080, 1440 × 900, 1366 × 768, 768 × 1024, 390 × 844) bei normaler Pixeldichte, direkte Route, statische Medien, WebGL-Ersatzweg, Tastatur-Scrollen und Rücksprung zu Portfolioinhalten bestanden.
- `test:hologram`: Desktop und Mobil, jeweils DE/EN, bestanden: tatsächliches Abspielen, deckendes Bild, Ausrichtung am Hologramm mit weniger als drei CSS-Pixeln Abweichung, Tastatursteuerung, kein Vorladen und Freigabe der Videoquelle beim Ansichtswechsel.
- Keine gesonderten Lint- oder Typecheck-Skripte im Projekt vorhanden. `git diff --check` ohne Befund.
- Animierte Browserläufe verwenden Chromium/SwiftShader mit `TEST_DPR=0.5`, da Software-WebGL bei voller Pixeldichte einzelne Zeichenframes stark verzögert. CSS-Ansichtsgrößen bleiben 1440 × 900 bzw. 390 × 844; zusätzliche visuelle Kontrollen erfolgten bei normaler Pixeldichte. Das ist keine Messung der Leistung auf echter GPU-Hardware.

Prüfbilder und Zwischenexporte ausschließlich unter `/tmp/`. Lokale Entwicklungsansicht: `http://127.0.0.1:5175/`.

Die eingebackene Schrift im ursprünglichen GLB bleibt wie im vorherigen Arbeitsschritt bestehen. Die IHK-PDF-Inhalte und Projektfilme wurden in diesem Schritt nicht inhaltlich verändert.
