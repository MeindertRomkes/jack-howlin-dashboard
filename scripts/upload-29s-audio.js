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

async function upload29s() {
  const bucket = admin.storage().bucket();
  const mp3Path = path.join(process.cwd(), 'projects', 'hate-me-social-production', 'midnight_mirage_motel_29s_master.mp3');
  const token = randomUUID();
  const dest = 'universe-audio/midnight_mirage_motel_29s_master.mp3';

  await bucket.upload(mp3Path, {
    destination: dest,
    metadata: {
      contentType: 'audio/mpeg',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(dest)}?alt=media&token=${token}`;
  console.log('Uploaded 29s MP3 URL:', url);

  const manifestPath = path.join(process.cwd(), 'projects', 'jack-core-set', 'tiktok_seedance_references.json');
  const refs = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  refs.audio_1 = url;
  fs.writeFileSync(manifestPath, JSON.stringify(refs, null, 2));
}

upload29s().catch(console.error);
