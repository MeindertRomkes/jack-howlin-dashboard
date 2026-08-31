#!/usr/bin/env node
/**
 * scripts/snip-audio.js
 * Knipt een lossless audiofragment uit een master track met automatische in- en uitfades.
 *
 * Gebruik:
 *   node snip-audio.js --input <path> --output <path> --start 00:00:30 --duration 15 [--fade-in 0.3] [--fade-out 1.5]
 */

const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {
    input: '',
    output: '',
    start: '00:00:00',
    duration: 15,
    fadeIn: 0.3,
    fadeOut: 1.5
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) params.input = args[++i];
    else if (args[i] === '--output' && args[i + 1]) params.output = args[++i];
    else if (args[i] === '--start' && args[i + 1]) params.start = args[++i];
    else if (args[i] === '--duration' && args[i + 1]) params.duration = parseFloat(args[++i]);
    else if (args[i] === '--fade-in' && args[i + 1]) params.fadeIn = parseFloat(args[++i]);
    else if (args[i] === '--fade-out' && args[i + 1]) params.fadeOut = parseFloat(args[++i]);
  }

  return params;
}

const params = parseArgs();

if (!params.input || !params.output) {
  console.error('Fout: --input en --output zijn verplichte parameters.');
  console.error('Voorbeeld: node snip-audio.js --input master.wav --output snip.wav --start 00:00:30 --duration 15');
  process.exit(1);
}

const inputPath = path.resolve(params.input);
const outputPath = path.resolve(params.output);

if (!fs.existsSync(inputPath)) {
  console.error(`Fout: Input bestand niet gevonden: ${inputPath}`);
  process.exit(1);
}

const outDir = path.dirname(outputPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const fadeOutStart = Math.max(0, params.duration - params.fadeOut);
const audioFilter = `afade=t=in:ss=0:d=${params.fadeIn},afade=t=out:st=${fadeOutStart}:d=${params.fadeOut}`;

const ffmpegArgs = [
  '-y',
  '-ss', params.start,
  '-t', params.duration.toString(),
  '-i', inputPath,
  '-af', audioFilter,
  outputPath
];

console.log(`Knippen audio: ${params.start} voor ${params.duration}s -> ${outputPath}`);
const res = cp.spawnSync(ffmpeg, ffmpegArgs, { stdio: 'inherit' });

if (res.status === 0 && fs.existsSync(outputPath)) {
  console.log(`Audio snippet succesvol gegenereerd: ${(fs.statSync(outputPath).size / 1024).toFixed(1)} KB`);
} else {
  console.error('Fout bij het genereren van audio snippet.');
  process.exit(1);
}
