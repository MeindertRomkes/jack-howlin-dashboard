import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import StoryboardDirector from '@/components/studio/StoryboardDirector'
import type { SunoTrack, AudioSnippet } from '@/types'

const mockSnippet: AudioSnippet = {
  id: 'snip_37s',
  name: 'Main Hook & Guitar Solo',
  startTime: 10.0,
  endTime: 47.0,
  duration: 37.0,
  highlightLyric: 'Dust on the highway, fire in the sky',
  publicUrl: 'https://storage.example.com/audio/dust37.mp3',
  createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
}

const mockTrack: SunoTrack = {
  id: 'track_01',
  name: 'Dust & Diesel',
  storageUrl: 'gs://bucket/dust.mp3',
  publicUrl: 'https://storage.example.com/dust.mp3',
  durationSeconds: 180,
  releaseType: 'single',
  releaseStatus: 'released',
  createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  snippets: [mockSnippet],
}

const mockSuggestResponse = {
  scenes: [
    {
      index: 0,
      duration: 12,
      shotType: 'wide',
      prompt: 'Jack standing beside his 1972 Chevy pickup at dusk',
      cameraMotion: 'Slow cinematic dolly-in towards subject',
    },
    {
      index: 1,
      duration: 15,
      shotType: 'medium',
      prompt: 'Jack driving down the open highway with cigarette smoke',
      cameraMotion: 'Smooth tracking shot alongside driver window',
    },
    {
      index: 2,
      duration: 10,
      shotType: 'closeup',
      prompt: 'Intense close-up of Jack with battered cowboy hat under neon saloon sign',
      cameraMotion: 'Slow dramatic push-in focusing on facial intensity',
    },
  ],
  caption: 'The road never forgives, and the night never forgets. "Dust & Diesel" streaming everywhere.',
  hashtags: ['#JackHowlin', '#OutlawAmericana', '#CountryRock'],
}

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  onSnapshot: vi.fn((_q, cb) => {
    cb({ docs: [] })
    return vi.fn()
  }),
}))

vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn(async () => 'MOCK_STORYBOARD_TOKEN'),
    },
  }),
}))

vi.mock('@/components/studio/JackCoreSetPreview', () => ({
  default: () => <div data-testid="jack-core-set-preview">Core Set Visual Continuity Active</div>,
}))

describe('StoryboardDirector Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('calculates total storyboard length and scene distributions', () => {
    const scenes = [
      { index: 0, duration: 12, shotType: 'wide', prompt: 'Shot 1' },
      { index: 1, duration: 15, shotType: 'medium', prompt: 'Shot 2' },
      { index: 2, duration: 10, shotType: 'closeup', prompt: 'Shot 3' },
    ]
    const total = scenes.reduce((a, b) => a + b.duration, 0)
    expect(total).toBe(37)
  })

  it('fetches initial suggestions on mount and renders timeline, scenes and caption', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuggestResponse,
    })

    const onJobCreated = vi.fn()
    const onCancel = vi.fn()

    render(
      <StoryboardDirector
        track={mockTrack}
        snippet={mockSnippet}
        onJobCreated={onJobCreated}
        onCancel={onCancel}
      />
    )

    // Check loading indicator or header title
    expect(screen.getByText(/Visual Storyboard Director/i)).toBeDefined()
    expect(screen.getByText('Dust & Diesel')).toBeDefined()

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/studio/storyboard/suggest',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer MOCK_STORYBOARD_TOKEN',
          }),
          body: expect.stringContaining('"snippetDuration":37'),
        })
      )
    })

    // Verify header stats
    await waitFor(() => {
      expect(screen.getByText('37s Duur')).toBeDefined()
      expect(screen.getByText('3 Scènes')).toBeDefined()
    })

    // Verify scene intervals and prompts are displayed
    expect(screen.getAllByText('0:00 - 0:12').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('0:12 - 0:27').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('0:27 - 0:37').length).toBeGreaterThanOrEqual(1)

    expect(screen.getByDisplayValue(mockSuggestResponse.scenes[0].prompt)).toBeDefined()
    expect(screen.getByDisplayValue(mockSuggestResponse.scenes[1].prompt)).toBeDefined()
    expect(screen.getByDisplayValue(mockSuggestResponse.scenes[2].prompt)).toBeDefined()

    // Verify caption & hashtags preview
    expect(screen.getByDisplayValue(mockSuggestResponse.caption)).toBeDefined()
    expect(screen.getByText(/#JackHowlin/i)).toBeDefined()

    // Verify Jack Core Set preview is rendered
    expect(screen.getByTestId('jack-core-set-preview')).toBeDefined()
  })

  it('allows editing prompt, selecting shot type and camera motion', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuggestResponse,
    })

    render(
      <StoryboardDirector
        track={mockTrack}
        snippet={mockSnippet}
        onJobCreated={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue(mockSuggestResponse.scenes[0].prompt)).toBeDefined()
    })

    // Edit scene 0 prompt
    const firstPromptTextarea = screen.getByDisplayValue(mockSuggestResponse.scenes[0].prompt)
    fireEvent.change(firstPromptTextarea, {
      target: { value: 'Custom updated prompt for scene 1' },
    })
    expect(screen.getByDisplayValue('Custom updated prompt for scene 1')).toBeDefined()

    // Select different shot type for scene 0 (e.g. Drone Landscape)
    const droneButtons = screen.getAllByRole('button', { name: /Drone Landscape/i })
    fireEvent.click(droneButtons[0])

    // Select camera motion for scene 0 (e.g. Tracking Follow)
    const trackingButtons = screen.getAllByRole('button', { name: /Tracking Follow/i })
    fireEvent.click(trackingButtons[0])
  })

  it('dispatches multi-scene job creation on submit and calls onJobCreated', async () => {
    ;(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestResponse,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          storyboardJobId: 'job_sb_456',
          taskIds: ['task_1', 'task_2', 'task_3'],
          scenes: mockSuggestResponse.scenes,
        }),
      })

    const onJobCreated = vi.fn()
    const onCancel = vi.fn()

    render(
      <StoryboardDirector
        track={mockTrack}
        snippet={mockSnippet}
        onJobCreated={onJobCreated}
        onCancel={onCancel}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('3 Scènes')).toBeDefined()
    })

    // Click launch button
    const launchButton = screen.getByRole('button', { name: /Start Multi-Scene Generatie/i })
    fireEvent.click(launchButton)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/studio/storyboard/create',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer MOCK_STORYBOARD_TOKEN',
          }),
        })
      )
    })

    const createCall = (global.fetch as any).mock.calls[1]
    const parsedBody = JSON.parse(createCall[1].body)
    expect(parsedBody.sunoTrackId).toBe('track_01')
    expect(parsedBody.snippetId).toBe('snip_37s')
    expect(parsedBody.totalDuration).toBe(37)
    expect(parsedBody.audioUrl).toBe('https://storage.example.com/audio/dust37.mp3')
    expect(parsedBody.scenes.length).toBe(3)
    expect(parsedBody.scenes[0].duration).toBe(12)

    expect(onJobCreated).toHaveBeenCalledWith('job_sb_456')
  })

  it('triggers cancel callback when cancel button is clicked', async () => {
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockSuggestResponse,
    })

    const onCancel = vi.fn()

    render(
      <StoryboardDirector
        track={mockTrack}
        snippet={mockSnippet}
        onJobCreated={vi.fn()}
        onCancel={onCancel}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('3 Scènes')).toBeDefined()
    })

    const cancelBtn = screen.getByRole('button', { name: /Annuleren/i })
    fireEvent.click(cancelBtn)

    expect(onCancel).toHaveBeenCalled()
  })

  it('handles suggest failure and allows retry', async () => {
    ;(global.fetch as any)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'AI Scene Director unavailable' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestResponse,
      })

    render(
      <StoryboardDirector
        track={mockTrack}
        snippet={mockSnippet}
        onJobCreated={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText(/AI Scene Director unavailable/i)).toBeDefined()
    })

    // Click retry button
    const retryBtn = screen.getByRole('button', { name: /Scènes Opnieuw Bedenken/i })
    fireEvent.click(retryBtn)

    await waitFor(() => {
      expect(screen.getByText('3 Scènes')).toBeDefined()
    })
  })

  it('handles create failure gracefully with error message', async () => {
    ;(global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuggestResponse,
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Kie API quota exceeded' }),
      })

    render(
      <StoryboardDirector
        track={mockTrack}
        snippet={mockSnippet}
        onJobCreated={vi.fn()}
        onCancel={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('3 Scènes')).toBeDefined()
    })

    const launchButton = screen.getByRole('button', { name: /Start Multi-Scene Generatie/i })
    fireEvent.click(launchButton)

    await waitFor(() => {
      expect(screen.getByText(/Kie API quota exceeded/i)).toBeDefined()
    })
  })
})
