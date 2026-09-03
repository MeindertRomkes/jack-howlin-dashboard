const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');
const { randomUUID } = require('crypto');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const posterPng = path.resolve('projects/hate-me-social-production/jack_howlin_dark_americana_perfect_poster.png');
const seamlessPng = path.resolve('projects/hate-me-social-production/jack_howlin_dark_americana_seamless.png');
const audioTrack = path.resolve('projects/hate-me-social-production/hate_me_chorus_15s.wav');
const destMp4 = path.resolve('projects/hate-me-social-production/jack_howlin_dark_americana_perfect_15s.mp4');

const duration = 15;
const fps = 30;
const totalFrames = duration * fps;

const filter = [
  "zoompan=z='min(zoom+0.00010,1.03)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=" + totalFrames + ":s=1080x1920:fps=" + fps,
  "noise=alls=5:allf=t+u",
  "eq=contrast=1.02:brightness=0.01:saturation=1.03",
  "format=yuv420p"
].join(',');

const args = [
  '-y',
  '-loop', '1',
  '-i', posterPng,
  '-i', audioTrack,
  '-vf', filter,
  '-map', '0:v:0',
  '-map', '1:a:0',
  '-c:v', 'libx264',
  '-crf', '16',
  '-preset', 'slow',
  '-c:a', 'aac',
  '-b:a', '320k',
  '-t', duration.toString(),
  '-movflags', '+faststart',
  destMp4
];

async function uploadToStorage(filePath, contentType) {
  const destination = 'previews/' + Date.now() + '_' + path.basename(filePath);
  const token = randomUUID();
  const bucket = admin.storage().bucket();
  await bucket.upload(filePath, {
    destination,
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });
  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(destination);
  return 'https://firebasestorage.googleapis.com/v0/b/' + bucketName + '/o/' + encodedPath + '?alt=media&token=' + token;
}

async function main() {
  console.log('Rendering 15s MP4 Master Visualizer from Perfect Dark Americana Poster...');
  const res = cp.spawnSync(ffmpeg, args, { stdio: 'inherit' });
  if (res.status === 0) {
    console.log('MP4 gerenderd:', (fs.statSync(destMp4).size / (1024*1024)).toFixed(2), 'MB');
  }

  const urlPoster = await uploadToStorage(posterPng, 'image/png');
  const urlSeamless = await uploadToStorage(seamlessPng, 'image/png');
  const urlVideo = await uploadToStorage(destMp4, 'video/mp4');

  console.log('PERFECT_POSTER_URL:', urlPoster);
  console.log('SEAMLESS_POSTER_URL:', urlSeamless);
  console.log('PERFECT_VIDEO_URL:', urlVideo);
}

main().catch(console.error);
