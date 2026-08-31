'use client'

import { useState, useEffect, useCallback } from 'react'
import { getAuth } from 'firebase/auth'
import {
  Clapperboard,
  Sparkles,
  Film,
  Camera,
  Video,
  Layers,
  Loader2,
  X,
  Clock,
  AlertCircle,
  Sliders,
  MoveHorizontal,
  Compass,
} from 'lucide-react'
import JackCoreSetPreview from './JackCoreSetPreview'
import type { SunoTrack, AudioSnippet, StoryboardScene } from '@/types'

export type ShotType = 'wide' | 'medium' | 'closeup' | 'drone' | 'pov'

export interface StoryboardDirectorProps {
  track: SunoTrack
  snippet?: AudioSnippet | null
  onJobCreated: (jobId: string) => void
  onCancel: () => void
}

export interface ShotTypeOption {
  id: ShotType
  label: string
  icon: typeof Film
  badgeColor: string
  activeColor: string
}

export const SHOT_TYPE_OPTIONS: ShotTypeOption[] = [
  {
    id: 'wide',
    label: 'Wide Shot',
    icon: Film,
    badgeColor: 'border-amber-500/40 text-amber-300 bg-amber-500/10',
    activeColor: 'bg-amber-600/20 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/30',
  },
  {
    id: 'medium',
    label: 'Medium Action',
    icon: Camera,
    badgeColor: 'border-orange-500/40 text-orange-300 bg-orange-500/10',
    activeColor: 'bg-orange-600/20 border-orange-500/60 text-orange-300 ring-1 ring-orange-500/30',
  },
  {
    id: 'closeup',
    label: 'Close-up Climax',
    icon: Video,
    badgeColor: 'border-red-500/40 text-red-300 bg-red-500/10',
    activeColor: 'bg-red-600/20 border-red-500/60 text-red-300 ring-1 ring-red-500/30',
  },
  {
    id: 'drone',
    label: 'Drone Landscape',
    icon: Layers,
    badgeColor: 'border-blue-500/40 text-blue-300 bg-blue-500/10',
    activeColor: 'bg-blue-600/20 border-blue-500/60 text-blue-300 ring-1 ring-blue-500/30',
  },
  {
    id: 'pov',
    label: 'POV Driving',
    icon: Clapperboard,
    badgeColor: 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10',
    activeColor: 'bg-emerald-600/20 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/30',
  },
]

export const CAMERA_MOTION_PRESETS = [
  { label: 'Dolly In', value: 'Slow cinematic dolly-in towards subject' },
  { label: 'Pan Right', value: 'Gritty handheld pan right across the scene' },
  { label: 'Static Gritty', value: 'Static 35mm gritty cinematic frame with subtle grain' },
  { label: 'Tracking Follow', value: 'Smooth tracking follow shot alongside vehicle' },
]

const ASPECT_RATIOS = [
  { id: '9:16', label: '9:16 (Reel / TikTok)', desc: 'Vertical Video' },
  { id: '16:9', label: '16:9 (Cinema / YouTube)', desc: 'Landscape Video' },
  { id: '1:1', label: '1:1 (Square Feed)', desc: 'Square Post' },
]

export function formatTime(seconds: number): string {
  const safeSeconds = Math.max(0, Math.round(seconds))
  const mins = Math.floor(safeSeconds / 60)
  const secs = Math.floor(safeSeconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function StoryboardDirector({
  track,
  snippet,
  onJobCreated,
  onCancel,
}: StoryboardDirectorProps) {
  const initialDuration = Math.round(
    snippet?.duration || track.durationSeconds || 30
  )

  const [scenes, setScenes] = useState<StoryboardScene[]>([])
  const [caption, setCaption] = useState<string>('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [aspectRatio, setAspectRatio] = useState<string>('9:16')

  const [suggestLoading, setSuggestLoading] = useState<boolean>(true)
  const [createLoading, setCreateLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const totalDuration = scenes.length > 0
    ? scenes.reduce((sum, s) => sum + s.duration, 0)
    : initialDuration

  const fetchSceneSuggestions = useCallback(async () => {
    setSuggestLoading(true)
    setError(null)
    try {
      const token = await getAuth().currentUser?.getIdToken()
      const payload = {
        trackTitle: track.name,
        snippetDuration: initialDuration,
        highlightLyric: snippet?.highlightLyric,
        mood: 'Dark Western, Gritty, Confident',
        targetPlatform: 'instagram',
      }

      const res = await fetch('/api/studio/storyboard/suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || 'Kon scène suggesties niet ophalen')
      }

      const data = (await res.json()) as {
        scenes: StoryboardScene[]
        caption: string
        hashtags: string[]
      }

      setScenes(data.scenes || [])
      setCaption(data.caption || '')
      setHashtags(data.hashtags || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fout bij het ophalen van AI suggesties')
    } finally {
      setSuggestLoading(false)
    }
  }, [track.name, initialDuration, snippet?.highlightLyric])

  useEffect(() => {
    fetchSceneSuggestions()
  }, [fetchSceneSuggestions])

  const updateScene = (index: number, updates: Partial<StoryboardScene>) => {
    setScenes((prev) =>
      prev.map((s, idx) => (idx === index ? { ...s, ...updates } : s))
    )
  }

  const handleLaunchStoryboard = async () => {
    if (scenes.length === 0) {
      setError('Geen scènes beschikbaar om te genereren.')
      return
    }

    for (let i = 0; i < scenes.length; i++) {
      if (!scenes[i].prompt.trim()) {
        setError(`Scène ${i + 1} heeft een lege prompt. Vul alle scène prompts in.`)
        return
      }
    }

    const audioUrl =
      snippet?.publicUrl ||
      snippet?.storageUrl ||
      track.publicUrl ||
      track.storageUrl

    if (!audioUrl) {
      setError('Geen geldige audio bron gevonden voor deze track.')
      return
    }

    setCreateLoading(true)
    setError(null)

    try {
      const token = await getAuth().currentUser?.getIdToken()
      const finalCaption = caption.trim()
        ? hashtags.length > 0
          ? `${caption.trim()}\n\n${hashtags.join(' ')}`
          : caption.trim()
        : undefined

      const payload = {
        sunoTrackId: track.id,
        snippetId: snippet?.id,
        totalDuration,
        aspectRatio,
        audioUrl,
        scenes: scenes.map((s, idx) => ({
          index: s.index ?? idx,
          duration: s.duration,
          shotType: s.shotType,
          prompt: s.prompt.trim(),
          cameraMotion: s.cameraMotion?.trim(),
        })),
        captionSuggestion: finalCaption,
      }

      const res = await fetch('/api/studio/storyboard/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || 'Multi-scene job creatie mislukt.')
      }

      const data = (await res.json()) as { storyboardJobId: string }
      if (data.storyboardJobId) {
        onJobCreated(data.storyboardJobId)
      } else {
        throw new Error('Geen storyboard job ID ontvangen.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Multi-scene job creatie mislukt.')
    } finally {
      setCreateLoading(false)
    }
  }

  // Calculate time intervals
  const sceneIntervals = scenes.map((scene, i) => {
    let start = 0
    for (let j = 0; j < i; j++) {
      start += scenes[j].duration
    }
    const end = start + scene.duration
    return {
      start,
      end,
      formatted: `${formatTime(start)} - ${formatTime(end)}`,
    }
  })

  return (
    <div className="bg-stone-950 border border-stone-800 rounded-2xl p-5 md:p-6 space-y-6 shadow-2xl animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-100 flex items-center gap-2">
                Visual Storyboard Director
                <span className="text-xs font-normal text-amber-400/90 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  Kie Seedance 2.5 Multi-Cut
                </span>
              </h2>
              <p className="text-xs text-stone-400 flex items-center gap-1.5 mt-0.5">
                <span className="text-stone-300 font-medium">{track.name}</span>
                {snippet?.name && (
                  <>
                    <span className="text-stone-600">•</span>
                    <span className="text-amber-400/80 italic">&quot;{snippet.name}&quot;</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Header Stats & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-700/80 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>{totalDuration}s Duur</span>
          </div>

          <div className="flex items-center gap-1.5 bg-stone-900 border border-stone-700/80 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-stone-300">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>{scenes.length} Scènes</span>
          </div>

          <button
            type="button"
            onClick={fetchSceneSuggestions}
            disabled={suggestLoading}
            className="flex items-center gap-1.5 text-xs font-medium text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {suggestLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            )}
            <span>Scènes Opnieuw Bedenken</span>
          </button>

          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-stone-400 hover:text-stone-200 hover:bg-stone-800/80 rounded-lg transition-colors"
            title="Sluiten"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-950/40 border border-red-500/40 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-300 animate-fadeIn">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-200">Storyboard Fout</p>
            <p className="text-red-300/90">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-red-400 hover:text-red-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {suggestLoading && scenes.length === 0 && (
        <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-full animate-pulse">
            <Sparkles className="w-6 h-6 text-amber-400 animate-spin" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-stone-200">
              Gemini AI Scene Director regisseert scènes...
            </p>
            <p className="text-xs text-stone-400">
              Automatische uitsplitsing in Wide, Medium en Close-up shots voor {initialDuration}s audio.
            </p>
          </div>
        </div>
      )}

      {/* Proportional Visual Timeline Bar */}
      {scenes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-400 font-medium">
            <span className="flex items-center gap-1.5">
              <MoveHorizontal className="w-3.5 h-3.5 text-amber-400" />
              Proportionele Tijdlijn ({totalDuration}s Totaal)
            </span>
            <span className="text-[11px] text-stone-500">
              Klik op een shot hieronder om aan te passen
            </span>
          </div>

          <div className="w-full bg-stone-900 border border-stone-800 rounded-xl p-1 flex gap-1 h-12">
            {scenes.map((scene, idx) => {
              const widthPct = (scene.duration / totalDuration) * 100
              const shotOption =
                SHOT_TYPE_OPTIONS.find((o) => o.id === scene.shotType) ||
                SHOT_TYPE_OPTIONS[0]
              const interval = sceneIntervals[idx]

              return (
                <div
                  key={`timeline-${idx}`}
                  style={{ width: `${widthPct}%` }}
                  className={`relative rounded-lg p-1.5 flex flex-col justify-between border transition-all hover:brightness-110 cursor-pointer overflow-hidden ${shotOption.badgeColor}`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold leading-none">
                    <span>Scène {idx + 1}</span>
                    <span>{scene.duration}s</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-medium opacity-90 truncate leading-none">
                    <span className="truncate">{shotOption.label}</span>
                    <span className="text-[8px] opacity-75">{interval?.formatted}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Scene Cards List */}
      {scenes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5" />
              Scène Kaarten &amp; Shot Regie
            </h3>
            <span className="text-xs text-stone-400">
              {scenes.length} film takes geselecteerd
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {scenes.map((scene, idx) => {
              const interval = sceneIntervals[idx]
              return (
                <div
                  key={`scene-card-${idx}`}
                  className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 space-y-3.5 hover:border-stone-700 transition-colors"
                >
                  {/* Card Top Row */}
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-stone-800/80">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-stone-200">
                        Scène {idx + 1}
                      </span>
                      <span className="text-[11px] text-stone-400 bg-stone-800/80 px-2 py-0.5 rounded border border-stone-700">
                        {interval?.formatted}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-stone-300 bg-stone-950 px-2 py-0.5 rounded border border-stone-800">
                        {scene.duration}s Take
                      </span>
                    </div>
                  </div>

                  {/* Shot Type Selector Pills */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      Camerastandpunt (Shot Type)
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {SHOT_TYPE_OPTIONS.map((opt) => {
                        const Icon = opt.icon
                        const isSelected = scene.shotType === opt.id
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateScene(idx, { shotType: opt.id })}
                            className={`flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                              isSelected
                                ? opt.activeColor
                                : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700'
                            }`}
                          >
                            <Icon className="w-3 h-3" />
                            <span className="truncate">{opt.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Camera Motion Selector Pills */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider flex items-center gap-1">
                      <Compass className="w-3 h-3 text-amber-400" />
                      Camera Beweging
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {CAMERA_MOTION_PRESETS.map((m) => {
                        const isSelected = scene.cameraMotion === m.value
                        return (
                          <button
                            key={m.label}
                            type="button"
                            onClick={() => updateScene(idx, { cameraMotion: m.value })}
                            className={`text-[11px] font-medium px-2.5 py-1 rounded-md border transition-all ${
                              isSelected
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:text-stone-300 hover:border-stone-700'
                            }`}
                          >
                            {m.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Scene Prompt Textarea */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      Cinematic 35mm Prompt
                    </label>
                    <textarea
                      value={scene.prompt}
                      onChange={(e) => updateScene(idx, { prompt: e.target.value })}
                      rows={3}
                      placeholder={`Cinematic prompt voor scène ${idx + 1}...`}
                      className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 resize-none font-mono leading-relaxed"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Aspect Ratio & Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            Aspect Ratio Formaat
          </label>
          <div className="grid grid-cols-3 gap-2">
            {ASPECT_RATIOS.map((ar) => (
              <button
                key={ar.id}
                type="button"
                onClick={() => setAspectRatio(ar.id)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                  aspectRatio === ar.id
                    ? 'bg-amber-500/10 border-amber-500/60 text-amber-300 ring-1 ring-amber-500/30'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <span className="text-xs font-bold">{ar.id}</span>
                <span className="text-[10px] text-stone-500 truncate">{ar.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Jack Core Set Visual Continuity Reminder */}
        <div className="bg-stone-900/60 border border-stone-800/80 rounded-xl p-3.5 space-y-2">
          <JackCoreSetPreview />
        </div>
      </div>

      {/* Jack's Tone of Voice Caption & Hashtags */}
      <div className="bg-stone-900/80 border border-amber-500/30 rounded-xl p-4 space-y-3 animate-fadeIn">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-stone-200">
              Jack Howlin&apos; Voice Caption &amp; Hashtags
            </span>
          </div>
          <span className="text-[10px] text-amber-400/90 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
            Persona: Max 2 zinnen, geen &apos;!&apos;
          </span>
        </div>

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          placeholder="Jack Howlin' caption..."
          className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60 resize-none"
        />

        {hashtags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {hashtags.map((ht, idx) => (
              <span
                key={`ht-${idx}`}
                className="text-[11px] font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md"
              >
                {ht}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Launch & Cancel Actions */}
      <div className="flex items-center justify-between gap-3 pt-4 border-t border-stone-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={createLoading}
          className="px-4 py-2.5 rounded-xl border border-stone-700 bg-stone-900 text-stone-300 hover:text-stone-100 hover:border-stone-600 text-xs font-semibold tracking-wider uppercase transition-all disabled:opacity-50"
        >
          Annuleren
        </button>

        <button
          type="button"
          onClick={handleLaunchStoryboard}
          disabled={createLoading || suggestLoading || scenes.length === 0}
          className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-500 text-stone-950 font-bold text-xs tracking-wider uppercase shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
        >
          {createLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
              <span>Multi-Scene Generatie Starten...</span>
            </>
          ) : (
            <>
              <Clapperboard className="w-4 h-4 text-stone-950" />
              <span>🎬 Start Multi-Scene Generatie</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
