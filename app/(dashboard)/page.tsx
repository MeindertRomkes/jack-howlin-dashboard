'use client'
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Post, Platform } from '@/types'
import {
  MessageSquare,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Flame,
  Layers,
} from 'lucide-react'

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
  const [stats, setStats] = useState({ newComments: 0, scheduledPosts: 0, postedToday: 0 })
  const [upcoming, setUpcoming] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const now = Timestamp.now()
      const todayStart = Timestamp.fromDate(new Date(new Date().setHours(0, 0, 0, 0)))

      const [commentsSnap, scheduledSnap, postedSnap, upcomingSnap] = await Promise.all([
        getDocs(query(collection(db, 'comments'), where('status', '==', 'new'))),
        getDocs(query(collection(db, 'posts'), where('status', '==', 'scheduled'))),
        getDocs(query(collection(db, 'posts'), where('status', '==', 'posted'), where('scheduledAt', '>=', todayStart))),
        getDocs(query(collection(db, 'posts'), where('status', '==', 'scheduled'), where('scheduledAt', '>=', now), orderBy('scheduledAt', 'asc'), limit(5))),
      ])

      setStats({
        newComments: commentsSnap.size,
        scheduledPosts: scheduledSnap.size,
        postedToday: postedSnap.size,
      })

      setUpcoming(upcomingSnap.docs.map(d => ({ id: d.id, ...d.data() } as Post)))
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-8">
      {/* Title section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-wider uppercase text-stone-100 flex items-center gap-2.5">
            <Flame className="w-6 h-6 text-amber-500" />
            Dashboard Overview
          </h1>
          <p className="text-stone-400 text-xs mt-1">
            Jack Howlin&apos; Social Media Command & Automation Studio
          </p>
        </div>

        <a
          href="/calendar"
          className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold px-4 py-2 rounded-lg text-xs tracking-wider uppercase transition-all shadow-md self-start sm:self-auto"
        >
          <Sparkles className="w-4 h-4" />
          <span>Nieuwe Post</span>
        </a>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={MessageSquare}
          label="Nieuwe Comments"
          value={loading ? '—' : String(stats.newComments)}
          sub="Te beantwoorden met AI"
          href="/comments"
          accent="amber"
        />
        <StatCard
          icon={Calendar}
          label="Ingeplande Posts"
          value={loading ? '—' : String(stats.scheduledPosts)}
          sub="Klaar voor automatisering"
          href="/calendar"
          accent="cyan"
        />
        <StatCard
          icon={CheckCircle2}
          label="Gepost Vandaag"
          value={loading ? '—' : String(stats.postedToday)}
          sub="Op alle verbonden platforms"
          accent="green"
        />
      </div>

      {/* Upcoming Posts Section */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold tracking-widest uppercase text-stone-300">
              Eerstvolgende Geplande Posts
            </h2>
          </div>
          <a
            href="/calendar"
            className="text-xs text-amber-500 hover:text-amber-400 flex items-center gap-1 font-semibold"
          >
            Bekijk kalender <ArrowRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {loading && (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="bg-stone-950 border border-stone-800/80 rounded-lg h-16 animate-pulse" />
            ))}
          </div>
        )}

        {!loading && upcoming.length === 0 && (
          <div className="bg-stone-950 border border-stone-800 rounded-lg p-8 text-center">
            <Calendar className="w-8 h-8 text-stone-600 mx-auto mb-2" />
            <p className="text-stone-400 text-sm font-medium">Geen posts ingepland voor de komende dagen.</p>
            <a
              href="/calendar"
              className="text-amber-500 text-xs font-bold hover:underline mt-2 inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" /> Plan nu een post met AI
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
              <div
                key={post.id}
                className="bg-stone-950 border border-stone-800 hover:border-stone-700 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-stone-200 text-sm font-semibold truncate">
                    {post.title || post.caption || 'Geen titel'}
                  </p>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {post.platforms.map(p => {
                      const Icon = PLATFORM_ICONS[p]
                      const color = PLATFORM_COLORS[p]
                      return (
                        <span
                          key={p}
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${color.bg} ${color.border} ${color.text}`}
                        >
                          <Icon className="w-3 h-3" />
                          {p}
                        </span>
                      )
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-2 text-stone-400 text-xs font-semibold bg-stone-900 border border-stone-800 px-3 py-1.5 rounded-lg self-start sm:self-auto">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })} om{' '}
                    {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Platform Status Section with Real Vector Badges */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-bold tracking-widest uppercase text-stone-300">
            Verbonden Kanalen & API Status
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'youtube' as Platform, label: 'YouTube', status: 'Actief', sub: 'Data API v3' },
            { key: 'instagram' as Platform, label: 'Instagram', status: 'Actief', sub: 'Creator Graph API' },
            { key: 'facebook' as Platform, label: 'Facebook', status: 'Actief', sub: 'Page Access Token' },
            { key: 'tiktok' as Platform, label: 'TikTok', status: 'Review pending', sub: 'Content Posting API' },
          ].map(({ key, label, status, sub }) => {
            const Icon = PLATFORM_ICONS[key]
            const color = PLATFORM_COLORS[key]
            const isConnected = status === 'Actief'

            return (
              <div
                key={key}
                className="bg-stone-950 border border-stone-800/80 rounded-xl p-3.5 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${color.bg} ${color.text} border ${color.border}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-stone-200 block">{label}</span>
                      <span className="text-[10px] text-stone-500 block">{sub}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-stone-800/60 flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isConnected ? 'bg-green-500 shadow-sm shadow-green-500/50' : 'bg-amber-500'
                    }`}
                  />
                  <span
                    className={`text-[11px] font-semibold ${
                      isConnected ? 'text-green-400' : 'text-amber-400'
                    }`}
                  >
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
  icon: (props: { className?: string }) => JSX.Element
  label: string
  value: string
  sub?: string
  href?: string
  accent: 'amber' | 'cyan' | 'green'
}) {
  const accentStyles = {
    amber: 'text-amber-500 group-hover:text-amber-400',
    cyan: 'text-cyan-400 group-hover:text-cyan-300',
    green: 'text-green-400 group-hover:text-green-300',
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
    <a href={href} className="block">
      {content}
    </a>
  ) : (
    content
  )
}
