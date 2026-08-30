import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface StoryboardSuggestRequest {
  trackTitle?: string
  snippetDuration: number
  highlightLyric?: string
  mood?: string
  targetPlatform?: string
}

export type ShotType = 'wide' | 'medium' | 'closeup' | 'drone' | 'pov'

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

const VALID_SHOT_TYPES = new Set<ShotType>(['wide', 'medium', 'closeup', 'drone', 'pov'])

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.slice(7).trim()
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      await adminAuth.verifyIdToken(token)
    } catch {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let body: StoryboardSuggestRequest
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const fallback = generateStoryboardFallback(body || { snippetDuration: 30 })
    const targetDurations = splitDuration(body?.snippetDuration)

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(fallback, { status: 200 })
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const trackTitle = body.trackTitle || 'Untitled Track'
      const highlightLyric = body.highlightLyric || 'None'
      const mood = body.mood || 'Dark Western, Gritty, Confident'
      const targetPlatform = body.targetPlatform || 'instagram'
      const sceneCount = targetDurations.length

      const sceneDurationBreakdown = targetDurations
        .map((dur, i) => `  - Scene ${i + 1}: ${dur} seconds`)
        .join('\n')

      const systemPrompt = `You are the lead AI Scene Director and Visual Storyboarder for Jack Howlin' — an authentic Outlaw Americana, country-rock, and dark western solo artist.

Jack Howlin' Persona & Visual Guidelines:
1. World & Aesthetic:
   - Dusty desert highways, sunset silhouettes, weathered 1972 Chevy pickups, lonely crossroads, dark neon roadhouse saloons, campfire embers, worn Stetson hats, rugged leather and denim.
   - Cinematic 35mm film stills, Kodak 500T aesthetic, moody amber and red neon lighting, volumetric haze, atmospheric smoke and dust.
2. Directing Dynamics:
   - You must structure a multi-scene storyboard consisting of EXACTLY ${sceneCount} distinct film scenes / cuts.
   - Target durations for each scene are:
${sceneDurationBreakdown}
   - Shot Types allowed: "wide", "medium", "closeup", "drone", "pov". Create varied, complementary camera cuts across the sequence (e.g. Wide establishing shot -> Driving/POV medium shot -> Dramatic closeup climax).
   - Camera Motion: Vivid dynamic camera movement (e.g. "Slow dolly in", "Smooth tracking shot alongside pickup", "Handheld pan with gritty vibration", "Push-in on eyes").
   - Scene Prompt: High-detail 35mm cinematic prompt tailored for video generation (Kie Seedance 2.5).
3. STRICT PERSONA RULES FOR CAPTION:
   - Maximum 2 sentences.
   - ABSOLUTELY NO exclamation marks (!). Never use '!'.
   - Tone: Raw, gritty, confident, reflective, short and punchy.
   - NO generic social marketing ("Hey guys!", "Check it out!", "Hope you love it!").
4. Hashtags:
   - Array of 4-6 relevant hashtags including #JackHowlin, #OutlawAmericana, #CountryRock.

Context for this Storyboard:
- Track Title: "${trackTitle}"
- Highlight Lyric: "${highlightLyric}"
- Mood: "${mood}"
- Target Platform: "${targetPlatform}"
- Total Snippet Duration: ${targetDurations.reduce((a, b) => a + b, 0)}s across ${sceneCount} scenes.

Return ONLY a valid JSON object matching this schema:
{
  "scenes": [
    {
      "index": 0,
      "duration": ${targetDurations[0]},
      "shotType": "wide",
      "prompt": "Gritty 35mm cinematic film still...",
      "cameraMotion": "Slow dolly-in towards subject..."
    }
  ],
  "caption": "Short gritty caption. Max two sentences.",
  "hashtags": ["#JackHowlin", "#OutlawAmericana", "#CountryRock", "#Americana"]
}`

      const result = await model.generateContent(systemPrompt)
      const rawText = result.response.text().trim()
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from Gemini response')
      }

      const parsedData = JSON.parse(jsonMatch[0])

      // Sanitize and validate scenes
      const generatedScenes: StoryboardSceneSuggestion[] = targetDurations.map((dur, i) => {
        const parsedScene = Array.isArray(parsedData.scenes) ? parsedData.scenes[i] : undefined
        const fallbackScene = fallback.scenes[i]

        let shotType: ShotType = fallbackScene.shotType
        if (parsedScene?.shotType && VALID_SHOT_TYPES.has(parsedScene.shotType as ShotType)) {
          shotType = parsedScene.shotType as ShotType
        }

        const prompt =
          parsedScene?.prompt && typeof parsedScene.prompt === 'string' && parsedScene.prompt.trim()
            ? parsedScene.prompt.trim()
            : fallbackScene.prompt

        const cameraMotion =
          parsedScene?.cameraMotion && typeof parsedScene.cameraMotion === 'string' && parsedScene.cameraMotion.trim()
            ? parsedScene.cameraMotion.trim()
            : fallbackScene.cameraMotion

        return {
          index: i,
          duration: dur,
          shotType,
          prompt,
          cameraMotion,
        }
      })

      const rawCaption =
        parsedData?.caption && typeof parsedData.caption === 'string' ? parsedData.caption : fallback.caption
      const cleanedCap = cleanCaption(rawCaption) || fallback.caption

      let cleanedHashtags: string[] = []
      if (Array.isArray(parsedData?.hashtags) && parsedData.hashtags.length > 0) {
        cleanedHashtags = (parsedData.hashtags as unknown[])
          .filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
          .map((h: string) => {
            const trimmed = h.trim()
            return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
          })
      }
      if (cleanedHashtags.length === 0) {
        cleanedHashtags = fallback.hashtags
      }

      const responsePayload: StoryboardSuggestResponse = {
        scenes: generatedScenes,
        caption: cleanedCap,
        hashtags: cleanedHashtags,
      }

      return NextResponse.json(responsePayload, { status: 200 })
    } catch (genErr) {
      console.warn('Gemini storyboard suggestion failed, using fallback:', genErr)
      return NextResponse.json(fallback, { status: 200 })
    }
  } catch (err: unknown) {
    console.error('Storyboard suggest route error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Server error' },
      { status: 500 }
    )
  }
}
