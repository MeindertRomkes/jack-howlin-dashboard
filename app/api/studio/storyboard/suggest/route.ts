import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  type ShotType,
  type StoryboardSceneSuggestion,
  type StoryboardSuggestRequest,
  type StoryboardSuggestResponse,
  splitDuration,
  cleanCaption,
  generateStoryboardFallback,
} from '@/lib/storyboard-helpers'

const VALID_SHOT_TYPES = new Set<ShotType>(['wide', 'medium', 'closeup', 'drone', 'pov'])

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
