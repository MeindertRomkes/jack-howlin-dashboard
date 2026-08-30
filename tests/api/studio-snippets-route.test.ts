import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '../../app/api/studio/snippets/route'
import { NextRequest } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { addTrackSnippet, deleteTrackSnippet } from '@/lib/studio-firestore'

vi.mock('@/lib/firebase-admin', () => ({
  adminAuth: {
    verifyIdToken: vi.fn(),
  },
  adminDb: {
    collection: vi.fn(),
  },
}))

vi.mock('@/lib/studio-firestore', () => ({
  addTrackSnippet: vi.fn(),
  deleteTrackSnippet: vi.fn(),
}))

function createPostRequest(body: any, authHeader?: string): NextRequest {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (authHeader !== undefined) {
    headers['Authorization'] = authHeader
  }
  return new NextRequest('http://localhost:3000/api/studio/snippets', {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/studio/snippets - Auth Verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 Unauthorized when Authorization header is missing', async () => {
    const req = createPostRequest({ action: 'add', trackId: 'track-1' })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 Unauthorized when Authorization header is not Bearer format', async () => {
    const req = createPostRequest({ action: 'add', trackId: 'track-1' }, 'Basic invalidtoken')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 Unauthorized when Bearer token is empty', async () => {
    const req = createPostRequest({ action: 'add', trackId: 'track-1' }, 'Bearer   ')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('returns 401 Unauthorized when verifyIdToken rejects/throws', async () => {
    vi.mocked(adminAuth.verifyIdToken).mockRejectedValueOnce(new Error('Invalid token'))
    const req = createPostRequest({ action: 'add', trackId: 'track-1' }, 'Bearer invalid-token')
    const res = await POST(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Unauthorized')
  })
})

describe('POST /api/studio/snippets - General Validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  it('returns 400 when body is invalid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/studio/snippets', {
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

  it('returns 400 when trackId is missing', async () => {
    const req = createPostRequest({ action: 'add' }, 'Bearer valid-token')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('trackId is required')
  })

  it('returns 400 when action is unknown', async () => {
    const req = createPostRequest({ action: 'invalid_action', trackId: 'track-1' }, 'Bearer valid-token')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Unknown action')
  })
})

describe('POST /api/studio/snippets - action: add', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  it('returns 400 when snippet object is missing', async () => {
    const req = createPostRequest({ action: 'add', trackId: 'track-1' }, 'Bearer valid-token')
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Missing snippet fields')
  })

  it('returns 400 when snippet name is missing or empty', async () => {
    const req = createPostRequest(
      {
        action: 'add',
        trackId: 'track-1',
        snippet: { name: '  ', startTime: 10, endTime: 20 },
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Missing snippet fields')
  })

  it('returns 400 when startTime or endTime is missing', async () => {
    const req = createPostRequest(
      {
        action: 'add',
        trackId: 'track-1',
        snippet: { name: 'Chorus', startTime: 10 },
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Missing snippet fields')
  })

  it('returns 400 when startTime is negative', async () => {
    const req = createPostRequest(
      {
        action: 'add',
        trackId: 'track-1',
        snippet: { name: 'Chorus', startTime: -5, endTime: 10 },
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Invalid startTime or endTime')
  })

  it('returns 400 when duration <= 0 (endTime <= startTime)', async () => {
    const req = createPostRequest(
      {
        action: 'add',
        trackId: 'track-1',
        snippet: { name: 'Chorus', startTime: 20, endTime: 20 },
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Snippet duur moet tussen 1 en 30s zijn')
  })

  it('returns 400 when duration > 30s', async () => {
    const req = createPostRequest(
      {
        action: 'add',
        trackId: 'track-1',
        snippet: { name: 'Chorus', startTime: 10, endTime: 45 },
      },
      'Bearer valid-token'
    )
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Snippet duur moet tussen 1 en 30s zijn')
  })

  it('successfully creates snippet with rounded duration and highlightLyric', async () => {
    vi.mocked(addTrackSnippet).mockResolvedValueOnce('snip_12345')

    const req = createPostRequest(
      {
        action: 'add',
        trackId: 'track-101',
        snippet: {
          name: '  Main Chorus  ',
          startTime: '10.123',
          endTime: '25.567',
          highlightLyric: '  Dust and gravel on the boots  ',
        },
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ success: true, snippetId: 'snip_12345' })

    // Expected duration: Math.round((25.567 - 10.123) * 10) / 10 = Math.round(15.444 * 10) / 10 = 15.4
    expect(addTrackSnippet).toHaveBeenCalledWith('track-101', {
      name: 'Main Chorus',
      startTime: 10.123,
      endTime: 25.567,
      duration: 15.4,
      highlightLyric: 'Dust and gravel on the boots',
    })
  })

  it('handles optional empty highlightLyric as undefined', async () => {
    vi.mocked(addTrackSnippet).mockResolvedValueOnce('snip_99999')

    const req = createPostRequest(
      {
        action: 'add',
        trackId: 'track-202',
        snippet: {
          name: 'Guitar Solo',
          startTime: 30,
          endTime: 40,
          highlightLyric: '   ',
        },
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.snippetId).toBe('snip_99999')

    expect(addTrackSnippet).toHaveBeenCalledWith('track-202', {
      name: 'Guitar Solo',
      startTime: 30,
      endTime: 40,
      duration: 10,
      highlightLyric: undefined,
    })
  })
})

describe('POST /api/studio/snippets - action: delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  it('returns 400 when snippetId is missing', async () => {
    const req = createPostRequest(
      {
        action: 'delete',
        trackId: 'track-101',
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('snippetId is required')
  })

  it('returns 400 when snippetId is empty string', async () => {
    const req = createPostRequest(
      {
        action: 'delete',
        trackId: 'track-101',
        snippetId: '   ',
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('snippetId is required')
  })

  it('successfully deletes snippet and returns { success: true }', async () => {
    vi.mocked(deleteTrackSnippet).mockResolvedValueOnce(undefined)

    const req = createPostRequest(
      {
        action: 'delete',
        trackId: 'track-101',
        snippetId: 'snip_123',
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toEqual({ success: true })

    expect(deleteTrackSnippet).toHaveBeenCalledWith('track-101', 'snip_123')
  })
})

describe('POST /api/studio/snippets - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(adminAuth.verifyIdToken).mockResolvedValue({ uid: 'user-1' } as any)
  })

  it('returns 500 when Firestore operation fails', async () => {
    vi.mocked(addTrackSnippet).mockRejectedValueOnce(new Error('Firestore connection timeout'))

    const req = createPostRequest(
      {
        action: 'add',
        trackId: 'track-101',
        snippet: {
          name: 'Chorus',
          startTime: 0,
          endTime: 10,
        },
      },
      'Bearer valid-token'
    )

    const res = await POST(req)
    expect(res.status).toBe(500)
    const json = await res.json()
    expect(json.error).toBe('Firestore connection timeout')
  })
})
