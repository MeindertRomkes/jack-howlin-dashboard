import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { getFfmpegPath } from '../lib/video-production'
import { createMediaAsset, getSunoTracks } from '../lib/studio-firestore'
import { adminStorage } from '../lib/firebase-admin'

const ROOT_DIR = process.cwd()
const PROJ_DIR = path.join(ROOT_DIR, 'projects', 'hate-me-all-you-want')
const AUDIO_DIR = path.join(PROJ_DIR, 'audio')
const STILLS_DIR = path.join(PROJ_DIR, 'stills')
const CLIPS_DIR = path.join(PROJ_DIR, 'clips')
const EXPORTS_DIR = path.join(PROJ_DIR, 'exports')

const MASTER_AUDIO_PATH = path.join(AUDIO_DIR, 'master-hate-me-all-you-want.wav')
const MASTER_EXPORT_PATH = path.join(EXPORTS_DIR, 'hate-me-all-you-want-cinema-master-45s.mp4')

async function finalizeVideo() {
  console.log('=================================================================')
  console.log('🎬 JACK HOWLIN - CINEMATIC MASTER ASSEMBLY & EXPORT (45s)')
  console.log('=================================================================\n')

  const ffmpegBin = getFfmpegPath()

  // 1. Generate Shot 9 Outro with cinematic slow zoom-out & fade to black
  const shot9Still = path.join(STILLS_DIR, 'shot-9-still.png')
  const shot9Clip = path.join(CLIPS_DIR, 'shot-9-clip.mp4')

  console.log('🎥 STAP 1: Renderen Shot 9/9 Outro (Cinematic Slow Pull & Lighting Fade)...')
  await new Promise<void>((resolve, reject) => {
    // 5 seconds @ 30fps = 150 frames. Zoom from 1.08 down to 1.00 with subtle fade out in last second
    const filter =
      'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,zoompan=z=\'if(lte(zoom,1.0),1.08,max(1.001,zoom-0.0005))\':d=150:x=\'iw/2-(iw/zoom/2)\':y=\'ih/2-(ih/zoom/2)\':s=720x1280:fps=30,fade=t=out:st=3.8:d=1.2'

    const proc = spawn(ffmpegBin, [
      '-y',
      '-loop',
      '1',
      '-i',
      shot9Still,
      '-t',
      '5',
      '-vf',
      filter,
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-r',
      '30',
      '-an',
      shot9Clip,
    ])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Shot 9 render failed with code ${code}`))
    })
  })
  console.log(`   ✅ Shot 9/9 gereed: ${shot9Clip}\n`)

  // 2. Concat all 9 clips
  console.log('🎞️ STAP 2: 9 Scènes samenvoegen in chronologische volgorde (45s)...')
  const clipPaths: string[] = []
  for (let i = 1; i <= 9; i++) {
    const p = path.join(CLIPS_DIR, `shot-${i}-clip.mp4`)
    if (!fs.existsSync(p)) throw new Error(`Missing clip: ${p}`)
    clipPaths.push(p)
  }

  const concatListFile = path.join(PROJ_DIR, 'concat_list.txt')
  const concatContent = clipPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n')
  fs.writeFileSync(concatListFile, concatContent)

  const rawConcat = path.join(PROJ_DIR, 'concatenated_9shots.mp4')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-f',
      'concat',
      '-safe',
      '0',
      '-i',
      concatListFile,
      '-c',
      'copy',
      rawConcat,
    ])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Concat failed with code ${code}`))
    })
  })
  console.log(`   ✅ 9 Scènes naadloos samengevoegd (45.0s video)\n`)

  // 3. Perfect Audio Synchronisatie (45s chorus hook cut starting at 0:30)
  console.log('🎵 STAP 3: Master audiotrack synchroniseren en audiomix afleveren...')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-i',
      rawConcat,
      '-ss',
      '00:00:30',
      '-t',
      '45',
      '-i',
      MASTER_AUDIO_PATH,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '256k',
      '-af',
      'afade=t=out:st=43.5:d=1.5',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-shortest',
      MASTER_EXPORT_PATH,
    ])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Final mix failed with code ${code}`))
    })
  })

  console.log(`\n🎉 MASTER VIDEO EXPORT VOLTOOID: ${MASTER_EXPORT_PATH}\n`)

  // 4. Upload to Firebase Storage & Firestore
  console.log('☁️ STAP 4: Uploaden naar Firebase Storage & Firestore...')
  const tracks = await getSunoTracks()
  const hateMeTrack = tracks.find(
    (t) => t.name.toLowerCase().includes('hate me') || t.id === 'kUBhJ6jZ91FUtkNrPqRl'
  )

  const bucket = adminStorage.bucket()
  const destination = `media_library/hate-me-all-you-want-cinema-45s-${Date.now()}.mp4`
  await bucket.upload(MASTER_EXPORT_PATH, {
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
      'Hate me all you want, but you can\'t ignore the roar. 🔥⚡ Official 45s Cinema Studio Video for "Hate Me All You Want" — Directed with Jack Howlin Cinema Soul, Kling 3.0 & Veo 3.1. #JackHowlin #CinemaStudio #HiggsfieldAI #OutlawCountryRock #NewMusic',
    prompt: 'Cinema Studio 4.0 Multi-Model 9-Shot Narrative Master (45s)',
    sunoTrackId: hateMeTrack?.id,
  })

  console.log(`✅ Opgeslagen in Firestore Media Library (Asset ID: ${assetId})`)
  console.log(`🔗 Public Video URL: ${publicUrl}\n`)

  console.log('=================================================================')
  console.log('✨ JACK HOWLIN "HATE ME ALL YOU WANT" PRODUCTIE COMPLEET & GEREED!')
  console.log('=================================================================\n')
}

finalizeVideo().catch((err) => {
  console.error('\n❌ Fout bij finalisatie:', err)
  process.exit(1)
})
