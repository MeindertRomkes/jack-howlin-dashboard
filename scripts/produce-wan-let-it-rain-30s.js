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

const masterSongWav = path.join(outputDir, 'let_it_rain_brother.wav');
const audio30sWav = path.join(outputDir, 'let_it_rain_brother_30s_master.wav');
const audio30sMp3 = path.join(outputDir, 'let_it_rain_brother_30s_master.mp3');

const coreImageUrls = [
  'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fcore_7_donker_studio_close_up_intens.jpg?alt=media&token=2331ca71-454a-4e75-98e3-4e215f1806da',
  'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fcore_0_kampvuur_motel_nacht.jpg?alt=media&token=982f869c-23c3-41a5-99ef-3fb1fc3c55de',
  'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fstill_seedream5_pro.png?alt=media&token=4528472a-edf1-416f-9387-5d71b8c29101'
];

const golden30sPrompt = `One continuous 30-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin standing on the weathered wooden porch of an old desert tavern during a midnight thunderstorm. Jack gives a silent, intense outlaw performance through his eyes, posture, and restrained body language only.

CRITICAL PERFORMANCE RULE: Jack does not sing, speak, whisper, shout, mouth lyrics, or lip-sync at any point. His lips remain naturally closed and completely still throughout the entire video. No mouth movement, no visible teeth, no tongue movement, and no exaggerated jaw motion. The music is soundtrack only and is not performed by Jack.

• [00:00–00:07] [Thunderstorm Atmosphere & Porch Establishing]:
Atmospheric medium shot. Rain pours heavily from the corrugated tin awning of a rustic desert tavern. Jack Howlin stands under the shelter, wearing his signature tan camel-brown heavy canvas work jacket with chest flap pockets over an unbuttoned charcoal-grey henley shirt. Full rugged brown beard and moustache, dark wavy hair damp from desert mist. Raindrops splash on the dark wooden planks and puddles on the asphalt road outside. Amber neon tavern light reflects across wet surfaces, with distant flashes of lightning in the dark storm clouds. Jack stands stoically, gazing into the rain with calm outlaw intensity. Mouth closed and still.

• [00:07–00:15] [Slow Push-In & Lightning Glow]:
Slow cinematic camera dolly push-in toward Jack. A distant crack of lightning momentarily illuminates the rainy sky with cool electric blue highlights, contrasting sharply with the warm tungsten lantern glowing on the porch. Jack slowly shifts his weight, turning his piercing gaze directly into the camera lens. His expression is defiant, weathered, and stoic. Lips remain completely closed and relaxed.

• [00:15–00:23] [Storm Climax & Dramatic Close-Up]:
As the thunderous storm intensifies, the camera moves into a tight dramatic close-up on Jack Howlin. Mist and wind blow rain droplets past the anamorphic lens. Jack holds his unwavering outlaw stare, his chiseled jaw and rugged beard illuminated by warm amber porch rim light and cool blue lightning reflections. He remains completely silent and still. Zero singing, talking, humming, or mouth movements.

• [00:23–00:30] [Stoic Horizon Fade]:
Smooth deceleration of camera movement. Jack slightly tilts his head, eyes looking past the lens towards the endless stormy highway as the rain beats down on the black pavement. Headlights in the distance flicker and the warm tavern lantern light softly fades into deep cinematic noir shadows.

Unbroken continuous shot, silent non-vocal performance, closed motionless mouth for the entire duration, authentic facial physics, restrained natural acting, 35mm film-grain texture, anamorphic lens flares, warm amber rim lighting contrasted with cold midnight-blue storm haze, rain splashes, wet reflections, zero morphing, zero lip movement, zero lip-sync, zero singing, zero speech, zero mouth opening, ultra-consistent Jack Core Set identity. All reference images depict Jack.`;

const negativePrompt = 'singing, speaking, talking, mouth open, open mouth, teeth, tongue, lip sync, exaggerated facial movements, smiling, laughing, morphing, deformities, bad anatomy, cartoon, 3d render, extra limbs, blur, low quality';

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
  console.log('🎬 JACK HOWLIN - WAN 2.7 / 3.0 CINEMATIC OUTLAW PRODUCTION');
  console.log('🎵 Track: "Let It Rain, Brother (Remastered)" - 30s Master Cut');
  console.log('⚡ Scenario: Thunder Over the Black Hills (Stormy Tavern Porch)');
  console.log('================================================================\n');

  // STEP 1: Slice the 30.0s Master Audio Cut (00:00:25 to 00:00:55)
  console.log('✂️ STAP 1: Knippen van 30s audio uit "Let It Rain, Brother"...');
  cp.spawnSync(ffmpeg, [
    '-y',
    '-ss', '00:00:25',
    '-t', '30.0',
    '-i', masterSongWav,
    '-af', 'afade=t=in:ss=0:d=0.25,afade=t=out:st=28.5:d=1.5',
    audio30sWav
  ], { stdio: 'inherit' });

  cp.spawnSync(ffmpeg, [
    '-y',
    '-i', audio30sWav,
    '-b:a', '320k',
    audio30sMp3
  ], { stdio: 'inherit' });

  console.log(`✅ 30s Master Audio geknipt: ${audio30sWav}`);

  // STEP 2: Upload Audio to Firebase Storage
  console.log('\n☁️ STAP 2: Uploaden van 30s Master Audio naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const audioDest = `public-audio/${Date.now()}_let_it_rain_brother_30s.mp3`;
  const audioToken = randomUUID();
  await bucket.upload(audio30sMp3, {
    destination: audioDest,
    metadata: { contentType: 'audio/mpeg', metadata: { firebaseStorageDownloadTokens: audioToken } }
  });
  const audioPublicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(audioDest)}?alt=media&token=${audioToken}`;
  console.log(`✅ Audio Public URL: ${audioPublicUrl}`);

  // STEP 3: Dispatch Wan 2.7 / 3.0 Reference-to-Video Tasks (Part 1: Establishing & Part 2: Climax)
  console.log('\n🚀 STAP 3: Genereren van Wan 2.7 / 3.0 videobeelden via Kie.ai...');
  
  const wanPrompt1 = `Cinematic 9:16 vertical of Jack Howlin standing under the wooden porch of an old desert tavern during a midnight thunderstorm. Rain pouring heavily, glowing amber lantern light, Jack stands stoic with tan canvas work jacket, full brown beard, mouth completely closed and silent, looking out into the thunderstorm highway. 35mm film grain, moody chiaroscuro.`;
  const wanPrompt2 = `Cinematic 9:16 vertical slow push-in close-up of Jack Howlin on a stormy night. Flashes of lightning illuminate his rugged face, raindrops falling past the lens, intense defiant stare directly into camera, mouth firmly closed, unmoving lips, amber rim lighting, dark rain atmosphere.`;

  // Start Wan Part 1 & Part 2
  console.log('Dispatching Wan Part 1 (10s)...');
  const resWan1 = runCli(`wan_video --mode reference-to-video --reference_image "${coreImageUrls[0]}" --prompt "${wanPrompt1}" --negative_prompt "${negativePrompt}" --ratio 9:16 --resolution 720p --duration 10`);
  const taskIdWan1 = resWan1.task_id || resWan1.data?.taskId || resWan1.taskId;
  console.log(`✅ Wan Deel 1 Taak ID: ${taskIdWan1}`);

  console.log('Dispatching Wan Part 2 (10s)...');
  const resWan2 = runCli(`wan_video --mode reference-to-video --reference_image "${coreImageUrls[2]}" --prompt "${wanPrompt2}" --negative_prompt "${negativePrompt}" --ratio 9:16 --resolution 720p --duration 10`);
  const taskIdWan2 = resWan2.task_id || resWan2.data?.taskId || resWan2.taskId;
  console.log(`✅ Wan Deel 2 Taak ID: ${taskIdWan2}`);

  // STEP 4: Wait for Wan Tasks
  console.log('\n⏳ STAP 4: Wachten op afronding van de Wan videobeelden...');
  const [urlWan1, urlWan2] = await Promise.all([
    waitForTask(taskIdWan1, 'Wan Deel 1 (Porch Storm)'),
    waitForTask(taskIdWan2, 'Wan Deel 2 (Lightning Close-Up)')
  ]);

  console.log('\n🎉 Wan videoclips gegenereerd!');
  console.log('Wan Clip 1:', urlWan1);
  console.log('Wan Clip 2:', urlWan2);

  // STEP 5: Download clips locally
  const rawClip1 = path.join(clipsDir, 'wan_clip1_porch.mp4');
  const rawClip2 = path.join(clipsDir, 'wan_clip2_lightning.mp4');
  await downloadFile(urlWan1, rawClip1);
  await downloadFile(urlWan2, rawClip2);

  // STEP 6: Concat & Loop to 30s, Apply 1080x1920 Master Grading & Mux with Master Audio
  console.log('\n🎛️ STAP 5: Monteren & Masteren naar 1080x1920 met 30s "Let It Rain, Brother" Audio...');
  const concatTxt = path.join(clipsDir, 'concat_list.txt');
  fs.writeFileSync(concatTxt, `file '${rawClip1.replace(/\\/g, '/')}'\nfile '${rawClip2.replace(/\\/g, '/')}'\nfile '${rawClip1.replace(/\\/g, '/')}'`);

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

  // STEP 7: Upload to Firebase Storage
  console.log('\n☁️ STAP 6: Uploaden naar Firebase Storage...');
  const videoDest = `posts/${Date.now()}_jack_howlin_let_it_rain_30s_wan.mp4`;
  const videoToken = randomUUID();

  await bucket.upload(final30sMasterMp4, {
    destination: videoDest,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: videoToken } }
  });

  const finalVideoUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(videoDest)}?alt=media&token=${videoToken}`;
  console.log(`✅ Firebase Storage Video URL: ${finalVideoUrl}`);

  // STEP 8: Schedule in Firestore Calendar
  console.log('\n📅 STAP 7: Inplannen in Firestore Content Calendar...');
  const targetDate = new Date('2026-09-06T18:00:00.000Z'); // Sunday Sep 6, 20:00 CET

  const caption = `Let it rain, brother. Let the thunder roll and wash the dust right off my soul. ⛈️⚡

Some storms don't come to stop you — they come to clear your path.

New 30s Visual: "Let It Rain, Brother (Remastered)"
Outlaw Rock from the heart of the storm.

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
  console.log(`🔗 30s Audio URL: ${audioPublicUrl}`);
  console.log('================================================================\n');
}

main().catch(console.error);
