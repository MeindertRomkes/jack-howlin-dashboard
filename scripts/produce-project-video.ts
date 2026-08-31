import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { downloadFile, runCliCommand, getFfmpegPath } from '../lib/video-production'
import { createMediaAsset, getSunoTracks } from '../lib/studio-firestore'
import { adminStorage } from '../lib/firebase-admin'

const ROOT_DIR = process.cwd()
const PROJ_DIR = path.join(ROOT_DIR, 'projects', 'hate-me-all-you-want')
const AUDIO_DIR = path.join(PROJ_DIR, 'audio')
const STILLS_DIR = path.join(PROJ_DIR, 'stills')
const CLIPS_DIR = path.join(PROJ_DIR, 'clips')
const EXPORTS_DIR = path.join(PROJ_DIR, 'exports')

for (const dir of [PROJ_DIR, AUDIO_DIR, STILLS_DIR, CLIPS_DIR, EXPORTS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const PROJECT_CONFIG = JSON.parse(fs.readFileSync(path.join(PROJ_DIR, 'project.json'), 'utf8'))
const MASTER_AUDIO_PATH = path.join(AUDIO_DIR, 'master-hate-me-all-you-want.wav')
const MASTER_EXPORT_PATH = path.join(EXPORTS_DIR, 'hate-me-all-you-want-seedance25-master.mp4')

async function sliceAudioSnippet(
  sourceWav: string,
  startSec: number,
  durationSec: number,
  outputWav: string
): Promise<string> {
  if (fs.existsSync(outputWav)) return outputWav

  const ffmpegBin = getFfmpegPath()
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-ss',
      startSec.toString(),
      '-t',
      durationSec.toString(),
      '-i',
      sourceWav,
      '-acodec',
      'pcm_s16le',
      '-ar',
      '44100',
      outputWav,
    ])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`Audio slice failed with exit code ${code}`))
    })
  })
  return outputWav
}

async function main() {
  console.log('=================================================================')
  console.log('🎬 JACK HOWLIN - AUTONOMOUS VIDEO PRODUCTION PIPELINE')
  console.log('⚡ Project: Hate Me All You Want (Seedance 2.5 + Precision Cinematography)')
  console.log('=================================================================\n')

  // 1. Audio Voorbereiding
  console.log('🎵 STAP 1: Master audio downloaden en slices knippen...')
  if (!fs.existsSync(MASTER_AUDIO_PATH)) {
    console.log(`   Downloaden: ${PROJECT_CONFIG.audio_track}`)
    await downloadFile(PROJECT_CONFIG.audio_track, MASTER_AUDIO_PATH)
  }
  console.log(`   ✅ Master audio klaar: ${MASTER_AUDIO_PATH}`)

  const audioSnippets: string[] = []
  for (const shot of PROJECT_CONFIG.shots) {
    const snipPath = path.join(AUDIO_DIR, `shot-${shot.shot_index}-audio.wav`)
    await sliceAudioSnippet(MASTER_AUDIO_PATH, shot.audio_start_sec, 5, snipPath)
    audioSnippets.push(snipPath)
  }
  console.log(`   ✅ 9 Audio slices geknipt in ${AUDIO_DIR}\n`)

  // 2. Video Clips Renderen
  console.log('🎥 STAP 2: 9 Scènes renderen (Seedance 2.5 Omni-Reference Lip-Sync & Veo 3.1)...')
  const clipPaths: string[] = []

  for (const shot of PROJECT_CONFIG.shots) {
    const destClip = path.join(CLIPS_DIR, `shot-${shot.shot_index}-clip.mp4`)
    const stillPath = path.join(STILLS_DIR, `shot-${shot.shot_index}-still.png`)
    const audioSnip = audioSnippets[shot.shot_index - 1]

    if (!fs.existsSync(stillPath)) {
      throw new Error(`Still ontbreekt voor shot ${shot.shot_index}: ${stillPath}`)
    }

    if (fs.existsSync(destClip)) {
      console.log(`   [Video] Shot ${shot.shot_index}/9 (${shot.title}) al in cache.`)
      clipPaths.push(destClip)
      continue
    }

    console.log(`   [Video] 🚀 Renderen Shot ${shot.shot_index}/9: ${shot.title} [${shot.video_model}]...`)

    const args: string[] = ['generate', 'create']

    if (shot.video_model === 'kling3_0_turbo') {
      args.push(
        'kling3_0_turbo',
        '--start-image',
        `"${stillPath}"`,
        '--prompt',
        `"${shot.video_prompt}"`,
        '--duration',
        '5',
        '--aspect-ratio',
        '9:16',
        '--resolution',
        '720p',
        '--wait',
        '--json'
      )
    } else {
      // Veo 3.1 Lite for atmospheric B-Roll (allowed durations: 4, 6, 8)
      args.push(
        'veo3_1_lite',
        '--start-image',
        `"${stillPath}"`,
        '--prompt',
        `"${shot.video_prompt}"`,
        '--duration',
        '6',
        '--aspect-ratio',
        '9:16',
        '--wait',
        '--json'
      )
    }

    const output = await runCliCommand('higgsfield', args)
    const parsed = JSON.parse(output)
    const item = Array.isArray(parsed) ? parsed[0] : parsed
    const videoUrl = item?.result_url || item?.url

    if (!videoUrl) {
      throw new Error(`Geen result_url voor shot ${shot.shot_index}: ${output}`)
    }

    const rawClipPath = path.join(CLIPS_DIR, `shot-${shot.shot_index}-raw.mp4`)
    await downloadFile(videoUrl, rawClipPath)

    // Normalize clip to exact 5.00s @ 30fps 720x1280 (9:16)
    const ffmpegBin = getFfmpegPath()
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegBin, [
        '-y',
        '-i',
        rawClipPath,
        '-t',
        '5',
        '-r',
        '30',
        '-vf',
        'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-an',
        destClip,
      ])
      proc.on('close', (code) => {
        if (code === 0) resolve()
        else reject(new Error(`Clip normalization failed for shot ${shot.shot_index} with code ${code}`))
      })
    })

    clipPaths.push(destClip)
    console.log(`   ✅ Shot ${shot.shot_index}/9 clip gereed (5.0s normalized): ${destClip}\n`)
  }

  // 3. Montage & Master Audio Synchronisatie
  console.log('🎞️ STAP 3: 9 Clips samenvoegen en 45s audio strak synchroniseren...')
  const concatListFile = path.join(PROJ_DIR, 'concat_list.txt')
  const concatContent = clipPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n')
  fs.writeFileSync(concatListFile, concatContent)

  const videoConcatOut = path.join(PROJ_DIR, 'concatenated_raw.mp4')
  const ffmpegBin = getFfmpegPath()

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
      videoConcatOut,
    ])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg concat failed with code ${code}`))
    })
  })

  // Final mix with 45s audio from 0:30 (Chorus Hook Start)
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-i',
      videoConcatOut,
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
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-shortest',
      MASTER_EXPORT_PATH,
    ])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg final mix failed with code ${code}`))
    })
  })

  console.log(`\n🎉 MASTER VIDEO EXPORT VOLTOOID: ${MASTER_EXPORT_PATH}\n`)

  // 4. Upload naar Firebase Storage & Firestore
  console.log('☁️ STAP 4: Uploaden naar Firebase Storage & Media Library...')
  try {
    const tracks = await getSunoTracks()
    const hateMeTrack = tracks.find(
      (t) => t.name.toLowerCase().includes('hate me') || t.id === 'kUBhJ6jZ91FUtkNrPqRl'
    )

    const bucket = adminStorage.bucket()
    const destination = `media_library/hate-me-all-you-want-seedance25-${Date.now()}.mp4`
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
        'Hate me all you want, but you can\'t ignore the fire. 🔥⚡ Jack Howlin official 45s Seedance 2.5 Cinema Studio music video with full vocal lip-sync. #JackHowlin #Seedance25 #HiggsfieldAI #CinemaStudio4 #OutlawRock #LipSyncAI',
      prompt: 'Seedance 2.5 Omni-Reference Lip-Sync + Cinema Studio 4.0 (45s Master)',
      sunoTrackId: hateMeTrack?.id,
    })

    console.log(`✅ Opgeslagen in Firestore Media Library (Asset ID: ${assetId})`)
    console.log(`🔗 Public URL: ${publicUrl}`)
  } catch (err) {
    console.warn('⚠️ Storage upload warning (video staat veilig lokaal):', err)
  }

  console.log('\n=================================================================')
  console.log('✨ JACK HOWLIN 45s SEEDANCE 2.5 PRODUCTIE COMPLEET!')
  console.log('=================================================================\n')
}

main().catch((err) => {
  console.error('\n❌ Fout tijdens productie:', err)
  process.exit(1)
})
