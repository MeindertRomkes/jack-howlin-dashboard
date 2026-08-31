import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { downloadFile, runCliCommand, getFfmpegPath } from '../lib/video-production'
import { createMediaAsset, getSunoTracks } from '../lib/studio-firestore'
import { adminStorage } from '../lib/firebase-admin'

const ROOT_DIR = process.cwd()
const PROJ_DIR = path.join(ROOT_DIR, 'projects', 'hate-me-oneshot')
const WARDROBE_DIR = path.join(PROJ_DIR, 'wardrobe')
const AUDIO_DIR = path.join(PROJ_DIR, 'audio')
const STILLS_DIR = path.join(PROJ_DIR, 'stills')
const CLIPS_DIR = path.join(PROJ_DIR, 'clips')
const EXPORTS_DIR = path.join(PROJ_DIR, 'exports')

for (const dir of [PROJ_DIR, WARDROBE_DIR, AUDIO_DIR, STILLS_DIR, CLIPS_DIR, EXPORTS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const SOUL_ID = 'a31fae2f-897d-416c-94e5-a0b0b90e0f45'
const MASTER_AUDIO_SOURCE = 'https://storage.googleapis.com/jack-howlin-dashboard.firebasestorage.app/suno-library/1788084526294-hate-me-all-you-want.wav'
const MASTER_AUDIO_LOCAL = path.join(AUDIO_DIR, 'master-hate-me.wav')
const AUDIO_30S_PATH = path.join(AUDIO_DIR, 'hate-me-30s-cut.wav')
const EXPORT_VIDEO_PATH = path.join(EXPORTS_DIR, 'hate-me-all-you-want-30s-oneshot.mp4')

interface SceneShot {
  index: number
  title: string
  model: 'kling3_0_turbo' | 'veo3_1_lite'
  prompt: string
}

const ONESHOT_SCENES: SceneShot[] = [
  {
    index: 1,
    title: 'Chorus Entry & Microphone Step-in',
    model: 'kling3_0_turbo',
    prompt: 'Country rock musician Jack Howlin steps forward into the spotlight singing passionately into a single vintage chrome Shure microphone, acoustic guitar in hand, warm amber stage lighting, slow push-in',
  },
  {
    index: 2,
    title: 'Hook Delivery & Camera Glide',
    model: 'kling3_0_turbo',
    prompt: 'Jack Howlin singing intensely into the single vintage microphone with powerful facial grit and emotion, strumming acoustic guitar, warm amber rim lighting, subtle camera orbit',
  },
  {
    index: 3,
    title: 'Rhythm Strumming & Outlaw Energy',
    model: 'kling3_0_turbo',
    prompt: 'Medium shot of Jack Howlin rocking to the rhythm with his acoustic guitar, singing fiercely into the central microphone, atmospheric haze in studio light',
  },
  {
    index: 4,
    title: 'Chorus Drop Climax & Head Tilt',
    model: 'kling3_0_turbo',
    prompt: 'Dynamic close-up portrait of Jack Howlin belting out lyrics with raw outlaw emotion into vintage chrome microphone, amber backlight catching beard and hair, dramatic slow push',
  },
  {
    index: 5,
    title: 'Guitar Solo Roar & Smoke',
    model: 'kling3_0_turbo',
    prompt: 'Jack Howlin playing fiery acoustic guitar notes with passion, head tilted back under golden spotlights with swirling smoke, cinematic camera drift',
  },
  {
    index: 6,
    title: 'Outro Smirk & Studio Lighting Fade',
    model: 'veo3_1_lite',
    prompt: 'Slow pull-back shot, Jack Howlin resting his acoustic guitar looking into camera lens with confident rugged smirk as the final chord rings out and amber lights slowly fade',
  },
]

async function sliceAudio(src: string, start: number, duration: number, dest: string) {
  if (fs.existsSync(dest)) return dest
  const ffmpegBin = getFfmpegPath()
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y', '-ss', start.toString(), '-t', duration.toString(), '-i', src,
      '-acodec', 'pcm_s16le', '-ar', '44100', dest
    ])
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`Audio slice failed: ${code}`)))
  })
  return dest
}

async function main() {
  console.log('=================================================================')
  console.log('🎬 JACK HOWLIN - 30s ONE-SHOT CINEMA PRODUCTION')
  console.log('⚡ Seedream 5.0 / Soul Cinematic Anchor + 30s Continuous Flow')
  console.log('=================================================================\n')

  const ffmpegBin = getFfmpegPath()

  // 1. Audio Download & Slice (30s chorus cut 0:30 - 1:00)
  console.log('🎵 STAP 1: Master audio downloaden en 30s snippet knippen...')
  if (!fs.existsSync(MASTER_AUDIO_LOCAL)) {
    console.log(`   Downloaden van: ${MASTER_AUDIO_SOURCE}`)
    await downloadFile(MASTER_AUDIO_SOURCE, MASTER_AUDIO_LOCAL)
  }
  await sliceAudio(MASTER_AUDIO_LOCAL, 30, 30, AUDIO_30S_PATH)
  console.log(`   ✅ 30s Audio slice gereed: ${AUDIO_30S_PATH}\n`)

  // 2. Anchor Still met 1 Microfoon & Locked Wardrobe
  console.log('🎨 STAP 2: 2K Anker Still genereren (Single Mic & Wardrobe Locked)...')
  const anchorStillPath = path.join(STILLS_DIR, 'anchor-still.png')

  if (!fs.existsSync(anchorStillPath)) {
    const stillPrompt = 'A single vintage chrome Shure 55SH microphone on a straight vertical stand is centered directly in front of Jack Howlin. Only one single microphone in the scene. Jack Howlin steps forward singing passionately into the single central microphone, wearing a tan camel-brown heavy canvas work jacket with dual chest flap pockets over an unbuttoned charcoal grey henley shirt, blue jeans, full rugged brown beard, bareheaded with wind-blown wavy brown hair, dark rustic saloon recording studio backdrop, warm amber rim lighting, 85mm f/1.4 shallow depth of field, 2k resolution'

    const args = [
      'generate', 'create', 'soul_cinematic',
      '--prompt', `"${stillPrompt}"`,
      '--custom-reference-id', SOUL_ID,
      '--aspect-ratio', '9:16',
      '--quality', '2k',
      '--wait',
      '--json'
    ]

    const output = await runCliCommand('higgsfield', args)
    const parsed = JSON.parse(output)
    const item = Array.isArray(parsed) ? parsed[0] : parsed
    const stillUrl = item?.result_url || item?.url
    if (!stillUrl) throw new Error('Geen still url: ' + output)

    await downloadFile(stillUrl, anchorStillPath)
    console.log(`   ✅ Anker still gegenereerd en opgeslagen: ${anchorStillPath}\n`)
  } else {
    console.log(`   ✅ Anker still al aanwezig: ${anchorStillPath}\n`)
  }

  // 3. Render 6 Continuous 5-Second Scenes (Total 30s)
  console.log('🎥 STAP 3: 6 Scènes renderen voor 30s continue one-shot video...')
  const clipPaths: string[] = []

  for (const scene of ONESHOT_SCENES) {
    const destClip = path.join(CLIPS_DIR, `oneshot-scene-${scene.index}.mp4`)
    const rawClip = path.join(CLIPS_DIR, `oneshot-scene-${scene.index}-raw.mp4`)

    if (fs.existsSync(destClip)) {
      console.log(`   [Scene ${scene.index}/6] ${scene.title} al in cache.`)
      clipPaths.push(destClip)
      continue
    }

    console.log(`   [Scene ${scene.index}/6] 🚀 Renderen: ${scene.title} [${scene.model}]...`)

    if (scene.index === 6) {
      // Scene 6: Cinematic Slow Pull & Fade to Black on the 2K Anchor Still
      await new Promise<void>((resolve, reject) => {
        const filter = "scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1,zoompan=z='if(lte(zoom,1.0),1.08,max(1.001,zoom-0.0005))':d=150:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=720x1280:fps=30,fade=t=out:st=3.8:d=1.2"
        const proc = spawn(ffmpegBin, [
          '-y', '-loop', '1', '-i', anchorStillPath,
          '-t', '5', '-vf', filter,
          '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-r', '30', '-an', destClip
        ])
        proc.on('close', code => code === 0 ? resolve() : reject(new Error(`Scene 6 render failed: ${code}`)))
      })
      clipPaths.push(destClip)
      console.log(`   ✅ Scene ${scene.index}/6 gereed (5.0s normalized): ${destClip}\n`)
      continue
    }

    const args = [
      'generate', 'create', 'kling3_0_turbo',
      '--start-image', `"${anchorStillPath}"`,
      '--prompt', `"${scene.prompt}"`,
      '--duration', '5',
      '--aspect-ratio', '9:16',
      '--resolution', '720p',
      '--wait',
      '--json'
    ]

    const output = await runCliCommand('higgsfield', args)
    const parsed = JSON.parse(output)
    const item = Array.isArray(parsed) ? parsed[0] : parsed
    const videoUrl = item?.result_url || item?.url
    if (!videoUrl) throw new Error(`Geen video url voor scene ${scene.index}: ${output}`)

    await downloadFile(videoUrl, rawClip)

    // Normalize clip to exact 5.00s @ 30fps 720x1280 (9:16)
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegBin, [
        '-y', '-i', rawClip,
        '-t', '5', '-r', '30',
        '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2,setsar=1',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', destClip
      ])
      proc.on('close', code => code === 0 ? resolve() : reject(new Error(`Clip normalisatie mislukt voor scene ${scene.index}: ${code}`)))
    })

    clipPaths.push(destClip)
    console.log(`   ✅ Scene ${scene.index}/6 gereed (5.0s normalized): ${destClip}\n`)
  }

  // 4. Concat all 6 clips & sync 30s Master Audio
  console.log('🎞️ STAP 4: 6 Scènes aaneensluiten en 30s master audio strak afmixen...')
  const concatList = path.join(PROJ_DIR, 'concat_list.txt')
  fs.writeFileSync(concatList, clipPaths.map(p => `file '${p.replace(/\\/g, '/')}'`).join('\n'))

  const rawConcat = path.join(PROJ_DIR, 'concatenated_30s_raw.mp4')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y', '-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', rawConcat
    ])
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`Concat mislukt: ${code}`)))
  })

  // Final merge with 30s audio cut and smooth audio fade out
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-i', rawConcat,
      '-i', AUDIO_30S_PATH,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '256k',
      '-af', 'afade=t=out:st=28.5:d=1.5',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      EXPORT_VIDEO_PATH
    ])
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`Final mix mislukt: ${code}`)))
  })

  console.log(`\n🎉 30s MASTER ONESHOT VIDEO EXPORT VOLTOOID: ${EXPORT_VIDEO_PATH}\n`)

  // 5. Upload to Firebase Storage & Media Library
  console.log('☁️ STAP 5: Uploaden naar Firebase Storage & Media Library...')
  const tracks = await getSunoTracks()
  const hateMeTrack = tracks.find(t => t.name.toLowerCase().includes('hate me') || t.id === 'kUBhJ6jZ91FUtkNrPqRl')

  const bucket = adminStorage.bucket()
  const destination = `media_library/hate-me-all-you-want-30s-oneshot-${Date.now()}.mp4`
  await bucket.upload(EXPORT_VIDEO_PATH, {
    destination,
    metadata: { contentType: 'video/mp4' }
  })

  const file = bucket.file(destination)
  await file.makePublic()
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`

  const assetId = await createMediaAsset({
    url: publicUrl,
    type: 'video',
    videoType: 'cinematic',
    suggestedCaption: "Hate me all you want, you can't kill a fire that burns from within. 🔥⚡ Official 30s One-Shot Music Video for \"Hate Me All You Want\" — Jack Howlin live in the studio. #JackHowlin #OneShot #CinemaStudio #KlingAI #OutlawRock #NewMusic",
    prompt: 'Jack Howlin 30-Second Continuous One-Shot Music Video (Single Mic, Locked Wardrobe, 2K Soul)',
    sunoTrackId: hateMeTrack?.id,
  })

  console.log(`✅ Opgeslagen in Firestore Media Library (Asset ID: ${assetId})`)
  console.log(`🔗 Public Video URL: ${publicUrl}\n`)

  console.log('=================================================================')
  console.log('✨ 30s ONESHOT VIDEO PRODUCTIE COMPLEET & SUCCESVOL AFGEROND!')
  console.log('=================================================================\n')
}

main().catch(err => {
  console.error('\n❌ Fout tijdens oneshot productie:', err)
  process.exit(1)
})
