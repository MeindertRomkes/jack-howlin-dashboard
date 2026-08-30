import type { StoryboardScene } from '@/types'

// ─── Stitch Helpers ─────────────────────────────────────────────────────────

export interface StitchRequestBody {
  sceneUrls: string[]
  audioUrl?: string
  storyboardJobId?: string
  captionSuggestion?: string
  sunoTrackId?: string
  snippetId?: string
  linkedPostId?: string
}

/**
 * Validates that sceneUrls is a non-empty array of non-empty string URLs.
 */
export function validateStitchInput(sceneUrls: string[], audioUrl?: string): boolean {
  if (!Array.isArray(sceneUrls) || sceneUrls.length === 0) {
    return false
  }
  if (audioUrl && typeof audioUrl !== 'string') {
    return false
  }
  return sceneUrls.every(
    (url) => typeof url === 'string' && url.trim().length > 0
  )
}

/**
 * Resolves the master video URL:
 * - If single scene, returns the single scene video URL.
 * - If multiple scenes, resolves/generates the stitched master video URL in Firebase Storage.
 */
export function resolveMasterVideoUrl(sceneUrls: string[], storyboardJobId?: string): string {
  if (sceneUrls.length === 1) {
    return sceneUrls[0]
  }

  if (storyboardJobId) {
    return `https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/stitched%2F${encodeURIComponent(storyboardJobId)}_master.mp4?alt=media`
  }

  return `https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/stitched%2Fmaster_${Date.now()}.mp4?alt=media`
}

// ─── Storyboard Create Helpers ──────────────────────────────────────────────

export type ShotType = 'wide' | 'medium' | 'closeup' | 'drone' | 'pov'

export interface StoryboardCreateSceneInput {
  index?: number
  duration: number
  shotType: ShotType
  prompt: string
  cameraMotion?: string
}

export interface StoryboardCreateRequest {
  sunoTrackId?: string
  snippetId?: string
  totalDuration: number
  aspectRatio?: string
  audioUrl: string
  scenes: StoryboardCreateSceneInput[]
  captionSuggestion?: string
  linkedPostId?: string
}

export interface StoryboardCreateResponse {
  success: boolean
  storyboardJobId: string
  taskIds: string[]
  scenes: StoryboardScene[]
}

export function validateStoryboardCreateInput(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' }
  }
  const candidate = body as Partial<StoryboardCreateRequest>

  if (!candidate.audioUrl || typeof candidate.audioUrl !== 'string' || !candidate.audioUrl.trim()) {
    return { valid: false, error: 'audioUrl is required and must be a non-empty string' }
  }

  if (!Array.isArray(candidate.scenes) || candidate.scenes.length === 0) {
    return { valid: false, error: 'scenes must be a non-empty array' }
  }

  for (let i = 0; i < candidate.scenes.length; i++) {
    const scene = candidate.scenes[i]
    if (!scene || typeof scene !== 'object') {
      return { valid: false, error: `Scene at index ${i} is invalid` }
    }
    if (typeof scene.prompt !== 'string' || !scene.prompt.trim()) {
      return { valid: false, error: `Scene at index ${i} must have a non-empty prompt` }
    }
    if (typeof scene.duration !== 'number' || scene.duration <= 0 || !Number.isFinite(scene.duration)) {
      return { valid: false, error: `Scene at index ${i} must have a positive numeric duration` }
    }
  }

  return { valid: true }
}

export function buildScenePrompt(prompt: string, cameraMotion?: string, referenceUrls: string[] = []): string {
  const trimmedPrompt = prompt.trim()
  const refPrefix = referenceUrls.length > 0
    ? `Reference ${referenceUrls.map((_, i) => `@Image${i + 1}`).join(' ')} for the character appearance. `
    : ''
  let combined = `${refPrefix}${trimmedPrompt}`
  if (cameraMotion && cameraMotion.trim()) {
    if (!/[.!?]$/.test(combined)) {
      combined += '.'
    }
    combined += ` Camera motion: ${cameraMotion.trim()}`
  }
  return combined
}

// ─── Storyboard Suggest Helpers ─────────────────────────────────────────────

export interface StoryboardSuggestRequest {
  trackTitle?: string
  snippetDuration: number
  highlightLyric?: string
  mood?: string
  targetPlatform?: string
}

export interface StoryboardSceneSuggestion {
  index: number
  duration: number
  shotType: ShotType
  prompt: string
  cameraMotion: string
}

export interface StoryboardSuggestResponse {
  scenes: StoryboardSceneSuggestion[]
  caption: string
  hashtags: string[]
}

/**
 * Enforces duration bounds (min 3s, max 120s, default 30s) and dynamically
 * splits total duration into 1-4 scenes:
 * - <= 15s -> 1 scene
 * - 16-30s -> 2 scenes
 * - 31-45s -> 3 scenes (e.g. 37s -> [12, 12, 13], sum = 37)
 * - 46+s   -> 4 scenes (e.g. 55s -> [13, 13, 13, 16], sum = 55)
 */
export function splitDuration(rawDuration?: number): number[] {
  const numericDuration = Number(rawDuration)
  const clamped = Math.min(
    120,
    Math.max(3, Math.round(Number.isFinite(numericDuration) && numericDuration > 0 ? numericDuration : 30))
  )

  if (clamped <= 15) {
    return [clamped]
  }

  if (clamped <= 30) {
    const s1 = Math.floor(clamped / 2)
    const s2 = clamped - s1
    return [s1, s2]
  }

  const sceneCount = clamped > 45 ? 4 : 3
  const base = Math.floor(clamped / sceneCount)
  const remainder = clamped % sceneCount
  const durations = Array(sceneCount).fill(base)
  durations[durations.length - 1] += remainder
  return durations
}

/**
 * Cleans caption adhering strictly to Jack Howlin' Persona:
 * - Strips all exclamation marks (!)
 * - Capped at maximum 2 sentences
 * - Ensures proper period termination
 */
export function cleanCaption(text: string): string {
  if (!text) return ''

  // Remove all exclamation marks
  let cleaned = text.replace(/!/g, '').trim()

  // Ensure maximum 2 sentences
  const sentences = cleaned.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
  if (sentences.length > 2) {
    cleaned = sentences.slice(0, 2).join(' ')
  }

  cleaned = cleaned.trim()
  if (cleaned.length > 0 && !/[.]$/.test(cleaned)) {
    cleaned += '.'
  }

  return cleaned
}

/**
 * Robust fallback generator for deterministic scene suggestions
 * when Gemini API is unavailable or returns invalid data.
 */
export function generateStoryboardFallback(reqBody: StoryboardSuggestRequest): StoryboardSuggestResponse {
  const track = reqBody.trackTitle?.trim() || 'Untitled Track'
  const lyric = reqBody.highlightLyric?.trim() || ''
  const platform = (reqBody.targetPlatform || 'instagram').toLowerCase()
  const mood = reqBody.mood?.trim() || ''

  const durations = splitDuration(reqBody.snippetDuration)
  const sceneCount = durations.length

  const templateLibrary: Array<{
    shotType: ShotType
    prompt: string
    cameraMotion: string
  }> = [
    {
      shotType: 'wide',
      prompt: `Gritty 35mm cinematic film still of Jack Howlin' standing beside a weathered 1972 Chevy pickup on a deserted desert highway at dusk, battered Stetson cowboy hat, rugged denim jacket, amber sunset backlight, atmospheric smoke and dust haze, Kodak 500T aesthetic.`,
      cameraMotion: 'Slow cinematic dolly-in towards subject with atmospheric dust drifting through the frame.',
    },
    {
      shotType: 'medium',
      prompt: `Cinematic 35mm film still of Jack Howlin' driving down an endless asphalt highway at twilight, dashboard instruments casting warm amber light on worn leather sleeves, cigarette smoke curling into the cool night air.`,
      cameraMotion: 'Smooth tracking shot moving alongside the driver-side window through desert dusk.',
    },
    {
      shotType: 'pov',
      prompt: `POV 35mm film still from inside the vintage pickup looking out across the cracked center line of Route 66 heading towards distant purple mountains under a dramatic stormy sunset sky.`,
      cameraMotion: 'Forward tracking shot down the highway center line with subtle vehicle vibration.',
    },
    {
      shotType: 'closeup',
      prompt: `Intense 35mm close-up film portrait of Jack Howlin', weathered jawline under the brim of a worn cowboy hat, piercing gaze, warm volumetric neon rim light from a roadside saloon sign, Kodak 500T grain.`,
      cameraMotion: 'Slow dramatic push-in focusing on facial intensity under flickering neon rim lighting.',
    },
  ]

  // Select templates appropriate for scene count
  let selectedTemplates: Array<{ shotType: ShotType; prompt: string; cameraMotion: string }> = []
  if (sceneCount === 1) {
    selectedTemplates = [templateLibrary[0]]
  } else if (sceneCount === 2) {
    selectedTemplates = [templateLibrary[0], templateLibrary[3]]
  } else if (sceneCount === 3) {
    selectedTemplates = [templateLibrary[0], templateLibrary[1], templateLibrary[3]]
  } else {
    selectedTemplates = [templateLibrary[0], templateLibrary[2], templateLibrary[1], templateLibrary[3]]
  }

  const scenes: StoryboardSceneSuggestion[] = durations.map((dur, idx) => {
    const tmpl = selectedTemplates[idx] || templateLibrary[idx % templateLibrary.length]
    let prompt = tmpl.prompt
    if (track && track !== 'Untitled Track') {
      prompt += ` Capturing the raw spirit of "${track}".`
    }
    if (mood) {
      prompt += ` Atmosphere: ${mood}.`
    }

    return {
      index: idx,
      duration: dur,
      shotType: tmpl.shotType,
      prompt,
      cameraMotion: tmpl.cameraMotion,
    }
  })

  let caption = ''
  if (lyric) {
    caption = `"${lyric.replace(/!/g, '')}." The road goes on, and so do we.`
  } else if (track && track !== 'Untitled Track') {
    caption = `The dust never settled on this road. "${track}" is streaming everywhere.`
  } else {
    caption = 'The road never forgives, and the night never forgets. Outlaw Americana streaming now.'
  }

  caption = cleanCaption(caption)

  const hashtags = ['#JackHowlin', '#OutlawAmericana', '#CountryRock', '#Americana', '#NewMusic']
  if (platform === 'tiktok') hashtags.push('#TikTokMusic')
  else if (platform === 'instagram') hashtags.push('#Reels')
  else if (platform === 'youtube') hashtags.push('#Shorts')

  return {
    scenes,
    caption,
    hashtags,
  }
}
