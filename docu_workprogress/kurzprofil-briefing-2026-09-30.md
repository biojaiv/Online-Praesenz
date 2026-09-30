# 30-Sekunden-Profil als Briefing (2026-09-30)

Die Kurzprofil-Ansicht (`#kurzprofil`) ist als „30-Sekunden-Briefing“ neu gestaltet. Alle
Fakten stehen ab dem ersten Bild; Bewegung ist nur Beiwerk und entfällt bei reduzierter Bewegung.

- **Orrery-Siegel** statt Monogramm-Kachel: Skalenring, drehende Umlaufbahn mit Planet,
  gegenläufiger Samen-Ring und ein Fortschrittsring, der in 30 Sekunden vollläuft.
- **Countdown-Chip** neben „Auf einen Blick“ zählt von 00:30 herunter und endet in „✓ Gelesen“;
  Ring und Chip wechseln dann ins Grün des Verfügbarkeitspunkts, der Hauptbutton pulsiert zweimal.
- **Kennzahlen** aus der Projektarbeit: 4/4 Referenzclients, 40 h Netto-Projektzeit,
  4 Ebenen Fehleranalyse (Netzwerk, WinPE, Treiber, Setup).
- **Runen-Stationen:** Die vier Felder leuchten in Lesereihenfolge je 7,5 s auf; eine Leiste
  an der Oberkante zeigt den Fortschritt. Runen nach `runes.js`: Ansuz (Intelligenz) –
  Schwerpunkt, Jera (Kompetenz) – Praxis, Algiz (Schutz) – Arbeitsweise, Kenaz (Kreativität) – Aktuell.
- **Kenntnisse als Chips** (Liste mit `aria-label`) statt „[ a • b ]“.
- **Hintergrund:** langsam drehende Blume des Lebens aus `sacredGeometry.js` und eine
  Hologramm-Scanlinie.

Code: `src/info/markup.js`, `src/info/views.js` (Lesetakt), `src/info/content.js`,
`src/info/style.css` (Block „30-second briefing“).
Prüfung: `scripts/info/check_profile_refinements.mjs` (Chips, laufender Takt),
`scripts/info/check_browser.mjs` (320–1440 px, ohne JS/WebGL).
