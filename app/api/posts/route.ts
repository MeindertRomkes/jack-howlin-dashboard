import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'
import type { Platform } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const { platforms, caption, mediaUrl, mediaType, scheduledAt } =
      (await req.json()) as {
        platforms: Platform[]
        caption: string
        mediaUrl: string | null
        mediaType: 'image' | 'video' | null
        scheduledAt: string
      }

    const docRef = await adminDb.collection('posts').add({
      platforms,
      caption,
      mediaUrl: mediaUrl ?? null,
      mediaType: mediaType ?? null,
      scheduledAt: Timestamp.fromDate(new Date(scheduledAt)),
      status: 'scheduled',
      postedAt: null,
      errorMessage: null,
      createdAt: Timestamp.now(),
    })

    return NextResponse.json({ id: docRef.id })
  } catch (err) {
    console.error('Failed to save post:', err)
    return NextResponse.json(
      { error: 'Failed to save post' },
      { status: 500 }
    )
  }
}
