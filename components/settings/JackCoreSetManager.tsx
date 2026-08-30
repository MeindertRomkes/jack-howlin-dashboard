'use client'
import { useEffect, useState, useRef } from 'react'
import { collection, onSnapshot, orderBy, query, deleteDoc, doc } from 'firebase/firestore'
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth'
import { db } from '@/lib/firebase'
import type { JackCoreSetPhoto } from '@/types'
import { Upload, Trash2, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react'

export default function JackCoreSetManager() {
  const [photos, setPhotos] = useState<JackCoreSetPhoto[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(getAuth(), (user) => setCurrentUser(user))
    return unsub
  }, [])

  useEffect(() => {
    const q = query(collection(db, 'jack_core_set'), orderBy('order', 'asc'))
    return onSnapshot(q, snap => {
      setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() } as JackCoreSetPhoto)))
    })
  }, [])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setSelectedFile(e.target.files?.[0] ?? null)
    setError(null)
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile || !label.trim()) { setError('Geef een label en kies een foto'); return }
    if (photos.length >= 10) { setError('Maximum 10 fotos bereikt'); return }
    if (!currentUser) { setError('Je bent niet ingelogd. Log eerst in.'); return }

    setUploading(true)
    setError(null)
    try {
      const token = await currentUser.getIdToken()
      const fd = new FormData()
      fd.append('file', selectedFile)
      fd.append('type', 'core-set')
      fd.append('label', label.trim())
      const res = await fetch('/api/studio/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) {
        const j = await res.json() as { error: string }
        throw new Error(j.error || `Server fout (${res.status})`)
      }
      setLabel('')
      setSelectedFile(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload mislukt')
    } finally {
      setUploading(false)
    }
  }

  const isAuthLoading = currentUser === undefined
  const isFull = photos.length >= 10

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <ImageIcon className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-stone-200 tracking-wider uppercase">Jack Core Set</h3>
        <span className="text-xs text-stone-500">({photos.length}/10) — altijd meegestuurd bij generatie</span>
      </div>
      {!isFull && (
        <form onSubmit={handleUpload} className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={label}
              onChange={e => { setLabel(e.target.value); setError(null) }}
              placeholder="Label (bijv. desert portrait)"
              className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500/60"
            />
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-xs text-stone-300 hover:border-amber-500/40 transition-colors truncate max-w-full sm:max-w-[160px] text-left"
            >
              {selectedFile ? selectedFile.name : 'Kies foto'}
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
            disabled={uploading || isAuthLoading || !selectedFile || !label.trim()}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-600/20 border border-amber-500/40 rounded-lg text-xs text-amber-400 hover:bg-amber-600/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {uploading ? 'Uploaden...' : isAuthLoading ? 'Laden...' : 'Uploaden naar Core Set'}
          </button>
        </form>
      )}
      {isFull && (
        <p className="text-xs text-amber-400/70 bg-amber-950/20 border border-amber-800/30 rounded-lg px-3 py-2">
          Core Set is vol (10/10). Verwijder een foto om een nieuwe toe te voegen.
        </p>
      )}
      {error && (
        <div className="flex items-center gap-2 p-2.5 bg-red-950/40 border border-red-800/50 rounded-lg">
          <AlertCircle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {photos.map(photo => (
          <div key={photo.id} className="relative group aspect-square rounded-lg overflow-hidden border border-stone-800 bg-stone-900">
            <img src={photo.publicUrl} alt={photo.label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-stone-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
              <span className="text-xs text-stone-300 font-medium px-1 text-center leading-tight">{photo.label}</span>
              <button
                onClick={() => deleteDoc(doc(db, 'jack_core_set', photo.id))}
                className="p-1 rounded bg-red-900/60 text-red-400 hover:bg-red-900/80 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {photos.length === 0 && (
          <div className="col-span-full text-center py-6 text-stone-500 text-xs">
            Upload Jack&apos;s referentie-fotos om te beginnen.
          </div>
        )}
      </div>
    </div>
  )
}
