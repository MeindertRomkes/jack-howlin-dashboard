const https = require('https');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const db = admin.firestore();
const pageId = '1255894134276290';
const pageToken = 'EAA7ua8O7GewBSdTZCgr6oGIJaUhjaIMxEQMTPQomc2CpbVQZCZChZBH1RQqmNZBHiZBM7IB6kPDyklNyfqPhLm0CLmhG2Y9ZAFGIW9IXzg84SDUj5D2wEHmM4PJVZBGUXTTzwCK9MhPngIU9ex5XnKFHoUTCgtz1BUIwdglk0zZCIYRV3slFn92vcuMwRZBLfgQBgeuPvjZBxbeiqCVisAzLHAhO6uU8sTwzlfoAGsF6rcZD';

const postDocId = 'S2YvZuog7UYxxfcgNohy';
const videoUrl = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/posts%2Fjack_howlin_seedance_midnight_highway.mp4?alt=media&token=1323c19c-811a-4690-a724-9b3e010ec5a5';
const title = 'Hate Me All You Want — Midnight Highway';
const description = 'Still screaming this every single night on the road. Hate me all you want. The crown stays on. ⚡🥃\n\nStream Hate Me All You Want on Spotify, Apple Music & YouTube.\n\n#JackHowlin #HateMeAllYouWant #OutlawCountry #Americana #MidnightHighway #SouthernRock';

async function publishAug31Post() {
  console.log('Publishing 31 August post to Facebook Page...');

  const postData = new URLSearchParams({
    access_token: pageToken,
    file_url: videoUrl,
    description: description,
    title: title
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
    console.log('SUCCESS! Video published to Facebook with ID:', parsed.id);
    await db.collection('posts').doc(postDocId).update({
      'platformResults.facebook': {
        status: 'posted',
        postId: parsed.id
      },
      errorMessage: null,
      updatedAt: admin.firestore.Timestamp.now()
    });
    console.log('Firestore document S2YvZuog7UYxxfcgNohy successfully updated!');
  } else {
    throw new Error('Failed to publish: ' + resData.body);
  }
}

publishAug31Post().catch(console.error);
