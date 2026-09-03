const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');

const bgImage = path.resolve('projects/hate-me-seedance-30s/stills/jack-howlin-master-still.png');
const audioTrack = path.resolve('projects/hate-me-social-production/hate_me_chorus_15s.wav');
const outputVideo = path.resolve('projects/hate-me-social-production/jack_howlin_4k_lyric_poster_15s.mp4');

const duration = 15;
const fps = 30;
const totalFrames = duration * fps;

const filters = [
  "zoompan=z='min(zoom+0.00012,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=" + totalFrames + ":s=1080x1920:fps=" + fps,
  "drawbox=x=0:y=0:w=1080:h=340:color=black@0.75:t=fill",
  "drawbox=x=0:y=1280:w=1080:h=640:color=black@0.85:t=fill",
  "drawbox=x=35:y=35:w=1010:h=1850:color=0xd4af37@0.6:t=2",
  "drawbox=x=45:y=45:w=990:h=1830:color=white@0.2:t=1",
  "drawtext=text='OUTLAW COUNTRY ROCK':fontcolor=0xd4af37:fontsize=22:x=(w-text_w)/2:y=130:shadowcolor=black@0.9:shadowx=2:shadowy=2",
  "drawtext=text='JACK HOWLIN':fontcolor=white:fontsize=72:x=(w-text_w)/2:y=180:shadowcolor=black@0.9:shadowx=3:shadowy=3",
  "drawbox=x=380:y=270:w=320:h=2:color=0xd4af37@0.8:t=fill",
  "drawtext=text='HATE ME ALL YOU WANT':fontcolor=0xd4af37:fontsize=36:x=(w-text_w)/2:y=1380:shadowcolor=black@0.9:shadowx=2:shadowy=2",
  "drawtext=text='I STILL WEAR THIS CROWN':fontcolor=white:fontsize=56:x=(w-text_w)/2:y=1440:shadowcolor=black@0.9:shadowx=3:shadowy=3",
  "drawbox=x=290:y=1560:w=500:h=60:color=black@0.7:t=fill",
  "drawbox=x=290:y=1560:w=500:h=60:color=0xd4af37@0.8:t=2",
  "drawtext=text='OFFICIAL MASTER AUDIO':fontcolor=white:fontsize=22:x=(w-text_w)/2:y=1578",
  "drawtext=text='STREAM NOW ON SPOTIFY AND APPLE MUSIC':fontcolor=0xb0b0b0:fontsize=18:x=(w-text_w)/2:y=1720:shadowcolor=black@0.9:shadowx=1:shadowy=1",
  "drawtext=text='JACKHOWLIN.COM':fontcolor=0x707070:fontsize=15:x=(w-text_w)/2:y=1760",
  "noise=alls=6:allf=t+u",
  "format=yuv420p"
].join(',');

const ffmpegArgs = [
  '-y',
  '-loop', '1',
  '-i', bgImage,
  '-i', audioTrack,
  '-vf', filters,
  '-map', '0:v:0',
  '-map', '1:a:0',
  '-c:v', 'libx264',
  '-crf', '16',
  '-preset', 'slow',
  '-c:a', 'aac',
  '-b:a', '320k',
  '-t', duration.toString(),
  '-movflags', '+faststart',
  outputVideo
];

console.log('Rendering 4K Lyric Visualizer with pure FFmpeg typography...');
const res = cp.spawnSync(ffmpeg, ffmpegArgs, { stdio: 'inherit' });

if (res.status === 0 && fs.existsSync(outputVideo)) {
  console.log('Succesvol gerenderd:', (fs.statSync(outputVideo).size / (1024 * 1024)).toFixed(2), 'MB');
} else {
  console.error('Fout bij renderen:', res.status);
}
