# Knallblau am mittleren Sockel

Ausgangspunkt: `490b64882027257bc185c8a24768cc00f80a9ee6`, Branch `work/knallblau-concept-20260922`. Grundlage: `Beispielwebseiten/Knallblau_Der_Tropfen_Umsetzungskonzept.md`. Bestehende Entwürfe und Korrekturdateien bleiben unverändert. Keine Veröffentlichung in diesem Arbeitsauftrag.

## Umsetzung

- Zweites Projekt in der vorhandenen mittleren Projektgalerie; bisherige Beispielseite bleibt erreichbar. Getönte gemeinsame Hologrammvorschau, vorhandene Annäherung und 180°-Drehung.
- `/beispiele/knallblau/` und `/beispiele/knallblau/en/`; je drei Fallstudien unter `arbeit/` und drei bedienbare Beispiele unter `demo/`. Insgesamt 14 echte statische HTML-Seiten.
- Unverändertes Original-Logo aus der offiziellen Website, separate rote Facetten-SVG, Graphit/Papier, lokale Barlow-Schriften. Herkunft und Lizenzen: `public/knallblau/ASSETS.md`.
- Galerie, Details, Beispiel-Sprechzeiten, Themenanker und zugängliches Testformular. Fiktive Inhalte ausdrücklich gekennzeichnet. Keine Kundenbehauptungen, keine erfundenen Resultate, keine WordPress-/CMS-Behauptung. Formular sendet/speichert nichts.
- Optionale, unterbrechbare WAAPI-Animationen mit 2,3-Sekunden-Abbruchgrenze. Keine dauerhafte Eigenbewegung der Knallblau-Seite. Systemvorgabe und Sitzungsschalter für reduzierte Bewegung; langsame Ressourcen führen zur ruhenden Erstansicht.
- Einbettung startet still; same-origin Nachrichten prüfen Herkunft und Fenster. Fallstudien bleiben innerhalb derselben Projektion. Dauerhaft erreichbare Zurück-/Separat-Links, ESC, Fokuswiederherstellung. WebGL-Renderarbeit pausiert nach Ankunft; Rückfahrt setzt sie fort. Der vorhandene äußere Tunnel bleibt erhalten.

## Bearbeitung

1. Texte und Projekte in `src/knallblau/content.js`, Layout in `render.js`/`style.css`, Verhalten in `main.js`, Illustrationen in `artwork.js` bearbeiten.
2. `npm run generate:knallblau` erzeugt die HTML-Seiten sowie SVGs. `predev`/`prebuild` führen dies automatisch aus. Generierte HTML-Dateien nicht einzeln bearbeiten.
3. Nach visuellen Änderungen lokalen Devserver starten, dann `KNALLBLAU_URL=http://127.0.0.1:5176 node scripts/knallblau/build_previews.mjs`. Benötigt Playwright Chromium und Python/Pillow; `CHROMIUM_PATH` und `CV_PYTHON` optional. WebP-Dateien sind echte Screenshots, PNG-Zwischendateien liegen unter `/tmp`.
4. `npm run build`. Produktionsdateien liegen ausschließlich in `dist/`.

## Prüfung

- Build erfolgreich, `git diff --check` sauber. Keine Datei in `dist/` über 25 MiB. Bestehende IHK-PDFs und Filme unverändert vorhanden.
- `test:knallblau`: 42 HTTP-/Browserprüfungen (14 Routen × 1440/768/390 px), DE/EN, keine horizontalen Überläufe oder JavaScriptfehler. Formularfehler und Eingabeerhalt, keine POST-Anfrage, Filter/Details, Projektvorschau, Intro-Abbruch/Zeitlimit, schnelle Wiederholung, sofortige Bewegungsreduktion, Inhalte/Links ohne JavaScript geprüft.
- `test:knallblau:projection`: Desktop mit gemessenen Zwischenpositionen der 180°-Drehung und Smartphone mit reduzierter Bewegung; doppelte Aktivierung, ruhende eingebettete Startansicht, interne Fallstudiennavigation, Separat-Link, Scrollen bei unveränderter Kameraposition, ESC, Fokus, Zurück-Button und erneutes Öffnen erfolgreich.
- Bestehender Produktionsregressionstest: zehn DE/EN-Ansichten der bisherigen Beispielseite, IHK-Assets über HTTP, WebGL-Fallback, Tastaturscrollen, Projektion und Rücknavigation. Screenshots unter `/tmp/example-production-check`.
- Visuell geprüft: Startseite Desktop/Mobil, reale Demo-Vorschauen, Projektgalerie sowie eingebettete Desktop-/Mobilfallstudie. Ein ungewollt großer mobiler Bildabstand wurde korrigiert.
- Funktionsfarben: Weiß auf dunklem Rot 6,81:1, Graphit auf Papier 10,78:1, Sekundärtext auf Papier 5,37:1.

## Lokale Messung und Grenzen

Chromium 153.0.8010.12 headless auf Linux x86_64 / Intel Core i7-1265U, lokaler Vite-Produktionsserver, Smartphone-Viewport 390 × 844. Software-WebGL für Einbettungsprüfungen bei DPR 0,5. `scripts/knallblau/measure.mjs` misst die eigenständige Knallblau-Erstansicht:

| Profil | Übertragen | LCP | CLS | Laufende Animationen nach Ruhe |
| --- | ---: | ---: | ---: | ---: |
| Lokal, ungedrosselt | 132.512 Bytes | 148 ms | 0,0104 | 0 |
| 150 ms Latenz, 200 KB/s Download, CPU ×4 | 132.512 Bytes | 788 ms | 0,0015 | 0 |

Einzelne Labormessungen, keine Felddaten und kein Nachweis von INP oder 60 fps auf realen Endgeräten. Die gemeinsame Projektion wurde funktional geprüft; repräsentative GPU-/Mobil-Leistungsmessungen, Safari/Firefox und die im Konzept vorgeschlagene qualitative Studie mit 6–8 Personen stehen aus. Keine Behauptung zur psychologischen Wirkung.

Bekannte bestehende Build-Hinweise: lokale `.npmrc` mit nicht unterstützter Projekt-`prefix`-Option (unangetastet); Vite warnt vor dem großen Portfolio-WebGL-Bundle. Beide verhindern den Build nicht. Der Kontaktversand ist absichtlich nicht angebunden.
