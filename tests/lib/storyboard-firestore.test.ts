import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { StoryboardScene, StoryboardJob } from '@/types'
import {
  createStoryboardJob,
  updateStoryboardJob,
  getStoryboardJob,
} from '@/lib/studio-firestore'
import { adminDb } from '@/lib/firebase-admin'

vi.mock('@/lib/firebase-admin', () => {
  const mockDoc = {
    get: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  }
  const mockCollection = {
    add: vi.fn(),
    doc: vi.fn(() => mockDoc),
    orderBy: vi.fn(() => mockCollection),
    limit: vi.fn(() => mockCollection),
    get: vi.fn(),
  }
  return {
    adminDb: {
      collection: vi.fn(() => mockCollection),
    },
    adminAuth: {
      verifyIdToken: vi.fn(),
    },
  }
})

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

  it('supports all valid shotTypes and scene states', () => {
    const scenes: StoryboardScene[] = [
      { index: 0, duration: 8, shotType: 'wide', prompt: 'Wide vista', state: 'waiting', cameraMotion: 'Pan left' },
      { index: 1, duration: 10, shotType: 'medium', prompt: 'Medium guitar strum', state: 'generating', taskId: 'kie_task_1' },
      { index: 2, duration: 7, shotType: 'closeup', prompt: 'Close up eyes', state: 'success', resultVideoUrl: 'https://example.com/v1.mp4' },
      { index: 3, duration: 5, shotType: 'drone', prompt: 'Aerial desert highway', state: 'fail', failMsg: 'Timed out' },
      { index: 4, duration: 6, shotType: 'pov', prompt: 'POV steering wheel', state: 'waiting' },
    ]
    expect(scenes.length).toBe(5)
    expect(scenes[0].shotType).toBe('wide')
    expect(scenes[3].shotType).toBe('drone')
    expect(scenes[4].shotType).toBe('pov')
    expect(scenes[2].state).toBe('success')
  })
})

describe('Firestore Storyboard Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createStoryboardJob', () => {
    it('creates a doc in storyboard_jobs collection with FieldValue.serverTimestamp() and returns the id', async () => {
      const mockAdd = vi.fn().mockResolvedValue({ id: 'storyboard_job_123' })
      vi.mocked(adminDb.collection).mockReturnValue({
        add: mockAdd,
      } as any)

      const jobData: Omit<StoryboardJob, 'id' | 'createdAt'> = {
        sunoTrackId: 'track_1',
        snippetId: 'snip_1',
        totalDuration: 37,
        aspectRatio: '9:16',
        audioUrl: 'https://example.com/audio.mp3',
        scenes: [
          { index: 0, duration: 12, shotType: 'wide', prompt: 'Jack beside truck', state: 'waiting' },
          { index: 1, duration: 15, shotType: 'medium', prompt: 'Jack driving', state: 'waiting' },
          { index: 2, duration: 10, shotType: 'closeup', prompt: 'Jack saloon', state: 'waiting' },
        ],
        state: 'storyboarding',
      }

      const jobId = await createStoryboardJob(jobData)

      expect(jobId).toBe('storyboard_job_123')
      expect(adminDb.collection).toHaveBeenCalledWith('storyboard_jobs')
      expect(mockAdd).toHaveBeenCalledWith({
        ...jobData,
        createdAt: expect.any(Object),
      })
    })
  })

  describe('updateStoryboardJob', () => {
    it('updates storyboard job doc fields without completedAt when state is ongoing', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined)
      const mockDoc = vi.fn().mockReturnValue({ update: mockUpdate })
      vi.mocked(adminDb.collection).mockReturnValue({ doc: mockDoc } as any)

      await updateStoryboardJob('storyboard_job_123', {
        state: 'rendering_scenes',
      })

      expect(adminDb.collection).toHaveBeenCalledWith('storyboard_jobs')
      expect(mockDoc).toHaveBeenCalledWith('storyboard_job_123')
      expect(mockUpdate).toHaveBeenCalledWith({
        state: 'rendering_scenes',
      })
    })

    it('adds completedAt timestamp when state is success', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined)
      const mockDoc = vi.fn().mockReturnValue({ update: mockUpdate })
      vi.mocked(adminDb.collection).mockReturnValue({ doc: mockDoc } as any)

      await updateStoryboardJob('storyboard_job_123', {
        state: 'success',
        masterResultUrl: 'https://example.com/master.mp4',
      })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'success',
          masterResultUrl: 'https://example.com/master.mp4',
          completedAt: expect.any(Object),
        })
      )
    })

    it('adds completedAt timestamp when state is fail', async () => {
      const mockUpdate = vi.fn().mockResolvedValue(undefined)
      const mockDoc = vi.fn().mockReturnValue({ update: mockUpdate })
      vi.mocked(adminDb.collection).mockReturnValue({ doc: mockDoc } as any)

      await updateStoryboardJob('storyboard_job_123', {
        state: 'fail',
        failMsg: 'Scene generation failed',
      })

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          state: 'fail',
          failMsg: 'Scene generation failed',
          completedAt: expect.any(Object),
        })
      )
    })
  })

  describe('getStoryboardJob', () => {
    it('returns StoryboardJob object when document exists', async () => {
      const jobData = {
        totalDuration: 37,
        aspectRatio: '9:16',
        audioUrl: 'https://example.com/audio.mp3',
        scenes: [],
        state: 'success',
        masterResultUrl: 'https://example.com/master.mp4',
      }
      const mockGet = vi.fn().mockResolvedValue({
        exists: true,
        id: 'storyboard_job_123',
        data: () => jobData,
      })
      const mockDoc = vi.fn().mockReturnValue({ get: mockGet })
      vi.mocked(adminDb.collection).mockReturnValue({ doc: mockDoc } as any)

      const result = await getStoryboardJob('storyboard_job_123')

      expect(adminDb.collection).toHaveBeenCalledWith('storyboard_jobs')
      expect(mockDoc).toHaveBeenCalledWith('storyboard_job_123')
      expect(result).toEqual({
        id: 'storyboard_job_123',
        ...jobData,
      })
    })

    it('returns null when document does not exist', async () => {
      const mockGet = vi.fn().mockResolvedValue({
        exists: false,
      })
      const mockDoc = vi.fn().mockReturnValue({ get: mockGet })
      vi.mocked(adminDb.collection).mockReturnValue({ doc: mockDoc } as any)

      const result = await getStoryboardJob('non_existent_id')

      expect(result).toBeNull()
    })
  })
})
