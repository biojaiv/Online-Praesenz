Recovery Lab: recherchierte Anleitung zur Umsetzung

Stand: 22.09.2026, Fassung 3 mit zusätzlicher Verschlüsselungs- und Sicherheitsprüfung. Status: Umsetzungsleitfaden mit Konfigurationsbeispielen, keine ausgeführte oder abgenommene Installation. Die Hardwareangaben stammen aus deinem bereitgestellten Konzept; in dieser Sitzung wurde dein Laptop nicht untersucht. Grundlage: i7-1265U, 32 GB RAM, ungefähr 98 GiB frei.

Die Schritte sind in Arbeitsreihenfolge angeordnet. Befehle nur auf dem jeweils genannten Rechner ausführen. Konfigurationsbeispiele sind Vorlagen; Netzadressen, Paketstände, Schnittstellen und Pfade erst nach der Bestandsaufnahme verbindlich festlegen. Dies ist kein bereits getestetes Komplettinstallationsskript.

Korrektur der bisherigen Einordnung: Die erste Fassung war als vollständig ausführbare Schritt-für-Schritt-Anleitung zu weitgehend angekündigt. Auch diese Fassung ersetzt noch keine fertig implementierten VM-Definitionen, Firewalldateien und Ansible-Rollen. Sie definiert die konkrete Umsetzung und deren Abnahme. Hostabhängige Änderungen beginnen erst nach Schritt 2; bis dahin sind ausschließlich die dortigen Lesebefehle zur direkten Ausführung vorgesehen.

1. Die wichtigsten Entscheidungen

Vier Debian-VMs wie vorgeschlagen beibehalten. Gitea, PostgreSQL und Nginx direkt als Systemdienste installieren. Container, Windows und SIEM würden den ersten Nachweis unnötig vergrößern. 6 GiB zugeteilter Gast-RAM sind ein sinnvoller Start; der Host benötigt zusätzlich Speicher für Virtualisierung und eigene Anwendungen.

Für den ersten Stand Backup per Abruf durch ops vorsehen: services erzeugt einen konsistenten Sicherungssatz; ops holt ihn per eingeschränktem SSH-Zugang ab und schreibt ihn in ein lokales Restic-Repository. Dadurch liegen auf services weder Restic-Kennwort noch Zugang zum Repository. Das ist eine bewusste Anpassung der ursprünglichen Verbindung „Services → Backup“.

Schutzumfang: Das Lab demonstriert Trennung und Wiederherstellung nach Betriebsfehlern. Host, gateway und ops gehören zur vertrauenswürdigen Verwaltung. Eine kompromittierte ops-VM besitzt Verwaltungsrechte und kann ihr beschreibbares Repository beschädigen. Eine zweite virtuelle Platte ist weder unveränderliche Sicherung noch Schutz gegen einen kompromittierten Host. Unprivilegierte Testnutzer erhalten keine Administrationsrechte und keinen eigenen Programmausführungspfad über Gitea.

Das Repository liegt auf einer separaten virtuellen Datenplatte von ops. Fällt nur ops aus, kann diese Platte nach vollständigem Ausschalten der alten VM an eine neue ops-VM angehängt werden. Bei Verlust oder Beschädigung dieser Platte hilft das nicht. Ein getrenntes physisches Sicherungsmedium bleibt ein späterer eigener Baustein.

Die Backupplatte als unabhängiges Datenimage ohne Abhängigkeit von der ops-Systemplatte anlegen. Wiederherstellungs- und Aufräumprogramme müssen sie ausdrücklich von der ersetzbaren Systemplatte unterscheiden; kein pauschales Entfernen sämtlicher VM-Datenträger.

Wiederherstellung zunächst manuell nachvollziehen, dann denselben Ablauf automatisieren. Ein Administrator startet den Wiederanlauf ausdrücklich; ein Alarm löst noch keine automatische Löschung oder Neuinstallation aus.

Verbindliche Schutzgrenzen

Ereignis

Was dieses Lab nach erfolgreicher Abnahme leisten soll

Verbleibende Grenze

Dienstfehler, gelöschtes Testrepository, verlorene Service-Systemplatte

Wiederherstellung eines geprüften Sicherungsstands

Änderungen nach dem Sicherungszeitpunkt können fehlen

Zugriff eines unberechtigten Gitea-Nutzers

Repositoryrechte durchsetzen

kein Schutz vor einem Gitea-/OS-Administrator

Mitlesen zwischen Gästen

Git und Administration verschlüsselt, Monitoring nach Abschnitt 9 mit gegenseitiger TLS-Authentisierung

Endpunkte können entschlüsselte Daten sehen

Diebstahl ausgeschalteter SSD/Laptop

vertrauliche Lab-Daten bei nachgewiesener Datenträgerverschlüsselung schützen

laufender/entsperrter oder kompromittierter Host nicht abgedeckt

Manipulation einer Sicherungsdatei ohne Schlüsselzugriff

kryptografische Integritätsprüfung und Wiederherstellungstest

gelöschte oder vollständig zurückgerollte Sicherungen können dadurch nicht zurückgeholt werden

Kompromittiertes services

kein direkter Schreibzugriff auf das Restic-Repository

Angreifer kann aktuelle Quelldaten vergiften; Abruf und Restore müssen Eingaben sicher behandeln

Kompromittiertes ops oder Host

kein zugesicherter Schutz im Grundaufbau

getrennte Vertrauens- und Sicherungsinstanz erforderlich

Ein lediglich geplanter Test darf nicht als bestanden ausgelegt werden. Begriffe wie „vollständig verschlüsselt“, „ransomwaresicher“ oder „nach Angriff sauber wiederhergestellt“ sind für den Grundaufbau nicht zulässig. Die Schritte 10–13 beschreiben zunächst Betriebsfehler; für Angriffsverdacht gilt der gesonderte Ablauf im Sicherheitsanhang.

2. Nur lesende Bestandsaufnahme auf dem Laptop

date -Is
uname -a
cat /etc/os-release
lscpu
free -h
df -hT
id
ls -l /dev/kvm
virsh -c qemu:///system list --all
virsh -c qemu:///system net-list --all
virsh -c qemu:///system pool-list --all
ip -br address
ip -4 route show table all
ip -6 route show table all
ip rule show
ss -lntup
lsblk -o NAME,TYPE,FSTYPE,MOUNTPOINTS
findmnt -T /var/lib/libvirt/images
findmnt -T "$HOME"
swapon --show

Mit administrativen Leserechten zusätzlich sudo nft list ruleset prüfen. Falls vorhanden: virt-host-validate qemu. Für jedes bestehende libvirt-Netz dessen XML mit virsh -c qemu:///system net-dumpxml NAME ansehen. VPN bei der Routenprüfung berücksichtigen. Ist iptables im Einsatz, zusätzlich dessen aktiven Regelsatz erfassen.

Die beiden findmnt-Aufrufe zeigen nur Beispielorte; nach Festlegung alle tatsächlichen Image-, Geheimnis-, Temporär-, Sicherungs- und Wiederherstellungspfade prüfen. Die gesamte Gerätehierarchie bis zum verschlüsselten Datenträger verfolgen. Ein ext4-Ergebnis beweist weder vorhandene noch fehlende Verschlüsselung darunter. Bei bekannten aktiven dm-crypt-Geräten deren cryptsetup status lesend prüfen; keine Schlüssel ausgeben. Auch Swap, Ruhezustandsdateien, VM-Speicherabbilder und Absturzabbilder berücksichtigen. Diese Sitzung prüft diese Eigenschaften nicht auf dem Laptop.

Prüfpunkt: qemu:///system erreichbar, Hardwarevirtualisierung nutzbar, keine Überschneidung der geplanten Netze, Speicherort mit ausreichend Platz bekannt. Ein fehlender Zugriff auf /dev/kvm beim normalen Nutzer ist allein noch kein Beweis, dass systemverwaltete libvirt-VMs nicht funktionieren. Entscheidend ist auch der Zugriff des tatsächlichen QEMU-Dienstkontos.

Bei Fehlern zuerst die konkrete Ursache beheben. Keine pauschale Freigabe mit chmod 666 /dev/kvm, keine ungezielte Änderung der Host-Firewall.

3. Projektverzeichnis und Ressourcen anlegen

Auf dem Laptop ein eigenes Git-Projekt recovery-lab mit diesen Unterverzeichnissen anlegen:

Pfad

Inhalt

infra/

Netzwerk-/VM-Definitionen, cloud-init-Vorlagen

ansible/

Inventar, Rollen, Aufbau- und Restore-Playbooks

scripts/

Start, Stop, Backup, Wiederherstellung, Abnahme

tests/

Verbindungs-, Rechte- und Datenprüfungen

docu_workprogress/

Entscheidungen, Änderungen, Fehler und Nachweise

evidence/

lokal erzeugte Rohprotokolle, nicht ungeprüft veröffentlichen

Geheimnisse außerhalb des Projekts unter ~/.config/recovery-lab/ mit Verzeichnisrechten 0700 speichern. Die archivierte Geheimnisfassung zusätzlich verschlüsseln, beispielsweise mit Ansible Vault; das Entschlüsselungskennwort getrennt halten. Entschlüsselte Laufzeitdateien bleiben nur dort, wo sie benötigt werden, mit engsten Rechten. Images und virtuelle Platten in einem expliziten libvirt-Speicherbereich ablegen. Images, private Schlüssel, Token, Datenbankexporte und Rohprotokolle nicht in Git aufnehmen. Vault schützt abgelegte Dateien, nicht automatisch entschlüsselte Werte während einer Ausführung. Quelle: Ansible Vault

Verschlüsselung gespeicherter Daten vor der ersten Geheimniserzeugung

Für den Anspruch „Schutz bei Verlust der ausgeschalteten Hardware“ müssen Hostspeicher für sämtliche Gäste, Geheimnisse, Zwischenkopien und Speicherabbilder sowie persistenter Swap nachweislich verschlüsselt sein. Bevorzugt bereits vorhandene, geprüfte Host-Datenträgerverschlüsselung verwenden. Ist diese nicht vorhanden, eine neue verschlüsselte Lab-Ablage samt Schlüssel- und Speicherverwaltung planen; eine vorhandene Systemplatte nicht anhand dieser Anleitung nachträglich umformatieren oder ungesichert umstellen. Ein verschlüsselter Imageordner allein schützt keine außerhalb abgelegten Secrets oder ausgelagerten RAM-Inhalte.

LUKS2/dm-crypt ist ein geeigneter Linux-Baustein für Blockgeräteverschlüsselung. Das Entsperrgeheimnis darf bei passphrasebasierter Absicherung nicht einfach auf demselben unverschlüsselten Datenträger liegen. Datenträgerverschlüsselung schützt gesperrte Daten; übliche Konfigurationen ersetzen weder authentisierte Backups noch Schutz gegen Manipulation des Startsystems. Wiederherstellungszugang und gegebenenfalls LUKS-Header-Sicherung geschützt und getrennt verfügbar halten. Quelle: Linux dm-crypt

Im kleinen Lab ist zusätzliche Verschlüsselung jeder einzelnen Gastplatte optional, sofern die darunterliegende Hostablage tatsächlich geschützt ist. Sie schützt nicht vor dem laufenden, privilegierten Virtualisierungshost. Der manuelle Entsperrschritt am Host ist mit automatischem Wiederanlauf innerhalb einer bereits entsperrten Lab-Sitzung vereinbar; ein unbeaufsichtigter Kaltstart ist ein anderes Ziel.

Fehlt der Nachweis eines geschützten Speicherpfads, lautet der Status ausdrücklich „Sicherungsrepository verschlüsselt; übriger Schutz ruhender Daten nicht nachgewiesen“. Reale Zugangsdaten und produktive Daten gehören weiterhin nicht ins Lab; auch Lab-Schlüssel sind trotzdem schützenswert.

Planungswerte für virtuelle Platten: gateway 6 GiB, ops-System 12 GiB, services 12 GiB, client 6 GiB, ops-Backupplatte 16 GiB. Das sind 52 GiB virtuelle Kapazität plus Basisimage, Austauschplatte und temporäre Daten. Dünn provisionierte Platten können bis zur Kapazität wachsen. Freien Hostspeicher und tatsächliche Belegung getrennt überwachen. Unter 20 GiB freiem Hostspeicher neue Ausfallversuche aussetzen; das ist eine selbst gewählte Betriebsgrenze.

Vorher die virtuelle Mindestgröße des gewählten Images prüfen: Keine Gastplatte kleiner als das Image planen und keine Partition durch Verkleinern beschädigen. Pro Austausch kann die aufbewahrte alte Systemplatte weitere 12 GiB beanspruchen. Zusätzliche Basisimages, Paketarchive, Zwischenkopien, Metriken und Restic-Bereinigung benötigen ebenfalls Platz. 40–60 GiB tatsächliche Belegung sind deshalb ein Zielbereich, keine garantierte Obergrenze. Vor jedem Lauf Platz auf Host, services, ops-System und Backupplatte prüfen; für das Lab synthetische Nutzdaten zunächst auf höchstens 100 MiB begrenzen. Keine neuen Durchläufe starten, wenn die erwartete Spitzenbelegung samt Reserve nicht passt.

4. Adressplan festlegen

Diese Adressen sind ein Vorschlag, erst nach Überschneidungsprüfung verwenden:

Zone

Netz

Gateway

Teilnehmer

Management

10.77.10.0/24

10.77.10.1

ops .10, Host .254

Services

10.77.20.0/24

10.77.20.1

services .10

Client

10.77.30.0/24

10.77.30.1

client .10

Update

nach Bestandsaufnahme

libvirt-NAT

ausschließlich gateway

services und client erhalten jeweils nur eine Netzwerkkarte. Kein zusätzliches Managementinterface: Es würde einen zweiten Pfad schaffen. gateway besitzt drei interne Interfaces und ein Updateinterface. Feste MAC-Adressen und daran gebundene Gastnamen wie mgmt0, svc0, cli0, wan0 vermeiden vertauschte Regeln.

ops erhält ebenfalls nur sein Managementinterface. Alle drei normalen Gäste verwenden die jeweilige .1 als Standardgateway; der Laptop verwendet weiterhin seine vorhandene Standardroute. gateway bekommt genau eine externe Standardroute über das Updateinterface. In den drei internen Zonen findet keine Adressübersetzung statt. Das Updatenetz mit Gateway-, Host- und Gastadresse ebenfalls vollständig im Inventar festhalten; möglichst statisch konfigurieren, um zusätzliche DHCP-Ausnahmen zu vermeiden.

Als Dienstnamen git.recovery.test verwenden. Im ersten Stand auf ops und client statisch auf 10.77.20.10 auflösen. Damit funktioniert der Wiederanlauf auch ohne externe DNS-Auflösung. DNS-Weiterleitung für Paketquellen bleibt eine getrennte Gateway-Aufgabe.

5. Netze und Hostgrenze vorbereiten

Beispiel für das Servicenetz in infra/rl-services.xml:

<network>
<name>rl-services</name>
<bridge name='virbr-rls' stp='on' delay='0'/>
</network>

Für rl-client entsprechend virbr-rlc. Diese beiden Netze erhalten weder <forward> noch eine Host-IP. Das Managementnetz rl-mgmt verwendet virbr-rlm, ebenfalls ohne <forward>, aber mit <ip address='10.77.10.254' netmask='255.255.255.0'/>. Kein DHCP erforderlich; die Gäste verwenden statische Konfiguration.

Libvirt dokumentiert sowohl isolierte Netze mit Hostzugriff als auch Netze ohne Hostadresse. Daraus folgt: „isoliert“ ist allein noch keine ausreichende Hostschutzregel. Quelle: libvirt

Vor Anschluss laufender Gäste: Die vorhandene Host-Firewall um eng begrenzte Regeln für alle vier Lab-Bridges einschließlich des Updatenetzes ergänzen. Neue eingehende Verbindungen aus dem Lab zum Host sperren; Antworten auf vom Host aufgebaute Managementverbindungen erlauben. Direkte IP-Weiterleitung aus den drei internen Bridges durch den Host ins LAN und zwischen den internen Bridges sperren. Nur die ausdrücklich geregelte NAT-Weiterleitung des Updatenetzes bleibt möglich. L2-Weiterleitung zwischen Gästen innerhalb der jeweiligen Bridge muss funktionieren. Für diesen ersten IPv4-Aufbau IPv6 auf allen Lab-Gastinterfaces und Lab-Bridges gezielt deaktivieren und überprüfen; IPv6 auf den übrigen Hostinterfaces unverändert lassen. Auch nach einem Neustart dürfen keine unerwarteten Link-Local-Adressen oder IPv6-Pfade bestehen.

Hostregeln nicht ausschließlich nach angeblichen Quell-IP-Adressen filtern. Zugehörige Bridges/TAP-Interfaces und tatsächliche Paketpfade prüfen. nftables-inet-Routingregeln und bridge-Filterung sind verschiedene Ebenen; vorhandenes br_netfilter kann den Pfad zusätzlich beeinflussen. Negative Tests müssen sowohl Hostzugriff als auch unerlaubte Weiterleitung erfassen. Keine ungeprüfte globale Drop-Regel verwenden, die den erlaubten Verkehr über die virtuelle Gateway-VM gleich mit unterbindet.

Kein allgemeines flush ruleset auf dem Laptop verwenden. Eine passende konkrete Hostregeldatei lässt sich erst aus dem vorhandenen Regelsatz und dessen Verwaltung ableiten. Vorher Regeln sichern, Rücknahme vorbereiten, danach bestehenden Internet-/VPN-Zugang prüfen. Hier liegt der erste bewusst hostabhängige Umsetzungspunkt.

Anschließend jeweils definieren und starten, beispielsweise:

virsh -c qemu:///system net-define infra/rl-services.xml
virsh -c qemu:///system net-start rl-services

Für den Updatepfad ein eigenes benanntes NAT-Netz verwenden; kein bestehendes Netz verändern. Sowohl am Gateway als auch an der Hostgrenze des Updatenetzes Hostadressen, Heimnetz, VPN-Ziele und andere interne/spezielle Zielbereiche sperren. Vor jeder Freigabe aktuelle Routen prüfen: Ein VPN kann auch öffentliche Zielbereiche intern routen. Einen bekannten öffentlichen DNS-Resolver verwenden, keine DNS-Ausnahme zum Laptop einführen. Externe DNS- und NTP-Abfragen nur vom Gateway und nur im Wartungsfenster erlauben. Im geschlossenen Zustand auch dessen DNS-Weiterleitung nach außen unterbinden. Zeitlich begrenzt TCP 80/443 zu öffentlichen Zielen erlauben; dies ist eine Portfreigabe und noch keine strikte Paketquellenfreigabe. Die Einschränkung offen dokumentieren. Für eine echte Quellenbeschränkung später einen Paketproxy mit Zielregeln einsetzen.

6. Basisimage prüfen und vier VMs erzeugen

Ein festes Debian-Cloud-Image für amd64 auswählen; keine veränderliche latest-Adresse als einzige Referenz dokumentieren. URL, Dateiname, Buildkennung, Abrufzeit und SHA-512 in einem Manifest festhalten. Mit einer veröffentlichten Prüfsumme vergleichen. Ist eine signierte Prüfsummenliste verfügbar, zusätzlich deren Signatur und Schlüsselfingerabdruck über einen unabhängigen offiziellen Vertrauensweg prüfen. Eine selbst berechnete Prüfsumme belegt keine Herkunft. Debians allgemeine Verifikationsanleitung beschreibt Prüfsummen und Signaturen; ihre Verfügbarkeit muss beim konkreten Cloud-Artefakt separat geprüft werden. Quelle: Debian

Für jede VM ein eigenes beschreibbares qcow2-Laufwerk erzeugen. Bei Basisimage-Abhängigkeiten das unveränderte Basisimage aufbewahren und dessen Pfad dokumentieren. RAM/vCPU wie im Konzept: 1024/1, 2048/2, 2048/2, 1024/1.

cloud-init je VM vorbereiten: eindeutige instance-id, Hostname, statische Netzkonfiguration, öffentlicher Administrationsschlüssel, keine SSH-Passwortanmeldung, kein SSH-Rootlogin. Für die frische Wiederherstellungs-VM eine neue instance-id verwenden. Keine privaten Schlüssel im Seed ablegen. Bei einem NoCloud-Seed auf einem lokalen Datenträger die Dateien user-data, meta-data und network-config sowie die erforderliche Datenträgerkennung korrekt anlegen. Netzkonfiguration getrennt von user-data übergeben. Netzwerkformat und unterstützten Renderer gegen das Image prüfen; Netzversion 2 ist nicht auf jedem Image mit beliebigem Renderer austauschbar. Quellen: NoCloud, Netzkonfiguration

VMs ausschließlich mit den vorgesehenen Lab-Netzen importieren. Erst gateway, dann ops, services und client starten. Das Gateway-Updateinterface bleibt zunächst auf Link-down. Über seinen direkt vom Host erreichbaren Management-SSH-Zugang die Grundregeln einspielen. Fehlen nftables oder dessen Abhängigkeiten im Image, müssen sie vorab aus verifizierten Paketen samt Abhängigkeiten offline bereitgestellt werden; dafür nicht vorübergehend ein ungefiltertes Netz öffnen. Erst nach aktiven Regeln Updateinterface einschalten und ein begrenztes Wartungsfenster öffnen. Danach ops bereitstellen und die übrigen Gäste über ops erreichen.

Rückweg konkret testen: Eine serielle Konsole allein ermöglicht bei gesperrten Konten noch keine Anmeldung. Entweder ein gesondertes, starkes lokales Notfallkennwort mit weiterhin abgeschalteter SSH-Passwort- und Tastaturinteraktiv-Anmeldung einrichten oder einen geprüften Offline-Reparaturweg für die ausgeschaltete VM dokumentieren. Bei letzterem die virtuelle Platte niemals gleichzeitig vom Gast und Reparaturwerkzeug beschreiben. Konsolenausgabe beziehungsweise Offline-Auslesen auch zur vertrauenswürdigen Erstprüfung der SSH-Hostschlüssel nutzen. Kein StrictHostKeyChecking=no.

Prüfpunkt: Auf jedem Gast cloud-init status --wait, ip -br address, ip route, ss -lntup prüfen. Warnungen und Exitcodes von cloud-init untersuchen. virsh -c qemu:///system domiflist rl-services muss genau das Serviceinterface zeigen. Analog client prüfen. Kein unbeabsichtigtes Interface am libvirt-Standardnetz. VM-Namen und Netzwerknamen in getrennten Inventarfeldern führen, auch wenn beide denselben Präfix tragen.

7. Gateway und Verbindungsregeln umsetzen

Zonenübergreifendes Routing ausschließlich durch die Gateway-VM erlauben. Der Host benötigt für libvirt-NAT gegebenenfalls selbst IPv4-Weiterleitung; daher dessen globale Weiterleitung nicht pauschal abschalten. Die Trennung entsteht durch die interfacebezogenen Regeln. Auf ops, services und client IP-Weiterleitung deaktiviert lassen.

Auf gateway input, forward und auch den selbst erzeugten externen Verkehr in output begrenzen; Loopback und notwendige interne Antworten berücksichtigen. Quellnetz und Eingangsinterface zusammen prüfen, ungültige Pakete verwerfen. Der erlaubte NAT-Pfad lautet Gast → Gateway-Masquerading → libvirt-NAT → freigegebene Hostschnittstelle. Keine Adressübersetzung zwischen den drei Zonen.

Quelle

Ziel

Erlaubnis im Regelbetrieb

client

services

TCP 443

ops

gateway, services, client

TCP 22, TCP 9100 nach Einrichtung

ops

services

TCP 443 für HTTPS-Prüfung

ops

client

TCP 9115 für den dortigen Blackbox Exporter

Lab-Gäste

eigenes Gateway

DNS UDP/TCP 53; NTP UDP 123

Host .254

ops und gateway

TCP 22, nur Verwaltungszugang

gateway

festgelegte externe Resolver/Zeitserver

DNS UDP/TCP 53 und NTP UDP 123, nur im Wartungsfenster

client/services

ops und Host

keine neuen Verbindungen

client

PostgreSQL

gesperrt

Lab

externe Ziele

im Regelbetrieb gesperrt

Host → ops und gateway erfolgt im Managementnetz und durchläuft nicht zwingend die Gateway-Forwardkette. Diese Zugriffe mit Gast-Firewalls begrenzen. Der Host kann über ops als SSH-Sprungrechner verwalten; keine allgemeine Hostroute ins Servicenetz nötig.

Der SSH-Sprungzugang benötigt auf ops gezielt erlaubte lokale TCP-Weiterleitung zu services:22 und client:22. Ebenso müssen Tunnel zu den lokalen Monitoringports ausdrücklich erlaubt sein. Das Verbot sämtlicher SSH-Weiterleitung würde beide Funktionen verhindern. Getrennte Benutzer/Schlüssel für Sprungzugang, Automatisierung und Backup verwenden; PermitOpen auf erforderliche Ziele beschränken, Agentweiterleitung abgeschaltet lassen. Restriktionen von SSH-Weiterleitung sind keine belastbare Grenze gegenüber einem Benutzer mit beliebiger Shell oder sudo-Rechten. Quelle: OpenSSH

Gast-Firewalls spiegeln die erlaubten Dienste. PostgreSQL und Giteas interner HTTP-Port nur an Loopback binden. Monitoringoberflächen auf ops nur lokal erreichbar machen und vom Host über SSH-Tunnel öffnen. ICMP für notwendige Fehlermeldungen und bewusst erlaubte Diagnosen berücksichtigen.

Updatefenster mit Ablaufzeit bauen: Freigabe muss auch nach Abbruch der aufrufenden Sitzung automatisch enden; nach Neustart ist sie geschlossen. Die zeitabhängige Sperre muss für beide Richtungen am Updateinterface vor einer allgemeinen Annahme etablierter Verbindungen greifen, auch in input/output für Gatewayverkehr. Allein das Entfernen einer Freigabe für neue Verbindungen oder einer NAT-Regel beendet bestehende Conntrack-Verbindungen nicht zuverlässig. Alte externe Verbindungszustände beim Schließen ausschließlich auf dem Gateway gezielt entfernen oder anderweitig sicher vom nächsten Fenster ausschließen. Keine gesamte Host-Conntrack-Tabelle leeren. Abnahme: einen laufenden Download, neue TCP-Verbindungen und eine externe DNS-Abfrage über die Schließung hinweg testen. Quelle: nftables-Verbindungsverfolgung

Zeitabgleich vollständig vorsehen: etwa chrony auf gateway als Zeitdienst für die Lab-Gäste, mit festen externen Quellen nur im Wartungsfenster. Außerhalb davon läuft die lokale Uhr weiter; keinen dauernden Internetzugang dafür öffnen. Vor TLS- und Zeitmessungen Synchronisationszustand, Uhrabweichung und Zeitpunkt des letzten Abgleichs prüfen. Ein nicht synchronisierter Gateway darf nicht als zuverlässige Zeitquelle ausgegeben werden. Quelle: chrony

8. Ansible und Dienste aufbauen

Ansible zunächst vom Host aus für die Erstbereitstellung verwenden. Dasselbe Projekt anschließend auf ops übertragen. Host und ops verwenden getrennte Inventare und gegebenenfalls SSH-Sprungpfade. VM-Erzeugung bleibt beim Host; ops erhält keinen libvirt-Verwaltungszugang zum Laptop.

Voraussetzungen festhalten: Python auf verwalteten Gästen, getestete Ansible-/Collection-Versionen, benötigte PostgreSQL-Pythonbibliothek und sudo-Regeln. Das Projekt muss auf dem Host unabhängig von der eigenen Gitea-Instanz verfügbar sein; sonst entsteht beim Restore eine Abhängigkeit vom ausgefallenen Dienst. Private SSH-Schlüssel nie in Gäste kopieren, die sie nicht benötigen, und keine gemeinsamen Administrationsschlüssel für Host und ops einsetzen. Geheimnisdateien 0600, in Ansible betroffene Aufgaben ohne Geheimnisausgabe und ohne vertrauliche Diff-Ausgabe ausführen. Idempotenznachweis ohne gleichzeitig laufende Updates oder Sicherungsjobs durchführen.

Rollen in dieser Reihenfolge entwickeln: base, gateway, postgresql, gitea, tls_nginx, monitoring, backup. Exakte Paket-/Programmstände protokollieren. Für einen späteren Neuaufbau auch Artefakte vorhalten; ein Versionsmanifest allein stellt gelöschte Downloadangebote nicht wieder her.

Basis: Benutzer, SSH, Zeitabgleich, benötigte Pakete, Journald-Größenlimit.

PostgreSQL: dedizierte Rolle und Datenbank gitea, ohne SUPERUSER, CREATEDB, CREATEROLE oder REPLICATION. TCP nur auf 127.0.0.1, Zugang in pg_hba.conf nur für benötigte Datenbank/Rolle mit scram-sha-256; kein trust. Lokalen administrativen Unix-Socketzugang getrennt regeln. Wirksame Reihenfolge der Regeln prüfen. Für diesen rein lokalen TCP-Pfad wird kein zusätzlicher TLS-Schutz behauptet. Quellen: PostgreSQL Zugangsregeln, Kennwortauthentisierung

Gitea: verifiziertes festes Release, eigener Systembenutzer git, feste UID/GID, Arbeitsverzeichnis /var/lib/gitea, Konfiguration /etc/gitea/app.ini. HTTP nur 127.0.0.1:3000, öffentliche Basisadresse https://git.recovery.test/. Registrierung schließen, Git über SSH und Actions zunächst deaktivieren.

TLS/Nginx: private Web-Labor-CA auf dem Host; CA-Schlüssel passphrasegeschützt und nur zum Ausstellen entsperren. Serverzertifikat mit SAN git.recovery.test, privater Serverschlüssel auf services und im geschützten Sicherungssatz. Nginx lauscht auf 443 und leitet an Loopback weiter. Laborvertrauen auf client installieren; weitere prüfende Programme auf ops nutzen eine ausdrücklich angegebene CA-Datei. Den Host nicht pauschal um die Labor-CA erweitern. Nie TLS-Prüfung abschalten. CA-Schlüssel nicht nach ops/services kopieren und nicht in deren automatischen Sicherungssatz aufnehmen.

Testnutzer: Eigentümer, Leser, unberechtigter Nutzer. Ein privates synthetisches Repository mit mindestens zwei Commits anlegen.

Nginx muss Host und X-Forwarded-Proto korrekt setzen und den URI unverändert weitergeben. Uploadgrenze und Zeitüberschreitungen passend zum kleinen Testdatensatz wählen; Git-Push zusätzlich zur Webseite testen. Keine Standard-Willkommensseite oder statische Ersatzseite darf für die geprüfte Gitea-Adresse einen scheinbaren Erfolg liefern. Quelle: Gitea Reverse Proxy

TLS ausdrücklich auf 1.2 und 1.3 begrenzen (ssl_protocols TLSv1.2 TLSv1.3;). Bei TLS 1.2 nur geeignete ECDHE-/AEAD-Verfahren für die eingesetzte Nginx-/OpenSSL-Version zulassen; keine unüberprüften alten Cipherlisten übernehmen. TLS-1.3-Verfahren werden nicht durch dieselbe ssl_ciphers-Liste geregelt. Serverzertifikat mit Serverauthentisierungszweck und CA ausstellen, CA-Zertifikat mit passenden CA-Berechtigungen. Eindeutige Seriennummern, Aussteller, Fingerabdrücke, Laufzeiten und Erneuerung dokumentieren. Für dieses Lab beispielsweise 90 Tage Serverlaufzeit und Warnung 14 Tage vor Ablauf als eigene Betriebswerte wählen. Quelle: Nginx TLS

Schlüsselrechte an den tatsächlichen Dienstbenutzer anpassen: bei üblichem Nginx-Start mit root-Master Serverkey root 0600; bei einem unprivilegierten Dienst nur dessen Benutzer/Gruppe gezielt zulassen. Gitea braucht den TLS-Privatschlüssel nicht zu lesen. Keine allgemeine Lesbarkeit zur Fehlerbehebung einschalten. Zwischen Nginx und Gitea bleibt HTTP auf 127.0.0.1:3000 bewusst unverschlüsselt; ebenso kann der Datenbankverkehr innerhalb derselben VM unverschlüsselt sein. Diese Ausnahme ist eine Vertrauensgrenze derselben VM und keine Ende-zu-Ende-Verschlüsselung bis in die Datenbank.

Nach abgeschlossener Einrichtung Installationsdialog sperren. Gitea-Geheimnisse wie SECRET_KEY und INTERNAL_TOKEN stabil halten, nicht bei jedem Ansible-Lauf neu erzeugen. Ihre maßgebliche Fassung kommt beim Restore aus dem Sicherungssatz; neue Erstinstallationswerte dürfen sie nicht überschreiben. Aktionen, Spiegelungen, Paketspeicher und LFS entweder bewusst deaktivieren oder ausdrücklich in Sicherungsumfang und Tests aufnehmen. Quelle: Gitea Konfiguration

Playbooks mit Syntaxprüfung, dann real ausführen. Den zweiten realen Lauf protokollieren. Einen verwalteten Konfigurationswert gezielt verändern und zeigen, dass der nächste Lauf ihn korrigiert. --check allein beweist weder erfolgreichen Aufbau noch Idempotenz. Keine pauschalen changed_when: false, die Änderungen lediglich verstecken. Quelle: Ansible

9. Überwachung aus Nutzersicht

Auf ops Prometheus und Alertmanager installieren; Node Exporter auf den Gästen. Zusätzlich Blackbox Exporter auf client einsetzen: Ein HTTPS-Test von ops allein beweist nicht, dass der Clientpfad funktioniert. Den Exporter auf TCP 9115 nur für ops freigeben. Ein festes Ziel im Prometheus-Inventar ist keine Zugriffsbeschränkung des /probe-Endpunkts. Für den unprivilegierten Exporterprozess ausgehenden Verkehr auf services:443, notwendige Namensauflösung und Antwortverkehr begrenzen; auch Loopbackzugriffe berücksichtigen. Das ist als Host-/Dienstregel umzusetzen, keine hier vorausgesetzte Blackbox-Option für eine Zielliste.

Verschlüsselungsergänzung: In Fassung 2 war dieser Abrufpfad nicht kryptografisch abgesichert. In dieser Fassung wird der Verkehr zwischen ops und den Exportern über HTTPS mit gegenseitiger Zertifikatsprüfung (mTLS) vorgesehen. Ports 9100/9115 bleiben gleich. Dafür je Exporter einen eigenen Serverschlüssel und eine eigene Zertifikatsidentität nutzen, Prometheus erhält die zugehörigen Clientzertifikate. Eine eigene Monitoring-CA mit geschütztem Signierschlüssel auf dem Host trennt diese Vertrauensdomäne von der Web-CA. Keine CA-Privatschlüssel auf Gästen.

Bei Exportern mit passender Exporter-Toolkit-Unterstützung --web.config.file nutzen: Serverzertifikat/Key, client_auth_type: RequireAndVerifyClientCert, dedizierte client_ca_file und explizit zulässige Client-SANs konfigurieren. Zertifikatszwecke auf serverAuth beziehungsweise clientAuth beschränken. Prometheus muss scheme: https, richtige Serveridentität/SAN, CA, Clientzertifikat und Schlüssel verwenden. Die konkrete Paketversion muss diese Konfiguration unterstützen; ohne diesen Nachweis nicht still auf Klartext zurückfallen. Quelle: Exporter Toolkit

Zwei TLS-Verbindungen getrennt prüfen: Prometheus → Blackbox Exporter und Blackbox Exporter → Gitea. Das mTLS-Zertifikat von Prometheus gehört nur zur ersten Verbindung; es ist kein Gitea-Benutzernachweis. Lokale ops-Kommunikation und lokale Oberflächen dürfen auf Loopback bleiben. Hosttunnel nur an 127.0.0.1 binden, nicht an 0.0.0.0; Monitoring ist kein öffentliches Verwaltungsportal. Quelle: Prometheus-Sicherheitsmodell

Prometheus fragt dessen /probe mit Ziel https://git.recovery.test/ ab. Das Modul prüft HTTPS mit gültiger CA. Die Parameter __param_target, instance und __address__ nach dem offiziellen Mehrziel-Muster konfigurieren. Quelle: Prometheus

Modul explizit auf IPv4, erwarteten Status 200, fail_if_not_ssl: true, follow_redirects: false und tls_config.ca_file einstellen; insecure_skip_verify bleibt false. Dafür einen bei der ausgewählten Gitea-Konfiguration tatsächlich ohne Weiterleitung mit 200 antwortenden Anwendungspfad bestimmen und im Probe-Ziel eintragen. Mit angehaltenem Gitea muss genau dieser Test fehlschlagen. Eine erfolgreiche HTTPS-Seitenprüfung ersetzt noch keinen authentisierten Repositorytest. Quelle: Blackbox-Konfiguration

Beispiel einer selbst gewählten Alarmregel, bei Jobname gitea_https_client:

groups:
- name: recovery_lab
rules:
- alert: GiteaNichtErreichbar
expr: probe_success{job="gitea_https_client"} == 0
for: 60s
    labels:
    severity: critical
    annotations:
    summary: HTTPS-Test aus dem Clientnetz fehlgeschlagen
    
    Zusätzlich up == 0 für den Exporter und fehlende Messreihen überwachen. Sonst kann der Prüfer selbst ausfallen, ohne dass die obige Regel auslöst. Messintervall und Regelauswertung beispielsweise auf je 15 Sekunden setzen. „for: 60s“ bedeutet nicht exakt 60 Sekunden bis zur sichtbaren Meldung; Abfrage-, Auswertungs- und Benachrichtigungszeiten kommen hinzu. Prometheus muss Alertmanager als Ziel konfiguriert haben. Lokaler Empfänger ohne externe Nachricht genügt für diese Übung. Quelle: Prometheus Alerting
    
    Als weitere Regeln zum selben Job up{job="gitea_https_client"} == 0 und absent_over_time(probe_success{job="gitea_https_client"}[2m]) vorsehen. Das Beispiel gilt für genau ein erwartetes Ziel; bei mehreren Zielen deren Identitäten gesondert überwachen. Konfiguration und Regeln mit den Werkzeugen der installierten Version prüfen. Prometheus kann seinen eigenen vollständigen Ausfall nicht zuverlässig selbst melden: Der Host-Demonstrationsablauf muss ops/Prometheus zusätzlich prüfen. Aufgelöste Alarme durch aufgezeichnete Zustandswechsel nachweisen, nicht auf eine dauerhafte Alarmhistorie in Alertmanager vertrauen.
    
    Auf ops Prometheus-Aufbewahrung beispielsweise auf 3 Tage und 1 GiB begrenzen. Das Größenlimit ist keine feste Grenze für sämtliche Dateien; WAL und aktive Daten zusätzlich einplanen. Journald begrenzen, freien Platz und Inodes überwachen. Letzten erfolgreichen Sicherungszeitpunkt und fehlgeschlagene Backups ebenfalls als Betriebsnachweis erfassen. Quelle: Prometheus-Speicher
    
    10. Konsistentes Backup erstellen
    
    Zunächst einen Sicherungssatz manuell erzeugen; dann als Skript/Systemdienst und Ansible-Rolle abbilden. Gitea verlangt für eine konsistente Kombination aus Datenbank und Dateien einen Dienststopp. Für PostgreSQL einen nativen Dump verwenden. Quelle: Gitea
    
    Das ist eine Sicherung mit geplanter Dienstunterbrechung. Deren Dauer separat messen. Ein dabei ausgelöster Verfügbarkeitsalarm ist nicht automatisch ein Fehlalarm. Entweder als Wartungsereignis dokumentieren oder eine eng begrenzte, automatisch auslaufende Stummschaltung verwenden; für den eigentlichen Ausfallnachweis darf diese nicht mehr aktiv sein. Messdaten weiterhin erfassen.
    
    Reihenfolge auf services:
    
    Parallele Sicherung und Konfigurationsänderung verhindern; ein lokales flock schützt nur vor Prozessen, die dieselbe Sperre verwenden. Freien Platz prüfen. Neues nicht vorhandenes Zwischenverzeichnis mit Lauf-ID, umask 077 und Verzeichnisrechten 0700 anlegen. Datensatzgrenze und notwendige Kopien berücksichtigen.
    
    Gitea stoppen und Stillstand prüfen; PostgreSQL bleibt aktiv. Keine weiteren Git-Schreibzugänge oder Gitea-Hintergrundprozesse dürfen aktiv sein. Bei Fehlern den vorherigen Betriebszustand wiederherstellen; einen zuvor gestoppten Dienst nicht ungefragt starten. Ein Shell-trap allein schützt nicht gegen Stromausfall oder SIGKILL: Unterbrochene Läufe beim nächsten Start als fehlgeschlagen behandeln und deren Zwischenstände niemals als fertige Sicherung verwenden.
    
    Datenbank mit sudo -u postgres pg_dump -Fc gitea exportieren. Ausgabe als root in gitea.dump im Zwischenverzeichnis umleiten; Fehlerstatus und Warnungen prüfen. Dumpwerkzeug zur gewählten PostgreSQL-Version passend verwenden. Ein bloß vorhandenes oder nicht leeres Archiv ist noch kein Wiederherstellungsnachweis.
    
    /var/lib/gitea, /etc/gitea, Nginx-Konfiguration und TLS-Servermaterial mit Besitzern/Rechten sichern. Alle extern konfigurierten Datenpfade ausdrücklich ergänzen. Keine laufenden PostgreSQL-Datendateien kopieren.
    
    Versionsmanifest, Lauf-ID, Sicherungszeitpunkt und SHA-256-Prüfsummen der erzeugten Sicherungsdateien beilegen. Den abgeschlossenen Satz innerhalb desselben Dateisystems atomar in einen eindeutig benannten Bereitbereich umbenennen; er wird danach nicht mehr verändert. Gitea entsprechend seinem vorherigen Zustand wieder starten und HTTPS prüfen. Sicherungsergebnis und Neustartergebnis getrennt protokollieren: Eine gute Sicherung macht einen fehlgeschlagenen Dienststart nicht erfolgreich.
    
    ops ruft genau diese Lauf-ID ab. Ein eigener SSH-Schlüssel mit erzwungenem Exportkommando, ohne interaktive Sitzung, Portweiterleitung und Agentweiterleitung, begrenzt den Zugriff. Der root-eigene Exporthelfer darf nur abgeschlossene Sätze lesen; Eingaben nicht als Shelltext ausführen. Rechtekonzept konkret umsetzen: Ein reiner Exportbenutzer kann nicht automatisch ein root-exklusives 0700-Verzeichnis lesen. Entweder nur kontrollierten Helfer per eng begrenztem sudo erlauben oder den fertigen Satz gezielt lesbar bereitstellen. Normales SCP/SFTP ist mit einem beliebigen erzwungenen Exportkommando nicht automatisch kompatibel; festes Exportprotokoll implementieren und prüfen. Ein nologin-Shellpfad darf den gewählten Helferaufruf nicht versehentlich verhindern.
    
    Auf ops zuerst unter einer neuen Lauf-ID in einen begrenzten, für unprivilegierte Gäste nicht beschreibbaren Bereich empfangen, Dateiliste und Prüfsummen prüfen. Archivdateien dort als Dateien sichern, nicht als root entpacken. services darf niemals Zielpfade oder Shellbefehle auf ops bestimmen. Größe, Dauer und maximalen Platzverbrauch begrenzen, damit ein fehlerhafter Export nicht die Verwaltung füllt. Der Restic-Eingabepfad /srv/backup-staging/ready enthält genau einen vollständigen Lauf und bleibt während der Sicherung unverändert; keine Vermischung mit älteren Dateien. Gemeinsame Sperre für Übernahme und Restic-Lauf vorsehen. Beim späteren Entpacken in der Wiederherstellungsumgebung zusätzlich Pfadausbrüche, Symlink-/Hardlink-Ausbrüche, Gerätedateien und unerwartete privilegierte Dateiattribute verhindern; dazu einen geprüften Extraktionsweg verwenden, keinen selbst improvisierten Archivprüfer.
    
    Zwischenkopien enthalten Datenbankkennwörter, Gitea-Geheimnisse und TLS-Schlüssel im Klartext. 0700/0600 begrenzen den Zugriff, verschlüsseln aber keine Datenträger. Nach bestätigter Übernahme und geprüfter Sicherung die nicht mehr benötigten Zwischenkopien begrenzt aufräumen; bei Fehlern keinen letzten brauchbaren Satz entfernen. Löschen auf SSD/qcow2 ist keine zugesicherte sichere Datenvernichtung.
    
    Die Zwischen-, Restore- und temporären Arbeitsverzeichnisse müssen deshalb den verschlüsselten Speicherpfaden aus Schritt 3 zugeordnet werden. Unbeabsichtigte Kopien unter /tmp, Editor-Sicherungen, Shellhistorie, Debugausgaben, cloud-init-Protokolle und Prozessabbilder in die Kontrolle aufnehmen. Kein set -x in geheimnisverarbeitenden Skripten. Übertragungen ausschließlich über SSH mit geprüfter Gegenstellenidentität; IP-Freigaben allein authentisieren die Gegenstelle nicht.
    
    pg_dump sichert keine globalen Rollen. Deshalb Rolle, Kennwort und Datenbankeigenschaften aus geschützter Konfiguration reproduzieren; den gewählten Weg im Restoreverfahren festhalten. Quelle: PostgreSQL pg_dump
    
    Auf ops: separate Datenplatte nach UUID unter /srv/restic einhängen. Backupdienst mit Mount-Abhängigkeit und Prüfung der erwarteten UUID versehen; bei fehlendem Datenträger abbrechen, statt unbemerkt die Systemplatte zu beschreiben. Repository unter /srv/restic/repo einmalig initialisieren. Quelle: Restic Repository
    
    Einmalig auf ops als root, erst nach überprüfter Einhängung der richtigen leeren Backupplatte und angelegter Kennwortdatei: restic -r /srv/restic/repo --password-file /root/.config/recovery-lab/restic-password init. Ein bereits vorhandenes Repository wird nicht initialisiert.
    
    Das Restic-Kennwort einmalig mit einem kryptografisch sicheren Generator erzeugen, etwa mindestens 32 zufällige Bytes als Base64 darstellen, und nie aus Projektname/Datum ableiten. Nicht als Befehlsargument oder in ausgegebenen Umgebungsvariablen ablegen. Eine 0600-Kennwortdatei auf ops erlaubt unbeaufsichtigte Sicherungen, ist aber ein bewusstes Laufzeitgeheimnis: root auf ops kann damit die Sicherungen lesen. Ihre Speicherung setzt den Schutz der ops-Systemplatte voraus. Eine unabhängig entschlüsselbare Notfallkopie außerhalb von ops vorhalten; sie darf nicht ausschließlich im mit sich selbst verschlüsselten Repository liegen.
    
    Restic verschlüsselt und authentisiert Sicherungsinhalte; das ist keine Unveränderlichkeit und kein Nachweis gutartiger Quelldaten. Mehrere Repositorykennwörter schützen denselben Repository-Hauptschlüssel und sind keine getrennten Schreib-/Leserollen. Nach möglichem Schlüsselabfluss genügt key passwd nicht: ein neues Repository mit neuem Hauptschlüssel auf vertrauenswürdigem System anlegen und nur geprüfte Daten neu sichern beziehungsweise kontrolliert übertragen. Bereits entwendete Daten werden dadurch nicht wieder geheim. Quelle: Restic-Design und Bedrohungsmodell
    
    Beispiel für den anschließenden Sicherungslauf als Bash-Skript auf ops mit root-Rechten. Vorbedingungen: Mount/UUID, Sperre, freier Platz und Vollständigkeit des Bereitbereichs wurden geprüft. Das Fragment ersetzt diese Prüfungen nicht:
    
    set -euo pipefail
    umask 077
    export RESTIC_REPOSITORY=/srv/restic/repo
    export RESTIC_PASSWORD_FILE=/root/.config/recovery-lab/restic-password
    restic backup /srv/backup-staging/ready --host rl-services --tag gitea
    restic snapshots --host rl-services --tag gitea
    restic check --read-data
    
    Jeder Fehlerstatus verhindert die Erfolgsmeldung, auch eine nur teilweise erfolgreiche Sicherung. Vollständige Snapshot-ID aus genau diesem erfolgreichen Lauf erfassen, zusammen mit Lauf-ID und Quellmanifest; nicht später unkontrolliert latest auswählen. Die Vollprüfung liest die gesicherten Daten. Sie beweist noch keine verwendbare Anwendung. Quellen: Restic Backup, Repositoryprüfung
    
    Im ersten Stand nichts automatisch löschen. Nach bestandenem Restore drei geprüfte Sicherungssätze als Aufbewahrungsziel wählen und den für die Vorführung gewählten Snapshot zusätzlich schützen. Restic gruppiert Aufbewahrungsregeln nach Host und Pfaden; die stabile logische Hostkennung und der stabile Eingabepfad sind deshalb absichtlich festgelegt. Ein teilweise erfolgreicher Lauf kann dennoch einen Snapshot hinterlassen; „letzte drei Snapshots“ bedeutet nicht „letzte drei geprüfte Sicherungen“. Erst die eigene Erfolgsliste prüfen, Löschplan mit --dry-run ansehen, dann gezielt bereinigen. Quelle: Restic Aufbewahrung
    
    11. Referenzdaten und echte Abnahme vorbereiten
    
    Die inhaltliche Referenz wird vor Schritt 10 vorbereitet: Auf client das private Repository als berechtigter Nutzer frisch klonen. Zugangsdaten über geschützte Anmeldedatenverwaltung übergeben, nicht in URLs oder Protokollen. Commit-ID mit git rev-parse HEAD und Testdateien mit sha256sum dokumentieren. Serverreferenzen vor und nach dem Restore mit derselben Methode erfassen, etwa git ls-remote --refs und sortierter Ausgabe; ein normaler Clone enthält nicht zwangsläufig dieselben lokalen Referenznamen wie das Serverrepository. Referenzwerte außerhalb von services, zusätzlich auf dem Host speichern. Danach Schreibzugriffe bis zur konsistenten Sicherung aussetzen und Referenz samt Lauf-ID in den Sicherungssatz aufnehmen.
    
    Prüfungen vor und nach dem Restore identisch ausführen:
    
    Prüfung
    
    Bestehen
    
    HTTPS
    
    definierter Anwendungspfad liefert erwarteten Status und Inhalt, keine unerwartete Weiterleitung
    
    Zertifikat
    
    richtiger Name, Gültigkeitszeitraum und CA; isolierter Test mit fremder CA scheitert ausdrücklich an Zertifikatsprüfung
    
    Berechtigter Leser
    
    nachgewiesen korrekt angemeldet; privates Repository klonbar, echter Schreibversuch abgewiesen
    
    Eigentümer
    
    nach Datenvergleich Clone und tatsächlicher neuer Test-Push erfolgreich
    
    Fremder Nutzer
    
    nachgewiesen korrekt angemeldet; Clone desselben privaten Repositorys wegen fehlender Rechte abgewiesen
    
    Datenintegrität
    
    Referenzen, Commit-ID und Dateihashes entsprechen Referenz
    
    Hostschutz
    
    client/services erreichen keinen Hostdienst über Lab-, LAN- oder IPv6-Adresse
    
    Updatepfad
    
    geschlossen kein externer Zugriff; offen weiterhin kein Heimnetz-/VPN-Zugriff
    
    curl --fail allein ist zu schwach: HTTP-Weiterleitungen gelten damit nicht automatisch als Fehler. Erwarteten HTTP-Status ausdrücklich vergleichen, Antwortinhalt prüfen und maximale Verbindungs-/Gesamtzeit setzen. Der negative TLS-Test darf den systemweit auf client installierten Laboranker nicht unbeabsichtigt weiterverwenden; einen isolierten Vertrauensspeicher beziehungsweise einen gesonderten Zertifikatsprüfer mit ausschließlich fremder CA verwenden. TLS-Fehler, Timeout und Anwendungsablehnung getrennt bewerten.
    
    Bei Rechten zuerst die Identität nachweisen, beispielsweise über eine authentisierte Benutzerabfrage der gewählten Gitea-Version. Jeder Nutzer bekommt einen eigenen Anmeldedatenkontext ohne fremde zwischengespeicherte Zugangsdaten. Der Leser muss bei unverändert gültiger Anmeldung denselben neuen Branch/Commit zu schreiben versuchen, den der Eigentümer schreiben darf. „Everything up-to-date“, ungültiges Kennwort oder ein unpassend eingeschränktes Token beweisen keine Repository-Schreibsperre. Ein unberechtigter Repositoryaufruf kann absichtlich 404 statt 403 liefern; anhand Gegenprobe, Identität und Serverprotokoll bewerten.
    
    Den Datenvergleich zuerst ausführen, erst danach Schreibtests auf einem dafür vorgesehenen Branch. Sonst verändert der Test selbst die zu vergleichenden Referenzen. Zusätzlich git fsck --full im frischen vollständigen Clone prüfen; keine flachen Clones oder aus einem alten Clone kopierte Objekte verwenden. Gitea-Benutzerrechte und ein synthetischer Vorgang wie ein Issue mit bekanntem Text prüfen auch Datenbankinhalte, die Commit-IDs nicht abdecken.
    
    Firewallnachweis: nc -zvw3 10.77.20.10 5432 auf client darf keinen erfolgreichen Verbindungsaufbau zeigen. Weil PostgreSQL nur lokal lauscht, beweist dieses Ergebnis allein noch keinen Firewall-Drop. Gleichzeitig passenden Regelzähler und gegebenenfalls Paketmitschnitt am Gateway erfassen. Die gleichen Pakete müssen dort ankommen und an der erwarteten Sperrregel enden. Für einen gesonderten aktiven Porttest kann vorübergehend ein harmloser Listener auf einem eigenen Testport eingesetzt werden; anschließend entfernen.
    
    Ebenso Client → ops:22 prüfen. Gegenprobe von ops zu services:22 muss erfolgreich sein. Ein Timeout durch ausgeschaltete VMs ist kein Segmentierungsnachweis.
    
    12. Ausfall und Wiederherstellung messen
    
    Zuerst Dienstausfall separat üben: Gitea stoppen, Fehlprüfung und Alarm aufzeichnen, Gitea starten, Auflösung des Alarms nachweisen. Danach erst vollständigen Service-VM-Verlust simulieren.
    
    Geprüfte Snapshot-ID, Referenzwerte und Zugangsmaterial müssen vorhanden sein. Zunächst einen ungemessenen Probe-Restore nach den Schritten 4–9 durchführen, während die alte services-VM ausgeschaltet und ihre Platte geschützt ist. Damit werden keine zusätzliche dauerhaft laufende VM und keine parallele identische IP benötigt. Vor dem Löschversuch Originalzustand wiederherstellen und Referenz bestätigen. Restic-Prüfung allein genügt nicht als Probe-Restore.
    
    Zwei getrennte Messläufe planen: A – VM-Ausfall, Uhr unmittelbar vor dem Ausschalten starten; B – logischer Datenverlust, Uhr unmittelbar vor dem Löschen des synthetischen Repositorys über Gitea starten. Bei B muss die Anmeldung weiterhin funktionieren, nur der neue Clone des gelöschten Repositorys scheitern. Löschzeit und weitere Arbeit vor dem VM-Neuaufbau zählen mit. Bestehende lokale Clones sind kein Nachweis der Dienstverfügbarkeit. Eine gelöschte Einzelressource muss keinen allgemeinen HTTPS-Ausfallalarm auslösen; dafür wäre eine eigene authentisierte Repositoryprüfung nötig.
    
    Vor dem Neuaufbau services ausschalten, ausgeschalteten Zustand bestätigen und Autostart der alten VM deaktivieren. Die alte Platte nicht löschen, sondern getrennt aufbewahren und nicht für die Wiederherstellung verwenden. Einen geordneten VM-Stopp als solchen bezeichnen; er ist kein Nachweis eines abrupten Stromausfalls. Ein harter VM-Abbruch ist ein zusätzlicher, gesondert zu protokollierender Versuch.
    
    Aus sauberem Basisimage eine neue services-VM mit neuer instance-id und gleicher Dienst-IP aufbauen. Neue VM-UUID, eigene Schreibplatte und neue MAC-Adresse verwenden; Seed und Netzzuordnung passend erzeugen. Die alte VM bleibt aus. ARP-Nachbarzustände kontrollieren, gegebenenfalls nur den betroffenen Eintrag aktualisieren. Neue SSH-Hostschlüssel über den geprüften Konsolen-/Offlineweg abgleichen und nur den passenden Lab-Eintrag in known_hosts ersetzen; Hostschlüsselprüfung nicht abschalten.
    
    Gleiche Programmversionen, Benutzer-IDs, PostgreSQL-Rolle und eine leere Datenbank bereitstellen. Gitea bleibt gestoppt; eine Erstinitialisierung der neuen Datenbank durch Gitea verhindern.
    
    Auf ops dieselben RESTIC_REPOSITORY- und RESTIC_PASSWORD_FILE-Werte wie bei der Sicherung setzen. Die vollständige dokumentierte Snapshot-ID verwenden, auf Existenz und passenden Sicherungssatz prüfen. Mit umask 077 ein neues, leeres Ziel pro Lauf anlegen; dann restic restore "$SNAPSHOT_ID" --target "$RESTORE_DIR". Beide Variablen müssen vorher geprüft gesetzt sein. Für den gesicherten absoluten Pfad liegt der Satz typischerweise unter $RESTORE_DIR/srv/backup-staging/ready; tatsächliche Struktur mit Snapshotinhalt abgleichen. Prüfsummen und Lauf-ID kontrollieren. Bereits vorhandene Restoreziele nicht einfach weiterverwenden. Quelle: Restic Restore
    
    Sicherungssatz über ops-SSH auf die neue VM übertragen. Daten, Konfiguration, TLS-Material und Dateirechte wiederherstellen. Die leere Datenbank gitea muss der gleichnamigen Rolle gehören; Kodierung, Locale und gegebenenfalls benötigte Erweiterungen müssen zum Ausgangszustand passen. Dumpdatei auf der neuen services-VM in einem geschützten, für das Betriebssystemkonto postgres lesbaren Verzeichnis bereitstellen. Beispiel bei exakt diesem Pfad: sudo -u postgres pg_restore --exit-on-error --single-transaction --no-owner --role=gitea --dbname=gitea /var/lib/postgresql/recovery-lab/gitea.dump. Bei jedem Fehler abbrechen. Der Pfad ist Teil des Befehls; ohne ihn würde pg_restore von der Standardeingabe lesen. Quelle: PostgreSQL pg_restore
    
    Konfigurationen prüfen, PostgreSQL-Verbindung testen, dann Gitea und Nginx starten. Bei geänderten Installationspfaden Git-Hooks gemäß Gitea-Dokumentation erneuern. Für den vergleichbaren Betriebsfehlernachweis keine ungeplante Versionsänderung durchführen. Das rechtfertigt keinen Betrieb bekannter unsicherer Software: Den Ausgangsstand vor der Messreihe aktualisieren und einfrieren. Bei zwischenzeitlich relevanter Schwachstelle den alten Restorestand isoliert halten, kontrolliert aktualisieren und die Abweichung dokumentieren. TLS-Zertifikate nach dem Restore erneut auf Zeitgültigkeit und Vertrauensstatus prüfen; abgelaufene Zertifikate erneuern, nicht die Uhr oder Zertifikatsprüfung umgehen.
    
    Alle Abnahmetests vom client mit einem neuen Clone ausführen. Erst nach erfolgreichen Daten-, Rechte- und Funktionsprüfungen Endzeit erfassen. Zusätzlich eine Zeitmarke für wiederhergestellte Erreichbarkeit führen. Alarmauflösung gesondert protokollieren. Die alte Platte und ops-Zwischenkopien dürfen den Test nicht heimlich mit Daten versorgen; Herkunft aus der festgelegten Snapshot-ID protokollieren.
    
    Die Wiederanlaufzeit umfasst Ausfallauslösung, Entscheidung/Wartezeit, VM-Neuaufbau, Restore und Clientabnahme. Zusätzlich reine technische Restorezeit getrennt erfassen. Keine Uhr erst nach dem VM-Aufbau starten und das Ergebnis als gesamte Wiederanlaufzeit bezeichnen.
    
    Start und Ende mit derselben monotonen Uhr auf dem Host messen; unter Linux eignet sich beispielsweise CLOCK_BOOTTIME, das auch Suspend-Zeit mitzählt. Zusätzlich UTC-Zeitmarken für die Protokollzuordnung speichern. Den Host während vergleichbarer Läufe nicht schlafen legen oder neu starten; aufgetretene Pausen als Abweichung berichten. Schlägt ein Pflichtteil fehl, ist der Lauf fehlgeschlagen und erhält keine erfolgreiche Wiederanlaufzeit. Zielzeit und tatsächlich gemessene Zeit getrennt ausweisen.
    
    Mindestens drei Durchläufe sind eine eigene Empfehlung für vergleichbare Werte. Datensatzgröße, Paketdownloadbedarf, Warm-/Kaltstart, Hostlast und manuelle Eingriffe angeben. Median und Spannweite erst aus realen Messungen veröffentlichen. Erst danach ein realistisches Zeitziel festlegen.
    
    Zusätzlich Datenverlustfenster dokumentieren: Ein nach der Sicherung erzeugter Test-Commit darf beim Restore fehlen. Das ist erwarteter Verlust seit dem Sicherungspunkt und muss klar von einem fehlerhaften Restore unterschieden werden.
    
    Ein fehlender neuer Commit allein quantifiziert noch kein Zeitfenster. Zeitpunkt des konsistent eingefrorenen Sicherungsstands, Erzeugung des späteren Test-Commits und Ausfallzeit erfassen. Den Abstand zwischen Sicherungsstand und Ausfall als Alter des wiederhergestellten Stands berichten; verlorene synthetische Änderungen gesondert benennen. Erst daraus ein künftiges Sicherungsintervall und ein zulässiges Datenverlustziel ableiten.
    
    13. Wiederanlauf ohne ops
    
    Ein Quellcodearchiv auf dem Host reicht dafür nicht aus. Vorbereiten: getestete Host-Werkzeuge, Basisimage, Programm-/Paketartefakte oder nachweislich erreichbare Bezugsquellen, Inventar, verschlüsselte Geheimnisse samt Entschlüsselungsweg, Restic-Kennwort, Restore-Anleitung und getrennte Repositoryplatte.
    
    ops vollständig ausschalten und jede weitere Schreibmöglichkeit auf seine Datenplatte ausschließen.
    
    Neue ops-VM aus dem Host heraus aufbauen und alleiniger Eigentümer der vorhandenen Repositoryplatte werden lassen. Platte ausdrücklich als bestehend übernehmen: Kein Formatieren, keine neu ausgeführte Dateisystemrolle. Vorher Pfad, virtuelle Gerätekennung und Dateisystem-UUID abgleichen. Niemals dasselbe Dateisystem unkoordiniert in zwei laufenden VMs schreibend einhängen. Autostart der alten ops-VM unterbinden.
    
    Repository, Kennwort und Daten prüfen; keine Initialisierung über ein vorhandenes Repository ausführen.
    
    Services-Restore über die neue ops-VM durchführen. Zeit und fehlende Abhängigkeiten gesondert dokumentieren.
    
    Dieser Test belegt den Ausfall der ops-System-VM bei erhaltener Sicherungsplatte. Den Verlust sämtlicher Laptopdaten belegt er ausdrücklich nicht.
    
    Geheimnisse und Wiederanlaufwerkzeuge dürfen dabei nicht nur auf der alten ops-Systemplatte oder in Gitea liegen. Während ops ausfällt, steht sein Monitoring nicht zur Verfügung; Ausfall und Wiederanlauf deshalb vom Host protokollieren. Repositorypasswort und verschlüsselte Geheimnisse müssen tatsächlich mit dem auf dem Host verfügbaren Zugang geöffnet werden können, nicht nur als Dateinamen in einer Liste stehen.
    
    14. Automatisierung und Betriebshandbuch abschließen
    
    Erst nach erfolgreicher manueller Übung die Abläufe als versionierte Skripte/Playbooks implementieren. Folgende Schnittstellen sind zu implementierende Ziele, derzeit keine mitgelieferten Programme:
    
    Zielkommando
    
    Vertrag
    
    lab-up
    
    nur fest benannte Ressourcen starten; Zustand prüfen
    
    lab-down
    
    Gäste geordnet stoppen; Zeitüberschreitung melden
    
    backup
    
    konsistent sichern, prüfen, Snapshot-ID zurückgeben
    
    recover-services SNAPSHOT_ID
    
    frische VM aufbauen, restaurieren, Abnahme ausführen
    
    verify
    
    maschinenlesbares Ergebnis plus aussagekräftigen Fehlerstatus liefern
    
    lab-clean
    
    zunächst exakten Löschplan zeigen; ausschließlich registrierte Lab-Ressourcen
    
    Kein Löschen über weit gefasste Namensmuster; Ressourcenliste und Besitzkennzeichnung verwenden. Fehler dürfen nicht zu einem grünen Gesamtergebnis führen. Backup und Restore benötigen Schutz gegen parallele Ausführung. Unterbrechung, voller Datenträger, falsches Kennwort, fehlender Snapshot und fehlendes Netzwerk müssen verständlich abbrechen.
    
    Betriebshandbuch: Start/Stop, Updatefenster, Zugangsrücksetzung, Sicherung, Restore, Speichergrenzen, Alarmbehandlung und bekannte Grenzen. Im Arbeitsprotokoll je Schritt Ausgangslage, Änderung, Prüfung und verbleibende Abweichung festhalten.
    
    15. Ehrlicher Portfolioeintrag
    
    Bis zur Abnahme: „Geplantes Recovery Lab – Aufbau und Nachweise in Vorbereitung“.
    
    Danach nur tatsächlich bestandene Eigenschaften nennen. Für jede öffentliche Kennzahl einen anonymisierten Beleg mit Lauf-ID, Datum, Versionsstand und Prüfumfang vorhalten. Die interaktive Darstellung spielt aufgezeichnete Ereignisse ab; sie erhält keine administrativen Zugänge zum Lab. Wiederholungsanimation als Wiedergabe kennzeichnen, nicht als Liveüberwachung.
    
    Ein kompakter Belegsatz besteht aus Topologie, Regelmatrix, bereinigtem Ansible-Protokoll, Backup-ID, Integritätsprüfung, Restoreprotokoll, Rechte-/Clienttests und gemessenen Zeiten. Rohprotokolle vorher auf Schlüssel, Token, private Adressen außerhalb des Labs und persönliche Angaben prüfen.
    
    Quellenlage und Aufwand
    
    Die verlinkten Primärquellen wurden geprüft, für die zweite Fassung zusätzlich NoCloud/Netzkonfiguration auf docs.cloud-init.io, OpenSSH, chrony, Blackbox Exporter, Gitea-Reverse-Proxy, Restic-Aufbewahrung und Prometheus-Speicher. Das konkrete Debian-Cloud-Image-Verzeichnis blieb bei dieser Recherche nicht abrufbar. Deshalb sind weder ein aktueller Image-Dateiname noch dessen Prüfsumme oder Signatur als bestätigt ausgegeben. Versionen der Dokumentation und der tatsächlich gewählten Programme müssen übereinstimmen; eine Seite unter latest ist keine Versionsfixierung.
    
    Die Architekturentscheidungen, Adressen, Größen, Grenzwerte und Arbeitsreihenfolge sind eigene Empfehlungen. 44–68 Stunden bleiben eine ambitionierte Planung. Für erste Beschäftigung mit allen beteiligten Werkzeugen würde ich zusätzlich 15–25 Stunden Reserve für Fehleranalyse und Nachweise vorsehen. Auch das ist eine Schätzung, kein Erfahrungswert aus diesem noch nicht aufgebauten Lab.
    
    Die dritte Fassung ergänzt als notwendige Sicherheitsarbeit die Prüfung aller Speicherpfade, getrennte Schlüsselverwaltung und mTLS für das Monitoring. Das erhöht den Aufwand gegenüber dem ursprünglichen Grundkonzept. Die bisherige Zeitschätzung ist dafür keine belastbare Zusage; nach Bestandsaufnahme und erstem Aufbau neu schätzen. Zusätzlich geprüft wurden Restic-Bedrohungsmodell, Nginx-TLS, Exporter Toolkit, Ansible Vault, PostgreSQL-Authentisierung und Linux-dm-crypt-Dokumentation.
    
    Sicherheitsanhang: Schlüssel und Geheimnisse
    
    Diese Festlegungen gehören vor die erste vollständige Abnahme. Sie sind ein Verfahren, keine Aufforderung, vorhandene Schlüssel ungeprüft zu ersetzen.
    
    Geheimnis
    
    Benötigter Ort
    
    Schutz und Wiederherstellung
    
    Host-Administrationsschlüssel
    
    Host
    
    eigener passphrasegeschützter SSH-Schlüssel; keine private Kopie auf ops
    
    ops-Automatisierungsschlüssel
    
    ops
    
    eigener eng geschützter Laufzeitschlüssel; dessen Rechte machen ops zur privilegierten Instanz
    
    Sicherungsabrufschlüssel
    
    ops
    
    eigener Schlüssel, services akzeptiert nur vorgesehenes Exportverfahren; kein sudo für beliebige Kommandos
    
    Web- und Monitoring-CA-Schlüssel
    
    geschützter Signierbereich auf Host
    
    getrennte CAs, passphrasegeschützt, nur zur Ausstellung entsperrt; separat gesicherter Zugang
    
    TLS-Server-/Monitoring-Clientschlüssel
    
    jeweiliger Dienst
    
    je Zweck eigene Schlüssel; vom Dienst lesbar, für andere Benutzer nicht lesbar; bei Verdacht ersetzen
    
    PostgreSQL-/Gitea-Geheimnisse
    
    services und verschlüsselter Wiederherstellungssatz
    
    nur erforderliche Dienste erhalten Zugriff; mit Datenstand konsistent wiederherstellen
    
    Restic-Kennwort
    
    ops zur Sicherung; unabhängiger Notfallzugang
    
    stark zufällig, keine Wiederverwendung, niemals nur innerhalb desselben Restic-Repositorys
    
    Vault-/Speicher-Entsperrgeheimnis
    
    gesonderter Passwortspeicher oder manuell
    
    nicht neben dem verschlüsselten Inhalt automatisch ungeschützt bereitstellen
    
    Für interaktive SSH-Schlüssel Ed25519 im aktuellen OpenSSH-Format mit starker Passphrase verwenden, sofern die Zielsysteme dies unterstützen. Passphrasen interaktiv beziehungsweise über geeignete Geheimnisverwaltung zuführen, nicht in Kommandotext einbetten. Hostschlüsselprüfung mit getrenntem Lab-known_hosts nutzen. ssh-keyscan kann einen Schlüssel abholen, bestätigt aber dessen Identität nicht. Den Fingerabdruck über die vertrauenswürdige Konsole beziehungsweise Offlineprüfung abgleichen. Quelle: OpenSSH Schlüsselverwaltung
    
    Unbeaufsichtigte Automatisierung benötigt Zugriff auf ein verwendbares Geheimnis. Eine Passphrase, die zusammen mit dem Schlüssel frei lesbar gespeichert wird, hebt dieses Problem nicht auf. Deshalb den Unterschied zwischen verschlüsselter Ablage, entschlüsseltem Laufzeitgeheimnis und unabhängiger Notfallkopie dokumentieren. Passwort-/CA-Sicherungen auf demselben Laptop ermöglichen nur Wiederanlauf bei VM-Ausfall; für Laptopverlust ist eine getrennte, geprüfte Kopie mit separat verfügbarem Entsperrweg erforderlich.
    
    Die auf client installierte Web-CA erweitert dessen Vertrauen. Dieser Client bleibt deshalb eine ausschließlich für das Lab verwendete VM; die CA nicht im persönlichen Browser oder auf weiteren Rechnern installieren. Monitoring-CA nur in expliziten Vertrauensdateien der beteiligten Dienste verwenden. Auf client liegen keine CA-Privatschlüssel und keine ops-Clientschlüssel.
    
    Zertifikatserneuerung ist keine automatische Sperrung des alten Zertifikats. Bei kompromittiertem Serverkey müssen die betroffenen Prüfer den alten Vertrauensnachweis tatsächlich ablehnen: etwa durch nachgewiesen funktionierende Sperrprüfung oder im kleinen Lab durch kontrollierten Austausch der betroffenen CA-Vertrauenskette und Neuverteilung. Ein kürzeres Ablaufdatum begrenzt die Zeit, beseitigt aber das aktuelle Risiko nicht. Bei CA-Kompromittierung alle daraus abgeleiteten Zertifikate ersetzen und alte Vertrauensanker entfernen. Dieses Verfahren mit einem ausschließlich dafür erzeugten Testzertifikat prüfen.
    
    Sicherheitsanhang: Dienste und verbleibender Klartext
    
    Pfad
    
    Festgelegter Schutz
    
    Einschränkung
    
    client → Gitea/Nginx
    
    HTTPS, TLS 1.2/1.3, Serveridentität und CA geprüft
    
    Nutzerrechte bleiben separate Anwendungskontrolle
    
    Host/ops → verwaltete Gäste
    
    SSH, Schlüsselanmeldung, geprüfte Hostschlüssel
    
    root auf einem Endpunkt bleibt privilegiert
    
    ops → Exporter
    
    mTLS, zulässige Clientidentität und korrekte Serveridentität
    
    Firewall bleibt zusätzlich erforderlich
    
    Nginx → Gitea; Gitea → PostgreSQL
    
    nur Loopback derselben services-VM, Zugriffsregeln
    
    kein zusätzlicher Transportschutz in dieser VM
    
    lokale Prometheus-/Alertmanager-Verbindung
    
    Loopback, Verwaltungszugriff über lokalen SSH-Tunnel
    
    lokale privilegierte Prozesse sind vertraut
    
    DNS/NTP
    
    begrenzte Ziele/Zeiten und Zonenregeln
    
    hier nicht kryptografisch authentisiert oder verschlüsselt
    
    Paketabruf
    
    bevorzugt HTTPS und signierte Paketmetadaten
    
    Signaturen unabhängig vom Download prüfen; HTTP verschleiert keine Metadaten
    
    Backupablage
    
    Restic plus geschützte Ablage der Laufzeitgeheimnisse
    
    keine Unveränderlichkeit oder Absicherung gegen vollständigen ops-/Hostzugriff
    
    DNS kann manipulierte Antworten liefern, und unauthentisiertes NTP kann Zeitprüfungen beeinflussen. Deshalb bleiben Zertifikatsnamensprüfung, CA-Prüfung und kontrollierter Zeitabgleich Pflicht. Auffällige Zeitsprünge abbrechen und gegen den vertrauenswürdigen Host prüfen. Diese Grenzen nicht mit „alles verschlüsselt“ überdecken. Authentisierter externer Zeitabgleich wäre eine eigene Erweiterung samt geänderter Portmatrix.
    
    Host, QEMU/libvirt, Gäste und Dienste müssen Sicherheitsaktualisierungen erhalten. Festgeschriebene Versionen dienen der Reproduzierbarkeit, nicht dem dauerhaften Einfrieren von Sicherheitslücken. Images und Programme aus überprüften Quellen beziehen; bei fehlendem Herkunftsnachweis eine nachweisbar geprüfte Installationsquelle wählen oder die Lücke ausdrücklich offenlassen. SHA-Prüfsummen von derselben möglicherweise manipulierten Quelle sind kein unabhängiger Herkunftsnachweis.
    
    Gitea läuft unter seinem eigenen unprivilegierten Dienstbenutzer. PostgreSQL, Nginx und Exporter nutzen getrennte Dienstidentitäten. Systemdienste anhand ihrer tatsächlichen Schreib-, Netzwerk- und Gerätebedürfnisse härten; keine pauschalen systemd-Einstellungen übernehmen, die etwa Node Exporter funktionslos machen. Nicht benötigte Dienste, Gitea-Actions, benutzerdefinierte Hooks, externe Spiegelungen und offene Registrierungen abschalten. Wenn eine Funktion aktiviert wird, ihre Berechtigungs- und Sicherungsfolgen neu prüfen.
    
    Libvirt-Verwaltungszugriff ist eine weitreichende Hostberechtigung: keine Gastnutzer dafür freischalten, keine Hostverzeichnisse oder Verwaltungs-Sockets in Gäste durchreichen. Bestehende AppArmor-/SELinux-/libvirt-Isolation nicht für bequemeren Imagezugriff deaktivieren. Monitoring und Gitea niemals per öffentlicher Portweiterleitung veröffentlichen. Daten- und Größenlimits gelten auch für Gitea-Repositories, Logs und Sicherungsexporte.
    
    Sicherheitsanhang: Betriebsfehler und Angriff getrennt behandeln
    
    Der normale Restore übernimmt bewusst alte Daten und Geheimnisse. Bei Angriffsverdacht darf dieser Ablauf nicht unverändert verwendet werden. Ein korrekt verschlüsseltes Backup kann bereits Schadcode, manipulierte Git-Hooks, Konfiguration oder Datenbankobjekte enthalten. Eine passende Prüfsumme bestätigt Gleichheit, nicht Gutartigkeit. Wer Quelldatei und Prüfsumme kontrolliert, kann beide verändern.
    
    Betroffene VM vom Lab trennen und automatischen Wiederanlauf, Sicherungsbereinigung sowie geplante Aufgaben anhalten. Alte Sicherungen erhalten. Keine verdächtige Platte auf dem Verwaltungsrechner schreibend einhängen und keine darin enthaltenen Programme starten.
    
    Umfang klären: nur services, auch ops oder der Host? Bei betroffenem Host ist die Vertrauensbasis des ganzen Labs verloren. Dann keine Entschlüsselungsgeheimnisse weiter auf diesem Host verwenden; von vertrauenswürdig aufgebauter Umgebung aus arbeiten.
    
    Einen nachweislich geeigneten Sicherungsstand vor dem Vorfall auswählen. Fehlt dieser Nachweis, keinen sauberen Wiederanlauf behaupten. Die Prüfprotokolle und Referenzwerte dürfen nicht ausschließlich aus dem kompromittierten System stammen.
    
    Frisches, aktualisiertes System aus vertrauenswürdigen Quellen erstellen. Verdächtige Konfiguration, systemd-Einheiten, SSH-Zugänge und ausführbare Git-Hooks nicht blind übernehmen. Daten zunächst in einer isolierten, austauschbaren Analyse-/Restore-VM ohne Zugang zu Verwaltungsgeheimnissen prüfen. Archiv- und Datenbankwerkzeuge selbst aktuell halten.
    
    PostgreSQL warnt ausdrücklich, dass das Einspielen eines Dumps vom Quellsystem kontrollierte Anweisungen ausführen kann. --no-owner, --role oder eine leere Zieldatenbank machen einen verdächtigen Dump nicht sicher. Ihn nicht unmittelbar auf einer vertrauenswürdigen Verwaltungsinstanz importieren. Quelle: PostgreSQL Restore-Sicherheit
    
    Betroffene SSH-, TLS-, Datenbank- und Benutzerzugänge ersetzen; Sitzungen/Token entwerten. Giteas Datenschlüssel nicht blind austauschen: Abhängige verschlüsselte Anwendungsdaten benötigen einen versionsgerecht geprüften Übergang. Bei Restic-Schlüsselabfluss ein neues Repository mit neuem Hauptschlüssel verwenden, bei CA-Abfluss die betroffene Vertrauensdomäne erneuern.
    
    Neuaufbau, Berechtigungen, Daten, Zertifikate und Sicherung mit neuen Zugangsdaten abnehmen. Erst dann freigeben. Den Ablauf als gesonderten Sicherheitsvorfall dokumentieren, nicht mit den normalen Wiederanlaufzeiten vermischen.
    
    Dieses Verfahren ist ein zusätzlicher Planungsrahmen. Das Grundprojekt beweist noch keine forensische Untersuchung und keine Wiederherstellung nach einem echten Angriff. Eine physisch getrennte, nach dem Sichern abgekoppelte Kopie oder ein unabhängig verwalteter unveränderlicher Speicher wäre für stärkeren Löschschutz erforderlich. Ein nur innerhalb derselben VM gesetztes Schreibschutzattribut reicht gegen deren Administrator nicht.
    
    Zusätzliche Sicherheitsabnahme
    
    Alle folgenden Punkte haben derzeit den Status nicht ausgeführt. Mit synthetischen Daten arbeiten; keine realen Schlüssel in Berichten abbilden.
    
    Prüfung
    
    Belastbarer Nachweis
    
    Verschlüsselte Ablage
    
    tatsächliche Gerätehierarchie aller relevanten Pfade und Swap geprüft; Notfallentsperrung an separatem Testmedium oder geplantem Test bestätigt
    
    Restic-Geheimnis
    
    falsches Kennwort scheitert ausdrücklich an Entschlüsselung; unabhängige Notfallkopie ermöglicht lesbaren Restore
    
    Backupintegrität
    
    absichtliche Beschädigung ausschließlich in einer separaten kleinen Wegwerf-Repositorykopie wird bei Datenprüfung erkannt; originales Repository unverändert
    
    HTTPS
    
    TLS 1.2/1.3 mit geprüfter Identität erfolgreich; falscher Name, fremde CA und abgelaufenes Testzertifikat werden abgelehnt
    
    Alte TLS-Protokolle
    
    geeigneter Testclient kann den alten Handshake tatsächlich senden; Ablehnung am Server bestätigt, nicht nur eine lokal deaktivierte Clientfunktion
    
    Monitoring-mTLS
    
    berechtigtes Zertifikat funktioniert; kein Zertifikat, fremde CA und gleich signierte, aber nicht zugelassene Clientidentität werden abgewiesen
    
    SSH
    
    falscher Hostschlüssel wird abgelehnt; Passwort-, Root- und Agentweiterleitungsregeln entsprechen dem beabsichtigten Zustand
    
    Geheimnisrechte
    
    unberechtigter lokaler Nutzer kann konkrete Schlüssel- und Konfigurationsdateien nicht lesen; zuständiger Dienst funktioniert weiterhin
    
    Datenbank
    
    richtige Gitea-Rolle funktioniert; falsche Rolle/Passwort scheitert; kein TCP-Zugriff aus den Lab-Netzen
    
    Exporthelfer
    
    unerlaubter Pfad/Befehl und übergroßer Export werden abgewiesen; keine Schreibmöglichkeit von services auf ops-Repository
    
    Schlüsselwechsel
    
    neuer Testzugang funktioniert, alter wird tatsächlich abgewiesen; Restore benötigt keine ausschließlich verlorene Zugangsdatenquelle
    
    Veröffentlichungsprüfung
    
    keine Geheimnisse, Authentisierungsheader, passworttragenden URLs, privaten Schlüssel oder vertraulichen Rohprotokolle in Git/Website/Clip
    
    Eine auf einem kompromittierten Host erzeugte Aussage „alle Tests bestanden“ ersetzt keine unabhängige Vertrauensbasis. Im Portfolio den tatsächlich geprüften Schutzumfang nennen, zum Beispiel „verschlüsselte Sicherung und getesteter Wiederanlauf nach VM-Ausfall“.
    
    Dokumentierte Korrekturen von Fassung 1 zu Fassung 2
    
    Befund in Fassung 1
    
    Berichtigung
    
    Hostschutz betrachtete nur drei interne Bridges
    
    Updatebridge und Gateway-Eigenverkehr ergänzt
    
    „Weiterleitung nur im Gateway“ konnte libvirt-NAT blockieren
    
    Host-NAT und Zonenrouting getrennt beschrieben
    
    Ablaufzeit konnte etablierte Verbindungen überleben lassen
    
    Sperrreihenfolge und Conntrack-Nachweis ergänzt
    
    DNS konnte trotz geschlossenem Fenster extern weiterleiten
    
    Gateway-output und Resolverbetrieb geregelt
    
    Zeitabgleich hatte keinen zugelassenen Netzwerkpfad
    
    lokaler NTP-Dienst und begrenzter externer Abgleich ergänzt
    
    Konsolenrückweg bei gesperrten Konten unvollständig
    
    tatsächliche Anmeldung beziehungsweise Offline-Reparatur erforderlich
    
    Erstinstallation hatte eine Firewall-/Paketabhängigkeit
    
    Updateinterface bleibt bis zur Grundabsicherung getrennt
    
    SSH-Sprungpfad konnte mit Weiterleitungsverbot kollidieren
    
    getrennte Zwecke und eng begrenzte Ausnahmen
    
    Backupausgabe, Rechte und Übergabe waren zu unbestimmt
    
    Lauf-ID, unveränderter Satz, Exporthelfer und Schutz der Klartextkopien
    
    Restic-Initialisierung stand im wiederholten Ablauf
    
    Einmalinitialisierung getrennt, Fehlerabbruch ergänzt
    
    pg_restore-Beispiel ohne Eingabedatei
    
    vollständiger Aufruf mit Datei und Rollenvoraussetzungen
    
    Zeitmessung begann beim Löschen zu spät
    
    getrennte Szenarien und früher gemeinsamer Messbeginn
    
    Gelöschtes Repository wurde mit fehlender Anmeldung vermischt
    
    Anmeldung muss weiter funktionieren; Repositoryzugriff separat prüfen
    
    HTTPS-/Rechtetests konnten falsche Erfolge liefern
    
    Status, Inhalt, Identität, echte Schreibversuche und Referenzreihenfolge
    
    Aufbewahrung und Speicherbudget unterschätzten Nebeneffekte
    
    geprüfte Snapshots, Ersatzplatten und Spitzenbedarf berücksichtigt
    
    Fassung 3 ergänzt gegenüber dieser Tabelle insbesondere Datenträgerverschlüsselung und Swap, CA-/Schlüsselverwaltung, Restic-Schlüsselkompromittierung, mTLS für Monitoring, den begrenzten Schutz lokaler Klartextpfade sowie ein gesondertes Vorgehen bei Angriffsverdacht.
    
    Durchgeführt wurde eine Dokument- und Quellenprüfung einschließlich Konsistenzprüfung der Beispiele. Die fünf eingezäunten Befehls-/Konfigurationsblöcke wurden zusätzlich als Bash, XML beziehungsweise YAML syntaktisch geprüft; auch die Tabellenstruktur wurde geprüft. Das ersetzt weder libvirt-Schemavalidierung noch eine Prüfung durch die Zielprogramme. Es wurden keine VMs gestartet und keine tatsächlichen Verschlüsselungs-, Firewall-, Restore- oder Lasttests durchgeführt. Offen bleiben die Bestandsaufnahme auf dem Laptop, konkrete Paket-/Imageauswahl, Umsetzung der Rollen/Skripte und die anschließende praktische Abnahme. Erst deren Erfolg erlaubt den Status „umgesetzt“.
