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
const sourceDir = 'D:/Downloads/locations';

const locationMapping = [
  {
    sourceFile: 'image_540a149d84ceacd9be7f7b46461de8da.jpg',
    canonicalName: 'midnight_mirage_exterior_master.jpg',
    locationId: 'midnight-mirage-exterior',
    parentLocationId: 'midnight-mirage-motel',
    name: 'Midnight Mirage Motel — Buitenkant Master (4 Angles)',
    type: 'exterior_turnaround'
  },
  {
    sourceFile: 'image_9b907a1d1e823ab3378e6c23e7cfbfc4.jpg',
    canonicalName: 'midnight_mirage_reception_master.jpg',
    locationId: 'midnight-mirage-reception',
    parentLocationId: 'midnight-mirage-motel',
    name: 'Midnight Mirage Motel — Receptie Lobby Master (4 Angles)',
    type: 'interior_turnaround'
  },
  {
    sourceFile: 'image_ff84870b705423b1dadd420960f0c855.jpg',
    canonicalName: 'midnight_mirage_hallway_room17_master.jpg',
    locationId: 'midnight-mirage-hallway-room17',
    parentLocationId: 'midnight-mirage-motel',
    name: 'Midnight Mirage Motel — Gang & Kamer 17 Master (4 Angles)',
    type: 'interior_turnaround'
  }
];

async function main() {
  console.log('================================================================');
  console.log('🏨 REGISTREREN MIDNIGHT MIRAGE MOTEL LOCATIES IN PROJECT & STORAGE');
  console.log('================================================================\n');

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const bucket = admin.storage().bucket();
  const firestore = admin.firestore();

  const manifestPath = path.join(destDir, 'universe_locations_manifest.json');
  let manifest = {};
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (e) {
      manifest = {};
    }
  }

  for (const item of locationMapping) {
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
    const storagePath = `universe-locations/${item.canonicalName}`;
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
    await firestore.collection('universe_locations').doc(item.locationId).set({
      id: item.locationId,
      parentLocationId: item.parentLocationId,
      name: item.name,
      type: item.type,
      localPath: `projects/jack-core-set/${item.canonicalName}`,
      storagePath: storagePath,
      publicUrl: publicUrl,
      updatedAt: admin.firestore.Timestamp.now()
    }, { merge: true });

    manifest[item.locationId] = {
      name: item.name,
      localPath: `projects/jack-core-set/${item.canonicalName}`,
      publicUrl: publicUrl
    };
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  console.log('\n================================================================');
  console.log('🎉 ALLE 3 MOTEL LOCATIE MASTERS SUCCESVOL GEKOPPELD EN GEÜPLOAD!');
  console.log('================================================================\n');
}

main().catch(console.error);
