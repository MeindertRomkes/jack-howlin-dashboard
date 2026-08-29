'use client'
import { useState } from 'react'
import {
  ShoppingBag,
  Sparkles,
  Calendar,
  CheckCircle2,
  X,
  RefreshCw,
  Clock,
} from 'lucide-react'
import { savePost } from '@/lib/firestore'
import { Timestamp } from 'firebase/firestore'
import type { Platform } from '@/types'

interface MerchPreset {
  name: string
  type: string
  song: string
  hook: string
  url: string
}

const MERCH_PRESETS: MerchPreset[] = [
  {
    name: "I Still Wear This Crown — Distressed Outlaw Cap",
    type: "Headwear / Pet",
    song: "I Still Wear This Crown",
    hook: "It may be beaten up, but Jack keeps wearing it.",
    url: "https://jackhowlin.com/products/crown-cap",
  },
  {
    name: "Hate Me All You Want — Heavyweight Statement Hoodie",
    type: "Apparel / Hoodie",
    song: "Hate Me All You Want",
    hook: "Talk your talk. The crown stays on.",
    url: "https://jackhowlin.com/products/hate-me-hoodie",
  },
  {
    name: "Outlaw Americana — Vintage Washed Tour Tee",
    type: "Apparel / T-Shirt",
    song: "Gravel Road Confessions",
    hook: "Nobody owns this road, nobody owns my name.",
    url: "https://jackhowlin.com/products/outlaw-tee",
  },
]

interface GeneratedMerchPost {
  angle: string
  angleLabel: string
  title: string
  caption: string
  hashtags: string
  platforms: Platform[]
  suggestedVisualScene: string
  scheduledAt: string
}

interface MerchBatchModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function MerchBatchModal({ isOpen, onClose, onSuccess }: MerchBatchModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<MerchPreset>(MERCH_PRESETS[0])
  const [isCustom, setIsCustom] = useState(false)
  const [customName, setCustomName] = useState('')
  const [customType, setCustomType] = useState('Apparel')
  const [customSong, setCustomSong] = useState("Jack Howlin' Original")
  const [customHook, setCustomHook] = useState('Rauw, onverzettelijk, authentiek.')
  const [customUrl, setCustomUrl] = useState('https://jackhowlin.com')

  const [postCount, setPostCount] = useState<number>(5)
  const [intervalDays, setIntervalDays] = useState<number>(3)
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['instagram', 'tiktok', 'facebook'])
  
  const [generating, setGenerating] = useState(false)
  const [generatedPosts, setGeneratedPosts] = useState<GeneratedMerchPost[]>([])
  const [schedulingAll, setSchedulingAll] = useState(false)
  const [scheduleSuccess, setScheduleSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  function togglePlatform(p: Platform) {
    if (selectedPlatforms.includes(p)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter(x => x !== p))
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, p])
    }
  }

  async function handleGenerateBatch(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    setError(null)
    setGeneratedPosts([])
    setScheduleSuccess(false)

    try {
      const payload = {
        productName: isCustom ? customName : selectedPreset.name,
        productType: isCustom ? customType : selectedPreset.type,
        productUrl: isCustom ? customUrl : selectedPreset.url,
        associatedSong: isCustom ? customSong : selectedPreset.song,
        keyHook: isCustom ? customHook : selectedPreset.hook,
        postCount,
        intervalDays,
        platforms: selectedPlatforms,
        startDate: new Date().toISOString(),
      }

      const res = await fetch('/api/posts/merch-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errJson = await res.json()
        throw new Error(errJson.error || 'Merch batch genereren mislukt')
      }

      const data = await res.json()
      setGeneratedPosts(data.posts || [])
    } catch (err) {
      console.error('Error generating merch batch:', err)
      setError(err instanceof Error ? err.message : 'Fout bij genereren')
    } finally {
      setGenerating(false)
    }
  }

  async function handleScheduleAll() {
    if (!generatedPosts.length) return
    setSchedulingAll(true)
    setError(null)

    try {
      for (const post of generatedPosts) {
        await savePost({
          caption: `${post.caption}\n\n${post.hashtags}`,
          platforms: post.platforms,
          title: post.title,
          tags: post.hashtags.split(' ').map(t => t.replace('#', '')),
          mediaUrl: null,
          mediaType: null,
          scheduledAt: Timestamp.fromDate(new Date(post.scheduledAt)),
          status: 'scheduled',
          postedAt: null,
          errorMessage: null,
        })
      }

      setScheduleSuccess(true)
      if (onSuccess) onSuccess()
      setTimeout(() => {
        onClose()
      }, 2500)
    } catch (err) {
      console.error('Error scheduling merch batch:', err)
      setError(err instanceof Error ? err.message : 'Fout bij inplannen van posts')
    } finally {
      setSchedulingAll(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-stone-800 flex items-center justify-between bg-stone-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500 shadow-sm">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-wider uppercase text-stone-100 flex items-center gap-2">
                Merch AI Multi-Post Batch Machine
              </h2>
              <p className="text-xs text-stone-400">
                Genereer 5-10 gerichte social posts met verschillende invalshoeken (story, schaarste, rauw) en plan ze in 1 klik in.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-100 p-2 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3.5 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl flex items-center gap-2">
              <X className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {scheduleSuccess && (
            <div className="p-4 bg-emerald-950/80 border border-emerald-700 text-emerald-200 text-xs rounded-xl flex items-center gap-3 animate-fadeIn shadow-lg">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <strong className="block text-emerald-300 text-sm">Batch Succesvol Ingepland!</strong>
                <span>Alle {generatedPosts.length} merch posts zijn direct toegevoegd aan je kalender en worden automatisch gepubliceerd.</span>
              </div>
            </div>
          )}

          {/* Form Step if no posts generated yet */}
          {generatedPosts.length === 0 ? (
            <form onSubmit={handleGenerateBatch} className="space-y-6">
              {/* Product Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                  1. Kies Merch Item of Voer Custom Product in
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {MERCH_PRESETS.map((preset, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => {
                        setSelectedPreset(preset)
                        setIsCustom(false)
                      }}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
                        !isCustom && selectedPreset.name === preset.name
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 shadow-md'
                          : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                      }`}
                    >
                      <span className="text-[10px] font-mono text-amber-500 block uppercase font-semibold">
                        {preset.type}
                      </span>
                      <strong className="text-xs text-stone-200 block truncate mt-1">
                        {preset.name}
                      </strong>
                      <span className="text-[11px] text-stone-500 block truncate mt-0.5">
                        Track: {preset.song}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setIsCustom(!isCustom)}
                    className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border transition-all ${
                      isCustom
                        ? 'bg-amber-600 text-stone-950 border-amber-500'
                        : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
                    }`}
                  >
                    + Eigen Custom Merch Item Toevoegen
                  </button>
                </div>

                {isCustom && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-stone-950 rounded-xl border border-stone-800 mt-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-400 uppercase">Productnaam</label>
                      <input
                        type="text"
                        required
                        placeholder="bijv: Outlaw Leather Keyring"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-xs text-stone-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-400 uppercase">Product Type / Categorie</label>
                      <input
                        type="text"
                        placeholder="bijv: Accessoires / Headwear"
                        value={customType}
                        onChange={e => setCustomType(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-xs text-stone-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-400 uppercase">Gekoppelde Track / Song</label>
                      <input
                        type="text"
                        placeholder="bijv: Hate Me All You Want"
                        value={customSong}
                        onChange={e => setCustomSong(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-xs text-stone-100"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-stone-400 uppercase">Kern Hook / Slogan</label>
                      <input
                        type="text"
                        placeholder="bijv: The crown stays on."
                        value={customHook}
                        onChange={e => setCustomHook(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-xs text-stone-100"
                      />
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <label className="text-[11px] font-bold text-stone-400 uppercase">Product URL</label>
                      <input
                        type="text"
                        placeholder="https://jackhowlin.com/products/..."
                        value={customUrl}
                        onChange={e => setCustomUrl(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-lg p-2 text-xs text-stone-100 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Batch Configuration */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2 border-t border-stone-800">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                    2. Aantal Posts in de Batch
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[3, 5, 10].map(count => (
                      <button
                        type="button"
                        key={count}
                        onClick={() => setPostCount(count)}
                        className={`py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                          postCount === count
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500'
                            : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                        }`}
                      >
                        {count} Posts
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                    3. Spreiding / Interval
                  </label>
                  <select
                    value={intervalDays}
                    onChange={e => setIntervalDays(Number(e.target.value))}
                    className="w-full bg-stone-950 border border-stone-800 rounded-lg p-2 text-xs text-stone-200 font-semibold focus:outline-none focus:border-amber-500"
                  >
                    <option value={2}>Elke 2 dagen (Intensieve drop)</option>
                    <option value={3}>Elke 3 dagen (Aanbevolen)</option>
                    <option value={5}>Elke 5 dagen (Langdurige branding)</option>
                    <option value={7}>Wekelijks (1x per week)</option>
                  </select>
                </div>
              </div>

              {/* Platforms */}
              <div className="space-y-2 pt-2 border-t border-stone-800">
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                  4. Doelkanalen
                </label>
                <div className="flex items-center gap-2 flex-wrap">
                  {(['instagram', 'tiktok', 'facebook', 'youtube'] as Platform[]).map(plat => (
                    <button
                      type="button"
                      key={plat}
                      onClick={() => togglePlatform(plat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                        selectedPlatforms.includes(plat)
                          ? 'bg-amber-500 text-stone-950 border-amber-400'
                          : 'bg-stone-950 text-stone-500 border-stone-800 hover:border-stone-700'
                      }`}
                    >
                      {plat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={generating}
                className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Gemini Genereert Multi-Angle Posts...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Genereer {postCount} Merch Posts in Jack&apos;s Voice ➔</span>
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Generated Posts Preview & 1-Click Schedule */
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-stone-950 p-4 rounded-xl border border-stone-800">
                <div>
                  <span className="text-[10px] text-amber-500 uppercase font-bold tracking-wider block">
                    Gegenereerde Campagne
                  </span>
                  <strong className="text-sm text-stone-200">
                    {generatedPosts.length} Multi-Angle Posts voor &ldquo;{isCustom ? customName : selectedPreset.name}&rdquo;
                  </strong>
                </div>
                <button
                  onClick={() => setGeneratedPosts([])}
                  className="text-xs text-stone-400 hover:text-stone-200 underline"
                >
                  Opnieuw instellen
                </button>
              </div>

              <div className="space-y-3.5">
                {generatedPosts.map((post, idx) => (
                  <div
                    key={idx}
                    className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2.5 hover:border-stone-700 transition-all shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 font-extrabold text-xs flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          {post.angleLabel || post.angle}
                        </span>
                      </div>
                      <span className="text-[11px] text-stone-500 font-mono flex items-center gap-1">
                        <Clock className="w-3 h-3 text-stone-400" />
                        {new Date(post.scheduledAt).toLocaleDateString('nl-NL', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <p className="text-xs text-stone-200 leading-relaxed font-sans bg-stone-900/60 p-3 rounded-lg border border-stone-800/80">
                      {post.caption}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-stone-500 pt-1">
                      <span className="font-mono text-amber-500/80">{post.hashtags}</span>
                      <span className="text-[10px] uppercase font-bold text-stone-400">
                        Kanalen: {post.platforms.join(', ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* 1-Click Batch Schedule Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleScheduleAll}
                  disabled={schedulingAll || scheduleSuccess}
                  className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2"
                >
                  {schedulingAll ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Alle Posts Inplannen in Kalender...</span>
                    </>
                  ) : scheduleSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ingepland! Sluiten...</span>
                    </>
                  ) : (
                    <>
                      <Calendar className="w-4 h-4" />
                      <span>Plan Alle {generatedPosts.length} Posts Direct In Kalender ➔</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}