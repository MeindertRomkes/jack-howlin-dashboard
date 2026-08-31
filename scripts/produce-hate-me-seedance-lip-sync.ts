import path from 'path'
import fs from 'fs'
import { spawn } from 'child_process'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { downloadFile, runCliCommand, getFfmpegPath } from '../lib/video-production'
import { createMediaAsset, getSunoTracks } from '../lib/studio-firestore'
import { adminStorage } from '../lib/firebase-admin'

const SOUL_ID = 'a31fae2f-897d-416c-94e5-a0b0b90e0f45' // Jack Howlin Cinema Studio

interface ExtendedShot {
  shotIndex: number
  type: 'a_roll' | 'b_roll'
  timeRange: string
  name: string
  audioStartSec: number
  audioDurationSec: number
  stillModel: 'soul_cinematic' | 'gpt_image_2'
  videoModel: 'seedance_2_5' | 'veo3_1_lite'
  stillPrompt: string
  videoPrompt: string
}

const SHOTS: ExtendedShot[] = [
  {
    shotIndex: 1,
    type: 'b_roll',
    timeRange: '0:00 - 0:05',
    name: 'B-Roll Guitar String Hook',
    audioStartSec: 30,
    audioDurationSec: 5,
    stillModel: 'gpt_image_2',
    videoModel: 'veo3_1_lite',
    stillPrompt:
      'Extreme macro close-up photograph of a heavy gauge bronze acoustic guitar string vibrating under a tortoiseshell pick, floating golden dust particles backlit by warm amber spotlight, shallow depth of field, 35mm anamorphic cinema look',
    videoPrompt:
      'Slow motion macro shot, acoustic guitar string vibrating with golden dust motes floating in amber backlighting, cinematic depth of field',
  },
  {
    shotIndex: 2,
    type: 'a_roll',
    timeRange: '0:05 - 0:10',
    name: 'A-Roll Chorus Singing (Seedance 2.5 Lip-Sync)',
    audioStartSec: 35,
    audioDurationSec: 5,
    stillModel: 'soul_cinematic',
    videoModel: 'seedance_2_5',
    stillPrompt:
      'Cinematic 35mm anamorphic portrait of Jack Howlin stepping forward in dark recording studio, singing intensely into vintage chrome Shure 55SH microphone, holding acoustic guitar, warm tungsten rim lighting, volumetric studio haze, sharp 85mm f/1.4 focus',
    videoPrompt:
      'Jack Howlin singing passionately into the vintage microphone, realistic mouth movement and facial expression synced to vocals, acoustic guitar in hand, atmospheric studio lighting',
  },
  {
    shotIndex: 3,
    type: 'b_roll',
    timeRange: '0:10 - 0:15',
    name: 'B-Roll Tube Amp & VU Meter',
    audioStartSec: 40,
    audioDurationSec: 5,
    stillModel: 'gpt_image_2',
    videoModel: 'veo3_1_lite',
    stillPrompt:
      'Cinematic close-up of vintage Fender tube amplifier in dark studio, glowing orange glass 6L6 vacuum tubes, illuminated analog VU meter bouncing near redline, curling smoke drifting past, warm amber noir',
    videoPrompt:
      'Slow camera drift past glowing vintage tube amplifier with illuminated VU meter pulsing to music rhythm, soft drifting smoke in amber light',
  },
  {
    shotIndex: 4,
    type: 'a_roll',
    timeRange: '0:15 - 0:20',
    name: 'A-Roll Singing Verse 2 (Seedance 2.5 Lip-Sync)',
    audioStartSec: 45,
    audioDurationSec: 5,
    stillModel: 'soul_cinematic',
    videoModel: 'seedance_2_5',
    stillPrompt:
      'Cinematic medium performance photograph of Jack Howlin passionately strumming acoustic guitar while singing fiercely, warm amber spotlights creating dramatic side shadows, vintage recording equipment in dark background, gritty outlaw country soul',
    videoPrompt:
      'Medium shot, Jack Howlin singing fiercely and strumming acoustic guitar with natural vocal lip sync, subtle slow camera push-in, rich amber tones',
  },
  {
    shotIndex: 5,
    type: 'b_roll',
    timeRange: '0:20 - 0:25',
    name: 'B-Roll Cowboy Boots Stomping',
    audioStartSec: 50,
    audioDurationSec: 5,
    stillModel: 'gpt_image_2',
    videoModel: 'veo3_1_lite',
    stillPrompt:
      'Cinematic low-angle close-up of weathered brown leather cowboy boots stomping the beat on old wooden studio floorboards surrounded by tangled black audio cables, amber spotlight beam',
    videoPrompt:
      'Low-angle shot, weathered leather cowboy boot stomping in time to heavy rhythm on wooden floorboards, dust puffing in spotlight',
  },
  {
    shotIndex: 6,
    type: 'a_roll',
    timeRange: '0:25 - 0:30',
    name: 'A-Roll Chorus Drop Climax (Seedance 2.5 Lip-Sync)',
    audioStartSec: 55,
    audioDurationSec: 5,
    stillModel: 'soul_cinematic',
    videoModel: 'seedance_2_5',
    stillPrompt:
      'Intense close-up cinematic portrait of Jack Howlin belting out the chorus with deep gravelly emotion into vintage microphone, eyes filled with grit and defiance, warm rim lighting catching facial stubble and hair, 35mm film still',
    videoPrompt:
      'Tight close-up shot, Jack Howlin belting out the chorus line with realistic vocal lip sync and intense facial grit, dynamic lighting pulse',
  },
  {
    shotIndex: 7,
    type: 'b_roll',
    timeRange: '0:30 - 0:35',
    name: 'B-Roll Guitar Solo Fretboard',
    audioStartSec: 60,
    audioDurationSec: 5,
    stillModel: 'gpt_image_2',
    videoModel: 'veo3_1_lite',
    stillPrompt:
      'Extreme macro photograph of weathered guitar player fingers bending steel strings on rosewood acoustic guitar fretboard, warm amber lighting reflecting off polished wood and frets, shallow depth of field',
    videoPrompt:
      'Fast expressive fingers sliding and bending notes on acoustic guitar fretboard during fiery solo, macro camera movement, rich warm tones',
  },
  {
    shotIndex: 8,
    type: 'a_roll',
    timeRange: '0:35 - 0:40',
    name: 'A-Roll Guitar Solo Performance',
    audioStartSec: 65,
    audioDurationSec: 5,
    stillModel: 'soul_cinematic',
    videoModel: 'veo3_1_lite',
    stillPrompt:
      'Dynamic wide performance shot of Jack Howlin rocking out with acoustic guitar angled upwards, head tilted back passionately under amber rim light, dramatic studio smoke backdrop',
    videoPrompt:
      'Dynamic performance shot, Jack Howlin playing acoustic guitar with full rock energy, guitar angled up, smoke swirling in backlighting',
  },
  {
    shotIndex: 9,
    type: 'b_roll',
    timeRange: '0:40 - 0:45',
    name: 'A/B Outro Smirk & Fade',
    audioStartSec: 70,
    audioDurationSec: 5,
    stillModel: 'soul_cinematic',
    videoModel: 'veo3_1_lite',
    stillPrompt:
      'Cinematic photograph of Jack Howlin resting acoustic guitar, looking directly into camera lens with confident rugged smirk, holding plectrum, amber studio spotlights slowly fading into deep dark shadow, atmospheric ending',
    videoPrompt:
      'Slow pull-back shot, Jack Howlin looking into the camera lens with confident rugged smirk as the final chord rings out and studio lights slowly fade',
  },
]

async function sliceAudioSnippet(
  sourceWav: string,
  startSec: number,
  durationSec: number,
  outputWav: string
): Promise<string> {
  const dir = path.dirname(outputWav)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

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
  console.log('🎬 JACK HOWLIN - 45s SEEDANCE 2.5 LIP-SYNC & CINEMA STUDIO')
  console.log('⚡ Cinema Studio Soul + Seedance 2.5 Omni-Reference + A/B-Roll Cut')
  console.log('=================================================================\n')

  const baseDir = path.join(process.cwd(), 'tmp', 'production_lip_sync')
  const audioDir = path.join(baseDir, 'audio')
  const stillsDir = path.join(baseDir, 'stills')
  const clipsDir = path.join(baseDir, 'clips')
  const masterVideoPath = path.join(baseDir, 'hate-me-seedance-45s-master.mp4')
  const localSourceAudio = path.join(baseDir, 'hate-me-source.wav')

  if (!fs.existsSync(baseDir)) fs.mkdirSync(baseDir, { recursive: true })
  if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true })
  if (!fs.existsSync(stillsDir)) fs.mkdirSync(stillsDir, { recursive: true })
  if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true })

  // ─── STAP 1: Audio Ophalen ──────────────────────────────────────────────────
  console.log('🎵 STAP 1: Master audio bron voorbereiden...')
  const tracks = await getSunoTracks()
  const hateMeTrack = tracks.find(
    (t) => t.name.toLowerCase().includes('hate me') || t.id === 'kUBhJ6jZ91FUtkNrPqRl'
  )
  const audioUrl =
    hateMeTrack?.publicUrl ||
    'https://storage.googleapis.com/jack-howlin-dashboard.firebasestorage.app/suno-library/1788084526294-hate-me-all-you-want.wav'

  if (!fs.existsSync(localSourceAudio)) {
    console.log(`   Downloaden: ${audioUrl}`)
    await downloadFile(audioUrl, localSourceAudio)
  }
  console.log(`✅ Master audio gereed: ${localSourceAudio}\n`)

  // ─── STAP 2: 9 Audio Snippets Knippen ───────────────────────────────────────
  console.log('✂️ STAP 2: Knippen van 9 audio snippets voor lip-sync & ritme...')
  const audioSnippets: string[] = []
  for (const shot of SHOTS) {
    const snipPath = path.join(audioDir, `shot-${shot.shotIndex}-audio.wav`)
    await sliceAudioSnippet(localSourceAudio, shot.audioStartSec, shot.audioDurationSec, snipPath)
    audioSnippets.push(snipPath)
  }
  console.log(`✅ 9 audio snippets gereed in ${audioDir}\n`)

  // ─── STAP 3: 9 Cinema Studio Stills Genereren (9:16) ────────────────────────
  console.log('🎨 STAP 3: Genereren van 9 Cinema Studio stills (9:16)...')
  const stillPaths: { shotIndex: number; stillPath: string; stillUrl: string }[] = []

  for (const shot of SHOTS) {
    const destPath = path.join(stillsDir, `shot-${shot.shotIndex}-still.png`)
    const metaPath = path.join(stillsDir, `shot-${shot.shotIndex}-meta.json`)

    if (fs.existsSync(destPath) && fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      console.log(`   [Still] Shot ${shot.shotIndex} (${shot.name}) al in cache.`)
      stillPaths.push(meta)
      continue
    }

    console.log(`   [Still] Genereren Shot ${shot.shotIndex} (${shot.name})...`)

    const args: string[] = ['generate', 'create']

    if (shot.stillModel === 'soul_cinematic') {
      args.push(
        'soul_cinematic',
        '--prompt',
        `"${shot.stillPrompt}"`,
        '--custom-reference-id',
        SOUL_ID,
        '--aspect-ratio',
        '9:16',
        '--quality',
        '2k',
        '--wait',
        '--json'
      )
    } else {
      args.push(
        'gpt_image_2',
        '--prompt',
        `"${shot.stillPrompt}"`,
        '--aspect-ratio',
        '9:16',
        '--quality',
        'high',
        '--wait',
        '--json'
      )
    }

    const output = await runCliCommand('higgsfield', args)
    const parsed = JSON.parse(output)
    const item = Array.isArray(parsed) ? parsed[0] : parsed
    const stillUrl = item?.result_url || item?.url

    if (!stillUrl) {
      throw new Error(`Geen still result_url voor shot ${shot.shotIndex}: ${output}`)
    }

    await downloadFile(stillUrl, destPath)
    const meta = { shotIndex: shot.shotIndex, stillPath: destPath, stillUrl }
    fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2))
    stillPaths.push(meta)
    console.log(`   ✅ Still Shot ${shot.shotIndex} gereed!`)
  }
  console.log(`✅ Alle 9 stills gereed in ${stillsDir}\n`)

  // ─── STAP 4: 9 Video Clips Renderen (Seedance 2.5 Lip-Sync + Veo) ───────────
  console.log('🎥 STAP 4: Renderen van 9 clips (Seedance 2.5 Lip-Sync + Veo 3.1)...')
  const clipPaths: string[] = []

  for (const shot of SHOTS) {
    const destClip = path.join(clipsDir, `shot-${shot.shotIndex}-clip.mp4`)
    if (fs.existsSync(destClip)) {
      console.log(`   [Video] Shot ${shot.shotIndex} clip al in cache.`)
      clipPaths.push(destClip)
      continue
    }

    const still = stillPaths.find((s) => s.shotIndex === shot.shotIndex)!
    const audioSnip = audioSnippets[shot.shotIndex - 1]

    console.log(`   [Video] Renderen Shot ${shot.shotIndex} (${shot.videoModel})...`)

    const args: string[] = ['generate', 'create']

    if (shot.videoModel === 'seedance_2_5') {
      // Seedance 2.5 Omni-Reference with Audio Lip Sync!
      args.push(
        'seedance_2_5',
        '--mode',
        'omni_reference',
        '--start-image',
        `"${still.stillPath}"`,
        '--audio',
        `"${audioSnip}"`,
        '--prompt',
        `"${shot.videoPrompt}"`,
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
      // Veo 3.1 Lite for atmospheric B-Rolls
      args.push(
        'veo3_1_lite',
        '--start-image',
        `"${still.stillPath}"`,
        '--prompt',
        `"${shot.videoPrompt}"`,
        '--duration',
        '4',
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
      throw new Error(`Geen video result_url voor shot ${shot.shotIndex}: ${output}`)
    }

    await downloadFile(videoUrl, destClip)
    clipPaths.push(destClip)
    console.log(`   ✅ Shot ${shot.shotIndex} video clip gereed!`)
  }
  console.log(`✅ Alle 9 videoclips gereed in ${clipsDir}\n`)

  // ─── STAP 5: Video Concatenation & 45s Audio Mix ───────────────────────────
  console.log('🎞️ STAP 5: Samenvoegen van 9 clips met de 45s master audiotrack...')
  const concatListFile = path.join(baseDir, 'concat_list.txt')
  const concatContent = clipPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n')
  fs.writeFileSync(concatListFile, concatContent)

  const videoConcatOut = path.join(baseDir, 'concatenated_raw.mp4')
  const ffmpegBin = getFfmpegPath()

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, ['-y', '-f', 'concat', '-safe', '0', '-i', concatListFile, '-c', 'copy', videoConcatOut])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg concat failed with exit code ${code}`))
    })
  })

  // 45s audio cut starting at 0:30 (the chorus drop)
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
      localSourceAudio,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-map',
      '0:v:0',
      '-map',
      '1:a:0',
      '-shortest',
      masterVideoPath,
    ])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg final merge failed with exit code ${code}`))
    })
  })

  console.log(`\n🎉 MASTER SEEDANCE 2.5 VIDEO GEREED: ${masterVideoPath}\n`)

  // ─── STAP 6: Uploaden naar Firebase Storage & Firestore ─────────────────────
  console.log('☁️ STAP 6: Synchroniseren naar Dashboard Media Library...')
  try {
    const bucket = adminStorage.bucket()
    const destination = `media_library/hate-me-seedance-45s-${Date.now()}.mp4`
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
        'Hate me all you want, but you can\'t ignore the roar. 🔥⚡ Seedance 2.5 Cinema Studio Cut for "Hate Me All You Want". #JackHowlin #Seedance25 #HiggsfieldAI #OutlawRock #LipSyncAI',
      prompt: 'Seedance 2.5 Cinema Studio 9-Shot A/B-Roll Lip-Sync Master (45s)',
      sunoTrackId: hateMeTrack?.id,
    })

    console.log(`✅ Opgeslagen in Firestore Media Library (Asset ID: ${assetId})`)
    console.log(`🔗 Public Video URL: ${publicUrl}`)
  } catch (uploadErr) {
    console.warn('⚠️ Storage upload warning (video staat lokaal klaar):', uploadErr)
  }

  console.log('\n=================================================================')
  console.log('✨ 45s SEEDANCE 2.5 PRODUCTIE MET SUCCES VOLTOOID!')
  console.log('=================================================================\n')
}

main().catch((err) => {
  console.error('\n❌ Fout tijdens Seedance 2.5 productie:', err)
  process.exit(1)
})
