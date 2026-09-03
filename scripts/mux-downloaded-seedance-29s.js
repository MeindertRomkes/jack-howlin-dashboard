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
const inputVideo = 'D:/Downloads/1788359082985-14anir3zd3er.mp4';
const inputAudioWav = path.join(rootDir, 'projects', 'hate-me-social-production', 'midnight_mirage_motel_29s_master.wav');
const inputAudioMp3 = path.join(rootDir, 'projects', 'hate-me-social-production', 'midnight_mirage_motel_29s_master.mp3');
const outputDir = path.join(rootDir, 'projects', 'hate-me-social-production');

const finalVideo480p = path.join(outputDir, 'jack_howlin_seedance_midnight_mirage_29s_480p.mp4');
const finalVideo1080p = path.join(outputDir, 'jack_howlin_seedance_midnight_mirage_29s_1080p.mp4');

const detailedPrompt = `One continuous 29-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin at the roadside of Midnight Mirage Motel, delivering an intense outlaw performance synchronized to 'Midnight Mirage Motel'.

• [00:00 - 00:07] [Intro & Roadside Noir Atmosphere]: (Track: 'Midnight Mirage Motel' moody intro groove) Establishing atmospheric medium shot. Jack Howlin stands beside his vintage black pickup truck on a misty midnight desert highway, glowing neon motel sign buzzing in distant fog. Jack wears his tan heavy canvas work jacket over charcoal henley shirt, full rugged brown beard. Night mist drifts past headlights, subtle slow breath, stoic outlaw gaze scanning the empty road.

• [00:07 - 00:15] [Verse Tension & Slow Push-In]: (Verse lyrics: '3:30 AM on a dead highway, jukebox knows things before you do...') Slow cinematic camera dolly push-in toward Jack. Subtle head turn towards camera lens, sharp piercing eyes with intense emotion, gentle night breeze blowing his wavy hair and jacket collar, distant neon motel sign flickering between turquoise and warm amber.

• [00:15 - 00:23] [Chorus Drop & Energetic Outlaw Climax]: (Chorus lyrics: 'Midnight Mirage Motel! Neon buzzin like a dying heart, no turning back now!') Tight dramatic close-up on Jack Howlin as the heavy drums and distorted guitars drop. Jack delivers raw outlaw intensity, warm amber and blue neon rim lighting illuminating his chiseled jawline and beard texture, atmospheric smoke swirls dynamically in headlights beam.

• [00:23 - 00:29] [Outro Resonance & Stoic Smirk]: (Outro reverb & lingering guitar trail) Smooth deceleration of camera movement. Jack slowly exhales a breath of visible steam into the cold midnight air, a subtle, knowing outlaw smirk playing on his lips. He turns his gaze back down the infinite highway as the headlights and glowing neon sign fade into deep cinematic noir shadows.

Unbroken continuous shot, authentic facial physics, 35mm film grain texture, anamorphic lens flares, warm amber rim lighting contrasted with cold midnight blue haze, zero morphing, ultra-consistent Jack Core Set identity.`;

async function main() {
  console.log('================================================================');
  console.log('🎬 MUXING SEEDANCE 2.5 VIDEO MET 29S MIDNIGHT MIRAGE MOTEL AUDIO');
  console.log('================================================================\n');

  if (!fs.existsSync(inputVideo)) {
    throw new Error(`Video file niet gevonden: ${inputVideo}`);
  }

  // 1. Render 480p Native Fast-Start MP4 with 29.0s master audio
  console.log('⚡ STAP 1: Muxen van 480p Native Seedance MP4 (29.0s)...');
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
    '-t', '29.0',
    '-movflags', '+faststart',
    finalVideo480p
  ];
  cp.spawnSync(ffmpeg, args480p, { stdio: 'inherit' });
  console.log(`✅ 480p Video opgeleverd: ${finalVideo480p} (${(fs.statSync(finalVideo480p).size / (1024 * 1024)).toFixed(2)} MB)`);

  // 2. Render 1080x1920 HD Master with 35mm grain & enhanced dynamic range
  console.log('\n🎨 STAP 2: Renderen van 1080x1920 HD Social Master (29.0s)...');
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
    '-t', '29.0',
    '-movflags', '+faststart',
    finalVideo1080p
  ];
  cp.spawnSync(ffmpeg, args1080p, { stdio: 'inherit' });
  console.log(`✅ 1080p HD Video opgeleverd: ${finalVideo1080p} (${(fs.statSync(finalVideo1080p).size / (1024 * 1024)).toFixed(2)} MB)`);

  // 3. Upload to Firebase Storage
  console.log('\n☁️ STAP 3: Uploaden naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const dest480p = `posts/${Date.now()}_jack_howlin_seedance_29s_480p.mp4`;
  const dest1080p = `posts/${Date.now()}_jack_howlin_seedance_29s_1080p.mp4`;
  const token480p = randomUUID();
  const token1080p = randomUUID();

  await bucket.upload(finalVideo480p, {
    destination: dest480p,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token480p } }
  });

  await bucket.upload(finalVideo1080p, {
    destination: dest1080p,
    metadata: { contentType: 'video/mp4', metadata: { firebaseStorageDownloadTokens: token1080p } }
  });

  const url480p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest480p)}?alt=media&token=${token480p}`;
  const url1080p = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest1080p)}?alt=media&token=${token1080p}`;

  console.log(`✅ Firebase Storage 480p URL: ${url480p}`);
  console.log(`✅ Firebase Storage 1080p HD URL: ${url1080p}`);

  // 4. Schedule in Firestore Content Calendar
  console.log('\n📅 STAP 4: Inplannen in Firestore Content Calendar...');
  const targetDate = new Date('2026-09-04T18:00:00.000Z'); // Friday Sep 4, 20:00 CET

  const caption = `3:30 AM on a dead highway. The jukebox knows things before you do.

Some roads you don't choose — they choose you. 🥃⚡

New 29s Seedance 2.5 Visual: "Midnight Mirage Motel"
Outlaw Rock from the heart of the desert.

#JackHowlin #MidnightMirageMotel #OutlawCountry #AmericanaRock #RoadsideNoir #Seedance25 #MidnightHighway #AIArtist`;

  const postDoc = {
    title: 'Midnight Mirage Motel — 29s Seedance 2.5 Official Video',
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
    notes: 'Official Seedance 2.5 29s cinematic video muxed with 29s master audio snippet (verse build + chorus drop).',
    promptScript: detailedPrompt
  };

  const docRef = await admin.firestore().collection('posts').add(postDoc);
  console.log(`🎉 Post succesvol ingepland! Document ID: ${docRef.id}`);
  console.log(`Directe Calendar Link: https://jack-howlin-dashboard--jack-howlin-dashboard.europe-west4.hosted.app/calendar?postId=${docRef.id}`);

  console.log('\n================================================================');
  console.log('🚀 PRODUCTIE & MUXING 100% SUCCESVOL!');
  console.log(`🆔 Firestore Post ID: ${docRef.id}`);
  console.log(`🔗 1080p HD Video: ${url1080p}`);
  console.log(`🔗 480p Video: ${url480p}`);
  console.log('================================================================\n');
}

main().catch(console.error);
