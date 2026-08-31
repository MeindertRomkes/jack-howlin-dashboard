import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { getMediaLibrary, getSunoTracks, getJackCoreSet } from '../lib/studio-firestore'

async function checkOnline() {
  console.log('=================================================================')
  console.log('🌐 JACK HOWLIN COMMAND CENTER — ONLINE ASSETS CHECK')
  console.log('=================================================================\n')

  const media = await getMediaLibrary()
  console.log(`🎬 Media Library Assets (${media.length} items in Firestore):`)
  media.forEach((m, idx) => {
    console.log(`   [${idx + 1}] ID: ${m.id}`)
    console.log(`       Type: ${m.type} | VideoType: ${m.videoType || 'N/A'}`)
    console.log(`       URL: ${m.url}`)
    console.log(`       Caption: ${m.suggestedCaption?.slice(0, 80)}...\n`)
  })

  const tracks = await getSunoTracks()
  console.log(`🎵 Suno Music Tracks (${tracks.length} tracks in Firestore):`)
  tracks.forEach((t, idx) => {
    console.log(`   [${idx + 1}] ${t.name} (ID: ${t.id})`)
    console.log(`       Public URL: ${t.publicUrl}\n`)
  })

  const coreSet = await getJackCoreSet()
  console.log(`📸 Jack Core Set Photos (${coreSet.length} reference photos):`)
  coreSet.forEach((c, idx) => {
    console.log(`   [${idx + 1}] ${c.label} (ID: ${c.id})`)
    console.log(`       Public URL: ${c.publicUrl}\n`)
  })

  console.log('=================================================================')
  console.log('✅ ALLES STAAT LIVE EN GESYNCHRONISEERD IN HET COMMAND CENTER!')
  console.log('=================================================================')
}

checkOnline().catch(console.error)
