# Ladezeit-Optimierung (30.09.2026)

Ziel: weniger Daten und eine kürzere Startphase, ohne sichtbare Qualität abzugeben. Gemessen wurde der
Produktionsbuild (`vite preview`) mit Playwright/Chromium, 1440 × 900, deutscher Browser, 6 s nach dem Laden.

| Messung | vorher | nachher |
| --- | --- | --- |
| Übertragen beim Erstaufruf | 5,14 MB | 4,81 MB |
| Portalmodell `Portal_Nebenmaschine_web.glb` | 551 KB | 309 KB |
| Projektfilm-Plakate beim Start | 108 KB (DE **und** EN) | 0 KB, erst mit Seite oder Film |
| Umfang des Deployments (`dist`) | 50 MB | 48 MB |

## Umgesetzt

- **Portalmodell mit Meshopt statt Draco.** Draco komprimiert nur die Grundgeometrie; die 16 Morph-Targets
  der Entfaltung lagen als rohe Float-Werte in der Datei (242 KB). `scripts/portal/build.mjs` packt jetzt mit
  `EXT_meshopt_compression`. Positionen bleiben unverändert als Float, weil die Seite Schienen und Ecken
  direkt positioniert (eine Positions-Quantisierung würde Knoten-Transformationen verschieben). Normalen
  behalten die 10 Bit der Draco-Fassung. Der Decoder (~29 KB) wird erst mit dem Portal geladen.
  Neu verpacken ohne Blender: `node scripts/portal/build.mjs --compress-only`.
- **Plakate erst bei Bedarf.** Die statische Informationsebene enthielt das englische Plakat, das auf
  deutschen Seiten nie sichtbar war. `src/info/markup.js` schreibt `data-poster`; `views.js` setzt das
  Plakat, sobald die Seite sichtbar wird. Die No-Script-Lesefassung behält das normale `poster`.
  Im 3D-Hologramm setzt `ihkHologramFilm.js` das Plakat erst, wenn das Filmfenster erscheint.
- **„Wie diese Seite gebaut ist“ lädt nach.** `siteInspection.js` und das zugehörige CSS (~41 KB) gehören
  nicht mehr zum Startbündel. Das Modul lädt im Leerlauf nach dem `load`-Ereignis oder beim ersten
  Hover, Fokus oder Klick. Das erste Ereignis wird nachgereicht, das Verhalten bleibt gleich.
- **Unbenutzte Dateien entfernt:** `public/example/tiefgang-infrastruktur.png` (1,5 MB, durch die
  Vektorzeichnung ersetzt), `public/cv/CV_Hologram_DE/EN.webp` (nicht mehr angezeigt) und
  `public/inspection/orrery-detail.webp`.
- Die Karte „Build · Ladezeit · Prüfung“ in „Wie diese Seite gebaut ist“ beschreibt die Ladestrategie.

## Geprüft und verworfen

- **Preload des Orrery-Modells** (`<link rel="preload" as="fetch" fetchpriority="low">`): Bei schneller
  Leitung beginnt der Download 340 ms früher. Bei 1,6 Mbit/s konkurriert er aber mit den Skripten:
  DOMContentLoaded 3,40 s → 3,97 s, Szene 0,5 s später bereit. Deshalb verworfen.
- **Tiefgang-Vorschau als echtes WebP:** Die Datei ist bewusst ein JPEG mit 4:4:4-Farbauflösung. WebP (VP8)
  unterabtastet die Farbe immer (4:2:0) und würde die dünnen orangefarbenen Linien weichzeichnen.
- **Draco durch Meshopt bei den statischen Modellen ersetzen:** Cloudflare Pages liefert `.glb` ohne
  gzip/Brotli aus. Ohne Transportkompression ist Draco (16-Bit-Positionen) hier kleiner.
- **Stärkere Quantisierung oder kleinere Hologrammtexturen:** würde Schärfe kosten, daher nicht umgesetzt.

## Unverändert gut

- Die HTML-Startseite ist nach ~0,3 s sichtbar (FCP), die 3D-Szene lädt dahinter.
- Klänge (FLAC mit WAV-Fallback) laden erst nach der ersten Nutzergeste, Filme mit `preload="none"`.
- Schriften: lokale WOFF2-Teilmengen, zwei davon vorab geladen.
- Gehashte Dateien unter `/assets/` werden dauerhaft gecacht (`public/_headers`).

## Prüfung

`scripts/ui/check_fullscreen.mjs` (Desktop: Portalflug und Rahmen) und
`scripts/ui/check_site_inspection.mjs`/`check_inspection_layout.mjs` (DE/EN, fünf Größen, Filmwiedergabe)
bestehen. Dazu kommen `scripts/info/check_browser.mjs` und `check_production.mjs`.
In `check_site_inspection.mjs` wartet der Test jetzt einen Frame auf die Fokusrückgabe. Ohne WebGL
erwartet er den ausgeblendeten Zugang, weil die Technikansicht nur im 3D-Modus angeboten wird.
