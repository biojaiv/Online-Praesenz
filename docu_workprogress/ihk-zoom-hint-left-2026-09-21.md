# Zoom-Hinweis links beim Abschlussprojekt

- Ausgangsstand: `9ffb3be`; aktueller `main`, Sicherheits- und Arbeitsbranch angelegt.
- Nur `src/ihkProject.css` geändert: Vorhandenes Maussymbol, Tastatur-Zoomhinweis und mobile Plus-/Minus-Tasten für die `abschluss`-Routen links angeordnet. Vorhandene Abschnittsklasse genutzt; keine neue Zustands- oder Sprachlogik.
- Medien, Projektinhalt und Kamerasteuerung unverändert. Lebenslauf behält die rechte Anordnung; in der Lesefassung bleiben die Zoomhilfen ausgeblendet.
- Build erfolgreich; die bekannten npm-prefix-/Vite-Bundlemeldungen unverändert.
- Browserprüfung in DE/EN auf Desktop (1440 × 900) und Smartphone (390 × 844): Position links innerhalb des Viewports, Ausblendung in der Lesefassung und weiterhin rechte Position beim Lebenslauf bestätigt. Screenshots unter `/tmp/ihk-zoom-left/` und `/tmp/ihk-zoom-left-projection/` visuell geprüft.
- `npm run test:projection` bestanden: 3D-Klick, Zoom, Scrollen, Rotation, mobiler Pinch, Sprachwechsel, Medienzugriff und Lebenslauf-Regressionsprüfung. Keine funktionalen Probleme festgestellt.
