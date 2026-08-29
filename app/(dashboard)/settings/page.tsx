'use client'
import { useEffect, useState } from 'react'
import {
  getPersonaConfig,
  savePersonaConfig,
  getConnectionHealth,
  getFans,
  getSyncState,
  DEFAULT_PERSONA_CONFIG,
} from '@/lib/firestore'
import type { PersonaConfig, ConnectionHealth, FanProfile, SyncState } from '@/types'
import {
  Sliders,
  Sparkles,
  Save,
  CheckCircle2,
  Radio,
  Star,
  Users,
  ShieldCheck,
  Music,
  Plus,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import VisualPromptStudio from '@/components/studio/VisualPromptStudio'
import JackCoreSetManager from '@/components/settings/JackCoreSetManager'
import SunoLibraryManager from '@/components/settings/SunoLibraryManager'

export default function SettingsPage() {
  const [persona, setPersona] = useState<PersonaConfig>(DEFAULT_PERSONA_CONFIG)
  const [connections, setConnections] = useState<ConnectionHealth | null>(null)
  const [fans, setFans] = useState<FanProfile[]>([])
  const [syncState, setSyncState] = useState<SyncState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [newRule, setNewRule] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const [personaData, connData, fansData, syncData] = await Promise.all([
          getPersonaConfig(),
          getConnectionHealth(),
          getFans(50),
          getSyncState(),
        ])
        setPersona(personaData)
        setConnections(connData)
        setFans(fansData)
        setSyncState(syncData)
      } catch (err) {
        console.error('Error loading settings data:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSavePersona(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveSuccess(false)
    try {
      await savePersonaConfig(persona)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 4000)
    } catch (err) {
      console.error('Error saving persona:', err)
    } finally {
      setSaving(false)
    }
  }

  function addToneRule() {
    if (!newRule.trim()) return
    setPersona(prev => ({
      ...prev,
      toneGuidelines: [...(prev.toneGuidelines || []), newRule.trim()],
    }))
    setNewRule('')
  }

  function removeToneRule(index: number) {
    setPersona(prev => ({
      ...prev,
      toneGuidelines: prev.toneGuidelines.filter((_, i) => i !== index),
    }))
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-stone-900 border border-stone-800 rounded-xl h-48 animate-pulse" />
        <div className="bg-stone-900 border border-stone-800 rounded-xl h-64 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* ───────────────────────────────────────────────────────── */}
      {/* HEADER                                                    */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="bg-stone-900 border border-stone-800 p-6 rounded-xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
              <Sliders className="w-4 h-4" />
            </div>
            <h1 className="text-xl font-extrabold tracking-wider uppercase text-stone-100">
              Studio Settings & AI Persona
            </h1>
          </div>
          <p className="text-stone-400 text-xs max-w-xl">
            Beheer hier Jack Howlin&apos;s AI stemrichtlijnen, muzieklinks, API-verbindingen en het overzicht van je trouwste luisteraars.
          </p>
        </div>

        {syncState?.lastSyncAt && (
          <div className="bg-stone-950 px-3.5 py-2 rounded-lg border border-stone-800 text-right self-start sm:self-auto">
            <span className="text-[10px] text-stone-500 uppercase font-bold block">Status Sync</span>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5 justify-end">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Actief ({syncState.totalCommentsCount} comments)
            </span>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 1. PLATFORM CONNECTIONS HEALTH                           */}
      {/* ───────────────────────────────────────────────────────── */}
      <section className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center gap-2 border-b border-stone-800 pb-3">
          <Radio className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-stone-200">
            Platform Verbindingen & Token Status
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* YouTube */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
                YouTube
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/80 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" /> Verbonden
              </span>
            </div>
            <p className="text-xs text-stone-300 font-semibold truncate">
              {connections?.youtube?.channelTitle || "Jack Howlin'"}
            </p>
            <p className="text-[11px] text-stone-500">
              OAuth2 Refresh Token actief
            </p>
          </div>

          {/* Instagram */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                Instagram
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/80 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" /> Verbonden
              </span>
            </div>
            <p className="text-xs text-stone-300 font-semibold truncate">
              @jack_howlin_official
            </p>
            <p className="text-[11px] text-stone-500">
              Long-Lived Graph Token
            </p>
          </div>

          {/* Facebook */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
                Facebook
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-800/80 px-2 py-0.5 rounded">
                <ShieldCheck className="w-3 h-3" /> Verbonden
              </span>
            </div>
            <p className="text-xs text-stone-300 font-semibold truncate">
              Jack Howlin&apos; Pagina
            </p>
            <p className="text-[11px] text-stone-500">
              Page Access Token actief
            </p>
          </div>

          {/* TikTok */}
          <div className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 space-y-2 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                  TikTok
                </span>
                <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/50 border border-amber-800/80 px-2 py-0.5 rounded">
                  Sandbox Actief
                </span>
              </div>
              <p className="text-xs text-stone-300 font-semibold truncate">
                @jack_howlin
              </p>
              <p className="text-[11px] text-stone-500">
                Sandbox Credentials gekoppeld
              </p>
            </div>

            <a
              href={`https://www.tiktok.com/v2/auth/authorize/?client_key=sbawow4ti5dov9966f&scope=user.info.basic,video.list,video.publish,video.upload&response_type=code&redirect_uri=${encodeURIComponent('https://jack-howlin-dashboard--jack-howlin-dashboard.europe-west4.hosted.app/api/auth/tiktok/callback')}&state=jackhowlin`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 block w-full text-center bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-bold py-1.5 px-2 rounded text-[11px] uppercase tracking-wider transition-colors shadow-sm"
            >
              Koppel TikTok Account ➔
            </a>
          </div>
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 2. PERSONA & AI VOICE GUIDELINES FORM                     */}
      {/* ───────────────────────────────────────────────────────── */}
      <form onSubmit={handleSavePersona} className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-lg space-y-6">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-stone-200">
              Jack Howlin&apos; AI Persona & Tone Parameters
            </h2>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold px-4 py-2 rounded-lg text-xs uppercase tracking-wider transition-all shadow flex items-center gap-1.5"
          >
            {saving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saving ? 'Opslaan...' : 'Wijzigingen Opslaan'}</span>
          </button>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs rounded-xl flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>Persona en AI-stuurparameters succesvol opgeslagen in Firestore!</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Artist Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
              Artiestenaam
            </label>
            <input
              type="text"
              value={persona.artistName}
              onChange={e => setPersona({ ...persona, artistName: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-semibold"
            />
          </div>

          {/* Genre */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
              Muziekgenre & Stijl
            </label>
            <input
              type="text"
              value={persona.genre}
              onChange={e => setPersona({ ...persona, genre: e.target.value })}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-semibold"
            />
          </div>
        </div>

        {/* Bio & Vibe */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
            Karakter, Bio & Sfeer (Achtergrond voor AI)
          </label>
          <textarea
            rows={3}
            value={persona.bio}
            onChange={e => setPersona({ ...persona, bio: e.target.value })}
            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
          />
        </div>

        {/* Tone Guidelines list */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
            Vaste Stemregels (Tone Guidelines)
          </label>
          <div className="space-y-2">
            {persona.toneGuidelines?.map((rule, idx) => (
              <div key={idx} className="flex items-center gap-2 bg-stone-950 px-3 py-2 rounded-lg border border-stone-800">
                <span className="text-amber-500 font-bold text-xs">•</span>
                <span className="text-xs text-stone-300 flex-1">{rule}</span>
                <button
                  type="button"
                  onClick={() => removeToneRule(idx)}
                  className="text-stone-500 hover:text-red-400 p-1 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-1">
            <input
              type="text"
              placeholder="Voeg een nieuwe stemregel toe (bijv: Nooit sycofantisch 'Dank je wel!' typen)"
              value={newRule}
              onChange={e => setNewRule(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addToneRule()
                }
              }}
              className="flex-1 bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={addToneRule}
              className="bg-stone-800 hover:bg-stone-700 text-stone-200 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border border-stone-700 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Toevoegen</span>
            </button>
          </div>
        </div>

        {/* Smart Links */}
        <div className="space-y-3 pt-2 border-t border-stone-800">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Smart Links (AI kan hier automatisch naar verwijzen)
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-stone-400">
                Spotify Artist / Track Link
              </label>
              <input
                type="text"
                value={persona.smartLinks?.spotify || ''}
                onChange={e =>
                  setPersona({
                    ...persona,
                    smartLinks: { ...persona.smartLinks, spotify: e.target.value },
                  })
                }
                placeholder="https://open.spotify.com/artist/..."
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-stone-400">
                YouTube Music Channel / Playlist
              </label>
              <input
                type="text"
                value={persona.smartLinks?.youtubeMusic || ''}
                onChange={e =>
                  setPersona({
                    ...persona,
                    smartLinks: { ...persona.smartLinks, youtubeMusic: e.target.value },
                  })
                }
                placeholder="https://music.youtube.com/..."
                className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Custom Instructions */}
        <div className="space-y-1.5 pt-2 border-t border-stone-800">
          <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
            Extra AI Instructies & Gedrag
          </label>
          <textarea
            rows={2}
            value={persona.customInstructions}
            onChange={e => setPersona({ ...persona, customInstructions: e.target.value })}
            className="w-full bg-stone-950 border border-stone-800 rounded-lg p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
            placeholder="Bijv: Als iemand vraagt waar de muziek te luisteren is, noem altijd Spotify."
          />
        </div>
      </form>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 3. FANS CRM & TOP ENGAGED LISTENERS                       */}
      {/* ───────────────────────────────────────────────────────── */}
      <section className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-stone-200">
              Fan CRM & Superfans ({fans.length} geregistreerde luisteraars)
            </h2>
          </div>
          <span className="text-[11px] text-stone-500">
            Automatisch gesorteerd op interactie & loyaliteit
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {fans.map(fan => (
            <div
              key={fan.id}
              className="bg-stone-950 border border-stone-800/80 rounded-xl p-3.5 space-y-2 hover:border-stone-700 transition-all shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  {fan.authorAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={fan.authorAvatar}
                      alt=""
                      className="w-7 h-7 rounded-full object-cover border border-stone-700 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center text-[10px] font-bold text-amber-400 flex-shrink-0">
                      {fan.author.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-stone-200 truncate" title={fan.author}>
                    {fan.author}
                  </span>
                </div>

                {fan.isSuperfan && (
                  <span className="flex items-center gap-1 text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/60 px-1.5 py-0.5 rounded uppercase tracking-wider">
                    <Star className="w-2.5 h-2.5 text-amber-400 fill-amber-400" />
                    Superfan
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1 border-t border-stone-800/60">
                <span>Reacties geplaatst:</span>
                <span className="font-bold text-amber-400 bg-stone-900 px-2 py-0.5 rounded border border-stone-800">
                  {fan.commentCount} {fan.commentCount === 1 ? 'reactie' : 'reacties'}
                </span>
              </div>

              {fan.recentComments && fan.recentComments.length > 0 && (
                <p className="text-[11px] text-stone-400 italic line-clamp-1 bg-stone-900/60 p-1.5 rounded">
                  &ldquo;{fan.recentComments[0]}&rdquo;
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────── */}
      {/* 4. OUTLAW AMERICANA AI VIDEO & VISUAL PROMPT STUDIO       */}
      {/* ───────────────────────────────────────────────────────── */}
      <VisualPromptStudio />

      {/* ───────────────────────────────────────────────────────── */}
      {/* 5. AI CONTENT STUDIO — CORE SET & SUNO LIBRARY           */}
      {/* ───────────────────────────────────────────────────────── */}
      <div className="mt-8 space-y-6">
        <div className="p-6 bg-stone-900/40 border border-stone-800/60 rounded-xl">
          <JackCoreSetManager />
        </div>
        <div className="p-6 bg-stone-900/40 border border-stone-800/60 rounded-xl">
          <SunoLibraryManager />
        </div>
      </div>
    </div>
  )
}
