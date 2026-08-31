import { describe, it, expect, vi, beforeEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import {
  SCENE_DEFINITIONS,
  downloadFile,
  downloadCoreSetPhotos,
  getExistingSoul,
  ensureSoulTrained,
  generateSceneStills,
  renderSceneClips,
  getFfmpegPath,
} from '@/lib/video-production'
import * as studioFirestore from '@/lib/studio-firestore'
import * as higgsfield from '@/lib/higgsfield'

describe('lib/video-production.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('SCENE_DEFINITIONS', () => {
    it('contains exactly 5 scenes spanning 60 seconds', () => {
      expect(SCENE_DEFINITIONS).toHaveLength(5)
      expect(SCENE_DEFINITIONS[0].timeRange).toBe('0:00 - 0:12')
      expect(SCENE_DEFINITIONS[4].timeRange).toBe('0:48 - 1:00')
      for (const scene of SCENE_DEFINITIONS) {
        expect(scene.stillPrompt).toBeTruthy()
        expect(scene.videoPrompt).toBeTruthy()
        expect(scene.name).toBeTruthy()
      }
    })
  })

  describe('downloadCoreSetPhotos', () => {
    it('downloads photos from core set', async () => {
      vi.spyOn(studioFirestore, 'getJackCoreSet').mockResolvedValueOnce([
        {
          id: 'p1',
          label: 'Test photo',
          publicUrl: 'https://cdn.example.com/jack1.jpg',
          storageUrl: 'gs://jack-howlin-dashboard.appspot.com/jack1.jpg',
          order: 1,
          createdAt: { seconds: 123, nanoseconds: 0 } as any,
        },
      ])

      global.fetch = vi.fn().mockResolvedValueOnce({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })

      const targetDir = path.join(process.cwd(), 'tmp', 'test-photos')
      const paths = await downloadCoreSetPhotos(targetDir)

      expect(paths).toHaveLength(1)
      expect(paths[0]).toContain('jack-core-1.jpg')

      // Clean up test dir
      if (fs.existsSync(paths[0])) fs.unlinkSync(paths[0])
      if (fs.existsSync(targetDir)) fs.rmdirSync(targetDir)
    })
  })

  describe('generateSceneStills', () => {
    it('generates stills for all 5 scenes', async () => {
      vi.spyOn(higgsfield, 'createHiggsfieldImageTask').mockResolvedValue({
        request_id: 'task_img_123',
        status: 'queued',
      })

      vi.spyOn(higgsfield, 'getHiggsfieldTaskStatus').mockResolvedValue({
        requestId: 'task_img_123',
        status: 'completed',
        state: 'success',
        resultUrls: ['https://cdn.example.com/still.jpg'],
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })

      const outDir = path.join(process.cwd(), 'tmp', 'test-stills')
      const stills = await generateSceneStills('soul_123', outDir, undefined, { pollIntervalMs: 1 })

      expect(stills).toHaveLength(5)
      expect(stills[0].sceneIndex).toBe(1)
      expect(stills[0].stillUrl).toBe('https://cdn.example.com/still.jpg')

      // Clean up
      for (const s of stills) {
        if (fs.existsSync(s.stillPath)) fs.unlinkSync(s.stillPath)
        const meta = path.join(outDir, `scene-${s.sceneIndex}-meta.json`)
        if (fs.existsSync(meta)) fs.unlinkSync(meta)
      }
      if (fs.existsSync(outDir)) fs.rmdirSync(outDir)
    })
  })

  describe('renderSceneClips', () => {
    it('renders video clips for all stills', async () => {
      vi.spyOn(higgsfield, 'createHiggsfieldVideoTask').mockResolvedValue({
        request_id: 'task_vid_123',
        status: 'queued',
      })

      vi.spyOn(higgsfield, 'getHiggsfieldTaskStatus').mockResolvedValue({
        requestId: 'task_vid_123',
        status: 'completed',
        state: 'success',
        resultUrls: ['https://cdn.example.com/clip.mp4'],
      })

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new ArrayBuffer(8),
      })

      const outDir = path.join(process.cwd(), 'tmp', 'test-clips')
      const mockStills = [
        {
          sceneIndex: 1,
          stillPath: 'dummy.jpg',
          stillUrl: 'https://cdn.example.com/still1.jpg',
          stillPrompt: 'prompt 1',
          videoPrompt: 'video prompt 1',
        },
      ]

      const clips = await renderSceneClips(mockStills, outDir, { pollIntervalMs: 1 })

      expect(clips).toHaveLength(1)
      expect(clips[0]).toContain('scene-1-clip.mp4')

      // Clean up
      if (fs.existsSync(clips[0])) fs.unlinkSync(clips[0])
      if (fs.existsSync(outDir)) fs.rmdirSync(outDir)
    })
  })

  describe('getFfmpegPath', () => {
    it('returns a valid ffmpeg path', () => {
      const p = getFfmpegPath()
      expect(p).toBeTruthy()
    })
  })
})
