'use client'
import type { Post } from '@/types'
import { Timestamp } from 'firebase/firestore'

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
}

export default function CalendarGrid({ posts, year, month }: CalendarGridProps) {
  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // Monday-first: Sunday (0) becomes 6, Mon-Sat become 0-5
  const offset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1

  const postsByDay: Record<number, Post[]> = {}
  for (const post of posts) {
    if (!post.scheduledAt) continue
    const d =
      post.scheduledAt instanceof Timestamp
        ? post.scheduledAt.toDate()
        : new Date(post.scheduledAt as string)

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
              className={`min-h-[105px] p-2 border-b border-r last:border-r-0 border-stone-800 transition-colors ${
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

                  <div className="space-y-1">
                    {(postsByDay[day] ?? []).map((post, j) => (
                      <div
                        key={j}
                        className="text-[11px] bg-stone-950 border border-stone-800/80 p-1.5 rounded-lg shadow-sm group hover:border-stone-700 transition-all"
                      >
                        <div className="flex items-center gap-1 mb-1">
                          {post.platforms.map(p => (
                            <span
                              key={p}
                              className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase border ${
                                PLATFORM_COLORS[p] ?? 'bg-stone-800 text-stone-400'
                              }`}
                            >
                              {p.slice(0, 2)}
                            </span>
                          ))}
                        </div>
                        <p className="text-stone-300 truncate font-medium">
                          {post.title || post.caption || 'Ingeplande post'}
                        </p>
                      </div>
                    ))}
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
