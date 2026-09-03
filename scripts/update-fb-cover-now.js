const https = require('https');
const admin = require('firebase-admin');
const path = require('path');
const { randomUUID } = require('crypto');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const pageId = '1255894134276290';
const token = 'EAA7ua8O7GewBSdTZCgr6oGIJaUhjaIMxEQMTPQomc2CpbVQZCZChZBH1RQqmNZBHiZBM7IB6kPDyklNyfqPhLm0CLmhG2Y9ZAFGIW9IXzg84SDUj5D2wEHmM4PJVZBGUXTTzwCK9MhPngIU9ex5XnKFHoUTCgtz1BUIwdglk0zZCIYRV3slFn92vcuMwRZBLfgQBgeuPvjZBxbeiqCVisAzLHAhO6uU8sTwzlfoAGsF6rcZD';

async function updateCover() {
  const bannerLocal = path.resolve('projects/hate-me-social-production/facebook_cover_banner_1640x924.jpg');
  const destination = 'facebook-assets/' + Date.now() + '_facebook_cover_banner_1640x924.jpg';
  const downloadToken = randomUUID();
  const bucket = admin.storage().bucket();

  console.log('Uploading updated banner to Firebase Storage...');
  await bucket.upload(bannerLocal, {
    destination,
    metadata: {
      contentType: 'image/jpeg',
      metadata: { firebaseStorageDownloadTokens: downloadToken }
    }
  });

  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(destination);
  const bannerUrl = 'https://firebasestorage.googleapis.com/v0/b/' + bucketName + '/o/' + encodedPath + '?alt=media&token=' + downloadToken;
  console.log('Banner URL:', bannerUrl);

  // 1. Upload photo to Page Photos
  const postData = new URLSearchParams({
    access_token: token,
    url: bannerUrl,
    caption: 'Official Jack Howlin 2026 Header | Best Beluisterd: Hate Me All You Want | www.jackhowlin.com'
  }).toString();

  const options = {
    hostname: 'graph.facebook.com',
    port: 443,
    path: '/v21.0/' + pageId + '/photos',
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const photoRes = await new Promise(resolve => {
    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve(JSON.parse(d || '{}')));
    });
    req.write(postData);
    req.end();
  });

  console.log('Photo Upload ID:', photoRes.id);

  if (photoRes.id) {
    // 2. Set as Page Cover
    const coverData = new URLSearchParams({
      access_token: token,
      cover: photoRes.id
    }).toString();

    const coverOptions = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: '/v21.0/' + pageId,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(coverData)
      }
    };

    const coverRes = await new Promise(resolve => {
      const req = https.request(coverOptions, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d || '{}')));
      });
      req.write(coverData);
      req.end();
    });

    console.log('Set Page Cover Result:', coverRes);
  }
}

updateCover().catch(console.error);
