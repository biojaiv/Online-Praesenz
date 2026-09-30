# Klangzuordnung (2026-09-30)

Alle Klänge liegen in `sounds/`, werden als FLAC (Fallback WAV/MP3) ausgeliefert und bleiben
leise (Lautstärke 0,08–0,2). Keine Dauerschleifen; lange Signale werden ausgeblendet.
Vor der ersten Nutzergeste blockierte Hover- und Statusklänge werden verworfen statt nachgeholt.

| Klang | Ereignis | Datei |
|---|---|---|
| warp | Intro-Absprung | `Start.flac` (Fallback `pbewht00.wav`) |
| menu | Hover über Menü oben rechts und Sprachwahl | `Menue_Knöpfe_rechts_oben` |
| pedestal | Zeiger kommt auf einem Sockel der Startansicht zur Ruhe | `Sockelauswahlgeräusch.mp3` |
| beacon | Hover/Fokus auf einem Projekteintrag, Portalmaschine blinkt; stoppt beim Verlassen | `pulsemachine` |
| charge | Projekt gewählt, Kamera fliegt zur Maschine | `ppbwht00` |
| unfold | Maschine entfaltet sich | `dronemachine3` |
| powerdown | Portal schließt | `ppwrdown` |
| transmit | 30-Sekunden-Profil öffnet (1,5 s, ausgeblendet) | `t2b00tad` |
| complete | 30 Sekunden gelesen (1,6 s, ausgeblendet; nicht bei reduzierter Bewegung) | `ppywht00` |
| warn | Beispielseite lädt nicht | `warn1` |
| build / focus / release | unverändert: Intro-Aufbau, Sockel betreten/verlassen | `combeep1`, `tdrtra00`, `tdrtra01` |

Nicht verwendet: `dronemachine1`, `labdrone1` (Dauerbrummen), `button.mp3` (Klickfolge,
überschneidet sich mit dem Menüklang). `pbewht00.flac` entfällt; `Start.flac` ist identisch.
FLAC-Dateien erzeugt `scripts/prepare_media.mjs`.
