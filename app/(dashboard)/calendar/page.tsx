'use client'
import { useEffect, useState } from 'react'
import { getScheduledPosts } from '@/lib/firestore'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import PostModal from '@/components/calendar/PostModal'
import type { Post } from '@/types'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles } from 'lucide-react'

const MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
]

export default function CalendarPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [posts, setPosts] = useState<Post[]>([])
  const [showModal, setShowModal] = useState(false)

  async function loadPosts() {
    const loaded = await getScheduledPosts()
    setPosts(loaded)
  }

  useEffect(() => {
    loadPosts().catch(console.error)
  }, [])

  function prevMonth() {
    if (month === 0) {
      setYear(y => y - 1)
      setMonth(11)
    } else {
      setMonth(m => m - 1)
    }
  }

  function nextMonth() {
    if (month === 11) {
      setYear(y => y + 1)
      setMonth(0)
    } else {
      setMonth(m => m + 1)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation & New Post button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 border border-stone-800 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarIcon className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-extrabold tracking-wider uppercase text-stone-100">
              Content Kalender
            </h1>
          </div>
          <p className="text-stone-400 text-xs">
            Multi-channel geplande en gepubliceerde posts
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month picker */}
          <div className="flex items-center bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 shadow-inner">
            <button
              onClick={prevMonth}
              className="p-1 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded transition-colors"
              title="Vorige maand"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-stone-200 text-xs font-bold tracking-wider uppercase px-3 min-w-[140px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded transition-colors"
              title="Volgende maand"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* New Post Button with AI Highlight */}
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold px-4 py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-amber-500/20 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Nieuwe Post</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <CalendarGrid posts={posts} year={year} month={month} />

      {/* Post Modal */}
      {showModal && (
        <PostModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            loadPosts().catch(console.error)
          }}
        />
      )}
    </div>
  )
}
