import { getDb } from './admin'
import type { PersonaConfigDoc } from './types'

const DEFAULT_JACK_CONTEXT = `You are writing social media replies for Jack Howlin', a modern Outlaw Americana artist.

Jack's character: The outlaw who refuses to bow. Judged, rejected, still standing.
Voice rules:
- Short, confident, never apologetic
- Never tries too hard
- Max 2 sentences per reply
- NO exclamation marks unless ironic
- Understated power, not boastful
- Never sycophantic ("Thanks!", "That means the world!")
- Avoid: "Hey guys!", emoji overload, cowboy cosplay ("Howdy!"), pop-country vibe`

export async function generateRepliesForComment(commentId: string): Promise<void> {
  const db = getDb()
  const { GoogleGenerativeAI } = await import('@google/generative-ai')
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' })

  // Get the comment document
  const commentDoc = await db.collection('comments').doc(commentId).get()
  if (!commentDoc.exists) {
    console.log(`Comment ${commentId} not found`)
    return
  }
  const comment = commentDoc.data()!

  // Fetch Persona Config from Firestore
  let personaPrompt = DEFAULT_JACK_CONTEXT
  try {
    const personaSnap = await db.collection('settings').doc('persona').get()
    if (personaSnap.exists) {
      const pData = personaSnap.data() as PersonaConfigDoc
      personaPrompt = `You are writing social media replies for ${pData.artistName || "Jack Howlin'"}, a ${pData.genre || 'modern Outlaw Americana'} artist.
Bio & Atmosphere: ${pData.bio || 'The outlaw who refuses to bow.'}
Key Rules:
${(pData.toneGuidelines || []).map(g => `- ${g}`).join('\n')}
${pData.customInstructions ? `Additional notes: ${pData.customInstructions}` : ''}`
    }
  } catch (err) {
    console.log('[Persona] Using default persona prompt')
  }

  // Get last 20 approved replies for few-shot examples
  const historySnap = await db
    .collection('voice_history')
    .orderBy('timestamp', 'desc')
    .limit(20)
    .get()

  const examples = historySnap.docs.map(d => {
    const data = d.data()
    return `Comment: "${data.commentText as string}"\nJack replied: "${data.chosenReply as string}"`
  })

  const fewShotSection =
    examples.length > 0
      ? `\nExamples of replies Jack has approved:\n${examples.join('\n\n')}\n`
      : ''

  const fanContext = comment.isSuperfan
    ? `\nNOTE: This commenter (${comment.author}) is a SUPERFAN who has commented ${comment.fanCommentCount || 2}+ times. Acknowledge them warmly in Jack's understated, loyal style if fitting.`
    : ''

  const prompt = `${personaPrompt}
${fewShotSection}${fanContext}
Generate 3 distinct reply options for this comment. Each reply should be under 20 words. Vary the tone slightly between options. Return ONLY a valid JSON array with exactly 3 strings, no other text: ["reply1", "reply2", "reply3"]

Comment from ${comment.author as string} on "${comment.videoTitle as string}":
"${comment.text as string}"`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('Gemini did not return valid JSON array:', text)
      return
    }

    const replies: string[] = JSON.parse(jsonMatch[0])

    if (!Array.isArray(replies) || replies.length === 0) {
      console.error('Parsed replies is not a non-empty array:', replies)
      return
    }

    await db.collection('comments').doc(commentId).update({
      generatedReplies: replies,
    })

    console.log(`Generated ${replies.length} replies for comment ${commentId}`)
  } catch (err) {
    console.error('Failed to generate replies:', err)
  }
}
