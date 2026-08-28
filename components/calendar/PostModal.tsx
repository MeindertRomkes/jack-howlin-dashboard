'use client'
import { useState } from 'react'
import type { Platform } from '@/types'

interface PostModalProps {
  onClose: () => void
  onSaved: () => void
}

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
]

export default function PostModal({ onClose, onSaved }: PostModalProps) {
  const [platforms, setPlatforms] = useState<Platform[]>(['youtube'])
  const [caption, setCaption] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [captionContext, setCaptionContext] = useState('')
  const [generating, setGenerating] = useState(false)
  const [captionOptions, setCaptionOptions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  function togglePlatform(p: Platform) {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  async function generateCaption() {
    if (!captionContext.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/posts/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: captionContext,
          platform: platforms[0] ?? 'youtube',
        }),
      })
      const data = (await res.json()) as { options: string[] }
      setCaptionOptions(data.options ?? [])
    } catch {
      // silently fail — user can still type caption manually
    } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!caption.trim() || !scheduledAt || platforms.length === 0) return
    setSaving(true)
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms,
          caption,
          scheduledAt,
          mediaUrl: null,
          mediaType: null,
        }),
      })
      onSaved()
    } catch {
      // keep modal open on error
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700">
          <h2 className="text-sm font-bold tracking-widest uppercase text-stone-100">
            New Post
          </h2>
          <button
            onClick={onClose}
            className="text-stone-500 hover:text-stone-300 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Platform */}
          <div>
            <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">
              Platform
            </label>
            <div className="flex gap-2">
              {PLATFORMS.map(p => (
                <button
                  key={p.key}
                  onClick={() => togglePlatform(p.key)}
                  className={`px-4 py-2 text-xs tracking-wider uppercase border transition-colors ${
                    platforms.includes(p.key)
                      ? 'border-amber-500 bg-amber-950 text-amber-100'
                      : 'border-stone-700 text-stone-400 hover:border-stone-500'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Caption AI Assist */}
          <div>
            <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">
              Caption AI Assist
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. new single out — Hate Me All You Want"
                value={captionContext}
                onChange={e => setCaptionContext(e.target.value)}
                className="flex-1 bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-300 placeholder-stone-600 outline-none"
              />
              <button
                onClick={generateCaption}
                disabled={generating || !captionContext.trim()}
                className="bg-stone-700 hover:bg-stone-600 disabled:opacity-40 px-4 py-2 text-xs tracking-wider uppercase text-stone-300 transition-colors"
              >
                {generating ? '...' : 'Generate'}
              </button>
            </div>
            {captionOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => setCaption(opt)}
                className="w-full text-left mt-2 px-3 py-2 border border-stone-700 bg-stone-800 text-sm text-stone-300 hover:border-stone-500 transition-colors"
              >
                {opt}
              </button>
            ))}
          </div>

          {/* Caption */}
          <div>
            <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">
              Caption
            </label>
            <textarea
              value={caption}
              onChange={e => setCaption(e.target.value)}
              rows={4}
              placeholder="Write your caption..."
              className="w-full bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-300 placeholder-stone-600 outline-none resize-none"
            />
          </div>

          {/* Schedule */}
          <div>
            <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">
              Schedule
            </label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              className="bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-300 outline-none"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={
              saving ||
              !caption.trim() ||
              !scheduledAt ||
              platforms.length === 0
            }
            className="w-full bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-stone-100 py-3 text-xs tracking-widest uppercase transition-colors"
          >
            {saving ? 'Saving...' : 'Schedule Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
