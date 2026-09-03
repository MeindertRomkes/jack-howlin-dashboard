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

async function schedule() {
  const localVideoPath = path.resolve('projects/hate-me-social-production/jack_15s_midnight_mirage_motel.mp4');
  const token = randomUUID();
  const destination = 'posts/' + Date.now() + '_jack_howlin_midnight_mirage_motel_15s.mp4';
  const bucket = admin.storage().bucket();

  console.log('Uploading post video to permanent storage...');
  await bucket.upload(localVideoPath, {
    destination,
    metadata: {
      contentType: 'video/mp4',
      metadata: { firebaseStorageDownloadTokens: token }
    }
  });

  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(destination);
  const mediaUrl = 'https://firebasestorage.googleapis.com/v0/b/' + bucketName + '/o/' + encodedPath + '?alt=media&token=' + token;

  const scheduledDate = new Date('2026-09-01T17:45:00.000Z'); // 19:45 CET

  const caption = '3:30 AM on a dead highway. The jukebox knows things before you do.\n\nUnreleased track: "Midnight Mirage Motel" ⚡🥃\n\n#JackHowlin #MidnightMirageMotel #OutlawCountry #AmericanaRock #RoadsideNoir';

  const postDoc = {
    title: 'Midnight Mirage Motel — 15s Roadside Teaser',
    caption: caption,
    mediaUrl: mediaUrl,
    mediaType: 'video',
    platforms: ['instagram', 'tiktok', 'youtube_shorts', 'facebook'],
    scheduledDate: scheduledDate.toISOString(),
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    track: 'Midnight Mirage Motel (Unreleased)',
    videoFormat: '9:16 vertical',
    notes: 'Official Seedance 2.5 9:16 cinematic roadside noir teaser with unreleased master audio'
  };

  const docRef = await admin.firestore().collection('posts').add(postDoc);
  console.log('Post successfully scheduled with ID:', docRef.id);
  console.log('FINAL_MEDIA_URL:', mediaUrl);
}

schedule().catch(console.error);
