'use client'
import { useState } from 'react'
import ReplyOptions from './ReplyOptions'
import type { Comment } from '@/types'

interface CommentCardProps {
  comment: Comment
  onReplied: (commentId: string) => void
  onIgnored: (commentId: string) => void
}

export default function CommentCard({
  comment,
  onReplied,
  onIgnored,
}: CommentCardProps) {
  const [selectedReply, setSelectedReply] = useState<string>('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handlePost() {
    if (!selectedReply.trim()) return
    setPosting(true)
    setError(null)
    try {
      const replyRes = await fetch('/api/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformCommentId: comment.platformCommentId,
          reply: selectedReply,
        }),
      })
      if (!replyRes.ok) throw new Error('Failed to post reply to YouTube')

      const approveRes = await fetch('/api/comments/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.id,
          commentText: comment.text,
          chosenReply: selectedReply,
          platform: comment.platform,
          videoTitle: comment.videoTitle,
        }),
      })
      if (!approveRes.ok) throw new Error('Failed to save approval')

      onReplied(comment.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to post. Try again.')
    } finally {
      setPosting(false)
    }
  }

  async function handleIgnore() {
    await fetch('/api/comments/ignore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: comment.id }),
    })
    onIgnored(comment.id)
  }

  return (
    <div className="bg-stone-800 border border-stone-700 p-5">
      <div className="flex items-start gap-3 mb-1">
        {comment.authorAvatar && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={comment.authorAvatar}
            alt=""
            className="w-8 h-8 rounded-full flex-shrink-0"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-amber-500 text-xs font-medium">
              {comment.author}
            </span>
            <span className="text-stone-600 text-xs">·</span>
            <span className="text-stone-500 text-xs truncate">
              {comment.videoTitle}
            </span>
          </div>
          <p className="text-stone-200 text-sm leading-relaxed">{comment.text}</p>
        </div>
      </div>

      {comment.generatedReplies.length > 0 ? (
        <ReplyOptions
          generatedReplies={comment.generatedReplies}
          onSelect={setSelectedReply}
          disabled={posting}
        />
      ) : (
        <p className="text-stone-600 text-xs mt-3 italic">
          Generating replies...
        </p>
      )}

      {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

      <div className="flex gap-3 mt-4">
        <button
          onClick={handlePost}
          disabled={!selectedReply.trim() || posting}
          className="bg-amber-700 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-stone-100 px-6 py-2 text-xs tracking-wider uppercase transition-colors"
        >
          {posting ? 'Posting...' : 'Post'}
        </button>
        <button
          onClick={handleIgnore}
          disabled={posting}
          className="text-stone-500 hover:text-stone-300 text-xs tracking-wider uppercase"
        >
          Skip
        </button>
      </div>
    </div>
  )
}
