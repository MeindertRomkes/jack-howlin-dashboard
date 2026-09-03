const admin = require('firebase-admin');
const { randomUUID } = require('crypto');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'projects', 'hate-me-social-production');
const masterWav = path.join(outputDir, 'midnight_mirage_motel.wav');

async function uploadFile(filePath, contentType, folder = 'public-audio') {
  const bucket = admin.storage().bucket();
  const dest = `${folder}/${Date.now()}_${path.basename(filePath)}`;
  const token = randomUUID();
  await bucket.upload(filePath, {
    destination: dest,
    metadata: { contentType, metadata: { firebaseStorageDownloadTokens: token } }
  });
  return `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
}

async function prepareAudioSegments() {
  console.log('🎵 Knippen van audio segmenten voor Lip-Sync...');
  
  // Segment 1: Verse (0:00 - 0:14.5) van de 29s track (dus 30.0s tot 44.5s van de master)
  const part1Mp3 = path.join(outputDir, 'lip_part1_verse_14s.mp3');
  cp.spawnSync(ffmpeg, [
    '-y',
    '-ss', '00:00:30',
    '-t', '14.5',
    '-i', masterWav,
    '-af', 'afade=t=in:ss=0:d=0.2',
    '-b:a', '192k',
    part1Mp3
  ], { stdio: 'inherit' });

  // Segment 2: Chorus Drop (14.5 - 29.0) van de 29s track (dus 44.5s tot 59.0s van de master)
  const part2Mp3 = path.join(outputDir, 'lip_part2_chorus_14s.mp3');
  cp.spawnSync(ffmpeg, [
    '-y',
    '-ss', '00:00:44.5',
    '-t', '14.5',
    '-i', masterWav,
    '-af', 'afade=t=out:st=13.0:d=1.5',
    '-b:a', '192k',
    part2Mp3
  ], { stdio: 'inherit' });

  // Segment 3: Korte 10s Chorus Drop test (45.0s tot 55.0s van master)
  const test10sMp3 = path.join(outputDir, 'lip_test_chorus_10s.mp3');
  cp.spawnSync(ffmpeg, [
    '-y',
    '-ss', '00:00:45',
    '-t', '10.0',
    '-i', masterWav,
    '-af', 'afade=t=in:ss=0:d=0.2,afade=t=out:st=8.5:d=1.5',
    '-b:a', '192k',
    test10sMp3
  ], { stdio: 'inherit' });

  console.log('☁️ Uploaden audio segmenten naar Firebase Storage...');
  const urlPart1 = await uploadFile(part1Mp3, 'audio/mpeg');
  const urlPart2 = await uploadFile(part2Mp3, 'audio/mpeg');
  const urlTest10s = await uploadFile(test10sMp3, 'audio/mpeg');

  console.log('✅ Audio URLs:');
  console.log('Part 1 (Verse):', urlPart1);
  console.log('Part 2 (Chorus):', urlPart2);
  console.log('Test 10s (Chorus Drop):', urlTest10s);

  return { urlPart1, urlPart2, urlTest10s };
}

async function main() {
  const audioUrls = await prepareAudioSegments();

  const coreStillUrl = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fcore_7_donker_studio_close_up_intens.jpg?alt=media&token=2331ca71-454a-4e75-98e3-4e215f1806da';
  const roadsideStillUrl = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fcore_0_kampvuur_motel_nacht.jpg?alt=media&token=982f869c-23c3-41a5-99ef-3fb1fc3c55de';
  const studioStillUrl = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fstill_seedream5_pro.png?alt=media&token=4528472a-edf1-416f-9387-5d71b8c29101';

  console.log('\n================================================================');
  console.log('📋 UITGEWERKTE LIP-SYNC OPTIES VOOR KIE.AI');
  console.log('================================================================\n');

  console.log('--- OPTIE 1: InfiniTalk Lip-Sync (2-Part 29s Full Video) ---');
  console.log('Deel 1 (Verse):');
  console.log(`npx kie-cli infinitalk_lip_sync --image_url "${studioStillUrl}" --audio_url "${audioUrls.urlPart1}" --prompt "Jack Howlin singing verse lyrics passionately with realistic mouth lip-sync into camera, roadside neon noir atmosphere" --resolution 480p`);
  console.log('\nDeel 2 (Chorus):');
  console.log(`npx kie-cli infinitalk_lip_sync --image_url "${studioStillUrl}" --audio_url "${audioUrls.urlPart2}" --prompt "Jack Howlin intensely belting out chorus lyrics with full vocal expression and authentic jaw movements, amber rim lighting" --resolution 480p`);

  console.log('\n--- OPTIE 2A: ByteDance OmniHuman 1.5 (Refrein Test) ---');
  console.log(`npx kie-cli omnihuman_video --image_url "${coreStillUrl}" --audio_url "${audioUrls.urlTest10s}" --prompt "Jack Howlin singing outlaw country rock chorus with realistic facial and head movement" --output_resolution 720`);

  console.log('\n--- OPTIE 2B: Kling AI Avatar (Refrein Test) ---');
  console.log(`npx kie-cli kling_avatar --image_url "${coreStillUrl}" --audio_url "${audioUrls.urlTest10s}" --prompt "Jack Howlin singing passionately with outlaw rock facial expression" --quality standard`);

  // Try test run
  const env = { ...process.env, KIE_AI_API_KEY: process.env.KIE_AI_API_KEY || '10e19446174f4f74a4237b3bce6a8863' };
  const cliPath = path.resolve('node_modules/@felores/kie-cli/dist/index.js');
  
  console.log('\n🧪 Testen van InfiniTalk taak aanroep via CLI...');
  try {
    const testCmd = `node "${cliPath}" infinitalk_lip_sync --image_url "${coreStillUrl}" --audio_url "${audioUrls.urlTest10s}" --prompt "Jack Howlin singing chorus" --resolution 480p --json`;
    const res = cp.execSync(testCmd, { env, encoding: 'utf8' });
    console.log('Test output:', res);
  } catch (err) {
    console.log('Test status note:');
    if (err.stdout) console.log(err.stdout.toString());
  }
}

main().catch(console.error);
