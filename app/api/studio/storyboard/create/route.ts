import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { createKieTask } from '@/lib/kie'
import { getJackCoreSet, createStoryboardJob } from '@/lib/studio-firestore'
import type { StoryboardScene } from '@/types'

export type ShotType = 'wide' | 'medium' | 'closeup' | 'drone' | 'pov'

export interface StoryboardCreateSceneInput {
  index?: number
  duration: number
  shotType: ShotType
  prompt: string
  cameraMotion?: string
}

export interface StoryboardCreateRequest {
  sunoTrackId?: string
  snippetId?: string
  totalDuration: number
  aspectRatio?: string
  audioUrl: string
  scenes: StoryboardCreateSceneInput[]
  captionSuggestion?: string
  linkedPostId?: string
}

export interface StoryboardCreateResponse {
  success: boolean
  storyboardJobId: string
  taskIds: string[]
  scenes: StoryboardScene[]
}

export function validateStoryboardCreateInput(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' }
  }
  const candidate = body as Partial<StoryboardCreateRequest>

  if (!candidate.audioUrl || typeof candidate.audioUrl !== 'string' || !candidate.audioUrl.trim()) {
    return { valid: false, error: 'audioUrl is required and must be a non-empty string' }
  }

  if (!Array.isArray(candidate.scenes) || candidate.scenes.length === 0) {
    return { valid: false, error: 'scenes must be a non-empty array' }
  }

  for (let i = 0; i < candidate.scenes.length; i++) {
    const scene = candidate.scenes[i]
    if (!scene || typeof scene !== 'object') {
      return { valid: false, error: `Scene at index ${i} is invalid` }
    }
    if (typeof scene.prompt !== 'string' || !scene.prompt.trim()) {
      return { valid: false, error: `Scene at index ${i} must have a non-empty prompt` }
    }
    if (typeof scene.duration !== 'number' || scene.duration <= 0 || !Number.isFinite(scene.duration)) {
      return { valid: false, error: `Scene at index ${i} must have a positive numeric duration` }
    }
  }

  return { valid: true }
}

export function buildScenePrompt(prompt: string, cameraMotion?: string, referenceUrls: string[] = []): string {
  const trimmedPrompt = prompt.trim()
  const refPrefix = referenceUrls.length > 0
    ? `Reference ${referenceUrls.map((_, i) => `@Image${i + 1}`).join(' ')} for the character appearance. `
    : ''
  let combined = `${refPrefix}${trimmedPrompt}`
  if (cameraMotion && cameraMotion.trim()) {
    if (!/[.!?]$/.test(combined)) {
      combined += '.'
    }
    combined += ` Camera motion: ${cameraMotion.trim()}`
  }
  return combined
}

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
