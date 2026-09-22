# Deckungsgleiche Rahmen am mittleren Sockel

Referenz: `Zu_korrigieren/1.png`, unverändert erhalten.

Ursachen: HTML-Übersicht war unabhängig mit maximal 450 × 580 px zentriert; der Partikelrahmen folgte der 3D-Projektion. Zusätzlich aktualisierte dessen `setOrigin` beim Laden des echten Sockelmodells nur die gespeicherte Ursprungshöhe, nicht seine Position.

Änderungen:

- `src/scene/stage.js`: vorhandener Aktualisierungspfad überträgt die projizierten Ecken der mittleren Hologrammfläche an die HTML-Übersicht. Keine zusätzliche Render-Schleife. Kamera nutzt dieselbe Höhenberechnung und den gleichen Grundabstand wie die anderen Dokumentbereiche.
- `src/ui/projectsBrowser.js`: Größe und Mittelpunkt folgen diesen Koordinaten; eigene Registrierung beim Entfernen aufräumen. Entsprechende fremde Abmeldung aus `exampleProjection.js` entfernt.
- `src/scene/cards.js`: Rahmenposition bei geändertem Sockelursprung sofort aktualisieren. Mittlere Hologrammfläche im geöffneten Zustand frontal halten; Sockelkörper drehen sich weiterhin.
- `src/harmony.css`: feste unabhängige Größe ersetzt, drei tatsächliche Layoutzeilen. Vertikale Bedienung erhalten; Scrollleisten unsichtbar und horizontales Überlaufen verhindert.
- `scripts/ui/check_project_frame.mjs`: Regression für echte projizierte Partikelkanten gegenüber DOM-Kanten, fünf Fenstergrößen, DE/EN, Scrollen und Rückkehr.

Build erfolgreich. Keine Veröffentlichung, lokale Entwürfe und Archive unverändert.

Browserprüfung erfolgreich: 1920 × 1080, 1440 × 900, 1366 × 768, 768 × 1024 und 390 × 844, jeweils DE/EN. Alle vier HTML-/Partikelkanten liegen weniger als 1 CSS-Pixel auseinander. Kein horizontaler Überlauf, keine sichtbare Scrollleiste. Tastaturscrollen, Registerwechsel, Projekt öffnen, ESC und Fokuswiederherstellung geprüft. Screenshots und Messwerte unter `/tmp/project-frame-check/`.

Die aktive mittlere Fläche wird vor der Kameraberechnung in ihre ruhende Lage gesetzt und schwingt während der Bedienung nicht nach. Die Sockelkörper behalten ihre unabhängige Drehung. Der bestehende Desktop-Regressionslauf `scripts/example/check_browser.mjs` ist mit aktivierter Animation bestanden: tatsächliche 180°-Drehung, Maus-/Tastaturbedienung, DE/EN, Scrollen, Wiederherstellung der Ausgangsansicht, Wiederöffnen und Abbruch während des Anflugs. Testumgebung: Chromium mit Software-WebGL, hierfür DPR 0,25; Layoutmessungen bei DPR 0,5. Keine Aussage zur Bildrate auf realer Hardware.
