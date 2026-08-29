'use client'
import { useRef, useState, useEffect } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '@/lib/firebase'
import type { Platform } from '@/types'
import {
  Sparkles,
  UploadCloud,
  Video,
  Image as ImageIcon,
  Calendar,
  Type,
  X,
  Clock,
  Eye,
  Edit3,
  Flame,
  CheckCircle2,
  Wand2,
  Share2,
} from 'lucide-react'

interface PostModalProps {
  onClose: () => void
  onSaved: () => void
}

// ── Platform specifications & constraints ─────────────────
interface PlatformMeta {
  key: Platform
  label: string
  color: string
  activeBorder: string
  activeBg: string
  badgeBg: string
  supportsImage: boolean
  supportsVideo: boolean
  supportsTextOnly: boolean
  captionLimit: number
  formatHint: string
  icon: (props: { className?: string }) => JSX.Element
}

const PLATFORM_DETAILS: Record<Platform, PlatformMeta> = {
  youtube: {
    key: 'youtube',
    label: 'YouTube',
    color: 'text-red-400',
    activeBorder: 'border-red-500',
    activeBg: 'bg-red-950/40 text-red-100',
    badgeBg: 'bg-red-950/70 text-red-300 border-red-800',
    supportsImage: false,
    supportsVideo: true,
    supportsTextOnly: false,
    captionLimit: 5000,
    formatHint: 'Alleen video (16:9 of 9:16 Shorts)',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  instagram: {
    key: 'instagram',
    label: 'Instagram',
    color: 'text-pink-400',
    activeBorder: 'border-pink-500',
    activeBg: 'bg-pink-950/40 text-pink-100',
    badgeBg: 'bg-pink-950/70 text-pink-300 border-pink-800',
    supportsImage: true,
    supportsVideo: true,
    supportsTextOnly: false,
    captionLimit: 2200,
    formatHint: 'Foto (1:1 / 4:5) of Reel (9:16)',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  tiktok: {
    key: 'tiktok',
    label: 'TikTok',
    color: 'text-cyan-400',
    activeBorder: 'border-cyan-500',
    activeBg: 'bg-cyan-950/40 text-cyan-100',
    badgeBg: 'bg-cyan-950/70 text-cyan-300 border-cyan-800',
    supportsImage: false,
    supportsVideo: true,
    supportsTextOnly: false,
    captionLimit: 2200,
    formatHint: 'Alleen video (9:16 verticaal)',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  facebook: {
    key: 'facebook',
    label: 'Facebook',
    color: 'text-blue-400',
    activeBorder: 'border-blue-500',
    activeBg: 'bg-blue-950/40 text-blue-100',
    badgeBg: 'bg-blue-950/70 text-blue-300 border-blue-800',
    supportsImage: true,
    supportsVideo: true,
    supportsTextOnly: true,
    captionLimit: 63000,
    formatHint: 'Tekst, Foto of Video',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
}

const AI_QUICK_IDEAS = [
  { label: '🎸 Acoustic Jam', prompt: 'Acoustic guitar session at night, deep outlaw americana sound, raw emotions' },
  { label: '🔥 Nieuwe Single', prompt: 'Nieuwe single aankondiging, ruwe country rock gitaren, stream nu op Spotify & YouTube' },
  { label: '🥃 Campfire Story', prompt: 'Campfire and whiskey vibes, verhalen over het leven onderweg, nieuwe muziek onderweg' },
  { label: '🎬 Behind The Scenes', prompt: 'Behind the scenes in the studio recording vocals and guitar tracks, analog warmth' },
]

export default function PostModal({ onClose, onSaved }: PostModalProps) {
  // Form State
  const [platforms, setPlatforms] = useState<Platform[]>(['instagram', 'facebook'])
  const [caption, setCaption] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose')
  const [previewPlatform, setPreviewPlatform] = useState<Platform>('instagram')

  // Media State
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // AI Auto-Pilot State
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiVariations, setAiVariations] = useState<{ style: string; caption: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null)

  // Auto-adapt platforms when media changes
  useEffect(() => {
    if (mediaType === 'image') {
      // Images: remove YouTube and TikTok
      setPlatforms(prev => {
        const filtered = prev.filter(p => p === 'instagram' || p === 'facebook')
        return filtered.length > 0 ? filtered : ['instagram', 'facebook']
      })
      if (previewPlatform === 'youtube' || previewPlatform === 'tiktok') {
        setPreviewPlatform('instagram')
      }
    } else if (mediaType === 'video') {
      // Videos: enable all platforms by default if only 1 was active
      setPlatforms(prev => {
        if (!prev.includes('youtube') && !prev.includes('tiktok')) {
          return ['youtube', 'instagram', 'tiktok', 'facebook']
        }
        return prev
      })
    }
  }, [mediaType, previewPlatform])

  // Media upload handler
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
    setPlatforms(['facebook'])
  }

  // Toggle platform
  function togglePlatform(p: Platform) {
    const meta = PLATFORM_DETAILS[p]
    // Validation: prevent selecting unsupported platforms based on media
    if (mediaType === 'image' && !meta.supportsImage) return
    if (!mediaType && !meta.supportsTextOnly) return

    setPlatforms(prev => {
      const next = prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
      return next
    })
    setPreviewPlatform(p)
  }

  // 1-Click AI Full Generation
  async function triggerAiGeneration(customPrompt?: string) {
    const promptToUse = customPrompt ?? aiPrompt
    if (!promptToUse.trim() && !mediaFile) return

    setIsGeneratingAI(true)
    setAiSuccessMessage(null)

    try {
      const res = await fetch('/api/posts/ai-studio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          mediaType,
          fileName: mediaFile?.name,
        }),
      })

      const data = await res.json()
      if (data.error) throw new Error(data.error)

      // Apply AI output automatically
      if (data.caption) setCaption(data.caption)
      if (data.title && (mediaType === 'video' || platforms.includes('youtube'))) {
        setTitle(data.title)
      }
      if (data.tags && Array.isArray(data.tags)) {
        setTags(data.tags.join(', '))
      }
      if (data.scheduledAt && !scheduledAt) {
        setScheduledAt(data.scheduledAt)
      }
      if (data.suggestedPlatforms && Array.isArray(data.suggestedPlatforms)) {
        // Filter based on media capability
        const validSuggested = data.suggestedPlatforms.filter((p: Platform) => {
          if (mediaType === 'image') return PLATFORM_DETAILS[p].supportsImage
          if (mediaType === 'video') return PLATFORM_DETAILS[p].supportsVideo
          return PLATFORM_DETAILS[p].supportsTextOnly
        })
        if (validSuggested.length > 0) setPlatforms(validSuggested)
      }
      if (data.variations) {
        setAiVariations(data.variations)
      }

      setAiSuccessMessage('✨ Post automatisch gegenereerd & ingevuld!')
      setTimeout(() => setAiSuccessMessage(null), 4000)
    } catch (err) {
      console.error('AI generation failed:', err)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  // Upload to Firebase Storage
  async function uploadMedia(file: File): Promise<string> {
    const path = `posts/${Date.now()}-${file.name}`
    const storageRef = ref(storage, path)
    return new Promise((resolve, reject) => {
      const task = uploadBytesResumable(storageRef, file)
      task.on(
        'state_changed',
        snapshot => {
          const pct = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          )
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

  // Final Save handler
  async function handleSave() {
    if (!caption.trim() || !scheduledAt || platforms.length === 0) return
    if (platforms.includes('youtube') && !title.trim()) return

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
    } catch (err) {
      console.error('Save post error:', err)
    } finally {
      setSaving(false)
      setUploadProgress(null)
    }
  }

  const captionLimit = Math.min(
    ...platforms.map(p => PLATFORM_DETAILS[p].captionLimit)
  )

  const canSave =
    Boolean(caption.trim()) &&
    Boolean(scheduledAt) &&
    platforms.length > 0 &&
    !(platforms.includes('youtube') && !title.trim()) &&
    !(platforms.includes('youtube') && mediaType !== 'video') &&
    !(platforms.includes('tiktok') && mediaType !== 'video')

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950/80 border-b border-stone-800 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-600/30 flex items-center justify-center text-amber-500 font-bold">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wider text-stone-100 flex items-center gap-2">
                Nieuwe Post Publiceren
              </h2>
              <p className="text-xs text-stone-400">
                Multi-platform automation studio
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-stone-900 border border-stone-800 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('compose')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium tracking-wider transition-all ${
                  activeTab === 'compose'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium tracking-wider transition-all ${
                  activeTab === 'preview'
                    ? 'bg-amber-600 text-stone-950 font-bold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* ───────────────────────────────────────────────────────── */}
          {/* ✨ 1-CLICK AI AUTO-PILOT STUDIO                           */}
          {/* ───────────────────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-amber-950/40 via-stone-900 to-stone-950 border border-amber-500/30 rounded-xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-amber-400">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span className="text-xs font-bold tracking-widest uppercase text-amber-300">
                  AI Auto-Pilot Studio
                </span>
              </div>
              <span className="text-[11px] text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                1-Click Volledig Genereren
              </span>
            </div>

            {/* AI Prompt Input Bar */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={e => setAiPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && triggerAiGeneration()}
                  placeholder="Beschrijf je idee (bijv. 'Nieuwe single Hate Me All You Want preview bij kampvuur')..."
                  className="w-full bg-stone-900/90 border border-stone-700/80 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-stone-200 placeholder-stone-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                />
                {aiPrompt && (
                  <button
                    onClick={() => setAiPrompt('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                onClick={() => triggerAiGeneration()}
                disabled={isGeneratingAI || (!aiPrompt.trim() && !mediaFile)}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold px-5 py-2.5 rounded-lg text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md hover:shadow-amber-500/20"
              >
                {isGeneratingAI ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                    Genereren...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4" />
                    Genereer Alles
                  </>
                )}
              </button>
            </div>

            {/* Quick Inspiration Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-stone-500 mr-1 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-500" /> Snel kiezen:
              </span>
              {AI_QUICK_IDEAS.map(idea => (
                <button
                  key={idea.label}
                  onClick={() => {
                    setAiPrompt(idea.prompt)
                    triggerAiGeneration(idea.prompt)
                  }}
                  className="text-[11px] px-2.5 py-1 rounded-md bg-stone-800/80 hover:bg-amber-950/60 hover:text-amber-300 text-stone-300 border border-stone-700/60 transition-colors"
                >
                  {idea.label}
                </button>
              ))}
            </div>

            {/* AI Success Notification */}
            {aiSuccessMessage && (
              <div className="mt-3 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs px-3 py-2 rounded-md flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>{aiSuccessMessage}</span>
              </div>
            )}

            {/* AI Caption Variations (if generated) */}
            {aiVariations.length > 0 && (
              <div className="mt-4 pt-3 border-t border-stone-800">
                <p className="text-xs text-stone-400 mb-2 font-medium">
                  Kies een stijlvariatie:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {aiVariations.map(v => (
                    <button
                      key={v.style}
                      onClick={() => setCaption(v.caption)}
                      className={`text-left p-2.5 rounded-lg border text-xs transition-all ${
                        caption === v.caption
                          ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                          : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                      }`}
                    >
                      <span className="font-bold text-[10px] uppercase tracking-wider block text-amber-400 mb-1">
                        {v.style}
                      </span>
                      <p className="line-clamp-2 leading-relaxed">{v.caption}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ───────────────────────────────────────────────────────── */}
          {/* TAB 1: COMPOSE / EDITOR                                  */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'compose' && (
            <div className="space-y-6">
              {/* Media Upload & Smart Detection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold tracking-widest uppercase text-stone-300 flex items-center gap-2">
                    <UploadCloud className="w-4 h-4 text-amber-500" />
                    Media Upload & Detectie
                  </label>
                  {mediaType && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-stone-800 text-amber-400 border border-stone-700">
                      Gedetecteerd: {mediaType === 'image' ? '📸 Foto / Afbeelding' : '🎬 Video'}
                    </span>
                  )}
                </div>

                {!mediaPreview ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-stone-700 hover:border-amber-500/70 bg-stone-950/40 hover:bg-stone-950/70 rounded-xl p-6 text-center cursor-pointer transition-all group"
                  >
                    <div className="w-12 h-12 rounded-full bg-stone-800 group-hover:bg-amber-500/20 text-stone-400 group-hover:text-amber-400 mx-auto flex items-center justify-center mb-3 transition-colors">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold tracking-wider uppercase text-stone-300 group-hover:text-stone-100">
                      Sleep je video of foto hierheen, of klik om te bladeren
                    </p>
                    <p className="text-[11px] text-stone-500 mt-1">
                      Ondersteunt MP4, MOV, JPG, PNG (tot 200MB) · AI detecteert automatisch de juiste kanalen
                    </p>
                  </div>
                ) : (
                  <div className="bg-stone-950 rounded-xl border border-stone-800 p-3 relative overflow-hidden">
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-full sm:w-48 h-32 bg-stone-900 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0 relative border border-stone-800">
                        {mediaType === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={mediaPreview}
                            alt="Upload preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <video
                            src={mediaPreview}
                            className="w-full h-full object-cover"
                            controls
                          />
                        )}
                        <div className="absolute top-1.5 left-1.5 bg-black/80 px-2 py-0.5 rounded text-[10px] font-bold text-stone-200">
                          {mediaType === 'image' ? 'IMG' : 'VIDEO'}
                        </div>
                      </div>

                      <div className="flex-1 text-left w-full">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-stone-200 truncate max-w-[280px]">
                              {mediaFile?.name}
                            </p>
                            <p className="text-xs text-stone-500 mt-0.5">
                              {Math.round((mediaFile?.size ?? 0) / 1024)} KB · {mediaFile?.type}
                            </p>
                          </div>
                          <button
                            onClick={removeMedia}
                            className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-stone-900 rounded transition-colors"
                            title="Media verwijderen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Capability alert banner */}
                        <div className="mt-3 p-2 bg-stone-900 rounded-lg border border-stone-800 text-[11px] text-stone-400 flex items-center gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                          {mediaType === 'image' ? (
                            <span>
                              Geschikt voor <strong>Instagram Feed</strong> & <strong>Facebook</strong>. YouTube en TikTok vereisen video.
                            </span>
                          ) : (
                            <span>
                              Geschikt voor alle 4 platforms (<strong>YouTube</strong>, <strong>Instagram Reels</strong>, <strong>TikTok</strong>, <strong>Facebook</strong>)!
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
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

              {/* Platform Selector with Smart Badges */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold tracking-widest uppercase text-stone-300 flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-amber-500" />
                    Doelkanalen Selecteren
                  </label>
                  <span className="text-[11px] text-stone-500">
                    {platforms.length} geselecteerd
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {(Object.keys(PLATFORM_DETAILS) as Platform[]).map(key => {
                    const meta = PLATFORM_DETAILS[key]
                    const isSelected = platforms.includes(key)
                    const isUnsupported =
                      (mediaType === 'image' && !meta.supportsImage) ||
                      (!mediaType && !meta.supportsTextOnly)

                    const Icon = meta.icon

                    return (
                      <button
                        key={key}
                        onClick={() => togglePlatform(key)}
                        disabled={isUnsupported}
                        className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                          isUnsupported
                            ? 'opacity-35 bg-stone-950 border-stone-800/60 cursor-not-allowed'
                            : isSelected
                            ? `${meta.activeBg} ${meta.activeBorder} shadow-lg shadow-black/40`
                            : 'bg-stone-950/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Icon className={`w-4 h-4 ${isSelected ? meta.color : 'text-stone-400'}`} />
                            <span className="text-xs font-bold tracking-wider uppercase">
                              {meta.label}
                            </span>
                          </div>
                          {isSelected && !isUnsupported && (
                            <CheckCircle2 className={`w-3.5 h-3.5 ${meta.color}`} />
                          )}
                        </div>

                        <span className="text-[10px] text-stone-400 leading-tight">
                          {isUnsupported
                            ? '🚫 Video vereist'
                            : meta.formatHint}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* YouTube Video Title & Tags (Only if YouTube is selected) */}
              {platforms.includes('youtube') && (
                <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 text-red-400 text-xs font-bold tracking-wider uppercase">
                    <Video className="w-4 h-4" />
                    YouTube Instellingen
                  </div>

                  <div>
                    <label className="text-xs text-stone-300 block mb-1 font-medium">
                      Video Titel <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      maxLength={100}
                      placeholder="bijv. Hate Me All You Want — Official Acoustic Performance"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3.5 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-red-500 outline-none"
                    />
                    <div className="flex justify-between text-[11px] text-stone-500 mt-1">
                      <span>Pakkende titel voor YouTube & Shorts</span>
                      <span className={title.length > 90 ? 'text-amber-400' : ''}>
                        {title.length}/100
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-stone-300 block mb-1 font-medium">
                      Video Tags <span className="text-stone-500">(komma-gescheiden)</span>
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={e => setTags(e.target.value)}
                      placeholder="jack howlin, outlaw americana, acoustic guitar, indie rock"
                      className="w-full bg-stone-900 border border-stone-700/80 rounded-lg px-3.5 py-2 text-sm text-stone-200 placeholder-stone-600 focus:border-red-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Main Caption Box */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold tracking-widest uppercase text-stone-300 flex items-center gap-2">
                    <Type className="w-4 h-4 text-amber-500" />
                    Caption / Beschrijving
                  </label>
                  <span
                    className={`text-xs ${
                      caption.length > captionLimit ? 'text-red-400 font-bold' : 'text-stone-500'
                    }`}
                  >
                    {caption.length} / {captionLimit.toLocaleString()} tekens
                  </span>
                </div>

                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={5}
                  placeholder="Schrijf hier je caption of klik bovenaan op '✨ Genereer Alles'..."
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3.5 text-sm text-stone-200 placeholder-stone-600 focus:border-amber-500 outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Scheduling Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold tracking-widest uppercase text-stone-300 flex items-center gap-2 mb-1.5">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    Publicatietijdstip
                  </label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-sm text-stone-200 focus:border-amber-500 outline-none"
                  />
                </div>

                <div className="flex flex-col justify-end">
                  <div className="p-3 bg-stone-950/70 border border-stone-800 rounded-xl text-[11px] text-stone-400 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <span>
                      Automatische publisher draait <strong>elke 5 minuten</strong> en post direct naar alle geselecteerde kanalen.
                    </span>
                  </div>
                </div>
              </div>

              {/* Upload progress indicator */}
              {uploadProgress !== null && (
                <div className="bg-stone-950 border border-stone-800 p-3 rounded-xl">
                  <div className="flex justify-between text-xs text-stone-300 font-medium mb-1.5">
                    <span>Media uploaden naar cloud storage...</span>
                    <span className="text-amber-400 font-bold">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ───────────────────────────────────────────────────────── */}
          {/* TAB 2: LIVE PREVIEW TAB                                  */}
          {/* ───────────────────────────────────────────────────────── */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              {/* Platform Switcher for Preview */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold tracking-wider uppercase text-stone-300">
                    Kies Platform Voorbeeld:
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {platforms.map(p => {
                    const meta = PLATFORM_DETAILS[p]
                    const Icon = meta.icon
                    return (
                      <button
                        key={p}
                        onClick={() => setPreviewPlatform(p)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                          previewPlatform === p
                            ? `${meta.activeBg} ${meta.activeBorder} shadow`
                            : 'bg-stone-950 border-stone-800 text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Platform Mockups */}
              <div className="flex justify-center py-2">
                {/* ── YOUTUBE MOCKUP ── */}
                {previewPlatform === 'youtube' && (
                  <div className="bg-[#0f0f0f] border border-stone-800 rounded-xl overflow-hidden text-white font-sans max-w-md w-full shadow-2xl">
                    <div className="aspect-video bg-black flex items-center justify-center relative">
                      {mediaPreview && mediaType === 'video' ? (
                        <video src={mediaPreview} className="w-full h-full object-cover" controls />
                      ) : (
                        <div className="text-center p-4">
                          <Video className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                          <span className="text-xs text-stone-500">Video Player Thumbnail</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3.5 space-y-2">
                      <h3 className="font-bold text-sm leading-snug line-clamp-2">
                        {title || 'Video Titel verschijnt hier...'}
                      </h3>
                      <div className="flex items-center gap-2.5 pt-1">
                        <div className="w-8 h-8 rounded-full bg-amber-700 flex items-center justify-center text-xs font-bold">
                          JH
                        </div>
                        <div>
                          <p className="text-xs font-semibold">Jack Howlin&apos;</p>
                          <p className="text-[10px] text-stone-400">Officiële artiestenpagina</p>
                        </div>
                      </div>
                      {caption && (
                        <div className="mt-2 p-2.5 bg-stone-900/80 rounded-lg text-xs text-stone-300 whitespace-pre-wrap leading-relaxed">
                          {caption}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ── INSTAGRAM MOCKUP ── */}
                {previewPlatform === 'instagram' && (
                  <div className="bg-stone-950 border border-stone-800 rounded-xl overflow-hidden text-stone-100 font-sans max-w-sm w-full shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3 border-b border-stone-800/80">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 p-[1.5px]">
                          <div className="w-full h-full bg-stone-900 rounded-full flex items-center justify-center text-[10px] font-bold text-amber-400">
                            JH
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-bold">jack_howlin_official</span>
                          <p className="text-[10px] text-stone-400">Originele audio</p>
                        </div>
                      </div>
                      <span className="text-stone-500 text-sm">•••</span>
                    </div>

                    {/* Media Area */}
                    <div className="aspect-square bg-stone-900 flex items-center justify-center overflow-hidden">
                      {mediaPreview ? (
                        mediaType === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaPreview} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <video src={mediaPreview} className="w-full h-full object-cover" controls />
                        )
                      ) : (
                        <ImageIcon className="w-10 h-10 text-stone-700" />
                      )}
                    </div>

                    {/* Actions & Caption */}
                    <div className="p-3 space-y-2">
                      <div className="flex items-center justify-between text-stone-300">
                        <div className="flex gap-3 text-lg">
                          <span>♡</span>
                          <span>💬</span>
                          <span>↗</span>
                        </div>
                        <span>🔖</span>
                      </div>
                      <p className="text-xs font-semibold">124 vind-ik-leuks</p>
                      <div className="text-xs leading-relaxed">
                        <span className="font-bold mr-1.5">jack_howlin_official</span>
                        <span className="text-stone-300 whitespace-pre-wrap">
                          {caption || 'Jouw Instagram caption verschijnt hier...'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── TIKTOK MOCKUP ── */}
                {previewPlatform === 'tiktok' && (
                  <div
                    className="bg-black border border-stone-800 rounded-2xl overflow-hidden text-white font-sans max-w-[240px] w-full shadow-2xl relative"
                    style={{ aspectRatio: '9/16' }}
                  >
                    {mediaPreview && mediaType === 'video' ? (
                      <video src={mediaPreview} className="w-full h-full object-cover absolute inset-0" controls />
                    ) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <Video className="w-10 h-10 text-cyan-400 mb-2" />
                        <span className="text-xs text-stone-400">9:16 Video Player</span>
                      </div>
                    )}

                    {/* Right side interactions */}
                    <div className="absolute right-2 bottom-16 flex flex-col items-center gap-3 z-10 text-xs">
                      <div className="flex flex-col items-center"><span className="text-base">❤️</span><span>1.4k</span></div>
                      <div className="flex flex-col items-center"><span className="text-base">💬</span><span>86</span></div>
                      <div className="flex flex-col items-center"><span className="text-base">↗️</span><span>210</span></div>
                    </div>

                    {/* Bottom overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-10 text-left">
                      <p className="text-xs font-bold text-white mb-1">@jack_howlin_official</p>
                      <p className="text-[11px] text-stone-200 line-clamp-3 leading-snug">
                        {caption || 'Jouw TikTok caption...'}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-2 flex items-center gap-1">
                        <span>🎵</span> Origineel geluid - Jack Howlin&apos;
                      </p>
                    </div>
                  </div>
                )}

                {/* ── FACEBOOK MOCKUP ── */}
                {previewPlatform === 'facebook' && (
                  <div className="bg-[#242526] border border-stone-800 rounded-xl overflow-hidden text-stone-100 font-sans max-w-md w-full shadow-2xl">
                    <div className="p-3 flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-sm text-white">
                        JH
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-stone-100">Jack Howlin&apos;</h4>
                        <p className="text-[10px] text-stone-400">Zojuist · 🌐 Openbaar</p>
                      </div>
                    </div>

                    {caption && (
                      <p className="px-3 pb-2.5 text-xs text-stone-200 leading-relaxed whitespace-pre-wrap">
                        {caption}
                      </p>
                    )}

                    {mediaPreview && (
                      <div className="bg-black aspect-video flex items-center justify-center overflow-hidden">
                        {mediaType === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={mediaPreview} alt="" className="w-full object-cover" />
                        ) : (
                          <video src={mediaPreview} className="w-full object-cover" controls />
                        )}
                      </div>
                    )}

                    <div className="p-2.5 border-t border-stone-700/60 flex items-center justify-around text-xs text-stone-400">
                      <span>👍 Vind ik leuk</span>
                      <span>💬 Reageren</span>
                      <span>↗ Delen</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between sticky bottom-0 z-20">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs tracking-wider uppercase text-stone-400 hover:text-stone-200 font-semibold"
          >
            Annuleren
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-bold px-6 py-2.5 rounded-lg text-xs tracking-widest uppercase transition-all shadow-lg hover:shadow-amber-600/20 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                {uploadProgress !== null ? `Uploaden (${uploadProgress}%)...` : 'Opslaan...'}
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4" />
                Post Inplannen
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
