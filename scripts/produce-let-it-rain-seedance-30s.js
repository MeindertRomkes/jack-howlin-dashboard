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
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

const KIE_API_KEY = process.env.KIE_AI_API_KEY || '10e19446174f4f74a4237b3bce6a8863';
const cliPath = path.resolve('node_modules/@felores/kie-cli/dist/index.js');
const env = { ...process.env, KIE_AI_API_KEY: KIE_API_KEY };

const audio30sWav = path.join(outputDir, 'let_it_rain_brother_30s_master.wav');
const final1080pVideo = path.join(outputDir, 'jack_howlin_let_it_rain_30s_seedance_1080p.mp4');
const final480pVideo = path.join(outputDir, 'jack_howlin_let_it_rain_30s_seedance_480p.mp4');

const multiLevelRefUrl = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fjack_howlin_multilevel_reference.jpg?alt=media&token=f1a7ae6e-507d-41b6-97db-71305e38484a';

const prompt = `One continuous 30-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin sitting on the lowered tailgate of his vintage black pickup truck during a midnight desert thunderstorm. Jack gives a silent, intense outlaw performance through his eyes, posture, and restrained body language only.

CRITICAL PERFORMANCE RULE: Jack does not sing, speak, whisper, shout, mouth lyrics, or lip-sync at any point. His lips remain naturally closed and completely still throughout the entire video. No mouth movement, no visible teeth, no tongue movement, and no exaggerated jaw motion. The music is soundtrack only and is not performed by Jack.

• [00:00–00:07] [Thunderstorm Horizon & Tailgate Staging]
Atmospheric medium shot. Heavy rain pours over an empty desert crossroads at midnight. Jack Howlin sits calmly on the lowered metal tailgate of his weathered black 1970s pickup truck. Jack wears his signature tan camel-brown heavy canvas work jacket with dual chest flap pockets over an unbuttoned charcoal-grey henley shirt. Dark wavy hair damp from desert rain, full rugged brown beard and moustache. Rainwater streams down the truck’s metallic body and splashes into dark asphalt puddles. In the distant stormy sky, silent sheets of lightning illuminate dark thunderclouds. Jack leans forward with elbows on his knees, calmly watching the storm with unflinching outlaw poise. Mouth completely closed and motionless.

• [00:07–00:15] [Slow Cinematic Push-In & Lightning Flash]
The camera performs a slow, continuous dolly push toward Jack. A sharp crack of blue lightning overhead flashes across the night sky, casting crisp, cool highlights across his wet jacket shoulders and chiseled jawline. Jack slowly raises his head, locking his piercing, defiant brown eyes directly with the camera lens. His expression is stoic, weathered, and resolute. His lips remain sealed, relaxed, and perfectly still.

• [00:15–00:23] [Southern Rock Climax & Rain-Swept Close-Up]
As the heavy drums and distorted slide guitars reach maximum intensity, the camera moves into a tight dramatic close-up. High-speed wind whips rain mist and fine water droplets diagonally past the anamorphic frame. Amber headlights behind the camera cast warm rim light along his beard and cheekbones, contrasting against deep cold-blue storm shadows. Jack holds his unwavering outlaw stare, displaying quiet power with subtle, natural eye micro-movements timed to the musical energy. He remains completely silent. No lip movements, no mouth opening, no humming, no singing.

• [00:23–00:30] [Stoic Fade into the Storm]
The camera movement smoothly decelerates. Jack gives a subtle, knowing nod towards the infinite stormy road ahead. Rain continues drumming rhythmically on the truck bed as the warm amber headlights flicker and the scene slowly fades into atmospheric, deep cinematic noir shadows.

Unbroken continuous shot, silent non-vocal performance, closed motionless mouth for the entire duration, authentic facial physics, restrained natural acting, 35mm film-grain texture, anamorphic lens flares, warm amber rim lighting contrasted with cold midnight-blue storm haze, rain splashes, wet reflections, zero morphing, zero lip movement, zero lip-sync, zero singing, zero speech, zero mouth opening, ultra-consistent Jack Howlin multi-level reference identity. Reference image depicts Jack.`;

function runCli(cmdArgs) {
  const fullCmd = `node "${cliPath}" ${cmdArgs} --json`;
  console.log(`Executing CLI...`);
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
  console.log('🎬 PRODUCEREN 30S SEEDANCE 2.5 VIDEO MET MULTI-LEVEL REFERENTIE');
  console.log('🎵 Track: "Let It Rain, Brother (Remastered)" - 30s Master Audio');
  console.log('⚡ Scenario: Storm over the Mojave (Tailgate Vigil)');
  console.log('================================================================\n');

  // STEP 1: Dispatch Seedance 2.5 30s Task via CLI (1 reference image, no AI audio)
  console.log('🚀 STAP 1: Starten ByteDance Seedance 2.5 (30s, 480p, 9:16)...');
  
  const cliArgs = `bytedance_seedance_video --duration 30 --aspect_ratio 9:16 --resolution 480p --reference_image_urls "${multiLevelRefUrl}" --prompt "${prompt.replace(/"/g, '\\"')}"`;

  const res = runCli(cliArgs);
  const taskId = res.task_id || res.data?.taskId || res.taskId;
  console.log(`✅ Seedance 2.5 Taak ID: ${taskId}`);

  // STEP 2: Wait for Task Completion
  console.log('\n⏳ STAP 2: Wachten op afronding van de 30s video...');
  const videoUrl = await waitForTask(taskId, 'Seedance 2.5 30s Video');
  console.log(`\n🎉 Seedance 2.5 Video gereed! URL: ${videoUrl}`);

  // STEP 3: Download Raw Video
  const rawVideoPath = path.join(outputDir, 'raw_let_it_rain_seedance_30s.mp4');
  await downloadFile(videoUrl, rawVideoPath);

  // STEP 4: Render 480p Native & 1080p HD with Master 48kHz Audio & 35mm Grain
  console.log('\n🎛️ STAP 3: Monteren & Masteren naar 1080x1920 met "Let It Rain, Brother" master audio...');
  
  // 480p Native
  const args480p = [
    '-y',
    '-i', rawVideoPath,
    '-i', audio30sWav,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-crf', '19',
    '-preset', 'fast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', '30.0',
    '-movflags', '+faststart',
    final480pVideo
  ];
  cp.spawnSync(ffmpeg, args480p, { stdio: 'inherit' });
  console.log(`✅ 480p Native Video opgeleverd: ${final480pVideo} (${(fs.statSync(final480pVideo).size / (1024 * 1024)).toFixed(2)} MB)`);

  // 1080p HD Master
  const filter1080p = [
    'scale=1080:1920:flags=lanczos',
    'noise=alls=4:allf=t+u',
    'eq=contrast=1.03:brightness=0.01:saturation=1.05',
    'format=yuv420p'
  ].join(',');

  const args1080p = [
    '-y',
    '-i', rawVideoPath,
    '-i', audio30sWav,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-vf', filter1080p,
    '-c:v', 'libx264',
    '-crf', '18',
    '-preset', 'medium',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', '30.0',
    '-movflags', '+faststart',
    final1080pVideo
  ];
  cp.spawnSync(ffmpeg, args1080p, { stdio: 'inherit' });
  console.log(`✅ 1080p HD Master Video opgeleverd: ${final1080pVideo} (${(fs.statSync(final1080pVideo).size / (1024 * 1024)).toFixed(2)} MB)`);

  // STEP 5: Upload to Firebase Storage
  console.log('\n☁️ STAP 4: Uploaden naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const dest1080p = `posts/${Date.now()}_jack_howlin_let_it_rain_seedance_30s_1080p.mp4`;
  const dest480p = `posts/${Date.now()}_jack_howlin_let_it_rain_seedance_30s_480p.mp4`;
  const token1080p = randomUUID();
  const token480p = randomUUID();

  await bucket.upload(final1080pVideo, {
    destination: dest1080p,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token1080p } }
  });

  await bucket.upload(final480pVideo, {
    destination: dest480p,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token480p } }
  });

  const url1080p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest1080p)}?alt=media&token=${token1080p}`;
  const url480p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest480p)}?alt=media&token=${token480p}`;

  console.log(`✅ Firebase Storage 1080p URL: ${url1080p}`);
  console.log(`✅ Firebase Storage 480p URL: ${url480p}`);

  // STEP 6: Inplannen in Firestore Content Calendar
  console.log('\n📅 STAP 5: Inplannen in Firestore Content Calendar...');
  const targetDate = new Date('2026-09-08T18:00:00.000Z'); // Tuesday Sep 8, 20:00 CET

  const caption = `Let it rain, brother. Let the thunder roll and wash the dust right off my soul. ⛈️⚡

Some storms don't come to stop you — they come to clear your path.

New 30s Outlaw Visual: "Let It Rain, Brother (Remastered)"
Filmed in the eye of the Mojave thunderstorm.

#JackHowlin #LetItRainBrother #Seedance25 #OutlawCountry #AmericanaRock #MojaveStorm #SouthernRock #NewMusic`;

  const postDoc = {
    title: 'Let It Rain, Brother — 30s Mojave Storm Tailgate Feature',
    caption: caption,
    mediaUrl: url1080p,
    mediaUrl480p: url480p,
    mediaType: 'video',
    platforms: ['instagram', 'tiktok', 'youtube', 'facebook'],
    scheduledAt: admin.firestore.Timestamp.fromDate(targetDate),
    scheduledDate: targetDate.toISOString(),
    status: 'scheduled',
    createdAt: admin.firestore.Timestamp.now(),
    track: 'Let It Rain, Brother (Remastered)',
    videoFormat: '9:16 vertical (1080x1920 HD Seedance 2.5)',
    notes: 'Official 30s Seedance 2.5 video generated using the single Multi-Level Master Reference, muxed with 30s uncompressed master audio of Let It Rain Brother.',
    model: 'seedance_2_5'
  };

  const docRef = await admin.firestore().collection('posts').add(postDoc);
  console.log(`🎉 Post succesvol ingepland! Document ID: ${docRef.id}`);
  console.log(`Directe Calendar Link: https://jack-howlin-dashboard--jack-howlin-dashboard.europe-west4.hosted.app/calendar?postId=${docRef.id}`);

  console.log('\n================================================================');
  console.log('🚀 SEEDANCE 30S MULTI-LEVEL PRODUCTIE 100% SUCCESVOL!');
  console.log(`🆔 Firestore Post ID: ${docRef.id}`);
  console.log(`🔗 1080p HD Video: ${url1080p}`);
  console.log(`🔗 480p Video: ${url480p}`);
  console.log('================================================================\n');
}

main().catch(console.error);
