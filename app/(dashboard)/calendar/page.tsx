'use client'
import { useEffect, useState } from 'react'
import { getScheduledPosts } from '@/lib/firestore'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import PostModal from '@/components/calendar/PostModal'
import type { Post } from '@/types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
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
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-wider uppercase text-stone-100">
            Calendar
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <button
              onClick={prevMonth}
              className="text-stone-500 hover:text-stone-300 transition-colors"
            >
              ←
            </button>
            <span className="text-stone-300 text-sm tracking-wider uppercase">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="text-stone-500 hover:text-stone-300 transition-colors"
            >
              →
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-700 hover:bg-amber-600 text-stone-100 px-5 py-2 text-xs tracking-widest uppercase transition-colors"
        >
          + New Post
        </button>
      </div>

      <CalendarGrid posts={posts} year={year} month={month} />

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
