import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
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
import type { Comment, Post, VoiceHistory, SyncState, PersonaConfig, FanProfile, ConnectionHealth, AnalyticsSnapshot, IntelligenceReport } from '@/types'
import { normalizeIntelligenceReport } from './analytics-normalizer'

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

export async function getAllComments(limitCount = 100): Promise<Comment[]> {
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
  try {
    const q = query(
      collection(db, 'posts'),
      orderBy('scheduledAt', 'asc')
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as Post))
  } catch (err) {
    console.warn('Fallback: Querying posts collection without orderBy:', err)
    try {
      const snap = await getDocs(collection(db, 'posts'))
      return snap.docs.map(d => ({ id: d.id, ...d.data() } as Post))
    } catch (e2) {
      console.error('Error fetching posts:', e2)
      return []
    }
  }
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

// ──────────────────────────────────────────────
// Sync State & System
// ──────────────────────────────────────────────
export async function getSyncState(): Promise<SyncState | null> {
  try {
    const snap = await getDoc(doc(db, 'system', 'sync_state'))
    if (snap.exists()) {
      return snap.data() as SyncState
    }
  } catch (err) {
    console.error('Error fetching sync state:', err)
  }
  return null
}

// ──────────────────────────────────────────────
// Persona & AI Studio Settings
// ──────────────────────────────────────────────
export const DEFAULT_PERSONA_CONFIG: PersonaConfig = {
  artistName: "Jack Howlin'",
  genre: 'Outlaw Americana / Dark Country Rock',
  bio: 'The outlaw who refuses to bow. Built on smoke, gravel, burned roads, whiskey and midnight highway truth.',
  toneGuidelines: [
    'Short, confident, never apologetic',
    'Never tries too hard, understated power',
    'Max 2 sentences per reply',
    'No exclamation marks unless ironic',
    'No emoji overload (maximum 1 emoji like ⚡, 🥃, 🤠)',
    'Avoid pop-country cosplay ("Howdy!", "Hey y\'all!")',
  ],
  smartLinks: {
    spotify: 'https://open.spotify.com/artist/jackhowlin',
    youtubeMusic: 'https://music.youtube.com/channel/UC6H_rAkPwGxVwbhn6f86S4Q',
    appleMusic: '',
    website: '',
  },
  customInstructions: 'Focus on connecting with genuine fans. If someone asks for song titles or full versions, point them to Spotify or YouTube lyric videos.',
  updatedAt: Timestamp.now(),
}

export async function getPersonaConfig(): Promise<PersonaConfig> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'persona'))
    if (snap.exists()) {
      return snap.data() as PersonaConfig
    }
  } catch (err) {
    console.error('Error fetching persona config:', err)
  }
  return DEFAULT_PERSONA_CONFIG
}

export async function savePersonaConfig(config: Partial<PersonaConfig>): Promise<void> {
  const ref = doc(db, 'settings', 'persona')
  await setDoc(ref, {
    ...config,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

// ──────────────────────────────────────────────
// Connection Health
// ──────────────────────────────────────────────
export async function getConnectionHealth(): Promise<ConnectionHealth | null> {
  try {
    const snap = await getDoc(doc(db, 'settings', 'connections'))
    if (snap.exists()) {
      return snap.data() as ConnectionHealth
    }
  } catch (err) {
    console.error('Error fetching connections:', err)
  }
  return null
}

// ──────────────────────────────────────────────
// Fans CRM
// ──────────────────────────────────────────────
export async function getFans(limitCount = 50): Promise<FanProfile[]> {
  try {
    const q = query(
      collection(db, 'fans'),
      orderBy('commentCount', 'desc'),
      firestoreLimit(limitCount)
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as FanProfile))
  } catch (err) {
    console.error('Error fetching fans:', err)
    return []
  }
}

// ──────────────────────────────────────────────
// Data Intelligence & Analytics Snapshots
// ──────────────────────────────────────────────
import type { AnalyticsSnapshot, IntelligenceReport } from '@/types'

export async function getLatestAnalyticsSnapshot(): Promise<AnalyticsSnapshot | null> {
  try {
    const q = query(
      collection(db, 'analytics_snapshots'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(1)
    )
    const snap = await getDocs(q)
    if (!snap.empty) {
      const d = snap.docs[0]
      return { id: d.id, ...d.data() } as AnalyticsSnapshot
    }
  } catch (err) {
    console.error('Error fetching latest analytics snapshot:', err)
  }
  return null
}

export async function getAnalyticsHistory(limitCount = 14): Promise<AnalyticsSnapshot[]> {
  try {
    const q = query(
      collection(db, 'analytics_snapshots'),
      orderBy('timestamp', 'desc'),
      firestoreLimit(limitCount)
    )
    const snap = await getDocs(q)
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as AnalyticsSnapshot))
  } catch (err) {
    console.error('Error fetching analytics history:', err)
    return []
  }
}

export async function saveAnalyticsSnapshot(snapshot: Omit<AnalyticsSnapshot, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'analytics_snapshots'), {
    ...snapshot,
    timestamp: serverTimestamp(),
  })
  return ref.id
}

export async function getLatestIntelligenceReport(): Promise<IntelligenceReport | null> {
  try {
    const snap = await getDoc(doc(db, 'system', 'intelligence_report'))
    if (snap.exists()) {
      return normalizeIntelligenceReport({ id: snap.id, ...snap.data() })
    }
  } catch (err) {
    console.error('Error fetching intelligence report:', err)
  }
  return null
}

export async function saveIntelligenceReport(report: Omit<IntelligenceReport, 'id'>): Promise<void> {
  const ref = doc(db, 'system', 'intelligence_report')
  await setDoc(ref, {
    ...report,
    generatedAt: serverTimestamp(),
  }, { merge: true })
}

