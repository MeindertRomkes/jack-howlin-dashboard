import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../app/api/studio/storyboard/create/route'
import {
  validateStoryboardCreateInput,
  buildScenePrompt,
  type StoryboardCreateRequest,
} from '@/lib/storyboard-helpers'
import { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { createKieTask } from '@/lib/kie'
import { getJackCoreSet, createStoryboardJob } from '@/lib/studio-firestore'

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(),
  },
}))

vi.mock('@/lib/kie', () => ({
  createKieTask: vi.fn(),
}))

vi.mock('@/lib/studio-firestore', () => ({
  getJackCoreSet: vi.fn(),
  createStoryboardJob: vi.fn(),
}))

function createPostRequest(body: any, authHeader?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authHeader !== undefined) {
    headers['Authorization'] = authHeader
  }
  return new NextRequest('http://localhost:3000/api/studio/storyboard/create', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('Storyboard Create - Helper Functions', () => {
  describe('validateStoryboardCreateInput', () => {
    it('returns valid for a complete valid request body', () => {
      const result = validateStoryboardCreateInput({
        audioUrl: 'https://storage.googleapis.com/audio/snippet.mp3',
        scenes: [
          { index: 0, duration: 12, shotType: 'wide', prompt: 'Jack leaning on truck', cameraMotion: 'Dolly in' },
          { index: 1, duration: 15, shotType: 'medium', prompt: 'Jack driving highway' },
        ],
        totalDuration: 27,
      })
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('returns invalid when body is null or not an object', () => {
      expect(validateStoryboardCreateInput(null).valid).toBe(false)
      expect(validateStoryboardCreateInput(undefined).valid).toBe(false)
      expect(validateStoryboardCreateInput('string').valid).toBe(false)
    })

    it('returns invalid when audioUrl is missing, empty, whitespace or non-string', () => {
      expect(validateStoryboardCreateInput({ scenes: [{ duration: 10, prompt: 'p', shotType: 'wide' }] }).valid).toBe(false)
      expect(validateStoryboardCreateInput({ audioUrl: '', scenes: [{ duration: 10, prompt: 'p', shotType: 'wide' }] }).valid).toBe(false)
      expect(validateStoryboardCreateInput({ audioUrl: '   ', scenes: [{ duration: 10, prompt: 'p', shotType: 'wide' }] }).valid).toBe(false)
      expect(validateStoryboardCreateInput({ audioUrl: 123 as any, scenes: [{ duration: 10, prompt: 'p', shotType: 'wide' }] }).valid).toBe(false)
    })

    it('returns invalid when scenes is missing, not an array, or empty', () => {
      expect(validateStoryboardCreateInput({ audioUrl: 'https://audio.mp3' }).valid).toBe(false)
      expect(validateStoryboardCreateInput({ audioUrl: 'https://audio.mp3', scenes: [] }).valid).toBe(false)
      expect(validateStoryboardCreateInput({ audioUrl: 'https://audio.mp3', scenes: 'not-array' as any }).valid).toBe(false)
    })

    it('returns invalid when a scene has invalid prompt or non-positive duration', () => {
      expect(
        validateStoryboardCreateInput({
          audioUrl: 'https://audio.mp3',
          scenes: [{ prompt: '', duration: 10, shotType: 'wide' }],
        }).valid
      ).toBe(false)

      expect(
        validateStoryboardCreateInput({
          audioUrl: 'https://audio.mp3',
          scenes: [{ prompt: 'Jack in desert', duration: 0, shotType: 'wide' }],
        }).valid
      ).toBe(false)

      expect(
        validateStoryboardCreateInput({
          audioUrl: 'https://audio.mp3',
          scenes: [{ prompt: 'Jack in desert', duration: -5, shotType: 'wide' }],
        }).valid
      ).toBe(false)
    })
  })

  describe('buildScenePrompt', () => {
    it('prepends image references when Jack Core Set URLs are provided', () => {
      const prompt = buildScenePrompt('Jack leaning on Chevy truck', undefined, [
        'https://cdn.example.com/jack1.png',
        'https://cdn.example.com/jack2.png',
      ])
      expect(prompt).toBe(
        'Reference @Image1 @Image2 for the character appearance. Jack leaning on Chevy truck'
      )
    })

    it('appends camera motion cleanly with proper punctuation', () => {
      const prompt = buildScenePrompt('Jack in the desert', 'Slow dolly-in towards subject', [
        'https://cdn.example.com/jack1.png',
      ])
      expect(prompt).toBe(
        'Reference @Image1 for the character appearance. Jack in the desert. Camera motion: Slow dolly-in towards subject'
      )
    })

    it('formats prompt without image references when reference list is empty', () => {
      const prompt = buildScenePrompt('Dramatic landscape with lone coyote', 'Pan right', [])
      expect(prompt).toBe('Dramatic landscape with lone coyote. Camera motion: Pan right')
    })
  })
})

describe('POST /api/studio/storyboard/create - Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const req = createPostRequest({
      audioUrl: 'https://audio.mp3',
      scenes: [{ index: 0, duration: 12, shotType: 'wide', prompt: 'Jack beside truck' }],
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const req = createPostRequest(
      {
        audioUrl: 'https://audio.mp3',
        scenes: [{ index: 0, duration: 12, shotType: 'wide', prompt: 'Jack beside truck' }],
      },
      'Basic some-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when Bearer token is empty or whitespace', async () => {
    const req = createPostRequest(
      {
        audioUrl: 'https://audio.mp3',
        scenes: [{ index: 0, duration: 12, shotType: 'wide', prompt: 'Jack beside truck' }],
      },
      'Bearer   '
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when verifyIdToken rejects', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockRejectedValueOnce(new Error('Invalid token'))
    const req = createPostRequest(
      {
        audioUrl: 'https://audio.mp3',
        scenes: [{ index: 0, duration: 12, shotType: 'wide', prompt: 'Jack beside truck' }],
      },
      'Bearer invalid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })
})

describe('POST /api/studio/storyboard/create - Request Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  it('returns 400 when body is invalid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/studio/storyboard/create', {
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

  it('returns 400 when audioUrl is missing', async () => {
    const req = createPostRequest(
      {
        scenes: [{ index: 0, duration: 12, shotType: 'wide', prompt: 'Jack beside truck' }],
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('audioUrl')
  })

  it('returns 400 when scenes is empty array', async () => {
    const req = createPostRequest(
      {
        audioUrl: 'https://audio.mp3',
        scenes: [],
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('scenes')
  })

  it('returns 400 when a scene has invalid prompt or duration', async () => {
    const req = createPostRequest(
      {
        audioUrl: 'https://audio.mp3',
        scenes: [{ index: 0, duration: -1, shotType: 'wide', prompt: '   ' }],
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })
})

describe('POST /api/studio/storyboard/create - Orchestration & Firestore Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
    vi.mocked(getJackCoreSet).mockResolvedValue([
      { id: 'core1', label: 'Jack Front', publicUrl: 'https://storage.googleapis.com/jack_front.png', storageUrl: '', order: 0, createdAt: {} as any },
      { id: 'core2', label: 'Jack Side', publicUrl: 'https://storage.googleapis.com/jack_side.png', storageUrl: '', order: 1, createdAt: {} as any },
    ])
  })

  it('orchestrates multi-scene Kie task creation with Seedance 2.5 and creates storyboard job', async () => {
    vi.mocked(createKieTask)
      .mockResolvedValueOnce({ taskId: 'kie_task_scene_1' })
      .mockResolvedValueOnce({ taskId: 'kie_task_scene_2' })
      .mockResolvedValueOnce({ taskId: 'kie_task_scene_3' })

    vi.mocked(createStoryboardJob).mockResolvedValueOnce('storyboard_job_abc123')

    const body: StoryboardCreateRequest = {
      sunoTrackId: 'suno_track_1',
      snippetId: 'snip_37s',
      totalDuration: 37,
      aspectRatio: '9:16',
      audioUrl: 'https://storage.googleapis.com/audio/master_snippet_37s.mp3',
      scenes: [
        {
          index: 0,
          duration: 12,
          shotType: 'wide',
          prompt: 'Jack Howlin standing next to 1972 Chevy truck at sunset',
          cameraMotion: 'Slow cinematic dolly-in',
        },
        {
          index: 1,
          duration: 12,
          shotType: 'medium',
          prompt: 'Jack driving truck down deserted highway',
          cameraMotion: 'Tracking shot alongside driver window',
        },
        {
          index: 2,
          duration: 13,
          shotType: 'closeup',
          prompt: 'Intense close-up of Jack Howlin under neon saloon sign',
          cameraMotion: 'Push-in on eyes',
        },
      ],
      captionSuggestion: 'The road never forgets. "Dust & Diesel" streaming everywhere.',
      linkedPostId: 'post_draft_42',
    }

    const req = createPostRequest(body, 'Bearer valid-token')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(json.storyboardJobId).toBe('storyboard_job_abc123')
    expect(json.taskIds).toEqual(['kie_task_scene_1', 'kie_task_scene_2', 'kie_task_scene_3'])
    expect(json.scenes.length).toBe(3)

    // Verify getJackCoreSet was called
    expect(getJackCoreSet).toHaveBeenCalledTimes(1)

    // Verify createKieTask calls
    expect(createKieTask).toHaveBeenCalledTimes(3)
    expect(createKieTask).toHaveBeenNthCalledWith(1, {
      model: 'bytedance/seedance-2-5',
      input: {
        prompt:
          'Reference @Image1 @Image2 for the character appearance. Jack Howlin standing next to 1972 Chevy truck at sunset. Camera motion: Slow cinematic dolly-in',
        reference_image_urls: [
          'https://storage.googleapis.com/jack_front.png',
          'https://storage.googleapis.com/jack_side.png',
        ],
        resolution: '1080p',
        aspect_ratio: '9:16',
        duration: 12,
        output_format: 'mp4',
        nsfw_checker: true,
      },
    })

    expect(createKieTask).toHaveBeenNthCalledWith(2, {
      model: 'bytedance/seedance-2-5',
      input: {
        prompt:
          'Reference @Image1 @Image2 for the character appearance. Jack driving truck down deserted highway. Camera motion: Tracking shot alongside driver window',
        reference_image_urls: [
          'https://storage.googleapis.com/jack_front.png',
          'https://storage.googleapis.com/jack_side.png',
        ],
        resolution: '1080p',
        aspect_ratio: '9:16',
        duration: 12,
        output_format: 'mp4',
        nsfw_checker: true,
      },
    })

    expect(createKieTask).toHaveBeenNthCalledWith(3, {
      model: 'bytedance/seedance-2-5',
      input: {
        prompt:
          'Reference @Image1 @Image2 for the character appearance. Intense close-up of Jack Howlin under neon saloon sign. Camera motion: Push-in on eyes',
        reference_image_urls: [
          'https://storage.googleapis.com/jack_front.png',
          'https://storage.googleapis.com/jack_side.png',
        ],
        resolution: '1080p',
        aspect_ratio: '9:16',
        duration: 13,
        output_format: 'mp4',
        nsfw_checker: true,
      },
    })

    // Verify createStoryboardJob was called with enriched scenes and rendering_scenes state
    expect(createStoryboardJob).toHaveBeenCalledWith({
      sunoTrackId: 'suno_track_1',
      snippetId: 'snip_37s',
      totalDuration: 37,
      aspectRatio: '9:16',
      audioUrl: 'https://storage.googleapis.com/audio/master_snippet_37s.mp3',
      scenes: [
        {
          index: 0,
          duration: 12,
          shotType: 'wide',
          prompt: 'Jack Howlin standing next to 1972 Chevy truck at sunset',
          cameraMotion: 'Slow cinematic dolly-in',
          taskId: 'kie_task_scene_1',
          state: 'generating',
        },
        {
          index: 1,
          duration: 12,
          shotType: 'medium',
          prompt: 'Jack driving truck down deserted highway',
          cameraMotion: 'Tracking shot alongside driver window',
          taskId: 'kie_task_scene_2',
          state: 'generating',
        },
        {
          index: 2,
          duration: 13,
          shotType: 'closeup',
          prompt: 'Intense close-up of Jack Howlin under neon saloon sign',
          cameraMotion: 'Push-in on eyes',
          taskId: 'kie_task_scene_3',
          state: 'generating',
        },
      ],
      state: 'rendering_scenes',
      captionSuggestion: 'The road never forgets. "Dust & Diesel" streaming everywhere.',
      linkedPostId: 'post_draft_42',
    })
  })

  it('works correctly when Jack Core Set is empty', async () => {
    vi.mocked(getJackCoreSet).mockResolvedValueOnce([])
    vi.mocked(createKieTask).mockResolvedValueOnce({ taskId: 'kie_task_single' })
    vi.mocked(createStoryboardJob).mockResolvedValueOnce('storyboard_job_no_core')

    const body: StoryboardCreateRequest = {
      totalDuration: 10,
      audioUrl: 'https://storage.googleapis.com/audio/single.mp3',
      scenes: [
        {
          index: 0,
          duration: 10,
          shotType: 'wide',
          prompt: 'Desert highway at dusk',
        },
      ],
    }

    const req = createPostRequest(body, 'Bearer valid-token')
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.success).toBe(true)
    expect(createKieTask).toHaveBeenCalledWith({
      model: 'bytedance/seedance-2-5',
      input: {
        prompt: 'Desert highway at dusk',
        reference_image_urls: undefined,
        resolution: '1080p',
        aspect_ratio: '9:16',
        duration: 10,
        output_format: 'mp4',
        nsfw_checker: true,
      },
    })
  })
})

describe('POST /api/studio/storyboard/create - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  it('returns 500 when getJackCoreSet fails', async () => {
    vi.mocked(getJackCoreSet).mockRejectedValueOnce(new Error('Firestore connection error'))

    const req = createPostRequest(
      {
        audioUrl: 'https://audio.mp3',
        scenes: [{ index: 0, duration: 10, shotType: 'wide', prompt: 'Jack in desert' }],
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Firestore connection error')
  })

  it('returns 500 when createKieTask fails', async () => {
    vi.mocked(getJackCoreSet).mockResolvedValueOnce([])
    vi.mocked(createKieTask).mockRejectedValueOnce(new Error('Kie API rate limited'))

    const req = createPostRequest(
      {
        audioUrl: 'https://audio.mp3',
        scenes: [{ index: 0, duration: 10, shotType: 'wide', prompt: 'Jack in desert' }],
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Kie API rate limited')
  })

  it('returns 500 when createStoryboardJob fails', async () => {
    vi.mocked(getJackCoreSet).mockResolvedValueOnce([])
    vi.mocked(createKieTask).mockResolvedValueOnce({ taskId: 'task_1' })
    vi.mocked(createStoryboardJob).mockRejectedValueOnce(new Error('Firestore job creation failed'))

    const req = createPostRequest(
      {
        audioUrl: 'https://audio.mp3',
        scenes: [{ index: 0, duration: 10, shotType: 'wide', prompt: 'Jack in desert' }],
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Firestore job creation failed')
  })
})
