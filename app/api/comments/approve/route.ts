import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const { commentId, commentText, chosenReply, platform, videoTitle } =
      (await req.json()) as {
        commentId: string
        commentText: string
        chosenReply: string
        platform: string
        videoTitle: string
      }

    await adminDb.collection('comments').doc(commentId).update({
      status: 'replied',
      chosenReply,
    })

    await adminDb.collection('voice_history').add({
      commentText,
      chosenReply,
      platform,
      videoTitle,
      timestamp: FieldValue.serverTimestamp(),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to approve comment:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to approve' },
      { status: 500 }
    )
  }
}
