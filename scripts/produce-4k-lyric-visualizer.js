const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('ffmpeg-static');

const bgImage = path.resolve('projects/hate-me-seedance-30s/stills/jack-howlin-master-still.png');
const audioTrack = path.resolve('projects/hate-me-social-production/hate_me_chorus_15s.wav');
const overlaySvgPath = path.resolve('projects/hate-me-social-production/poster_overlay.svg');
const outputVideo = path.resolve('projects/hate-me-social-production/jack_howlin_4k_lyric_poster_15s.mp4');

const svgContent = `
<svg width="1080" height="1920" viewBox="0 0 1080 1920" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="topVignette" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.92" />
      <stop offset="45%" stop-color="#000000" stop-opacity="0.50" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.0" />
    </linearGradient>
    <linearGradient id="bottomVignette" x1="0%" y1="100%" x2="0%" y2="0%">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.96" />
      <stop offset="35%" stop-color="#000000" stop-opacity="0.75" />
      <stop offset="70%" stop-color="#000000" stop-opacity="0.30" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0.0" />
    </linearGradient>
    <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#e6b86a" />
      <stop offset="50%" stop-color="#fdf4d8" />
      <stop offset="100%" stop-color="#d49b42" />
    </linearGradient>
  </defs>

  <!-- Top & Bottom Film Vignettes -->
  <rect x="0" y="0" width="1080" height="420" fill="url(#topVignette)" />
  <rect x="0" y="1150" width="1080" height="770" fill="url(#bottomVignette)" />

  <!-- Outlaw Gold Border Frame -->
  <rect x="40" y="40" width="1000" height="1840" fill="none" stroke="url(#goldGradient)" stroke-width="1.5" stroke-opacity="0.5" />
  <rect x="48" y="48" width="984" height="1824" fill="none" stroke="#ffffff" stroke-width="0.5" stroke-opacity="0.2" />

  <!-- Header Branding -->
  <text x="540" y="145" text-anchor="middle" font-family="'Georgia', serif" font-size="22" font-weight="bold" letter-spacing="10" fill="#d4af37">
    OUTLAW COUNTRY ROCK
  </text>
  <text x="540" y="215" text-anchor="middle" font-family="'Impact', 'Arial Black', sans-serif" font-size="64" letter-spacing="6" fill="#ffffff">
    JACK HOWLIN
  </text>
  <line x1="390" y1="250" x2="690" y2="250" stroke="url(#goldGradient)" stroke-width="2" stroke-opacity="0.8" />

  <!-- Main Lyric Statement (Bottom Third) -->
  <g transform="translate(540, 1440)">
    <text x="0" y="0" text-anchor="middle" font-family="'Georgia', serif" font-style="italic" font-size="36" fill="#d4af37">
      “Hate me all you want...
    </text>
    <text x="0" y="75" text-anchor="middle" font-family="'Impact', 'Arial Black', sans-serif" font-size="56" letter-spacing="3" fill="#ffffff">
      I STILL WEAR THIS CROWN.”
    </text>
  </g>

  <!-- Track Title Badge -->
  <g transform="translate(540, 1640)">
    <rect x="-240" y="-30" width="480" height="60" rx="30" fill="#000000" fill-opacity="0.7" stroke="url(#goldGradient)" stroke-width="1.5" />
    <text x="0" y="8" text-anchor="middle" font-family="'Arial', sans-serif" font-size="20" font-weight="bold" letter-spacing="4" fill="#ffffff">
      ⚡ HATE ME ALL YOU WANT ⚡
    </text>
  </g>

  <!-- Footer CTA -->
  <text x="540" y="1775" text-anchor="middle" font-family="'Arial', sans-serif" font-size="18" letter-spacing="5" fill="#a0a0a0">
    STREAM NOW ON SPOTIFY &amp; APPLE MUSIC
  </text>
  <text x="540" y="1815" text-anchor="middle" font-family="'Arial', sans-serif" font-size="15" letter-spacing="3" fill="#666666">
    JACKHOWLIN.COM
  </text>
</svg>
`;

fs.writeFileSync(overlaySvgPath, svgContent.trim());
console.log('SVG overlay gemaakt');

const fps = 30;
const duration = 15;
const totalFrames = duration * fps;

// Ken Burns subtle slow pan on 4K still + SVG overlay + 35mm grain + 48kHz audio
const filterComplex = [
  `[0:v]zoompan=z='min(zoom+0.00012,1.04)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1080x1920:fps=${fps},eq=contrast=1.03:brightness=0.01:saturation=1.05[bg]`,
  `[bg][1:v]overlay=0:0[vwithtext]`,
  `[vwithtext]noise=alls=6:allf=t+u,format=yuv420p[vfinal]`
].join(';');

const ffmpegArgs = [
  '-y',
  '-loop', '1',
  '-i', bgImage,
  '-i', overlaySvgPath,
  '-i', audioTrack,
  '-filter_complex', filterComplex,
  '-map', '[vfinal]',
  '-map', '2:a:0',
  '-c:v', 'libx264',
  '-crf', '16',
  '-preset', 'slow',
  '-c:a', 'aac',
  '-b:a', '320k',
  '-t', duration.toString(),
  '-movflags', '+faststart',
  outputVideo
];

console.log('Rendering 4K Lyric Visualizer...');
const res = cp.spawnSync(ffmpeg, ffmpegArgs, { stdio: 'inherit' });
if (res.status === 0) {
  console.log('Succesvol gerenderd:', (fs.statSync(outputVideo).size / (1024*1024)).toFixed(2), 'MB');
} else {
  console.error('Fout bij renderen');
}
