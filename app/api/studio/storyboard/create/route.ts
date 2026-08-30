import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { createKieTask } from '@/lib/kie'
import { getJackCoreSet, createStoryboardJob } from '@/lib/studio-firestore'
import type { StoryboardScene } from '@/types'
import {
  type StoryboardCreateRequest,
  type StoryboardCreateResponse,
  validateStoryboardCreateInput,
  buildScenePrompt,
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

    let body: StoryboardCreateRequest
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const validation = validateStoryboardCreateInput(body)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const coreSet = await getJackCoreSet()
    const referenceUrls = coreSet.map(p => p.publicUrl)
    const callBackUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/studio/callback`
      : undefined
    const aspectRatio = body.aspectRatio || '9:16'

    // Create Kie Seedance 2.5 task for each scene
    const taskIds = await Promise.all(
      body.scenes.map(async (scene) => {
        const fullPrompt = buildScenePrompt(scene.prompt, scene.cameraMotion, referenceUrls)
        const kieInput: Record<string, unknown> = {
          prompt: fullPrompt,
          reference_image_urls: referenceUrls.length > 0 ? referenceUrls : undefined,
          resolution: '1080p',
          aspect_ratio: aspectRatio,
          duration: scene.duration,
          output_format: 'mp4',
          nsfw_checker: true,
        }

        const { taskId } = await createKieTask({
          model: 'bytedance/seedance-2-5',
          input: kieInput,
          ...(callBackUrl ? { callBackUrl } : {}),
        })

        return taskId
      })
    )

    const enrichedScenes: StoryboardScene[] = body.scenes.map((s, idx) => ({
      index: s.index ?? idx,
      duration: s.duration,
      shotType: s.shotType || 'medium',
      prompt: s.prompt.trim(),
      ...(s.cameraMotion?.trim() ? { cameraMotion: s.cameraMotion.trim() } : {}),
      taskId: taskIds[idx],
      state: 'generating',
    }))

    const totalDuration =
      typeof body.totalDuration === 'number' && body.totalDuration > 0
        ? body.totalDuration
        : body.scenes.reduce((sum, s) => sum + s.duration, 0)

    const storyboardJobId = await createStoryboardJob({
      ...(body.sunoTrackId ? { sunoTrackId: body.sunoTrackId } : {}),
      ...(body.snippetId ? { snippetId: body.snippetId } : {}),
      totalDuration,
      aspectRatio,
      audioUrl: body.audioUrl.trim(),
      scenes: enrichedScenes,
      state: 'rendering_scenes',
      ...(body.captionSuggestion ? { captionSuggestion: body.captionSuggestion } : {}),
      ...(body.linkedPostId ? { linkedPostId: body.linkedPostId } : {}),
    })

    const response: StoryboardCreateResponse = {
      success: true,
      storyboardJobId,
      taskIds,
      scenes: enrichedScenes,
    }

    return NextResponse.json(response, { status: 200 })
  } catch (err: unknown) {
    console.error('Storyboard create error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
