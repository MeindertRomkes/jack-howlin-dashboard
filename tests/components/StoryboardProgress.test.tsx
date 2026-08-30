import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import StoryboardProgress, {
  getShotBadge,
  getJobStateBadge,
  getSceneStateBadge,
  calculateProgressPercentage,
} from '@/components/studio/StoryboardProgress'
import type { StoryboardJob } from '@/types'

let snapshotCallback: ((snap: any) => void) | null = null

vi.mock('@/lib/firebase', () => ({
  db: {},
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, col, id) => ({ col, id })),
  onSnapshot: vi.fn((_ref, cb) => {
    snapshotCallback = cb
    return vi.fn()
  }),
}))

vi.mock('firebase/auth', () => ({
  getAuth: () => ({
    currentUser: {
      getIdToken: vi.fn(async () => 'MOCK_PROGRESS_TOKEN'),
    },
  }),
}))

vi.mock('@/components/studio/ScheduleModal', () => ({
  default: ({ asset, onClose, onScheduled }: any) => (
    <div data-testid="mock-schedule-modal">
      <span>Schedule Modal for {asset.url}</span>
      <button onClick={() => onScheduled?.('post_created_456')}>Confirm Schedule</button>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}))

const mockJobRendering: StoryboardJob = {
  id: 'job_sb_100',
  sunoTrackId: 'track_01',
  snippetId: 'snip_37s',
  totalDuration: 37,
  aspectRatio: '9:16',
  audioUrl: 'https://storage.example.com/audio/dust37.mp3',
  scenes: [
    {
      index: 0,
      duration: 12,
      shotType: 'wide',
      prompt: 'Jack standing beside his 1972 Chevy pickup at dusk',
      cameraMotion: 'Slow cinematic dolly-in towards subject',
      taskId: 'task_001',
      state: 'success',
      resultVideoUrl: 'https://storage.example.com/videos/scene_001.mp4',
    },
    {
      index: 1,
      duration: 15,
      shotType: 'medium',
      prompt: 'Jack driving down the open highway with cigarette smoke',
      cameraMotion: 'Smooth tracking shot alongside driver window',
      taskId: 'task_002',
      state: 'generating',
    },
    {
      index: 2,
      duration: 10,
      shotType: 'closeup',
      prompt: 'Intense close-up of Jack with battered cowboy hat under neon saloon sign',
      taskId: 'task_003',
      state: 'waiting',
    },
  ],
  state: 'rendering_scenes',
  captionSuggestion: 'The road never forgives, and the night never forgets. #JackHowlin #OutlawAmericana',
  createdAt: { seconds: 1700000000, nanoseconds: 0 } as any,
}

const mockJobAllScenesDone: StoryboardJob = {
  ...mockJobRendering,
  scenes: [
    {
      index: 0,
      duration: 12,
      shotType: 'wide',
      prompt: 'Jack standing beside truck',
      taskId: 'task_001',
      state: 'success',
      resultVideoUrl: 'https://storage.example.com/videos/scene_001.mp4',
    },
    {
      index: 1,
      duration: 15,
      shotType: 'medium',
      prompt: 'Jack driving highway',
      taskId: 'task_002',
      state: 'success',
      resultVideoUrl: 'https://storage.example.com/videos/scene_002.mp4',
    },
    {
      index: 2,
      duration: 10,
      shotType: 'closeup',
      prompt: 'Jack close-up',
      taskId: 'task_003',
      state: 'success',
      resultVideoUrl: 'https://storage.example.com/videos/scene_003.mp4',
    },
  ],
}

const mockJobSuccess: StoryboardJob = {
  ...mockJobAllScenesDone,
  state: 'success',
  masterResultUrl: 'https://storage.example.com/videos/master_dust37.mp4',
}

const mockJobFail: StoryboardJob = {
  ...mockJobRendering,
  state: 'fail',
  failMsg: 'GPU cluster quota exceeded during generation',
}

describe('StoryboardProgress Component & Helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    snapshotCallback = null
    global.fetch = vi.fn()
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn(),
      },
    })
  })

  describe('Helper Functions', () => {
    it('returns correct shot badges for all shot types', () => {
      expect(getShotBadge('wide').label).toBe('Wide Shot')
      expect(getShotBadge('medium').label).toBe('Medium Action')
      expect(getShotBadge('closeup').label).toBe('Close-up Climax')
      expect(getShotBadge('drone').label).toBe('Drone Landscape')
      expect(getShotBadge('pov').label).toBe('POV Driving')
      expect(getShotBadge('unknown').label).toBe('unknown')
    })

    it('returns correct job state badges', () => {
      expect(getJobStateBadge('rendering_scenes').label).toBe('Scènes Genereren')
      expect(getJobStateBadge('stitching').label).toBe("Video's Samenvoegen")
      expect(getJobStateBadge('success').label).toBe('Voltooid')
      expect(getJobStateBadge('fail').label).toBe('Mislukt')
    })

    it('returns correct scene state badges', () => {
      expect(getSceneStateBadge('waiting').label).toBe('Wachten')
      expect(getSceneStateBadge('generating').label).toBe('Genereren...')
      expect(getSceneStateBadge('success').label).toBe('Gereed')
      expect(getSceneStateBadge('fail').label).toBe('Mislukt')
    })

    it('calculates progress percentage accurately across lifecycle', () => {
      expect(calculateProgressPercentage(null)).toBe(0)
      expect(calculateProgressPercentage(mockJobSuccess)).toBe(100)
      expect(calculateProgressPercentage(mockJobFail)).toBe(100)
      expect(calculateProgressPercentage({ ...mockJobRendering, state: 'stitching' })).toBe(90)
      
      const pct = calculateProgressPercentage(mockJobRendering)
      expect(pct).toBeGreaterThan(0)
      expect(pct).toBeLessThan(90)
    })
  })

  describe('Realtime Firestore status and Scene Cards', () => {
    it('shows loading skeleton before snapshot returns data', () => {
      render(<StoryboardProgress jobId="job_sb_100" />)
      expect(screen.getByText('Storyboard status laden...')).toBeDefined()
    })

    it('renders header, progress bar, and scene cards on snapshot update', async () => {
      render(<StoryboardProgress jobId="job_sb_100" />)

      // Emit initial snapshot
      act(() => {
        snapshotCallback?.({
          exists: () => true,
          id: mockJobRendering.id,
          data: () => mockJobRendering,
        })
      })

      // Header verification
      expect(screen.getByText('Storyboard Studio Monitor')).toBeDefined()
      expect(screen.getByText('Scènes Genereren')).toBeDefined()
      expect(screen.getByText('37s Master Duur')).toBeDefined()
      expect(screen.getByText('3 Scènes')).toBeDefined()
      expect(screen.getByText(/ID: job_sb_100/i)).toBeDefined()

      // Scene count summary
      expect(screen.getByText('1 / 3 Voltooid')).toBeDefined()

      // Scene cards verification
      expect(screen.getByText('Scène 1')).toBeDefined()
      expect(screen.getByText('Wide Shot')).toBeDefined()
      expect(screen.getByText('12s')).toBeDefined()
      expect(screen.getByText(mockJobRendering.scenes[0].prompt)).toBeDefined()
      expect(screen.getByText(/🎥 Slow cinematic dolly-in/i)).toBeDefined()

      expect(screen.getByText('Scène 2')).toBeDefined()
      expect(screen.getByText('Medium Action')).toBeDefined()
      expect(screen.getByText('15s')).toBeDefined()
      expect(screen.getByText('Genereren...')).toBeDefined()

      expect(screen.getByText('Scène 3')).toBeDefined()
      expect(screen.getByText('Close-up Climax')).toBeDefined()
      expect(screen.getByText('10s')).toBeDefined()
      expect(screen.getByText('Wachten')).toBeDefined()
    })

    it('handles fail state and triggers onError callback', async () => {
      const onError = vi.fn()
      render(<StoryboardProgress jobId="job_sb_100" onError={onError} />)

      act(() => {
        snapshotCallback?.({
          exists: () => true,
          id: mockJobFail.id,
          data: () => mockJobFail,
        })
      })

      expect(screen.getByText('Generatie mislukt')).toBeDefined()
      expect(screen.getByText(mockJobFail.failMsg!)).toBeDefined()
      expect(onError).toHaveBeenCalledWith(mockJobFail.failMsg)
    })
  })

  describe('Auto-Stitching Coordinator', () => {
    it('triggers POST /api/studio/stitch when all scenes reach success state', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          masterUrl: 'https://storage.example.com/videos/master_dust37.mp4',
        }),
      })

      render(<StoryboardProgress jobId="job_sb_100" />)

      act(() => {
        snapshotCallback?.({
          exists: () => true,
          id: mockJobAllScenesDone.id,
          data: () => mockJobAllScenesDone,
        })
      })

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/studio/stitch',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/json',
              Authorization: 'Bearer MOCK_PROGRESS_TOKEN',
            }),
            body: expect.stringContaining('"storyboardJobId":"job_sb_100"'),
          })
        )
      })

      const stitchCall = (global.fetch as any).mock.calls[0]
      const sentBody = JSON.parse(stitchCall[1].body)
      expect(sentBody.sceneUrls).toEqual([
        'https://storage.example.com/videos/scene_001.mp4',
        'https://storage.example.com/videos/scene_002.mp4',
        'https://storage.example.com/videos/scene_003.mp4',
      ])
      expect(sentBody.audioUrl).toBe('https://storage.example.com/audio/dust37.mp3')
    })

    it('renders stitching banner when job state is stitching', () => {
      render(<StoryboardProgress jobId="job_sb_100" />)

      act(() => {
        snapshotCallback?.({
          exists: () => true,
          id: mockJobRendering.id,
          data: () => ({ ...mockJobRendering, state: 'stitching' }),
        })
      })

      expect(screen.getByText(/Scènes gereed — Nu samenvoegen & masteren.../i)).toBeDefined()
    })
  })

  describe('Completed Video Player & Calendar Scheduling', () => {
    it('renders video player, suggested caption, copy button, and schedule modal trigger on success', async () => {
      const onComplete = vi.fn()
      const onCancel = vi.fn()

      render(
        <StoryboardProgress
          jobId="job_sb_100"
          onComplete={onComplete}
          onCancel={onCancel}
        />
      )

      act(() => {
        snapshotCallback?.({
          exists: () => true,
          id: mockJobSuccess.id,
          data: () => mockJobSuccess,
        })
      })

      // Success section
      expect(screen.getByText('Master 9:16 Video Gereed')).toBeDefined()
      expect(screen.getByText('Stitched & Mixed')).toBeDefined()

      // Video element
      const videoEl = document.querySelector('video') as HTMLVideoElement
      expect(videoEl).toBeDefined()
      expect(videoEl.src).toBe(mockJobSuccess.masterResultUrl)

      // Caption
      expect(screen.getByText(mockJobSuccess.captionSuggestion!)).toBeDefined()

      // Copy caption interaction
      const copyBtn = screen.getByRole('button', { name: /Kopiëren/i })
      fireEvent.click(copyBtn)
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockJobSuccess.captionSuggestion)
      expect(screen.getByText('Gekopieerd')).toBeDefined()

      // Open schedule modal
      const scheduleBtn = screen.getByRole('button', { name: /Direct Inplannen in Kalender/i })
      fireEvent.click(scheduleBtn)

      // Schedule modal is visible
      expect(screen.getByTestId('mock-schedule-modal')).toBeDefined()
      expect(screen.getByText(`Schedule Modal for ${mockJobSuccess.masterResultUrl}`)).toBeDefined()

      // Confirm schedule
      const confirmScheduleBtn = screen.getByRole('button', { name: /Confirm Schedule/i })
      fireEvent.click(confirmScheduleBtn)

      // Modal closed and onComplete called
      expect(screen.queryByTestId('mock-schedule-modal')).toBeNull()
      expect(onComplete).toHaveBeenCalledWith(mockJobSuccess.masterResultUrl)
    })

    it('calls onCancel when close button is clicked', () => {
      const onCancel = vi.fn()
      render(<StoryboardProgress jobId="job_sb_100" onCancel={onCancel} />)

      act(() => {
        snapshotCallback?.({
          exists: () => true,
          id: mockJobRendering.id,
          data: () => mockJobRendering,
        })
      })

      const closeHeaderBtn = screen.getByLabelText('Sluiten')
      fireEvent.click(closeHeaderBtn)
      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })
})
