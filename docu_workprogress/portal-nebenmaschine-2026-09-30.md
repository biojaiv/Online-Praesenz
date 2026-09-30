# Portal-Nebenmaschinen (2026-09-30)

Jedes Projekt im mittleren Sockel hat eine eigene Portalmaschine im dunklen Hintergrund:
Tiefgang oben links (Bernstein), PASSUNG unten links (Weißblau), Recovery Lab rechts (Cyan).
Die vier bestehenden Nebenmaschinen des Orrery bleiben unverändert; sie liegen außerhalb
des Sichtfelds vom mittleren Sockel.

## Ablauf

1. Hover oder Tastaturfokus auf einem Projekteintrag lässt die zugehörige Maschine
   aufleuchten und pulsieren. Sonst liegt sie fast unsichtbar im Dunkeln.
2. Ein Klick fliegt die Kamera vor die Maschine (2,1 s); die Scheibe entfaltet sich zu einem
   Rahmen (2,3 s). Das Seitenverhältnis folgt dem Bildschirm, der Rahmen nimmt 86 % der
   Projektionsfläche ein.
3. Die Seite öffnet sich kreisförmig in der Öffnung. Die Szene läuft weiter, damit Ringe und
   Lichtläufe außerhalb des Rahmens sichtbar bleiben; eine Lichtpassage startet sofort.
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

## Offen

- Positionen, Helligkeit und Passung sind berechnet, im Browser noch nicht abgenommen.
- `scripts/ui/check_fullscreen.mjs` erwartet eine stehende Kamera und muss für den
  Portal-Modus angepasst werden.
- Die GLB lässt sich über weniger Animationsstützstellen verkleinern.
