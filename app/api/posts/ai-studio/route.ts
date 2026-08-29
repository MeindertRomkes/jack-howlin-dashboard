import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface AiStudioRequest {
  prompt: string
  mediaType: 'image' | 'video' | null
  fileName?: string
}

// Curated 2026 trending keywords & high-performance hashtag taxonomy
const TRENDING_HASHTAG_TAXONOMY = {
  core: ['#JackHowlin', '#OutlawCountry', '#Americana', '#AmericanMusic', '#AltCountry', '#DarkCountry'],
  aesthetic: ['#SouthernGothic', '#WesternNoir', '#DustyRoads', '#WhiskeySongs', '#CampfireAcoustic'],
  discovery: ['#IndependentArtist', '#SingerSongwriter', '#RootsMusic', '#CountryRock', '#RealCountryMusic'],
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, mediaType, fileName } = (await req.json()) as AiStudioRequest

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' })

    const systemPrompt = `You are the elite creative director, social media strategist, and SEO manager for "Jack Howlin'" — an internationally recognized, authentic Outlaw Americana, Dark Country, and Southern Gothic solo artist.

ARTIST PERSONA & VOICE RULES (STRICT):
1. **LANGUAGE**: ALWAYS WRITE IN ENGLISH (unless the user explicitly demands another language). Jack's global fanbase speaks English.
2. **TONE & AESTHETIC**: Gritty, unapologetic, soulful, cinematic western noir, campfire embers, dusty boots, vintage tube amps, gravelly honesty.
3. **STYLE**:
   - Short, confident, punchy, zero fluff, zero cheesy marketing jargon (never use: "Hey guys!", "Drop a like!", "Smash subscribe!", "So excited!").
   - Understated power. Authentic storytelling.
   - Use subtle, fitting emojis sparingly (🔥, 🥃, 🪵, 🎸, 🌙, 🐺, ⚡).
4. **HASHTAG & KEYWORD INTELLIGENCE (2026 Trends)**:
   - Combine High-Reach Core Tags (#OutlawCountry, #Americana, #AltCountry) with High-Engagement Niche/Atmospheric Tags (#SouthernGothic, #DarkCountry, #WesternNoir, #WhiskeySongs) and Discovery Tags (#IndependentArtist, #SingerSongwriter, #RootsMusic).
   - Tailor specifically for Instagram (clean 6-8 tags at bottom), TikTok (punchy searchable tags), YouTube (SEO keyword rich tags list), and Facebook (1-3 impactful tags).

USER INPUT / CONTEXT:
- Post Concept / Prompt: "${prompt || 'Outlaw Americana acoustic guitar track, raw campfire vibes'}"
- Media Type: ${mediaType ? mediaType.toUpperCase() : 'None (Text Status)'} ${fileName ? `(File: ${fileName})` : ''}

TASK:
1. Generate a primary gripping Master Caption in English with curated trending hashtags.
2. Generate 3 distinct stylistic variations in English:
   - **"Outlaw & Raw"**: Short, gritty, punchy, unapologetic bold statement.
   - **"Southern Gothic"**: Moody, atmospheric, cinematic, midnight highways and smoke.
   - **"Promo & Drop"**: Direct, engaging invitation to listen, stream, or comment.
3. If media is a video (or potential YouTube upload):
   - Generate a high-CTR, SEO-optimized YouTube Video Title (Format: e.g. "Song Title — Official Acoustic Video | Jack Howlin'").
   - Generate 12-15 comma-separated YouTube SEO search tags (e.g. "jack howlin", "outlaw country 2026", "dark americana", "southern gothic acoustic", "independent country music", "campfire live session", "colter wall vibes", "tyler childers style", "western noir").
4. Determine the best platforms:
   - If image: ["instagram", "facebook"] (YouTube/TikTok require video)
   - If video: ["youtube", "instagram", "tiktok", "facebook"]
   - If no media: ["facebook"]
5. Recommend an optimal prime-time posting schedule (ISO format string for today or tomorrow around 19:00).

Return strictly a valid JSON object matching this schema:
{
  "caption": "string",
  "title": "string",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5", "tag6", "tag7", "tag8", "tag9", "tag10", "tag11", "tag12"],
  "suggestedPlatforms": ["youtube", "instagram", "tiktok", "facebook"],
  "suggestedScheduleHoursFromNow": 4,
  "variations": [
    { "style": "Outlaw & Raw", "caption": "string" },
    { "style": "Southern Gothic", "caption": "string" },
    { "style": "Promo & Drop", "caption": "string" }
  ]
}`

    const result = await model.generateContent(systemPrompt)
    const text = result.response.text().trim()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not parse JSON from Gemini response')
    }

    const data = JSON.parse(jsonMatch[0])

    // Calculate default recommended schedule datetime
    const scheduleDate = new Date()
    scheduleDate.setHours(scheduleDate.getHours() + (data.suggestedScheduleHoursFromNow || 4))
    scheduleDate.setMinutes(0, 0, 0)
    const pad = (n: number) => n.toString().padStart(2, '0')
    const scheduledAtDefault = `${scheduleDate.getFullYear()}-${pad(scheduleDate.getMonth() + 1)}-${pad(scheduleDate.getDate())}T${pad(scheduleDate.getHours())}:${pad(scheduleDate.getMinutes())}`

    return NextResponse.json({
      caption: data.caption || '',
      title: data.title || '',
      tags: data.tags || [],
      suggestedPlatforms: data.suggestedPlatforms || (mediaType === 'image' ? ['instagram', 'facebook'] : ['youtube', 'instagram', 'tiktok', 'facebook']),
      scheduledAt: scheduledAtDefault,
      variations: data.variations || [],
    })
  } catch (error) {
    console.error('AI Studio generation error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI generation failed' },
      { status: 500 }
    )
  }
}
