import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { getKieTaskStatus } from '@/lib/kie'
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

  const status = await getKieTaskStatus(params.taskId)
  const jobSnap = await adminDb.collection('kie_jobs').where('taskId', '==', params.taskId).limit(1).get()

  if (!jobSnap.empty) {
    const jobDoc = jobSnap.docs[0]
    const jobId = jobDoc.id
    const jobData = jobDoc.data()

    if (status.state === 'success' && jobData.state !== 'success') {
      const parsed = status.resultJson ? JSON.parse(status.resultJson) as { resultUrls: string[] } : { resultUrls: [] }
      await updateKieJob(jobId, { state: 'success', resultUrls: parsed.resultUrls })
      for (const url of parsed.resultUrls) {
        await createMediaAsset({ url, type: jobData.model === 'photo' ? 'image' : 'video', prompt: jobData.prompt, kieJobId: jobId, ...(jobData.linkedPostId ? { linkedPostId: jobData.linkedPostId } : {}) })
      }
    } else if (status.state === 'fail' && jobData.state !== 'fail') {
      await updateKieJob(jobId, { state: 'fail', failMsg: status.failMsg ?? 'Onbekende fout' })
    }
  }

  return NextResponse.json({ state: status.state })
}
