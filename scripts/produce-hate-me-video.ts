import path from 'path'
import fs from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import {
  downloadCoreSetPhotos,
  ensureSoulTrained,
  generateSceneStills,
  renderSceneClips,
  stitchMasterVideo,
} from '../lib/video-production'
import { createMediaAsset, getSunoTracks, getJackCoreSet } from '../lib/studio-firestore'
import { adminStorage } from '../lib/firebase-admin'

async function main() {
  console.log('=================================================================')
  console.log('🎬 JACK HOWLIN - 60s VIDEO PRODUCTIE: "HATE ME ALL YOU WANT"')
  console.log('⚡ Higgsfield Soul ID + Google Veo 3.1 Lite + FFmpeg Stitching')
  console.log('=================================================================\n')

  const baseDir = path.join(process.cwd(), 'tmp', 'production')
  const photosDir = path.join(baseDir, 'photos')
  const stillsDir = path.join(baseDir, 'stills')
  const clipsDir = path.join(baseDir, 'clips')
  const masterVideoPath = path.join(baseDir, 'hate-me-master-60s.mp4')

  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true })

  // ─── STAP 1: Core Set Foto's Ophalen ─────────────────────────────────────────
  console.log('📥 STAP 1: Ophalen van Jack Howlin Core Set foto\'s...')
  const photos = await downloadCoreSetPhotos(photosDir)
  console.log(`✅ ${photos.length} foto's gereed in ${photosDir}\n`)

  // ─── STAP 2: Soul Model Verifiëren / Trainen ─────────────────────────────────
  console.log('🧠 STAP 2: Higgsfield Soul Model verifiëren...')
  const soulId = await ensureSoulTrained(photos, "Jack Howlin' Cinematic", {
    onProgress: (msg) => console.log(`   [Soul] ${msg}`),
  })
  console.log(`✅ Soul ID actief: ${soulId}\n`)

  // ─── STAP 3: 5 Scène Stills Genereren (9:16) ──────────────────────────────────
  console.log('🎨 STAP 3: Genereren van 5 scène stills (9:16) met Soul ID...')
  const corePhotos = await getJackCoreSet()
  const refUrl = corePhotos[0]?.publicUrl
  const stills = await generateSceneStills(soulId, stillsDir, refUrl, {
    onProgress: (msg) => console.log(`   [Still] ${msg}`),
  })
  console.log(`✅ Alle 5 stills gereed in ${stillsDir}\n`)

  // ─── STAP 4: 5 Video Clips Renderen (Veo 3.1 Lite) ───────────────────────────
  console.log('🎥 STAP 4: Renderen van 5 videoscènes (Veo 3.1 Lite)...')
  const clips = await renderSceneClips(stills, clipsDir, {
    onProgress: (msg) => console.log(`   [Video] ${msg}`),
  })
  console.log(`✅ Alle 5 videoclips gereed in ${clipsDir}\n`)

  // ─── STAP 5: Audio Ophalen & Video Stitching ───────────────────────────────────
  console.log('✂️ STAP 5: Audio koppelen en 60s master video samenstellen...')
  const tracks = await getSunoTracks()
  const hateMeTrack = tracks.find(
    (t) => t.name.toLowerCase().includes('hate me') || t.id === 'kUBhJ6jZ91FUtkNrPqRl'
  )

  const audioUrl =
    hateMeTrack?.publicUrl ||
    'https://storage.googleapis.com/jack-howlin-dashboard.firebasestorage.app/suno-library/1788084526294-hate-me-all-you-want.wav'

  console.log(`   Audio source: ${hateMeTrack?.name || 'Hate Me All You Want'} (${audioUrl})`)

  await stitchMasterVideo(clips, audioUrl, masterVideoPath, {
    onProgress: (msg) => console.log(`   [Stitch] ${msg}`),
  })

  console.log(`\n🎉 MASTER VIDEO SUCCESVOL GEGENEREERD: ${masterVideoPath}\n`)

  // ─── STAP 6: Uploaden naar Firebase Storage & Firestore Media Library ────────
  console.log('☁️ STAP 6: Synchroniseren naar Dashboard Media Library...')
  try {
    const bucket = adminStorage.bucket()
    const destination = `media_library/hate-me-all-you-want-60s-${Date.now()}.mp4`
    await bucket.upload(masterVideoPath, {
      destination,
      metadata: {
        contentType: 'video/mp4',
      },
    })

    const file = bucket.file(destination)
    await file.makePublic()
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`

    const assetId = await createMediaAsset({
      url: publicUrl,
      type: 'video',
      videoType: 'cinematic',
      suggestedCaption:
        'They can talk all they want, but the music never lies. ⚡ "Hate Me All You Want" out now on all streaming platforms. #JackHowlin #OutlawCountry #HateMeAllYouWant #AmericanaRock',
      prompt: 'Multi-Scene Outlaw Studio Noir Master (60s)',
      sunoTrackId: hateMeTrack?.id,
    })

    console.log(`✅ Opgeslagen in Firestore Media Library (Asset ID: ${assetId})`)
    console.log(`🔗 Public Video URL: ${publicUrl}`)
  } catch (uploadErr) {
    console.warn('⚠️ Kon niet uploaden naar Firebase Storage (bestand staat wel lokaal opgeslagen):', uploadErr)
  }

  console.log('\n=================================================================')
  console.log('✨ PRODUCTIE VOLTOOID! De video staat klaar in je Studio & Media Library.')
  console.log('=================================================================\n')
}

main().catch((err) => {
  console.error('\n❌ Fout tijdens videoproductie:', err)
  process.exit(1)
})
