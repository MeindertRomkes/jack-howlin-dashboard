import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { getJackCoreSet } from './studio-firestore'

export interface SceneDefinition {
  sceneIndex: number
  timeRange: string
  name: string
  stillPrompt: string
  videoPrompt: string
}

export const SCENE_DEFINITIONS: SceneDefinition[] = [
  {
    sceneIndex: 1,
    timeRange: '0:00 - 0:12',
    name: 'De Intro & Tube Amp Hook',
    stillPrompt:
      'Cinematic 35mm portrait of Jack Howlin standing in a dark moody recording studio, holding an acoustic guitar next to glowing vintage tube amplifiers, warm amber neon rim lighting, Shure 55SH vintage chrome microphone, outlaw country noir, film grain, 8k resolution',
    videoPrompt:
      'Slow atmospheric pan in dark recording studio, vintage tube amplifier glowing, Jack Howlin stepping towards vintage chrome microphone with his acoustic guitar, cinematic amber lighting, subtle smoke drift',
  },
  {
    sceneIndex: 2,
    timeRange: '0:12 - 0:24',
    name: 'Couplet 1 / Ritmische Opbouw',
    stillPrompt:
      'Cinematic medium portrait of Jack Howlin passionately strumming his acoustic guitar, singing with intense gritty expression into a vintage chrome microphone, warm tungsten and amber lighting, dark studio background, raw country rock aesthetic',
    videoPrompt:
      'Medium shot, Jack Howlin strumming acoustic guitar with rhythmic intensity, singing with raw gritty emotion, subtle slow camera orbit, warm amber studio glow',
  },
  {
    sceneIndex: 3,
    timeRange: '0:24 - 0:36',
    name: 'Pre-Chorus Spanning',
    stillPrompt:
      'Extreme close-up cinematic portrait of Jack Howlins intense eyes and weathered facial expression, weathered hands gripping guitar fretboard, warm amber spotlight, studio smoke drifting past, intense focus, 35mm film still',
    videoPrompt:
      'Tight close-up shot, Jack Howlin singing with deep weathered intensity, fingers shifting chords on guitar neck, dramatic shadows, drifting haze in amber light',
  },
  {
    sceneIndex: 4,
    timeRange: '0:36 - 0:48',
    name: 'Chorus Drop Climax',
    stillPrompt:
      'Dynamic high energy performance shot of Jack Howlin belting out the chorus into a vintage microphone, acoustic guitar angled, vintage analog audio equipment with VU meters in background, outlaw americana vibe, moody cinematic lighting',
    videoPrompt:
      'High energy performance shot, Jack Howlin belting the chorus into the microphone with powerful conviction, dynamic camera push-in, pulsating warm lighting',
  },
  {
    sceneIndex: 5,
    timeRange: '0:48 - 1:00',
    name: 'Outro & Fade',
    stillPrompt:
      'Cinematic wide pull-back photograph of Jack Howlin in dark studio looking straight into the camera with confident rugged expression, acoustic guitar resting, studio lights dimming into dark amber shadows, evocative final shot',
    videoPrompt:
      'Slow pull-back shot, Jack Howlin letting the last chord ring out, looking directly into camera with confident rugged gaze as studio spotlight slowly dims',
  },
]

export async function downloadFile(url: string, destPath: string): Promise<string> {
  const dir = path.dirname(destPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to download file from ${url} [${res.status}]`)
  }

  const arrayBuffer = await res.arrayBuffer()
  fs.writeFileSync(destPath, Buffer.from(arrayBuffer))
  return destPath
}

export async function downloadCoreSetPhotos(targetDir: string): Promise<string[]> {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  const photos = await getJackCoreSet()
  if (photos.length === 0) {
    throw new Error('No photos found in Jack Core Set.')
  }

  const downloadedPaths: string[] = []
  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const ext = photo.publicUrl.endsWith('.png') ? '.png' : '.jpg'
    const dest = path.join(targetDir, `jack-core-${i + 1}${ext}`)
    if (!fs.existsSync(dest)) {
      await downloadFile(photo.publicUrl, dest)
    }
    downloadedPaths.push(dest)
  }

  return downloadedPaths
}

export async function runCliCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: true, stdio: ['inherit', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data) => {
      stdout += data.toString()
    })
    child.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout)
      } else {
        reject(new Error(`Command ${command} ${args.join(' ')} failed [${code}]: ${stderr || stdout}`))
      }
    })
  })
}

export async function getExistingSoul(name: string): Promise<string | null> {
  try {
    const output = await runCliCommand('higgsfield', ['soul-id', 'list', '--json'])
    const list = JSON.parse(output)
    if (Array.isArray(list)) {
      const match = list.find((item: { name?: string; status?: string; id?: string }) => item.name === name && item.status === 'completed')
      if (match) return match.id || null
    }
  } catch (err) {
    console.warn('Could not list souls via CLI:', err)
  }
  return null
}

export async function ensureSoulTrained(
  photos: string[],
  soulName = "Jack Howlin' Cinematic",
  options?: { onProgress?: (msg: string) => void }
): Promise<string> {
  const existing = await getExistingSoul(soulName)
  if (existing) {
    options?.onProgress?.(`Soul '${soulName}' already exists (ID: ${existing}). Reusing.`)
    return existing
  }

  // Also check default Jack Howlin' soul
  const defaultSoul = await getExistingSoul("Jack Howlin'")
  if (defaultSoul) {
    options?.onProgress?.(`Default Soul "Jack Howlin'" found (ID: ${defaultSoul}). Reusing.`)
    return defaultSoul
  }

  options?.onProgress?.(`Starting training of Soul '${soulName}' with ${photos.length} photos...`)
  const args = ['soul-id', 'create', '--name', `"${soulName}"`, '--soul-cinematic']
  for (const photo of photos) {
    args.push('--image', `"${photo}"`)
  }
  args.push('--json')

  const createOutput = await runCliCommand('higgsfield', args)
  const result = JSON.parse(createOutput)
  const soulId = result.id || result.reference_id
  if (!soulId) {
    throw new Error(`Failed to extract soul ID from output: ${createOutput}`)
  }

  options?.onProgress?.(`Soul training submitted (ID: ${soulId}). Waiting for completion...`)
  await runCliCommand('higgsfield', ['soul-id', 'wait', soulId])
  options?.onProgress?.(`Soul '${soulName}' successfully trained!`)
  return soulId
}

export interface GeneratedStill {
  sceneIndex: number
  stillPath: string
  stillUrl: string
  stillPrompt: string
  videoPrompt: string
}

export async function generateSceneStills(
  soulId: string,
  outDir: string,
  _referenceImageUrl?: string,
  options?: { onProgress?: (msg: string) => void; pollIntervalMs?: number }
): Promise<GeneratedStill[]> {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const results: GeneratedStill[] = []

  for (const scene of SCENE_DEFINITIONS) {
    const destPath = path.join(outDir, `scene-${scene.sceneIndex}-still.png`)
    const metaPath = path.join(outDir, `scene-${scene.sceneIndex}-meta.json`)

    if (fs.existsSync(destPath) && fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
      options?.onProgress?.(`Scène ${scene.sceneIndex} still al aanwezig. Cache gebruikt.`)
      results.push(meta)
      continue
    }

    options?.onProgress?.(`Genereren still voor Scène ${scene.sceneIndex}: ${scene.name}...`)

    const args = [
      'generate',
      'create',
      'text2image_soul_v2',
      '--prompt',
      `"${scene.stillPrompt}"`,
      '--custom-reference-id',
      soulId,
      '--aspect-ratio',
      '9:16',
      '--quality',
      '2k',
      '--wait',
      '--json',
    ]

    const output = await runCliCommand('higgsfield', args)
    const parsed = JSON.parse(output)
    const item = Array.isArray(parsed) ? parsed[0] : parsed
    const stillUrl = item?.result_url || item?.url

    if (!stillUrl) {
      throw new Error(`Geen result_url gevonden in output van scène ${scene.sceneIndex}: ${output}`)
    }

    await downloadFile(stillUrl, destPath)

    const stillMeta: GeneratedStill = {
      sceneIndex: scene.sceneIndex,
      stillPath: destPath,
      stillUrl: stillUrl,
      stillPrompt: scene.stillPrompt,
      videoPrompt: scene.videoPrompt,
    }

    fs.writeFileSync(metaPath, JSON.stringify(stillMeta, null, 2))
    results.push(stillMeta)
    options?.onProgress?.(`Scène ${scene.sceneIndex} still gereed!`)
  }

  return results
}

export async function renderSceneClips(
  stills: GeneratedStill[],
  outDir: string,
  options?: { onProgress?: (msg: string) => void; pollIntervalMs?: number }
): Promise<string[]> {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const clipPaths: string[] = []

  for (const still of stills) {
    const destClip = path.join(outDir, `scene-${still.sceneIndex}-clip.mp4`)
    if (fs.existsSync(destClip)) {
      options?.onProgress?.(`Scène ${still.sceneIndex} video al aanwezig. Cache gebruikt.`)
      clipPaths.push(destClip)
      continue
    }

    options?.onProgress?.(`Renderen video voor Scène ${still.sceneIndex} (Veo 3.1 Lite)...`)

    const args = [
      'generate',
      'create',
      'veo3_1_lite',
      '--prompt',
      `"${still.videoPrompt}"`,
      '--start-image',
      `"${still.stillPath}"`,
      '--aspect-ratio',
      '9:16',
      '--duration',
      '8',
      '--wait',
      '--json',
    ]

    const output = await runCliCommand('higgsfield', args)
    const parsed = JSON.parse(output)
    const item = Array.isArray(parsed) ? parsed[0] : parsed
    const videoUrl = item?.result_url || item?.url

    if (!videoUrl) {
      throw new Error(`Geen video result_url gevonden in output van scène ${still.sceneIndex}: ${output}`)
    }

    await downloadFile(videoUrl, destClip)
    clipPaths.push(destClip)
    options?.onProgress?.(`Scène ${still.sceneIndex} video clip gereed!`)
  }

  return clipPaths
}

export function getFfmpegPath(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ffmpeg = require('ffmpeg-static') as string | undefined
    if (ffmpeg && typeof ffmpeg === 'string' && fs.existsSync(ffmpeg)) {
      return ffmpeg
    }
  } catch {
    // ignore
  }
  return 'ffmpeg'
}

export async function stitchMasterVideo(
  clipPaths: string[],
  audioUrlOrPath: string,
  outputPath: string,
  options?: { onProgress?: (msg: string) => void }
): Promise<string> {
  const outDir = path.dirname(outputPath)
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  // 1. Download or resolve audio
  let localAudio = audioUrlOrPath
  if (audioUrlOrPath.startsWith('http://') || audioUrlOrPath.startsWith('https://')) {
    localAudio = path.join(outDir, 'hate-me-audio-source.wav')
    if (!fs.existsSync(localAudio)) {
      options?.onProgress?.('Downloaden master audio track...')
      await downloadFile(audioUrlOrPath, localAudio)
    }
  }

  const ffmpegBin = getFfmpegPath()

  // 2. Create concat list file
  const concatListFile = path.join(outDir, 'concat_list.txt')
  const concatContent = clipPaths.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n')
  fs.writeFileSync(concatListFile, concatContent)

  const videoConcatOut = path.join(outDir, 'concatenated_video_raw.mp4')

  options?.onProgress?.('Samenvoegen van de 5 videoscènes...')
  // Concat video
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, ['-y', '-f', 'concat', '-safe', '0', '-i', concatListFile, '-c', 'copy', videoConcatOut])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg video concat failed with exit code ${code}`))
    })
  })

  options?.onProgress?.('Synchroniseren van audio (0:00 - 1:00) en final master export...')
  // Combine video with 60s sliced audio
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-i',
      videoConcatOut,
      '-ss',
      '00:00:00',
      '-t',
      '60',
      '-i',
      localAudio,
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
      outputPath,
    ])
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`FFmpeg final master merge failed with exit code ${code}`))
    })
  })

  options?.onProgress?.(`Master video succesvol geëxporteerd naar: ${outputPath}`)
  return outputPath
}

export async function sliceAudioSnippet(
  sourceWav: string,
  startSec: number,
  durationSec: number,
  outputWav: string
): Promise<string> {
  const dir = path.dirname(outputWav)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  if (fs.existsSync(outputWav)) {
    return outputWav
  }

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

