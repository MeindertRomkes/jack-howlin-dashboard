const admin = require('firebase-admin');
const { randomUUID } = require('crypto');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

async function uploadToFirebasePublic() {
  const bucket = admin.storage().bucket();
  const filePath = path.join(process.cwd(), 'projects', 'hate-me-social-production', 'hate_me_chorus_15s.mp3');
  const destination = 'public-audio/hate_me_chorus_15s.mp3';
  const token = randomUUID();

  await bucket.upload(filePath, {
    destination,
    metadata: {
      contentType: 'audio/mpeg',
      metadata: {
        firebaseStorageDownloadTokens: token
      }
    }
  });

  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(destination);
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

  console.log('FIREBASE_PUBLIC_AUDIO_URL:', publicUrl);
}

uploadToFirebasePublic().catch(console.error);
