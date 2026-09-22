# Sockel, Lebenslauf und Beispielprojektion · 22.09.2026

Ausgangsbasis: `8e84b18` auf `work/ihk-hologram-film-20260922-082805`, einschließlich der bereits vorhandenen, nicht committeten IHK-/Beispielintegration und Gestaltungsänderungen. Fremde Entwürfe, Quelldokumente und lokale npm-Konfiguration wurden nicht verändert. Kein Commit, Push oder Deployment.

## Umsetzung

- Einheitliche Bereichstitel: Faserblau im Ruhezustand, langsamer Wechsel Blau/Bernstein beim Hover, dauerhaft Bernstein im geöffneten Bereich. Bei reduzierter Bewegung kein Blinken. Auch der mittlere Sockel verwendet die vorhandenen Fokus-/Rückkehrklänge.
- Mittlere Vorschau als gedämpftes Hologramm mit gleicher physischer Seitenhöhe. Kein schwebender Öffnen-Knopf. Maus, Touch, Szenen-Tastatur und vorhandenes Projektmenü bleiben nutzbar.
- Untere Sockel nach oben gespiegelt; Geometrien und Materialien werden geteilt. Bestehende heilige Geometrie, Maschine und Bewegungsrhythmus bleiben erhalten. Zusätzliche Textgravur entfernt.
- Beispielseite nach bestehender, kontinuierlicher 180°-Fahrt: scharfe HTML-Fläche mit blauem Lichtsaum, unscharfer Umgebung und langsamen Randwellen. Kopf-/Fußzeile während der geöffneten Projektion verborgen. ESC und dauerhaft erreichbarer Zurück-Knopf führen zur gespeicherten Ansicht zurück. Kein „Beispiel separat öffnen“-Knopf. Die eigene Route `/beispiel/` bleibt bestehen.
- Ursprüngliche Kopftrennlinie wieder sichtbar. Eckdaten unter dem Namen sowie E-Mail, Verfügbarkeit, PDF und kurze technische Einordnung direkt im Rahmen. Vorhandene Angaben unverändert übernommen; keine beruflichen Stationen zusammengefasst oder erfunden.
- Browser-Sprache DE/EN wird erkannt; Deutsch ist Rückfall für andere Sprachen. Gespeicherte Auswahl hat Vorrang. Intro sofort überspringbar und nach dem ersten Durchlauf lokal als gesehen gespeichert.

## Lebenslauf

Die frühere zweispaltige Gestaltung aus `Elemente/lebenslauf.svg` und `Elemente/lebenslauf.en.svg` ist wieder die räumliche Vorschau. Ein eng auf den Porträtbereich begrenzter SVG-Ausschnitt entfernt das Foto vor dem Export; umliegender Text bleibt erhalten. Originale bleiben unverändert.

Lokale Ausgaben: `public/cv/CV_Projection_DE.webp`, `CV_Projection_EN.webp`, `CV_DE.pdf`, `CV_EN.pdf`. Beide Fassungen haben zwei Seiten. WebP-Vorschauen ca. 504/571 KiB; PDFs ca. 2,6/2,8 MiB. Die bestehende ausführliche HTML-Lesefassung und ihre DOCX-Downloads bleiben erreichbar. Die PDFs übernehmen die Rastergestaltung der Vorlagen; auswählbarer Text steht in der HTML-Lesefassung zur Verfügung.

Reproduktion: `CHROMIUM_PATH=<Chromium> CV_PYTHON=<Python mit Pillow/PyMuPDF> npm run build:cv`. Ein Webserver ist für diesen Export nicht nötig.

## Geänderte Dateien dieses Arbeitsschritts

- Einstieg/Sprache: `index.html`, `src/main.js`, `src/i18n.js`, `src/ui/intro.js`.
- Szene: `src/scene/cards.js`, `stage.js`, `pedestalEnergyField.js`, `resumeProjection.js`, `examplePreview.js`, `exampleFlight.js`.
- Oberfläche: `src/harmony.css`, `src/ui/exampleProjection.js`, `exampleProjection.css`, `profileAccess.js`, `download.js`.
- Daten/Artefakte: `src/data/example.messages.js`, `cvProjection.json`, vier Dateien in `public/cv/`.
- Export/Prüfung: `scripts/cv/build_legacy_projection.mjs`, `scripts/ui/check_refinements.mjs`, `check_harmony.mjs`, `scripts/example/check_browser.mjs`, `check_production.mjs`, `scripts/ihk/check_browser.mjs`, `package.json`, `README.md`.

## Prüfungen

- Produktionsbuild und Syntaxprüfung aller 19 geänderten JS-Module erfolgreich; `git diff --check` sauber. Keine separaten Typ-/Lint-Skripte im Projekt vorhanden.
- `test:refinements`: alle drei Hover-/Aktivzustände und je drei Öffnungs-/Schließklänge, gleiche Hologrammhöhen, drei obere Sockel, Sprachwahl einschließlich Speicherung/Fallback, Kontakt/PDF ohne WebGL erfolgreich.
- `test:harmony`: Desktop und Mobil, DE/EN, Intro, Menüs, tatsächliche Downloads, Lesefassungen, Mindestschriftgrößen, Wischen und Zoomhinweise erfolgreich.
- `test:hologram`: Desktop/Mobil und DE/EN erfolgreich; natives Video bleibt deckend, korrekt ausgerichtet, per Tastatur bedienbar und wird beim Ansichtswechsel freigegeben.
- Lebenslauf: sämtliche vier PDF-Seiten gerendert und visuell geprüft; Porträt entfernt, umliegender Text vollständig, zwei Seiten pro Sprache, keine reparierten PDF-Objekte.
- `scripts/ihk/check_artifacts.py`: DE 46/EN 44 Seiten, je 46 korrekte kursiv gesetzte Bildunterschriften, je 34 Inhaltsverzeichnisziele, 294 unveränderte deutsche Quellabsätze. Beide Filme 52,5 s, H.264/yuv420p, ohne Audio, Faststart, fehlerfrei decodiert, jeweils unter 1 MiB. Sämtliche Build-Dateien unter 25 MiB.
- `test:ihk`: 1920×1080, 1440×900, 1366×768, 768×1024 und 390×844, jeweils DE/EN; echte Downloads, Wiedergabe, Unterbereiche, Tastatur und vier HTTP-GETs mit 200 erfolgreich. Die Größen wurden in getrennten Läufen geprüft.
- `test:example:production`: zehn direkte Ansichten, statische Dateien, WebGL-Fallback, Tastaturscrollen und Rücknavigation aus der Projektion erfolgreich.
- `test:navigation`: Maus/Touch, normale/reduzierte Bewegung, auf-/zuklappbare Untermenüs, Außenklick und Medienaktionen erfolgreich.
- `test:projection`: Desktop und Mobil mit Pinch, Scrollen, Zoom, Drehen, DE/EN, Lesefassungswechsel und Lebenslauf-Regression erfolgreich.
- `test:example`: tatsächliche kontinuierliche 180°-Drehung mit Zwischenpositionen, Sockel hinter der Kamera, Mehrfachklicks, Scrollen ohne Kamerabewegung, auswählbarer Text, ESC innerhalb des iframes, Touch-Rückkehr, Fokuswiederherstellung, erneutes Öffnen, abgebrochene Fahrt, mobile/reduzierte Bewegung und direkte DE/EN-Route erfolgreich. Kopfzeile während der Projektion verborgen; entfernte Knöpfe nicht mehr im DOM.

Temporäre Browserbilder und Prüfergebnisse liegen ausschließlich unter `/tmp/`; keine Testbilder oder Zwischenexporte wurden dem Repository hinzugefügt. Entwicklungsansicht: `http://127.0.0.1:5174/`, Produktionsprüfung: `http://127.0.0.1:4173/`.

## Verbleibende Einschränkungen

Die im GLB selbst enthaltene Modellschrift bleibt sichtbar; ihre saubere Entfernung erfordert eine Bearbeitung des ursprünglichen 3D-Modells. Entfernt wurde die zusätzliche programmatisch erzeugte Textgravur. Der Build meldet weiterhin die vorhandene npm-Prefix-Konfiguration und den großen Three.js-Bundle; beide verhindern den Build nicht. Keine vollständige Modell- oder Architekturüberarbeitung vorgenommen.
