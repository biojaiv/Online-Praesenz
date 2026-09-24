# Orrery-Hintergrund · 24.09.2026

## Aktuelle Quellen

- `Elemente/Orrery/Hintergrund.blend`: vollständige V2-Konstruktion mit fünf
  Maschinen, Umgebungsringen, Sphärenkäfigen, Zahnrädern und Staubgeometrie.
- `Elemente/Orrery/orrery-source.png`: mitgelieferte Bildvorlage. Die
  Hover-Erklärung verwendet sie als Referenzbild, wenn kein freier Ausschnitt
  der echten Geometrie markiert werden kann oder WebGL nicht verfügbar ist.

Die zuvor verwendete Datei `Elemente/Sockel/Hintergrund.blend` wird vom
Hintergrund nicht mehr geladen. Die Sockel selbst behalten ihre eigenen Modelle.

## Export und Einbindung

`npm run build:background` exportiert nur `V2 GESAMTMODELL` und dessen Kinder.
Die Quelldatei bleibt unverändert. Studiolichter und Kameras werden ausgelassen.
Die Studiowurzel (0,16-fache Skalierung und Umwandlung nach Blender-Z-oben) wird
für den Export zurückgesetzt: Die darunterliegenden Modellkoordinaten sind
bereits Web-Koordinaten mit Y als Hochachse. Frame 1 liefert die Ausgangslage.

Der komprimierte Export `Elemente/Orrery/Hintergrund_web.glb` enthält 152
Mesh-Objekte, erhält verknüpfte Geometrien und benötigt ungefähr 1,4 MiB.
Drehachsen und Geschwindigkeiten stammen direkt aus den Blender-Eigenschaften
`Achse_Web` und `Winkelgeschwindigkeit`. Alle fünf Maschinen und die
Umgebungsringe werden einmal geladen; es werden keine zusätzlichen Kopien oder
prozeduralen Ersatzringe darübergelegt.

`src/scene/background.js` lädt den Export; `blenderOrreryAssembly.js` verbindet
seine Originalhierarchie mit `orreryLighting.js` und `orreryMaterials.js`.
Die frühere `orreryMachine.js` wird nicht mehr importiert und gelangt nicht
mehr in den Laufzeitbuild.
Die enthaltenen Positionen, Neigungen und Abmessungen entsprechen der zuvor
geprüften Live-Szene: ursprünglicher Hauptmittelpunkt `[-7, 6, -34]`, Außenradien 36/49/63,
Satellitenskalierungen 0,34/0,28/0,52/0,36.

## Sichtbarkeit und Bewegung

In der Vorderansicht zeichnet die Orrery ohne lokales Licht keine sichtbaren Pixel. Das
PBR-Lichtmodell hat keine Grundhelligkeit und reagiert nicht auf die allgemeine
Bühnenbeleuchtung. Die vier exportierten Blender-Materialien (Graphit, Titan,
Messing und Staub) behalten ihre Farben, Metallanteile und Rauheiten. Die Datei
enthält keine Bildtexturen; vorhandene Textur-Maps würden beim Export und beim
Klonen der Materialien ebenfalls erhalten. Die Hintergrundmaterialien schreiben
nicht in den Tiefenpuffer der Dokumente. Unbeleuchtete Rückseiten hinterlassen
keine schwarzen Silhouetten; die Sichtbarkeit folgt dem reflektierten Licht.

- Eine Lichtphase dauert 12–17 Sekunden. Fünf bis sechs Lichtläufer
  folgen den tatsächlichen, mitdrehenden Ringbahnen und Streben. Abzweigungen
  sind nur an räumlichen Berührungspunkten erlaubt.
- Die Standard-PBR-Berechnung beleuchtet die Originaloberflächen. Es gibt keine
  additiven Farbflächen, nachgezeichneten Konturen oder sichtbaren Lichtkörper.
- Nach dem weichen Ausblenden bleiben alle Lichtquellen für 11–22 Sekunden aus.
- Die Konstruktion dreht sich weiterhin langsam. Beim Lesen wird sie gedämpft.
- Reduzierte Bewegung hält Geometrie und Lichtläufer still; die ferne Rückansicht bleibt statisch erkennbar.
- Die ausdrücklich geöffnete Hover-Erklärung kann einen ausgewählten
  Geometrieausschnitt mit ihrem statischen Inspektionslicht markieren.

Die deutsche und englische Beschreibung erklären Quelle und Unsichtbarkeit.
Die PNG ist ausdrücklich als Bildvorlage gekennzeichnet.

## Prüfung und Vorschau

```sh
npm run test:background
npm run build
SITE_URL=http://127.0.0.1:4173 npm run test:inspection
```

Der Hintergrundtest prüft vollständige Modellübernahme, Platzierung,
Skalierung, Drehung, reduzierte Bewegung, Navigation und fehlgeschlagenes Laden.
Ein zusätzlicher Render-Test simuliert 70 Sekunden: Auch bei sehr starkem
Umgebungslicht müssen alle Dunkelphasen exakt null sichtbare Pixel aufweisen;
mehrere Lichtphasen und mindestens zehn Sekunden ununterbrochene Dunkelheit
müssen nachgewiesen werden. Vergleichsbilder liegen unter
`/tmp/portfolio-background-check/orrery-{dark,lit}.png`.

Die Vorschau auf `http://127.0.0.1:4173/` bleibt aktiv.

Ergebnis: Export, Produktionsbuild und Hintergrundprüfung bestanden. Der
Render-Test ergab null sichtbare Pixel ohne Licht, drei Lichtphasen und eine
22 Sekunden lange vollständig dunkle Pause. Die gezielte Produktionsprüfung
auf Port 4173 bestätigte den neuen GLB-Abruf, echte Geometrieanker, DE/EN-Texte
und die sichtbare, korrekt geladene PNG-Bildvorlage auf Mobilgeräten ohne WebGL.


## Abstandsanpassung

Auf Wunsch liegt die Haupt-Orrery jetzt 15 % näher an der Sockelebene (Z=0):
Z wurde von -34 auf -28,9 verschoben. X=-7, Y=6, Größe und Neigung bleiben
beibehalten. Die Beleuchtung wählt ihre Zielpunkte auf der versetzten Geometrie.
Satelliten und Umgebungsringe behalten ihre Positionen.


## Materialkorrektur und neue Beleuchtung

Die vorherige Version lud ebenfalls nur eine Orrery, exportierte jedoch keine
Materialien und ersetzte sie durch den alten farbigen Lichtshader. Das ist
korrigiert: `export_materials='EXPORT'`, vier originale PBR-Materialien und eine
eigene Beleuchtungssteuerung ausschließlich für die geladene Blender-Geometrie.
Die PNG bleibt eine Bildvorlage in der Inspektion, keine überlagernde Ebene.
Der Render-Test prüft weiterhin vollständige Unsichtbarkeit in Dunkelphasen;
der Browsertest prüft zusätzlich Materialwerte und das Fehlen fremder Geometrie.


## Räumliche Anordnung, Lichtbahnen, Sterne und Grün

Die Sockelreihe liegt jetzt nahe am Kern innerhalb der inneren Ringe. Dafür ist
bereits im Browser-Aufbau der Hauptmittelpunkt auf `[0, -1, -12]` gesetzt; die
Vordergrundnavigation behält ihre bewährten Zielpunkte. Die Schutzzone blendet
nur kameranahe Teile aus, statt die gesamte umgebende Konstruktion zu entfernen.

`orreryPaths.js` beschreibt Ringbahnen an ihren originalen Drehachsen. Der
Blender-Export ergänzt die tatsächlich vorhandenen Streben-Mittellinien als
`lightRailsJSON` (47 Streben über die fünf Maschinen). Lichtläufer bewegen sich
mit 3–4,5 Welteinheiten/s entlang dieser Bahnen, wechseln nur an Berührungen und
erhalten eine dynamisch an den sichtbaren Strukturanteil angepasste Reichweite. Große freie Lichtflächen
und frei durch den Raum gezogene Bézierbahnen entfallen.

Die großen runden Elemente drehen sich je nach Baugruppe etwa 1,5–2,2-mal
stärker. Große Ringe bleiben unter ca. 4°/s, kleine Anbauteile unter ca. 6°/s.
Die ursprünglichen Blender-Werte bleiben in den Metadaten erhalten; die
Web-Geschwindigkeit steht zusätzlich in `webAngularSpeed`.

`distantStars.js` erzeugt 190 kleine Punkte auf einer sehr weit entfernten
Kugel (Radius 900–1250). Im jeweiligen Blickfeld sind nur vereinzelte Sterne
sichtbar. Sie bewegen oder blinken nicht und bleiben auch während der dunklen
Orrery-Pausen sichtbar. Der Dunkeltest prüft die Orrery daher separat; zusätzlich
prüft er die geringe Zahl tatsächlich gezeichneter Sternpixel.

Beim Laden der Sockel wird `VL / Violett` zu Grün umgefärbt, für DE, EN und die
oberen Kappen. Andere Materialfarben bleiben unverändert. Die Beschreibung der
Hover-Ansicht nennt die Lichtläufer auf Ringen und Streben sowie die fernen Sterne.


## Größere Lichtdurchgänge und ferne Rückansicht

Die Beleuchtung wählt pro 12–17 Sekunden langem Durchgang fünf bis sechs neue
Bahnen. Vorherige Startbahnen werden möglichst ausgelassen; geneigte Ringe und
Streben liefern waagerechte und senkrechte Bewegungen. Die bisherigen
Geschwindigkeiten, Originalmaterialien und ruhigen Dunkelpausen bleiben erhalten.

`orreryCoverage.js` tastet die im Kamerablick sichtbaren Ring- und Strebenbahnen
in gleichen Längenabschnitten ab. Alle 250 ms wird die gemeinsame Lichtreichweite
auf einen zufälligen Zielanteil zwischen 15 und 20 % abgestimmt und anschließend
weich nachgeführt. Dies ist eine Näherung für beleuchtete Struktur, keine Quote
für Bildschirmfläche oder Pixelhelligkeit: Metallreflexion, Überdeckung und das
Ein-/Ausblenden beeinflussen die tatsächlich sichtbaren Pixel.

Beim Kameraschwenk hinter die Sockel blendet sich eine schwache PBR-Beleuchtung
für die vier vorhandenen Nebenmaschinen ein. Sie behalten ihre Blender-Positionen
und Größen; es gibt keine neuen Kopien. In der direkten Rückansicht liegen zwei
davon im Blickfeld. Die Hauptmaschine behält ihre episodische Beleuchtung. Zurück
in der Vorderansicht verschwindet die ferne Grundbeleuchtung wieder vollständig.
Die Materialinstanzen sind für Hauptstruktur und Nebenmaschinen getrennt, behalten
aber dieselben vier Originalmaterialien. Die Hover-Texte sind in DE/EN angepasst.

Der Render-Test prüft zusätzlich wechselnde Bahnen, Bewegung in beiden Achsen,
den abgestimmten Strukturanteil sowie tatsächlich sichtbare Pixel in der
Rückansicht ohne laufende Lichtphase. Im deterministischen 70-Sekunden-Durchlauf:
15,4–20,0 % abgestimmter Bahnanteil, 5.451 beleuchtete Pixel am Höhepunkt,
1.632 Pixel der fernen Maschinen in der Rückansicht, null Orrery-Pixel in den
vorderen Dunkelpausen. Screenshots: `orrery-rear.png` und `desktop-rear.png` unter
`/tmp/portfolio-background-check/`.
