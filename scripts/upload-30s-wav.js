const admin = require('firebase-admin');
const { randomUUID } = require('crypto');
const path = require('path');
const fs = require('fs');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

async function uploadWav() {
  const bucket = admin.storage().bucket();
  const wavPath = path.join(process.cwd(), 'projects', 'hate-me-social-production', 'midnight_mirage_motel_exact_30s.wav');
  const token = randomUUID();
  const dest = 'universe-audio/midnight_mirage_motel_exact_30s.wav';

  await bucket.upload(wavPath, {
    destination: dest,
    metadata: {
      contentType: 'audio/wav',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
  console.log('Uploaded 30s WAV URL:', url);

  const manifestPath = path.join(process.cwd(), 'projects', 'jack-core-set', 'tiktok_seedance_references.json');
  const refs = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  refs.audio_1_exact_30s = url;
  fs.writeFileSync(manifestPath, JSON.stringify(refs, null, 2));
}

uploadWav().catch(console.error);
