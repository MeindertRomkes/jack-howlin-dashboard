import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface PromptGenRequest {
  trackTitle?: string
  snippetName?: string
  highlightLyric?: string
  videoType?: 'cinematic' | 'audiogram' | 'photo'
  targetPlatform?: 'tiktok' | 'instagram' | 'youtube' | 'facebook'
  // Legacy / optional fields
  sceneIdea?: string
  songTitle?: string
  targetTool?: string
  visualStyle?: string
}

export interface PromptGenResponse {
  prompt: string
  caption: string
  hashtags: string[]
  videoPrompt?: string
  imagePrompt?: string
  cameraDirections?: string
  lightingMood?: string
}

function cleanCaption(text: string): string {
  // Remove all exclamation marks as per Jack Howlin' Persona
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

function generateFallback(reqBody: PromptGenRequest): PromptGenResponse {
  const track = reqBody.trackTitle || reqBody.songTitle || ''
  const lyric = reqBody.highlightLyric?.trim() || ''
  const videoType = reqBody.videoType || 'cinematic'
  const platform = reqBody.targetPlatform || 'instagram'
  const sceneIdea = reqBody.sceneIdea?.trim() || ''

  let prompt = ''
  if (sceneIdea) {
    prompt = `Gritty 35mm cinematic film still of ${sceneIdea}, moody lighting, atmospheric dust and smoke, 35mm Kodak 500T film aesthetic.`
  } else if (videoType === 'audiogram') {
    prompt = `Cinematic moody 35mm film portrait of Jack Howlin' in a worn Stetson cowboy hat and vintage leather jacket, standing under warm amber saloon neon lighting with soft volumetric haze, shallow depth of field, Kodak 500T grain.`
  } else if (videoType === 'photo') {
    prompt = `Gritty 35mm film still of Jack Howlin' beside a vintage 1972 Chevy pickup on a deserted desert highway at golden hour, atmospheric heat haze and dust particles, Kodak 500T aesthetic.`
  } else {
    prompt = `Gritty 35mm cinematic film still of Jack Howlin' walking down a lonely dusty desert highway at dusk, wearing a battered cowboy hat and rugged denim jacket, moody amber sunset backlight, atmospheric smoke and dust, Kodak 500T aesthetic.`
  }

  if (track && !sceneIdea) {
    prompt += ` Capturing the raw spirit of "${track}".`
  }

  let caption = ''
  if (lyric) {
    caption = `"${lyric.replace(/[!]/g, '')}." The road goes on, and so do we.`
  } else if (track) {
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
    prompt,
    caption,
    hashtags,
    videoPrompt: prompt,
    imagePrompt: prompt,
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

    let body: PromptGenRequest
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const fallback = generateFallback(body || {})

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY
    if (!apiKey) {
      return NextResponse.json(fallback, { status: 200 })
    }

    try {
      const genAI = new GoogleGenerativeAI(apiKey)
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

      const trackTitle = body.trackTitle || body.songTitle || 'Untitled Track'
      const snippetName = body.snippetName || 'Main Hook'
      const highlightLyric = body.highlightLyric || 'None'
      const videoType = body.videoType || 'cinematic'
      const targetPlatform = body.targetPlatform || 'instagram'
      const sceneIdea = body.sceneIdea || ''

      const systemPrompt = `You are the creative visual director and voice for Jack Howlin' — an authentic Outlaw Americana, country-rock, and dark western solo artist.

Jack Howlin' Persona Guidelines:
1. World & Aesthetic: Dusty highways, neon saloons, vintage pickups, campfire smoke, worn Stetson hats, rugged leather and denim, lonely crossroads.
2. Tone of Voice: Gritty, confident, reflective, short, punchy.
3. STRICT RULES FOR CAPTION:
   - Maximum 2 sentences.
   - ABSOLUTELY NO exclamation marks (!). Never use '!'.
   - Never use cheesy, generic marketing phrases (e.g. "Thanks for listening!", "Check it out!", "Hope you like it!", "Hey guys!").
4. Visual Prompts:
   - Gritty 35mm cinematic film still, Kodak 500T aesthetic, moody lighting, golden hour / desert highway / vintage pickup / smoke / neon bar.
   - Tailored for AI video and image engines (Kie Seedance 2.5, Seedream 5 Pro, Midjourney).

Context:
- Track Title: "${trackTitle}"
- Snippet / Segment: "${snippetName}"
- Highlight Lyric: "${highlightLyric}"
- Video / Asset Type: "${videoType}"
- Target Platform: "${targetPlatform}"
${sceneIdea ? `- User Scene Idea: "${sceneIdea}"` : ''}

Generate:
1. "prompt": A high-detail, cinematic visual prompt (Gritty 35mm film still, lighting, camera mood, outlaw americana aesthetic).
2. "caption": A short, authentic caption in Jack Howlin's voice (MAX 2 sentences, NO exclamation marks, confident).
3. "hashtags": Array of 4-6 relevant hashtags including #JackHowlin, #OutlawAmericana, and country-rock tags.

Return ONLY a valid JSON object matching this schema:
{
  "prompt": "...",
  "caption": "...",
  "hashtags": ["#JackHowlin", "#OutlawAmericana", "#CountryRock", "#Americana"]
}`

      const result = await model.generateContent(systemPrompt)
      const rawText = result.response.text().trim()
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from Gemini response')
      }

      const parsedData = JSON.parse(jsonMatch[0])

      const cleanedPrompt = (parsedData.prompt && typeof parsedData.prompt === 'string' && parsedData.prompt.trim())
        ? parsedData.prompt.trim()
        : fallback.prompt

      const rawCaption = (parsedData.caption && typeof parsedData.caption === 'string')
        ? parsedData.caption
        : fallback.caption

      const cleanedCap = cleanCaption(rawCaption) || fallback.caption

      let cleanedHashtags: string[] = []
      if (Array.isArray(parsedData.hashtags) && parsedData.hashtags.length > 0) {
        cleanedHashtags = parsedData.hashtags
          .filter((h: any) => typeof h === 'string' && h.trim().length > 0)
          .map((h: string) => {
            const trimmed = h.trim()
            return trimmed.startsWith('#') ? trimmed : `#${trimmed}`
          })
      }
      if (cleanedHashtags.length === 0) {
        cleanedHashtags = fallback.hashtags
      }

      const responsePayload: PromptGenResponse = {
        prompt: cleanedPrompt,
        caption: cleanedCap,
        hashtags: cleanedHashtags,
        videoPrompt: cleanedPrompt,
        imagePrompt: cleanedPrompt,
      }

      return NextResponse.json(responsePayload, { status: 200 })
    } catch (genErr) {
      console.warn('Gemini generation failed, using fallback:', genErr)
      return NextResponse.json(fallback, { status: 200 })
    }
  } catch (err: any) {
    console.error('Studio prompt generator error:', err)
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 })
  }
}
