'use client'
import { useState } from 'react'
import {
  Sparkles,
  Flame,
  Clock,
  Music,
  CheckCircle2,
  X,
  RefreshCw,
  Film,
  Copy,
  Check,
} from 'lucide-react'
import type { Platform } from '@/types'

interface ReleaseCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
}

interface CampaignPost {
  dayOffset: number
  phase: string
  daysFromRelease: string
  recommendedHour: string
  scheduledAt: string
  platforms: Platform[]
  title: string
  caption: string
  hashtags: string
  visualHookPrompt: string
  contentType: 'reel' | 'short' | 'video' | 'post'
}

const PLATFORM_COLORS: Record<Platform, { text: string; bg: string; border: string }> = {
  youtube: { text: 'text-red-400', bg: 'bg-red-950/50', border: 'border-red-900/60' },
  instagram: { text: 'text-pink-400', bg: 'bg-pink-950/50', border: 'border-pink-900/60' },
  tiktok: { text: 'text-cyan-400', bg: 'bg-cyan-950/50', border: 'border-cyan-900/60' },
  facebook: { text: 'text-blue-400', bg: 'bg-blue-950/50', border: 'border-blue-900/60' },
}

export default function ReleaseCampaignModal({
  isOpen,
  onClose,
  onSaved,
}: ReleaseCampaignModalProps) {
  const [songTitle, setSongTitle] = useState('')
  const [releaseDate, setReleaseDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().split('T')[0]
  })
  const [songTheme, setSongTheme] = useState('Outlaw defiance, dusty highway, cowboy hat as crown, raw Americana storytelling')
  const [keyLyrics, setKeyLyrics] = useState('Hate me all you want. I still wear this crown.')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(['youtube', 'instagram', 'tiktok', 'facebook'])
  
  const [generating, setGenerating] = useState(false)
  const [campaign, setCampaign] = useState<CampaignPost[]>([])
  const [saving, setSaving] = useState(false)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  function togglePlatform(p: Platform) {
    setSelectedPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    if (!songTitle.trim()) {
      setError('Vul een songtitel in.')
      return
    }
    setError(null)
    setGenerating(true)

    try {
      const res = await fetch('/api/posts/campaign-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songTitle,
          releaseDate,
          songTheme,
          keyLyrics,
          platforms: selectedPlatforms,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Genereren mislukt')
      }

      setCampaign(data.campaign || [])
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fout bij genereren')
    } finally {
      setGenerating(false)
    }
  }

  function updatePost(index: number, updates: Partial<CampaignPost>) {
    setCampaign(prev => {
      const next = [...prev]
      next[index] = { ...next[index], ...updates }
      return next
    })
  }

  async function handleScheduleAll() {
    if (campaign.length === 0) return
    setSaving(true)
    setError(null)

    try {
      // Schedule each post in parallel via /api/posts
      await Promise.all(
        campaign.map(post =>
          fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              platforms: post.platforms,
              caption: `${post.caption}\n\n${post.hashtags}`,
              scheduledAt: post.scheduledAt,
              title: `[${post.phase}] ${songTitle}`,
            }),
          })
        )
      )

      onSaved()
      onClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fout bij opslaan in kalender')
    } finally {
      setSaving(false)
    }
  }

  function copyPrompt(text: string, idx: number) {
    navigator.clipboard.writeText(text)
    setCopiedIndex(idx)
    setTimeout(() => setCopiedIndex(null), 2500)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold tracking-wider uppercase text-stone-100 flex items-center gap-2">
                Song Release Campaign Planner
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/60 px-2 py-0.5 rounded uppercase">
                  7-Dagen Rollout
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                Laat Gemini een complete social release-campagne genereren in Jack&apos;s Outlaw Americana stem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-100 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {error && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 text-xs rounded-xl">
              {error}
            </div>
          )}

          {/* Form when no campaign generated yet */}
          {campaign.length === 0 ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                    Songtitel / Track Naam *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="bijv. Hate Me All You Want of I Still Wear This Crown"
                    value={songTitle}
                    onChange={e => setSongTitle(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                    Officiële Release Datum *
                  </label>
                  <input
                    type="date"
                    required
                    value={releaseDate}
                    onChange={e => setReleaseDate(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                  Thema, Vibe & Verhaal achter de song
                </label>
                <input
                  type="text"
                  value={songTheme}
                  onChange={e => setSongTheme(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
                  Belangrijkste Tekst / Songquote (Lyrics Snippet)
                </label>
                <input
                  type="text"
                  value={keyLyrics}
                  onChange={e => setKeyLyrics(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-800 rounded-xl px-3.5 py-2.5 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider mb-2">
                  Selecteer Kanalen voor deze Campagne
                </label>
                <div className="flex flex-wrap gap-2">
                  {(['youtube', 'instagram', 'tiktok', 'facebook'] as Platform[]).map(p => {
                    const isSelected = selectedPlatforms.includes(p)
                    const color = PLATFORM_COLORS[p]
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => togglePlatform(p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                          isSelected
                            ? `${color.bg} ${color.border} ${color.text} shadow-sm`
                            : 'bg-stone-950 border-stone-800 text-stone-500 opacity-60'
                        }`}
                      >
                        {p} {isSelected ? '✓' : '+'}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-stone-800 flex justify-end">
                <button
                  type="submit"
                  disabled={generating}
                  className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2"
                >
                  {generating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Campagne wordt geschreven door Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Genereer 7-Dagen Campagne ➔</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Campaign Posts List */
            <div className="space-y-6">
              <div className="bg-stone-950 border border-stone-800 p-4 rounded-xl flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="text-sm font-bold text-stone-100 flex items-center gap-2">
                    <Music className="w-4 h-4 text-amber-500" />
                    <span>7-Dagen Rollout voor &ldquo;{songTitle}&rdquo;</span>
                  </h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Release datum: <strong className="text-stone-200">{releaseDate}</strong> · {campaign.length} geplande fasen
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setCampaign([])}
                  className="text-xs text-stone-400 hover:text-stone-200 underline font-medium"
                >
                  Opnieuw instellen
                </button>
              </div>

              <div className="space-y-4">
                {campaign.map((post, idx) => {
                  return (
                    <div
                      key={idx}
                      className="bg-stone-950 border border-stone-800 rounded-xl p-4.5 space-y-3 hover:border-stone-700 transition-all shadow-md"
                    >
                      {/* Phase Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center text-xs font-black">
                            {idx + 1}
                          </span>
                          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                            {post.phase}
                          </span>
                          <span className="text-[11px] text-stone-400 font-medium">
                            ({post.daysFromRelease})
                          </span>
                        </div>

                        {/* Scheduled Date/Time picker */}
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-stone-500" />
                          <input
                            type="datetime-local"
                            value={post.scheduledAt.slice(0, 16)}
                            onChange={e => updatePost(idx, { scheduledAt: new Date(e.target.value).toISOString() })}
                            className="bg-stone-900 border border-stone-800 rounded-lg px-2.5 py-1 text-xs text-stone-300 font-mono focus:border-amber-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Caption Textarea */}
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-400">
                          Caption (Jack Howlin&apos; Outlaw Voice)
                        </label>
                        <textarea
                          rows={3}
                          value={post.caption}
                          onChange={e => updatePost(idx, { caption: e.target.value })}
                          className="w-full bg-stone-900 border border-stone-800 rounded-lg p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                        />
                      </div>

                      {/* Hashtags */}
                      <div className="space-y-1">
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500">
                          Hashtags
                        </label>
                        <input
                          type="text"
                          value={post.hashtags}
                          onChange={e => updatePost(idx, { hashtags: e.target.value })}
                          className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3 py-1.5 text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Visual Hook Prompt for Video Generator */}
                      {post.visualHookPrompt && (
                        <div className="bg-stone-900/70 border border-stone-800 rounded-lg p-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <Film className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                            <span className="text-[11px] text-stone-400 font-mono truncate" title={post.visualHookPrompt}>
                              Prompt: {post.visualHookPrompt}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => copyPrompt(post.visualHookPrompt, idx)}
                            className="text-[10px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 bg-stone-950 px-2 py-1 rounded border border-stone-800 flex-shrink-0"
                          >
                            {copiedIndex === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                            <span>{copiedIndex === idx ? 'Gekopieerd' : 'Kopieer Prompt'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {campaign.length > 0 && (
          <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-stone-400">
              {campaign.length} posts gereed voor automatische publicatie
            </span>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="text-stone-400 hover:text-stone-200 text-xs uppercase tracking-wider font-bold px-4 py-2"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleScheduleAll}
                disabled={saving}
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-stone-950 font-bold px-6 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Inplannen in kalender...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Alles Inplannen in Kalender ➔</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
