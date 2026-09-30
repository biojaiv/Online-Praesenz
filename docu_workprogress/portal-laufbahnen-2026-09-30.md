# Portale auf den Laufbahnen des Orrery (30.09.2026)

Die drei Portalmaschinen stehen nicht mehr fest im Raum, sondern fahren auf je einer eigenen Bahn des Orrery mit.

| Portal | Bahn | Radius | Heimat (Welt) | Pendel | Periode |
| --- | --- | --- | --- | --- | --- |
| Tiefgang | `Wanderringneigung 0` | 25 | 12.5, −1, −33.7 | ±0,34 rad | 83 s |
| PASSUNG | `Wanderringneigung 1` | 44 | −15, −13, −53.3 | ±0,20 rad | 97 s |
| Recovery Lab | `Aussenring 1 / Eigenrotation` | 49 | 16.8, −13, −58 | ±0,18 rad | 71 s |

## Warum diese Bahnen

Alle `Ring n` und `Laufbahn n` der Hauptmaschine kippen um ihre eigene X-Achse und stehen dabei regelmäßig
frontal zur Kamera. Ein Portal darauf läge dann außerhalb des Bildes oder vor den Sockeln. Die Simulation über
volle Umläufe (Playwright, Szene im Zeitraffer) ergab: Nur Bahnen, die um die Senkrechte präzedieren, bleiben
vor der Kamera. Das sind die beiden Wanderringe und mit Abstrichen Außenring 1.

## Mechanik (`src/scene/portalMachines.js`)

- Das Portal sitzt immer exakt auf der Schiene: am Schienenpunkt, der seiner Heimat am nächsten liegt, plus
  eine langsame Pendelbewegung entlang der Schiene. Es fährt so mit Umlauf, Neigung und Präzession des Rings
  mit (etwa 0,4–0,6 Einheiten/s) und steht bei jedem Besuch an einer anderen Stelle.
- Portale drehen sich zur Ruheposition der Kamera. Solange ein Portal eine Seite rahmt, bleibt seine
  Ausrichtung fest (`hold`), es fährt aber weiter.
- Bei reduzierter Bewegung stehen Ringe und Pendel still.

## Warp und offene Seite (`src/scene/stage.js`)

- Warp-Dauer = 2,1 s · (Entfernung / 47)^¼, begrenzt auf 1,85–2,4 s. Gemessen ergeben sich Tiefgang 1,88–1,99 s,
  PASSUNG 2,12–2,21 s und Recovery 2,15–2,25 s. Die Rückfahrt und der Start der Entfaltung skalieren mit.
- `followPortal()` zielt die Kamera jedes Bild neu auf das fahrende Portal. Bei offener Seite bewegt sich die
  Kamera mit, der Rahmen bleibt pixelgenau stehen (gemessen: 0,00 px über 6 s), und das Orrery zieht dahinter
  vorbei. Das Umgebungslicht folgt dem Portal.

## Bekannte Folge

In der Projektansicht liegen die Portale einen Großteil der Zeit hinter den Hologrammen. Tiefgang ist immer
im Bild, PASSUNG und Recovery etwa drei Viertel der Zeit, weil ihre Ringe zeitweise über den oberen Rand
steigen. Das Aufblinken beim Hover über einen Galerieeintrag ist daher nicht immer sichtbar. Warp und Rahmen
funktionieren unabhängig davon.
