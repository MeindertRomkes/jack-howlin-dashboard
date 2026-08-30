import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { AudioSnippet, SunoTrack, KieJob, MediaAsset } from '@/types'
import { addTrackSnippet, deleteTrackSnippet } from '@/lib/studio-firestore'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'

vi.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: vi.fn(() => 'MOCK_SERVER_TIMESTAMP'),
    arrayUnion: vi.fn((item) => ({ _methodName: 'arrayUnion', _elements: [item] })),
  },
}))

const mockDoc = {
  get: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}

const mockCollection = {
  doc: vi.fn(() => mockDoc),
  add: vi.fn(),
  orderBy: vi.fn(() => ({
    get: vi.fn(),
    limit: vi.fn(() => ({
      get: vi.fn(),
    })),
  })),
}

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: vi.fn(() => mockCollection),
  },
}))

describe('AudioSnippet Types & Duration Bounds Calculations', () => {
  it('validates snippet duration calculation and bounds', () => {
    const startTime = 15.5
    const endTime = 45.0
    const duration = endTime - startTime

    const snippet: AudioSnippet = {
      id: 'snip_123456789',
      name: 'Chorus Hook',
      startTime,
      endTime,
      duration,
      highlightLyric: 'Out on the dusty trail',
      storageUrl: 'gs://bucket/snippets/snip_123456789.mp3',
      publicUrl: 'https://storage.googleapis.com/bucket/snippets/snip_123456789.mp3',
      createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    }

    expect(snippet.duration).toBe(29.5)
    expect(snippet.endTime).toBeGreaterThan(snippet.startTime)
    expect(snippet.startTime).toBeGreaterThanOrEqual(0)
    expect(snippet.name).toBe('Chorus Hook')
  })

  it('validates snippet fits within total track duration', () => {
    const trackDuration = 180 // 3 minutes
    const startTime = 60
    const endTime = 90
    const duration = endTime - startTime

    const isValidBounds = (start: number, end: number, maxDuration: number) => {
      return start >= 0 && end <= maxDuration && start < end && end - start === duration
    }

    expect(isValidBounds(startTime, endTime, trackDuration)).toBe(true)
    expect(isValidBounds(-5, 30, trackDuration)).toBe(false)
    expect(isValidBounds(100, 200, trackDuration)).toBe(false)
    expect(isValidBounds(50, 40, trackDuration)).toBe(false)
  })

  it('supports SunoTrack with snippets array', () => {
    const track: SunoTrack = {
      id: 'track-1',
      name: 'Hate Me All You Want',
      storageUrl: 'https://storage.example.com/track1.mp3',
      publicUrl: 'https://storage.example.com/track1.mp3',
      durationSeconds: 210,
      releaseType: 'single',
      releaseStatus: 'released',
      createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
      snippets: [
        {
          id: 'snip_1',
          name: 'Main Chorus',
          startTime: 30,
          endTime: 60,
          duration: 30,
          highlightLyric: 'Hate me all you want tonight',
          createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
        },
      ],
    }

    expect(track.snippets).toBeDefined()
    expect(track.snippets?.length).toBe(1)
    expect(track.snippets?.[0].name).toBe('Main Chorus')
  })

  it('supports KieJob and MediaAsset with snippet and audiogram fields', () => {
    const job: KieJob = {
      id: 'job-1',
      taskId: 'task-1',
      model: 'video',
      kieModel: 'kling-v1',
      state: 'waiting',
      prompt: 'Cinematic western visuals',
      aspectRatio: '9:16',
      resultUrls: [],
      videoType: 'audiogram',
      sunoTrackId: 'track-1',
      snippetId: 'snip_1',
      captionSuggestion: 'Check out this hook!',
      createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    }

    const asset: MediaAsset = {
      id: 'asset-1',
      url: 'https://storage.example.com/video.mp4',
      type: 'video',
      videoType: 'audiogram',
      sunoTrackId: 'track-1',
      snippetId: 'snip_1',
      suggestedCaption: 'Check out this hook!',
      prompt: 'Cinematic western visuals',
      kieJobId: 'job-1',
      createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    }

    expect(job.videoType).toBe('audiogram')
    expect(job.sunoTrackId).toBe('track-1')
    expect(job.snippetId).toBe('snip_1')
    expect(job.captionSuggestion).toBe('Check out this hook!')

    expect(asset.videoType).toBe('audiogram')
    expect(asset.sunoTrackId).toBe('track-1')
    expect(asset.snippetId).toBe('snip_1')
    expect(asset.suggestedCaption).toBe('Check out this hook!')
  })
})

describe('Firestore Snippet Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('addTrackSnippet generates snip_ ID, attaches serverTimestamp, and calls arrayUnion', async () => {
    const snippetInput = {
      name: 'Bridge Solo',
      startTime: 75,
      endTime: 105,
      duration: 30,
      highlightLyric: 'Guitar solo',
    }

    const snippetId = await addTrackSnippet('track-123', snippetInput)

    expect(snippetId).toMatch(/^snip_\d+$/)
    expect(adminDb.collection).toHaveBeenCalledWith('suno_tracks')
    expect(mockCollection.doc).toHaveBeenCalledWith('track-123')
    expect(FieldValue.serverTimestamp).toHaveBeenCalled()
    expect(FieldValue.arrayUnion).toHaveBeenCalledWith(
      expect.objectContaining({
        id: snippetId,
        name: 'Bridge Solo',
        startTime: 75,
        endTime: 105,
        duration: 30,
        highlightLyric: 'Guitar solo',
        createdAt: 'MOCK_SERVER_TIMESTAMP',
      })
    )
    expect(mockDoc.update).toHaveBeenCalledWith({
      snippets: expect.anything(),
    })
  })

  it('deleteTrackSnippet removes the target snippet and updates the doc', async () => {
    const existingSnippets = [
      { id: 'snip_1', name: 'Intro', startTime: 0, endTime: 15, duration: 15 },
      { id: 'snip_2', name: 'Chorus', startTime: 30, endTime: 60, duration: 30 },
      { id: 'snip_3', name: 'Outro', startTime: 120, endTime: 140, duration: 20 },
    ]

    mockDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        id: 'track-123',
        name: 'Test Track',
        snippets: existingSnippets,
      }),
    })

    await deleteTrackSnippet('track-123', 'snip_2')

    expect(mockCollection.doc).toHaveBeenCalledWith('track-123')
    expect(mockDoc.get).toHaveBeenCalled()
    expect(mockDoc.update).toHaveBeenCalledWith({
      snippets: [
        { id: 'snip_1', name: 'Intro', startTime: 0, endTime: 15, duration: 15 },
        { id: 'snip_3', name: 'Outro', startTime: 120, endTime: 140, duration: 20 },
      ],
    })
  })

  it('deleteTrackSnippet handles non-existent document gracefully', async () => {
    mockDoc.get.mockResolvedValueOnce({
      exists: false,
    })

    await deleteTrackSnippet('non-existent-track', 'snip_1')

    expect(mockDoc.get).toHaveBeenCalled()
    expect(mockDoc.update).not.toHaveBeenCalled()
  })

  it('deleteTrackSnippet handles track without snippets array', async () => {
    mockDoc.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({
        id: 'track-no-snippets',
        name: 'Track Without Snippets',
      }),
    })

    await deleteTrackSnippet('track-no-snippets', 'snip_1')

    expect(mockDoc.update).toHaveBeenCalledWith({
      snippets: [],
    })
  })
})
