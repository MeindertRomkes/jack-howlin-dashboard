import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  normalizeAspectRatio,
  normalizeVideoDuration,
  createHiggsfieldImageTask,
  createHiggsfieldVideoTask,
  getHiggsfieldTaskStatus,
  cancelHiggsfieldTask,
} from '@/lib/higgsfield'

describe('lib/higgsfield.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.HIGGSFIELD_API_KEY_ID = 'test-key-id'
    process.env.HIGGSFIELD_API_KEY_SECRET = 'test-key-secret'
    process.env.HIGGSFIELD_API_BASE_URL = 'https://api.higgsfield.ai'
    global.fetch = vi.fn()
  })

  describe('Utility normalizations', () => {
    it('normalizes aspect ratios correctly', () => {
      expect(normalizeAspectRatio('16:9')).toBe('16:9')
      expect(normalizeAspectRatio('9:16')).toBe('9:16')
      expect(normalizeAspectRatio('1:1')).toBe('1:1')
      expect(normalizeAspectRatio('4:5')).toBe('3:4')
      expect(normalizeAspectRatio('invalid')).toBe('9:16')
    })

    it('normalizes video durations to Veo supported values', () => {
      expect(normalizeVideoDuration(4)).toBe('4')
      expect(normalizeVideoDuration(5)).toBe('6')
      expect(normalizeVideoDuration(6)).toBe('6')
      expect(normalizeVideoDuration(8)).toBe('8')
      expect(normalizeVideoDuration(15)).toBe('8')
      expect(normalizeVideoDuration('4')).toBe('4')
    })
  })

  describe('createHiggsfieldImageTask', () => {
    it('creates standard Soul image task when no reference is provided', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ request_id: 'req_img_123', status: 'queued' }),
      })

      const res = await createHiggsfieldImageTask({
        prompt: 'Jack in desert',
        aspectRatio: '16:9',
        resolution: '2K',
      })

      expect(res.request_id).toBe('req_img_123')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.higgsfield.ai/higgsfield-ai/soul/standard',
        expect.objectContaining({
          method: 'POST',
          headers: {
            Authorization: 'Key test-key-id:test-key-secret',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: 'Jack in desert',
            num_images: 1,
            resolution: '2K',
            aspect_ratio: '16:9',
          }),
        })
      )
    })

    it('creates Soul reference task when referenceImageUrl is provided', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ request_id: 'req_ref_123', status: 'queued' }),
      })

      const res = await createHiggsfieldImageTask({
        prompt: 'Jack smiling on stage',
        aspectRatio: '9:16',
        referenceImageUrl: 'https://cdn.example.com/jack.jpg',
      })

      expect(res.request_id).toBe('req_ref_123')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.higgsfield.ai/higgsfield-ai/soul/reference',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            prompt: 'Jack smiling on stage',
            image_reference_url: 'https://cdn.example.com/jack.jpg',
            resolution: '720p',
            aspect_ratio: '9:16',
            enhance_prompt: true,
          }),
        })
      )
    })
  })

  describe('createHiggsfieldVideoTask', () => {
    it('creates Veo 3.1 video task without image', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ request_id: 'req_vid_123', status: 'queued' }),
      })

      const res = await createHiggsfieldVideoTask({
        prompt: 'Cinematic guitar solo under rain',
        duration: 6,
        aspectRatio: '16:9',
      })

      expect(res.request_id).toBe('req_vid_123')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.higgsfield.ai/veo3.1',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            prompt: 'Cinematic guitar solo under rain',
            duration: '6',
            resolution: '1080',
            aspect_ratio: '16:9',
            generate_audio: false,
          }),
        })
      )
    })

    it('creates Veo 3.1 image-to-video task when imageUrl is provided', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ request_id: 'req_i2v_123', status: 'queued' }),
      })

      const res = await createHiggsfieldVideoTask({
        prompt: 'Camera zooms in slowly',
        imageUrl: 'https://cdn.example.com/jack.jpg',
        duration: 4,
        aspectRatio: '9:16',
      })

      expect(res.request_id).toBe('req_i2v_123')
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.higgsfield.ai/veo3.1/image-to-video',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            prompt: 'Camera zooms in slowly',
            image_url: 'https://cdn.example.com/jack.jpg',
            duration: '4',
            resolution: '1080',
            aspect_ratio: '9:16',
            generate_audio: false,
          }),
        })
      )
    })
  })

  describe('getHiggsfieldTaskStatus', () => {
    it('correctly maps completed state with image URLs', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'completed',
          images: [{ url: 'https://cdn.example.com/out1.jpg' }],
        }),
      })

      const status = await getHiggsfieldTaskStatus('req_123')
      expect(status.state).toBe('success')
      expect(status.resultUrls).toEqual(['https://cdn.example.com/out1.jpg'])
    })

    it('correctly maps failed state with error message', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          status: 'failed',
          error: 'Safety violation detected',
        }),
      })

      const status = await getHiggsfieldTaskStatus('req_123')
      expect(status.state).toBe('fail')
      expect(status.failMsg).toBe('Safety violation detected')
    })
  })

  describe('cancelHiggsfieldTask', () => {
    it('calls cancel endpoint and returns true on success', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        status: 202,
      })

      const success = await cancelHiggsfieldTask('req_123')
      expect(success).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.higgsfield.ai/requests/req_123/cancel',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})
