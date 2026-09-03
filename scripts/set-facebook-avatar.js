const https = require('https');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const pageId = '1255894134276290';
const token = 'EAA7ua8O7GewBSdTZCgr6oGIJaUhjaIMxEQMTPQomc2CpbVQZCZChZBH1RQqmNZBHiZBM7IB6kPDyklNyfqPhLm0CLmhG2Y9ZAFGIW9IXzg84SDUj5D2wEHmM4PJVZBGUXTTzwCK9MhPngIU9ex5XnKFHoUTCgtz1BUIwdglk0zZCIYRV3slFn92vcuMwRZBLfgQBgeuPvjZBxbeiqCVisAzLHAhO6uU8sTwzlfoAGsF6rcZD';

async function setAvatar() {
  const avatarUrl = 'https://firebasestorage.googleapis.com/v0/b/jack-howlin-dashboard.firebasestorage.app/o/facebook-assets%2F1788334883948_core_8_studio_halffiguur_zwart.jpg?alt=media&token=9b3d29d5-6744-486b-8a85-bab389e7059f';

  // 1. Upload photo to Page
  const postData = new URLSearchParams({
    access_token: token,
    url: avatarUrl,
    caption: "Jack Howlin' Official Profile Picture"
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

  console.log('Avatar photo upload ID:', photoRes.id);

  if (photoRes.id) {
    // 2. Set as profile picture via picture endpoint with photo_id or picture param
    const picData = new URLSearchParams({
      access_token: token,
      photo_id: photoRes.id
    }).toString();

    const picOptions = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: '/v21.0/' + pageId + '/picture',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(picData)
      }
    };

    const picRes = await new Promise(resolve => {
      const req = https.request(picOptions, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => resolve(JSON.parse(d || '{}')));
      });
      req.write(picData);
      req.end();
    });

    console.log('Set Avatar Response:', picRes);
  }
}

setAvatar().catch(console.error);
