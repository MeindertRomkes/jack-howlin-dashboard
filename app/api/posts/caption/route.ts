import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const { context, platform } = (await req.json()) as {
      context: string
      platform: string
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

    const prompt = `You are writing social media captions for Jack Howlin', a modern Outlaw Americana artist.
Jack's tone: short, confident, never apologetic, never tries too hard. No exclamation marks. Max 3 sentences.
Platform: ${platform}
Context: ${context}

Write 2 caption options that sound like Jack. Return ONLY valid JSON: {"options": ["caption1", "caption2"]}`

    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed = jsonMatch
      ? (JSON.parse(jsonMatch[0]) as { options: string[] })
      : { options: [] }

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('Caption generation failed:', err)
    return NextResponse.json({ options: [] }, { status: 500 })
  }
}
