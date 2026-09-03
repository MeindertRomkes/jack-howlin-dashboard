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

const rootDir = process.cwd();
const srcDir = path.join(rootDir, 'projects', 'jack-core-set', 'single_references');

const filesToUpload = [
  { id: 'image_1_jack', localFile: 'jack_howlin_portrait.jpg', desc: 'Jack Howlin (Image 1)' },
  { id: 'image_2_june', localFile: 'june_holloway_portrait.jpg', desc: 'June Holloway (Image 2)' },
  { id: 'image_3_abel', localFile: 'abel_graves_portrait.jpg', desc: 'Abel Graves (Image 3)' },
  { id: 'image_4_exterior', localFile: 'midnight_mirage_exterior_single.jpg', desc: 'Buitenkant Motel (Image 4)' },
  { id: 'image_5_reception', localFile: 'midnight_mirage_reception_single.jpg', desc: 'Receptie Motel (Image 5)' },
  { id: 'image_6_hallway', localFile: 'midnight_mirage_hallway_room17_single.jpg', desc: 'Gang & Kamer 17 (Image 6)' }
];

async function main() {
  console.log('Uploading 6 single reference assets to Firebase Storage...');
  const bucket = admin.storage().bucket();
  const urls = {};

  for (const item of filesToUpload) {
    const localPath = path.join(srcDir, item.localFile);
    const destStorage = `universe-singles/${item.localFile}`;
    const token = randomUUID();

    await bucket.upload(localPath, {
      destination: destStorage,
      metadata: {
        contentType: 'image/jpeg',
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destStorage)}?alt=media&token=${token}`;
    urls[item.id] = publicUrl;
    console.log(`✅ [${item.desc}]: ${publicUrl}`);
  }

  // Also ensure 30s audio URL
  const audioLocal = path.join(rootDir, 'projects', 'hate-me-social-production', 'midnight_mirage_motel_30s_master.mp3');
  const audioToken = randomUUID();
  const audioDest = 'universe-audio/midnight_mirage_motel_30s_master.mp3';
  await bucket.upload(audioLocal, {
    destination: audioDest,
    metadata: {
      contentType: 'audio/mpeg',
      metadata: { firebaseStorageDownloadTokens: audioToken }
    }
  });
  const audioUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(audioDest)}?alt=media&token=${audioToken}`;
  urls['audio_1'] = audioUrl;
  console.log(`🎵 [Audio 1 - 30s Master MP3]: ${audioUrl}`);

  fs.writeFileSync(
    path.join(rootDir, 'projects', 'jack-core-set', 'tiktok_seedance_references.json'),
    JSON.stringify(urls, null, 2)
  );
  console.log('All reference URLs stored in tiktok_seedance_references.json');
}

main().catch(console.error);
