# Projektfilm direkt im Hologramm

- Ausgangsstand: `8e84b18`, aktueller `main`. Sicherheitsbranch und Arbeitsbranch `work/ihk-hologram-film-20260922-082805` angelegt.
- Der Film steht jetzt oben auf der ersten Hologrammseite. Ein Klick auf die Filmfläche startet einen nativen, deckenden Player direkt in dieser Fläche. Er folgt Dokumentposition, Kamerazoom, Rotation und Scrollfenster. Die übrige Projektion behält ihren Stil. Der separate Film-Knopf rechts entfällt; Lesefassung und PDF-Downloads bleiben erhalten.
- Native HTML-Videofläche anhand der vorhandenen Kamera-/Mesh-Matrizen positioniert; keine zusätzliche WebGL-Videotextur und keine weitere Animationsschleife. Native Bedienelemente behalten auch mobil ihre Bildschirmgröße. Tastaturereignisse am Player steuern das Video; das Mausrad kann weiter im Dokument scrollen. Bei Sprach-/Ansichtswechsel oder außerhalb des sichtbaren Fensters wird die Quelle freigegeben und die Wiedergabe beendet. Kein Autoplay, weiterhin `preload="none"`.
- Beide lokalen Filme mit 80 % des bisherigen Ablauftempos neu erzeugt: 42 / 0,8 = 52,5 Sekunden, weiterhin 24 fps, H.264/yuv420p, ohne Audio, Faststart. Die normale Playergeschwindigkeit bleibt 1×; auch heruntergeladene Filme sind entsprechend langsamer. DE 719.967 Byte, EN 730.016 Byte.
- Neue Poster sowie DE-/EN-Projektionsgrafiken lokal erzeugt. Die Übersicht umfasst jetzt zwei Blätter: Film/Einordnung/Begründung/Kennzahlen und Projektbereiche/Ergebnis/Technologien. Dazu die vier bisherigen Detailbereiche, insgesamt sechs Projektionsseiten. Routenanker entsprechend angepasst; keine neuen Unterseiten oder parallele Sprachlogik.
- Kurze Begründung in beiden Ansichten aus der deutschen PDF, Seiten 4, 6 und 7, Abschnitte 1.1–1.3: hoher Wartungsaufwand, Fehleranfälligkeit, komplexe Empirum-Paketskripte und Abhängigkeit von wenigen Spezialisten. Der Pilot sollte eine leichter bedienbare und wartbare Alternative prüfen. Keine Aussage über eine vollständige Produktivablösung ergänzt.
- Originaldokumente und beide veröffentlichten PDF-Berichte unverändert.

## Prüfung

- Produktionsbuild erfolgreich; bekannte npm-prefix-Meldung und Vite-Bundlewarnung unverändert.
- Beide MP4s vollständig fehlerfrei dekodiert, Codec/Farbraum/Laufzeit/Faststart geprüft. Alle öffentlichen IHK-Artefakte unter 25 MiB und bytegleich im Produktionsbuild.
- PDF-Integritätsprüfung erneut bestanden: DE 46 / EN 44 Seiten, je 46 korrekt formatierte Bildunterschriften, je 34 Inhaltsverzeichnisziele; Originalprüfsummen und deutsche Inhalte unverändert.
- Alle zwölf Projektionsseiten automatisiert auf Überläufe und anhand von Kontaktbögen visuell geprüft.
- Ein veralteter Zustand des laufenden Vite-Entwicklungsservers lieferte nach dem lokalen Medienexport HTML für die deutsche MP4. Server neu gestartet; danach korrekter MIME-Typ `video/mp4` und HTTP 200. Produktionsvorschau lieferte die MP4 durchgehend korrekt.
- `test:hologram` bestanden: reale Klicks auf die bewegte Filmfläche und dekodierte Wiedergabe in DE/EN, Desktop und Smartphone; vollständige Deckkraft; geometrischer Abgleich mit der 3D-Fläche; native Tastaturbedienung; genau eine aktive Filmquelle beim Wechsel zur Lesefassung; Freigabe auf Detailseiten.
- `test:ihk` für alle zehn Viewport-/Sprachkombinationen bestanden (1920 × 1080, 1440 × 900, 1366 × 768, 768 × 1024, 390 × 844). Echte PDF-Downloads, native Lesefassungs-Wiedergabe, Fokus, Unterrouten, Sprachwechsel und HTTP 200 geprüft. Keine horizontalen Überläufe und keine JavaScript-Laufzeitfehler.
- `test:navigation` bestanden: Maus/Touch, Menüs, Außenklick, Tastatur, normales/reduziertes Bewegungsschema und Medien-Sprünge.
- Abschließender `test:projection` bestanden: echter 3D-Klick, Scrollen, Zoom, Rotation, mobiler Pinch, Lesefassungswechsel, Lebenslauf-Regressionsprüfung und korrigierte Detailroutenanker. Deckender Vollbildmodus zusätzlich gegen die Produktionsvorschau geprüft; vollständige Viewport-Abdeckung und Rückkehr bestätigt.
- Visueller DE/EN-Abgleich der neuen ersten Hologrammseite und der laufenden Clips auf Desktop und Smartphone. Der native Player liegt in den gemessenen Fällen weniger als 0,5 CSS-Pixel neben der projizierten Sollfläche. Film-, Seiten- und Browserprüfbilder ausschließlich unter `/tmp/ihk-hologram-*`.
- Lokale Vorschau läuft unter `http://127.0.0.1:4173/`, Entwicklungsserver unter `http://127.0.0.1:5173/`. Kein manueller Cloudflare-Deploy mangels eindeutig bestätigter Projektzuordnung.
- Verbleibende funktionale Probleme: keine festgestellt. Bestehende npm-/Bundlemeldungen unverändert.
