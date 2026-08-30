import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST } from '../../app/api/studio/prompt-generator/route'
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
  return new NextRequest('http://localhost:3000/api/studio/prompt-generator', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/studio/prompt-generator - Auth Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when Authorization header is missing', async () => {
    const req = createPostRequest({ trackTitle: 'Dust & Diesel' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when Authorization header does not start with Bearer', async () => {
    const req = createPostRequest({ trackTitle: 'Dust & Diesel' }, 'Basic some-token')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when Bearer token is empty or whitespace', async () => {
    const req = createPostRequest({ trackTitle: 'Dust & Diesel' }, 'Bearer   ')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 when verifyIdToken rejects', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockRejectedValueOnce(new Error('Invalid token'))
    const req = createPostRequest({ trackTitle: 'Dust & Diesel' }, 'Bearer bad-token')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })
})

describe('POST /api/studio/prompt-generator - Body Validation & Fallback when API Key Unset', () => {
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
    const req = new NextRequest('http://localhost:3000/api/studio/prompt-generator', {
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

  it('returns 200 with on-brand fallback when GEMINI_API_KEY is unset', async () => {
    const req = createPostRequest(
      {
        trackTitle: 'Hate Me All You Want',
        snippetName: 'Main Chorus',
        highlightLyric: 'Never looked back on this road',
        videoType: 'cinematic',
        targetPlatform: 'tiktok',
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(typeof json.prompt).toBe('string')
    expect(json.prompt.length).toBeGreaterThan(20)
    expect(typeof json.caption).toBe('string')
    expect(json.caption.length).toBeGreaterThan(10)
    expect(Array.isArray(json.hashtags)).toBe(true)
    expect(json.hashtags.length).toBeGreaterThanOrEqual(3)

    // Persona adherence
    expect(json.caption).not.toContain('!')
    const sentenceCount = json.caption.split(/(?<=[.!?])\s+/).filter(Boolean).length
    expect(sentenceCount).toBeLessThanOrEqual(2)
    expect(json.hashtags).toContain('#JackHowlin')
  })

  it('generates appropriate fallback for audiogram videoType', async () => {
    const req = createPostRequest(
      {
        trackTitle: 'Whiskey & Wire',
        videoType: 'audiogram',
        highlightLyric: 'Lost in the smoke and static',
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.prompt.toLowerCase()).toContain('35mm')
    expect(json.caption).not.toContain('!')
    expect(json.caption).toContain('Lost in the smoke and static')
  })

  it('generates appropriate fallback for photo videoType', async () => {
    const req = createPostRequest(
      {
        trackTitle: 'Lone Wolf Highway',
        videoType: 'photo',
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.prompt).toBeDefined()
    expect(json.caption).not.toContain('!')
  })
})

describe('POST /api/studio/prompt-generator - Gemini Generation & Persona Adherence', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.clearAllMocks()
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-gemini-key' }
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('calls Gemini API with persona instructions and returns structured response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          prompt: 'Gritty 35mm film still of Jack Howlin wearing a weathered cowboy hat beside a 1972 Chevy pickup in the Nevada desert at dusk, golden hour haze, Kodak 500T aesthetic.',
          caption: 'The road never forgets. "Dust & Diesel" streaming everywhere.',
          hashtags: ['#JackHowlin', '#OutlawAmericana', '#CountryRock', '#Americana'],
        }),
      },
    })

    const req = createPostRequest(
      {
        trackTitle: 'Dust & Diesel',
        snippetName: 'Drop Chorus',
        highlightLyric: 'Tires burning on the blacktop',
        videoType: 'cinematic',
        targetPlatform: 'instagram',
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.prompt).toContain('Jack Howlin')
    expect(json.caption).toBe('The road never forgets. "Dust & Diesel" streaming everywhere.')
    expect(json.hashtags).toEqual(['#JackHowlin', '#OutlawAmericana', '#CountryRock', '#Americana'])
  })

  it('enforces persona adherence by stripping exclamation marks and capping at 2 sentences', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () => JSON.stringify({
          prompt: 'Jack Howlin in a smoky neon dive bar, 35mm film still.',
          caption: 'Never look back! Keep moving through the dust. Third sentence here that should be pruned.',
          hashtags: ['JackHowlin', 'OutlawAmericana'],
        }),
      },
    })

    const req = createPostRequest(
      {
        trackTitle: 'Hate Me All You Want',
        videoType: 'cinematic',
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    // No exclamation marks
    expect(json.caption).not.toContain('!')
    // Maximum 2 sentences
    const sentences = json.caption.split(/(?<=[.!?])\s+/).filter(Boolean)
    expect(sentences.length).toBeLessThanOrEqual(2)
    // Hashtags formatted with '#'
    expect(json.hashtags).toContain('#JackHowlin')
    expect(json.hashtags).toContain('#OutlawAmericana')
  })

  it('gracefully uses fallback when Gemini returns invalid JSON or throws error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Rate limit exceeded'))

    const req = createPostRequest(
      {
        trackTitle: 'Midnight Train',
        snippetName: 'Solo',
        videoType: 'cinematic',
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(typeof json.prompt).toBe('string')
    expect(json.prompt.length).toBeGreaterThan(10)
    expect(typeof json.caption).toBe('string')
    expect(json.caption).not.toContain('!')
    expect(Array.isArray(json.hashtags)).toBe(true)
  })
})
