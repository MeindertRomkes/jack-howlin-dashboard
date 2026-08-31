import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config({ path: '.env.local' });

async function main() {
  const audioPath = 'D:/Downloads/Precision_Filmmaking_with_Higgsfield_Cinema_Studio.m4a';
  if (!fs.existsSync(audioPath)) {
    console.error('Audio file not found at:', audioPath);
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('GEMINI_API_KEY is not set');
    return;
  }

  console.log('Uploading audio to Gemini File API...');
  const fileManager = new GoogleAIFileManager(apiKey);
  const uploadResult = await fileManager.uploadFile(audioPath, {
    mimeType: 'audio/mp4',
    displayName: 'Precision_Filmmaking_with_Higgsfield_Cinema_Studio'
  });

  console.log('Upload complete. File URI:', uploadResult.file.uri);
  console.log('Waiting for file processing if needed...');

  let fileState = await fileManager.getFile(uploadResult.file.name);
  while (fileState.state === 'PROCESSING') {
    process.stdout.write('.');
    await new Promise(r => setTimeout(r, 5000));
    fileState = await fileManager.getFile(uploadResult.file.name);
  }

  if (fileState.state === 'FAILED') {
    console.error('File processing failed');
    return;
  }

  console.log('\nFile is ACTIVE! Analyzing content with Gemini...');

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

  const prompt = `
Je bent de hoofdonderzoeker voor AI Cinematography en Higgsfield Cinema Studio 4.0.
Analyseer dit audiobestand ('Precision Filmmaking with Higgsfield Cinema Studio') grondig en maak een uitgebreide, gestructureerde samenvatting in het Nederlands.

Zorg dat je specifiek focust op:
1. Wat is Precision Filmmaking in Higgsfield Cinema Studio?
2. Welke exacte technieken, tools en workflows worden besproken (bijv. Soul models, Seedance 2.5, camera controls, prompt structures, camera moves, lighting, pacing)?
3. Welke praktische regie- en productietips worden gegeven om inconsistenties ('AI slop/shimmer') en verspilling van credits te voorkomen?
4. Wat zijn de specifieke formules voor muziekvideo's, commercials of storytelling die we direct kunnen toepassen op ons project Jack Howlin?

Geef een diepgaand overzicht met alle concrete stappen, formules en inzichten.
`;

  const result = await model.generateContent([
    {
      fileData: {
        fileUri: uploadResult.file.uri,
        mimeType: uploadResult.file.mimeType
      }
    },
    { text: prompt }
  ]);

  const text = result.response.text();
  console.log('\n========================================================');
  console.log('🎙️ AUDIO ANALYSIS RESULT:');
  console.log('========================================================\n');
  console.log(text);

  fs.writeFileSync('projects/hate-me-all-you-want/precision-filmmaking-deepdive.md', text);
  console.log('\nSaved full analysis to projects/hate-me-all-you-want/precision-filmmaking-deepdive.md');
}

main().catch(err => {
  console.error('Error in analyze-knowledge-audio:', err);
});
