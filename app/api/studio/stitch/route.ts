import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { createMediaAsset, updateStoryboardJob } from '@/lib/studio-firestore'
import {
  type StitchRequestBody,
  validateStitchInput,
  resolveMasterVideoUrl,
} from '@/lib/storyboard-helpers'

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

    let body: StitchRequestBody
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    if (!validateStitchInput(body?.sceneUrls, body?.audioUrl)) {
      return NextResponse.json(
        { error: 'sceneUrls must be a non-empty array of valid URLs' },
        { status: 400 }
      )
    }

    const masterUrl = resolveMasterVideoUrl(body.sceneUrls, body.storyboardJobId)

    const mediaAssetId = await createMediaAsset({
      url: masterUrl,
      type: 'video',
      videoType: 'cinematic',
      prompt: 'Multi-scene stitched master reel',
      kieJobId: body.storyboardJobId || `stitch_${Date.now()}`,
      ...(body.sunoTrackId ? { sunoTrackId: body.sunoTrackId } : {}),
      ...(body.snippetId ? { snippetId: body.snippetId } : {}),
      ...(body.captionSuggestion ? { suggestedCaption: body.captionSuggestion } : {}),
      ...(body.linkedPostId ? { linkedPostId: body.linkedPostId } : {}),
    })

    if (body.storyboardJobId) {
      await updateStoryboardJob(body.storyboardJobId, {
        state: 'success',
        masterResultUrl: masterUrl,
      })
    }

    return NextResponse.json(
      {
        success: true,
        masterUrl,
        mediaAssetId,
      },
      { status: 200 }
    )
  } catch (err: unknown) {
    console.error('Studio stitch route error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
