'use client'
import { useEffect, useState, useRef } from 'react'
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { db } from '@/lib/firebase'
import type { SunoTrack } from '@/types'
import { Upload, Trash2, Music, Loader2, AlertCircle } from 'lucide-react'

export default function SunoLibraryManager() {
  const [tracks, setTracks] = useState<SunoTrack[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trackName, setTrackName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined) // undefined = loading
  const fileRef = useRef<HTMLInputElement>(null)

  // Wait for Firebase Auth to initialize before allowing uploads
  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (user) => setCurrentUser(user))
    return unsub
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'suno_tracks'), orderBy('createdAt', 'desc'))
    return onSnapshot(q, snap => { setTracks(snap.docs.map(d => ({ id: d.id, ...d.data() } as SunoTrack))) })
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setSelectedFile(f)
    setError(null)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile || !trackName.trim()) {
      setError('Geef een tracknaam en kies een WAV-bestand')
      return
    }

    // Guard: user must be authenticated
    if (!currentUser) {
      setError('Je bent niet ingelogd. Log eerst in om bestanden te uploaden.')
      return
    }

    setUploading(true)
    setError(null)
    try {
      const token = await currentUser.getIdToken()
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('type', 'suno')
      fd.append('label', trackName.trim())
      const res = await fetch('/api/studio/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) {
        const j = await res.json() as { error: string }
        throw new Error(j.error || `Server fout (${res.status})`)
      }
      // Reset form on success
      setTrackName('')
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload mislukt')
    } finally {
      setUploading(false)
    }
  }

  const isAuthLoading = currentUser === undefined

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-stone-200 tracking-wider uppercase">Suno Library</h3>
        <span className="text-xs text-stone-500">WAV tracks voor video-generatie</span>
      </div>
      <form onSubmit={handleUpload} className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={trackName}
            onChange={e => { setTrackName(e.target.value); setError(null) }}
            placeholder="Tracknaam (bijv. Hate Me All You Want)"
            className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60"
          />
          <input
            ref={fileRef}
            type="file"
            accept="audio/wav,audio/mpeg,audio/mp4,.wav,.mp3,.m4a"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-300 hover:border-amber-500/40 transition-colors text-left truncate max-w-full sm:max-w-[180px]"
          >
            {selectedFile ? selectedFile.name : 'Kies WAV bestand'}
          </button>
        </div>
        {selectedFile && (
          <p className="text-[11px] text-stone-500">
            Geselecteerd: <span className="text-stone-300">{selectedFile.name}</span>{' '}
            ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
          </p>
        )}
        <button
          type="submit"
          disabled={uploading || isAuthLoading || !selectedFile || !trackName.trim()}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600/20 border border-amber-500/40 rounded-lg text-xs text-amber-400 hover:bg-amber-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
          {uploading ? 'Uploaden...' : isAuthLoading ? 'Laden...' : 'Uploaden naar Suno Library'}
        </button>
      </form>
      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-950/40 border border-red-800/50 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
      <div className="space-y-2">
        {tracks.map(t => (
          <div key={t.id} className="flex items-center justify-between px-3 py-2 bg-stone-900/60 border border-stone-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Music className="w-3.5 h-3.5 text-amber-500/70" />
              <span className="text-sm text-stone-300">{t.name}</span>
            </div>
            <button
              onClick={() => deleteDoc(doc(db, 'suno_tracks', t.id))}
              className="p-1 rounded text-stone-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {tracks.length === 0 && (
          <p className="text-center py-4 text-stone-500 text-xs">Nog geen tracks geüpload.</p>
        )}
      </div>
    </div>
  )
}
