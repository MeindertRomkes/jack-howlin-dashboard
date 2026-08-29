import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

interface AiStudioRequest {
  prompt: string
  mediaType: 'image' | 'video' | null
  fileName?: string
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, mediaType, fileName } = (await req.json()) as AiStudioRequest

    if (!prompt && !fileName) {
      return NextResponse.json(
        { error: 'Prompt of bestandsnaam is vereist' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'GEMINI_API_KEY niet geconfigureerd' },
        { status: 500 }
      )
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const systemPrompt = `You are the ultimate creative social media director and copywriter for "Jack Howlin'", a modern Outlaw Americana & Country Rock solo artist.
Jack's persona: Gritty, authentic, confident, rugged, campfire firelight vibes, acoustic guitars, storytelling, no corporate speak, no cheesy fake hype, never apologetic.
Language: Dutch (or naturally mixed with English music terms where appropriate for social media).

The user is providing an idea or context for a post:
- User Idea / Context: "${prompt || 'Authentic Jack Howlin outlaw americana post'}"
- Media Attached: ${mediaType ? mediaType.toUpperCase() : 'None (Text post)'} ${fileName ? `(File: ${fileName})` : ''}

Your task:
1. Generate the main engaging post caption with emojis and fitting hashtags (#JackHowlin #Americana #OutlawCountry #NewMusic etc.).
2. If media is a video: generate an eye-catching, high-converting YouTube Video Title (max 80 chars) and relevant tags array.
3. Provide 3 diverse caption variations:
   - "Outlaw & Raw": Gritty, short, punchy, bold statement.
   - "Storyteller": Cinematic, moody, deeper background story about the song or moment.
   - "Promo & Drop": Clear call to action for fans (listen, stream, watch, comment).
4. Recommend the best matching platforms based on media rules:
   - If Image: ["instagram", "facebook"] (YouTube and TikTok do NOT support static images)
   - If Video: ["youtube", "instagram", "tiktok", "facebook"]
   - If Text Only: ["facebook"]
5. Recommend an optimal prime-time posting time (ISO string format for today or tomorrow around 18:30-20:00).

Return strictly a valid JSON object matching this schema:
{
  "caption": "string",
  "title": "string (or empty if not video)",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "suggestedPlatforms": ["youtube" | "instagram" | "tiktok" | "facebook"],
  "suggestedScheduleHoursFromNow": 4,
  "variations": [
    { "style": "Outlaw & Raw", "caption": "string" },
    { "style": "Storyteller", "caption": "string" },
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
      { error: 'AI generatie mislukt' },
      { status: 500 }
    )
  }
}
