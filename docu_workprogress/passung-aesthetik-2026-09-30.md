# PASSUNG – ästhetische Überarbeitung (2026-09-30)

- **Zeichnungsblatt:** Hinter dem Bauteil liegt ein feines Konstruktionsraster (24/120 px),
  radial ausgeblendet. Vier Passermarken rahmen die Bühne; ein Schriftfeld wie auf einer
  technischen Zeichnung nennt Nr. PAS-0425, Maßstab 1:2, ISO 286 Ø62 H7/g6 (die Passung,
  von der der Name kommt) und Rev. C. Auf dem Handy nur das Raster.
- **Kapitelkarte:** Ab Kapitel 2 tritt die Hero-Überschrift auf etwa die Hälfte zurück,
  Einleitung und „Fertigung erleben“ blenden aus. Das Kapitel erscheint als Karte mit blauer
  Kennlinie, Eckwinkel, Kennziffer „02 / 04“ und lesbarer Überschrift (19–26 px).
- **Mikrotexte:** Bedienhinweise, Bewegungsschalter und Scroll-Hinweis auf 12 px mit mehr Kontrast.
- **Dialoge:** Blaue Kennlinie oben, Eyebrow mit Leitstrich, nummerierte Punkte (01–03) in
  Technikschrift und eine dezente Maßzeichnung in der Ecke.
- Vorschaubilder der Galeriekarten neu erzeugt (`npm run build:passung-previews`).

Prüfung: `scripts/creative/check_passung.mjs` (Desktop, Mobil, reduzierte Bewegung, ohne
WebGL/JavaScript) besteht.
