import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function POST(req: NextRequest) {
  try {
    const { commentId } = (await req.json()) as { commentId: string }

    await adminDb.collection('comments').doc(commentId).update({
      status: 'ignored',
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Failed to ignore comment:', err)
    return NextResponse.json(
      { success: false, error: 'Failed to ignore' },
      { status: 500 }
    )
  }
}
