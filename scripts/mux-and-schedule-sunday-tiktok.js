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
const inputVideo = path.join(rootDir, 'projects', 'hate-me-social-production', 'midnight_mirage_tiktok_30s_master.mp4');
const inputAudio = path.join(rootDir, 'projects', 'hate-me-social-production', 'midnight_mirage_motel_30s_master.wav');
const outputDir = path.join(rootDir, 'projects', 'hate-me-social-production');

const finalVideoHD = path.join(outputDir, 'midnight_mirage_motel_30s_short_film_final_hd.mp4');

async function main() {
  console.log('================================================================');
  console.log('🎬 MUXING 30S TIKTOK SHORT FILM MET STUDIO MASTER AUDIO');
  console.log('================================================================\n');

  if (!fs.existsSync(inputVideo)) {
    throw new Error(`Video niet gevonden: ${inputVideo}`);
  }
  if (!fs.existsSync(inputAudio)) {
    throw new Error(`Audio niet gevonden: ${inputAudio}`);
  }

  console.log(`Video: ${inputVideo} (${(fs.statSync(inputVideo).size / 1024 / 1024).toFixed(2)} MB)`);
  console.log(`Audio: ${inputAudio}`);

  // 1. Muxen en renderen naar 1080x1920 Crisp HD met 320kbps studio master audio
  console.log('\n⚡ STAP 1: Muxen naar 1080x1920 HD Master met 320k Studio Audio...');
  const filter1080p = [
    'scale=1080:1920:flags=lanczos',
    'eq=contrast=1.02:brightness=0.01:saturation=1.04',
    'format=yuv420p'
  ].join(',');

  const args = [
    '-y',
    '-i', inputVideo,
    '-i', inputAudio,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-vf', filter1080p,
    '-c:v', 'libx264',
    '-crf', '18',
    '-preset', 'fast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', '30.0',
    '-movflags', '+faststart',
    finalVideoHD
  ];

  cp.spawnSync(ffmpeg, args, { stdio: 'inherit' });

  const finalSizeMb = (fs.statSync(finalVideoHD).size / (1024 * 1024)).toFixed(2);
  console.log(`\n✅ 1080p HD Master gegenereerd: ${finalVideoHD} (${finalSizeMb} MB)`);

  // 2. Upload naar Firebase Storage
  console.log('\n☁️ STAP 2: Uploaden naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const token = randomUUID();
  const storagePath = `posts/${Date.now()}_midnight_mirage_motel_30s_master_hd.mp4`;

  await bucket.upload(finalVideoHD, {
    destination: storagePath,
    metadata: {
      contentType: 'video/mp4',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
  console.log(`✅ Public Storage URL: ${publicUrl}`);

  // 3. Inplannen voor Zondag 6 September 2026 om 20:00 CET (18:00 UTC)
  console.log('\n📅 STAP 3: Inplannen voor Zondag 6 September 2026 in Firestore...');
  const targetDate = new Date('2026-09-06T18:00:00.000Z'); // Zondag 6 Sep 2026 20:00 CET

  const caption = `3:30 AM. Dead highway. Room 17 is waiting.

Some doors don't take you anywhere. They bring everything back. 🗝️🏜️

"Midnight Mirage Motel" — The Official 30s Short Film.
Starring Jack Howlin', June Holloway & Abel Graves.

Soundtrack: "Midnight Mirage Motel" (Original Master)
Streaming everywhere. 🥃⚡

#JackHowlin #MidnightMirageMotel #Room17 #NeoWestern #OutlawCountry #SouthernGothic #CinematicShortFilm #DarkAmericana #TikTokFilm #Seedance25`;

  const postData = {
    title: 'Midnight Mirage Motel — Official 30s Short Film (Zondag Premiere)',
    caption: caption,
    mediaUrl: publicUrl,
    mediaType: 'video',
    platforms: ['tiktok', 'instagram', 'youtube', 'facebook'],
    scheduledAt: admin.firestore.Timestamp.fromDate(targetDate),
    scheduledDate: targetDate.toISOString(),
    status: 'scheduled',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    track: 'Midnight Mirage Motel (30s Master)',
    videoFormat: '9:16 vertical (1080x1920 HD / 30fps / 320k Audio)',
    characters: ['Jack Howlin', 'June Holloway', 'Abel Graves'],
    location: 'Midnight Mirage Motel (Exterior, Reception, Room 17)',
    notes: '30-seconden Cinematic Neo-Western short film op ByteDance Seedance 2.5 gemuxt met 320kbps studio master audio.',
    isScheduled: true
  };

  const docRef = await admin.firestore().collection('posts').add(postData);
  console.log(`\n🎉 POST SUCCESVOL INGEPLAND VOOR ZONDAG!`);
  console.log(`🆔 Firestore Document ID: ${docRef.id}`);
  console.log(`📅 Inplanningsdatum: Zondag 6 September 2026 om 20:00 CET (${targetDate.toISOString()})`);
  console.log(`🔗 Dashboard Link: https://jack-howlin-dashboard--jack-howlin-dashboard.europe-west4.hosted.app/calendar?postId=${docRef.id}`);
}

main().catch(console.error);
