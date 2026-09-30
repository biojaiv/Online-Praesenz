/** Content of the CV hologram (two pages, DE/EN). Facts follow src/data/cv.*.json and
 *  the information views; this is the condensed version shown in the 3D projection. */
export const hologramContent = {
  de: {
    lang: 'de',
    role: 'Fachinformatiker für Systemintegration',
    status: ['Ab sofort verfügbar', 'Pforzheim', 'Remote möglich'],
    profile: 'Ich plane, baue und betreue zuverlässige IT-Infrastrukturen – mit einem Schwerpunkt auf Windows-Umgebungen, Virtualisierung und automatisierter Clientbereitstellung.',
    focus: ['Windows Server', 'Active Directory', 'VMware vSphere', 'baramundi UEM'],
    goal: 'Entwicklungsziel: Cloud Engineering',
    sections: {
      education: 'Ausbildung & Praxis', skills: 'Kenntnisse', projects: 'Projekte',
      work: 'Berufserfahrung', more: 'Weitere Stationen', interests: 'Interessen', contact: 'Kontakt',
    },
    education: [
      { when: '2024 – 2026', title: 'Umschulung zum Fachinformatiker für Systemintegration', meta: 'TASys GmbH · Abschluss 2026 (IHK)' },
      { when: '01/2026 – 07/2026', title: 'Praxisphase', meta: 'Landratsamt Enzkreis · Amt für IT und Digitalisierung', detail: 'Abschlussprojekt: baramundi-Pilotumgebung (siehe Projekte)' },
      { when: '2001 – 2004', title: 'Technisches Gymnasium Heinrich-Wieland', meta: 'Abitur · Leistungskurse IT und Englisch' },
    ],
    skills: [
      ['Systeme & Infrastruktur', ['Windows Server 2025', 'Active Directory', 'Microsoft SQL Server', 'VMware vSphere', 'Debian-basierte Linux-Systeme', 'DHCP · DNS · PXE']],
      ['Endpoint-Management & Monitoring', ['baramundi Management Suite', 'Matrix42 Empirum', 'WinPE & Treiber', 'CheckMK']],
      ['Automatisierung & Entwicklung', ['Bash', 'Python', 'Ansible (Einarbeitung)', 'Docker', 'Git / GitHub', 'C#', 'HTML · CSS · JavaScript']],
      ['Dokumentation & Sprachen', ['Technische Dokumentation', 'Englisch', 'Russisch']],
    ],
    projects: [
      { title: 'Abschlussprojekt (IHK): baramundi-Pilotumgebung', tag: 'Abgeschlossen', text: 'Planung, Aufbau, Test und Dokumentation einer Pilotumgebung als Entscheidungsgrundlage für eine mögliche Ablösung von Matrix42 Empirum. Vier von vier Windows-11-Referenzclients vollständig bereitgestellt und inventarisiert.' },
      { title: 'Recovery Lab', tag: 'Bestand + Erweiterung', text: 'Labor mit vier Debian-VMs, Anwendung und Datenbank. Externe Sicherung und automatisierter Wiederanlauf sind geplant.' },
      { title: 'Ansible-Testlab', tag: 'In Entwicklung', text: 'Reproduzierbare Konfiguration von Test-Servern und -Clients mit Ansible.' },
      { title: 'Interaktives Portfolio', tag: 'Online', text: 'vladimir-leicht.com – zweisprachig, barrierearm, mit Three.js, Blender und automatisierten Browsertests.' },
    ],
    work: [
      { when: '03/2023 – 12/2024', title: 'Servicemitarbeiter (Nebentätigkeit)', meta: 'Esso Tankstelle · Pforzheim' },
      { when: '04/2021 – 02/2022', title: 'Arbeitssuchend', meta: 'Corona-Zeit' },
      { when: '02/2018 – 01/2024', title: 'Fachfremde Tätigkeiten', meta: 'Lager, Kommissionierung, Versand, Bau und Galvanik · Pforzheim', detail: 'Übertragbar: Warenwirtschaft und Bestandsführung, strukturiertes Arbeiten im Schichtbetrieb, Termintreue.' },
    ],
    more: [
      { when: '07/2016 – 10/2016', title: 'Auslandsaufenthalt in Brasilien', meta: 'Handwerkliche Arbeiten auf einer Selbstversorgerfarm' },
      { when: '10/2005 – 10/2006', title: 'Zivildienst · Betreuer', meta: 'IB Bildungszentrum · Pforzheim' },
    ],
    interests: [['fist', 'Kampfsport'], ['book', 'Lesen'], ['chip', 'KI-gestützte Entwicklung']],
    contact: [['mail', 'vleicht@keemail.me'], ['pin', 'Pforzheim · Baden-Württemberg']],
  },
  en: {
    lang: 'en',
    role: 'IT Specialist for Systems Integration',
    status: ['Available immediately', 'Pforzheim, Germany', 'Remote possible'],
    profile: 'I plan, build and maintain reliable IT infrastructure, with a focus on Windows environments, virtualisation and automated client deployment.',
    focus: ['Windows Server', 'Active Directory', 'VMware vSphere', 'baramundi UEM'],
    goal: 'Career goal: Cloud Engineering',
    sections: {
      education: 'Education & Practice', skills: 'Skills', projects: 'Projects',
      work: 'Work Experience', more: 'Further Experience', interests: 'Interests', contact: 'Contact',
    },
    education: [
      { when: '2024 – 2026', title: 'Retraining as IT Specialist for Systems Integration', meta: 'TASys GmbH · qualification 2026 (IHK)' },
      { when: '01/2026 – 07/2026', title: 'Practical phase', meta: 'Enzkreis District Office · IT and Digitalisation Department', detail: 'Final project: baramundi pilot environment (see Projects)' },
      { when: '2001 – 2004', title: 'Heinrich-Wieland Technical Grammar School', meta: 'Abitur · advanced courses in IT and English' },
    ],
    skills: [
      ['Systems & Infrastructure', ['Windows Server 2025', 'Active Directory', 'Microsoft SQL Server', 'VMware vSphere', 'Debian-based Linux systems', 'DHCP · DNS · PXE']],
      ['Endpoint Management & Monitoring', ['baramundi Management Suite', 'Matrix42 Empirum', 'WinPE & drivers', 'CheckMK']],
      ['Automation & Development', ['Bash', 'Python', 'Ansible (learning)', 'Docker', 'Git / GitHub', 'C#', 'HTML · CSS · JavaScript']],
      ['Documentation & Languages', ['Technical documentation', 'English', 'Russian']],
    ],
    projects: [
      { title: 'Final project (IHK): baramundi pilot environment', tag: 'Completed', text: 'Planned, built, tested and documented a pilot environment as a basis for deciding on a possible replacement of Matrix42 Empirum. Four out of four Windows 11 reference clients fully deployed and inventoried.' },
      { title: 'Recovery Lab', tag: 'Existing + extension', text: 'Lab with four Debian VMs, an application and a database. External backup and automated recovery are planned.' },
      { title: 'Ansible test lab', tag: 'In development', text: 'Reproducible configuration of test servers and clients with Ansible.' },
      { title: 'Interactive portfolio', tag: 'Online', text: 'vladimir-leicht.com – bilingual, accessible, built with Three.js, Blender and automated browser tests.' },
    ],
    work: [
      { when: '03/2023 – 12/2024', title: 'Service station attendant (part-time)', meta: 'Esso service station · Pforzheim' },
      { when: '04/2021 – 02/2022', title: 'Seeking employment', meta: 'COVID-19 period' },
      { when: '02/2018 – 01/2024', title: 'Roles outside IT', meta: 'Warehousing, order picking, shipping, construction and electroplating · Pforzheim', detail: 'Transferable: inventory management, structured shift work, reliability with deadlines.' },
    ],
    more: [
      { when: '07/2016 – 10/2016', title: 'Stay abroad in Brazil', meta: 'Manual work on a self-sufficient farm' },
      { when: '10/2005 – 10/2006', title: 'Civilian service · carer', meta: 'IB education centre · Pforzheim' },
    ],
    interests: [['fist', 'Martial arts'], ['book', 'Reading'], ['chip', 'AI-assisted development']],
    contact: [['mail', 'vleicht@keemail.me'], ['pin', 'Pforzheim · Baden-Württemberg']],
  },
};
