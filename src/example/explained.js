import { copy, escapeHTML as e, number } from './content.js';
import { illustration } from './illustration.js';
import { diagramLabels } from './diagramLabels.js';
import { navigationMarkup } from './navigation.js';

export const explainedPath=lang=>`/beispiel/erklaert/${lang==='en'?'en/':''}`;

const editorial = {
  de: {
    title:'Wie wird aus einem Karton ein Arbeitsplatz?', kicker:'FÜR NEUGIERIGE · KEINE IT-KENNTNISSE NÖTIG',
    intro:'Wenn jemand neu anfängt, steht zuerst ein eingepackter Laptop da. Bis Jana damit arbeiten kann, müssen sieben Dinge passieren. In einer gut geplanten IT laufen viele davon fast von selbst. Tiefgang zeigt dir, wie das aussieht — und du darfst dabei sogar ein Kabel ziehen.',
    start:'Los geht’s: 08:00 Uhr ↓', facts:['Schritte','Erkunden (Richtwert)','Vorwissen nötig'],
    caption:'Janas Laptop reist durch vier Ebenen: Anwendung, Netz, Server und Hardware.',
    journey:'Der Weg des Laptops in sieben Schritten', journeyNote:'Jeder Schritt hat eine Uhrzeit, einen Fachbegriff für Insider und ein Bild aus dem Alltag für alle anderen.', benefit:'WAS BRINGT’S?', bonus:'BONUS · SELBST AUSPROBIEREN', bonusTitle:'Zwei Wege', bonusTag:'Redundanz · Uplink A/B',
    bonusText:'Wie eine Umleitung bei einer Baustelle: Fällt ein Kabel aus, nimmt der Verkehr den zweiten Weg. Probiere es aus: Kabel ziehen.',
    distinction:'Redundanz hält den Betrieb am Laufen; ein Backup holt verlorene Daten zurück. Beides braucht man.',
    depth:'Drei Lesetiefen: dasselbe Kapitel, je nach Interesse', depthNote:'Der Regler „Lesetiefe“ schaltet im Erlebnis zwischen den Ebenen um. Einfach ist der Standard; Fachwissen bleibt einen Klick entfernt. Hier siehst du das Beispiel DHCP.',
    depths:['für alle','für Interessierte','für Fachleute'], depthSimple:'Der Laptop bittet das Netz um eine Adresse und bekommt eine. Wie eine Hausnummer für die Post.', depthExplained:'Der DHCP-Server vergibt Adresse, Gateway und DNS in vier Schritten: Discover, Offer, Request, Acknowledge. Erst nach der Bestätigung darf der Laptop die Adresse benutzen.',
    glossary:'Glossar in einem Satz', why:'Warum das alles automatisieren?', model:'Modell oder Praxis?', modelTitle:'IM MODELL (TIEFGANG)', practiceTitle:'IN DER PRAXIS (ABSCHLUSSPROJEKT)',
    modelText:'Jana, der Laptop und die 35 Minuten sind ein anschauliches Modell. Die Zeit ist verdichtet, nicht gemessen. Die Kapitel zeigen einen logischen Weg, keinen verbindlichen Bootablauf oder vollständigen Netzplan.',
    practiceText:'Landratsamt Enzkreis: baramundi-Pilotumgebung als Grundlage für einen möglichen späteren Ersatz von Matrix42 Empirum. 40 Stunden, vier vollständig erfolgreiche Referenzclients bei fünf geplanten. Ein Pilot, keine vollständige Produktionsmigration.',
    project:'Abschlussprojekt ↗', contact:'Kontakt', explained:'Erklärt', glossaryNav:'Glossar', startNav:'Starten', footer:'Jetzt Tiefgang starten ↓',
    names:['Auspacken','Das Netz','Adresse','Betriebssystem','Anmeldung','Software','Sicherung'],
    analogies:[
      'Wie ein Namensschild: Der Laptop bekommt eine Nummer und eine Besitzerin, bevor er irgendetwas darf.',
      'Wie getrennte Straßen mit Pförtner: Der Laptop fährt auf seiner Spur, und nur erlaubte Wege sind offen.',
      'Wie eine Hausnummer: Ohne sie findet die Post den Laptop nicht. Vier kurze Nachrichten, dann hat er eine.',
      'Wie ein Fertighaus aus dem Werk: Das System kommt übers Netz. Niemand rennt mit USB-Stick von Gerät zu Gerät.',
      'Wie ein Mitarbeiterausweis: Eine Identität, und genau die Türen gehen auf, die zu Janas Aufgaben passen.',
      'Wie ein Lieferdienst mit Quittung: Programme kommen automatisch an, und die IT sieht, ob sie wirklich da sind.',
      'Wie ein Schließfach außer Haus: Geht etwas verloren, gibt es die Kopie. Und getestet ist, dass sie funktioniert.',
    ],
    benefits:['Man weiß jederzeit, welches Gerät wo steht.','Fremde kommen nicht an sensible Dienste.','Niemand muss Adressen von Hand vergeben.','Jeder Laptop startet mit demselben, geprüften Stand.','Rechte werden an einer Stelle gesteuert, nicht an hundert.','Kein Installer, der „irgendwie“ gestartet wurde.','Dateien lassen sich nach einem Verlust wiederherstellen.'],
    reasons:[['Weniger Fehler','Jeder Laptop bekommt dieselben geprüften Schritte, nicht jedes Mal etwas anderes.'],['Nachvollziehbar','Die IT sieht, was installiert wurde und ob es geklappt hat.'],['Mehr Zeit für Menschen','Wer nicht von Hand installiert, kann sich um Probleme kümmern, die wirklich Köpfchen brauchen.']],
  },
  en: {
    title:'How does a cardboard box become a workstation?', kicker:'FOR THE CURIOUS · NO IT KNOWLEDGE NEEDED',
    intro:'When someone joins a company, the first thing waiting is a laptop in a box. Seven things need to happen before Jana can work with it. In a well-planned IT environment, many happen almost on their own. Tiefgang shows you what that looks like — and even lets you pull a cable.',
    start:'Let’s go: 08:00 ↓', facts:['steps','Exploring (a guide)','Prior knowledge needed'], caption:'Jana’s laptop travels through four levels: application, network, server and hardware.',
    journey:'The laptop’s journey in seven steps', journeyNote:'Each step has a time, a technical term for insiders and an everyday comparison for everyone else.', benefit:'WHAT DOES IT HELP?', bonus:'BONUS · TRY IT YOURSELF', bonusTitle:'Two paths', bonusTag:'Redundancy · uplink A/B', bonusText:'Like a diversion around roadworks: if a cable fails, traffic takes the second route. Try it: pull a cable.', distinction:'Redundancy keeps things running; a backup brings lost data back. You need both.',
    depth:'Three reading depths: the same chapter, your choice', depthNote:'The “Reading depth” control switches between levels in the experience. Simple is the default; technical detail stays one click away. Here is the DHCP example.', depths:['for everyone','for curious readers','for specialists'], depthSimple:'The laptop asks the network for an address and receives one. Like a house number for the post.', depthExplained:'The DHCP server supplies an address, gateway and DNS in four steps: Discover, Offer, Request, Acknowledge. The laptop may use the address only once the server confirms it.',
    glossary:'A glossary in one sentence', why:'Why automate all this?', model:'Model or practice?', modelTitle:'IN THE MODEL (TIEFGANG)', practiceTitle:'IN PRACTICE (FINAL PROJECT)', modelText:'Jana, the laptop and the 35 minutes are an illustrative model. Time is compressed, not measured. The chapters show a logical journey, not a mandatory boot order or a complete network topology.', practiceText:'Enzkreis District Administration: a baramundi pilot environment as a basis for a possible future replacement of Matrix42 Empirum. 40 hours, four fully successful reference clients out of five planned. A pilot, not a complete production migration.', project:'Final project ↗', contact:'Contact', explained:'Explained', glossaryNav:'Glossary', startNav:'Start', footer:'Start Tiefgang now ↓',
    names:['Unboxing','The network','Address','Operating system','Sign-in','Software','Backup'],
    analogies:[
      'Like a name badge: the laptop gets an inventory number and an owner before it is allowed to do anything.',
      'Like separate roads with a gatekeeper: the laptop stays in its own lane, and only permitted routes are open.',
      'Like a house number: without one, the post cannot find the laptop. Four short messages, then it has one.',
      'Like a factory-built house: the system arrives over the network. Nobody runs from device to device with a USB stick.',
      'Like an employee pass: one identity opens exactly the doors that match Jana’s tasks.',
      'Like a delivery service with a receipt: programs arrive automatically, and IT sees whether they really made it.',
      'Like a safe deposit box off-site: if something is lost, there is a copy. A test checks that it works.',
    ],
    benefits:['You always know which device is where.','Strangers cannot reach sensitive services.','Nobody has to assign addresses by hand.','Every laptop starts with the same approved setup.','Permissions are managed in one place, not a hundred.','Not just an installer that was “somehow” started.','Files can be recovered after data loss.'],
    reasons:[['Fewer errors','Every laptop gets the same approved steps rather than a different setup each time.'],['Traceability','IT can see what was installed and whether it worked.'],['More time for people','Less manual installation leaves time for problems that really need a thoughtful person.']],
  },
};

export function explainedMarkup(language) {
  const c=copy[language], d=editorial[language], start=`/beispiel/?lang=${language}`, locale=explainedPath(language), other=language==='de'?'en':'de';
  const tags=['Inventar / inventory','VLAN · Firewall · Switch','DHCP','PXE · Deployment','Active Directory','UEM · baramundi','Backup · Restore'];
  tags[0]=language==='de'?'Inventarisierung':'Inventory';
  return `<!doctype html><html lang="${language}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(d.title)} — Tiefgang · Vladimir Leicht</title><meta name="description" content="${e(d.journeyNote)}"><link rel="alternate" hreflang="de" href="https://vladimir-leicht.com/beispiel/erklaert/"><link rel="alternate" hreflang="en" href="https://vladimir-leicht.com/beispiel/erklaert/en/"><link rel="stylesheet" href="/src/example/style.css"><link rel="stylesheet" href="/src/example/explained.css"></head><body class="explained-page">
    ${navigationMarkup(language)}
    <header class="explained-masthead"><a class="wordmark" href="${start}">TIEFGANG<span aria-hidden="true">■</span></a><nav aria-label="${language==='de'?'Navigation':'Navigation'}"><a href="${locale}" aria-current="page">${d.explained}</a><a href="${start}">${d.startNav}</a><a href="#glossary">${d.glossaryNav}</a><a href="/?lang=${language}#abschluss">${d.project}</a><a class="locale-switch" href="${explainedPath(other)}" lang="${other}" hreflang="${other}">${language==='de'?'EN':'DE'}</a></nav></header>
    <main>
      <section class="explained-hero"><div class="hero-copy"><p class="eyebrow">${d.kicker}</p><h1>${d.title}</h1><p class="hero-intro">${d.intro}</p><dl class="hero-facts">${['7',language==='de'?'≈ 3 Min.':'≈ 3 min.','0'].map((fact,i)=>`<div><dt>${fact}</dt><dd>${d.facts[i]}</dd></div>`).join('')}</dl><a class="start-button" href="${start}">${d.start}</a></div><figure class="hero-figure"><div class="diagram-plate">${illustration(c,`explained-${language}`,2,false,'180 18 560 1100')}${diagramLabels(language,false)}</div><figcaption>${d.caption}</figcaption></figure></section>
      <section class="explained-section" aria-labelledby="steps-heading"><h2 id="steps-heading">${d.journey}</h2><p class="section-intro">${d.journeyNote}</p><div class="step-grid">${c.chaptersData.map((row,i)=>`<article class="step-card"><div class="step-number"><span>${number(i)}</span><time>${row[1]}</time></div><h3><a href="${start}#chapter-${i+1}">${d.names[i]}</a></h3><p class="technical-tag">${tags[i]}</p><p class="analogy">${d.analogies[i]}</p><div class="benefit"><span>${d.benefit}</span><p>${d.benefits[i]}</p></div></article>`).join('')}<article class="step-card bonus-card"><p class="bonus-kicker"><span aria-hidden="true">✦</span>${d.bonus}</p><h3>${d.bonusTitle}</h3><p class="technical-tag">${d.bonusTag}</p><p class="analogy">${d.bonusText}</p><div class="benefit"><span>${language==='de'?'ABGRENZUNG':'DISTINCTION'}</span><p>${d.distinction}</p></div><a href="${start}#chapter-2">${c.cable} ↗</a></article></div></section>
      <section class="explained-section" aria-labelledby="depth-heading"><h2 id="depth-heading">${d.depth}</h2><p class="section-intro">${d.depthNote}</p><div class="depth-examples">${[c.depthSimple,c.depthExplained,c.depthTech].map((name,i)=>`<article><h3><i class="level-gauge level-${i}" aria-hidden="true"></i>${name}</h3><p class="depth-audience">${d.depths[i]}</p>${i<2?`<p>${i===0?d.depthSimple:d.depthExplained}</p>`:`<pre>DHCPDISCOVER → broadcast
 DHCPOFFER 10.20.0.42
 GW 10.20.0.1 · DNS 10.20.0.10
 DHCPREQUEST → DHCP-01
 DHCPACK ← ${language==='de'?'Lease bestätigt':'lease confirmed'}
 ${language==='de'?'Modellwerte':'Model values'}, VLAN 20</pre>`}</article>`).join('')}</div></section>
      <div class="explained-bottom"><section id="glossary" aria-labelledby="glossary-heading"><h2 id="glossary-heading">${d.glossary}</h2><dl class="glossary-grid">${Object.entries(c.glossary).map(([key,[name,definition]])=>`<div id="term-${key}"><dt><a href="#term-${key}">${e(name)}</a></dt><dd>${e(definition)}</dd></div>`).join('')}</dl></section><div><section class="why-section"><h2>${d.why}</h2>${d.reasons.map(([title,text])=>`<article><h3>${title}</h3><p>${text}</p></article>`).join('')}</section><section class="model-section"><h2>${d.model}</h2><div class="model-grid"><article><h3>${d.modelTitle}</h3><p>${d.modelText}</p></article><article><h3>${d.practiceTitle}</h3><p>${d.practiceText}</p><a href="/?lang=${language}#abschluss">${d.project}</a></article></div></section></div></div>
    </main><footer class="explained-footer"><a href="${start}">${d.footer}</a><nav><a href="#glossary">${d.glossaryNav}</a> · <a href="/?lang=${language}#abschluss">${d.project}</a> · <a href="/?lang=${language}#kontakt">${d.contact}</a></nav><p>Vladimir Leicht · Systems Integration · 2026</p></footer>
    <script type="module" src="/src/example/explainedNavigation.js"></script>
  </body></html>`;
}
