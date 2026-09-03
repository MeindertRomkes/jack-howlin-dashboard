const { execSync, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

const KIE_API_KEY = process.env.KIE_AI_API_KEY || '10e19446174f4f74a4237b3bce6a8863';

const referenceImages = [
  'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fcore_0_kampvuur_motel_nacht.jpg?alt=media&token=982f869c-23c3-41a5-99ef-3fb1fc3c55de',
  'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fstill_seedream5_pro.png?alt=media&token=4528472a-edf1-416f-9387-5d71b8c29101',
  'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/jack-core-references%2Fcore_7_donker_studio_close_up_intens.jpg?alt=media&token=2331ca71-454a-4e75-98e3-4e215f1806da'
];

const audioUrlWav = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/public-audio%2F1788356986423_midnight_mirage_motel_30s.wav?alt=media&token=e9beda7e-3b78-4482-8d35-055d1efa55b8';
const audioUrlMp3 = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/public-audio%2F1788356986423_midnight_mirage_motel_30s.mp3?alt=media&token=3ee57f0c-39c0-4642-a299-9b7ba536fb2b';

const detailedPrompt = `One continuous 30-second unbroken cinematic shot in 9:16 vertical framing of Jack Howlin at the roadside of Midnight Mirage Motel, perfectly synchronized to the outlaw track.

• [00:00 - 00:07] [Intro & Roadside Noir Atmosphere]: (Track: 'Midnight Mirage Motel' intro beat) Establishing medium shot. Jack Howlin stands leaning against his vintage black pickup truck on the misty midnight desert highway, glowing neon motel sign buzzing in distant fog. Jack wears his tan heavy canvas work jacket over charcoal henley shirt, full rugged brown beard. Night mist drifts past headlights, subtle slow breath, stoic outlaw gaze scanning the empty road.

• [00:07 - 00:15] [Verse Tension & Slow Push-In]: (Verse lyrics: '3:30 AM on a dead highway, jukebox knows things before you do...') Slow cinematic camera dolly push-in toward Jack. Subtle head turn towards camera lens, sharp piercing eyes with intense emotion, gentle night breeze blowing his wavy hair and jacket collar, distant neon motel sign flickering between turquoise and warm amber.

• [00:15 - 00:23] [Chorus Drop & Energetic Climax]: (Chorus lyrics: 'Midnight Mirage Motel! Neon buzzin like a dying heart, no turning back...') Tight dramatic close-up on Jack Howlin as the heavy drums and distorted guitars drop. Jack delivers raw outlaw intensity, warm amber and blue neon rim lighting illuminating his chiseled jawline and beard texture, atmospheric smoke swirls dynamically in headlights beam.

• [00:23 - 00:30] [Outro Resonance & Stoic Smirk]: (Outro reverb & guitar trail) Slow camera deceleration into a razor-sharp portrait. Jack Howlin holds deep eye contact with the camera, subtle confident smirk, exhales steam into cold midnight air, as the neon reflections shimmer on the truck hood and shadows deepen into darkness.

Unbroken cinematic continuous shot, authentic facial physics, 35mm film texture, warm amber rim lighting with cool midnight blue atmospheric haze, photorealistic, zero morphing, ultra-consistent face and wardrobe.`;

console.log('=== SEEDANCE 2.5 30S MIDNIGHT MIRAGE MOTEL PRODUCTION ===');
console.log('API Key configured:', KIE_API_KEY ? 'YES' : 'NO');
console.log('Resolution: 480p | Aspect: 9:16 | Duration: 15s');

const env = { ...process.env, KIE_AI_API_KEY: KIE_API_KEY };

const cliPath = path.resolve('node_modules/@felores/kie-cli/dist/index.js');
const args = [
  'node',
  `"${cliPath}"`,
  'bytedance_seedance_video',
  '--prompt', `"${detailedPrompt.replace(/"/g, '\\"')}"`,
  '--first_frame_url', `"${referenceImages[0]}"`,
  '--reference_image_urls', `"${referenceImages[1]}"`, `"${referenceImages[2]}"`,
  '--reference_audio_urls', `"${audioUrlMp3}"`,
  '--duration', '15',
  '--resolution', '480p',
  '--aspect_ratio', '9:16',
  '--json'
];

try {
  const cmd = args.join(' ');
  console.log('Submitting to Kie AI CLI...');
  const result = execSync(cmd, { env, encoding: 'utf8' });
  console.log('Kie CLI Output:');
  console.log(result);
} catch (err) {
  console.error('Execution failed:');
  if (err.stdout) console.log('Stdout:', err.stdout.toString());
  if (err.stderr) console.error('Stderr:', err.stderr.toString());
}
