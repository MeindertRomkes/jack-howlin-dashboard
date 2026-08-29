'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { MediaAsset } from '@/types'
import { Download, Link2, Video, ImageIcon, CheckCircle2 } from 'lucide-react'

interface Props {
  onLinkToPost?: (assetId: string, url: string) => void
  highlightUrls?: string[]
}

export default function MediaLibrary({ onLinkToPost, highlightUrls = [] }: Props) {
  const [assets, setAssets] = useState<MediaAsset[]>([])
  useEffect(() => {
    const q = query(collection(db, 'media_library'), orderBy('createdAt', 'desc'), limit(50))
    return onSnapshot(q, snap => { setAssets(snap.docs.map(d => ({ id: d.id, ...d.data() } as MediaAsset))) })
  }, [])

  if (assets.length === 0) {
    return <div className="text-center py-10 text-stone-500 text-sm border border-dashed border-stone-800 rounded-xl">Nog geen content gegenereerd. Gebruik het formulier om te beginnen.</div>
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {assets.map(asset => {
        const isNew = highlightUrls.includes(asset.url)
        return (
          <div key={asset.id} className={`relative group rounded-xl overflow-hidden border bg-stone-900 ${isNew ? 'border-amber-500/60 ring-1 ring-amber-500/30' : 'border-stone-800'}`}>
            {asset.type === 'video' ? (
              <video src={asset.url} className="w-full aspect-[9/16] object-cover" muted playsInline
                onMouseEnter={e => (e.currentTarget as HTMLVideoElement).play()}
                onMouseLeave={e => { (e.currentTarget as HTMLVideoElement).pause(); (e.currentTarget as HTMLVideoElement).currentTime = 0 }} />
            ) : (
              <img src={asset.url} alt={asset.prompt} className="w-full aspect-[9/16] object-cover" />
            )}
            {isNew && <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-amber-500 rounded text-[10px] font-bold text-stone-950">NIEUW</div>}
            {asset.linkedPostId && <div className="absolute top-2 right-2"><CheckCircle2 className="w-4 h-4 text-green-400" /></div>}
            <div className="absolute inset-0 bg-stone-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2">
              <div className="flex items-center gap-1 text-[10px] text-stone-400">
                {asset.type === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                <span className="line-clamp-2 text-center">{asset.prompt.slice(0, 50)}</span>
              </div>
              <div className="flex gap-2">
                <a href={asset.url} download target="_blank" rel="noopener noreferrer"
                  className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-amber-400 transition-colors"><Download className="w-3.5 h-3.5" /></a>
                {onLinkToPost && !asset.linkedPostId && (
                  <button onClick={() => onLinkToPost(asset.id, asset.url)}
                    className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-amber-400 transition-colors"><Link2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
