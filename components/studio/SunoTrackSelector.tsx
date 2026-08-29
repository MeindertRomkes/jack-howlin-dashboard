'use client'
import { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { SunoTrack } from '@/types'
import { Music } from 'lucide-react'

interface Props { value: string; onChange: (trackId: string) => void }

export default function SunoTrackSelector({ value, onChange }: Props) {
  const [tracks, setTracks] = useState<SunoTrack[]>([])
  useEffect(() => {
    const q = query(collection(db, 'suno_tracks'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => { setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() } as SunoTrack))) })
  }, [])
  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1.5 text-xs text-stone-400 font-medium"><Music className="w-3.5 h-3.5 text-amber-500/70" />Suno Track (optioneel — alleen video)</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60 appearance-none">
        <option value="">Geen track — AI genereert audio</option>
        {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
    </div>
  )
}
