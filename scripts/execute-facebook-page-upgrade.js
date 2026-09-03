const https = require('https');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'jack-howlin-dashboard',
    storageBucket: 'jack-howlin-dashboard.firebasestorage.app'
  });
}

const db = admin.firestore();
const pageId = '1255894134276290';
const token = 'EAA7ua8O7GewBSdTZCgr6oGIJaUhjaIMxEQMTPQomc2CpbVQZCZChZBH1RQqmNZBHiZBM7IB6kPDyklNyfqPhLm0CLmhG2Y9ZAFGIW9IXzg84SDUj5D2wEHmM4PJVZBGUXTTzwCK9MhPngIU9ex5XnKFHoUTCgtz1BUIwdglk0zZCIYRV3slFn92vcuMwRZBLfgQBgeuPvjZBxbeiqCVisAzLHAhO6uU8sTwzlfoAGsF6rcZD';

async function uploadToStorage(filePath, contentType) {
  const destination = 'facebook-assets/' + Date.now() + '_' + path.basename(filePath);
  const downloadToken = randomUUID();
  const bucket = admin.storage().bucket();
  await bucket.upload(filePath, {
    destination,
    metadata: {
      contentType,
      metadata: { firebaseStorageDownloadTokens: downloadToken }
    }
  });
  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(destination);
  return 'https://firebasestorage.googleapis.com/v0/b/' + bucketName + '/o/' + encodedPath + '?alt=media&token=' + downloadToken;
}

function postGraphApi(endpoint, dataObj) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      access_token: token,
      ...dataObj
    }).toString();

    const options = {
      hostname: 'graph.facebook.com',
      port: 443,
      path: '/v21.0' + endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data || '{}');
          resolve({ statusCode: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ statusCode: res.statusCode, raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('=== STARTING FACEBOOK PAGE UPGRADE (EXCLUDING PHOTO ALBUM) ===\n');

  // ── 1. Visuele Branding: Upload Cover & Avatar ──
  console.log('1. Uploading Cover Banner & Avatar...');
  const bannerLocal = path.resolve('projects/hate-me-social-production/facebook_cover_banner_1640x924.jpg');
  const bannerUrl = await uploadToStorage(bannerLocal, 'image/jpeg');
  console.log('Uploaded Banner URL:', bannerUrl);

  const avatarLocal = path.resolve('projects/jack-core-set/core_8_studio_halffiguur_zwart.jpg');
  const avatarUrl = await uploadToStorage(avatarLocal, 'image/jpeg');
  console.log('Uploaded Avatar URL:', avatarUrl);

  // Upload Cover photo to Page photos and set as cover
  const coverRes = await postGraphApi('/' + pageId + '/photos', {
    url: bannerUrl,
    caption: 'Official Jack Howlin 2026 Header | www.jackhowlin.com'
  });
  console.log('Cover Photo Upload Response:', coverRes);

  if (coverRes.data?.id) {
    const setCoverRes = await postGraphApi('/' + pageId, {
      cover: coverRes.data.id
    });
    console.log('Set Page Cover Response:', setCoverRes);
  }

  // Set Profile Picture
  const avatarRes = await postGraphApi('/' + pageId + '/picture', {
    url: avatarUrl
  });
  console.log('Set Profile Picture Response:', avatarRes);

  // ── 2. Update Page Bio & About & Website ──
  console.log('\n2. Updating Page Bio & Website Information...');
  const bioText = "Jack Howlin' (Jackson Cole) is an outlaw country & dark Americana singer-songwriter. Heavy rhythms, grit, gravel, and songs for the lonely highways. Official music, merch & tour: https://jackhowlin.com";
  const aboutRes = await postGraphApi('/' + pageId, {
    about: bioText,
    website: 'https://jackhowlin.com'
  });
  console.log('Update About Response:', aboutRes);

  // ── 3. Vaste Pinned Announcement Post ──
  console.log('\n3. Publishing Official Pinned Announcement Post...');
  const posterLocal = path.resolve('projects/hate-me-social-production/jack_real_core_v1_studio.png');
  const posterUrl = await uploadToStorage(posterLocal, 'image/png');

  const pinnedPostText = `“HATE ME ALL YOU WANT” — THE NEW SINGLE IS OUT NOW. ⚡🥃\n\nBorn on empty state routes and late-night highway diners. An anthem for anyone standing their ground.\n\nStream now on Spotify, Apple Music, and YouTube.\nOfficial limited vinyl, apparel & tour updates available at:\n🌐 https://jackhowlin.com\n\n#JackHowlin #HateMeAllYouWant #OutlawCountry #AmericanaRock #NewMusic #SouthernRock`;

  const pinnedPostRes = await postGraphApi('/' + pageId + '/photos', {
    url: posterUrl,
    caption: pinnedPostText
  });
  console.log('Pinned Announcement Post Response:', pinnedPostRes);

  // ── 4. AI Community Settings Update ──
  console.log('\n4. Updating Firestore AI Settings for Facebook Community Management...');
  await db.collection('settings').doc('connections').set({
    facebook: {
      connected: true,
      pageName: "Jack Howlin'",
      pageId: pageId,
      lastChecked: admin.firestore.Timestamp.now(),
      autoReplyEnabled: true
    }
  }, { merge: true });

  console.log('\n=== FACEBOOK PAGE UPGRADE FINISHED SUCCESSFULLY! ===');
}

main().catch(console.error);
