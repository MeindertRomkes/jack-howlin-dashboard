import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import ScheduleModal from '@/components/studio/ScheduleModal'
import MediaLibrary from '@/components/studio/MediaLibrary'
import type { MediaAsset } from '@/types'
import { updateDoc } from 'firebase/firestore'

const mockVideoAsset: MediaAsset = {
  id: 'asset_video_1',
  url: 'https://storage.googleapis.com/test-bucket/video1.mp4',
  type: 'video',
  videoType: 'audiogram',
  suggestedCaption: 'Rauw, onverzettelijk. Jack Howlin met een exclusieve preview.',
  prompt: 'Jack Howlin acoustic guitar cinematic dusk',
  kieJobId: 'job_123',
  createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
}

const mockImageAsset: MediaAsset = {
  id: 'asset_image_1',
  url: 'https://storage.googleapis.com/test-bucket/image1.jpg',
  type: 'image',
  prompt: 'Jack Howlin 35mm film portrait under neon motel light',
  kieJobId: 'job_456',
  createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
}

const mockAssets: MediaAsset[] = [
  {
    id: 'asset_001',
    url: 'https://storage.googleapis.com/test/audiogram.mp4',
    type: 'video',
    videoType: 'audiogram',
    prompt: 'Audiogram visual snippet',
    suggestedCaption: 'Outlaw snippet',
    kieJobId: 'job_001',
    linkedPostId: 'post_existing_1',
    createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  },
  {
    id: 'asset_002',
    url: 'https://storage.googleapis.com/test/cinematic.mp4',
    type: 'video',
    videoType: 'cinematic',
    prompt: 'Cinematic highway clip',
    kieJobId: 'job_002',
    createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
  },
]

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  limit: vi.fn(),
  doc: vi.fn((_db, col, id) => ({ col, id })),
  updateDoc: vi.fn(async () => {}),
  onSnapshot: vi.fn((_q, cb) => {
    cb({
      docs: mockAssets.map(a => ({
        id: a.id,
        data: () => a,
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

describe('ScheduleModal Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('pre-populates caption, video platforms, default date tomorrow, and default time 19:00 for video asset', () => {
    render(<ScheduleModal asset={mockVideoAsset} onClose={vi.fn()} />)

    // Modal Header
    expect(screen.getByText('Inplannen in Kalender')).toBeDefined()

    // Caption should be prefilled from suggestedCaption
    const captionInput = screen.getByLabelText(/Caption \/ Bericht/i) as HTMLTextAreaElement
    expect(captionInput.value).toBe(mockVideoAsset.suggestedCaption)

    // VideoType badge
    expect(screen.getByText('Dynamic Audiogram')).toBeDefined()

    // Default time is 19:00
    const timeInput = screen.getByLabelText(/Tijdstip/i) as HTMLInputElement
    expect(timeInput.value).toBe('19:00')

    // Default date is tomorrow
    const dateInput = screen.getByLabelText(/Datum/i) as HTMLInputElement
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const expectedDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
    expect(dateInput.value).toBe(expectedDate)

    // Video default platforms: TikTok, Instagram, YouTube should be active
    const tiktokBtn = screen.getByRole('button', { name: /tiktok/i })
    expect(tiktokBtn.className).toContain('border-cyan-500')

    const instaBtn = screen.getByRole('button', { name: /instagram/i })
    expect(instaBtn.className).toContain('border-pink-500')

    const ytBtn = screen.getByRole('button', { name: /youtube/i })
    expect(ytBtn.className).toContain('border-red-500')

    // Facebook should not be active by default for video
    const fbBtn = screen.getByRole('button', { name: /facebook/i })
    expect(fbBtn.className).not.toContain('border-blue-500')
  })

  it('pre-populates prompt fallback and image platforms for image asset', () => {
    render(<ScheduleModal asset={mockImageAsset} onClose={vi.fn()} />)

    // Caption fallback to prompt
    const captionInput = screen.getByLabelText(/Caption \/ Bericht/i) as HTMLTextAreaElement
    expect(captionInput.value).toBe(mockImageAsset.prompt)

    // Badge
    expect(screen.getByText('Afbeelding')).toBeDefined()

    // Image default platforms: Instagram, Facebook
    const instaBtn = screen.getByRole('button', { name: /instagram/i })
    expect(instaBtn.className).toContain('border-pink-500')

    const fbBtn = screen.getByRole('button', { name: /facebook/i })
    expect(fbBtn.className).toContain('border-blue-500')

    // YouTube and TikTok should not be active by default for image
    const ytBtn = screen.getByRole('button', { name: /youtube/i })
    expect(ytBtn.className).not.toContain('border-red-500')
  })

  it('handles platform toggle interactions correctly', () => {
    render(<ScheduleModal asset={mockVideoAsset} onClose={vi.fn()} />)

    const fbBtn = screen.getByRole('button', { name: /facebook/i })
    const ytBtn = screen.getByRole('button', { name: /youtube/i })

    // Click Facebook to toggle ON
    fireEvent.click(fbBtn)
    expect(fbBtn.className).toContain('border-blue-500')

    // Click YouTube to toggle OFF
    fireEvent.click(ytBtn)
    expect(ytBtn.className).not.toContain('border-red-500')
  })

  it('submits scheduled post to /api/posts, updates media asset linkedPostId, and calls callbacks', async () => {
    const onScheduled = vi.fn()
    const onClose = vi.fn()

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'post_999_scheduled' }),
    })

    render(<ScheduleModal asset={mockVideoAsset} onClose={onClose} onScheduled={onScheduled} />)

    // Update caption
    const captionInput = screen.getByLabelText(/Caption \/ Bericht/i)
    fireEvent.change(captionInput, { target: { value: 'Nieuwe single teaser nu live!' } })

    // Submit form
    const submitBtn = screen.getByRole('button', { name: /inplannen in kalender/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/posts',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer MOCK_BEARER_TOKEN',
          }),
        })
      )
    })

    const fetchCall = (global.fetch as any).mock.calls[0]
    const sentBody = JSON.parse(fetchCall[1].body)
    expect(sentBody.caption).toBe('Nieuwe single teaser nu live!')
    expect(sentBody.mediaUrl).toBe(mockVideoAsset.url)
    expect(sentBody.mediaType).toBe('video')
    expect(sentBody.status).toBe('scheduled')
    expect(sentBody.platforms).toEqual(['tiktok', 'instagram', 'youtube'])
    expect(sentBody.scheduledAt).toBeDefined()

    // Verify Firestore updateDoc called to link media asset
    expect(updateDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: mockVideoAsset.id }),
      { linkedPostId: 'post_999_scheduled' }
    )

    // Callbacks
    expect(onScheduled).toHaveBeenCalledWith('post_999_scheduled')
    expect(onClose).toHaveBeenCalled()
  })

  it('displays error message when /api/posts fails and stays open', async () => {
    const onClose = vi.fn()

    ;(global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Firestore error: permission denied' }),
    })

    render(<ScheduleModal asset={mockVideoAsset} onClose={onClose} />)

    const submitBtn = screen.getByRole('button', { name: /inplannen in kalender/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText('Firestore error: permission denied')).toBeDefined()
    })

    expect(onClose).not.toHaveBeenCalled()
  })

  it('closes modal when X button or Annuleren is clicked', () => {
    const onClose = vi.fn()
    const { rerender } = render(<ScheduleModal asset={mockVideoAsset} onClose={onClose} />)

    // Click X close button
    const closeBtn = screen.getByLabelText('Sluiten')
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)

    // Re-render and click Annuleren button
    rerender(<ScheduleModal asset={mockVideoAsset} onClose={onClose} />)
    const cancelBtn = screen.getByRole('button', { name: 'Annuleren' })
    fireEvent.click(cancelBtn)
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})

describe('MediaLibrary with ScheduleModal Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
  })

  it('renders video badges, scheduled status, and opens ScheduleModal on Inplannen click', async () => {
    render(<MediaLibrary />)

    // Check videoType badges
    expect(screen.getByText('Audiogram')).toBeDefined()
    expect(screen.getByText('Cinematic')).toBeDefined()

    // Check Ingepland badge on linked asset
    expect(screen.getByText('Ingepland')).toBeDefined()

    // Find Inplannen buttons
    const inplannenButtons = screen.getAllByRole('button', { name: /inplannen/i })
    expect(inplannenButtons.length).toBeGreaterThan(0)

    // Click Inplannen on the second asset (Cinematic)
    fireEvent.click(inplannenButtons[1])

    // ScheduleModal should now be open
    expect(screen.getByText('Inplannen in Kalender')).toBeDefined()
    expect(screen.getByText('Cinematic Video')).toBeDefined()

    // Close modal
    const closeBtn = screen.getByLabelText('Sluiten')
    fireEvent.click(closeBtn)

    // Modal should be closed
    expect(screen.queryByText('Inplannen in Kalender')).toBeNull()
  })
})
