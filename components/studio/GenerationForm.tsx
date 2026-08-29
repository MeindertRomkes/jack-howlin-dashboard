'use client'
import { useState } from 'react'
import { getAuth } from 'firebase/auth'
import { Sparkles, Camera, Video, Loader2 } from 'lucide-react'
import JackCoreSetPreview from './JackCoreSetPreview'
import SunoTrackSelector from './SunoTrackSelector'

const ASPECT_RATIOS = ['9:16', '16:9', '1:1', '4:3', '3:4']

interface Props {
  onJobCreated: (jobId: string, taskId: string) => void
  linkedPostId?: string
  initialPrompt?: string
}

export default function GenerationForm({ onJobCreated, linkedPostId, initialPrompt = '' }: Props) {
  const [mode, setMode] = useState<'photo' | 'video'>('photo')
  const [prompt, setPrompt] = useState(initialPrompt)
  const [aspectRatio, setAspectRatio] = useState('9:16')
  const [quality, setQuality] = useState<'basic' | 'high'>('high')
  const [resolution, setResolution] = useState('1080p')
  const [duration, setDuration] = useState(5)
  const [sunoTrackId, setSunoTrackId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prompt.trim()) { setError('Voer een prompt in'); return }
    setLoading(true); setError(null)
    try {
      const token = await getAuth().currentUser?.getIdToken()
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ mode, prompt, aspectRatio, quality, resolution, duration, sunoTrackId: sunoTrackId || undefined, linkedPostId }),
      })
      if (!res.ok) { const j = await res.json() as { error: string }; throw new Error(j.error) }
      const { jobId, taskId } = await res.json() as { jobId: string; taskId: string }
      onJobCreated(jobId, taskId); setPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generatie mislukt')
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        {(['photo', 'video'] as const).map(m => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all ${mode === m ? 'bg-amber-600/20 border border-amber-500/40 text-amber-400' : 'bg-stone-900 border border-stone-700 text-stone-400 hover:border-stone-600'}`}>
            {m === 'photo' ? <Camera className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
            {m === 'photo' ? 'Foto' : 'Video'}
          </button>
        ))}
      </div>
      <div className="space-y-1">
        <label className="text-xs text-stone-400 font-medium">Prompt</label>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={3}
          placeholder={mode === 'photo' ? 'Jack staand op een verlaten Nevada highway bij zonsondergang...' : 'Jack rijdt in een vintage pickup over een desert highway...'}
          className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60 resize-none" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs text-stone-400 font-medium">Verhouding</label>
          <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)}
            className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60">
            {ASPECT_RATIOS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        {mode === 'photo' && (
          <div className="space-y-1">
            <label className="text-xs text-stone-400 font-medium">Kwaliteit</label>
            <select value={quality} onChange={e => setQuality(e.target.value as 'basic' | 'high')}
              className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60">
              <option value="high">High (2K)</option><option value="basic">Basic (1K)</option>
            </select>
          </div>
        )}
        {mode === 'video' && (
          <>
            <div className="space-y-1">
              <label className="text-xs text-stone-400 font-medium">Resolutie</label>
              <select value={resolution} onChange={e => setResolution(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60">
                <option value="1080p">1080p</option><option value="720p">720p</option><option value="480p">480p</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-stone-400 font-medium">Duur: {duration}s</label>
              <input type="range" min={5} max={30} step={1} value={duration} onChange={e => setDuration(Number(e.target.value))} className="w-full accent-amber-500" />
            </div>
          </>
        )}
      </div>
      {mode === 'video' && <SunoTrackSelector value={sunoTrackId} onChange={setSunoTrackId} />}
      <JackCoreSetPreview />
      {error && <p className="text-xs text-red-400">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600/20 border border-amber-500/50 rounded-lg text-sm font-bold text-amber-400 hover:bg-amber-600/30 transition-colors disabled:opacity-50 tracking-wider uppercase">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Taak aanmaken...' : `${mode === 'photo' ? 'Foto' : 'Video'} Genereren`}
      </button>
    </form>
  )
}
