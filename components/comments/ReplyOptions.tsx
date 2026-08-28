'use client'
import { useState } from 'react'

interface ReplyOptionsProps {
  generatedReplies: string[]
  onSelect: (reply: string) => void
  disabled?: boolean
}

export default function ReplyOptions({
  generatedReplies,
  onSelect,
  disabled,
}: ReplyOptionsProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const [custom, setCustom] = useState('')
  const [useCustom, setUseCustom] = useState(false)

  function handleSelect(reply: string) {
    setSelected(reply)
    setUseCustom(false)
    onSelect(reply)
  }

  function handleCustomChange(val: string) {
    setCustom(val)
    setSelected(null)
    setUseCustom(true)
    onSelect(val)
  }

  return (
    <div className="space-y-2 mt-3">
      {generatedReplies.map((reply, i) => (
        <button
          key={i}
          onClick={() => handleSelect(reply)}
          disabled={disabled}
          className={`w-full text-left px-4 py-3 border text-sm transition-colors ${
            selected === reply
              ? 'border-amber-500 bg-amber-950 text-amber-100'
              : 'border-stone-700 bg-stone-800 text-stone-300 hover:border-stone-500'
          }`}
        >
          {reply}
        </button>
      ))}
      <div
        className={`border px-4 py-2 transition-colors ${
          useCustom
            ? 'border-amber-500 bg-amber-950'
            : 'border-stone-700 bg-stone-800'
        }`}
      >
        <input
          type="text"
          placeholder="Write your own reply..."
          value={custom}
          onChange={e => handleCustomChange(e.target.value)}
          disabled={disabled}
          className="w-full bg-transparent text-sm text-stone-300 placeholder-stone-600 outline-none"
        />
      </div>
    </div>
  )
}
