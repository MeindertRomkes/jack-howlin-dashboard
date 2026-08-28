'use client'
import type { Post } from '@/types'
import { Timestamp } from 'firebase/firestore'

const PLATFORM_ICONS: Record<string, string> = {
  youtube: '🎵',
  instagram: '📸',
  tiktok: '🎬',
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
    const d = (post.scheduledAt as Timestamp).toDate()
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
    <div className="border border-stone-700">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-stone-700">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div
            key={d}
            className="px-2 py-2 text-xs text-stone-500 tracking-wider uppercase text-center border-r last:border-r-0 border-stone-700"
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
              className="min-h-[80px] p-2 border-b border-r last:border-r-0 border-stone-700 bg-stone-800"
            >
              {day !== null && (
                <>
                  <span
                    className={`text-xs ${
                      isToday ? 'text-amber-400 font-bold' : 'text-stone-400'
                    }`}
                  >
                    {day}
                  </span>
                  {(postsByDay[day] ?? []).map((post, j) => (
                    <div
                      key={j}
                      className="mt-1 text-xs bg-stone-700 px-1 py-0.5 truncate rounded"
                    >
                      {post.platforms.map(p => PLATFORM_ICONS[p] ?? '').join('')}{' '}
                      <span className="text-stone-400">
                        {post.caption.substring(0, 18)}…
                      </span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
