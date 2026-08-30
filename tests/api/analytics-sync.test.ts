import { expect, test, vi } from 'vitest'
import { POST } from '../../app/api/analytics/sync/route'

vi.mock('@/lib/firebase-admin', () => ({
  adminDb: {
    collection: () => ({
      add: async () => ({ id: 'mock-snapshot-id' })
    })
  }
}))

vi.mock('@/lib/spotify', () => ({
  fetchJackSpotifyData: async () => ({
    artistName: 'Jack Howlin\'',
    monthlyListeners: 1000,
    followers: 500,
    topTracks: [],
    isLiveApi: false
  })
}))

test('Sync route returns 200 and success with snapshotId', async () => {
  const response = await POST()
  expect(response.status).toBe(200)
  
  const json = await response.json()
  expect(json.success).toBe(true)
  expect(json.snapshotId).toBe('mock-snapshot-id')
  expect(json.data.youtube).toBeDefined()
  expect(json.data.spotify).toBeDefined()
  expect(json.data.instagram).toBeDefined()
  expect(json.data.tiktok).toBeDefined()
})
