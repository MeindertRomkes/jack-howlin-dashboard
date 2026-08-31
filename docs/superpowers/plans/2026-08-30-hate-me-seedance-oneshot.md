# 30-Seconden Seedance 2.5 One-Shot Lip-Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Volledig geautomatiseerde generatie, lip-sync synchronisatie en mastering van een 30-seconden continuous one-shot muziekvideo voor Jack Howlin (*"Hate Me All You Want"*).

**Architecture:** Node.js / TypeScript pipeline script die de 30s chorus audio knipt via FFmpeg, een 9:16 Seedream 5.0 still genereert met Jack Howlin's Soul ID via de Higgsfield CLI, vervolgens een 30s Seedance 2.5 omni-reference video rendert met synchrone lip-sync, de audio lossless remuxt en het eindresultaat uploadt naar Firebase Storage en Firestore.

**Tech Stack:** TypeScript, Node.js, FFmpeg, Higgsfield CLI (Seedream 5.0 / Soul Cinematic, Seedance 2.5), Firebase Admin SDK (Storage & Firestore).

**Spec:** [2026-08-30-hate-me-seedance-oneshot-design.md](file:///c:/Users/meindert/Documents/antigravity/valiant-shannon/docs/superpowers/specs/2026-08-30-hate-me-seedance-oneshot-design.md)

## Global Constraints

- Platform Aspect Ratio: `9:16` verticaal (1080x1920 of 720x1280).
- Soul ID: `a31fae2f-897d-416c-94e5-a0b0b90e0f45` (Jack Howlin Cinema Studio).
- Audio Segment: 0:30 tot 1:00 (30 seconden exact).
- Modellen: `soul_cinematic` / Seedream 5.0 voor still; `seedance_2_5` voor video generatie.
- Doeldirectory: `projects/hate-me-seedance-30s/` en `tmp/production_seedance_30s/`.

---

### Task 1: Scaffolding & Audio Snippet Extraction

**Files:**
- Create: `projects/hate-me-seedance-30s/project.json`
- Script: `scripts/produce-hate-me-seedance-30s-oneshot.ts`
- Test: `tests/lib/seedance-audio-extraction.test.ts`

**Interfaces:**
- Consumes: `hate-me-all-you-want.wav` van Firebase Storage of lokale cache.
- Produces: `projects/hate-me-seedance-30s/audio/hate-me-30s-chorus.wav` (lossless 44.1kHz 16-bit PCM WAV van 30.0s).

- [x] **Step 1: Write test for audio snippet extraction**

```typescript
import fs from 'fs'
import path from 'path'
import { sliceAudioSnippet } from '../../lib/video-production'

describe('Seedance 30s Audio Extraction', () => {
  it('should slice exactly 30 seconds of audio from the 0:30 timestamp', async () => {
    const source = path.join(process.cwd(), 'projects', 'hate-me-all-you-want', 'audio', 'master-hate-me-all-you-want.wav')
    const target = path.join(process.cwd(), 'tmp', 'test-seedance-30s.wav')
    if (fs.existsSync(source)) {
      await sliceAudioSnippet(source, 30, 30, target)
      expect(fs.existsSync(target)).toBe(true)
    }
  })
})
```

- [x] **Step 2: Run test to verify it executes**

Run: `npx jest tests/lib/seedance-audio-extraction.test.ts` (or `npx vitest run tests/lib/seedance-audio-extraction.test.ts`)

- [x] **Step 3: Setup project directories and config**

Create `projects/hate-me-seedance-30s/project.json` with metadata, timestamps, and model configs.

- [x] **Step 4: Commit Task 1**

```bash
git add projects/hate-me-seedance-30s/ tests/lib/seedance-audio-extraction.test.ts lib/video-production.ts
git commit -m "feat: scaffold seedance 30s project and audio extraction"
```

---

### Task 2: Seedream 5.0 / Soul Master Still Generatie

**Files:**
- Modify: `scripts/produce-hate-me-seedance-30s-oneshot.ts`

**Interfaces:**
- Consumes: Soul ID `a31fae2f-897d-416c-94e5-a0b0b90e0f45`, still prompt.
- Produces: `projects/hate-me-seedance-30s/stills/jack-howlin-master-still.png`.

- [x] **Step 1: Implement still generation logic with Soul Cinematic**

```typescript
const stillArgs = [
  'generate', 'create', 'soul_cinematic',
  '--prompt', `"${STILL_PROMPT}"`,
  '--custom-reference-id', SOUL_ID,
  '--aspect-ratio', '9:16',
  '--quality', '2k',
  '--wait', '--json'
]
const output = await runCliCommand('higgsfield', stillArgs)
```

- [x] **Step 2: Verify still download and resolution check**

Run script still generation phase and confirm PNG file exists and is non-empty.

- [x] **Step 3: Commit Task 2**

```bash
git add scripts/produce-hate-me-seedance-30s-oneshot.ts
git commit -m "feat: implement seedream 5.0 soul still generation"
```

---

### Task 3: Seedance 2.5 Video Generatie met Audio Lip-Sync

**Files:**
- Modify: `scripts/produce-hate-me-seedance-30s-oneshot.ts`

**Interfaces:**
- Consumes: Still PNG, 30s Audio WAV, Timecoded Video Prompt.
- Produces: `projects/hate-me-seedance-30s/clips/seedance-raw-30s.mp4`.

- [x] **Step 1: Implement Seedance 2.5 execution with Omni-Reference & Audio**

```typescript
const videoArgs = [
  'generate', 'create', 'seedance_2_5',
  '--mode', 'omni_reference',
  '--start-image', `"${stillPath}"`,
  '--audio', `"${audio30sPath}"`,
  '--prompt', `"${VIDEO_PROMPT_WITH_TIMESTAMPS}"`,
  '--duration', '30',
  '--aspect-ratio', '9:16',
  '--resolution', '720p',
  '--wait', '--json'
]
const videoOutput = await runCliCommand('higgsfield', videoArgs)
```

- [x] **Step 2: Handle polling, download, and fallback error handling**

Ensure proper error catching and local file saving.

- [x] **Step 3: Commit Task 3**

```bash
git add scripts/produce-hate-me-seedance-30s-oneshot.ts
git commit -m "feat: implement seedance 2.5 omni-reference lip sync execution"
```

---

### Task 4: FFmpeg Mastering & Firebase Cloud Upload

**Files:**
- Modify: `scripts/produce-hate-me-seedance-30s-oneshot.ts`

**Interfaces:**
- Consumes: `seedance-raw-30s.mp4`, `hate-me-30s-chorus.wav`.
- Produces: `projects/hate-me-seedance-30s/exports/hate-me-all-you-want-seedance-30s-master.mp4` en Firebase Storage URL.

- [x] **Step 1: Remux video with lossless audio track**

```typescript
await new Promise<void>((resolve, reject) => {
  const proc = spawn(ffmpegBin, [
    '-y',
    '-i', rawVideoPath,
    '-i', audio30sPath,
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-b:a', '256k',
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-shortest',
    masterExportPath
  ])
  proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg exited with ${code}`)))
})
```

- [x] **Step 2: Upload to Firebase Storage and create Media Asset in Firestore**

Upload to `media_library/hate-me-seedance-30s-[timestamp].mp4` and call `createMediaAsset()`.

- [x] **Step 3: Commit Task 4**

```bash
git add scripts/produce-hate-me-seedance-30s-oneshot.ts
git commit -m "feat: implement audio mastering and firebase upload"
```

---

### Task 5: End-to-End Pipeline Run & Dashboard Verificatie

**Files:**
- Run: `scripts/produce-hate-me-seedance-30s-oneshot.ts`

- [x] **Step 1: Execute full production pipeline**

Run: `npx ts-node scripts/produce-hate-me-seedance-30s-oneshot.ts`

- [x] **Step 2: Verify output file playback & metadata**

Verify master video exists locally and in Firestore media library.

- [x] **Step 3: Final Commit**

```bash
git add .
git commit -m "feat: produce 30s seedance 2.5 lip sync music video for hate me all you want"
```
