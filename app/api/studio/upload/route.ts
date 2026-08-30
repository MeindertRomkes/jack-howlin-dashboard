import { NextRequest, NextResponse } from 'next/server'
import { getStorage } from 'firebase-admin/storage'
import { adminAuth } from '@/lib/firebase-admin'
import { addJackCoreSetPhoto, addSunoTrack, getJackCoreSet } from '@/lib/studio-firestore'
import '@/lib/firebase-admin'

type UploadType = 'core-set' | 'suno'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const isDev = process.env.NODE_ENV === 'development'
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!isDev) {
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    try { await adminAuth.verifyIdToken(token) } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const uploadType = formData.get('type') as UploadType | null
  const label = (formData.get('label') as string) || 'Referentie'

  if (!file || !uploadType) return NextResponse.json({ error: 'Missing file or type' }, { status: 400 })

  if (uploadType === 'core-set') {
    const existing = await getJackCoreSet()
    if (existing.length >= 10) return NextResponse.json({ error: 'Maximum 10 Core Set fotos bereikt' }, { status: 400 })
  }

  const bucket = getStorage().bucket('jack-howlin-dashboard.firebasestorage.app')
  const folder = uploadType === 'core-set' ? 'jack-core-set' : 'suno-library'
  const ext = file.name.split('.').pop() ?? 'bin'
  const filename = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  await bucket.file(filename).save(Buffer.from(arrayBuffer), { contentType: file.type })

  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/${encodeURIComponent(filename)}?alt=media`

  let id: string
  if (uploadType === 'core-set') {
    const existing = await getJackCoreSet()
    id = await addJackCoreSetPhoto({ label, storageUrl: `gs://jack-howlin-dashboard.firebasestorage.app/${filename}`, publicUrl, order: existing.length })
  } else {
    // Extract optional album metadata from form
    const releaseType = (formData.get('releaseType') as 'single' | 'album') || 'single'
    const albumName = (formData.get('albumName') as string) || undefined
    const trackNumberRaw = formData.get('trackNumber') as string | null
    const releaseYearRaw = formData.get('releaseYear') as string | null

    id = await addSunoTrack({
      name: label,
      storageUrl: `gs://jack-howlin-dashboard.firebasestorage.app/${filename}`,
      publicUrl,
      releaseType,
      ...(albumName ? { albumName } : {}),
      ...(trackNumberRaw ? { trackNumber: parseInt(trackNumberRaw, 10) } : {}),
      ...(releaseYearRaw ? { releaseYear: parseInt(releaseYearRaw, 10) } : {}),
    })
  }

  return NextResponse.json({ id, publicUrl })
}
