import path from 'path'
import fs from 'fs'
import { spawn, execSync } from 'child_process'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { downloadFile, getFfmpegPath, sliceAudioSnippet } from '../lib/video-production'
import { createMediaAsset, getSunoTracks } from '../lib/studio-firestore'
import { adminStorage } from '../lib/firebase-admin'

const KIE_API_KEY = process.env.KIE_AI_API_KEY || process.env.KIE_API_KEY || '10e19446174f4f74a4237b3bce6a8863'

async function uploadToFirebase(localPath: string, destination: string, contentType: string): Promise<string> {
  const bucket = adminStorage.bucket()
  console.log(`   Uploading to Cloud Storage: ${destination}...`)
  await bucket.upload(localPath, {
    destination,
    metadata: { contentType }
  })
  const file = bucket.file(destination)
  await file.makePublic()
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`
  console.log(`   ✅ Cloud URL: ${publicUrl}`)
  return publicUrl
}

function runKieCli(args: string[]): any {
  const env = { ...process.env, KIE_AI_API_KEY: KIE_API_KEY }
  const cmd = `npx kie-cli ${args.map(a => `"${a}"`).join(' ')} --json`
  console.log(`   Executing Kie CLI: ${cmd.slice(0, 140)}...`)
  const rawOutput = execSync(cmd, { env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 })
  try {
    return JSON.parse(rawOutput)
  } catch (e) {
    return rawOutput
  }
}

async function waitForKieTask(taskId: string, maxWaitMs = 360000): Promise<string> {
  console.log(`   ⏳ Waiting for Kie.ai Task [${taskId}] to complete...`)
  const startTime = Date.now()
  const env = { ...process.env, KIE_AI_API_KEY: KIE_API_KEY }

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const statusOutput = execSync(`npx kie-cli get_task_status --task_id "${taskId}" --json`, {
        env,
        encoding: 'utf8'
      })
      const parsed = JSON.parse(statusOutput)
      const data = parsed.data || parsed.response?.data || parsed

      const state = (data.state || data.status || parsed.status || '').toUpperCase()
      console.log(`   Task [${taskId}] state: ${state || 'PROCESSING'} (${Math.round((Date.now() - startTime) / 1000)}s)`)

      if (state === 'SUCCESS' || state === 'COMPLETED' || state === 'DONE') {
        let urls = parsed.result_urls || data.resultUrls || data.result_urls || data.urls
        if (!urls && data.resultJson) {
          try {
            const rj = JSON.parse(data.resultJson)
            urls = rj.resultUrls || rj.result_urls || rj.urls
          } catch(e) {}
        }
        if (urls && urls.length > 0) return urls[0]
        if (data.resultUrl || data.result_url || data.video_url || data.videoUrl) {
          return data.resultUrl || data.result_url || data.video_url || data.videoUrl
        }
      }

      if (state === 'FAIL' || state === 'FAILED' || state === 'ERROR') {
        throw new Error(`Kie Task failed: ${data.failMsg || JSON.stringify(data)}`)
      }
    } catch (err: any) {
      if (err.message.includes('Kie Task failed')) throw err
      console.log(`   Status check retry: ${err.message}`)
    }

    await new Promise(r => setTimeout(r, 6000))
  }

  throw new Error(`Kie Task ${taskId} timed out after ${maxWaitMs / 1000}s`)
}

async function main() {
  console.log('=================================================================')
  console.log('🎬 JACK HOWLIN - LEAD-VOCAL CONDITIONED LIP-SYNC (KIE.AI)')
  console.log('⚡ Solo Lead Vocals Only + Backing Choir / Solo Idle Isolation')
  console.log('=================================================================\n')

  const baseDir = path.join(process.cwd(), 'projects', 'hate-me-kie-30s')
  const audioDir = path.join(baseDir, 'audio')
  const stillsDir = path.join(baseDir, 'stills')
  const clipsDir = path.join(baseDir, 'clips')
  const exportsDir = path.join(baseDir, 'exports')

  for (const d of [baseDir, audioDir, stillsDir, clipsDir, exportsDir]) {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true })
  }

  const localMasterWav = path.join(process.cwd(), 'projects', 'hate-me-all-you-want', 'audio', 'master-hate-me-all-you-want.wav')
  const localStillPath = path.join(stillsDir, 'jack-howlin-kie-master-still.png')

  if (!fs.existsSync(localStillPath)) {
    throw new Error(`Master still ontbreekt in ${localStillPath}`)
  }

  const stillCloudUrl = await uploadToFirebase(localStillPath, `stills/jack-howlin-kie-master-${Date.now()}.png`, 'image/png')

  // ─── 1. AUDIO CONDITIONING VOOR DE LIP-SYNC DRIVING TRACK ──────────────────
  console.log('🎵 STAP 1: Lead-Vocal Conditioning van de Lip-Sync sturingsaudio...')
  const ffmpegBin = getFfmpegPath()

  const rawWav1 = path.join(audioDir, 'raw-part1-14s.wav')
  const rawWav2 = path.join(audioDir, 'raw-part2-14s.wav')
  await sliceAudioSnippet(localMasterWav, 30, 14.5, rawWav1)
  await sliceAudioSnippet(localMasterWav, 45, 14.5, rawWav2)

  // Part 1: Mute 11.2s to 13.5s (Backing Choir 'You can hate me all you want')
  const driveMp3_1 = path.join(audioDir, 'part1-lead-conditioned.mp3')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-i', rawWav1,
      '-af', "volume=enable='between(t,11.2,13.5)':volume=0",
      '-t', '14.5',
      '-b:a', '192k',
      driveMp3_1
    ])
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg Part 1 conditioning error: ${code}`)))
  })

  // Part 2: Mute 0.0s to 2.2s (Backing Choir) AND 8.5s to 14.5s (Guitar Solo Outro)
  const driveMp3_2 = path.join(audioDir, 'part2-lead-conditioned.mp3')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-i', rawWav2,
      '-af', "volume=enable='between(t,0,2.2)':volume=0,volume=enable='between(t,8.5,14.5)':volume=0",
      '-t', '14.5',
      '-b:a', '192k',
      driveMp3_2
    ])
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg Part 2 conditioning error: ${code}`)))
  })

  console.log('   ✅ Lead-vocal audio tracks geconditioneerd (achtergrondkoor & solo gedempt op sturingsspoor).')

  const driveUrl1 = await uploadToFirebase(driveMp3_1, `audio_sources/drive-part1-${Date.now()}.mp3`, 'audio/mp3')
  const driveUrl2 = await uploadToFirebase(driveMp3_2, `audio_sources/drive-part2-${Date.now()}.mp3`, 'audio/mp3')

  // ─── 2. DEEL 1: 0:00 - 0:15 LEAD LIP-SYNC GENERATIE ────────────────────────
  console.log('\n🎤 STAP 2: Genereren Deel 1 AI Lip-Sync (Lead Vocals Only)...')
  const prompt1 = 'Jack Howlin delivering an intense, raw outlaw country vocal performance singing into vintage chrome microphone, perfect lip sync for lead vocals only, intense focused outlaw eyes, warm amber studio lighting'

  const res1 = runKieCli([
    'infinitalk_lip_sync',
    '--image_url', stillCloudUrl,
    '--audio_url', driveUrl1,
    '--prompt', prompt1,
    '--resolution', '480p'
  ])

  const taskId1 = res1?.task_id || res1?.response?.data?.taskId || res1?.taskId
  console.log(`   Deel 1 Taak ID: ${taskId1}`)
  const videoUrl1 = await waitForKieTask(taskId1)
  console.log(`   ✅ Deel 1 Video URL: ${videoUrl1}`)

  const clip1Path = path.join(clipsDir, 'part1-lead-lipsync.mp4')
  await downloadFile(videoUrl1, clip1Path)
  console.log(`   ✅ Deel 1 opgeslagen: ${clip1Path}`)

  // ─── 3. DEEL 2: 0:15 - 0:30 LEAD LIP-SYNC GENERATIE ────────────────────────
  console.log('\n🎤 STAP 3: Genereren Deel 2 AI Lip-Sync (Lead Vocals Only)...')
  const prompt2 = 'Jack Howlin passionately singing the chorus climax into vintage microphone, natural mouth movements for lead lines, confident outlaw smirk during instrumental outro, amber studio backlight'

  const res2 = runKieCli([
    'infinitalk_lip_sync',
    '--image_url', stillCloudUrl,
    '--audio_url', driveUrl2,
    '--prompt', prompt2,
    '--resolution', '480p'
  ])

  const taskId2 = res2?.task_id || res2?.response?.data?.taskId || res2?.taskId
  console.log(`   Deel 2 Taak ID: ${taskId2}`)
  const videoUrl2 = await waitForKieTask(taskId2)
  console.log(`   ✅ Deel 2 Video URL: ${videoUrl2}`)

  const clip2Path = path.join(clipsDir, 'part2-lead-lipsync.mp4')
  await downloadFile(videoUrl2, clip2Path)
  console.log(`   ✅ Deel 2 opgeslagen: ${clip2Path}`)

  // ─── 4. SAMENVOEGEN & MASTERING MET DE VOLLEDIGE 30s MASTER AUDIO ───────────
  console.log('\n🎞️ STAP 4: Concat & Lossless 30s Mastering met FFmpeg...')
  const concatList = path.join(baseDir, 'concat_list_lead.txt')
  fs.writeFileSync(concatList, `file '${clip1Path.replace(/\\/g, '/')}'\nfile '${clip2Path.replace(/\\/g, '/')}'`)

  const rawConcatVideo = path.join(clipsDir, 'raw-concat-lead-30s.mp4')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, ['-y', '-f', 'concat', '-safe', '0', '-i', concatList, '-c', 'copy', rawConcatVideo])
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`Concat error ${code}`)))
  })

  // Full 30s master audio with all instruments, backing choir, and lead
  const fullAudio30sWav = path.join(audioDir, 'hate-me-full-30s.wav')
  await sliceAudioSnippet(localMasterWav, 30, 30, fullAudio30sWav)

  const masterExport = path.join(exportsDir, 'hate-me-all-you-want-lead-master-30s.mp4')
  await new Promise<void>((resolve, reject) => {
    const proc = spawn(ffmpegBin, [
      '-y',
      '-i', rawConcatVideo,
      '-i', fullAudio30sWav,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '256k',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      masterExport
    ])
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`Remux error ${code}`)))
  })
  console.log(`   ✅ 30s Master Export gereed: ${masterExport}`)

  // ─── 5. CLOUD STORAGE & DASHBOARD SYNC ─────────────────────────────────────
  console.log('\n☁️ STAP 5: Synchroniseren met Firebase Media Library...')
  const publicVideoUrl = await uploadToFirebase(
    masterExport,
    `media_library/hate-me-lead-master-30s-${Date.now()}.mp4`,
    'video/mp4'
  )

  const tracks = await getSunoTracks()
  const hateMeTrack = tracks.find(
    (t) => t.name.toLowerCase().includes('hate me') || t.id === 'kUBhJ6jZ91FUtkNrPqRl'
  )

  const assetId = await createMediaAsset({
    url: publicVideoUrl,
    type: 'video',
    videoType: 'cinematic',
    suggestedCaption:
      "Hate me all you want, but you can't ignore the fire. 🔥⚡ Official 30s Lead-Conditioned Lip-Sync Music Video for Jack Howlin's 'Hate Me All You Want'. Mastered with Kie.ai InfiniTalk & Nano Banana 2. #JackHowlin #KieAI #LipSyncAI #OutlawRock #MusicVideo",
    prompt: 'Kie.ai InfiniTalk Lead-Vocal Conditioned Lip-Sync Master (30s) + Nano Banana 2 2K Still',
    sunoTrackId: hateMeTrack?.id,
  })

  console.log(`\n=================================================================`)
  console.log(`🎉 LEAD-CONDITIONED LIP-SYNC PRODUCTIE VOLTOOID!`)
  console.log(`📁 Master Video: ${masterExport}`)
  console.log(`🌐 Cloud URL: ${publicVideoUrl}`)
  console.log(`🆔 Firestore Media ID: ${assetId}`)
  console.log(`=================================================================\n`)
}

main().catch(err => {
  console.error('\n❌ Productiefout:', err)
  process.exit(1)
})
