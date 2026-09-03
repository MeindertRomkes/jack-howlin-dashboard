const https = require('https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const pageId = '1255894134276290';
const pageToken = 'EAA7ua8O7GewBSdTZCgr6oGIJaUhjaIMxEQMTPQomc2CpbVQZCZChZBH1RQqmNZBHiZBM7IB6kPDyklNyfqPhLm0CLmhG2Y9ZAFGIW9IXzg84SDUj5D2wEHmM4PJVZBGUXTTzwCK9MhPngIU9ex5XnKFHoUTCgtz1BUIwdglk0zZCIYRV3slFn92vcuMwRZBLfgQBgeuPvjZBxbeiqCVisAzLHAhO6uU8sTwzlfoAGsF6rcZD';
const videoUrl = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/posts%2F1788280641050_jack_howlin_midnight_mirage_motel_15s.mp4?alt=media&token=31989282-0deb-4d3f-b1e2-063737cc3007';
const description = '3:30 AM on a dead highway. The jukebox knows things before you do.\n\nUnreleased track: "Midnight Mirage Motel" ⚡🥃\n\n#JackHowlin #MidnightMirageMotel #OutlawCountry #AmericanaRock #RoadsideNoir';

async function publishVideo() {
  console.log('Sending video to Facebook Page API with updated Page Token...');
  const postData = new URLSearchParams({
    access_token: pageToken,
    file_url: videoUrl,
    description: description,
    title: 'Midnight Mirage Motel — 15s Roadside Teaser'
  }).toString();

  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: '/v21.0/' + pageId + '/videos',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const resData = await new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });

  console.log('Facebook Publish Status:', resData.status);
  console.log('Facebook Response:', resData.body);

  const parsed = JSON.parse(resData.body || '{}');

  if (parsed.id) {
    console.log('SUCCESS! Video published with Facebook ID:', parsed.id);
    const postRef = admin.firestore().collection('posts').doc('YRgT33k4DvCf4IJvLMm4');
    await postRef.update({
      'platformResults.facebook': {
        status: 'posted',
        postId: parsed.id
      }
    });
    console.log('Firestore post updated successfully!');
  }

  // Also update Secret Manager and settings collection with the valid Page Access Token
  console.log('Saving Page Token to Firestore settings and connections...');
  await admin.firestore().collection('settings').doc('connections').set({
    facebook: {
      connected: true,
      pageName: "Jack Howlin'",
      pageId: pageId,
      lastChecked: admin.firestore.Timestamp.now()
    }
  }, { merge: true });

  await admin.firestore().collection('settings').doc('tokens').set({
    facebook: {
      pageToken: pageToken,
      pageId: pageId,
      updatedAt: admin.firestore.Timestamp.now()
    }
  }, { merge: true });

  console.log('All Facebook tokens and configurations successfully saved!');
}

publishVideo().catch(console.error);
