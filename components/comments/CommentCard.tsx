'use client'
import { useState } from 'react'
import ReplyOptions from './ReplyOptions'
import type { Comment, Platform } from '@/types'
import { Send, EyeOff, Sparkles, AlertCircle } from 'lucide-react'

interface CommentCardProps {
  comment: Comment
  onReplied: (commentId: string) => void
  onIgnored: (commentId: string) => void
}

const PLATFORM_BADGES: Record<Platform, { label: string; bg: string; text: string }> = {
  youtube: { label: 'YouTube', bg: 'bg-red-950/60 border-red-800', text: 'text-red-400' },
  instagram: { label: 'Instagram', bg: 'bg-pink-950/60 border-pink-800', text: 'text-pink-400' },
  tiktok: { label: 'TikTok', bg: 'bg-cyan-950/60 border-cyan-800', text: 'text-cyan-400' },
  facebook: { label: 'Facebook', bg: 'bg-blue-950/60 border-blue-800', text: 'text-blue-400' },
}

export default function CommentCard({
  comment,
  onReplied,
  onIgnored,
}: CommentCardProps) {
  const [selectedReply, setSelectedReply] = useState<string>('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const badge = PLATFORM_BADGES[comment.platform] ?? PLATFORM_BADGES.youtube

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
      if (!replyRes.ok) throw new Error('Kon antwoord niet plaatsen via platform API')

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
      if (!approveRes.ok) throw new Error('Fout bij opslaan in geschiedenis')

      onReplied(comment.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Fout bij plaatsen.')
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
    <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-md hover:border-stone-700 transition-all space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {comment.authorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comment.authorAvatar}
              alt=""
              className="w-9 h-9 rounded-full flex-shrink-0 object-cover border border-stone-700"
            />
          ) : (
            <div className="w-9 h-9 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-xs font-bold text-stone-300 flex-shrink-0">
              {comment.author.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-stone-200 text-xs font-bold">
                {comment.author}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.bg} ${badge.text}`}>
                {badge.label}
              </span>
              <span className="text-stone-500 text-xs truncate max-w-[200px]">
                {comment.videoTitle}
              </span>
            </div>
            <p className="text-stone-300 text-sm leading-relaxed whitespace-pre-wrap">
              {comment.text}
            </p>
          </div>
        </div>
      </div>

      {/* AI Replies Section */}
      <div className="pt-2 border-t border-stone-800/80">
        <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>AI Antwoordsuggesties (Jack Howlin&apos; Voice):</span>
        </div>

        {comment.generatedReplies.length > 0 ? (
          <ReplyOptions
            generatedReplies={comment.generatedReplies}
            onSelect={setSelectedReply}
            disabled={posting}
          />
        ) : (
          <div className="p-3 bg-stone-950/60 rounded-lg border border-stone-800 text-xs text-stone-500 flex items-center gap-2">
            <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span>AI genereert antwoordsuggesties op de achtergrond...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-2.5 bg-red-950/40 border border-red-800 text-red-300 text-xs rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center justify-between pt-2 border-t border-stone-800/80">
        <button
          onClick={handleIgnore}
          disabled={posting}
          className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 uppercase tracking-wider font-semibold px-3 py-1.5 rounded transition-colors"
        >
          <EyeOff className="w-3.5 h-3.5" />
          <span>Negeren</span>
        </button>

        <button
          onClick={handlePost}
          disabled={!selectedReply.trim() || posting}
          className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-bold px-5 py-2 rounded-lg text-xs tracking-wider uppercase transition-all shadow flex items-center gap-2"
        >
          {posting ? (
            <>
              <div className="w-3 h-3 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
              <span>Versturen...</span>
            </>
          ) : (
            <>
              <Send className="w-3.5 h-3.5" />
              <span>Plaats Antwoord</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
