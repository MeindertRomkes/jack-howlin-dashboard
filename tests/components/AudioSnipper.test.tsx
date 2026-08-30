import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AudioSnipper, {
  formatTime,
  clampTime,
  adjustStartTimeHelper,
  adjustEndTimeHelper,
  applyPresetDuration,
  PRESET_NAMES,
  PRESET_DURATIONS,
} from '@/components/studio/AudioSnipper'
import type { SunoTrack, AudioSnippet } from '@/types'

// Mock firebase/auth
vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn(async () => 'MOCK_BEARER_TOKEN'),
    },
  }),
}))

const mockTrack: SunoTrack = {
  id: 'track_123',
  name: 'Dust & Diesel',
  storageUrl: 'gs://bucket/tracks/dust_and_diesel.mp3',
  publicUrl: 'https://storage.googleapis.com/bucket/tracks/dust_and_diesel.mp3',
  durationSeconds: 180,
  releaseType: 'single',
  releaseStatus: 'released',
  createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  snippets: [],
}

describe('AudioSnipper Math & Helper Functions', () => {
  describe('formatTime', () => {
    it('formats 0 seconds as 0:00.0', () => {
      expect(formatTime(0)).toBe('0:00.0')
    })

    it('formats fractional seconds correctly mm:ss.s', () => {
      expect(formatTime(45.5)).toBe('0:45.5')
      expect(formatTime(125.0)).toBe('2:05.0')
      expect(formatTime(63.28)).toBe('1:03.2')
    })

    it('handles negative and invalid inputs safely', () => {
      expect(formatTime(-10)).toBe('0:00.0')
      expect(formatTime(NaN)).toBe('0:00.0')
    })
  })

  describe('clampTime', () => {
    it('clamps values within bounds', () => {
      expect(clampTime(5, 0, 10)).toBe(5)
      expect(clampTime(-5, 0, 10)).toBe(0)
      expect(clampTime(15, 0, 10)).toBe(10)
    })
  })

  describe('adjustStartTimeHelper', () => {
    it('increments start time safely', () => {
      const res = adjustStartTimeHelper(10, 20, 1, 180)
      expect(res.startTime).toBe(11)
      expect(res.endTime).toBe(20)
    })

    it('decrements start time safely without going below 0', () => {
      const res = adjustStartTimeHelper(0.5, 10, -1, 180)
      expect(res.startTime).toBe(0)
      expect(res.endTime).toBe(10)
    })

    it('enforces minimum snippet duration of 3s', () => {
      const res = adjustStartTimeHelper(16, 18, 1, 180)
      expect(res.startTime).toBe(15) // Clamped to 18 - 3 = 15
    })

    it('enforces maximum snippet duration of 30s', () => {
      const res = adjustStartTimeHelper(10, 45, -10, 180)
      expect(res.startTime).toBe(15) // Clamped to 45 - 30 = 15
    })
  })

  describe('adjustEndTimeHelper', () => {
    it('increments end time safely', () => {
      const res = adjustEndTimeHelper(10, 20, 1, 180)
      expect(res.startTime).toBe(10)
      expect(res.endTime).toBe(21)
    })

    it('enforces minimum snippet duration of 3s', () => {
      const res = adjustEndTimeHelper(10, 14, -2, 180)
      expect(res.endTime).toBe(13) // start + 3 = 13
    })

    it('enforces maximum snippet duration of 30s', () => {
      const res = adjustEndTimeHelper(10, 38, 5, 180)
      expect(res.endTime).toBe(40) // start + 30 = 40
    })

    it('does not exceed total track duration', () => {
      const res = adjustEndTimeHelper(175, 179, 5, 180)
      expect(res.endTime).toBe(180)
    })
  })

  describe('applyPresetDuration', () => {
    it('applies 5s, 10s, 15s, 30s presets', () => {
      expect(applyPresetDuration(10, 5, 180)).toEqual({ startTime: 10, endTime: 15 })
      expect(applyPresetDuration(10, 10, 180)).toEqual({ startTime: 10, endTime: 20 })
      expect(applyPresetDuration(10, 15, 180)).toEqual({ startTime: 10, endTime: 25 })
      expect(applyPresetDuration(10, 30, 180)).toEqual({ startTime: 10, endTime: 40 })
    })

    it('shifts start time if end time exceeds max duration', () => {
      const res = applyPresetDuration(175, 15, 180)
      expect(res.endTime).toBe(180)
      expect(res.startTime).toBe(165)
    })
  })
})

describe('AudioSnipper Component Rendering & Interaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders with track name and default controls', () => {
    render(<AudioSnipper track={mockTrack} />)

    expect(screen.getByText('Audio Snippet Knippen')).toBeInTheDocument()
    expect(screen.getByText('Dust & Diesel')).toBeInTheDocument()
    expect(screen.getByText(/Chorus Drop/i)).toBeInTheDocument()
    expect(screen.getByText(/Speel Snippet/i)).toBeInTheDocument()
    expect(screen.getByText(/Loop Playback: AAN/i)).toBeInTheDocument()
    expect(screen.getByText(/Snippet Opslaan/i)).toBeInTheDocument()
  })

  it('accepts initialStartTime and initialEndTime props', () => {
    render(
      <AudioSnipper
        track={mockTrack}
        initialStartTime={15.5}
        initialEndTime={25.5}
      />
    )

    expect(screen.getByText(/0:15.5 → 0:25.5/i)).toBeInTheDocument()
    expect(screen.getByText('10.0s')).toBeInTheDocument()
  })

  it('populates name input when preset tag is clicked', () => {
    render(<AudioSnipper track={mockTrack} />)

    const nameInput = screen.getByPlaceholderText(/Bijv. Chorus Drop/i) as HTMLInputElement
    expect(nameInput.value).toBe('')

    const tagButton = screen.getByRole('button', { name: 'Acoustic Intro' })
    fireEvent.click(tagButton)

    expect(nameInput.value).toBe('Acoustic Intro')
  })

  it('adjusts duration when preset duration button is clicked', () => {
    render(
      <AudioSnipper
        track={mockTrack}
        initialStartTime={10}
        initialEndTime={20}
      />
    )

    const preset15Btn = screen.getByRole('button', { name: /15s/i })
    fireEvent.click(preset15Btn)

    expect(screen.getByText(/0:10.0 → 0:25.0/i)).toBeInTheDocument()
  })

  it('toggles loop playback when loop button is clicked', () => {
    render(<AudioSnipper track={mockTrack} />)

    const loopBtn = screen.getByText(/Loop Playback: AAN/i)
    fireEvent.click(loopBtn)

    expect(screen.getByText(/Loop Playback: UIT/i)).toBeInTheDocument()
  })

  it('calls onCancel when cancel button is clicked', () => {
    const handleCancel = vi.fn()
    render(<AudioSnipper track={mockTrack} onCancel={handleCancel} />)

    const cancelBtn = screen.getByRole('button', { name: 'Annuleren' })
    fireEvent.click(cancelBtn)

    expect(handleCancel).toHaveBeenCalledTimes(1)
  })

  it('shows error message if attempting to save without a name', async () => {
    render(<AudioSnipper track={mockTrack} />)

    const saveBtn = screen.getByRole('button', { name: /Snippet Opslaan/i })
    fireEvent.click(saveBtn)

    expect(await screen.findByText(/Geef de snippet een naam/i)).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('sends POST /api/studio/snippets and calls onSnippetSaved on successful save', async () => {
    const handleSaved = vi.fn()
    const mockResponse = {
      ok: true,
      json: async () => ({ success: true, snippetId: 'snip_999' }),
    }
    ;(global.fetch as any).mockResolvedValueOnce(mockResponse)

    render(
      <AudioSnipper
        track={mockTrack}
        initialStartTime={20}
        initialEndTime={30}
        onSnippetSaved={handleSaved}
      />
    )

    // Select name
    const tagButton = screen.getByRole('button', { name: 'Guitar Solo' })
    fireEvent.click(tagButton)

    // Fill lyric
    const lyricInput = screen.getByPlaceholderText(/Never looked back on this dusty road/i)
    fireEvent.change(lyricInput, { target: { value: 'Solo ripping through the canyon' } })

    // Save
    const saveBtn = screen.getByRole('button', { name: /Snippet Opslaan/i })
    fireEvent.click(saveBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/studio/snippets',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer MOCK_BEARER_TOKEN',
          }),
          body: JSON.stringify({
            action: 'add',
            trackId: 'track_123',
            snippet: {
              name: 'Guitar Solo',
              startTime: 20,
              endTime: 30,
              highlightLyric: 'Solo ripping through the canyon',
            },
          }),
        })
      )
    })

    await waitFor(() => {
      expect(handleSaved).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'snip_999',
          name: 'Guitar Solo',
          startTime: 20,
          endTime: 30,
          duration: 10,
          highlightLyric: 'Solo ripping through the canyon',
        })
      )
    })

    expect(await screen.findByText(/Snippet "Guitar Solo" succesvol opgeslagen!/i)).toBeInTheDocument()
  })

  it('handles API error gracefully and displays error banner', async () => {
    const mockErrorResponse = {
      ok: false,
      json: async () => ({ error: 'Database timeout' }),
    }
    ;(global.fetch as any).mockResolvedValueOnce(mockErrorResponse)

    render(<AudioSnipper track={mockTrack} />)

    const tagButton = screen.getByRole('button', { name: 'Verse Hook' })
    fireEvent.click(tagButton)

    const saveBtn = screen.getByRole('button', { name: /Snippet Opslaan/i })
    fireEvent.click(saveBtn)

    expect(await screen.findByText(/Database timeout/i)).toBeInTheDocument()
  })
})
