const admin = require('firebase-admin');
const path = require('path');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

async function fixPost() {
  const docId = 'YRgT33k4DvCf4IJvLMm4';
  const targetDate = new Date('2026-09-02T07:00:00.000Z'); // 09:00 AM CET (2 Sep 2026)

  await admin.firestore().collection('posts').doc(docId).set({
    title: 'Midnight Mirage Motel — 15s Roadside Teaser',
    caption: '3:30 AM on a dead highway. The jukebox knows things before you do.\n\nUnreleased track: "Midnight Mirage Motel" ⚡🥃\n\n#JackHowlin #MidnightMirageMotel #OutlawCountry #AmericanaRock #RoadsideNoir',
    mediaUrl: 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/posts%2F1788280641050_jack_howlin_midnight_mirage_motel_15s.mp4?alt=media&token=31989282-0deb-4d3f-b1e2-063737cc3007',
    mediaType: 'video',
    platforms: ['instagram', 'tiktok', 'youtube', 'facebook'],
    scheduledAt: admin.firestore.Timestamp.fromDate(targetDate),
    scheduledDate: targetDate.toISOString(),
    status: 'scheduled',
    createdAt: admin.firestore.Timestamp.now(),
    track: 'Midnight Mirage Motel (Unreleased)',
    videoFormat: '9:16 vertical',
    notes: 'Official Seedance 2.5 9:16 cinematic roadside noir teaser with unreleased master audio'
  }, { merge: true });

  const updated = await admin.firestore().collection('posts').doc(docId).get();
  console.log('Fixed post document in Firestore:');
  console.log(JSON.stringify(updated.data(), null, 2));
}

fixPost().catch(console.error);
