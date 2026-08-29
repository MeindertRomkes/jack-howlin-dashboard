'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { JackCoreSetPhoto } from '@/types'
import { ImageIcon, CheckCircle2 } from 'lucide-react'

export default function JackCoreSetPreview() {
  const [photos, setPhotos] = useState<JackCoreSetPhoto[]>([])
  useEffect(() => {
    const q = query(collection(db, 'jack_core_set'), orderBy('order', 'asc'))
    return onSnapshot(q, snap => { setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() } as JackCoreSetPhoto))) })
  }, [])
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
        <span className="text-xs text-stone-400 font-medium">Jack Core Set — altijd automatisch meegestuurd ({photos.length} fotos)</span>
      </div>
      {photos.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {photos.map(p => (
            <div key={p.id} className="relative w-10 h-10 rounded-md overflow-hidden border border-stone-700 group">
              <img src={p.publicUrl} alt={p.label} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-stone-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[9px] text-stone-300 text-center leading-tight px-0.5">{p.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {photos.length === 0 && <div className="flex items-center gap-1.5 text-xs text-stone-500"><ImageIcon className="w-3.5 h-3.5" />Nog geen Core Set fotos — upload ze in Settings</div>}
    </div>
  )
}
