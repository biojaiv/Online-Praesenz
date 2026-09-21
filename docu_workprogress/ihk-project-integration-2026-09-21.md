# IHK-Projektintegration · 21.09.2026

## Ausgangsstand und Quellen

- Repository: `biojaiv/Online-Praesenz`, aktueller `main` bei Beginn: `6ec32b4`.
- Sicherheitsbranch: `backup/main-before-ihk-integration-20260921-161305`.
- Arbeitsbranch: `work/ihk-project-integration-2026-09-21`.
- Primäre Textquelle: `../Abschlussprojekt/Vladimir_Leicht_20260531_Projektarbeit_v1.docx`.
- Visuelle Referenz: `Projektarbeit/Vladimir_Leicht_20260531_Projektarbeit_v1.pdf`, 50 Seiten; identisch mit der PDF im benachbarten Abschlussprojekt-Ordner.
- Original-PDF SHA-256: `d5bdec2fbeae5673155677961eb0987ce624c436f77ebfc5511033780399b4e9`.
- Original-DOCX SHA-256: `863a1f1f1465164e3e38b35b930be3cfd52d726ad1bacb3dac448a3e2d9e6f11`.
- Beide Originale bleiben unverändert. Die angelieferte PDF und die maschinenspezifische `.npmrc` sind ausschließlich lokal über `.git/info/exclude` ausgenommen. Keine Originaldatei wird mitveröffentlicht.

## Endgültige Artefakte

| Datei unter `public/ihk/` | Ergebnis |
| --- | --- |
| `IHK_Projektarbeit_DE.pdf` | 49 Seiten; nur „Verwendete Hilfsmittel“ einschließlich Inhalt und TOC-Eintrag entfernt |
| `IHK_Project_Report_EN.pdf` | Vollständige englische Übersetzung, 44 Seiten |
| `IHK_Projektfilm_DE.mp4` | 42 s, 1280 × 720, 24 fps, H.264 / yuv420p, ohne Audio, faststart |
| `IHK_Project_Film_EN.mp4` | Gleiche technischen Eigenschaften |
| `IHK_Poster_DE.webp`, `IHK_Poster_EN.webp` | Lokal erzeugte Poster im Webseitenfarbschema |

Zusätzlich: bearbeitbare, bereinigte englische Endfassung unter `Projektarbeit/Webfassungen/IHK_Project_Report_EN.docx`; Übersetzung, Erzeugungs- und Prüfscripte unter `scripts/ihk/`. Alle öffentlichen Artefakte bleiben deutlich unter 25 MiB; beide Filme jeweils unter 1 MiB.

## Webseite

- Native HTML-Projektansicht innerhalb der bestehenden 3D-Bühne; unverändertes Hash-Routing für `abschluss`, `abschluss/server`, `abschluss/uem`, `abschluss/clients`, `abschluss/migration`.
- Bestehende Palette, Barlow-Schriften, Rahmen und Reader-Prinzip weiterverwendet. Keine separate Unterseite, keine Änderungen an Szenenbeleuchtung oder Partikeleffekten.
- Deutsche und englische Texte über das vorhandene `src/i18n.js`; eigene Nachrichtendatei, kein zweites Sprachsystem.
- Klare Abgrenzung: Pilot / PoC, 40 h Nettozeit, fünf Referenzclients vorgesehen, vier vollständig durchgeführt; 100 % ausschließlich für diese vier abgeschlossenen Testläufe.
- Statische PDF-Downloadlinks; natives Video mit `controls`, `playsinline`, `preload="none"`, ohne Autoplay. Sprachwechsel stoppt und entfernt die alte Filmquelle.
- Unterbereiche, Rücknavigation, Browserhistorie, Escape, Fokus und schmale Ansichten geprüft. Auf Smartphones umbrechende Kopf-/Fußtexte nur bei geöffneter IHK-Ansicht.
- „Coming soon“ nur beim Abschlussprojekt entfernt; private Projekte behalten den bisherigen Zustand.
- Gezielter Reader-Fix: Ein Schließwunsch während der Lebenslauf-Öffnungsanimation wird nachgeholt. Bei einem Bereichswechsel wird kein Fokus aus der neuen Ansicht zurückgestohlen.

## Dokumententscheidungen und verbleibende Quellmängel

- Der unveränderte DOCX-Probeexport reproduzierte den Text aller 50 Referenzseiten. Die deutsche Arbeitskopie wurde auf vollständige Inhaltsgleichheit außerhalb der Entfernung geprüft; die endgültige PDF übernimmt zur maximalen Layouttreue die Referenzobjekte. Pixelvergleich sämtlicher 49 verbleibender Seiten: außerhalb der entfernten Bereiche identisch.
- Die engere Vorgabe „alle anderen Inhalte unverändert“ wurde für DE beibehalten. **Bereits vorhandene Mängel bleiben deshalb bestehen:** veraltete Inhaltsverzeichnis-Verweise, einzelne getrennte Bilder/Bildunterschriften, 17 zusätzlich fett gesetzte Bildunterschriften, überlagerte Rollout-Bilder auf Originalseite 40 sowie über den Seitenrand reichende Bildobjekte auf Originalseite 12. Diese Mängel wurden erkannt; eine zusätzliche DE-Korrektur wurde nicht als erteilt angenommen. Die pauschale Forderung nach einer vollständig fehlerfreien deutschen Neuformatierung ist damit nicht erfüllt.
- EN verwendet britisches Englisch; Aussagen, Zahlen, Befehle, Produktnamen und technische Kennungen bleiben in ihrer Bedeutung erhalten. Auch unpräzise Aussagen der Quelle wurden nicht fachlich umgeschrieben. Die Webseite erläutert den tatsächlichen Pilotumfang ausdrücklich.
- Englisches Layout: A4, ursprüngliche Seitenränder, Times-Typografie, vergleichbare Überschriften; zweitseitiges Inhaltsverzeichnis mit 11-pt-Schrift, Punktfüllung und rechtsbündigen Zahlen. Die 34 Verweise und PDF-Sprungziele wurden nach dem endgültigen Export gegen die tatsächlichen PDF-Seiten geprüft. EN-Seitenzahlen beziehen sich auf die physischen PDF-Seiten.
- Alle 46 EN-Bildunterschriften: 11 pt, kursiv, nicht fett, zentriert; Bilder und Unterschriften auf derselben Seite, definierter Absatzabstand. Tabellenzeilen werden nicht getrennt. Deutsche Screenshot-Bedienoberflächen bleiben authentisch; Bildunterschriften und Erläuterungen sind übersetzt.
- **Die DOCX enthält unmaskierte Bildfassungen, die Referenz-PDF sichtbare Verdeckungen.** EN übernimmt daher gerenderte Screenshot-Ausschnitte aus der PDF einschließlich dieser Verdeckungen, auch in der bearbeitbaren Endfassung. Das in der Original-PDF vollständig überdeckte Zwischenbild beim zweiten Rollout wird nicht zusätzlich offengelegt. Kosten-, Zeit- und Prozessdiagramm wurden anhand der vorhandenen Daten mit englischen Beschriftungen nachgebildet.
- Keine unerwarteten leeren EN-Seiten, keine Textüberläufe oder Bild-/Textüberlagerungen. Der entfernte Abschnitt fehlt in beiden PDFs. Quellenangaben im eigenständigen Glossar bleiben erhalten.

## Prüfungen

- `npm install`, `npm run build`: erfolgreich. Vite meldet weiterhin den vorhandenen großen Szenen-Bundle; keine Architekturänderung zur künstlichen Beseitigung dieser Warnung.
- `npm audit`: nach gezieltem Update der transitiven Entwicklungsabhängigkeit `nanoid` von 3.3.16 auf 3.3.19 keine Befunde.
- Vorher waren keine Tests definiert. Reproduzierbare Browserprüfung ergänzt: `npm run test:ihk` bei laufendem Produktions-Preview.
- Chromium/Playwright: 1920 × 1080, 1440 × 900, 1366 × 768, 768 × 1024, 390 × 844 jeweils DE und EN; echte Downloadklicks und native Videostarts. Zusätzlich Unterrouten, Direktlink, Historie, Tastatur/Fokus, reduzierte Bewegung und schneller Wechsel zum/vom Lebenslauf-Reader.
- Vier statische HTTP-GETs: jeweils 200 mit korrektem PDF-/MP4-Content-Type. Kein `file://`-Test. Keine PDF-/Film-Vorabrequests vor Interaktion; nur eine Filmquelle aktiv.
- `check_artifacts.py`: PDF-Integrität, DE-Pixelvergleich, EN-Bildunterschriften und TOC-Ziele, keine unerwarteten leeren Seiten; vollständiger MP4-Decodierlauf, Codec, Pixelformat, Laufzeit, Audiofreiheit und faststart geprüft. Alle Dateien in `dist/ihk/` bytegleich mit `public/ihk/`.
- Sämtliche 93 finalen PDF-Seiten gerendert und visuell geprüft, einschließlich vollständiger Inhaltsverzeichnisse, Diagramme, Mehrfach-Screenshots, Testrollout, Soll-Ist-Vergleich, Zeitmanagement, Fazit und Glossar. Browseransichten mit dem vorherigen Design verglichen; Filmszenen in DE/EN visuell geprüft.
- Renderbilder, Browser-Screenshots, Testresultate, virtuelle Python-Umgebung und Zwischenexporte liegen außerhalb des Repositories unter `/tmp/ihk-work/` bzw. `/tmp/ihk-browser-check/`; nicht Bestandteil des Commits.
- Die lokale `.npmrc` erzeugt weiterhin eine npm-Meldung zur nicht unterstützten projektlokalen `prefix`-Einstellung. Installationen und Builds enden erfolgreich; die Datei bleibt wie beauftragt unangetastet.

## Wiederholung und Deployment

Python-Abhängigkeiten: `scripts/ihk/requirements.txt`; zusätzlich LibreOffice und FFmpeg. Erzeugung mit `build_reports.py --source <Original-DOCX> --reference <Original-PDF>` und `build_films.py`. Der normale Webseitenbuild benötigt ausschließlich die fertigen Dateien im Repository.

Browserprüfung: `npm run preview`, anschließend `npm run test:ihk`. Bei Bedarf `CHROMIUM_PATH` auf einen vorhandenen Chromium-Browser setzen; ansonsten den zu Playwright gehörenden Browser installieren. Artefaktprüfung: `python scripts/ihk/check_artifacts.py` mit verfügbaren Python-Abhängigkeiten und lokaler Original-PDF.

Kein manueller Cloudflare-Deploy: Im Repository und in den GitHub-Projektmetadaten ist kein eindeutig zugeordnetes Pages-Projekt angegeben; Wrangler ist nicht als bestehendes Projektwerkzeug eingerichtet. Es wurde kein Projektname geraten.

Die Integration wird auf dem Arbeitsbranch bereitgestellt. Die Übernahme nach `main` bleibt bis zur Entscheidung über die dokumentierten deutschen Quellmängel offen: Die ursprüngliche Anweisung erlaubt diesen Schritt erst nach vollständig erfolgreichen Prüfungen. Lokaler `main` und `origin/main` bleiben auf dem identischen Ausgangscommit.
