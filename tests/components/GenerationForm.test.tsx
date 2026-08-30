import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GenerationForm from '@/components/studio/GenerationForm'
import type { SunoTrack, AudioSnippet } from '@/types'

const mockSnippet: AudioSnippet = {
  id: 'snip_001',
  name: 'Chorus Drop',
  startTime: 45.0,
  endTime: 55.0,
  duration: 10.0,
  highlightLyric: 'Never looked back on this dusty road',
  publicUrl: 'https://storage.example.com/audio/dust.mp3',
  createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
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
    snippets: [mockSnippet],
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

vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn(async () => 'MOCK_BEARER_TOKEN'),
    },
  }),
}))

// Mock JackCoreSetPreview to keep component focused
vi.mock('@/components/studio/JackCoreSetPreview', () => ({
  default: () => <div data-testid="jack-core-set-preview">Core Set Preview</div>,
}))

describe('GenerationForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders 3 mode toggle buttons (Foto, AI Video, Audiogram Reel)', () => {
    render(<GenerationForm onJobCreated={vi.fn()} />)

    expect(screen.getByText('Foto')).toBeDefined()
    expect(screen.getByText('AI Video')).toBeDefined()
    expect(screen.getByText('Audiogram Reel')).toBeDefined()
    expect(screen.getByText(/Foto Genereren/i)).toBeDefined()
  })

  it('switches between modes and updates UI controls', () => {
    render(<GenerationForm onJobCreated={vi.fn()} />)

    // In Photo mode: SunoTrackSelector is NOT shown
    expect(screen.queryByText(/Suno Track \(Audio Bron\)/i)).toBeNull()

    // Switch to AI Video mode
    fireEvent.click(screen.getByText('AI Video'))
    expect(screen.getByText(/Suno Track \(Audio Bron\)/i)).toBeDefined()
    expect(screen.getByText(/Video Genereren/i)).toBeDefined()

    // Switch to Audiogram Reel mode
    fireEvent.click(screen.getByText('Audiogram Reel'))
    expect(screen.getByText(/Audiogram Reel Modus \(9:16\)/i)).toBeDefined()
    expect(screen.getByText(/Audiogram Reel Genereren/i)).toBeDefined()
    expect(screen.getByText(/Suno Track \(Audio Bron\)/i)).toBeDefined()
  })

  it('auto-adjusts duration when a snippet is selected in SunoTrackSelector', async () => {
    render(<GenerationForm onJobCreated={vi.fn()} />)

    // Switch to Video mode
    fireEvent.click(screen.getByText('AI Video'))

    // Select track_01
    const trackSelect = screen.getByDisplayValue(/Geen track/i)
    fireEvent.change(trackSelect, { target: { value: 'track_01' } })

    // Click snippet Chorus Drop (10.0s)
    const snippetPill = await screen.findByText('Chorus Drop')
    fireEvent.click(snippetPill)

    // Duration should now be 10s
    expect(screen.getByText(/Duur: 10s/i)).toBeDefined()
    expect(screen.getByText('Chorus Drop')).toBeDefined()
  })

  it('opens inline AudioSnipper when onOpenSnipper is triggered and applies saved snippet', async () => {
    render(<GenerationForm onJobCreated={vi.fn()} />)

    // Switch to AI Video mode
    fireEvent.click(screen.getByText('AI Video'))

    // Select track_01
    const trackSelect = screen.getByDisplayValue(/Geen track/i)
    fireEvent.change(trackSelect, { target: { value: 'track_01' } })

    // Click Snippet knippen button
    const knipBtn = screen.getByTitle('Knip een nieuw audio snippet uit deze track')
    fireEvent.click(knipBtn)

    // Inline AudioSnipper should now be visible
    expect(screen.getByText('Audio Snippet Knippen')).toBeDefined()
    expect(screen.getByText('Snippet Opslaan')).toBeDefined()

    // Cancel closes inline snipper
    const cancelBtn = screen.getByText('Annuleren')
    fireEvent.click(cancelBtn)
    expect(screen.queryByText('Audio Snippet Knippen')).toBeNull()
  })

  it('calls Gemini prompt generator and populates prompt and caption preview', async () => {
    const mockPromptRes = {
      prompt: 'Gritty 35mm film still of Jack Howlin beside his pickup truck in Nevada desert.',
      caption: 'The road never forgives. "Dust & Diesel" out now.',
      hashtags: ['#JackHowlin', '#OutlawAmericana', '#CountryRock'],
    }

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockPromptRes,
    })

    render(<GenerationForm onJobCreated={vi.fn()} />)

    const aiMagicBtn = screen.getByText(/⚡ AI Prompt & Caption Bedenken/i)
    fireEvent.click(aiMagicBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/studio/prompt-generator',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"videoType":"photo"'),
        })
      )
    })

    // Expect prompt textarea to have generated text
    const textarea = screen.getByPlaceholderText(/Jack staand op een verlaten/i) as HTMLTextAreaElement
    expect(textarea.value).toBe(mockPromptRes.prompt)

    // Expect caption preview box
    expect(screen.getByText(/Jack's AI Caption Suggestie:/i)).toBeDefined()
    expect(screen.getByText(/The road never forgives/i)).toBeDefined()
    expect(screen.getByText('#JackHowlin')).toBeDefined()
  })

  it('submits form with all metadata and triggers onJobCreated', async () => {
    const onJobCreated = vi.fn()
    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ jobId: 'job_999', taskId: 'task_888' }),
    })

    render(<GenerationForm onJobCreated={onJobCreated} linkedPostId="post_123" />)

    // Switch to Audiogram mode
    fireEvent.click(screen.getByText('Audiogram Reel'))

    // Fill prompt
    const textarea = screen.getByPlaceholderText(/Cinematic moody 35mm film portrait/i)
    fireEvent.change(textarea, { target: { value: 'Jack Howlin acoustic session' } })

    // Select track
    const trackSelect = screen.getByDisplayValue(/Geen track/i)
    fireEvent.change(trackSelect, { target: { value: 'track_01' } })

    // Select snippet
    const snippetPill = await screen.findByText('Chorus Drop')
    fireEvent.click(snippetPill)

    // Submit form
    const submitBtn = screen.getByText(/Audiogram Reel Genereren/i)
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/studio/generate',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"videoType":"audiogram"'),
        })
      )
    })

    const fetchCall = (global.fetch as any).mock.calls[0]
    const sentBody = JSON.parse(fetchCall[1].body)
    expect(sentBody.mode).toBe('video')
    expect(sentBody.videoType).toBe('audiogram')
    expect(sentBody.prompt).toBe('Jack Howlin acoustic session')
    expect(sentBody.sunoTrackId).toBe('track_01')
    expect(sentBody.snippetId).toBe('snip_001')
    expect(sentBody.duration).toBe(10)
    expect(sentBody.linkedPostId).toBe('post_123')

    expect(onJobCreated).toHaveBeenCalledWith('job_999', 'task_888')
  })
})
