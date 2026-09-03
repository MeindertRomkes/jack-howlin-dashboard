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
const masterVideo = path.join(outputDir, 'jack_howlin_midnight_mirage_motel_30s_master.mp4');
const socialVideo = path.join(outputDir, 'jack_howlin_midnight_mirage_motel_30s_social.mp4');

const detailedPrompt = `One continuous 30-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin at the roadside of Midnight Mirage Motel, delivering an intense outlaw performance synchronized to 'Midnight Mirage Motel'.

• [00:00 - 00:07] [Intro & Roadside Noir Atmosphere]: (Track: 'Midnight Mirage Motel' moody intro groove) Establishing atmospheric medium shot. Jack Howlin stands beside his vintage black pickup truck on a misty midnight desert highway, the weathered glowing turquoise and red neon sign of the Midnight Mirage Motel buzzing softly in the foggy distance. Jack is dressed in his signature tan camel-brown heavy canvas work jacket with chest flap pockets over an unbuttoned charcoal grey henley shirt. Full rugged brown beard and mustache, dark wavy hair ruffled by a chilly desert night breeze. He leans on the truck hood, eyes scanning the dark horizon with stoic intensity.

• [00:07 - 00:15] [Verse Build & Slow Camera Push-In]: (Lyrics: '3:30 AM on a dead highway, jukebox knows things before you do...') The camera executes a slow, cinematic continuous dolly push-in toward Jack. Jack turns his head toward the lens, fixing a piercing, defiant gaze directly into the camera. Deep shadows and warm amber rim lighting accentuate the contour of his jawline and facial texture. Distant truck headlights cut through the blue midnight mist, reflecting off the truck's wet hood.

• [00:15 - 00:23] [Chorus Drop & Energetic Outlaw Climax]: (Chorus lyrics: 'Midnight Mirage Motel! Neon buzzin like a dying heart, no turning back now!') The heavy distorted guitars and drums crash in as the camera locks into a dramatic, high-intensity close-up. Jack delivers raw outlaw emotion, jaw tightening, subtle head movement in sync with the heavy rhythm, wind swirling mist and light dust particles across the anamorphic frame. Red and amber neon motel reflections pulse across his jacket and rugged features.

• [00:23 - 00:30] [Outro Resonance & Stoic Smirk]: (Outro reverb & lingering guitar trail) Smooth deceleration of camera movement. Jack slowly exhales a breath of visible steam into the cold midnight air, a subtle, knowing outlaw smirk playing on his lips. He turns his gaze back down the infinite highway as the headlights and glowing neon sign fade into deep cinematic noir shadows.

Unbroken continuous shot, authentic facial physics, 35mm film grain texture, anamorphic lens flares, warm amber rim lighting contrasted with cold midnight blue haze, zero morphing, ultra-consistent Jack Core Set identity.`;

async function main() {
  console.log('⚡ Encoding Social Web Fast-Start MP4 (CRF 22, 1080x1920)...');
  const encodeArgs = [
    '-y',
    '-i', masterVideo,
    '-c:v', 'libx264',
    '-crf', '22',
    '-preset', 'fast',
    '-c:a', 'aac',
    '-b:a', '256k',
    '-movflags', '+faststart',
    socialVideo
  ];
  cp.spawnSync(ffmpeg, encodeArgs, { stdio: 'inherit' });
  console.log(`✅ Social faststart video created: ${(fs.statSync(socialVideo).size / (1024 * 1024)).toFixed(2)} MB`);

  console.log('☁️ Uploading to Firebase Storage...');
  const bucket = admin.storage().bucket();
  const destination = `posts/${Date.now()}_jack_howlin_midnight_mirage_motel_30s.mp4`;
  const token = randomUUID();

  await bucket.upload(socialVideo, {
    destination,
    metadata: {
      contentType: 'video/mp4',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(destination);
  const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
  console.log(`✅ Social Media URL: ${mediaUrl}`);

  const targetDate = new Date('2026-09-04T18:00:00.000Z'); // Friday Sep 4, 20:00 CET

  const caption = `3:30 AM on a dead highway. The jukebox knows things before you do.

Some roads you don't choose — they choose you. 🥃⚡

New 30s Master Cut: "Midnight Mirage Motel"
Stream it loud on the dashboard.

#JackHowlin #MidnightMirageMotel #OutlawCountry #AmericanaRock #RoadsideNoir #Seedance25 #MidnightHighway`;

  const postDoc = {
    title: 'Midnight Mirage Motel — 30s Master Roadside Noir',
    caption: caption,
    mediaUrl: mediaUrl,
    mediaType: 'video',
    platforms: ['instagram', 'tiktok', 'youtube', 'facebook'],
    scheduledAt: admin.firestore.Timestamp.fromDate(targetDate),
    scheduledDate: targetDate.toISOString(),
    status: 'scheduled',
    createdAt: admin.firestore.Timestamp.now(),
    track: 'Midnight Mirage Motel (Unreleased)',
    videoFormat: '9:16 vertical (1080x1920)',
    notes: 'Official 30s cinematic continuous master video for Midnight Mirage Motel with full verse build and chorus drop.',
    promptScript: detailedPrompt
  };

  const docRef = await admin.firestore().collection('posts').add(postDoc);
  console.log(`🎉 Post successfully scheduled in Firestore! ID: ${docRef.id}`);
  console.log(`Gepland voor: ${targetDate.toISOString()}`);
  console.log(`Direct Dashboard Calendar URL: https://jack-howlin-dashboard--jack-howlin-dashboard.europe-west4.hosted.app/calendar?postId=${docRef.id}`);
}

main().catch(console.error);
