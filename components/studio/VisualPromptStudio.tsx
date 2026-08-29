'use client'
import { useState } from 'react'
import {
  Film,
  Sparkles,
  Copy,
  Check,
  Camera,
  RefreshCw,
  Sun,
  Video,
  Image as ImageIcon,
} from 'lucide-react'

const PRESET_TEMPLATES = [
  {
    title: 'Highway Sunset & Vintage Pickup',
    scene: 'A dusty vintage 1972 Chevrolet pickup parked on the shoulder of a deserted Nevada highway at golden hour, heat haze shimmering off the asphalt, a worn black cowboy hat resting on the hood.',
  },
  {
    title: 'Neon Motel & Rain Reflections',
    scene: 'A lone outlaw figure in a battered brown leather jacket and dusty cowboy hat standing under the flickering neon sign of an abandoned roadside motel in a light midnight drizzle.',
  },
  {
    title: 'Saloon Silhouette & Acoustic Guitar',
    scene: 'Inside a dimly lit wood-timbered western tavern, shafts of warm amber sunlight cutting through tobacco smoke, an acoustic guitar resting against a weathered oak chair.',
  },
  {
    title: 'Prairie Crown & Distant Storm',
    scene: 'Low angle shot looking up at a silhouette against an epic purple-gray thunderstorm rolling across the open prairie, a raven taking flight into the wind.',
  },
]

export default function VisualPromptStudio() {
  const [sceneIdea, setSceneIdea] = useState(PRESET_TEMPLATES[0].scene)
  const [songTitle, setSongTitle] = useState('Hate Me All You Want')
  const [targetTool, setTargetTool] = useState('Kling AI / Runway Gen-3')
  const [visualStyle, setVisualStyle] = useState('Cinematic 35mm Film (Kodak 500T)')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{
    videoPrompt?: string
    negativePrompt?: string
    imagePrompt?: string
    cameraDirections?: string
    lightingMood?: string
  } | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setGenerating(true)
    try {
      const res = await fetch('/api/studio/prompt-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sceneIdea,
          songTitle,
          targetTool,
          visualStyle,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult(data)
      }
    } catch (err) {
      console.error('Error generating prompts:', err)
    } finally {
      setGenerating(false)
    }
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  return (
    <section className="bg-stone-900 border border-stone-800 rounded-xl p-6 shadow-lg space-y-6">
      <div className="flex items-center justify-between border-b border-stone-800 pb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Film className="w-4 h-4 text-amber-500" />
          <h2 className="text-sm font-extrabold uppercase tracking-wider text-stone-200">
            Outlaw Americana AI Video & Visual Prompt Studio
          </h2>
        </div>
        <span className="text-[11px] text-stone-500 font-medium">
          Cinematic prompts voor Kling, Runway Gen-3, Luma & Midjourney
        </span>
      </div>

      {/* Preset Pills */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider">
          Kies een Outlaw Scene Concept of typ je eigen idee:
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_TEMPLATES.map((tmpl, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSceneIdea(tmpl.scene)}
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold ${
                sceneIdea === tmpl.scene
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                  : 'bg-stone-950 text-stone-400 border-stone-800 hover:text-stone-200 hover:border-stone-700'
              }`}
            >
              {tmpl.title}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleGenerate} className="space-y-4">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-stone-300 uppercase tracking-wider">
            Scene Beschrijving (Visual Prompt Context)
          </label>
          <textarea
            rows={3}
            value={sceneIdea}
            onChange={e => setSceneIdea(e.target.value)}
            className="w-full bg-stone-950 border border-stone-800 rounded-xl p-3 text-xs text-stone-200 focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
            placeholder="Beschrijf de scene die je voor een videoclip, short of single cover wilt maken..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Songtitel / Single
            </label>
            <input
              type="text"
              value={songTitle}
              onChange={e => setSongTitle(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-semibold"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Doel AI Video/Beeld Tool
            </label>
            <select
              value={targetTool}
              onChange={e => setTargetTool(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="Kling AI">Kling AI (v1.5 / v2.0)</option>
              <option value="Runway Gen-3 Alpha">Runway Gen-3 Alpha</option>
              <option value="Luma Dream Machine">Luma Dream Machine</option>
              <option value="OpenAI Sora">OpenAI Sora</option>
              <option value="Midjourney v6.1 / Flux.1">Midjourney v6.1 / Flux.1 (Cover Art)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Cinematische Stijl
            </label>
            <select
              value={visualStyle}
              onChange={e => setVisualStyle(e.target.value)}
              className="w-full bg-stone-950 border border-stone-800 rounded-lg px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="Cinematic 35mm Film (Kodak 500T)">Cinematic 35mm Film (Kodak 500T)</option>
              <option value="Anamorphic Widescreen 70mm">Anamorphic Widescreen 70mm</option>
              <option value="Moody Dark Americana Noir">Moody Dark Americana Noir</option>
              <option value="Golden Hour Dusty Western">Golden Hour Dusty Western</option>
              <option value="Vintage 16mm Roadtrip Footage">Vintage 16mm Roadtrip Footage</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={generating}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-stone-950 font-bold px-5 py-2 rounded-lg text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2"
          >
            {generating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Prompt wordt berekend...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Genereer 4K Prompts ➔</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Results Display */}
      {result && (
        <div className="space-y-4 pt-4 border-t border-stone-800 animate-fadeIn">
          {/* Video Prompt Card */}
          {result.videoPrompt && (
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Video className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-stone-200">
                    AI Video Prompt ({targetTool})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(result.videoPrompt!, 'video')}
                  className="bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-700 px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'video' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'video' ? 'Gekopieerd!' : 'Kopieer Prompt'}</span>
                </button>
              </div>
              <p className="text-xs text-stone-300 font-mono bg-stone-900/80 p-3 rounded-lg leading-relaxed border border-stone-800/80 select-all">
                {result.videoPrompt}
              </p>
            </div>
          )}

          {/* Image / Cover Art Prompt Card */}
          {result.imagePrompt && (
            <div className="bg-stone-950 border border-stone-800 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-pink-400" />
                  <span className="text-xs font-extrabold uppercase tracking-wider text-stone-200">
                    Midjourney / Flux Single Cover Prompt
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => copyText(result.imagePrompt!, 'image')}
                  className="bg-stone-900 hover:bg-stone-800 text-amber-400 border border-stone-700 px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copiedKey === 'image' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'image' ? 'Gekopieerd!' : 'Kopieer Prompt'}</span>
                </button>
              </div>
              <p className="text-xs text-stone-300 font-mono bg-stone-900/80 p-3 rounded-lg leading-relaxed border border-stone-800/80 select-all">
                {result.imagePrompt}
              </p>
            </div>
          )}

          {/* Cinematography metadata breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.cameraDirections && (
              <div className="bg-stone-950/80 border border-stone-800/80 rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Camera Beweging & Lens
                </span>
                <p className="text-xs text-stone-300">{result.cameraDirections}</p>
              </div>
            )}

            {result.lightingMood && (
              <div className="bg-stone-950/80 border border-stone-800/80 rounded-lg p-3 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                  <Sun className="w-3 h-3" /> Belichting & Sfeer
                </span>
                <p className="text-xs text-stone-300">{result.lightingMood}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
