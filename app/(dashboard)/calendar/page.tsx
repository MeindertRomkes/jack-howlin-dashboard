'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { getScheduledPosts } from '@/lib/firestore'
import { db } from '@/lib/firebase'
import { updateDoc, doc, getDoc } from 'firebase/firestore'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import PostModal from '@/components/calendar/PostModal'
import ReleaseCampaignModal from '@/components/calendar/ReleaseCampaignModal'
import MerchBatchModal from '@/components/merch/MerchBatchModal'
import GenerateModal from '@/components/studio/GenerateModal'
import type { Post } from '@/types'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Flame, ShoppingBag, Plus } from 'lucide-react'

const MONTHS = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December',
]

function CalendarPageInner() {
  const now = new Date()
  const searchParams = useSearchParams()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [showCampaignModal, setShowCampaignModal] = useState(false)
  const [showMerchModal, setShowMerchModal] = useState(false)
  const [generateModalPostId, setGenerateModalPostId] = useState<string | null>(null)

  async function loadPosts() {
    setLoading(true)
    try {
      const loaded = await getScheduledPosts()
      setPosts(loaded)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPosts().catch(console.error)
  }, [])

  // Open modals or select post via query params
  useEffect(() => {
    if (searchParams.get('openCampaign') === 'true') {
      setShowCampaignModal(true)
    }
    if (searchParams.get('newPost') === 'true') {
      setShowModal(true)
    }
    const postIdParam = searchParams.get('postId')
    if (postIdParam) {
      if (posts.length > 0) {
        const found = posts.find(p => p.id === postIdParam)
        if (found) {
          setSelectedPost(found)
          return
        }
      }
      // If not in state yet, fetch directly from Firestore
      getDoc(doc(db, 'posts', postIdParam)).then(snap => {
        if (snap.exists()) {
          setSelectedPost({ id: snap.id, ...snap.data() } as Post)
        }
      }).catch(console.error)
    }
  }, [searchParams, posts])

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

  function handleSelectPost(post: Post) {
    setSelectedPost(post)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      url.searchParams.set('postId', post.id || '')
      window.history.replaceState({}, '', url.pathname + '?' + url.searchParams.toString())
    }
  }

  function handleCloseSelectedPost() {
    setSelectedPost(null)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.has('postId')) {
        url.searchParams.delete('postId')
        const newSearch = url.searchParams.toString()
        window.history.replaceState({}, '', url.pathname + (newSearch ? '?' + newSearch : ''))
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Navigation & Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-stone-900 border border-stone-800 p-5 rounded-xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CalendarIcon className="w-5 h-5 text-amber-500" />
            <h1 className="text-xl font-extrabold tracking-wider uppercase text-stone-100">
              Content Kalender &amp; Release Planner
            </h1>
          </div>
          <p className="text-stone-400 text-xs">
            Multi-channel geplande en gepubliceerde posts (YouTube, Instagram, Facebook, TikTok)
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Month picker */}
          <div className="flex items-center bg-stone-950 border border-stone-800 rounded-lg px-2 py-1.5 shadow-inner">
            <button
              onClick={prevMonth}
              className="p-1 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded transition-colors"
              aria-label="Vorige maand"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-stone-200 text-xs font-bold tracking-wider uppercase px-3 min-w-[140px] text-center">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="p-1 text-stone-400 hover:text-stone-100 hover:bg-stone-800 rounded transition-colors"
              aria-label="Volgende maand"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Merch Batch Machine Button */}
          <button
            onClick={() => setShowMerchModal(true)}
            className="bg-stone-950 border border-amber-500/40 hover:bg-amber-500/10 text-amber-300 font-bold px-3.5 py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all flex items-center gap-2 shadow-sm"
          >
            <ShoppingBag className="w-4 h-4 text-amber-400" />
            <span>Merch AI Batch</span>
          </button>

          {/* Release Campaign Planner Button */}
          <button
            onClick={() => setShowCampaignModal(true)}
            className="bg-stone-950 border border-amber-500/50 hover:bg-amber-500/10 text-amber-400 font-bold px-3.5 py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all flex items-center gap-2 shadow-sm"
          >
            <Flame className="w-4 h-4 text-amber-500" />
            <span>Song Launchpad (14-Dagen)</span>
          </button>

          {/* New Post Button */}
          <button
            onClick={() => setShowModal(true)}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold px-4 py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all shadow-md hover:shadow-amber-500/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Nieuwe Post</span>
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-stone-900 border border-stone-800 rounded-xl p-5 shadow-lg">
        {loading ? (
          <div className="space-y-3">
            {/* Day headers skeleton */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-8 bg-stone-800 rounded animate-pulse" />
              ))}
            </div>
            {/* Calendar cells skeleton */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} className="h-24 bg-stone-800/60 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <CalendarGrid
            year={year}
            month={month}
            posts={posts}
            onGenerateVisual={setGenerateModalPostId}
            onSelectPost={handleSelectPost}
          />
        )}
      </div>

      {/* New Post Modal */}
      {showModal && (
        <PostModal
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false)
            loadPosts().catch(console.error)
          }}
        />
      )}

      {/* Existing Post Edit/View Modal */}
      {selectedPost && (
        <PostModal
          post={selectedPost}
          onClose={handleCloseSelectedPost}
          onSaved={() => {
            handleCloseSelectedPost()
            loadPosts().catch(console.error)
          }}
        />
      )}

      {showCampaignModal && (
        <ReleaseCampaignModal
          isOpen={showCampaignModal}
          onClose={() => setShowCampaignModal(false)}
          onSaved={() => {
            setShowCampaignModal(false)
            loadPosts().catch(console.error)
          }}
        />
      )}

      {showMerchModal && (
        <MerchBatchModal
          isOpen={showMerchModal}
          onClose={() => setShowMerchModal(false)}
          onSuccess={() => {
            setShowMerchModal(false)
            loadPosts().catch(console.error)
          }}
        />
      )}

      {generateModalPostId && (() => {
        const post = posts.find(p => p.id === generateModalPostId)
        return (
          <GenerateModal
            isOpen={true}
            postId={generateModalPostId}
            caption={post?.caption ?? ''}
            onClose={() => setGenerateModalPostId(null)}
            onAssetSelected={async (url, type) => {
              try {
                await updateDoc(doc(db, 'posts', generateModalPostId), { mediaUrl: url, mediaType: type })
                await loadPosts()
              } catch (err) {
                console.error(err)
              }
              setGenerateModalPostId(null)
            }}
          />
        )
      })()}
    </div>
  )
}

export default function CalendarPage() {
  return (
    <Suspense fallback={
      <div className="space-y-6">
        <div className="h-20 bg-stone-900 border border-stone-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 bg-stone-800/60 rounded animate-pulse" />
          ))}
        </div>
      </div>
    }>
      <CalendarPageInner />
    </Suspense>
  )
}
