import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  POST,
  validateStitchInput,
  resolveMasterVideoUrl,
  StitchRequestBody,
} from '../../app/api/studio/stitch/route'
import { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { createMediaAsset, updateStoryboardJob } from '@/lib/studio-firestore'

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(),
  },
}))

vi.mock('@/lib/studio-firestore', () => ({
  createMediaAsset: vi.fn(),
  updateStoryboardJob: vi.fn(),
}))

function createPostRequest(body: any, authHeader?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authHeader !== undefined) {
    headers['Authorization'] = authHeader
  }
  return new NextRequest('http://localhost:3000/api/studio/stitch', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('Studio Stitch Unit Helpers', () => {
  describe('validateStitchInput', () => {
    it('returns true for valid non-empty sceneUrls', () => {
      expect(
        validateStitchInput(
          ['https://cdn.example.com/s1.mp4', 'https://cdn.example.com/s2.mp4'],
          'https://cdn.example.com/audio.wav'
        )
      ).toBe(true)
      expect(validateStitchInput(['https://cdn.example.com/s1.mp4'])).toBe(true)
    })

    it('returns false for empty, missing or non-array sceneUrls', () => {
      expect(validateStitchInput([])).toBe(false)
      expect(validateStitchInput(null as any)).toBe(false)
      expect(validateStitchInput(undefined as any)).toBe(false)
      expect(validateStitchInput(['   '])).toBe(false)
      expect(validateStitchInput([123 as any])).toBe(false)
    })
  })

  describe('resolveMasterVideoUrl', () => {
    it('returns the single scene URL when only 1 scene is provided', () => {
      const url = resolveMasterVideoUrl(['https://cdn.example.com/scene1.mp4'])
      expect(url).toBe('https://cdn.example.com/scene1.mp4')
    })

    it('returns a stitched master URL referencing the storyboardJobId when provided', () => {
      const url = resolveMasterVideoUrl(
        ['https://cdn.example.com/s1.mp4', 'https://cdn.example.com/s2.mp4'],
        'sb_job_999'
      )
      expect(url).toContain('stitched%2Fsb_job_999_master.mp4')
      expect(url).toContain('jack-howlin-dashboard.firebasestorage.app')
    })

    it('returns a fallback stitched master URL when storyboardJobId is not provided', () => {
      const url = resolveMasterVideoUrl([
        'https://cdn.example.com/s1.mp4',
        'https://cdn.example.com/s2.mp4',
      ])
      expect(url).toContain('stitched%2Fmaster_')
      expect(url).toContain('jack-howlin-dashboard.firebasestorage.app')
    })
  })
})

describe('POST /api/studio/stitch - Auth Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const req = createPostRequest({ sceneUrls: ['https://cdn.example.com/s1.mp4'] })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when Authorization header is not Bearer format', async () => {
    const req = createPostRequest(
      { sceneUrls: ['https://cdn.example.com/s1.mp4'] },
      'Basic some-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when Bearer token is empty or whitespace', async () => {
    const req = createPostRequest(
      { sceneUrls: ['https://cdn.example.com/s1.mp4'] },
      'Bearer   '
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when verifyIdToken rejects with error', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockRejectedValueOnce(new Error('Invalid token'))
    const req = createPostRequest(
      { sceneUrls: ['https://cdn.example.com/s1.mp4'] },
      'Bearer bad-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })
})

describe('POST /api/studio/stitch - Request Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  it('returns 400 when body is invalid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/studio/stitch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer valid-token',
      },
      body: 'invalid-json-{',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid JSON body')
  })

  it('returns 400 when sceneUrls is missing', async () => {
    const req = createPostRequest({}, 'Bearer valid-token')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('sceneUrls must be a non-empty array of valid URLs')
  })

  it('returns 400 when sceneUrls is empty array', async () => {
    const req = createPostRequest({ sceneUrls: [] }, 'Bearer valid-token')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('sceneUrls must be a non-empty array of valid URLs')
  })

  it('returns 400 when sceneUrls contains non-string elements or empty strings', async () => {
    const req = createPostRequest(
      { sceneUrls: ['https://cdn.example.com/s1.mp4', '   '] },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('sceneUrls must be a non-empty array of valid URLs')
  })
})

describe('POST /api/studio/stitch - Single Scene & Multi Scene Resolution & Firestore Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  it('handles single scene URL correctly without updating storyboard_jobs if no jobId is given', async () => {
    vi.mocked(createMediaAsset).mockResolvedValueOnce('asset_single_123')

    const body: StitchRequestBody = {
      sceneUrls: ['https://storage.googleapis.com/bucket/single-scene.mp4'],
      captionSuggestion: 'Dust never settled.',
      sunoTrackId: 'track_1',
      snippetId: 'snip_1',
    }

    const req = createPostRequest(body, 'Bearer valid-token')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json).toEqual({
      success: true,
      masterUrl: 'https://storage.googleapis.com/bucket/single-scene.mp4',
      mediaAssetId: 'asset_single_123',
    })

    expect(createMediaAsset).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://storage.googleapis.com/bucket/single-scene.mp4',
        type: 'video',
        videoType: 'cinematic',
        prompt: 'Multi-scene stitched master reel',
        sunoTrackId: 'track_1',
        snippetId: 'snip_1',
        suggestedCaption: 'Dust never settled.',
      })
    )
    expect(updateStoryboardJob).not.toHaveBeenCalled()
  })

  it('handles multi-scene stitching and updates storyboard_jobs when storyboardJobId is provided', async () => {
    vi.mocked(createMediaAsset).mockResolvedValueOnce('asset_multi_456')
    vi.mocked(updateStoryboardJob).mockResolvedValueOnce(undefined)

    const body: StitchRequestBody = {
      sceneUrls: [
        'https://storage.googleapis.com/bucket/scene1.mp4',
        'https://storage.googleapis.com/bucket/scene2.mp4',
        'https://storage.googleapis.com/bucket/scene3.mp4',
      ],
      audioUrl: 'https://storage.googleapis.com/bucket/master_audio.mp3',
      storyboardJobId: 'sb_job_777',
      captionSuggestion: 'The road goes on. Outlaw Americana streaming now.',
      sunoTrackId: 'track_outlaw',
      snippetId: 'snip_chorus',
      linkedPostId: 'post_draft_1',
    }

    const req = createPostRequest(body, 'Bearer valid-token')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.mediaAssetId).toBe('asset_multi_456')
    expect(json.masterUrl).toContain('stitched%2Fsb_job_777_master.mp4')

    expect(createMediaAsset).toHaveBeenCalledWith({
      url: json.masterUrl,
      type: 'video',
      videoType: 'cinematic',
      prompt: 'Multi-scene stitched master reel',
      kieJobId: 'sb_job_777',
      sunoTrackId: 'track_outlaw',
      snippetId: 'snip_chorus',
      suggestedCaption: 'The road goes on. Outlaw Americana streaming now.',
      linkedPostId: 'post_draft_1',
    })

    expect(updateStoryboardJob).toHaveBeenCalledWith('sb_job_777', {
      state: 'success',
      masterResultUrl: json.masterUrl,
    })
  })
})

describe('POST /api/studio/stitch - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  it('returns 500 when createMediaAsset throws an error', async () => {
    vi.mocked(createMediaAsset).mockRejectedValueOnce(new Error('Firestore write failure'))

    const body: StitchRequestBody = {
      sceneUrls: ['https://storage.googleapis.com/bucket/s1.mp4'],
    }

    const req = createPostRequest(body, 'Bearer valid-token')
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Firestore write failure')
  })

  it('returns 500 when updateStoryboardJob throws an error', async () => {
    vi.mocked(createMediaAsset).mockResolvedValueOnce('asset_123')
    vi.mocked(updateStoryboardJob).mockRejectedValueOnce(new Error('Failed to update storyboard job'))

    const body: StitchRequestBody = {
      sceneUrls: ['https://storage.googleapis.com/bucket/s1.mp4'],
      storyboardJobId: 'sb_job_failed',
    }

    const req = createPostRequest(body, 'Bearer valid-token')
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Failed to update storyboard job')
  })
})
