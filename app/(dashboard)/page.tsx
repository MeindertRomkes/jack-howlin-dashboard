'use client'
import { useEffect, useState } from 'react'
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Post } from '@/types'

const PLATFORM_ICONS: Record<string, string> = {
  youtube: '▶',
  instagram: '◈',
  tiktok: '♪',
  facebook: '◉',
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'text-red-400',
  instagram: 'text-pink-400',
  tiktok: 'text-cyan-400',
  facebook: 'text-blue-400',
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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-wider uppercase text-stone-100">Overview</h1>
        <p className="text-stone-500 text-sm tracking-wide mt-1">Jack Howlin&apos; Command Center</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <StatCard
          label="Nieuwe Comments"
          value={loading ? '—' : String(stats.newComments)}
          sub="te beantwoorden"
          href="/comments"
        />
        <StatCard
          label="Ingeplande Posts"
          value={loading ? '—' : String(stats.scheduledPosts)}
          sub="wachten op publicatie"
          href="/calendar"
        />
        <StatCard
          label="Gepost vandaag"
          value={loading ? '—' : String(stats.postedToday)}
          sub="op alle platforms"
        />
      </div>

      {/* Upcoming posts */}
      <div>
        <h2 className="text-sm font-bold tracking-widest uppercase text-stone-400 mb-3">
          Aankomende Posts
        </h2>
        {loading && (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="bg-stone-800 border border-stone-700 h-16 animate-pulse" />)}
          </div>
        )}
        {!loading && upcoming.length === 0 && (
          <div className="bg-stone-800 border border-stone-700 p-6 text-center">
            <p className="text-stone-500 text-sm">Geen ingeplande posts.</p>
            <a href="/calendar" className="text-amber-500 text-xs hover:underline mt-1 inline-block">
              Plan een post →
            </a>
          </div>
        )}
        <div className="space-y-2">
          {upcoming.map(post => {
            const date = post.scheduledAt instanceof Timestamp
              ? post.scheduledAt.toDate()
              : new Date(post.scheduledAt as string)
            return (
              <div key={post.id} className="bg-stone-800 border border-stone-700 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-stone-200 text-sm font-medium">
                    {post.title ?? post.caption?.substring(0, 60) ?? 'Post zonder tekst'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {post.platforms.map(p => (
                      <span key={p} className={`text-xs ${PLATFORM_COLORS[p] ?? 'text-stone-400'}`}>
                        {PLATFORM_ICONS[p]} {p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-4">
                  <p className="text-stone-400 text-xs">
                    {date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-stone-500 text-xs">
                    {date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Platform status */}
      <div className="mt-10">
        <h2 className="text-sm font-bold tracking-widest uppercase text-stone-400 mb-3">
          Platform Status
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { key: 'youtube', label: 'YouTube', status: 'Verbonden' },
            { key: 'instagram', label: 'Instagram', status: 'Verbonden' },
            { key: 'facebook', label: 'Facebook', status: 'Verbonden' },
            { key: 'tiktok', label: 'TikTok', status: 'Review pending' },
          ].map(({ key, label, status }) => (
            <div key={key} className="bg-stone-800 border border-stone-700 p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className={PLATFORM_COLORS[key]}>{PLATFORM_ICONS[key]}</span>
                <span className="text-stone-300 text-sm">{label}</span>
              </div>
              <p className={`text-xs ${status === 'Verbonden' ? 'text-green-500' : 'text-amber-400'}`}>
                {status === 'Verbonden' ? '● ' : '○ '}{status}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, href }: { label: string; value: string; sub?: string; href?: string }) {
  const inner = (
    <div className="bg-stone-800 border border-stone-700 p-6 hover:border-stone-500 transition-colors">
      <p className="text-stone-400 text-xs tracking-widest uppercase mb-2">{label}</p>
      <p className="text-4xl font-bold text-amber-500 mb-1">{value}</p>
      {sub && <p className="text-stone-600 text-xs">{sub}</p>}
    </div>
  )
  return href ? <a href={href}>{inner}</a> : <div>{inner}</div>
}
