#!/usr/bin/env node
/**
 * scripts/mux-social-video.js
 * Muxes video of stilbeeld met audio naar een perfecte 1080x1920 9:16 vertical MP4.
 *
 * Modus 1 (Video Muxing met Auto-Looping & Audio Mapping):
 *   node mux-social-video.js --video input.mp4 --audio snippet.wav --output final.mp4
 *
 * Modus 2 (Smart Fallback Still Animation):
 *   node mux-social-video.js --image still.jpg --audio snippet.wav --output final.mp4 --duration 15
 */

const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    video: '',
    image: '',
    audio: '',
    output: '',
    duration: 15,
    crf: 20,
    fps: 30
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--video' && args[i + 1]) params.video = args[++i];
    else if (args[i] === '--image' && args[i + 1]) params.image = args[++i];
    else if (args[i] === '--audio' && args[i + 1]) params.audio = args[++i];
    else if (args[i] === '--output' && args[i + 1]) params.output = args[++i];
    else if (args[i] === '--duration' && args[i + 1]) params.duration = parseFloat(args[++i]);
    else if (args[i] === '--crf' && args[i + 1]) params.crf = parseInt(args[++i], 10);
    else if (args[i] === '--fps' && args[i + 1]) params.fps = parseInt(args[++i], 10);
  }

  return params;
}

const params = parseArgs();

if ((!params.video && !params.image) || !params.audio || !params.output) {
  console.error('Fout: Geef (--video OF --image) EN --audio EN --output mee.');
  console.error('Voorbeeld: node mux-social-video.js --video raw.mp4 --audio snippet.wav --output final.mp4');
  process.exit(1);
}

const outputPath = path.resolve(params.output);
const audioPath = path.resolve(params.audio);
const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

if (!fs.existsSync(audioPath)) {
  console.error(`Fout: Audio bestand niet gevonden: ${audioPath}`);
  process.exit(1);
}

let ffmpegArgs = [];

if (params.video) {
  const videoPath = path.resolve(params.video);
  if (!fs.existsSync(videoPath)) {
    console.error(`Fout: Video bestand niet gevonden: ${videoPath}`);
    process.exit(1);
  }

  console.log(`Muxen video + audio (met stream loop & explicit audio mapping):`);
  console.log(`Video: ${videoPath}`);
  console.log(`Audio: ${audioPath}`);
  console.log(`Output: ${outputPath}`);

  const filter = [
    'scale=1080:1920:force_original_aspect_ratio=increase',
    'crop=1080:1920',
    'noise=alls=8:allf=t+u',
    'eq=contrast=1.03:brightness=0.01:saturation=1.05'
  ].join(',');

  ffmpegArgs = [
    '-y',
    '-stream_loop', '-1',
    '-i', videoPath,
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-vf', filter,
    '-c:v', 'libx264',
    '-crf', params.crf.toString(),
    '-preset', 'slow',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-movflags', '+faststart',
    '-shortest',
    outputPath
  ];
} else {
  const imagePath = path.resolve(params.image);
  if (!fs.existsSync(imagePath)) {
    console.error(`Fout: Image bestand niet gevonden: ${imagePath}`);
    process.exit(1);
  }

  const totalFrames = Math.round(params.duration * params.fps);
  const fadeOutStart = Math.max(0, params.duration - 1.5);

  const videoFilter = [
    `zoompan=z='min(zoom+0.00035,1.15)':x='iw/2-(iw/zoom/2)+sin(in/30)*2':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1080x1920:fps=${params.fps}`,
    'noise=alls=10:allf=t+u',
    'eq=contrast=1.04:brightness=0.01:saturation=1.06',
    'fade=t=in:st=0:d=0.5',
    `fade=t=out:st=${fadeOutStart}:d=1.5`
  ].join(',');

  console.log(`Renderen 2.5D animatie fallback (1080x1920 9:16) voor ${params.duration}s...`);
  ffmpegArgs = [
    '-y',
    '-loop', '1',
    '-i', imagePath,
    '-i', audioPath,
    '-map', '0:v:0',
    '-map', '1:a:0',
    '-vf', videoFilter,
    '-c:v', 'libx264',
    '-crf', params.crf.toString(),
    '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-t', params.duration.toString(),
    '-movflags', '+faststart',
    '-shortest',
    outputPath
  ];
}

const res = cp.spawnSync(ffmpeg, ffmpegArgs, { stdio: 'inherit' });

if (res.status === 0 && fs.existsSync(outputPath)) {
  console.log(`Social video succesvol opgeleverd: ${(fs.statSync(outputPath).size / (1024 * 1024)).toFixed(2)} MB`);
} else {
  console.error('Fout bij het produceren van de social video.');
  process.exit(1);
}
