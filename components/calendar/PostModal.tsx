'use client'
import { useRef, useState } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import type { Platform } from '@/types'

interface PostModalProps {
  onClose: () => void
  onSaved: () => void
}

const PLATFORMS: { key: Platform; label: string }[] = [
  { key: 'youtube', label: 'YouTube' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'facebook', label: 'Facebook' },
]

export default function PostModal({ onClose, onSaved }: PostModalProps) {
  const [platforms, setPlatforms] = useState<Platform[]>(['youtube'])
  const [caption, setCaption] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [captionContext, setCaptionContext] = useState('')
  const [generating, setGenerating] = useState(false)
  const [captionOptions, setCaptionOptions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  // Media state
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function togglePlatform(p: Platform) {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const type = file.type.startsWith('video/') ? 'video' : 'image'
    setMediaType(type)
    setMediaFile(file)

    const url = URL.createObjectURL(file)
    setMediaPreview(url)
  }

  function removeMedia() {
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    setUploadProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadMedia(file: File): Promise<string> {
    const path = `posts/${Date.now()}-${file.name}`
    const storageRef = ref(storage, path)
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file)
      task.on(
        'state_changed',
        snapshot => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          setUploadProgress(pct)
        },
        reject,
        async () => {
          const url = await getDownloadURL(task.snapshot.ref)
          resolve(url)
        }
      )
    })
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
    const needsTitle = platforms.includes('youtube')
    if (!caption.trim() || !scheduledAt || platforms.length === 0) return
    if (needsTitle && !title.trim()) return
    setSaving(true)
    try {
      let mediaUrl: string | null = null

      if (mediaFile) {
        mediaUrl = await uploadMedia(mediaFile)
      }

      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms,
          caption,
          title: title.trim() || undefined,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          scheduledAt,
          mediaUrl,
          mediaType: mediaUrl ? mediaType : null,
        }),
      })
      onSaved()
    } catch {
      // keep modal open on error
    } finally {
      setSaving(false)
      setUploadProgress(null)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

          {/* Title (YouTube required) */}
          {platforms.includes('youtube') && (
            <div>
              <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">
                Video Title <span className="text-amber-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Hate Me All You Want — Official Music Video"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
                className="w-full bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-300 placeholder-stone-600 outline-none"
              />
              <p className="text-stone-600 text-xs mt-1">{title.length}/100</p>
            </div>
          )}

          {/* Tags (YouTube optional) */}
          {platforms.includes('youtube') && (
            <div>
              <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">
                Tags <span className="text-stone-600">(komma-gescheiden)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. jack howlin, music, indie"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-300 placeholder-stone-600 outline-none"
              />
            </div>
          )}

          {/* Media Upload */}
          <div>
            <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">
              Image / Video
            </label>
            {!mediaPreview ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border border-dashed border-stone-600 hover:border-stone-400 py-8 text-stone-500 hover:text-stone-300 text-xs tracking-wider uppercase transition-colors"
              >
                + Select image or video
              </button>
            ) : (
              <div className="relative">
                {mediaType === 'image' ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="w-full max-h-48 object-cover"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    className="w-full max-h-48 object-cover"
                    controls
                  />
                )}
                <button
                  onClick={removeMedia}
                  className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white w-6 h-6 flex items-center justify-center text-xs"
                >
                  ×
                </button>
                <p className="text-stone-500 text-xs mt-1">
                  {mediaFile?.name} ({Math.round((mediaFile?.size ?? 0) / 1024)} KB)
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileChange}
              className="hidden"
            />
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

          {/* Upload progress */}
          {uploadProgress !== null && (
            <div>
              <div className="flex justify-between text-xs text-stone-400 mb-1">
                <span>Uploading media...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-stone-700 h-1">
                <div
                  className="bg-amber-600 h-1 transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

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
            {saving
              ? uploadProgress !== null
                ? `Uploading ${uploadProgress}%...`
                : 'Saving...'
              : 'Schedule Post'}
          </button>
        </div>
      </div>
    </div>
  )
}
