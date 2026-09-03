/**
 * Jack Howlin Cinematic Universe — Character Definitions & Visual Directives
 */

export interface UniverseCharacter {
  id: string
  name: string
  title: string
  role: 'protagonist' | 'ally' | 'antagonist' | 'supporting' | 'enigmatic'
  archetype: string
  summary: string
  character: string
  visualStyleRationale: string
  facialActing: {
    standard: string
    underTension: string
    subtleCues: string
  }
  bodyLanguage: string
  avoid: string
  promptAnchor: string
  negativePrompt: string
  wardrobeAnchor: string
  physicalFeatures: string
  masterAssets?: {
    primaryReferenceUrl?: string
    localReferencePath?: string
    turnaroundPath?: string
  }
}

export const JACK_HOWLIN_UNIVERSE_CHARACTERS: UniverseCharacter[] = [
  {
    id: 'jack-howlin',
    name: "Jack Howlin'",
    title: 'De rusteloze hoofdpersoon',
    role: 'protagonist',
    archetype: 'The Restless Outlaw / Brooding Musician',
    summary: 'Gesloten, loyaal en koppig. Bewijst gevoelens door te blijven waar vertrekken makkelijker is.',
    character: 'Jack is gesloten, loyaal en koppig. Hij heeft moeite met mooie woorden en bewijst liever wat hij voelt door ergens te blijven wanneer vertrekken makkelijker zou zijn. Hij is geen agressieve outlaw, maar iemand die door ervaring heeft geleerd altijd eerst de ruimte en de mensen erin te beoordelen. Zijn kwetsbaarheid komt zelden rechtstreeks naar buiten; je ziet haar vooral in kleine stiltes.',
    visualStyleRationale: 'Zijn verweerde jas, donkere henley, volle baard en ongepolijste haar maken duidelijk dat hij niet bezig is met zijn imago. Kleding voelt gebruikt maar verzorgd aan. Brede, krachtige bouw contrasteert met rustig gedrag.',
    facialActing: {
      standard: 'Ernstig en nadenkend, blik gericht op de omgeving.',
      underTension: 'Kaak spant aan, wordt stiller, mond blijft strak gesloten.',
      subtleCues: 'Knijpt ogen licht samen bij wantrouwen, kijkt eerst opzij voor hij antwoordt. Zeldzame kleine asymmetrische glimlach.'
    },
    bodyLanguage: 'Beweegt langzaam en doelgericht. Leunt vaak tegen truck, muur of bar. Handen in jaszakken of los. Bij boosheid stiller en rechter. Bij Rosie ontspannen schouders.',
    avoid: 'Geen overdreven cowboygedrag, voortdurend fronsen, stoere poses, grote armgebaren of agressief wijzen.',
    promptAnchor: 'Jack Howlin, wearing a tan camel-brown heavy canvas work jacket with dual front chest flap pockets, charcoal grey unbuttoned cotton henley shirt, dark worn denim jeans, vintage boots, rugged full brown beard and mustache, chiseled masculine jawline, wavy brown hair',
    negativePrompt: 'cowboy hat cliché, aggressive screaming, exaggerated macho pose, clean modern suit, theatrical gestures',
    wardrobeAnchor: 'Tan camel-brown heavy canvas jacket, dark charcoal henley, worn denim',
    physicalFeatures: 'Rugged full brown beard, chiseled jawline, wavy brown hair',
    masterAssets: {
      turnaroundPath: 'projects/jack-core-set/jack_howlin_master_turnaround.jpg',
      localReferencePath: 'projects/jack-core-set/jack_howlin_multilevel_reference.jpg',
      primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-characters%2Fjack_howlin_master_turnaround.jpg'
    }
  },
  {
    id: 'rosie-ray',
    name: 'Rosie Ray',
    title: 'Warmte zonder zachtheid te spelen',
    role: 'ally',
    archetype: 'The Grounded Equal / Emotional Anchor',
    summary: 'Warm, opmerkzaam en emotioneel sterk. Eerlijk, praktisch en Jacks gelijke.',
    character: 'Rosie is warm, opmerkzaam en emotioneel sterk. Ze is vriendelijk, maar beslist niet naïef. Ze luistert werkelijk naar mensen en merkt daardoor dingen op die anderen missen. Ze probeert Jack niet te redden; ze verwacht dat hij zelf verantwoordelijkheid neemt. Haar liefde is praktisch: aanwezig zijn, eerlijk spreken en niet weglopen wanneer het ongemakkelijk wordt.',
    visualStyleRationale: 'Kastanjebruin haar, lichte sproeten en warme aardetinten geven natuurlijke toegankelijkheid. Het donkerrode overshirt maakt haar herkenbaar zonder romantisch cliché te worden.',
    facialActing: {
      standard: 'Warm en opmerkzaam met een heel kleine glimlach (begrijpt meer dan ze uitspreekt).',
      underTension: 'Glimlach verdwijnt, blijft Jack direct en kalm aankijken.',
      subtleCues: 'Zachte ogen met sterke blik. Trekt één wenkbrauw op bij ontwijkend gedrag. Gezicht wordt stil bij kwetsing.'
    },
    bodyLanguage: 'Staat stevig en ontspannen (gewicht op één been). Geen overdreven aanraking: hand tegen arm of schouder tegen Jack is genoeg. Blijft open en recht staan bij grenzen stellen.',
    avoid: 'Geen overdreven glamour, verleidelijke poses, constant glimlachen of hulpeloze reacties. Rosie is Jacks gelijke en geen decoratie.',
    promptAnchor: 'Rosie Ray, wearing a deep rustic dark red flannel overshirt, fitted dark charcoal tank top underneath, rugged high-waisted denim jeans, natural chestnut brown wavy hair, subtle freckles on nose and cheeks, warm expressive hazel eyes',
    negativePrompt: 'glamour model, heavy makeup, damsel in distress, provocative poses, helpless expression',
    wardrobeAnchor: 'Rustic dark red flannel overshirt, dark tank top, rugged denim',
    physicalFeatures: 'Chestnut brown wavy hair, light freckles, expressive hazel eyes',
    masterAssets: {
      turnaroundPath: 'projects/jack-core-set/rosie_ray_master_turnaround.jpg',
      localReferencePath: 'projects/jack-core-set/rosie_ray_master_turnaround.jpg',
      primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-characters%2Frosie_ray_master_turnaround.jpg'
    }
  },
  {
    id: 'silas-crowe',
    name: 'Sheriff Silas Crowe',
    title: 'Beheerste dreiging',
    role: 'antagonist',
    archetype: 'The Corrupted Law / Cold Authority',
    summary: 'Intelligent, geduldig en autoritair. Gelooft dat orde boven waarheid gaat.',
    character: 'Silas is intelligent, geduldig en autoritair. Hij gelooft dat orde belangrijker is dan waarheid en rechtvaardigt zijn eigen keuzes als noodzakelijk voor de stad. Hij verliest zelden openlijk zijn beheersing. Juist doordat hij beleefd kan blijven terwijl hij iemand bedreigt, voelt hij gevaarlijk.',
    visualStyleRationale: 'Lang, mager silhouet en donkere jas geven iets scherps en onverbiddelijks. Doffe oude badge toont een onaantastbaar, verweerd systeem. Nette haar en snor tonen controlezucht.',
    facialActing: {
      standard: 'Koud, neutraal en beheerst (nauwelijks zichtbare neerwaartse mondhoek).',
      underTension: 'Klein, bijna tevreden glimlachje wanneer iemand liegt of zwakheid toont.',
      subtleCues: 'Kijkt mensen lang aan zonder te knipperen; kijkt vanuit ooghoeken zonder hoofd te draaien.'
    },
    bodyLanguage: 'Kaarsrecht, handen achter de rug of rustig bij de riem. Langzame, gecontroleerde stappen. Dringt persoonlijke ruimte binnen zonder aan te raken.',
    avoid: 'Geen schreeuwende sheriff, geen brede grijns, niet constant naar pistool grijpen of wild bewegen.',
    promptAnchor: 'Sheriff Silas Crowe, tall lean sharp silhouette, tailored dark charcoal wool sheriff coat, tarnished weathered matte brass sheriff star badge, slicked neat dark hair with grey temples, trimmed precision mustache, piercing cold steely gaze',
    negativePrompt: 'screaming, wide evil grin, comic villain, cartoonish sheriff, exaggerated weapon waving',
    wardrobeAnchor: 'Dark charcoal wool coat, tarnished brass badge, pressed dark trousers',
    physicalFeatures: 'Tall lean silhouette, precision mustache, slicked grey-templed dark hair',
    masterAssets: {
      turnaroundPath: 'projects/jack-core-set/silas_crowe_master_turnaround.jpg',
      localReferencePath: 'projects/jack-core-set/silas_crowe_master_turnaround.jpg',
      primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-characters%2Fsilas_crowe_master_turnaround.jpg'
    }
  },
  {
    id: 'mae-bell-carter',
    name: 'Mae Bell Carter',
    title: 'Praktische daadkracht',
    role: 'ally',
    archetype: 'The Pragmatic Mechanic / Direct Confidante',
    summary: 'Direct, technisch slim en zelfstandig. Beoordeelt mensen op daden, niet op woorden.',
    character: 'Mae is direct, technisch slim en zelfstandig. Ze beoordeelt mensen op wat ze doen, niet op wat ze beloven. Haar humor is droog en soms scherp, maar zelden gemeen. Ze helpt Jack omdat ze hem kent, niet omdat ze alles wat hij doet goedkeurt.',
    visualStyleRationale: 'Sterke armen, opgerolde mouwen en werkoverall vertellen dat ze met haar handen werkt. Vetvlekken subtiel en logisch. Klein litteken door wenkbrauw geeft karakter.',
    facialActing: {
      standard: 'Geconcentreerd en droog met licht samengeknepen ogen.',
      underTension: 'Stopt volledig met werken en kijkt zwijgend met volle focus aan.',
      subtleCues: 'Kijkt eerst naar machine/probleem, dan naar de persoon. Glimlach in één mondhoek.'
    },
    bodyLanguage: 'Beweegt efficiënt, heeft zelden lege handen (veegt handen af aan rode doek, controleert gereedschap). Draait hele lichaam om als het serieus is.',
    avoid: 'Geen overdreven sexy monteur, geen perfecte fotomodellen-make-up, geen komische overdaad aan motorolie.',
    promptAnchor: 'Mae Bell Carter, athletic capable build, heavyweight indigo denim mechanics boiler-suit coverall with rolled-up sleeves, red shop rag in back pocket, tied-back messy auburn hair, distinct scar cutting through left eyebrow, focused expression',
    negativePrompt: 'glamour makeup, pinup girl, fake mechanic, exaggerated dirty face, comic tropes',
    wardrobeAnchor: 'Indigo denim mechanics overall, red shop rag, heavy leather boots',
    physicalFeatures: 'Auburn tied-back hair, scar through left eyebrow, athletic build',
    masterAssets: {
      turnaroundPath: 'projects/jack-core-set/mae_bell_carter_master_turnaround.jpg',
      localReferencePath: 'projects/jack-core-set/mae_bell_carter_master_turnaround.jpg',
      primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-characters%2Fmae_bell_carter_master_turnaround.jpg'
    }
  },
  {
    id: 'june-holloway',
    name: 'June Holloway',
    title: 'De stille waarnemer',
    role: 'supporting',
    archetype: 'The Motel Gatekeeper / Information Broker',
    summary: 'Elegant, scherpzinnig en uiterst discreet. Bewaakt geheimen en laat stiltes vallen.',
    character: 'June is elegant, scherpzinnig en extreem discreet. Ze stelt weinig vragen omdat ze meestal al weet wat er gebeurd is. Ze beschermt de mensen die haar vertrouwen, maar informatie is bij haar nooit helemaal gratis. June spreekt beheerst en laat stiltes bewust vallen totdat de ander ze probeert op te vullen.',
    visualStyleRationale: 'Petrolblauw, zwart en verweerd goud geven een neon-noiridentiteit. Kleding uit een betere tijd van het motel. Zilveren lokken zichtbaar. Motelkamersleutel aan riem.',
    facialActing: {
      standard: 'Beleefd, observant en onderzoekend.',
      underTension: 'Eén subtiel opgetrokken wenkbrauw; zelfbeheersing hapert alleen bij echte bezorgdheid.',
      subtleCues: 'Scant eerst het gezicht en daarna de handen. Glimlacht zelden volledig warm.'
    },
    bodyLanguage: 'Rustig, rechtop en geruisloos. Legt voorwerpen exact op hun plaats. Leunt met beide handen op de balie bij serieuze gesprekken. Raakt zelden iemand aan.',
    avoid: 'Geen overdreven femme fatale, geen sigaret in iedere scène, geen zware glamour of mysterieus lachen.',
    promptAnchor: 'June Holloway, mature dignified poise, dark hair with visible silver streaks swept back elegantly, tailored petroleum-teal blouse, dark vest, weathered brass vintage motel room key pinned to belt, sharp analytical eyes',
    negativePrompt: 'femme fatale cliché, cigarette smoking pose, heavy theatrical makeup, giggling, melodramatic',
    wardrobeAnchor: 'Petroleum-teal blouse, structured dark vest, brass motel key',
    physicalFeatures: 'Silver-streaked dark hair, mature dignified face, sharp observant eyes',
    masterAssets: {
      turnaroundPath: 'projects/jack-core-set/june_holloway_master_turnaround.jpg',
      localReferencePath: 'projects/jack-core-set/june_holloway_master_turnaround.jpg',
      primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-characters%2Fjune_holloway_master_turnaround.jpg'
    }
  },
  {
    id: 'cole-ransom',
    name: 'Cole Ransom',
    title: 'Zorgvuldig ontworpen rebellie',
    role: 'antagonist',
    archetype: 'The Commercialized Outlaw / Polished Rival',
    summary: 'Ambitieus, charmant en competitief. Heeft talent maar maakt ieder deel verkoopbaar.',
    character: 'Cole is ambitieus, charmant en competitief. Hij is niet volledig nep: hij heeft talent en werkt hard, maar hij heeft geleerd ieder deel van zichzelf verkoopbaar te maken. Hij bewondert Jacks authenticiteit en voelt zich er tegelijkertijd door bedreigd. Cole wil altijd geliefd worden én de belangrijkste persoon in de ruimte zijn.',
    visualStyleRationale: 'Outlaw-stijl maar duurder, schoner en perfect passend. Zwart suède, borduursel en gepolijst zilver tonen samengestelde ruigheid. Meticuleus gestyled uiterlijk.',
    facialActing: {
      standard: 'Charmant, breed en fotogeniek (verdwijnt snel zodra camera weg is).',
      underTension: 'Glimlach blijft gefixeerd terwijl kaak aanspant en ogen koud worden.',
      subtleCues: 'Lang oogcontact om zelfvertrouwen te veinzen, subtiel spottend trekje rond de mond.'
    },
    bodyLanguage: 'Neemt ruimte in (benen uit elkaar, schouders open, kin omhoog). Raakt mensen gemakkelijk aan. Controleert kleding en haar in spiegels.',
    avoid: 'Geen platte slechterik of talentloze poser. Cole moet geloofwaardig getalenteerd en aantrekkelijk zijn.',
    promptAnchor: 'Cole Ransom, handsome sharp features, meticulously groomed designer stubble, perfectly styled dark wavy hair, designer black suede outlaw jacket with intricate dark tonal western embroidery, crisp black denim shirt, polished sterling silver belt buckle',
    negativePrompt: 'ugly villain, clownish pose, untalented poser, messy unkempt clothes',
    wardrobeAnchor: 'Designer black suede western jacket, crisp black shirt, sterling silver buckle',
    physicalFeatures: 'Pristine groomed stubble, styled dark hair, sharp handsome features',
    masterAssets: {
      turnaroundPath: 'projects/jack-core-set/cole_ransom_master_turnaround.jpg',
      localReferencePath: 'projects/jack-core-set/cole_ransom_master_turnaround.jpg',
      primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-characters%2Fcole_ransom_master_turnaround.jpg'
    }
  },
  {
    id: 'hank-mercer',
    name: 'Hank "Blacktop" Mercer',
    title: 'Betrouwbare zwaarte',
    role: 'ally',
    archetype: 'The Road Veteran / Fatherly Anchor',
    summary: 'Loyaal, nuchter en vaderlijk. Ontlaadt spanning met grappen maar praat nooit over eigen pijn.',
    character: 'Hank is loyaal, nuchter en vaderlijk zonder sentimenteel te worden. Hij praat graag, maar nooit rechtstreeks over zijn eigen gevoelens. Zijn grappen ontladen spanning en beschermen hem tegelijkertijd tegen moeilijke gesprekken. Als Hank zegt dat hij komt, hoef je niet te vragen hoe laat: hij verschijnt gewoon.',
    visualStyleRationale: 'Brede, zware bouw en gebruikte werkkleding geven gewicht. Oude kracht die nog steeds stevig staat. Groen vest en rode flannel geven warmte. Oude trucksleutel verbindt verleden.',
    facialActing: {
      standard: 'Vriendelijk en vermoeid met gemakkelijke halve glimlach.',
      underTension: 'Kijkt weg naar een voorwerp, perst lippen samen en ademt door de neus.',
      subtleCues: 'Vriendelijke ogen vol levenservaring; glimlach verdwijnt direct bij vragen over het verleden.'
    },
    bodyLanguage: 'Iets zware loop, rolt schouders los. Staat met handen op heupen of duimen achter riem. Geeft stevige schouderkloppen. Gaat zwijgend naast Jack zitten.',
    avoid: 'Geen domme komische sidekick. Hank is een doorgewinterde veteraan en bewaker van geheimen.',
    promptAnchor: 'Hank Blacktop Mercer, broad-shouldered heavy burly build, weathered salt-and-pepper full beard, heavy forest-green insulated work vest over a worn red buffalo check flannel shirt, heavyweight canvas pants, tired kind eyes, vintage truck key ring',
    negativePrompt: 'clumsy comic relief, foolish, modern activewear, weak fragile look',
    wardrobeAnchor: 'Forest green work vest, red buffalo check flannel, canvas work pants',
    physicalFeatures: 'Heavy burly build, salt-and-pepper beard, kind weathered eyes',
    masterAssets: {
      turnaroundPath: 'projects/jack-core-set/hank_mercer_master_turnaround.jpg',
      localReferencePath: 'projects/jack-core-set/hank_mercer_master_turnaround.jpg',
      primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-characters%2Fhank_mercer_master_turnaround.jpg'
    }
  },
  {
    id: 'lila-quinn',
    name: 'Lila Quinn',
    title: 'Intimiteit op afstand',
    role: 'supporting',
    archetype: 'The Night Radio Voice / Story Collector',
    summary: 'Nieuwsgierig, intelligent en snel. Creëert nabijheid met haar stem maar blijft zelf ongrijpbaar.',
    character: 'Lila is nieuwsgierig, intelligent en verbaal snel. Ze kan met haar stem nabijheid creëren, terwijl ze persoonlijk juist moeilijk toegankelijk blijft. Ze verzamelt verhalen van anderen omdat ze haar eigen verhaal liever buiten beeld houdt. Haar band met Jack bestaat uit woorden, muziek en dingen die beiden bewust niet vragen.',
    visualStyleRationale: 'Mosterdgoud en oxblood geven nachtelijke warmte. Kort zwart haar met koperlok maakt haar direct herkenbaar. Vintage studiokoptelefoon rond de hals.',
    facialActing: {
      standard: 'Nieuwsgierig en scherp (ogen worden groter bij interesse).',
      underTension: 'Speelt met ring aan hand, luistert intenser, mondhoek trekt kort omhoog.',
      subtleCues: 'Sluit soms haar ogen achter de microfoon om dieper te luisteren.'
    },
    bodyLanguage: 'Subtiele handgebaren bij gedachten, draait aan ring, tikt mee op tafel. Voorovergebogen naar de microfoon. Buiten studio sneller handen in zakken.',
    avoid: 'Geen overdreven verleidelijke radiostem, geen constant geflirt of hyperactief influencer-gedrag.',
    promptAnchor: 'Lila Quinn, short textured black bob hairstyle with a single distinct copper-amber dyed streak, mustard-gold knitted sweater or oxblood vintage jacket, dark corduroy pants, vintage broadcast headphones around neck, observant bright dark eyes',
    negativePrompt: 'overly seductive pose, shallow influencer, modern popstar, hyperactive expressions',
    wardrobeAnchor: 'Mustard-gold sweater, oxblood jacket, vintage headphones',
    physicalFeatures: 'Black bob with copper-amber streak, observant dark eyes',
    masterAssets: {
      turnaroundPath: 'projects/jack-core-set/lila_quinn_master_turnaround.jpg',
      localReferencePath: 'projects/jack-core-set/lila_quinn_master_turnaround.jpg',
      primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-characters%2Flila_quinn_master_turnaround.jpg'
    }
  },
  {
    id: 'gideon-pike',
    name: 'Gideon Pike',
    title: 'Absolute controle',
    role: 'enigmatic',
    archetype: 'The Methodical Tracker / Enigmatic Enforcer',
    summary: 'Gedisciplineerd, methodisch en emotioneel onleesbaar. Zoekt patronen in plaats van chaos.',
    character: 'Gideon is gedisciplineerd, methodisch en emotioneel vrijwel onleesbaar. Hij vindt mensen door patronen te begrijpen, niet door wild achter ze aan te jagen. Hij is niet wreed voor zijn plezier en gebruikt nooit meer geweld dan noodzakelijk. Daardoor blijft onduidelijk of hij vijand, professional of mogelijke bondgenoot is.',
    visualStyleRationale: 'Compacte functionele bouw. Geschoren hoofd, litteken op kaak en wenkbrauw geven hard silhouet zonder monsterlijk te zijn. Weerbestendige reiskleding en vintage kompas.',
    facialActing: {
      standard: 'Volledig neutraal en alert. Ogen bewegen vaker dan zijn hoofd.',
      underTension: 'Knippert eenmaal langzaam bij cruciale info; kaken spannen aan en ademhaling verstilt.',
      subtleCues: 'Geen overbodige mimiek, scant continu deuren en handen.'
    },
    bodyLanguage: 'Nooit met rug naar ingang. Stille, gelijkmatige passen. Houdt afstand en raakt niets aan zonder reden. Staat altijd zijwaarts klaar voor reactie.',
    avoid: 'Geen brute huurmoordenaar, geen comic superheld, geen constant gegrom of zwaaien met wapens.',
    promptAnchor: 'Gideon Pike, shaved buzzcut head, damaged left eyebrow with small scar tissue, sharp scar along jawline, athletic functional build, dark charcoal-grey weather-resistant field jacket, slate utility layers, brass vintage lensatic compass, calculated cold eyes',
    negativePrompt: 'muscle-bound brute, roaring, comic superhero, excessive weapons, wild expressions',
    wardrobeAnchor: 'Charcoal field jacket, slate utility wear, vintage brass compass',
    physicalFeatures: 'Shaved head, scar through left eyebrow and jawline, calculated eyes',
    masterAssets: {
      turnaroundPath: 'projects/jack-core-set/gideon_pike_master_turnaround.jpg',
      localReferencePath: 'projects/jack-core-set/gideon_pike_master_turnaround.jpg',
      primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-characters%2Fgideon_pike_master_turnaround.jpg'
    }
  },
  {
    id: 'ruby-cade',
    name: 'Ruby Cade',
    title: 'Vuur met discipline',
    role: 'ally',
    archetype: 'The Uncompromising Rock Rebel / Fiery Equal',
    summary: 'Uitgesproken, trots en creatief compromisloos. Zegt wat Jack inslikt en beschermt haar onafhankelijkheid.',
    character: 'Ruby is uitgesproken, trots en creatief compromisloos. Ze zegt wat Jack meestal inslikt en weigert zichzelf kleiner te maken om anderen gerust te stellen. Onder haar zelfvertrouwen zit iemand die bang is opnieuw afhankelijk te worden van een ander. Ze respecteert Jack, maar zal hem nooit zomaar gelijk geven.',
    visualStyleRationale: 'Koperrood haar en bordeauxrode leren jas geven onmiddellijk silhouet van vuur en artistieke vrijheid. Kleding met patina en podiumkracht.',
    facialActing: {
      standard: 'Zelfverzekerd en uitdagend, houdt direct oogcontact.',
      underTension: 'Ogen verscherpen, mond wordt volledig stil en strak.',
      subtleCues: 'Lacht groot en oprecht bij echte humor; kijkt scherp bij artistieke onechtheid.'
    },
    bodyLanguage: 'Open en stevige houding, hand op heup of duim achter riem. Beweegt krachtig op het podium. Verkleint afstand naar Jack om uit te dagen; draait weg bij kwetsbaarheid.',
    avoid: 'Geen jaloerse ex, geen eendimensionale cliché badass of verleidelijke stoorzender.',
    promptAnchor: 'Ruby Cade, vibrant copper-red wavy hair, fierce green/hazel eyes, sharp angular facial structure, distressed bordeaux-wine red leather biker jacket with worn patina, vintage black graphic top, dark fitted denim, silver turquoise rings, rock and roll stage presence',
    negativePrompt: 'jealous ex trope, pop diva, glossy modern outfit, helpless damsel, artificial glam',
    wardrobeAnchor: 'Bordeaux-red worn leather biker jacket, vintage black top, turquoise rings',
    physicalFeatures: 'Vibrant copper-red hair, sharp angular face, fierce hazel eyes',
    masterAssets: {
      turnaroundPath: 'projects/jack-core-set/ruby_cade_master_turnaround.jpg',
      localReferencePath: 'projects/jack-core-set/ruby_cade_master_turnaround.jpg',
      primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-characters%2Fruby_cade_master_turnaround.jpg'
    }
  },
  {
    id: 'abel-graves',
    name: 'Abel Graves',
    title: 'Onnatuurlijke stilte zonder bovennatuurlijk te worden',
    role: 'enigmatic',
    archetype: 'The Living Shadow / Ghost of Guilt',
    summary: 'Stil, beleefd en moeilijk te plaatsen. Verontrustend door stilte, timing en aanwezigheid.',
    character: 'Abel is stil, beleefd en moeilijk te plaatsen. Hij lijkt niet bang, boos of gehaast en stelt eenvoudige vragen die onverwacht persoonlijk binnenkomen. Hij kan een echte jongeman uit Jacks verleden zijn, een herinnering of een visuele verbeelding van schuld. Het universum hoeft dat nooit volledig te bevestigen.',
    visualStyleRationale: 'Lang, mager lichaam en te grote grijze jas maken kwetsbaar en verontrustend. Vale stoffen gaan op in motels en wegen. Blauwe sjaal is het herkenningspunt, zakhorloge tikt met het lot.',
    facialActing: {
      standard: 'Afwezig, kalm en tijdloos met zeldzaam knipperen.',
      underTension: 'Bijna geen verandering; zeldzame kleine melancholische glimlach.',
      subtleCues: 'Kijkt in groepen niet naar de spreker maar naar degene over wie werkelijk gesproken wordt.'
    },
    bodyLanguage: 'Opvallend stil, armen los. Loopt langzaam maar is er sneller dan verwacht. Raakt zakhorloge aan zonder te kijken. Verdwijnt zonder visuele effecten.',
    avoid: 'Geen spoken, horrorogen, vampieren of jumpscares. Abel is 100% menselijk en tastbaar.',
    promptAnchor: 'Abel Graves, tall slender frame, pale contemplative face, hauntingly calm melancholic eyes, oversized faded grey wool overcoat, dust-grey collared shirt, distinct dusty blue knit scarf around neck, vintage pocket watch chain',
    negativePrompt: 'supernatural glowing eyes, transparent ghost, zombie, horror monster, jumpscare elements',
    wardrobeAnchor: 'Oversized grey wool overcoat, dusty blue knit scarf, pocket watch chain',
    physicalFeatures: 'Tall slender frame, pale contemplative face, melancholic eyes',
    masterAssets: {
      turnaroundPath: 'projects/jack-core-set/abel_graves_master_turnaround.jpg',
      localReferencePath: 'projects/jack-core-set/abel_graves_master_turnaround.jpg',
      primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-characters%2Fabel_graves_master_turnaround.jpg'
    }
  }
]

export function getCharacterById(id: string): UniverseCharacter | undefined {
  return JACK_HOWLIN_UNIVERSE_CHARACTERS.find(c => c.id === id)
}
