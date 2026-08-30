'use client'
import { useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Clapperboard, AlertCircle, X } from 'lucide-react'
import GenerationForm, { GenerationMode } from '@/components/studio/GenerationForm'
import GenerationStatus from '@/components/studio/GenerationStatus'
import StoryboardProgress from '@/components/studio/StoryboardProgress'
import MediaLibrary from '@/components/studio/MediaLibrary'

function StudioPageContent() {
  const searchParams = useSearchParams()
  const trackTitle = searchParams.get('trackTitle') || searchParams.get('songTitle') || searchParams.get('trackName') || undefined
  const promptSuggestion = searchParams.get('promptSuggestion') || searchParams.get('prompt') || undefined
  const trackId = searchParams.get('trackId') || undefined
  const modeParam = searchParams.get('mode') as GenerationMode | null
  const storyboardJobIdParam = searchParams.get('storyboardJobId') || null

  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [activeStoryboardJobId, setActiveStoryboardJobId] = useState<string | null>(storyboardJobIdParam)
  const [newResultUrls, setNewResultUrls] = useState<string[]>([])
  const [generationError, setGenerationError] = useState<string | null>(null)

  const handleJobCreated = useCallback((jobId: string) => {
    setActiveJobId(jobId)
    setNewResultUrls([])
    setGenerationError(null)
  }, [])

  const handleComplete = useCallback((resultUrls: string[]) => {
    setActiveJobId(null)
    setNewResultUrls(resultUrls)
  }, [])

  const handleError = useCallback((message: string) => {
    setActiveJobId(null)
    setActiveStoryboardJobId(null)
    setGenerationError(message)
  }, [])

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
          <Clapperboard className="w-4 h-4 text-amber-500" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-stone-100 tracking-tight">AI Content Studio</h1>
          <p className="text-xs text-stone-500 mt-0.5">Genereer on-brand foto&apos;s en video&apos;s met Jack&apos;s visuele DNA</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="p-6 bg-stone-900/40 border border-stone-800/60 rounded-xl space-y-4">
          <h2 className="text-sm font-bold text-stone-300 tracking-wider uppercase">Nieuwe generatie</h2>
          <GenerationForm
            onJobCreated={handleJobCreated}
            initialTrackTitle={trackTitle}
            initialPrompt={promptSuggestion}
            initialTrackId={trackId}
            initialMode={modeParam || undefined}
          />

          {activeJobId && (
            <GenerationStatus
              jobId={activeJobId}
              onComplete={handleComplete}
              onError={handleError}
            />
          )}

          {activeStoryboardJobId && (
            <StoryboardProgress
              jobId={activeStoryboardJobId}
              onComplete={(url) => {
                setActiveStoryboardJobId(null)
                setNewResultUrls([url])
              }}
              onError={handleError}
              onCancel={() => setActiveStoryboardJobId(null)}
            />
          )}

          {generationError && (
            <div className="flex items-start gap-3 p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-red-300">Generatie mislukt</p>
                <p className="text-xs text-red-400 mt-0.5">{generationError}</p>
              </div>
              <button
                onClick={() => setGenerationError(null)}
                className="text-red-500 hover:text-red-300 transition-colors"
                aria-label="Foutmelding sluiten"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-bold text-stone-300 tracking-wider uppercase">Media Library</h2>
          <MediaLibrary highlightUrls={newResultUrls} />
        </div>
      </div>
    </div>
  )
}

export default function StudioPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-8 animate-pulse">
          <div className="h-14 bg-stone-900 border border-stone-800 rounded-xl" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-stone-900 border border-stone-800 rounded-xl" />
            <div className="h-96 bg-stone-900 border border-stone-800 rounded-xl" />
          </div>
        </div>
      }
    >
      <StudioPageContent />
    </Suspense>
  )
}

