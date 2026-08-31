import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config();

const apiKey = process.env.KIE_AI_API_KEY || '10e19446174f4f74a4237b3bce6a8863';
const outDir = path.join(process.cwd(), 'projects', 'hate-me-social-visualizer');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const stillImageUrl = 'https://tempfile.aiquickdraw.com/p/128cf77f5442aa530e63428ace2702fc_1_1788158572_4753.jpg';
const prompt = 'Cinematic atmospheric video of Jack Howlin standing beside the vintage truck on a misty midnight highway with glowing neon diner in the background. Jack is not singing, mouth remains closed, subtle slow breathing with intense stoic gaze, slight head turn looking toward the camera lens, gentle midnight desert wind blowing his wavy hair and jacket, atmospheric mist drifting across the highway, subtle camera push-in with warm anamorphic lens flare from the neon lights, 35mm film texture.';

console.log('=== Jack Howlin - Hate Me All You Want Seedance 2.5 Pipeline ===');
console.log('Submitting Seedance 2.5 task to Kie AI...');

const submitRes = spawnSync('npm', [
  'run', 'kie', '--',
  'bytedance_seedance_video',
  '--prompt', prompt,
  '--first_frame_url', stillImageUrl,
  '--duration', '10',
  '--resolution', '720p'
], {
  env: { ...process.env, KIE_AI_API_KEY: apiKey },
  encoding: 'utf8',
  shell: true
});

console.log(submitRes.stdout || submitRes.stderr);
