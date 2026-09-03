import { expect, test, describe, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AnalyticsPage from '../../app/(dashboard)/analytics/page'

const mockSnapshot = {
  id: 'snap_1',
  timestamp: { seconds: 1700000000, nanoseconds: 0 } as any,
  period: 'daily' as const,
  totalCrossPlatformViews: 650000,
  totalCommentsCount: 420,
  youtube: {
    channelTitle: "Jack Howlin'",
    totalViews: 450000,
    videoCount: 12,
    shortsViews: 300000,
    longformViews: 150000,
    avgWatchPercentage: 75.0,
    totalComments: 300,
    totalLikes: 4000,
  },
  spotify: {
    artistName: "Jack Howlin'",
    monthlyListeners: 22000,
    followers: 5100,
    topTracks: [
      {
        trackId: 'track_test_1',
        title: 'Hate Me All You Want',
        album: 'Outlaw Truths EP',
        popularity: 68,
        weeklyGrowthPercent: 20.0,
        topPlatformHook: 'Midnight highway bass drop',
        spotifyUrl: 'https://open.spotify.com/track/hate-me-all-you-want',
      },
      {
        trackId: 'track_test_2',
        title: 'Dust & Diesel',
        album: 'Single',
        popularity: 55,
        weeklyGrowthPercent: 15.0,
        topPlatformHook: 'Acoustic intro',
        spotifyUrl: 'https://open.spotify.com/track/dust-and-diesel',
      },
    ],
  },
  instagram: {
    followers: 6000,
    reach: 40000,
    totalViews: 50000,
    shares: 1000,
    saves: 700,
    engagementRate: 7.2,
  },
  tiktok: {
    followers: 11000,
    totalViews: 150000,
    totalLikes: 12000,
    shares: 2000,
    engagementRate: 8.9,
  },
}

vi.mock('@/lib/firestore', () => ({
  getLatestAnalyticsSnapshot: vi.fn(async () => mockSnapshot),
  getLatestIntelligenceReport: vi.fn(async () => ({
    id: 'report_1',
    summary: 'Strong growth in shortform videos across Instagram & TikTok.',
    winningHooks: [],
    actionablePlaybooks: [],
    bestPostingWindows: [],
  })),
}))

describe('AnalyticsPage Component', () => {
  test('renders AnalyticsPage and main sync button', async () => {
    render(<AnalyticsPage />)
    const syncButton = await screen.findByText(/Sync Live Data & AI/i)
    expect(syncButton).toBeInTheDocument()
  })

  test('switches to Spotify Track Momentum tab and displays Maak 10s Clip bridge buttons', async () => {
    render(<AnalyticsPage />)

    // Find and click on Spotify Track Momentum tab button
    const tracksTab = await screen.findByText(/Spotify Track Momentum/i)
    fireEvent.click(tracksTab)

    // Verify track names appear
    expect(await screen.findByText('Hate Me All You Want')).toBeInTheDocument()
    expect(await screen.findByText('Dust & Diesel')).toBeInTheDocument()

    // Verify "Maak 10s Clip" action buttons are rendered
    const clipButtons = screen.getAllByText(/Maak 10s Clip/i)
    expect(clipButtons.length).toBeGreaterThanOrEqual(2)

    // Check href attribute on the first clip button link
    const clipLink = clipButtons[0].closest('a')
    expect(clipLink).toHaveAttribute(
      'href',
      '/studio?trackTitle=Hate%20Me%20All%20You%20Want'
    )

    // Check href attribute on the second clip button link
    const clipLink2 = clipButtons[1].closest('a')
    expect(clipLink2).toHaveAttribute(
      'href',
      '/studio?trackTitle=Dust%20%26%20Diesel'
    )
  })

  test('handles complex object-based intelligence reports without crashing', async () => {
    const { getLatestIntelligenceReport } = await import('@/lib/firestore')
    vi.mocked(getLatestIntelligenceReport).mockResolvedValueOnce({
      id: 'report_complex',
      generatedAt: new Date(),
      summary: {
        executiveBrief: 'Cross-platform growth surging on TikTok and Spotify.',
        keyTakeaway: 'Focus on shortform video hooks.',
      } as any,
      winningHooks: [
        {
          trackTitle: 'I Still Wear This Crown',
          hookType: 'Silhouette Reveal',
          description: 'Dusty hat with acoustic chords',
          performanceImpact: '3.5x shares',
          strategicValue: 'Deep outlaw branding',
        } as any,
      ],
      actionablePlaybooks: {
        shortFormVideo: {
          objective: 'Capitalize on TikTok engagement',
          tactics: ['Post 3-part series on Instagram', 'Use acoustic intro hook'],
        },
        spotifyConversion: {
          objective: 'Drive listener conversion',
          tactics: ['Add Spotify smart link in bio'],
        },
      } as any,
      bestPostingWindows: [
        {
          platform: 'TikTok',
          optimalDays: ['Thursday', 'Friday'],
          peakHoursCST: ['19:00 - 21:00'],
          audienceContext: 'Late-night driving listeners',
        } as any,
      ],
      contentFatigueAlerts: [
        {
          riskArea: 'Over-reliance on highway footage',
          observation: 'Repeated highway visuals risk viewer saturation',
          mitigationStrategy: 'Rotate with bar and studio scenes',
          severity: 'Medium',
        } as any,
      ],
      trackMomentumRadar: [],
    })

    render(<AnalyticsPage />)

    // Summary text from object should be extracted and rendered
    expect(
      await screen.findByText(/Cross-platform growth surging on TikTok and Spotify/i)
    ).toBeInTheDocument()

    // Playbooks rendered from object keys
    expect(screen.getByText(/Short Form Video/i)).toBeInTheDocument()
    expect(screen.getByText(/Spotify Conversion/i)).toBeInTheDocument()

    // Switch to Winning Hooks tab
    const hooksTab = screen.getByText(/Winning Hooks & Formats/i)
    fireEvent.click(hooksTab)

    expect(await screen.findByText(/I Still Wear This Crown — Silhouette Reveal/i)).toBeInTheDocument()
    expect(screen.getByText(/3.5x shares/i)).toBeInTheDocument()
    expect(screen.getByText(/Over-reliance on highway footage/i)).toBeInTheDocument()

    // Switch to Platforms tab
    const platformsTab = screen.getByText(/Platform Breakdown & Timing/i)
    fireEvent.click(platformsTab)

    expect(await screen.findByText(/Thursday & Friday/i)).toBeInTheDocument()
    expect(screen.getByText(/19:00 - 21:00/i)).toBeInTheDocument()
  })
})

