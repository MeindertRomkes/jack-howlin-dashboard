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
const clipsDir = path.join(outputDir, 'infinitalk_clips');
if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });

const KIE_API_KEY = process.env.KIE_AI_API_KEY || '10e19446174f4f74a4237b3bce6a8863';
const cliPath = path.resolve('node_modules/@felores/kie-cli/dist/index.js');
const env = { ...process.env, KIE_AI_API_KEY: KIE_API_KEY };

const masterAudioWav = path.join(outputDir, 'midnight_mirage_motel_29s_master.wav');
const stillImageUrl = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fcore_7_donker_studio_close_up_intens.jpg?alt=media&token=2331ca71-454a-4e75-98e3-4e215f1806da';

const audioPart1Url = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/public-audio%2F1788359940469_lip_part1_verse_14s.mp3?alt=media&token=2fb6d974-9346-44cf-b8f2-d2b60d16249e';
const audioPart2Url = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/public-audio%2F1788359945013_lip_part2_chorus_14s.mp3?alt=media&token=30fc3056-c46c-40fe-847e-d1ce13d619d6';

function runCli(cmdArgs) {
  const fullCmd = `node "${cliPath}" ${cmdArgs} --json`;
  console.log(`Executing: ${fullCmd.slice(0, 160)}...`);
  const raw = cp.execSync(fullCmd, { env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(raw);
}

async function waitForTask(taskId, label, maxWaitMs = 600000) {
  console.log(`\n⏳ Wachten op ${label} [Task ID: ${taskId}]...`);
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const parsed = runCli(`get_task_status --task_id "${taskId}"`);
      const data = parsed.data || parsed.response?.data || parsed.api_response?.data || parsed;
      const status = (parsed.status || data.status || data.state || '').toLowerCase();
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      console.log(`   [${elapsed}s] ${label} status: ${status.toUpperCase()}`);

      if (status === 'completed' || status === 'success' || status === 'done') {
        let urls = parsed.result_urls || data.resultUrls || data.result_urls;
        if (!urls && data.resultJson) {
          try {
            const rj = JSON.parse(data.resultJson);
            urls = rj.resultUrls || rj.result_urls || rj.urls;
          } catch (e) {}
        }
        if (urls && urls.length > 0) return urls[0];
        if (data.resultUrl || data.result_url || data.video_url || data.videoUrl) {
          return data.resultUrl || data.result_url || data.video_url || data.videoUrl;
        }
      }

      if (status === 'failed' || status === 'fail' || status === 'error') {
        throw new Error(`Kie taak ${taskId} mislukt: ${data.failMsg || JSON.stringify(data)}`);
      }
    } catch (err) {
      if (err.message.includes('mislukt')) throw err;
      console.log(`   Status check retry: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 8000));
  }

  throw new Error(`Kie taak ${taskId} time-out na ${maxWaitMs / 1000}s`);
}

async function downloadFile(url, destPath) {
  console.log(`Downloaden van ${url} naar ${destPath}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download mislukt (${response.statusText}): ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`✅ Opgeslagen: ${(fs.statSync(destPath).size / (1024 * 1024)).toFixed(2)} MB`);
}

async function main() {
  console.log('================================================================');
  console.log('🎬 JACK HOWLIN - 29S INFINITALK AI LIP-SYNC MASTER PRODUCTION');
  console.log('⚡ 2-Part InfiniTalk (Verse + Chorus) + Seamless Audio-Synced Master');
  console.log('================================================================\n');

  // STEP 1: Submit Part 1 (Verse: 0:00 - 14.5s)
  console.log('🚀 STAP 1: Starten InfiniTalk Deel 1 (Verse: 0:00 - 14.5s)...');
  const promptPart1 = 'Jack Howlin delivering an intense, gritty outlaw country-rock vocal performance singing verse lyrics with realistic lip sync and subtle head movements into the camera lens, moody warm amber studio lighting';
  const resPart1 = runCli(`infinitalk_lip_sync --image_url "${stillImageUrl}" --audio_url "${audioPart1Url}" --prompt "${promptPart1}" --resolution 480p`);
  const taskIdPart1 = resPart1.task_id || resPart1.data?.taskId || resPart1.taskId;
  console.log(`✅ Deel 1 Taak ID: ${taskIdPart1}`);

  // STEP 2: Submit Part 2 (Chorus: 14.5s - 29.0s)
  console.log('\n🚀 STAP 2: Starten InfiniTalk Deel 2 (Chorus Drop: 14.5s - 29.0s)...');
  const promptPart2 = 'Jack Howlin belting out the powerful chorus with passionate outlaw vocal delivery, authentic jaw and mouth movements in rhythm with distorted guitars, amber rim lighting and deep chiaroscuro shadows';
  const resPart2 = runCli(`infinitalk_lip_sync --image_url "${stillImageUrl}" --audio_url "${audioPart2Url}" --prompt "${promptPart2}" --resolution 480p`);
  const taskIdPart2 = resPart2.task_id || resPart2.data?.taskId || resPart2.taskId;
  console.log(`✅ Deel 2 Taak ID: ${taskIdPart2}`);

  // STEP 3: Wait for both parts concurrently
  console.log('\n⏳ STAP 3: Wachten op afronding van beide InfiniTalk taken...');
  const [videoUrl1, videoUrl2] = await Promise.all([
    waitForTask(taskIdPart1, 'Deel 1 (Verse)'),
    waitForTask(taskIdPart2, 'Deel 2 (Chorus)')
  ]);

  console.log('\n🎉 Beide InfiniTalk videoclips gereed!');
  console.log('Deel 1 Video URL:', videoUrl1);
  console.log('Deel 2 Video URL:', videoUrl2);

  // STEP 4: Download clips locally
  const clip1Path = path.join(clipsDir, 'part1_verse.mp4');
  const clip2Path = path.join(clipsDir, 'part2_chorus.mp4');
  await downloadFile(videoUrl1, clip1Path);
  await downloadFile(videoUrl2, clip2Path);

  // STEP 5: Concat both parts and master with 29.0s lossless audio & 1080x1920 scaling
  console.log('\n🎛️ STAP 4: Samenvoegen & Masteren naar 1080x1920 9:16 (29.0s)...');
  const concatTxt = path.join(clipsDir, 'concat_list.txt');
  fs.writeFileSync(concatTxt, `file '${clip1Path.replace(/\\/g, '/')}'\nfile '${clip2Path.replace(/\\/g, '/')}'`);

  const rawConcatMp4 = path.join(clipsDir, 'raw_concat_29s.mp4');
  cp.spawnSync(ffmpeg, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatTxt,
    '-c', 'copy',
    rawConcatMp4
  ], { stdio: 'inherit' });

  const finalLipSyncMasterMp4 = path.join(outputDir, 'jack_howlin_midnight_mirage_29s_infinitalk_master.mp4');

  const filterMaster = [
    'scale=1080:1920:flags=lanczos',
    'noise=alls=5:allf=t+u',
    'eq=contrast=1.03:brightness=0.01:saturation=1.05',
    'format=yuv420p'
  ].join(',');

  const muxArgs = [
    '-y',
    '-i', rawConcatMp4,
    '-i', masterAudioWav,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-vf', filterMaster,
    '-c:v', 'libx264',
    '-crf', '18',
    '-preset', 'medium',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', '29.0',
    '-movflags', '+faststart',
    finalLipSyncMasterMp4
  ];

  cp.spawnSync(ffmpeg, muxArgs, { stdio: 'inherit' });
  console.log(`✅ Master Lip-Sync Video gereed: ${finalLipSyncMasterMp4} (${(fs.statSync(finalLipSyncMasterMp4).size / (1024 * 1024)).toFixed(2)} MB)`);

  // STEP 6: Upload to Firebase Storage
  console.log('\n☁️ STAP 5: Uploaden naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const dest = `posts/${Date.now()}_jack_howlin_midnight_mirage_29s_infinitalk_lipsync.mp4`;
  const token = randomUUID();

  await bucket.upload(finalLipSyncMasterMp4, {
    destination: dest,
    metadata: {
      contentType: 'video/mp4',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
  console.log(`✅ Firebase Storage URL: ${mediaUrl}`);

  // STEP 7: Schedule in Firestore Calendar
  console.log('\n📅 STAP 6: Inplannen in Firestore Content Calendar...');
  const targetDate = new Date('2026-09-04T18:00:00.000Z');

  const caption = `3:30 AM on a dead highway. The jukebox knows things before you do.

Some roads you don't choose — they choose you. 🥃⚡

Official 29s Lip-Sync Video: "Midnight Mirage Motel"
Singing from the darkest corner of the neon road.

#JackHowlin #MidnightMirageMotel #InfiniTalk #LipSyncAI #OutlawCountry #AmericanaRock #RoadsideNoir #AIArtist`;

  const postDoc = {
    title: 'Midnight Mirage Motel — 29s InfiniTalk AI Lip-Sync Master',
    caption: caption,
    mediaUrl: mediaUrl,
    mediaType: 'video',
    platforms: ['instagram', 'tiktok', 'youtube', 'facebook'],
    scheduledAt: admin.firestore.Timestamp.fromDate(targetDate),
    scheduledDate: targetDate.toISOString(),
    status: 'scheduled',
    createdAt: admin.firestore.Timestamp.now(),
    track: 'Midnight Mirage Motel (Unreleased)',
    videoFormat: '9:16 vertical (1080x1920 HD Lip-Sync)',
    notes: '2-Part InfiniTalk AI Lip-Sync Master (0:00-14.5s verse, 14.5-29.0s chorus drop) synchronized with 29s unreleased master audio.',
    model: 'infinitalk'
  };

  const docRef = await admin.firestore().collection('posts').add(postDoc);
  console.log(`🎉 Post succesvol ingepland! Document ID: ${docRef.id}`);
  console.log(`Directe Calendar Link: https://jack-howlin-dashboard--jack-howlin-dashboard.europe-west4.hosted.app/calendar?postId=${docRef.id}`);

  console.log('\n================================================================');
  console.log('🚀 INFINITALK 29S LIP-SYNC PRODUCTIE VOLTOOID!');
  console.log(`🆔 Firestore Post ID: ${docRef.id}`);
  console.log(`🔗 Master Video URL: ${mediaUrl}`);
  console.log('================================================================\n');
}

main().catch(console.error);
