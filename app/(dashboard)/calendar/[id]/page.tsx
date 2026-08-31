'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CalendarPostRedirectPage({
  params,
}: {
  params: { id: string }
}) {
  const router = useRouter()
  const id = params?.id

  useEffect(() => {
    if (id) {
      router.replace(`/calendar?postId=${id}`)
    } else {
      router.replace('/calendar')
    }
  }, [id, router])

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-stone-400 text-sm">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span>Post details laden...</span>
      </div>
    </div>
  )
}
