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

## Eine Quelle für alle Fassungen
`scripts/cv/hologram_content.mjs` speist alles; `npm run build:cv-projection` erzeugt:
- **Hologramm** (dunkel, Website): `public/cv/CV_Projection_DE/EN.webp` + Sprungmarken.
- **Bewerbungs-PDF** (hell, `scripts/cv/print_cv.mjs`): `public/cv/CV_DE/EN.pdf`, A4, einspaltig,
  echter Text, Tagged PDF, Fußzeile mit Seitenzahl, klickbare E-Mail und Website. Hell und einspaltig,
  weil Bewerbermanagement-Systeme neutrale Hintergründe und einspaltigen Text am zuverlässigsten lesen.
  Geringe Sperrung, damit Begriffe nicht als Einzelbuchstaben extrahiert werden.
- **DOCX** (LibreOffice aus semantischem HTML): `public/cv/CV_Reader_DE/EN.docx` mit echten Word-Überschriften.
- **Lesefassung**: `src/data/cv.de/en.json` (inkl. Projekte, Kenntnisgruppen, weitere Stationen) für `reader.js`.
Datumsangaben einheitlich MM/JJJJ. Achtung: das Altskript `npm run build:cv` würde PDFs und DOCX
wieder aus den alten Quellen erzeugen.

## Offen
- `scripts/cv/check_transparency.mjs`: Transparenz und Inhalt bestehen; die anschließende
  Prüfung auf `.project-choice` ist veraltet (Element existiert seit den Projektflügeln nicht mehr).
