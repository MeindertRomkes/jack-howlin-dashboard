'use client'
import { useEffect, useState } from 'react'
import { getAllComments } from '@/lib/firestore'
import CommentCard from '@/components/comments/CommentCard'
import type { Comment, Platform, SyncState } from '@/types'
import {
  MessageSquare,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Inbox,
  CheckCheck,
  ListFilter,
} from 'lucide-react'

// Authentic brand vector icons
const PLATFORM_ICONS: Record<Platform | 'all', (props: { className?: string }) => JSX.Element> = {
  all: ({ className = 'w-3.5 h-3.5' }) => (
    <MessageSquare className={className} />
  ),
  youtube: ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  ),
  instagram: ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  ),
  tiktok: ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  ),
  facebook: ({ className = 'w-3.5 h-3.5' }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  ),
}

const PLATFORM_FILTERS: { key: Platform | 'all'; label: string }[] = [
  { key: 'all', label: 'Alle Kanalen' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
]

type StatusTab = 'unreplied' | 'replied' | 'all'

export default function CommentsPage() {
  const [comments, setComments] = useState<Comment[]>([])
  const [syncState, setSyncState] = useState<SyncState | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const [platformFilter, setPlatformFilter] = useState<Platform | 'all'>('all')
  const [statusTab, setStatusTab] = useState<StatusTab>('unreplied')

  async function loadComments() {
    try {
      const [commentsData, syncData] = await Promise.all([
        getAllComments(100),
        import('@/lib/firestore').then(m => m.getSyncState())
      ])
      setComments(commentsData)
      setSyncState(syncData)
    } catch (err) {
      console.error('Error fetching comments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadComments()
  }, [])

  // Manual Trigger: Fetch comments from all platforms now
  async function handleManualSync() {
    setSyncing(true)
    setSyncMessage(null)
    try {
      const res = await fetch('/api/comments/sync', { method: 'POST' })
      const data = await res.json()

      // Reload local comments from Firestore
      await loadComments()

      if (res.ok) {
        setSyncMessage({
          text: '✅ Nieuwste comments, likes & antwoorden succesvol gesynchroniseerd!',
          type: 'success',
        })
      } else {
        setSyncMessage({
          text: data.error ? `Let op: ${data.error}` : 'Synchronisatie voltooid met waarschuwing.',
          type: 'error',
        })
      }
    } catch {
      setSyncMessage({
        text: 'Kon comments niet ophalen. Probeer het over een ogenblik opnieuw.',
        type: 'error',
      })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMessage(null), 5000)
    }
  }

  // Filter logic
  const filteredByPlatform =
    platformFilter === 'all'
      ? comments
      : comments.filter(c => c.platform === platformFilter)

  const filtered = filteredByPlatform.filter(c => {
    const isReplied = c.isRepliedByCreator || c.status === 'replied'
    if (statusTab === 'unreplied') return !isReplied && c.status !== 'ignored'
    if (statusTab === 'replied') return isReplied
    return c.status !== 'ignored' // 'all' tab
  })

  // Counters
  const unrepliedCount = comments.filter(
    c => !c.isRepliedByCreator && c.status === 'new'
  ).length

  const repliedCount = comments.filter(
    c => c.isRepliedByCreator || c.status === 'replied'
  ).length

  return (
    <div className="space-y-6">
      {/* ───────────────────────────────────────────────────────── */}
      {/* HEADER SECTION                                            */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-extrabold tracking-wider uppercase text-stone-100">
              Comments Inbox & Engagement
            </h1>
          </div>
          <div className="text-stone-400 text-xs flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              {loading ? (
                'Laden...'
              ) : (
                <>
                  <span className="text-amber-400 font-bold">{unrepliedCount}</span> nog te beantwoorden ·{' '}
                  <span className="text-emerald-400 font-bold">{repliedCount}</span> beantwoord
                </>
              )}
            </span>

            {syncState?.lastSyncAt && (
              <span className="text-[11px] text-stone-500 bg-stone-950 px-2 py-0.5 rounded border border-stone-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Laatste sync:{' '}
                {syncState.lastSyncAt.toDate
                  ? syncState.lastSyncAt.toDate().toLocaleTimeString('nl-NL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : 'Recent'}
              </span>
            )}
          </div>
        </div>

        {/* Manual Refresh Button */}
        <button
          onClick={handleManualSync}
          disabled={syncing}
          className="bg-stone-800 hover:bg-stone-700 disabled:opacity-50 text-stone-200 border border-stone-700/80 hover:border-amber-500/60 font-semibold px-4 py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all shadow flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <RefreshCw className={`w-4 h-4 text-amber-500 ${syncing ? 'animate-spin' : ''}`} />
          <span>{syncing ? 'Bezig met ophalen...' : 'Nu Ophalen / Synchroniseren'}</span>
        </button>
      </div>

      {/* Sync feedback notification */}
      {syncMessage && (
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-center gap-2.5 animate-fadeIn ${
            syncMessage.type === 'success'
              ? 'bg-green-950/40 border-green-800 text-green-300'
              : 'bg-amber-950/40 border-amber-800 text-amber-300'
          }`}
        >
          {syncMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
          )}
          <span>{syncMessage.text}</span>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────── */}
      {/* STATUS TABS (Te Beantwoorden vs Al Beantwoord vs Alles)   */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 border-b border-stone-800 pb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusTab('unreplied')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
              statusTab === 'unreplied'
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md'
                : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Te Beantwoorden</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                statusTab === 'unreplied' ? 'bg-stone-950 text-amber-400' : 'bg-stone-800 text-stone-300'
              }`}
            >
              {unrepliedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusTab('replied')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
              statusTab === 'replied'
                ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Al Beantwoord</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                statusTab === 'replied' ? 'bg-emerald-950 text-emerald-300' : 'bg-stone-800 text-stone-300'
              }`}
            >
              {repliedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusTab('all')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all border ${
              statusTab === 'all'
                ? 'bg-stone-700 text-stone-100 border-stone-600 shadow-md'
                : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-stone-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Alle Reacties</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-extrabold bg-stone-800 text-stone-300">
              {comments.filter(c => c.status !== 'ignored').length}
            </span>
          </button>
        </div>

        {/* Platform filter tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {PLATFORM_FILTERS.map(({ key, label }) => {
            const Icon = PLATFORM_ICONS[key]
            const isSelected = platformFilter === key

            return (
              <button
                key={key}
                onClick={() => setPlatformFilter(key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider uppercase border transition-all ${
                  isSelected
                    ? 'bg-stone-800 border-amber-500 text-amber-300 shadow-sm'
                    : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200 hover:border-stone-700'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* COMMENT LIST CARDS                                        */}
      {/* ───────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(n => (
            <div
              key={n}
              className="bg-stone-900 border border-stone-800 rounded-xl p-6 h-40 animate-pulse"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-xl p-12 text-center shadow-lg">
          <CheckCircle2 className="w-12 h-12 text-amber-500/60 mx-auto mb-3" />
          <h2 className="text-base font-bold text-stone-200 mb-1">
            {statusTab === 'unreplied'
              ? 'Alles bijgewerkt!'
              : 'Geen reacties gevonden in deze weergave'}
          </h2>
          <p className="text-stone-500 text-xs max-w-sm mx-auto">
            {statusTab === 'unreplied'
              ? 'Er zijn momenteel geen onbeantwoorde reacties. Klik op "Nu Ophalen" om de nieuwste activiteit van YouTube en Instagram op te halen.'
              : 'Probeer een ander platformfilter of statusfilter te kiezen.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(comment => (
            <CommentCard
              key={comment.id}
              comment={comment}
              onReplied={id => {
                setComments(prev =>
                  prev.map(c => (c.id === id ? { ...c, status: 'replied' as const, isRepliedByCreator: true } : c))
                )
              }}
              onIgnored={id => {
                setComments(prev =>
                  prev.map(c => (c.id === id ? { ...c, status: 'ignored' as const } : c))
                )
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
