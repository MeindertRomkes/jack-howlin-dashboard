import path from 'path'
import dotenv from 'dotenv'

dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { adminStorage } from '../lib/firebase-admin'
import { createMediaAsset, getSunoTracks } from '../lib/studio-firestore'

async function upload() {
  const root = process.cwd()
  const exportPath = path.join(root, 'projects', 'hate-me-kie-30s', 'exports', 'hate-me-part1-lead-master-15s.mp4')
  const bucket = adminStorage.bucket()
  const dest = `media_library/hate-me-part1-lead-master-${Date.now()}.mp4`

  console.log(`Uploading ${exportPath} to gs://${bucket.name}/${dest}...`)
  await bucket.upload(exportPath, {
    destination: dest,
    metadata: { contentType: 'video/mp4' }
  })

  const f = bucket.file(dest)
  await f.makePublic()
  const publicUrl = `https://storage.googleapis.com/${bucket.name}/${dest}`
  console.log(`PUBLIC_URL:${publicUrl}`)

  const tracks = await getSunoTracks()
  const hateMeTrack = tracks.find(t => t.name.toLowerCase().includes('hate me') || t.id === 'kUBhJ6jZ91FUtkNrPqRl')

  const assetId = await createMediaAsset({
    url: publicUrl,
    type: 'video',
    videoType: 'cinematic',
    suggestedCaption: 'Every lie you throw at me just thickens up my skin. 🔥⚡ Jack Howlin official lead-conditioned lip-sync for Hate Me All You Want. Rendered via Kie.ai. #JackHowlin #KieAI #LipSyncAI #OutlawCountryRock',
    prompt: 'Kie.ai InfiniTalk Lead-Conditioned 15s Lip-Sync Master',
    sunoTrackId: hateMeTrack?.id,
  })

  console.log(`ASSET_ID:${assetId}`)
}

upload().catch(console.error)
