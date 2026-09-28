// Historical claims link to the city's archives and museums. The miniature and
// its objects are illustrations, not reconstructions of individual artefacts.
export const cityYears = ['2026', '1924', '1643', '0244'];
const source = {
 chronicle:'https://www.pforzheim.de/stadt/stadtgeschichte/kleine-stadtchronik.html',
 tram:'https://www.pforzheim.de/stadt/stadtgeschichte/stadtarchiv/schatzkammer/2011-archivale-des-monats/dezember-2011.html',
 gold:'https://www.technisches-museum.de/museum.html',
 rassler:'https://www.pforzheim.de/stadt/ortsteile/hohenwart/sehenswertes-in-hohenwart.html',
 museum:'https://www.schmuckmuseum.de/museum/das-reuchlinhaus.html',
 remembrance:'https://www.pforzheim.de/stadt/stadtgeschichte/gedenken-friedenskultur/gedenktage/23-februar.html',
 park:'https://www.pforzheim.de/freizeit/parks/enzauenpark.html',
 church:'https://www.pforzheim.de/stadt/stadtgeschichte/historische-stelen/schlossberg.html',
 reuchlin:'https://www.pforzheim.de/kultur/museen-ausstellungsorte/museum-johannes-reuchlin.html',
 portus:'https://www.pforzheim.de/kultur/stadtgeschichte.html',
 archaeology:'https://www.pforzheim.de/kultur/museen-ausstellungsorte/archaeologisches-museum-pforzheim.html'
};
// [date, object, title, introduction, detail, source label]
const story = (id, url, de, en) => ({id, url:source[url], de, en});
export const cityStories = [
 [
  story('museum','museum',
   ['1961','ARCHITEKTUR','Raum für einen Neuanfang','Das Reuchlinhaus öffnet 1961. Manfred Lehmbrucks Pavillons geben Kunst, Wissen und Begegnung ein neues Zuhause.',
    'Vier eigenständige Baukörper sind um eine gläserne Eingangshalle angeordnet. Das Kulturhaus steht für die Nachkriegsmoderne; seinen Namen trägt es nach Johannes Reuchlin. Die niedrigen Pavillons oben in der Miniatur greifen diese Idee auf.', 'Schmuckmuseum · Reuchlinhaus'],
   ['1961','ARCHITECTURE','Room for a new beginning','The Reuchlinhaus opens in 1961. Manfred Lehmbruck’s pavilions create a new home for art, knowledge and encounters.',
    'Four distinct volumes surround a glazed entrance hall. This cultural centre represents post-war modernism and takes its name from Johannes Reuchlin. The low pavilions at the top of the miniature echo that architectural idea.', 'Jewellery Museum · Reuchlinhaus']),
  story('memory','remembrance',
   ['1945','ERINNERUNG','Die Lücke im Stadtbild','Der Luftangriff vom 23. Februar 1945 zerstört große Teile Pforzheims. Tausende Menschen verlieren ihr Leben.',
    'Die Zerstörung gehört in den Zusammenhang des von NS-Deutschland begonnenen Zweiten Weltkriegs. Der Wiederaufbau prägt die heutige Stadt. Der 23. Februar ist ihr Gedenktag: Er erinnert an die Opfer und verpflichtet zu Frieden, Demokratie und Toleranz.', 'Stadt Pforzheim · 23. Februar'],
   ['1945','REMEMBRANCE','The gap in the city','The air raid of 23 February 1945 destroys much of Pforzheim. Thousands of people lose their lives.',
    'This destruction belongs in the context of the Second World War started by Nazi Germany. Reconstruction shapes the city we see today. Its annual day of remembrance honours the victims and affirms peace, democracy and tolerance.', 'City of Pforzheim · 23 February']),
  story('river','park',
   ['1992','STADTNATUR','Die Enz bekommt Platz','Zur Landesgartenschau 1992 entsteht der Enzauenpark. Ein industriell geprägter Stadtrand wird zum Freiraum.',
    'Die Schau verbindet Natur und Technik. Die Enz wird in diesem Abschnitt renaturiert, die Ufer werden Teil einer neuen Parklandschaft. Stadtgeschichte steckt damit auch in einem Spaziergang am Wasser, nicht nur in Fassaden und Denkmälern.', 'Stadt Pforzheim · Enzauenpark'],
   ['1992','URBAN NATURE','Making room for the Enz','The Enzauenpark takes shape for the 1992 state garden show. An industrial fringe becomes public green space.',
    'The exhibition brings nature and technology together. This stretch of the Enz is restored and its banks become part of a new park landscape. A walk beside the water can reveal urban history just as a building or monument does.', 'City of Pforzheim · Enzauenpark'])
 ],
 [
  story('ticket','tram',
   ['1911–1964','MOBILITÄT','Eine Fahrt durch den Alltag','1924 fährt Pforzheims Straßenbahn längst durch die Stadt. Ihre Geschichte beginnt am 30. November 1911.',
    'Bis zur Einstellung 1964 verkehren die Bahnen mit Unterbrechungen auf drei Linien. Im Stadtarchiv erzählen Gleispläne und Fahrpläne von diesem Netz. Die hier gezeigte Fahrkarte ist eine Illustration für das Jahr 1924, kein historisches Original.', 'Stadtarchiv · Straßenbahn'],
   ['1911–1964','MOBILITY','A journey through everyday life','By 1924, trams are a familiar sight in Pforzheim. The network opened on 30 November 1911.',
    'The trams serve three lines, with interruptions, until closure in 1964. Track plans and timetables in the city archive document this network. The ticket shown here is an illustration for 1924, not an original historical object.', 'City archive · Tramway']),
  story('watch','gold',
   ['1767','HANDWERK','Wie die Goldstadt beginnt','1767 erhält eine Uhrenmanufaktur das Privileg des Markgrafen Karl Friedrich. Bald kommt Schmuck hinzu.',
    'Aus diesem Anfang entwickelt sich Pforzheims prägende Industrie. Hinter fertigen Uhren und Schmuckstücken stehen spezialisierte Arbeitsschritte, Werkzeuge und Menschen. Das Technische Museum macht diese Produktionsgeschichte anschaulich.', 'Technisches Museum · Industriegeschichte'],
   ['1767','CRAFT','The beginnings of the Goldstadt','In 1767, Margrave Karl Friedrich grants a privilege to a watch manufactory. Jewellery production soon follows.',
    'These beginnings grow into Pforzheim’s defining industry. Finished watches and jewellery depend on specialised processes, tools and people. The Technical Museum explores this history of production.', 'Technical Museum · Industrial history']),
  story('boots','rassler',
   ['UM 1900','ARBEITSLEBEN','Zu Fuß in die Goldstadt','Die „Rassler“ kommen aus den umliegenden Dörfern zur Arbeit. Landwirtschaft und Schmuckindustrie gehören zu ihrem Alltag.',
    'In Hohenwart erinnert ein ehemaliges Bauernhaus an diese Verbindung. Der Name „Rassler“ wird mit dem Geräusch eisenbeschlagener Schuhe auf dem Pflaster erklärt. So erzählt die Industriegeschichte auch von Wegen zwischen Dorf und Stadt.', 'Stadt Pforzheim · Hohenwart'],
   ['C. 1900','WORKING LIFE','Walking to the Goldstadt','The “Rassler” walk in from surrounding villages to work. Farming and the jewellery industry share a place in their lives.',
    'A former farmhouse in Hohenwart recalls this connection. The name “Rassler” is associated with the clatter of iron-shod shoes on paving stones. Industrial history also follows the routes between village and city.', 'City of Pforzheim · Hohenwart'])
 ],
 [
  story('map','chronicle',
   ['1643','STADTANSICHT','Eine Stadt wird lesbar','1643 erscheint in Merians „Topographia Sueviae“ die älteste detaillierte Ansicht Pforzheims.',
    'Dächer, Türme und Befestigungen werden zu einer lesbaren Silhouette. Diese Ansicht gibt der dritten Papierschicht ihr Jahr. Die Miniatur deutet ihre dichte Bauweise an; sie bildet den historischen Stadtplan nicht maßstabsgetreu nach.', 'Stadt Pforzheim · Kleine Stadtchronik'],
   ['1643','CITY VIEW','A city becomes legible','In 1643, Merian’s “Topographia Sueviae” publishes the earliest detailed view of Pforzheim.',
    'Roofs, towers and fortifications form a readable silhouette. This view gives the third paper layer its date. The miniature suggests its dense fabric without reproducing the historical street plan to scale.', 'City of Pforzheim · City chronicle']),
  story('church','church',
   ['13.–15. JH.','BAUKULTUR','Schichten aus Stein','An St. Michael treffen romanische, gotische und spätgotische Bauteile aufeinander. Die Kirche ist selbst ein Palimpsest.',
    'Der Stiftschor wird zur Grablege des Hauses Baden. 1945 wird die Schlosskirche schwer beschädigt. Ihre unterschiedlichen Bauphasen zeigen: Ein Gebäude ist selten das Werk eines einzigen Augenblicks.', 'Stadt Pforzheim · Schlossberg'],
   ['13TH–15TH C.','BUILT HERITAGE','Layers made of stone','St Michael’s combines Romanesque, Gothic and late Gothic fabric. The church is a palimpsest in its own right.',
    'Its collegiate choir becomes a burial place for the House of Baden. The church is badly damaged in 1945. These different phases remind us that a building rarely belongs to just one moment in time.', 'City of Pforzheim · Schlossberg']),
  story('book','reuchlin',
   ['1455–1522','HUMANISMUS','Bücher bewahren','Der Pforzheimer Humanist Johannes Reuchlin setzt sich gegen die Vernichtung jüdischer Schriften ein.',
    'Sein Eintreten für diese Bücher verbindet Gelehrsamkeit mit Verantwortung. 1522 bereichert seine Bücherstiftung die Pforzheimer Kirchenbibliothek. Das Museum an der Schlosskirche erzählt heute von seinem Leben und Wirken.', 'Museum Johannes Reuchlin'],
   ['1455–1522','HUMANISM','Protecting books','The Pforzheim humanist Johannes Reuchlin opposes the destruction of Jewish writings.',
    'His defence of these books joins scholarship with responsibility. In 1522, his gift of books enriches Pforzheim’s church library. The museum beside the castle church explores his life and work.', 'Johannes Reuchlin Museum'])
 ],
 [
  story('stone','portus',
   ['244 N. CHR.','INSCHRIFT','Ein Stein trägt den Namen','Ein 1934 entdeckter Leugenstein aus dem Jahr 244 belegt den römischen Namen Portus.',
    'Solche Steine geben Entfernungen an. Der Fund datiert die unterste Schicht. Die kleine Säule in der Miniatur steht für dieses Zeugnis.', 'Stadt Pforzheim · Stadtgeschichte'],
   ['AD 244','INSCRIPTION','A stone preserves a name','A Roman distance stone from AD 244, discovered in 1934, records the name Portus.',
    'Such stones indicated distances between settlements. This find dates the bottom layer. The small column in the miniature represents this evidence.', 'City of Pforzheim · History']),
  story('vessel','portus',
   ['UM 90 N. CHR.','URSPRÜNGE','Am Übergang über die Enz','Um 90 n. Chr. entsteht an der Enz die römische Siedlung Portus, aus der Pforzheim hervorgeht.',
    'Der Fluss ist ein Ausgangspunkt der Stadtgeschichte. Lange vor Fabriken und Straßenbahnen entsteht hier ein Ort des Ankommens und des Austauschs. Ein gezeichnetes Vorratsgefäß erinnert an diesen Alltag.', 'Stadt Pforzheim · Stadtgeschichte'],
   ['C. AD 90','ORIGINS','At the crossing of the Enz','Around AD 90, the Roman settlement of Portus develops beside the Enz, at the origins of Pforzheim.',
    'The river is a starting point of the city’s history. Long before factories and trams, a place of arrival and exchange takes shape here. An illustrated storage vessel recalls that everyday life.', 'City of Pforzheim · History']),
  story('foundations','archaeology',
   ['RÖMISCHES PORTUS','ARCHÄOLOGIE','Unter der heutigen Stadt','Am Kappelhof sind Fundamente römischer Wohngebäude erhalten. Originalfunde erzählen vom Leben in Portus.',
    'Das Archäologische Museum verbindet die Funde mit dem Ort ihrer Geschichte. Die Gebäudereste und Gegenstände weisen auf Wohnkomfort und regen Warenverkehr hin. Die offenen Grundrisse der Miniatur machen diese verborgene Schicht sichtbar.', 'Archäologisches Museum Pforzheim'],
   ['ROMAN PORTUS','ARCHAEOLOGY','Beneath the city of today','Foundations of Roman homes survive at the Kappelhof. Original finds reveal everyday life in Portus.',
    'The Archaeological Museum connects these objects with their historical setting. Buildings and finds suggest comfortable living and active trade. The open floor plans in the miniature make this hidden layer visible.', 'Pforzheim Archaeological Museum'])
 ]
];

// The illustrated discoveries share the paper miniature’s materials and perspective.
export { artifactDrawing } from './cityArtifacts.js';
