const https = require('https');
const fs = require('fs');
const cp = require('child_process');
const ffmpeg = require('ffmpeg-static');
const path = require('path');

const canvaUrl = 'https://export-download.canva.com/HmIT4/DAHT7qHmIT4/-1/0/0001-2241055310732111550.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAQYCGKMUH5AO7UJ26%2F20260831%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20260831T173604Z&X-Amz-Expires=54721&X-Amz-Signature=3b57b33b72dfcf5dffc421da7d0955ac72cc626eeb838c423f03845176519162&X-Amz-SignedHeaders=host%3Bx-amz-expected-bucket-owner&response-expires=Tue%2C%2001%20Sep%202026%2008%3A48%3A05%20GMT';
const destPng = path.resolve('projects/hate-me-social-production/canva_jack_howlin_master_poster.png');
const destMp4 = path.resolve('projects/hate-me-social-production/canva_jack_howlin_15s_master_visualizer.mp4');
const audio = path.resolve('projects/hate-me-social-production/hate_me_chorus_15s.wav');

const file = fs.createWriteStream(destPng);
https.get(canvaUrl, res => {
  res.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Canva PNG downloaded:', (fs.statSync(destPng).size / 1024).toFixed(1), 'KB');

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
      '-i', destPng,
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
      destMp4
    ];

    console.log('Rendering Canva 15s MP4 Visualizer...');
    const result = cp.spawnSync(ffmpeg, args, { stdio: 'inherit' });
    if (result.status === 0) {
      console.log('Canva MP4 visualizer successfully rendered:', (fs.statSync(destMp4).size / (1024*1024)).toFixed(2), 'MB');
    }
  });
}).on('error', err => console.error(err));
