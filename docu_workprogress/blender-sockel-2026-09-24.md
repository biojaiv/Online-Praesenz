# Blender-Sockel · 24.09.2026

Die Laufzeitszene verwendet die drei neuen Quellen aus `Elemente/Sockel`:

| Quelle | Verwendung |
| --- | --- |
| `Sockel_de.blend` | Untere Sockel bei deutscher Seitensprache |
| `Sockel_eng.blend` | Untere Sockel bei englischer Seitensprache |
| `Sockel_oben.blend` | Unbeschriftete obere Abschlüsse in beiden Sprachen |

Jede Datei enthält drei Bereichsmodelle. `SOCKEL 01`, `02` und `03` werden
Abschlussprojekt, IT-Projekten und Lebenslauf zugeordnet. Die oberen Modelle
werden zur Projektion hin gespiegelt. Die bestehende langsame Drehung,
reduzierte Bewegung, Partikelstrahlen, Hover-Zustände und Navigation bleiben
angebunden. Die Materialfarben aus Blender bleiben erhalten; nur die Emission
pulsiert mit dem gemeinsamen Takt.

Die Modelle werden auf 7,4 Welteinheiten Durchmesser und dieselbe
Projektionsoberkante normalisiert. Die Reihe sitzt etwas höher, damit die
neuen Fundamente vollständig über der Fußzeile sichtbar sind. Trefferflächen
werden aus den Modellgrenzen berechnet; Dokumente behalten ihr Seitenverhältnis.

## Export

```sh
npm run build:sockel
npm run build
```

Voraussetzung: Blender im PATH, alternativ `BLENDER_PATH=/pfad/zu/blender`.
Der Export verändert die `.blend`-Dateien nicht. Studio, Kameras und Beleuchtung
werden ausgelassen; Schrift und Modifikatoren werden in Geometrie umgewandelt.
Das Zusammenfassen pro Bereich begrenzt die Zahl der Zeichenaufrufe. Anschließend
komprimiert glTF Transform die Dateien mit Draco (16 Bit Positionen, 10 Bit
Normalen). Die ausgelieferten Dateien heißen `Sockel_{de,eng,oben}_web.glb` und
sind etwa 507, 508 und 433 KiB groß. Der normale Vite-Build verwendet diese
fertigen Dateien und benötigt Blender nicht.

## Laden und Sprache

Zum Start werden die gewählte untere Sprachvariante und die oberen Modelle
geladen. Die andere Sprache lädt beim ersten Wechsel und bleibt danach im
Speicher. Eine verspätete Antwort darf eine neuere Sprachwahl nicht überschreiben.
Bei einem Ladefehler bleiben die bisherigen Modelle beziehungsweise die
prozeduralen Ersatzsockel bedienbar. Das bisherige `Sockel_V2_web.glb` wird nicht
mehr angefordert.

Die Texte von „Wie diese Seite gebaut ist“ erläutern Blender, GLB, obere
Abschlüsse, Partikel, GSAP und die sprachabhängigen Beschriftungen in DE und EN.

## Prüfungen

```sh
npm run dev -- --host 127.0.0.1
npm run test:sockel
npm run test:waves
SITE_URL=http://127.0.0.1:5173 npm run test:inspection
```

`test:sockel` prüft die sechs sichtbaren Modelle, Quellen und Materialien,
DE/EN-Wechsel, Cache, stabile Projektionsgröße, Bereichsnavigation,
Erklärungstexte, verspätete Sprachantworten und den Ersatzweg bei Ladefehlern.
Screenshots werden unter `/tmp/portfolio-sockel-check` abgelegt.

Ergebnis: Export und Produktionsbuild erfolgreich; `test:sockel` und
`test:waves` vollständig bestanden. `test:inspection` auch gegen den
Produktionsbuild auf Port 4173 bestanden (fünf Bildschirmgrößen, DE/EN,
Tastatur, Touch, reduzierte Bewegung, Film und WebGL-Ersatzweg).
