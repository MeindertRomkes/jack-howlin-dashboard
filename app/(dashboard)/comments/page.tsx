'use client'
import { useEffect, useState } from 'react'
import { getNewComments } from '@/lib/firestore'
import CommentCard from '@/components/comments/CommentCard'
import type { Comment } from '@/types'

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNewComments(50)
      .then(c => {
        setComments(c)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wider uppercase text-stone-100">
            Comments
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {loading ? '...' : `${comments.length} new`}
          </p>
        </div>
      </div>

      {loading && (
        <p className="text-stone-600 text-sm">Loading comments...</p>
      )}

      {!loading && comments.length === 0 && (
        <div className="bg-stone-800 border border-stone-700 p-8 text-center">
          <p className="text-stone-500 text-sm">No new comments.</p>
          <p className="text-stone-600 text-xs mt-1">
            Comments are fetched every 30 minutes.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {comments.map(comment => (
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
