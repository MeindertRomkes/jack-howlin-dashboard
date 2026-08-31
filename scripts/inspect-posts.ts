import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { adminDb } from '../lib/firebase-admin'

async function checkPosts() {
  const snap = await adminDb.collection('posts').get()
  console.log('Total posts in Firestore:', snap.size)
  snap.docs.forEach((d, i) => {
    const data = d.data()
    console.log(`Post ${i + 1} [ID: ${d.id}]:`)
    console.log(' - scheduledAt:', typeof data.scheduledAt, data.scheduledAt)
    console.log(' - platforms:', data.platforms)
    console.log(' - status:', data.status)
    console.log(' - title:', data.title)
    console.log(' - caption:', data.caption?.slice(0, 40))
  })
}

checkPosts().catch(console.error)
