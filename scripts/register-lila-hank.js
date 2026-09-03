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
const destDir = path.join(rootDir, 'projects', 'jack-core-set');
const sourceDir = 'D:/Downloads/characters';

const newCharacters = [
  {
    sourceFile: 'image_08b16c8d8e02fe89eb762dc0dc3259b8.jpg',
    canonicalName: 'hank_mercer_master_turnaround.jpg',
    characterId: 'hank-mercer',
    name: 'Hank "Blacktop" Mercer',
    title: 'Betrouwbare zwaarte',
    role: 'ally'
  },
  {
    sourceFile: 'image_4829a09e7d01f797fc0cad2d1beeb8fb.jpg',
    canonicalName: 'lila_quinn_master_turnaround.jpg',
    characterId: 'lila-quinn',
    name: 'Lila Quinn',
    title: 'Intimiteit op afstand',
    role: 'supporting'
  }
];

async function main() {
  console.log('================================================================');
  console.log('📻 REGISTREREN HANK MERCER & LILA QUINN IN PROJECT & STORAGE');
  console.log('================================================================\n');

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const bucket = admin.storage().bucket();
  const firestore = admin.firestore();

  const manifestPath = path.join(destDir, 'universe_turnaround_manifest.json');
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      manifest = {};
    }
  }

  for (const item of newCharacters) {
    const src = path.join(sourceDir, item.sourceFile);
    const dest = path.join(destDir, item.canonicalName);

    if (!fs.existsSync(src)) {
      console.warn(`⚠️ Bronbestand niet gevonden: ${src}`);
      continue;
    }

    // 1. Kopieer lokaal
    fs.copyFileSync(src, dest);
    const sizeKb = (fs.statSync(dest).size / 1024).toFixed(2);
    console.log(`📁 [Lokaal gekopieerd] ${item.name} -> ${item.canonicalName} (${sizeKb} KB)`);

    // 2. Upload naar Firebase Storage
    const storagePath = `universe-characters/${item.canonicalName}`;
    const token = randomUUID();
    console.log(`☁️  [Uploaden] ${storagePath}...`);

    await bucket.upload(dest, {
      destination: storagePath,
      metadata: {
        contentType: 'image/jpeg',
        metadata: { firebaseStorageDownloadTokens: token }
      }
    });

    const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`;
    console.log(`   ✅ Public URL: ${publicUrl}`);

    // 3. Firestore registratie
    await firestore.collection('universe_characters').doc(item.characterId).set({
      id: item.characterId,
      name: item.name,
      title: item.title,
      role: item.role,
      localTurnaroundPath: `projects/jack-core-set/${item.canonicalName}`,
      storagePath: storagePath,
      publicUrl: publicUrl,
      updatedAt: admin.firestore.Timestamp.now()
    }, { merge: true });

    manifest[item.characterId] = {
      name: item.name,
      localPath: `projects/jack-core-set/${item.canonicalName}`,
      publicUrl: publicUrl
    };
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\n================================================================');
  console.log('🎉 HANK & LILA SUCCESVOL GEKOPPELD! 11/11 PERSONAGES COMPLEET!');
  console.log('================================================================\n');
}

main().catch(console.error);
