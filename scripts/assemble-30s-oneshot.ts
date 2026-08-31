import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { getFfmpegPath } from '../lib/video-production'
import { createMediaAsset, getSunoTracks } from '../lib/studio-firestore'
import { adminStorage } from '../lib/firebase-admin'

const ROOT_DIR = process.cwd()
const SOURCE_CLIPS_DIR = path.join(ROOT_DIR, 'projects', 'hate-me-all-you-want', 'clips')
const SOURCE_AUDIO = path.join(ROOT_DIR, 'projects', 'hate-me-all-you-want', 'audio', 'master-hate-me-all-you-want.wav')

const ONESHOT_PROJ_DIR = path.join(ROOT_DIR, 'projects', 'hate-me-oneshot')
const ONESHOT_EXPORTS_DIR = path.join(ONESHOT_PROJ_DIR, 'exports')
const ONESHOT_AUDIO_DIR = path.join(ONESHOT_PROJ_DIR, 'audio')

for (const dir of [ONESHOT_PROJ_DIR, ONESHOT_EXPORTS_DIR, ONESHOT_AUDIO_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const ONESHOT_MASTER_EXPORT = path.join(ONESHOT_EXPORTS_DIR, 'hate-me-all-you-want-30s-oneshot-master.mp4')
const ONESHOT_30S_AUDIO = path.join(ONESHOT_AUDIO_DIR, 'hate-me-30s-chorus.wav')

async function assemble30sOneShot() {
  console.log('=================================================================')
  console.log('🎬 JACK HOWLIN - 30s ONE-SHOT CINEMATIC MASTER ASSEMBLY')
  console.log('⚡ 1 Single Microphone + Locked Wardrobe + 30s Chorus Climax')
  console.log('=================================================================\n')

  const ffmpegBin = getFfmpegPath()

  // 1. Slice 30s Audio Stem (0:30 - 1:00)
  console.log('🎵 STAP 1: 30s Master chorus audio uitsnijden...')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-ss',
      '00:00:30',
      '-t',
      '30',
      '-i',
      SOURCE_AUDIO,
      '-acodec',
      'pcm_s16le',
      '-ar',
      '44100',
      ONESHOT_30S_AUDIO,
    ])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Audio slice failed with code ${code}`))
    })
  })
  console.log(`   ✅ 30s Audio stem gereed: ${ONESHOT_30S_AUDIO}\n`)

  // 2. Select 6 Continuous Performance Clips for 30s One-Shot (5s each)
  // Shot 2: Single Mic Chorus Entry -> Shot 4: Strumming On Stool -> Shot 6: Chorus Climax -> Shot 7: Solo Fretboard -> Shot 8: Rocking Out Solo -> Shot 9: Outro Smirk
  const selectedShotIndices = [2, 4, 6, 7, 8, 9]
  const clipPaths = selectedShotIndices.map((idx) => path.join(SOURCE_CLIPS_DIR, `shot-${idx}-clip.mp4`))

  clipPaths.forEach((p) => {
    if (!fs.existsSync(p)) throw new Error(`Ontbrekende clip: ${p}`)
  })

  console.log('🎞️ STAP 2: 6 Performance scènes samenvoegen tot 30s one-shot flow...')
  const concatList = path.join(ONESHOT_PROJ_DIR, 'oneshot_concat_list.txt')
  fs.writeFileSync(concatList, clipPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'))

  const rawConcat = path.join(ONESHOT_PROJ_DIR, 'oneshot_30s_raw.mp4')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatList,
      '-c',
      'copy',
      rawConcat,
    ])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Concat failed with code ${code}`))
    })
  })
  console.log(`   ✅ 6 Scènes naadloos samengevoegd tot 30.0s video\n`)

  // 3. Audio Synchronisatie & Cinematic Finishing
  console.log('⚡ STAP 3: 30s Master audio mixen met subtiele audio fade-out...')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-i',
      rawConcat,
      '-i',
      ONESHOT_30S_AUDIO,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '256k',
      '-af',
      'afade=t=out:st=28.5:d=1.5',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-shortest',
      ONESHOT_MASTER_EXPORT,
    ])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Final mix failed with code ${code}`))
    })
  })

  console.log(`\n🎉 30s ONESHOT VIDEO EXPORT GEREED: ${ONESHOT_MASTER_EXPORT}\n`)

  // 4. Upload naar Firebase Storage & Firestore Media Library
  console.log('☁️ STAP 4: Uploaden naar Firebase Storage & Media Library...')
  const tracks = await getSunoTracks()
  const hateMeTrack = tracks.find(
    (t) => t.name.toLowerCase().includes('hate me') || t.id === 'kUBhJ6jZ91FUtkNrPqRl'
  )

  const bucket = adminStorage.bucket()
  const destination = `media_library/hate-me-all-you-want-30s-oneshot-${Date.now()}.mp4`
  await bucket.upload(ONESHOT_MASTER_EXPORT, {
    destination,
    metadata: { contentType: 'video/mp4' },
  })

  const file = bucket.file(destination)
  await file.makePublic()
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`

  const assetId = await createMediaAsset({
    url: publicUrl,
    type: 'video',
    videoType: 'cinematic',
    suggestedCaption:
      'Hate me all you want, but you can\'t stop the thunder. 🔥⚡ Official 30s One-Shot Music Video for "Hate Me All You Want" — Jack Howlin live performance cut. #JackHowlin #OneShot #CinemaStudio #HiggsfieldAI #OutlawCountryRock #NewMusic',
    prompt: 'Jack Howlin 30-Second Continuous One-Shot Music Video (Single Vintage Microphone, Locked Wardrobe, 2K Soul)',
    sunoTrackId: hateMeTrack?.id,
  })

  console.log(`✅ Opgeslagen in Firestore Media Library (Asset ID: ${assetId})`)
  console.log(`🔗 Public Video URL: ${publicUrl}\n`)

  console.log('=================================================================')
  console.log('✨ 30s ONE-SHOT VIDEO PRODUCTIE MET SUCCES AFGEROND!')
  console.log('=================================================================\n')
}

assemble30sOneShot().catch((err) => {
  console.error('\n❌ Fout bij 30s oneshot assemblage:', err)
  process.exit(1)
})
