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
const sourcePath = 'D:/Downloads/image_e8ffce024810e68f757536463cb032b2.jpg';
const destLocalDir = path.join(rootDir, 'projects', 'jack-core-set');
const destLocalFile = path.join(destLocalDir, 'rosie_ray_master_reference.jpg');

async function main() {
  console.log('================================================================');
  console.log('🌹 REGISTREREN ROSIE RAY MASTER REFERENTIE IN PROJECT & CLOUD');
  console.log('================================================================\n');

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Bronbestand niet gevonden: ${sourcePath}`);
  }

  // 1. Kopieer lokaal
  if (!fs.existsSync(destLocalDir)) fs.mkdirSync(destLocalDir, { recursive: true });
  fs.copyFileSync(sourcePath, destLocalFile);
  console.log(`✅ Lokaal opgeslagen in project: ${destLocalFile} (${(fs.statSync(destLocalFile).size / 1024).toFixed(2)} KB)`);

  // 2. Upload naar Firebase Storage
  console.log('☁️ Uploaden naar Firebase Storage...');
  const bucket = admin.storage().bucket();
  const destStorage = `jack-core-references/rosie_ray_master_reference.jpg`;
  const token = randomUUID();

  await bucket.upload(destLocalFile, {
    destination: destStorage,
    metadata: {
      contentType: 'image/jpeg',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destStorage)}?alt=media&token=${token}`;
  console.log(`✅ Permanente Firebase Storage URL voor Rosie Ray: ${publicUrl}`);

  // 3. Registreer in Firestore
  const docRef = await admin.firestore().collection('jack_core_assets').add({
    character: 'Rosie Ray',
    type: 'canonical_character_reference',
    isPrimary: true,
    title: 'Rosie Ray — Official Master Reference Image',
    filename: 'rosie_ray_master_reference.jpg',
    publicUrl: publicUrl,
    localPath: destLocalFile,
    dimensions: '2048x2048',
    sizeBytes: fs.statSync(destLocalFile).size,
    createdAt: admin.firestore.Timestamp.now(),
    notes: 'Official master character reference for Rosie Ray (featured in Cupid Can Keep It and outlaw duo productions).'
  });

  await admin.firestore().collection('config').doc('character_references').set({
    rosieRayReferenceUrl: publicUrl,
    rosieRayLocalPath: destLocalFile,
    updatedAt: admin.firestore.Timestamp.now()
  }, { merge: true });

  console.log(`🎉 Succesvol geregistreerd in Firestore! Document ID: ${docRef.id}`);

  // 4. Download de 5 geselecteerde tracks indien nodig
  console.log('\n🎵 Controleren van de 5 nummers in de audio library...');
  const tracksToPrep = [
    { id: 'CcJNCs4bUFW5OFE905Cj', name: 'Cupid Can Keep It (Remastered)', filename: 'cupid_can_keep_it.wav' },
    { id: 'Kwg7XCHRZByOojUxpnJW', name: 'Runaway in Nashville (Mastered)', filename: 'runaway_in_nashville.wav' },
    { id: 'Y0HDSp5ipEjQcZocAO8b', name: 'Open Roads (Colorado Line)', filename: 'open_roads_colorado.wav' },
    { id: 'k1kPVrW6Gmq8v9TvUjCi', name: 'Leaving Amarillo', filename: 'leaving_amarillo.wav' },
    { id: '7CLUAmkrvuRbvoFAFpTt', name: 'Livin\' on Borrowed Time (Remastered)', filename: 'livin_on_borrowed_time.wav' }
  ];

  const audioDir = path.join(rootDir, 'projects', 'hate-me-social-production');

  for (const t of tracksToPrep) {
    const localTarget = path.join(audioDir, t.filename);
    if (!fs.existsSync(localTarget)) {
      console.log(`Downloaden van ${t.name}...`);
      const doc = await admin.firestore().collection('suno_tracks').doc(t.id).get();
      if (doc.exists) {
        const d = doc.data();
        const downloadUrl = d.publicUrl || d.storageUrl;
        if (downloadUrl) {
          const res = await fetch(downloadUrl);
          if (res.ok) {
            fs.writeFileSync(localTarget, Buffer.from(await res.arrayBuffer()));
            console.log(`   ✅ Opgeslagen: ${t.filename} (${(fs.statSync(localTarget).size / (1024 * 1024)).toFixed(2)} MB)`);
          }
        }
      }
    } else {
      console.log(`   ⚡ Reeds lokaal aanwezig: ${t.filename}`);
    }
  }

  console.log('\n================================================================');
  console.log('🚀 ROSIE RAY EN 5 NUMMERS SUCCESVOL VOORBEREID');
  console.log(`🌹 Rosie Ray URL: ${publicUrl}`);
  console.log('================================================================\n');
}

main().catch(console.error);
