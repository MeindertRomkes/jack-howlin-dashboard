const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

let envPath = path.resolve(__dirname, '../../.env.local');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, '../.env.local');
}
if (!fs.existsSync(envPath)) {
  envPath = path.resolve('.env.local');
}

const envContent = fs.readFileSync(envPath, 'utf8');
const getEnv = (key) => envContent.match(new RegExp(key + '=([^\\r\\n]+)'))?.[1]?.trim();

const GEMINI_API_KEY = getEnv('GEMINI_API_KEY');

initializeApp({ projectId: 'jack-howlin-dashboard' });
const db = getFirestore();

async function run() {
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const snap = await db.collection('comments').where('status', '==', 'new').get();
  console.log(`Generating replies for ${snap.size} unreplied comments...`);

  for (const doc of snap.docs) {
    const data = doc.data();
    const prompt = `You are Jack Howlin', an Outlaw Americana musician.
Generate 3 distinct, authentic reply options to this YouTube fan comment:
Video: "${data.videoTitle}"
Fan: "${data.author}"
Comment: "${data.text}"

Rules:
- Authentic outlaw country tone: grounded, appreciative, concise.
- Never use emojis excessively (maximum 1).
- Reply in JSON array format: ["option 1", "option 2", "option 3"]`;

    try {
      const res = await model.generateContent(prompt);
      const text = res.response.text();
      console.log('Gemini raw text:', text);
      const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const replies = JSON.parse(clean);
      await db.collection('comments').doc(doc.id).update({
        generatedReplies: replies
      });
      console.log(`Generated replies for ${data.author}:`, replies);
    } catch (e) {
      console.error(`Error generating for ${data.author}:`, e.message);
    }
  }
}
run();
