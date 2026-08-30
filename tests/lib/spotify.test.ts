import { expect, test, vi } from 'vitest'
import { fetchJackSpotifyData } from '../../lib/spotify'

test('fetchJackSpotifyData returns default data without env vars', async () => {
  // Mock fetch to simulate no env vars / fetch failing
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: false })))
  
  const data = await fetchJackSpotifyData()
  
  expect(data.artistName).toBe("Jack Howlin'")
  expect(data.isLiveApi).toBe(false)
  expect(data.topTracks.length).toBeGreaterThan(0)
  expect(data.topTracks[0].title).toBe('Hate Me All You Want')
  
  vi.unstubAllGlobals()
})
