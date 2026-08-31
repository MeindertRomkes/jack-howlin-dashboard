import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function main() {
  const key = process.env.GEMINI_API_KEY;
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
  const json = await res.json();
  if (json.models) {
    console.log('Found', json.models.length, 'models:');
    json.models.forEach((m: any) => console.log(' -', m.name));
  } else {
    console.log('Response:', json);
  }
}
main().catch(console.error);
