const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

let geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey) {
  const envContent = fs.readFileSync('../.env.local', 'utf8');
  geminiKey = envContent.match(/GEMINI_API_KEY=([^\r\n]+)/)?.[1]?.trim();
}

initializeApp({ projectId: 'jack-howlin-dashboard' });
const db = getFirestore();

const JACK_SYSTEM_CONTEXT = `You are writing social media replies for Jack Howlin', a modern Outlaw Americana artist.
Jack's character: The outlaw who refuses to bow. Judged, rejected, still standing.
Jack's voice rules:
- Short, confident, never apologetic
- Never tries too hard
- Max 2 sentences per reply
- NO exclamation marks unless ironic
- Understated power, not boastful
- Never sycophantic ("Thanks!", "That means the world!")
- Keep replies in English, or matching fan energy

AVOID writing: "Hey guys!", emoji overload, cowboy cosplay ("Howdy!"), pop-country vibe
Examples: "Been riding. Never stopped.", "Still here. Always have been.", "They talked. I kept riding."`;

async function gen() {
  const genAI = new GoogleGenerativeAI(geminiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });
  const snap = await db.collection('comments').where('status', '==', 'new').get();
  console.log(`Found ${snap.size} new comments`);
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.generatedReplies && data.generatedReplies.length > 0) {
      console.log(`Already has replies: ${data.author}`);
      continue;
    }
    const prompt = `${JACK_SYSTEM_CONTEXT}

A fan left this comment on YouTube on the ${data.sourceType || 'video'} "${data.videoTitle}":
"${data.text}"

Generate exactly 3 distinct reply options from Jack Howlin'.
Return ONLY a valid JSON array of 3 strings: ["reply 1", "reply 2", "reply 3"]. No other text.`;

    try {
      const res = await model.generateContent(prompt);
      const text = res.response.text().trim();
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const replies = JSON.parse(match[0]);
        await doc.ref.update({ generatedReplies: replies });
        console.log('✅ Generated replies for', data.author, ':', replies);
      }
    } catch(e) {
      console.error('Error on', doc.id, e.message);
    }
  }
}
gen();
