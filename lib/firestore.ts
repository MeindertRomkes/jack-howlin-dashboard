import {
  collection,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  addDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Comment, Post, VoiceHistory } from '@/types'

export async function getNewComments(limitCount = 50): Promise<Comment[]> {
  const q = query(
    collection(db, 'comments'),
    where('status', '==', 'new'),
    orderBy('publishedAt', 'desc'),
    firestoreLimit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment))
}

export async function getAllComments(limitCount = 50): Promise<Comment[]> {
  const q = query(
    collection(db, 'comments'),
    orderBy('publishedAt', 'desc'),
    firestoreLimit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Comment))
}

export async function updateCommentStatus(
  commentId: string,
  status: Comment['status'],
  chosenReply?: string
): Promise<void> {
  const ref = doc(db, 'comments', commentId)
  const update: Record<string, unknown> = { status }
  if (chosenReply !== undefined) update.chosenReply = chosenReply
  await updateDoc(ref, update)
}

export async function getVoiceHistory(limitCount = 20): Promise<VoiceHistory[]> {
  const q = query(
    collection(db, 'voice_history'),
    orderBy('timestamp', 'desc'),
    firestoreLimit(limitCount)
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as VoiceHistory))
}

export async function saveChosenReply(
  commentText: string,
  chosenReply: string,
  platform: string,
  videoTitle: string
): Promise<void> {
  await addDoc(collection(db, 'voice_history'), {
    commentText,
    chosenReply,
    platform,
    videoTitle,
    timestamp: serverTimestamp(),
  })
}

export async function getScheduledPosts(): Promise<Post[]> {
  const q = query(
    collection(db, 'posts'),
    where('status', 'in', ['scheduled', 'draft']),
    orderBy('scheduledAt', 'asc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Post))
}

export async function savePost(
  post: Omit<Post, 'id' | 'createdAt'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'posts'), {
    ...post,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updatePostStatus(
  postId: string,
  status: Post['status'],
  postedAt?: Date,
  errorMessage?: string
): Promise<void> {
  const ref = doc(db, 'posts', postId)
  const update: Record<string, unknown> = { status }
  if (postedAt) update.postedAt = Timestamp.fromDate(postedAt)
  if (errorMessage) update.errorMessage = errorMessage
  await updateDoc(ref, update)
}
