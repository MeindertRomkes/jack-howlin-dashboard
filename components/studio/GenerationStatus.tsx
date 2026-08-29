'use client'
import { useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { KieJob } from '@/types'
import { Loader2 } from 'lucide-react'

interface Props { jobId: string; onComplete: (resultUrls: string[]) => void }

export default function GenerationStatus({ jobId, onComplete }: Props) {
  useEffect(() => {
    const ref = doc(db, 'kie_jobs', jobId)
    return onSnapshot(ref, snap => {
      if (!snap.exists()) return
      const data = snap.data() as KieJob
      if (data.state === 'success') onComplete(data.resultUrls)
    })
  }, [jobId, onComplete])
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-stone-900/60 border border-amber-500/20 rounded-lg">
      <Loader2 className="w-4 h-4 text-amber-500 animate-spin" />
      <span className="text-sm text-stone-300">Genereren... Dit kan 30 seconden tot 3 minuten duren.</span>
    </div>
  )
}
