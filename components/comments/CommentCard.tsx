'use client'
import { useState } from 'react'
import ReplyOptions from './ReplyOptions'
import type { Comment, Platform } from '@/types'
import {
  Send,
  EyeOff,
  Sparkles,
  AlertCircle,
  ExternalLink,
  Video,
  Zap,
  Film,
  FileText,
  Clock,
} from 'lucide-react'

interface CommentCardProps {
  comment: Comment
  onReplied: (commentId: string) => void
  onIgnored: (commentId: string) => void
}

const PLATFORM_BADGES: Record<Platform, { label: string; bg: string; text: string; border: string }> = {
  youtube: { label: 'YouTube', bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-800/80' },
  instagram: { label: 'Instagram', bg: 'bg-pink-950/60', text: 'text-pink-400', border: 'border-pink-800/80' },
  tiktok: { label: 'TikTok', bg: 'bg-cyan-950/60', text: 'text-cyan-400', border: 'border-cyan-800/80' },
  facebook: { label: 'Facebook', bg: 'bg-blue-950/60', text: 'text-blue-400', border: 'border-blue-800/80' },
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

  // Derive source URL if not stored explicitly
  const sourceUrl =
    comment.sourceUrl ||
    (comment.platform === 'youtube' && comment.videoId
      ? `https://www.youtube.com/watch?v=${comment.videoId}`
      : null)

  // Derive content type badge
  const contentType =
    comment.sourceType ||
    (comment.videoTitle?.toLowerCase().includes('#short') ? 'short' : 'video')

  function getContentTypeBadge() {
    switch (contentType) {
      case 'short':
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold bg-red-900/40 text-red-300 border border-red-800/60 px-2 py-0.5 rounded uppercase tracking-wider">
            <Zap className="w-2.5 h-2.5 text-red-400 fill-red-400" />
            YouTube Short
          </span>
        )
      case 'reel':
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold bg-pink-900/40 text-pink-300 border border-pink-800/60 px-2 py-0.5 rounded uppercase tracking-wider">
            <Film className="w-2.5 h-2.5 text-pink-400" />
            Instagram Reel
          </span>
        )
      case 'post':
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold bg-blue-900/40 text-blue-300 border border-blue-800/60 px-2 py-0.5 rounded uppercase tracking-wider">
            <FileText className="w-2.5 h-2.5 text-blue-400" />
            Post
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold bg-red-900/40 text-red-300 border border-red-800/60 px-2 py-0.5 rounded uppercase tracking-wider">
            <Video className="w-2.5 h-2.5 text-red-400" />
            YouTube Video
          </span>
        )
    }
  }

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

  // Format date
  const formattedDate = comment.publishedAt?.toDate
    ? comment.publishedAt.toDate().toLocaleString('nl-NL', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : ''

  return (
    <div className="bg-stone-900 border border-stone-800 rounded-xl overflow-hidden shadow-lg hover:border-stone-700 transition-all">
      {/* ───────────────────────────────────────────────────────── */}
      {/* SOURCE HEADER BANNER (Shows exact video/post & direct link) */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-stone-950/80 px-4 py-2.5 border-b border-stone-800/80 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {getContentTypeBadge()}
          <span className="text-xs font-semibold text-stone-300 truncate" title={comment.videoTitle}>
            {comment.videoTitle || 'Onbekende video/post'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {formattedDate && (
            <span className="text-[11px] text-stone-500 flex items-center gap-1">
              <Clock className="w-3 h-3 text-stone-600" />
              {formattedDate}
            </span>
          )}

          {sourceUrl && (
            <a
              href={sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 hover:underline flex-shrink-0 bg-stone-900 px-2.5 py-1 rounded border border-stone-700/60 transition-colors"
            >
              <span>Bekijk {contentType === 'short' ? 'Short' : contentType === 'reel' ? 'Reel' : 'Video'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* COMMENT CONTENT                                           */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3.5">
          {comment.authorAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={comment.authorAvatar}
              alt=""
              className="w-10 h-10 rounded-full flex-shrink-0 object-cover border border-stone-700 shadow"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-stone-800 to-stone-900 border border-stone-700 flex items-center justify-center text-xs font-bold text-amber-400 flex-shrink-0 shadow">
              {comment.author.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-stone-100 text-sm font-bold">
                {comment.author}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${badge.bg} ${badge.text} ${badge.border}`}>
                {badge.label}
              </span>
            </div>

            <div className="bg-stone-950/60 border border-stone-800/80 rounded-xl p-3.5">
              <p className="text-stone-200 text-sm leading-relaxed whitespace-pre-wrap">
                {comment.text}
              </p>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────── */}
        {/* AI REPLIES SECTION                                        */}
        {/* ───────────────────────────────────────────────────────── */}
        <div className="pt-2">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Antwoordsuggesties (Jack Howlin&apos; Outlaw Voice):</span>
          </div>

          {comment.generatedReplies.length > 0 ? (
            <ReplyOptions
              generatedReplies={comment.generatedReplies}
              onSelect={setSelectedReply}
              disabled={posting}
            />
          ) : (
            <div className="p-3 bg-stone-950/40 rounded-xl border border-stone-800/80 text-xs text-stone-400 flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span>AI stem leert en formuleert antwoordsuggesties...</span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-950/40 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ───────────────────────────────────────────────────────── */}
        {/* ACTION BUTTONS                                            */}
        {/* ───────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-800">
          <button
            onClick={handleIgnore}
            disabled={posting}
            className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-300 uppercase tracking-wider font-semibold px-3 py-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5" />
            <span>Negeren</span>
          </button>

          <button
            onClick={handlePost}
            disabled={!selectedReply.trim() || posting}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-stone-950 font-bold px-5 py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all shadow-md flex items-center gap-2"
          >
            {posting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-stone-950 border-t-transparent rounded-full animate-spin" />
                <span>Plaatsen...</span>
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
    </div>
  )
}
