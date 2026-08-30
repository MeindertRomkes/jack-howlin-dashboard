import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { addTrackSnippet, deleteTrackSnippet } from '@/lib/studio-firestore'

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.slice(7).trim()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      await adminAuth.verifyIdToken(token)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: any
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { action, trackId, snippet, snippetId } = body || {}

    if (!trackId) {
      return NextResponse.json({ error: 'trackId is required' }, { status: 400 })
    }

    if (action === 'add') {
      if (
        !snippet ||
        !snippet.name ||
        typeof snippet.name !== 'string' ||
        !snippet.name.trim() ||
        snippet.startTime === undefined ||
        snippet.startTime === null ||
        snippet.endTime === undefined ||
        snippet.endTime === null
      ) {
        return NextResponse.json({ error: 'Missing snippet fields' }, { status: 400 })
      }

      const startTime = Number(snippet.startTime)
      const endTime = Number(snippet.endTime)

      if (isNaN(startTime) || isNaN(endTime) || startTime < 0) {
        return NextResponse.json({ error: 'Invalid startTime or endTime' }, { status: 400 })
      }

      const duration = Math.round((endTime - startTime) * 10) / 10

      if (duration <= 0 || duration > 30) {
        return NextResponse.json({ error: 'Snippet duur moet tussen 1 en 30s zijn' }, { status: 400 })
      }

      const newSnippetId = await addTrackSnippet(trackId, {
        name: snippet.name.trim(),
        startTime,
        endTime,
        duration,
        highlightLyric: snippet.highlightLyric?.trim() || undefined,
      })

      return NextResponse.json({ success: true, snippetId: newSnippetId }, { status: 200 })
    }

    if (action === 'delete') {
      if (!snippetId || typeof snippetId !== 'string' || !snippetId.trim()) {
        return NextResponse.json({ error: 'snippetId is required' }, { status: 400 })
      }

      await deleteTrackSnippet(trackId, snippetId.trim())
      return NextResponse.json({ success: true }, { status: 200 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
