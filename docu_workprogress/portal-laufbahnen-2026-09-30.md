# Portale auf den Umlaufbahnen des Orrery (30.09./01.10.2026)

Die drei Portalmaschinen des mittleren Sockels (Tiefgang, PASSUNG, Recovery Lab) fahren auf je einer eigenen
Bahn des Orrery mit. Sie liegen im Dunkeln wie das Orrery selbst und verlassen nie das Sichtfeld.

| Portal | Bahn | Radius |
| --- | --- | --- |
| Tiefgang | `Wanderringneigung 0` (präzediert um die Senkrechte) | 25 |
| PASSUNG | `Ring 2` (kippt um seine X-Achse) | 22,5 |
| Recovery Lab | `Ring 1` (kippt um seine X-Achse) | 19,5 |

## Bahnwahl

Gemessen über volle Umläufe (Playwright, Szene im Zeitraffer, Projektansicht): Nur diese Bahnen und die
Kardanringe im Kern haben **jederzeit** einen Abschnitt im Bild hinter der Sockelreihe. Laufbahn 0 erreicht
97 %, Wanderring 1 90 %, Außenring 1 87 %, die Armillarringe 46–56 %.

## Mechanik (`src/scene/portalMachines.js`)

- **Mitfahren:** Das Portal sitzt fest an einer Stelle seiner Schiene und wird vom Gesamtkonstrukt getragen
  (Umlauf, Neigung, Kippen). Drehachse und Tempo jeder Bahn werden pro Bild aus ihrer Weltlage gemessen.
- **Dunkelheit:** Die Portal-Materialien erhalten dieselben Lichtpassagen wie das Orrery (Positionen, Radien,
  Energie aus `orreryLighting.js`, gleiche Abnahme). Unbeleuchtete Fragmente werden verworfen. Sichtbar ist
  ein Portal nur, wenn eine Passage es streift, beim Hover über seinen Galerieeintrag, beim Anflug und geöffnet.
- **Nie aus dem Sichtfeld:** Zählt als im Bild, wenn es im Bildausschnitt (Rand 10 %/20 %) und hinter der
  Sockelreihe liegt. Würde es das Bild innerhalb von 22 s verlassen, wird es zurückgesetzt, sobald seine Stelle
  unbeleuchtet ist. Ziel ist ein Abschnitt derselben Bahn, der im Bild liegt, außerhalb jeder Lichtpassage, mit
  Abstand zu den anderen Portalen, und der vorhergesagt am längsten im Bild bleibt. Damit ist es meist der
  Eintrittsrand. Während eines Hovers, Anflugs oder einer offenen Seite wird nie versetzt.
- **Sauberer Anflug:** Endet ein Warp von der aktuellen Stelle aus zwischen den Sockeln, wird das Portal
  ebenfalls im Dunkeln versetzt. Beim Klick wird, falls nötig, ein unbeleuchteter Abschnitt derselben Bahn
  mit sauberem Anflug gewählt (`prepareWarp`).

## Warp (`src/scene/stage.js`, `exampleFlight.js`)

- Kreuzt der direkte Weg die Sockelreihe, fliegt die Kamera in einem Bézier-Bogen über sie hinweg.
- Dauer = 2,1 s · (Flugstrecke / 32)^¼, begrenzt auf 1,85–2,4 s; gemessen etwa 1,85–2,2 s.
- Bei offener Seite fährt die Kamera mit dem Portal mit. Der Rahmen steht pixelgenau still (0,00 px über 6 s),
  und das Orrery zieht dahinter vorbei. Das Umgebungslicht folgt dem Portal.
- Bleibt kein sauberer Anflug (Ring 1/2 stehen zeitweise flach zur Kamera, etwa 8 % der Zeit), blendet die
  Kamera die Sockelreihe aus, solange sie darin steht, statt zwischen den Hologrammen zu stehen.

## Messwerte (15 Minuten Szenenzeit, Projektansicht)

| | Tiefgang | PASSUNG | Recovery |
| --- | --- | --- | --- |
| Zeit außerhalb des Sichtfelds | 0 % | 0,07 % | 0 % |
| Versetzungen | 10 | 33 | 36 |
| davon bei Licht (alt oder neu) | 0 | 0 | 0 |

In der Start- und Abschlussprojekt-Ansicht ist ebenfalls kein Portal außerhalb des Bildes. In der
Lebenslauf-Nahansicht, wo nur ein kleiner Ausschnitt des Hintergrunds sichtbar ist, sind PASSUNG und Recovery
1–3 % der Zeit draußen. Das passiert, wenn gerade eine Lichtpassage auf ihnen liegt, denn ein Sprung im Licht
wäre sichtbar.

## Sichtbar statt verdeckt (01.10.2026)

Im Projektblick bleiben nur etwa 19 % des Bildes hinter der Sockelreihe frei: die Ränder, schmale Spalten
und das Band unterhalb der Hologramme. Liegt ein Portal im Dunkeln hinter einem Sockel oder Hologramm,
rückt es auf einen unverdeckten, unbeleuchteten Abschnitt seiner Bahn. Die Verdecker sind Bildschirmrechtecke
der sichtbaren Sockel- und Hologramm-Meshes; unsichtbare Klickkörper zählen nicht mit. Bei der Zielwahl haben
unverdeckte Stellen Vorrang, danach verdeckte, danach solche ohne sauberen Anflug. Eine erfolglose Suche wird
nach 1 s Szenenzeit wiederholt.

Gemessen über 10 Minuten (Projektansicht / Startansicht), verdeckt:

| | Tiefgang | PASSUNG | Recovery |
| --- | --- | --- | --- |
| vorher | 88 % | 92 % | 82 % |
| Projektansicht | 17 % | 61 % | 49 % |
| Startansicht | 4–6 % | 46–48 % | 17–23 % |

Die Portale springen dadurch öfter, alle 7–12 s, immer nur im Dunkeln. Das Aufleuchten beim Hover ist jetzt
meist zu sehen.
