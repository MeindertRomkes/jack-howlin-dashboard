'use client'

import { useEffect, useState, useMemo } from 'react'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { SunoTrack, AudioSnippet } from '@/types'
import { Music, Scissors, Sparkles, Check } from 'lucide-react'

export interface Props {
  value: string // selected trackId
  onChange: (trackId: string) => void
  selectedSnippetId?: string
  onSnippetChange?: (snippet: AudioSnippet | null) => void
  onOpenSnipper?: (track: SunoTrack) => void
  initialTrackTitle?: string
}

export default function SunoTrackSelector({
  value,
  onChange,
  selectedSnippetId,
  onSnippetChange,
  onOpenSnipper,
  initialTrackTitle,
}: Props) {
  const [tracks, setTracks] = useState<SunoTrack[]>([])

  useEffect(() => {
    const q = query(collection(db, 'suno_tracks'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setTracks(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as SunoTrack))
    })
  }, [])

  // Auto-match track by initialTrackTitle when tracks load and value is not yet set
  useEffect(() => {
    if (initialTrackTitle && !value && tracks.length > 0) {
      const match = tracks.find(
        (t) =>
          t.name.toLowerCase() === initialTrackTitle.toLowerCase() ||
          t.name.toLowerCase().includes(initialTrackTitle.toLowerCase()) ||
          initialTrackTitle.toLowerCase().includes(t.name.toLowerCase())
      )
      if (match) {
        onChange(match.id)
      }
    }
  }, [initialTrackTitle, value, tracks, onChange])

  const selectedTrack = useMemo(() => {
    return tracks.find((t) => t.id === value) || null
  }, [tracks, value])

  const selectedSnippet = useMemo(() => {
    if (!selectedTrack?.snippets || !selectedSnippetId) return null
    return selectedTrack.snippets.find((s) => s.id === selectedSnippetId) || null
  }, [selectedTrack, selectedSnippetId])

  const handleTrackChange = (newTrackId: string) => {
    onChange(newTrackId)
    if (onSnippetChange) {
      onSnippetChange(null)
    }
  }

  const handleSnippetToggle = (snippet: AudioSnippet) => {
    if (!onSnippetChange) return
    if (selectedSnippetId === snippet.id) {
      onSnippetChange(null)
    } else {
      onSnippetChange(snippet)
    }
  }

  return (
    <div className="space-y-2.5">
      {/* Header with track label and Snippet Knippen button */}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-1.5 text-xs text-stone-400 font-medium">
          <Music className="w-3.5 h-3.5 text-amber-500/70" />
          <span>Suno Track (Audio Bron)</span>
        </label>
        {selectedTrack && onOpenSnipper && (
          <button
            type="button"
            onClick={() => onOpenSnipper(selectedTrack)}
            className="flex items-center gap-1 text-[11px] font-medium text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded transition-all active:scale-95"
            title="Knip een nieuw audio snippet uit deze track"
          >
            <Scissors className="w-3 h-3" />
            <span>Snippet knippen</span>
          </button>
        )}
      </div>

      {/* Track Selection Dropdown */}
      <select
        value={value}
        onChange={(e) => handleTrackChange(e.target.value)}
        className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60 appearance-none"
      >
        <option value="">Geen track — AI genereert audio</option>
        {tracks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
            {t.durationSeconds ? ` (${Math.round(t.durationSeconds)}s)` : ''}
            {t.snippets && t.snippets.length > 0 ? ` • ${t.snippets.length} snippet${t.snippets.length > 1 ? 's' : ''}` : ''}
          </option>
        ))}
      </select>

      {/* Snippet Selector (When track is selected) */}
      {selectedTrack && (
        <div className="space-y-2 pt-1 border-t border-stone-800/60">
          {selectedTrack.snippets && selectedTrack.snippets.length > 0 ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-stone-400">
                <span className="flex items-center gap-1 font-medium text-stone-300">
                  <Scissors className="w-3 h-3 text-amber-400" />
                  Kies Snippet ({selectedTrack.snippets.length}):
                </span>
                {selectedSnippet && onSnippetChange && (
                  <button
                    type="button"
                    onClick={() => onSnippetChange(null)}
                    className="text-stone-400 hover:text-amber-400 text-[10px] transition-colors"
                  >
                    Volledige track gebruiken
                  </button>
                )}
              </div>

              {/* Pill Tags */}
              <div className="flex flex-wrap gap-1.5">
                {selectedTrack.snippets.map((snip) => {
                  const isSelected = selectedSnippetId === snip.id
                  return (
                    <button
                      key={snip.id}
                      type="button"
                      onClick={() => handleSnippetToggle(snip)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border border-amber-500 text-amber-300 font-medium shadow-sm ring-1 ring-amber-500/30'
                          : 'bg-stone-900/90 border border-stone-700/80 hover:border-stone-600 text-stone-300'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3 h-3 text-amber-400" />
                      ) : (
                        <Scissors className="w-3 h-3 text-stone-400" />
                      )}
                      <span>{snip.name}</span>
                      <span className="text-[10px] opacity-75 font-mono">({snip.duration.toFixed(1)}s)</span>
                    </button>
                  )
                })}
              </div>

              {/* Highlight Lyric Preview */}
              {selectedSnippet?.highlightLyric && (
                <div className="text-[11px] text-amber-300/90 italic flex items-center gap-1.5 bg-amber-950/20 px-2.5 py-1.5 rounded-lg border border-amber-500/30">
                  <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                  <span>♫ &ldquo;{selectedSnippet.highlightLyric}&rdquo;</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-stone-400 bg-stone-950/50 px-3 py-2 rounded-lg border border-stone-800/80">
              <span>Nog geen snippets opgeslagen voor deze track.</span>
              {onOpenSnipper && (
                <button
                  type="button"
                  onClick={() => onOpenSnipper(selectedTrack)}
                  className="text-amber-400 hover:text-amber-300 font-medium underline transition-colors"
                >
                  Knip eerste snippet
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
