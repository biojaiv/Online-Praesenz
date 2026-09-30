# Lebenslauf-Hologramm überarbeitet (2026-09-30)

Das Hologramm war ein Rasterbild aus `Elemente/lebenslauf.svg` (zwei eingebettete PNG-Seiten,
kein editierbarer Text). Es wird jetzt aus Inhalt und Vorlage neu gerendert:
`scripts/cv/hologram_content.mjs` (DE/EN) → `scripts/cv/build_hologram.mjs` →
`public/cv/CV_Projection_DE/EN.webp` (1241 × 3786, zwei Seiten) und die Sprungmarken in
`src/data/cvProjection.json`. Befehl: `npm run build:cv-projection`.

## Inhalt
- Seite 1: Name, Rolle, Status (ab sofort · Pforzheim · remote), Profil, Schwerpunkte,
  Entwicklungsziel Cloud Engineering; Ausbildung & Praxis; Kenntnisse in vier Gruppen;
  Interessen und Kontakt.
- Seite 2: Projekte (Abschlussprojekt, Recovery Lab, Ansible-Testlab in Entwicklung,
  Portfolio), Berufserfahrung, weitere Stationen (Brasilien, Zivildienst).
- Entfernt/gestrafft: veraltetes „Verfügbar ab 08/2026“, doppelte Fokus-Absätze, angeflicktes
  „Landratsamt Pforzheim Enzkreis“ (jetzt Landratsamt Enzkreis · Amt für IT und
  Digitalisierung), Einzelliste fachfremder Jobs (jetzt eine Zeile mit übertragbaren
  Fähigkeiten), „Arbeitsmoral/Arbeitsdisziplin“, Visual Studio Code, der Hinweis auf die
  eigene Website.

## Gestaltung
Bildsprache des Originals (Name mit „./“, Bernstein-Überschriften mit Linien-Icons,
Zeitleisten mit Ringpunkten), aber als echte Typografie (Barlow / Barlow Condensed).
Kein eigener Seitenrahmen und ein einfarbiger Grund: die Projektion macht den Grund
transparent und zeichnet den Hologrammrahmen selbst (`webTransform: false`).

## PDF mit echtem Text
`npm run build:cv-projection` erzeugt aus derselben Vorlage auch `public/cv/CV_DE.pdf` und
`CV_EN.pdf`: zwei Seiten im bisherigen Format (210 × 320 mm), Design des bisherigen PDFs
(dunkle Seite, leuchtender Seitenrahmen), aber mit echtem, auswählbarem Text statt Bildern.
Tagged PDF, Titel, eingebettete Schriften, klickbare E-Mail und Website. Starke Sperrung
wird im PDF auf 0,02 em reduziert, weil gesperrte Großbuchstaben sonst als Einzelbuchstaben
extrahiert werden („F A C H …“) und Bewerbermanagement-Systeme die Begriffe nicht finden.
Achtung: `npm run build:cv` (Altskript) würde die PDFs wieder aus dem Bild-SVG erzeugen.

## Offen
- Die Lesefassung (`reader.js`, Daten aus `src/data/cv.*.json`) und die DOCX-Downloads
  (`public/cv/CV_Reader_*.docx`) enthalten weiterhin den ausführlichen Werdegang.
- `scripts/cv/check_transparency.mjs`: Transparenz und Inhalt bestehen; die anschließende
  Prüfung auf `.project-choice` ist veraltet (Element existiert seit den Projektflügeln nicht mehr).
