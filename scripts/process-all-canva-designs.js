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
    name: 'Design 2 (Classic Outlaw Tour)',
    url: 'https://export-download.canva.com/pZLY4/DAHT7opZLY4/-1/0/0001-2711681470349546708.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260831%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260831T085722Z&X-Amz-Expires=83901&X-Amz-Signature=1dbee8b7323439e4250d0c88440980521cb2eeb75ccd9b6f87f208f9d03d36d3&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Tue%2C%2001%20Sep%202026%2008%3A15%3A43%20GMT',
    destPng: path.resolve('projects/hate-me-social-production/canva_design_2.png'),
    destMp4: path.resolve('projects/hate-me-social-production/canva_design_2_15s.mp4'),
    editUrl: 'https://www.canva.com/d/1r-AnLD15Ec-91N'
  },
  {
    name: 'Design 3 (High-End Dark Americana)',
    url: 'https://export-download.canva.com/f02NU/DAHT7qf02NU/-1/0/0001-4811484800042099936.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260831%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260831T104200Z&X-Amz-Expires=77597&X-Amz-Signature=4e8e045d91c3506044a9145fbd2be7dda9602e1bd39ae979a29dedc6ff108c15&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Tue%2C%2001%20Sep%202026%2008%3A15%3A17%20GMT',
    destPng: path.resolve('projects/hate-me-social-production/canva_design_3.png'),
    destMp4: path.resolve('projects/hate-me-social-production/canva_design_3_15s.mp4'),
    editUrl: 'https://www.canva.com/d/l9xNFZ_g-pzJVBy'
  },
  {
    name: 'Design 4 (Centralized Statement Poster)',
    url: 'https://export-download.canva.com/-7VrI/DAHT7p-7VrI/-1/0/0001-1859375242275955304.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260831%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260831T134953Z&X-Amz-Expires=67632&X-Amz-Signature=1a161e373154ee0961b8f00eb80b4bd3e3c9307621516a024840fb80b505dbb5&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Tue%2C%2001%20Sep%202026%2008%3A37%3A05%20GMT',
    destPng: path.resolve('projects/hate-me-social-production/canva_design_4.png'),
    destMp4: path.resolve('projects/hate-me-social-production/canva_design_4_15s.mp4'),
    editUrl: 'https://www.canva.com/d/0MYrFy1PFvB6Arm'
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
