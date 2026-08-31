# Hate Me All You Want (60s) Video Production Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bouw en voer een geautomatiseerde videoproductiepipeline uit die 60 seconden 9:16 video genereert voor het nummer *"Hate Me All You Want"* van Jack Howlin via Higgsfield AI (Soul ID + Veo 3.1 Lite) en audio-stitching.

**Architecture:** Een TypeScript CLI productiescript (`scripts/produce-hate-me-video.ts`) dat modulaire stappen uitvoert: Core Set foto's ophalen, Soul training orkestreren, 5 scène-stills genereren in 9:16, 5 videoclips renderen via `veo3_1_lite`, audio-synchronisatie/stitching uitvoeren, en het eindresultaat uploaden naar Firebase Storage & Firestore.

**Tech Stack:** TypeScript, Node.js (`tsx`), `@higgsfield/cli`, Firebase Admin SDK, FFmpeg / fluent-ffmpeg / fetch.

**Spec:** `docs/superpowers/specs/2026-08-30-hate-me-video-production-design.md`

## Global Constraints
- Aspect Ratio: 9:16 Verticaal
- Totale videoduur: 60 seconden (5 scènes × 12 seconden)
- Video Model: `veo3_1_lite` (~6 credits per clip, ~30 credits totaal)
- Audio: 0:00 - 1:00 van `hate-me-all-you-want.wav`
- Lokale opslag: `tmp/production/` met resume capability

---

### Task 1: Core Set Downloader & Soul Training Orchestrator

**Files:**
- Create: `lib/video-production.ts`
- Test: `tests/lib/video-production.test.ts`

**Interfaces:**
- Produces: `downloadCoreSetPhotos(targetDir: string): Promise<string[]>`
- Produces: `ensureSoulTrained(photos: string[], soulName: string): Promise<string>`

- [ ] **Step 1: Write the failing unit tests for Core Set download and Soul training**
- [ ] **Step 2: Run test to verify it fails (`npx vitest run tests/lib/video-production.test.ts`)**
- [ ] **Step 3: Implement `downloadCoreSetPhotos` and `ensureSoulTrained` in `lib/video-production.ts`**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 2: 5-Scene Prompt Definition & Still Generator

**Files:**
- Modify: `lib/video-production.ts`
- Test: `tests/lib/video-production.test.ts`

**Interfaces:**
- Produces: `generateSceneStills(soulId: string, outDir: string): Promise<{ sceneIndex: number; stillPath: string; prompt: string }[]>`

- [ ] **Step 1: Write the failing test for scene prompt definitions and still generator**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement 5 outlaw noir studio prompts and image generation in `lib/video-production.ts`**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 3: Video Clips Rendering (`veo3_1_lite`)

**Files:**
- Modify: `lib/video-production.ts`
- Test: `tests/lib/video-production.test.ts`

**Interfaces:**
- Produces: `renderSceneClips(stills: { sceneIndex: number; stillPath: string; prompt: string }[], outDir: string): Promise<string[]>`

- [ ] **Step 1: Write the failing test for video clip job submission and status polling**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `renderSceneClips` using `veo3_1_lite` / `createHiggsfieldVideoTask`**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 4: Audio Slicing & Video Stitching

**Files:**
- Modify: `lib/video-production.ts`
- Test: `tests/lib/video-production.test.ts`

**Interfaces:**
- Produces: `stitchMasterVideo(clips: string[], audioUrl: string, outputPath: string): Promise<string>`

- [ ] **Step 1: Write the failing test for audio-sync and video concatenation**
- [ ] **Step 2: Run test to verify it fails**
- [ ] **Step 3: Implement `stitchMasterVideo` using ffmpeg/child_process**
- [ ] **Step 4: Run test to verify it passes**

---

### Task 5: End-to-End CLI Pipeline Script & Live Execution

**Files:**
- Create: `scripts/produce-hate-me-video.ts`

**Interfaces:**
- Produces: CLI execution `npx tsx scripts/produce-hate-me-video.ts`

- [ ] **Step 1: Create `scripts/produce-hate-me-video.ts` orchestrating Tasks 1-4 with step progress logging and Firestore registration**
- [ ] **Step 2: Test script dry-run or unit test**
- [ ] **Step 3: Run the live production script to generate the 60s video**
- [ ] **Step 4: Verify master video file and Firestore media_library document**
