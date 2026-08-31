import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { getKieTaskStatus } from '@/lib/kie'
import { getHiggsfieldTaskStatus } from '@/lib/higgsfield'
import { updateKieJob, createMediaAsset } from '@/lib/studio-firestore'
import '@/lib/firebase-admin'

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
): Promise<NextResponse> {
  const isDev = process.env.NODE_ENV === 'development'
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!isDev) {
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try { await adminAuth.verifyIdToken(token) } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const jobSnap = await adminDb.collection('kie_jobs').where('taskId', '==', params.taskId).limit(1).get()
  const jobDoc = !jobSnap.empty ? jobSnap.docs[0] : null
  const jobData = jobDoc?.data()
  const provider = jobData?.provider ?? 'higgsfield'

  let state: 'waiting' | 'success' | 'fail' = 'waiting'
  let resultUrls: string[] = []
  let failMsg: string | undefined

  if (provider === 'higgsfield') {
    const status = await getHiggsfieldTaskStatus(params.taskId)
    state = status.state
    resultUrls = status.resultUrls
    failMsg = status.failMsg
  } else {
    const status = await getKieTaskStatus(params.taskId)
    state = status.state
    failMsg = status.failMsg ?? undefined
    if (status.resultJson) {
      try {
        const parsed = JSON.parse(status.resultJson) as { resultUrls?: string[] }
        resultUrls = parsed.resultUrls || []
      } catch {
        resultUrls = []
      }
    }
  }

  if (jobDoc && jobData) {
    const jobId = jobDoc.id
    if (state === 'success' && jobData.state !== 'success') {
      await updateKieJob(jobId, { state: 'success', resultUrls })
      for (const url of resultUrls) {
        await createMediaAsset({
          url,
          type: jobData.model === 'photo' ? 'image' : 'video',
          prompt: jobData.prompt,
          kieJobId: jobId,
          ...(jobData.linkedPostId ? { linkedPostId: jobData.linkedPostId } : {}),
          ...(jobData.videoType ? { videoType: jobData.videoType } : {}),
          ...(jobData.sunoTrackId ? { sunoTrackId: jobData.sunoTrackId } : {}),
          ...(jobData.snippetId ? { snippetId: jobData.snippetId } : {}),
          ...(jobData.captionSuggestion ? { suggestedCaption: jobData.captionSuggestion } : {}),
        })
      }
    } else if (state === 'fail' && jobData.state !== 'fail') {
      await updateKieJob(jobId, { state: 'fail', failMsg: failMsg ?? 'Generatie mislukt' })
    }
  }

  return NextResponse.json({ state, resultUrls })
}

