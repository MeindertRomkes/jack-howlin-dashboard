'use client'
import { useState, useCallback } from 'react'
import { Clapperboard, AlertCircle, X } from 'lucide-react'
import GenerationForm from '@/components/studio/GenerationForm'
import GenerationStatus from '@/components/studio/GenerationStatus'
import MediaLibrary from '@/components/studio/MediaLibrary'

export default function StudioPage() {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
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
          <GenerationForm onJobCreated={handleJobCreated} />

          {activeJobId && (
            <GenerationStatus
              jobId={activeJobId}
              onComplete={handleComplete}
              onError={handleError}
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
