'use client'

import { useState, useEffect } from 'react'
import { getAuth } from 'firebase/auth'
import { Sparkles, Camera, Video, Disc3, Loader2, Music, Scissors, Zap, Film, Clapperboard } from 'lucide-react'
import JackCoreSetPreview from './JackCoreSetPreview'
import SunoTrackSelector from './SunoTrackSelector'
import AudioSnipper, { getSceneRecommendation } from './AudioSnipper'
import StoryboardDirector from './StoryboardDirector'
import type { SunoTrack, AudioSnippet, StudioEngine } from '@/types'

const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '4:3', '3:4']

export type GenerationMode = 'photo' | 'video' | 'audiogram'

interface Props {
  onJobCreated: (jobId: string, taskId: string) => void
  onStoryboardJobCreated?: (jobId: string) => void
  linkedPostId?: string
  initialPrompt?: string
  initialTrackTitle?: string
  initialTrackId?: string
  initialMode?: GenerationMode
}

export default function GenerationForm({
  onJobCreated,
  onStoryboardJobCreated,
  linkedPostId,
  initialPrompt = '',
  initialTrackTitle = '',
  initialTrackId = '',
  initialMode,
}: Props) {
  const [engine, setEngine] = useState<StudioEngine>('higgsfield')
  const [mode, setMode] = useState<GenerationMode>(
    initialMode || (initialTrackTitle || initialTrackId ? 'video' : 'photo')
  )
  const [prompt, setPrompt] = useState(initialPrompt)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [quality, setQuality] = useState<'basic' | 'high'>('high')
  const [resolution, setResolution] = useState<'480p' | '720p' | '1080p'>('1080p')
  const [duration, setDuration] = useState(5)
  const [sunoTrackId, setSunoTrackId] = useState(initialTrackId)
  const [selectedTrack, setSelectedTrack] = useState<SunoTrack | null>(null)
  const [selectedSnippetId, setSelectedSnippetId] = useState('')
  const [selectedSnippet, setSelectedSnippet] = useState<AudioSnippet | null>(null)
  const [snippingTrack, setSnippingTrack] = useState<SunoTrack | null>(null)
  const [showStoryboardDirector, setShowStoryboardDirector] = useState(false)

  // React to initial prop updates (e.g. navigation / query param changes)
  useEffect(() => {
    if (initialPrompt && !prompt) {
      setPrompt(initialPrompt)
    }
  }, [initialPrompt, prompt])

  useEffect(() => {
    if (initialTrackId && !sunoTrackId) {
      setSunoTrackId(initialTrackId)
    }
  }, [initialTrackId, sunoTrackId])

  useEffect(() => {
    if (initialMode && initialMode !== mode) {
      setMode(initialMode)
    }
  }, [initialMode, mode])

  // AI Assistant states
  const [generatedCaption, setGeneratedCaption] = useState<string | null>(null)
  const [generatedHashtags, setGeneratedHashtags] = useState<string[]>([])
  const [aiLoading, setAiLoading] = useState(false)

  // Submission states
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleModeChange = (newMode: GenerationMode) => {
    setMode(newMode)
    if (newMode === 'audiogram') {
      setAspectRatio('9:16')
      if (duration < 3) setDuration(10)
    } else if (newMode === 'video') {
      if (duration < 5) setDuration(5)
    }
  }

  const handleTrackChange = (trackId: string) => {
    setSunoTrackId(trackId)
    if (!trackId) {
      setSelectedSnippetId('')
      setSelectedSnippet(null)
      setSelectedTrack(null)
    }
  }

  const handleSnippetChange = (snippet: AudioSnippet | null) => {
    if (snippet) {
      setSelectedSnippetId(snippet.id)
      setSelectedSnippet(snippet)
      setDuration(Math.min(120, Math.max(3, Math.round(snippet.duration))))
    } else {
      setSelectedSnippetId('')
      setSelectedSnippet(null)
    }
  }

  const handleOpenSnipper = (track: SunoTrack) => {
    setSnippingTrack(track)
  }

  const handleSnippetSaved = (newSnippet: AudioSnippet) => {
    setSelectedSnippetId(newSnippet.id)
    setSelectedSnippet(newSnippet)
    setDuration(Math.min(120, Math.max(3, Math.round(newSnippet.duration))))
    setSnippingTrack(null)
  }

  // Gemini AI Prompt & Caption Generator
  async function handleGenerateAIPrompt() {
    setAiLoading(true)
    setError(null)
    try {
      let token = ''
      try {
        token = (await getAuth().currentUser?.getIdToken()) || ''
      } catch (authErr) {
        console.warn('Could not retrieve auth token:', authErr)
      }

      const res = await fetch('/api/studio/prompt-generator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          snippetName: selectedSnippet?.name || undefined,
          highlightLyric: selectedSnippet?.highlightLyric || undefined,
          videoType: mode === 'audiogram' ? 'audiogram' : mode === 'video' ? 'cinematic' : 'photo',
          targetPlatform: 'instagram',
          sceneIdea: prompt.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Kon geen AI suggestie genereren')
      }

      const data = (await res.json()) as {
        prompt: string
        caption: string
        hashtags: string[]
      }

      if (data.prompt) {
        setPrompt(data.prompt)
      }
      if (data.caption) {
        setGeneratedCaption(data.caption)
      }
      if (Array.isArray(data.hashtags)) {
        setGeneratedHashtags(data.hashtags)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'AI prompt generatie mislukt')
    } finally {
      setAiLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) {
      setError('Voer een prompt in')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const token = await getAuth().currentUser?.getIdToken()
      const finalCaption = generatedCaption
        ? (generatedHashtags.length > 0
            ? `${generatedCaption}\n\n${generatedHashtags.join(' ')}`
            : generatedCaption)
        : undefined

      const payload = {
        engine,
        mode: mode === 'audiogram' ? 'video' : mode,
        videoType: mode === 'audiogram' ? 'audiogram' : mode === 'video' ? 'cinematic' : undefined,
        prompt,
        aspectRatio,
        quality: mode === 'photo' ? quality : undefined,
        resolution: mode !== 'photo' ? resolution : undefined,
        duration: mode !== 'photo' ? duration : undefined,
        sunoTrackId: sunoTrackId || undefined,
        snippetId: selectedSnippetId || undefined,
        captionSuggestion: finalCaption,
        linkedPostId,
      }

      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const j = (await res.json()) as { error: string }
        throw new Error(j.error || 'Generatie mislukt')
      }

      const { jobId, taskId } = (await res.json()) as { jobId: string; taskId: string }
      onJobCreated(jobId, taskId)
      setPrompt('')
      setGeneratedCaption(null)
      setGeneratedHashtags([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generatie mislukt')
    } finally {
      setLoading(false)
    }
  }

  const sceneRec = getSceneRecommendation(selectedSnippet?.duration || duration)
  const sceneCount = sceneRec.sceneCount

  if (showStoryboardDirector) {
    const activeTrack: SunoTrack = selectedTrack || {
      id: sunoTrackId || 'custom_track',
      name: initialTrackTitle || 'Jack Howlin Track',
      storageUrl: '',
      publicUrl: selectedSnippet?.publicUrl || '',
      durationSeconds: selectedSnippet?.duration || duration || 30,
      releaseType: 'single',
      releaseStatus: 'released',
      createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 } as unknown as SunoTrack['createdAt'],
      snippets: selectedSnippet ? [selectedSnippet] : [],
    }

    return (
      <div className="space-y-4">
        <StoryboardDirector
          track={activeTrack}
          snippet={selectedSnippet}
          onJobCreated={(jobId) => {
            setShowStoryboardDirector(false)
            onStoryboardJobCreated?.(jobId)
          }}
          onCancel={() => setShowStoryboardDirector(false)}
        />
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* AI Engine Switcher */}
      <div className="flex items-center justify-between p-2 bg-stone-900/80 border border-stone-800 rounded-lg text-xs">
        <span className="text-stone-400 font-medium flex items-center gap-1.5 pl-1">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          AI Engine:
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setEngine('higgsfield')}
            className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-all ${
              engine === 'higgsfield'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Higgsfield AI (Soul & Veo)
          </button>
          <button
            type="button"
            onClick={() => setEngine('kie')}
            className={`px-2.5 py-1 rounded font-semibold text-[11px] transition-all ${
              engine === 'kie'
                ? 'bg-amber-500 text-stone-950 shadow-sm font-bold'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Kie.ai (Seedream)
          </button>
        </div>
      </div>

      {/* 3 Generation Modes */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'photo', label: 'Foto', icon: Camera },
          { id: 'video', label: 'AI Video', icon: Video },
          { id: 'audiogram', label: 'Audiogram Reel', icon: Disc3 },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleModeChange(id as GenerationMode)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${
              mode === id
                ? 'bg-amber-600/20 border border-amber-500/50 text-amber-400 shadow-sm ring-1 ring-amber-500/30'
                : 'bg-stone-900 border border-stone-700 text-stone-400 hover:border-stone-600'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Prominent Multi-Scene Storyboard Director Action Button */}
      {(mode === 'video' || (selectedSnippet && selectedSnippet.duration > 15) || duration > 15) && (
        <div className="p-3.5 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-amber-950/40 border border-amber-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/5 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 flex-shrink-0">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <span>Multi-Scene Visual Storyboard</span>
                <span className="text-[10px] font-semibold bg-amber-500/20 border border-amber-500/40 text-amber-300 px-1.5 py-0.5 rounded-full">
                  {sceneCount} Scènes
                </span>
              </p>
              <p className="text-[11px] text-stone-400">
                Regisseer meerdere 35mm film takes met automatische video stitching en audio sync.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowStoryboardDirector(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs tracking-wider uppercase shadow-md shadow-amber-500/20 active:scale-95 transition-all flex-shrink-0"
          >
            <Film className="w-3.5 h-3.5 text-stone-950" />
            <span>Open Multi-Scene Storyboard Director ({sceneCount} Scènes)</span>
          </button>
        </div>
      )}

      {/* Audiogram Info Box */}
      {mode === 'audiogram' && (
        <div className="bg-amber-950/20 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-300/90 flex items-start gap-2.5">
          <Music className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-amber-300">Audiogram Reel Modus (9:16)</p>
            <p className="text-stone-300 text-[11px]">
              Combineert een filmische Jack Howlin&apos; visual met een dynamische audiogolf en geselecteerde snippet voor Instagram Reels, TikTok en YouTube Shorts.
            </p>
          </div>
        </div>
      )}

      {/* Prompt Label with Gemini Magic Button */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-xs text-stone-400 font-medium">Prompt</label>
          <button
            type="button"
            onClick={handleGenerateAIPrompt}
            disabled={aiLoading}
            className="flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded transition-all active:scale-95 disabled:opacity-50"
            title="Genereer automatisch een filmische prompt en Jack-stijl caption"
          >
            {aiLoading ? (
              <Loader2 className="w-3 h-3 animate-spin text-amber-400" />
            ) : (
              <Sparkles className="w-3 h-3 text-amber-400" />
            )}
            <span>{aiLoading ? 'Bedenken...' : '⚡ AI Prompt & Caption Bedenken'}</span>
          </button>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          placeholder={
            mode === 'photo'
              ? 'Jack staand op een verlaten Nevada highway bij zonsondergang, 35mm film still...'
              : mode === 'audiogram'
              ? 'Cinematic moody 35mm film portrait van Jack Howlin onder warm amber neon licht...'
              : 'Jack rijdt in een vintage pickup over een desert highway bij zonsondergang...'
          }
          className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60 resize-none"
        />
      </div>

      {/* AI Generated Caption Preview Box */}
      {generatedCaption && (
        <div className="bg-stone-900/90 border border-amber-500/30 rounded-xl p-3.5 space-y-2 text-xs animate-fadeIn">
          <div className="flex items-center justify-between text-amber-400 font-medium">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Jack&apos;s AI Caption Suggestie:
            </span>
            <button
              type="button"
              onClick={() => {
                setGeneratedCaption(null)
                setGeneratedHashtags([])
              }}
              className="text-stone-400 hover:text-stone-200 text-xs px-1"
              title="Verwijder suggestie"
            >
              ✕
            </button>
          </div>
          <p className="text-stone-200 italic">&ldquo;{generatedCaption}&rdquo;</p>
          {generatedHashtags.length > 0 && (
            <div className="flex flex-wrap gap-1 pt-0.5">
              {generatedHashtags.map((h, i) => (
                <span
                  key={i}
                  className="text-amber-400 font-mono text-[11px] bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40"
                >
                  {h}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Format & Quality Settings */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-stone-400 font-medium">Verhouding</label>
          <select
            value={aspectRatio}
            onChange={(e) => setAspectRatio(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60"
          >
            {ASPECT_RATIOS.map((r) => (
              <option key={r} value={r}>
                {r} {r === '9:16' ? '(Reels/TikTok)' : r === '16:9' ? '(Landscape)' : ''}
              </option>
            ))}
          </select>
        </div>

        {mode === 'photo' && (
          <div className="space-y-1">
            <label className="text-xs text-stone-400 font-medium">Kwaliteit</label>
            <select
              value={quality}
              onChange={(e) => setQuality(e.target.value as 'basic' | 'high')}
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60"
            >
              <option value="high">High (2K)</option>
              <option value="basic">Basic (1K)</option>
            </select>
          </div>
        )}

        {mode !== 'photo' && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-stone-400 font-medium">Resolutie</label>
              <select
                value={resolution}
                onChange={(e) => setResolution(e.target.value as '480p' | '720p' | '1080p')}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60"
              >
                <option value="1080p">1080p (Full HD)</option>
                <option value="720p">720p (HD)</option>
                <option value="480p">480p (SD)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-stone-400 font-medium flex items-center justify-between">
                <span>Duur: {duration}s</span>
                {selectedSnippet && (
                  <span className="text-[10px] text-amber-400 flex items-center gap-0.5">
                    <Scissors className="w-2.5 h-2.5" /> Snippet
                  </span>
                )}
              </label>
              <input
                type="range"
                min={mode === 'audiogram' ? 3 : 5}
                max={120}
                step={1}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>
          </>
        )}
      </div>

      {/* Suno Track & Snippet Selector (For Video & Audiogram modes) */}
      {mode !== 'photo' && (
        <SunoTrackSelector
          value={sunoTrackId}
          onChange={handleTrackChange}
          selectedSnippetId={selectedSnippetId}
          onSnippetChange={handleSnippetChange}
          onOpenSnipper={handleOpenSnipper}
          initialTrackTitle={initialTrackTitle}
          onTrackSelect={setSelectedTrack}
        />
      )}

      {/* Inline Audio Snipper Modal/Panel if open */}
      {snippingTrack && (
        <div className="pt-2 animate-fadeIn">
          <AudioSnipper
            track={snippingTrack}
            onSnippetSaved={handleSnippetSaved}
            onCancel={() => setSnippingTrack(null)}
          />
        </div>
      )}

      <JackCoreSetPreview />

      {error && <p className="text-xs text-red-400 bg-red-950/30 p-2.5 rounded border border-red-800/40">⚠️ {error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600/20 border border-amber-500/50 rounded-lg text-sm font-bold text-amber-400 hover:bg-amber-600/30 transition-colors disabled:opacity-50 tracking-wider uppercase"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        {loading
          ? 'Taak aanmaken...'
          : mode === 'photo'
          ? 'Foto Genereren'
          : mode === 'audiogram'
          ? 'Audiogram Reel Genereren'
          : 'Video Genereren'}
      </button>
    </form>
  )
}

