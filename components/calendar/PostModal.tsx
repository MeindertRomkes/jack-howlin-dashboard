'use client'
import { useRef, useState, useEffect } from 'react'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { doc, updateDoc, addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'
import { db, storage } from '@/lib/firebase'
import type { Platform, Post } from '@/types'
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
  Trash2,
  Copy,
  Check,
  Zap,
} from 'lucide-react'

interface PostModalProps {
  post?: Post | null
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
  { label: '🔥 New Single Drop', prompt: 'New single release announcement, raw heavy outlaw country guitars, stream now on all platforms' },
  { label: '🎸 Late Night Acoustic', prompt: 'Acoustic guitar session by the campfire, gravelly vocals, unfiltered outlaw americana' },
  { label: '🥃 Road Stories & Whiskey', prompt: 'Whiskey and highway reflections, late night drive storytelling, gritty southern gothic vibes' },
  { label: '🎬 Behind The Scenes', prompt: 'Behind the scenes in the analog studio tracking vocals and vintage tube amps' },
]

function parsePostDate(scheduledAt: unknown): Date | null {
  if (!scheduledAt) return null
  if (scheduledAt instanceof Date) return scheduledAt
  if (scheduledAt instanceof Timestamp) return scheduledAt.toDate()
  if (
    typeof scheduledAt === 'object' &&
    scheduledAt !== null &&
    'toDate' in scheduledAt &&
    typeof (scheduledAt as { toDate: () => Date }).toDate === 'function'
  ) {
    return (scheduledAt as { toDate: () => Date }).toDate()
  }
  if (
    typeof scheduledAt === 'object' &&
    scheduledAt !== null &&
    'seconds' in scheduledAt &&
    typeof (scheduledAt as { seconds: number }).seconds === 'number'
  ) {
    return new Date((scheduledAt as { seconds: number }).seconds * 1000)
  }
  if (typeof scheduledAt === 'string' || typeof scheduledAt === 'number') {
    const d = new Date(scheduledAt)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

function toDatetimeLocal(d: Date | null): string {
  if (!d) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = d.getFullYear()
  const month = pad(d.getMonth() + 1)
  const day = pad(d.getDate())
  const hours = pad(d.getHours())
  const minutes = pad(d.getMinutes())
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

export default function PostModal({ post, onClose, onSaved }: PostModalProps) {
  const isEditing = Boolean(post?.id)

  // Form State
  const [platforms, setPlatforms] = useState<Platform[]>(
    post?.platforms?.length ? post.platforms : ['instagram', 'facebook']
  )
  const [caption, setCaption] = useState(post?.caption || '')
  const [title, setTitle] = useState(post?.title || '')
  const [tags, setTags] = useState(Array.isArray(post?.tags) ? post.tags.join(', ') : '')
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = parsePostDate(post?.scheduledAt)
    return d ? toDatetimeLocal(d) : ''
  })
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose')
  const [previewPlatform, setPreviewPlatform] = useState<Platform>(
    post?.platforms?.[0] || 'instagram'
  )

  // Media State
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(post?.mediaUrl || null)
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(
    post?.mediaType || (post?.mediaUrl?.includes('.mp4') ? 'video' : post?.mediaUrl ? 'image' : null)
  )
  const [existingMediaUrl, setExistingMediaUrl] = useState<string | null>(post?.mediaUrl || null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tabs & preview state
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose')
  const [previewPlatform, setPreviewPlatform] = useState<Platform>('instagram')
  const [copiedLink, setCopiedLink] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [publishingNow, setPublishingNow] = useState(false)

  // AI Auto-Pilot State
  const [aiPrompt, setAiPrompt] = useState('')
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [aiVariations, setAiVariations] = useState<{ style: string; caption: string }[]>([])
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // A11y: close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

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
    setExistingMediaUrl(null)
    setUploadProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Toggle platform
  function togglePlatform(p: Platform) {
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
    setToastMessage(null)

    try {
      const res = await fetch('/api/posts/campaign-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: promptToUse,
          mediaType: mediaType ?? 'video',
        }),
      })

      if (!res.ok) throw new Error('AI Generator fout')
      const data = await res.json()

      if (data.caption) setCaption(data.caption)
      if (data.title && !title) setTitle(data.title)
      if (data.tags && Array.isArray(data.tags)) setTags(data.tags.join(', '))
      if (data.scheduledAt && !scheduledAt) setScheduledAt(data.scheduledAt)
      if (data.variations) setAiVariations(data.variations)

      setToastMessage({ text: '✨ Post automatisch gegenereerd & ingevuld!', type: 'success' })
      setTimeout(() => setToastMessage(null), 4000)
    } catch (err) {
      console.error('AI generation failed:', err)
      setToastMessage({ text: err instanceof Error ? `Fout: ${err.message}` : 'AI generatie mislukt', type: 'error' })
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

  // Final Save handler (Schedule or Save Changes)
  async function handleSave() {
    if (!caption.trim() || !scheduledAt || platforms.length === 0) return
    if (platforms.includes('youtube') && !title.trim()) return

    setSaving(true)
    try {
      let finalMediaUrl: string | null = existingMediaUrl
      if (mediaFile) {
        finalMediaUrl = await uploadMedia(mediaFile)
      }

      const scheduledDate = new Date(scheduledAt)
      const payload = {
        platforms,
        caption,
        title: title.trim() || null,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        scheduledAt: scheduledAt,
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaUrl ? mediaType : null,
      }

      if (isEditing && post?.id) {
        try {
          await updateDoc(doc(db, 'posts', post.id), {
            ...payload,
            scheduledAt: Timestamp.fromDate(scheduledDate),
            updatedAt: serverTimestamp(),
          })
        } catch (dbErr) {
          console.warn('Direct Firestore update fallback to API:', dbErr)
        }

        await fetch(`/api/posts/${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        try {
          await addDoc(collection(db, 'posts'), {
            ...payload,
            scheduledAt: Timestamp.fromDate(scheduledDate),
            status: 'scheduled',
            platformResults: {},
            postedAt: null,
            errorMessage: null,
            createdAt: serverTimestamp(),
          })
        } catch (dbErr) {
          console.warn('Direct Firestore add fallback to API:', dbErr)
          await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        }
      }

      setToastMessage({ text: '✅ Wijzigingen succesvol opgeslagen!', type: 'success' })
      setTimeout(() => {
        onSaved()
      }, 500)
    } catch (err) {
      console.error('Save post error:', err)
      setToastMessage({ text: 'Fout bij opslaan van post: ' + (err instanceof Error ? err.message : String(err)), type: 'error' })
    } finally {
      setSaving(false)
      setUploadProgress(null)
    }
  }

  // Publish Now Handler
  async function handlePublishNow() {
    if (!caption.trim() || platforms.length === 0) return
    if (platforms.includes('youtube') && !title.trim()) return

    if (!window.confirm('Weet je zeker dat je deze post NU direct wilt publiceren naar alle geselecteerde kanalen?')) {
      return
    }

    setPublishingNow(true)
    try {
      let finalMediaUrl: string | null = existingMediaUrl
      if (mediaFile) {
        finalMediaUrl = await uploadMedia(mediaFile)
      }

      const now = new Date()
      const payload = {
        platforms,
        caption,
        title: title.trim() || null,
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        scheduledAt: now.toISOString(),
        status: 'posted',
        postedAt: now.toISOString(),
        mediaUrl: finalMediaUrl,
        mediaType: finalMediaUrl ? mediaType : null,
      }

      if (isEditing && post?.id) {
        try {
          await updateDoc(doc(db, 'posts', post.id), {
            ...payload,
            scheduledAt: Timestamp.fromDate(now),
            postedAt: Timestamp.fromDate(now),
            status: 'posted',
            updatedAt: serverTimestamp(),
          })
        } catch (dbErr) {
          console.warn('Direct Firestore update fallback to API:', dbErr)
        }

        await fetch(`/api/posts/${post.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } else {
        try {
          await addDoc(collection(db, 'posts'), {
            ...payload,
            scheduledAt: Timestamp.fromDate(now),
            postedAt: Timestamp.fromDate(now),
            status: 'posted',
            platformResults: {},
            errorMessage: null,
            createdAt: serverTimestamp(),
          })
        } catch (dbErr) {
          console.warn('Direct Firestore add fallback to API:', dbErr)
          await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        }
      }

      setToastMessage({ text: '🚀 Post direct live gepubliceerd!', type: 'success' })
      setTimeout(() => {
        onSaved()
      }, 700)
    } catch (err) {
      console.error('Publish now error:', err)
      setToastMessage({ text: 'Fout bij publiceren: ' + (err instanceof Error ? err.message : String(err)), type: 'error' })
    } finally {
      setPublishingNow(false)
      setUploadProgress(null)
    }
  }

  async function handleDelete() {
    if (!post?.id || deleting) return
    if (!window.confirm('Weet je zeker dat je deze post wilt verwijderen?')) return

    setDeleting(true)
    try {
      await fetch(`/api/posts/${post.id}`, {
        method: 'DELETE',
      })
      onSaved()
    } catch (err) {
      console.error('Delete post error:', err)
      setToastMessage({ text: 'Kon post niet verwijderen', type: 'error' })
    } finally {
      setDeleting(false)
    }
  }

  function copyPostLink() {
    if (!post?.id) return
    const url = `${window.location.origin}/calendar?postId=${post.id}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2500)
  }

  const captionLimit = Math.min(
    ...platforms.map(p => PLATFORM_DETAILS[p].captionLimit)
  )

  const canSave =
    Boolean(caption.trim()) &&
    platforms.length > 0 &&
    !(platforms.includes('youtube') && !title.trim())

  return (
    <div
      className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-2 sm:p-4 md:p-6 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh] transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-modal-title"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 font-bold shadow-sm">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 id="post-modal-title" className="text-base font-black tracking-wider uppercase text-stone-100">
                  {isEditing ? 'Post Details & Beheer' : 'Nieuwe Social Post'}
                </h2>
                {post?.status && (
                  <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-extrabold uppercase border ${
                    post.status === 'posted'
                      ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                      : post.status === 'failed'
                      ? 'bg-red-950 text-red-400 border-red-800'
                      : 'bg-amber-950 text-amber-400 border-amber-800'
                  }`}>
                    {post.status === 'posted' ? 'Gepubliceerd' : post.status}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 mt-0.5">
                <p className="text-[11px] text-stone-400 font-mono">
                  {isEditing ? `ID: ${post?.id}` : 'Multi-channel social studio'}
                </p>
                {isEditing && (
                  <button
                    onClick={copyPostLink}
                    className="flex items-center gap-1 text-[11px] text-amber-500 hover:text-amber-400 font-semibold transition-colors bg-stone-900 border border-stone-800 px-2 py-0.5 rounded"
                  >
                    {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLink ? 'Gekopieerd!' : 'Kopieer link'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-stone-950 border border-stone-800 rounded-xl p-1 shadow-inner">
              <button
                onClick={() => setActiveTab('compose')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                  activeTab === 'compose'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold tracking-wider uppercase transition-all ${
                  activeTab === 'preview'
                    ? 'bg-amber-500 text-stone-950 shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Feed Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded-xl transition-colors"
              aria-label="Modal sluiten"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div className={`px-6 py-2.5 border-b text-xs flex items-center gap-2 font-medium ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800/80 text-emerald-200'
              : 'bg-red-950/80 border-red-800/80 text-red-200'
          }`}>
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === 'compose' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* ── LEFT COLUMN: MEDIA PLAYER & CHANNELS (5 cols) ── */}
              <div className="lg:col-span-5 space-y-5">
                {/* Visual Media Container */}
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold tracking-widest uppercase text-stone-300 flex items-center gap-2">
                      {mediaType === 'video' ? <Video className="w-4 h-4 text-amber-500" /> : <ImageIcon className="w-4 h-4 text-amber-500" />}
                      <span>Media Preview</span>
                    </label>
                    {mediaType && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider bg-stone-900 text-amber-400 border border-stone-800">
                        {mediaType === 'video' ? '🎬 9:16 Video (Shorts/Reels)' : '📸 Foto'}
                      </span>
                    )}
                  </div>

                  {mediaPreview ? (
                    <div className="relative rounded-xl overflow-hidden bg-black border border-stone-800 group shadow-inner">
                      {mediaType === 'video' ? (
                        <div className="aspect-[9/16] max-h-[380px] w-full flex items-center justify-center bg-black">
                          <video
                            src={mediaPreview}
                            className="w-full h-full object-contain"
                            controls
                            playsInline
                          />
                        </div>
                      ) : (
                        <div className="aspect-square max-h-[380px] w-full flex items-center justify-center bg-black">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={mediaPreview}
                            alt="Media Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      )}

                      <div className="p-2.5 bg-stone-900/90 border-t border-stone-800 flex items-center justify-between">
                        <span className="text-[11px] text-stone-400 truncate max-w-[180px]">
                          {mediaFile?.name || 'Gekoppelde media (9:16 formaat)'}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-[10px] font-bold uppercase tracking-wider text-amber-400 hover:text-amber-300 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 transition-colors"
                          >
                            Vervangen
                          </button>
                          <button
                            type="button"
                            onClick={removeMedia}
                            className="text-[10px] font-bold uppercase tracking-wider text-red-400 hover:text-red-300 px-2 py-1 rounded bg-stone-800 hover:bg-stone-700 transition-colors"
                          >
                            Verwijderen
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-stone-800 hover:border-amber-500/70 bg-stone-900/40 hover:bg-stone-900/80 rounded-xl p-8 text-center cursor-pointer transition-all group"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-stone-800 group-hover:bg-amber-500/20 text-stone-400 group-hover:text-amber-400 mx-auto flex items-center justify-center mb-3 transition-colors">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold tracking-wider uppercase text-stone-300 group-hover:text-stone-100">
                        Upload video of afbeelding
                      </p>
                      <p className="text-[11px] text-stone-500 mt-1">
                        MP4, MOV, JPG, PNG (tot 200MB) · 9:16 verticaal formaat
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

                {/* Platform Selection */}
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold tracking-widest uppercase text-stone-300 flex items-center gap-2">
                      <Share2 className="w-4 h-4 text-amber-500" />
                      <span>Doelkanalen Selecteren</span>
                    </label>
                    <span className="text-[11px] text-amber-400 font-bold">
                      {platforms.length} actief
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    {(Object.keys(PLATFORM_DETAILS) as Platform[]).map(key => {
                      const meta = PLATFORM_DETAILS[key]
                      const isSelected = platforms.includes(key)
                      const Icon = meta.icon

                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => togglePlatform(key)}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative cursor-pointer ${
                            isSelected
                              ? `${meta.activeBg} shadow-md`
                              : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <Icon className={`w-4 h-4 ${isSelected ? meta.color : 'text-stone-400'}`} />
                              <span className="text-xs font-bold tracking-wider uppercase">
                                {meta.label}
                              </span>
                            </div>
                            <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                              isSelected ? 'bg-amber-500 border-amber-400 text-stone-950' : 'border-stone-700 bg-stone-950'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>

                          <span className="text-[10px] text-stone-400 leading-tight">
                            {meta.formatHint}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* ── RIGHT COLUMN: AI STUDIO, TITLE, CAPTION & SCHEDULING (7 cols) ── */}
              <div className="lg:col-span-7 space-y-5">
                {/* AI Auto-Pilot Bar */}
                <div className="bg-gradient-to-br from-amber-950/40 via-stone-950 to-stone-950 border border-amber-500/30 rounded-2xl p-4 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-400">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      <span className="text-xs font-bold tracking-widest uppercase text-amber-300">
                        AI Copywriter &amp; Auto-Pilot
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase tracking-wider">
                      Gemini 2.5
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && triggerAiGeneration()}
                      placeholder="Idee voor caption (bijv. 'Hate Me All You Want anthem push')..."
                      className="flex-1 bg-stone-900 border border-stone-700/80 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 placeholder-stone-500 focus:border-amber-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => triggerAiGeneration()}
                      disabled={isGeneratingAI}
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-xs tracking-wider uppercase flex items-center justify-center gap-2 transition-all disabled:opacity-40 shadow"
                    >
                      {isGeneratingAI ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                          Genereren...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-4 h-4" />
                          Genereer
                        </>
                      )}
                    </button>
                  </div>

                  {/* Quick Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {AI_QUICK_IDEAS.map(idea => (
                      <button
                        key={idea.label}
                        type="button"
                        onClick={() => {
                          setAiPrompt(idea.prompt)
                          triggerAiGeneration(idea.prompt)
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-amber-950/60 hover:text-amber-300 text-stone-300 border border-stone-800 transition-colors"
                      >
                        {idea.label}
                      </button>
                    ))}
                  </div>

                  {/* AI Variations */}
                  {aiVariations.length > 0 && (
                    <div className="pt-2 border-t border-stone-800/80">
                      <p className="text-[11px] text-stone-400 mb-1.5 font-medium">Kies een stijlvariatie:</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {aiVariations.map(v => (
                          <button
                            key={v.style}
                            type="button"
                            onClick={() => setCaption(v.caption)}
                            className={`text-left p-2 rounded-lg border text-[11px] transition-all ${
                              caption === v.caption
                                ? 'bg-amber-950/60 border-amber-500 text-amber-200'
                                : 'bg-stone-900/60 border-stone-800 text-stone-400 hover:text-stone-200'
                            }`}
                          >
                            <span className="font-bold text-[9px] uppercase tracking-wider block text-amber-400 mb-0.5">
                              {v.style}
                            </span>
                            <p className="line-clamp-2">{v.caption}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* YouTube Video Title */}
                {platforms.includes('youtube') && (
                  <div className="bg-red-950/20 border border-red-900/40 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold tracking-wider uppercase">
                      <Video className="w-4 h-4" />
                      <span>YouTube Video Instellingen</span>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs text-stone-300 mb-1 font-medium">
                        <span>Video Titel *</span>
                        <span className={title.length > 90 ? 'text-amber-400' : 'text-stone-500'}>
                          {title.length}/100
                        </span>
                      </div>
                      <input
                        type="text"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        maxLength={100}
                        placeholder="bijv. Hate Me All You Want — Midnight Highway"
                        className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 placeholder-stone-600 focus:border-red-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-stone-300 block mb-1 font-medium">
                        Video Tags <span className="text-stone-500">(komma-gescheiden)</span>
                      </label>
                      <input
                        type="text"
                        value={tags}
                        onChange={e => setTags(e.target.value)}
                        placeholder="JackHowlin, OutlawCountry, Americana, SouthernRock"
                        className="w-full bg-stone-900 border border-stone-700/80 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 placeholder-stone-600 focus:border-red-500 outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Main Caption Box */}
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold tracking-widest uppercase text-stone-300 flex items-center gap-2">
                      <Type className="w-4 h-4 text-amber-500" />
                      <span>Caption &amp; Beschrijving</span>
                    </label>
                    <span className={`text-xs font-mono ${
                      caption.length > captionLimit ? 'text-red-400 font-bold' : 'text-stone-500'
                    }`}>
                      {caption.length} / {captionLimit.toLocaleString()} tekens
                    </span>
                  </div>

                  {/* Trending Tag Injectors */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                    <span className="text-stone-500 text-[10px] uppercase tracking-wider font-bold">
                      + Tags:
                    </span>
                    {[
                      { label: 'Core Americana', tags: '#JackHowlin #OutlawCountry #Americana #AltCountry' },
                      { label: 'Southern Gothic', tags: '#SouthernGothic #DarkCountry #WesternNoir #WhiskeySongs' },
                      { label: 'Viral Discovery', tags: '#IndependentArtist #SingerSongwriter #RealCountryMusic #NewMusic' },
                    ].map(group => (
                      <button
                        key={group.label}
                        type="button"
                        onClick={() => {
                          setCaption(prev => (prev ? `${prev.trim()}\n\n${group.tags}` : group.tags))
                        }}
                        className="px-2 py-0.5 rounded bg-stone-900 hover:bg-stone-800 text-amber-400/90 border border-stone-800 transition-colors whitespace-nowrap text-[10px]"
                      >
                        + {group.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={caption}
                    onChange={e => setCaption(e.target.value)}
                    rows={6}
                    placeholder="Schrijf hier je social caption..."
                    className="w-full bg-stone-900 border border-stone-800 rounded-xl p-3.5 text-xs text-stone-200 placeholder-stone-600 focus:border-amber-500 outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Scheduling Date & Time */}
                <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 shadow-lg space-y-3">
                  <label className="text-xs font-bold tracking-widest uppercase text-stone-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>Gepland Publicatietijdstip</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                    <input
                      type="datetime-local"
                      value={scheduledAt}
                      onChange={e => setScheduledAt(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:border-amber-500 outline-none font-mono"
                    />

                    <div className="p-2.5 bg-stone-900/80 border border-stone-800 rounded-xl text-[11px] text-stone-400 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <span>
                        Auto-publisher draait elke 5 min en synchroniseert alle actieve kanalen.
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
            </div>
          ) : (

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
        <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs tracking-wider uppercase text-stone-400 hover:text-stone-200 font-semibold"
            >
              Sluiten
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || saving || publishingNow}
                className="px-3.5 py-2 text-xs tracking-wider uppercase text-red-400 hover:bg-red-950/40 border border-red-800/50 rounded-xl font-semibold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{deleting ? 'Verwijderen...' : 'Verwijderen'}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {/* Publish Now Action */}
            <button
              type="button"
              onClick={handlePublishNow}
              disabled={saving || publishingNow || !canSave}
              className="bg-stone-900 border border-amber-500/60 hover:bg-amber-500/20 text-amber-300 font-bold px-4 py-2.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {publishingNow ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Publiceren...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Nu Publiceren (Publish Now)</span>
                </>
              )}
            </button>

            {/* Save / Schedule Action */}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || publishingNow || !canSave}
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-black px-6 py-2.5 rounded-xl text-xs tracking-widest uppercase transition-all shadow-lg hover:shadow-amber-500/20 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                  <span>Opslaan...</span>
                </>
              ) : (
                <>
                  <Calendar className="w-4 h-4" />
                  <span>{isEditing ? 'Wijzigingen Opslaan' : 'Post Inplannen'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
