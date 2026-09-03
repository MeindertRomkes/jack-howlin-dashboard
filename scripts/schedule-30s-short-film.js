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

async function schedule30sFilm() {
  const localVideoPath = path.resolve('projects/hate-me-social-production/seedance_last_song_before_dawn_30s_9x16.mp4');
  const token = randomUUID();
  const destination = 'posts/' + Date.now() + '_jack_howlin_last_song_before_dawn_30s.mp4';
  const bucket = admin.storage().bucket();

  console.log('Uploading 30s short film to permanent storage...');
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

  // Schedule for Thursday 3 September 2026 at 20:00 CET (18:00 UTC) - Prime storytelling engagement window
  const scheduledDate = new Date('2026-09-03T18:00:00.000Z');

  const caption = '“Last Song Before Dawn” — 30-Second Cinematic Americana Short Film.\n\nA lonely roadside diner at 3:30 AM. A jukebox playing by itself. And an impossible car outside.\n\nFeaturing Jack Howlin & background music from “Hate Me All You Want”. ⚡🥃\n\n#JackHowlin #LastSongBeforeDawn #HateMeAllYouWant #OutlawCountry #AmericanaFilm #NeoWestern';

  const postDoc = {
    title: 'Last Song Before Dawn — 30s Cinematic Short Film',
    caption: caption,
    mediaUrl: mediaUrl,
    mediaType: 'video',
    platforms: ['instagram', 'tiktok', 'youtube_shorts', 'facebook'],
    scheduledDate: scheduledDate.toISOString(),
    status: 'scheduled',
    createdAt: new Date().toISOString(),
    track: 'Hate Me All You Want',
    videoFormat: '9:16 vertical (30s Short Film)',
    notes: 'Official 30-Second Seedance 2.5 Americana Short Film with Jack Core Set identity and full narrative arc'
  };

  const docRef = await admin.firestore().collection('posts').add(postDoc);
  console.log('30s Film successfully scheduled with ID:', docRef.id);
  console.log('FINAL_30S_MEDIA_URL:', mediaUrl);
}

schedule30sFilm().catch(console.error);
