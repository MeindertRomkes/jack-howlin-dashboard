const fs = require('fs');
const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');
const admin = require('firebase-admin');
const { randomUUID } = require('crypto');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const realJackPhoto = path.resolve('projects/hate-me-seedance-30s/stills/jack-howlin-master-still.png');
const audioTrack = path.resolve('projects/hate-me-social-production/hate_me_chorus_15s.wav');
const destPosterPng = path.resolve('projects/hate-me-social-production/jack_howlin_real_dark_americana_poster.png');
const destVisualizerMp4 = path.resolve('projects/hate-me-social-production/jack_howlin_real_dark_americana_15s.mp4');

const duration = 15;
const fps = 30;
const totalFrames = duration * fps;

const baseGraphicLayers = [
  // High-End Dark Americana Gradient Vignettes
  "drawbox=x=0:y=0:w=1080:h=360:color=black@0.82:t=fill",
  "drawbox=x=0:y=1220:w=1080:h=700:color=black@0.88:t=fill",
  // Outlaw Gold & Platinum Double Frame
  "drawbox=x=36:y=36:w=1008:h=1848:color=0xd4af37@0.65:t=2",
  "drawbox=x=44:y=44:w=992:h=1832:color=white@0.18:t=1",
  // Header Typografie (Editie 2 Stijl)
  "drawtext=text='O U T L A W   C O U N T R Y   R O C K':fontcolor=0xd4af37:fontsize=22:x=(w-text_w)/2:y=135:shadowcolor=black@0.9:shadowx=2:shadowy=2",
  "drawtext=text='JACK HOWLIN':fontcolor=white:fontsize=76:x=(w-text_w)/2:y=185:shadowcolor=black@0.9:shadowx=4:shadowy=4",
  "drawbox=x=390:y=280:w=300:h=2:color=0xd4af37@0.85:t=fill",
  // Center-Bottom Quote (Editie 2 Stijl)
  "drawtext=text='“Hate me all you want...':fontcolor=0xd4af37:fontsize=36:x=(w-text_w)/2:y=1360:shadowcolor=black@0.9:shadowx=2:shadowy=2",
  "drawtext=text='I STILL WEAR THIS CROWN.”':fontcolor=white:fontsize=58:x=(w-text_w)/2:y=1425:shadowcolor=black@0.9:shadowx=3:shadowy=3",
  // Streaming Call to Action Badge
  "drawbox=x=240:y=1550:w=600:h=64:color=black@0.75:t=fill",
  "drawbox=x=240:y=1550:w=600:h=64:color=0xd4af37@0.85:t=2",
  "drawtext=text='⚡  HATE ME ALL YOU WANT - STREAM NOW  ⚡':fontcolor=white:fontsize=20:x=(w-text_w)/2:y=1572",
  // Footer Credits
  "drawtext=text='AVAILABLE ON ALL STREAMING PLATFORMS':fontcolor=0xa0a0a0:fontsize=17:x=(w-text_w)/2:y=1710:shadowcolor=black@0.9:shadowx=1:shadowy=1",
  "drawtext=text='JACKHOWLIN.COM':fontcolor=0x666666:fontsize=15:x=(w-text_w)/2:y=1750",
  // 35mm Analog Film Grain & Subtle Contrast Polish
  "noise=alls=5:allf=t+u",
  "eq=contrast=1.02:brightness=0.01:saturation=1.03",
  "format=yuv420p"
];

const stillFilters = [
  "scale=1080:1920:force_original_aspect_ratio=increase",
  "crop=1080:1920",
  ...baseGraphicLayers
].join(',');

const videoFilters = [
  "zoompan=z='min(zoom+0.00010,1.035)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=" + totalFrames + ":s=1080x1920:fps=" + fps,
  ...baseGraphicLayers
].join(',');

const stillArgs = [
  '-y',
  '-i', realJackPhoto,
  '-vf', stillFilters,
  '-vframes', '1',
  destPosterPng
];

const videoArgs = [
  '-y',
  '-loop', '1',
  '-i', realJackPhoto,
  '-i', audioTrack,
  '-vf', videoFilters,
  '-map', '0:v:0',
  '-map', '1:a:0',
  '-c:v', 'libx264',
  '-crf', '16',
  '-preset', 'slow',
  '-c:a', 'aac',
  '-b:a', '320k',
  '-t', duration.toString(),
  '-movflags', '+faststart',
  destVisualizerMp4
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
  console.log('Rendering 100% REAL Jack Howlin High-End Dark Americana Poster & Video...');

  // 1. Render still
  const resStill = cp.spawnSync(ffmpeg, stillArgs, { stdio: 'inherit' });
  if (resStill.status === 0) {
    console.log('Poster PNG gerenderd:', (fs.statSync(destPosterPng).size / 1024).toFixed(1), 'KB');
  }

  // 2. Render MP4
  const resVid = cp.spawnSync(ffmpeg, videoArgs, { stdio: 'inherit' });
  if (resVid.status === 0) {
    console.log('MP4 Video gerenderd:', (fs.statSync(destVisualizerMp4).size / (1024 * 1024)).toFixed(2), 'MB');
  }

  // 3. Upload to Storage
  const imgUrl = await uploadToStorage(destPosterPng, 'image/png');
  const vidUrl = await uploadToStorage(destVisualizerMp4, 'video/mp4');

  console.log('REAL_JACK_POSTER_URL:', imgUrl);
  console.log('REAL_JACK_VIDEO_URL:', vidUrl);
}

main().catch(console.error);
