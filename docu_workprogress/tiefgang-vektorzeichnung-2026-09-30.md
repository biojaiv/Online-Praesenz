# Tiefgang – Vektorzeichnung und Paketweg (2026-09-30)

## Zeichnung
Die Hardware unter dem Laptop ist kein Rasterbild mehr (`tiefgang-zeichnung-ohne-client.webp`
entfällt), sondern Vektor: `src/example/hardwareGeometry.js` beschreibt alle Geräte als Boxen in
der Projektion der Originalzeichnung (Frontkante fällt mit 0,177, Tiefe 87/−36, gemeinsame Achse
x = 373); `src/example/hardwareDrawing.js` zeichnet daraus Access Point (WLAN-Bögen), Switch
(12 Ports mit Port-LEDs), Firewall, Server mit vier Dienstzeilen, Hypervisor mit drei VMs und
Storage (Uhr). Dienstzeilen, LEDs, Leitungslücken, VM-Schublade und Paketstationen werden aus
derselben Geometrie abgeleitet (`diagramLayout.js`). Laptop und Karton bleiben Rasterebenen
(Auspack-Animation).

Geblieben ist Blender als Option: der Grease-Pencil-SVG-Export (Blender 4.3) liefert nur Linien
ohne Flächen und keine adressierbaren Teile; die Seite braucht beides.

## Paketweg
Die Dienstzeilen folgen jetzt den Kapiteln: DHCP · DNS → PXE / DEPLOY → AD / IDENTITY →
UEM / PACKAGES. Die Paketstationen fallen streng ab (146 → 360 → 666 → 695 → 723 → 752 → 930);
bei der AD-Anmeldung springt das Paket nicht mehr zurück nach oben. Backup endet im Storage
ohne Dienstzeile.

## Bewegung
- Aktives Gerät wird orange eingefärbt (Linien, Flächen, Text).
- Daten fließen als laufende Strichlinie entlang aller Verbindungen; Uplink B nur, wenn er
  Verkehr trägt (nach dem Kabelziehen schneller und leuchtend).
- Switch-Port-LEDs flackern unregelmäßig, beim Ausfall rot.
- Die PXE-Schublade fährt aus VM 02, wenn „In die VM schauen“ geöffnet ist.
- Reduzierte Bewegung: keine Animationen.

## Layout
Bei niedrigen Desktop-Höhen (z. B. im Portal) beginnt das Protokoll unter der Kopfzeile und
scrollt in sich, statt Kopfzeilen-Links und Tiefenleiste zu überdecken; die Signatur entfällt
unter 860 px Höhe.

## Prüfung
`scripts/example/check_tiefgang.mjs` prüft zusätzlich die Vektorzeichnung und den nur abwärts
laufenden Paketweg; alle Durchläufe 1440 × 900 bis 320 × 624 (DE/EN) bestehen. Offen und
unverändert: Querformat 844 × 390 erreicht den Abschlussbildschirm nicht (bestand schon vorher).
