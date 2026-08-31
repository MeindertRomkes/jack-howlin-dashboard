import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { createKieTask } from '@/lib/kie'
import { createHiggsfieldImageTask, createHiggsfieldVideoTask } from '@/lib/higgsfield'
import { getJackCoreSet, getSunoTracks, createKieJob } from '@/lib/studio-firestore'
import type { StudioEngine } from '@/types'
import '@/lib/firebase-admin'

interface GenerateBody {
  engine?: StudioEngine
  mode: 'photo' | 'video' | 'audiogram'
  videoType?: 'cinematic' | 'audiogram'
  prompt: string
  aspectRatio: string
  quality?: 'basic' | 'high'
  resolution?: '480p' | '720p' | '1080p'
  duration?: number
  sunoTrackId?: string
  snippetId?: string
  captionSuggestion?: string
  linkedPostId?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const isDev = process.env.NODE_ENV === 'development'
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!isDev) {
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try { await adminAuth.verifyIdToken(token) } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const body = (await req.json()) as GenerateBody
  const {
    engine = 'higgsfield',
    mode,
    videoType,
    prompt,
    aspectRatio,
    quality = 'high',
    resolution = '1080p',
    duration = 5,
    sunoTrackId,
    snippetId,
    captionSuggestion,
    linkedPostId,
  } = body

  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt is verplicht' }, { status: 400 })

  const coreSet = await getJackCoreSet()
  const referenceUrls = coreSet.map(p => p.publicUrl)
  const effectiveMode = mode === 'photo' ? 'photo' : 'video'
  const effectiveVideoType = videoType || (mode === 'audiogram' ? 'audiogram' : mode === 'video' ? 'cinematic' : undefined)

  let taskId: string
  let modelName: string

  if (engine === 'higgsfield') {
    if (effectiveMode === 'photo') {
      const referenceImageUrl = referenceUrls.length > 0 ? referenceUrls[0] : undefined
      const hfRes = await createHiggsfieldImageTask({
        prompt,
        aspectRatio,
        resolution: quality === 'high' ? '2K' : '720p',
        referenceImageUrl,
      })
      taskId = hfRes.request_id
      modelName = referenceImageUrl ? 'higgsfield-ai/soul/reference' : 'higgsfield-ai/soul/standard'
    } else {
      const imageUrl = referenceUrls.length > 0 ? referenceUrls[0] : undefined
      const hfRes = await createHiggsfieldVideoTask({
        prompt,
        aspectRatio,
        resolution,
        duration,
        imageUrl,
      })
      taskId = hfRes.request_id
      modelName = imageUrl ? 'veo3.1/image-to-video' : 'veo3.1'
    }
  } else {
    // Kie.ai Engine
    const callBackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/studio/callback`
    const kieModel = effectiveMode === 'photo' ? 'seedream/5-pro-image-to-image' : 'bytedance/seedance-2-5'
    modelName = kieModel

    let kieInput: Record<string, unknown>

    if (effectiveMode === 'photo') {
      kieInput = {
        prompt,
        image_urls: referenceUrls.length > 0 ? referenceUrls : undefined,
        aspect_ratio: aspectRatio,
        quality,
        output_format: 'png',
        nsfw_checker: true,
      }
    } else {
      let audioUrl: string | undefined
      if (sunoTrackId) {
        const tracks = await getSunoTracks()
        const track = tracks.find(t => t.id === sunoTrackId)
        if (track) {
          if (snippetId && track.snippets) {
            const snippet = track.snippets.find(s => s.id === snippetId)
            audioUrl = snippet?.publicUrl || snippet?.storageUrl || track.publicUrl
          } else {
            audioUrl = track.publicUrl
          }
        }
      }
      const refPrompt = referenceUrls.length > 0
        ? `Reference ${referenceUrls.map((_, i) => `@Image${i + 1}`).join(' ')} for the character appearance. ${prompt}`
        : prompt
      kieInput = {
        prompt: refPrompt,
        reference_image_urls: referenceUrls.length > 0 ? referenceUrls : undefined,
        reference_audio_urls: audioUrl ? [audioUrl] : undefined,
        generate_audio: !audioUrl,
        resolution,
        aspect_ratio: aspectRatio,
        duration,
        output_format: 'mp4',
        nsfw_checker: true,
      }
    }

    const kieRes = await createKieTask({ model: kieModel, input: kieInput, callBackUrl })
    taskId = kieRes.taskId
  }

  const jobId = await createKieJob({
    taskId,
    provider: engine,
    model: effectiveMode,
    kieModel: modelName,
    prompt,
    aspectRatio,
    ...(effectiveVideoType ? { videoType: effectiveVideoType } : {}),
    ...(sunoTrackId ? { sunoTrackId } : {}),
    ...(snippetId ? { snippetId } : {}),
    ...(captionSuggestion ? { captionSuggestion } : {}),
    ...(linkedPostId ? { linkedPostId } : {}),
  })

  return NextResponse.json({ jobId, taskId })
}

