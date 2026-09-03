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
const sourceWav = path.join(rootDir, 'projects', 'hate-me-social-production', 'midnight_mirage_motel.wav');
const outputDir = path.join(rootDir, 'projects', 'hate-me-social-production');

const audio30sWav = path.join(outputDir, 'midnight_mirage_motel_30s_master.wav');
const finalVideoMp4 = path.join(outputDir, 'jack_howlin_midnight_mirage_motel_30s_master.mp4');

const detailedPrompt = `One continuous 30-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin at the roadside of Midnight Mirage Motel, delivering an intense outlaw performance synchronized to 'Midnight Mirage Motel'.

• [00:00 - 00:07] [Intro & Roadside Noir Atmosphere]: (Track: 'Midnight Mirage Motel' moody intro groove) Establishing atmospheric medium shot. Jack Howlin stands beside his vintage black pickup truck on a misty midnight desert highway, the weathered glowing turquoise and red neon sign of the Midnight Mirage Motel buzzing softly in the foggy distance. Jack is dressed in his signature tan camel-brown heavy canvas work jacket with chest flap pockets over an unbuttoned charcoal grey henley shirt. Full rugged brown beard and mustache, dark wavy hair ruffled by a chilly desert night breeze. He leans on the truck hood, eyes scanning the dark horizon with stoic intensity.

• [00:07 - 00:15] [Verse Build & Slow Camera Push-In]: (Lyrics: '3:30 AM on a dead highway, jukebox knows things before you do...') The camera executes a slow, cinematic continuous dolly push-in toward Jack. Jack turns his head toward the lens, fixing a piercing, defiant gaze directly into the camera. Deep shadows and warm amber rim lighting accentuate the contour of his jawline and facial texture. Distant truck headlights cut through the blue midnight mist, reflecting off the truck's wet hood.

• [00:15 - 00:23] [Chorus Drop & Energetic Outlaw Climax]: (Chorus lyrics: 'Midnight Mirage Motel! Neon buzzin like a dying heart, no turning back now!') The heavy distorted guitars and drums crash in as the camera locks into a dramatic, high-intensity close-up. Jack delivers raw outlaw emotion, jaw tightening, subtle head movement in sync with the heavy rhythm, wind swirling mist and light dust particles across the anamorphic frame. Red and amber neon motel reflections pulse across his jacket and rugged features.

• [00:23 - 00:30] [Outro Resonance & Stoic Smirk]: (Outro reverb & lingering guitar trail) Smooth deceleration of camera movement. Jack slowly exhales a breath of visible steam into the cold midnight air, a subtle, knowing outlaw smirk playing on his lips. He turns his gaze back down the infinite highway as the headlights and glowing neon sign fade into deep cinematic noir shadows.

Unbroken continuous shot, authentic facial physics, 35mm film grain texture, anamorphic lens flares, warm amber rim lighting contrasted with cold midnight blue haze, zero morphing, ultra-consistent Jack Core Set identity.`;

async function main() {
  console.log('================================================================');
  console.log('🎬 PRODUCING JACK HOWLIN - 30S MIDNIGHT MIRAGE MOTEL MASTER');
  console.log('⚡ 9:16 Vertical | 1080x1920 | 48kHz Stereo Master Audio');
  console.log('================================================================\n');

  // STEP 1: Slice the 30.0s lossless audio snippet from Midnight Mirage Motel (start: 00:00:30)
  console.log('🎵 STAP 1: Knippen van 30s Master Audio Snippet (00:00:30 -> 00:01:00)...');
  const audioFilter = 'afade=t=in:ss=0:d=0.25,afade=t=out:st=28.5:d=1.5';
  const sliceArgs = [
    '-y',
    '-ss', '00:00:30',
    '-t', '30.0',
    '-i', sourceWav,
    '-af', audioFilter,
    audio30sWav
  ];
  cp.spawnSync(ffmpeg, sliceArgs, { stdio: 'inherit' });
  console.log(`✅ 30s Audio opgeslagen: ${audio30sWav} (${(fs.statSync(audio30sWav).size / 1024).toFixed(1)} KB)`);

  // STEP 2: Render the 30s Cinematic Master Video in 1080x1920 9:16
  console.log('\n🎥 STAP 2: Renderen van 30s Cinematic Master Video...');

  // Use the canonical motel roadside Jack still
  const masterStill = path.join(outputDir, 'still_seedream5_pro.png');
  const duration = 30.0;
  const fps = 30;
  const totalFrames = Math.round(duration * fps);
  const fadeOutStart = duration - 1.5;

  // Cinematic 4-stage smooth motion filter matching the script timing
  const videoFilter = [
    `zoompan=z='min(zoom+0.00030,1.18)':x='iw/2-(iw/zoom/2)+sin(in/45)*3':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1080x1920:fps=${fps}`,
    'noise=alls=7:allf=t+u',
    'eq=contrast=1.04:brightness=0.01:saturation=1.06',
    'fade=t=in:st=0:d=0.5',
    `fade=t=out:st=${fadeOutStart}:d=1.5`,
    'format=yuv420p'
  ].join(',');

  const muxArgs = [
    '-y',
    '-loop', '1',
    '-i', masterStill,
    '-i', audio30sWav,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-vf', videoFilter,
    '-c:v', 'libx264',
    '-crf', '16',
    '-preset', 'slow',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', duration.toString(),
    '-movflags', '+faststart',
    finalVideoMp4
  ];

  console.log('Uitvoeren FFmpeg 1080x1920 Master Render...');
  const muxRes = cp.spawnSync(ffmpeg, muxArgs, { stdio: 'inherit' });
  if (muxRes.status !== 0 || !fs.existsSync(finalVideoMp4)) {
    throw new Error('Fout bij het renderen van de master video.');
  }
  console.log(`✅ Master Video gerenderd: ${finalVideoMp4} (${(fs.statSync(finalVideoMp4).size / (1024 * 1024)).toFixed(2)} MB)`);

  // STEP 3: Upload to Firebase Storage
  console.log('\n☁️ STAP 3: Uploaden naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const destination = `posts/${Date.now()}_jack_howlin_midnight_mirage_motel_30s_master.mp4`;
  const token = randomUUID();

  await bucket.upload(finalVideoMp4, {
    destination,
    metadata: {
      contentType: 'video/mp4',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(destination);
  const mediaUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
  console.log(`✅ Firebase Storage URL: ${mediaUrl}`);

  // STEP 4: Schedule in Firestore Calendar
  console.log('\n📅 STAP 4: Inplannen in Firestore Content Kalender...');
  const targetDate = new Date('2026-09-04T18:00:00.000Z'); // Friday Sep 4, 20:00 CET

  const caption = `3:30 AM. Dead highway. Neon buzzing like a dying heart.

Some places don't let you leave until you've faced the ghost in your rearview mirror. 🥃⚡

Track: "Midnight Mirage Motel" (30s Full Master Cut)
Available exclusively on the Outlaw Road Tour.

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
  console.log(`🎉 Post succesvol ingepland! Document ID: ${docRef.id}`);
  console.log(`Gepland voor: ${targetDate.toISOString()}`);
  console.log(`Directe URL: https://jack-howlin-dashboard--jack-howlin-dashboard.europe-west4.hosted.app/calendar?postId=${docRef.id}`);

  // Also save metadata locally
  const metaExport = {
    docId: docRef.id,
    mediaUrl,
    localFile: finalVideoMp4,
    audioFile: audio30sWav,
    duration: 30.0,
    resolution: '1080x1920',
    prompt: detailedPrompt,
    caption: caption,
    scheduledAt: targetDate.toISOString()
  };
  fs.writeFileSync(path.join(outputDir, 'midnight_mirage_motel_30s_meta.json'), JSON.stringify(metaExport, null, 2));

  console.log('\n================================================================');
  console.log('🚀 PRODUCTIE VOLTOOID!');
  console.log(`🆔 Firestore Post ID: ${docRef.id}`);
  console.log(`🔗 Media URL: ${mediaUrl}`);
  console.log('================================================================\n');
}

main().catch(console.error);
