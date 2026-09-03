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
const batchDir = path.join(outputDir, 'batch_production_5');

const KIE_API_KEY = process.env.KIE_AI_API_KEY || '10e19446174f4f74a4237b3bce6a8863';
const cliPath = path.resolve('node_modules/@felores/kie-cli/dist/index.js');
const env = { ...process.env, KIE_AI_API_KEY: KIE_API_KEY };

const JACK_REF_URL = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fjack_howlin_multilevel_reference.jpg?alt=media&token=f1a7ae6e-507d-41b6-97db-71305e38484a';

const prompt = `One continuous 20-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin in a rain-slicked Nashville back alley behind a neon-lit honky-tonk club at 3:30 AM.

CRITICAL PERFORMANCE RULE: Jack does not sing, speak, whisper, shout, mouth lyrics, or lip-sync at any point. His lips remain naturally closed and completely still throughout the entire video. No mouth movement, no visible teeth, and no exaggerated jaw motion. The music is soundtrack only.

• [00:00–00:06] [Alleyway Atmosphere & Honky-Tonk Exit]
Atmospheric medium shot. Jack Howlin steps through a heavy metal stage door into a dark wet alleyway. He carries a battered sunburst acoustic guitar case in one hand. Jack wears his signature tan camel-brown heavy canvas work jacket with chest flap pockets over an unbuttoned charcoal henley shirt, full rugged brown beard and damp wavy hair. Red neon glow from the venue sign reflects on the wet cobblestones and puddles. Jack walks slowly toward camera, mouth closed and stoic.

• [00:06–00:14] [Slow Dolly & Streetlamp Glow]
The camera tracks smoothly backward with Jack. He steps beneath a single warm amber streetlamp that casts long dramatic shadows behind him. Steam rises from a nearby sewer grate. Jack turns his sharp, piercing gaze directly into the camera lens, his expression weathered, resolute, and defiant. Lips remain sealed and motionless.

• [00:14–00:20] [Uptempo Climax & Truck Silhouette]
As the telecaster solos and driving drums peak, Jack stops beside his vintage black pickup truck parked at the end of the alley. He throws the guitar into the passenger seat, looks back over his shoulder at the distant flashing city lights with a stoic smirk in his eyes, and steps into the deep shadows as headlights flash on.

Unbroken continuous shot, silent non-vocal performance, closed motionless mouth for the entire duration, authentic facial physics, restrained natural acting, 35mm film-grain texture, anamorphic lens flares, warm amber rim lighting contrasted with cold midnight-blue haze, rain reflections, zero morphing, zero lip movement, zero lip-sync, zero singing, zero speech, ultra-consistent Jack Howlin multi-level reference identity.`;

function runCli(cmdArgs) {
  const fullCmd = `node "${cliPath}" ${cmdArgs} --json`;
  const raw = cp.execSync(fullCmd, { env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(raw);
}

async function waitForTask(taskId, label, maxWaitMs = 600000) {
  console.log(`⏳ Wachten op ${label} [Task ID: ${taskId}]...`);
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
  console.log('🎸 HERSTARTEN RUNAWAY IN NASHVILLE...');
  const slicedWav = path.join(batchDir, 'runaway_in_nashville_20s.wav');
  
  const cliArgs = `bytedance_seedance_video --duration 20 --aspect_ratio 9:16 --resolution 480p --reference_image_urls "${JACK_REF_URL}" --prompt "${prompt.replace(/"/g, '\\"')}"`;
  const res = runCli(cliArgs);
  const taskId = res.task_id || res.data?.taskId || res.taskId;
  console.log(`✅ Nieuwe Task ID: ${taskId}`);

  const videoUrl = await waitForTask(taskId, 'Runaway in Nashville', 600000);
  const rawVideo = path.join(batchDir, 'runaway_in_nashville_raw.mp4');
  await downloadFile(videoUrl, rawVideo);

  const master1080p = path.join(batchDir, 'runaway_in_nashville_1080p.mp4');
  const native480p = path.join(batchDir, 'runaway_in_nashville_480p.mp4');

  const filter1080p = [
    'scale=1080:1920:flags=lanczos',
    'noise=alls=4:allf=t+u',
    'eq=contrast=1.03:brightness=0.01:saturation=1.05',
    'format=yuv420p'
  ].join(',');

  cp.spawnSync(ffmpeg, [
    '-y',
    '-i', rawVideo,
    '-i', slicedWav,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-vf', filter1080p,
    '-c:v', 'libx264',
    '-crf', '18',
    '-preset', 'medium',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', '20.0',
    '-movflags', '+faststart',
    master1080p
  ], { stdio: 'ignore' });

  cp.spawnSync(ffmpeg, [
    '-y',
    '-i', rawVideo,
    '-i', slicedWav,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-crf', '19',
    '-preset', 'fast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', '20.0',
    '-movflags', '+faststart',
    native480p
  ], { stdio: 'ignore' });

  const bucket = admin.storage().bucket();
  const dest1080p = `posts/${Date.now()}_jack_howlin_runaway_in_nashville_1080p.mp4`;
  const dest480p = `posts/${Date.now()}_jack_howlin_runaway_in_nashville_480p.mp4`;
  const token1080p = randomUUID();
  const token480p = randomUUID();

  await bucket.upload(master1080p, {
    destination: dest1080p,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token1080p } }
  });

  await bucket.upload(native480p, {
    destination: dest480p,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token480p } }
  });

  const url1080p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest1080p)}?alt=media&token=${token1080p}`;
  const url480p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest480p)}?alt=media&token=${token480p}`;

  const targetDate = new Date('2026-09-12T18:00:00.000Z');
  const postDoc = {
    title: 'Runaway in Nashville — Broadway Back Alley Escape',
    caption: `Leaving Nashville with the amps still hot and the tires burning wet asphalt. 🎸⚡

No looking back once the stage lights die.

Track: "Runaway in Nashville (Mastered)"
Turn it loud for Saturday night.

#JackHowlin #RunawayInNashville #OutlawCountry #NashvilleNights #AmericanaRock #BroadwayNoir #Seedance25 #SaturdayDrop`,
    mediaUrl: url1080p,
    mediaUrl480p: url480p,
    mediaType: 'video',
    platforms: ['instagram', 'tiktok', 'youtube', 'facebook'],
    scheduledAt: admin.firestore.Timestamp.fromDate(targetDate),
    scheduledDate: targetDate.toISOString(),
    status: 'scheduled',
    createdAt: admin.firestore.Timestamp.now(),
    track: 'Runaway in Nashville (Mastered)',
    videoFormat: '9:16 vertical (1080x1920 HD Seedance 2.5 - 20s)',
    notes: 'Batch produced video with custom 48kHz audio for Runaway in Nashville.',
    model: 'seedance_2_5'
  };

  const docRef = await admin.firestore().collection('posts').add(postDoc);
  console.log(`🎉 [runaway_in_nashville] Ingepland in kalender! Doc ID: ${docRef.id}`);
  console.log(`🔗 1080p HD: ${url1080p}`);
}

main().catch(console.error);
