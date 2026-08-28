import * as admin from 'firebase-admin'
import { GoogleGenerativeAI } from '@google/generative-ai'

const JACK_SYSTEM_CONTEXT = `You are writing social media replies for Jack Howlin', a modern Outlaw Americana artist.

Jack's character: The outlaw who refuses to bow. Judged, rejected, still standing.

Jack's voice rules:
- Short, confident, never apologetic
- Never tries too hard
- Max 2 sentences per reply
- NO exclamation marks unless ironic
- Understated power, not boastful
- Never sycophantic ("Thanks!", "That means the world!")

AVOID writing: "Hey guys!", emoji overload, cowboy cosplay ("Howdy!"), pop-country vibe

Examples of Jack's voice:
"Been riding. Never stopped."
"Still here. Always have been."
"They talked. I kept riding."`

export async function generateRepliesForComment(commentId: string): Promise<void> {
  const db = admin.firestore()
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

  // Get the comment document
  const commentDoc = await db.collection('comments').doc(commentId).get()
  if (!commentDoc.exists) {
    console.log(`Comment ${commentId} not found`)
    return
  }
  const comment = commentDoc.data()!

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

  const prompt = `${JACK_SYSTEM_CONTEXT}
${fewShotSection}
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
