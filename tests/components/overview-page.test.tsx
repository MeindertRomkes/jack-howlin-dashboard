import { expect, test, describe, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import OverviewPage from '../../app/(dashboard)/page'

const mockUpcomingDocs = [
  {
    id: 'post_1',
    data: () => ({
      title: 'Hate Me All You Want — Teaser Video Drop',
      caption: 'Hate Me All You Want — Teaser Video Drop',
      platforms: ['youtube', 'instagram', 'tiktok'],
      mediaUrl: 'https://storage.googleapis.com/test/video.mp4',
      mediaType: 'video',
      scheduledAt: {
        toDate: () => new Date(Date.now() + 3600 * 1000 * 2), // in 2 hours
      },
      status: 'scheduled',
    }),
  },
]

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  getDocs: vi.fn(async () => ({
    size: 4,
    docs: mockUpcomingDocs,
  })),
  Timestamp: {
    now: () => ({ toDate: () => new Date() }),
    fromDate: (d: Date) => ({ toDate: () => d }),
  },
}))

describe('OverviewPage Component', () => {
  test('renders Header Hero with Jack Howlin Command Studio and Outlaw branding', async () => {
    render(<OverviewPage />)
    expect(await screen.findByText(/Jack Howlin' Command Studio/i)).toBeInTheDocument()
    expect(screen.getByText(/Outlaw Core/i)).toBeInTheDocument()
    expect(screen.getByText(/7-Dagen Release Planner/i)).toBeInTheDocument()
    expect(screen.getByText(/Nieuwe Post/i)).toBeInTheDocument()
  })

  test('renders 4 Primary KPI metric cards with proper links', async () => {
    render(<OverviewPage />)
    expect(await screen.findByText(/Nieuwe Reacties/i)).toBeInTheDocument()
    expect(screen.getByText(/Ingeplande Posts/i)).toBeInTheDocument()
    expect(screen.getByText(/Voice Learning Samples/i)).toBeInTheDocument()
    expect(screen.getByText(/Geregistreerde Fans/i)).toBeInTheDocument()

    const commentsLink = screen.getByText(/Nieuwe Reacties/i).closest('a')
    expect(commentsLink).toHaveAttribute('href', '/comments')

    const calendarLink = screen.getByText(/Ingeplande Posts/i).closest('a')
    expect(calendarLink).toHaveAttribute('href', '/calendar')
  })

  test('renders Outlaw Action Launchpad with 4 workflow cards', async () => {
    render(<OverviewPage />)
    expect(await screen.findByText(/Outlaw Action Launchpad/i)).toBeInTheDocument()
    expect(screen.getByText(/AI Content Studio/i)).toBeInTheDocument()
    expect(screen.getByText(/Comment Outlaw Reply/i)).toBeInTheDocument()
    expect(screen.getByText(/Release Launchpad/i)).toBeInTheDocument()
    expect(screen.getByText(/Data & Intel Radar/i)).toBeInTheDocument()

    const studioLink = screen.getByText(/AI Content Studio/i).closest('a')
    expect(studioLink).toHaveAttribute('href', '/studio')

    const intelLink = screen.getByText(/Data & Intel Radar/i).closest('a')
    expect(intelLink).toHaveAttribute('href', '/analytics')
  })

  test('renders Jack Howlin AI Voice characteristics and interactive tester', async () => {
    render(<OverviewPage />)
    expect(await screen.findByText(/Jack Howlin' AI Stem & Geheugen/i)).toBeInTheDocument()
    expect(screen.getByText(/Cowboyhoed = Kroon/i)).toBeInTheDocument()
    expect(screen.getByText(/Snelle Outlaw Voice Tester/i)).toBeInTheDocument()

    // Test clicking on a voice preset
    const presetBtn = screen.getByText(/When is the next song dropping/i)
    act(() => {
      fireEvent.click(presetBtn)
    })
    expect(screen.getByText(/Been working in the dark\. Soon enough\./i)).toBeInTheDocument()
  })

  test('renders Music Catalog section with track momentum and video bridge links', async () => {
    render(<OverviewPage />)
    expect(await screen.findByText(/Music Catalogus & Track Momentum/i)).toBeInTheDocument()
    expect(screen.getByText('Hate Me All You Want')).toBeInTheDocument()
    expect(screen.getByText('I Still Wear This Crown')).toBeInTheDocument()

    const makeVideoLinks = screen.getAllByText(/Maak Video/i)
    expect(makeVideoLinks.length).toBeGreaterThanOrEqual(4)
    const firstVideoLink = makeVideoLinks[0].closest('a')
    expect(firstVideoLink).toHaveAttribute('href', '/studio?trackTitle=Hate%20Me%20All%20You%20Want')
  })

  test('renders Connected Social Media Channels status cards', async () => {
    render(<OverviewPage />)
    expect(await screen.findByText(/Verbonden Social Media Kanalen & API Status/i)).toBeInTheDocument()
    expect(screen.getByText('YouTube')).toBeInTheDocument()
    expect(screen.getByText('Instagram')).toBeInTheDocument()
    expect(screen.getByText('Facebook')).toBeInTheDocument()
    expect(screen.getByText('TikTok')).toBeInTheDocument()
  })

  test('allows testing custom prompt in Outlaw Voice tester', async () => {
    render(<OverviewPage />)
    await screen.findByText(/Jack Howlin' Command Studio/i)

    const input = screen.getByPlaceholderText(/Typ een fan comment/i)
    act(() => {
      fireEvent.change(input, { target: { value: 'Why do haters hate you?' } })
    })

    const testButton = screen.getByRole('button', { name: /Test/i })
    act(() => {
      fireEvent.click(testButton)
    })

    expect(screen.getByText(/Hate me all you want\. Still wearing this crown\./i)).toBeInTheDocument()
  })

  test('triggers manual refresh when clicking Verversen button', async () => {
    render(<OverviewPage />)
    await screen.findByText(/Jack Howlin' Command Studio/i)

    const refreshBtn = screen.getByTitle(/Live data verversen/i)
    expect(refreshBtn).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(refreshBtn)
    })
  })
})
