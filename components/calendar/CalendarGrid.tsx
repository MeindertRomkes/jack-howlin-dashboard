'use client'
import type { Post } from '@/types'
import { Timestamp } from 'firebase/firestore'
import { Clapperboard } from 'lucide-react'

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'bg-red-500/20 text-red-300 border-red-500/30',
  instagram: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
  tiktok: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  facebook: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
}

interface CalendarGridProps {
  posts: Post[]
  year: number
  month: number
  onGenerateVisual?: (postId: string) => void
}

// Robust helper to parse Firestore Timestamp / String / Object into JavaScript Date
function parsePostDate(scheduledAt: unknown): Date | null {
  if (!scheduledAt) return null
  if (scheduledAt instanceof Date) return scheduledAt
  if (scheduledAt instanceof Timestamp) return scheduledAt.toDate()
  if (
    typeof scheduledAt === 'object' &&
    scheduledAt !== null &&
    'toDate' in scheduledAt &&
    typeof (scheduledAt as { toDate: () => Date }).toDate === 'function'
  ) {
    return (scheduledAt as { toDate: () => Date }).toDate()
  }
  if (
    typeof scheduledAt === 'object' &&
    scheduledAt !== null &&
    'seconds' in scheduledAt &&
    typeof (scheduledAt as { seconds: number }).seconds === 'number'
  ) {
    return new Date((scheduledAt as { seconds: number }).seconds * 1000)
  }
  if (typeof scheduledAt === 'string' || typeof scheduledAt === 'number') {
    const d = new Date(scheduledAt)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

export default function CalendarGrid({ posts = [], year, month, onGenerateVisual }: CalendarGridProps) {
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Monday-first: Sunday (0) becomes 6, Mon-Sat become 0-5
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const postsByDay: Record<number, Post[]> = {}
  for (const post of posts) {
    const d = parsePostDate(post.scheduledAt)
    if (!d) continue

    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate()
      if (!postsByDay[day]) postsByDay[day] = []
      postsByDay[day].push(post)
    }
  }

  const cells: (number | null)[] = [
    ...Array<null>(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const today = new Date()

  return (
    <div className="border border-stone-800 rounded-xl overflow-hidden shadow-xl bg-stone-900">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-stone-800 bg-stone-950/60">
        {['Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag', 'Zondag'].map(d => (
          <div
            key={d}
            className="px-2 py-3 text-[11px] font-bold text-stone-400 tracking-wider uppercase text-center border-r last:border-r-0 border-stone-800"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7">
        {cells.map((day, i) => {
          const isToday =
            day !== null &&
            today.getFullYear() === year &&
            today.getMonth() === month &&
            today.getDate() === day

          return (
            <div
              key={i}
              className={`min-h-[115px] p-2 border-b border-r last:border-r-0 border-stone-800 transition-colors ${
                day !== null ? 'bg-stone-900/60 hover:bg-stone-900/90' : 'bg-stone-950/30'
              }`}
            >
              {day !== null && (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-semibold rounded-md px-1.5 py-0.5 ${
                        isToday
                          ? 'bg-amber-600 text-stone-950 font-bold'
                          : 'text-stone-400'
                      }`}
                    >
                      {day}
                    </span>
                    {postsByDay[day]?.length ? (
                      <span className="text-[10px] text-amber-500 font-bold">
                        {postsByDay[day].length} post{postsByDay[day].length > 1 ? 's' : ''}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    {(postsByDay[day] ?? []).map((post, j) => {
                      const platformList = Array.isArray(post.platforms) && post.platforms.length > 0
                        ? post.platforms
                        : ['youtube']

                      return (
                        <div
                          key={post.id || j}
                          className="text-[11px] bg-stone-950 border border-stone-800/80 p-1.5 rounded-lg shadow-sm group hover:border-stone-700 transition-all"
                        >
                          <div className="flex items-center gap-1 mb-1 flex-wrap">
                            {platformList.map(p => (
                              <span
                                key={p}
                                className={`text-[11px] px-1.5 py-0.5 rounded font-bold uppercase border ${
                                  PLATFORM_COLORS[p] ?? 'bg-stone-800 text-stone-400 border-stone-700'
                                }`}
                              >
                                {{ youtube: 'YT', instagram: 'IG', tiktok: 'TT', facebook: 'FB' }[p] ?? p.slice(0, 2).toUpperCase()}
                              </span>
                            ))}
                            {post.status && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-extrabold ${
                                post.status === 'posted'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                  : post.status === 'failed'
                                  ? 'bg-red-950 text-red-400 border border-red-800/60'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800/60'
                              }`}>
                                {post.status}
                              </span>
                            )}
                          </div>
                          <p className="text-stone-300 truncate font-medium">
                            {post.title || post.caption || 'Ingeplande post'}
                          </p>
                          {onGenerateVisual && post.id && (
                            <button
                              onClick={() => onGenerateVisual(post.id!)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-amber-600/10 border border-amber-500/30 text-amber-400 hover:bg-amber-600/20 transition-colors mt-1.5 w-full"
                            >
                              <Clapperboard className="w-3.5 h-3.5" />
                              Visual genereren
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
