const admin = require('firebase-admin');
const { randomUUID } = require('crypto');
const cp = require('child_process');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config();

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const rootDir = process.cwd();
const coreSetDir = path.join(rootDir, 'projects', 'jack-core-set');
const outputDir = path.join(rootDir, 'projects', 'hate-me-social-production');

const KIE_API_KEY = process.env.KIE_AI_API_KEY || '10e19446174f4f74a4237b3bce6a8863';
const cliPath = path.resolve('node_modules/@felores/kie-cli/dist/index.js');
const env = { ...process.env, KIE_AI_API_KEY: KIE_API_KEY };

async function uploadCoreFiles() {
  console.log('☁️ Uploaden van Jack Core Set bestanden naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const filesToUpload = [
    'core_7_donker_studio_close_up_intens.jpg',
    'core_8_studio_halffiguur_zwart.jpg',
    'core_5_bar_portret_warm_licht.jpg',
    'core_0_kampvuur_motel_nacht.jpg'
  ];

  const uploadedUrls = [];
  for (const filename of filesToUpload) {
    const localPath = path.join(coreSetDir, filename);
    if (fs.existsSync(localPath)) {
      const dest = `jack-core-references/${filename}`;
      const token = randomUUID();
      await bucket.upload(localPath, {
        destination: dest,
        metadata: { contentType: 'image/jpeg', metadata: { firebaseStorageDownloadTokens: token } }
      });
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
      uploadedUrls.push(url);
      console.log(`   ✅ ${filename} -> ${url}`);
    }
  }
  return uploadedUrls;
}

function runCli(cmdArgs) {
  const fullCmd = `node "${cliPath}" ${cmdArgs} --json`;
  console.log(`Executing CLI...`);
  const raw = cp.execSync(fullCmd, { env, encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  return JSON.parse(raw);
}

async function waitForTask(taskId, label, maxWaitMs = 300000) {
  console.log(`\n⏳ Wachten op ${label} [Task ID: ${taskId}]...`);
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const parsed = runCli(`get_task_status --task_id "${taskId}"`);
      const data = parsed.data || parsed.response?.data || parsed.api_response?.data || parsed;
      const status = (parsed.status || data.status || data.state || '').toLowerCase();
      const elapsed = Math.round((Date.now() - startTime) / 1000);

      console.log(`   [${elapsed}s] ${label} status: ${status.toUpperCase()}`);

      if (status === 'completed' || status === 'success' || status === 'done') {
        let urls = parsed.result_urls || data.resultUrls || data.result_urls;
        if (!urls && data.resultJson) {
          try {
            const rj = JSON.parse(data.resultJson);
            urls = rj.resultUrls || rj.result_urls || rj.urls;
          } catch (e) {}
        }
        if (urls && urls.length > 0) return urls[0];
        if (data.resultUrl || data.result_url || data.imageUrl || data.image_url) {
          return data.resultUrl || data.result_url || data.imageUrl || data.image_url;
        }
      }

      if (status === 'failed' || status === 'fail' || status === 'error') {
        throw new Error(`Kie taak ${taskId} mislukt: ${data.failMsg || JSON.stringify(data)}`);
      }
    } catch (err) {
      if (err.message.includes('mislukt')) throw err;
      console.log(`   Status check retry: ${err.message}`);
    }

    await new Promise(r => setTimeout(r, 6000));
  }

  throw new Error(`Kie taak ${taskId} time-out na ${maxWaitMs / 1000}s`);
}

async function downloadFile(url, destPath) {
  console.log(`Downloaden van ${url} naar ${destPath}...`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download mislukt (${response.statusText}): ${url}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`✅ Opgeslagen: ${(fs.statSync(destPath).size / (1024 * 1024)).toFixed(2)} MB`);
}

async function main() {
  console.log('================================================================');
  console.log('🎨 GENEREREN 4-ANGLE MASTER TURNAROUND SHEET (SEEDREAM 5.0 PRO)');
  console.log('⚡ Front (0°), 3/4 Front (45°), Profile (90°), Rear 3/4 (135°)');
  console.log('================================================================\n');

  // 1. Upload core references
  const coreUrls = await uploadCoreFiles();

  // 2. Structured Prompt for 4-Angle Turnaround Sheet
  const turnaroundPrompt = `Official 4-angle character turnaround model sheet of Jack Howlin, 35-year-old rugged outlaw country-rock artist, in a wide panoramic horizontal lineup against a neutral clean studio backdrop with subtle warm lighting.

The image displays four full-upper-body views of the exact same character standing side by side in sequence from left to right:
1. [FRONT VIEW (0°)]: Standing directly facing camera, stoic and defiant expression, piercing focused eyes, naturally closed and relaxed mouth. Showing front details of the signature tan camel-brown heavy canvas work jacket with dual chest flap pockets over an unbuttoned charcoal grey henley shirt, full rugged brown beard and moustache, dark wavy hair.
2. [THREE-QUARTER VIEW (45°)]: 3/4 front angle showing dynamic jawline, cheekbone depth, rugged beard profile, and the drape of the heavy canvas jacket over the shoulders.
3. [SIDE PROFILE VIEW (90°)]: True 90-degree side profile displaying precise nose shape, beard projection, ear, wavy hair length in the back, and jacket sleeve structure.
4. [REAR THREE-QUARTER VIEW (135°)]: 3/4 back view showing the rear neckline, wavy dark hair falling slightly over the canvas jacket collar, sturdy back construction of the work jacket, and overall outlaw silhouette.

Clean studio character design bible, consistent studio lighting, sharp 8k photorealistic detail, 35mm film still texture, ultra-consistent facial anatomy and beard styling across all 4 angles, exact match to reference images of Jack Howlin.`;

  // 3. Build CLI Command for Seedream 5 Lite (High 3K) / Seedream 5 Pro
  console.log('\n🚀 STAP 2: Taak submitten naar ByteDance Seedream 5 op Kie.ai (16:9 Panoramic, High 3K)...');
  
  const imgArgs = coreUrls.map(u => `"${u}"`).join(' ');
  const cliArgs = `bytedance_seedream_image --version 5-lite --aspect_ratio 16:9 --quality high --image_urls ${imgArgs} --prompt "${turnaroundPrompt}"`;

  const res = runCli(cliArgs);
  const taskId = res.task_id || res.data?.taskId || res.taskId;
  console.log(`✅ Seedream 5 Taak ID: ${taskId}`);

  // 4. Wachten op resultaat
  const resultImageUrl = await waitForTask(taskId, 'Seedream 5 Turnaround Sheet');
  console.log(`\n🎉 Turnaround Sheet succesvol gegenereerd! URL: ${resultImageUrl}`);

  // 5. Download lokaal
  const localDest = path.join(coreSetDir, 'jack_howlin_4_angle_master_turnaround.png');
  await downloadFile(resultImageUrl, localDest);

  // 6. Upload als permanente master referentie naar Firebase Storage
  console.log('\n☁️ STAP 3: Uploaden naar permanente Firebase Storage referentielocatie...');
  const bucket = admin.storage().bucket();
  const masterDest = `jack-core-references/jack_howlin_4_angle_master_turnaround_${Date.now()}.png`;
  const token = randomUUID();

  await bucket.upload(localDest, {
    destination: masterDest,
    metadata: { contentType: 'image/png', metadata: { firebaseStorageDownloadTokens: token } }
  });

  const permanentUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(masterDest)}?alt=media&token=${token}`;
  console.log(`✅ Permanente Model Sheet URL: ${permanentUrl}`);

  console.log('\n================================================================');
  console.log('🚀 4-ANGLE MASTER TURNAROUND SHEET SUCCESVOL OPGELEVERD!');
  console.log(`📁 Lokaal bestand: ${localDest}`);
  console.log(`🔗 Publieke URL: ${permanentUrl}`);
  console.log('================================================================\n');
}

main().catch(console.error);
