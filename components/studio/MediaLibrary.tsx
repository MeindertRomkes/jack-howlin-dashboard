'use client'

import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { MediaAsset } from '@/types'
import { Download, Link2, Video, ImageIcon, CheckCircle2, Calendar } from 'lucide-react'
import ScheduleModal from './ScheduleModal'

interface Props {
  onLinkToPost?: (assetId: string, url: string) => void
  highlightUrls?: string[]
  onScheduled?: (postId: string) => void
}

export default function MediaLibrary({ onLinkToPost, highlightUrls = [], onScheduled }: Props) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  const [schedulingAsset, setSchedulingAsset] = useState<MediaAsset | null>(null)

  useEffect(() => {
    const q = query(collection(db, 'media_library'), orderBy('createdAt', 'desc'), limit(50))
    return onSnapshot(q, snap => {
      setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaAsset)))
    })
  }, [])

  if (assets.length === 0) {
    return (
      <div className="text-center py-10 text-stone-500 text-sm border border-dashed border-stone-800 rounded-xl">
        Nog geen content gegenereerd. Gebruik het formulier om te beginnen.
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {assets.map(asset => {
          const isNew = highlightUrls.includes(asset.url)
          const isAudiogram = asset.videoType === 'audiogram'
          const isCinematic = asset.videoType === 'cinematic'

          return (
            <div
              key={asset.id}
              className={`relative group rounded-xl overflow-hidden border bg-stone-900 ${
                isNew ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-stone-800'
              }`}
            >
              {asset.type === 'video' ? (
                <video
                  src={asset.url}
                  className="w-full aspect-[9/16] object-cover"
                  muted
                  playsInline
                  onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                  onMouseLeave={e => {
                    const v = e.currentTarget as HTMLVideoElement
                    v.pause()
                    v.currentTime = 0
                  }}
                />
              ) : (
                <img
                  src={asset.url}
                  alt={asset.prompt}
                  className="w-full aspect-[9/16] object-cover"
                />
              )}

              {/* Top Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1 z-10">
                {isNew && (
                  <div className="px-1.5 py-0.5 bg-amber-500 rounded text-[10px] font-bold text-stone-950 shadow-sm">
                    NIEUW
                  </div>
                )}
                {asset.type === 'video' && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 bg-stone-950/85 border border-stone-800 rounded text-[10px] font-semibold text-amber-400 backdrop-blur-sm">
                    <Video className="w-3 h-3 shrink-0" />
                    <span>
                      {isAudiogram ? 'Audiogram' : isCinematic ? 'Cinematic' : 'Video'}
                    </span>
                  </div>
                )}
              </div>

              {/* Linked / Scheduled Badge */}
              {asset.linkedPostId && (
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-1.5 py-0.5 bg-green-950/90 border border-green-500/60 rounded text-[10px] font-semibold text-green-400 backdrop-blur-sm shadow-md">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                  <span>Ingepland</span>
                </div>
              )}

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-stone-950/85 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 z-20">
                <div className="flex items-center gap-1 text-[10px] text-stone-400">
                  {asset.type === 'video' ? (
                    <Video className="w-3 h-3 text-amber-400 shrink-0" />
                  ) : (
                    <ImageIcon className="w-3 h-3 text-amber-400 shrink-0" />
                  )}
                  <span className="line-clamp-2 text-center">{asset.prompt.slice(0, 50)}</span>
                </div>

                {/* Primary Schedule Button */}
                <button
                  type="button"
                  onClick={() => setSchedulingAsset(asset)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
                  title="Inplannen in Kalender"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Inplannen</span>
                </button>

                <div className="flex items-center gap-2">
                  <a
                    href={asset.url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Downloaden"
                    className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-amber-400 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </a>
                  {onLinkToPost && !asset.linkedPostId && (
                    <button
                      type="button"
                      onClick={() => onLinkToPost(asset.id, asset.url)}
                      title="Koppelen aan post"
                      className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-amber-400 transition-colors"
                    >
                      <Link2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 1-Click Scheduling Modal */}
      {schedulingAsset && (
        <ScheduleModal
          asset={schedulingAsset}
          onClose={() => setSchedulingAsset(null)}
          onScheduled={postId => {
            setAssets(prev =>
              prev.map(a => (a.id === schedulingAsset.id ? { ...a, linkedPostId: postId } : a))
            )
            onScheduled?.(postId)
            setSchedulingAsset(null)
          }}
        />
      )}
    </>
  )
}
