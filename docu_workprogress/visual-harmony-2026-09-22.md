# Gestaltung vereinheitlicht — 22.09.2026

Ausgangspunkt: `8e84b18`, Branch `work/ihk-hologram-film-20260922-082805`.
Die bereits vorhandenen, uncommitteten IHK-/Beispielprojekt-Arbeiten wurden
weiterverwendet. Entwürfe und Originaldokumente bleiben unangetastet. Kein
Commit, Push oder Deployment im Rahmen dieser Überarbeitung.

## Umsetzung

- Gemeinsame Sockelpalette: Faserblau im Ruhezustand, Bernstein bei Auswahl;
  auch die im Modell eingebrannten Akzentfarben werden neutral eingefärbt.
  Titel stehen auf der Platte, vorn bleiben nur die Stichworte.
- Projektionsrahmen und untere Jet-Streams monochrom, Partikelzahl je Effekt
  halbiert (410 beziehungsweise 1200). Keine Änderung an Orrery oder Taktung.
- Lebenslauf-Projektion aus derselben HTML-Komponente und denselben DE-/EN-Daten
  wie die Lesefassung generiert: Kopfzeile, Tabs, Typografie und Inhalte stimmen
  überein. Je sieben Seiten, vollständig mit Überlaufprüfung gerendert;
  Original-SVGs, PDFs und DOCX-Dateien bleiben erhalten.
- Lesefassung und Download im jeweiligen Untermenü, feste Reihenfolge und
  Tastaturnavigation einschließlich Links. Auf-/Zuklappen erhält die aktuelle
  Untersektion. Zoomhinweise und Bedienelemente gemeinsam in der Fußzeile.
- Beispielvorschau blau und gedämpft; Originalfarben beim Ansteuern. Die echte
  interaktive Beispielseite und ihre Kamera-/Rückkehrfunktion bleiben erhalten.
- Intro: Beispielbutton verborgen, Sockel erscheinen erst gegen Ende des Warps.
  Glitchfarben auf Cyan/Bernstein beschränkt. Star Tetrahedron und Algiz aus den
  Auswahlpools entfernt; im Header auch ähnliche Dreiecksmotive ausgeschlossen.
- Mobil bis 600 px: ein Sockel pro Ansicht, horizontales Wischen, Punktnavigation
  und Pfeiltasten. Menütitel in einer Zeile, 44-px-Auswahlflächen. Reader-Tabs
  umbrechen ohne gekürzte Beschriftungen; Bedienhinweis und Seitenpfad stehen
  mobil in getrennten Zeilen. Ein vorheriger Desktop-Orbit wird beim Wechsel
  zur mobilen Ansicht zurückgesetzt.
- Textfarben auf Ink/Ink-dim/Ink-faint zurückgeführt; `style.css` enthält 20 statt
  50 verschiedene sechsstellige Hexwerte einschließlich Hintergründen und
  Palettendefinitionen. Labels in gedämpftem Bernstein; Sperrung .08/.16/.24 em;
  HTML-Schriftgrößen mindestens 10 px. Die eigenständige Beispielseite behält
  ihre abweichende Kundengestaltung. Asymmetrische Kopf-Trennmarkierung entfernt.

## Dateien

Gestaltung: `src/style.css`, `src/harmony.css`, `src/experienceEnhancements.css`,
`src/ihkProject.css`, `src/ui/exampleProjection.css`, `index.html`, `src/main.js`.

Szene: `src/scene/{stage,cards,pedestalEnergyField,hologramField,examplePreview,
resumeProjection,runes,sacredGeometry}.js`.

Bedienung: `src/ui/{reader,download,ihkProject,router,intro,glitch,headerSymbol}.js`.
Texte: `src/i18n.js`, `src/data/example.messages.js`.

Neue CV-Artefakte: `public/cv/CV_Projection_DE.webp`,
`public/cv/CV_Projection_EN.webp`, `src/data/cvProjection.json`.
Generator: `scripts/cv/build_projection.mjs` (`npm run build:cv`).
Prüfungen: `scripts/ui/check_harmony.mjs`, `scripts/ui/menu.mjs` und angepasste
bestehende Browserprüfungen unter `scripts/ihk/` und `scripts/example/`.
Außerdem `package.json` und `README.md`.

## Prüfung

- `npm run build`: erfolgreich. `node --check` für die JavaScript-Module sowie
  `git diff --check`: erfolgreich.
- `npm run test:ihk`: 1920×1080, 1440×900, 1366×768, 768×1024 und 390×844,
  jeweils DE/EN; echte PDF-Downloads, native H.264-Wiedergabe, Unterbereiche,
  Tastaturbedienung und vier statische HTTP-Downloads mit Status 200 bestanden.
  Nach der ausschließlich mobilen Layoutkorrektur 390×844 erneut bestanden.
- `npm run test:navigation`: Maus/Touch, Auf-/Zuklappen, Außenklick, Fokus,
  Tastaturnavigation bis zu Lesefassung/Download und Medienaktionen bestanden.
- `npm run test:projection`: Desktop/Mobil, Scrollen, Zoom, Drehung, Pinch,
  DE/EN, Wechsel zwischen Projektion/Reader und CV-Regression bestanden.
  Der Klicktest wartet jetzt auf das tatsächliche Ende des Intros. Ein Timeout
  beim parallelen Software-WebGL-Lauf war isoliert nicht reproduzierbar.
- `npm run test:example`: echter 180°-Kameraweg, Mehrfachklicks, Rückkehr,
  Fokuswiederherstellung, iframe-Bedienung, Touchscrollen, reduzierte Bewegung
  und direkter DE-/EN-Aufruf bestanden.
- `scripts/ihk/check_artifacts.py`: vorhandene PDFs (DE 46, EN 44 Seiten), je
  46 korrekt kursive Bildunterschriften und 34 gültige Inhaltsverzeichnisziele;
  294 deutsche Originalabsätze und ihre Reihenfolge bestätigt. Beide Filme:
  H.264/yuv420p, 52,5 Sekunden, ohne Audio, faststart, vollständig decodierbar.
  Keine Datei in `dist/ihk` oder `dist/cv` überschreitet 25 MiB.
- Visuell geprüft: alle 14 neuen CV-Projektionsseiten, Desktop-/Mobilansichten
  in DE/EN, Untermenüs, Reader, IHK-Film/Downloads und Unterbereiche.
- `npm run test:harmony`: Intro, halbierte einfarbige Partikel, mobile Wisch-/
  Punkt-/Tastaturwahl, Desktop-Orbit → Mobil, Menüs, echte Downloads, Fokus,
  vollständige mobile Tabs/Bedienhinweise, DE/EN und Mindestschriftgröße bestanden.
- `npm run test:hologram`: erneut Desktop/Mobil und DE/EN bestanden;
  deckendes natives Video, Ausrichtung zur 3D-Fläche, Tastatur und Freigabe der
  Videodatei beim Wechsel zum Reader beziehungsweise zu Unterbereichen.
- `npm run test:example:production`: zehn responsive Direktansichten, statische
  Assets, WebGL-Fallback, interaktive Projektion, Tastaturscrollen, separates
  Fenster und Rücklink ins Portfolio bestanden.
- Abschließender Intro-Test: fortlaufende Sockelankunft nach dem unveränderten
  sechssekündigen Titelablauf sowie Überspringen separat im Browser bestanden.
Screenshots und Renderzwischenstände liegen ausschließlich unter `/tmp/`.
Die neu erzeugten CV-WebP-Dateien sind jeweils kleiner als 0,8 MiB.

Bekannte technische Hinweise: Das Projekt definiert keine gesonderten Lint- oder
Typprüfungen. Vite meldet weiterhin das bestehende große Three.js-Hauptbundle.
Die lokale npm-Präfixkonfiguration erzeugt einen Hinweis; `.npmrc` wurde weder
verändert noch versioniert. Prüfungen erfolgen in Chromium mit Software-WebGL,
nicht auf physischen Mobilgeräten.
