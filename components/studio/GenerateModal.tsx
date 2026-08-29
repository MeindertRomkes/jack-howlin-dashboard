'use client'
import { useState, useCallback } from 'react'
import { X, Clapperboard } from 'lucide-react'
import GenerationForm from './GenerationForm'
import GenerationStatus from './GenerationStatus'
import MediaLibrary from './MediaLibrary'

interface Props {
  isOpen: boolean
  postId: string
  caption: string
  onClose: () => void
  onAssetSelected: (url: string, type: 'image' | 'video') => void
}

export default function GenerateModal({ isOpen, postId, caption, onClose, onAssetSelected }: Props) {
  const [activeJobId, setActiveJobId] = useState<string | null>(null)
  const [newResultUrls, setNewResultUrls] = useState<string[]>([])

  const handleJobCreated = useCallback((jobId: string) => {
    setActiveJobId(jobId); setNewResultUrls([])
  }, [])

  const handleComplete = useCallback((resultUrls: string[]) => {
    setActiveJobId(null); setNewResultUrls(resultUrls)
  }, [])

  const handleLinkToPost = useCallback((assetId: string, url: string) => {
    void assetId
    const type: 'image' | 'video' = url.includes('.mp4') || url.includes('.mov') ? 'video' : 'image'
    onAssetSelected(url, type); onClose()
  }, [onAssetSelected, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl">
        <div className="sticky top-0 bg-stone-950 border-b border-stone-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-amber-500" />
            <span className="text-sm font-bold text-stone-200 tracking-wider uppercase">Visual Genereren</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <GenerationForm onJobCreated={handleJobCreated} linkedPostId={postId} initialPrompt={caption.slice(0, 200)} />
            {activeJobId && <GenerationStatus jobId={activeJobId} onComplete={handleComplete} />}
          </div>
          <div className="space-y-3">
            <p className="text-xs text-stone-500 font-medium uppercase tracking-wider">Klik op 🔗 om een asset aan deze post te koppelen</p>
            <MediaLibrary onLinkToPost={handleLinkToPost} highlightUrls={newResultUrls} />
          </div>
        </div>
      </div>
    </div>
  )
}
