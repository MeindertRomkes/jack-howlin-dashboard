import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { adminDb } from '@/lib/firebase-admin'

interface GeneratedMerchPost {
  angle: 'story' | 'defiance' | 'minimal' | 'scarcity' | 'lifestyle'
  angleLabel: string
  title: string
  caption: string
  hashtags: string
  platforms: ('instagram' | 'tiktok' | 'youtube' | 'facebook')[]
  suggestedVisualScene: string
  scheduledAt: string
}

export async function POST(req: NextRequest) {
  try {
    const {
      productName,
      productType,
      productUrl,
      associatedSong,
      keyHook,
      postCount = 5,
      startDate = new Date().toISOString(),
      intervalDays = 3,
      platforms = ['instagram', 'tiktok', 'facebook'],
    } = await req.json()

    if (!productName) {
      return NextResponse.json({ error: 'Productnaam is verplicht' }, { status: 400 })
    }

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY ontbreekt' }, { status: 500 })
    }

    let personaBio = "Modern Outlaw Americana artist and cinematic storytelling project. Jack's cowboy hat is his crown. He refuses to bow. Weathered, dusty, defiant, road-worn."
    try {
      const personaDoc = await adminDb.collection('settings').doc('persona').get()
      if (personaDoc.exists) {
        const data = personaDoc.data()
        if (data?.bio) personaBio = data.bio
      }
    } catch {
      // Fallback
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
You are the creative strategist for Jack Howlin', an Outlaw Americana musician and lifestyle brand.
Brand Context: ${personaBio}

Core Tone:
- Short, confident, understated power. Never sounds like a sleazy salesman.
- No exclamation marks. Max 2-3 sentences.
- Merchandise is framed as an emblem of resilience and outlaw brotherhood, not cheap retail.

Task:
Generate a batch of ${postCount} distinctly different promotional social media posts for:
- Product: "${productName}" (${productType || 'Apparel / Headwear'})
- Shop URL: ${productUrl || 'https://jackhowlin.com'}
- Linked Song / Statement: "${associatedSong || 'Hate Me All You Want'}"
- Core Hook / Lyric: "${keyHook || 'I still wear this crown.'}"
- Target Platforms: ${platforms.join(', ')}

Create unique angles for the posts:
1. Story & Symbolism (Why this design matters, the meaning of the weathered hat / crown)
2. Defiance & Statement (Unapologetic outlaw mentality, talk is cheap)
3. Minimalist & Raw (Single powerful sentence + shop link)
4. Scarcity & Quality (Limited batch, road-tested fabric, crafted for the highway)
5. Roadtrip & Lifestyle (Desert motel, truck tailgate, acoustic bar counter)

Return ONLY valid JSON matching this schema:
{
  "posts": [
    {
      "angle": "story | defiance | minimal | scarcity | lifestyle",
      "angleLabel": "The Lore / Het Verhaal",
      "title": "Short title",
      "caption": "Jack Howlin caption text",
      "hashtags": "#JackHowlin #OutlawAmericana #MerchDrop",
      "suggestedVisualScene": "Prompt description for photoshoot or AI visual staging"
    }
  ]
}
`

    const result = await model.generateContent(prompt)
    const rawText = result.response.text().trim()
    const cleanedJson = rawText.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleanedJson)

    // Schedule posts across intervals starting from startDate
    const start = new Date(startDate)
    const scheduledPosts: GeneratedMerchPost[] = ((parsed.posts || []) as GeneratedMerchPost[]).map(
      (item, idx) => {
        const postDate = new Date(start)
        postDate.setDate(postDate.getDate() + idx * Number(intervalDays))
        postDate.setHours(19, 30, 0, 0) // Peak Americana social window

        return {
          ...item,
          platforms,
          scheduledAt: postDate.toISOString(),
        }
      }
    )

    return NextResponse.json({ success: true, posts: scheduledPosts })
  } catch (err) {
    console.error('Merch batch generation error:', err)
    const message = err instanceof Error ? err.message : 'Fout bij genereren van merch batch'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}