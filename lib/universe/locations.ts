/**
 * Jack Howlin Cinematic Universe — Locations & Canonical Objects
 */

export interface UniverseSubLocation {
  id: string
  name: string
  subtitle: string
  description: string
  lore: string
  visualIdentity: string[]
  mood: string
  promptAnchor: string
  colorPalette: string[]
  masterAssets?: {
    turnaroundPath?: string
    primaryReferenceUrl?: string
  }
}

export interface UniverseLocation {
  id: string
  name: string
  subtitle: string
  summary: string
  history: string
  subLocations: UniverseSubLocation[]
}

export interface CanonicalObject {
  id: string
  name: string
  associatedEntity: string
  loreMeaning: string
  promptAnchor: string
  category: 'prop' | 'wardrobe' | 'environmental' | 'relic'
}

export const MIDNIGHT_MIRAGE_MOTEL: UniverseLocation = {
  id: 'midnight-mirage-motel',
  name: 'Midnight Mirage Motel',
  subtitle: 'Het motel dat alleen ’s nachts bestaat',
  summary: 'Een 1958 roadside motel langs een verlaten snelwegstrook in de woestijn. Overdag een vervallen zonverbrand skelet, ’s nachts een neon-verlicht toevluchtsoord en een tijdsanomalie.',
  history: 'Gebouwd in 1958 door ex-muzikant Silas Vale. Sinds zijn verdwijning in 1987 blijft het turquoise-rode neonbord branden zonder dat bekend is wie de stroomrekening betaalt.',
  subLocations: [
    {
      id: 'motel-exterior',
      name: 'De Buitenkant',
      subtitle: 'Het motel dat alleen ’s nachts bestaat',
      description: 'Verweerde laagbouw met turquoise muren, roestsporen en een verroeste metalen galerij. Een groot turquoise en rood neonbord met een dubbel knipperende ster.',
      lore: 'Vanaf de snelweg lijkt het dichterbij dan het is. Parkeerplaats herbergt mysterieuze auto’s met warme motoren en een zwarte pick-up die verdwijnt zonder sporen.',
      visualIdentity: [
        'Verweerde laagbouw met lange galerij',
        'Fletse turquoise muren met roodbruine roestsporen',
        'Groot turquoise-rood neonbord MIDNIGHT MIRAGE MOTEL',
        'Leeg dichtgestoven zwembad',
        'Gebarsten asfalt en open woestijn met telegraafpalen',
        'Onregelmatig zoemende buitenlamp'
      ],
      mood: 'Tegelijk uitnodigend en verdacht. De stilte suggereert dat je beter had kunnen doorrijden.',
      promptAnchor: 'Atmospheric 35mm cinematic film still of the Midnight Mirage Motel at night, glowing turquoise and deep crimson red neon signage buzzing in the dark desert, 1958 weathered low-rise roadside motel, rusted metal exterior balcony walkway, cracked asphalt parking lot, empty concrete pool filled with dust, lonely desert highway and wooden telephone poles stretching into black horizon, Kodak 500T grain, cinematic noir lighting',
      colorPalette: ['#2A9D8F (Turquoise)', '#8B0000 (Crimson Red)', '#D4A373 (Nicotine Yellow)', '#0A0A0A (Deep Black)'],
      masterAssets: {
        turnaroundPath: 'projects/jack-core-set/midnight_mirage_exterior_master.jpg',
        primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-locations%2Fmidnight_mirage_exterior_master.jpg'
      }
    },
    {
      id: 'motel-reception',
      name: 'De Receptie',
      subtitle: 'Waar niemand zijn echte naam opgeeft',
      description: 'Lage houten lobby met zware eiken balie, sleutelrek, dik gastenboek uit 1958 en een klok die permanent stilstaat op 03:17.',
      lore: 'Bemand door Mara, die ook op foto’s uit 1962 en 1981 staat. Onder de balie zit een verborgen knop die het buitenneon direct dooft bij ongewenst bezoek.',
      visualIdentity: [
        'Massieve houten receptiebalie met messing bel',
        'Rek met messing kamersleutels (6, 12 en 17 ontbreken)',
        'Dik gastenboek met terugkerende handschriften',
        'Wandklok permanent bevroren op 03:17',
        'Langzaam draaiende stoffige ventilator',
        'Warm amberkleurig licht gekruist door turquoise neonstrepen door de jaloezieën'
      ],
      mood: 'Het zenuwcentrum van het motel. Hier worden tijdelijke schuilplaatsen toegewezen aan mensen die geheimen meedragen.',
      promptAnchor: 'Moody 35mm film still inside the vintage Midnight Mirage Motel front desk lobby, heavy worn wooden counter with brass room key rack behind it, thick antique open guestbook with pen on chain, stopped mechanical wall clock stuck at 03:17, slow rotating dusty ceiling fan, warm amber lamp light cut through by horizontal turquoise neon streaks through dusty window blinds, quiet moody motel noir atmosphere, 35mm film texture',
      colorPalette: ['#E9C46A (Warm Amber)', '#264653 (Deep Teal)', '#4A3B32 (Dark Oak)', '#D62828 (Faded Red)'],
      masterAssets: {
        turnaroundPath: 'projects/jack-core-set/midnight_mirage_reception_master.jpg',
        primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-locations%2Fmidnight_mirage_reception_master.jpg'
      }
    },
    {
      id: 'hallway-room-17',
      name: 'De Smalle Gang & Kamer 17',
      subtitle: 'De deur die herinneringen bewaart',
      description: 'Onnatuurlijk smalle gang met donkerrood tapijt die leidt naar Kamer 17, afgesloten door een donkerrode deur met een scheef messing nummer 17.',
      lore: 'Bestaat niet op officiële bouwtekeningen. Voor de deur hoort men persoonlijke stemmen en echo’s uit het verleden. Binnen verschijnt de plek van een fatale levenskeuze. Wie na zonsopgang blijft, wordt door de buitenwereld vergeten.',
      visualIdentity: [
        'Zeer smalle benauwende gang met hellende vloer',
        'Versleten donkerrood tapijt',
        'Zwakke honingkleurige wandlampen',
        'Lang leeg stuk muur tussen kamer 16 en 17',
        'Donkerrode deur met meerdere afgebladderde verflagen',
        'Scheefhangend messing nummer 17 (de 7 hangt lager)',
        'Smal strookje turquoise neonlicht onder de deurspleet'
      ],
      mood: 'Beklemmend en melancholisch. Vertegenwoordigt spijt, herinneringen en het verlangen om in het verleden te blijven.',
      promptAnchor: 'Claustrophobic narrow motel hallway at night leading to Room 17, worn dark red patterned carpet, dim honey-amber wall sconces, long empty textured wall leading to a dark weathered red door with peeling paint layers, crooked tarnished brass numerals 17, thin sliver of cyan-turquoise neon light glowing from beneath the door gap, heavy psychological tension, cinematic 35mm mystery noir',
      colorPalette: ['#6B0504 (Blood Red)', '#F4A261 (Honey Amber)', '#2A9D8F (Cyan Underglow)', '#1D1E18 (Shadow Grey)'],
      masterAssets: {
        turnaroundPath: 'projects/jack-core-set/midnight_mirage_hallway_room17_master.jpg',
        primaryReferenceUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/universe-locations%2Fmidnight_mirage_hallway_room17_master.jpg'
      }
    }
  ]
}

export const CANONICAL_UNIVERSE_OBJECTS: CanonicalObject[] = [
  {
    id: 'room-17-key',
    name: 'Sleutel van Kamer 17',
    associatedEntity: 'Midnight Mirage Motel / Jack Howlin',
    loreMeaning: 'Zware messing sleutel die toegang geeft tot de herinneringen-kamer. Verschijnt spontaan in jaszakken van wie er moet zijn.',
    promptAnchor: 'tarnished heavy brass diamond-shaped motel keychain stamped with room number 17, vintage patina',
    category: 'relic'
  },
  {
    id: 'clock-0317',
    name: 'Stilstaande Klok (03:17)',
    associatedEntity: 'Receptie (Mara)',
    loreMeaning: 'Symbool voor de bevroren tijd van het Midnight Mirage universum. De nacht die niet vordert.',
    promptAnchor: 'vintage circular analog wall clock permanently frozen at 3:17 with aged cream face and black Roman numerals',
    category: 'environmental'
  },
  {
    id: 'guestbook-1958',
    name: 'Het 1958 Gastenboek',
    associatedEntity: 'Receptie (Mara)',
    loreMeaning: 'Het enige blijvende bewijs van wie het motel ooit bezocht; namen blijven hier staan zelfs als de buitenwereld je vergeet.',
    promptAnchor: 'thick vintage leatherbound motel register ledger, yellowed heavy paper pages filled with handwritten entries and fountain pen ink',
    category: 'relic'
  },
  {
    id: 'silas-badge',
    name: 'Doffe Sheriffster',
    associatedEntity: 'Sheriff Silas Crowe',
    loreMeaning: 'Vertegenwoordigt een autoritair, verweerd en onaantastbaar rechtssysteem.',
    promptAnchor: 'tarnished weathered matte brass six-point star sheriff badge pinned to dark wool coat',
    category: 'wardrobe'
  },
  {
    id: 'hank-truck-key',
    name: 'Oude Trucksleutel',
    associatedEntity: 'Hank "Blacktop" Mercer',
    loreMeaning: 'Tastbare herinnering aan miljoenen kilometers asfalt en een zwaar verleden.',
    promptAnchor: 'worn vintage heavy brass truck ignition key on a tarnished circular key ring',
    category: 'prop'
  },
  {
    id: 'mae-shop-rag',
    name: 'Rode Werkdoek',
    associatedEntity: 'Mae Bell Carter',
    loreMeaning: 'Praktisch vakmanschap, eerlijkheid en fysieke arbeid.',
    promptAnchor: 'grease-stained red cotton shop rag hanging from indigo mechanic coverall pocket',
    category: 'prop'
  },
  {
    id: 'gideon-compass',
    name: 'Vintage Lensatic Kompas',
    associatedEntity: 'Gideon Pike',
    loreMeaning: 'De methodische drang naar controle en vaste richting in een chaotische wereld.',
    promptAnchor: 'antique weathered brass lensatic pocket compass with black dial and military lanyard',
    category: 'prop'
  },
  {
    id: 'abel-pocket-watch',
    name: 'Zilveren Zakhorloge',
    associatedEntity: 'Abel Graves',
    loreMeaning: 'Het ongrijpbare verstrijken van tijd, schuld en herinneringen.',
    promptAnchor: 'faded vintage silver pocket watch on a delicate tarnished chain leading into vest pocket',
    category: 'prop'
  },
  {
    id: 'lila-headphones',
    name: 'Vintage Studiokoptelefoon',
    associatedEntity: 'Lila Quinn',
    loreMeaning: 'Intimiteit op afstand; de stem die de eenzame nacht verbindt.',
    promptAnchor: 'vintage classic studio broadcast monitoring headphones with coiled black cable resting around neck',
    category: 'prop'
  },
  {
    id: 'june-motel-key',
    name: 'Motelkamersleutel aan Riem',
    associatedEntity: 'June Holloway',
    loreMeaning: 'Toegang tot alle kamers, geheimen en verhalen van het motel.',
    promptAnchor: 'heavy brass motel room key with vintage numbered tag clipped to leather belt',
    category: 'wardrobe'
  },
  {
    id: 'jack-canvas-jacket',
    name: 'Verweerde Camel Canvas Werkjas',
    associatedEntity: 'Jack Howlin',
    loreMeaning: 'Jaren van trouw, weerstand en overleven zonder concessies.',
    promptAnchor: 'tan camel-brown heavy canvas work jacket with dual front chest flap pockets, worn patina and vintage creases',
    category: 'wardrobe'
  },
  {
    id: 'rosie-red-overshirt',
    name: 'Donkerrood Overshirt',
    associatedEntity: 'Rosie Ray',
    loreMeaning: 'Warmte, standvastigheid en praktische liefde.',
    promptAnchor: 'rustic dark red flannel or corduroy overshirt over a dark charcoal tank top',
    category: 'wardrobe'
  }
]
