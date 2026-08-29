import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminDb } from '@/lib/firebase-admin'

interface GeneratedPhase {
  dayOffset: number
  phase: string
  daysFromRelease: string
  recommendedHour: string
  platforms: ('youtube' | 'instagram' | 'tiktok' | 'facebook')[]
  title: string
  caption: string
  hashtags: string
  visualHookPrompt: string
  contentType: 'reel' | 'short' | 'video' | 'post'
}

export async function POST(req: NextRequest) {
  try {
    const { songTitle, releaseDate, songTheme, keyLyrics, platforms } = await req.json()

    if (!songTitle || !releaseDate) {
      return NextResponse.json({ error: 'Songtitel en releasedatum zijn verplicht' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY ontbreekt' }, { status: 500 })
    }

    // Fetch persona config if available
    let personaBio = "Modern Outlaw Americana artist and cinematic storytelling project. Jack's cowboy hat is his crown. He refuses to bow. Weathered, dusty, defiant, road-worn."
    try {
      const personaDoc = await adminDb.collection('settings').doc('persona').get()
      if (personaDoc.exists) {
        const data = personaDoc.data()
        if (data?.bio) personaBio = data.bio
      }
    } catch {
      // Use fallback
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
You are the creative strategist and voice for Jack Howlin', an Outlaw Americana musician.
Persona & Identity:
${personaBio}

Core Tone:
- Short, confident, never apologetic, understated power.
- Never tries too hard. No exclamation marks.
- Cowboy hat is his crown. Highways, open land, resilience, weathered pride.

Task:
Generate a complete 7-Post Social Media Release Campaign for the new single: "${songTitle}".
Target Release Date: ${releaseDate}
Song Theme / Vibe: ${songTheme || 'Defiance, open road, outlaw storytelling'}
Key Lyrics / Snippet: ${keyLyrics || 'Hate me all you want. I still wear this crown.'}
Target Platforms: ${(platforms || ['youtube', 'instagram', 'tiktok', 'facebook']).join(', ')}

Create 7 strategic rollout posts:
1. Day -3: The Teaser / Lore (Setting the atmosphere, dusty highway or saloon clip, audio hint)
2. Day -1: Countdown & Sneak Peek (Raw verse preview, countdown to midnight)
3. Day 0: RELEASE DAY (Official announcement, streaming links CTA, bold outlaw statement)
4. Day +1: Lyric Story & Deep Dive (The meaning behind the verse, why this song was written)
5. Day +3: Outlaw Acoustic / Raw Performance Visual (Direct connection with fans)
6. Day +5: Superfan Spotlight & Listener Appreciation (Authentic gratitude in Jack's tone)
7. Day +7: 1-Week Milestone & Merch / Legacy (Celebrating the release, wearable outlaw crown)

Return ONLY valid JSON format with this exact schema:
{
  "campaign": [
    {
      "dayOffset": -3,
      "phase": "Teaser & Lore",
      "daysFromRelease": "3 dagen voor release",
      "recommendedHour": "18:30",
      "platforms": ["instagram", "tiktok", "youtube"],
      "title": "Short punchy internal title",
      "caption": "Jack Howlin' style caption without exclamation marks",
      "hashtags": "#JackHowlin #OutlawAmericana #CountryMusic #NewMusic",
      "visualHookPrompt": "Cinematic prompt description for Kling/Luma/Runway video generation",
      "contentType": "reel"
    }
  ]
}
`

    const result = await model.generateContent(prompt)
    const rawText = result.response.text().trim()
    const cleanedJson = rawText.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleanedJson)

    // Calculate actual date strings based on releaseDate and dayOffset
    const relDate = new Date(releaseDate)
    const formattedCampaign = ((parsed.campaign || []) as GeneratedPhase[]).map(item => {
      const postDate = new Date(relDate)
      postDate.setDate(postDate.getDate() + (item.dayOffset || 0))
      const [hours, minutes] = (item.recommendedHour || '19:00').split(':')
      postDate.setHours(Number(hours) || 19, Number(minutes) || 0, 0, 0)

      return {
        ...item,
        scheduledAt: postDate.toISOString(),
      }
    })

    return NextResponse.json({ campaign: formattedCampaign })
  } catch (err: unknown) {
    console.error('Campaign generator error:', err)
    const message = err instanceof Error ? err.message : 'Fout bij genereren van release campagne'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
