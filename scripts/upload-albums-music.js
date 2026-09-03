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

const db = admin.firestore();
const bucket = admin.storage().bucket();
const rootDir = process.cwd();

// Destination for local copies in public folder
const publicAlbumsDir = path.join(rootDir, 'public', 'albums');
if (!fs.existsSync(publicAlbumsDir)) {
  fs.mkdirSync(publicAlbumsDir, { recursive: true });
}

// 1. Definiëer albums, covers en tracks
const albums = [
  {
    name: 'The Silent Cowboy',
    releaseYear: 2025,
    releaseType: 'album',
    releaseStatus: 'released',
    localFolder: 'D:\\Downloads\\The Silent Cowboy',
    coverFile: 'ChatGPT Image 5 nov 2025, 12_04_00.png',
    coverDest: 'suno-library/covers/the-silent-cowboy-cover.png',
    publicCoverLocal: 'the-silent-cowboy-cover.png',
    tracks: [
      { trackNumber: 1, title: 'Prairie Ghosts', file: 'Prairie Ghosts.wav', duration: 188 },
      { trackNumber: 2, title: 'Whisper in the Wind', file: 'Whisper in the Wind.wav', duration: 201, existingDocId: 'oWy886OYA5ueJvVGr8DR' },
      { trackNumber: 3, title: 'Howls at Midnight', file: 'Howls at Midnight.wav', duration: 226 },
      { trackNumber: 4, title: 'Ash and Honey', file: 'Ash and Honey.wav', duration: 219 },
      { trackNumber: 5, title: 'Moon Over Montana', file: 'Moon Over Montana.wav', duration: 222 },
      { trackNumber: 6, title: 'The Silent Cowboy', file: 'The Silent Cowboy.wav', duration: 189 },
      { trackNumber: 7, title: 'Dust and Prayer', file: 'Dust and Prayer.wav', duration: 144 },
      { trackNumber: 8, title: 'Letters from Wyoming', file: 'Letters from Wyoming.wav', duration: 192 },
      { trackNumber: 9, title: 'The Long Way Home', file: 'The Long Way Home.wav', duration: 198 },
      { trackNumber: 10, title: 'Sunrise Over Silver Creek', file: 'Sunrise Over Silver Creek.wav', duration: 203 },
    ]
  },
  {
    name: 'Beyond the Horizon',
    releaseYear: 2025,
    releaseType: 'album',
    releaseStatus: 'released',
    localFolder: 'D:\\Downloads\\Beyond The Horizon',
    coverFile: 'ChatGPT Image 5 nov 2025, 14_53_11.png',
    coverDest: 'suno-library/covers/beyond-the-horizon-cover.png',
    publicCoverLocal: 'beyond-the-horizon-cover.png',
    tracks: [
      { trackNumber: 1, title: 'Leaving Amarillo', file: 'Leaving Amarillo.wav', duration: 137, existingDocId: 'k1kPVrW6Gmq8v9TvUjCi' },
      { trackNumber: 2, title: 'Runaway in Nashville (Mastered)', file: 'Runaway in Nashville.wav', duration: 141, existingDocId: 'Kwg7XCHRZByOojUxpnJW' },
      { trackNumber: 3, title: 'Somewhere in Santa Fe', file: 'Somewhere in Santa Fe.wav', duration: 202 },
      { trackNumber: 4, title: 'Open Roads (Colorado Line)', file: 'Open Roads (Colorado Line).wav', duration: 202, existingDocId: 'Y0HDSp5ipEjQcZocAO8b' },
      { trackNumber: 5, title: 'Miles from Memphis', file: 'Miles from Memphis.wav', duration: 206 },
      { trackNumber: 6, title: 'Rain Over Boulder', file: 'Rain Over Boulder.wav', duration: 213 },
      { trackNumber: 7, title: 'Portland Lights', file: 'Portland Lights.wav', duration: 199 },
      { trackNumber: 8, title: 'Under Vancouver Skies', file: 'Under Vancouver Skies.wav', duration: 212 },
      { trackNumber: 9, title: 'The Edge of Alaska', file: 'The Edge of Alaska.wav', duration: 239 },
      { trackNumber: 10, title: 'Home to the Horizon', file: 'Home to the Horizon.wav', duration: 169 },
    ]
  }
];

async function uploadFileToStorage(localFilePath, destStoragePath, contentType) {
  const token = randomUUID();
  await bucket.upload(localFilePath, {
    destination: destStoragePath,
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token
      }
    }
  });

  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(destStoragePath)}?alt=media&token=${token}`;
  return { publicUrl, storageUrl: `gs://${bucket.name}/${destStoragePath}` };
}

async function main() {
  console.log('================================================================');
  console.log('🤠 SYNCING ALBUMS: THE SILENT COWBOY & BEYOND THE HORIZON');
  console.log('================================================================\n');

  for (const album of albums) {
    console.log(`\n📀 Processing Album: "${album.name}"`);
    console.log(`---------------------------------------------------------------`);

    // 1. Upload Cover Image
    let albumCoverUrl = '';
    const localCoverPath = path.join(album.localFolder, album.coverFile);
    if (fs.existsSync(localCoverPath)) {
      console.log(`📸 Uploading cover: ${album.coverFile}...`);
      // Copy to public/albums
      const localPublicCover = path.join(publicAlbumsDir, album.publicCoverLocal);
      fs.copyFileSync(localCoverPath, localPublicCover);

      const coverUpload = await uploadFileToStorage(localCoverPath, album.coverDest, 'image/png');
      albumCoverUrl = coverUpload.publicUrl;
      console.log(`   ✅ Cover URL: ${albumCoverUrl}`);
    } else {
      console.warn(`   ⚠️ Cover niet gevonden op: ${localCoverPath}`);
    }

    // 2. Process each track
    for (const track of album.tracks) {
      const localWavPath = path.join(album.localFolder, track.file);

      // Check if this track is already registered in Firestore
      if (track.existingDocId) {
        console.log(`🔄 [Track ${track.trackNumber}] "${track.title}" already in Firestore (ID: ${track.existingDocId}). Updating metadata...`);
        const updateData = {
          albumName: album.name,
          trackNumber: track.trackNumber,
          releaseType: album.releaseType,
          releaseStatus: album.releaseStatus,
          releaseYear: album.releaseYear,
          durationSeconds: track.duration,
        };
        if (albumCoverUrl) {
          updateData.albumCoverUrl = albumCoverUrl;
        }

        await db.collection('suno_tracks').doc(track.existingDocId).update(updateData);
        console.log(`   ✅ Track ${track.trackNumber} updated.`);
        continue;
      }

      // Check if file exists on disk
      if (!fs.existsSync(localWavPath)) {
        console.error(`   ❌ Audiobestand niet gevonden: ${localWavPath}`);
        continue;
      }

      console.log(`⬆️ [Track ${track.trackNumber}] Uploading "${track.title}" (${(fs.statSync(localWavPath).size / (1024 * 1024)).toFixed(1)} MB)...`);
      const safeName = track.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      const storageDest = `suno-library/${Date.now()}-${safeName}.wav`;

      const { publicUrl, storageUrl } = await uploadFileToStorage(localWavPath, storageDest, 'audio/wav');

      const docData = {
        name: track.title,
        albumName: album.name,
        trackNumber: track.trackNumber,
        releaseType: album.releaseType,
        releaseStatus: album.releaseStatus,
        releaseYear: album.releaseYear,
        durationSeconds: track.duration,
        storageUrl,
        publicUrl,
        ...(albumCoverUrl ? { albumCoverUrl } : {}),
        snippets: [],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      const docRef = await db.collection('suno_tracks').add(docData);
      console.log(`   ✅ Saved in Firestore! ID: ${docRef.id}`);
    }
  }

  console.log('\n================================================================');
  console.log('🎉 ALL TRACKS AND ALBUMS SUCCESSFULLY SYNCED TO FIREBASE!');
  console.log('================================================================\n');
}

main().catch((err) => {
  console.error('Fatal sync error:', err);
  process.exit(1);
});
