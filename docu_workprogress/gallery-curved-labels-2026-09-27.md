# Projektgalerie und gekrümmte Sockelbeschreibungen

Lokale Umsetzung vom 27. September 2026. Kein Commit, Push oder Deployment.

## Ergebnis

- Drei direkt anklickbare Karten im Webseiten-Flügel: Tiefgang, RESONANZ und PALIMPSEST. Canvas-Vorschau und HTML-Klickflächen teilen sich die Layoutkoordinaten. Hover/Fokus hebt die Karte in Amber hervor.
- Der Öffnungsübergang startet an der tatsächlich ausgewählten Vorschau. Die neuen Seiten zeichnen ihr erstes vollständiges Bild vor dem Ready-Signal; dadurch entsteht beim Übergang keine leere 3D-Fläche.
- ESC, Sprachwechsel und Fokusrückgabe verwenden den bestehenden Projektor. Die mobile Galerie behält ihre Scrollposition auch nach einem Sprachwechsel im geöffneten Beispiel.
- Alle drei Sockelbeschreibungen liegen auf einem segmentierten Zylinderbogen: Radius 3,86, Bogenlänge 5,9 und Höhe 1,55 Welteinheiten. Die transparente Schrifttextur folgt der Geometrie. Die Beschriftungen drehen sich um den Sockelmittelpunkt zur Kamera; sie sind keine flachen Billboard-Rechtecke. Keine zusätzlichen Shader oder Renderdurchgänge dafür.
- Alle neuen Bedienoberflächen und Texte sind in Deutsch und Englisch vorhanden.

## Die neuen Beispiele

RESONANZ ist eine prozedurale, silberne Klangskulptur aus instanzierten Lamellen mit sechs Kapiteln. Ziehen und Regler verändern die Form; bei eingeschaltetem Audio beeinflusst der Formregler auch den Obertonanteil. Klangfarbe und Raum sind einstellbar. Audio wird erst durch die Ton-Schaltfläche erzeugt und beim Verbergen gestoppt. Der WAV-Export enthält acht Sekunden der trockenen Klangfarbe, wie auf der Seite erklärt.

PALIMPSEST ist eine prozedurale Interpretation des gefalteten Stadtmodells. Vier Epochen teilen sich eine rote Zeitspur. Scrollen verändert den Abstand der Schichten leicht und wählt die Epoche. Ein Klick auf die Jahreszahl springt direkt dorthin. Das anfängliche Jahr 1924 entspricht der Fahrkarte im Footer. Ein Dialog erzählt die Geschichte des gewählten Fundstücks; die erste ESC-Taste schließt diesen Dialog, die nächste das Beispiel. Die Stadt und ihre Geschichten sind ausdrücklich fiktiv.

Die Galerie zeigt echte Screenshots der Implementierungen. Die ursprünglichen Entwurfs-JPGs bleiben die gestalterischen Referenzen.

## Ressourcen und Suchmaschinen

Die Galerie lädt nur Vorschaubilder. Die neuen Seiten sind eigene Vite-Einstiege und laden erst beim Öffnen. Three.js wird im Build als gemeinsamer Chunk ausgeliefert. Die Hauptszene pausiert hinter dem Vollbildprojektor. Die Klangskulptur begrenzt ihre dekorative Bewegung auf ungefähr 30 fps; bei reduzierter Bewegung zeichnet sie nur nach Änderungen. Die Stadt zeichnet grundsätzlich bei Bedarf. Statische Stadtgeometrien sind nach Material zusammengefasst. Beide Renderer begrenzen ihre Pixelzahl auf höchstens 900.000, zusätzlich zum DPR-Limit.

Die acht Vorschauen entstehen mit `npm run build:creative-previews` aus beiden Sprachen und Bildschirmgrößen. Neue Routen sind im Sitemap- und Metadatenmodul erfasst. README ist weiterhin Englisch zuerst, danach Deutsch.

## Verifiziert

- `npm run build`: erfolgreich.
- `npm run test:creative`: Desktop, Handy, DE/EN, Regler, Kapitel/Epochen, Audio nur nach Klick, Pause bei verborgenem Beispiel, WAV-Download, Fundstückdialog und WebGL-Ausfall.
- `node scripts/creative/check_integration.mjs`: Galerie, zurückgestelltes Laden, drei wirklich gekrümmte Beschreibungen, passende Vorschau/Seite, Sprache und Fokus.
- `TEST_DEVICE=mobile node scripts/creative/check_integration.mjs`: mobile Karte und Scrollposition nach Sprachwechsel.
- `SITE_URL=http://127.0.0.1:4173 node scripts/creative/check_integration.mjs`: gebaute Version über den lokalen Preview-Server.
- `TEST_DEVICE=desktop npm run test:fullscreen`: bestehender animierter Vollbildübergang, feste Kamera, Tiefgang, Recovery Lab und ESC.
- `node scripts/ui/check_labels_mouse_zoom.mjs`: Mauszoom, Dokument-Scrollen, CV in DE/EN und sichtbare Beschriftungen. Der Selektor wurde auf die konkrete Tiefgang-Karte eingegrenzt, da die Galerie jetzt drei Vorschauen enthält.
- `git diff --check`: erfolgreich.

Die automatisierten WebGL-Prüfungen liefen mit Chromium/SwiftShader. Eine Framerate-Zusage für ein bestimmtes physisches Gerät lässt sich daraus nicht ableiten.

## Shader

Die gewünschten zusätzlichen Shader-Effekte sind im [separaten Umsetzungsplan](shader-umsetzungsplan-2026-09-27.md) beschrieben. Dieser erfasst vorhandenes GLSL, priorisiert Erweiterungen und nennt messbare Abnahmekriterien. Die zusätzlichen Effekte wurden noch nicht umgesetzt.

## Lokal ansehen

- http://127.0.0.1:4173/#projekte/webseiten
- http://127.0.0.1:4173/beispiele/resonanz/?lang=de
- http://127.0.0.1:4173/beispiele/palimpsest/?lang=de
