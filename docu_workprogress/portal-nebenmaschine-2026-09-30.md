# Portal-Nebenmaschinen (2026-09-30)

Jedes Projekt im mittleren Sockel hat eine eigene Portalmaschine im dunklen Hintergrund,
jeweils in einer freien Lücke der Projektansicht: Tiefgang zwischen linkem und mittlerem
Sockel (Bernstein), PASSUNG am linken Rand (Weißblau), Recovery Lab zwischen mittlerem und
rechtem Sockel (Cyan). Die Positionen wurden aus der Kamera der Projektansicht zurückgerechnet.
Die vier bestehenden Nebenmaschinen des Orrery bleiben unverändert; sie liegen außerhalb
des Sichtfelds vom mittleren Sockel.

## Ablauf

1. Hover oder Tastaturfokus auf einem Projekteintrag lässt die zugehörige Maschine
   aufleuchten und pulsieren. Sonst liegt sie fast unsichtbar im Dunkeln.
2. Ein Klick fliegt die Kamera vor die Maschine (2,1 s); die Scheibe entfaltet sich zu einem
   Rahmen (2,3 s). Das Seitenverhältnis folgt dem Bildschirm, der Rahmen nimmt 86 % der
   Projektionsfläche ein.
3. Die Seite öffnet sich kreisförmig in der Öffnung. Die Szene läuft weiter: Lichtpassagen
   folgen ohne Dunkelpause aufeinander (alle 13 s) und ein weiches Licht um das Portal zeigt
   die drehenden Ringe neben dem Rahmen.
   Die Seite rückt so weit ein, dass ihre Ecken genau auf dem Öffnungsbogen liegen; nichts
   wird abgeschnitten. Im Rand dazwischen liegt der innere Portalrahmen nach
   `Entwuerfe/Vorlage_Objekt.png` (`src/ui/portalRim.js`): Neonkante, die sich beim Öffnen
   einmal herumzeichnet, ein sich drehender Schimmer im Portalband und Funken in der
   Projektfarbe. Die Seitenfläche selbst wird nie übermalt.
   Solange ein Portal aktiv ist, wird die Maschine nach dem Orrery mit gelöschtem
   Tiefenpuffer gezeichnet: Ringe und Streben können weder Rahmen noch Inhalt überlagern.
4. ESC schließt das Portal, faltet die Maschine und fliegt zurück (1,65 s / 1,9 s).
5. Handys (≤ 600 px) und reduzierte Bewegung behalten die bisherige Vollbildprojektion.

## Modell

- `scripts/portal/build_portal.py` baut `Elemente/Orrery/Portal_Nebenmaschine.blend`
  reproduzierbar. Materialien kommen aus `Hintergrund.blend`.
- Äußere Doppelschiene → vier Ecken, innere Doppelschiene → vier Seiten; beide über einen
  Shape Key „Offen“. Die Schienen wachsen dabei von Orrery-Drahtstärke (0,034) auf einen
  soliden Rahmen (0,056).
- Zahnkranzviertel drehen sich einmal und werden zu Eckkappen, Kardankugeln wandern auf
  die Ecken, Nabe, Speichen und Umlaufbahnen verschwinden.
- `npm run build:portal` baut die .blend neu, exportiert glTF, fasst alle Spuren zu einem
  Clip „Entfalten“ zusammen und komprimiert mit Draco (`Portal_Nebenmaschine_web.glb`, ca. 550 KiB).
- `scripts/portal/render_states.py` rendert geschlossen / entfaltet / offen zur Abnahme.

## Code

- `src/scene/portalMachines.js`: Laden (nach dem ersten nutzbaren Bild), Leuchten,
  Entfalten per Clip-Scrubbing, Anpassung des Seitenverhältnisses.
- `src/scene/exampleFlight.js`: Kamerafahrt hin und zurück; ohne Plan wie bisher stehend.
- `src/scene/stage.js`: `portalPlan`, `openPortal`, `closePortal`, `relayoutPortal`,
  `portalApertureRect`.
- `src/ui/exampleProjection.js/.css`: Hover-Anbindung und Portal-Modus.

## Prüfung

- Headless-Chromium auf der GPU (Intel Iris Xe, ANGLE/GL-EGL): Hover, Flug, Entfaltung,
  Seite im Rahmen und Rückflug für alle drei Projekte; 60 rAF/s bei offener Seite.
- `scripts/ui/check_fullscreen.mjs` prüft auf dem Desktop jetzt den Portal-Modus (Flug,
  Rahmen, laufende Szene, Rückkehr der Kamera); mobil weiterhin die Vollbildprojektion.
- Klick vor dem Nachladen der Maschinen fällt sauber auf die Vollbildprojektion zurück.

## Offen

- Mobile Prüfung in `check_fullscreen.mjs` scheitert bereits vor dieser Änderung
  (Kapitelnavigation in Tiefgang nicht sichtbar).
- Headless mit Hardware-Videodekodierung (Mesa) verliert beim Recovery-Film den WebGL-Kontext
  der Hauptszene, auch ohne Portal. Mit `--disable-accelerated-video-decode` tritt es nicht auf;
  im normalen Browser prüfen.
- Die GLB lässt sich über weniger Animationsstützstellen verkleinern.
