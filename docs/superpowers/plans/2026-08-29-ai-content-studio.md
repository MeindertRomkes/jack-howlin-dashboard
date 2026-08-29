# AI Content Studio — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw een volledige AI Content Studio in het Jack Howlin' Command Center die via de Kie API (Seedream 5 Pro voor foto's, Seedance 2.5 voor video's) on-brand content genereert met Jack's referentie-foto's automatisch meegestuurd, Suno WAV-tracks als optionele audio, en directe koppeling aan kalender-posts.

**Architecture:** Next.js API routes (server-side) communiceren met de Kie REST API via een async task-pattern (createTask → poll/webhook). Firebase Storage slaat alle assets op (Jack Core Set, Suno tracks, gegenereerde media). Firestore houdt job-status realtime bij zodat de UI live updates toont via `onSnapshot`. De Kie callback webhook wijst naar `/api/studio/callback` — de publieke Next.js route op de App Hosting URL.

**Tech Stack:** Next.js 14 App Router, TypeScript, Firebase Admin SDK (server-side Storage + Firestore), Firebase Client SDK (realtime `onSnapshot`), Kie REST API (`api.kie.ai/api/v1`), Tailwind CSS, Lucide React icons.

**Spec:** `docs/superpowers/specs/2026-08-29-ai-content-studio-design.md`

## Global Constraints

- TypeScript strict mode — geen `any` zonder expliciete cast, alle functies hebben return-types
- Tailwind alleen — geen inline styles, geen nieuwe CSS bestanden
- Bestaande Outlaw Americana kleurpalet: `amber-500` (accent), `stone-950/900/800` (backgrounds), `stone-400/300` (tekst)
- Server-side API routes gebruiken `firebase-admin` (via `lib/firebase-admin.ts`), client-side gebruikt `lib/firebase.ts`
- Alle nieuwe Firestore collections volgen het patroon van `lib/firestore.ts`
- Kie API key: `process.env.KIE_API_KEY` — nooit in client-side code
- Firebase Storage bucket: `jack-howlin-dashboard.firebasestorage.app`
- App hostname voor callback URL: `process.env.NEXT_PUBLIC_APP_URL`
- Max 10 Jack Core Set foto's, max 15MB per Suno WAV, max 30MB per referentie-foto

---

## Task 1: Types & Env Vars

**Files:**
- Modify: `types/index.ts`
- Modify: `.env.local`
- Modify: `storage.rules`

**Interfaces:**
- Produces: `KieJob`, `MediaAsset`, `SunoTrack`, `JackCoreSetPhoto`

- [ ] **Step 1: Voeg studio types toe aan `types/index.ts`** — voeg onderaan (vóór laatste lege regel) toe:

```typescript
// ─── AI Content Studio ───────────────────────────────────────────────────────

export type KieModel = 'photo' | 'video'
export type KieState = 'waiting' | 'success' | 'fail'

export interface KieJob {
  id: string
  taskId: string
  model: KieModel
  kieModel: string
  state: KieState
  prompt: string
  aspectRatio: string
  resultUrls: string[]
  linkedPostId?: string
  failMsg?: string
  createdAt: Timestamp
  completedAt?: Timestamp
}

export interface MediaAsset {
  id: string
  url: string
  type: 'image' | 'video'
  prompt: string
  kieJobId: string
  linkedPostId?: string
  createdAt: Timestamp
}

export interface SunoTrack {
  id: string
  name: string
  storageUrl: string
  publicUrl: string
  durationSeconds?: number
  createdAt: Timestamp
}

export interface JackCoreSetPhoto {
  id: string
  label: string
  storageUrl: string
  publicUrl: string
  order: number
  createdAt: Timestamp
}
```

- [ ] **Step 2: Voeg env vars toe aan `.env.local`:**

```bash
KIE_API_KEY=3761d5d43d965b8f62a2e10f7f262aa4
KIE_API_BASE_URL=https://api.kie.ai/api/v1
NEXT_PUBLIC_APP_URL=https://jack-howlin-dashboard--pr1-57c2e9w9.us-central1.hosted.app
```

> Lokaal tijdelijk op `http://localhost:3000` — Kie callback werkt dan niet maar generatie wel.

- [ ] **Step 3: Vervang volledige `storage.rules`:**

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /posts/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.auth.token.email == 'romkesmeindert@gmail.com'
        && request.resource.size < 200 * 1024 * 1024;
    }
    match /jack-core-set/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email == 'romkesmeindert@gmail.com'
        && request.resource.size < 30 * 1024 * 1024;
    }
    match /suno-library/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email == 'romkesmeindert@gmail.com'
        && request.resource.size < 15 * 1024 * 1024;
    }
    match /media-library/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

- [ ] **Step 4: Deploy storage rules:**

```bash
npx firebase-tools deploy --only storage
```

- [ ] **Step 5: Commit:**

```bash
git add types/index.ts .env.local storage.rules
git commit -m "feat(studio): add types, env vars and storage rules"
```

---

## Task 2: Kie API Client

**Files:**
- Create: `lib/kie.ts`

**Interfaces:**
- Produces:
  - `createKieTask(params: CreateKieTaskParams): Promise<{ taskId: string }>`
  - `getKieTaskStatus(taskId: string): Promise<KieTaskStatusResponse>`

- [ ] **Step 1: Maak `lib/kie.ts`:**

```typescript
// lib/kie.ts — Server-side only
const BASE_URL = process.env.KIE_API_BASE_URL ?? 'https://api.kie.ai/api/v1'
const API_KEY = process.env.KIE_API_KEY ?? ''

export interface CreateKieTaskParams {
  model: string
  input: Record<string, unknown>
  callBackUrl?: string
}

export interface KieTaskStatusResponse {
  taskId: string
  model: string
  state: 'waiting' | 'success' | 'fail'
  resultJson: string | null
  failCode: string | null
  failMsg: string | null
  costTime: number | null
  completeTime: number | null
  createTime: number
}

function authHeader() {
  return { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' }
}

export async function createKieTask(params: CreateKieTaskParams): Promise<{ taskId: string }> {
  const res = await fetch(`${BASE_URL}/jobs/createTask`, {
    method: 'POST',
    headers: authHeader(),
    body: JSON.stringify(params),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Kie createTask failed [${res.status}]: ${text}`)
  }
  const json = await res.json() as { code: number; msg: string; data: { taskId: string } }
  if (json.code !== 200) throw new Error(`Kie error: ${json.msg}`)
  return { taskId: json.data.taskId }
}

export async function getKieTaskStatus(taskId: string): Promise<KieTaskStatusResponse> {
  const res = await fetch(`${BASE_URL}/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, {
    headers: authHeader(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Kie getStatus failed [${res.status}]: ${text}`)
  }
  const json = await res.json() as { code: number; msg: string; data: KieTaskStatusResponse }
  if (json.code !== 200) throw new Error(`Kie error: ${json.msg}`)
  return json.data
}
```

- [ ] **Step 2:** `npx tsc --noEmit` — verwacht: geen fouten.

- [ ] **Step 3: Commit:**

```bash
git add lib/kie.ts
git commit -m "feat(studio): add Kie API client"
```

---

## Task 3: Studio Firestore Helpers

**Files:**
- Create: `lib/studio-firestore.ts`

**Interfaces:**
- Consumes: `adminDb` van `lib/firebase-admin.ts`; alle studio types van `types/index.ts`
- Produces:
  - `getJackCoreSet(): Promise<JackCoreSetPhoto[]>`
  - `addJackCoreSetPhoto(data): Promise<string>`
  - `deleteJackCoreSetPhoto(id: string): Promise<void>`
  - `getSunoTracks(): Promise<SunoTrack[]>`
  - `addSunoTrack(data): Promise<string>`
  - `deleteSunoTrack(id: string): Promise<void>`
  - `createKieJob(data): Promise<string>`
  - `updateKieJob(id: string, update: Partial<KieJob>): Promise<void>`
  - `createMediaAsset(data): Promise<string>`
  - `getMediaLibrary(limitCount?: number): Promise<MediaAsset[]>`
  - `linkMediaAssetToPost(assetId: string, postId: string): Promise<void>`

- [ ] **Step 1: Maak `lib/studio-firestore.ts`:**

```typescript
// lib/studio-firestore.ts — Server-side only
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
```

- [ ] **Step 2:** `npx tsc --noEmit` — geen fouten.

- [ ] **Step 3: Commit:**

```bash
git add lib/studio-firestore.ts
git commit -m "feat(studio): add studio Firestore helpers"
```

---

## Task 4: Upload API Route

**Files:**
- Create: `app/api/studio/upload/route.ts`

**Interfaces:**
- Consumes: `adminAuth` (`lib/firebase-admin.ts`), `addJackCoreSetPhoto`, `addSunoTrack`, `getJackCoreSet` (`lib/studio-firestore.ts`)
- Produces: `POST /api/studio/upload` → `{ id: string; publicUrl: string }`

- [ ] **Step 1: Maak `app/api/studio/upload/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getStorage } from 'firebase-admin/storage'
import { adminAuth } from '@/lib/firebase-admin'
import { addJackCoreSetPhoto, addSunoTrack, getJackCoreSet } from '@/lib/studio-firestore'
import '@/lib/firebase-admin'

type UploadType = 'core-set' | 'suno'

export async function POST(req: NextRequest): Promise<NextResponse> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { await adminAuth.verifyIdToken(token) } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
    id = await addSunoTrack({ name: label, storageUrl: `gs://jack-howlin-dashboard.firebasestorage.app/${filename}`, publicUrl })
  }

  return NextResponse.json({ id, publicUrl })
}
```

- [ ] **Step 2:** `npx tsc --noEmit` — geen fouten.

- [ ] **Step 3: Commit:**

```bash
git add app/api/studio/upload/route.ts
git commit -m "feat(studio): add upload API route"
```

---

## Task 5: Generate API Route

**Files:**
- Create: `app/api/studio/generate/route.ts`

**Interfaces:**
- Consumes: `createKieTask` (`lib/kie.ts`), `getJackCoreSet`, `getSunoTracks`, `createKieJob` (`lib/studio-firestore.ts`)
- Produces: `POST /api/studio/generate` → `{ jobId: string; taskId: string }`

- [ ] **Step 1: Maak `app/api/studio/generate/route.ts`:**

```typescript
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
```

- [ ] **Step 2:** `npx tsc --noEmit` — geen fouten.

- [ ] **Step 3: Commit:**

```bash
git add app/api/studio/generate/route.ts
git commit -m "feat(studio): add generate API route"
```

---

## Task 6: Status & Callback Routes

**Files:**
- Create: `app/api/studio/status/[taskId]/route.ts`
- Create: `app/api/studio/callback/route.ts`

**Interfaces:**
- Consumes: `getKieTaskStatus` (`lib/kie.ts`), `updateKieJob`, `createMediaAsset` (`lib/studio-firestore.ts`), `adminDb` (`lib/firebase-admin.ts`)
- Produces:
  - `GET /api/studio/status/[taskId]` → `{ state: KieState }`
  - `POST /api/studio/callback` → `{ ok: true }`

- [ ] **Step 1: Maak `app/api/studio/status/[taskId]/route.ts`:**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth, adminDb } from '@/lib/firebase-admin'
import { getKieTaskStatus } from '@/lib/kie'
import { updateKieJob, createMediaAsset } from '@/lib/studio-firestore'
import '@/lib/firebase-admin'

export async function GET(
  req: NextRequest,
  { params }: { params: { taskId: string } }
): Promise<NextResponse> {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  try { await adminAuth.verifyIdToken(token) } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
```

- [ ] **Step 2: Maak `app/api/studio/callback/route.ts`:**

```typescript
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

  if (state === 'success') {
    const parsed = resultJson ? JSON.parse(resultJson) as { resultUrls: string[] } : { resultUrls: [] }
    await updateKieJob(jobId, { state: 'success', resultUrls: parsed.resultUrls })
    for (const url of parsed.resultUrls) {
      await createMediaAsset({ url, type: jobData.model === 'photo' ? 'image' : 'video', prompt: jobData.prompt, kieJobId: jobId, ...(jobData.linkedPostId ? { linkedPostId: jobData.linkedPostId } : {}) })
    }
  } else if (state === 'fail') {
    await updateKieJob(jobId, { state: 'fail', failMsg: failMsg ?? 'Onbekende fout' })
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3:** `npx tsc --noEmit` — geen fouten.

- [ ] **Step 4: Commit:**

```bash
git add app/api/studio/status app/api/studio/callback
git commit -m "feat(studio): add status and callback routes"
```

---

## Task 7: Firestore Indexes & Rules

**Files:**
- Modify: `firestore.indexes.json`
- Modify: `firestore.rules`

- [ ] **Step 1: Voeg toe aan `firestore.indexes.json` indexes array:**

```json
{ "collectionGroup": "kie_jobs", "queryScope": "COLLECTION", "fields": [{ "fieldPath": "taskId", "order": "ASCENDING" }, { "fieldPath": "createdAt", "order": "DESCENDING" }] },
{ "collectionGroup": "media_library", "queryScope": "COLLECTION", "fields": [{ "fieldPath": "createdAt", "order": "DESCENDING" }] },
{ "collectionGroup": "jack_core_set", "queryScope": "COLLECTION", "fields": [{ "fieldPath": "order", "order": "ASCENDING" }] },
{ "collectionGroup": "suno_tracks", "queryScope": "COLLECTION", "fields": [{ "fieldPath": "createdAt", "order": "DESCENDING" }] }
```

- [ ] **Step 2: Voeg toe aan `firestore.rules`** in het `match /databases/{database}/documents` block:

```
match /jack_core_set/{docId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.token.email == 'romkesmeindert@gmail.com';
}
match /suno_tracks/{docId} {
  allow read: if request.auth != null;
  allow write: if request.auth != null && request.auth.token.email == 'romkesmeindert@gmail.com';
}
match /kie_jobs/{docId} {
  allow read: if request.auth != null;
  allow write: if false;
}
match /media_library/{docId} {
  allow read: if request.auth != null;
  allow write: if false;
}
```

- [ ] **Step 3: Deploy:**

```bash
npx firebase-tools deploy --only firestore
```

- [ ] **Step 4: Commit:**

```bash
git add firestore.indexes.json firestore.rules
git commit -m "feat(studio): add Firestore indexes and rules for studio collections"
```

---

## Task 8: Settings Components

**Files:**
- Create: `components/settings/JackCoreSetManager.tsx`
- Create: `components/settings/SunoLibraryManager.tsx`
- Modify: `app/(dashboard)/settings/page.tsx`

**Interfaces:**
- Consumes: `JackCoreSetPhoto`, `SunoTrack` van `types/index.ts`; Firebase client `onSnapshot`; `getAuth().currentUser?.getIdToken()` voor upload auth
- Produces: `<JackCoreSetManager />`, `<SunoLibraryManager />`

- [ ] **Step 1: Maak `components/settings/JackCoreSetManager.tsx`:**

```typescript
'use client'
import { useEffect, useState, useRef } from 'react'
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '@/lib/firebase'
import type { JackCoreSetPhoto } from '@/types'
import { Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react'

export default function JackCoreSetManager() {
  const [photos, setPhotos] = useState<JackCoreSetPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const q = query(collection(db, 'jack_core_set'), orderBy('order', 'asc'))
    return onSnapshot(q, snap => {
      setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() } as JackCoreSetPhoto)))
    })
  }, [])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !label.trim()) { setError('Geef een label en kies een foto'); return }
    if (photos.length >= 10) { setError('Maximum 10 fotos bereikt'); return }
    setUploading(true); setError(null)
    try {
      const token = await getAuth().currentUser?.getIdToken()
      const fd = new FormData()
      fd.append('file', file); fd.append('type', 'core-set'); fd.append('label', label.trim())
      const res = await fetch('/api/studio/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      if (!res.ok) { const j = await res.json() as { error: string }; throw new Error(j.error) }
      setLabel(''); if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload mislukt')
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-stone-200 tracking-wider uppercase">Jack Core Set</h3>
        <span className="text-xs text-stone-500">({photos.length}/10) — altijd meegestuurd bij generatie</span>
      </div>
      <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-2">
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="Label (bijv. desert portrait)"
          className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60" />
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()}
          className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-300 hover:border-amber-500/40 transition-colors">Kies foto</button>
        <button type="submit" disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 border border-amber-500/40 rounded-lg text-xs text-amber-400 hover:bg-amber-600/30 transition-colors disabled:opacity-50">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}Uploaden
        </button>
      </form>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {photos.map(photo => (
          <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-stone-800 bg-stone-900">
            <img src={photo.publicUrl} alt={photo.label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-stone-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
              <span className="text-xs text-stone-300 font-medium px-1 text-center leading-tight">{photo.label}</span>
              <button onClick={() => deleteDoc(doc(db, 'jack_core_set', photo.id))}
                className="p-1 rounded bg-red-900/60 text-red-400 hover:bg-red-900/80 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
        {photos.length === 0 && <div className="col-span-full text-center py-6 text-stone-500 text-xs">Upload Jack&apos;s referentie-fotos om te beginnen.</div>}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Maak `components/settings/SunoLibraryManager.tsx`:**

```typescript
'use client'
import { useEffect, useState, useRef } from 'react'
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '@/lib/firebase'
import type { SunoTrack } from '@/types'
import { Upload, Trash2, Music, Loader2 } from 'lucide-react'

export default function SunoLibraryManager() {
  const [tracks, setTracks] = useState<SunoTrack[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trackName, setTrackName] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const q = query(collection(db, 'suno_tracks'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => { setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() } as SunoTrack))) })
  }, [])

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || !trackName.trim()) { setError('Geef een tracknaam en kies een WAV-bestand'); return }
    setUploading(true); setError(null)
    try {
      const token = await getAuth().currentUser?.getIdToken()
      const fd = new FormData()
      fd.append('file', file); fd.append('type', 'suno'); fd.append('label', trackName.trim())
      const res = await fetch('/api/studio/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      if (!res.ok) { const j = await res.json() as { error: string }; throw new Error(j.error) }
      setTrackName(''); if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload mislukt')
    } finally { setUploading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-stone-200 tracking-wider uppercase">Suno Library</h3>
        <span className="text-xs text-stone-500">WAV tracks voor video-generatie</span>
      </div>
      <form onSubmit={handleUpload} className="flex flex-col sm:flex-row gap-2">
        <input value={trackName} onChange={e => setTrackName(e.target.value)} placeholder="Tracknaam (bijv. Ride On - v2)"
          className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60" />
        <input ref={fileRef} type="file" accept="audio/wav,audio/mpeg,audio/mp4" className="hidden" />
        <button type="button" onClick={() => fileRef.current?.click()}
          className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-300 hover:border-amber-500/40 transition-colors">Kies WAV</button>
        <button type="submit" disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 border border-amber-500/40 rounded-lg text-xs text-amber-400 hover:bg-amber-600/30 transition-colors disabled:opacity-50">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}Uploaden
        </button>
      </form>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="space-y-2">
        {tracks.map(t => (
          <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-stone-900/60 border border-stone-800 rounded-lg">
            <div className="flex items-center gap-2"><Music className="w-3.5 h-3.5 text-amber-500/70" /><span className="text-sm text-stone-300">{t.name}</span></div>
            <button onClick={() => deleteDoc(doc(db, 'suno_tracks', t.id))} className="p-1 rounded text-stone-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
          </div>
        ))}
        {tracks.length === 0 && <p className="text-center py-4 text-stone-500 text-xs">Nog geen tracks geüpload.</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Voeg toe aan `app/(dashboard)/settings/page.tsx`**

Bovenaan imports toevoegen:
```typescript
import JackCoreSetManager from '@/components/settings/JackCoreSetManager'
import SunoLibraryManager from '@/components/settings/SunoLibraryManager'
```

Onderaan in de JSX, vóór de sluitende container-div:
```tsx
<div className="mt-8 space-y-6">
  <div className="p-6 bg-stone-900/40 border border-stone-800/60 rounded-xl">
    <JackCoreSetManager />
  </div>
  <div className="p-6 bg-stone-900/40 border border-stone-800/60 rounded-xl">
    <SunoLibraryManager />
  </div>
</div>
```

- [ ] **Step 4:** `npx tsc --noEmit` en open Settings in browser — beide secties zichtbaar.

- [ ] **Step 5: Commit:**

```bash
git add components/settings/ app/(dashboard)/settings/page.tsx
git commit -m "feat(studio): add Core Set and Suno Library settings components"
```

---

## Task 9: Studio UI Components

**Files:**
- Create: `components/studio/JackCoreSetPreview.tsx`
- Create: `components/studio/SunoTrackSelector.tsx`
- Create: `components/studio/GenerationStatus.tsx`
- Create: `components/studio/GenerationForm.tsx`

- [ ] **Step 1: Maak `components/studio/JackCoreSetPreview.tsx`:**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { JackCoreSetPhoto } from '@/types'
import { ImageIcon, CheckCircle2 } from 'lucide-react'

export default function JackCoreSetPreview() {
  const [photos, setPhotos] = useState<JackCoreSetPhoto[]>([])
  useEffect(() => {
    const q = query(collection(db, 'jack_core_set'), orderBy('order', 'asc'))
    return onSnapshot(q, snap => { setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() } as JackCoreSetPhoto))) })
  }, [])
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
        <span className="text-xs text-stone-400 font-medium">Jack Core Set — altijd automatisch meegestuurd ({photos.length} fotos)</span>
      </div>
      {photos.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {photos.map(p => (
            <div key={p.id} className="relative w-10 h-10 rounded-md overflow-hidden border border-stone-700 group">
              <img src={p.publicUrl} alt={p.label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-stone-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[9px] text-stone-300 text-center leading-tight px-0.5">{p.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {photos.length === 0 && <div className="flex items-center gap-1.5 text-xs text-stone-500"><ImageIcon className="w-3.5 h-3.5" />Nog geen Core Set fotos — upload ze in Settings</div>}
    </div>
  )
}
```

- [ ] **Step 2: Maak `components/studio/SunoTrackSelector.tsx`:**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { SunoTrack } from '@/types'
import { Music } from 'lucide-react'

interface Props { value: string; onChange: (trackId: string) => void }

export default function SunoTrackSelector({ value, onChange }: Props) {
  const [tracks, setTracks] = useState<SunoTrack[]>([])
  useEffect(() => {
    const q = query(collection(db, 'suno_tracks'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => { setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() } as SunoTrack))) })
  }, [])
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs text-stone-400 font-medium"><Music className="w-3.5 h-3.5 text-amber-500/70" />Suno Track (optioneel — alleen video)</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60 appearance-none">
        <option value="">Geen track — AI genereert audio</option>
        {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
  )
}
```

- [ ] **Step 3: Maak `components/studio/GenerationStatus.tsx`:**

```typescript
'use client'
import { useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { KieJob } from '@/types'
import { Loader2 } from 'lucide-react'

interface Props { jobId: string; onComplete: (resultUrls: string[]) => void }

export default function GenerationStatus({ jobId, onComplete }: Props) {
  useEffect(() => {
    const ref = doc(db, 'kie_jobs', jobId)
    return onSnapshot(ref, snap => {
      if (!snap.exists()) return
      const data = snap.data() as KieJob
      if (data.state === 'success') onComplete(data.resultUrls)
    })
  }, [jobId, onComplete])
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-stone-900/60 border border-amber-500/20 rounded-lg">
      <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
      <span className="text-sm text-stone-300">Genereren... Dit kan 30 seconden tot 3 minuten duren.</span>
    </div>
  )
}
```

- [ ] **Step 4: Maak `components/studio/GenerationForm.tsx`:**

```typescript
'use client'
import { useState } from 'react'
import { getAuth } from 'firebase/auth'
import { Sparkles, Camera, Video, Loader2 } from 'lucide-react'
import JackCoreSetPreview from './JackCoreSetPreview'
import SunoTrackSelector from './SunoTrackSelector'

const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '4:3', '3:4']

interface Props {
  onJobCreated: (jobId: string, taskId: string) => void
  linkedPostId?: string
  initialPrompt?: string
}

export default function GenerationForm({ onJobCreated, linkedPostId, initialPrompt = '' }: Props) {
  const [mode, setMode] = useState<'photo' | 'video'>('photo')
  const [prompt, setPrompt] = useState(initialPrompt)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [quality, setQuality] = useState<'basic' | 'high'>('high')
  const [resolution, setResolution] = useState('1080p')
  const [duration, setDuration] = useState(5)
  const [sunoTrackId, setSunoTrackId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) { setError('Voer een prompt in'); return }
    setLoading(true); setError(null)
    try {
      const token = await getAuth().currentUser?.getIdToken()
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode, prompt, aspectRatio, quality, resolution, duration, sunoTrackId: sunoTrackId || undefined, linkedPostId }),
      })
      if (!res.ok) { const j = await res.json() as { error: string }; throw new Error(j.error) }
      const { jobId, taskId } = await res.json() as { jobId: string; taskId: string }
      onJobCreated(jobId, taskId); setPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generatie mislukt')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {(['photo', 'video'] as const).map(m => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${mode === m ? 'bg-amber-600/20 border border-amber-500/40 text-amber-400' : 'bg-stone-900 border border-stone-700 text-stone-400 hover:border-stone-600'}`}>
            {m === 'photo' ? <Camera className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            {m === 'photo' ? 'Foto' : 'Video'}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        <label className="text-xs text-stone-400 font-medium">Prompt</label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
          placeholder={mode === 'photo' ? 'Jack staand op een verlaten Nevada highway bij zonsondergang...' : 'Jack rijdt in een vintage pickup over een desert highway...'}
          className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60 resize-none" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-stone-400 font-medium">Verhouding</label>
          <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60">
            {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {mode === 'photo' && (
          <div className="space-y-1">
            <label className="text-xs text-stone-400 font-medium">Kwaliteit</label>
            <select value={quality} onChange={e => setQuality(e.target.value as 'basic' | 'high')}
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60">
              <option value="high">High (2K)</option><option value="basic">Basic (1K)</option>
            </select>
          </div>
        )}
        {mode === 'video' && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-stone-400 font-medium">Resolutie</label>
              <select value={resolution} onChange={e => setResolution(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60">
                <option value="1080p">1080p</option><option value="720p">720p</option><option value="480p">480p</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-stone-400 font-medium">Duur: {duration}s</label>
              <input type="range" min={5} max={30} step={1} value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full accent-amber-500" />
            </div>
          </>
        )}
      </div>
      {mode === 'video' && <SunoTrackSelector value={sunoTrackId} onChange={setSunoTrackId} />}
      <JackCoreSetPreview />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600/20 border border-amber-500/50 rounded-lg text-sm font-bold text-amber-400 hover:bg-amber-600/30 transition-colors disabled:opacity-50 tracking-wider uppercase">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Taak aanmaken...' : `${mode === 'photo' ? 'Foto' : 'Video'} Genereren`}
      </button>
    </form>
  )
}
```

- [ ] **Step 5:** `npx tsc --noEmit` — geen fouten.

- [ ] **Step 6: Commit:**

```bash
git add components/studio/GenerationForm.tsx components/studio/JackCoreSetPreview.tsx components/studio/SunoTrackSelector.tsx components/studio/GenerationStatus.tsx
git commit -m "feat(studio): add generation form and status components"
```

---

## Task 10: Media Library Component

**Files:**
- Create: `components/studio/MediaLibrary.tsx`

**Interfaces:**
- Consumes: `MediaAsset` van `types/index.ts`; Firebase client `onSnapshot`
- Produces: `<MediaLibrary onLinkToPost?: (assetId: string, url: string) => void; highlightUrls?: string[] />`

- [ ] **Step 1: Maak `components/studio/MediaLibrary.tsx`:**

```typescript
'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { MediaAsset } from '@/types'
import { Download, Link2, Video, ImageIcon, CheckCircle2 } from 'lucide-react'

interface Props {
  onLinkToPost?: (assetId: string, url: string) => void
  highlightUrls?: string[]
}

export default function MediaLibrary({ onLinkToPost, highlightUrls = [] }: Props) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  useEffect(() => {
    const q = query(collection(db, 'media_library'), orderBy('createdAt', 'desc'), limit(50))
    return onSnapshot(q, snap => { setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaAsset))) })
  }, [])

  if (assets.length === 0) {
    return <div className="text-center py-10 text-stone-500 text-sm border border-dashed border-stone-800 rounded-xl">Nog geen content gegenereerd. Gebruik het formulier om te beginnen.</div>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {assets.map(asset => {
        const isNew = highlightUrls.includes(asset.url)
        return (
          <div key={asset.id} className={`relative group rounded-xl overflow-hidden border bg-stone-900 ${isNew ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-stone-800'}`}>
            {asset.type === 'video' ? (
              <video src={asset.url} className="w-full aspect-[9/16] object-cover" muted playsInline
                onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                onMouseLeave={e => { (e.currentTarget as HTMLVideoElement).pause(); (e.currentTarget as HTMLVideoElement).currentTime = 0 }} />
            ) : (
              <img src={asset.url} alt={asset.prompt} className="w-full aspect-[9/16] object-cover" />
            )}
            {isNew && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-500 rounded text-[10px] font-bold text-stone-950">NIEUW</div>}
            {asset.linkedPostId && <div className="absolute top-2 right-2"><CheckCircle2 className="w-4 h-4 text-green-400" /></div>}
            <div className="absolute inset-0 bg-stone-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
              <div className="flex items-center gap-1 text-[10px] text-stone-400">
                {asset.type === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                <span className="line-clamp-2 text-center">{asset.prompt.slice(0, 50)}</span>
              </div>
              <div className="flex gap-2">
                <a href={asset.url} download target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-amber-400 transition-colors"><Download className="w-3.5 h-3.5" /></a>
                {onLinkToPost && !asset.linkedPostId && (
                  <button onClick={() => onLinkToPost(asset.id, asset.url)}
                    className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-amber-400 transition-colors"><Link2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2:** `npx tsc --noEmit` — geen fouten.

- [ ] **Step 3: Commit:**

```bash
git add components/studio/MediaLibrary.tsx
git commit -m "feat(studio): add Media Library component"
```

---

## Task 11: Studio Page & Nav

**Files:**
- Create: `app/(dashboard)/studio/page.tsx`
- Modify: `components/Nav.tsx`

- [ ] **Step 1: Maak `app/(dashboard)/studio/page.tsx`:**

```typescript
'use client'
import { useState, useCallback } from 'react'
import { Clapperboard } from 'lucide-react'
import GenerationForm from '@/components/studio/GenerationForm'
import GenerationStatus from '@/components/studio/GenerationStatus'
import MediaLibrary from '@/components/studio/MediaLibrary'

export default function StudioPage() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [newResultUrls, setNewResultUrls] = useState<string[]>([])

  const handleJobCreated = useCallback((jobId: string) => {
    setActiveJobId(jobId); setNewResultUrls([])
  }, [])

  const handleComplete = useCallback((resultUrls: string[]) => {
    setActiveJobId(null); setNewResultUrls(resultUrls)
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Clapperboard className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-stone-100 tracking-tight">AI Content Studio</h1>
          <p className="text-xs text-stone-500 mt-0.5">Genereer on-brand foto&apos;s en video&apos;s met Jack&apos;s visuele DNA</p>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="p-6 bg-stone-900/40 border border-stone-800/60 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-stone-300 tracking-wider uppercase">Nieuwe generatie</h2>
          <GenerationForm onJobCreated={handleJobCreated} />
          {activeJobId && <GenerationStatus jobId={activeJobId} onComplete={handleComplete} />}
        </div>
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-stone-300 tracking-wider uppercase">Media Library</h2>
          <MediaLibrary highlightUrls={newResultUrls} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Pas `components/Nav.tsx` aan** — vervang import-regel en links array:

```typescript
import { LayoutDashboard, MessageSquare, Calendar, Sliders, LogOut, Flame, BarChart3, Clapperboard } from 'lucide-react'

const links = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/analytics', label: 'Data & Intel', icon: BarChart3 },
  { href: '/comments', label: 'Comments', icon: MessageSquare },
  { href: '/calendar', label: 'Kalender & Posts', icon: Calendar },
  { href: '/studio', label: 'Studio', icon: Clapperboard },
  { href: '/settings', label: 'AI Persona & Studio', icon: Sliders },
]
```

- [ ] **Step 3:** `npx tsc --noEmit`, `npm run dev`, open `http://localhost:3000/studio` — pagina laadt.

- [ ] **Step 4: Commit:**

```bash
git add app/(dashboard)/studio/page.tsx components/Nav.tsx
git commit -m "feat(studio): add Studio page and nav link"
```

---

## Task 12: GenerateModal — Kalender Integratie

**Files:**
- Create: `components/studio/GenerateModal.tsx`
- Modify: `app/(dashboard)/calendar/page.tsx` (voeg knop + modal toe in post-detail view)

- [ ] **Step 1: Maak `components/studio/GenerateModal.tsx`:**

```typescript
'use client'
import { useState, useCallback } from 'react'
import { X, Clapperboard } from 'lucide-react'
import GenerationForm from './GenerationForm'
import GenerationStatus from './GenerationStatus'
import MediaLibrary from './MediaLibrary'

interface Props {
  isOpen: boolean
  postId: string
  caption: string
  onClose: () => void
  onAssetSelected: (url: string, type: 'image' | 'video') => void
}

export default function GenerateModal({ isOpen, postId, caption, onClose, onAssetSelected }: Props) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [newResultUrls, setNewResultUrls] = useState<string[]>([])

  const handleJobCreated = useCallback((jobId: string) => {
    setActiveJobId(jobId); setNewResultUrls([])
  }, [])

  const handleComplete = useCallback((resultUrls: string[]) => {
    setActiveJobId(null); setNewResultUrls(resultUrls)
  }, [])

  const handleLinkToPost = useCallback((assetId: string, url: string) => {
    void assetId
    const type: 'image' | 'video' = url.includes('.mp4') || url.includes('.mov') ? 'video' : 'image'
    onAssetSelected(url, type); onClose()
  }, [onAssetSelected, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-stone-950 border-b border-stone-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-stone-200 tracking-wider uppercase">Visual Genereren</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <GenerationForm onJobCreated={handleJobCreated} linkedPostId={postId} initialPrompt={caption.slice(0, 200)} />
            {activeJobId && <GenerationStatus jobId={activeJobId} onComplete={handleComplete} />}
          </div>
          <div className="space-y-3">
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Klik op 🔗 om een asset aan deze post te koppelen</p>
            <MediaLibrary onLinkToPost={handleLinkToPost} highlightUrls={newResultUrls} />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Voeg "Visual genereren" knop + modal toe aan `app/(dashboard)/calendar/page.tsx`**

Lees de bestaande kalender-pagina eerst volledig. Voeg bovenaan toe:
```typescript
import GenerateModal from '@/components/studio/GenerateModal'
import { Clapperboard } from 'lucide-react'
```

Voeg state toe in de component:
```typescript
const [generateModalPostId, setGenerateModalPostId] = useState<string | null>(null)
```

Voeg in de post-detail weergave (in de post-rij of detail-panel) toe:
```tsx
<button
  onClick={() => setGenerateModalPostId(post.id)}
  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-amber-600/10 border border-amber-500/30 text-amber-400 hover:bg-amber-600/20 transition-colors"
>
  <Clapperboard className="w-3.5 h-3.5" />
  Visual genereren
</button>
```

Voeg vóór de sluitende return-tag toe:
```tsx
{generateModalPostId && (() => {
  const post = posts.find(p => p.id === generateModalPostId)
  return (
    <GenerateModal
      isOpen={true}
      postId={generateModalPostId}
      caption={post?.caption ?? ''}
      onClose={() => setGenerateModalPostId(null)}
      onAssetSelected={(url, type) => {
        updateDoc(doc(db, 'posts', generateModalPostId), { mediaUrl: url, mediaType: type })
        setGenerateModalPostId(null)
      }}
    />
  )
})()}
```

> **Note:** Importeer `updateDoc` en `doc` uit `firebase/firestore` als die er nog niet in staan. Zoek de variabele die de posts lijst bijhoudt (`posts` of een andere naam) en pas aan.

- [ ] **Step 3:** `npx tsc --noEmit` — geen fouten. Open kalender, klik op een post — knop zichtbaar.

- [ ] **Step 4: Commit:**

```bash
git add components/studio/GenerateModal.tsx app/(dashboard)/calendar
git commit -m "feat(studio): add GenerateModal and calendar integration"
```

---

## Verificatieplan

### End-to-end (na alle taken)

1. Upload 2 Jack Core Set fotos in Settings → verschijnen realtime in `jack_core_set`
2. Upload een Suno WAV → verschijnt in `suno_tracks`
3. Open `/studio` → genereer een foto → spinner → na ~60s asset in Media Library met NIEUW badge
4. Genereer een video met Suno track → na ~2-3 min video in Media Library (hover = autoplay)
5. Kalender → open post → "Visual genereren" → GenerateModal opent → genereer → klik 🔗 → modal sluit → post heeft `mediaUrl`
6. `npx tsc --noEmit` geeft 0 fouten

### Deployment
```bash
npx firebase-tools deploy --only hosting,firestore,storage
```
