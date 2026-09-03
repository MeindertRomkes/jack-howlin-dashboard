const https = require('https');
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

const designs = [
  {
    name: 'Dark Americana - Edition 1 (Vignette & Gold)',
    url: 'https://export-download.canva.com/yAkRk/DAHT8vyAkRk/-1/0/0001-8320914824855486957.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260901%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260901T010207Z&X-Amz-Expires=39534&X-Amz-Signature=fc512d5ac7ab286a7d032ae84316a67cdb6bfc6445054acfd040770d8468ceb0&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Tue%2C%2001%20Sep%202026%2012%3A01%3A01%20GMT',
    destPng: path.resolve('projects/hate-me-social-production/canva_dark_americana_v1.png'),
    destMp4: path.resolve('projects/hate-me-social-production/canva_dark_americana_v1_15s.mp4'),
    editUrl: 'https://www.canva.com/d/NapnQOTU6EFAFDS'
  },
  {
    name: 'Dark Americana - Edition 2 (Studio Focus & Minimalist)',
    url: 'https://export-download.canva.com/I06Fc/DAHT8nI06Fc/-1/0/0001-6730018255052186960.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260831%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260831T192745Z&X-Amz-Expires=63070&X-Amz-Signature=ace724eb839d264288b8da1830e7dbeaa57f971b5c0f84a38bc9fce96f3eb0e6&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Tue%2C%2001%20Sep%202026%2012%3A58%3A55%20GMT',
    destPng: path.resolve('projects/hate-me-social-production/canva_dark_americana_v2.png'),
    destMp4: path.resolve('projects/hate-me-social-production/canva_dark_americana_v2_15s.mp4'),
    editUrl: 'https://www.canva.com/d/VtakbAd073JroH1'
  }
];

const audio = path.resolve('projects/hate-me-social-production/hate_me_chorus_15s.wav');

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', reject);
  });
}

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

async function run() {
  const duration = 15;
  const fps = 30;
  const totalFrames = duration * fps;

  for (const d of designs) {
    console.log('--- Verwerken ' + d.name + ' ---');
    await download(d.url, d.destPng);
    console.log('PNG gedownload:', (fs.statSync(d.destPng).size / 1024).toFixed(1), 'KB');

    const filter = [
      "zoompan=z='min(zoom+0.00010,1.03)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=" + totalFrames + ":s=1080x1920:fps=" + fps,
      "noise=alls=5:allf=t+u",
      "eq=contrast=1.02:brightness=0.01:saturation=1.03",
      "format=yuv420p"
    ].join(',');

    const args = [
      '-y',
      '-loop', '1',
      '-i', d.destPng,
      '-i', audio,
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
      d.destMp4
    ];

    cp.spawnSync(ffmpeg, args, { stdio: 'inherit' });
    console.log('MP4 gerenderd:', (fs.statSync(d.destMp4).size / (1024*1024)).toFixed(2), 'MB');

    const imgUrl = await uploadToStorage(d.destPng, 'image/png');
    const vidUrl = await uploadToStorage(d.destMp4, 'video/mp4');

    console.log('RESULT_' + d.name + '_IMG:', imgUrl);
    console.log('RESULT_' + d.name + '_VID:', vidUrl);
    console.log('EDIT_URL:', d.editUrl);
  }
}

run().catch(console.error);
