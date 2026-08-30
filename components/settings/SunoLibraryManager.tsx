'use client'

import { useEffect, useState, useRef } from 'react'
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { db } from '@/lib/firebase'
import type { SunoTrack, AudioSnippet } from '@/types'
import AudioSnipper from '@/components/studio/AudioSnipper'
import {
  Upload,
  Trash2,
  Music,
  Loader2,
  AlertCircle,
  Disc3,
  Mic2,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  Volume2,
  Scissors,
  Sparkles,
  X as XIcon,
} from 'lucide-react'

// ── Time Formatter Helper ──────────────────────────────────────────────────────
export function formatTimeDisplay(sec: number): string {
  if (isNaN(sec) || sec < 0) return '0:00'
  const totalTenths = Math.round(sec * 10)
  const totalSecs = Math.floor(totalTenths / 10)
  const ms = totalTenths % 10
  const m = Math.floor(totalSecs / 60)
  const s = totalSecs % 60
  return ms > 0
    ? `${m}:${s.toString().padStart(2, '0')}.${ms}`
    : `${m}:${s.toString().padStart(2, '0')}`
}

// ── Mini Audio Player (Full Track) ─────────────────────────────────────────────
function MiniPlayer({
  track,
  onClose,
}: {
  track: SunoTrack
  onClose: () => void
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const a = audioRef.current
    if (!a) return
    a.src = track.publicUrl
    a.load()
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    return () => { a.pause() }
  }, [track.publicUrl])

  function togglePlay() {
    const a = audioRef.current
    if (!a) return
    if (playing) {
      a.pause()
      setPlaying(false)
    } else {
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
  }

  function handleTimeUpdate() {
    const a = audioRef.current
    if (!a) return
    setCurrentTime(a.currentTime)
    setProgress(a.duration ? (a.currentTime / a.duration) * 100 : 0)
  }

  function handleScrub(e: React.MouseEvent<HTMLDivElement>) {
    const a = audioRef.current
    if (!a || !a.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    a.currentTime = ratio * a.duration
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="border border-stone-800 bg-stone-950/95 backdrop-blur-md p-3.5 rounded-xl shadow-2xl space-y-2 text-stone-200">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={e => setDuration((e.target as HTMLAudioElement).duration)}
        onEnded={() => setPlaying(false)}
      />

      {/* Track info */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
          <Volume2 className="w-3.5 h-3.5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-stone-200 truncate">{track.name}</p>
          <p className="text-[10px] text-stone-500 capitalize">
            {track.releaseType} {track.albumName ? `• ${track.albumName}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={togglePlay}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-amber-500 hover:bg-amber-400 text-stone-950 transition-colors flex-shrink-0 shadow-md"
          title={playing ? 'Pauzeer track' : 'Speel track'}
          aria-label={playing ? 'Pauzeer track' : 'Speel track'}
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md text-stone-500 hover:text-stone-300 hover:bg-stone-800 transition-colors flex-shrink-0"
          title="Sluit speler"
          aria-label="Sluit speler"
        >
          <XIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-stone-500 font-mono w-8 text-right">{fmt(currentTime)}</span>
        <div
          className="flex-1 h-1.5 bg-stone-800 rounded-full cursor-pointer overflow-hidden"
          onClick={handleScrub}
        >
          <div
            className="h-full bg-amber-500 rounded-full transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-[10px] text-stone-500 font-mono w-8">{fmt(duration)}</span>
      </div>
    </div>
  )
}

// ── Track Card (Uniform component with Snippet drawer) ─────────────────────────
interface TrackCardProps {
  track: SunoTrack
  badge?: string
  badgeClass?: string
  icon?: React.ReactNode
  trackNumber?: number
  releaseYear?: number
  isFullPlaying: boolean
  onPlayFull: (t: SunoTrack) => void
  onDeleteTrack: (trackId: string) => void
  activeSnipperTrackId: string | null
  onOpenSnipper: (trackId: string) => void
  onCloseSnipper: () => void
  onSnippetSaved: (trackId: string, snippet: AudioSnippet) => void
  expandedSnippetTracks: Set<string>
  onToggleSnippets: (trackId: string) => void
  playingSnippet: { trackId: string; snippetId: string; startTime: number; endTime: number } | null
  onTogglePlaySnippet: (track: SunoTrack, snippet: AudioSnippet) => void
  onDeleteSnippet: (trackId: string, snippetId: string) => void
  deletingSnippetId: string | null
}

function TrackCard({
  track,
  badge,
  badgeClass,
  icon,
  trackNumber,
  releaseYear,
  isFullPlaying,
  onPlayFull,
  onDeleteTrack,
  activeSnipperTrackId,
  onOpenSnipper,
  onCloseSnipper,
  onSnippetSaved,
  expandedSnippetTracks,
  onToggleSnippets,
  playingSnippet,
  onTogglePlaySnippet,
  onDeleteSnippet,
  deletingSnippetId,
}: TrackCardProps) {
  const snippets = track.snippets || []
  const isSnipperOpen = activeSnipperTrackId === track.id
  const isSnippetsExpanded = expandedSnippetTracks.has(track.id) || isSnipperOpen

  return (
    <div
      className={`border rounded-xl overflow-hidden transition-all ${
        isFullPlaying
          ? 'bg-amber-500/[0.04] border-amber-500/40'
          : 'bg-stone-900/40 hover:bg-stone-900/60 border-stone-800/80'
      }`}
    >
      {/* Top Track Header Row */}
      <div className="flex items-center gap-2.5 sm:gap-3 px-3.5 py-2.5">
        {/* Track # or Leading Icon */}
        {trackNumber !== undefined ? (
          <span className="text-xs text-stone-500 font-mono w-5 text-right flex-shrink-0 font-semibold">
            {trackNumber}
          </span>
        ) : icon ? (
          <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
        ) : null}

        {/* Play / Pause Full Track Button */}
        <button
          type="button"
          onClick={() => onPlayFull(track)}
          className={`w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-all ${
            isFullPlaying
              ? 'bg-amber-500 text-stone-950 font-bold shadow-md shadow-amber-500/20'
              : 'bg-stone-800 text-stone-300 hover:bg-stone-700 hover:text-stone-100'
          }`}
          title={isFullPlaying ? 'Pauzeer hele track' : 'Speel hele track'}
          aria-label={isFullPlaying ? 'Pauzeer hele track' : 'Speel hele track'}
        >
          {isFullPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
        </button>

        {/* Track Title and Year */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm truncate font-medium ${isFullPlaying ? 'text-amber-400 font-semibold' : 'text-stone-200'}`}>
              {track.name}
            </span>
            {releaseYear && (
              <span className="text-[11px] text-stone-500 font-mono flex-shrink-0">
                {releaseYear}
              </span>
            )}
          </div>
        </div>

        {/* Badges & Snippet Count Toggle */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {badge && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass || 'text-stone-400 bg-stone-800 border-stone-700'}`}>
              {badge}
            </span>
          )}

          {/* Snippets Count Accordion Button */}
          <button
            type="button"
            onClick={() => onToggleSnippets(track.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
              snippets.length > 0
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
                : 'bg-stone-800/80 border-stone-700/60 text-stone-400 hover:text-stone-300'
            }`}
            title="Toon/verberg audio snippets"
          >
            <Scissors className="w-3 h-3 text-amber-400" />
            <span>({snippets.length} {snippets.length === 1 ? 'snippet' : 'snippets'})</span>
            {isSnippetsExpanded ? (
              <ChevronDown className="w-3 h-3 text-stone-400 ml-0.5" />
            ) : (
              <ChevronRight className="w-3 h-3 text-stone-400 ml-0.5" />
            )}
          </button>
        </div>

        {/* Action: Knip 10s Snippet & Delete Track */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => onOpenSnipper(track.id)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
              isSnipperOpen
                ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md'
                : 'bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20'
            }`}
            title="Knip een audio snippet uit deze track"
          >
            <Scissors className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Knip 10s Snippet</span>
          </button>

          <button
            type="button"
            onClick={() => onDeleteTrack(track.id)}
            className="p-1.5 rounded-lg text-stone-600 hover:text-red-400 hover:bg-red-950/30 transition-colors"
            title="Verwijder track"
            aria-label="Verwijder track"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Snippets Section */}
      {isSnippetsExpanded && (
        <div className="border-t border-stone-800 bg-stone-950/70 p-3 space-y-3">
          {/* Inline AudioSnipper Tool if open */}
          {isSnipperOpen && (
            <div className="mb-3 animate-in fade-in duration-200">
              <AudioSnipper
                track={track}
                onSnippetSaved={(newSnippet) => onSnippetSaved(track.id, newSnippet)}
                onCancel={onCloseSnipper}
              />
            </div>
          )}

          {/* List of Saved Snippets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-stone-400 px-1">
              <span className="font-semibold text-stone-300 flex items-center gap-1.5">
                <Scissors className="w-3.5 h-3.5 text-amber-400" />
                Opgeslagen Snippets ({snippets.length})
              </span>
              {!isSnipperOpen && (
                <button
                  type="button"
                  onClick={() => onOpenSnipper(track.id)}
                  className="text-[11px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                >
                  + Nieuwe snippet knippen
                </button>
              )}
            </div>

            {snippets.length === 0 ? (
              <div className="p-3.5 rounded-lg bg-stone-900/40 border border-stone-800/80 text-center space-y-2">
                <p className="text-xs text-stone-500">
                  Nog geen audio snippets geknipt voor deze track.
                </p>
                {!isSnipperOpen && (
                  <button
                    type="button"
                    onClick={() => onOpenSnipper(track.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                    Knip 10s Snippet
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5">
                {snippets.map((snippet) => {
                  const isThisSnippetPlaying =
                    playingSnippet?.trackId === track.id &&
                    playingSnippet?.snippetId === snippet.id
                  const isDeleting = deletingSnippetId === snippet.id

                  return (
                    <div
                      key={snippet.id}
                      className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-all ${
                        isThisSnippetPlaying
                          ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                          : 'bg-stone-900/60 hover:bg-stone-900 border-stone-800/80'
                      }`}
                    >
                      {/* Play/Pause Snippet Button */}
                      <button
                        type="button"
                        onClick={() => onTogglePlaySnippet(track, snippet)}
                        className={`w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-all ${
                          isThisSnippetPlaying
                            ? 'bg-amber-500 text-stone-950 font-bold shadow-md'
                            : 'bg-stone-800 text-stone-300 hover:bg-amber-500/20 hover:text-amber-300'
                        }`}
                        title={isThisSnippetPlaying ? 'Pauzeer snippet' : 'Speel snippet (loop)'}
                        aria-label={isThisSnippetPlaying ? 'Pauzeer snippet' : 'Speel snippet (loop)'}
                      >
                        {isThisSnippetPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                        )}
                      </button>

                      {/* Snippet Badge & Details */}
                      <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                        {/* Snippet Name Badge */}
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-500/30">
                          <Sparkles className="w-3 h-3 text-amber-400 flex-shrink-0" />
                          <span className="truncate max-w-[140px]">{snippet.name}</span>
                        </span>

                        {/* Duration & Time Range */}
                        <span className="text-xs text-stone-400 font-mono flex items-center gap-1 flex-shrink-0">
                          <Clock className="w-3 h-3 text-stone-500" />
                          <span>
                            {snippet.duration.toFixed(1)}s • {formatTimeDisplay(snippet.startTime)} - {formatTimeDisplay(snippet.endTime)}
                          </span>
                        </span>

                        {/* Highlight Lyric Line */}
                        {snippet.highlightLyric && (
                          <span
                            className="text-xs text-amber-200/80 italic truncate max-w-[200px] sm:max-w-[300px]"
                            title={`Songtekst highlight: "${snippet.highlightLyric}"`}
                          >
                            ♫ &ldquo;{snippet.highlightLyric}&rdquo;
                          </span>
                        )}
                      </div>

                      {/* Delete Snippet Button */}
                      <button
                        type="button"
                        onClick={() => onDeleteSnippet(track.id, snippet.id)}
                        disabled={isDeleting}
                        className="p-1.5 text-stone-600 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
                        title="Verwijder snippet"
                        aria-label="Verwijder snippet"
                      >
                        {isDeleting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function SunoLibraryManager() {
  const [tracks, setTracks] = useState<SunoTrack[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Full-track playing state (MiniPlayer)
  const [playingTrack, setPlayingTrack] = useState<SunoTrack | null>(null)

  // Snippet playing state (Dedicated audio element)
  const [playingSnippet, setPlayingSnippet] = useState<{
    trackId: string
    snippetId: string
    startTime: number
    endTime: number
    publicUrl: string
  } | null>(null)
  const snippetAudioRef = useRef<HTMLAudioElement | null>(null)

  // Active inline AudioSnipper track ID
  const [activeSnipperTrackId, setActiveSnipperTrackId] = useState<string | null>(null)

  // Expanded snippets accordion tracking
  const [expandedSnippetTracks, setExpandedSnippetTracks] = useState<Set<string>>(new Set())

  // Snippet deletion in-flight state
  const [deletingSnippetId, setDeletingSnippetId] = useState<string | null>(null)

  // Upload Form state
  const [trackName, setTrackName] = useState('')
  const [releaseType, setReleaseType] = useState<'single' | 'album'>('single')
  const [releaseStatus, setReleaseStatus] = useState<'released' | 'upcoming'>('released')
  const [albumMode, setAlbumMode] = useState<'existing' | 'new'>('existing')
  const [albumNameInput, setAlbumNameInput] = useState('')
  const [trackNumber, setTrackNumber] = useState<string>('')
  const [releaseYear, setReleaseYear] = useState<string>(new Date().getFullYear().toString())

  // Album accordion UI state
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set())

  // Auth observer
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (user) => setCurrentUser(user))
    return unsub
  }, [])

  // Firestore tracks observer
  useEffect(() => {
    const q = query(collection(db, 'suno_tracks'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, (snap) => {
      setTracks(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SunoTrack)))
    })
  }, [])

  // Snippet playback loop coordinator
  useEffect(() => {
    const audio = snippetAudioRef.current
    if (!audio) return
    if (playingSnippet) {
      audio.src = playingSnippet.publicUrl
      audio.currentTime = playingSnippet.startTime
      audio.play().catch((err) => {
        console.warn('Snippet playback error:', err)
      })
    } else {
      audio.pause()
    }
  }, [playingSnippet])

  const handleSnippetTimeUpdate = () => {
    const audio = snippetAudioRef.current
    if (!audio || !playingSnippet) return
    if (audio.currentTime >= playingSnippet.endTime || audio.currentTime < playingSnippet.startTime) {
      audio.currentTime = playingSnippet.startTime
      audio.play().catch(() => {})
    }
  }

  const handleSnippetEnded = () => {
    const audio = snippetAudioRef.current
    if (!audio || !playingSnippet) return
    audio.currentTime = playingSnippet.startTime
    audio.play().catch(() => {})
  }

  // Track categories
  const existingAlbums = Array.from(
    new Set(tracks.filter((t) => t.releaseType === 'album' && t.albumName).map((t) => t.albumName!))
  ).sort()

  const releasedSingles = tracks.filter((t) => t.releaseType === 'single' && t.releaseStatus === 'released')
  const upcomingSingles = tracks.filter((t) => t.releaseType === 'single' && t.releaseStatus === 'upcoming')
  const otherTracks = tracks.filter((t) => t.releaseType === 'single' && !t.releaseStatus)

  const albumGroups = existingAlbums.map((name) => ({
    name,
    tracks: tracks
      .filter((t) => t.releaseType === 'album' && t.albumName === name)
      .sort((a, b) => (a.trackNumber ?? 99) - (b.trackNumber ?? 99)),
  }))

  function toggleAlbum(name: string) {
    setExpandedAlbums((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  function handlePlayFull(track: SunoTrack) {
    setPlayingSnippet(null) // stop snippet playback if running
    if (playingTrack?.id === track.id) {
      setPlayingTrack(null)
    } else {
      setPlayingTrack(track)
    }
  }

  function handleTogglePlaySnippet(track: SunoTrack, snippet: AudioSnippet) {
    setPlayingTrack(null) // stop full track player
    if (playingSnippet?.snippetId === snippet.id) {
      setPlayingSnippet(null)
    } else {
      setPlayingSnippet({
        trackId: track.id,
        snippetId: snippet.id,
        startTime: snippet.startTime,
        endTime: snippet.endTime,
        publicUrl: snippet.publicUrl || track.publicUrl,
      })
    }
  }

  function handleOpenSnipper(trackId: string) {
    setPlayingTrack(null)
    setPlayingSnippet(null)
    setExpandedSnippetTracks((prev) => new Set(prev).add(trackId))
    setActiveSnipperTrackId((prev) => (prev === trackId ? null : trackId))
  }

  function handleCloseSnipper() {
    setActiveSnipperTrackId(null)
  }

  function handleSnippetSaved(trackId: string, snippet: AudioSnippet) {
    setExpandedSnippetTracks((prev) => new Set(prev).add(trackId))
    setActiveSnipperTrackId(null)
  }

  function toggleSnippetAccordion(trackId: string) {
    setExpandedSnippetTracks((prev) => {
      const next = new Set(prev)
      if (next.has(trackId)) {
        next.delete(trackId)
      } else {
        next.add(trackId)
      }
      return next
    })
  }

  async function handleDeleteTrack(trackId: string) {
    if (!confirm('Weet je zeker dat je deze track wilt verwijderen?')) return
    if (playingTrack?.id === trackId) setPlayingTrack(null)
    if (playingSnippet?.trackId === trackId) setPlayingSnippet(null)
    if (activeSnipperTrackId === trackId) setActiveSnipperTrackId(null)
    await deleteDoc(doc(db, 'suno_tracks', trackId))
  }

  async function handleDeleteSnippet(trackId: string, snippetId: string) {
    if (!confirm('Weet je zeker dat je deze snippet wilt verwijderen?')) return
    if (playingSnippet?.snippetId === snippetId) {
      setPlayingSnippet(null)
    }
    setDeletingSnippetId(snippetId)
    try {
      let token = ''
      if (currentUser) {
        token = await currentUser.getIdToken()
      }
      const res = await fetch('/api/studio/snippets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          action: 'delete',
          trackId,
          snippetId,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Verwijderen van snippet is mislukt')
      }
    } catch (err: any) {
      alert(err.message || 'Fout bij verwijderen snippet')
    } finally {
      setDeletingSnippetId(null)
    }
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile || !trackName.trim()) { setError('Geef een tracknaam en kies een bestand'); return }
    if (releaseType === 'album' && !albumNameInput) { setError('Geef een albumnaam op'); return }
    if (!currentUser) { setError('Je bent niet ingelogd. Log eerst in.'); return }

    setUploading(true); setError(null)
    try {
      const token = await currentUser.getIdToken()
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('type', 'suno')
      fd.append('label', trackName.trim())
      fd.append('releaseType', releaseType)
      fd.append('releaseStatus', releaseType === 'album' ? 'released' : releaseStatus)
      if (releaseType === 'album') {
        if (albumNameInput) fd.append('albumName', albumNameInput)
        if (trackNumber) fd.append('trackNumber', trackNumber)
      }
      if (releaseYear) fd.append('releaseYear', releaseYear)

      const res = await fetch('/api/studio/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) {
        const j = await res.json() as { error: string }
        throw new Error(j.error || `Server fout (${res.status})`)
      }
      setTrackName(''); setSelectedFile(null); setTrackNumber('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload mislukt')
    } finally { setUploading(false) }
  }

  const isAuthLoading = currentUser === undefined
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-5">
      {/* Hidden dedicated audio element for snippet looping */}
      <audio
        ref={snippetAudioRef}
        preload="auto"
        onTimeUpdate={handleSnippetTimeUpdate}
        onEnded={handleSnippetEnded}
      />

      {/* Header */}
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-stone-200 tracking-wider uppercase">Suno Library &amp; Snippet Manager</h3>
        <span className="text-xs text-stone-500">{tracks.length} tracks</span>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="space-y-3 p-4 bg-stone-950/60 border border-stone-800 rounded-xl">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setReleaseType('single')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              releaseType === 'single'
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-stone-900 border-stone-700 text-stone-400 hover:border-stone-600'
            }`}
          >
            <Mic2 className="w-3.5 h-3.5" /> Single
          </button>
          <button
            type="button"
            onClick={() => setReleaseType('album')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              releaseType === 'album'
                ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                : 'bg-stone-900 border-stone-700 text-stone-400 hover:border-stone-600'
            }`}
          >
            <Disc3 className="w-3.5 h-3.5" /> Album track
          </button>
        </div>

        {releaseType === 'single' && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setReleaseStatus('released')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                releaseStatus === 'released'
                  ? 'bg-emerald-900/30 border-emerald-600 text-emerald-400'
                  : 'bg-stone-900 border-stone-700 text-stone-500'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" /> Uitgebracht
            </button>
            <button
              type="button"
              onClick={() => setReleaseStatus('upcoming')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition-all ${
                releaseStatus === 'upcoming'
                  ? 'bg-amber-900/30 border-amber-600 text-amber-400'
                  : 'bg-stone-900 border-stone-700 text-stone-500'
              }`}
            >
              <Clock className="w-3 h-3" /> Aankomend
            </button>
          </div>
        )}

        <input
          value={trackName}
          onChange={(e) => setTrackName(e.target.value)}
          placeholder={releaseType === 'single' ? 'Tracknaam (bijv. Midnight Mirage Motel)' : 'Tracknaam (bijv. Leaving Amarillo)'}
          className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60"
        />

        {releaseType === 'album' && (
          <div className="space-y-2 p-3 bg-stone-900/60 border border-amber-500/20 rounded-lg">
            {existingAlbums.length > 0 && (
              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAlbumMode('existing')}
                  className={`px-2 py-1 rounded border transition-all ${
                    albumMode === 'existing' ? 'border-amber-500 text-amber-400' : 'border-stone-700 text-stone-500'
                  }`}
                >
                  Bestaand album
                </button>
                <button
                  type="button"
                  onClick={() => { setAlbumMode('new'); setAlbumNameInput('') }}
                  className={`px-2 py-1 rounded border transition-all ${
                    albumMode === 'new' ? 'border-amber-500 text-amber-400' : 'border-stone-700 text-stone-500'
                  }`}
                >
                  Nieuw album
                </button>
              </div>
            )}
            {existingAlbums.length > 0 && albumMode === 'existing' ? (
              <select
                value={albumNameInput}
                onChange={(e) => setAlbumNameInput(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60"
              >
                <option value="">— Kies album —</option>
                {existingAlbums.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            ) : (
              <input
                value={albumNameInput}
                onChange={(e) => setAlbumNameInput(e.target.value)}
                placeholder="Albumnaam (bijv. The Silent Cowboy)"
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60"
              />
            )}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[11px] text-stone-500 uppercase font-bold block mb-1">Track #</label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  placeholder="1"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-stone-500 uppercase font-bold block mb-1">Jaar</label>
                <input
                  type="number"
                  min={2020}
                  max={currentYear + 2}
                  value={releaseYear}
                  onChange={(e) => setReleaseYear(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="audio/wav,audio/mpeg,audio/mp4,.wav,.mp3,.m4a"
            className="hidden"
            onChange={(e) => { setSelectedFile(e.target.files?.[0] ?? null); setError(null) }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-1 px-3 py-2 bg-stone-900 border border-stone-700 rounded-lg text-xs text-stone-300 hover:border-amber-500/40 transition-colors text-left truncate"
          >
            {selectedFile ? selectedFile.name : 'Kies WAV / MP3 bestand'}
          </button>
          <button
            type="submit"
            disabled={uploading || isAuthLoading || !selectedFile || !trackName.trim()}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600/20 border border-amber-500/40 rounded-lg text-xs text-amber-400 hover:bg-amber-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Uploaden...' : isAuthLoading ? 'Laden...' : 'Uploaden'}
          </button>
        </div>
        {selectedFile && (
          <p className="text-[11px] text-stone-500">
            {selectedFile.name} — {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
          </p>
        )}
      </form>

      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-950/40 border border-red-800/50 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* ── Library Display ── */}
      <div className={`space-y-5 ${playingTrack ? 'pb-28' : ''}`}>
        {/* Albums */}
        {albumGroups.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
              <Disc3 className="w-3.5 h-3.5" /> Albums ({albumGroups.length})
            </p>
            {albumGroups.map((album) => (
              <div key={album.name} className="border border-stone-800 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleAlbum(album.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-stone-900/80 hover:bg-stone-900 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-md bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <Disc3 className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-stone-200 block truncate">{album.name}</span>
                    <span className="text-[11px] text-stone-500">{album.tracks.length} tracks</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded-full mr-2">
                    ALBUM
                  </span>
                  {expandedAlbums.has(album.name) ? (
                    <ChevronDown className="w-4 h-4 text-stone-500 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-stone-500 flex-shrink-0" />
                  )}
                </button>
                {expandedAlbums.has(album.name) && (
                  <div className="p-2 bg-stone-950/40 space-y-2 border-t border-stone-800/80">
                    {album.tracks.map((track) => (
                      <TrackCard
                        key={track.id}
                        track={track}
                        trackNumber={track.trackNumber}
                        releaseYear={track.releaseYear}
                        isFullPlaying={playingTrack?.id === track.id}
                        onPlayFull={handlePlayFull}
                        onDeleteTrack={handleDeleteTrack}
                        activeSnipperTrackId={activeSnipperTrackId}
                        onOpenSnipper={handleOpenSnipper}
                        onCloseSnipper={handleCloseSnipper}
                        onSnippetSaved={handleSnippetSaved}
                        expandedSnippetTracks={expandedSnippetTracks}
                        onToggleSnippets={toggleSnippetAccordion}
                        playingSnippet={playingSnippet}
                        onTogglePlaySnippet={handleTogglePlaySnippet}
                        onDeleteSnippet={handleDeleteSnippet}
                        deletingSnippetId={deletingSnippetId}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Released singles */}
        {releasedSingles.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Singles uitgebracht ({releasedSingles.length})
            </p>
            <div className="space-y-2">
              {releasedSingles.map((t) => (
                <TrackCard
                  key={t.id}
                  track={t}
                  badge="single"
                  badgeClass="text-emerald-500 bg-emerald-950/40 border-emerald-800/50"
                  icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                  releaseYear={t.releaseYear}
                  isFullPlaying={playingTrack?.id === t.id}
                  onPlayFull={handlePlayFull}
                  onDeleteTrack={handleDeleteTrack}
                  activeSnipperTrackId={activeSnipperTrackId}
                  onOpenSnipper={handleOpenSnipper}
                  onCloseSnipper={handleCloseSnipper}
                  onSnippetSaved={handleSnippetSaved}
                  expandedSnippetTracks={expandedSnippetTracks}
                  onToggleSnippets={toggleSnippetAccordion}
                  playingSnippet={playingSnippet}
                  onTogglePlaySnippet={handleTogglePlaySnippet}
                  onDeleteSnippet={handleDeleteSnippet}
                  deletingSnippetId={deletingSnippetId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming singles */}
        {upcomingSingles.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" /> Singles aankomend ({upcomingSingles.length})
            </p>
            <div className="space-y-2">
              {upcomingSingles.map((t) => (
                <TrackCard
                  key={t.id}
                  track={t}
                  badge="aankomend"
                  badgeClass="text-amber-500 bg-amber-950/40 border-amber-800/50"
                  icon={<Clock className="w-3.5 h-3.5 text-amber-500" />}
                  releaseYear={t.releaseYear}
                  isFullPlaying={playingTrack?.id === t.id}
                  onPlayFull={handlePlayFull}
                  onDeleteTrack={handleDeleteTrack}
                  activeSnipperTrackId={activeSnipperTrackId}
                  onOpenSnipper={handleOpenSnipper}
                  onCloseSnipper={handleCloseSnipper}
                  onSnippetSaved={handleSnippetSaved}
                  expandedSnippetTracks={expandedSnippetTracks}
                  onToggleSnippets={toggleSnippetAccordion}
                  playingSnippet={playingSnippet}
                  onTogglePlaySnippet={handleTogglePlaySnippet}
                  onDeleteSnippet={handleDeleteSnippet}
                  deletingSnippetId={deletingSnippetId}
                />
              ))}
            </div>
          </div>
        )}

        {/* Other Tracks */}
        {otherTracks.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest flex items-center gap-1.5">
              <Music className="w-3.5 h-3.5 text-stone-400" /> Overig ({otherTracks.length})
            </p>
            <div className="space-y-2">
              {otherTracks.map((t) => (
                <TrackCard
                  key={t.id}
                  track={t}
                  badge="?"
                  badgeClass="text-stone-500 bg-stone-900 border-stone-700"
                  icon={<Music className="w-3.5 h-3.5 text-stone-600" />}
                  releaseYear={t.releaseYear}
                  isFullPlaying={playingTrack?.id === t.id}
                  onPlayFull={handlePlayFull}
                  onDeleteTrack={handleDeleteTrack}
                  activeSnipperTrackId={activeSnipperTrackId}
                  onOpenSnipper={handleOpenSnipper}
                  onCloseSnipper={handleCloseSnipper}
                  onSnippetSaved={handleSnippetSaved}
                  expandedSnippetTracks={expandedSnippetTracks}
                  onToggleSnippets={toggleSnippetAccordion}
                  playingSnippet={playingSnippet}
                  onTogglePlaySnippet={handleTogglePlaySnippet}
                  onDeleteSnippet={handleDeleteSnippet}
                  deletingSnippetId={deletingSnippetId}
                />
              ))}
            </div>
          </div>
        )}

        {tracks.length === 0 && (
          <p className="text-center py-8 text-stone-500 text-xs">Nog geen tracks geüpload.</p>
        )}
      </div>

      {/* ── Sticky Mini Player (Full Track) ── */}
      {playingTrack && (
        <div className="sticky bottom-0 -mx-4 -mb-4 mt-4 z-30">
          <MiniPlayer track={playingTrack} onClose={() => setPlayingTrack(null)} />
        </div>
      )}
    </div>
  )
}
