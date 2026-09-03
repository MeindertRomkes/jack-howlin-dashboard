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
const sourcePath = 'D:/Downloads/image_16bcbd9be10bc8616b525fa3abf9b019.jpg';
const destLocalDir = path.join(rootDir, 'projects', 'jack-core-set');
const destLocalFile = path.join(destLocalDir, 'jack_howlin_multilevel_reference.jpg');

async function main() {
  console.log('================================================================');
  console.log('👑 REGISTREREN NIEUWE MULTI-LEVEL MASTER REFERENTIE VOOR JACK HOWLIN');
  console.log('================================================================\n');

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Bronbestand niet gevonden: ${sourcePath}`);
  }

  // 1. Kopieer lokaal naar projects/jack-core-set/
  if (!fs.existsSync(destLocalDir)) fs.mkdirSync(destLocalDir, { recursive: true });
  fs.copyFileSync(sourcePath, destLocalFile);
  console.log(`✅ Lokaal opgeslagen in project: ${destLocalFile} (${(fs.statSync(destLocalFile).size / 1024).toFixed(2)} KB)`);

  // 2. Upload naar Firebase Storage
  console.log('☁️ Uploaden naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const destStorage = `jack-core-references/jack_howlin_multilevel_reference.jpg`;
  const token = randomUUID();

  await bucket.upload(destLocalFile, {
    destination: destStorage,
    metadata: {
      contentType: 'image/jpeg',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destStorage)}?alt=media&token=${token}`;
  console.log(`✅ Permanente Firebase Storage URL: ${publicUrl}`);

  // 3. Registreer in Firestore jack_core_assets als PRIMARY CANONICAL
  console.log('📝 Registreren in Firestore jack_core_assets als primaire referentie...');
  const docRef = await admin.firestore().collection('jack_core_assets').add({
    type: 'canonical_multilevel_reference',
    isPrimary: true,
    title: 'Jack Howlin — Official Multi-Level Master Reference',
    filename: 'jack_howlin_multilevel_reference.jpg',
    publicUrl: publicUrl,
    localPath: destLocalFile,
    dimensions: '2048x2048',
    sizeBytes: fs.statSync(destLocalFile).size,
    createdAt: admin.firestore.Timestamp.now(),
    notes: 'Official single multi-level reference image to be used for ALL Jack Howlin video and image productions (replacing old multi-image core set).'
  });

  // Update app config doc if exists
  await admin.firestore().collection('config').doc('character_references').set({
    primaryReferenceUrl: publicUrl,
    primaryLocalPath: destLocalFile,
    updatedAt: admin.firestore.Timestamp.now()
  }, { merge: true });

  console.log(`🎉 Succesvol geregistreerd in Firestore! Document ID: ${docRef.id}`);
  console.log('\n================================================================');
  console.log('🚀 MULTI-LEVEL REFERENTIE IS VANAF NU DE ENIGE STANDAARD');
  console.log(`🔗 URL: ${publicUrl}`);
  console.log(`📁 Bestand: ${destLocalFile}`);
  console.log('================================================================\n');
}

main().catch(console.error);
