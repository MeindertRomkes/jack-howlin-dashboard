import { NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST() {
  try {
    const cloudFunctionUrl = 'https://fetchcommentshttp-7w54ng23wa-ew.a.run.app'

    const res = await fetch(cloudFunctionUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error('Fetch comments Cloud Function error:', errorText)
      return NextResponse.json(
        { error: 'Comments ophalen via cloud provider mislukt' },
        { status: 500 }
      )
    }

    // ── Herbereken commentCount per fan op basis van werkelijke comments ──
    // De Cloud Function heeft een bug: hij telt de batch-grootte op bij
    // alle fans in plaats van alleen de auteur van de comment.
    // Wij corrigeren dit na elke sync.
    try {
      const db = adminDb

      // 1. Tel alle comments per auteur
      const allComments = await db.collection('comments').get()
      const perAuthor: Record<string, { count: number; displayName: string; avatar: string | null; platform: string }> = {}

      for (const d of allComments.docs) {
        const c = d.data()
        const author: string = c.author || c.authorDisplayName || 'unknown'
        const platform: string = c.platform || 'youtube'
        // Fan IDs: platform__username_zonder_@_en_met_underscore_voor_punt
        const fanId = `${platform}__${author.replace('@', '').replace(/\./g, '_')}`
        if (!perAuthor[fanId]) {
          perAuthor[fanId] = { count: 0, displayName: author, avatar: c.authorAvatar ?? null, platform }
        }
        perAuthor[fanId].count++
      }

      // 2. Update alle fan-documenten
      const fans = await db.collection('fans').get()
      const batch = db.batch()

      for (const fanDoc of fans.docs) {
        const correct = perAuthor[fanDoc.id]
        const currentData = fanDoc.data()
        const newCount = correct?.count ?? 0
        const updateData: Record<string, unknown> = { commentCount: newCount }
        // Fix username als die ontbreekt
        if (!currentData.username && correct?.displayName) {
          updateData.username = correct.displayName
        }
        batch.update(fanDoc.ref, updateData)
      }

      // 3. Voeg nieuwe fans toe die in comments staan maar niet in fans collection
      const existingFanIds = new Set(fans.docs.map(d => d.id))
      for (const [fanId, data] of Object.entries(perAuthor)) {
        if (!existingFanIds.has(fanId)) {
          const newFanRef = db.collection('fans').doc(fanId)
          batch.set(newFanRef, {
            username: data.displayName,
            platform: data.platform,
            commentCount: data.count,
            avatar: data.avatar,
            isSuperfan: data.count >= 3,
            createdAt: FieldValue.serverTimestamp(),
          })
        }
      }

      await batch.commit()
      console.log(`Fan counts herberekend voor ${fans.size} fans op basis van ${allComments.size} comments`)
    } catch (recountErr) {
      // Niet-fataal — sync is al gelukt, recount is best-effort
      console.error('Fan recount after sync failed (non-fatal):', recountErr)
    }

    return NextResponse.json({ success: true, message: 'Comments succesvol gesynchroniseerd en fan counts herberekend' })
  } catch (error) {
    console.error('Sync comments route error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Synchronisatiefout' },
      { status: 500 }
    )
  }
}
