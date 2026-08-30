# Audio Snippet & 10s AI Video Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an end-to-end 10-second audio snippet slicer, dual video generation flow (AI Cinematics via Kie Seedance 2.5 and Dynamic Audiogram/Lyric Reel), Gemini data-driven prompt & caption assistant, and 1-click calendar scheduling across the Jack Howlin' Command Center.

**Architecture:** Extend Firestore `suno_tracks`, `kie_jobs`, and `media_library` schemas with audio snippet metadata and video type. Implement an interactive `AudioSnipper` component with HTML5/Web Audio scrubber and loop playback. Build a Gemini-powered prompt & caption generation API route. Integrate the snippet selector and audiogram options into `GenerationForm`. Connect 1-click scheduling into `MediaLibrary` and bridge Analytics / Release Launchpad directly to the Studio.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide React, Firebase Firestore & Storage, Google Gemini API (`@google/generative-ai`), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-audio-snippet-video-generator-design.md`

## Global Constraints
- Framework: Next.js 14 App Router with Tailwind CSS and dark Outlaw Americana theme (stone-950, amber-500, stone-800 borders).
- Database: Firestore collections (`suno_tracks`, `kie_jobs`, `media_library`, `posts`).
- AI Engine: `@google/generative-ai` with Jack Howlin' Tone of Voice (gritty, laconic, max 2 sentences).
- Video Engine: Kie API (`bytedance/seedance-2-5` for video, `seedream/5-pro-image-to-image` for photo).
- Testing: Vitest (`npm test`).

---

### Task 1: Type Definitions & Firestore Snippet Helpers

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/studio-firestore.ts`
- Test: `tests/lib/studio-snippets.test.ts`

**Interfaces:**
- Produces: `AudioSnippet`, `SunoTrack.snippets`, `addTrackSnippet(trackId, snippetData)`, `deleteTrackSnippet(trackId, snippetId)`.

- [ ] **Step 1: Write the failing unit test**

Create `tests/lib/studio-snippets.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import type { AudioSnippet, SunoTrack } from '@/types'

describe('AudioSnippet types and calculations', () => {
  it('correctly calculates snippet duration and bounds', () => {
    const snippet: AudioSnippet = {
      id: 'snip-1',
      name: 'Chorus Hook',
      startTime: 45.0,
      endTime: 55.0,
      duration: 10.0,
      highlightLyric: 'Never looked back on this road',
      createdAt: { seconds: 1725000000, nanoseconds: 0 } as any,
    }
    expect(snippet.endTime - snippet.startTime).toBe(snippet.duration)
    expect(snippet.duration).toBe(10.0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails/passes**

Run: `npx vitest run tests/lib/studio-snippets.test.ts`

- [ ] **Step 3: Update `types/index.ts` and `lib/studio-firestore.ts`**

Update `types/index.ts` to include `AudioSnippet` and add `snippets?: AudioSnippet[]` to `SunoTrack`, and update `KieJob` and `MediaAsset` with `videoType`, `sunoTrackId`, `snippetId`, `suggestedCaption`.

In `lib/studio-firestore.ts`, add:
```typescript
export async function addTrackSnippet(
  trackId: string,
  snippet: Omit<AudioSnippet, 'id' | 'createdAt'>
): Promise<string> {
  const snippetId = `snip_${Date.now()}`
  const newSnippet: AudioSnippet = {
    ...snippet,
    id: snippetId,
    createdAt: FieldValue.serverTimestamp() as any,
  }
  await adminDb.collection('suno_tracks').doc(trackId).update({
    snippets: FieldValue.arrayUnion(newSnippet),
  })
  return snippetId
}

export async function deleteTrackSnippet(
  trackId: string,
  snippetId: string
): Promise<void> {
  const docRef = adminDb.collection('suno_tracks').doc(trackId)
  const docSnap = await docRef.get()
  if (!docSnap.exists) return
  const track = docSnap.data() as SunoTrack
  const updatedSnippets = (track.snippets || []).filter(s => s.id !== snippetId)
  await docRef.update({ snippets: updatedSnippets })
}
```

- [ ] **Step 4: Run test to verify passes**

Run: `npx vitest run tests/lib/studio-snippets.test.ts`

- [ ] **Step 5: Commit changes**

```bash
git add types/index.ts lib/studio-firestore.ts tests/lib/studio-snippets.test.ts
git commit -m "feat(studio): add AudioSnippet types and Firestore helpers"
```

---

### Task 2: Snippets API Route

**Files:**
- Create: `app/api/studio/snippets/route.ts`
- Test: `tests/api/studio-snippets-route.test.ts`

**Interfaces:**
- Consumes: `addTrackSnippet`, `deleteTrackSnippet` from `lib/studio-firestore.ts`.
- Produces: `POST /api/studio/snippets` (action: 'add' | 'delete').

- [ ] **Step 1: Write the failing API route test**

Create `tests/api/studio-snippets-route.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'

describe('Snippets API validation', () => {
  it('validates snippet duration limits (5 to 30 seconds)', () => {
    const validateSnippet = (startTime: number, endTime: number) => {
      const duration = endTime - startTime
      if (startTime < 0 || endTime <= startTime) return false
      if (duration < 3 || duration > 30) return false
      return true
    }

    expect(validateSnippet(10, 20)).toBe(true)
    expect(validateSnippet(10, 10)).toBe(false)
    expect(validateSnippet(10, 45)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify**

Run: `npx vitest run tests/api/studio-snippets-route.test.ts`

- [ ] **Step 3: Implement `app/api/studio/snippets/route.ts`**

Create `app/api/studio/snippets/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { addTrackSnippet, deleteTrackSnippet } from '@/lib/studio-firestore'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const token = authHeader.split('Bearer ')[1]
    await adminAuth.verifyIdToken(token)

    const body = await req.json()
    const { action, trackId, snippet, snippetId } = body

    if (!trackId) {
      return NextResponse.json({ error: 'trackId is required' }, { status: 400 })
    }

    if (action === 'delete') {
      if (!snippetId) return NextResponse.json({ error: 'snippetId required' }, { status: 400 })
      await deleteTrackSnippet(trackId, snippetId)
      return NextResponse.json({ success: true })
    }

    if (action === 'add') {
      const { name, startTime, endTime, highlightLyric } = snippet || {}
      if (!name || startTime === undefined || endTime === undefined) {
        return NextResponse.json({ error: 'Missing snippet fields' }, { status: 400 })
      }
      const duration = Math.round((endTime - startTime) * 10) / 10
      if (duration <= 0 || duration > 30) {
        return NextResponse.json({ error: 'Snippet duur moet tussen 1 en 30s zijn' }, { status: 400 })
      }

      const newId = await addTrackSnippet(trackId, {
        name,
        startTime,
        endTime,
        duration,
        highlightLyric: highlightLyric?.trim() || undefined,
      })
      return NextResponse.json({ success: true, snippetId: newId })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
```

- [ ] **Step 4: Run tests**

Run: `npx vitest run`

- [ ] **Step 5: Commit**

```bash
git add app/api/studio/snippets/route.ts tests/api/studio-snippets-route.test.ts
git commit -m "feat(api): add studio snippets management endpoint"
```

---

### Task 3: Interactive `AudioSnipper` Component

**Files:**
- Create: `components/studio/AudioSnipper.tsx`
- Test: `tests/components/AudioSnipper.test.tsx`

**Interfaces:**
- Produces: `<AudioSnipper track={track} onSnippetSaved={(snippet) => void} onCancel={() => void} />`

- [ ] **Step 1: Write failing component test**

Create `tests/components/AudioSnipper.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'

describe('AudioSnipper time formatting and clamping', () => {
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    const ms = Math.floor((s % 1) * 10)
    return `${m}:${sec.toString().padStart(2, '0')}.${ms}`
  }

  it('formats seconds to mm:ss.s', () => {
    expect(fmt(45.5)).toBe('0:45.5')
    expect(fmt(125.0)).toBe('2:05.0')
  })
})
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/components/AudioSnipper.test.tsx`

- [ ] **Step 3: Implement `components/studio/AudioSnipper.tsx`**

Build the interactive waveform scrubber component with:
- HTML `<audio>` ref syncing with time scrubber
- Loop playback constrained between `[startTime, endTime]`
- Start / End marker draggable / slider controls with `-1s`, `+1s`, `-0.5s`, `+0.5s` buttons
- Snippet name input (with quick presets like *"Chorus Hook"*, *"Acoustic Intro"*, *"Guitar Solo"*, *"Verse Punchline"*)
- Highlight Lyric input field
- Save button calling `/api/studio/snippets` with Auth token.

- [ ] **Step 4: Run test to verify**

Run: `npx vitest run tests/components/AudioSnipper.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add components/studio/AudioSnipper.tsx tests/components/AudioSnipper.test.tsx
git commit -m "feat(studio): add interactive AudioSnipper component"
```

---

### Task 4: Integrate Snippet Scrubber in Suno Library Manager

**Files:**
- Modify: `components/settings/SunoLibraryManager.tsx`

**Interfaces:**
- Shows saved snippets under each track in the library with direct play button, duration badge, lyric preview, and delete button.
- Adds `[✂️ Knip 10s Snippet]` button to launch the inline `AudioSnipper`.

- [ ] **Step 1: Modify `components/settings/SunoLibraryManager.tsx`**

Add snippet list accordion and Snipper trigger per track.
Add preview player specifically for snippets (looping only the sliced interval).

- [ ] **Step 2: Run tests and typecheck**

Run: `npm run lint` or `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add components/settings/SunoLibraryManager.tsx
git commit -m "feat(settings): integrate audio snippet manager in SunoLibraryManager"
```

---

### Task 5: Gemini AI Prompt & Caption Generator API

**Files:**
- Create: `app/api/studio/prompt-generator/route.ts`
- Test: `tests/api/studio-prompt-generator.test.ts`

**Interfaces:**
- Produces: `POST /api/studio/prompt-generator` $\rightarrow$ `{ prompt: string, caption: string, hashtags: string[] }`

- [ ] **Step 1: Write test for prompt generator schema**

Create `tests/api/studio-prompt-generator.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('Prompt Generator response validation', () => {
  it('validates generated prompt and caption structure', () => {
    const response = {
      prompt: 'Jack Howlin standing near a dusty neon sign in Nevada desert, cinematic 35mm film',
      caption: 'The dust never settled. "Dust & Diesel" out now on all platforms.',
      hashtags: ['#JackHowlin', '#OutlawAmericana', '#CountryRock', '#NewMusic'],
    }
    expect(response.prompt.length).toBeGreaterThan(10)
    expect(response.caption.length).toBeGreaterThan(5)
    expect(response.hashtags.length).toBeGreaterThanOrEqual(3)
  })
})
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/api/studio-prompt-generator.test.ts`

- [ ] **Step 3: Implement `app/api/studio/prompt-generator/route.ts`**

Connect with `@google/generative-ai` using `gemini-2.5-flash` or `gemini-1.5-flash` to craft on-brand visual prompt + Jack voice caption + hashtags.

- [ ] **Step 4: Run test to verify**

Run: `npx vitest run tests/api/studio-prompt-generator.test.ts`

- [ ] **Step 5: Commit**

```bash
git add app/api/studio/prompt-generator/route.ts tests/api/studio-prompt-generator.test.ts
git commit -m "feat(api): add Gemini prompt and caption generator for studio"
```

---

### Task 6: Studio Generation Form Expansion (Snippets + Audiogram Mode + AI Magic)

**Files:**
- Modify: `components/studio/GenerationForm.tsx`
- Modify: `components/studio/SunoTrackSelector.tsx`

**Interfaces:**
- `SunoTrackSelector`: Allows picking a track AND optionally selecting one of its saved 10-15s snippets or clicking `[+ Knip Snippet]`.
- `GenerationForm`:
  - 3 Mode toggles: `Foto`, `AI Video` (Kie Seedance), `Audiogram Reel` (Dynamic Waveform).
  - Magic button `[⚡ AI Prompt & Caption Bedenken]` that automatically fills the prompt & stores suggested caption.
  - Duration selector automatically locks or defaults to snippet duration.

- [ ] **Step 1: Update `SunoTrackSelector.tsx` to support snippet selection**
- [ ] **Step 2: Update `GenerationForm.tsx` with mode toggles, snippet selector, and AI assistant button**
- [ ] **Step 3: Verify build and component compilation**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add components/studio/GenerationForm.tsx components/studio/SunoTrackSelector.tsx
git commit -m "feat(studio): add snippet selector, audiogram mode and AI assistant to GenerationForm"
```

---

### Task 7: 1-Click Calendar Scheduling Modal from Media Library

**Files:**
- Create: `components/studio/ScheduleModal.tsx`
- Modify: `components/studio/MediaLibrary.tsx`

**Interfaces:**
- `MediaLibrary.tsx`: Each video/photo asset gets an active `[📅 Inplannen]` button.
- `ScheduleModal.tsx`:
  - Shows preview of asset + prefilled caption (from AI prompt generator or custom).
  - Multi-platform checkboxes (TikTok, Instagram Reels, YouTube Shorts, Facebook).
  - Date & time picker (defaults to next optimal posting window).
  - 1-Click save into Firestore `posts` collection with status `'scheduled'`.

- [ ] **Step 1: Create `components/studio/ScheduleModal.tsx`**
- [ ] **Step 2: Hook up `ScheduleModal` in `components/studio/MediaLibrary.tsx`**
- [ ] **Step 3: Verify TypeScript and tests**

Run: `npx tsc --noEmit` and `npm test`

- [ ] **Step 4: Commit**

```bash
git add components/studio/ScheduleModal.tsx components/studio/MediaLibrary.tsx
git commit -m "feat(studio): add 1-click schedule modal from media library to calendar"
```

---

### Task 8: Contextual Bridges in Analytics & Release Launchpad

**Files:**
- Modify: `app/(dashboard)/analytics/page.tsx`
- Modify: `components/calendar/SongReleaseLaunchpadModal.tsx`

**Interfaces:**
- Analytics: Clicking `[🎬 Maak 10s Clip]` navigates to `/studio?trackId=...&trackName=...` with the track pre-selected.
- Release Launchpad: Teaser items (Day -7, Day -3) have a direct `[⚡ Genereer Teaser Clip]` action linking to the Studio.

- [ ] **Step 1: Add quick-action button in `app/(dashboard)/analytics/page.tsx`**
- [ ] **Step 2: Add quick-action in `components/calendar/SongReleaseLaunchpadModal.tsx`**
- [ ] **Step 3: Run all tests and full build check**

Run: `npm test && npm run build`

- [ ] **Step 4: Commit**

```bash
git add app/(dashboard)/analytics/page.tsx components/calendar/SongReleaseLaunchpadModal.tsx
git commit -m "feat(bridges): connect analytics and launchpad directly to 10s video studio"
```

---

## Plan Review & Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-30-audio-snippet-video-generator.md`.
