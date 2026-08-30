import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SunoLibraryManager, { formatTimeDisplay } from '@/components/settings/SunoLibraryManager'
import type { SunoTrack, AudioSnippet } from '@/types'

// Mock firebase
const mockUnsub = vi.fn()

const mockSnippet: AudioSnippet = {
  id: 'snip_001',
  name: 'Chorus Drop',
  startTime: 45.0,
  endTime: 55.0,
  duration: 10.0,
  highlightLyric: 'Never looked back on this road',
  publicUrl: 'https://storage.example.com/audio/dust.mp3',
  createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
}

const mockTracks: SunoTrack[] = [
  {
    id: 'track_album_1',
    name: 'Midnight Run',
    storageUrl: 'gs://bucket/midnight.mp3',
    publicUrl: 'https://storage.example.com/midnight.mp3',
    releaseType: 'album',
    albumName: 'The Silent Cowboy',
    trackNumber: 1,
    releaseYear: 2025,
    createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    snippets: [mockSnippet],
  },
  {
    id: 'track_single_released',
    name: 'Neon Desert',
    storageUrl: 'gs://bucket/neon.mp3',
    publicUrl: 'https://storage.example.com/neon.mp3',
    releaseType: 'single',
    releaseStatus: 'released',
    releaseYear: 2025,
    createdAt: { seconds: 1700000001, nanoseconds: 0 } as any,
    snippets: [],
  },
  {
    id: 'track_single_upcoming',
    name: 'Dust & Diesel',
    storageUrl: 'gs://bucket/dust.mp3',
    publicUrl: 'https://storage.example.com/dust.mp3',
    releaseType: 'single',
    releaseStatus: 'upcoming',
    createdAt: { seconds: 1700000002, nanoseconds: 0 } as any,
    snippets: [],
  },
  {
    id: 'track_other',
    name: 'Demo Acoustic',
    storageUrl: 'gs://bucket/demo.mp3',
    publicUrl: 'https://storage.example.com/demo.mp3',
    releaseType: 'single',
    createdAt: { seconds: 1700000003, nanoseconds: 0 } as any,
    snippets: [],
  },
]

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  deleteDoc: vi.fn(async () => {}),
  doc: vi.fn(() => ({ id: 'mock-doc' })),
  onSnapshot: vi.fn((_q, cb) => {
    cb({
      docs: mockTracks.map((t) => ({
        id: t.id,
        data: () => t,
      })),
    })
    return mockUnsub
  }),
}))

vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn(async () => 'MOCK_BEARER_TOKEN'),
    },
  }),
  onAuthStateChanged: vi.fn((_auth, cb) => {
    cb({
      getIdToken: vi.fn(async () => 'MOCK_BEARER_TOKEN'),
    })
    return mockUnsub
  }),
}))

describe('SunoLibraryManager - formatTimeDisplay helper', () => {
  it('formats whole seconds as m:ss', () => {
    expect(formatTimeDisplay(0)).toBe('0:00')
    expect(formatTimeDisplay(45)).toBe('0:45')
    expect(formatTimeDisplay(75)).toBe('1:15')
    expect(formatTimeDisplay(120)).toBe('2:00')
  })

  it('formats fractional seconds with tenth ms when present', () => {
    expect(formatTimeDisplay(45.5)).toBe('0:45.5')
    expect(formatTimeDisplay(125.3)).toBe('2:05.3')
  })

  it('handles negative and NaN gracefully', () => {
    expect(formatTimeDisplay(-5)).toBe('0:00')
    expect(formatTimeDisplay(NaN)).toBe('0:00')
  })
})

describe('SunoLibraryManager Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true }),
    })) as any

    window.confirm = vi.fn(() => true)
    window.alert = vi.fn()

    window.HTMLMediaElement.prototype.load = vi.fn()
    window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined)
    window.HTMLMediaElement.prototype.pause = vi.fn()
  })

  it('renders library header and upload section', () => {
    render(<SunoLibraryManager />)

    expect(screen.getByText(/Suno Library & Snippet Manager/i)).toBeInTheDocument()
    expect(screen.getByText('4 tracks')).toBeInTheDocument()
  })

  it('renders categorized sections and track rows with snippet counters', () => {
    render(<SunoLibraryManager />)

    expect(screen.getByText(/The Silent Cowboy/i)).toBeInTheDocument()
    expect(screen.getByText(/Singles uitgebracht/i)).toBeInTheDocument()
    expect(screen.getByText(/Singles aankomend/i)).toBeInTheDocument()
    expect(screen.getByText(/Overig/i)).toBeInTheDocument()

    // 0 snippets badge for tracks without snippets
    const zeroSnippetBadges = screen.getAllByText('(0 snippets)')
    expect(zeroSnippetBadges.length).toBeGreaterThan(0)
  })

  it('expands album tracks when album accordion is clicked', () => {
    render(<SunoLibraryManager />)

    const albumBtn = screen.getByRole('button', { name: /The Silent Cowboy/i })
    fireEvent.click(albumBtn)

    expect(screen.getByText('Midnight Run')).toBeInTheDocument()
    expect(screen.getByText('(1 snippet)')).toBeInTheDocument()
  })

  it('displays saved snippets when snippet accordion is toggled', () => {
    render(<SunoLibraryManager />)

    // Expand album
    const albumBtn = screen.getByRole('button', { name: /The Silent Cowboy/i })
    fireEvent.click(albumBtn)

    // Toggle snippets for Midnight Run
    const snippetCountBtn = screen.getByRole('button', { name: /1 snippet/i })
    fireEvent.click(snippetCountBtn)

    expect(screen.getByText('Chorus Drop')).toBeInTheDocument()
    expect(screen.getByText(/10.0s • 0:45 - 0:55/i)).toBeInTheDocument()
    expect(screen.getByText(/Never looked back on this road/i)).toBeInTheDocument()
  })

  it('opens inline AudioSnipper when Knip 10s Snippet is clicked', () => {
    render(<SunoLibraryManager />)

    const knipBtns = screen.getAllByRole('button', { name: /Knip 10s Snippet/i })
    fireEvent.click(knipBtns[0])

    expect(screen.getByText('Audio Snippet Knippen')).toBeInTheDocument()
    expect(screen.getByText(/Selecteer het beste 3-120s hook segment/i)).toBeInTheDocument()
  })

  it('toggles snippet playback when play button is clicked', () => {
    render(<SunoLibraryManager />)

    // Expand album
    const albumBtn = screen.getByRole('button', { name: /The Silent Cowboy/i })
    fireEvent.click(albumBtn)

    // Expand snippets
    const snippetCountBtn = screen.getByRole('button', { name: /1 snippet/i })
    fireEvent.click(snippetCountBtn)

    const playSnippetBtn = screen.getByTitle('Speel snippet (loop)')
    fireEvent.click(playSnippetBtn)

    expect(screen.getByTitle('Pauzeer snippet')).toBeInTheDocument()

    fireEvent.click(screen.getByTitle('Pauzeer snippet'))
    expect(screen.getByTitle('Speel snippet (loop)')).toBeInTheDocument()
  })

  it('deletes snippet with confirmation and API call', async () => {
    render(<SunoLibraryManager />)

    fireEvent.click(screen.getByRole('button', { name: /The Silent Cowboy/i }))
    fireEvent.click(screen.getByRole('button', { name: /1 snippet/i }))

    const deleteBtn = screen.getByTitle('Verwijder snippet')
    fireEvent.click(deleteBtn)

    expect(window.confirm).toHaveBeenCalledWith('Weet je zeker dat je deze snippet wilt verwijderen?')
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/studio/snippets',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            action: 'delete',
            trackId: 'track_album_1',
            snippetId: 'snip_001',
          }),
        })
      )
    })
  })

  it('cooperates cleanly between full track MiniPlayer and snippet playback', async () => {
    render(<SunoLibraryManager />)

    const playTrackBtns = screen.getAllByTitle('Speel hele track')
    fireEvent.click(playTrackBtns[0])

    // MiniPlayer close button is present when MiniPlayer is open
    expect(screen.getByTitle('Sluit speler')).toBeInTheDocument()

    // Expand album and start snippet playback
    fireEvent.click(screen.getByRole('button', { name: /The Silent Cowboy/i }))
    fireEvent.click(screen.getByRole('button', { name: /1 snippet/i }))

    const playSnippetBtn = screen.getByTitle('Speel snippet (loop)')
    fireEvent.click(playSnippetBtn)

    // Full track player should have closed
    expect(screen.queryByTitle('Sluit speler')).not.toBeInTheDocument()
    expect(screen.getByTitle('Pauzeer snippet')).toBeInTheDocument()
  })
})
