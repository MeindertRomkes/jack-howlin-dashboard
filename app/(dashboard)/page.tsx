'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Post, Platform, VoiceHistory } from '@/types'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
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

      setStats({
        newComments: commentsSnap.size,
        scheduledPosts: scheduledSnap.size,
        postedToday: postedSnap.size,
        voiceSamples: voiceSnap.size,
        totalFans: fansSnap.size,
      })

      setUpcoming(upcomingSnap.docs.map(d => ({ id: d.id, ...d.data() } as Post)))
      setRecentVoice(voiceSnap.docs.map(d => ({ id: d.id, ...d.data() } as VoiceHistory)))
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* ───────────────────────────────────────────────────────── */}
      {/* HEADER HERO                                               */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Flame className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-wider uppercase text-stone-100">
              Jack Howlin&apos; Command Studio
            </h1>
          </div>
          <p className="text-stone-400 text-xs max-w-xl">
            Centrale hub voor multi-platform publicaties, fan engagement, AI voice learning en song release campagnes.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap z-10">
          <a
            href="/calendar?openCampaign=true"
            className="inline-flex items-center gap-2 bg-stone-950 border border-amber-500/50 hover:bg-amber-500/10 text-amber-400 font-bold px-3.5 py-2.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>7-Dagen Release Planner</span>
          </a>

          <a
            href="/calendar?newPost=true"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold px-4 py-2.5 rounded-xl text-xs tracking-wider uppercase transition-all shadow-md"
          >
            <Calendar className="w-4 h-4" />
            <span>Nieuwe Post</span>
          </a>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 4 STATS CARDS                                             */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={MessageSquare}
          label="Nieuwe Reacties"
          value={loading ? '—' : String(stats.newComments)}
          sub="Klaar voor AI Outlaw Reply"
          href="/comments"
          accent="amber"
        />
        <StatCard
          icon={Calendar}
          label="Ingeplande Posts"
          value={loading ? '—' : String(stats.scheduledPosts)}
          sub="Over alle 4 kanalen"
          href="/calendar"
          accent="cyan"
        />
        <StatCard
          icon={BrainCircuit}
          label="Voice Learning Samples"
          value={loading ? '—' : String(stats.voiceSamples)}
          sub="Actieve leervoorbeelden"
          href="/settings"
          accent="purple"
        />
        <StatCard
          icon={Users}
          label="Geregistreerde Fans"
          value={loading ? '—' : String(stats.totalFans)}
          sub="In Fan CRM & Superfans"
          href="/settings"
          accent="green"
        />
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 2-COLUMN SECTION: UPCOMING POSTS & VOICE LEARNING         */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Upcoming Posts */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <h2 className="text-xs font-bold tracking-widest uppercase text-stone-200">
                  Eerstvolgende Geplande Posts
                </h2>
              </div>
              <a
                href="/calendar"
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-semibold"
              >
                Kalender <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            {loading && (
              <div className="space-y-2">
                {[1, 2].map(i => (
                  <div key={i} className="bg-stone-950 border border-stone-800/80 rounded-lg h-14 animate-pulse" />
                ))}
              </div>
            )}

            {!loading && upcoming.length === 0 && (
              <div className="bg-stone-950 border border-stone-800 rounded-xl p-6 text-center">
                <Calendar className="w-8 h-8 text-stone-600 mx-auto mb-2" />
                <p className="text-stone-400 text-xs font-medium">Geen posts ingepland voor de komende dagen.</p>
                <a
                  href="/calendar"
                  className="text-amber-500 text-xs font-bold hover:underline mt-2 inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Plan nu een post of release campagne
                </a>
              </div>
            )}

            <div className="space-y-2.5">
              {upcoming.map(post => {
                const date =
                  post.scheduledAt instanceof Timestamp
                    ? post.scheduledAt.toDate()
                    : new Date(post.scheduledAt as string)

                return (
                  <Link
                    key={post.id}
                    href={`/calendar?postId=${post.id}`}
                    className="bg-stone-950 border border-stone-800 hover:border-amber-500/60 hover:bg-stone-900/80 rounded-xl p-3 flex items-center justify-between gap-3 transition-all group block cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-stone-200 text-xs font-bold truncate group-hover:text-amber-400 transition-colors">
                          {post.title || post.caption || 'Geen titel'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
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
                            🎬 {post.mediaType === 'video' ? 'Video' : 'Visual'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 flex items-center gap-2.5">
                      <div>
                        <span className="text-[11px] text-amber-400 font-mono font-bold block">
                          {date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-[10px] text-stone-500 font-mono">
                          {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <span className="text-xs text-stone-600 group-hover:text-amber-400 transition-colors font-bold">
                        &rarr;
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Best Posting Times Tip */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-3 flex items-center gap-3">
            <TrendingUp className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-stone-200 block">Aanbevolen Post-Tijdstippen:</span>
              <span className="text-stone-400 text-[11px]">
                Americana luisteraars zijn het meest actief tussen <strong>18:30 en 21:30 uur</strong>.
              </span>
            </div>
          </div>
        </div>

        {/* Right: AI Voice Learning & Memory */}
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-3 border-b border-stone-800 pb-2.5">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-amber-500" />
                <h2 className="text-xs font-bold tracking-widest uppercase text-stone-200">
                  Jack Howlin&apos; AI Stem & Geheugen
                </h2>
              </div>
              <a
                href="/settings"
                className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-semibold"
              >
                Persona & Studio <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-xs text-stone-400 mb-3 leading-relaxed">
              Elke keer dat je een antwoord goedkeurt of verzendt, onthoudt Gemini je exacte stijl en verfijnt het toekomstige suggesties.
            </p>

            {/* Voice Characteristics Pills */}
            <div className="flex flex-wrap gap-1.5 mb-3.5">
              {['Kort & Zelfverzekerd', 'Cowboyhoed = Kroon', 'Geen uitroeptekens', 'Max 2 zinnen', 'Understated Power'].map((tag, i) => (
                <span key={i} className="text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  • {tag}
                </span>
              ))}
            </div>

            {/* Recent Learned Voice History Samples */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-stone-500 block">
                Recent Geleerde Antwoorden ({recentVoice.length} getoond):
              </span>
              {recentVoice.map((vh, idx) => (
                <div key={idx} className="bg-stone-950 border border-stone-800/80 rounded-lg p-2.5 text-xs space-y-1">
                  <p className="text-stone-400 italic text-[11px] truncate">
                    Comment: &ldquo;{decodeHtmlEntities(vh.commentText)}&rdquo;
                  </p>
                  <p className="text-amber-300 font-semibold text-xs flex items-center gap-1">
                    <Quote className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    &ldquo;{decodeHtmlEntities(vh.chosenReply)}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          </div>

          <a
            href="/settings"
            className="block text-center bg-stone-950 hover:bg-stone-800 text-stone-300 text-xs font-bold py-2 rounded-lg border border-stone-800 transition-colors uppercase tracking-wider"
          >
            Stemregels & AI Prompter Aanpassen ➔
          </a>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* CONNECTED PLATFORMS STATUS GRID                           */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold tracking-widest uppercase text-stone-300">
            Verbonden Social Media Kanalen & API Status
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'youtube' as Platform, label: 'YouTube', status: 'Actief', sub: 'Data API v3' },
            { key: 'instagram' as Platform, label: 'Instagram', status: 'Actief', sub: 'Creator Graph API' },
            { key: 'facebook' as Platform, label: 'Facebook', status: 'Actief', sub: 'Page Access Token' },
            { key: 'tiktok' as Platform, label: 'TikTok', status: 'Gekoppeld', sub: 'Sandbox Access Token' },
          ].map(({ key, label, status, sub }) => {
            const Icon = PLATFORM_ICONS[key]
            const color = PLATFORM_COLORS[key]

            return (
              <div
                key={key}
                className="bg-stone-950 border border-stone-800/80 rounded-xl p-3.5 flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${color.bg} ${color.text} border ${color.border}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-200 block">{label}</span>
                    <span className="text-[10px] text-stone-500 block">{sub}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800/60 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50 animate-pulse" />
                  <span className="text-[11px] font-semibold text-emerald-400">
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
  href,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
  href?: string
  accent: 'amber' | 'cyan' | 'purple' | 'green'
}) {
  const accentStyles = {
    amber: 'text-amber-500 group-hover:text-amber-400',
    cyan: 'text-cyan-400 group-hover:text-cyan-300',
    purple: 'text-purple-400 group-hover:text-purple-300',
    green: 'text-emerald-400 group-hover:text-emerald-300',
  }

  const content = (
    <div className="bg-stone-900 border border-stone-800 hover:border-stone-700 p-5 rounded-xl transition-all shadow-lg group relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-stone-400 text-xs font-bold tracking-wider uppercase">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-stone-950 border border-stone-800 flex items-center justify-center text-stone-400 group-hover:text-stone-200">
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className={`text-3xl font-extrabold mb-1 tracking-tight ${accentStyles[accent]}`}>{value}</p>
      {sub && <p className="text-stone-500 text-xs">{sub}</p>}
    </div>
  )

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  )
}
