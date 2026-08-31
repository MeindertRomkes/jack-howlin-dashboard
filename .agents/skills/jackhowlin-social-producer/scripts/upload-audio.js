#!/usr/bin/env node
/**
 * scripts/upload-audio.js
 * Uploads an audio clip to Firebase Storage and returns a public direct URL with download token.
 *
 * Gebruik:
 *   node upload-audio.js --input <audio_path>
 */

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

function parseArgs() {
  const args = process.argv.slice(2);
  let input = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) input = args[++i];
  }
  return { input };
}

async function uploadAudio() {
  const { input } = parseArgs();
  if (!input) {
    console.error('Fout: --input <audio_path> is verplicht.');
    process.exit(1);
  }

  const filePath = path.resolve(input);
  if (!fs.existsSync(filePath)) {
    console.error(`Fout: Bestand niet gevonden: ${filePath}`);
    process.exit(1);
  }

  const destination = `public-audio/${Date.now()}_${path.basename(filePath)}`;
  const token = randomUUID();
  const bucket = admin.storage().bucket();

  await bucket.upload(filePath, {
    destination,
    metadata: {
      contentType: filePath.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(destination);
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

  console.log('PUBLIC_AUDIO_URL:', publicUrl);
}

uploadAudio().catch(console.error);
