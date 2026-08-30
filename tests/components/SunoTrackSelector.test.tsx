import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SunoTrackSelector from '@/components/studio/SunoTrackSelector'
import type { SunoTrack, AudioSnippet } from '@/types'

const mockSnippet1: AudioSnippet = {
  id: 'snip_001',
  name: 'Chorus Drop',
  startTime: 45.0,
  endTime: 55.0,
  duration: 10.0,
  highlightLyric: 'Never looked back on this dusty road',
  publicUrl: 'https://storage.example.com/audio/dust.mp3',
  createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
}

const mockSnippet2: AudioSnippet = {
  id: 'snip_002',
  name: 'Acoustic Intro',
  startTime: 0.0,
  endTime: 8.5,
  duration: 8.5,
  publicUrl: 'https://storage.example.com/audio/dust.mp3',
  createdAt: { seconds: 1700000001, nanoseconds: 0 } as any,
}

const mockTracks: SunoTrack[] = [
  {
    id: 'track_01',
    name: 'Dust & Diesel',
    storageUrl: 'gs://bucket/dust.mp3',
    publicUrl: 'https://storage.example.com/dust.mp3',
    durationSeconds: 180,
    releaseType: 'single',
    releaseStatus: 'released',
    createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
    snippets: [mockSnippet1, mockSnippet2],
  },
  {
    id: 'track_02',
    name: 'Desert Wind',
    storageUrl: 'gs://bucket/wind.mp3',
    publicUrl: 'https://storage.example.com/wind.mp3',
    durationSeconds: 120,
    releaseType: 'single',
    createdAt: { seconds: 1700000002, nanoseconds: 0 } as any,
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
  onSnapshot: vi.fn((_q, cb) => {
    cb({
      docs: mockTracks.map((t) => ({
        id: t.id,
        data: () => t,
      })),
    })
    return vi.fn()
  }),
}))

describe('SunoTrackSelector Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders track selector dropdown with track options', () => {
    render(<SunoTrackSelector value="" onChange={vi.fn()} />)

    expect(screen.getByText(/Suno Track \(Audio Bron\)/i)).toBeDefined()
    expect(screen.getByText(/Geen track — AI genereert audio/i)).toBeDefined()
    expect(screen.getByText(/Dust & Diesel/i)).toBeDefined()
    expect(screen.getByText(/Desert Wind/i)).toBeDefined()
  })

  it('calls onChange and resets snippet on track change', () => {
    const onChange = vi.fn()
    const onSnippetChange = vi.fn()

    render(
      <SunoTrackSelector
        value=""
        onChange={onChange}
        onSnippetChange={onSnippetChange}
      />
    )

    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'track_01' } })

    expect(onChange).toHaveBeenCalledWith('track_01')
    expect(onSnippetChange).toHaveBeenCalledWith(null)
  })

  it('displays snippet pill tags when selected track has snippets', () => {
    const onSnippetChange = vi.fn()

    render(
      <SunoTrackSelector
        value="track_01"
        onChange={vi.fn()}
        onSnippetChange={onSnippetChange}
      />
    )

    expect(screen.getByText(/Kies Snippet \(2\):/i)).toBeDefined()
    expect(screen.getByText('Chorus Drop')).toBeDefined()
    expect(screen.getByText('(10.0s)')).toBeDefined()
    expect(screen.getByText('Acoustic Intro')).toBeDefined()
    expect(screen.getByText('(8.5s)')).toBeDefined()
  })

  it('selects snippet on pill click and handles toggle', () => {
    const onSnippetChange = vi.fn()

    const { rerender } = render(
      <SunoTrackSelector
        value="track_01"
        onChange={vi.fn()}
        selectedSnippetId=""
        onSnippetChange={onSnippetChange}
      />
    )

    // Click Chorus Drop snippet
    const chorusPill = screen.getByText('Chorus Drop').closest('button')!
    fireEvent.click(chorusPill)
    expect(onSnippetChange).toHaveBeenCalledWith(mockSnippet1)

    // Re-render with Chorus Drop selected
    rerender(
      <SunoTrackSelector
        value="track_01"
        onChange={vi.fn()}
        selectedSnippetId="snip_001"
        onSnippetChange={onSnippetChange}
      />
    )

    // Click Chorus Drop again to deselect
    fireEvent.click(chorusPill)
    expect(onSnippetChange).toHaveBeenCalledWith(null)
  })

  it('displays lyric preview when selected snippet has highlightLyric', () => {
    render(
      <SunoTrackSelector
        value="track_01"
        onChange={vi.fn()}
        selectedSnippetId="snip_001"
        onSnippetChange={vi.fn()}
      />
    )

    expect(screen.getByText(/Never looked back on this dusty road/i)).toBeDefined()
  })

  it('renders Snippet Knippen quick button and triggers onOpenSnipper', () => {
    const onOpenSnipper = vi.fn()

    render(
      <SunoTrackSelector
        value="track_01"
        onChange={vi.fn()}
        onOpenSnipper={onOpenSnipper}
      />
    )

    const knipBtn = screen.getByTitle('Knip een nieuw audio snippet uit deze track')
    expect(knipBtn).toBeDefined()

    fireEvent.click(knipBtn)
    expect(onOpenSnipper).toHaveBeenCalledWith(mockTracks[0])
  })

  it('displays empty snippet message and knip link when track has no snippets', () => {
    const onOpenSnipper = vi.fn()

    render(
      <SunoTrackSelector
        value="track_02"
        onChange={vi.fn()}
        onOpenSnipper={onOpenSnipper}
      />
    )

    expect(screen.getByText(/Nog geen snippets opgeslagen voor deze track/i)).toBeDefined()
    const knipFirst = screen.getByText('Knip eerste snippet')
    fireEvent.click(knipFirst)
    expect(onOpenSnipper).toHaveBeenCalledWith(mockTracks[1])
  })
})
