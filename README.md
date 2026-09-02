# Bewerbungsseite — Vladimir Leicht

Interaktive Einseiten-Bewerbung eines Fachinformatikers für Systemintegration.
Kein klassisches Portfolio mit Unterseiten, sondern **ein Raum**, in dem drei
Bereiche als Objekte stehen und in den man hineinfährt.

---

## 1. Was das Projekt sein will

Die Seite soll nicht wie ein Lebenslauf aussehen, der ins Netz gestellt wurde.
Sie soll den Beruf selbst spürbar machen: Infrastruktur, Signalwege, Systeme,
die im Verborgenen arbeiten. Deshalb liegt hinter allem ein Leiterbahnennetz,
das gleichzeitig wie ein Sternenhimmel wirkt — Mainboard und Universum sind
dieselbe Struktur, nur in anderem Maßstab.

**Leitsätze**

| Prinzip | Umsetzung |
|---|---|
| Stille vor Reiz | Höchstens zwei Impulse gleichzeitig, lange Pausen dazwischen |
| Nichts federt | Alle Übergänge langsam, gleitend, ritualhaft |
| Ein Farbpaar | Blaugrün als Ruhezustand, Bernstein als Ereignis. Neon (Magenta, Lindgrün) nur als Impuls unter 400 ms — nie als Fläche, nie als Dauerzustand. |
| Inhalt bleibt Text | Der Lebenslauf ist echtes HTML, markierbar, durchsuchbar, indexierbar |
| Kein Effekt ohne Grund | Jede Animation transportiert eine Aussage |

### Atmosphärische Referenz

Als Stimmungsvorlage dient die Bildsprache der Band **Tool** — übersetzt, nicht
zitiert:

- **Fibonacci als Taktgeber** (*Lateralus*): Abstände, Impulsdauern und
  Timings stehen in keinem ganzzahligen Verhältnis zueinander. Das Muster
  wiederholt sich praktisch nie, ohne dass es zufällig wirkt.
- **Heilige Geometrie**: Die zwölf Motive aus
  `Heiligegeometrie/DIVINE_SACRED_GEOMETRY_SYMBOLS-01.png` werden als
  leuchtende Vektorsymbole in den Raum gesetzt und stark gedämpft.
- **Tiefes Schwarz**: Dinge treten aus dem Nichts hervor und verschwinden
  wieder darin.

---

## 2. Die Szenerie im Hintergrund

### Die Maschine (Stand v6)

Hinter und um die drei Sockel steht ein riesiges, prozedural gebautes
Planetarium (`src/scene/orreryMachine.js`): konzentrische Ringe mit
Gradteilungen, Doppelschienen mit Sprossen, gestaffelte Zahnkränze im Kern,
Kardanringe, Sphärenkäfige und Zahnräder auf den Bahnen, radiale Streben,
drei große schräge Ringe sowie vier kleinere Satelliten-Mechanismen. Zwei
flache Skalenringe und zwei steile Armillarringe liegen genau um die Mitte
der Sockelreihe — die Struktur **umschließt** die Bühne, sie liegt nicht nur
dahinter. Vorlage ist `Elemente/Orrery/orrery-source.png`; das Bild wird
nicht als Textur verwendet, sondern in Geometrie übersetzt und dort
reduziert, wo es dem Vordergrund im Weg stünde.

Die Maschine ist fast schwarz. Sichtbar wird sie durch drei Lichtquellen:

- **Die Front.** Vom Kern läuft alle 18 bis 23 Sekunden eine kugelförmige
  Lichtschale mit rund 9,5 Einheiten je Sekunde nach außen über alle
  Oberflächen — vorn scharf und weiß, dahinter ein kurzer farbiger Schweif.
  Jede dritte Front ist bernsteinfarben, jede fünfte violett.
- **Zwei Laternen**, die auf den Doppelschienen der Hauptscheibe kreisen und
  langsam atmen.
- **Der Kern**, der schwach warm auf die ihm zugewandten Flächen leuchtet
  und beim Start einer Front kurz aufflammt.

Alle Drehgruppen laufen mit eigenem, sehr langsamem Tempo (Scheibe rund
zwölf Minuten je Umlauf, Kern zwei Minuten). Hinter dem geöffneten
Lebenslauf bleibt die Maschine in Bewegung, Front und Laternen werden aber
stark gedämpft, damit die Seite lesbar bleibt.

**Orbit.** Im Ruhezustand lässt sich die Bühne anfassen: Ziehen mit gedrückter
Maustaste oder einem Finger dreht die Kamera um die Mitte der Sockelreihe
(horizontal frei, vertikal begrenzt) und läuft nach dem Loslassen aus. Seitlich
weicht die Kamera automatisch etwas zurück, damit alle drei Sockel im Bild
bleiben. Beim Anfahren eines Sockels kehrt der Blickwinkel auf kürzestem Weg
in die Ausgangslage zurück.

### Impulse

Auf den Leiterbahnen laufen Impulse — **niemals mehr als zwei gleichzeitig**,
mit Pausen von 2,6 bis 7,5 Sekunden. Ein Impuls hat drei Phasen:

```
   Start                    Lauf                     Aufprall
     │                        │                          │
  Kopf setzt              Schweif zieht            Chipstruktur am
  auf der Bahn            hinterher,               Bahnende blitzt in
  an                      Rune glimmt auf          derselben Farbe auf,
                                                   Rune erreicht Maximum
```

Der Aufprall ist der eigentliche Moment: Am Ende jeder Bahn sitzt ein
gezeichnetes Chipgehäuse — Rahmen, Kern, Anschlussbeinchen, Innenleitungen.
Es liegt im Ruhezustand fast unsichtbar da und leuchtet beim Treffer für rund
eine Sekunde in der Farbe des Impulses auf.

### Runen

Jede Bahn hat eine Rune zugeordnet, die mit dem Impuls mitglimmt. Sie sind als
**Strichzüge** definiert, nicht als Schriftart — Runen wurden geritzt, nicht
geschrieben. Das vermeidet zugleich Ladeprobleme mit Fonts.

Die sechs bedeutungstragenden Zeichen stammen aus dem Älteren Futhark:

| Zeichen | Name | Bedeutung |
|---|---|---|
| ᚠ | Fehu | Wohlstand |
| ᛃ | Jera | Kompetenz |
| ᚨ | Ansuz | Intelligenz |
| ᛊ | Sowilo | Erfolg |
| ᛉ | Algiz | Schutz |
| ᚲ | Kenaz | Kreativität |

Dazu kommt Beiwerk ohne Aussage, nur als Textur: **Ogham** (Beith, Luis, Muin)
und **alchemistische Elementzeichen** (Ignis, Aer, Terra, Sal). Zwei von drei
Runen sind bedeutungstragend und werden heller gezeichnet als das Beiwerk.

Zusätzlich zum Impuls-Glimmen tragen alle Runen einen leisen **Grundglimmer
im goldenen Takt**: Die Phase jeder Rune ist ihre Bahnnummer mal goldenem
Schnitt — die Aufleuchtmomente verteilen sich dadurch maximal gleichmäßig,
ohne dass je zwei Runen synchron laufen. Während des Intros steht dieser
Glimmer auf voller Stärke (die stille Botschaft an den Besucher), danach
zieht er sich auf ein Viertel zurück.

### Sakrale Objekte

Die PNG-Datei ist ein visueller Referenzatlas, kein dauerhaft eingeblendetes
Hintergrundbild. Daraus sind zwölf einzelne Strichmotive abgeleitet:

`Vesica Piscis`, `Torus / Lotus of Life`, `Seed of Life`, `Tree of Life`,
`Flower of Life`, `Star Tetrahedron`, `Egg of Life`, `Metatrons Cube`,
`Fruit of Life`, `Merkabah`, `Sri Yantra` und `Six Petal Rosette`.

Die Figuren liegen in einem gemeinsamen Pool. Alle 5,5 bis 11,5 Sekunden
materialisiert sich höchstens eine weitere Figur an einer neuen Position und
Tiefe; maximal zwei sind gleichzeitig sichtbar. Jede rotiert langsam um alle
drei Achsen, glimmt 7,5 bis 13 Sekunden und verschwindet wieder. Ein
Impuls-Aufprall darf zusätzlich eine Figur auslösen. Die frühere, ständig
sichtbare Pyramide (Star Tetrahedron) ist damit kein Sonderfall mehr, sondern
erscheint nach denselben Regeln wie alle anderen Motive.

### Tiefe

Vier Ebenen, gestaffelt von z = −22 bis −67, jede weiter hinten schwächer und
weiter gestreut. Dahinter 1400 Sterne mit langsamem Funkeln, davon etwa jeder
achte warm getönt. Ganz hinten (z = −190 bis −270) liegen **vier kleine
Nebelfelder** aus prozeduralem fBm-Rauschen — unterschiedlich groß, gefärbt und
gedreht, alle unter 45 % Deckkraft. Sie sollen Raum andeuten, nicht auffallen.

### Titel-Durchleuchtung

Beim Seitenaufruf wandert einmal ein bernsteinfarbener Lichtpunkt durch
„FACHINFORMATIKER FÜR SYSTEMINTEGRATION", Buchstabe für Buchstabe, gefolgt von
einem Nachhall über der ganzen Zeile. Danach nie wieder.

### Intro-Sequenz

Beim ersten Besuch einer Sitzung (ohne Deep Link, ohne
`prefers-reduced-motion`) läuft eine Eröffnung von rund 14,5 Sekunden,
jederzeit per Klick oder Taste überspringbar:

1. **Der Raum allein.** Die Kamera fährt aus der Tiefe auf ihre
   Ruheposition zurück, die Runen glimmen im goldenen Takt.
2. **Der Name** legt sich wie eine Filmeinblendung von links nach rechts
   frei, ein Lichtsaum begleitet die Kante.
3. **Tokyo-Neon-Ausbruch** (~400 ms): vier CMY/RGB-Geisterkopien von Name
   und Sigil springen in horizontalen Streifen, Skew- und Scale-Stöße brechen
   den ruhigen Takt — nichts wird interpoliert, nur hart gesetzt. Gleichzeitig
   reißen Filmkorn und Bloom des Composers hoch, damit die Störung den
   ganzen Raum erfasst und nicht nur die Schrift.
4. **Rolle und Sigil**: die Bezeichnung leuchtet auf, die drei Quadrate
   des Sigils wachsen aus dem Nichts — das äußere dreht nach links, das
   mittlere nach rechts, der Kern pulsiert.
5. **Warp** nach oben links. Rotation und Kernpuls laufen währenddessen
   weiter. Der Markenzug ist dasselbe DOM-Element wie
   in der Kopfzeile; am Ende fällt nur sein Transform auf null zurück,
   er rastet also zwangsläufig pixelgenau ein. Danach übernehmen CSS-Schleifen
   bei rund 30 % der Intro-Geschwindigkeit ohne sichtbaren Phasensprung.

---

## 3. Aufbau

```
webseite/
├── index.html                  Rahmen, Kopfzeile, Bühne, Fußzeile
├── package.json
├── public/
│   └── data/cv.json            Lebenslaufdaten, vom Code getrennt
├── src/
│   ├── main.js                 Einstiegspunkt
│   ├── style.css               Fibonacci-Abstände, Farbwelt
│   ├── scene/
│   │   ├── stage.js            Renderer, Kamera, Composer, Ankerpunkte
│   │   ├── background.js       Hintergrund-Fassade (Intro-Kompatibilität, Zustände)
│   │   ├── orreryMachine.js    Die Orrery-Maschine: Geometrie, Lichtfront, Laternen
│   │   ├── cards.js            Die drei Bereichskarten (Sockel, Platte, Staub)
│   │   └── runes.js            Zeichensatz als Strichzüge
│   └── ui/
│       ├── router.js           Hash-Router ohne Seitenwechsel
│       ├── intro.js            Eröffnungssequenz mit Warp in die Kopfzeile
│       └── title.js            Buchstabenweise Durchleuchtung
├── Begrüßungsbild/
│   ├── <Vorlagebild>.jpg
│   └── meshy-input/            Zugeschnittene Vorlagen + PROMPTS.txt
└── Lebenslauf/
    ├── <Originalbild>.jpg
    ├── lebenslauf_skills_v2.png/.jpg   Korrigierte Fassung
    └── cv.json
```

### Navigation

Es gibt **keine Unterseiten**. Die Kopfzeile verlinkt drei Bereiche mit je drei
bis vier Unterbereichen. Ein Klick ändert nur den Hash (`#lebenslauf/faehigkeiten`)
und löst eine Kamerafahrt aus. ESC führt zurück. Deep Links funktionieren,
der Browser-Zurück-Knopf auch.

Die drei Menüpunkte sind als kleine **Instrumente** gestaltet: ein Zifferblatt
mit kreisendem Trabanten (jedes in eigenem Takt), eine Ordnungszahl (01–03)
und der Titel, gefasst von zwei Eckklammern. Beim Ansteuern beschleunigt der
Trabant, der Kern brennt bernsteinfarben, die Klammern wachsen, und das
Untermenü klappt als halbtransparente Tafel unter das Instrument. Der
Sprachschalter ist ein eigenes kleines Schaltfeld rechts daneben.

Die drei Ankerpunkte liegen in `stage.slots` bei x = −9,2 / 0 / +9,2:

| Bereich | Inhalt |
|---|---|
| `abschluss` | Abschlussprojekt FISI — Server, UEM, Clients, Migration |
| `projekte` | Private IT-Projekte |
| `lebenslauf` | Werdegang, Fähigkeiten, Interessen, Kontakt |

---

## 4. Technik

| Baustein | Wofür |
|---|---|
| **Vite** | Entwicklungsserver und Bündelung |
| **three** | Szene, Shader, Geometrie |
| **postprocessing** (pmndrs) | Bloom, Depth of Field, Vignette, Filmkorn, SMAA |
| **gsap** | Choreografie — der eigentliche Regisseur |

### Kniffe, die hier drinstecken

**Zustandstextur statt Objekte.** Der Zustand aller Bahnen liegt in einer
`DataTexture` mit einer Spalte je Bahn. Der Vertex-Shader liest über ein
`aId`-Attribut daraus. Dadurch bleibt der Kern der Leiterbahnen bei **drei Draw
Calls** (Linien, Chips, Runen), egal wie viele Bahnen existieren. Die sakralen
Objekte werden separat aus einem kleinen Pool gerendert, damit jedes Motiv
unabhängig rotieren und ein- bzw. ausblenden kann.

```
R = Kopfposition 0..1   (−1 = Bahn ruht)
G = Impulslänge
B = Farbton (0 = blaugrün, 1 = bernstein)
A = Aufprallblitz 0..1
```

**Hybrid-Rendering für den Lebenslauf.** Glas, Sockel, Partikel und
Nachbearbeitung laufen in WebGL, der eigentliche Text jedoch als HTML über
`CSS3DRenderer` im 3D-Raum. Grund: Ein Recruiter muss Text markieren, kopieren
und mit Strg+F suchen können. Canvas-Text wäre beim Heranzoomen matschig und
für Suchmaschinen unsichtbar — bei einer Bewerbungsseite ein
Ausschlusskriterium.

### Bekannte Stolpersteine

- `active` ist ein **reserviertes Wort in GLSL ES** und lässt Shader still
  scheitern.
- `THREE.Clock` ist abgekündigt, stattdessen `THREE.Timer` mit `update()` und
  `getElapsed()` / `getDelta()`.
- Fibonacci-Zahlen dürfen nicht direkt als Sekunden verwendet werden, sonst
  ergeben sich Pausen bis zu 68 Sekunden und die Szene wirkt tot.

---

## 5. 3D-Modelle (Meshy)

Arbeitsteilung: **Meshy baut nur solide Hard-Surface-Objekte** — Würfel,
Sockel, Serverrack, Laptops. Alles Leuchtende, Holografische und Durchsichtige
entsteht prozedural in Three.js, weil kein Image-to-3D-Dienst Glühen,
Transparenz oder Partikel rekonstruieren kann.

Vorlagen und fertige Prompts liegen in `Begrüßungsbild/meshy-input/`.

**Einstellungen, die tatsächlich greifen**

| Einstellung | Wert | Warum |
|---|---|---|
| Topologie | Smart Topology | Nur damit wird `target_polycount` beachtet |
| Modell | Meshy T2 | T1 ignoriert den Polycount vollständig |
| Poly Count | 12 000 | Obergrenze liegt bei 15 000 |
| Pose | aus | |
| Texturen | PBR, 4K | Später per `gltf-transform` auf 2K bzw. 1K |
| Export | GLB | |

**Wichtig zu wissen**

- Image-to-3D hat **kein Geometrie-Prompt-Feld**, nur `texture_prompt`.
- Prompts sind auf **600 Zeichen** begrenzt, darüber antwortet die API mit 400.
- **Negativ-Prompts wirken seit Meshy 5 nicht mehr.** Formulierungen wie „no
  rust" sind wirkungslos und möglicherweise kontraproduktiv — stattdessen
  positiv beschreiben, was da sein soll.
- Beim Standardmodell steht `should_remesh` auf `false`, dann wird der
  gewünschte Polycount stillschweigend ignoriert.

Fertige Modelle gehören nach `models/`.

---

## 6. Befehle

> **Hinweis:** `npm install dev` installiert nicht die Entwicklungsabhängigkeiten
> dieses Projekts, sondern ein separates veraltetes npm-Paket namens `dev`.
> Dieses zieht `inotify` nach und scheitert unter aktuellen Node-Versionen.
> Verwende `npm install` für die Abhängigkeiten und danach `npm run dev` für
> den Entwicklungsserver.

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Produktionsbündel nach dist/
npm run preview  # Bündel lokal prüfen
```

---

## 7. Barrierefreiheit und Fallbacks

- **Kein WebGL** → der Lebenslauf wird als reine HTML-Fassung ausgeliefert
- **`prefers-reduced-motion`** → keine Kamerafahrt, keine Durchleuchtung,
  kein Schreibmaschineneffekt; die Seite steht sofort still da
- **Schmale Bildschirme** → Tiefenunschärfe aus, Kamerafahrt verkürzt,
  Panel füllt den Bildschirm
- **Tastatur** → alle Bereiche per Tab erreichbar, sichtbarer Fokusring,
  ESC führt immer zurück
- **Tab im Hintergrund** → Renderschleife hält an

---

## 8. Stand

- [x] Grundgerüst: Rahmen, Kopfzeile, Router, Szenerie, Nachbearbeitung
- [x] Impulse, Chip-Aufprall, Runen, Nebel, Titel-Durchleuchtung
- [x] Die drei Karten als Glasflächen an den Ankerpunkten
- [x] Tiefenunschärfe folgt dem Zeiger
- [x] Intro: Kamerafahrt, Filmeinblendung, Glitch, Sigil-Erwachen, Warp
- [ ] Klick → Kamerafahrt → Panel wächst aus dem Sockel
- [ ] CSS3D-Ebene mit dem Lebenslauf aus `cv.json`
- [ ] Choreografie: Schreibmaschine, Bildungsweg, Fähigkeitsquadrate
- [ ] Meshy-Modelle einsetzen
