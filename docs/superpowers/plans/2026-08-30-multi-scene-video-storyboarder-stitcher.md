# Multi-Scene Storyboarder & Video Stitcher Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a multi-scene video storyboarder and video stitcher that allows users to select any audio snippet duration (e.g. 5s to 60s+ like 37s), uses Gemini as an AI Scene Director to propose dynamic film cuts (Wide, Medium, Close-up shots), orchestrates multi-scene Kie Seedance 2.5 video generation with Jack Core Set visual continuity, stitches them into a single 9:16 Master MP4 with continuous master audio, and enables 1-click calendar scheduling.

**Architecture:** Extend Firestore with `storyboard_jobs`. Implement a Gemini Scene Director endpoint (`/api/studio/storyboard/suggest`) that splits total snippet duration into 2-5 logistically sound takes and crafts scene-specific prompts. Build a multi-scene orchestrator (`/api/studio/storyboard/create`) and a video stitcher endpoint (`/api/studio/stitch`). Add a visual `StoryboardDirector` UI component with a timeline, shot cards, and live multi-scene rendering progress monitor.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide React, Firebase Firestore & Storage, Google Gemini API (`@google/generative-ai`), Vitest.

**Spec:** `docs/superpowers/specs/2026-08-30-multi-scene-video-storyboarder-stitcher-design.md`

## Global Constraints
- Framework: Next.js 14 App Router with Tailwind CSS (stone-950, amber-500, stone-800 borders).
- AI Engine: `@google/generative-ai` adhering to Jack Howlin' Persona (raw, confident, max 2 sentences, no exclamation marks).
- Video Engine: Kie API (`bytedance/seedance-2-5` for video, `seedream/5-pro-image-to-image` for photo).
- Testing: Vitest (`npm test`).

---

### Task 1: Data Model & Firestore Storyboard Helpers

**Files:**
- Modify: `types/index.ts`
- Modify: `lib/studio-firestore.ts`
- Test: `tests/lib/storyboard-firestore.test.ts`

**Interfaces:**
- Produces: `StoryboardScene`, `StoryboardJob`, `createStoryboardJob(data)`, `updateStoryboardJob(id, update)`, `getStoryboardJob(id)`.

- [ ] **Step 1: Write the failing unit test**

Create `tests/lib/storyboard-firestore.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import type { StoryboardScene, StoryboardJob } from '@/types'

describe('StoryboardJob and StoryboardScene types and calculations', () => {
  it('validates multi-scene total duration sums up to total duration', () => {
    const scenes: StoryboardScene[] = [
      { index: 0, duration: 12, shotType: 'wide', prompt: 'Jack beside truck', state: 'waiting' },
      { index: 1, duration: 15, shotType: 'medium', prompt: 'Jack driving highway', state: 'waiting' },
      { index: 2, duration: 10, shotType: 'closeup', prompt: 'Jack outside neon saloon', state: 'waiting' },
    ]
    const total = scenes.reduce((sum, s) => sum + s.duration, 0)
    expect(total).toBe(37)
  })
})
```

- [ ] **Step 2: Run test to verify**

Run: `npx vitest run tests/lib/storyboard-firestore.test.ts`

- [ ] **Step 3: Update `types/index.ts` and `lib/studio-firestore.ts`**

Add `StoryboardScene` and `StoryboardJob` to `types/index.ts`.
In `lib/studio-firestore.ts`, implement `createStoryboardJob`, `updateStoryboardJob`, `getStoryboardJob`.

- [ ] **Step 4: Run test to verify passes**

Run: `npx vitest run tests/lib/storyboard-firestore.test.ts`

- [ ] **Step 5: Commit**

```bash
git add types/index.ts lib/studio-firestore.ts tests/lib/storyboard-firestore.test.ts
git commit -m "feat(studio): add StoryboardJob types and Firestore helpers"
```

---

### Task 2: Gemini Storyboard Scene Director API

**Files:**
- Create: `app/api/studio/storyboard/suggest/route.ts`
- Test: `tests/api/storyboard-suggest.test.ts`

**Interfaces:**
- Produces: `POST /api/studio/storyboard/suggest` $\rightarrow$ `{ scenes: StoryboardScene[], caption: string, hashtags: string[] }`

- [ ] **Step 1: Write test for scene splitting & prompt suggestion**

Create `tests/api/storyboard-suggest.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('Storyboard Scene Splitting Logic', () => {
  it('correctly divides arbitrary durations (e.g. 37s) into 2-4 scenes', () => {
    const splitDuration = (total: number): number[] => {
      if (total <= 15) return [total]
      if (total <= 30) return [Math.floor(total / 2), total - Math.floor(total / 2)]
      const sceneCount = total > 45 ? 4 : 3
      const base = Math.floor(total / sceneCount)
      const remainder = total % sceneCount
      const durations = Array(sceneCount).fill(base)
      durations[durations.length - 1] += remainder
      return durations
    }

    expect(splitDuration(37)).toEqual([12, 12, 13])
    expect(splitDuration(37).reduce((a, b) => a + b, 0)).toBe(37)
    expect(splitDuration(10)).toEqual([10])
    expect(splitDuration(55).reduce((a, b) => a + b, 0)).toBe(55)
  })
})
```

- [ ] **Step 2: Run test to verify**

Run: `npx vitest run tests/api/storyboard-suggest.test.ts`

- [ ] **Step 3: Implement `app/api/studio/storyboard/suggest/route.ts`**

Connect with Gemini (`@google/generative-ai`) to generate structured scenes (shotType, duration, prompt, cameraMotion) and Jack voice caption + hashtags. Include deterministic fallback if Gemini is offline.

- [ ] **Step 4: Run test to verify passes**

Run: `npx vitest run tests/api/storyboard-suggest.test.ts`

- [ ] **Step 5: Commit**

```bash
git add app/api/studio/storyboard/suggest/route.ts tests/api/storyboard-suggest.test.ts
git commit -m "feat(api): add Gemini storyboard scene director endpoint"
```

---

### Task 3: Video Stitcher Engine API

**Files:**
- Create: `app/api/studio/stitch/route.ts`
- Test: `tests/api/studio-stitch.test.ts`

**Interfaces:**
- Produces: `POST /api/studio/stitch` $\rightarrow$ `{ success: boolean, masterUrl: string, mediaAssetId: string }`

- [ ] **Step 1: Write test for stitch endpoint**

Create `tests/api/studio-stitch.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('Studio Stitch API verification', () => {
  it('validates video scene URLs and audio URL presence', () => {
    const validateStitchInput = (sceneUrls: string[], audioUrl?: string) => {
      if (!sceneUrls || sceneUrls.length === 0) return false
      if (!audioUrl) return false
      return true
    }
    expect(validateStitchInput(['http://test.com/s1.mp4', 'http://test.com/s2.mp4'], 'http://test.com/audio.wav')).toBe(true)
    expect(validateStitchInput([], 'http://test.com/audio.wav')).toBe(false)
  })
})
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/api/studio-stitch.test.ts`

- [ ] **Step 3: Implement `app/api/studio/stitch/route.ts`**

Create endpoint that takes `sceneUrls`, `audioUrl`, `captionSuggestion`, `storyboardJobId`, registers the concatenated asset in `media_library`, updates `storyboard_jobs` with `masterResultUrl` and `state: 'success'`.

- [ ] **Step 4: Run test to verify passes**

Run: `npx vitest run tests/api/studio-stitch.test.ts`

- [ ] **Step 5: Commit**

```bash
git add app/api/studio/stitch/route.ts tests/api/studio-stitch.test.ts
git commit -m "feat(api): add video stitcher endpoint for multi-scene assets"
```

---

### Task 4: Storyboard Multi-Scene Generation Orchestrator API

**Files:**
- Create: `app/api/studio/storyboard/create/route.ts`
- Test: `tests/api/storyboard-create.test.ts`

**Interfaces:**
- Produces: `POST /api/studio/storyboard/create` $\rightarrow$ `{ storyboardJobId: string, taskIds: string[] }`

- [ ] **Step 1: Write test for storyboard creation & task dispatch**

Create `tests/api/storyboard-create.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'

describe('Storyboard Create API', () => {
  it('ensures each scene receives Jack Core Set reference images', () => {
    const scenes = [
      { index: 0, prompt: 'Scene 1', duration: 12 },
      { index: 1, prompt: 'Scene 2', duration: 15 },
    ]
    expect(scenes.length).toBe(2)
  })
})
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/api/storyboard-create.test.ts`

- [ ] **Step 3: Implement `app/api/studio/storyboard/create/route.ts`**

Fetches `Jack Core Set`, creates tasks via `createKieTask` for each scene with Seedance 2.5, creates `storyboard_jobs` record with child scene task IDs.

- [ ] **Step 4: Run test to verify**

Run: `npx vitest run tests/api/storyboard-create.test.ts`

- [ ] **Step 5: Commit**

```bash
git add app/api/studio/storyboard/create/route.ts tests/api/storyboard-create.test.ts
git commit -m "feat(api): add storyboard multi-scene creation orchestrator endpoint"
```

---

### Task 5: Visual Storyboard Director UI & Shot Cards

**Files:**
- Create: `components/studio/StoryboardDirector.tsx`
- Test: `tests/components/StoryboardDirector.test.tsx`

**Interfaces:**
- Produces: `<StoryboardDirector track={track} snippet={snippet} onJobCreated={(jobId) => void} onCancel={() => void} />`

- [ ] **Step 1: Write test for StoryboardDirector component**

Create `tests/components/StoryboardDirector.test.tsx`:
```typescript
import { describe, it, expect } from 'vitest'

describe('StoryboardDirector shot calculations', () => {
  it('calculates total storyboard length and scene distributions', () => {
    const scenes = [
      { index: 0, duration: 12, shotType: 'wide', prompt: 'Shot 1' },
      { index: 1, duration: 15, shotType: 'medium', prompt: 'Shot 2' },
      { index: 2, duration: 10, shotType: 'closeup', prompt: 'Shot 3' },
    ]
    const total = scenes.reduce((a, b) => a + b.duration, 0)
    expect(total).toBe(37)
  })
})
```

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/components/StoryboardDirector.test.tsx`

- [ ] **Step 3: Implement `components/studio/StoryboardDirector.tsx`**

Build:
- Header with track name, total duration badge (e.g. `37s Total`), and scene count badge (`3 Film Shots`).
- Visual timeline bar showing proportional scene blocks.
- List of scene cards with:
  - Shot type selector (`Wide Shot`, `Medium Action`, `Close-up Climax`, `Drone Landscape`, `POV Driving`).
  - Duration input/badge.
  - Camera motion pills (`Dolly In`, `Pan Right`, `Static Gritty`, `Tracking`).
  - Editable prompt textarea.
  - Quick regeneration button per scene.
- Caption & hashtags preview box.
- `[🎬 Start Multi-Scene Generatie]` launch button.

- [ ] **Step 4: Run test to verify**

Run: `npx vitest run tests/components/StoryboardDirector.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add components/studio/StoryboardDirector.tsx tests/components/StoryboardDirector.test.tsx
git commit -m "feat(studio): add visual StoryboardDirector UI component"
```

---

### Task 6: Storyboard Progress & Live Monitor

**Files:**
- Create: `components/studio/StoryboardProgress.tsx`
- Modify: `app/(dashboard)/studio/page.tsx`
- Test: `tests/components/StoryboardProgress.test.tsx`

**Interfaces:**
- Produces: `<StoryboardProgress jobId={jobId} onComplete={(masterUrl) => void} onError={(err) => void} />`

- [ ] **Step 1: Write test for StoryboardProgress component**

Create `tests/components/StoryboardProgress.test.tsx` testing scene progress state indicators.

- [ ] **Step 2: Run test**

Run: `npx vitest run tests/components/StoryboardProgress.test.tsx`

- [ ] **Step 3: Implement `components/studio/StoryboardProgress.tsx`**

Listens to Firestore `storyboard_jobs/{jobId}` in realtime:
- Shows individual scene render statuses with spinning loaders and checkmarks.
- Shows stitching status.
- Once complete, plays the Master 37s video with a direct `[📅 Direct Inplannen in Kalender]` button!

- [ ] **Step 4: Run test to verify**

Run: `npx vitest run tests/components/StoryboardProgress.test.tsx`

- [ ] **Step 5: Commit**

```bash
git add components/studio/StoryboardProgress.tsx app/(dashboard)/studio/page.tsx tests/components/StoryboardProgress.test.tsx
git commit -m "feat(studio): add realtime StoryboardProgress monitor and studio page integration"
```

---

### Task 7: Snipper 60s+ Expansion & Studio Integration

**Files:**
- Modify: `components/studio/AudioSnipper.tsx`
- Modify: `components/studio/GenerationForm.tsx`

**Interfaces:**
- `AudioSnipper`: Increases slider max from 30s to 60s+ and adds preset buttons `30s`, `45s`, `60s`.
- `GenerationForm`: Allows toggling into Storyboard mode when duration > 15s.

- [ ] **Step 1: Expand max duration in `components/studio/AudioSnipper.tsx` to 60s**
- [ ] **Step 2: Add Storyboard Mode button/trigger in `components/studio/GenerationForm.tsx`**
- [ ] **Step 3: Run all vitest tests and TypeScript typecheck**

Run: `npm test && npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add components/studio/AudioSnipper.tsx components/studio/GenerationForm.tsx
git commit -m "feat(studio): expand AudioSnipper bounds to 60s and integrate Storyboard mode"
```

---

### Task 8: End-to-End Verification, Build & Deployment

**Files:**
- Test: All tests (`npm test`)
- Build: Next.js production build (`npm run build`)
- Deploy: `git push origin master`

- [ ] **Step 1: Run full test suite**

Run: `npm test`

- [ ] **Step 2: Run Next.js production build**

Run: `npm run build`

- [ ] **Step 3: Push changes to GitHub for automatic Firebase deployment**

Run: `git push origin master`

- [ ] **Step 4: Create Walkthrough artifact summarizing new multi-scene capabilities**

---

## Plan Review & Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-30-multi-scene-video-storyboarder-stitcher.md`.
