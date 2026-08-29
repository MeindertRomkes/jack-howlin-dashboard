import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const { sceneIdea, targetTool, visualStyle, songTitle } = await req.json()

    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'GEMINI_API_KEY ontbreekt' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `
You are the master cinematographer and visual director for Jack Howlin', a modern Outlaw Americana musical world.

Visual Identity Guidelines:
- World: Blend of Period Western (dusty saloons, weathered wooden porches, horses, revolvers, old paper wanted posters) and Modern Americana (lonely highways, vintage Chevy/Ford pickup trucks, rainy roadside motels with flickering neon signs, roadside diners, whiskey bars, acoustic guitars).
- Signature Symbol: Jack's worn cowboy hat is his crown (dusty, battered, defiant).
- Camera & Look: Cinematic 35mm film aesthetic, Kodak 500T grain, anamorphic lens flares, golden hour / moody dusk lighting, atmospheric haze and dust particles, shallow depth of field, slow dramatic camera pans.

User Request:
- Scene Idea: ${sceneIdea || 'A lone rider at dusk pulling up to an abandoned roadside motel with a neon sign'}
- Song Association: ${songTitle || 'Hate Me All You Want'}
- Target Tool: ${targetTool || 'Kling AI / Runway Gen-3'}
- Visual Style / Medium: ${visualStyle || 'Cinematic Video (Photorealistic 35mm Film)'}

Generate:
1. "videoPrompt": A comprehensive, high-detail text prompt tailored for AI video generators (e.g. Kling, Runway Gen-3, Luma Dream Machine) detailing lighting, camera movement, motion, and atmosphere.
2. "negativePrompt": Optimized negative prompt to avoid cartoonish, low-res, or overly polished pop-country looks.
3. "imagePrompt": A Midjourney / Flux v1 style prompt for static single cover art or teaser poster.
4. "cameraDirections": Specific camera movement description (e.g. Slow tracking low-angle pan from pickup tire to cowboy boots).
5. "lightingMood": Brief description of the lighting setup (e.g. Golden hour backlight, volumetric dust rays, neon blue-amber contrast).

Return ONLY valid JSON format with this exact schema:
{
  "videoPrompt": "...",
  "negativePrompt": "...",
  "imagePrompt": "...",
  "cameraDirections": "...",
  "lightingMood": "..."
}
`

    const result = await model.generateContent(prompt)
    const rawText = result.response.text().trim()
    const cleanedJson = rawText.replace(/```json\n?|\n?```/g, '').trim()
    const parsed = JSON.parse(cleanedJson)

    return NextResponse.json(parsed)
  } catch (err: unknown) {
    console.error('Prompt generator error:', err)
    const message = err instanceof Error ? err.message : 'Fout bij genereren van prompts'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
