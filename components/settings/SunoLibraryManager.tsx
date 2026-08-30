'use client'
import { useEffect, useState, useRef } from 'react'
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { db } from '@/lib/firebase'
import type { SunoTrack } from '@/types'
import {
  Upload, Trash2, Music, Loader2, AlertCircle, Disc3, Mic2, ChevronDown, ChevronRight
} from 'lucide-react'

export default function SunoLibraryManager() {
  const [tracks, setTracks] = useState<SunoTrack[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Form state
  const [trackName, setTrackName] = useState('')
  const [releaseType, setReleaseType] = useState<'single' | 'album'>('single')
  const [albumMode, setAlbumMode] = useState<'existing' | 'new'>('existing')
  const [albumNameInput, setAlbumNameInput] = useState('')
  const [trackNumber, setTrackNumber] = useState<string>('')
  const [releaseYear, setReleaseYear] = useState<string>(new Date().getFullYear().toString())

  // UI state
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set())

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (user) => setCurrentUser(user))
    return unsub
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'suno_tracks'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => {
      setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() } as SunoTrack)))
    })
  }, [])

  // Derive existing album names from tracks
  const existingAlbums = Array.from(
    new Set(tracks.filter(t => t.releaseType === 'album' && t.albumName).map(t => t.albumName!))
  ).sort()

  // Group tracks for display
  const singles = tracks.filter(t => t.releaseType === 'single' || !t.releaseType)
  const albumGroups = existingAlbums.map(name => ({
    name,
    tracks: tracks
      .filter(t => t.releaseType === 'album' && t.albumName === name)
      .sort((a, b) => (a.trackNumber ?? 99) - (b.trackNumber ?? 99)),
  }))

  function toggleAlbum(name: string) {
    setExpandedAlbums(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
    setError(null)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile || !trackName.trim()) { setError('Geef een tracknaam en kies een WAV-bestand'); return }
    if (releaseType === 'album' && !getAlbumName()) { setError('Geef een albumnaam op'); return }
    if (!currentUser) { setError('Je bent niet ingelogd. Log eerst in.'); return }

    setUploading(true)
    setError(null)
    try {
      const token = await currentUser.getIdToken()
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('type', 'suno')
      fd.append('label', trackName.trim())
      fd.append('releaseType', releaseType)
      if (releaseType === 'album') {
        const name = getAlbumName()
        if (name) fd.append('albumName', name)
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
      // Reset
      setTrackName(''); setSelectedFile(null); setTrackNumber('')
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload mislukt')
    } finally {
      setUploading(false)
    }
  }

  function getAlbumName(): string {
    if (albumMode === 'existing') return albumNameInput
    return albumNameInput
  }

  const isAuthLoading = currentUser === undefined
  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-stone-200 tracking-wider uppercase">Suno Library</h3>
        <span className="text-xs text-stone-500">WAV tracks voor video-generatie</span>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleUpload} className="space-y-3 p-4 bg-stone-950/60 border border-stone-800 rounded-xl">
        {/* Release type toggle */}
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

        {/* Track name */}
        <input
          value={trackName}
          onChange={e => setTrackName(e.target.value)}
          placeholder={releaseType === 'single' ? 'Tracknaam (bijv. Hate Me All You Want)' : 'Tracknaam (bijv. Gravel Road Confessions)'}
          className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60"
        />

        {/* Album fields */}
        {releaseType === 'album' && (
          <div className="space-y-2 p-3 bg-stone-900/60 border border-amber-500/20 rounded-lg">
            {/* Album name — pick existing or new */}
            {existingAlbums.length > 0 && (
              <div className="flex gap-2 text-xs">
                <button type="button" onClick={() => setAlbumMode('existing')}
                  className={`px-2 py-1 rounded border transition-all ${albumMode === 'existing' ? 'border-amber-500 text-amber-400' : 'border-stone-700 text-stone-500'}`}>
                  Bestaand album
                </button>
                <button type="button" onClick={() => { setAlbumMode('new'); setAlbumNameInput('') }}
                  className={`px-2 py-1 rounded border transition-all ${albumMode === 'new' ? 'border-amber-500 text-amber-400' : 'border-stone-700 text-stone-500'}`}>
                  Nieuw album
                </button>
              </div>
            )}

            {existingAlbums.length > 0 && albumMode === 'existing' ? (
              <select
                value={albumNameInput}
                onChange={e => setAlbumNameInput(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60"
              >
                <option value="">— Kies album —</option>
                {existingAlbums.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            ) : (
              <input
                value={albumNameInput}
                onChange={e => setAlbumNameInput(e.target.value)}
                placeholder="Albumnaam (bijv. Outlaw Americana)"
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
                  onChange={e => setTrackNumber(e.target.value)}
                  placeholder="1"
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
              <div className="flex-1">
                <label className="text-[11px] text-stone-500 uppercase font-bold block mb-1">Jaar</label>
                <input
                  type="number"
                  min={2020}
                  max={currentYear + 1}
                  value={releaseYear}
                  onChange={e => setReleaseYear(e.target.value)}
                  className="w-full bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-sm text-stone-200 focus:outline-none focus:border-amber-500/60"
                />
              </div>
            </div>
          </div>
        )}

        {/* File picker + upload button */}
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept="audio/wav,audio/mpeg,audio/mp4,.wav,.mp3,.m4a" className="hidden" onChange={handleFileChange} />
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

      {/* Library Display */}
      <div className="space-y-4">
        {/* Albums */}
        {albumGroups.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest">Albums ({albumGroups.length})</p>
            {albumGroups.map(album => (
              <div key={album.name} className="border border-stone-800 rounded-xl overflow-hidden">
                {/* Album header */}
                <button
                  type="button"
                  onClick={() => toggleAlbum(album.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-stone-900/80 hover:bg-stone-900 transition-colors text-left"
                >
                  <Disc3 className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-bold text-stone-200 block truncate">{album.name}</span>
                    <span className="text-[11px] text-stone-500">{album.tracks.length} track{album.tracks.length !== 1 ? 's' : ''}</span>
                  </div>
                  {expandedAlbums.has(album.name)
                    ? <ChevronDown className="w-4 h-4 text-stone-500 flex-shrink-0" />
                    : <ChevronRight className="w-4 h-4 text-stone-500 flex-shrink-0" />}
                </button>
                {/* Album tracks */}
                {expandedAlbums.has(album.name) && (
                  <div className="divide-y divide-stone-800/60">
                    {album.tracks.map(track => (
                      <div key={track.id} className="flex items-center gap-3 px-4 py-2.5 bg-stone-950/40">
                        <span className="text-xs text-stone-600 font-mono w-5 text-right flex-shrink-0">
                          {track.trackNumber ?? '—'}
                        </span>
                        <span className="flex-1 text-sm text-stone-300 truncate">{track.name}</span>
                        <button
                          onClick={() => deleteDoc(doc(db, 'suno_tracks', track.id))}
                          className="p-1 rounded text-stone-600 hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Singles */}
        {singles.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-widest">Singles ({singles.length})</p>
            <div className="space-y-1">
              {singles.map(track => (
                <div key={track.id} className="flex items-center gap-2 px-3 py-2 bg-stone-900/60 border border-stone-800 rounded-lg">
                  <Mic2 className="w-3.5 h-3.5 text-amber-500/70 flex-shrink-0" />
                  <span className="flex-1 text-sm text-stone-300 truncate">{track.name}</span>
                  {track.releaseYear && (
                    <span className="text-[11px] text-stone-600 font-mono">{track.releaseYear}</span>
                  )}
                  <button
                    onClick={() => deleteDoc(doc(db, 'suno_tracks', track.id))}
                    className="p-1 rounded text-stone-600 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tracks.length === 0 && (
          <p className="text-center py-6 text-stone-500 text-xs">Nog geen tracks geüpload.</p>
        )}
      </div>
    </div>
  )
}
