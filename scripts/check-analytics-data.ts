import path from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: path.join(process.cwd(), '.env.local') })

import { adminDb } from '../lib/firebase-admin'

async function checkAnalytics() {
  console.log('--- Checking Analytics Snapshots & Intelligence Report ---')
  const snap = await adminDb.collection('analytics_snapshots').get()
  console.log('Analytics Snapshots Count:', snap.size)
  snap.docs.forEach(d => console.log('Snapshot ID:', d.id, d.data()))

  const docSnap = await adminDb.collection('system').doc('intelligence_report').get()
  console.log('\nSystem Intelligence Report Exists?', docSnap.exists)
  if (docSnap.exists) {
    console.log('Report data:', JSON.stringify(docSnap.data(), null, 2))
  }
}

checkAnalytics().catch(console.error)
