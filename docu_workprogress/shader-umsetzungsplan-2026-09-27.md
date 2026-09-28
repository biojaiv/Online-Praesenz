# Shader-Erweiterungen: konkreter Umsetzungsplan

Stand: 27. September 2026. **Die erste Integration ist lokal umgesetzt:** separate GLSL-Dateien und Materialmodule für die bestehenden Partikelkanten und Jets, lokale Uniforms, Qualitätssteuerung, Fresnel, kurze Aktivierung und statischer Fehlerersatz. Dokumentation: [Hologram GLSL](../src/scene/shaders/README.md). Der folgende Plan bleibt die Grundlage für spätere Erweiterungen; P3 und P5 wurden nicht vorgezogen.

Bei der Umsetzung wurde festgestellt: `hologramField.js` ist derzeit nicht an die aktive Szene angeschlossen. Es wurde nicht reaktiviert. Die Integration ersetzt die aktiven Shader in `cards.js` und ergänzt keine weitere Volumenschicht. Das mittlere Doppelblatt erhält den Impuls über seine bestehenden Jets; seine deckenden Inhaltsmaterialien bleiben erhalten.

## Ziel und verbindliche Gestaltungsgrenzen

Die räumliche Darstellung soll hochwertiger wirken, während Dokumente ruhig, deckend und gut lesbar bleiben. Das vorhandene Farbsystem, die Blender-Texturen, die gleiche Hologrammhöhe und der fließende Vollbildübergang sind die Grundlage. Zusätzliche Effekte müssen einen nachweisbaren visuellen Nutzen haben und in das vorhandene Leistungsbudget passen.

Shader sind nicht automatisch schneller. Sie entlasten die CPU bei parallelisierbaren Berechnungen, können aber durch große transparente Flächen, viele Texture-Zugriffe und zusätzliche Renderdurchgänge die GPU stärker belasten. Die Anzahl überzeichneter Pixel ist bei dieser Seite besonders wichtig. [MDN: WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

## 1. Was bereits vorhanden ist

| Bereich | Bestehende Umsetzung | Folgerung |
| --- | --- | --- |
| Dokumente | `src/scene/resumeProjection.js`: eigenes ShaderMaterial, Texturfenster, Scrolloffset, Hintergrundfarbe und Deckkraft | Textdarstellung erhalten; Randeffekte getrennt ergänzen. |
| Jet und Dokumentrahmen | `src/scene/cards.js`: eigene Vertex-/Fragment-Shader für Partikel und Rahmen | Vorhandene GPU-Bewegung weiterverwenden. |
| Hologrammvolumen | `src/scene/hologramField.js`: Shader mit View-Normalen, Blickrichtung, Zeit und kurzen Anpassungsverzerrungen | Fresnel und zeitliche Zustände konsolidieren, keinen zweiten Effekt darüberlegen. |
| Sockelenergie | `src/scene/pedestalEnergyField.js`: Partikelattribute und zeitabhängige GPU-Bewegung | Keine zusätzliche CPU-Partikelschleife und keine pauschale Erhöhung der Partikelzahl. |
| Orrery | `src/scene/orreryMaterials.js`: gezielte Änderung des PBR-Shaders über `onBeforeCompile` | Originalfarbe, Rauheit, Metall- und Normalinformationen behalten. |
| Qualitätssteuerung | `src/scene/renderBudget.js`: drei Profile, begrenzte Renderauflösung, Absenkung bei anhaltend langsamen Frames | Neue Effekte müssen denselben Profilen folgen. |
| Vollbild | `src/ui/exampleProjection.js`: Vorschau wächst zum HTML-/Iframe-Inhalt; 3D-Hauptszene pausiert | Diesen zugänglichen Übergang erhalten. Shader nur für seinen dekorativen Rahmen prüfen. |

Die Seite arbeitet also bereits mit eigenem GLSL. Die nächste sinnvolle Arbeitsprobe ist eine sauber abgegrenzte, dokumentierte Erweiterung mit Vergleichsmessungen.

## 2. Reihenfolge und Arbeitspakete

### P0 — Ausgangswerte und Vergleichbarkeit

1. Reproduzierbare Ansichten festlegen: Startseite, jeder Sockel, Rückseite, Dokumentzoom, Galerie, geöffnetes Beispiel.
2. Zeit/Seed der dekorativen Effekte für Vergleichsscreenshots einfrieren. Sprache, Fenstergröße, DPR und Qualitätsprofil dokumentieren.
3. Nach Ladephase je 30 Sekunden messen: Framezeit p50/p95, Draw Calls, Dreiecke/Punkte, Textur-/Geometriezähler, aktive Shaderprogramme. Bei Postprocessing die Statistiken über alle Durchgänge eines Frames sammeln.
4. GPU-Zeit nur bei verfügbarer Timer-Query-Erweiterung erheben und ungültige/disjoint Ergebnisse verwerfen. Sonst ausdrücklich nur Framezeiten angeben.
5. Referenz auf einem echten schwächeren Laptop und einem Handy aufnehmen. Software-WebGL im automatisierten Test ist ein Funktionstest, kein belastbarer GPU-Benchmark.

**Ergebnis:** Messprotokoll und Bilder vor jeder visuellen Erweiterung. `renderer.info` bietet Render- und Speicherzähler, keine vollständige VRAM-Messung. [Three.js WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html)

### P1 — Gemeinsames Material für die dekorativen Hologrammkanten

Geplante Dateien:

- `src/scene/materials/hologramEdgeMaterial.js`: Factory, Lebenszyklus und Qualitätsvarianten.
- `src/scene/shaders/hologramEdge.vert.glsl` und `.frag.glsl`: überschaubare GLSL-Module, als Text importiert.
- Anbindung an den bestehenden Rahmen in `cards.js` und an `hologramField.js`.

Uniforms:

| Uniform | Verwendung |
| --- | --- |
| `uTime` | Begrenzte lokale Animationszeit; im inaktiven Zustand nicht weiterschalten. |
| `uAccent` | Akzent des jeweiligen Sockels, in konsistentem linearen Farbraum. |
| `uIntensity` | Helligkeit aus bestehendem Aktivierungs-/Hoverzustand. |
| `uActivation` | Einzelner, ausklingender Impuls beim Aktivieren. |
| `uMotion` | 0 bei reduzierter Bewegung; dekorative Bewegung aus. |
| `uScanDensity` | An Auflösung und Entfernung angepasste Liniendichte. |
| `uViewport` | Tatsächliche Rendergröße für Effekte in Pixelmaßen. |

Pro Material eigene Uniform-Container verwenden, damit der Hover eines Sockels nicht alle Materialien verändert. Zeitwerte gesammelt übergeben; keine neuen Materialien oder Arrays pro Frame erzeugen. Uniform-Werte können pro Frame geändert werden, ohne das Shaderprogramm neu zu erstellen. [Three.js ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html)

**Fresnel:** Normalen und Blickrichtung im selben Koordinatenraum berechnen, beide normalisieren; Skalarprodukt begrenzen. Für beidseitige Flächen die Rückseite explizit behandeln. Startwert: Exponent 3, geringe Intensität. Bei flachen Blättern zusätzlich Abstand zur UV-Kante nutzen: Fresnel allein erzeugt auf einer zur Kamera parallelen Ebene keine umlaufende rechteckige Kontur.

**Deckkraft:** Der Dokumentinhalt bleibt deckend. Effektmasken betreffen nur den äußeren schmalen Rahmen und das bestehende Volumen. Kein flächiges Flimmern über Lebenslauf, Vorschaukarten oder Video.

**Abnahme:** Inhaltspixel im inneren Dokumentbereich stimmen bei deaktivierten Effekten mit der Referenz überein; keine Rechteckplatte, keine Sprünge beim Sockelwechsel; Rand auch beim Drehen plausibel.

### P2 — Scanlines und Aktivierung, sparsam dosiert

- Feine Scanlines ausschließlich in dekorativen Rand-/Energieflächen; keine Linien über Fließtext.
- Die Frequenz anhand der projizierten Größe begrenzen. Mit Ableitungen (`fwidth`) glätten, um Moiré bei Zoom und niedriger Renderauflösung zu vermeiden.
- Ein kurzer Aktivierungsimpuls, etwa 400–650 ms, läuft am Rand entlang. Kein dauerhaftes nervöses Flackern.
- Optional eine sehr kleine Geometrieverzerrung des Randes, höchstens ungefähr ein sichtbarer Pixel und nur kurz am Anfang. Hit-Flächen und eigentlicher Dokumenttext bleiben stabil.
- Bei `prefers-reduced-motion` statische Kontur ohne Scanwanderung, Jitter und Puls.

**Abnahme:** Zoomstufen, 390-px-Handybreite, lange englische Texte und hohe Kontraste prüfen. Keine horizontale Kante darf schwarze Beschreibungen übermalen.

### P3 — Orrery-Lichtwanderung verfeinern

- Vorhandene Routen und lokale PBR-Lichter weiterverwenden; keine zweite Orrery und kein emissiver Farbfilm.
- Energie entlang der vorhandenen Ring-/Strebenverbindungen parametrieren. Richtung pro Durchgang deterministisch aus einem Seed wählen, mit horizontalen und vertikalen Abschnitten.
- Weiche Front und kürzeres Nachleuchten derselben Route; Anzahl gleichzeitig aktiver Routen begrenzen.
- Die bestehenden etwa 15–20 % beziehen sich auf die bereits verwendeten Stichproben entlang von Ring-/Strebenlängen. Das ist ausdrücklich kein garantierter Anteil heller Bildschirmpixel.
- Shader-Cache-Schlüssel bei tatsächlichen Quellcodevarianten aktualisieren. Laufende Lichtzustände bleiben Uniforms.

**Abnahme:** Originaltexturen aus verschiedenen Kamerawinkeln sichtbar; Dunkelphasen erhalten; ferne Maschinen beim Blick von hinten erkennbar; keine neue globale Umgebungsaufhellung. PBR-Hooks und Cache müssen zusammenpassen. [Three.js Material](https://threejs.org/docs/pages/Material.html)

### P4 — Jets und Partikel zusammenführen

- Bestehende Positionsberechnung auf der GPU beibehalten.
- Lebensdauer, Höhe und Geschwindigkeitsanteil aus vorhandenen Seed-Attributen ableiten; gemeinsame weiche Ein-/Ausblendung am Dokumentansatz.
- Statische Attribute einmal hochladen. JavaScript steuert nur Zeit, Intensität, Sichtbarkeit und gegebenenfalls Qualitätsstufe.
- Punktgröße in Bildschirmpixeln begrenzen; Randbereiche früh verwerfen. Dichte nur nach Vergleich der Bildwirkung und Fillrate erhöhen.
- Ähnliche Materialien nur dann vereinigen, wenn dadurch Draw Calls tatsächlich sinken, ohne Sortierung oder eigenständige Sockelzustände zu beschädigen.

**Abnahme:** Lückenloser Jet-Übergang an allen drei gleich hohen Hologrammen; weniger oder gleich viele Draw Calls; keine animierten CPU-Positionspuffer. Zusammengefasste Geometrien können die Zahl der Draw Calls senken. [Three.js Optimierung](https://threejs.org/manual/pages/optimize-lots-of-objects.html)

### P5 — Optionaler Effekt am Vollbildrahmen

Erst nach Bestehen von P1–P4: ein kurzes Aufbauen/Abklingen der äußeren Hologrammumrandung beim Öffnen/Schließen. Die HTML-Seite selbst bleibt eine echte bedienbare Webseite; Menü, Text, Scrollen und Kameralogik bleiben außerhalb des Shaderprogramms. Ein Noise-Dissolve wäre nur für die Kontur zulässig, nicht für die lesbare Inhaltsfläche. Der bereits vorhandene fließende Übergang dient als Referenz und Rückfallweg.

## 3. Qualitätsstufen und Freigabekriterien

| Profil | Zusätzlicher Rand | Scanlines/Jitter | Bestehende Partikel |
| --- | --- | --- | --- |
| Low | Statisch, schmal | Aus | Bestehende reduzierte Anzahl |
| Balanced | Fresnel + ein Aktivierungsimpuls | Sehr schwach, kein Jitter | Bestehendes Budget |
| Full | Geglättete Kontur + Impuls | Optional nach Messung | Höchstens bestehendes Budget zum Start |
| Reduced motion | Statisch | Aus | Statische bzw. bereits reduzierte Darstellung |

Vorgeschlagene, noch zu messende Freigabegrenzen:

- Keine neuen flächendeckenden Postprocessing-Durchgänge.
- Höchstens ein zusätzliches Kantenmaterial je bereits sichtbarem Hologramm; vorhandene Randdurchgänge möglichst ersetzen.
- Auf festgelegtem Testgerät nicht mehr als 10 % schlechtere p95-Framezeit gegenüber P0. Auf schwachem Gerät Ziel 30 fps, sofern die Ausgangsszene dies bereits erreicht.
- Keine zusätzliche Animationsschleife in versteckten Tabs oder hinter dem geöffneten Beispiel.
- Nach zehn Öffnen-/Schließen-Zyklen keine stetig wachsenden Geometrie-, Textur- oder Programmzahlen nach der Aufwärmphase.
- Shaderfehler, WebGL-Kontextverlust und nicht unterstützte Optionen führen zum vorhandenen einfachen Material bzw. zur HTML-Ansicht.
- Kein neues transparenzbedingtes Sortierungsflackern. Transparente beidseitige Materialien können zusätzliche Durchgänge und Sortierprobleme verursachen. [Three.js Transparenz](https://threejs.org/manual/pages/transparency.html)

## 4. Dokumentation als GLSL-Arbeitsprobe

Ein kurzes englisches README neben den Shadern erklärt Koordinatenräume, Uniforms, Kantenmaske, Antialiasing, Qualitätsstufen und Lebenszyklus. Dazu ein Vorher-/Nachher-Bild und echte Messwerte samt Gerät, Browser, Auflösung und Testablauf. Material, Geometrie und Texturen werden beim Entfernen explizit freigegeben. [Three.js Ressourcenfreigabe](https://threejs.org/manual/pages/cleanup.html)

Jedes Arbeitspaket bleibt separat abschaltbar. Zuerst P0 und P1, dann Abnahme der Wirkung; weitere Effekte folgen nur bei eingehaltenem Budget.
