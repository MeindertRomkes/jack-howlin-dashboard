import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { adminDb } from '../lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

async function sanitizeReport() {
  console.log('Sanitizing system/intelligence_report in Firestore...')
  
  const cleanReport = {
    summary: "Jack's shorts met highway- en roadside-visuals in combinatie met directe bas-heavy intros behalen de hoogste retentie (84%). 'Hate Me All You Want' en 'I Still Wear This Crown' domineren de Spotify groei (+24.1%).",
    winningHooks: [
      {
        hookTitle: 'Midnight Highway Footage + Bass Drop',
        description: 'Taps into late-night drive psychological triggers. High dynamic range between ambient highway visuals and the heavy bass drop drives 1,420 TikTok shares.',
        effectivenessMultiplier: '3.2x Kijktijd',
        exampleScene: 'Gele koplampen op nat asfalt met flitsende tekst: "They talked. I kept riding."',
      },
      {
        hookTitle: 'Dusty Cowboy Hat Silhouette Reveal',
        description: 'Leverages iconic Outlaw Americana minimalism. Instant acoustic intro establishes emotional intimacy within the first 1.5s.',
        effectivenessMultiplier: '2.4x Reactieratio',
        exampleScene: 'Langzame opwaartse tilt naar Jack met de hoed laag over de ogen: "I still wear this crown."',
      },
      {
        hookTitle: 'Saloon Acoustic Porch Jam',
        description: 'Authentieke acoustic solo performance in warm amber tegenlicht voor maximale comment interactie.',
        effectivenessMultiplier: '1.9x Save Ratio',
        exampleScene: 'Close-up op de akoestische fretboard met vintage Shure microfoon in studio rook.',
      },
    ],
    contentFatigueAlerts: [
      'Statische albumhoezen zonder beweging verliezen 60% van kijkers in de eerste 3 seconden. Gebruik altijd video/motion visualizers.',
      'Lange video introducties zonder gezicht of instrument binnen 2 seconden zorgen voor hoge drop-off.',
    ],
    bestPostingWindows: [
      {
        platform: 'youtube',
        bestDay: 'Woensdag & Vrijdag',
        bestTime: '19:30 - 21:00 CET',
        reason: 'Hoogste engagementpiek onder Americana luisteraars na werktijd.',
      },
      {
        platform: 'instagram',
        bestDay: 'Donderdag & Zondag',
        bestTime: '20:00 - 22:00 CET',
        reason: 'Reels saves en shares pieken op zondagavond.',
      },
      {
        platform: 'tiktok',
        bestDay: 'Dinsdag & Vrijdag',
        bestTime: '18:00 - 20:00 CET',
        reason: 'Hoogste algorithmic velocity voor outlaw country hashtags.',
      },
    ],
    trackMomentumRadar: [
      {
        trackTitle: 'Hate Me All You Want',
        momentumStatus: 'surging',
        growthNote: '+18.5% streams deze week, sterke save-ratio op Spotify (Populariteit: 64/100).',
        actionRecommendation: 'Lanceer een gerichte merch post (Statement T-shirt) gekoppeld aan deze track.',
      },
      {
        trackTitle: 'I Still Wear This Crown',
        momentumStatus: 'surging',
        growthNote: '+24.1% TikTok views, resonantie rond de cowboyhoed als symbool.',
        actionRecommendation: 'Maak een 15s lyric video met focus op resilience en doorzettingsvermogen.',
      },
      {
        trackTitle: 'Midnight Mirage Motel',
        momentumStatus: 'steady',
        growthNote: 'Constante organische streams in late-night playlists.',
        actionRecommendation: 'Post een stemmige studio breakdown clip.',
      },
      {
        trackTitle: 'Gravel Road Confessions',
        momentumStatus: 'needs_boost',
        growthNote: 'Stabiele streams maar lage social buzz.',
        actionRecommendation: 'Deel een akoestische snippet of storytelling clip over de oorsprong van de song.',
      },
    ],
    actionablePlaybooks: [
      {
        id: 'playbook-1',
        type: 'merch_push',
        title: 'Hate Me All You Want — Statement Merch Drop',
        targetTrack: 'Hate Me All You Want',
        reason: 'Track piekt op Spotify en comments vragen naar shirts.',
        recommendedHook: 'Ze praatten. Ik bleef rijden. Draag de outlaw mentaliteit.',
        suggestedPlatforms: ['instagram', 'facebook'],
        priority: 'high',
        actionPayload: {
          caption: 'Hate me all you want. The crown stays on. Limited merch drop live at jackhowlin.com',
          suggestedFormat: 'Carousel met vintage motel mockup',
        },
      },
      {
        id: 'playbook-2',
        type: 'lyric_short',
        title: 'I Still Wear This Crown — High Retention Reel',
        targetTrack: 'I Still Wear This Crown',
        reason: 'Hoogste comment ratio op YouTube Shorts.',
        recommendedHook: 'Stoffige hoed + tekstflits bij seconde 1.',
        suggestedPlatforms: ['youtube', 'tiktok'],
        priority: 'high',
        actionPayload: {
          caption: 'Beaten up. Never broken. Still standing. 👑',
          suggestedFormat: '9:16 Cinematic Short',
        },
      },
      {
        id: 'playbook-3',
        type: 'song_release',
        title: 'Midnight Mirage Motel — 30s One-Shot Push',
        targetTrack: 'Midnight Mirage Motel',
        reason: 'Stijgende populariteit in nachtelijke streaming sessies.',
        recommendedHook: 'Amber studio neon + vintage microfoon intro.',
        suggestedPlatforms: ['youtube', 'instagram', 'tiktok'],
        priority: 'medium',
        actionPayload: {
          caption: 'Neon lights and neon lies. Stream Midnight Mirage Motel tonight.',
          suggestedFormat: '9:16 Performance Video',
        },
      },
    ],
    generatedAt: FieldValue.serverTimestamp(),
  }

  await adminDb.collection('system').doc('intelligence_report').set(cleanReport, { merge: true })
  console.log('✅ Clean intelligence_report saved to Firestore successfully!')
}

sanitizeReport().catch(console.error)
