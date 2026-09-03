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
const inputVideo = 'D:/Downloads/1788360622706-pv8wgtxpa3f.mp4';
const inputAudioWav = path.join(rootDir, 'projects', 'hate-me-social-production', 'midnight_mirage_motel_30s_master.wav');
const outputDir = path.join(rootDir, 'projects', 'hate-me-social-production');

const finalVideo1080p = path.join(outputDir, 'jack_howlin_seedance_midnight_mirage_30s_friday_1080p.mp4');
const finalVideo480p = path.join(outputDir, 'jack_howlin_seedance_midnight_mirage_30s_friday_480p.mp4');

async function main() {
  console.log('================================================================');
  console.log('🎬 PRODUCEREN VRIJDAG POST (30S SEEDANCE + MIDNIGHT MIRAGE MOTEL)');
  console.log('================================================================\n');

  if (!fs.existsSync(inputVideo)) {
    throw new Error(`Input video niet gevonden: ${inputVideo}`);
  }
  if (!fs.existsSync(inputAudioWav)) {
    throw new Error(`Input audio niet gevonden: ${inputAudioWav}`);
  }

  // 1. Render 480p Native Fast-Start MP4
  console.log('⚡ STAP 1: Muxen 480p Native MP4 (30.0s)...');
  const args480p = [
    '-y',
    '-i', inputVideo,
    '-i', inputAudioWav,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-c:v', 'libx264',
    '-crf', '19',
    '-preset', 'fast',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', '30.0',
    '-movflags', '+faststart',
    finalVideo480p
  ];
  cp.spawnSync(ffmpeg, args480p, { stdio: 'inherit' });
  console.log(`✅ 480p Video opgeleverd: ${finalVideo480p} (${(fs.statSync(finalVideo480p).size / (1024 * 1024)).toFixed(2)} MB)`);

  // 2. Render 1080x1920 HD Social Master met Lanczos & 35mm grain
  console.log('\n🎨 STAP 2: Renderen 1080x1920 HD Master (30.0s)...');
  const filter1080p = [
    'scale=1080:1920:flags=lanczos',
    'noise=alls=5:allf=t+u',
    'eq=contrast=1.03:brightness=0.01:saturation=1.05',
    'format=yuv420p'
  ].join(',');

  const args1080p = [
    '-y',
    '-i', inputVideo,
    '-i', inputAudioWav,
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
    finalVideo1080p
  ];
  cp.spawnSync(ffmpeg, args1080p, { stdio: 'inherit' });
  console.log(`✅ 1080p HD Video opgeleverd: ${finalVideo1080p} (${(fs.statSync(finalVideo1080p).size / (1024 * 1024)).toFixed(2)} MB)`);

  // 3. Upload to Firebase Storage
  console.log('\n☁️ STAP 3: Uploaden naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const dest1080p = `posts/${Date.now()}_jack_howlin_friday_midnight_mirage_30s_1080p.mp4`;
  const dest480p = `posts/${Date.now()}_jack_howlin_friday_midnight_mirage_30s_480p.mp4`;
  const token1080p = randomUUID();
  const token480p = randomUUID();

  await bucket.upload(finalVideo1080p, {
    destination: dest1080p,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token1080p } }
  });

  await bucket.upload(finalVideo480p, {
    destination: dest480p,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token480p } }
  });

  const url1080p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest1080p)}?alt=media&token=${token1080p}`;
  const url480p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest480p)}?alt=media&token=${token480p}`;

  console.log(`✅ Firebase 1080p URL: ${url1080p}`);
  console.log(`✅ Firebase 480p URL: ${url480p}`);

  // 4. Schedule for Friday (in 2 days: Friday 4 September 2026, 20:00 CET = 18:00 UTC)
  console.log('\n📅 STAP 4: Inplannen voor Vrijdag 4 September 2026...');
  const targetDate = new Date('2026-09-04T18:00:00.000Z');

  const caption = `Friday night on a dead desert highway. The jukebox knows what's coming before you do.

No turning back once the neon hits your eyes. 🥃⚡

Track: "Midnight Mirage Motel" (30s Roadside Master Cut)
Turn it all the way up for the weekend.

#JackHowlin #MidnightMirageMotel #FridayDrop #OutlawCountry #AmericanaRock #RoadsideNoir #Seedance25 #MidnightHighway #NewMusic`;

  const postDoc = {
    title: 'Midnight Mirage Motel — 30s Friday Roadside Feature',
    caption: caption,
    mediaUrl: url1080p,
    mediaUrl480p: url480p,
    mediaType: 'video',
    platforms: ['instagram', 'tiktok', 'youtube', 'facebook'],
    scheduledAt: admin.firestore.Timestamp.fromDate(targetDate),
    scheduledDate: targetDate.toISOString(),
    status: 'scheduled',
    createdAt: admin.firestore.Timestamp.now(),
    track: 'Midnight Mirage Motel (Unreleased)',
    videoFormat: '9:16 vertical (1080x1920 HD / 480x854)',
    notes: 'Official 30s Friday release video muxed from D:\\Downloads\\1788360622706-pv8wgtxpa3f.mp4 with 30s Midnight Mirage Motel master audio.'
  };

  const docRef = await admin.firestore().collection('posts').add(postDoc);
  console.log(`🎉 Post succesvol ingepland voor vrijdag! Document ID: ${docRef.id}`);
  console.log(`Directe Calendar Link: https://jack-howlin-dashboard--jack-howlin-dashboard.europe-west4.hosted.app/calendar?postId=${docRef.id}`);

  console.log('\n================================================================');
  console.log('🚀 VRIJDAG POST SUCCESVOL INGEPLAND!');
  console.log(`🆔 Firestore Post ID: ${docRef.id}`);
  console.log(`📅 Datum: Vrijdag 4 september 2026 (20:00 CET)`);
  console.log(`🔗 1080p HD Video: ${url1080p}`);
  console.log(`🔗 480p Video: ${url480p}`);
  console.log('================================================================\n');
}

main().catch(console.error);
