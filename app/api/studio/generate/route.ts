import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { createKieTask } from '@/lib/kie'
import { getJackCoreSet, getSunoTracks, createKieJob } from '@/lib/studio-firestore'
import '@/lib/firebase-admin'

interface GenerateBody {
  mode: 'photo' | 'video'
  prompt: string
  aspectRatio: string
  quality?: 'basic' | 'high'
  resolution?: '480p' | '720p' | '1080p'
  duration?: number
  sunoTrackId?: string
  linkedPostId?: string
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { await adminAuth.verifyIdToken(token) } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await req.json()) as GenerateBody
  const { mode, prompt, aspectRatio, quality = 'high', resolution = '1080p', duration = 5, sunoTrackId, linkedPostId } = body

  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt is verplicht' }, { status: 400 })

  const coreSet = await getJackCoreSet()
  const referenceUrls = coreSet.map(p => p.publicUrl)
  const callBackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/studio/callback`
  const kieModel = mode === 'photo' ? 'seedream/5-pro-image-to-image' : 'bytedance/seedance-2-5'

  let kieInput: Record<string, unknown>

  if (mode === 'photo') {
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
      audioUrl = tracks.find(t => t.id === sunoTrackId)?.publicUrl
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

  const { taskId } = await createKieTask({ model: kieModel, input: kieInput, callBackUrl })
  const jobId = await createKieJob({
    taskId, model: mode, kieModel, prompt, aspectRatio,
    ...(linkedPostId ? { linkedPostId } : {}),
  })

  return NextResponse.json({ jobId, taskId })
}
