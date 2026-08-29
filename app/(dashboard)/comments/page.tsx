'use client'
import { useEffect, useState } from 'react'
import { getNewComments } from '@/lib/firestore'
import CommentCard from '@/components/comments/CommentCard'
import type { Comment, Platform } from '@/types'

const PLATFORM_FILTERS: { key: Platform | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'Alles', icon: '◈' },
  { key: 'youtube', label: 'YouTube', icon: '▶' },
  { key: 'instagram', label: 'Instagram', icon: '◈' },
  { key: 'facebook', label: 'Facebook', icon: '◉' },
]

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Platform | 'all'>('all')

  useEffect(() => {
    getNewComments(100)
      .then(c => { setComments(c); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? comments : comments.filter(c => c.platform === filter)

  const counts = {
    all: comments.length,
    youtube: comments.filter(c => c.platform === 'youtube').length,
    instagram: comments.filter(c => c.platform === 'instagram').length,
    facebook: comments.filter(c => c.platform === 'facebook').length,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-wider uppercase text-stone-100">Comments</h1>
        <p className="text-stone-500 text-sm mt-1">
          {loading ? '...' : `${comments.length} nieuw`} · Elke 30 min bijgewerkt
        </p>
      </div>

      {/* Platform filter tabs */}
      <div className="flex gap-1 mb-6 border-b border-stone-700">
        {PLATFORM_FILTERS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-2 text-xs tracking-wider uppercase border-b-2 transition-colors -mb-px flex items-center gap-1.5 ${
              filter === key
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-stone-500 hover:text-stone-300'
            }`}
          >
            {icon} {label}
            {counts[key as keyof typeof counts] > 0 && (
              <span className={`ml-1 text-[10px] px-1.5 py-0.5 rounded-full ${
                filter === key ? 'bg-amber-900 text-amber-300' : 'bg-stone-800 text-stone-500'
              }`}>
                {counts[key as keyof typeof counts]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-stone-800 border border-stone-700 h-24 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-stone-800 border border-stone-700 p-10 text-center">
          <p className="text-stone-500 text-sm">Geen nieuwe comments.</p>
          <p className="text-stone-600 text-xs mt-1">Comments worden elke 30 minuten opgehaald.</p>
        </div>
      )}

      <div className="space-y-4">
        {filtered.map(comment => (
          <CommentCard
            key={comment.id}
            comment={comment}
            onReplied={id => setComments(prev => prev.filter(c => c.id !== id))}
            onIgnored={id => setComments(prev => prev.filter(c => c.id !== id))}
          />
        ))}
      </div>
    </div>
  )
}
