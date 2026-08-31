import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const docSnap = await adminDb.collection('posts').doc(id).get()

    if (!docSnap.exists) {
      return NextResponse.json({ error: 'Post niet gevonden' }, { status: 404 })
    }

    const data = docSnap.data()
    return NextResponse.json({ id: docSnap.id, ...data })
  } catch (err) {
    console.error('Failed to get post:', err)
    return NextResponse.json({ error: 'Fout bij ophalen van post' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await req.json()

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    }

    if (body.platforms !== undefined) updateData.platforms = body.platforms
    if (body.caption !== undefined) updateData.caption = body.caption
    if (body.title !== undefined) updateData.title = body.title || null
    if (body.tags !== undefined) updateData.tags = body.tags
    if (body.mediaUrl !== undefined) updateData.mediaUrl = body.mediaUrl
    if (body.mediaType !== undefined) updateData.mediaType = body.mediaType
    if (body.scheduledAt !== undefined) {
      updateData.scheduledAt = Timestamp.fromDate(new Date(body.scheduledAt))
    }
    if (body.status !== undefined) updateData.status = body.status
    if (body.postedAt !== undefined) {
      updateData.postedAt = body.postedAt ? Timestamp.fromDate(new Date(body.postedAt)) : null
    }

    await adminDb.collection('posts').doc(id).update(updateData)

    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error('Failed to update post:', err)
    return NextResponse.json({ error: 'Fout bij bijwerken van post' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    await adminDb.collection('posts').doc(id).delete()
    return NextResponse.json({ success: true, id })
  } catch (err) {
    console.error('Failed to delete post:', err)
    return NextResponse.json({ error: 'Fout bij verwijderen van post' }, { status: 500 })
  }
}
