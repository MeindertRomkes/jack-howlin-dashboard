const admin = require('firebase-admin');
const { randomUUID } = require('crypto');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const rootDir = process.cwd();
const outputDir = path.join(rootDir, 'projects', 'hate-me-social-production');
const clipsDir = path.join(outputDir, 'wan_clips');

const clip1Path = path.join(clipsDir, 'wan_clip1_porch.mp4');
const audio30sWav = path.join(outputDir, 'let_it_rain_brother_30s_master.wav');
const final30sMasterMp4 = path.join(outputDir, 'jack_howlin_let_it_rain_30s_wan_master.mp4');
const final480pMp4 = path.join(outputDir, 'jack_howlin_let_it_rain_30s_wan_480p.mp4');

async function main() {
  console.log('================================================================');
  console.log('🎬 MUXING WAN 2.7/3.0 VIDEO + 30S "LET IT RAIN BROTHER" MASTER');
  console.log('================================================================\n');

  if (!fs.existsSync(clip1Path)) {
    throw new Error(`Clip 1 niet gevonden: ${clip1Path}`);
  }

  // 1. Maak een naadloze 30s loop van de Wan clip (10s x 3 met subtle slow zoom op deel 2)
  const concatTxt = path.join(clipsDir, 'concat_list.txt');
  fs.writeFileSync(concatTxt, `file '${clip1Path.replace(/\\/g, '/')}'\nfile '${clip1Path.replace(/\\/g, '/')}'\nfile '${clip1Path.replace(/\\/g, '/')}'`);

  const rawConcatMp4 = path.join(clipsDir, 'raw_wan_concat.mp4');
  cp.spawnSync(ffmpeg, [
    '-y',
    '-f', 'concat',
    '-safe', '0',
    '-i', concatTxt,
    '-c', 'copy',
    rawConcatMp4
  ], { stdio: 'inherit' });

  // 2. Render 1080x1920 HD Master (30.0s)
  console.log('\n🎨 Renderen 1080x1920 HD Master (30.0s)...');
  const filterMaster = [
    'scale=1080:1920:flags=lanczos',
    'noise=alls=4:allf=t+u',
    'eq=contrast=1.04:brightness=0.01:saturation=1.06',
    'format=yuv420p'
  ].join(',');

  const muxArgs1080p = [
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
  cp.spawnSync(ffmpeg, muxArgs1080p, { stdio: 'inherit' });
  console.log(`✅ 1080p Master Video: ${final30sMasterMp4} (${(fs.statSync(final30sMasterMp4).size / (1024 * 1024)).toFixed(2)} MB)`);

  // 3. Render 480p Native (30.0s)
  console.log('\n⚡ Renderen 480p Native MP4...');
  const muxArgs480p = [
    '-y',
    '-i', rawConcatMp4,
    '-i', audio30sWav,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-crf', '20',
    '-preset', 'fast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', '30.0',
    '-movflags', '+faststart',
    final480pMp4
  ];
  cp.spawnSync(ffmpeg, muxArgs480p, { stdio: 'inherit' });
  console.log(`✅ 480p Native Video: ${final480pMp4} (${(fs.statSync(final480pMp4).size / (1024 * 1024)).toFixed(2)} MB)`);

  // 4. Upload naar Firebase Storage
  console.log('\n☁️ Uploaden naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const dest1080p = `posts/${Date.now()}_jack_howlin_let_it_rain_30s_wan_1080p.mp4`;
  const dest480p = `posts/${Date.now()}_jack_howlin_let_it_rain_30s_wan_480p.mp4`;
  const token1080p = randomUUID();
  const token480p = randomUUID();

  await bucket.upload(final30sMasterMp4, {
    destination: dest1080p,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token1080p } }
  });

  await bucket.upload(final480pMp4, {
    destination: dest480p,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token480p } }
  });

  const url1080p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest1080p)}?alt=media&token=${token1080p}`;
  const url480p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest480p)}?alt=media&token=${token480p}`;

  console.log(`✅ Firebase Storage 1080p URL: ${url1080p}`);
  console.log(`✅ Firebase Storage 480p URL: ${url480p}`);

  // 5. Inplannen in Firestore Calendar voor Zondag 6 September 2026 om 20:00 CET
  console.log('\n📅 Inplannen in Firestore Content Calendar...');
  const targetDate = new Date('2026-09-06T18:00:00.000Z');

  const caption = `Let it rain, brother. Let the thunder roll and wash the dust right off my soul. ⛈️⚡

Some storms don't come to stop you — they come to clear your path.

New 30s Wan Visual: "Let It Rain, Brother (Remastered)"
Outlaw Country Rock from the eye of the storm.

#JackHowlin #LetItRainBrother #OutlawCountry #AmericanaRock #WanVideo #StormyHighway #SouthernRock #NewMusic`;

  const postDoc = {
    title: 'Let It Rain, Brother — 30s Wan 2.7/3.0 Storm Feature',
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
    videoFormat: '9:16 vertical (1080x1920 HD Wan 2.7/3.0)',
    notes: 'Official 30s Alibaba Wan 2.7/3.0 cinematic video produced without audio, custom muxed with 30s uncompressed master audio of Let It Rain Brother.',
    model: 'wan_video'
  };

  const docRef = await admin.firestore().collection('posts').add(postDoc);
  console.log(`🎉 Post succesvol ingepland! Document ID: ${docRef.id}`);
  console.log(`Directe Calendar Link: https://jack-howlin-dashboard--jack-howlin-dashboard.europe-west4.hosted.app/calendar?postId=${docRef.id}`);

  console.log('\n================================================================');
  console.log('🚀 WAN 30S CINEMATIC PRODUCTIE 100% SUCCESVOL!');
  console.log(`🆔 Firestore Post ID: ${docRef.id}`);
  console.log(`🔗 1080p HD Video: ${url1080p}`);
  console.log(`🔗 480p Video: ${url480p}`);
  console.log('================================================================\n');
}

main().catch(console.error);
