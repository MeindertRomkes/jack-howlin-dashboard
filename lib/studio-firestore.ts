import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from './firebase-admin'
import type { KieJob, MediaAsset, SunoTrack, JackCoreSetPhoto } from '@/types'

export async function getJackCoreSet(): Promise<JackCoreSetPhoto[]> {
  const snap = await adminDb.collection('jack_core_set').orderBy('order', 'asc').get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as JackCoreSetPhoto))
}

export async function addJackCoreSetPhoto(
  data: Omit<JackCoreSetPhoto, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await adminDb.collection('jack_core_set').add({ ...data, createdAt: FieldValue.serverTimestamp() })
  return ref.id
}

export async function deleteJackCoreSetPhoto(id: string): Promise<void> {
  await adminDb.collection('jack_core_set').doc(id).delete()
}

export async function getSunoTracks(): Promise<SunoTrack[]> {
  const snap = await adminDb.collection('suno_tracks').orderBy('createdAt', 'desc').get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as SunoTrack))
}

export async function addSunoTrack(
  data: Omit<SunoTrack, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await adminDb.collection('suno_tracks').add({ ...data, createdAt: FieldValue.serverTimestamp() })
  return ref.id
}

export async function deleteSunoTrack(id: string): Promise<void> {
  await adminDb.collection('suno_tracks').doc(id).delete()
}

export async function createKieJob(
  data: Omit<KieJob, 'id' | 'createdAt' | 'resultUrls' | 'state'>
): Promise<string> {
  const ref = await adminDb.collection('kie_jobs').add({
    ...data,
    state: 'waiting',
    resultUrls: [],
    createdAt: FieldValue.serverTimestamp(),
  })
  return ref.id
}

export async function updateKieJob(id: string, update: Partial<KieJob>): Promise<void> {
  await adminDb.collection('kie_jobs').doc(id).update({
    ...update,
    ...(update.state === 'success' || update.state === 'fail'
      ? { completedAt: FieldValue.serverTimestamp() } : {}),
  })
}

export async function createMediaAsset(
  data: Omit<MediaAsset, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await adminDb.collection('media_library').add({ ...data, createdAt: FieldValue.serverTimestamp() })
  return ref.id
}

export async function getMediaLibrary(limitCount = 50): Promise<MediaAsset[]> {
  const snap = await adminDb.collection('media_library').orderBy('createdAt', 'desc').limit(limitCount).get()
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaAsset))
}

export async function linkMediaAssetToPost(assetId: string, postId: string): Promise<void> {
  await adminDb.collection('media_library').doc(assetId).update({ linkedPostId: postId })
}
