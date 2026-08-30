'use client'

import { useState } from 'react'
import { getAuth } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { MediaAsset, Platform } from '@/types'
import {
  X,
  Calendar,
  Clock,
  Video,
  Image as ImageIcon,
  Loader2,
  AlertCircle,
} from 'lucide-react'

export interface ScheduleModalProps {
  asset: MediaAsset
  onClose: () => void
  onScheduled?: (postId: string) => void
}

interface PlatformOption {
  id: Platform
  name: string
  color: string
  activeBorder: string
  activeBg: string
  activeText: string
  icon: (props: { className?: string }) => JSX.Element
}

const PLATFORM_OPTIONS: PlatformOption[] = [
  {
    id: 'youtube',
    name: 'YouTube',
    color: 'text-red-400',
    activeBorder: 'border-red-500',
    activeBg: 'bg-red-950/50 text-red-200 border-red-500',
    activeText: 'text-red-400',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    ),
  },
  {
    id: 'instagram',
    name: 'Instagram',
    color: 'text-pink-400',
    activeBorder: 'border-pink-500',
    activeBg: 'bg-pink-950/50 text-pink-200 border-pink-500',
    activeText: 'text-pink-400',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
      </svg>
    ),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: 'text-cyan-400',
    activeBorder: 'border-cyan-500',
    activeBg: 'bg-cyan-950/50 text-cyan-200 border-cyan-500',
    activeText: 'text-cyan-400',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    id: 'facebook',
    name: 'Facebook',
    color: 'text-blue-400',
    activeBorder: 'border-blue-500',
    activeBg: 'bg-blue-950/50 text-blue-200 border-blue-500',
    activeText: 'text-blue-400',
    icon: ({ className = 'w-4 h-4' }) => (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
]

function getTomorrowDateString(): string {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function getVideoTypeBadgeText(asset: MediaAsset): string {
  if (asset.videoType === 'audiogram') return 'Dynamic Audiogram'
  if (asset.videoType === 'cinematic') return 'Cinematic Video'
  if (asset.type === 'video') return 'Video'
  return 'Afbeelding'
}

export default function ScheduleModal({ asset, onClose, onScheduled }: ScheduleModalProps) {
  const [caption, setCaption] = useState<string>(
    asset.suggestedCaption || asset.prompt || ''
  )
  const [platforms, setPlatforms] = useState<Platform[]>(
    asset.type === 'video'
      ? ['tiktok', 'instagram', 'youtube']
      : ['instagram', 'facebook']
  )
  const [scheduledDate, setScheduledDate] = useState<string>(getTomorrowDateString())
  const [scheduledTime, setScheduledTime] = useState<string>('19:00')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const togglePlatform = (p: Platform) => {
    setPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!caption.trim()) {
      setError('Voer een caption in')
      return
    }
    if (platforms.length === 0) {
      setError('Selecteer minimaal één platform')
      return
    }
    if (!scheduledDate || !scheduledTime) {
      setError('Selecteer een datum en tijdstip')
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      let token: string | undefined
      try {
        token = await getAuth().currentUser?.getIdToken()
      } catch (authErr) {
        console.warn('Could not retrieve auth token:', authErr)
      }

      const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}:00`)
      const scheduledAtISO = scheduledDateTime.toISOString()

      const payload = {
        platforms,
        caption: caption.trim(),
        mediaUrl: asset.url,
        mediaType: asset.type,
        scheduledAt: scheduledAtISO,
        status: 'scheduled',
      }

      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Kon post niet inplannen')
      }

      const data = (await res.json()) as { id: string }
      const postId = data.id

      if (asset.id) {
        try {
          await updateDoc(doc(db, 'media_library', asset.id), {
            linkedPostId: postId,
          })
        } catch (linkErr) {
          console.warn('Could not update linkedPostId on media asset:', linkErr)
        }
      }

      onScheduled?.(postId)
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Er is een fout opgetreden bij het inplannen')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-stone-950 border border-stone-800 rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-stone-950/95 backdrop-blur-md border-b border-stone-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-amber-500" />
            <h2 id="schedule-modal-title" className="text-base font-bold text-stone-100 tracking-wide">
              Inplannen in Kalender
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Sluiten"
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-900 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-950/50 border border-red-800/60 rounded-xl text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
            {/* Media preview column */}
            <div className="md:col-span-5 flex flex-col gap-2">
              <label className="text-xs font-semibold text-stone-400">Media Preview</label>
              <div className="relative rounded-xl overflow-hidden border border-stone-800 bg-stone-900 aspect-[9/16] w-full max-h-[280px] flex items-center justify-center shadow-inner">
                {asset.type === 'video' ? (
                  <video
                    src={asset.url}
                    controls
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={asset.url}
                    alt={asset.prompt}
                    className="w-full h-full object-cover"
                  />
                )}
                {/* Video / Image Type Badge */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-1 bg-stone-950/80 border border-stone-800 rounded-md backdrop-blur-md text-[10px] font-semibold text-amber-400">
                  {asset.type === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  <span>{getVideoTypeBadgeText(asset)}</span>
                </div>
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-stone-950/80 border border-stone-800 rounded text-[9px] font-mono text-stone-400">
                  9:16
                </div>
              </div>
              <p className="text-[11px] text-stone-500 line-clamp-2 italic px-1" title={asset.prompt}>
                &ldquo;{asset.prompt}&rdquo;
              </p>
            </div>

            {/* Fields column */}
            <div className="md:col-span-7 space-y-4">
              {/* Platform Multi-select Pills */}
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1.5">
                  Kanalen / Platforms
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORM_OPTIONS.map(opt => {
                    const isSelected = platforms.includes(opt.id)
                    const Icon = opt.icon
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => togglePlatform(opt.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          isSelected
                            ? opt.activeBg
                            : 'bg-stone-900 border-stone-800 text-stone-400 hover:border-stone-700 hover:text-stone-300'
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 ${isSelected ? opt.activeText : 'text-stone-500'}`} />
                        <span>{opt.name}</span>
                      </button>
                    )
                  })}
                </div>
                {platforms.length === 0 && (
                  <p className="text-[11px] text-amber-400/80 mt-1">Selecteer ten minste 1 platform.</p>
                )}
              </div>

              {/* Caption Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="schedule-caption" className="block text-xs font-semibold text-stone-400">
                    Caption / Bericht
                  </label>
                  <span className="text-[11px] text-stone-500 font-mono">
                    {caption.length} tekens
                  </span>
                </div>
                <textarea
                  id="schedule-caption"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={4}
                  placeholder="Voer de caption in voor deze post..."
                  className="w-full px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 text-sm placeholder-stone-600 focus:outline-none focus:border-amber-500 transition-colors resize-y"
                  required
                />
              </div>

              {/* Date & Time Inputs */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="schedule-date" className="block text-xs font-semibold text-stone-400 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-amber-500" />
                    <span>Datum</span>
                  </label>
                  <input
                    id="schedule-date"
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="schedule-time" className="block text-xs font-semibold text-stone-400 mb-1 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tijdstip</span>
                  </label>
                  <input
                    id="schedule-time"
                    type="time"
                    value={scheduledTime}
                    onChange={e => setScheduledTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded-lg text-stone-200 text-sm focus:outline-none focus:border-amber-500 transition-colors"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-stone-800/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-400 hover:text-stone-200 transition-colors"
            >
              Annuleren
            </button>
            <button
              type="submit"
              disabled={submitting || platforms.length === 0 || !caption.trim() || !scheduledDate || !scheduledTime}
              className="py-2.5 px-5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-stone-950 font-bold text-xs sm:text-sm rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-amber-500/10"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Inplannen...</span>
                </>
              ) : (
                <>
                  <span>📅 Inplannen in Kalender</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
