'use client'

import { useState, useRef, useMemo, useCallback } from 'react'
import { getAuth } from 'firebase/auth'
import {
  Play,
  Pause,
  Scissors,
  RotateCcw,
  Save,
  Sparkles,
  X,
  Clock,
  Volume2,
  Loader2,
} from 'lucide-react'
import type { SunoTrack, AudioSnippet } from '@/types'

export interface AudioSnipperProps {
  track: SunoTrack
  onSnippetSaved?: (snippet: AudioSnippet) => void
  onCancel?: () => void
  initialStartTime?: number
  initialEndTime?: number
}

export const PRESET_NAMES = [
  'Chorus Drop',
  'Acoustic Intro',
  'Guitar Solo',
  'Verse Hook',
] as const

export const PRESET_DURATIONS = [5, 10, 15, 30] as const

export const MIN_SNIPPET_DURATION = 3
export const MAX_SNIPPET_DURATION = 30

/**
 * Formats a duration in seconds into `mm:ss.s` string format (e.g. 45.5 -> '0:45.5', 125.0 -> '2:05.0')
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00.0'
  const totalSecs = Math.max(0, seconds)
  const m = Math.floor(totalSecs / 60)
  const sec = Math.floor(totalSecs % 60)
  const ms = Math.floor((totalSecs % 1) * 10)
  return `${m}:${sec.toString().padStart(2, '0')}.${ms}`
}

/**
 * Clamps a number between min and max bounds
 */
export function clampTime(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

/**
 * Adjusts start time while maintaining duration constraints [3s, 30s] and bounds [0, maxDuration]
 */
export function adjustStartTimeHelper(
  currentStart: number,
  currentEnd: number,
  delta: number,
  maxDuration: number = 600
): { startTime: number; endTime: number } {
  let newStart = Math.round((currentStart + delta) * 10) / 10
  newStart = Math.max(0, Math.min(newStart, maxDuration - MIN_SNIPPET_DURATION))

  // Ensure minimum duration (start must be <= end - 3)
  if (newStart > currentEnd - MIN_SNIPPET_DURATION) {
    newStart = Math.round((currentEnd - MIN_SNIPPET_DURATION) * 10) / 10
  }

  // Ensure maximum duration (end - start <= 30)
  if (currentEnd - newStart > MAX_SNIPPET_DURATION) {
    newStart = Math.round((currentEnd - MAX_SNIPPET_DURATION) * 10) / 10
  }

  newStart = Math.max(0, newStart)
  return { startTime: newStart, endTime: currentEnd }
}

/**
 * Adjusts end time while maintaining duration constraints [3s, 30s] and bounds [0, maxDuration]
 */
export function adjustEndTimeHelper(
  currentStart: number,
  currentEnd: number,
  delta: number,
  maxDuration: number = 600
): { startTime: number; endTime: number } {
  let newEnd = Math.round((currentEnd + delta) * 10) / 10
  newEnd = Math.min(maxDuration, Math.max(MIN_SNIPPET_DURATION, newEnd))

  // Ensure minimum duration (end must be >= start + 3)
  if (newEnd < currentStart + MIN_SNIPPET_DURATION) {
    newEnd = Math.round((currentStart + MIN_SNIPPET_DURATION) * 10) / 10
  }

  // Ensure maximum duration (end - start <= 30)
  if (newEnd - currentStart > MAX_SNIPPET_DURATION) {
    newEnd = Math.round((currentStart + MAX_SNIPPET_DURATION) * 10) / 10
  }

  newEnd = Math.min(maxDuration, newEnd)
  return { startTime: currentStart, endTime: newEnd }
}

/**
 * Calculates new start and end times when a preset duration is selected
 */
export function applyPresetDuration(
  currentStart: number,
  targetDuration: number,
  maxDuration: number = 600
): { startTime: number; endTime: number } {
  const duration = Math.min(MAX_SNIPPET_DURATION, Math.max(MIN_SNIPPET_DURATION, targetDuration))
  let start = currentStart
  let end = Math.round((start + duration) * 10) / 10

  if (end > maxDuration) {
    end = maxDuration
    start = Math.max(0, Math.round((end - duration) * 10) / 10)
  }

  return { startTime: start, endTime: end }
}

export default function AudioSnipper({
  track,
  onSnippetSaved,
  onCancel,
  initialStartTime = 0,
  initialEndTime = 10,
}: AudioSnipperProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Track duration state
  const [totalDuration, setTotalDuration] = useState<number>(() => {
    return track.durationSeconds && track.durationSeconds > 0 ? track.durationSeconds : 180
  })

  // Snippet interval state
  const [startTime, setStartTime] = useState<number>(() => {
    const s = Math.max(0, initialStartTime)
    return Math.round(s * 10) / 10
  })

  const [endTime, setEndTime] = useState<number>(() => {
    const e = initialEndTime !== undefined && initialEndTime > initialStartTime
      ? initialEndTime
      : Math.min(totalDuration, initialStartTime + 10)
    return Math.round(e * 10) / 10
  })

  // Playback state
  const [currentTime, setCurrentTime] = useState<number>(startTime)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [isLooping, setIsLooping] = useState<boolean>(true)

  // Metadata form state
  const [name, setName] = useState<string>('')
  const [highlightLyric, setHighlightLyric] = useState<string>('')

  // Action status
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const duration = useMemo(() => {
    return Math.round((endTime - startTime) * 10) / 10
  }, [startTime, endTime])

  // Handle audio metadata load
  const handleLoadedMetadata = () => {
    if (audioRef.current && audioRef.current.duration && !isNaN(audioRef.current.duration)) {
      const audioDuration = Math.round(audioRef.current.duration * 10) / 10
      setTotalDuration(audioDuration)
      if (endTime > audioDuration) {
        setEndTime(audioDuration)
      }
    }
  }

  // Handle time update during playback
  const handleTimeUpdate = () => {
    if (!audioRef.current) return
    const cur = audioRef.current.currentTime
    setCurrentTime(cur)

    // Check boundary for snippet playback
    if (cur >= endTime) {
      if (isLooping) {
        audioRef.current.currentTime = startTime
        audioRef.current.play().catch(() => {})
      } else {
        audioRef.current.pause()
        setIsPlaying(false)
        audioRef.current.currentTime = startTime
        setCurrentTime(startTime)
      }
    } else if (cur < startTime) {
      audioRef.current.currentTime = startTime
      setCurrentTime(startTime)
    }
  }

  const handleEnded = () => {
    if (isLooping && audioRef.current) {
      audioRef.current.currentTime = startTime
      audioRef.current.play().catch(() => {})
    } else {
      setIsPlaying(false)
      setCurrentTime(startTime)
    }
  }

  // Play / Pause snippet toggle
  const togglePlaySnippet = useCallback(() => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
    } else {
      if (currentTime < startTime || currentTime >= endTime) {
        audioRef.current.currentTime = startTime
        setCurrentTime(startTime)
      }
      audioRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => {
          console.error('Audio playback error:', err)
          setIsPlaying(false)
        })
    }
  }, [isPlaying, currentTime, startTime, endTime])

  // Restart snippet from start
  const handleRestartSnippet = useCallback(() => {
    if (!audioRef.current) return
    audioRef.current.currentTime = startTime
    setCurrentTime(startTime)
    audioRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => {})
  }, [startTime])

  // Handle clicking on waveform scrubber
  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickX = e.clientX - rect.left
    const percentage = Math.max(0, Math.min(1, clickX / rect.width))
    const targetTime = Math.round(percentage * totalDuration * 10) / 10

    if (audioRef.current) {
      audioRef.current.currentTime = targetTime
    }
    setCurrentTime(targetTime)
  }

  // Fine-tuning actions
  const adjustStart = (delta: number) => {
    const res = adjustStartTimeHelper(startTime, endTime, delta, totalDuration)
    setStartTime(res.startTime)
    setEndTime(res.endTime)
    if (currentTime < res.startTime) {
      setCurrentTime(res.startTime)
      if (audioRef.current) audioRef.current.currentTime = res.startTime
    }
  }

  const adjustEnd = (delta: number) => {
    const res = adjustEndTimeHelper(startTime, endTime, delta, totalDuration)
    setStartTime(res.startTime)
    setEndTime(res.endTime)
    if (currentTime > res.endTime) {
      setCurrentTime(res.startTime)
      if (audioRef.current) audioRef.current.currentTime = res.startTime
    }
  }

  const setPresetDurationAction = (presetDuration: number) => {
    const res = applyPresetDuration(startTime, presetDuration, totalDuration)
    setStartTime(res.startTime)
    setEndTime(res.endTime)
  }

  // Save snippet handler
  const handleSave = async () => {
    setError(null)
    setSuccessMsg(null)

    if (!name.trim()) {
      setError('Geef de snippet een naam (bijv. "Chorus Drop")')
      return
    }

    if (duration < MIN_SNIPPET_DURATION || duration > MAX_SNIPPET_DURATION) {
      setError(`Snippet duur moet tussen ${MIN_SNIPPET_DURATION}s en ${MAX_SNIPPET_DURATION}s zijn`)
      return
    }

    setIsSaving(true)

    try {
      let token = ''
      try {
        const auth = getAuth()
        token = (await auth.currentUser?.getIdToken()) || ''
      } catch (authErr) {
        console.warn('Could not get auth token from getAuth():', authErr)
      }

      const res = await fetch('/api/studio/snippets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'add',
          trackId: track.id,
          snippet: {
            name: name.trim(),
            startTime,
            endTime,
            highlightLyric: highlightLyric.trim() || undefined,
          },
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server fout: ${res.statusText}`)
      }

      const data = (await res.json()) as { success: boolean; snippetId: string }
      const newSnippet: AudioSnippet = {
        id: data.snippetId || `snip_${Date.now()}`,
        name: name.trim(),
        startTime,
        endTime,
        duration,
        highlightLyric: highlightLyric.trim() || undefined,
        publicUrl: track.publicUrl,
        createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as unknown as AudioSnippet['createdAt'],
      }

      setSuccessMsg(`Snippet "${name}" succesvol opgeslagen!`)
      if (onSnippetSaved) {
        onSnippetSaved(newSnippet)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Opslaan van snippet is mislukt')
    } finally {
      setIsSaving(false)
    }
  }

  // Waveform visualization bars
  const waveformBars = useMemo(() => {
    // Generate deterministic soundwave heights
    return Array.from({ length: 48 }, (_, i) => {
      const sinVal = Math.sin((i * 13) % 29)
      const cosVal = Math.cos((i * 7) % 17)
      const height = Math.floor(25 + Math.abs(sinVal * 45 + cosVal * 30))
      return Math.min(95, Math.max(15, height))
    })
  }, [])

  // Position percentages
  const startPercent = totalDuration > 0 ? (startTime / totalDuration) * 100 : 0
  const endPercent = totalDuration > 0 ? (endTime / totalDuration) * 100 : 0
  const widthPercent = Math.max(0, endPercent - startPercent)
  const playheadPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0

  return (
    <div className="bg-stone-900/95 border border-stone-800 rounded-xl p-5 shadow-2xl backdrop-blur-sm space-y-5 text-stone-200">
      {/* Audio Element */}
      <audio
        ref={audioRef}
        src={track.publicUrl}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-stone-800/80 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Scissors className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-stone-100 flex items-center gap-2">
              Audio Snippet Knippen
              <span className="text-xs font-normal px-2 py-0.5 rounded bg-stone-800 text-amber-300/90 border border-stone-700">
                {track.name}
              </span>
            </h3>
            <p className="text-xs text-stone-400">
              Selecteer het beste 3-30s hook segment voor AI video&apos;s en audiograms
            </p>
          </div>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
            title="Sluiten"
            aria-label="Sluiten"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Top Metrics Info Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-950/70 px-3.5 py-2.5 rounded-lg border border-stone-800/80 text-xs">
        <div className="flex items-center gap-2 text-stone-400">
          <Volume2 className="w-4 h-4 text-amber-500/80" />
          <span>Positie:</span>
          <span className="font-mono text-stone-200 font-medium">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-stone-400">
            <span>Interval:</span>
            <span className="font-mono text-amber-400 font-semibold bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
              {formatTime(startTime)} → {formatTime(endTime)}
            </span>
          </div>

          <div className="flex items-center gap-1 text-stone-300">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Duur:</span>
            <span className="font-mono font-bold text-amber-400">
              {duration.toFixed(1)}s
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Scrubber & Waveform */}
      <div className="space-y-2">
        <div
          onClick={handleScrubberClick}
          className="relative h-20 bg-stone-950 rounded-lg border border-stone-800/80 overflow-hidden cursor-pointer select-none group"
          title="Klik om audio positie te verplaatsen"
        >
          {/* Waveform Bars Background */}
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none opacity-40 group-hover:opacity-60 transition-opacity">
            {waveformBars.map((h, i) => (
              <div
                key={i}
                style={{ height: `${h}%` }}
                className="w-1 rounded-full bg-stone-500"
              />
            ))}
          </div>

          {/* Highlighted Snippet Interval */}
          <div
            style={{
              left: `${startPercent}%`,
              width: `${widthPercent}%`,
            }}
            className="absolute top-0 bottom-0 bg-amber-500/20 border-l-2 border-r-2 border-amber-500 transition-[left,width] duration-75 pointer-events-none"
          >
            {/* Active Waveform in Highlighted Interval */}
            <div className="absolute inset-0 flex items-center justify-between px-0.5 overflow-hidden opacity-90">
              {waveformBars.map((h, i) => {
                const barPos = (i / waveformBars.length) * 100
                const isInside = barPos >= startPercent && barPos <= endPercent
                return (
                  <div
                    key={`hi-${i}`}
                    style={{ height: `${h}%` }}
                    className={`w-1 rounded-full ${isInside ? 'bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.5)]' : 'bg-transparent'}`}
                  />
                )
              })}
            </div>

            {/* Interval Label inside Box */}
            <div className="absolute top-1 left-2 text-[10px] font-mono font-bold text-amber-300 tracking-wider uppercase bg-stone-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
              ✂️ {duration.toFixed(1)}s Snippet
            </div>
          </div>

          {/* Current Time Playhead Line */}
          <div
            style={{ left: `${playheadPercent}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.9)] z-20 pointer-events-none transition-[left] duration-75"
          >
            <div className="w-2.5 h-2.5 bg-amber-400 rounded-full -ml-1 -mt-0.5 border border-stone-950 shadow-md" />
          </div>
        </div>

        {/* Dual Range Sliders for Start & End */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-stone-400">
              <span>Start Slider</span>
              <span className="font-mono text-stone-200">{formatTime(startTime)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={Math.max(0, totalDuration - MIN_SNIPPET_DURATION)}
              step={0.1}
              value={startTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                const res = adjustStartTimeHelper(val, endTime, 0, totalDuration)
                setStartTime(res.startTime)
                setEndTime(res.endTime)
              }}
              className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              aria-label="Start time slider"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-stone-400">
              <span>End Slider</span>
              <span className="font-mono text-stone-200">{formatTime(endTime)}</span>
            </div>
            <input
              type="range"
              min={MIN_SNIPPET_DURATION}
              max={totalDuration}
              step={0.1}
              value={endTime}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                const res = adjustEndTimeHelper(startTime, val, 0, totalDuration)
                setStartTime(res.startTime)
                setEndTime(res.endTime)
              }}
              className="w-full h-1.5 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              aria-label="End time slider"
            />
          </div>
        </div>
      </div>

      {/* Playback Controls & Quick Loop Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950/60 p-3 rounded-lg border border-stone-800/80">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={togglePlaySnippet}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-xs tracking-wider uppercase transition-all shadow-md ${
              isPlaying
                ? 'bg-amber-500 text-stone-950 hover:bg-amber-400 font-bold'
                : 'bg-amber-600/20 text-amber-400 border border-amber-500/40 hover:bg-amber-600/30'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
            {isPlaying ? 'Pauzeer' : 'Speel Snippet'}
          </button>

          <button
            type="button"
            onClick={handleRestartSnippet}
            className="p-2 rounded-lg bg-stone-800/80 hover:bg-stone-700 text-stone-300 border border-stone-700 transition-colors"
            title="Herstart vanaf begin snippet"
            aria-label="Herstart snippet"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Loop toggle */}
          <button
            type="button"
            onClick={() => setIsLooping((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              isLooping
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLooping ? 'text-amber-400' : ''}`} />
            <span>Loop Playback: {isLooping ? 'AAN' : 'UIT'}</span>
          </button>
        </div>
      </div>

      {/* Fine-Tuning & Duration Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start Time Fine Tuning */}
        <div className="bg-stone-950/70 p-3.5 rounded-lg border border-stone-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-300">Startpunt Fijnregeling</span>
            <span className="font-mono text-xs font-bold text-amber-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
              {formatTime(startTime)} ({startTime.toFixed(1)}s)
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: '-1s', delta: -1 },
              { label: '-0.5s', delta: -0.5 },
              { label: '+0.5s', delta: 0.5 },
              { label: '+1s', delta: 1 },
            ].map((btn) => (
              <button
                key={`start-${btn.label}`}
                type="button"
                onClick={() => adjustStart(btn.delta)}
                className="px-2 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-mono font-medium border border-stone-700/80 active:scale-95 transition-all"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* End Time Fine Tuning */}
        <div className="bg-stone-950/70 p-3.5 rounded-lg border border-stone-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-300">Eindpunt Fijnregeling</span>
            <span className="font-mono text-xs font-bold text-amber-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
              {formatTime(endTime)} ({endTime.toFixed(1)}s)
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: '-1s', delta: -1 },
              { label: '-0.5s', delta: -0.5 },
              { label: '+0.5s', delta: 0.5 },
              { label: '+1s', delta: 1 },
            ].map((btn) => (
              <button
                key={`end-${btn.label}`}
                type="button"
                onClick={() => adjustEnd(btn.delta)}
                className="px-2 py-1.5 rounded bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-mono font-medium border border-stone-700/80 active:scale-95 transition-all"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Preset Duration Buttons */}
      <div className="flex flex-wrap items-center gap-2 bg-stone-950/50 p-3 rounded-lg border border-stone-800/60">
        <div className="flex items-center gap-1.5 text-xs text-stone-400 mr-2">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>Preset Duur:</span>
        </div>
        {PRESET_DURATIONS.map((preset) => {
          const isSelected = Math.abs(duration - preset) < 0.2
          return (
            <button
              key={`preset-dur-${preset}`}
              type="button"
              onClick={() => setPresetDurationAction(preset)}
              className={`px-3 py-1 rounded-md text-xs font-medium font-mono transition-all ${
                isSelected
                  ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                  : 'bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700'
              }`}
            >
              {preset}s {preset === 10 ? '⭐' : ''}
            </button>
          )
        })}
      </div>

      {/* Metadata: Preset Names, Custom Name, and Highlight Lyric */}
      <div className="space-y-3.5 bg-stone-950/60 p-4 rounded-lg border border-stone-800/80">
        {/* Preset Name Tags */}
        <div className="space-y-1.5">
          <label className="text-xs text-stone-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Snippet Type / Preset Tags:
          </label>
          <div className="flex flex-wrap gap-2">
            {PRESET_NAMES.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setName(tag)}
                className={`px-2.5 py-1 rounded-full text-xs transition-all ${
                  name === tag
                    ? 'bg-amber-500/20 border border-amber-500 text-amber-300 font-medium'
                    : 'bg-stone-800/80 hover:bg-stone-700 border border-stone-700/60 text-stone-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Snippet Name Input */}
        <div className="space-y-1">
          <label className="text-xs text-stone-400 font-medium">Snippet Naam *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bijv. Chorus Drop, Intro Riff, Verse Punchline..."
            className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Highlight Lyric Input */}
        <div className="space-y-1">
          <label className="text-xs text-stone-400 font-medium flex items-center justify-between">
            <span>Highlight Songtekst / Lyric Punchline (Optioneel)</span>
            <span className="text-[11px] text-stone-500">Wordt gebruikt voor audiograms &amp; captions</span>
          </label>
          <input
            type="text"
            value={highlightLyric}
            onChange={(e) => setHighlightLyric(e.target.value)}
            placeholder="Bijv. Never looked back on this dusty road..."
            className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
          ⚠️ {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-lg text-xs text-emerald-300">
          ✓ {successMsg}
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
        <div>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium border border-stone-700 transition-colors"
            >
              Annuleren
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs tracking-wider uppercase shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Opslaan...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Snippet Opslaan</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
