# RESONANZ als Instrument im Webseiten-Flügel (03./04.10.2026)

## Beispielseite

- **Anschlagen statt nur Formen:** Die 82 Lamellen sind auf zwei Oktaven einer pentatonischen Tonleiter über
  dem Grundton gestimmt. Tippen schlägt eine Lamelle an, schnelles Überstreichen mit der Maus spielt sie wie
  eine Harfe. Leertaste/Eingabe am Formgriff schlägt an.
- **Ein gemeinsames Wellenfeld** (`src/creative/resonanzField.js`): Jeder Anschlag läuft sichtbar durch die
  Lamellen, über die Signalspur und durch den Schriftzug. Die Signalspur (`resonanzSignal.js`) zeichnet die
  tatsächliche Wellenform der Obertöne; Studio und Kathedrale ziehen sichtbare Echos nach.
- **Kapitel mit eigener Gestalt**, weich überblendet: Impuls (Herzschlag), Ton (Spindel), Obertöne (stehende
  Wellen), Raum (aufgespannt, wiederholte Anschläge), Rhythmus (Muster), Schimmer (Windspiel).
- **Räume** ändern Nachhall (0,4 / 1,2 / 3,2 s, zweiter langer Faltungshall) und Spiegelungen zugleich:
  harte Lichtboxen, Softboxen, hohe Kirchenfenster.
- **Typografie:** Noto Serif Display Condensed Light/Italic als lokale WOFF2-Teilmengen (OFL,
  `src/creative/fonts/OFL.txt`).
- **Ton bleibt freiwillig:** Beim ersten Sichtbarwerden fragt ein Dialog über der Bühne nach Ton. „Ton
  einschalten“ startet ihn mit einem kurzen Anschlag; ohne Ton weist ein Tippen auf eine Lamelle auf den
  Tonknopf hin.

## Portfolio

- Dritte Karte im Webseiten-Flügel („Drei Ideen. Drei Erlebnisse.“) mit Hinweis „MIT TON“ auf Leinwand
  und HTML-Karte.
- Eigene Portalmaschine auf `01 HAUPTMASCHINE / Laufbahn 0` (Radius 26,4) mit Zitronen-Akzent; sie leuchtet
  beim Hover über die Karte und rahmt die geöffnete Seite.
- Vorschaubilder: `npm run build:resonanz-previews` (Seite mit `?preview=1`, ohne Dialog und Bewegung).
- Produktionsbuild, Sitemap und Seitenmetadaten enthalten `/beispiele/resonanz/`.

## Abschlussprojekt: Schritte

Die aufklappbaren Schritte im Abschlussprojekt zeigen Nummern in Amber-Ringen. Die Verbindungslinie läuft
durch die Ringmitten statt durch die Ziffern, Trennlinien sind einfach, der geöffnete Schritt ist gefüllt.

## Prüfung

`check_browser`, `check_audio` (inkl. Anschläge: kein Klick, < 0,2 % über 3 kHz, Kathedrale > 2,2 × trocken),
`check_dynamics`, `check_integration` (Desktop/Mobil), `check_mobile_layout`, `check_fullscreen`, IHK- und
Projektflügel-Tests.
