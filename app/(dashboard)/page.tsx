'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Post, Platform, VoiceHistory, Comment } from '@/types'
import {
  MessageSquare,
  Calendar,
  Clock,
  ArrowRight,
  Sparkles,
  Flame,
  Layers,
  Users,
  BrainCircuit,
  TrendingUp,
  Quote,
  RefreshCw,
  Clapperboard,
  BarChart3,
  Music,
  ExternalLink,
  Zap,
  Check,
  Copy,
  ChevronRight,
  Send,
  CheckCircle2,
} from 'lucide-react'
import { decodeHtmlEntities } from '@/lib/utils'

// Authentic brand vector icons
const PLATFORM_ICONS: Record<Platform, (props: { className?: string }) => JSX.Element> = {
  youtube: ({ className = 'w-4 h-4' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  instagram: ({ className = 'w-4 h-4' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  tiktok: ({ className = 'w-4 h-4' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  facebook: ({ className = 'w-4 h-4' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
}

const PLATFORM_COLORS: Record<Platform, { text: string; bg: string; border: string }> = {
  youtube: { text: 'text-red-400', bg: 'bg-red-950/40', border: 'border-red-900/60' },
  instagram: { text: 'text-pink-400', bg: 'bg-pink-950/40', border: 'border-pink-900/60' },
  tiktok: { text: 'text-cyan-400', bg: 'bg-cyan-950/40', border: 'border-cyan-900/60' },
  facebook: { text: 'text-blue-400', bg: 'bg-blue-950/40', border: 'border-blue-900/60' },
}

const FEATURED_TRACKS = [
  {
    id: 'hate-me-all-you-want',
    title: 'Hate Me All You Want',
    tag: 'Outlaw Defiance Anthem',
    type: 'Single',
    popularity: 68,
    streamGrowth: '+24%',
    spotifyUrl: 'https://open.spotify.com/artist/jackhowlin',
  },
  {
    id: 'i-still-wear-this-crown',
    title: 'I Still Wear This Crown',
    tag: 'Resilience & Crown Symbol',
    type: 'Single',
    popularity: 62,
    streamGrowth: '+19%',
    spotifyUrl: 'https://open.spotify.com/artist/jackhowlin',
  },
  {
    id: 'gravel-road-confessions',
    title: 'Gravel Road Confessions',
    tag: 'Dark Americana Rock',
    type: 'EP Track',
    popularity: 49,
    streamGrowth: '+11%',
    spotifyUrl: 'https://open.spotify.com/artist/jackhowlin',
  },
  {
    id: 'whiskey-in-the-shadows',
    title: 'Whiskey in the Shadows',
    tag: 'Roadside Midnight Tale',
    type: 'EP Track',
    popularity: 41,
    streamGrowth: '+8%',
    spotifyUrl: 'https://open.spotify.com/artist/jackhowlin',
  },
]

const QUICK_VOICE_PRESETS = [
  {
    prompt: 'When is the next song dropping?',
    reply: 'Been working in the dark. Soon enough.',
  },
  {
    prompt: 'Your style is unreal, what a legend!',
    reply: 'Just riding my own trail. Appreciate you.',
  },
  {
    prompt: 'Haters gonna hate man, keep doing you!',
    reply: 'Let them talk. I keep riding.',
  },
]

function parseScheduledDate(scheduledAt: any): Date {
  if (!scheduledAt) return new Date()
  if (typeof scheduledAt.toDate === 'function') return scheduledAt.toDate()
  if (typeof scheduledAt === 'object' && typeof scheduledAt.seconds === 'number') {
    return new Date(scheduledAt.seconds * 1000)
  }
  const parsed = new Date(scheduledAt as string)
  return isNaN(parsed.getTime()) ? new Date() : parsed
}

export default function OverviewPage() {
  const [stats, setStats] = useState({
    newComments: 0,
    scheduledPosts: 0,
    postedToday: 0,
    voiceSamples: 0,
    totalFans: 0,
  })
  const [upcoming, setUpcoming] = useState<Post[]>([])
  const [recentVoice, setRecentVoice] = useState<VoiceHistory[]>([])
  const [pendingComments, setPendingComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastSyncTime, setLastSyncTime] = useState<string>('Zojuist')

  // Interactive Voice Simulator state
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0)
  const [customPrompt, setCustomPrompt] = useState('')
  const [activeReply, setActiveReply] = useState(QUICK_VOICE_PRESETS[0].reply)
  const [copied, setCopied] = useState(false)

  // Quick reply action state
  const [quickReplyingId, setQuickReplyingId] = useState<string | null>(null)
  const [quickReplySuccess, setQuickReplySuccess] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    try {
      const now = Timestamp.now()
      const todayStart = Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)))

      const [
        commentsSnap,
        scheduledSnap,
        postedSnap,
        upcomingSnap,
        voiceSnap,
        fansSnap,
      ] = await Promise.all([
        getDocs(query(collection(db, 'comments'), where('status', '==', 'new'))),
        getDocs(query(collection(db, 'posts'), where('status', '==', 'scheduled'))),
        getDocs(query(collection(db, 'posts'), where('status', '==', 'posted'), where('scheduledAt', '>=', todayStart))),
        getDocs(query(collection(db, 'posts'), where('status', '==', 'scheduled'), where('scheduledAt', '>=', now), orderBy('scheduledAt', 'asc'), limit(5))),
        getDocs(query(collection(db, 'voice_history'), orderBy('timestamp', 'desc'), limit(4))),
        getDocs(collection(db, 'fans')),
      ])

      const commentsList = commentsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Comment))

      setStats({
        newComments: commentsSnap.size,
        scheduledPosts: scheduledSnap.size,
        postedToday: postedSnap.size,
        voiceSamples: voiceSnap.size,
        totalFans: fansSnap.size,
      })

      setPendingComments(commentsList.slice(0, 2))
      setUpcoming(upcomingSnap.docs.map(d => ({ id: d.id, ...d.data() } as Post)))
      setRecentVoice(voiceSnap.docs.map(d => ({ id: d.id, ...d.data() } as VoiceHistory)))
      
      const nowTime = new Date()
      setLastSyncTime(nowTime.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    } catch (err) {
      console.warn('Overview data fetch error:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleManualRefresh = () => {
    setRefreshing(true)
    loadData()
  }

  const handleCopyReply = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSelectPreset = (index: number) => {
    setSelectedPresetIndex(index)
    setCustomPrompt('')
    setActiveReply(QUICK_VOICE_PRESETS[index].reply)
  }

  const handleCustomTest = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customPrompt.trim()) return

    const lower = customPrompt.toLowerCase()
    let response = "Still here. Always have been."
    if (lower.includes('when') || lower.includes('release') || lower.includes('drop') || lower.includes('album') || lower.includes('song')) {
      response = "Coming down the highway soon. Stay ready."
    } else if (lower.includes('love') || lower.includes('great') || lower.includes('best') || lower.includes('fan')) {
      response = "Appreciate the ride with us."
    } else if (lower.includes('hate') || lower.includes('fake') || lower.includes('trash') || lower.includes('bad')) {
      response = "Hate me all you want. Still wearing this crown."
    } else if (lower.includes('merch') || lower.includes('shirt') || lower.includes('hat')) {
      response = "Fourth Wall link in bio. Wear it rugged."
    } else {
      response = "Been riding. Never stopped."
    }

    setActiveReply(response)
  }

  const handleQuickReply = async (comment: Comment, replyText: string) => {
    setQuickReplyingId(comment.id)
    try {
      await fetch('/api/comments/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId: comment.id,
          platformCommentId: comment.platformCommentId,
          platform: comment.platform,
          reply: replyText,
        }),
      })
      setQuickReplySuccess(comment.id)
      setTimeout(() => {
        setQuickReplySuccess(null)
        loadData()
      }, 1500)
    } catch (e) {
      console.error('Quick reply error:', e)
    } finally {
      setQuickReplyingId(null)
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* ───────────────────────────────────────────────────────── */}
      {/* HEADER HERO COMMAND BAR                                   */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-stone-900 via-stone-900 to-stone-950 border border-stone-800 p-6 rounded-2xl shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-amber-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-inner">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black tracking-wider uppercase text-stone-100">
                    Jack Howlin&apos; Command Studio
                  </h1>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 tracking-widest">
                    Outlaw Core
                  </span>
                </div>
                <p className="text-stone-400 text-xs sm:text-sm mt-0.5 max-w-xl font-medium">
                  Centrale hub voor multi-platform publicaties, fan engagement, AI voice learning en song release campagnes.
                </p>
              </div>
            </div>

            {/* Live System Status Badges */}
            <div className="flex items-center gap-2.5 pt-2 flex-wrap text-[11px] font-semibold text-stone-400">
              <span className="inline-flex items-center gap-1.5 bg-stone-950/80 px-2.5 py-1 rounded-md border border-stone-800">
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse shadow-sm shadow-purple-400/50" />
                AI Voice: <strong className="text-purple-300">Actief</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-stone-950/80 px-2.5 py-1 rounded-md border border-stone-800">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                Kanalen: <strong className="text-emerald-300">4 Gekoppeld</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 bg-stone-950/80 px-2.5 py-1 rounded-md border border-stone-800">
                <Clock className="w-3 h-3 text-cyan-400" />
                Sync: <strong className="text-stone-300 font-mono">{lastSyncTime}</strong>
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 bg-stone-950 hover:bg-stone-900 border border-stone-800 text-stone-300 hover:text-stone-100 font-bold px-3 py-2.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow-sm disabled:opacity-50"
              title="Live data verversen"
              aria-label="Ververs dashboard data"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Verversen</span>
            </button>

            <Link
              href="/calendar?openCampaign=true"
              className="inline-flex items-center gap-2 bg-stone-950 border border-amber-500/50 hover:bg-amber-500/10 text-amber-400 font-bold px-3.5 py-2.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>7-Dagen Release Planner</span>
            </Link>

            <Link
              href="/calendar?newPost=true"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-black px-4 py-2.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow-lg hover:shadow-amber-500/20"
            >
              <Calendar className="w-4 h-4" />
              <span>Nieuwe Post</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 4 PRIMARY METRIC KPI CARDS                                */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MessageSquare}
          label="Nieuwe Reacties"
          value={loading ? '—' : String(stats.newComments)}
          sub="Wachten op Outlaw Reply"
          badge={stats.newComments > 0 ? `${stats.newComments} te beantwoorden` : 'Inbox bijgewerkt'}
          badgeType={stats.newComments > 0 ? 'alert' : 'neutral'}
          href="/comments"
          accent="amber"
        />
        <StatCard
          icon={Calendar}
          label="Ingeplande Posts"
          value={loading ? '—' : String(stats.scheduledPosts)}
          sub="Over alle 4 social kanalen"
          badge={stats.postedToday > 0 ? `${stats.postedToday} vandaag geplaatst` : 'Kalender gereed'}
          badgeType="info"
          href="/calendar"
          accent="cyan"
        />
        <StatCard
          icon={BrainCircuit}
          label="Voice Learning Samples"
          value={loading ? '—' : String(stats.voiceSamples)}
          sub="Gemini Few-Shot Geheugen"
          badge="Zelflerend Systeem"
          badgeType="purple"
          href="/settings"
          accent="purple"
        />
        <StatCard
          icon={Users}
          label="Geregistreerde Fans"
          value={loading ? '—' : String(stats.totalFans)}
          sub="In Fan CRM & Superfans"
          badge="Actieve Community"
          badgeType="green"
          href="/settings"
          accent="green"
        />
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* PENDING COMMENT SPOTLIGHT (WHEN NEW COMMENTS EXIST)       */}
      {/* ───────────────────────────────────────────────────────── */}
      {!loading && pendingComments.length > 0 && (
        <div className="bg-gradient-to-r from-amber-950/30 via-stone-900 to-stone-950 border border-amber-500/40 rounded-2xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
              <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-amber-300">
                Wachtende Fan Reactie Spotlight
              </h2>
            </div>
            <Link
              href="/comments"
              className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
            >
              Alle {stats.newComments} Reacties Beantwoorden <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingComments.slice(0, 1).map(c => {
            const defaultReply = c.generatedReplies?.[0] || 'Appreciate the support. Still riding.'
            const isSuccess = quickReplySuccess === c.id

            return (
              <div
                key={c.id}
                className="bg-stone-950/90 border border-stone-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-stone-200">{c.author || 'Fan'}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400 uppercase">
                      {c.platform}
                    </span>
                    {c.videoTitle && (
                      <span className="text-[10px] text-stone-500 truncate max-w-xs">
                        op &ldquo;{c.videoTitle}&rdquo;
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-300 italic">
                    &ldquo;{decodeHtmlEntities(c.text)}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isSuccess ? (
                    <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold px-3 py-2 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
                      <CheckCircle2 className="w-4 h-4" /> Geplaatst in Jack&apos;s Voice!
                    </div>
                  ) : (
                    <button
                      onClick={() => handleQuickReply(c, defaultReply)}
                      disabled={quickReplyingId === c.id}
                      className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-3.5 py-2 rounded-xl text-xs tracking-wider uppercase transition-all shadow-md disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{quickReplyingId === c.id ? 'Plaatsen...' : 'Plaats Outlaw Reply'}</span>
                    </button>
                  )}
                  <Link
                    href="/comments"
                    className="p-2 text-stone-400 hover:text-stone-200 bg-stone-900 hover:bg-stone-800 border border-stone-800 rounded-xl transition-colors"
                    title="Open in Comment Inbox"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* OUTLAW ACTION LAUNCHPAD (QUICK WORKFLOW HUB)              */}
      {/* ───────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-black tracking-widest uppercase text-stone-300">
              Outlaw Action Launchpad
            </h2>
          </div>
          <span className="text-[11px] text-stone-500 font-medium">Directe toegang tot kernfuncties</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <LaunchpadCard
            icon={Clapperboard}
            title="AI Content Studio"
            description="Genereer filmische video's, Seedance clips & Suno audio snippets."
            href="/studio"
            accent="amber"
            cta="Open Studio"
          />
          <LaunchpadCard
            icon={MessageSquare}
            title="Comment Outlaw Reply"
            description="Beantwoord YouTube, Instagram & TikTok reacties in Jack's stijl."
            href="/comments"
            accent="emerald"
            cta="Open Inbox"
          />
          <LaunchpadCard
            icon={Sparkles}
            title="Release Launchpad"
            description="Automatiseer 7-daagse teasers, lyric drops & clip lanceringen."
            href="/calendar?openCampaign=true"
            accent="purple"
            cta="Start Campagne"
          />
          <LaunchpadCard
            icon={BarChart3}
            title="Data & Intel Radar"
            description="Track Spotify momentum, winnende hooks en cross-platform groei."
            href="/analytics"
            accent="cyan"
            cta="Bekijk Intel"
          />
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 2-COLUMN OPERATIONAL SECTION                              */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Upcoming Scheduled Posts */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-stone-200">
                    Eerstvolgende Geplande Posts
                  </h2>
                  <span className="text-[10px] text-stone-500 font-medium">Multi-channel publicatie wachtrij</span>
                </div>
              </div>
              <Link
                href="/calendar"
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-bold transition-colors"
              >
                Volledige Kalender <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading && (
              <div className="space-y-2.5">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-stone-950 border border-stone-800/80 rounded-xl h-16 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && upcoming.length === 0 && (
              <div className="bg-stone-950 border border-stone-800/90 rounded-2xl p-7 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center text-stone-600 mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-stone-300 text-xs sm:text-sm font-bold">Geen posts ingepland voor de komende dagen</p>
                  <p className="text-stone-500 text-xs max-w-sm mx-auto">
                    Houd Jack&apos;s kanalen actief met consistente Outlaw content en song snippets.
                  </p>
                </div>
                <div className="pt-2 flex items-center justify-center gap-3 flex-wrap">
                  <Link
                    href="/calendar?newPost=true"
                    className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-md"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Plan Nieuwe Post
                  </Link>
                  <Link
                    href="/calendar?openCampaign=true"
                    className="inline-flex items-center gap-1.5 bg-stone-900 hover:bg-stone-800 border border-stone-700 text-amber-400 text-xs font-bold px-3.5 py-2 rounded-xl transition-all"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> 7-Dagen Campagne
                  </Link>
                </div>
              </div>
            )}

            {!loading && upcoming.length > 0 && (
              <div className="space-y-2.5">
                {upcoming.map(post => {
                  const date = parseScheduledDate(post.scheduledAt)
                  const isToday = new Date().toDateString() === date.toDateString()

                  return (
                    <Link
                      key={post.id}
                      href={`/calendar?postId=${post.id}`}
                      className="bg-stone-950 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-900/90 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-all group block cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-stone-200 text-xs font-bold truncate group-hover:text-amber-400 transition-colors">
                            {post.title || post.caption || 'Geen titel opgegeven'}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {post.platforms.map(p => {
                            const Icon = PLATFORM_ICONS[p]
                            const color = PLATFORM_COLORS[p]
                            return (
                              <span
                                key={p}
                                className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${color.bg} ${color.border} ${color.text}`}
                              >
                                <Icon className="w-2.5 h-2.5" />
                                {p}
                              </span>
                            )
                          })}
                          {post.mediaUrl && (
                            <span className="text-[9px] font-semibold text-amber-400/90 bg-amber-950/40 border border-amber-800/40 px-1.5 py-0.5 rounded">
                              🎬 {post.mediaType === 'video' ? 'Video Clip' : 'Visual'}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 flex items-center gap-3">
                        <div>
                          <span className={`text-[11px] font-mono font-bold block ${isToday ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {isToday ? 'Vandaag' : date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                          </span>
                          <span className="text-[10px] text-stone-500 font-mono">
                            {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Smart Posting Times Card */}
          <div className="bg-stone-950/90 border border-stone-800 rounded-xl p-4 flex items-start gap-3.5 shadow-inner">
            <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex-shrink-0 mt-0.5">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-stone-200">Aanbevolen Publicatie Venster</span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30 uppercase">
                  Americana Piek
                </span>
              </div>
              <p className="text-stone-400 text-[11px] leading-relaxed">
                Outlaw & Dark Country luisteraars tonen de hoogste interactie tussen <strong>18:30 en 21:30 uur</strong>. Plan teaser clips minstens 24 uur voor song releases.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: AI Voice Learning & Interactive Voice Simulator */}
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400">
                  <BrainCircuit className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-stone-200">
                    Jack Howlin&apos; AI Stem & Geheugen
                  </h2>
                  <span className="text-[10px] text-stone-500 font-medium">Zelflerend Gemini Outlaw Persona</span>
                </div>
              </div>
              <Link
                href="/settings"
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-bold transition-colors"
              >
                Persona Instellen <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Persona Core Rules Pills */}
            <div className="flex flex-wrap gap-1.5">
              {[
                'Kort & Zelfverzekerd',
                'Cowboyhoed = Kroon',
                'Geen uitroeptekens',
                'Max 2 zinnen',
                'Understated Power',
                'Geen Pop-Country Cosplay',
              ].map((tag, i) => (
                <span
                  key={i}
                  className="text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2.5 py-1 rounded-lg"
                >
                  • {tag}
                </span>
              ))}
            </div>

            {/* Interactive Quick Voice Simulator */}
            <div className="bg-stone-950 border border-stone-800/90 rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" /> Snelle Outlaw Voice Tester
                </span>
                <span className="text-[10px] text-stone-500">Kies preset of typ vraag:</span>
              </div>

              {/* Preset chips */}
              <div className="flex flex-wrap gap-1.5">
                {QUICK_VOICE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectPreset(idx)}
                    className={`text-[10px] px-2.5 py-1 rounded-md border font-semibold transition-all ${
                      selectedPresetIndex === idx && !customPrompt
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
                    }`}
                  >
                    &ldquo;{preset.prompt}&rdquo;
                  </button>
                ))}
              </div>

              {/* Custom prompt input form */}
              <form onSubmit={handleCustomTest} className="flex gap-2">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={e => setCustomPrompt(e.target.value)}
                  placeholder="Typ een fan comment om Jack's stem te testen..."
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/60"
                />
                <button
                  type="submit"
                  className="bg-stone-900 hover:bg-amber-500 hover:text-stone-950 border border-stone-700 text-amber-400 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"
                >
                  <span>Test</span>
                </button>
              </form>

              {/* Simulated Reply Box */}
              <div className="bg-stone-900/90 border border-amber-900/40 rounded-lg p-3 flex items-center justify-between gap-2">
                <div className="flex items-start gap-2 min-w-0">
                  <Quote className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-300 font-bold text-xs leading-relaxed italic">
                    &ldquo;{activeReply}&rdquo;
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyReply(activeReply)}
                  className="p-1.5 rounded-md bg-stone-950 border border-stone-800 text-stone-400 hover:text-amber-400 hover:border-amber-500/40 transition-colors flex-shrink-0"
                  title="Kopieer antwoord"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Recent Learned Voice Samples */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 block">
                Recent Geleerde Antwoorden ({recentVoice.length} in geheugen):
              </span>
              {recentVoice.length === 0 && !loading && (
                <p className="text-stone-600 text-xs italic">Nog geen goedgekeurde antwoorden opgeslagen.</p>
              )}
              {recentVoice.map((vh, idx) => (
                <div key={idx} className="bg-stone-950 border border-stone-800/80 rounded-xl p-3 text-xs space-y-1.5">
                  <p className="text-stone-400 italic text-[11px] truncate">
                    Comment: &ldquo;{decodeHtmlEntities(vh.commentText)}&rdquo;
                  </p>
                  <p className="text-amber-300 font-bold text-xs flex items-center gap-1.5">
                    <Quote className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    &ldquo;{decodeHtmlEntities(vh.chosenReply)}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>

          <Link
            href="/settings"
            className="block text-center bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-amber-400 text-xs font-bold py-2.5 rounded-xl border border-stone-800 transition-colors uppercase tracking-wider"
          >
            Stemregels & AI Prompter Aanpassen ➔
          </Link>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* MUSIC CATALOGUS & SONG MOMENTUM BAR                       */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Music className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-stone-200">
                Music Catalogus & Track Momentum
              </h2>
              <span className="text-[10px] text-stone-500 font-medium">Jack Howlin&apos; officiële tracks & AI Video bridges</span>
            </div>
          </div>
          <Link
            href="/analytics"
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold transition-colors"
          >
            Track Intelligence <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {FEATURED_TRACKS.map(track => (
            <div
              key={track.id}
              className="bg-stone-950 border border-stone-800/90 rounded-xl p-4 flex flex-col justify-between space-y-3 group hover:border-amber-500/40 transition-all"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-stone-900 text-stone-400 border border-stone-800">
                    {track.type}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-emerald-400">
                    {track.streamGrowth}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-stone-100 group-hover:text-amber-400 transition-colors truncate">
                  {track.title}
                </h3>
                <p className="text-[10px] text-stone-500 truncate">{track.tag}</p>
              </div>

              {/* Popularity bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-stone-400 font-mono">
                  <span>Spotify Score</span>
                  <span className="font-bold text-amber-400">{track.popularity}/100</span>
                </div>
                <div className="w-full bg-stone-900 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-600 to-amber-400 h-full rounded-full"
                    style={{ width: `${track.popularity}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800/80 flex items-center justify-between gap-2">
                <Link
                  href={`/studio?trackTitle=${encodeURIComponent(track.title)}`}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 px-2 py-1 rounded-md transition-colors"
                >
                  <Clapperboard className="w-3 h-3" /> Maak Video
                </Link>
                <a
                  href={track.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-stone-500 hover:text-stone-300 p-1"
                  title="Open op Spotify"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* CONNECTED SOCIAL MEDIA CHANNELS & API STATUS              */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs sm:text-sm font-black tracking-widest uppercase text-stone-200">
                Verbonden Social Media Kanalen & API Status
              </h2>
              <span className="text-[10px] text-stone-500 font-medium">Real-time authenticatie & sync pipelines</span>
            </div>
          </div>
          <Link
            href="/settings"
            className="text-xs text-stone-400 hover:text-stone-200 flex items-center gap-1 font-semibold"
          >
            API Beheer <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {[
            { key: 'youtube' as Platform, label: 'YouTube', status: 'Actief & Live', sub: 'Data API v3' },
            { key: 'instagram' as Platform, label: 'Instagram', status: 'Actief & Live', sub: 'Creator Graph API' },
            { key: 'facebook' as Platform, label: 'Facebook', status: 'Actief & Live', sub: 'Page Access Token' },
            { key: 'tiktok' as Platform, label: 'TikTok', status: 'Gekoppeld', sub: 'Sandbox Access Token' },
          ].map(({ key, label, status, sub }) => {
            const Icon = PLATFORM_ICONS[key]
            const color = PLATFORM_COLORS[key]

            return (
              <div
                key={key}
                className="bg-stone-950 border border-stone-800/80 hover:border-stone-700 rounded-xl p-4 flex flex-col justify-between space-y-3 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl ${color.bg} ${color.text} border ${color.border}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-200 block">{label}</span>
                    <span className="text-[10px] text-stone-500 block font-mono">{sub}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800/60 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" />
                  <span className="text-[11px] font-bold text-emerald-400">
                    {status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  badge,
  badgeType = 'neutral',
  href,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  badge?: string
  badgeType?: 'alert' | 'info' | 'purple' | 'green' | 'neutral'
  href?: string
  accent: 'amber' | 'cyan' | 'purple' | 'green'
}) {
  const accentStyles = {
    amber: 'text-amber-400 group-hover:text-amber-300',
    cyan: 'text-cyan-400 group-hover:text-cyan-300',
    purple: 'text-purple-400 group-hover:text-purple-300',
    green: 'text-emerald-400 group-hover:text-emerald-300',
  }

  const badgeStyles = {
    alert: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    info: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    green: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    neutral: 'bg-stone-800 text-stone-400 border-stone-700',
  }

  const content = (
    <div className="bg-stone-900 border border-stone-800 hover:border-stone-700 p-5 rounded-2xl transition-all shadow-xl group relative overflow-hidden flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-stone-400 text-xs font-bold tracking-wider uppercase">{label}</span>
          <div className="w-8 h-8 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-center text-stone-400 group-hover:text-stone-200 group-hover:border-stone-700 transition-all">
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className={`text-3xl sm:text-4xl font-black mb-1 tracking-tight ${accentStyles[accent]}`}>
          {value}
        </p>
        {sub && <p className="text-stone-500 text-xs font-medium">{sub}</p>}
      </div>

      {badge && (
        <div className="mt-3.5 pt-2.5 border-t border-stone-800/80 flex items-center justify-between">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${badgeStyles[badgeType]}`}>
            {badge}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-stone-600 group-hover:text-stone-300 group-hover:translate-x-0.5 transition-all" />
        </div>
      )}
    </div>
  )

  return href ? (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  )
}

function LaunchpadCard({
  icon: Icon,
  title,
  description,
  href,
  accent,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
  href: string
  accent: 'amber' | 'emerald' | 'purple' | 'cyan'
  cta: string
}) {
  const accentBorder = {
    amber: 'hover:border-amber-500/60 group-hover:text-amber-400',
    emerald: 'hover:border-emerald-500/60 group-hover:text-emerald-400',
    purple: 'hover:border-purple-500/60 group-hover:text-purple-400',
    cyan: 'hover:border-cyan-500/60 group-hover:text-cyan-400',
  }

  const iconStyles = {
    amber: 'bg-amber-500/10 text-amber-500 border-amber-500/30',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  }

  return (
    <Link
      href={href}
      className={`bg-stone-900 border border-stone-800/90 rounded-2xl p-4 flex flex-col justify-between space-y-3 transition-all shadow-lg group block cursor-pointer ${accentBorder[accent]}`}
    >
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-xl border ${iconStyles[accent]}`}>
            <Icon className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest group-hover:text-stone-300 transition-colors">
            {cta} &rarr;
          </span>
        </div>
        <div>
          <h3 className="text-xs sm:text-sm font-black tracking-wide text-stone-100 group-hover:text-amber-400 transition-colors">
            {title}
          </h3>
          <p className="text-[11px] text-stone-400 mt-1 leading-relaxed line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </Link>
  )
}
