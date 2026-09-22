# Transparenz am mittleren Sockel

- `src/scene/examplePreview.js`: dunkle vollflächige Canvas-Füllung entfernt; getönte Bildvorschau separat mit 78 % Deckkraft zusammengesetzt. Kein Schreiben in den Tiefenpuffer, damit transparente Flächen die Szene nicht verdecken.
- `src/harmony.css`: Projektübersicht ohne deckenden Hintergrund, dezenter Textschatten für Lesbarkeit. Vorschau bei 78 % Deckkraft, bei Hover/Tastaturfokus 94 %. Text, Navigation und Rahmen behalten ihre bisherigen Farben und Deckkraft. Die geöffnete Beispielwebseite bleibt unverändert.
- Build und `git diff --check` erfolgreich. Browserprüfung in DE/EN auf Desktop 1440 × 900 und Mobil 390 × 844: transparente Fläche, Bildvorschau, beide Register, Tastaturaktivierung, ESC-Rückkehr und Fokus geprüft. Keine JavaScriptfehler. Screenshots und gemessene Canvas-Alphawerte unter `/tmp/middle-transparency/` (Leerfläche 0/255, Bild 199/255).
- Keine Veröffentlichung vorgenommen. Bestehende lokale Arbeiten und Knallblau-Archiv erhalten.
