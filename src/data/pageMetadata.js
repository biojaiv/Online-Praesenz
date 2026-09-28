export const SITE_ORIGIN = 'https://vladimir-leicht.com';
export const pages = {
  '/': {
    image: '/social/portfolio.jpg', type: 'ProfilePage',
    en: { title: 'Vladimir Leicht — IT Systems Integration Portfolio', description: 'Vladimir Leicht: systems integration, Windows Server, UEM and automation. Explore the final project, interactive web projects and CV in a 3D portfolio.' },
    de: { title: 'Vladimir Leicht — Fachinformatiker für Systemintegration', description: 'Vladimir Leicht: Systemintegration, Windows Server, UEM und Automatisierung. Abschlussprojekt, interaktive Webprojekte und Lebenslauf im 3D-Portfolio.' },
  },
  '/beispiel/': {
    image: '/example/preview-desktop-en.jpg', type: 'WebPage',
    en: { title: 'Tiefgang — Interactive Systems Integration · Vladimir Leicht', description: 'Follow Jana’s laptop from unboxing to a working desktop: networking, DHCP, PXE, Active Directory, software deployment and backup. An interactive demonstration.' },
    de: { title: 'Tiefgang — Systemintegration erleben · Vladimir Leicht', description: 'Begleite Janas Laptop vom Auspacken zum Arbeitsplatz: Netzwerk, DHCP, PXE, Active Directory, Softwareverteilung und Sicherung. Eine interaktive Demonstration.' },
  },
  '/beispiele/resonanz/': {
    image: '/creative/resonanz-desktop-en.webp', type: 'WebPage',
    en: { title: 'RESONANZ — Sound takes shape · Vladimir Leicht', description: 'Shape a silver sound sculpture. Explore harmonics, space and rhythm in a playable, bilingual Web Audio experiment.' },
    de: { title: 'RESONANZ — Klang wird Form · Vladimir Leicht', description: 'Forme eine silberne Klangskulptur. Entdecke Obertöne, Raum und Rhythmus in einem spielbaren, zweisprachigen Web-Audio-Experiment.' },
  },
  '/beispiele/palimpsest/': {
    image: '/creative/palimpsest-desktop-en.webp', type: 'WebPage',
    en: { title: 'PALIMPSEST — The story of Pforzheim · Vladimir Leicht', description: 'Travel through Pforzheim, from Roman Portus to the Goldstadt and its reconstruction. A living paper city, a continuous red timeline and twelve illustrated stories.' },
    de: { title: 'PALIMPSEST — Die Geschichte Pforzheims · Vladimir Leicht', description: 'Pforzheim von Portus über die Goldstadt bis zum Wiederaufbau: eine lebendige Papierstadt, eine durchgehende rote Zeitspur und zwölf illustrierte Geschichten.' },
  },
  '/beispiele/passung/': {
    image: '/passung/preview-desktop-en.webp', type: 'WebPage',
    en: { title: 'PASSUNG — Precision engineering website concept · Vladimir Leicht', description: 'From a drawing to a complete drive assembly. Explore a Blender-modelled precision component in an interactive, bilingual website concept for medium-sized manufacturers.' },
    de: { title: 'PASSUNG — Webseitenkonzept für Präzisionstechnik · Vladimir Leicht', description: 'Von der Zeichnung zur fertigen Antriebsbaugruppe: ein in Blender modelliertes Werkstück in einer interaktiven, zweisprachigen Beispielseite für mittelständische Fertigungsbetriebe.' },
  },
  '/systemintegration/': {
    image: '/recovery/preview-en.jpg', type: 'WebPage',
    en: { title: 'Recovery Lab — Debian, Virtualization & Backup · Vladimir Leicht', description: 'Recovery Lab project film: four Debian VMs, isolated network zones and verified configurations, with planned PostgreSQL, external backups and controlled recovery.' },
    de: { title: 'Recovery Lab — Debian, Virtualisierung & Backup · Vladimir Leicht', description: 'Recovery Lab im Projektfilm: vier Debian-VMs, getrennte Netzzonen und geprüfte Konfigurationen. Geplante Erweiterung um PostgreSQL, externe Backups und Wiederherstellung.' },
  },
};

export function metadataFor(pathname, language = 'en') {
  const path = pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');
  const page = pages[path];
  if (!page) return null;
  return { ...page[language === 'de' ? 'de' : 'en'], image: SITE_ORIGIN + page.image,
    url: SITE_ORIGIN + path, type: page.type };
}
