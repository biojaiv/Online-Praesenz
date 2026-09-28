# Webseiten anbieten: Gestaltung und Effizienzplan

Stand: 27. September 2026. Nur Untersuchung, Planung und Bildentwurf. Keine Änderung am Anwendungscode, kein Build und keine Veröffentlichung.

## Einschätzung

Das Portfolio bietet eine eigenständige visuelle Referenz für anspruchsvolle interaktive Websites. Für ein kommerzielles Angebot sollte bereits der erste Bildschirm erklären, was Vladimir Leicht anbietet, wofür sich die Leistungen eignen und wie eine Anfrage möglich ist. Die vorhandene räumliche Darstellung liefert den sichtbaren Beleg dafür. Das Laden dieser Demonstration sollte von der Benutzbarkeit der Angebotsseite entkoppelt sein.

Gestaltungsvorschlag: `webseiten-angebot-konzept-2026-09-27.jpg`. Dunkler Hintergrund, warmer Bernstein, große lesbare Schrift, ein zentrales räumliches Motiv und großzügige Abstände. Die Projektabbildungen sind KI-generierte Interpretationen der Referenzen, keine pixelgetreuen Screenshots. In einer Umsetzung würden echte Aufnahmen eingesetzt.

## Was untersucht wurde

- Quellcode im aktuellen lokalen Stand `717459b`, bestehende Build-Dateien sowie die öffentliche Startseite `https://vladimir-leicht.com/`.
- Frische Browser-Kontexte ohne gespeicherten Besuch: Desktop 1536 × 960 und mobile Emulation 390 × 844. Prüfung ohne Klick auf Projekte; Netzwerk nicht künstlich gedrosselt.
- Ressourcenabrufe, Startverhalten, Rendersteuerung und HTTP-Cache-Header. Keine repräsentative Gerätestudie und kein vollständiger Funktionstest.
- Der Prüf-Browser verwendet SwiftShader, also Software-Rendering. Seine Bildrate und CPU-Belastung sind nicht auf einen echten Laptop oder ein Smartphone übertragbar. Der Desktop-Einzellauf lieferte FCP 0,64 s und LCP 6,75 s. Das ist ein diagnostischer Hinweis, keine belastbare Nutzerkennzahl; LCP bildet zudem nicht die Fertigstellung der gesamten WebGL-Szene ab.

## Konkrete Befunde

Die erfassten Ressourcen übertrugen beim ersten Besuch insgesamt rund **4,90 MB** (dezimal, inklusive der in Resource Timing ausgewiesenen Header). Desktop und mobile Emulation forderten dieselben hier erfassten Dateien an. Die Zahl ist die Summe der beobachteten Resource-Timing-Einträge, keine vollständige Paketaufzeichnung einschließlich Hauptdokument.

| Gruppe | Beobachtete Übertragung | Bedeutung |
| --- | ---: | --- |
| Hintergrund und zwei Sockel-GLBs | 2,44 MB | Größter Anteil; mobil dieselben Modelle |
| Dokumentbilder, Projektvorschauen und Poster | 1,68 MB | Hohe Dokumentauflösung wird schon im Startbild geladen |
| Vier WAV-Sounds | 0,36 MB | Bereits vor gezielter Interaktion geladen |
| JavaScript einschließlich Decoder-Wrapper | 0,34 MB | Hauptbundle allein ca. 0,289 MB übertragen und 0,961 MB entpackt |
| Stylesheet, WASM und übrige erfasste Einträge | ca. 0,08 MB | Nachrangiger Anteil |

Der vorhandene `dist`-Ordner belegt etwa 50 MiB. Davon entfallen rund 24 MiB auf die beiden Recovery-Videos. Diese Videos, die PDFs und das große Tiefgang-PNG wurden beim geprüften Startseitenaufruf **nicht** abgerufen. Ihre Dateigröße ist daher kein Beleg für langsames initiales Laden. Auch das etwa 2 MiB große Orrery-Referenzbild fehlte in diesen Startabrufen.

Bereits sinnvoll gelöst:

- Draco-Kompression der 3D-Modelle; die Sockelsprache wird bedarfsabhängig gewählt.
- Renderziel von ungefähr 30 Bildern/s, begrenztes Pixelbudget und niedrigere Auflösung bei anhaltend langsamen Frames.
- Renderpause bei verborgenem Tab und hinter einer vollständig geöffneten HTML-Projektion.
- Leichtere Fallback-Sockel sowie zeitliche Grenzen für die Ladeüberlagerung.
- Projekt-Iframes entstehen erst beim Öffnen; das Recovery-Video nutzt `preload="metadata"`.
- Mobile Emulation ohne horizontalen Seitenüberlauf.

Offene Ansatzpunkte:

- Ein viersekündiges Modell-Wartefenster und eine sechssekündige Ladeobergrenze schützen vor dauerhaftem Warten, ersetzen aber keinen unmittelbar benutzbaren Einstieg. Das zusätzliche Intro kann die Navigation zeitweise sperren.
- Kleinere GPU-Auflösung reduziert noch nicht die Downloadmenge der Modelle und Dokumente.
- Optionale Oberflächen und Effekte werden zum Teil statisch importiert. Späteres Initialisieren allein verschiebt ihren Code-Download nicht.
- Die Stichprobe für ein gehashtes JS-Asset ergab `public, max-age=14400, must-revalidate`. Hier wäre längeres unveränderliches Caching prüfenswert. Komprimierung des JavaScript ist bereits wirksam.

## Priorisierter Plan

| Priorität | Geplante Änderung | Zweck und Prüfung |
| --- | --- | --- |
| 1 | Sofort sichtbare und bedienbare Navigation; Intro kürzen oder als freiwillige Inszenierung anbieten. Für die Angebotsseite Text, Kontakt und Vorschaubild als HTML ausliefern. | Inhalt und Anfrage funktionieren bereits während optionale 3D-Dateien laden. Unter langsamer Verbindung praktisch prüfen. |
| 1 | Kleine, scharfe Startvorschauen für CV und Abschlussprojekt; volle Dokumentauflösung erst beim Annähern/Öffnen nachladen. Bestehendes Bild bis zum Austausch halten. | Geringere Übertragung und Texturspeicher bei unveränderter Lesbarkeit im geöffneten Dokument. Beide Sprachen und Zoom prüfen. |
| 1 | Sounddateien kompakter codieren und zeitlich hinter sichtbaren Inhalt stellen; erster Interaktionssound darf nicht ausfallen. | Die derzeit etwa 358 kB Startabrufe deutlich reduzieren; Format und Erstwiedergabe im Browser prüfen. |
| 2 | Leichtere mobile Modellvarianten und vereinfachte entfernte Geometrie prüfen. Gemeinsam genutzte Geometrie/Materialien und sichtbare Polygone erfassen. | Netz-, Dekodier- und GPU-Aufwand reduzieren. Erst nach Messung entscheiden, ob Detailstufen oder weniger Zeichenaufrufe den größeren Nutzen bringen. |
| 2 | Optionale Projektansichten und Inspektionsoberflächen in bedarfsgeladene Module aufteilen; auf der Angebotsseite den ganzen 3D-Einstieg dynamisch laden. | Weniger anfänglicher JavaScript-Aufwand; Übergänge dürfen beim ersten Öffnen nicht leer bleiben. |
| 2 | Auf echten schwachen Geräten Bloom, transparente Flächen, Partikel und Zeichenaufrufe einzeln profilieren. Qualität nicht nur über Auflösung abstufen. | Stabile Bedienung mit klaren Schriften; sichtbare Effekte gezielt erhalten. Keine pauschale Entfernung aller Animationen. |
| 3 | Gehashte Assets langfristig cachen; austauschbare Dateien versionieren. Schriftfamilien und tatsächlich verwendete Schnitte prüfen, gegebenenfalls lokal bündeln. | Wiederholte Besuche beschleunigen und zusätzliche Verbindungsaufbauten verringern. HTML muss neue Versionen weiterhin zuverlässig finden. |
| 3 | Tiefgang-Bilder für tatsächliche Darstellungsgrößen vergleichen; GPU-komprimierte Texturen nur bei nachgewiesenem Texturspeicherproblem erproben. | Kleine Transferdatei und geringer GPU-Speicher sind unterschiedliche Ziele. Diagrammlinien und Beschriftung dürfen keine sichtbaren Kompressionsfehler erhalten. |

Wichtige Stellen: `src/main.js`, `src/ui/intro.js`, `src/scene/stage.js`, `src/scene/renderBudget.js`, `src/scene/cards.js`, `src/scene/background.js`, `src/scene/resumeProjection.js`, `src/scene/examplePreview.js`, `src/ui/audio.js`, `src/ui/exampleProjection.js` und `vite.config.js`.

## Angebotsseite im JPG

1. **Einstieg:** „Websites, die im Kopf bleiben.“ Direkt darunter eine verständliche Beschreibung und „Projekt besprechen“. Ein einzelner räumlicher Blickfang greift Sockel und Orrery auf.
2. **Eigene Arbeiten:** Das räumliche Portfolio als Hauptreferenz; Tiefgang als Beispiel dafür, wie komplexe Abläufe durch Scrollen verständlich werden. Referenzseiten erklären jeweils Aufgabe, Interaktion und technische Umsetzung.
3. **Leistungen:** Markenauftritt, interaktive Erlebnisse und technische Umsetzung. Kundennutzen in der Hauptansicht, technische Details auf Wunsch.
4. **Ablauf:** Verstehen, entwerfen, entwickeln, verfeinern. In der Ausarbeitung je ein kurzer Satz zu Ergebnis und Abstimmung.
5. **Anfrage:** Ziel, gewünschte Funktion, Zeitrahmen und optional Budget; außerdem ein direkter Kontaktweg. DE und EN mit gleichwertigem Inhalt.

Die 3D-Demo wird durch „Interaktive Demo starten“ aktiviert. Vorher steht an derselben Stelle ein optimiertes Standbild mit reservierten Abmessungen. Beim Scrollen aus dem sichtbaren Bereich oder beim Tabwechsel pausiert die Demo. Auf kleinen Bildschirmen folgen Text, Bild und Arbeiten untereinander; Kontakt bleibt ohne Demo zugänglich. Reduzierte Bewegung bekommt eine ruhige Darstellung. Das vorgeschlagene Schriftbild muss in der Umsetzung auf wenige wirklich benötigte Schriftdateien begrenzt werden.

## Erfolgskriterien für eine spätere Umsetzung

- **Neue Angebotsseite:** geplantes Budget bis etwa 0,8 MB für den ersten Bildschirm einschließlich Bild, Schriften, CSS und JavaScript; keine 3D-Modelle und keine Videos vor dem Start der Demo. Vorläufiges Projektziel, noch nicht erreicht oder gemessen.
- **Vorhandenes Portfolio:** Ziel zunächst höchstens etwa 3 MB für die anfänglichen Ressourcen statt der beobachteten 4,90 MB; konkretes Einsparpotenzial anhand der Exportqualität validieren.
- **Nutzerkennzahlen:** LCP höchstens 2,5 s, INP höchstens 200 ms und CLS höchstens 0,1 als Ziel am 75. Perzentil realer Besuche, jeweils für Mobil/Desktop. Ohne ausreichende echte Besuchsdaten nur Laborwerte ausweisen. Diese Grenzen entsprechen den [Core Web Vitals](https://web.dev/articles/vitals).
- **3D:** auf einem vereinbarten schwachen Referenzgerät möglichst stabile 30 Bilder/s, sofortige Reaktion von Navigation und ESC sowie keine dauerhaft laufende verdeckte Szene.
- **Abnahme:** Erstbesuch und Wiederbesuch, beide Sprachen, Zoom, Touchpad, Projekt öffnen/schließen, langsame Verbindung, reduzierte Bewegung und Tabwechsel. Speicher über mehrere Öffnen/Schließen-Zyklen beobachten; Cache-Aktualisierung nach Veröffentlichung prüfen.

## Fachliche Grundlage

- [LCP optimieren](https://web.dev/articles/optimize-lcp): sichtbaren Hauptinhalt früh auffindbar machen und Verzögerungen getrennt untersuchen.
- [Browserseitiges Lazy Loading](https://web.dev/articles/browser-level-image-lazy-loading): das zuerst sichtbare Hauptbild nicht verzögert laden; nachgelagerte Bilder gezielt später laden.
- [Three.js: Ressourcen freigeben](https://threejs.org/manual/pages/cleanup.html): GPU-Ressourcen benötigen explizite Freigabe; vorhandene Pausen- und Dispose-Logik beim Umbau erhalten.
- [Three.js: KTX2Loader](https://threejs.org/docs/pages/KTX2Loader.html): mögliche Grundlage für komprimierte GPU-Texturen, wenn Messungen diesen Aufwand rechtfertigen.

Das JPG wurde mit dem integrierten Imagegen-Werkzeug erstellt und anschließend lediglich ins gewünschte JPEG-Format konvertiert. Erzeugungs- und Überarbeitungsprompt stehen in `webseiten-angebot-bildprompts-2026-09-27.txt`.
