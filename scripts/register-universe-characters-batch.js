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

const characterMapping = [
  {
    sourceFile: 'image_16bcbd9be10bc8616b525fa3abf9b019.jpg',
    canonicalName: 'jack_howlin_master_turnaround.jpg',
    characterId: 'jack-howlin',
    name: "Jack Howlin'",
    title: 'De rusteloze hoofdpersoon',
    role: 'protagonist'
  },
  {
    sourceFile: 'image_e8ffce024810e68f757536463cb032b2.jpg',
    canonicalName: 'rosie_ray_master_turnaround.jpg',
    characterId: 'rosie-ray',
    name: 'Rosie Ray',
    title: 'Warmte zonder zachtheid te spelen',
    role: 'ally'
  },
  {
    sourceFile: 'image_f3c56946a31e5b16cdf8c987398a07dc.jpg',
    canonicalName: 'silas_crowe_master_turnaround.jpg',
    characterId: 'silas-crowe',
    name: 'Sheriff Silas Crowe',
    title: 'Beheerste dreiging',
    role: 'antagonist'
  },
  {
    sourceFile: 'image_7e45dca9bb283bc556f2bd8d07e4988a.jpg',
    canonicalName: 'mae_bell_carter_master_turnaround.jpg',
    characterId: 'mae-bell-carter',
    name: 'Mae Bell Carter',
    title: 'Praktische daadkracht',
    role: 'ally'
  },
  {
    sourceFile: 'image_11654f47191ce01da6e569df8f3a0e24.jpg',
    canonicalName: 'june_holloway_master_turnaround.jpg',
    characterId: 'june-holloway',
    name: 'June Holloway',
    title: 'De stille waarnemer',
    role: 'supporting'
  },
  {
    sourceFile: 'image_6dde5c01b35d9e9a17dce0c7b61dde3d.jpg',
    canonicalName: 'cole_ransom_master_turnaround.jpg',
    characterId: 'cole-ransom',
    name: 'Cole Ransom',
    title: 'Zorgvuldig ontworpen rebellie',
    role: 'antagonist'
  },
  {
    sourceFile: 'image_bb8cfbdcb30f68a9d368f8aa9a6af774.jpg',
    canonicalName: 'gideon_pike_master_turnaround.jpg',
    characterId: 'gideon-pike',
    name: 'Gideon Pike',
    title: 'Absolute controle',
    role: 'enigmatic'
  },
  {
    sourceFile: 'image_229d0947ee1179e429e8336954db18f3.jpg',
    canonicalName: 'ruby_cade_master_turnaround.jpg',
    characterId: 'ruby-cade',
    name: 'Ruby Cade',
    title: 'Vuur met discipline',
    role: 'ally'
  },
  {
    sourceFile: 'image_a8e1c07e51ece834d81e5e625c804b6b.jpg',
    canonicalName: 'abel_graves_master_turnaround.jpg',
    characterId: 'abel-graves',
    name: 'Abel Graves',
    title: 'Onnatuurlijke stilte zonder bovennatuurlijk te worden',
    role: 'enigmatic'
  }
];

async function main() {
  console.log('================================================================');
  console.log('🌌 REGISTREREN 9 UNIVERSE TURNAROUND MASTERS IN PROJECT & STORAGE');
  console.log('================================================================\n');

  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  const bucket = admin.storage().bucket();
  const firestore = admin.firestore();

  const registered = {};

  for (const item of characterMapping) {
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

    registered[item.characterId] = {
      name: item.name,
      localPath: `projects/jack-core-set/${item.canonicalName}`,
      publicUrl: publicUrl
    };
  }

  // Sla status index op
  fs.writeFileSync(
    path.join(destDir, 'universe_turnaround_manifest.json'),
    JSON.stringify(registered, null, 2)
  );

  console.log('\n================================================================');
  console.log('🎉 9 UNIVERSE PERSONAGES SUCCESVOL GEKOPPELD EN GEÜPLOAD!');
  console.log('================================================================\n');
}

main().catch(console.error);
