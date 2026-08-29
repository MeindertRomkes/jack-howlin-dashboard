import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { FieldValue } from 'firebase-admin/firestore'

export async function POST(req: NextRequest) {
  try {
    const { commentId, isLiked } = (await req.json()) as {
      commentId: string
      isLiked: boolean
    }

    if (!commentId) {
      return NextResponse.json({ error: 'commentId is required' }, { status: 400 })
    }

    const docRef = adminDb.collection('comments').doc(commentId)
    const docSnap = await docRef.get()
    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Comment niet gevonden' }, { status: 404 })
    }

    const currentData = docSnap.data()!
    const currentLiked = !!currentData.isLikedByCreator
    const newLiked = isLiked !== undefined ? isLiked : !currentLiked

    const currentLikes = currentData.likeCount || 0
    let newLikes = currentLikes
    if (newLiked && !currentLiked) {
      newLikes = currentLikes + 1
    } else if (!newLiked && currentLiked && currentLikes > 0) {
      newLikes = currentLikes - 1
    }

    await docRef.update({
      isLikedByCreator: newLiked,
      likeCount: newLikes,
      likedAt: newLiked ? FieldValue.serverTimestamp() : null,
    })

    return NextResponse.json({
      success: true,
      commentId,
      isLikedByCreator: newLiked,
      likeCount: newLikes,
    })
  } catch (err) {
    console.error('Failed to toggle like on comment:', err)
    return NextResponse.json(
      { success: false, error: 'Fout bij liken van comment' },
      { status: 500 }
    )
  }
}
