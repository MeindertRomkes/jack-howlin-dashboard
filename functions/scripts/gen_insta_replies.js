const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { GoogleGenerativeAI } = require('@google/generative-ai');

if (!getApps().length) initializeApp({ projectId: 'jack-howlin-dashboard' });
const db = getFirestore();

async function run() {
  const client = new SecretManagerServiceClient();
  const [vKey] = await client.accessSecretVersion({ name: 'projects/jack-howlin-dashboard/secrets/GEMINI_API_KEY/versions/latest' });
  const geminiApiKey = vKey.payload.data.toString('utf8');
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

  const snap = await db.collection('comments').where('platform', '==', 'instagram').where('status', '==', 'new').get();
  console.log('Unreplied Instagram comments count:', snap.size);

  for (const doc of snap.docs) {
    const data = doc.data();
    const prompt = `You are writing Instagram comments for Jack Howlin', an Outlaw Americana / Dark Country artist.
Voice rules: Understated power, confident, short (under 15 words), max 1 emoji, never sycophantic.
This commenter (${data.author}) is a loyal Superfan from Australia who loves your music.

Generate 3 distinct reply options for this comment: "${data.text}" on Instagram reel "${data.videoTitle}".
Return strictly a JSON array with 3 strings: ["reply1", "reply2", "reply3"]`;

    const aiRes = await model.generateContent(prompt);
    const aiText = aiRes.response.text().trim();
    const match = aiText.match(/\[[\s\S]*\]/);
    if (match) {
      const replies = JSON.parse(match[0]);
      await doc.ref.update({ generatedReplies: replies });
      console.log('Updated AI replies for doc', doc.id, ':', replies);
    }
  }
}
run().catch(e => console.error(e));
