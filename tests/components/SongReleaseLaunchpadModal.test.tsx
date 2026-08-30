import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import SongReleaseLaunchpadModal from '@/components/calendar/SongReleaseLaunchpadModal'

describe('SongReleaseLaunchpadModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <SongReleaseLaunchpadModal isOpen={false} onClose={vi.fn()} onSaved={vi.fn()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders initial form when isOpen is true', () => {
    render(
      <SongReleaseLaunchpadModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />
    )
    expect(screen.getByText(/14-Day Song Release Launchpad/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Hate Me All You Want/i)).toBeInTheDocument()
    expect(screen.getByText(/Genereer 14-Dagen Rollout/i)).toBeInTheDocument()
  })

  it('generates campaign posts and displays direct 10s teaser video links to Studio', async () => {
    const mockCampaign = [
      {
        dayOffset: -3,
        phase: 'Teaser & Lore',
        daysFromRelease: '3 dagen voor release',
        recommendedHour: '18:30',
        scheduledAt: '2026-09-04T18:30:00.000Z',
        platforms: ['instagram', 'tiktok'],
        title: 'Teaser Drop',
        caption: 'Dust on the highway. Outlaw crown never falls.',
        hashtags: '#JackHowlin #OutlawAmericana',
        visualHookPrompt: 'Cinematic 35mm film still of Jack Howlin standing near pickup in desert',
        contentType: 'reel',
      },
      {
        dayOffset: 0,
        phase: 'RELEASE DAY',
        daysFromRelease: 'Drop day',
        recommendedHour: '00:00',
        scheduledAt: '2026-09-07T00:00:00.000Z',
        platforms: ['youtube', 'instagram', 'tiktok', 'facebook'],
        title: 'Official Drop',
        caption: 'Hate Me All You Want is live everywhere now.',
        hashtags: '#NewMusic #JackHowlin',
        visualHookPrompt: 'Jack walking through neon bar scene in slow motion',
        contentType: 'video',
      },
    ]

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ campaign: mockCampaign }),
    })

    render(
      <SongReleaseLaunchpadModal isOpen={true} onClose={vi.fn()} onSaved={vi.fn()} />
    )

    // Enter song title
    const songInput = screen.getByPlaceholderText(/Hate Me All You Want/i)
    fireEvent.change(songInput, { target: { value: 'Hate Me All You Want' } })

    // Click generate button
    const generateBtn = screen.getByText(/Genereer 14-Dagen Rollout/i)
    fireEvent.click(generateBtn)

    // Wait for campaign posts to render
    expect(await screen.findByText('Teaser & Lore')).toBeInTheDocument()
    expect(await screen.findByText('RELEASE DAY')).toBeInTheDocument()

    // Verify visual hook prompts and copy buttons
    expect(
      screen.getByText(/Cinematic 35mm film still of Jack Howlin/i)
    ).toBeInTheDocument()

    // Verify 10s Teaser Video studio bridge links
    const studioLinks = screen.getAllByText(/Genereer 10s Teaser Video/i)
    expect(studioLinks.length).toBe(2)

    const firstLink = studioLinks[0].closest('a')
    expect(firstLink).toHaveAttribute(
      'href',
      '/studio?songTitle=Hate%20Me%20All%20You%20Want&promptSuggestion=Dust%20on%20the%20highway.%20Outlaw%20crown%20never%20falls.'
    )
  })
})
