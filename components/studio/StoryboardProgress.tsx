'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { doc, onSnapshot, Timestamp } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { db } from '@/lib/firebase'
import type { StoryboardJob, StoryboardScene, MediaAsset } from '@/types'
import ScheduleModal from './ScheduleModal'
import {
  Film,
  Camera,
  Video,
  Layers,
  Clapperboard,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  X,
  Copy,
  Check,
  Sparkles,
  Scissors,
} from 'lucide-react'

export interface StoryboardProgressProps {
  jobId: string
  onComplete?: (masterUrl: string) => void
  onError?: (message: string) => void
  onCancel?: () => void
}

export function getShotBadge(shotType?: string) {
  switch (shotType) {
    case 'wide':
      return {
        label: 'Wide Shot',
        color: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
        icon: Film,
      }
    case 'medium':
      return {
        label: 'Medium Action',
        color: 'border-orange-500/40 text-orange-300 bg-orange-500/10',
        icon: Camera,
      }
    case 'closeup':
      return {
        label: 'Close-up Climax',
        color: 'border-red-500/40 text-red-300 bg-red-500/10',
        icon: Video,
      }
    case 'drone':
      return {
        label: 'Drone Landscape',
        color: 'border-blue-500/40 text-blue-300 bg-blue-500/10',
        icon: Layers,
      }
    case 'pov':
      return {
        label: 'POV Driving',
        color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
        icon: Clapperboard,
      }
    default:
      return {
        label: shotType || 'Scene',
        color: 'border-stone-700 text-stone-300 bg-stone-800',
        icon: Film,
      }
  }
}

export function getJobStateBadge(state: StoryboardJob['state']) {
  switch (state) {
    case 'rendering_scenes':
      return {
        label: 'Scènes Genereren',
        color: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
        icon: Loader2,
        spinning: true,
      }
    case 'stitching':
      return {
        label: 'Video\'s Samenvoegen',
        color: 'border-cyan-500/40 text-cyan-300 bg-cyan-500/10',
        icon: Loader2,
        spinning: true,
      }
    case 'success':
      return {
        label: 'Voltooid',
        color: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
        icon: CheckCircle2,
        spinning: false,
      }
    case 'fail':
      return {
        label: 'Mislukt',
        color: 'border-red-500/40 text-red-300 bg-red-500/10',
        icon: AlertCircle,
        spinning: false,
      }
    default:
      return {
        label: state,
        color: 'border-stone-700 text-stone-300 bg-stone-800',
        icon: Film,
        spinning: false,
      }
  }
}

export function getSceneStateBadge(state: StoryboardScene['state']) {
  switch (state) {
    case 'waiting':
      return {
        label: 'Wachten',
        color: 'text-stone-400 bg-stone-900 border-stone-800',
        icon: Clock,
        spinning: false,
      }
    case 'generating':
      return {
        label: 'Genereren...',
        color: 'text-amber-300 bg-amber-950/40 border-amber-500/40',
        icon: Loader2,
        spinning: true,
      }
    case 'success':
      return {
        label: 'Gereed',
        color: 'text-emerald-300 bg-emerald-950/40 border-emerald-500/40',
        icon: CheckCircle2,
        spinning: false,
      }
    case 'fail':
      return {
        label: 'Mislukt',
        color: 'text-red-300 bg-red-950/40 border-red-500/40',
        icon: AlertCircle,
        spinning: false,
      }
    default:
      return {
        label: state,
        color: 'text-stone-400 bg-stone-900 border-stone-800',
        icon: Clock,
        spinning: false,
      }
  }
}

export function calculateProgressPercentage(job: StoryboardJob | null): number {
  if (!job) return 0
  if (job.state === 'success') return 100
  if (job.state === 'fail') return 100
  if (job.state === 'stitching') return 90

  if (!job.scenes || job.scenes.length === 0) return 10

  const total = job.scenes.length
  const successCount = job.scenes.filter(s => s.state === 'success').length
  const generatingCount = job.scenes.filter(s => s.state === 'generating').length

  const sceneProgress = (successCount + generatingCount * 0.4) / total
  return Math.min(85, Math.max(10, Math.round(sceneProgress * 80)))
}

export default function StoryboardProgress({
  jobId,
  onComplete,
  onError,
  onCancel,
}: StoryboardProgressProps) {
  const [job, setJob] = useState<StoryboardJob | null>(null)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [copiedCaption, setCopiedCaption] = useState(false)
  const isStitchingTriggeredRef = useRef(false)

  const triggerStitch = useCallback(
    async (currentJob: StoryboardJob) => {
      try {
        let token: string | undefined
        try {
          token = await getAuth().currentUser?.getIdToken()
        } catch {
          // Token retrieval optional in testing/dev
        }

        const sceneUrls = currentJob.scenes
          .map(s => s.resultVideoUrl)
          .filter((url): url is string => typeof url === 'string' && url.length > 0)

        const res = await fetch('/api/studio/stitch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            sceneUrls,
            audioUrl: currentJob.audioUrl,
            storyboardJobId: currentJob.id,
            captionSuggestion: currentJob.captionSuggestion,
            sunoTrackId: currentJob.sunoTrackId,
            snippetId: currentJob.snippetId,
            linkedPostId: currentJob.linkedPostId,
          }),
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Fout bij samenvoegen van scènes')
        }
      } catch (err: unknown) {
        isStitchingTriggeredRef.current = false
        const msg = err instanceof Error ? err.message : 'Stitching mislukt'
        onError?.(msg)
      }
    },
    [onError]
  )

  // Realtime Firestore snapshot listener
  useEffect(() => {
    if (!jobId) return

    const ref = doc(db, 'storyboard_jobs', jobId)
    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return
        const data = { id: snap.id, ...snap.data() } as StoryboardJob
        setJob(data)

        if (data.state === 'fail') {
          onError?.(data.failMsg || 'Storyboard generatie mislukt')
        }
      },
      (error) => {
        console.error('StoryboardProgress snapshot error:', error)
        onError?.('Verbindingsfout tijdens het volgen van de storyboard-status.')
      }
    )

    return () => unsubscribe()
  }, [jobId, onError])

  // Auto-stitching coordinator
  useEffect(() => {
    if (!job) return

    if (
      job.state === 'rendering_scenes' &&
      job.scenes &&
      job.scenes.length > 0 &&
      !isStitchingTriggeredRef.current
    ) {
      const allScenesDone = job.scenes.every(
        (s) => s.state === 'success' && s.resultVideoUrl
      )
      if (allScenesDone) {
        isStitchingTriggeredRef.current = true
        triggerStitch(job)
      }
    }
  }, [job, triggerStitch])

  const handleCopyCaption = () => {
    if (!job?.captionSuggestion) return
    navigator.clipboard.writeText(job.captionSuggestion)
    setCopiedCaption(true)
    setTimeout(() => setCopiedCaption(false), 2000)
  }

  const handleClose = () => {
    if (onCancel) {
      onCancel()
    } else if (job?.masterResultUrl && onComplete) {
      onComplete(job.masterResultUrl)
    }
  }

  if (!job) {
    return (
      <div className="flex items-center gap-3 p-5 bg-stone-950 border border-stone-800 rounded-2xl animate-pulse">
        <Loader2 className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
        <div className="space-y-1">
          <p className="text-sm font-semibold text-stone-200">Storyboard status laden...</p>
          <p className="text-xs text-stone-500">Verbinding maken met Firestore realtime stream</p>
        </div>
      </div>
    )
  }

  const stateBadge = getJobStateBadge(job.state)
  const StateIcon = stateBadge.icon
  const progressPct = calculateProgressPercentage(job)

  const mediaAssetForSchedule: MediaAsset | null = job.masterResultUrl
    ? {
        id: job.id,
        url: job.masterResultUrl,
        type: 'video',
        videoType: 'cinematic',
        suggestedCaption: job.captionSuggestion,
        prompt: `Multi-scene Storyboard Master (${job.totalDuration}s)`,
        kieJobId: job.id,
        sunoTrackId: job.sunoTrackId,
        snippetId: job.snippetId,
        linkedPostId: job.linkedPostId,
        createdAt: job.createdAt || Timestamp.now(),
      }
    : null

  return (
    <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 sm:p-6 space-y-6 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
            <Clapperboard className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-stone-100 tracking-tight">
                Storyboard Studio Monitor
              </h3>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${stateBadge.color}`}
              >
                <StateIcon className={`w-3.5 h-3.5 ${stateBadge.spinning ? 'animate-spin' : ''}`} />
                <span>{stateBadge.label}</span>
              </div>
            </div>
            <p className="text-xs text-stone-400 mt-1 flex items-center gap-2 flex-wrap">
              <span className="font-mono text-amber-400 font-semibold">{job.totalDuration}s Master Duur</span>
              <span>•</span>
              <span>{job.scenes?.length || 0} Scènes</span>
              <span>•</span>
              <span className="font-mono text-stone-500">ID: {job.id}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          aria-label="Sluiten"
          className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 border border-stone-800/80 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-stone-400 font-medium">Totale Voortgang</span>
          <span className="font-mono font-bold text-amber-400">{progressPct}%</span>
        </div>
        <div className="h-2.5 w-full bg-stone-900 rounded-full overflow-hidden border border-stone-800">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              job.state === 'success'
                ? 'bg-emerald-500'
                : job.state === 'fail'
                ? 'bg-red-500'
                : 'bg-gradient-to-r from-amber-500 to-orange-500'
            }`}
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Stitching Banner when active */}
      {job.state === 'stitching' && (
        <div className="flex items-center gap-3 p-3.5 bg-cyan-950/40 border border-cyan-500/40 rounded-xl text-cyan-300 text-xs animate-pulse">
          <Scissors className="w-4 h-4 text-cyan-400 shrink-0 animate-bounce" />
          <div className="flex-1">
            <p className="font-bold">Scènes gereed — Nu samenvoegen & masteren...</p>
            <p className="text-cyan-400/80 text-[11px] mt-0.5">
              Alle takes worden samengevoegd tot één 9:16 master video met ononderbroken audiotrack.
            </p>
          </div>
          <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
        </div>
      )}

      {/* Failure message */}
      {job.state === 'fail' && (
        <div className="flex items-start gap-3 p-3.5 bg-red-950/50 border border-red-800 rounded-xl text-red-300 text-xs">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Generatie mislukt</p>
            <p className="text-red-400 mt-0.5">{job.failMsg || 'Er is een onverwachte fout opgetreden.'}</p>
          </div>
        </div>
      )}

      {/* Scene Cards List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
          <span>Filmscènes & Takes</span>
          <span className="font-mono text-[11px] text-stone-500">
            {job.scenes?.filter((s) => s.state === 'success').length || 0} / {job.scenes?.length || 0} Voltooid
          </span>
        </h4>

        <div className="grid grid-cols-1 gap-3">
          {job.scenes?.map((scene, idx) => {
            const shotBadge = getShotBadge(scene.shotType)
            const ShotIcon = shotBadge.icon
            const sceneState = getSceneStateBadge(scene.state)
            const SceneIcon = sceneState.icon

            return (
              <div
                key={scene.index ?? idx}
                className={`p-3.5 rounded-xl border transition-all ${
                  scene.state === 'success'
                    ? 'bg-stone-900/70 border-stone-800 hover:border-stone-700'
                    : scene.state === 'generating'
                    ? 'bg-amber-950/20 border-amber-500/40 shadow-sm shadow-amber-500/5'
                    : scene.state === 'fail'
                    ? 'bg-red-950/20 border-red-800/60'
                    : 'bg-stone-900/40 border-stone-800/60 opacity-80'
                }`}
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-stone-800 text-[11px] font-mono font-bold text-stone-300">
                      Scène {idx + 1}
                    </span>
                    <div
                      className={`flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${shotBadge.color}`}
                    >
                      <ShotIcon className="w-3 h-3" />
                      <span>{shotBadge.label}</span>
                    </div>
                    <span className="px-1.5 py-0.5 rounded bg-stone-950 border border-stone-800 text-[10px] font-mono text-amber-400">
                      {scene.duration}s
                    </span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-medium ${sceneState.color}`}
                  >
                    <SceneIcon
                      className={`w-3.5 h-3.5 ${sceneState.spinning ? 'animate-spin' : ''}`}
                    />
                    <span>{sceneState.label}</span>
                  </div>
                </div>

                <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed">
                  {scene.prompt}
                </p>

                {scene.cameraMotion && (
                  <p className="text-[11px] text-stone-500 mt-1 italic">
                    🎥 {scene.cameraMotion}
                  </p>
                )}

                {scene.state === 'fail' && scene.failMsg && (
                  <p className="text-[11px] text-red-400 mt-1">{scene.failMsg}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Completed Master Reel Section */}
      {job.state === 'success' && job.masterResultUrl && (
        <div className="p-5 bg-stone-900/80 border border-amber-500/40 rounded-2xl space-y-5 animate-in fade-in duration-300 shadow-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h4 className="text-sm font-bold text-stone-100 uppercase tracking-wide">
                Master 9:16 Video Gereed
              </h4>
            </div>
            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              Stitched & Mixed
            </span>
          </div>

          {/* Master Video Player */}
          <div className="relative rounded-xl overflow-hidden border border-stone-800 bg-black aspect-[9/16] w-full max-h-[380px] flex items-center justify-center shadow-inner mx-auto">
            <video
              src={job.masterResultUrl}
              controls
              playsInline
              className="w-full h-full object-cover"
            />
          </div>

          {/* Suggested Caption Box */}
          {job.captionSuggestion && (
            <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400">
                  Geadviseerde Caption & Hashtags
                </span>
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-stone-200 transition-colors font-medium"
                >
                  {copiedCaption ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Gekopieerd</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Kopiëren</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-stone-300 whitespace-pre-wrap leading-relaxed">
                {job.captionSuggestion}
              </p>
            </div>
          )}

          {/* Master Action Buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-stone-800 bg-stone-900 text-stone-300 hover:text-stone-100 hover:bg-stone-800 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" />
              <span>Sluiten</span>
            </button>

            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Calendar className="w-4 h-4" />
              <span>📅 Direct Inplannen in Kalender</span>
            </button>
          </div>
        </div>
      )}

      {/* Schedule Modal Integration */}
      {isScheduleModalOpen && mediaAssetForSchedule && (
        <ScheduleModal
          asset={mediaAssetForSchedule}
          onClose={() => setIsScheduleModalOpen(false)}
          onScheduled={() => {
            setIsScheduleModalOpen(false)
            if (job.masterResultUrl) {
              onComplete?.(job.masterResultUrl)
            }
          }}
        />
      )}
    </div>
  )
}
