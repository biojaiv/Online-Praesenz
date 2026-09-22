# Knallblau archiviert, Lebenslauf-Transparenz vereinheitlicht

Auftrag: Knallblau aus der Website nehmen, lokal erhalten; zweite CV-Seite transparent darstellen; ein lokal realisierbares FISI-Projekt vorschlagen.

- Knallblau aus der aktiven Projektliste und den Vite-Einstiegen entfernt; automatische Generierung bei `dev`/`build` deaktiviert. Die bisherige Einzelvorschau am mittleren Sockel wiederhergestellt.
- 41 HTML-/Assetdateien unverändert nach `Beispielwebseiten/Knallblau-Archiv/` verschoben und SHA-256 geprüft. Quellmodule und manuelle Generatoren erhalten. Archiv nicht Bestandteil von `public/` oder `dist/`.
- Ursache des CV-Fehlers: `makeFirstPageTransparent` bearbeitete ausschließlich Seite 1. Jetzt seitenbezogene Alpha-Verarbeitung einschließlich Seite 2 nach deren bestehenden Layoutanpassungen. Englische Projektion nutzt ebenfalls dieselbe Hintergrundbehandlung. CV-/IHK-Downloads, ursprüngliche SVGs und Dokumenttexte unverändert.
- Neues Projekt ist ein Vorschlag, keine behauptete Umsetzung: `projektkonzepte/fisi-recovery-lab.md` mit lokaler Ressourcenprüfung, vier VMs, segmentierten Netzen, Automatisierung, konsistentem Backup/Restore, Abnahmetests und Primärquellen. Keine VMs oder Hostkonfiguration verändert.

Prüfungen:

- `npm run build` erfolgreich; keine Knallblau-Seiten/-Assets im Produktionsbuild.
- `test:cv:transparency` erfolgreich: DE/EN, Desktop/Mobil, beide Seiten; Hintergrundtransparenz und erhaltene helle Text-/Akzentpixel direkt an der tatsächlichen WebGL-Textur geprüft. Home/End-Blättern und Galerie ohne Knallblau getestet; keine JavaScriptfehler.
- Acht Browser-Screenshots unter `/tmp/cv-transparency-check/`; erste/zweite deutsche Seite und zweite englische Mobilseite visuell verglichen.
- Produktionsregression erfolgreich: zehn DE/EN-Ansichten, statische Dateien einschließlich IHK-Downloads, WebGL-Fallback, bedienbare Beispielprojektion und Rücknavigation.
- Unveränderte CV-/IHK-Downloads über Git-Diff geprüft; `git diff --check` sauber.
- Bestehende Hinweise bleiben: npm meldet eine lokale `prefix`-Option; Vite weist auf das große WebGL-Bundle hin. Build funktioniert. Kein Deployment vorgenommen.
