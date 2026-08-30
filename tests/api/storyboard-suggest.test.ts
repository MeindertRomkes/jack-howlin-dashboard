import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  POST,
  splitDuration,
  cleanCaption,
  generateStoryboardFallback,
} from '../../app/api/studio/storyboard/suggest/route'
import { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

const mockGenerateContent = vi.fn()
const mockGetGenerativeModel = vi.fn(() => ({
  generateContent: mockGenerateContent,
}))

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
}))

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(function () {
      return {
        getGenerativeModel: mockGetGenerativeModel,
      }
    }),
  }
})

function createPostRequest(body: any, authHeader?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authHeader !== undefined) {
    headers['Authorization'] = authHeader
  }
  return new NextRequest('http://localhost:3000/api/studio/storyboard/suggest', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('Storyboard Scene Splitting & Duration Mathematics', () => {
  it('correctly divides arbitrary durations (<=15s) into 1 scene', () => {
    const d10 = splitDuration(10)
    expect(d10).toEqual([10])
    expect(d10.reduce((a, b) => a + b, 0)).toBe(10)

    const d15 = splitDuration(15)
    expect(d15).toEqual([15])
    expect(d15.reduce((a, b) => a + b, 0)).toBe(15)
  })

  it('correctly divides durations (16-30s) into 2 scenes summing to total', () => {
    const d20 = splitDuration(20)
    expect(d20).toEqual([10, 10])
    expect(d20.reduce((a, b) => a + b, 0)).toBe(20)

    const d25 = splitDuration(25)
    expect(d25).toEqual([12, 13])
    expect(d25.reduce((a, b) => a + b, 0)).toBe(25)

    const d30 = splitDuration(30)
    expect(d30).toEqual([15, 15])
    expect(d30.reduce((a, b) => a + b, 0)).toBe(30)
  })

  it('correctly divides durations (31-45s) into 3 scenes summing to total (e.g. 37s)', () => {
    const d37 = splitDuration(37)
    expect(d37).toEqual([12, 12, 13])
    expect(d37.reduce((a, b) => a + b, 0)).toBe(37)

    const d45 = splitDuration(45)
    expect(d45).toEqual([15, 15, 15])
    expect(d45.reduce((a, b) => a + b, 0)).toBe(45)
  })

  it('correctly divides durations (46+s) into 4 scenes summing to total (e.g. 55s, 60s, 120s)', () => {
    const d55 = splitDuration(55)
    expect(d55).toEqual([13, 13, 13, 16])
    expect(d55.reduce((a, b) => a + b, 0)).toBe(55)

    const d60 = splitDuration(60)
    expect(d60).toEqual([15, 15, 15, 15])
    expect(d60.reduce((a, b) => a + b, 0)).toBe(60)

    const d120 = splitDuration(120)
    expect(d120).toEqual([30, 30, 30, 30])
    expect(d120.reduce((a, b) => a + b, 0)).toBe(120)
  })

  it('enforces bounds (min 3s, max 120s, default 30s)', () => {
    expect(splitDuration(1)).toEqual([3])
    expect(splitDuration(0)).toEqual([15, 15]) // default 30s splits into 2 scenes
    expect(splitDuration(150)).toEqual([30, 30, 30, 30])
    expect(splitDuration(undefined)).toEqual([15, 15])
    expect(splitDuration(NaN)).toEqual([15, 15])
  })
})

describe('Storyboard Persona Rules & Helpers', () => {
  it('cleans caption to remove exclamation marks and enforces max 2 sentences', () => {
    const raw = 'The road never forgives! Keep your foot on the gas! This third sentence should not appear in output.'
    const cleaned = cleanCaption(raw)
    expect(cleaned).not.toContain('!')
    const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(Boolean)
    expect(sentences.length).toBeLessThanOrEqual(2)
    expect(cleaned.endsWith('.')).toBe(true)
  })

  it('generates rich fallback with proper scene count, shot types, camera motions, and captions', () => {
    const fallback37 = generateStoryboardFallback({
      trackTitle: 'Dust & Diesel',
      snippetDuration: 37,
      highlightLyric: 'Tires screaming in the dust',
      mood: 'Gritty Dark Country',
      targetPlatform: 'tiktok',
    })

    expect(fallback37.scenes.length).toBe(3)
    const totalDuration = fallback37.scenes.reduce((sum, s) => sum + s.duration, 0)
    expect(totalDuration).toBe(37)

    expect(fallback37.scenes[0].shotType).toBe('wide')
    expect(fallback37.scenes[0].cameraMotion).toBeDefined()
    expect(fallback37.scenes[0].prompt).toContain('Dust & Diesel')
    expect(fallback37.scenes[0].prompt).toContain('Gritty Dark Country')

    expect(fallback37.caption).toContain('Tires screaming in the dust')
    expect(fallback37.caption).not.toContain('!')
    expect(fallback37.hashtags).toContain('#JackHowlin')
    expect(fallback37.hashtags).toContain('#TikTokMusic')
  })
})

describe('POST /api/studio/storyboard/suggest - Auth Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const req = createPostRequest({ trackTitle: 'Dust & Diesel', snippetDuration: 37 })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const req = createPostRequest({ trackTitle: 'Dust & Diesel', snippetDuration: 37 }, 'Basic token-123')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when Bearer token is empty or whitespace', async () => {
    const req = createPostRequest({ trackTitle: 'Dust & Diesel', snippetDuration: 37 }, 'Bearer   ')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when verifyIdToken rejects', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockRejectedValueOnce(new Error('Invalid token'))
    const req = createPostRequest({ trackTitle: 'Dust & Diesel', snippetDuration: 37 }, 'Bearer invalid-token')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })
})

describe('POST /api/studio/storyboard/suggest - Request Validation & Fallback Execution', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.GEMINI_API_KEY
    delete process.env.GOOGLE_GENAI_API_KEY
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('returns 400 when body is invalid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/studio/storyboard/suggest', {
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

  it('returns 200 with on-brand fallback when GEMINI_API_KEY is unset for 37s duration (3 scenes)', async () => {
    const req = createPostRequest(
      {
        trackTitle: 'Hate Me All You Want',
        snippetDuration: 37,
        highlightLyric: 'Never looked back on this road',
        targetPlatform: 'instagram',
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(Array.isArray(json.scenes)).toBe(true)
    expect(json.scenes.length).toBe(3)
    const totalDuration = json.scenes.reduce((sum: number, s: any) => sum + s.duration, 0)
    expect(totalDuration).toBe(37)

    json.scenes.forEach((scene: any, idx: number) => {
      expect(scene.index).toBe(idx)
      expect(typeof scene.prompt).toBe('string')
      expect(scene.prompt.length).toBeGreaterThan(20)
      expect(typeof scene.cameraMotion).toBe('string')
      expect(['wide', 'medium', 'closeup', 'drone', 'pov']).toContain(scene.shotType)
    })

    // Caption persona validation
    expect(json.caption).not.toContain('!')
    const sentenceCount = json.caption.split(/(?<=[.!?])\s+/).filter(Boolean).length
    expect(sentenceCount).toBeLessThanOrEqual(2)
    expect(json.hashtags).toContain('#JackHowlin')
    expect(json.hashtags).toContain('#Reels')
  })

  it('returns 200 with single scene fallback for duration <= 15s', async () => {
    const req = createPostRequest(
      {
        trackTitle: 'Midnight Train',
        snippetDuration: 10,
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.scenes.length).toBe(1)
    expect(json.scenes[0].duration).toBe(10)
    expect(json.scenes[0].shotType).toBe('wide')
  })

  it('returns 200 with 4 scenes fallback for duration 55s', async () => {
    const req = createPostRequest(
      {
        trackTitle: 'Lone Wolf Highway',
        snippetDuration: 55,
        targetPlatform: 'youtube',
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.scenes.length).toBe(4)
    const sum = json.scenes.reduce((acc: number, s: any) => acc + s.duration, 0)
    expect(sum).toBe(55)
    expect(json.hashtags).toContain('#Shorts')
  })
})

describe('POST /api/studio/storyboard/suggest - Gemini Integration & Persona Adherence', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-gemini-key' }
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('calls Gemini API with persona instructions and returns structured scenes and caption', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            scenes: [
              {
                index: 0,
                duration: 12,
                shotType: 'wide',
                prompt: 'Gritty 35mm film still of Jack Howlin beside his vintage truck at sunset.',
                cameraMotion: 'Slow dolly in towards subject.',
              },
              {
                index: 1,
                duration: 12,
                shotType: 'pov',
                prompt: 'POV looking down the desert highway through the windshield.',
                cameraMotion: 'Forward tracking shot along the yellow divider line.',
              },
              {
                index: 2,
                duration: 13,
                shotType: 'closeup',
                prompt: 'Intense close-up of Jack Howlin under flickering saloon neon.',
                cameraMotion: 'Subtle push-in on eyes with neon rim light.',
              },
            ],
            caption: 'The road never forgets. "Dust & Diesel" streaming everywhere.',
            hashtags: ['#JackHowlin', '#OutlawAmericana', '#CountryRock', '#Americana'],
          }),
      },
    })

    const req = createPostRequest(
      {
        trackTitle: 'Dust & Diesel',
        snippetDuration: 37,
        highlightLyric: 'Tires burning on blacktop',
        mood: 'Dark Western',
        targetPlatform: 'instagram',
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.scenes.length).toBe(3)
    const total = json.scenes.reduce((sum: number, s: any) => sum + s.duration, 0)
    expect(total).toBe(37)

    expect(json.scenes[0].shotType).toBe('wide')
    expect(json.scenes[1].shotType).toBe('pov')
    expect(json.scenes[2].shotType).toBe('closeup')
    expect(json.caption).toBe('The road never forgets. "Dust & Diesel" streaming everywhere.')
    expect(json.hashtags).toEqual(['#JackHowlin', '#OutlawAmericana', '#CountryRock', '#Americana'])
  })

  it('enforces persona adherence by stripping exclamation marks and capping sentences', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            scenes: [
              {
                index: 0,
                duration: 15,
                shotType: 'wide',
                prompt: 'Jack Howlin in the desert.',
                cameraMotion: 'Dolly in.',
              },
              {
                index: 1,
                duration: 15,
                shotType: 'closeup',
                prompt: 'Jack staring into distance.',
                cameraMotion: 'Static shot.',
              },
            ],
            caption: 'Turn the volume up! Never look back. Extra third sentence that must be trimmed.',
            hashtags: ['JackHowlin', 'OutlawAmericana'],
          }),
      },
    })

    const req = createPostRequest(
      {
        trackTitle: 'Hate Me All You Want',
        snippetDuration: 30,
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.caption).not.toContain('!')
    const sentences = json.caption.split(/(?<=[.!?])\s+/).filter(Boolean)
    expect(sentences.length).toBeLessThanOrEqual(2)
    expect(json.hashtags).toContain('#JackHowlin')
    expect(json.hashtags).toContain('#OutlawAmericana')
  })

  it('gracefully uses fallback when Gemini returns invalid JSON or throws error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Gemini quota exceeded'))

    const req = createPostRequest(
      {
        trackTitle: 'Midnight Train',
        snippetDuration: 37,
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.scenes.length).toBe(3)
    const total = json.scenes.reduce((sum: number, s: any) => sum + s.duration, 0)
    expect(total).toBe(37)
    expect(json.caption).not.toContain('!')
  })
})
