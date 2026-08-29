import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import { updateKieJob, createMediaAsset } from '@/lib/studio-firestore'
import '@/lib/firebase-admin'

interface KieCallbackPayload {
  data: {
    taskId: string
    state: 'waiting' | 'success' | 'fail'
    resultJson: string | null
    failMsg: string | null
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: KieCallbackPayload
  try { payload = (await req.json()) as KieCallbackPayload } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { taskId, state, resultJson, failMsg } = payload.data
  const jobSnap = await adminDb.collection('kie_jobs').where('taskId', '==', taskId).limit(1).get()
  if (jobSnap.empty) return NextResponse.json({ ok: true })

  const jobDoc = jobSnap.docs[0]
  const jobId = jobDoc.id
  const jobData = jobDoc.data()

  if (state === 'success' && jobData.state !== 'success') {
    const parsed = resultJson ? JSON.parse(resultJson) as { resultUrls: string[] } : { resultUrls: [] }
    await updateKieJob(jobId, { state: 'success', resultUrls: parsed.resultUrls })
    for (const url of parsed.resultUrls) {
      await createMediaAsset({ url, type: jobData.model === 'photo' ? 'image' : 'video', prompt: jobData.prompt, kieJobId: jobId, ...(jobData.linkedPostId ? { linkedPostId: jobData.linkedPostId } : {}) })
    }
  } else if (state === 'fail' && jobData.state !== 'fail') {
    await updateKieJob(jobId, { state: 'fail', failMsg: failMsg ?? 'Onbekende fout' })
  }

  return NextResponse.json({ ok: true })
}
