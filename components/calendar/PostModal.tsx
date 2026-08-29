'use client'
import { useRef, useState } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import type { Platform } from '@/types'

interface PostModalProps {
  onClose: () => void
  onSaved: () => void
}

// ── Platform config ──────────────────────────────────────
const PLATFORM_CONFIG = {
  youtube: {
    label: 'YouTube',
    icon: '▶',
    color: 'text-red-400',
    activeBg: 'bg-red-950 border-red-500 text-red-200',
    accepts: ['video'] as const,
    captionLimit: 5000,
    captionLabel: 'Description',
    notes: ['Video verplicht', 'Titel max 100 tekens', 'Tags optioneel'],
  },
  instagram: {
    label: 'Instagram',
    icon: '◈',
    color: 'text-pink-400',
    activeBg: 'bg-pink-950 border-pink-500 text-pink-200',
    accepts: ['image', 'video'] as const,
    captionLimit: 2200,
    captionLabel: 'Caption',
    notes: ['Afbeelding of Reel', 'Max 2200 tekens', 'Max 30 hashtags', 'Reel max 90 sec'],
  },
  tiktok: {
    label: 'TikTok',
    icon: '♪',
    color: 'text-cyan-400',
    activeBg: 'bg-cyan-950 border-cyan-500 text-cyan-200',
    accepts: ['video'] as const,
    captionLimit: 2200,
    captionLabel: 'Caption',
    notes: ['Video verplicht', 'Verticaal 9:16', 'Max 10 minuten', 'Max 2200 tekens'],
  },
  facebook: {
    label: 'Facebook',
    icon: '◉',
    color: 'text-blue-400',
    activeBg: 'bg-blue-950 border-blue-500 text-blue-200',
    accepts: ['image', 'video', 'text'] as const,
    captionLimit: 63000,
    captionLabel: 'Bericht',
    notes: ['Tekst, beeld of video', 'Elke beeldverhouding', 'Video tot 240 min'],
  },
} as const

type PlatformKey = keyof typeof PLATFORM_CONFIG
const PLATFORMS = Object.entries(PLATFORM_CONFIG) as [PlatformKey, (typeof PLATFORM_CONFIG)[PlatformKey]][]

// ── Post preview ─────────────────────────────────────────
function PostPreview({
  platform,
  caption,
  title,
  mediaPreview,
  mediaType,
}: {
  platform: PlatformKey
  caption: string
  title: string
  mediaPreview: string | null
  mediaType: 'image' | 'video' | null
}) {
  const truncate = (s: string, n: number) => s.length > n ? s.slice(0, n) + '…' : s

  if (platform === 'youtube') {
    return (
      <div className="bg-[#0f0f0f] rounded text-white text-xs font-sans">
        <div className="relative bg-black aspect-video flex items-center justify-center">
          {mediaPreview && mediaType === 'video'
            ? <video src={mediaPreview} className="w-full h-full object-cover" />
            : <span className="text-stone-600 text-xs">Video thumbnail</span>
          }
        </div>
        <div className="p-2 flex gap-2">
          <div className="w-8 h-8 rounded-full bg-stone-700 flex-shrink-0 flex items-center justify-center text-xs">JH</div>
          <div>
            <p className="font-semibold text-[13px] leading-snug line-clamp-2">
              {title || 'Video titel'}
            </p>
            <p className="text-stone-400 text-[11px] mt-0.5">Jack Howlin' · 0 weergaven</p>
          </div>
        </div>
        {caption && (
          <div className="px-2 pb-2 text-stone-400 text-[11px]">
            {truncate(caption, 120)}
          </div>
        )}
      </div>
    )
  }

  if (platform === 'instagram') {
    return (
      <div className="bg-white rounded text-black text-xs font-sans max-w-[280px] mx-auto">
        <div className="flex items-center gap-2 p-2 border-b border-gray-200">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">JH</div>
          <div>
            <p className="font-semibold text-[12px]">jack_howlin_official</p>
            <p className="text-gray-400 text-[10px]">Jack Howlin'</p>
          </div>
        </div>
        <div className="bg-black aspect-square flex items-center justify-center">
          {mediaPreview
            ? mediaType === 'image'
              ? <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
              : <video src={mediaPreview} className="w-full h-full object-cover" />
            : <span className="text-stone-600 text-[10px]">Afbeelding / Reel</span>
          }
        </div>
        <div className="p-2">
          <div className="flex gap-3 mb-1.5 text-[18px]">♡ △ ✈</div>
          <p className="font-semibold text-[11px] mb-0.5">42 vind-ik-leuks</p>
          {caption && (
            <p className="text-[11px] leading-relaxed">
              <span className="font-semibold">jack_howlin_official </span>
              {truncate(caption, 100)}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (platform === 'tiktok') {
    return (
      <div className="bg-black rounded overflow-hidden text-white text-xs font-sans max-w-[160px] mx-auto" style={{ aspectRatio: '9/16' }}>
        <div className="relative w-full h-full flex items-center justify-center">
          {mediaPreview && mediaType === 'video'
            ? <video src={mediaPreview} className="absolute inset-0 w-full h-full object-cover" />
            : <span className="text-stone-600 text-[10px] z-10">Verticale video (9:16)</span>
          }
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 z-10">
            <p className="font-semibold text-[11px]">@jack_howlin_official</p>
            {caption && <p className="text-[10px] text-stone-300 leading-tight mt-0.5">{truncate(caption, 80)}</p>}
            <p className="text-[10px] text-stone-400 mt-1">♪ Origineel geluid</p>
          </div>
          <div className="absolute right-1.5 bottom-16 flex flex-col items-center gap-3 z-10">
            <div className="flex flex-col items-center text-[10px]">♡<span>0</span></div>
            <div className="flex flex-col items-center text-[10px]">💬<span>0</span></div>
            <div className="flex flex-col items-center text-[10px]">↗<span>0</span></div>
          </div>
        </div>
      </div>
    )
  }

  // Facebook
  return (
    <div className="bg-white rounded text-black text-xs font-sans">
      <div className="flex items-center gap-2 p-2">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold">JH</div>
        <div>
          <p className="font-semibold text-[12px]">Jack Howlin&apos;</p>
          <p className="text-gray-400 text-[10px]">Zojuist · 🌐</p>
        </div>
      </div>
      {caption && (
        <p className="px-2 pb-2 text-[12px] leading-relaxed text-gray-800">
          {truncate(caption, 150)}
        </p>
      )}
      {mediaPreview && (
        <div className="bg-gray-100 aspect-video flex items-center justify-center overflow-hidden">
          {mediaType === 'image'
            ? <img src={mediaPreview} alt="" className="w-full object-cover" />
            : <video src={mediaPreview} className="w-full object-cover" controls />
          }
        </div>
      )}
      <div className="px-2 py-1.5 flex gap-4 border-t border-gray-200 text-gray-500 text-[11px]">
        <span>👍 Vind ik leuk</span>
        <span>💬 Reageren</span>
        <span>↗ Delen</span>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────
export default function PostModal({ onClose, onSaved }: PostModalProps) {
  const [selectedPlatforms, setSelectedPlatforms] = useState<PlatformKey[]>(['instagram'])
  const [caption, setCaption] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [captionContext, setCaptionContext] = useState('')
  const [generating, setGenerating] = useState(false)
  const [captionOptions, setCaptionOptions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose')
  const [previewPlatform, setPreviewPlatform] = useState<PlatformKey>('instagram')

  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function togglePlatform(p: PlatformKey) {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
    setPreviewPlatform(p)
  }

  // Warnings based on selected platforms + content
  const warnings: string[] = []
  if (selectedPlatforms.includes('youtube') && mediaType !== 'video') {
    warnings.push('YouTube vereist een video')
  }
  if (selectedPlatforms.includes('tiktok') && mediaType !== 'video') {
    warnings.push('TikTok vereist een video')
  }
  if (selectedPlatforms.includes('instagram') && !mediaPreview) {
    warnings.push('Instagram vereist een afbeelding of video')
  }
  if (caption.length > 2200 && (selectedPlatforms.includes('instagram') || selectedPlatforms.includes('tiktok'))) {
    warnings.push('Caption is te lang voor Instagram / TikTok (max 2200)')
  }

  // Smallest caption limit among selected platforms
  const captionLimit = Math.min(
    ...selectedPlatforms.map(p => PLATFORM_CONFIG[p].captionLimit)
  )

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const type = file.type.startsWith('video/') ? 'video' : 'image'
    setMediaType(type)
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
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
      task.on('state_changed',
        s => setUploadProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
        reject,
        async () => resolve(await getDownloadURL(task.snapshot.ref))
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
        body: JSON.stringify({ context: captionContext, platform: selectedPlatforms[0] ?? 'instagram' }),
      })
      const data = (await res.json()) as { options: string[] }
      setCaptionOptions(data.options ?? [])
    } catch { /* ignore */ } finally {
      setGenerating(false)
    }
  }

  async function handleSave() {
    if (!caption.trim() || !scheduledAt || selectedPlatforms.length === 0) return
    if (selectedPlatforms.includes('youtube') && !title.trim()) return
    setSaving(true)
    try {
      let mediaUrl: string | null = null
      if (mediaFile) mediaUrl = await uploadMedia(mediaFile)
      await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platforms: selectedPlatforms,
          caption,
          title: title.trim() || undefined,
          tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
          scheduledAt,
          mediaUrl,
          mediaType: mediaUrl ? mediaType : null,
        }),
      })
      onSaved()
    } catch { /* keep open */ } finally {
      setSaving(false)
      setUploadProgress(null)
    }
  }

  const canSave = caption.trim() && scheduledAt && selectedPlatforms.length > 0 &&
    !(selectedPlatforms.includes('youtube') && !title.trim())

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-stone-900 border border-stone-700 w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-700 sticky top-0 bg-stone-900 z-10">
          <h2 className="text-sm font-bold tracking-widest uppercase text-stone-100">New Post</h2>
          <div className="flex items-center gap-3">
            {/* Tabs */}
            <div className="flex border border-stone-700">
              {(['compose', 'preview'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 text-xs tracking-wider uppercase transition-colors ${
                    activeTab === tab ? 'bg-stone-700 text-stone-100' : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button onClick={onClose} className="text-stone-500 hover:text-stone-300 text-xl leading-none">×</button>
          </div>
        </div>

        {/* Platform selector — always visible */}
        <div className="px-6 pt-5">
          <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">Platforms</label>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => togglePlatform(key)}
                className={`px-3 py-2 text-xs tracking-wider border transition-colors flex items-center gap-1.5 ${
                  selectedPlatforms.includes(key) ? cfg.activeBg : 'border-stone-700 text-stone-400 hover:border-stone-500'
                }`}
              >
                <span>{cfg.icon}</span>
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Platform capability pills */}
          {selectedPlatforms.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {selectedPlatforms.flatMap(p =>
                PLATFORM_CONFIG[p].notes.map(note => (
                  <span key={`${p}-${note}`} className="text-[10px] px-2 py-0.5 bg-stone-800 text-stone-400 border border-stone-700">
                    {note}
                  </span>
                ))
              )}
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div className="mt-2 space-y-1">
              {warnings.map(w => (
                <p key={w} className="text-[11px] text-amber-400 flex items-center gap-1">
                  ⚠ {w}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* ── COMPOSE TAB ── */}
        {activeTab === 'compose' && (
          <div className="p-6 space-y-5">

            {/* YouTube Title */}
            {selectedPlatforms.includes('youtube') && (
              <div>
                <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">
                  Video Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={100}
                  placeholder="bijv. Hate Me All You Want — Official Music Video"
                  className="w-full bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-300 placeholder-stone-600 outline-none"
                />
                <p className={`text-xs mt-1 ${title.length > 90 ? 'text-amber-400' : 'text-stone-600'}`}>
                  {title.length}/100
                </p>
              </div>
            )}

            {/* Tags (YouTube) */}
            {selectedPlatforms.includes('youtube') && (
              <div>
                <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">
                  Tags <span className="text-stone-600">(komma-gescheiden)</span>
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={e => setTags(e.target.value)}
                  placeholder="jack howlin, music, indie rock"
                  className="w-full bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-300 placeholder-stone-600 outline-none"
                />
              </div>
            )}

            {/* Media */}
            <div>
              <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">
                Media
                <span className="text-stone-600 normal-case tracking-normal ml-2">
                  {selectedPlatforms.includes('youtube') || selectedPlatforms.includes('tiktok')
                    ? '(video vereist)'
                    : selectedPlatforms.includes('instagram')
                    ? '(afbeelding of video)'
                    : '(optioneel)'}
                </span>
              </label>
              {!mediaPreview ? (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-stone-700 hover:border-stone-500 py-10 text-stone-500 hover:text-stone-300 text-xs tracking-wider uppercase transition-colors flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">↑</span>
                  Selecteer afbeelding of video
                </button>
              ) : (
                <div className="relative">
                  {mediaType === 'image'
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={mediaPreview} alt="Preview" className="w-full max-h-52 object-cover" />
                    : <video src={mediaPreview} className="w-full max-h-52 object-cover" controls />
                  }
                  <button
                    onClick={removeMedia}
                    className="absolute top-2 right-2 bg-black/70 hover:bg-black text-white w-7 h-7 flex items-center justify-center text-sm"
                  >
                    ×
                  </button>
                  <p className="text-stone-500 text-xs mt-1">
                    {mediaFile?.name} · {Math.round((mediaFile?.size ?? 0) / 1024)} KB
                    {mediaType && <span className="ml-2 uppercase">{mediaType}</span>}
                  </p>
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
            </div>

            {/* Caption AI */}
            <div>
              <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">Caption AI</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={captionContext}
                  onChange={e => setCaptionContext(e.target.value)}
                  placeholder="bijv. nieuwe single uit – Hate Me All You Want"
                  className="flex-1 bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-300 placeholder-stone-600 outline-none"
                />
                <button
                  onClick={generateCaption}
                  disabled={generating || !captionContext.trim()}
                  className="bg-stone-700 hover:bg-stone-600 disabled:opacity-40 px-4 py-2 text-xs tracking-wider uppercase text-stone-300 transition-colors"
                >
                  {generating ? '...' : 'Genereer'}
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
                {selectedPlatforms.length === 1 ? PLATFORM_CONFIG[selectedPlatforms[0]].captionLabel : 'Caption'}
              </label>
              <textarea
                value={caption}
                onChange={e => setCaption(e.target.value)}
                rows={5}
                placeholder="Schrijf je caption..."
                className="w-full bg-stone-800 border border-stone-700 px-3 py-2 text-sm text-stone-300 placeholder-stone-600 outline-none resize-none"
              />
              <p className={`text-xs mt-1 flex justify-between`}>
                <span className={caption.length > captionLimit * 0.9 ? 'text-amber-400' : 'text-stone-600'}>
                  {caption.length.toLocaleString()} / {captionLimit.toLocaleString()} tekens
                </span>
                {caption.length > captionLimit && <span className="text-red-400">Te lang!</span>}
              </p>
            </div>

            {/* Schedule */}
            <div>
              <label className="text-xs tracking-widest uppercase text-stone-400 block mb-2">Inplannen op</label>
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
                  <span>Media uploaden...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-stone-700 h-1.5">
                  <div className="bg-amber-500 h-1.5 transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving || !canSave}
              className="w-full bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-stone-100 py-3 text-xs tracking-widest uppercase transition-colors"
            >
              {saving
                ? uploadProgress !== null ? `Uploaden ${uploadProgress}%...` : 'Opslaan...'
                : 'Post Inplannen'}
            </button>
          </div>
        )}

        {/* ── PREVIEW TAB ── */}
        {activeTab === 'preview' && (
          <div className="p-6">
            {/* Platform selector for preview */}
            <div className="flex gap-2 mb-5">
              {selectedPlatforms.map(p => (
                <button
                  key={p}
                  onClick={() => setPreviewPlatform(p)}
                  className={`px-3 py-1.5 text-xs tracking-wider border transition-colors ${
                    previewPlatform === p ? PLATFORM_CONFIG[p].activeBg : 'border-stone-700 text-stone-400'
                  }`}
                >
                  {PLATFORM_CONFIG[p].icon} {PLATFORM_CONFIG[p].label}
                </button>
              ))}
            </div>

            {selectedPlatforms.length === 0 ? (
              <p className="text-stone-600 text-sm">Selecteer eerst een platform.</p>
            ) : (
              <div className="max-w-xs mx-auto">
                <PostPreview
                  platform={previewPlatform}
                  caption={caption}
                  title={title}
                  mediaPreview={mediaPreview}
                  mediaType={mediaType}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
