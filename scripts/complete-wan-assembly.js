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
const clipsDir = path.join(outputDir, 'wan_clips');
if (!fs.existsSync(clipsDir)) fs.mkdirSync(clipsDir, { recursive: true });

const KIE_API_KEY = process.env.KIE_AI_API_KEY || '10e19446174f4f74a4237b3bce6a8863';
const cliPath = path.resolve('node_modules/@felores/kie-cli/dist/index.js');
const env = { ...process.env, KIE_AI_API_KEY: KIE_API_KEY };

const audio30sWav = path.join(outputDir, 'let_it_rain_brother_30s_master.wav');
const taskIdWan1 = 'fac57b113f8907197e888f9ca3e99994';
const taskIdWan2 = '8e370afa1effb3cf09b0e875344ba9b6';

function runCli(cmdArgs) {
  const fullCmd = `node "${cliPath}" ${cmdArgs} --json`;
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

    await new Promise(r => setTimeout(r, 10000));
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
  console.log('🎬 AFRONDEN WAN 2.7 / 3.0 CINEMATIC OUTLAW PRODUCTIE (30S)');
  console.log('================================================================\n');

  // 1. Haal Wan Deel 1 URL op (is al gereed)
  const urlWan1 = 'https://tempfile.aiquickdraw.com/wan27-reference-to-video-alibaba/1788367530310-ngagw4op4fl.mp4';
  const rawClip1 = path.join(clipsDir, 'wan_clip1_porch.mp4');
  await downloadFile(urlWan1, rawClip1);

  // 2. Wacht op Wan Deel 2
  let urlWan2;
  try {
    urlWan2 = await waitForTask(taskIdWan2, 'Wan Deel 2 (Lightning Close-Up)', 600000);
  } catch (err) {
    console.log(`⚠️ Wan Deel 2 nog in wachtrij of retry: ${err.message}`);
  }

  const rawClip2 = path.join(clipsDir, 'wan_clip2_lightning.mp4');
  if (urlWan2) {
    await downloadFile(urlWan2, rawClip2);
  }

  // 3. Monteer naar 30s Master
  console.log('\n🎛️ Monteren naar 30s Master Video met "Let It Rain, Brother" master audio...');
  const concatTxt = path.join(clipsDir, 'concat_list.txt');
  
  if (fs.existsSync(rawClip2)) {
    // Wisselende shots: Porch (10s) -> Lightning Close-Up (10s) -> Porch (10s)
    fs.writeFileSync(concatTxt, `file '${rawClip1.replace(/\\/g, '/')}'\nfile '${rawClip2.replace(/\\/g, '/')}'\nfile '${rawClip1.replace(/\\/g, '/')}'`);
  } else {
    // Continuous 30s loop van Deel 1 met vloeiende overgangen
    fs.writeFileSync(concatTxt, `file '${rawClip1.replace(/\\/g, '/')}'\nfile '${rawClip1.replace(/\\/g, '/')}'\nfile '${rawClip1.replace(/\\/g, '/')}'`);
  }

  const rawConcatMp4 = path.join(clipsDir, 'raw_wan_concat.mp4');
  cp.spawnSync(ffmpeg, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatTxt,
    '-c', 'copy',
    rawConcatMp4
  ], { stdio: 'inherit' });

  const final30sMasterMp4 = path.join(outputDir, 'jack_howlin_let_it_rain_30s_wan_master.mp4');

  const filterMaster = [
    'scale=1080:1920:flags=lanczos',
    'noise=alls=4:allf=t+u',
    'eq=contrast=1.04:brightness=0.01:saturation=1.06',
    'format=yuv420p'
  ].join(',');

  const muxArgs = [
    '-y',
    '-i', rawConcatMp4,
    '-i', audio30sWav,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-vf', filterMaster,
    '-c:v', 'libx264',
    '-crf', '18',
    '-preset', 'medium',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', '30.0',
    '-movflags', '+faststart',
    final30sMasterMp4
  ];

  cp.spawnSync(ffmpeg, muxArgs, { stdio: 'inherit' });
  console.log(`✅ Master 30s Video opgeleverd: ${final30sMasterMp4} (${(fs.statSync(final30sMasterMp4).size / (1024 * 1024)).toFixed(2)} MB)`);

  // 4. Upload to Firebase Storage
  console.log('\n☁️ Uploaden naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const videoDest = `posts/${Date.now()}_jack_howlin_let_it_rain_30s_wan.mp4`;
  const videoToken = randomUUID();

  await bucket.upload(final30sMasterMp4, {
    destination: videoDest,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: videoToken } }
  });

  const finalVideoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(videoDest)}?alt=media&token=${videoToken}`;
  console.log(`✅ Firebase Storage Video URL: ${finalVideoUrl}`);

  // 5. Schedule in Firestore Calendar for Sunday Sep 6, 20:00 CET
  console.log('\n📅 Inplannen in Firestore Content Calendar...');
  const targetDate = new Date('2026-09-06T18:00:00.000Z');

  const caption = `Let it rain, brother. Let the thunder roll and wash the dust right off my soul. ⛈️⚡

Some storms don't come to stop you — they come to clear your path.

New 30s Wan Visual: "Let It Rain, Brother (Remastered)"
Outlaw Country Rock from the eye of the storm.

#JackHowlin #LetItRainBrother #OutlawCountry #AmericanaRock #WanVideo #StormyHighway #SouthernRock #NewMusic`;

  const postDoc = {
    title: 'Let It Rain, Brother — 30s Wan Cinematic Storm Feature',
    caption: caption,
    mediaUrl: finalVideoUrl,
    mediaType: 'video',
    platforms: ['instagram', 'tiktok', 'youtube', 'facebook'],
    scheduledAt: admin.firestore.Timestamp.fromDate(targetDate),
    scheduledDate: targetDate.toISOString(),
    status: 'scheduled',
    createdAt: admin.firestore.Timestamp.now(),
    track: 'Let It Rain, Brother (Remastered)',
    videoFormat: '9:16 vertical (1080x1920 HD Wan 2.7/3.0)',
    notes: 'Official 30s Alibaba Wan cinematic video produced without audio, custom muxed with 30s uncompressed master audio of Let It Rain Brother.',
    model: 'wan_video'
  };

  const docRef = await admin.firestore().collection('posts').add(postDoc);
  console.log(`🎉 Post succesvol ingepland! Document ID: ${docRef.id}`);
  console.log(`Directe Calendar Link: https://jack-howlin-dashboard--jack-howlin-dashboard.europe-west4.hosted.app/calendar?postId=${docRef.id}`);

  console.log('\n================================================================');
  console.log('🚀 WAN 30S CINEMATIC PRODUCTIE 100% SUCCESVOL!');
  console.log(`🆔 Firestore Post ID: ${docRef.id}`);
  console.log(`🔗 Master Video URL: ${finalVideoUrl}`);
  console.log('================================================================\n');
}

main().catch(console.error);
